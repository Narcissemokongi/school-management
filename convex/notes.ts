import { query, mutation, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Vérifie les permissions pour les notes.
// - Superadmin principal : autorisé partout
// - Admin/directeur : autorisé dans son école
// - Enseignant : autorisé dans son école et sa classe (si classe fournie)
async function requireNotePermission(
  ctx: MutationCtx,
  userId: string | undefined,
  ecoleId: string,
  classe?: string
) {
  if (!userId) throw new Error("Authentification requise");
  const user = await ctx.db.get(userId as Id<"users">);
  if (!user) throw new Error("Utilisateur introuvable");

  const isSuperAdminPrincipal =
    (user.role === "admin" && !user.ecoleId) ||
    (user.role === "superAdmin" && (!user.permissions || user.permissions.length === 0));

  if (isSuperAdminPrincipal) return user;

  // Vérifier l'école
  const isEcoleAdmin =
    (user.role === "admin" || user.role === "directeur") &&
    user.ecoleId === ecoleId;
  const isEnseignant = user.role === "enseignant" && user.ecoleId === ecoleId;

  if (!isEcoleAdmin && !isEnseignant) {
    throw new Error("Accès refusé : vous n'êtes pas autorisé à gérer les notes de cette école.");
  }

  // Pour un enseignant, vérifier la classe si fournie
  if (isEnseignant && classe && user.classe !== classe) {
    throw new Error("Vous n'êtes pas assigné à cette classe.");
  }

  return user;
}

// ========== QUERIES ==========

export const listByEleve = query({
  args: {
    eleveId: v.id("eleves"),
    anneeId: v.optional(v.id("anneesScolaires")),
  },
  handler: async (ctx, args) => {
    if (args.anneeId) {
      return await ctx.db
        .query("notes")
        .withIndex("by_eleveId", (q) => q.eq("eleveId", args.eleveId))
        .filter((q) => q.eq(q.field("anneeId"), args.anneeId))
        .collect();
    }
    return await ctx.db
      .query("notes")
      .withIndex("by_eleveId", (q) => q.eq("eleveId", args.eleveId))
      .collect();
  },
});

export const listByEcole = query({
  args: {
    ecoleId: v.id("ecoles"),
    anneeId: v.optional(v.id("anneesScolaires")),
  },
  handler: async (ctx, args) => {
    if (args.anneeId) {
      return await ctx.db
        .query("notes")
        .withIndex("by_anneeId", (q) => q.eq("anneeId", args.anneeId))
        .filter((q) => q.eq(q.field("ecoleId"), args.ecoleId))
        .collect();
    }
    return await ctx.db
      .query("notes")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId))
      .collect();
  },
});

// Liste des notes d'une classe pour une année donnée (jointure avec les inscriptions)
export const listByClasse = query({
  args: {
    ecoleId: v.id("ecoles"),
    anneeId: v.id("anneesScolaires"),
    classe: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Récupérer les inscriptions de cette classe/année/école
    const inscriptions = await ctx.db
      .query("inscriptions")
      .withIndex("by_classe_annee", (q) =>
        q.eq("classe", args.classe).eq("anneeId", args.anneeId)
      )
      .filter((q) => q.eq(q.field("ecoleId"), args.ecoleId))
      .collect();

    if (inscriptions.length === 0) return [];

    const eleveIds = inscriptions.map((i) => i.eleveId);

    // 2. Récupérer les notes de ces élèves
    const notes = await ctx.db
      .query("notes")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId))
      .collect();

    // Filtrer en mémoire par liste d'IDs
    const eleveIdSet = new Set(eleveIds);
    return notes.filter((n) => eleveIdSet.has(n.eleveId));
  },
});

// ========== MUTATIONS ==========

export const upsert = mutation({
  args: {
    eleveId: v.id("eleves"),
    ecoleId: v.id("ecoles"),
    matiere: v.string(),
    note: v.float64(),
    coefficient: v.float64(),
    periode: v.string(),
    appreciation: v.optional(v.string()),
    anneeId: v.id("anneesScolaires"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // Récupérer l'élève pour obtenir sa classe
    const eleve = await ctx.db.get(args.eleveId);
    if (!eleve) throw new Error("Élève introuvable");

    // Vérifier l'école et la classe (pour enseignant)
    await requireNotePermission(ctx, args.userId, args.ecoleId, eleve.classe);

    const { userId, ...rest } = args;
    const existing = await ctx.db
      .query("notes")
      .withIndex("by_eleveId", (q) => q.eq("eleveId", rest.eleveId))
      .filter((q) =>
        q.and(
          q.eq(q.field("matiere"), rest.matiere),
          q.eq(q.field("periode"), rest.periode),
          q.eq(q.field("anneeId"), rest.anneeId)
        )
      )
      .unique();

    let docId: string;
    let action: string;
    if (existing) {
      await ctx.db.patch(existing._id, {
        note: rest.note,
        coefficient: rest.coefficient,
        appreciation: rest.appreciation,
      });
      docId = existing._id;
      action = "update";
    } else {
      docId = await ctx.db.insert("notes", rest);
      action = "create";
    }

    if (userId) {
      await ctx.db.insert("audit", {
        userId,
        action,
        table: "notes",
        documentId: docId,
        details: `Note ${rest.matiere} - ${rest.periode} pour élève ${rest.eleveId}`,
        date: new Date().toISOString(),
        ecoleId: rest.ecoleId,
      });
    }
    return docId;
  },
});

export const upsertBulk = mutation({
  args: {
    eleveIds: v.array(v.id("eleves")),
    ecoleId: v.id("ecoles"),
    matiere: v.string(),
    note: v.float64(),
    coefficient: v.float64(),
    periode: v.string(),
    appreciation: v.optional(v.string()),
    anneeId: v.id("anneesScolaires"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // Pour le bulk, on vérifie le rôle et l'école, mais pas la classe pour chaque élève.
    // On récupère la classe d'un élève pour la vérification enseignant (optionnel).
    const firstEleve = await ctx.db.get(args.eleveIds[0]);
    const classe = firstEleve?.classe;
    await requireNotePermission(ctx, args.userId, args.ecoleId, classe);

    const { userId, eleveIds, ...rest } = args;
    let firstId: string | null = null;
    for (const eleveId of eleveIds) {
      const existing = await ctx.db
        .query("notes")
        .withIndex("by_eleveId", (q) => q.eq("eleveId", eleveId))
        .filter((q) =>
          q.and(
            q.eq(q.field("matiere"), rest.matiere),
            q.eq(q.field("periode"), rest.periode),
            q.eq(q.field("anneeId"), rest.anneeId)
          )
        )
        .unique();
      if (existing) {
        await ctx.db.patch(existing._id, {
          note: rest.note,
          coefficient: rest.coefficient,
          appreciation: rest.appreciation,
        });
        if (!firstId) firstId = existing._id;
      } else {
        const newId = await ctx.db.insert("notes", { eleveId, ...rest });
        if (!firstId) firstId = newId;
      }
    }

    if (userId && firstId) {
      await ctx.db.insert("audit", {
        userId,
        action: "create",
        table: "notes",
        documentId: firstId,
        details: `Notes groupées : ${rest.matiere} - ${rest.periode} pour ${eleveIds.length} élève(s)`,
        date: new Date().toISOString(),
        ecoleId: rest.ecoleId,
      });
    }
    return eleveIds.length;
  },
});

export const remove = mutation({
  args: {
    id: v.id("notes"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.id);
    if (!doc) throw new Error("Note introuvable");

    const eleve = await ctx.db.get(doc.eleveId);
    await requireNotePermission(ctx, args.userId, doc.ecoleId, eleve?.classe);

    await ctx.db.delete(args.id);

    if (args.userId) {
      await ctx.db.insert("audit", {
        userId: args.userId,
        action: "delete",
        table: "notes",
        documentId: args.id,
        details: `Suppression note ${doc.matiere} - ${doc.periode}`,
        date: new Date().toISOString(),
        ecoleId: doc.ecoleId,
      });
    }
  },
});