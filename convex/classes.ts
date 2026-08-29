import { query, mutation, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "../convex/_generated/dataModel";

async function requireRole(
  ctx: MutationCtx,
  userId: string | undefined,
  allowedRoles: string[]
) {
  if (!userId) throw new Error("Authentification requise");
  const user = await ctx.db.get(userId as Id<"users">);
  if (!user || !allowedRoles.includes(user.role)) {
    throw new Error("Accès refusé : rôle insuffisant");
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
    const db: any = ctx.db;
    const { ecoleId, anneeId } = args;

    let classesQuery: any = db.query("classes");
    if (ecoleId) {
      classesQuery = classesQuery.withIndex("by_ecoleId", (q: any) =>
        q.eq("ecoleId", ecoleId)
      );
    }

    let classes = await classesQuery.collect();

    if (anneeId) {
      classes = classes.filter((c: any) => c.anneeId === anneeId);
    }

    return (classes as any[]).sort((a, b) =>
      a.nom.localeCompare(b.nom, undefined, { numeric: true, sensitivity: "base" })
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
    await requireRole(ctx, args.userId, ["admin", "directeur"]);

    const db: any = ctx.db;
    const nom = args.nom.trim();
    if (!nom) throw new Error("Le nom de la classe est requis.");

    const existingClasses: any[] = await db
      .query("classes")
      .withIndex("by_ecoleId", (q: any) => q.eq("ecoleId", args.ecoleId))
      .collect();

    const doublon = existingClasses.some(
      (c: any) =>
        c.nom === nom &&
        (args.anneeId ? c.anneeId === args.anneeId : !c.anneeId)
    );
    if (doublon) throw new Error("Cette classe existe déjà pour cette année.");

    await db.insert("classes", {
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
    await requireRole(ctx, args.userId, ["admin", "directeur"]);

    const db: any = ctx.db;
    const classe: any = await db.get(args.id);
    if (!classe) return;

    let inscriptions: any[] = [];

    if (classe.anneeId) {
      inscriptions = await db
        .query("inscriptions")
        .withIndex("by_ecole_annee", (q: any) =>
          q.eq("ecoleId", classe.ecoleId).eq("anneeId", classe.anneeId)
        )
        .collect();
    } else {
      const all: any[] = await db.query("inscriptions").collect();
      inscriptions = all.filter((i: any) => i.ecoleId === classe.ecoleId);
    }

    const inscriptionsDansClasse = inscriptions.filter(
      (i: any) => i.classe === classe.nom
    );

    if (inscriptionsDansClasse.length > 0) {
      throw new Error("Des élèves sont encore inscrits dans cette classe.");
    }

    await db.delete(args.id);
  },
});

// Mutation corrigée : assigne ou retire un élève d'une classe
export const updateEleveClasse = mutation({
  args: {
    eleveId: v.id("eleves"),
    newClasseNom: v.string(), // chaîne vide pour retirer
    anneeId: v.id("anneesScolaires"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.userId, ["admin", "directeur"]);

    const db: any = ctx.db;
    const { eleveId, newClasseNom, anneeId } = args;

    const eleve = await db.get(eleveId);
    if (!eleve) throw new Error("Élève introuvable.");

    if (newClasseNom !== "") {
      const classe = await db
        .query("classes")
        .withIndex("by_ecoleId", (q: any) => q.eq("ecoleId", eleve.ecoleId))
        .filter((q: any) => q.eq(q.field("nom"), newClasseNom))
        .first();
      if (!classe) {
        throw new Error("La classe spécifiée n'existe pas.");
      }
      if (classe.anneeId && classe.anneeId !== anneeId) {
        throw new Error("La classe n'appartient pas à l'année scolaire sélectionnée.");
      }
    }

    const inscription = await db
      .query("inscriptions")
      .withIndex("by_eleve_annee", (q: any) =>
        q.eq("eleveId", eleveId).eq("anneeId", anneeId)
      )
      .first();

    if (!inscription) {
      throw new Error("Cet élève n'a pas d'inscription pour l'année sélectionnée.");
    }

    await db.patch(inscription._id, { classe: newClasseNom });
  },
});

export const rename = mutation({
  args: {
    id: v.id("classes"),
    nom: v.string(),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.userId, ["admin", "directeur"]);
    const trimmed = args.nom.trim();
    if (!trimmed) throw new Error("Le nom est requis.");
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
    await requireRole(ctx, args.userId, ["admin", "directeur"]);
    const db: any = ctx.db;
    const existingClasses: any[] = await db
      .query("classes")
      .withIndex("by_ecoleId", (q: any) => q.eq("ecoleId", args.ecoleId))
      .collect();
    const existingNames = new Set(existingClasses.map((c: any) => c.nom));
    let inserted = 0;
    const duplicates: string[] = [];

    for (const nom of args.noms) {
      const trimmed = nom.trim();
      if (!trimmed) continue;
      if (existingNames.has(trimmed)) {
        duplicates.push(trimmed);
        continue;
      }
      await db.insert("classes", {
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