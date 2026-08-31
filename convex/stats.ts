import { query } from "./_generated/server";

// ----- STATISTIQUES GLOBALES (pour le tableau de bord super admin) -----
export const globalStats = query({
  handler: async (ctx) => {
    const ecoles = await ctx.db.query("ecoles").collect();
    const users = await ctx.db.query("users").collect();
    const eleves = await ctx.db.query("eleves").collect();
    const classes = await ctx.db.query("classes").collect();
    const punitions = await ctx.db.query("punitions").collect();

    return {
      totalEcoles: ecoles.length,
      totalUsers: users.length,
      totalEleves: eleves.length,
      totalClasses: classes.length,
      totalPunitions: punitions.length,
    };
  },
});

// ----- TAUX DE RÉUSSITE PAR MATIÈRE (toutes écoles confondues) -----
export const tauxReussiteParMatiere = query({
  handler: async (ctx) => {
    const notes = await ctx.db.query("notes").collect();
    const cours = await ctx.db.query("cours").collect();

    // Matières uniques (en ignorant les valeurs undefined)
    const matieres = [
      ...new Set(notes.map((n) => n.matiere).filter((m) => m !== undefined)),
    ].sort();

    const result = [];
    for (const matiere of matieres) {
      const notesMatiere = notes.filter((n) => n.matiere === matiere);
      if (notesMatiere.length === 0) continue;

      const coursMatiere = cours.find((c) => c.nom === matiere);
      const bareme = coursMatiere?.bareme ?? 20;

      const sommePonderee = notesMatiere.reduce(
        (sum, n) => sum + n.note * (n.coefficient || 1),
        0
      );
      const totalCoeff = notesMatiere.reduce(
        (sum, n) => sum + (n.coefficient || 1),
        0
      );
      const moyenneBrute = totalCoeff > 0 ? sommePonderee / totalCoeff : 0;
      const taux = (moyenneBrute / bareme) * 100;

      result.push({ matiere, taux: Number(taux.toFixed(1)) });
    }
    return result.sort((a, b) => b.taux - a.taux);
  },
});

// ----- TAUX DE RÉUSSITE PAR CLASSE (toutes écoles confondues) -----
export const tauxReussiteParClasse = query({
  handler: async (ctx) => {
    const notes = await ctx.db.query("notes").collect();
    const eleves = await ctx.db.query("eleves").collect();
    const cours = await ctx.db.query("cours").collect();

    // Classes uniques (en ignorant les valeurs undefined)
    const classes = [
      ...new Set(eleves.map((e) => e.classe).filter((c) => c !== undefined)),
    ].sort();

    const result = [];
    for (const classe of classes) {
      const elevesClasse = eleves.filter((e) => e.classe === classe);
      const eleveIds = elevesClasse.map((e) => e._id);
      const notesClasse = notes.filter((n) => eleveIds.includes(n.eleveId));
      if (notesClasse.length === 0) continue;

      const matieresClasse = [
        ...new Set(notesClasse.map((n) => n.matiere).filter((m) => m !== undefined)),
      ];
      let sommeTaux = 0;
      let nbMatieres = 0;

      for (const matiere of matieresClasse) {
        const notesMatiere = notesClasse.filter((n) => n.matiere === matiere);
        const coursMatiere = cours.find(
          (c) => c.nom === matiere && c.classe === classe
        );
        const bareme = coursMatiere?.bareme ?? 20;

        const sommePonderee = notesMatiere.reduce(
          (sum, n) => sum + n.note * (n.coefficient || 1),
          0
        );
        const totalCoeff = notesMatiere.reduce(
          (sum, n) => sum + (n.coefficient || 1),
          0
        );
        const moyenneBrute = totalCoeff > 0 ? sommePonderee / totalCoeff : 0;
        const taux = (moyenneBrute / bareme) * 100;
        sommeTaux += taux;
        nbMatieres++;
      }
      const tauxMoyen = nbMatieres > 0 ? sommeTaux / nbMatieres : 0;
      result.push({ classe, taux: Number(tauxMoyen.toFixed(1)) });
    }
    return result.sort((a, b) => b.taux - a.taux);
  },
});

// ----- ÉVOLUTION DES RÉSULTATS GLOBAUX PAR PÉRIODE -----
export const evolutionResultats = query({
  handler: async (ctx) => {
    const notes = await ctx.db.query("notes").collect();
    const cours = await ctx.db.query("cours").collect();

    const periodes = [
      ...new Set(notes.map((n) => n.periode).filter((p) => p !== undefined)),
    ].sort();

    const result = [];
    for (const periode of periodes) {
      const notesPeriode = notes.filter((n) => n.periode === periode);
      const matieres = [
        ...new Set(notesPeriode.map((n) => n.matiere).filter((m) => m !== undefined)),
      ];
      let sommeTaux = 0;
      let nbMatieres = 0;

      for (const matiere of matieres) {
        const notesMatiere = notesPeriode.filter((n) => n.matiere === matiere);
        const coursMatiere = cours.find((c) => c.nom === matiere);
        const bareme = coursMatiere?.bareme ?? 20;

        const sommePonderee = notesMatiere.reduce(
          (sum, n) => sum + n.note * (n.coefficient || 1),
          0
        );
        const totalCoeff = notesMatiere.reduce(
          (sum, n) => sum + (n.coefficient || 1),
          0
        );
        const moyenneBrute = totalCoeff > 0 ? sommePonderee / totalCoeff : 0;
        const taux = (moyenneBrute / bareme) * 100;
        sommeTaux += taux;
        nbMatieres++;
      }
      const tauxMoyen = nbMatieres > 0 ? sommeTaux / nbMatieres : 0;
      result.push({ periode, taux: Number(tauxMoyen.toFixed(1)) });
    }
    return result;
  },
});