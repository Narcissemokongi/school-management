import { query, mutation, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Vérifie que l'utilisateur est admin/comptable de l'école ou superadmin principal
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

  const isEcoleFinance =
    (user.role === "admin" || user.role === "comptable") &&
    user.ecoleId === ecoleId;

  if (!isSuperAdminPrincipal && !isEcoleFinance) {
    throw new Error("Accès refusé : vous n'êtes pas autorisé à gérer les frais de cette école.");
  }
  return user;
}

// ========== QUERIES ==========

// Frais d'un élève
export const listByEleve = query({
  args: { eleveId: v.id("eleves"), anneeId: v.optional(v.id("anneesScolaires")) },
  handler: async (ctx, args) => {
    if (args.anneeId) {
      return await ctx.db
        .query("frais")
        .withIndex("by_eleveId", (q) => q.eq("eleveId", args.eleveId))
        .filter((q) => q.eq(q.field("anneeId"), args.anneeId!))
        .collect();
    }
    return await ctx.db
      .query("frais")
      .withIndex("by_eleveId", (q) => q.eq("eleveId", args.eleveId))
      .collect();
  },
});

// Frais de toute une école (éventuellement filtrés par année)
export const listByEcole = query({
  args: { ecoleId: v.id("ecoles"), anneeId: v.optional(v.id("anneesScolaires")) },
  handler: async (ctx, args) => {
    if (args.anneeId) {
      return await ctx.db
        .query("frais")
        .withIndex("by_anneeId", (q) => q.eq("anneeId", args.anneeId!))
        .filter((q) => q.eq(q.field("ecoleId"), args.ecoleId))
        .collect();
    }
    return await ctx.db
      .query("frais")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId))
      .collect();
  },
});

// Frais de classe pour une école (avec année optionnelle)
export const listFraisClasses = query({
  args: { ecoleId: v.id("ecoles"), anneeId: v.optional(v.id("anneesScolaires")) },
  handler: async (ctx, args) => {
    let q = ctx.db
      .query("fraisClasses")
      .withIndex("by_ecole_classe", (q) => q.eq("ecoleId", args.ecoleId));

    const all = await q.collect();

    if (args.anneeId) {
      return all.filter((f) => f.anneeId === args.anneeId);
    }
    return all;
  },
});

// ========== MUTATIONS ==========

// Ajouter ou mettre à jour les frais d'un élève
export const upsert = mutation({
  args: {
    eleveId: v.id("eleves"),
    ecoleId: v.id("ecoles"),
    montantTotal: v.float64(),
    montantPaye: v.float64(),
    commentaire: v.optional(v.string()),
    anneeId: v.id("anneesScolaires"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    await requireEcoleAdmin(ctx, args.userId, args.ecoleId);

    const { userId, ...rest } = args;
    const existing = await ctx.db
      .query("frais")
      .withIndex("by_eleveId", (q) => q.eq("eleveId", rest.eleveId))
      .filter((q) => q.eq(q.field("anneeId"), rest.anneeId))
      .unique();

    let docId: string;
    let action: string;
    if (existing) {
      await ctx.db.patch(existing._id, {
        montantTotal: rest.montantTotal,
        montantPaye: rest.montantPaye,
        commentaire: rest.commentaire,
      });
      docId = existing._id;
      action = "update";
    } else {
      docId = await ctx.db.insert("frais", rest);
      action = "create";
    }

    if (userId) {
      await ctx.db.insert("audit", {
        userId,
        action,
        table: "frais",
        documentId: docId,
        details: `Frais pour élève ${rest.eleveId}`,
        date: new Date().toISOString(),
        ecoleId: rest.ecoleId,
      });
    }
    return docId;
  },
});

// Ajouter ou mettre à jour les frais pour plusieurs élèves à la fois
export const upsertBulk = mutation({
  args: {
    eleveIds: v.array(v.id("eleves")),
    ecoleId: v.id("ecoles"),
    montantTotal: v.float64(),
    montantPaye: v.float64(),
    commentaire: v.optional(v.string()),
    anneeId: v.id("anneesScolaires"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    await requireEcoleAdmin(ctx, args.userId, args.ecoleId);

    const { userId, eleveIds, ...rest } = args;
    let firstId: string | null = null;

    for (const eleveId of eleveIds) {
      const existing = await ctx.db
        .query("frais")
        .withIndex("by_eleveId", (q) => q.eq("eleveId", eleveId))
        .filter((q) => q.eq(q.field("anneeId"), rest.anneeId))
        .unique();

      if (existing) {
        await ctx.db.patch(existing._id, {
          montantTotal: rest.montantTotal,
          montantPaye: rest.montantPaye,
          commentaire: rest.commentaire,
        });
        if (!firstId) firstId = existing._id;
      } else {
        const newId = await ctx.db.insert("frais", { eleveId, ...rest });
        if (!firstId) firstId = newId;
      }
    }

    if (userId && firstId) {
      await ctx.db.insert("audit", {
        userId,
        action: "create",
        table: "frais",
        documentId: firstId,
        details: `Frais groupés pour ${eleveIds.length} élève(s)`,
        date: new Date().toISOString(),
        ecoleId: rest.ecoleId,
      });
    }
    return eleveIds.length;
  },
});

// Supprimer un frais
export const remove = mutation({
  args: { id: v.id("frais"), userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.id);
    if (!doc) throw new Error("Frais introuvable");

    await requireEcoleAdmin(ctx, args.userId, doc.ecoleId);

    await ctx.db.delete(args.id);

    if (args.userId) {
      await ctx.db.insert("audit", {
        userId: args.userId,
        action: "delete",
        table: "frais",
        documentId: args.id,
        details: `Suppression frais élève ${doc.eleveId}`,
        date: new Date().toISOString(),
        ecoleId: doc.ecoleId,
      });
    }
  },
});

// Ajouter ou mettre à jour les frais d'une classe
export const upsertFraisClasse = mutation({
  args: {
    classe: v.string(),
    montantTotal: v.float64(),
    ecoleId: v.id("ecoles"),
    anneeId: v.optional(v.id("anneesScolaires")),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    await requireEcoleAdmin(ctx, args.userId, args.ecoleId);

    const existing = await ctx.db
      .query("fraisClasses")
      .withIndex("by_ecole_classe", (q) => q.eq("ecoleId", args.ecoleId).eq("classe", args.classe))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { montantTotal: args.montantTotal });
    } else {
      await ctx.db.insert("fraisClasses", {
        classe: args.classe,
        montantTotal: args.montantTotal,
        ecoleId: args.ecoleId,
        anneeId: args.anneeId,
      });
    }
  },
});