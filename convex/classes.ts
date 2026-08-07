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
  return user;
}

export const list = query({
  args: {
    ecoleId: v.optional(v.id("ecoles")),
    anneeId: v.optional(v.id("anneesScolaires")),
  },
  handler: async (ctx, args) => {
    if (args.anneeId) {
      let q = ctx.db
        .query("classes")
        .withIndex("by_anneeId", (q) => q.eq("anneeId", args.anneeId!));
      if (args.ecoleId) {
        q = q.filter((q) => q.eq(q.field("ecoleId"), args.ecoleId!));
      }
      return await q.collect();
    }
    if (args.ecoleId) {
      return await ctx.db
        .query("classes")
        .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId!))
        .collect();
    }
    return await ctx.db.query("classes").collect();
  },
});

export const add = mutation({
  args: {
    nom: v.string(),
    ecoleId: v.id("ecoles"),
    anneeId: v.optional(v.id("anneesScolaires")),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // Vérification d'unicité existante...
    await ctx.db.insert("classes", {
      nom: args.nom,
      ecoleId: args.ecoleId,
      anneeId: args.anneeId,
    });
  },
});

export const remove = mutation({
  args: {
    id: v.id("classes"),
    userId: v.optional(v.id("users")),   // ← ajouté
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.userId, ["admin"]);
    const classe = await ctx.db.get(args.id);
    if (!classe) return;
    const eleves = await ctx.db
      .query("eleves")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", classe.ecoleId))
      .filter((q) => q.eq(q.field("classe"), classe.nom))
      .collect();
    if (eleves.length > 0) throw new Error("Des élèves sont encore dans cette classe.");
    await ctx.db.delete(args.id);
  },
});