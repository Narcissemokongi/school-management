import { query, mutation, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "../convex/_generated/dataModel";

async function requireRole(
  ctx: MutationCtx,
  userId: string | undefined,
  allowedRoles: string[]
) {
  if (!userId) throw new Error("Authentification requise");
  const user = await ctx.db.get(userId as Id<"users">);
  if (!user || !allowedRoles.includes(user.role)) {
    throw new Error("Accès refusé : rôle insuffisant");
  }
  if (allowedRoles.includes("admin") && user.role === "admin" && user.ecoleId !== undefined) {
    throw new Error("Seul le superadmin peut gérer les écoles");
  }
  return user;
}

function generateSchoolCode(length = 6): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("ecoles").collect();
  },
});

export const get = query({
  args: { ecoleId: v.id("ecoles") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.ecoleId);
  },
});

export const getByCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("ecoles")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .unique();
  },
});

export const listWithUserCount = query({
  handler: async (ctx) => {
    const ecoles = await ctx.db.query("ecoles").collect();
    const users = await ctx.db.query("users").collect();
    const countByEcole: Record<string, number> = {};
    for (const user of users) {
      if (user.ecoleId) {
        countByEcole[user.ecoleId] = (countByEcole[user.ecoleId] || 0) + 1;
      }
    }
    return ecoles.map((ecole) => ({
      ...ecole,
      userCount: countByEcole[ecole._id] || 0,
    }));
  },
});

export const add = mutation({
  args: { nom: v.string(), userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.userId, ["admin"]);
    const existing = await ctx.db
      .query("ecoles")
      .filter((q) => q.eq(q.field("nom"), args.nom))
      .unique();
    if (existing) throw new Error("Une école portant ce nom existe déjà.");

    let code = "";
    let codeUnique = false;
    while (!codeUnique) {
      code = generateSchoolCode();
      const existingCode = await ctx.db
        .query("ecoles")
        .withIndex("by_code", (q) => q.eq("code", code))
        .unique();
      if (!existingCode) codeUnique = true;
    }

    return await ctx.db.insert("ecoles", { nom: args.nom, code });
  },
});

export const remove = mutation({
  args: { id: v.id("ecoles"), userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.userId, ["admin"]);
    const tables = [
      "eleves", "classes", "fautes", "sanctions", "punitions",
      "messages", "notes", "cours", "absences", "emploiDuTemps",
      "frais", "audit", "anneesScolaires"
    ];
    for (const table of tables) {
      const records = await ctx.db
        .query(table as any)
        .withIndex("by_ecoleId", (q: any) => q.eq("ecoleId", args.id))
        .collect();
      for (const record of records) {
        await ctx.db.delete(record._id);
      }
    }
    await ctx.db.delete(args.id);
  },
});

export const update = mutation({
  args: { ecoleId: v.id("ecoles"), nom: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const ecole = await ctx.db.get(args.ecoleId);
    if (!ecole) throw new Error("École introuvable");
    await ctx.db.patch(args.ecoleId, { nom: args.nom ?? ecole.nom });
    return { success: true };
  },
});

export const updateLogo = mutation({
  args: { ecoleId: v.id("ecoles"), logoUrl: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.ecoleId, { logo: args.logoUrl } as any);
    return { success: true };
  },
});

export const count = query({
  handler: async (ctx) => {
    const ecoles = await ctx.db.query("ecoles").collect();
    return ecoles.length;
  },
});

export const updateDevise = mutation({
  args: {
    ecoleId: v.id("ecoles"),
    devise: v.union(v.literal("CDF"), v.literal("USD")),
  },
  handler: async (ctx, args) => {
    const ecole = await ctx.db.get(args.ecoleId);
    if (!ecole) throw new Error("École introuvable");
    await ctx.db.patch(args.ecoleId, { devise: args.devise });
    return { success: true };
  },
});

export const updateTypePeriode = mutation({
  args: {
    ecoleId: v.id("ecoles"),
    typePeriode: v.union(v.literal("trimestre"), v.literal("semestre")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.ecoleId, { typePeriode: args.typePeriode });
    return { success: true };
  },
});

export const updateBareme = mutation({
  args: {
    ecoleId: v.id("ecoles"),
    bareme: v.number(),
  },
  handler: async (ctx, args) => {
    const ecole = await ctx.db.get(args.ecoleId);
    if (!ecole) throw new Error("École introuvable");
    await ctx.db.patch(args.ecoleId, { bareme: args.bareme });
    return { success: true };
  },
});

// ✅ Nouvelle query ajoutée
export const listRecent = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("ecoles")
      .order("desc")
      .take(5);
  },
});