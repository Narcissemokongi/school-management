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

export const getByClasse = query({
  args: {
    classe: v.string(),
    ecoleId: v.id("ecoles"),
    anneeId: v.optional(v.id("anneesScolaires")),
  },
  handler: async (ctx, args) => {
    if (args.anneeId) {
      return await ctx.db
        .query("emploiDuTemps")
        .withIndex("by_classe", (q) => q.eq("classe", args.classe).eq("ecoleId", args.ecoleId))
        .filter((q) => q.eq(q.field("anneeId"), args.anneeId!))
        .collect();
    }
    return await ctx.db
      .query("emploiDuTemps")
      .withIndex("by_classe", (q) => q.eq("classe", args.classe).eq("ecoleId", args.ecoleId))
      .collect();
  },
});

export const upsert = mutation({
  args: {
    classe: v.string(),
    ecoleId: v.id("ecoles"),
    semaine: v.string(),
    contenu: v.string(),
    anneeId: v.id("anneesScolaires"),
    userId: v.optional(v.id("users")), // celui qui fait l'action
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.userId, ["admin", "directeur"]);

    const { userId, ...rest } = args;
    const existing = await ctx.db
      .query("emploiDuTemps")
      .withIndex("by_classe", (q) => q.eq("classe", rest.classe).eq("ecoleId", rest.ecoleId))
      .filter((q) =>
        q.and(
          q.eq(q.field("semaine"), rest.semaine),
          q.eq(q.field("anneeId"), rest.anneeId)
        )
      )
      .unique();
    let docId: string;
    let action: string;
    if (existing) {
      await ctx.db.patch(existing._id, { contenu: rest.contenu });
      docId = existing._id;
      action = "update";
    } else {
      docId = await ctx.db.insert("emploiDuTemps", rest);
      action = "create";
    }
    if (userId) {
      await ctx.db.insert("audit", {
        userId,
        action,
        table: "emploiDuTemps",
        documentId: docId,
        details: `Emploi du temps ${rest.classe} - semaine ${rest.semaine}`,
        date: new Date().toISOString(),
        ecoleId: rest.ecoleId,
      });
    }
    return docId;
  },
});

export const remove = mutation({
  args: {
    id: v.id("emploiDuTemps"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.userId, ["admin", "directeur"]);

    const doc = await ctx.db.get(args.id);
    await ctx.db.delete(args.id);
    if (args.userId && doc) {
      await ctx.db.insert("audit", {
        userId: args.userId,
        action: "delete",
        table: "emploiDuTemps",
        documentId: args.id,
        details: `Suppression EDT ${doc.classe} - semaine ${doc.semaine}`,
        date: new Date().toISOString(),
        ecoleId: doc.ecoleId,
      });
    }
  },
});