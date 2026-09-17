import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

const MAX_REQUESTS_PER_WINDOW = 10;
const WINDOW_MS = 60_000; // 1 minute

// 🟢 FIX : bornes strictes pour éviter les bypass
const MIN_MAX_REQUESTS = 1;
const MAX_MAX_REQUESTS = 100;
const MIN_WINDOW_MS = 1_000; // 1 seconde
const MAX_WINDOW_MS = 60 * 60 * 1000; // 1 heure

// 🟢 FIX : nettoyage aléatoire pour éviter la croissance infinie
const CLEANUP_PROBABILITY = 0.01; // ~1% des appels déclenchent un cleanup
const CLEANUP_AGE_MS = 24 * 60 * 60 * 1000; // 24h

/**
 * 🔴 FIX CRITIQUE : `internalMutation` au lieu de `mutation`.
 *
 * Avant : n'importe quel client pouvait appeler
 *   checkRateLimit({ key: "login:admin" })
 * et **incrémenter** (ou réinitialiser) le compteur d'un autre utilisateur
 * → DoS trivial (bloquer un compte en 5 clics).
 *
 * Maintenant : appelable uniquement depuis un autre code backend
 * (via `ctx.runMutation(internal.rateLimit.checkRateLimit, ...)`).
 *
 * ⚠️ Il faut remplacer dans `users.ts` :
 *   api.rateLimit.checkRateLimit → internal.rateLimit.checkRateLimit
 * et ajouter :
 *   import { internal } from "./_generated/api";
 */
export const checkRateLimit = internalMutation({
  args: {
    key: v.string(),
    maxRequests: v.optional(v.number()),
    windowMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // 🟢 FIX : validation et bornage des paramètres
    const max = Math.max(
      MIN_MAX_REQUESTS,
      Math.min(args.maxRequests ?? MAX_REQUESTS_PER_WINDOW, MAX_MAX_REQUESTS)
    );
    const window = Math.max(
      MIN_WINDOW_MS,
      Math.min(args.windowMs ?? WINDOW_MS, MAX_WINDOW_MS)
    );
    const now = Date.now();

    // 🟢 FIX : nettoyage probabiliste (évite la croissance infinie)
    if (Math.random() < CLEANUP_PROBABILITY) {
      const oldEntries = await ctx.db
        .query("rateLimits")
        .filter((q) => q.lt(q.field("timestamp"), now - CLEANUP_AGE_MS))
        .take(50);
      for (const entry of oldEntries) {
        await ctx.db.delete(entry._id);
      }
    }

    // 🟡 FIX : `.first()` au lieu de `.unique()` (évite crash si doublon)
    const existing = await ctx.db
      .query("rateLimits")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    if (!existing) {
      // Première tentative
      await ctx.db.insert("rateLimits", {
        key: args.key,
        timestamp: now,
        count: 1,
      });
      return { allowed: true, count: 1, max };
    }

    // 🟢 FIX : fenêtre dépassée → reset
    if (now - existing.timestamp > window) {
      await ctx.db.patch(existing._id, {
        timestamp: now,
        count: 1,
      });
      return { allowed: true, count: 1, max };
    }

    // 🟡 NOTE : Convex sérialise les mutations sur un même document,
    // donc le patch ci-dessous ne peut pas être entrelacé avec un autre
    // patch sur le même `rateLimits._id`. La race condition est donc
    // neutralisée par la transaction Convex, à condition que la lecture
    // et l'écriture soient dans la même mutation (c'est le cas ici).
    const newCount = existing.count + 1;
    await ctx.db.patch(existing._id, { count: newCount });

    return {
      allowed: newCount <= max,
      count: newCount,
      max,
    };
  },
});

/**
 * 🟢 NOUVEAU : nettoyage manuel (à déclencher si besoin).
 * Réservé au backend.
 */
export const cleanupOldEntries = internalMutation({
  args: {
    ageMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const age = args.ageMs ?? CLEANUP_AGE_MS;
    const threshold = Date.now() - age;

    const oldEntries = await ctx.db
      .query("rateLimits")
      .filter((q) => q.lt(q.field("timestamp"), threshold))
      .take(500);

    for (const entry of oldEntries) {
      await ctx.db.delete(entry._id);
    }

    return { deleted: oldEntries.length };
  },
});