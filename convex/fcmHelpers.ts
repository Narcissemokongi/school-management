// convex/fcmHelpers.ts
import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

/**
 * Récupère les utilisateurs ayant un fcmToken, filtrés par scope.
 */
export const getUsersWithTokens = internalQuery({
  args: {
    scope: v.union(
      v.literal("all"),
      v.literal("ecole"),
      v.literal("role")
    ),
    ecoleId: v.optional(v.id("ecoles")),
    role: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let users;

    if (args.scope === "ecole" && args.ecoleId) {
      users = await ctx.db
        .query("users")
        .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId!))
        .take(2000);
    } else if (args.scope === "role" && args.role) {
      users = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("role"), args.role!))
        .take(2000);
    } else {
      users = await ctx.db.query("users").take(5000);
    }

    return users
      .filter((u) => u.isActive !== false && u.fcmToken)
      .map((u) => ({ fcmToken: u.fcmToken }));
  },
});