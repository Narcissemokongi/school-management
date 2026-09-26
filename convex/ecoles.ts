// convex/ecoles.ts
import { query, mutation, MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
// ✅ Import : `isSuperAdmin` (large) + `requireOwner` (strict pour mutations one-shot)
import { isSuperAdmin, requireOwner } from "./helpers/auth";

type AnyCtx = MutationCtx | QueryCtx;

const MAX_ECOLES = 500;

// ════════════════════════════════════════════════════════════════════
// OUTILS
// ════════════════════════════════════════════════════════════════════

/**
 * ✅ Tout superAdmin (propriétaire OU secondaire) a toutes les permissions.
 */
function hasPermission(user: any, permission: string): boolean {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;
  if (user.role !== "superAdmin") return false;
  return user.permissions?.includes(permission) ?? false;
}

async function requireAuth(ctx: AnyCtx, userId: string | undefined) {
  if (!userId) throw new Error("Authentification requise");
  const user = await ctx.db.get(userId as Id<"users">);
  if (!user) throw new Error("Utilisateur introuvable");
  return user;
}

async function requirePermission(
  ctx: AnyCtx,
  userId: string | undefined,
  permission: string
) {
  const user = await requireAuth(ctx, userId);
  if (!hasPermission(user, permission)) {
    throw new Error(`Permission insuffisante : ${permission}`);
  }
  return user;
}

/**
 * ✅ FIX — utilise `isSuperAdmin` (large) : TOUT superAdmin
 * (propriétaire OU secondaire) peut lister les écoles, stats, etc.
 */
async function requireSuperAdmin(ctx: AnyCtx, userId: string | undefined) {
  const user = await requireAuth(ctx, userId);
  if (!isSuperAdmin(user)) {
    throw new Error("Réservé au super-admin.");
  }
  return user;
}

/**
 * ✅ FIX — variable locale renommée `isSuper` pour éviter le shadowing
 * avec l'import `isSuperAdmin`.
 */
async function requireEcoleAdminOrSuperAdmin(
  ctx: AnyCtx,
  userId: string | undefined,
  ecoleId: string
) {
  const user = await requireAuth(ctx, userId);

  const isSuper = isSuperAdmin(user);
  const isEcoleAdmin =
    (user.role === "admin" || user.role === "directeur") &&
    user.ecoleId === ecoleId;

  if (!isSuper && !isEcoleAdmin) {
    throw new Error("Permission insuffisante pour modifier cette école.");
  }
  return user;
}

/**
 * ✨ NOUVEAU — Détection OWNER stricte (alignée sur le frontend).
 */
function checkIsOwner(user: any): boolean {
  if (!user) return false;
  if (user.role === "admin" && !user.ecoleId) return true; // legacy
  return user.role === "superAdmin" && user.isOwner === true;
}

// ════════════════════════════════════════════════════════════════════
// QUERIES
// ════════════════════════════════════════════════════════════════════

/**
 * ✅ FIX — Query de LECTURE → ouverte à tout super admin.
 */
export const list = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.userId);
    return await ctx.db.query("ecoles").take(MAX_ECOLES);
  },
});

export const get = query({
  args: {
    ecoleId: v.id("ecoles"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    if (args.userId) {
      await requireAuth(ctx, args.userId);
    }
    return await ctx.db.get(args.ecoleId);
  },
});

export const getByCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const ecole = await ctx.db
      .query("ecoles")
      .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
      .first();
    if (!ecole) return null;
    return {
      _id: ecole._id,
      nom: ecole.nom,
      code: ecole.code,
      statut: ecole.statut ?? "active",
    };
  },
});

export const listWithUserCount = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.userId);
    const ecoles = await ctx.db.query("ecoles").take(MAX_ECOLES);
    return ecoles.map((ecole) => ({
      ...ecole,
      userCount: ecole.userCount ?? 0,
      statut: ecole.statut ?? "active",
    }));
  },
});

export const listRecent = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    if (args.userId) await requireAuth(ctx, args.userId);
    return await ctx.db.query("ecoles").order("desc").take(5);
  },
});

export const count = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    if (args.userId) await requireAuth(ctx, args.userId);
    const all = await ctx.db.query("ecoles").take(MAX_ECOLES);
    return all.length;
  },
});

/**
 * ✅ FIX — Query de LECTURE → ouverte à tout super admin.
 */
export const listWithStats = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.userId);

    const ecoles = await ctx.db.query("ecoles").take(MAX_ECOLES);
    const users = await ctx.db.query("users").take(2000);
    const classes = await ctx.db.query("classes").take(2000);
    const eleves = await ctx.db.query("eleves").take(2000);

    const countUsers: Record<string, number> = {};
    for (const u of users)
      if (u.ecoleId) countUsers[u.ecoleId] = (countUsers[u.ecoleId] || 0) + 1;

    const countClasses: Record<string, number> = {};
    for (const c of classes)
      if (c.ecoleId) countClasses[c.ecoleId] = (countClasses[c.ecoleId] || 0) + 1;

    const countEleves: Record<string, number> = {};
    for (const e of eleves)
      if (e.ecoleId) countEleves[e.ecoleId] = (countEleves[e.ecoleId] || 0) + 1;

    return ecoles.map((ecole) => ({
      ...ecole,
      userCount: countUsers[ecole._id] || 0,
      classCount: countClasses[ecole._id] || 0,
      eleveCount: countEleves[ecole._id] || 0,
    }));
  },
});

// ════════════════════════════════════════════════════════════════════
// ✨ NOUVEAU — DRILL-DOWN ÉCOLE
// ════════════════════════════════════════════════════════════════════

/**
 * ✨ NOUVEAU — Détail complet d'une école pour le drill-down super admin.
 * Agrège en une seule requête : infos + stats + abonnement + audit.
 *
 * - `abonnement` et `paiements` sont renvoyés uniquement pour l'OWNER.
 * - Les autres données (stats, users) sont accessibles à tout superAdmin.
 */
export const getDetailComplet = query({
  args: {
    userId: v.id("users"),
    ecoleId: v.id("ecoles"),
  },
  handler: async (ctx, args) => {
    // Autorisation : tout superAdmin peut voir le détail
    const requester = await requireSuperAdmin(ctx, args.userId);

    // Données financières réservées à l'OWNER
    const isOwner = checkIsOwner(requester);

    const ecole = await ctx.db.get(args.ecoleId);
    if (!ecole) throw new Error("École introuvable");

    // ─── Utilisateurs de l'école ─────────────────────────
    const users = await ctx.db
      .query("users")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId))
      .take(1000);

    const usersParRole: Record<string, number> = {};
    let derniereConnexion = 0;
    for (const u of users) {
      usersParRole[u.role] = (usersParRole[u.role] ?? 0) + 1;
      if (u._creationTime > derniereConnexion) {
        derniereConnexion = u._creationTime;
      }
    }

    // ─── Élèves ──────────────────────────────────────────
    const eleves = await ctx.db
      .query("eleves")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId))
      .take(5000);

    const elevesParClasse: Record<string, number> = {};
    for (const e of eleves) {
      const classe = e.classe ?? "Non affecté";
      elevesParClasse[classe] = (elevesParClasse[classe] ?? 0) + 1;
    }

    // ─── Classes ─────────────────────────────────────────
    const classes = await ctx.db
      .query("classes")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId))
      .take(500);

    // ─── Abonnement + paiements (OWNER uniquement) ───────
    let abonnementDoc: any = null;
    let paiementsDocs: any[] = [];

    if (isOwner) {
      const abos = await ctx.db
        .query("abonnements")
        .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId))
        .take(10);

      if (abos.length > 0) {
        abonnementDoc = abos[0];
        paiementsDocs = await ctx.db
          .query("paiementsAbonnement")
          .withIndex("by_abonnementId", (q) =>
            q.eq("abonnementId", abonnementDoc._id)
          )
          .order("desc")
          .take(20);
      }
    }

    // ─── Audit récent de l'école ─────────────────────────
    const audits = await ctx.db
      .query("audit")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId))
      .order("desc")
      .take(50);

    // Enrichir les audits avec le nom de l'auteur (boucle explicite → TS safe)
    const auditUserIds = [...new Set(audits.map((a) => a.userId))];
    const auditUsersDocs = await Promise.all(
      auditUserIds.map((id) => ctx.db.get(id))
    );
    const auditUsersMap = new Map<string, string>();
    for (const u of auditUsersDocs) {
      if (u) auditUsersMap.set(u._id, u.nom);
    }

    const auditsEnrichis = audits.map((a) => ({
      _id: a._id,
      action: a.action,
      table: a.table,
      documentId: a.documentId,
      details: a.details ?? "",
      date: a.date,
      auteurNom: auditUsersMap.get(a.userId) ?? "Inconnu",
    }));

    return {
      ecole: {
        _id: ecole._id,
        nom: ecole.nom,
        code: ecole.code ?? "",
        devise: ecole.devise ?? "USD",
        statut: ecole.statut ?? "active",
        typePeriode: ecole.typePeriode ?? "trimestre",
        userCount: ecole.userCount ?? users.length,
        _creationTime: ecole._creationTime,
      },
      stats: {
        nbUsers: users.length,
        nbEleves: eleves.length,
        nbClasses: classes.length,
        usersParRole,
        elevesParClasse,
        derniereConnexion,
      },
      abonnement: abonnementDoc
        ? {
            _id: abonnementDoc._id,
            statut: abonnementDoc.statut,
            formule: abonnementDoc.formule,
            montantMensuel: abonnementDoc.montantMensuel,
            dateDebut: abonnementDoc.dateDebut,
            dateExpiration: abonnementDoc.dateExpiration,
            prochaineEcheance: abonnementDoc.prochaineEcheance,
            delaiGraceJours: abonnementDoc.delaiGraceJours,
            nombreUtilisateurs: abonnementDoc.nombreUtilisateurs,
            notes: abonnementDoc.notes ?? "",
          }
        : null,
      paiements: paiementsDocs.map((p) => ({
        _id: p._id,
        montant: p.montant,
        devise: p.devise,
        datePaiement: p.datePaiement,
        methodePaiement: p.methodePaiement ?? "",
        reference: p.reference ?? "",
        periodeDebut: p.periodeDebut,
        periodeFin: p.periodeFin,
      })),
      audits: auditsEnrichis,
      isOwner, // ✨ Permet au frontend de masquer l'onglet Abonnement
    };
  },
});

/**
 * ✨ NOUVEAU — Liste des utilisateurs d'une école (onglet Utilisateurs).
 * Accessible à tout superAdmin.
 */
export const listUsersEcole = query({
  args: {
    userId: v.id("users"),
    ecoleId: v.id("ecoles"),
    filtreRole: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.userId);

    const users = await ctx.db
      .query("users")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId))
      .take(500);

    const filtres = args.filtreRole
      ? users.filter((u) => u.role === args.filtreRole)
      : users;

    return filtres.map((u) => ({
      _id: u._id,
      nom: u.nom,
      prenom: u.prenom ?? "",
      postnom: u.postnom ?? "",
      login: u.login,
      role: u.role,
      status: u.status ?? "active",
      isActive: u.isActive !== false,
      email: u.email ?? "",
      _creationTime: u._creationTime,
    }));
  },
});

// ════════════════════════════════════════════════════════════════════
// MUTATIONS
// ════════════════════════════════════════════════════════════════════

export const add = mutation({
  args: { nom: v.string(), userId: v.id("users") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.userId, "gestion_ecoles");

    const existing = await ctx.db
      .query("ecoles")
      .filter((q) => q.eq(q.field("nom"), args.nom))
      .first();
    if (existing) throw new Error("Une école portant ce nom existe déjà.");

    let code = "";
    let attempts = 0;
    while (attempts < 10) {
      code = generateSchoolCode();
      const existingCode = await ctx.db
        .query("ecoles")
        .withIndex("by_code", (q) => q.eq("code", code))
        .first();
      if (!existingCode) break;
      attempts++;
    }
    if (attempts >= 10) {
      throw new Error("Impossible de générer un code école unique. Réessayez.");
    }

    const newId = await ctx.db.insert("ecoles", {
      nom: args.nom,
      code,
      userCount: 0,
      statut: "active",
    });

    await ctx.db.insert("audit", {
      userId: args.userId,
      action: "create_ecole",
      table: "ecoles",
      documentId: newId,
      date: new Date().toISOString(),
      ecoleId: newId,
      details: `Création de l'école "${args.nom}" (code: ${code})`,
    });

    return newId;
  },
});

/**
 * 🔴 Suppression d'une école avec cascade robuste.
 *
 * - Limite 50 itérations × 100 records = 5000 max par table
 * - try/catch par table → continue même si un index manque
 * - Vérifie qu'aucun user ne reste attaché avant suppression
 * - Liste complète des tables dépendantes
 */
export const remove = mutation({
  args: { ecoleId: v.id("ecoles"), userId: v.id("users") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.userId, "gestion_ecoles");

    const ecole = await ctx.db.get(args.ecoleId);
    if (!ecole) throw new Error("École introuvable");

    // ✅ Liste COMPLÈTE des tables dépendantes
    const tables = [
      // Structure
      "anneesScolaires",
      "classes",
      "fraisClasses",
      // Élèves
      "eleves",
      "inscriptions",
      "propositionsPassage",
      "parentLinkRequests",
      // Pédagogie
      "notes",
      "cours",
      "examens",
      "absences",
      "emploiDuTemps",
      // Discipline
      "fautes",
      "sanctions",
      "punitions",
      // Finance
      "frais",
      // Communication
      "messages",
      "appels",
      // Audit (en dernier pour garder la trace)
      "audit",
    ];

    let totalDeleted = 0;
    const failures: string[] = [];

    // ✅ Batch suppression avec gestion d'erreur par table
    for (const table of tables) {
      const BATCH = 100;
      let iterations = 0;
      const MAX_ITERATIONS = 50; // 5000 records max par table

      try {
        while (iterations < MAX_ITERATIONS) {
          const records = await ctx.db
            .query(table as any)
            .withIndex("by_ecoleId", (q: any) => q.eq("ecoleId", args.ecoleId))
            .take(BATCH);

          if (records.length === 0) break;

          for (const record of records) {
            await ctx.db.delete(record._id);
            totalDeleted++;
          }

          if (records.length < BATCH) break;
          iterations++;
        }

        if (iterations >= MAX_ITERATIONS) {
          console.warn(
            `[ecoles.remove] Limite atteinte pour ${table} (${BATCH * MAX_ITERATIONS} records)`
          );
        }
      } catch (err: any) {
        // ✅ Sécurité : si l'index manque, on log et on continue
        const msg = err?.message ?? String(err);
        console.warn(`[ecoles.remove] Erreur sur table ${table}: ${msg}`);
        failures.push(`${table} (${msg})`);
      }
    }

    // ✅ Vérifier qu'il ne reste AUCUN user attaché
    const remainingUsers = await ctx.db
      .query("users")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId))
      .take(1);

    if (remainingUsers.length > 0) {
      throw new Error(
        "Impossible de supprimer : des utilisateurs sont encore attachés à cette école. " +
        "Supprimez-les ou réassignez-les d'abord (Super Admin > Gestion Utilisateurs)."
      );
    }

    await ctx.db.delete(args.ecoleId);

    await ctx.db.insert("audit", {
      userId: args.userId,
      action: "delete_ecole",
      table: "ecoles",
      documentId: args.ecoleId,
      date: new Date().toISOString(),
      ecoleId: undefined,
      details:
        `Suppression de l'école "${ecole.nom}" (${totalDeleted} enregistrements liés)` +
        (failures.length > 0
          ? ` — ${failures.length} table(s) en échec : ${failures.join(", ")}`
          : ""),
    });

    return {
      success: true,
      deletedRecords: totalDeleted,
      warnings: failures.length > 0 ? failures : undefined,
    };
  },
});

// ════════════════════════════════════════════════════════════════════
// MISE À JOUR (admin école ou super admin)
// ════════════════════════════════════════════════════════════════════

export const update = mutation({
  args: {
    ecoleId: v.id("ecoles"),
    nom: v.optional(v.string()),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireEcoleAdminOrSuperAdmin(ctx, args.userId, args.ecoleId);
    const ecole = await ctx.db.get(args.ecoleId);
    if (!ecole) throw new Error("École introuvable");
    await ctx.db.patch(args.ecoleId, { nom: args.nom ?? ecole.nom });
    return { success: true };
  },
});

export const updateLogo = mutation({
  args: {
    ecoleId: v.id("ecoles"),
    logoUrl: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireEcoleAdminOrSuperAdmin(ctx, args.userId, args.ecoleId);
    await ctx.db.patch(args.ecoleId, { logo: args.logoUrl } as any);
    return { success: true };
  },
});

export const updateDevise = mutation({
  args: {
    ecoleId: v.id("ecoles"),
    devise: v.union(v.literal("CDF"), v.literal("USD")),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireEcoleAdminOrSuperAdmin(ctx, args.userId, args.ecoleId);
    await ctx.db.patch(args.ecoleId, { devise: args.devise });
    return { success: true };
  },
});

export const updateTypePeriode = mutation({
  args: {
    ecoleId: v.id("ecoles"),
    typePeriode: v.union(v.literal("trimestre"), v.literal("semestre")),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireEcoleAdminOrSuperAdmin(ctx, args.userId, args.ecoleId);
    await ctx.db.patch(args.ecoleId, { typePeriode: args.typePeriode });
    return { success: true };
  },
});

export const updateBareme = mutation({
  args: {
    ecoleId: v.id("ecoles"),
    bareme: v.number(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireEcoleAdminOrSuperAdmin(ctx, args.userId, args.ecoleId);
    await ctx.db.patch(args.ecoleId, { bareme: args.bareme });
    return { success: true };
  },
});

export const updateMentions = mutation({
  args: {
    ecoleId: v.id("ecoles"),
    seuilFelicitations: v.optional(v.number()),
    seuilEncouragement: v.optional(v.number()),
    seuilAvertissement: v.optional(v.number()),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireEcoleAdminOrSuperAdmin(ctx, args.userId, args.ecoleId);
    const { ecoleId, userId, ...fields } = args;
    await ctx.db.patch(ecoleId, fields);
    return { success: true };
  },
});

export const suspendEcole = mutation({
  args: { ecoleId: v.id("ecoles"), userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireEcoleAdminOrSuperAdmin(ctx, args.userId, args.ecoleId);
    await ctx.db.patch(args.ecoleId, { statut: "suspendue" });

    await ctx.db.insert("audit", {
      userId: args.userId,
      action: "suspend_ecole",
      table: "ecoles",
      documentId: args.ecoleId,
      date: new Date().toISOString(),
      ecoleId: args.ecoleId,
      details: `École suspendue`,
    });

    return { success: true };
  },
});

export const reactiverEcole = mutation({
  args: { ecoleId: v.id("ecoles"), userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireEcoleAdminOrSuperAdmin(ctx, args.userId, args.ecoleId);
    await ctx.db.patch(args.ecoleId, { statut: "active" });

    await ctx.db.insert("audit", {
      userId: args.userId,
      action: "reactivate_ecole",
      table: "ecoles",
      documentId: args.ecoleId,
      date: new Date().toISOString(),
      ecoleId: args.ecoleId,
      details: `École réactivée`,
    });

    return { success: true };
  },
});

// ════════════════════════════════════════════════════════════════════
// INITIALISATIONS (admin one-shot) — 🔒 OWNER uniquement
// ════════════════════════════════════════════════════════════════════

export const initUserCounts = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireOwner(ctx, args.userId);

    const ecoles = await ctx.db.query("ecoles").take(MAX_ECOLES);
    const users = await ctx.db.query("users").take(5000);

    const countByEcole: Record<string, number> = {};
    for (const user of users) {
      if (user.ecoleId) {
        countByEcole[user.ecoleId] = (countByEcole[user.ecoleId] || 0) + 1;
      }
    }

    for (const ecole of ecoles) {
      await ctx.db.patch(ecole._id, {
        userCount: countByEcole[ecole._id] || 0,
      });
    }

    return { success: true };
  },
});

export const initStatuts = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireOwner(ctx, args.userId);

    const ecoles = await ctx.db.query("ecoles").take(MAX_ECOLES);
    for (const ecole of ecoles) {
      if (!ecole.statut) {
        await ctx.db.patch(ecole._id, { statut: "active" });
      }
    }
    return { success: true };
  },
});

// ════════════════════════════════════════════════════════════════════
// UTILITAIRE
// ════════════════════════════════════════════════════════════════════

function generateSchoolCode(length = 6): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}