import { query, mutation, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "../convex/_generated/dataModel";   // ← import depuis dataModel

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

export const list = query({
  args: {
    ecoleId: v.id("ecoles"),
    classe: v.optional(v.string()),
    anneeId: v.optional(v.id("anneesScolaires")),
  },
  handler: async (ctx, args) => {
    if (args.anneeId) {
      let q = ctx.db
        .query("cours")
        .withIndex("by_anneeId", (q) => q.eq("anneeId", args.anneeId!))
        .filter((q) => q.eq(q.field("ecoleId"), args.ecoleId));
      if (args.classe) {
        q = q.filter((q) => q.eq(q.field("classe"), args.classe!));
      }
      return await q.collect();
    }
    let q = ctx.db
      .query("cours")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId));
    if (args.classe) {
      q = q.filter((q) => q.eq(q.field("classe"), args.classe!));
    }
    return await q.collect();
  },
});

export const add = mutation({
  args: {
    nom: v.string(),
    classe: v.string(),
    coefficient: v.optional(v.float64()),
    bareme: v.optional(v.float64()),   // ← nouveau
    ecoleId: v.id("ecoles"),
    anneeId: v.optional(v.id("anneesScolaires")),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // Vérification d'unicité etc.
    await ctx.db.insert("cours", {
      nom: args.nom,
      classe: args.classe,
      coefficient: args.coefficient ?? 1,
      bareme: args.bareme ?? 20,    // valeur par défaut
      ecoleId: args.ecoleId,
      anneeId: args.anneeId,
    });
  },
});

export const addBulk = mutation({
  args: {
    nom: v.string(),
    coefficient: v.optional(v.float64()),
    bareme: v.optional(v.float64()),   // ← nouveau
    classes: v.array(v.string()),
    ecoleId: v.id("ecoles"),
    anneeId: v.optional(v.id("anneesScolaires")),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    for (const classe of args.classes) {
      await ctx.db.insert("cours", {
        nom: args.nom,
        classe,
        coefficient: args.coefficient ?? 1,
        bareme: args.bareme ?? 20,
        ecoleId: args.ecoleId,
        anneeId: args.anneeId,
      });
    }
  },
});
export const remove = mutation({
  args: {
    id: v.id("cours"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.userId, ["admin", "enseignant"]);
    const doc = await ctx.db.get(args.id);
    await ctx.db.delete(args.id);
    if (args.userId && doc) {
      await ctx.db.insert("audit", {
        userId: args.userId,
        action: "delete",
        table: "cours",
        documentId: args.id,
        details: `Suppression du cours ${doc.nom} (classe ${doc.classe})`,
        date: new Date().toISOString(),
        ecoleId: doc.ecoleId,
      });
    }
  },
});