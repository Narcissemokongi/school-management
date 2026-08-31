import { query, mutation, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel"; // Correction du chemin d'import

// Utilitaire de rôle amélioré : vérifie le rôle et l'appartenance à l'école
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
    (user.role === "admin" || user.role === "directeur") && user.ecoleId === ecoleId;

  if (!isSuperAdminPrincipal && !isEcoleAdmin) {
    throw new Error("Accès refusé : vous n'êtes pas autorisé à gérer cette école.");
  }

  return user;
}

// ----- QUERY : liste des inscriptions pour une année donnée (avec infos élève) -----
export const listByAnnee = query({
  args: {
    ecoleId: v.id("ecoles"),
    anneeId: v.id("anneesScolaires"),
    classe: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let q = ctx.db
      .query("inscriptions")
      .withIndex("by_ecole_annee", (q) =>
        q.eq("ecoleId", args.ecoleId).eq("anneeId", args.anneeId)
      );
    if (args.classe) {
      q = q.filter((q) => q.eq(q.field("classe"), args.classe));
    }
    const inscriptions = await q.collect();

    const eleveIds = inscriptions.map((i) => i.eleveId);
    const eleves = await Promise.all(eleveIds.map((id) => ctx.db.get(id)));

    return inscriptions.map((insc) => {
      const eleve = eleves.find((e) => e?._id === insc.eleveId);
      return {
        ...insc,
        nom: eleve?.nom ?? "—",
        postnom: eleve?.postnom ?? "",
        prenom: eleve?.prenom ?? "",
        code: eleve?.code ?? "",
      };
    });
  },
});

// ----- MUTATION : inscription manuelle d'un élève -----
export const addInscription = mutation({
  args: {
    eleveId: v.id("eleves"),
    ecoleId: v.id("ecoles"),
    anneeId: v.id("anneesScolaires"),
    classe: v.string(),
    statut: v.optional(
      v.union(
        v.literal("inscrit"),
        v.literal("passant"),
        v.literal("redoublant"),
        v.literal("transfere"),
        v.literal("exclu"),
        v.literal("diplome")
      )
    ),
    userId: v.optional(v.id("users")),
    actionUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    await requireEcoleAdmin(ctx, args.actionUserId, args.ecoleId);

    const existing = await ctx.db
      .query("inscriptions")
      .withIndex("by_eleve_annee", (q) =>
        q.eq("eleveId", args.eleveId).eq("anneeId", args.anneeId)
      )
      .first();
    if (existing) throw new Error("Cet élève a déjà une inscription pour cette année.");

    return await ctx.db.insert("inscriptions", {
      eleveId: args.eleveId,
      ecoleId: args.ecoleId,
      anneeId: args.anneeId,
      classe: args.classe,
      statut: args.statut ?? "inscrit",
      dateInscription: new Date().toISOString(),
      userId: args.userId,
    });
  },
});

// ----- MUTATION : promotion des élèves -----
export const promouvoirEleves = mutation({
  args: {
    ecoleId: v.id("ecoles"),
    anneeActuelleId: v.id("anneesScolaires"),
    nouvelleAnneeId: v.id("anneesScolaires"),
    decisions: v.array(
      v.object({
        eleveId: v.id("eleves"),
        statut: v.union(
          v.literal("passant"),
          v.literal("redoublant"),
          v.literal("transfere"),
          v.literal("exclu"),
          v.literal("diplome")
        ),
        classeDestination: v.optional(v.string()),
      })
    ),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    await requireEcoleAdmin(ctx, args.userId, args.ecoleId);

    const anneeActuelle = await ctx.db.get(args.anneeActuelleId);
    if (!anneeActuelle || !anneeActuelle.estActive) {
      throw new Error("L'année actuelle spécifiée n'est pas active.");
    }
    const nouvelleAnnee = await ctx.db.get(args.nouvelleAnneeId);
    if (!nouvelleAnnee) throw new Error("La nouvelle année n'existe pas.");

    for (const decision of args.decisions) {
      const inscriptionActuelle = await ctx.db
        .query("inscriptions")
        .withIndex("by_eleve_annee", (q) =>
          q.eq("eleveId", decision.eleveId).eq("anneeId", args.anneeActuelleId)
        )
        .first();
      if (!inscriptionActuelle) {
        throw new Error(`L'élève ${decision.eleveId} n'a pas d'inscription pour l'année actuelle.`);
      }

      let classeDestination = "";
      if (decision.statut === "passant") {
        if (!decision.classeDestination) {
          throw new Error("La classe destination est requise pour un élève passant.");
        }
        classeDestination = decision.classeDestination;
      } else if (decision.statut === "redoublant") {
        classeDestination = inscriptionActuelle.classe;
      } else {
        // Transféré, exclu, diplômé : mise à jour du statut et date de sortie
        await ctx.db.patch(inscriptionActuelle._id, {
          statut: decision.statut,
          dateSortie: new Date().toISOString(),
        });
        continue;
      }

      const existNouvelle = await ctx.db
        .query("inscriptions")
        .withIndex("by_eleve_annee", (q) =>
          q.eq("eleveId", decision.eleveId).eq("anneeId", args.nouvelleAnneeId)
        )
        .first();
      if (existNouvelle) continue;

      await ctx.db.insert("inscriptions", {
        eleveId: decision.eleveId,
        ecoleId: args.ecoleId,
        anneeId: args.nouvelleAnneeId,
        classe: classeDestination,
        statut: decision.statut,
        dateInscription: new Date().toISOString(),
        userId: inscriptionActuelle.userId,
      });
    }

    // Supprimer les propositions liées
    const eleveIds = args.decisions.map((d) => d.eleveId);
    for (const eleveId of eleveIds) {
      const propositions = await ctx.db
        .query("propositionsPassage")
        .withIndex("by_eleve_annee", (q) =>
          q.eq("eleveId", eleveId).eq("anneeId", args.anneeActuelleId)
        )
        .collect();
      for (const prop of propositions) {
        await ctx.db.delete(prop._id);
      }
    }

    return { success: true };
  },
});

// ----- MUTATION : clôturer l'année scolaire -----
export const cloturerAnnee = mutation({
  args: {
    ecoleId: v.id("ecoles"),
    anneeId: v.id("anneesScolaires"),
    nouvelleAnneeId: v.optional(v.id("anneesScolaires")),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    await requireEcoleAdmin(ctx, args.userId, args.ecoleId);

    const annee = await ctx.db.get(args.anneeId);
    if (!annee || annee.ecoleId !== args.ecoleId) {
      throw new Error("Année introuvable ou ne correspond pas à l'école.");
    }
    if (!annee.estActive) throw new Error("Cette année est déjà clôturée.");

    await ctx.db.patch(args.anneeId, { estActive: false });

    if (args.nouvelleAnneeId) {
      const nouvelle = await ctx.db.get(args.nouvelleAnneeId);
      if (!nouvelle || nouvelle.ecoleId !== args.ecoleId) {
        throw new Error("Nouvelle année invalide.");
      }
      await ctx.db.patch(args.nouvelleAnneeId, { estActive: true });
    }

    return { success: true };
  },
});

// ----- MUTATION : migration des anciennes données -----
export const migrateElevesToInscriptions = mutation({
  handler: async (ctx) => {
    const eleves = await ctx.db.query("eleves").collect();
    for (const eleve of eleves) {
      // ⚠️ Supposons que les champs anneeId et decisionConseil n'existent plus dans le schéma.
      // Cette migration est obsolète et ne doit pas être utilisée sans adaptation.
      // Si vous devez migrer, utilisez une logique appropriée à votre modèle actuel.
      continue;
    }
    return { success: true };
  },
});