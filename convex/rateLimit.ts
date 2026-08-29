import { mutation } from "./_generated/server";
import { v } from "convex/values";

const MAX_REQUESTS_PER_WINDOW = 10;
const WINDOW_MS = 60_000; // 1 minute

export const checkRateLimit = mutation({
  args: {
    key: v.string(),
    maxRequests: v.optional(v.number()),
    windowMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const max = args.maxRequests ?? MAX_REQUESTS_PER_WINDOW;
    const window = args.windowMs ?? WINDOW_MS;
    const now = Date.now();

    // Récupérer ou créer l'entrée
    const existing = await ctx.db
      .query("rateLimits")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();

    if (!existing) {
      // Première tentative
      await ctx.db.insert("rateLimits", {
        key: args.key,
        timestamp: now,
        count: 1,
      });
      return { allowed: true };
    }

    // Vérifier si la fenêtre est dépassée
    if (now - existing.timestamp > window) {
      // Nouvelle fenêtre
      await ctx.db.patch(existing._id, {
        timestamp: now,
        count: 1,
      });
      return { allowed: true };
    }

    // Incrémenter et vérifier
    const newCount = existing.count + 1;
    await ctx.db.patch(existing._id, { count: newCount });
    return { allowed: newCount <= max };
  },
});