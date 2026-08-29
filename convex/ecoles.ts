import { query, mutation, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "../convex/_generated/dataModel";

// ========== OUTILS ==========

function isSuperAdminPrincipal(user: any): boolean {
  return (
    (user?.role === "admin" && !user.ecoleId) ||
    (user?.role === "superAdmin" && (!user.permissions || user.permissions.length === 0))
  );
}

function hasPermission(user: any, permission: string): boolean {
  if (!user) return false;
  if (isSuperAdminPrincipal(user)) return true;
  if (user.role !== "superAdmin") return false;
  return user.permissions?.includes(permission) ?? false;
}

async function requirePermission(ctx: MutationCtx, userId: string | undefined, permission: string) {
  if (!userId) throw new Error("Authentification requise");
  const user = await ctx.db.get(userId as Id<"users">);
  if (!user) throw new Error("Utilisateur introuvable");
  if (!hasPermission(user, permission)) {
    throw new Error(`Permission insuffisante : ${permission}`);
  }
  return user;
}

// ✅ Nouvelle fonction : autorise les admins/directeurs de l'école
async function requireEcoleAdminOrSuperAdmin(ctx: MutationCtx, userId: string | undefined, ecoleId: string) {
  if (!userId) throw new Error("Authentification requise");
  const user = await ctx.db.get(userId as Id<"users">);
  if (!user) throw new Error("Utilisateur introuvable");

  const isSuperAdmin = hasPermission(user, "gestion_ecoles");
  const isEcoleAdmin =
    (user.role === "admin" || user.role === "directeur") && user.ecoleId === ecoleId;

  if (!isSuperAdmin && !isEcoleAdmin) {
    throw new Error("Permission insuffisante pour modifier cette école.");
  }
  return user;
}

// ========== QUERIES ==========
// (inchangé, je les ai gardées telles quelles)

export const list = query({ handler: async (ctx) => await ctx.db.query("ecoles").collect() });

export const get = query({
  args: { ecoleId: v.id("ecoles") },
  handler: async (ctx, args) => await ctx.db.get(args.ecoleId),
});

export const getByCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) => await ctx.db.query("ecoles").withIndex("by_code", (q) => q.eq("code", args.code)).unique(),
});

export const listWithUserCount = query({
  handler: async (ctx) => {
    const ecoles = await ctx.db.query("ecoles").collect();
    return ecoles.map((ecole) => ({ ...ecole, userCount: ecole.userCount ?? 0, statut: ecole.statut ?? "active" }));
  },
});

export const listRecent = query({
  handler: async (ctx) => await ctx.db.query("ecoles").order("desc").take(5),
});

export const count = query({
  handler: async (ctx) => (await ctx.db.query("ecoles").collect()).length,
});

export const listWithStats = query({
  handler: async (ctx) => {
    const ecoles = await ctx.db.query("ecoles").collect();
    const users = await ctx.db.query("users").collect();
    const classes = await ctx.db.query("classes").collect();
    const eleves = await ctx.db.query("eleves").collect();

    const countUsers: Record<string, number> = {};
    for (const u of users) if (u.ecoleId) countUsers[u.ecoleId] = (countUsers[u.ecoleId] || 0) + 1;

    const countClasses: Record<string, number> = {};
    for (const c of classes) if (c.ecoleId) countClasses[c.ecoleId] = (countClasses[c.ecoleId] || 0) + 1;

    const countEleves: Record<string, number> = {};
    for (const e of eleves) if (e.ecoleId) countEleves[e.ecoleId] = (countEleves[e.ecoleId] || 0) + 1;

    return ecoles.map((ecole) => ({
      ...ecole,
      userCount: countUsers[ecole._id] || 0,
      classCount: countClasses[ecole._id] || 0,
      eleveCount: countEleves[ecole._id] || 0,
    }));
  },
});

// ========== MUTATIONS ==========

// Ajout d'une école (super admin uniquement)
export const add = mutation({
  args: { nom: v.string(), userId: v.id("users") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.userId, "gestion_ecoles");
    const existing = await ctx.db.query("ecoles").filter((q) => q.eq(q.field("nom"), args.nom)).unique();
    if (existing) throw new Error("Une école portant ce nom existe déjà.");

    let code = "";
    let codeUnique = false;
    while (!codeUnique) {
      code = generateSchoolCode();
      const existingCode = await ctx.db.query("ecoles").withIndex("by_code", (q) => q.eq("code", code)).unique();
      if (!existingCode) codeUnique = true;
    }

    return await ctx.db.insert("ecoles", { nom: args.nom, code, userCount: 0, statut: "active" });
  },
});

// Suppression d'une école (super admin uniquement)
export const remove = mutation({
  args: { id: v.id("ecoles"), userId: v.id("users") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.userId, "gestion_ecoles");
    const tables = [
      "eleves", "classes", "fautes", "sanctions", "punitions",
      "messages", "notes", "cours", "absences", "emploiDuTemps",
      "frais", "audit", "anneesScolaires"
    ];
    for (const table of tables) {
      const records = await ctx.db.query(table as any).withIndex("by_ecoleId", (q: any) => q.eq("ecoleId", args.id)).collect();
      for (const record of records) await ctx.db.delete(record._id);
    }
    await ctx.db.delete(args.id);
  },
});

// ✅ Mise à jour du nom (admin/directeur de l'école ou super admin)
export const update = mutation({
  args: { ecoleId: v.id("ecoles"), nom: v.optional(v.string()), userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireEcoleAdminOrSuperAdmin(ctx, args.userId, args.ecoleId);
    const ecole = await ctx.db.get(args.ecoleId);
    if (!ecole) throw new Error("École introuvable");
    await ctx.db.patch(args.ecoleId, { nom: args.nom ?? ecole.nom });
    return { success: true };
  },
});

// ✅ Mise à jour du logo
export const updateLogo = mutation({
  args: { ecoleId: v.id("ecoles"), logoUrl: v.string(), userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireEcoleAdminOrSuperAdmin(ctx, args.userId, args.ecoleId);
    await ctx.db.patch(args.ecoleId, { logo: args.logoUrl } as any);
    return { success: true };
  },
});

// ✅ Mise à jour de la devise
export const updateDevise = mutation({
  args: { ecoleId: v.id("ecoles"), devise: v.union(v.literal("CDF"), v.literal("USD")), userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireEcoleAdminOrSuperAdmin(ctx, args.userId, args.ecoleId);
    await ctx.db.patch(args.ecoleId, { devise: args.devise });
    return { success: true };
  },
});

// ✅ Mise à jour du type de période
export const updateTypePeriode = mutation({
  args: { ecoleId: v.id("ecoles"), typePeriode: v.union(v.literal("trimestre"), v.literal("semestre")), userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireEcoleAdminOrSuperAdmin(ctx, args.userId, args.ecoleId);
    await ctx.db.patch(args.ecoleId, { typePeriode: args.typePeriode });
    return { success: true };
  },
});

// ✅ Mise à jour du barème
export const updateBareme = mutation({
  args: { ecoleId: v.id("ecoles"), bareme: v.number(), userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireEcoleAdminOrSuperAdmin(ctx, args.userId, args.ecoleId);
    await ctx.db.patch(args.ecoleId, { bareme: args.bareme });
    return { success: true };
  },
});

// ✅ Mise à jour des seuils de mentions
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

// ✅ Suspendre une école (admin/directeur ou super admin)
export const suspendEcole = mutation({
  args: { ecoleId: v.id("ecoles"), userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireEcoleAdminOrSuperAdmin(ctx, args.userId, args.ecoleId);
    await ctx.db.patch(args.ecoleId, { statut: "suspendue" });
    return { success: true };
  },
});

// ✅ Réactiver une école
export const reactiverEcole = mutation({
  args: { ecoleId: v.id("ecoles"), userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireEcoleAdminOrSuperAdmin(ctx, args.userId, args.ecoleId);
    await ctx.db.patch(args.ecoleId, { statut: "active" });
    return { success: true };
  },
});

// ========== INITIALISATIONS ==========

export const initUserCounts = mutation({
  handler: async (ctx) => {
    const ecoles = await ctx.db.query("ecoles").collect();
    const users = await ctx.db.query("users").collect();
    const countByEcole: Record<string, number> = {};
    for (const user of users) if (user.ecoleId) countByEcole[user.ecoleId] = (countByEcole[user.ecoleId] || 0) + 1;
    for (const ecole of ecoles) await ctx.db.patch(ecole._id, { userCount: countByEcole[ecole._id] || 0 });
    return { success: true };
  },
});

export const initStatuts = mutation({
  handler: async (ctx) => {
    const ecoles = await ctx.db.query("ecoles").collect();
    for (const ecole of ecoles) {
      if (!ecole.statut) await ctx.db.patch(ecole._id, { statut: "active" });
    }
    return { success: true };
  },
});

export const getByIds = query({
  args: { ids: v.array(v.id("eleves")) },
  handler: async (ctx, args) => {
    return await Promise.all(args.ids.map((id) => ctx.db.get(id)));
  },
});

// ========== UTILITAIRE ==========
function generateSchoolCode(length = 6): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < length; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}