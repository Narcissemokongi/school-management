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

// ========== QUERY ==========

export const list = query({
  args: {
    ecoleId: v.optional(v.id("ecoles")),
    anneeId: v.optional(v.id("anneesScolaires")),
  },
  handler: async (ctx, args) => {
    const { ecoleId, anneeId } = args;

    let classes: any[] = [];

    if (ecoleId) {
      classes = await ctx.db
        .query("classes")
        .withIndex("by_ecoleId", (q) => q.eq("ecoleId", ecoleId))
        .collect();
    } else {
      classes = await ctx.db.query("classes").collect();
    }

    if (anneeId) {
      classes = classes.filter((c) => c.anneeId === anneeId);
    }

    return classes.sort((a, b) =>
      a.nom.localeCompare(b.nom, undefined, {
        numeric: true,
        sensitivity: "base",
      })
    );
  },
});

// ========== MUTATIONS ==========

export const add = mutation({
  args: {
    nom: v.string(),
    ecoleId: v.id("ecoles"),
    anneeId: v.optional(v.id("anneesScolaires")),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    await requireEcoleAdmin(ctx, args.userId, args.ecoleId);

    const nom = args.nom.trim();
    if (!nom) throw new Error("Le nom de la classe est requis.");

    const existingClasses = await ctx.db
      .query("classes")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId))
      .collect();

    const doublon = existingClasses.some(
      (c) =>
        c.nom === nom &&
        (args.anneeId ? c.anneeId === args.anneeId : !c.anneeId)
    );
    if (doublon) throw new Error("Cette classe existe déjà pour cette année.");

    await ctx.db.insert("classes", {
      nom,
      ecoleId: args.ecoleId,
      anneeId: args.anneeId,
    });
  },
});

export const remove = mutation({
  args: {
    id: v.id("classes"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const classe = await ctx.db.get(args.id);
    if (!classe) throw new Error("Classe introuvable");
    await requireEcoleAdmin(ctx, args.userId, classe.ecoleId);

    // Stocker l'anneeId dans une constante locale typée pour éviter le problème de type
    const anneeId: Id<"anneesScolaires"> | undefined = classe.anneeId;

    let inscriptions: any[] = [];

    if (anneeId) {
      inscriptions = await ctx.db
        .query("inscriptions")
        .withIndex("by_ecole_annee", (q) =>
          q.eq("ecoleId", classe.ecoleId).eq("anneeId", anneeId)
        )
        .collect();
    } else {
      const all = await ctx.db.query("inscriptions").collect();
      inscriptions = all.filter((i) => i.ecoleId === classe.ecoleId);
    }

    const inscriptionsDansClasse = inscriptions.filter(
      (i) => i.classe === classe.nom
    );

    if (inscriptionsDansClasse.length > 0) {
      throw new Error("Des élèves sont encore inscrits dans cette classe.");
    }

    await ctx.db.delete(args.id);
  },
});

// Mutation corrigée : assigne ou retire un élève d'une classe
export const updateEleveClasse = mutation({
  args: {
    eleveId: v.id("eleves"),
    newClasseNom: v.string(),
    anneeId: v.id("anneesScolaires"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const { eleveId, newClasseNom, anneeId } = args;

    const eleve = await ctx.db.get(eleveId);
    if (!eleve) throw new Error("Élève introuvable.");

    await requireEcoleAdmin(ctx, args.userId, eleve.ecoleId);

    if (newClasseNom !== "") {
      const classe = await ctx.db
        .query("classes")
        .withIndex("by_ecoleId", (q) => q.eq("ecoleId", eleve.ecoleId))
        .filter((q) => q.eq(q.field("nom"), newClasseNom))
        .first();
      if (!classe) {
        throw new Error("La classe spécifiée n'existe pas.");
      }
      if (classe.anneeId && classe.anneeId !== anneeId) {
        throw new Error("La classe n'appartient pas à l'année scolaire sélectionnée.");
      }
    }

    const inscription = await ctx.db
      .query("inscriptions")
      .withIndex("by_eleve_annee", (q) =>
        q.eq("eleveId", eleveId).eq("anneeId", anneeId)
      )
      .first();

    if (!inscription) {
      throw new Error("Cet élève n'a pas d'inscription pour l'année sélectionnée.");
    }

    await ctx.db.patch(inscription._id, { classe: newClasseNom });
  },
});

export const rename = mutation({
  args: {
    id: v.id("classes"),
    nom: v.string(),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const classe = await ctx.db.get(args.id);
    if (!classe) throw new Error("Classe introuvable");
    await requireEcoleAdmin(ctx, args.userId, classe.ecoleId);

    const trimmed = args.nom.trim();
    if (!trimmed) throw new Error("Le nom est requis.");

    // Vérifier les doublons avant de renommer
    const existing = await ctx.db
      .query("classes")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", classe.ecoleId))
      .collect();
    const conflit = existing.some(
      (c) =>
        c._id !== args.id &&
        c.nom === trimmed &&
        (classe.anneeId ? c.anneeId === classe.anneeId : !c.anneeId)
    );
    if (conflit) throw new Error("Une classe avec ce nom existe déjà pour cette année.");

    await ctx.db.patch(args.id, { nom: trimmed });
  },
});

export const importClasses = mutation({
  args: {
    noms: v.array(v.string()),
    ecoleId: v.id("ecoles"),
    anneeId: v.optional(v.id("anneesScolaires")),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    await requireEcoleAdmin(ctx, args.userId, args.ecoleId);

    const existingClasses = await ctx.db
      .query("classes")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId))
      .collect();
    const existingNames = new Set(existingClasses.map((c) => c.nom));
    let inserted = 0;
    const duplicates: string[] = [];

    for (const nom of args.noms) {
      const trimmed = nom.trim();
      if (!trimmed) continue;
      if (existingNames.has(trimmed)) {
        duplicates.push(trimmed);
        continue;
      }
      await ctx.db.insert("classes", {
        nom: trimmed,
        ecoleId: args.ecoleId,
        anneeId: args.anneeId,
      });
      existingNames.add(trimmed);
      inserted++;
    }

    return { inserted, duplicates };
  },
});