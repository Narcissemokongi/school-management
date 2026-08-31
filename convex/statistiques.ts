import { query } from "./_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";

// Helper typé pour récupérer les élèves inscrits pour une école/année donnée, enrichis avec leur classe
async function getElevesParAnnee(
  ctx: any,
  ecoleId: Id<"ecoles">,
  anneeId: Id<"anneesScolaires">
) {
  const inscriptions = await ctx.db
    .query("inscriptions")
    .withIndex("by_ecole_annee", (q: any) =>
      q.eq("ecoleId", ecoleId).eq("anneeId", anneeId)
    )
    .collect();

  const eleveIds = inscriptions.map((insc: any) => insc.eleveId);
  const eleves = await Promise.all(
    eleveIds.map((id: Id<"eleves">) => ctx.db.get(id))
  );

  return inscriptions
    .map((insc: any) => {
      const eleve = eleves.find((e: any) => e?._id === insc.eleveId);
      if (!eleve) return null;
      return {
        ...eleve,
        classe: insc.classe,
        inscriptionId: insc._id,
      };
    })
    .filter(Boolean);
}

// Taux de réussite par matière pour une classe donnée
export const getTauxReussiteParMatiere = query({
  args: {
    ecoleId: v.id("ecoles"),
    anneeId: v.id("anneesScolaires"),
    classe: v.string(),
    seuil: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const seuil = args.seuil ?? 50;
    const eleves = await getElevesParAnnee(ctx, args.ecoleId, args.anneeId);
    const elevesClasse = eleves.filter((e: any) => e.classe === args.classe);

    const cours = await ctx.db
      .query("cours")
      .withIndex("by_ecoleId", (q: any) => q.eq("ecoleId", args.ecoleId))
      .filter((q: any) => q.eq(q.field("classe"), args.classe))
      .collect();

    const notes = await ctx.db
      .query("notes")
      .withIndex("by_anneeId", (q: any) => q.eq("anneeId", args.anneeId))
      .filter((q: any) => q.eq(q.field("ecoleId"), args.ecoleId))
      .collect();

    const result = [];
    for (const matiere of cours as any[]) {
      let reussite = 0;
      let total = 0;
      for (const eleve of elevesClasse as any[]) {
        const notesEleveMatiere = (notes as any[]).filter(
          (n) => n.eleveId === eleve._id && n.matiere === matiere.nom
        );
        if (notesEleveMatiere.length > 0) {
          const somme = notesEleveMatiere.reduce((s, n) => s + n.note * (n.coefficient || 1), 0);
          const coeffTotal = notesEleveMatiere.reduce((s, n) => s + (n.coefficient || 1), 0);
          const moyenneBrute = coeffTotal > 0 ? somme / coeffTotal : 0;
          const pourcentage = (moyenneBrute / (matiere.bareme ?? 20)) * 100;
          if (pourcentage >= seuil) reussite++;
          total++;
        }
      }
      result.push({
        matiere: matiere.nom,
        tauxReussite: total > 0 ? (reussite / total) * 100 : 0,
        nbEleves: total,
      });
    }
    return result;
  },
});

// Évolution de la moyenne générale d'une classe sur plusieurs années
export const getEvolutionResultats = query({
  args: {
    ecoleId: v.id("ecoles"),
    classe: v.string(),
    annees: v.array(v.id("anneesScolaires")),
  },
  handler: async (ctx, args) => {
    const result = [];
    for (const anneeId of args.annees) {
      const eleves = await getElevesParAnnee(ctx, args.ecoleId, anneeId);
      const elevesClasse = (eleves as any[]).filter((e) => e.classe === args.classe);

      const cours = await ctx.db
        .query("cours")
        .withIndex("by_ecoleId", (q: any) => q.eq("ecoleId", args.ecoleId))
        .filter((q: any) => q.eq(q.field("classe"), args.classe))
        .collect();

      const notes = await ctx.db
        .query("notes")
        .withIndex("by_anneeId", (q: any) => q.eq("anneeId", anneeId))
        .filter((q: any) => q.eq(q.field("ecoleId"), args.ecoleId))
        .collect();

      let sommeMoyGenerale = 0;
      let nbElevesAvecNotes = 0;
      for (const eleve of elevesClasse) {
        let sommePonderee = 0;
        let totalCoeff = 0;
        for (const matiere of cours as any[]) {
          const notesMatiere = (notes as any[]).filter(
            (n) => n.eleveId === eleve._id && n.matiere === matiere.nom
          );
          if (notesMatiere.length > 0) {
            const somme = notesMatiere.reduce((s, n) => s + n.note * (n.coefficient || 1), 0);
            const total = notesMatiere.reduce((s, n) => s + (n.coefficient || 1), 0);
            const moyenneBrute = total > 0 ? somme / total : 0;
            const pourcentage = (moyenneBrute / (matiere.bareme ?? 20)) * 100;
            sommePonderee += pourcentage * (matiere.coefficient ?? 1);
            totalCoeff += (matiere.coefficient ?? 1);
          }
        }
        if (totalCoeff > 0) {
          sommeMoyGenerale += sommePonderee / totalCoeff;
          nbElevesAvecNotes++;
        }
      }
      const moyenneClasse = nbElevesAvecNotes > 0 ? sommeMoyGenerale / nbElevesAvecNotes : null;
      const annee = await ctx.db.get(anneeId);
      result.push({
        anneeId,
        anneeNom: annee?.nom || "",
        moyenne: moyenneClasse ? parseFloat(moyenneClasse.toFixed(1)) : null,
      });
    }
    return result;
  },
});

// Comparaison des classes pour une année
export const getComparaisonClasses = query({
  args: {
    ecoleId: v.id("ecoles"),
    anneeId: v.id("anneesScolaires"),
  },
  handler: async (ctx, args) => {
    const classes = await ctx.db
      .query("classes")
      .withIndex("by_ecoleId", (q: any) => q.eq("ecoleId", args.ecoleId))
      .collect();

    const cours = await ctx.db
      .query("cours")
      .withIndex("by_ecoleId", (q: any) => q.eq("ecoleId", args.ecoleId))
      .collect();

    const notes = await ctx.db
      .query("notes")
      .withIndex("by_anneeId", (q: any) => q.eq("anneeId", args.anneeId))
      .filter((q: any) => q.eq(q.field("ecoleId"), args.ecoleId))
      .collect();

    const eleves = await getElevesParAnnee(ctx, args.ecoleId, args.anneeId);

    const result = [];
    for (const classe of classes as any[]) {
      const elevesClasse = (eleves as any[]).filter((e) => e.classe === classe.nom);
      const coursClasse = (cours as any[]).filter((c) => c.classe === classe.nom);
      let sommeMoy = 0;
      let nb = 0;
      for (const eleve of elevesClasse) {
        let sommePonderee = 0;
        let totalCoeff = 0;
        for (const matiere of coursClasse) {
          const notesMatiere = (notes as any[]).filter(
            (n) => n.eleveId === eleve._id && n.matiere === matiere.nom
          );
          if (notesMatiere.length > 0) {
            const somme = notesMatiere.reduce((s, n) => s + n.note * (n.coefficient || 1), 0);
            const total = notesMatiere.reduce((s, n) => s + (n.coefficient || 1), 0);
            const moyenneBrute = total > 0 ? somme / total : 0;
            const pourcentage = (moyenneBrute / (matiere.bareme ?? 20)) * 100;
            sommePonderee += pourcentage * (matiere.coefficient ?? 1);
            totalCoeff += (matiere.coefficient ?? 1);
          }
        }
        if (totalCoeff > 0) {
          sommeMoy += sommePonderee / totalCoeff;
          nb++;
        }
      }
      result.push({
        classe: classe.nom,
        moyenne: nb > 0 ? parseFloat((sommeMoy / nb).toFixed(1)) : null,
        nbEleves: nb,
      });
    }
    return result;
  },
});