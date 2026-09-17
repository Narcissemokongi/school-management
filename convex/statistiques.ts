import { query, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";

type AnyCtx = QueryCtx;

const MAX_INSCRIPTIONS = 1000;
const MAX_ELEVES = 2000;
const MAX_COURS = 500;
const MAX_NOTES = 5000;
const MAX_CLASSES = 200;

type UserDoc = {
  _id: Id<"users">;
  role: string;
  ecoleId?: Id<"ecoles">;
  permissions?: string[];
};

/**
 * 🔴 FIX GLOBAL : tout superAdmin passe désormais.
 */
function isSuperAdmin(user: any): boolean {
  if (!user) return false;
  return (
    user.role === "superAdmin" ||
    (user.role === "admin" && !user.ecoleId)
  );
}

/**
 * 🔴 FIX : auth + cloisonnement école.
 * Un admin/directeur/enseignant ne peut voir QUE son école.
 * Un superAdmin peut voir tout.
 */
async function requireEcoleAccess(
  ctx: AnyCtx,
  userId: Id<"users">,
  ecoleId: Id<"ecoles">
) {
  const user = (await ctx.db.get(userId)) as UserDoc | null;
  if (!user) throw new Error("Authentification requise");

  if (isSuperAdmin(user)) return user;

  const allowedRoles = ["admin", "directeur", "enseignant"];
  if (!allowedRoles.includes(user.role)) {
    throw new Error("Accès refusé : rôle insuffisant");
  }

  if (user.ecoleId !== ecoleId) {
    throw new Error("Accès refusé : école différente.");
  }

  return user;
}

/**
 * 🟢 FIX : helper typé + Map O(n) au lieu de find() O(n²) + `.take()`.
 */
async function getElevesParAnnee(
  ctx: AnyCtx,
  ecoleId: Id<"ecoles">,
  anneeId: Id<"anneesScolaires">
): Promise<
  (Doc<"eleves"> & { classe: string; inscriptionId: Id<"inscriptions"> })[]
> {
  const inscriptions = await ctx.db
    .query("inscriptions")
    .withIndex("by_ecole_annee", (q) =>
      q.eq("ecoleId", ecoleId).eq("anneeId", anneeId)
    )
    .take(MAX_INSCRIPTIONS);

  if (inscriptions.length === 0) return [];

  // 🟢 FIX : Map au lieu de find() imbriqué
  const eleveIds = [...new Set(inscriptions.map((i) => i.eleveId))];
  const eleves = await Promise.all(eleveIds.map((id) => ctx.db.get(id)));
  const eleveMap = new Map(
    eleves.filter(Boolean).map((e) => [e!._id, e!])
  );

  const result: (Doc<"eleves"> & {
    classe: string;
    inscriptionId: Id<"inscriptions">;
  })[] = [];

  for (const insc of inscriptions) {
    const eleve = eleveMap.get(insc.eleveId);
    if (!eleve) continue;
    result.push({
      ...eleve,
      classe: insc.classe,
      inscriptionId: insc._id,
    });
  }

  return result;
}

/**
 * 🟢 FIX : helper pour calculer la moyenne pondérée d'une liste de notes.
 */
function computeMoyennePonderee(
  notes: Doc<"notes">[],
  bareme: number
): number | null {
  if (notes.length === 0) return null;

  let sommePonderee = 0;
  let totalCoeff = 0;
  for (const n of notes) {
    const coef = n.coefficient || 1;
    sommePonderee += n.note * coef;
    totalCoeff += coef;
  }
  if (totalCoeff === 0) return null;

  const moyenneBrute = sommePonderee / totalCoeff;
  return (moyenneBrute / bareme) * 100;
}

// ════════════════════════════════════════════════════════════════════
// TAUX DE RÉUSSITE PAR MATIÈRE
// ════════════════════════════════════════════════════════════════════

/**
 * 🔴 FIX : `userId` REQUIS + cloisonnement école.
 * 🟢 FIX : Maps → O(n) au lieu de O(n³).
 * 🟢 FIX : `.take()` sur toutes les queries.
 */
export const getTauxReussiteParMatiere = query({
  args: {
    ecoleId: v.id("ecoles"),
    anneeId: v.id("anneesScolaires"),
    classe: v.string(),
    seuil: v.optional(v.number()),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireEcoleAccess(ctx, args.userId, args.ecoleId);

    const seuil = args.seuil ?? 50;

    // 🟢 FIX : lectures parallèles
    const [eleves, cours, notes] = await Promise.all([
      getElevesParAnnee(ctx, args.ecoleId, args.anneeId),
      ctx.db
        .query("cours")
        .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId))
        .filter((q) => q.eq(q.field("classe"), args.classe))
        .take(MAX_COURS),
      ctx.db
        .query("notes")
        .withIndex("by_anneeId", (q) => q.eq("anneeId", args.anneeId))
        .filter((q) => q.eq(q.field("ecoleId"), args.ecoleId))
        .take(MAX_NOTES),
    ]);

    const elevesClasse = eleves.filter((e) => e.classe === args.classe);
    if (elevesClasse.length === 0) return [];

    const eleveIdSet = new Set(elevesClasse.map((e) => e._id));

    // 🟢 FIX : Map (eleveId|matiere) → notes[]
    const notesMap = new Map<string, Doc<"notes">[]>();
    for (const n of notes) {
      if (!n.matiere) continue;
      if (!eleveIdSet.has(n.eleveId)) continue;
      const key = `${n.eleveId}|${n.matiere}`;
      if (!notesMap.has(key)) notesMap.set(key, []);
      notesMap.get(key)!.push(n);
    }

    const result: {
      matiere: string;
      tauxReussite: number;
      nbEleves: number;
    }[] = [];

    for (const matiere of cours) {
      let reussite = 0;
      let total = 0;

      for (const eleve of elevesClasse) {
        const notesEleveMatiere = notesMap.get(`${eleve._id}|${matiere.nom}`) || [];
        const pourcentage = computeMoyennePonderee(
          notesEleveMatiere,
          matiere.bareme ?? 20
        );
        if (pourcentage === null) continue;
        if (pourcentage >= seuil) reussite++;
        total++;
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

// ════════════════════════════════════════════════════════════════════
// ÉVOLUTION DES RÉSULTATS
// ════════════════════════════════════════════════════════════════════

/**
 * 🔴 FIX : `userId` REQUIS + cloisonnement école.
 * 🟢 FIX : limite sur le nombre d'années (max 10).
 */
export const getEvolutionResultats = query({
  args: {
    ecoleId: v.id("ecoles"),
    classe: v.string(),
    annees: v.array(v.id("anneesScolaires")),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireEcoleAccess(ctx, args.userId, args.ecoleId);

    if (args.annees.length === 0) return [];
    if (args.annees.length > 10) {
      throw new Error("Maximum 10 années comparables.");
    }

    const coursClasse = await ctx.db
      .query("cours")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId))
      .filter((q) => q.eq(q.field("classe"), args.classe))
      .take(MAX_COURS);

    const result: {
      anneeId: Id<"anneesScolaires">;
      anneeNom: string;
      moyenne: number | null;
    }[] = [];

    for (const anneeId of args.annees) {
      const [eleves, notes, annee] = await Promise.all([
        getElevesParAnnee(ctx, args.ecoleId, anneeId),
        ctx.db
          .query("notes")
          .withIndex("by_anneeId", (q) => q.eq("anneeId", anneeId))
          .filter((q) => q.eq(q.field("ecoleId"), args.ecoleId))
          .take(MAX_NOTES),
        ctx.db.get(anneeId),
      ]);

      const elevesClasse = eleves.filter((e) => e.classe === args.classe);

      if (elevesClasse.length > 0) {
        const eleveIdSet = new Set(elevesClasse.map((e) => e._id));

        // 🟢 FIX : Map (eleveId|matiere) → notes[]
        const notesMap = new Map<string, Doc<"notes">[]>();
        for (const n of notes) {
          if (!n.matiere) continue;
          if (!eleveIdSet.has(n.eleveId)) continue;
          const key = `${n.eleveId}|${n.matiere}`;
          if (!notesMap.has(key)) notesMap.set(key, []);
          notesMap.get(key)!.push(n);
        }

        let sommeMoyGenerale = 0;
        let nbElevesAvecNotes = 0;

        for (const eleve of elevesClasse) {
          let sommePonderee = 0;
          let totalCoeff = 0;

          for (const matiere of coursClasse) {
            const notesMatiere = notesMap.get(`${eleve._id}|${matiere.nom}`) || [];
            const pourcentage = computeMoyennePonderee(
              notesMatiere,
              matiere.bareme ?? 20
            );
            if (pourcentage === null) continue;

            const coefMatiere = matiere.coefficient ?? 1;
            sommePonderee += pourcentage * coefMatiere;
            totalCoeff += coefMatiere;
          }

          if (totalCoeff > 0) {
            sommeMoyGenerale += sommePonderee / totalCoeff;
            nbElevesAvecNotes++;
          }
        }

        const moyenneClasse =
          nbElevesAvecNotes > 0
            ? sommeMoyGenerale / nbElevesAvecNotes
            : null;

        result.push({
          anneeId,
          anneeNom: annee?.nom || "",
          moyenne: moyenneClasse
            ? parseFloat(moyenneClasse.toFixed(1))
            : null,
        });
      } else {
        result.push({
          anneeId,
          anneeNom: annee?.nom || "",
          moyenne: null,
        });
      }
    }

    return result;
  },
});

// ════════════════════════════════════════════════════════════════════
// COMPARAISON DES CLASSES
// ════════════════════════════════════════════════════════════════════

/**
 * 🔴 FIX : `userId` REQUIS + cloisonnement école.
 * 🟢 FIX : Maps → O(n) au lieu de O(n³).
 */
export const getComparaisonClasses = query({
  args: {
    ecoleId: v.id("ecoles"),
    anneeId: v.id("anneesScolaires"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireEcoleAccess(ctx, args.userId, args.ecoleId);

    // 🟢 FIX : lectures parallèles + `.take()`
    const [classes, cours, notes, eleves] = await Promise.all([
      ctx.db
        .query("classes")
        .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId))
        .take(MAX_CLASSES),
      ctx.db
        .query("cours")
        .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId))
        .take(MAX_COURS),
      ctx.db
        .query("notes")
        .withIndex("by_anneeId", (q) => q.eq("anneeId", args.anneeId))
        .filter((q) => q.eq(q.field("ecoleId"), args.ecoleId))
        .take(MAX_NOTES),
      getElevesParAnnee(ctx, args.ecoleId, args.anneeId),
    ]);

    // 🟢 FIX : Map classe → cours[]
    const coursByClasse = new Map<string, Doc<"cours">[]>();
    for (const c of cours) {
      if (!coursByClasse.has(c.classe)) coursByClasse.set(c.classe, []);
      coursByClasse.get(c.classe)!.push(c);
    }

    // 🟢 FIX : Map classe → eleves[]
    const elevesByClasse = new Map<string, typeof eleves>();
    for (const e of eleves) {
      if (!elevesByClasse.has(e.classe)) elevesByClasse.set(e.classe, []);
      elevesByClasse.get(e.classe)!.push(e);
    }

    // 🟢 FIX : Map (eleveId|matiere) → notes[]
    const notesMap = new Map<string, Doc<"notes">[]>();
    for (const n of notes) {
      if (!n.matiere) continue;
      const key = `${n.eleveId}|${n.matiere}`;
      if (!notesMap.has(key)) notesMap.set(key, []);
      notesMap.get(key)!.push(n);
    }

    const result: {
      classe: string;
      moyenne: number | null;
      nbEleves: number;
    }[] = [];

    for (const classe of classes) {
      const elevesClasse = elevesByClasse.get(classe.nom) || [];
      const coursClasse = coursByClasse.get(classe.nom) || [];

      let sommeMoy = 0;
      let nb = 0;

      for (const eleve of elevesClasse) {
        let sommePonderee = 0;
        let totalCoeff = 0;

        for (const matiere of coursClasse) {
          const notesMatiere = notesMap.get(`${eleve._id}|${matiere.nom}`) || [];
          const pourcentage = computeMoyennePonderee(
            notesMatiere,
            matiere.bareme ?? 20
          );
          if (pourcentage === null) continue;

          const coefMatiere = matiere.coefficient ?? 1;
          sommePonderee += pourcentage * coefMatiere;
          totalCoeff += coefMatiere;
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