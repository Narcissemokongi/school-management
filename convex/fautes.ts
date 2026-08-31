import { query, mutation, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Vérifie que l'utilisateur est admin de l'école concernée ou superadmin principal
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

  const isEcoleAdmin = user.role === "admin" && user.ecoleId === ecoleId;

  if (!isSuperAdminPrincipal && !isEcoleAdmin) {
    throw new Error("Accès refusé : vous n'êtes pas autorisé à gérer les fautes de cette école.");
  }
  return user;
}

// ========== QUERY ==========
export const list = query({
  args: { ecoleId: v.optional(v.id("ecoles")) },
  handler: async (ctx, args) => {
    const ecoleId = args.ecoleId; // Stocker dans une constante locale pour éviter les problèmes de type
    if (ecoleId) {
      return await ctx.db
        .query("fautes")
        .withIndex("by_ecoleId", (q) => q.eq("ecoleId", ecoleId))
        .collect();
    } else {
      return await ctx.db.query("fautes").collect();
    }
  },
});

// ========== MUTATIONS ==========

// Ajouter une faute
export const add = mutation({
  args: {
    libelle: v.string(),
    gravite: v.union(v.literal("Légère"), v.literal("Moyenne"), v.literal("Grave")),
    ecoleId: v.id("ecoles"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    await requireEcoleAdmin(ctx, args.userId, args.ecoleId);

    const { userId, ...rest } = args;
    await ctx.db.insert("fautes", rest);
  },
});

// Modifier une faute
export const update = mutation({
  args: {
    id: v.id("fautes"),
    libelle: v.string(),
    gravite: v.union(v.literal("Légère"), v.literal("Moyenne"), v.literal("Grave")),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const faute = await ctx.db.get(args.id);
    if (!faute) throw new Error("Faute introuvable");

    await requireEcoleAdmin(ctx, args.userId, faute.ecoleId);

    const { id, userId, ...fields } = args;
    await ctx.db.patch(id, fields);
  },
});

// Supprimer une faute
export const remove = mutation({
  args: {
    id: v.id("fautes"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const faute = await ctx.db.get(args.id);
    if (!faute) throw new Error("Faute introuvable");

    await requireEcoleAdmin(ctx, args.userId, faute.ecoleId);

    await ctx.db.delete(args.id);
  },
});