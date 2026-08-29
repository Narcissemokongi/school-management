import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listByClasse = query({
  args: {
    ecoleId: v.id("ecoles"),
    anneeId: v.id("anneesScolaires"),
    classe: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("examens")
      .withIndex("by_classe", (q) =>
        q.eq("classe", args.classe).eq("ecoleId", args.ecoleId)
      )
      .filter((q) => q.eq(q.field("anneeId"), args.anneeId))
      .collect();
  },
});

export const listByEcole = query({
  args: {
    ecoleId: v.id("ecoles"),
    anneeId: v.id("anneesScolaires"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("examens")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId))
      .filter((q) => q.eq(q.field("anneeId"), args.anneeId))
      .collect();
  },
});

export const add = mutation({
  args: {
    classe: v.string(),
    matiere: v.string(),
    date: v.string(),
    heure: v.optional(v.string()),
    salle: v.optional(v.string()),
    duree: v.optional(v.string()),
    ecoleId: v.id("ecoles"),
    anneeId: v.id("anneesScolaires"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("examens", args);
    return { success: true };
  },
});

export const update = mutation({
  args: {
    examenId: v.id("examens"),
    classe: v.optional(v.string()),
    matiere: v.optional(v.string()),
    date: v.optional(v.string()),
    heure: v.optional(v.string()),
    salle: v.optional(v.string()),
    duree: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { examenId, ...fields } = args;
    await ctx.db.patch(examenId, fields);
    return { success: true };
  },
});

export const remove = mutation({
  args: { examenId: v.id("examens") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.examenId);
    return { success: true };
  },
});