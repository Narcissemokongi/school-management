import { query, mutation, MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Vérifie les droits d'accès à l'audit.
// Retourne l'utilisateur si autorisé.
async function requireAuditAccess(
  ctx: QueryCtx | MutationCtx,
  userId: string | undefined,
  ecoleId?: string
) {
  if (!userId) throw new Error("Authentification requise");
  const user = await ctx.db.get(userId as Id<"users">);
  if (!user) throw new Error("Utilisateur introuvable");

  const isSuperAdminPrincipal =
    (user.role === "admin" && !user.ecoleId) ||
    (user.role === "superAdmin" && (!user.permissions || user.permissions.length === 0));

  if (isSuperAdminPrincipal) return user;

  const allowedRoles = ["admin", "directeur", "disciplinaire"];
  if (!allowedRoles.includes(user.role)) {
    throw new Error("Accès refusé : rôle insuffisant pour consulter l'audit");
  }

  if (ecoleId && user.ecoleId !== ecoleId) {
    throw new Error("Vous n'êtes pas autorisé à consulter l'audit de cette école.");
  }

  return user;
}

// ========== MUTATIONS ==========

export const addEntry = mutation({
  args: {
    userId: v.id("users"),
    action: v.string(),
    table: v.string(),
    documentId: v.string(),
    details: v.optional(v.string()),
    ecoleId: v.optional(v.id("ecoles")),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("Utilisateur introuvable");

    const isSuperAdminPrincipal =
      (user.role === "admin" && !user.ecoleId) ||
      (user.role === "superAdmin" && (!user.permissions || user.permissions.length === 0));

    if (!isSuperAdminPrincipal && user.role !== "admin") {
      throw new Error("Accès refusé : seul un admin peut forcer une entrée d'audit");
    }

    await ctx.db.insert("audit", {
      userId: args.userId,
      action: args.action,
      table: args.table,
      documentId: args.documentId,
      details: args.details,
      ecoleId: args.ecoleId,
      date: new Date().toISOString(),
    });
  },
});

// ========== QUERIES ==========

export const list = query({
  args: {
    ecoleId: v.optional(v.id("ecoles")),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    if (!args.userId) {
      throw new Error("Authentification requise pour consulter l'audit");
    }

    const user = await ctx.db.get(args.userId as Id<"users">);
    if (!user) throw new Error("Utilisateur introuvable");

    const isSuperAdminPrincipal =
      (user.role === "admin" && !user.ecoleId) ||
      (user.role === "superAdmin" && (!user.permissions || user.permissions.length === 0));

    if (isSuperAdminPrincipal) {
      if (args.ecoleId) {
        return await ctx.db
          .query("audit")
          .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId))
          .collect();
      }
      return await ctx.db.query("audit").collect();
    }

    if (!["admin", "directeur", "disciplinaire"].includes(user.role)) {
      throw new Error("Accès refusé : rôle insuffisant pour consulter l'audit");
    }

    return await ctx.db
      .query("audit")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", user.ecoleId!))
      .collect();
  },
});