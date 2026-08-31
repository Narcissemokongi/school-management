import { mutation, query, MutationCtx } from "./_generated/server";
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
    throw new Error("Accès refusé : vous n'êtes pas autorisé à gérer les examens de cette école.");
  }
  return user;
}

// ========== QUERIES ==========

export const listByClasse = query({
  args: {
    ecoleId: v.id("ecoles"),
    anneeId: v.id("anneesScolaires"),
    classe: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("examens")
      .withIndex("by_classe", (q) =>
        q.eq("classe", args.classe).eq("ecoleId", args.ecoleId)
      )
      .filter((q) => q.eq(q.field("anneeId"), args.anneeId))
      .collect();
  },
});

export const listByEcole = query({
  args: {
    ecoleId: v.id("ecoles"),
    anneeId: v.id("anneesScolaires"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("examens")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId))
      .filter((q) => q.eq(q.field("anneeId"), args.anneeId))
      .collect();
  },
});

// ========== MUTATIONS ==========

export const add = mutation({
  args: {
    classe: v.string(),
    matiere: v.string(),
    date: v.string(),
    heure: v.optional(v.string()),
    salle: v.optional(v.string()),
    duree: v.optional(v.string()),
    ecoleId: v.id("ecoles"),
    anneeId: v.id("anneesScolaires"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    await requireEcoleAdmin(ctx, args.userId, args.ecoleId);

    // Ne pas insérer userId, c'est un champ d'audit
    const { userId, ...rest } = args;
    await ctx.db.insert("examens", rest);
    return { success: true };
  },
});

export const update = mutation({
  args: {
    examenId: v.id("examens"),
    classe: v.optional(v.string()),
    matiere: v.optional(v.string()),
    date: v.optional(v.string()),
    heure: v.optional(v.string()),
    salle: v.optional(v.string()),
    duree: v.optional(v.string()),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const examen = await ctx.db.get(args.examenId);
    if (!examen) throw new Error("Examen introuvable");

    await requireEcoleAdmin(ctx, args.userId, examen.ecoleId);

    const { examenId, userId, ...fields } = args;
    await ctx.db.patch(examenId, fields);
    return { success: true };
  },
});

export const remove = mutation({
  args: {
    examenId: v.id("examens"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const examen = await ctx.db.get(args.examenId);
    if (!examen) throw new Error("Examen introuvable");

    await requireEcoleAdmin(ctx, args.userId, examen.ecoleId);

    await ctx.db.delete(args.examenId);
    return { success: true };
  },
});