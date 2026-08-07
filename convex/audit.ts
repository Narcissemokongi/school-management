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
    await requireRole(ctx, args.userId, ["admin"]); // seul un admin peut forcer une entrée d'audit
    await ctx.db.insert("audit", {
      ...args,
      date: new Date().toISOString(),
    });
  },
});

export const list = query({
  args: {
    ecoleId: v.optional(v.id("ecoles")),
    userId: v.optional(v.id("users")), // celui qui demande à voir l'audit
  },
  handler: async (ctx, args) => {
    // Vérifier que l'utilisateur a le droit de consulter l'audit
    if (args.userId) {
      const user = await ctx.db.get(args.userId as Id<"users">);
      if (!user || !["admin", "directeur", "disciplinaire"].includes(user.role)) {
        throw new Error("Accès refusé : rôle insuffisant pour consulter l'audit");
      }
    } else {
      // Si pas d'userId, on refuse (sauf superadmin ? à adapter)
      throw new Error("Authentification requise pour consulter l'audit");
    }

    if (args.ecoleId) {
      return await ctx.db
        .query("audit")
        .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId))
        .collect();
    }
    return await ctx.db.query("audit").collect();
  },
});