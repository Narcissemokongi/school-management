// convex/impersonation.ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// ════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════

function isOwnerStrict(user: any): boolean {
  if (!user) return false;
  if (user.role === "admin" && !user.ecoleId) return true;
  return user.role === "superAdmin" && user.isOwner === true;
}

async function requireOwnerStrict(ctx: any, userId: Id<"users">) {
  const user = await ctx.db.get(userId);
  if (!user) throw new Error("Utilisateur introuvable");
  if (!isOwnerStrict(user)) {
    throw new Error("Réservé au propriétaire de la plateforme.");
  }
  return user;
}

const CANDIDATE_ROLES = ["admin", "directeur", "disciplinaire"];
const ALLOWED_ROLES = [
  "admin",
  "directeur",
  "disciplinaire",
  "enseignant",
  "comptable",
  "parent",
  "eleve",
];

// ════════════════════════════════════════════════════════════════
// QUERIES
// ════════════════════════════════════════════════════════════════

/**
 * Liste les utilisateurs d'une école qui peuvent être impersonnés.
 * Priorité : admin > directeur > disciplinaire.
 * 🔒 OWNER strict.
 */
export const getCandidates = query({
  args: {
    userId: v.id("users"),
    ecoleId: v.id("ecoles"),
  },
  handler: async (ctx, args) => {
    await requireOwnerStrict(ctx, args.userId);

    const users = await ctx.db
      .query("users")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId))
      .take(500);

    const candidates = users.filter((u) => {
      if (!CANDIDATE_ROLES.includes(u.role)) return false;
      if (u.status === "pending" || u.status === "rejected") return false;
      if (u.isActive === false) return false;
      return true;
    });

    const rolePriority: Record<string, number> = {
      admin: 0,
      directeur: 1,
      disciplinaire: 2,
    };

    candidates.sort((a, b) => {
      const pa = rolePriority[a.role] ?? 99;
      const pb = rolePriority[b.role] ?? 99;
      if (pa !== pb) return pa - pb;
      return a.nom.localeCompare(b.nom);
    });

    return candidates.map((u) => ({
      _id: u._id,
      nom: u.nom,
      prenom: u.prenom ?? "",
      postnom: u.postnom ?? "",
      login: u.login,
      role: u.role,
    }));
  },
});

// ════════════════════════════════════════════════════════════════
// MUTATIONS
// ════════════════════════════════════════════════════════════════

/**
 * Démarre une session d'impersonation.
 * Retourne l'utilisateur cible (sans password) + log audit.
 * 🔒 OWNER strict.
 */
export const startImpersonation = mutation({
  args: {
    userId: v.id("users"),
    targetUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const owner = await requireOwnerStrict(ctx, args.userId);

    const target = await ctx.db.get(args.targetUserId);
    if (!target) throw new Error("Utilisateur cible introuvable");

    if (target._id === owner._id) {
      throw new Error("Vous ne pouvez pas vous impersonner vous-même.");
    }

    if (
      target.role === "superAdmin" ||
      (target.role === "admin" && !target.ecoleId)
    ) {
      throw new Error("Impossible d'impersonner un super admin.");
    }

    if (!target.ecoleId) {
      throw new Error("L'utilisateur cible n'appartient à aucune école.");
    }

    if (!ALLOWED_ROLES.includes(target.role)) {
      throw new Error("Rôle non autorisé pour l'impersonation.");
    }

    // Audit OBLIGATOIRE
    await ctx.db.insert("audit", {
      userId: args.userId,
      action: "impersonation_start",
      table: "users",
      documentId: target._id,
      date: new Date().toISOString(),
      ecoleId: target.ecoleId,
      details: `Impersonation démarrée : owner "${owner.nom}" → "${target.nom}" (${target.login}, ${target.role})`,
    });

    // Retour : user SANS password
    return {
      _id: target._id,
      nom: target.nom,
      prenom: target.prenom ?? "",
      postnom: target.postnom ?? "",
      login: target.login,
      role: target.role,
      ecoleId: target.ecoleId,
      permissions: target.permissions ?? [],
      isOwner: false,
      isActive: true,
      status: target.status ?? "active",
    };
  },
});

/**
 * Termine une session d'impersonation (log audit uniquement).
 * 🔒 OWNER strict.
 */
export const endImpersonation = mutation({
  args: {
    userId: v.id("users"),
    targetUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const owner = await requireOwnerStrict(ctx, args.userId);

    const target = await ctx.db.get(args.targetUserId);

    await ctx.db.insert("audit", {
      userId: args.userId,
      action: "impersonation_end",
      table: "users",
      documentId: args.targetUserId,
      date: new Date().toISOString(),
      ecoleId: target?.ecoleId,
      details: `Impersonation terminée : owner "${owner.nom}" ← "${
        target?.nom ?? "?"
      }"`,
    });

    return { success: true };
  },
});

/**
 * Historique des impersonations (pour la section Audit déjà existante).
 * 🔒 OWNER strict.
 */
export const listHistory = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireOwnerStrict(ctx, args.userId);

    const limit = Math.min(args.limit ?? 50, 200);

    const logs = await ctx.db.query("audit").order("desc").take(limit * 4);

    const filtered = logs
      .filter(
        (l) =>
          l.action === "impersonation_start" ||
          l.action === "impersonation_end"
      )
      .slice(0, limit);

    return filtered.map((l) => ({
      _id: l._id,
      action: l.action,
      details: l.details ?? "",
      date: l.date,
      ecoleId: l.ecoleId ?? null,
    }));
  },
});