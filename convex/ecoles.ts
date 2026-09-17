// convex/ecoles.ts
import { query, mutation, MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
// ✅ Import uniquement `isSuperAdmin` (large) — accepte tous les superAdmins
import { isSuperAdmin } from "./helpers/auth";

type AnyCtx = MutationCtx | QueryCtx;

const MAX_ECOLES = 500;

// ════════════════════════════════════════════════════════════════════
// OUTILS
// ════════════════════════════════════════════════════════════════════

/**
 * ✅ Tout superAdmin (principal OU secondaire) a toutes les permissions.
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
 * (principal OU secondaire) peut lister les écoles, stats, etc.
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

  const isSuper = isSuperAdmin(user);   // ✅ was: hasPermission(user, "gestion_ecoles")
  const isEcoleAdmin =
    (user.role === "admin" || user.role === "directeur") &&
    user.ecoleId === ecoleId;

  if (!isSuper && !isEcoleAdmin) {
    throw new Error("Permission insuffisante pour modifier cette école.");
  }
  return user;
}

// ════════════════════════════════════════════════════════════════════
// QUERIES
// ════════════════════════════════════════════════════════════════════

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

export const remove = mutation({
  args: { ecoleId: v.id("ecoles"), userId: v.id("users") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.userId, "gestion_ecoles");

    const ecole = await ctx.db.get(args.ecoleId);
    if (!ecole) throw new Error("École introuvable");

    const tables = [
      "eleves",
      "classes",
      "fautes",
      "sanctions",
      "punitions",
      "messages",
      "notes",
      "cours",
      "absences",
      "emploiDuTemps",
      "frais",
      "audit",
      "anneesScolaires",
      "inscriptions",
      "propositionsPassage",
      "parentLinkRequests",
      "examens",
    ];

    let totalDeleted = 0;

    for (const table of tables) {
      const BATCH = 100;
      // eslint-disable-next-line no-constant-condition
      while (true) {
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
      }
    }

    await ctx.db.delete(args.ecoleId);

    await ctx.db.insert("audit", {
      userId: args.userId,
      action: "delete_ecole",
      table: "ecoles",
      documentId: args.ecoleId,
      date: new Date().toISOString(),
      ecoleId: undefined,
      details: `Suppression de l'école "${ecole.nom}" (${totalDeleted} enregistrements liés)`,
    });

    return { success: true, deletedRecords: totalDeleted };
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
// INITIALISATIONS (admin one-shot)
// ════════════════════════════════════════════════════════════════════

export const initUserCounts = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx, args.userId);

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
    await requireSuperAdmin(ctx, args.userId);

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