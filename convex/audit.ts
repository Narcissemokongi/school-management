// convex/audit.ts
import { query, mutation, internalMutation, MutationCtx, QueryCtx } from "./_generated/server";
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
    auteurId: v.optional(v.id("users")), // ✨ NOUVEAU
    dateDebut: v.optional(v.number()),
    dateFin: v.optional(v.number()),
    recherche: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireGranularPermission(ctx, args.userId, "audit.read");

    const limit = Math.min(args.limit ?? 200, 500);

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

    // ✨ NOUVEAU — Filtre par auteur
    if (args.auteurId) {
      logs = logs.filter((l) => l.userId === args.auteurId);
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

    // ─── Enrichissement ───────
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

// ════════════════════════════════════════════════════════════════
// ✨ RÉTENTION CONFIGURABLE
// ════════════════════════════════════════════════════════════════

/**
 * Récupère la config de rétention.
 * null = illimité.
 * ✨ Permission : audit.read
 */
export const getRetention = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireGranularPermission(ctx, args.userId, "audit.read");

    const record = await ctx.db
      .query("parametresAbonnement")
      .withIndex("by_cle", (q) => q.eq("cle", "audit_retention"))
      .first();

    if (!record) return { retentionDays: null };

    try {
      const parsed = JSON.parse(record.valeur);
      return { retentionDays: parsed.retentionDays ?? null };
    } catch {
      return { retentionDays: null };
    }
  },
});

/**
 * Configure la rétention.
 * ✨ Permission : audit.read (owner uniquement via OWNER bypass)
 */
export const setRetention = mutation({
  args: {
    userId: v.id("users"),
    retentionDays: v.optional(v.number()), // undefined = illimité
  },
  handler: async (ctx, args) => {
    await requireGranularPermission(ctx, args.userId, "audit.read");

    // Validation
    if (args.retentionDays !== undefined && args.retentionDays !== null) {
      if (args.retentionDays < 30) {
        throw new Error("Rétention minimum : 30 jours.");
      }
      if (args.retentionDays > 3650) {
        throw new Error("Rétention maximum : 10 ans (3650 jours).");
      }
    }

    const now = new Date().toISOString();
    const existing = await ctx.db
      .query("parametresAbonnement")
      .withIndex("by_cle", (q) => q.eq("cle", "audit_retention"))
      .first();

    const valeur = JSON.stringify({
      retentionDays: args.retentionDays ?? null,
    });

    if (existing) {
      await ctx.db.patch(existing._id, {
        valeur,
        updatedAt: now,
        updatedBy: args.userId,
      });
    } else {
      await ctx.db.insert("parametresAbonnement", {
        cle: "audit_retention",
        valeur,
        updatedAt: now,
        updatedBy: args.userId,
      });
    }

    await ctx.db.insert("audit", {
      userId: args.userId,
      action: "update_audit_retention",
      table: "audit",
      documentId: "retention",
      date: now,
      details: args.retentionDays
        ? `Rétention configurée : ${args.retentionDays} jours`
        : "Rétention désactivée (conservation illimitée)",
    });

    return { success: true };
  },
});

// ════════════════════════════════════════════════════════════════
// ✨ LISTE DES AUTEURS (pour dropdown)
// ════════════════════════════════════════════════════════════════

/**
 * Liste des utilisateurs ayant effectué des actions, avec count.
 * ✨ Permission : audit.read
 */
export const listAuteurs = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireGranularPermission(ctx, args.userId, "audit.read");

    const logs = await ctx.db.query("audit").take(2000);
    const userIds = [...new Set(logs.map((l) => l.userId))];

    const usersDocs = await Promise.all(userIds.map((id) => ctx.db.get(id)));
    const usersMap = new Map<string, { nom: string; login: string; role: string }>();
    for (const u of usersDocs) {
      if (u) {
        usersMap.set(u._id, { nom: u.nom, login: u.login, role: u.role });
      }
    }

    // Count par user
    const counts: Record<string, number> = {};
    for (const l of logs) {
      counts[l.userId] = (counts[l.userId] ?? 0) + 1;
    }

    return [...usersMap.entries()]
      .map(([id, u]) => ({
        _id: id,
        nom: u.nom,
        login: u.login,
        role: u.role,
        count: counts[id] ?? 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 50);
  },
});

// ════════════════════════════════════════════════════════════════
// ✨ HEATMAP ACTIVITÉ
// ════════════════════════════════════════════════════════════════

/**
 * Stats heatmap : activité par jour de semaine × heure.
 * Retourne une grille 7×24 + max pour normalisation.
 * ✨ Permission : audit.read
 */
export const statsHeatmap = query({
  args: {
    userId: v.id("users"),
    joursRecents: v.optional(v.number()), // défaut 90, max 365
  },
  handler: async (ctx, args) => {
    await requireGranularPermission(ctx, args.userId, "audit.read");

    const nbJours = Math.min(Math.max(args.joursRecents ?? 90, 7), 365);
    const seuil = Date.now() - nbJours * 24 * 60 * 60 * 1000;

    const logs = await ctx.db.query("audit").order("desc").take(5000);

    // Grille 7 (jours) × 24 (heures)
    const grid: number[][] = Array.from({ length: 7 }, () =>
      Array(24).fill(0)
    );
    let total = 0;

    for (const l of logs) {
      const ts = new Date(l.date).getTime();
      if (ts < seuil) continue;

      const d = new Date(l.date);
      // Lundi = 0, Dimanche = 6
      const jour = (d.getDay() + 6) % 7;
      const heure = d.getHours();
      grid[jour][heure]++;
      total++;
    }

    // Max pour normaliser
    let max = 0;
    for (const row of grid) {
      for (const v of row) if (v > max) max = v;
    }

    return { grid, max, total, joursRecents: nbJours };
  },
});

// ════════════════════════════════════════════════════════════════
// ✨ PURGE AUTOMATIQUE (cron)
// ════════════════════════════════════════════════════════════════

/**
 * Purge automatique selon la rétention configurée.
 * Appelée quotidiennement par le cron.
 */
export const purgeRetention = internalMutation({
  args: {},
  handler: async (ctx) => {
    const record = await ctx.db
      .query("parametresAbonnement")
      .withIndex("by_cle", (q) => q.eq("cle", "audit_retention"))
      .first();

    if (!record) return { skipped: true, reason: "no config" };

    let retentionDays: number | null = null;
    try {
      const parsed = JSON.parse(record.valeur);
      retentionDays = parsed.retentionDays ?? null;
    } catch {
      return { skipped: true, reason: "invalid config" };
    }

    if (!retentionDays) {
      return { skipped: true, reason: "illimité" };
    }

    const seuil = new Date(
      Date.now() - retentionDays * 24 * 60 * 60 * 1000
    ).toISOString();

    let totalDeleted = 0;
    const BATCH = 100;
    const MAX_ITERATIONS = 50;

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const entries = await ctx.db
        .query("audit")
        .filter((q) => q.lt(q.field("date"), seuil))
        .take(BATCH);

      if (entries.length === 0) break;

      for (const e of entries) {
        await ctx.db.delete(e._id);
        totalDeleted++;
      }

      if (entries.length < BATCH) break;
    }

    return { deleted: totalDeleted, retentionDays };
  },
});