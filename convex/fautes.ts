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
  args: { ecoleId: v.optional(v.id("ecoles")) },
  handler: async (ctx, args) => {
    if (args.ecoleId) {
      return await ctx.db
        .query("fautes")
        .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId!))
        .collect();
    } else {
      return await ctx.db.query("fautes").collect();
    }
  },
});

export const add = mutation({
  args: {
    libelle: v.string(),
    gravite: v.union(v.literal("Légère"), v.literal("Moyenne"), v.literal("Grave")),
    ecoleId: v.id("ecoles"),
    userId: v.optional(v.id("users")), // celui qui fait l'action
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.userId, ["admin"]);
    const { userId, ...rest } = args;
    return await ctx.db.insert("fautes", rest);
  },
});

export const update = mutation({
  args: {
    id: v.id("fautes"),
    libelle: v.string(),
    gravite: v.union(v.literal("Légère"), v.literal("Moyenne"), v.literal("Grave")),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.userId, ["admin"]);
    const { id, userId, ...fields } = args;
    await ctx.db.patch(id, fields);
  },
});

export const remove = mutation({
  args: {
    id: v.id("fautes"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.userId, ["admin"]);
    await ctx.db.delete(args.id);
  },
});