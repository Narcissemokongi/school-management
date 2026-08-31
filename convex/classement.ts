import { query } from "./_generated/server";
import { v } from "convex/values";

export const getClassement = query({
  args: {
    ecoleId: v.id("ecoles"),
    anneeId: v.id("anneesScolaires"),
    classe: v.string(),
  },
  handler: async (ctx, args) => {
    // Récupérer les inscriptions des élèves de cette classe pour l'année donnée
    const inscriptions = await ctx.db
      .query("inscriptions")
      .withIndex("by_classe_annee", (q) =>
        q.eq("classe", args.classe).eq("anneeId", args.anneeId)
      )
      .filter((q) => q.eq(q.field("ecoleId"), args.ecoleId))
      .collect();

    if (inscriptions.length === 0) return [];

    const eleveIds = inscriptions.map((i) => i.eleveId);

    // Récupérer les élèves correspondants
    const eleves = await Promise.all(eleveIds.map((id) => ctx.db.get(id)));

    // Récupérer les notes pour ces élèves
    const notes = await ctx.db
      .query("notes")
      .withIndex("by_anneeId", (q) => q.eq("anneeId", args.anneeId))
      .filter((q) => q.eq(q.field("ecoleId"), args.ecoleId))
      .collect();

    // Récupérer les cours de la classe pour les coefficients/baremes
    const cours = await ctx.db
      .query("cours")
      .withIndex("by_classe", (q) => q.eq("classe", args.classe).eq("ecoleId", args.ecoleId))
      .collect();

    const elevesAvecMoyenne = eleves
      .filter((e): e is NonNullable<typeof e> => e !== null)
      .map((eleve) => {
        const notesEleve = notes.filter((n) => n.eleveId === eleve._id);
        const matieres = [...new Set(notesEleve.map((n) => n.matiere))];
        let sommePonderee = 0;
        let totalCoefficients = 0;

        for (const matiere of matieres) {
          const coursMatiere = cours.find((c) => c.nom === matiere);
          const coeff = coursMatiere?.coefficient ?? 1;
          const bareme = coursMatiere?.bareme ?? 20;

          const notesMatiere = notesEleve.filter((n) => n.matiere === matiere);
          if (notesMatiere.length > 0) {
            const somme = notesMatiere.reduce(
              (s, n) => s + n.note * (n.coefficient || 1),
              0
            );
            const total = notesMatiere.reduce(
              (s, n) => s + (n.coefficient || 1),
              0
            );
            const moyenneBrute = total > 0 ? somme / total : 0;
            const pourcentage = (moyenneBrute / bareme) * 100;
            sommePonderee += pourcentage * coeff;
            totalCoefficients += coeff;
          }
        }

        const moyenneGenerale =
          totalCoefficients > 0 ? sommePonderee / totalCoefficients : 0;

        return {
          _id: eleve._id,
          nom: eleve.nom,
          postnom: eleve.postnom,
          prenom: eleve.prenom,
          classe: eleve.classe,
          moyenneGenerale,
        };
      });

    elevesAvecMoyenne.sort((a, b) => b.moyenneGenerale - a.moyenneGenerale);

    return elevesAvecMoyenne.map((eleve, index) => ({
      ...eleve,
      rang: index + 1,
    }));
  },
});