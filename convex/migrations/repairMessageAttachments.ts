// convex/migrations/repairMessageAttachments.ts
//
// Migration one-shot pour réparer / nettoyer les pièces jointes cassées.

import { v } from "convex/values";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "../_generated/server";
import { internal } from "../_generated/api";

// ════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════

function isBrokenUrl(url: unknown): boolean {
  if (!url) return true;
  if (typeof url !== "string") return true;
  if (url.trim() === "") return true;
  if (url.includes("/api/storage/upload")) return true;
  if (!url.startsWith("http://") && !url.startsWith("https://")) return true;
  return false;
}

// ════════════════════════════════════════════════════════════════════
// 1. DIAGNOSTIC
// ════════════════════════════════════════════════════════════════════
export const diagnostic = internalQuery({
  args: {
    scanLimit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.scanLimit ?? 5000;
    const messages = await ctx.db.query("messages").take(limit);

    let messagesWithPj = 0;
    let totalPj = 0;
    let broken = 0;
    let repairable = 0;
    let unrecoverable = 0;
    const samples: Array<{
      msgId: string;
      nom: string;
      url: string;
      storageId: string | null;
    }> = [];

    for (const m of messages) {
      const pjs = m.piecesJointes ?? [];
      if (pjs.length === 0) continue;
      messagesWithPj++;

      for (const pj of pjs) {
        totalPj++;
        if (isBrokenUrl(pj.url)) {
          broken++;
          if (pj.storageId) {
            repairable++;
          } else {
            unrecoverable++;
          }
          if (samples.length < 10) {
            samples.push({
              msgId: m._id,
              nom: pj.nom ?? "(sans nom)",
              url: pj.url ?? "(vide)",
              storageId: pj.storageId ?? null,
            });
          }
        }
      }
    }

    return {
      scanned: messages.length,
      scanLimit: limit,
      reachedLimit: messages.length === limit,
      messagesWithPj,
      totalPj,
      broken,
      repairable,
      unrecoverable,
      samples,
    };
  },
});

// ════════════════════════════════════════════════════════════════════
// 2. REPAIR BATCH
// ════════════════════════════════════════════════════════════════════
export const repairBatch = internalMutation({
  args: {
    batchSize: v.optional(v.number()),
    cursor: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const batchSize = Math.min(args.batchSize ?? 100, 200);

    const result = await ctx.db
      .query("messages")
      .paginate({ numItems: batchSize, cursor: args.cursor ?? null });

    let touched = 0;
    let repaired = 0;
    let stripped = 0;
    let kept = 0;

    for (const m of result.page) {
      const pjs = m.piecesJointes ?? [];
      if (pjs.length === 0) continue;

      let changed = false;
      const newPjs = [];

      for (const pj of pjs) {
        if (!isBrokenUrl(pj.url)) {
          newPjs.push(pj);
          kept++;
          continue;
        }

        // Tentative de réparation via storageId
        if (pj.storageId) {
          try {
            const realUrl = await ctx.storage.getUrl(pj.storageId);
            if (realUrl) {
              newPjs.push({ ...pj, url: realUrl });
              repaired++;
              changed = true;
              continue;
            }
          } catch {
            // storageId invalide → on retire la PJ
          }
        }

        stripped++;
        changed = true;
      }

      if (changed) {
        await ctx.db.patch(m._id, { piecesJointes: newPjs });
        touched++;
      }
    }

    return {
      processed: result.page.length,
      touched,
      repaired,
      stripped,
      kept,
      isDone: result.isDone,
      nextCursor: result.continueCursor,
    };
  },
});

// ════════════════════════════════════════════════════════════════════
// 3. CLEANUP BATCH (strip sans tenter de réparer)
// ════════════════════════════════════════════════════════════════════
export const cleanupBatch = internalMutation({
  args: {
    batchSize: v.optional(v.number()),
    cursor: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const batchSize = Math.min(args.batchSize ?? 100, 200);

    const result = await ctx.db
      .query("messages")
      .paginate({ numItems: batchSize, cursor: args.cursor ?? null });

    let touched = 0;
    let stripped = 0;

    for (const m of result.page) {
      const pjs = m.piecesJointes ?? [];
      if (pjs.length === 0) continue;

      const filtered = pjs.filter((pj) => {
        if (isBrokenUrl(pj.url)) {
          stripped++;
          return false;
        }
        return true;
      });

      if (filtered.length !== pjs.length) {
        await ctx.db.patch(m._id, { piecesJointes: filtered });
        touched++;
      }
    }

    return {
      processed: result.page.length,
      touched,
      stripped,
      isDone: result.isDone,
      nextCursor: result.continueCursor,
    };
  },
});

// ════════════════════════════════════════════════════════════════════
// 4. REPAIR ALL — wrapper action
// ════════════════════════════════════════════════════════════════════
// Note : le cast `as any` sur `internal` est temporaire, nécessaire car
// Convex n'a pas encore régénéré `_generated/api` (chicken-and-egg).
// Tu pourras retirer le cast après la première régénération réussie.
// ════════════════════════════════════════════════════════════════════
export const repairAll = internalAction({
  args: {
    batchSize: v.optional(v.number()),
    maxIterations: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize ?? 100;
    const maxIterations = args.maxIterations ?? 100;

    let cursor: string | null = null;
    let iterations = 0;
    let totalTouched = 0;
    let totalRepaired = 0;
    let totalStripped = 0;
    let totalKept = 0;

    while (iterations < maxIterations) {
      iterations++;

      const res: {
        touched: number;
        repaired: number;
        stripped: number;
        kept: number;
        isDone: boolean;
        nextCursor: string;
      } = await ctx.runMutation(
        (internal as any).migrations.repairMessageAttachments.repairBatch,
        { batchSize, cursor }
      );

      totalTouched += res.touched;
      totalRepaired += res.repaired;
      totalStripped += res.stripped;
      totalKept += res.kept;
      cursor = res.nextCursor;

      if (res.isDone) break;
    }

    return {
      iterations,
      maxIterations,
      reachedMax: iterations >= maxIterations,
      totalTouched,
      totalRepaired,
      totalStripped,
      totalKept,
    };
  },
});

// ════════════════════════════════════════════════════════════════════
// 5. CLEANUP ALL — wrapper action
// ════════════════════════════════════════════════════════════════════
export const cleanupAll = internalAction({
  args: {
    batchSize: v.optional(v.number()),
    maxIterations: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize ?? 100;
    const maxIterations = args.maxIterations ?? 100;

    let cursor: string | null = null;
    let iterations = 0;
    let totalTouched = 0;
    let totalStripped = 0;

    while (iterations < maxIterations) {
      iterations++;

      const res: {
        touched: number;
        stripped: number;
        isDone: boolean;
        nextCursor: string;
      } = await ctx.runMutation(
        (internal as any).migrations.repairMessageAttachments.cleanupBatch,
        { batchSize, cursor }
      );

      totalTouched += res.touched;
      totalStripped += res.stripped;
      cursor = res.nextCursor;

      if (res.isDone) break;
    }

    return {
      iterations,
      totalTouched,
      totalStripped,
    };
  },
});