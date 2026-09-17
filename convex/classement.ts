import { query, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// ============================================================
// HELPERS AUTH
// ============================================================

// ✅ Fix universel : superAdmin reconnu indépendamment des permissions
function isSuperAdmin(user: {
  role: string;
  ecoleId?: Id<"ecoles"> | null;
}): boolean {
  return (
    user.role === "superAdmin" ||
    (user.role === "admin" && !user.ecoleId)
  );
}

// Pour les QUERIES : autorise tout utilisateur rattaché à l'école + superAdmin
async function assertSameEcole(
  ctx: QueryCtx,
  userId: Id<"users"> | undefined,
  ecoleId: Id<"ecoles">
) {
  if (!userId) throw new Error("Authentification requise");
  const user = await ctx.db.get(userId);
  if (!user) throw new Error("Utilisateur introuvable");

  if (isSuperAdmin(user)) return user;

  if (user.ecoleId !== ecoleId) {
    throw new Error(
      "Accès refusé : cette école ne correspond pas à la vôtre."
    );
  }
  return user;
}

// ============================================================
// QUERY
// ============================================================
export const getClassement = query({
  args: {
    ecoleId: v.id("ecoles"),
    anneeId: v.id("anneesScolaires"),
    classe: v.string(),
    userId: v.id("users"), // ✅ requis (auth)
  },
  handler: async (ctx, args) => {
    // ✅ Cloisonnement multi-tenant obligatoire
    await assertSameEcole(ctx, args.userId, args.ecoleId);

    // Extraction pour narrowing TS dans les closures
    const ecoleId: Id<"ecoles"> = args.ecoleId;
    const anneeId: Id<"anneesScolaires"> = args.anneeId;
    const classe: string = args.classe;

    // ============================================================
    // 1. Récupérer les inscriptions de la classe pour l'année
    // ============================================================
    const inscriptions = await ctx.db
      .query("inscriptions")
      .withIndex("by_classe_annee", (q) =>
        q.eq("classe", classe).eq("anneeId", anneeId)
      )
      .filter((q) => q.eq(q.field("ecoleId"), ecoleId))
      .take(500);

    if (inscriptions.length === 0) return [];

    // ✅ TypeScript sait maintenant que c'est un Id<"eleves">
    const eleveIds: Id<"eleves">[] = inscriptions.map((i) => i.eleveId);

    // ============================================================
    // 2. Récupérer les élèves (batch + filtre école)
    // ============================================================
    type EleveDoc = NonNullable<Awaited<ReturnType<typeof ctx.db.get<"eleves">>>>;
    const eleves: EleveDoc[] = [];

    const BATCH = 50;
    for (let i = 0; i < eleveIds.length; i += BATCH) {
      const batch = eleveIds.slice(i, i + BATCH);
      const results = await Promise.all(
        batch.map((id) => ctx.db.get(id))
      );
      for (const e of results) {
        // ✅ Filtre école : évite toute fuite PII
        if (e && e.ecoleId === ecoleId) {
          eleves.push(e);
        }
      }
    }

    if (eleves.length === 0) return [];

    // ✅ Sets pour lookup O(1)
    const eleveIdsSet = new Set(eleves.map((e) => e._id));

    // ============================================================
    // 3. Récupérer les notes de l'année (bornées)
    // ============================================================
    const allNotes = await ctx.db
      .query("notes")
      .withIndex("by_anneeId", (q) => q.eq("anneeId", anneeId))
      .filter((q) => q.eq(q.field("ecoleId"), ecoleId))
      .take(5000);

    // ✅ Pré-grouper par eleveId via Map (une seule passe)
    type NoteDoc = (typeof allNotes)[number];
    const notesParEleve = new Map<Id<"eleves">, NoteDoc[]>();
    for (const n of allNotes) {
      if (!eleveIdsSet.has(n.eleveId)) continue;
      if (!notesParEleve.has(n.eleveId)) {
        notesParEleve.set(n.eleveId, []);
      }
      notesParEleve.get(n.eleveId)!.push(n);
    }

    // ============================================================
    // 4. Récupérer les cours de la classe pour coeff/bareme
    // ============================================================
    const cours = await ctx.db
      .query("cours")
      .withIndex("by_classe", (q) =>
        q.eq("classe", classe).eq("ecoleId", ecoleId)
      )
      .take(200);

    // ✅ Map cours par nom (lookup O(1))
    const coursByNom = new Map(cours.map((c) => [c.nom, c]));

    // ============================================================
    // 5. Calculer les moyennes
    // ============================================================
    const elevesAvecMoyenne = eleves.map((eleve) => {
      const notesEleve = notesParEleve.get(eleve._id) ?? [];

      // ✅ Grouper les notes par matière (Map)
      const notesParMatiere = new Map<string, NoteDoc[]>();
      for (const n of notesEleve) {
        if (!notesParMatiere.has(n.matiere)) {
          notesParMatiere.set(n.matiere, []);
        }
        notesParMatiere.get(n.matiere)!.push(n);
      }

      let sommePonderee = 0;
      let totalCoefficients = 0;

      for (const [matiere, notesMatiere] of notesParMatiere) {
        const coursMatiere = coursByNom.get(matiere);
        const coeff = coursMatiere?.coefficient ?? 1;
        const bareme = coursMatiere?.bareme ?? 20;

        if (notesMatiere.length === 0) continue;

        const somme = notesMatiere.reduce(
          (s, n) => s + n.note * (n.coefficient || 1),
          0
        );
        const total = notesMatiere.reduce(
          (s, n) => s + (n.coefficient || 1),
          0
        );
        const moyenneBrute = total > 0 ? somme / total : 0;
        const pourcentage = bareme > 0 ? (moyenneBrute / bareme) * 100 : 0;

        sommePonderee += pourcentage * coeff;
        totalCoefficients += coeff;
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
        pourcentage: moyenneGenerale, // ✅ cohérent avec le front
      };
    });

    // ============================================================
    // 6. Tri + rang
    // ============================================================
    elevesAvecMoyenne.sort((a, b) => {
      if (b.moyenneGenerale !== a.moyenneGenerale) {
        return b.moyenneGenerale - a.moyenneGenerale;
      }
      const aNom = `${a.nom} ${a.postnom}`.toLowerCase();
      const bNom = `${b.nom} ${b.postnom}`.toLowerCase();
      return aNom.localeCompare(bNom);
    });

    return elevesAvecMoyenne.map((eleve, index) => ({
      ...eleve,
      rang: index + 1,
    }));
  },
});