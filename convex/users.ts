import { mutation, query, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// ========== HELPER D'AUTHENTIFICATION ==========
async function requireEcoleAdmin(
  ctx: MutationCtx,
  userId: Id<"users">,
  ecoleId?: Id<"ecoles">
) {
  if (!userId) throw new Error("Authentification requise");
  const user = await ctx.db.get(userId);
  if (!user) throw new Error("Utilisateur introuvable");

  // Rôles autorisés
  const allowedRoles = ["admin", "superAdmin"];
  if (!allowedRoles.includes(user.role)) {
    throw new Error("Accès refusé : rôle insuffisant");
  }

  // Vérification de l'école si ecoleId est fourni
  if (ecoleId && user.ecoleId !== ecoleId) {
    // Exception pour superadmin principal (admin sans ecoleId)
    if (!(user.role === "admin" && !user.ecoleId)) {
      throw new Error("Vous n'appartenez pas à cette école");
    }
  }

  return user;
}

// ========== QUERIES ==========

// Lister les années scolaires d'une école
export const list = query({
  args: { ecoleId: v.id("ecoles") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("anneesScolaires")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId))
      .collect();
  },
});

// Obtenir l'année scolaire active d'une école
export const getActive = query({
  args: { ecoleId: v.id("ecoles") },
  handler: async (ctx, args) => {
    const annees = await ctx.db
      .query("anneesScolaires")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId))
      .filter((q) => q.eq(q.field("estActive"), true))
      .collect();
    return annees[0] || null;
  },
});

// Obtenir une année scolaire par son ID
export const getById = query({
  args: { anneeId: v.id("anneesScolaires") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.anneeId);
  },
});

// ========== MUTATIONS ==========

// Ajouter une nouvelle année scolaire
export const add = mutation({
  args: {
    nom: v.string(),
    ecoleId: v.id("ecoles"),
    estActive: v.boolean(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireEcoleAdmin(ctx, args.userId, args.ecoleId);

    const anneeId = await ctx.db.insert("anneesScolaires", {
      nom: args.nom,
      ecoleId: args.ecoleId,
      estActive: args.estActive,
    });

    // Audit optionnel
    await ctx.db.insert("audit", {
      userId: args.userId,
      action: "create_annee_scolaire",
      table: "anneesScolaires",
      documentId: anneeId,
      date: new Date().toISOString(),
      ecoleId: args.ecoleId,
      details: `Création de l'année scolaire ${args.nom}`,
    });

    return anneeId;
  },
});

// Mettre à jour une année scolaire existante
export const update = mutation({
  args: {
    anneeId: v.id("anneesScolaires"),
    nom: v.string(),
    estActive: v.boolean(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // On récupère l'année pour connaître son école
    const annee = await ctx.db.get(args.anneeId);
    if (!annee) throw new Error("Année scolaire introuvable");

    await requireEcoleAdmin(ctx, args.userId, annee.ecoleId);

    await ctx.db.patch(args.anneeId, {
      nom: args.nom,
      estActive: args.estActive,
    });

    // Audit
    await ctx.db.insert("audit", {
      userId: args.userId,
      action: "update_annee_scolaire",
      table: "anneesScolaires",
      documentId: args.anneeId,
      date: new Date().toISOString(),
      ecoleId: annee.ecoleId,
      details: `Mise à jour de l'année scolaire ${args.nom}`,
    });
  },
});

// Supprimer une année scolaire
export const remove = mutation({
  args: {
    anneeId: v.id("anneesScolaires"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const annee = await ctx.db.get(args.anneeId);
    if (!annee) throw new Error("Année scolaire introuvable");

    await requireEcoleAdmin(ctx, args.userId, annee.ecoleId);

    await ctx.db.delete(args.anneeId);

    // Audit
    await ctx.db.insert("audit", {
      userId: args.userId,
      action: "delete_annee_scolaire",
      table: "anneesScolaires",
      documentId: args.anneeId,
      date: new Date().toISOString(),
      ecoleId: annee.ecoleId,
      details: `Suppression de l'année scolaire ${annee.nom}`,
    });
  },
});

// Définir une année comme active (et désactiver les autres)
export const setActive = mutation({
  args: {
    anneeId: v.id("anneesScolaires"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const annee = await ctx.db.get(args.anneeId);
    if (!annee) throw new Error("Année scolaire introuvable");

    await requireEcoleAdmin(ctx, args.userId, annee.ecoleId);

    // Désactiver toutes les autres années de cette école
    const autresAnnees = await ctx.db
      .query("anneesScolaires")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", annee.ecoleId))
      .collect();

    for (const a of autresAnnees) {
      if (a._id !== args.anneeId && a.estActive) {
        await ctx.db.patch(a._id, { estActive: false });
      }
    }

    // Activer celle-ci
    await ctx.db.patch(args.anneeId, { estActive: true });

    // Audit
    await ctx.db.insert("audit", {
      userId: args.userId,
      action: "set_active_annee_scolaire",
      table: "anneesScolaires",
      documentId: args.anneeId,
      date: new Date().toISOString(),
      ecoleId: annee.ecoleId,
      details: `Activation de l'année scolaire ${annee.nom}`,
    });
  },
});