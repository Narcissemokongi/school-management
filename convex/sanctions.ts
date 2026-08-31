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
    throw new Error("Accès refusé : vous n'êtes pas autorisé à gérer les sanctions de cette école.");
  }
  return user;
}

// ========== QUERY ==========
export const list = query({
  args: { ecoleId: v.id("ecoles") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("sanctions")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId))
      .collect();
  },
});

// ========== MUTATIONS ==========

// Ajouter une sanction
export const add = mutation({
  args: {
    libelle: v.string(),
    ecoleId: v.id("ecoles"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    await requireEcoleAdmin(ctx, args.userId, args.ecoleId);

    await ctx.db.insert("sanctions", {
      libelle: args.libelle,
      ecoleId: args.ecoleId,
    });
  },
});

// Modifier une sanction
export const update = mutation({
  args: {
    id: v.id("sanctions"),
    libelle: v.string(),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // Récupérer la sanction pour connaître son école
    const sanction = await ctx.db.get(args.id);
    if (!sanction) throw new Error("Sanction introuvable");

    await requireEcoleAdmin(ctx, args.userId, sanction.ecoleId);

    await ctx.db.patch(args.id, { libelle: args.libelle });
  },
});

// Supprimer une sanction
export const remove = mutation({
  args: {
    id: v.id("sanctions"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // Récupérer la sanction pour connaître son école
    const sanction = await ctx.db.get(args.id);
    if (!sanction) throw new Error("Sanction introuvable");

    await requireEcoleAdmin(ctx, args.userId, sanction.ecoleId);

    await ctx.db.delete(args.id);
  },
});