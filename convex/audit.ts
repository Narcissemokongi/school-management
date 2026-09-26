// convex/audit.ts
import { query, mutation, MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { requireGranularPermission } from "./helpers/permissions";

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
 * Détection OWNER strict (utilisé par purgeOlderThan uniquement).
 */
function isOwnerStrict(user: any): boolean {
  if (!user) return false;
  if (user.role === "admin" && !user.ecoleId) return true;
  return user.role === "superAdmin" && user.isOwner === true;
}

/**
 * Vérifie les droits d'accès à l'audit (admin école).
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

  if (!user.ecoleId) {
    throw new Error("Aucune école associée à votre compte.");
  }
  if (ecoleId && user.ecoleId !== ecoleId) {
    throw new Error("Vous n'êtes pas autorisé à consulter l'audit de cette école.");
  }

  return user;
}

/**
 * Vérifie que l'appelant est OWNER strict.
 * Utilisé uniquement pour les actions destructives (purge).
 */
async function requireOwnerStrict(ctx: AnyCtx, userId: Id<"users">) {
  const user = await ctx.db.get(userId);
  if (!user) throw new Error("Utilisateur introuvable");
  if (!isOwnerStrict(user)) {
    throw new Error("Réservé au propriétaire de la plateforme.");
  }
  return user;
}

// ============================================================
// MUTATIONS
// ============================================================

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
 * Purge des vieux logs — OWNER strict uniquement.
 * (Action destructive → on garde la restriction forte)
 */
export const purgeOlderThan = mutation({
  args: {
    userId: v.id("users"),
    daysOld: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user || !isOwnerStrict(user)) {
      throw new Error("Réservé au propriétaire de la plateforme.");
    }

    if (args.daysOld < 30) {
      throw new Error("Rétention minimum : 30 jours.");
    }

    const threshold = new Date(
      Date.now() - args.daysOld * 24 * 60 * 60 * 1000
    ).toISOString();

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
 * Liste basique de l'audit (utilisée par admin école).
 * Reste accessible aux admin/directeur/comptable.
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

    return await ctx.db
      .query("audit")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", user.ecoleId!))
      .order("desc")
      .take(take);
  },
});

// ════════════════════════════════════════════════════════════════════
// ✨ JOURNAL D'AUDIT CENTRALISÉ — permission granulaire "audit.read"
// ════════════════════════════════════════════════════════════════════

/**
 * Liste enrichie des logs d'audit avec filtres.
 * ✨ Permission : audit.read (OWNER bypass automatique)
 */
export const listAll = query({
  args: {
    userId: v.id("users"),
    action: v.optional(v.string()),
    ecoleId: v.optional(v.id("ecoles")),
    dateDebut: v.optional(v.number()),
    dateFin: v.optional(v.number()),
    recherche: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // ✨ Permission granulaire : audit.read
    await requireGranularPermission(ctx, args.userId, "audit.read");

    const limit = Math.min(args.limit ?? 200, 500);

    // Base : les plus récents d'abord (marge pour filtrage)
    let logs = await ctx.db
      .query("audit")
      .order("desc")
      .take(limit * 2);

    // ─── Filtres ────────────────────────────────────
    if (args.action) {
      logs = logs.filter((l) => l.action === args.action);
    }

    if (args.ecoleId) {
      logs = logs.filter((l) => l.ecoleId === args.ecoleId);
    }

    if (args.dateDebut !== undefined) {
      const debutIso = new Date(args.dateDebut).toISOString();
      logs = logs.filter((l) => l.date >= debutIso);
    }

    if (args.dateFin !== undefined) {
      const finIso = new Date(args.dateFin).toISOString();
      logs = logs.filter((l) => l.date <= finIso);
    }

    if (args.recherche && args.recherche.trim()) {
      const q = args.recherche.toLowerCase().trim();
      logs = logs.filter((l) => {
        const details = (l.details ?? "").toLowerCase();
        const action = l.action.toLowerCase();
        const docId = l.documentId.toLowerCase();
        return details.includes(q) || action.includes(q) || docId.includes(q);
      });
    }

    logs = logs.slice(0, limit);

    // ─── Enrichissement : Maps users + écoles ───────
    const userIds = [...new Set(logs.map((l) => l.userId))];
    const ecoleIds = [
      ...new Set(logs.filter((l) => l.ecoleId).map((l) => l.ecoleId!)),
    ];

    const usersDocs = await Promise.all(userIds.map((id) => ctx.db.get(id)));
    const ecolesDocs = await Promise.all(ecoleIds.map((id) => ctx.db.get(id)));

    const usersMap = new Map<
      string,
      { nom: string; login: string; role: string }
    >();
    for (const u of usersDocs) {
      if (u) {
        usersMap.set(u._id, { nom: u.nom, login: u.login, role: u.role });
      }
    }

    const ecolesMap = new Map<string, { nom: string; code: string }>();
    for (const e of ecolesDocs) {
      if (e) {
        ecolesMap.set(e._id, { nom: e.nom, code: e.code ?? "" });
      }
    }

    return logs.map((l) => {
      const u = usersMap.get(l.userId);
      const e = l.ecoleId ? ecolesMap.get(l.ecoleId) : null;
      return {
        _id: l._id,
        action: l.action,
        table: l.table,
        documentId: l.documentId,
        details: l.details ?? "",
        date: l.date,
        userId: l.userId,
        auteurNom: u?.nom ?? "Utilisateur supprimé",
        auteurLogin: u?.login ?? "—",
        auteurRole: u?.role ?? "—",
        ecoleId: l.ecoleId ?? null,
        ecoleNom: e?.nom ?? null,
        ecoleCode: e?.code ?? null,
      };
    });
  },
});

/**
 * Stats globales pour les KPI cards.
 * ✨ Permission : audit.read
 */
export const stats = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // ✨ Permission granulaire : audit.read
    await requireGranularPermission(ctx, args.userId, "audit.read");

    const all = await ctx.db.query("audit").order("desc").take(2000);

    const now = Date.now();
    const il24h = now - 24 * 60 * 60 * 1000;
    const il7j = now - 7 * 24 * 60 * 60 * 1000;

    const parAction: Record<string, number> = {};
    let dernieres24h = 0;
    let derniers7j = 0;

    for (const l of all) {
      parAction[l.action] = (parAction[l.action] ?? 0) + 1;
      const ts = new Date(l.date).getTime();
      if (ts >= il24h) dernieres24h++;
      if (ts >= il7j) derniers7j++;
    }

    const topActions = Object.entries(parAction)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([action, count]) => ({ action, count }));

    return {
      total: all.length,
      dernieres24h,
      derniers7j,
      topActions,
    };
  },
});

/**
 * Liste distincte des actions (dropdown filtre).
 * ✨ Permission : audit.read
 */
export const listActions = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // ✨ Permission granulaire : audit.read
    await requireGranularPermission(ctx, args.userId, "audit.read");

    const all = await ctx.db.query("audit").take(500);
    const actions = [...new Set(all.map((l) => l.action))].sort();
    return actions;
  },
});

/**
 * Liste des écoles (dropdown filtre).
 * ✨ Permission : audit.read
 */
export const listEcoles = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // ✨ Permission granulaire : audit.read
    await requireGranularPermission(ctx, args.userId, "audit.read");

    const ecoles = await ctx.db.query("ecoles").take(500);
    return ecoles
      .map((e) => ({ _id: e._id, nom: e.nom, code: e.code ?? "" }))
      .sort((a, b) => a.nom.localeCompare(b.nom));
  },
});