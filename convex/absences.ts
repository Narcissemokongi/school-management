import { query, mutation, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "../convex/_generated/dataModel";

// Utilitaire de vérification de rôle
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

export const listByEleve = query({
  args: {
    eleveId: v.id("eleves"),
    anneeId: v.optional(v.id("anneesScolaires")),
  },
  handler: async (ctx, args) => {
    if (args.anneeId) {
      return await ctx.db
        .query("absences")
        .withIndex("by_eleveId", (q) => q.eq("eleveId", args.eleveId))
        .filter((q) => q.eq(q.field("anneeId"), args.anneeId!))
        .collect();
    }
    return await ctx.db
      .query("absences")
      .withIndex("by_eleveId", (q) => q.eq("eleveId", args.eleveId))
      .collect();
  },
});

export const listByEcole = query({
  args: {
    ecoleId: v.id("ecoles"),
    anneeId: v.optional(v.id("anneesScolaires")),
  },
  handler: async (ctx, args) => {
    if (args.anneeId) {
      return await ctx.db
        .query("absences")
        .withIndex("by_anneeId", (q) => q.eq("anneeId", args.anneeId!))
        .filter((q) => q.eq(q.field("ecoleId"), args.ecoleId))
        .collect();
    }
    return await ctx.db
      .query("absences")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId))
      .collect();
  },
});

export const add = mutation({
  args: {
    eleveId: v.id("eleves"),
    ecoleId: v.id("ecoles"),
    type: v.union(v.literal("absence"), v.literal("retard")),
    date: v.string(),
    commentaire: v.optional(v.string()),
    signaleurId: v.id("users"),
    anneeId: v.id("anneesScolaires"),
    userId: v.optional(v.id("users")), // celui qui fait l'action (pour audit)
  },
  handler: async (ctx, args) => {
    // Récupérer l'élève pour obtenir sa classe
    const eleve = await ctx.db.get(args.eleveId);
    const classe = eleve?.classe;
    // Vérifier le rôle (admin, directeur, disciplinaire, enseignant)
    await requireRole(ctx, args.userId, ["admin", "directeur", "disciplinaire", "enseignant"], classe);

    const { userId, ...rest } = args;
    const newId = await ctx.db.insert("absences", rest);
    if (userId) {
      await ctx.db.insert("audit", {
        userId,
        action: "create",
        table: "absences",
        documentId: newId,
        details: `${rest.type} pour l'élève ${rest.eleveId} le ${rest.date}`,
        date: new Date().toISOString(),
        ecoleId: rest.ecoleId,
      });
    }
    return newId;
  },
});

export const remove = mutation({
  args: {
    id: v.id("absences"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.id);
    if (!doc) throw new Error("Absence introuvable");
    const eleve = await ctx.db.get(doc.eleveId);
    const classe = eleve?.classe;
    await requireRole(ctx, args.userId, ["admin", "directeur", "disciplinaire", "enseignant"], classe);

    await ctx.db.delete(args.id);
    if (args.userId && doc) {
      await ctx.db.insert("audit", {
        userId: args.userId,
        action: "delete",
        table: "absences",
        documentId: args.id,
        details: `Suppression d'un(e) ${doc.type} du ${doc.date}`,
        date: new Date().toISOString(),
        ecoleId: doc.ecoleId,
      });
    }
  },
});

export const listByClasse = query({
  args: { ecoleId: v.id("ecoles"), anneeId: v.id("anneesScolaires"), classe: v.string() },
  handler: async (ctx, args) => {
    const eleves = await ctx.db
      .query("eleves")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId))
      .filter((q) => q.and(q.eq(q.field("anneeId"), args.anneeId), q.eq(q.field("classe"), args.classe)))
      .collect();
    const eleveIds = eleves.map(e => e._id);
    if (eleveIds.length === 0) return [];
    return await ctx.db
      .query("absences")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId))
      .filter((q) => q.or(...eleveIds.map(id => q.eq(q.field("eleveId"), id))))
      .collect();
  },
});