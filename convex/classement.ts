import { query } from "./_generated/server";
import { v } from "convex/values";

export const getClassement = query({
  args: {
    ecoleId: v.id("ecoles"),
    anneeId: v.id("anneesScolaires"),
    classe: v.string(),
  },
  handler: async (ctx, args) => {
    const eleves = await ctx.db
      .query("eleves")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId))
      .filter((q) =>
        q.and(q.eq(q.field("anneeId"), args.anneeId), q.eq(q.field("classe"), args.classe))
      )
      .collect();

    const notes = await ctx.db
      .query("notes")
      .withIndex("by_anneeId", (q) => q.eq("anneeId", args.anneeId))
      .filter((q) => q.eq(q.field("ecoleId"), args.ecoleId))
      .collect();

    const cours = await ctx.db
      .query("cours")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId))
      .collect();

    const elevesAvecMoyenne = eleves.map((eleve) => {
      const notesEleve = notes.filter((n) => n.eleveId === eleve._id);
      const matieres = [...new Set(notesEleve.map((n) => n.matiere))];
      let sommePonderee = 0;
      let totalCoefficients = 0;
      matieres.forEach((matiere) => {
        const coursMatiere = cours.find((c) => c.nom === matiere && c.classe === args.classe);
        const coeff = coursMatiere?.coefficient ?? 1;
        const bareme = coursMatiere?.bareme ?? 20;
        const notesMatiere = notesEleve.filter((n) => n.matiere === matiere);
        if (notesMatiere.length > 0) {
          const somme = notesMatiere.reduce((s, n) => s + n.note * (n.coefficient || 1), 0);
          const total = notesMatiere.reduce((s, n) => s + (n.coefficient || 1), 0);
          const moyenneBrute = total > 0 ? somme / total : 0;
          const pourcentage = (moyenneBrute / bareme) * 100;
          sommePonderee += pourcentage * coeff;
          totalCoefficients += coeff;
        }
      });
      const moyenneGenerale = totalCoefficients > 0 ? sommePonderee / totalCoefficients : 0;
      return { ...eleve, moyenneGenerale };
    });

    elevesAvecMoyenne.sort((a, b) => b.moyenneGenerale - a.moyenneGenerale);
    return elevesAvecMoyenne.map((eleve, index) => ({
      ...eleve,
      rang: index + 1,
    }));
  },
});