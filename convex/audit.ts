import { query, mutation, MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

type AnyCtx = QueryCtx | MutationCtx;

const MAX_AUDIT_ROWS = 500;
const AUDIT_ALLOWED_ROLES = ["admin", "directeur", "disciplinaire", "comptable"];

/**
 * 🔴 FIX : tout superAdmin passe désormais (avant : seulement ceux
 * sans permissions — ce qui bloquait les superAdmins "configurés").
 */
function isSuperAdmin(user: any): boolean {
  if (!user) return false;
  return (
    user.role === "superAdmin" ||
    (user.role === "admin" && !user.ecoleId)
  );
}

/**
 * Vérifie les droits d'accès à l'audit.
 * Retourne l'utilisateur si autorisé, lève sinon.
 */
async function requireAuditAccess(
  ctx: AnyCtx,
  userId: string | undefined,
  ecoleId?: string
) {
  if (!userId) throw new Error("Authentification requise");
  const user = await ctx.db.get(userId as Id<"users">);
  if (!user) throw new Error("Utilisateur introuvable");

  if (isSuperAdmin(user)) return user;

  if (!AUDIT_ALLOWED_ROLES.includes(user.role)) {
    throw new Error("Accès refusé : rôle insuffisant pour consulter l'audit");
  }

  // 🔴 FIX : pour les non-superadmins, l'école est obligatoire
  if (!user.ecoleId) {
    throw new Error("Aucune école associée à votre compte.");
  }
  if (ecoleId && user.ecoleId !== ecoleId) {
    throw new Error("Vous n'êtes pas autorisé à consulter l'audit de cette école.");
  }

  return user;
}

// ============================================================
// MUTATIONS
// ============================================================

/**
 * Force l'écriture d'une entrée d'audit.
 * Réservé aux admins (école ou super). En usage normal, l'audit
 * est écrit directement par les mutations métier.
 */
export const addEntry = mutation({
  args: {
    userId: v.id("users"),
    action: v.string(),
    table: v.string(),
    documentId: v.string(),
    details: v.optional(v.string()),
    ecoleId: v.optional(v.id("ecoles")),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("Utilisateur introuvable");

    const superAdmin = isSuperAdmin(user);

    if (!superAdmin && user.role !== "admin") {
      throw new Error("Accès refusé : seul un admin peut forcer une entrée d'audit");
    }

    // 🔴 FIX : un admin d'école ne peut écrire que dans SON école
    let finalEcoleId = args.ecoleId;
    if (!superAdmin) {
      if (!user.ecoleId) {
        throw new Error("Aucune école associée à votre compte.");
      }
      if (args.ecoleId && args.ecoleId !== user.ecoleId) {
        throw new Error("Vous ne pouvez pas écrire dans l'audit d'une autre école.");
      }
      finalEcoleId = user.ecoleId;
    }

    await ctx.db.insert("audit", {
      userId: args.userId,
      action: args.action,
      table: args.table,
      documentId: args.documentId,
      details: args.details,
      ecoleId: finalEcoleId,
      date: new Date().toISOString(),
    });

    return { success: true };
  },
});

/**
 * 🟢 NOUVEAU : purge des vieux logs. Réservé super-admin.
 * Évite la croissance infinie de la table audit.
 */
export const purgeOlderThan = mutation({
  args: {
    userId: v.id("users"),
    daysOld: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user || !isSuperAdmin(user)) {
      throw new Error("Réservé au super-admin.");
    }

    if (args.daysOld < 30) {
      throw new Error("Rétention minimum : 30 jours.");
    }

    const threshold = new Date(
      Date.now() - args.daysOld * 24 * 60 * 60 * 1000
    ).toISOString();

    // Suppression par batches pour ne pas saturer la mutation
    let totalDeleted = 0;
    const BATCH = 100;

    while (true) {
      const entries = await ctx.db
        .query("audit")
        .filter((q) => q.lt(q.field("date"), threshold))
        .take(BATCH);

      if (entries.length === 0) break;

      for (const entry of entries) {
        await ctx.db.delete(entry._id);
        totalDeleted++;
      }

      if (entries.length < BATCH) break;
    }

    // Trace la purge elle-même
    await ctx.db.insert("audit", {
      userId: args.userId,
      action: "purge_audit",
      table: "audit",
      documentId: "purge",
      date: new Date().toISOString(),
      ecoleId: undefined,
      details: `${totalDeleted} entrée(s) supprimée(s) (> ${args.daysOld} jours)`,
    });

    return { success: true, deleted: totalDeleted };
  },
});

// ============================================================
// QUERIES
// ============================================================

/**
 * Liste les entrées d'audit.
 * - Super-admin : peut voir tout ou une école ciblée
 * - Autres rôles autorisés : uniquement leur école
 *
 * 🔴 FIX : ajout d'une limite (500 par défaut, 2000 max)
 * pour éviter de charger des milliers de lignes en mémoire.
 */
export const list = query({
  args: {
    ecoleId: v.optional(v.id("ecoles")),
    userId: v.optional(v.id("users")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuditAccess(ctx, args.userId, args.ecoleId);
    const superAdmin = isSuperAdmin(user);
    const take = Math.min(args.limit ?? MAX_AUDIT_ROWS, 2000);

    if (superAdmin) {
      if (args.ecoleId) {
        return await ctx.db
          .query("audit")
          .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId!))
          .order("desc")
          .take(take);
      }
      return await ctx.db.query("audit").order("desc").take(take);
    }

    // Non-superadmin : requireAuditAccess a déjà validé user.ecoleId
    return await ctx.db
      .query("audit")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", user.ecoleId!))
      .order("desc")
      .take(take);
  },
});