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
  args: { ecoleId: v.id("ecoles") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("sanctions")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId))
      .collect();
  },
});

export const add = mutation({
  args: {
    libelle: v.string(),
    ecoleId: v.id("ecoles"),
    userId: v.optional(v.id("users")),   // ← ajouté
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.userId, ["admin"]);
    return await ctx.db.insert("sanctions", {
      libelle: args.libelle,
      ecoleId: args.ecoleId,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("sanctions"),
    libelle: v.string(),
    userId: v.optional(v.id("users")),   // ← ajouté
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.userId, ["admin"]);
    await ctx.db.patch(args.id, { libelle: args.libelle });
  },
});

export const remove = mutation({
  args: {
    id: v.id("sanctions"),
    userId: v.optional(v.id("users")),   // ← ajouté
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.userId, ["admin"]);
    await ctx.db.delete(args.id);
  },
});