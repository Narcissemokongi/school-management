import { query, mutation, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "../convex/_generated/dataModel";

async function requireRole(
  ctx: MutationCtx,
  userId: string | undefined,
  allowedRoles: string[],
  classe?: string
) {
  if (!userId) throw new Error("Authentification requise");
  const user = await ctx.db.get(userId as Id<"users">);
  if (!user || !allowedRoles.includes(user.role)) {
    throw new Error("Accès refusé : rôle insuffisant");
  }
  if (classe && user.role === "enseignant" && user.classe !== classe) {
    throw new Error("Vous n'êtes pas assigné à cette classe");
  }
  return user;
}

export const list = query({
  args: {
    ecoleId: v.optional(v.id("ecoles")),
    anneeId: v.optional(v.id("anneesScolaires")),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    if (args.userId) {
      const user = await ctx.db.get(args.userId as Id<"users">);
      if (user?.role === "parent") {
        return await ctx.db
          .query("eleves")
          .withIndex("by_parentId", (q) => q.eq("parentId", args.userId))
          .collect();
      }
    }
    if (args.anneeId) {
      let q = ctx.db
        .query("eleves")
        .withIndex("by_anneeId", (q) => q.eq("anneeId", args.anneeId!));
      if (args.ecoleId) {
        q = q.filter((q) => q.eq(q.field("ecoleId"), args.ecoleId!));
      }
      return await q.collect();
    }
    if (args.ecoleId) {
      return await ctx.db
        .query("eleves")
        .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId!))
        .collect();
    }
    return await ctx.db.query("eleves").collect();
  },
});

export const listByParent = query({
  args: {
    parentId: v.id("users"),
    anneeId: v.optional(v.id("anneesScolaires")),
  },
  handler: async (ctx, args) => {
    if (args.anneeId) {
      return await ctx.db
        .query("eleves")
        .withIndex("by_parentId", (q) => q.eq("parentId", args.parentId))
        .filter((q) => q.eq(q.field("anneeId"), args.anneeId!))
        .collect();
    }
    return await ctx.db
      .query("eleves")
      .withIndex("by_parentId", (q) => q.eq("parentId", args.parentId))
      .collect();
  },
});

export const getByUserId = query({
  args: {
    userId: v.id("users"),
    anneeId: v.optional(v.id("anneesScolaires")),
  },
  handler: async (ctx, args) => {
    let q = ctx.db
      .query("eleves")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId));
    if (args.anneeId) {
      q = q.filter((q) => q.eq(q.field("anneeId"), args.anneeId));
    }
    return await q.first();   // ← .first() au lieu de .unique()
  },
});

export const get = query({
  args: { id: v.id("eleves") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const add = mutation({
  args: {
    nom: v.string(),
    postnom: v.string(),
    classe: v.string(),
    ecoleId: v.id("ecoles"),
    parentId: v.optional(v.id("users")),
    userId: v.optional(v.id("users")),
    anneeId: v.id("anneesScolaires"),
    actionUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.actionUserId, ["admin", "directeur"]);
    return await ctx.db.insert("eleves", {
      nom: args.nom,
      postnom: args.postnom,
      classe: args.classe,
      ecoleId: args.ecoleId,
      parentId: args.parentId,
      userId: args.userId,
      anneeId: args.anneeId,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("eleves"),
    nom: v.optional(v.string()),
    postnom: v.optional(v.string()),
    classe: v.optional(v.string()),
    parentId: v.optional(v.id("users")),
    userId: v.optional(v.id("users")),
    actionUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.actionUserId, ["admin", "directeur"]);
    const { id, actionUserId, ...fields } = args;
    
    // Vérifier les doublons de userId dans la même année
    if (args.userId) {
      const current = await ctx.db.get(id);
      if (!current) throw new Error("Élève introuvable");
      const anneeId = current.anneeId;
      const existing = await ctx.db
        .query("eleves")
        .withIndex("by_userId", q => q.eq("userId", args.userId))
        .filter(q => q.neq(q.field("_id"), id))
        .filter(q => q.eq(q.field("anneeId"), anneeId))
        .first();
      if (existing) {
        throw new Error("Cet utilisateur est déjà lié à un autre élève de la même année.");
      }
    }
    
    await ctx.db.patch(id, fields);
  },
});

export const importEleves = mutation({
  args: {
    eleves: v.array(
      v.object({
        nom: v.string(),
        postnom: v.string(),
        classe: v.string(),
      })
    ),
    ecoleId: v.id("ecoles"),
    anneeId: v.id("anneesScolaires"),
    actionUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.actionUserId, ["admin", "directeur"]);
    for (const el of args.eleves) {
      await ctx.db.insert("eleves", {
        ...el,
        ecoleId: args.ecoleId,
        anneeId: args.anneeId,
      });
    }
  },
});

export const listByClasse = query({
  args: { ecoleId: v.id("ecoles"), anneeId: v.id("anneesScolaires"), classe: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("eleves")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId))
      .filter((q) => q.and(q.eq(q.field("anneeId"), args.anneeId), q.eq(q.field("classe"), args.classe)))
      .collect();
  },
});

export const updateDecision = mutation({
  args: {
    eleveId: v.id("eleves"),
    decision: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.eleveId, { decisionConseil: args.decision });
    return { success: true };
  },
});

export const remove = mutation({
  args: {
    id: v.id("eleves"),
    actionUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { success: true };
  },
});