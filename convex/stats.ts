// convex/stats.ts
import { query, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { requireGranularPermission } from "./helpers/permissions";

type AnyCtx = QueryCtx;

const MAX_ECOLES = 500;
const MAX_USERS = 5000;
const MAX_ELEVES = 10000;
const MAX_CLASSES = 500;
const MAX_NOTES = 20000;
const MAX_PUNITIONS = 10000;
const MAX_COURS = 5000;

// ----- STATISTIQUES GLOBALES -----
export const globalStats = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // ✨ Permission granulaire : stats.read
    await requireGranularPermission(ctx, args.userId, "stats.read");

    const [ecoles, users, eleves, classes, punitions] = await Promise.all([
      ctx.db.query("ecoles").take(MAX_ECOLES),
      ctx.db.query("users").take(MAX_USERS),
      ctx.db.query("eleves").take(MAX_ELEVES),
      ctx.db.query("classes").take(MAX_CLASSES),
      ctx.db.query("punitions").take(MAX_PUNITIONS),
    ]);

    return {
      totalEcoles: ecoles.length,
      totalUsers: users.length,
      totalEleves: eleves.length,
      totalClasses: classes.length,
      totalPunitions: punitions.length,
    };
  },
});

// ----- TAUX DE RÉUSSITE PAR MATIÈRE -----
export const tauxReussiteParMatiere = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // ✨ Permission granulaire : stats.read
    await requireGranularPermission(ctx, args.userId, "stats.read");

    const [notes, cours] = await Promise.all([
      ctx.db.query("notes").take(MAX_NOTES),
      ctx.db.query("cours").take(MAX_COURS),
    ]);

    const coursMap = new Map<string, any>();
    for (const c of cours) {
      if (!coursMap.has(c.nom)) coursMap.set(c.nom, c);
    }

    const notesByMatiere = new Map<string, any[]>();
    for (const n of notes) {
      if (!n.matiere) continue;
      if (!notesByMatiere.has(n.matiere)) notesByMatiere.set(n.matiere, []);
      notesByMatiere.get(n.matiere)!.push(n);
    }

    const result: { matiere: string; taux: number }[] = [];

    for (const [matiere, notesMatiere] of notesByMatiere.entries()) {
      if (notesMatiere.length === 0) continue;

      const coursMatiere = coursMap.get(matiere);
      const bareme = coursMatiere?.bareme ?? 20;

      let sommePonderee = 0;
      let totalCoeff = 0;
      for (const n of notesMatiere) {
        const coef = n.coefficient || 1;
        sommePonderee += n.note * coef;
        totalCoeff += coef;
      }
      const moyenneBrute = totalCoeff > 0 ? sommePonderee / totalCoeff : 0;
      const taux = (moyenneBrute / bareme) * 100;

      result.push({ matiere, taux: Number(taux.toFixed(1)) });
    }

    return result.sort((a, b) => b.taux - a.taux);
  },
});

// ----- TAUX DE RÉUSSITE PAR CLASSE -----
export const tauxReussiteParClasse = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // ✨ Permission granulaire : stats.read
    await requireGranularPermission(ctx, args.userId, "stats.read");

    const [notes, eleves, cours] = await Promise.all([
      ctx.db.query("notes").take(MAX_NOTES),
      ctx.db.query("eleves").take(MAX_ELEVES),
      ctx.db.query("cours").take(MAX_COURS),
    ]);

    const eleveClasseMap = new Map<string, string>();
    const classesSet = new Set<string>();
    for (const e of eleves) {
      if (e.classe) {
        eleveClasseMap.set(e._id, e.classe);
        classesSet.add(e.classe);
      }
    }

    const coursMap = new Map<string, any>();
    for (const c of cours) {
      coursMap.set(`${c.nom}|${c.classe}`, c);
    }

    const notesByClasse = new Map<string, any[]>();
    for (const n of notes) {
      if (!n.matiere) continue;
      const classe = eleveClasseMap.get(n.eleveId);
      if (!classe) continue;
      if (!notesByClasse.has(classe)) notesByClasse.set(classe, []);
      notesByClasse.get(classe)!.push(n);
    }

    const result: { classe: string; taux: number }[] = [];

    for (const [classe, notesClasse] of notesByClasse.entries()) {
      if (notesClasse.length === 0) continue;

      const notesByMatiere = new Map<string, any[]>();
      for (const n of notesClasse) {
        if (!notesByMatiere.has(n.matiere)) notesByMatiere.set(n.matiere, []);
        notesByMatiere.get(n.matiere)!.push(n);
      }

      let sommeTaux = 0;
      let nbMatieres = 0;

      for (const [matiere, notesMatiere] of notesByMatiere.entries()) {
        const coursMatiere = coursMap.get(`${matiere}|${classe}`);
        const bareme = coursMatiere?.bareme ?? 20;

        let sommePonderee = 0;
        let totalCoeff = 0;
        for (const n of notesMatiere) {
          const coef = n.coefficient || 1;
          sommePonderee += n.note * coef;
          totalCoeff += coef;
        }
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
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // ✨ Permission granulaire : stats.read
    await requireGranularPermission(ctx, args.userId, "stats.read");

    const [notes, cours] = await Promise.all([
      ctx.db.query("notes").take(MAX_NOTES),
      ctx.db.query("cours").take(MAX_COURS),
    ]);

    const coursMap = new Map<string, any>();
    for (const c of cours) {
      if (!coursMap.has(c.nom)) coursMap.set(c.nom, c);
    }

    const notesByPeriode = new Map<string, any[]>();
    for (const n of notes) {
      if (!n.periode || !n.matiere) continue;
      if (!notesByPeriode.has(n.periode)) notesByPeriode.set(n.periode, []);
      notesByPeriode.get(n.periode)!.push(n);
    }

    const result: { periode: string; taux: number }[] = [];

    for (const [periode, notesPeriode] of notesByPeriode.entries()) {
      const notesByMatiere = new Map<string, any[]>();
      for (const n of notesPeriode) {
        if (!notesByMatiere.has(n.matiere)) notesByMatiere.set(n.matiere, []);
        notesByMatiere.get(n.matiere)!.push(n);
      }

      let sommeTaux = 0;
      let nbMatieres = 0;

      for (const [matiere, notesMatiere] of notesByMatiere.entries()) {
        const coursMatiere = coursMap.get(matiere);
        const bareme = coursMatiere?.bareme ?? 20;

        let sommePonderee = 0;
        let totalCoeff = 0;
        for (const n of notesMatiere) {
          const coef = n.coefficient || 1;
          sommePonderee += n.note * coef;
          totalCoeff += coef;
        }
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