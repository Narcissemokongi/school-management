import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Récupérer l'année active d'une école
export const getActive = query({
  args: { ecoleId: v.id("ecoles") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("anneesScolaires")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId))
      .filter((q) => q.eq(q.field("estActive"), true))
      .first();
  },
});

// Lister toutes les années d'une école
export const listByEcole = query({
  args: { ecoleId: v.id("ecoles") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("anneesScolaires")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId))
      .collect();
  },
});

// Ajouter une nouvelle année scolaire
export const add = mutation({
  args: {
    nom: v.string(),
    ecoleId: v.id("ecoles"),
    estActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Si on crée une année active, désactiver les autres
    if (args.estActive) {
      const actives = await ctx.db
        .query("anneesScolaires")
        .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId))
        .filter((q) => q.eq(q.field("estActive"), true))
        .collect();
      for (const annee of actives) {
        await ctx.db.patch(annee._id, { estActive: false });
      }
    }
    await ctx.db.insert("anneesScolaires", {
      nom: args.nom,
      ecoleId: args.ecoleId,
      estActive: args.estActive,
    });
    return { success: true };
  },
});

// Activer une année scolaire existante
export const setActive = mutation({
  args: { anneeId: v.id("anneesScolaires") },
  handler: async (ctx, args) => {
    const annee = await ctx.db.get(args.anneeId);
    if (!annee) throw new Error("Année introuvable");
    // Désactiver toutes les années de l'école
    const actives = await ctx.db
      .query("anneesScolaires")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", annee.ecoleId))
      .filter((q) => q.eq(q.field("estActive"), true))
      .collect();
    for (const a of actives) {
      await ctx.db.patch(a._id, { estActive: false });
    }
    // Activer l'année spécifiée
    await ctx.db.patch(args.anneeId, { estActive: true });
    return { success: true };
  },
});