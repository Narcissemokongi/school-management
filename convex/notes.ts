import { query, mutation, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "../convex/_generated/dataModel";

// Utilitaire de vérification de rôle
async function requireRole(
  ctx: MutationCtx,
  userId: string | undefined,
  allowedRoles: string[],
  classe?: string
) {
  if (!userId) throw new Error("Authentification requise");
  const user = await ctx.db.get(userId as Id<"users">);
  if (!user || !allowedRoles.includes(user.role)) {
    throw new Error("Accès refusé : rôle insuffisant");
  }
  if (classe && user.role === "enseignant" && user.classe !== classe) {
    throw new Error("Vous n'êtes pas assigné à cette classe");
  }
  return user;
}

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
        .filter((q) => q.eq(q.field("anneeId"), args.anneeId!))
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
        .withIndex("by_anneeId", (q) => q.eq("anneeId", args.anneeId!))
        .filter((q) => q.eq(q.field("ecoleId"), args.ecoleId))
        .collect();
    }
    return await ctx.db
      .query("notes")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId))
      .collect();
  },
});

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
    userId: v.optional(v.id("users")), // celui qui fait l'action
  },
  handler: async (ctx, args) => {
    // Pour vérifier la classe, il faut récupérer l'élève
    const eleve = await ctx.db.get(args.eleveId);
    const classe = eleve?.classe; // peut être undefined si l'élève n'existe pas, mais normalement il existe
    await requireRole(ctx, args.userId, ["admin", "enseignant"], classe);

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
    // Pour le bulk, on peut vérifier le rôle global sans vérifier chaque classe individuellement
    await requireRole(ctx, args.userId, ["admin", "enseignant"]);

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
    // Récupérer la note pour obtenir l'élève et sa classe
    const doc = await ctx.db.get(args.id);
    if (!doc) throw new Error("Note introuvable");
    const eleve = await ctx.db.get(doc.eleveId);
    await requireRole(ctx, args.userId, ["admin", "enseignant"], eleve?.classe);

    await ctx.db.delete(args.id);
    if (args.userId && doc) {
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

export const listByClasse = query({
  args: { ecoleId: v.id("ecoles"), anneeId: v.id("anneesScolaires"), classe: v.string() },
  handler: async (ctx, args) => {
    const eleves = await ctx.db
      .query("eleves")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId))
      .filter((q) => q.and(q.eq(q.field("anneeId"), args.anneeId), q.eq(q.field("classe"), args.classe)))
      .collect();
    const eleveIds = eleves.map(e => e._id);
    if (eleveIds.length === 0) return [];
    return await ctx.db
      .query("notes")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId))
      .filter((q) => q.or(...eleveIds.map(id => q.eq(q.field("eleveId"), id))))
      .collect();
  },
});