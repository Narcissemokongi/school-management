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

// --- Frais de classe ---
export const listFraisClasses = query({
  args: { ecoleId: v.id("ecoles"), anneeId: v.optional(v.id("anneesScolaires")) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("fraisClasses")
      .withIndex("by_ecole_classe", (q) => q.eq("ecoleId", args.ecoleId))
      .filter((q) => (args.anneeId ? q.eq(q.field("anneeId"), args.anneeId) : true))
      .collect();
  },
});

// ========== MUTATIONS ==========

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
    await requireRole(ctx, args.userId, ["admin", "comptable"]);

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
    await requireRole(ctx, args.userId, ["admin", "comptable"]);

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

export const remove = mutation({
  args: { id: v.id("frais"), userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.userId, ["admin", "comptable"]);

    const doc = await ctx.db.get(args.id);
    await ctx.db.delete(args.id);
    if (args.userId && doc) {
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

// --- Mutation pour les frais de classe ---
export const upsertFraisClasse = mutation({
  args: {
    classe: v.string(),
    montantTotal: v.float64(),
    ecoleId: v.id("ecoles"),
    anneeId: v.optional(v.id("anneesScolaires")),
  },
  handler: async (ctx, args) => {
    // Pas de requireRole ici si l'appel se fait depuis un contexte authentifié, mais vous pouvez ajouter
    // await requireRole(ctx, args.userId, ["admin", "comptable"]); // si vous passez userId
    const existing = await ctx.db
      .query("fraisClasses")
      .withIndex("by_ecole_classe", (q) => q.eq("ecoleId", args.ecoleId).eq("classe", args.classe))
      .filter((q) => (args.anneeId ? q.eq(q.field("anneeId"), args.anneeId) : true))
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