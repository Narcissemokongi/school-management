import { query, mutation, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Vérifie que l'utilisateur est admin/directeur de l'école concernée ou superadmin principal
async function requireEcoleAdmin(
  ctx: MutationCtx,
  userId: string | undefined,
  ecoleId: string
) {
  if (!userId) throw new Error("Authentification requise");
  const user = await ctx.db.get(userId as Id<"users">);
  if (!user) throw new Error("Utilisateur introuvable");

  const isSuperAdminPrincipal =
    (user.role === "admin" && !user.ecoleId) ||
    (user.role === "superAdmin" && (!user.permissions || user.permissions.length === 0));

  const isEcoleAdmin =
    (user.role === "admin" || user.role === "directeur") &&
    user.ecoleId === ecoleId;

  if (!isSuperAdminPrincipal && !isEcoleAdmin) {
    throw new Error("Accès refusé : vous n'êtes pas autorisé à gérer cette école.");
  }
  return user;
}

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
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    await requireEcoleAdmin(ctx, args.userId, args.ecoleId);

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
  args: {
    anneeId: v.id("anneesScolaires"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const annee = await ctx.db.get(args.anneeId);
    if (!annee) throw new Error("Année introuvable");

    await requireEcoleAdmin(ctx, args.userId, annee.ecoleId);

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

// Renommer une année scolaire
export const rename = mutation({
  args: {
    id: v.id("anneesScolaires"),
    nom: v.string(),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const annee = await ctx.db.get(args.id);
    if (!annee) throw new Error("Année introuvable");

    await requireEcoleAdmin(ctx, args.userId, annee.ecoleId);

    const trimmed = args.nom.trim();
    if (!trimmed) throw new Error("Le nom est requis.");

    await ctx.db.patch(args.id, { nom: trimmed });
    return { success: true };
  },
});

// Supprimer une année scolaire (avec vérification des dépendances)
export const remove = mutation({
  args: {
    id: v.id("anneesScolaires"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const annee = await ctx.db.get(args.id);
    if (!annee) throw new Error("Année introuvable");

    await requireEcoleAdmin(ctx, args.userId, annee.ecoleId);

    // Vérifier qu'aucune inscription n'est liée à cette année
    const inscriptions = await ctx.db
      .query("inscriptions")
      .withIndex("by_anneeId", (q) => q.eq("anneeId", args.id))
      .collect();
    if (inscriptions.length > 0) {
      throw new Error("Impossible de supprimer : des inscriptions sont liées à cette année.");
    }

    // Vérifier les notes
    const notes = await ctx.db
      .query("notes")
      .withIndex("by_anneeId", (q) => q.eq("anneeId", args.id))
      .collect();
    if (notes.length > 0) {
      throw new Error("Impossible de supprimer : des notes sont liées à cette année.");
    }

    // Vérifier les frais
    const frais = await ctx.db
      .query("frais")
      .withIndex("by_anneeId", (q) => q.eq("anneeId", args.id))
      .collect();
    if (frais.length > 0) {
      throw new Error("Impossible de supprimer : des frais sont liés à cette année.");
    }

    // Vérifier les absences
    const absences = await ctx.db
      .query("absences")
      .withIndex("by_anneeId", (q) => q.eq("anneeId", args.id))
      .collect();
    if (absences.length > 0) {
      throw new Error("Impossible de supprimer : des absences sont liées à cette année.");
    }

    // Vérifier les punitions
    const punitions = await ctx.db
      .query("punitions")
      .withIndex("by_anneeId", (q) => q.eq("anneeId", args.id))
      .collect();
    if (punitions.length > 0) {
      throw new Error("Impossible de supprimer : des punitions sont liées à cette année.");
    }

    await ctx.db.delete(args.id);
    return { success: true };
  },
});