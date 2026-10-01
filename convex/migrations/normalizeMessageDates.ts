// convex/migrations/normalizeMessageDates.ts
//
// Migration pour normaliser les dates de messages (ISO string → timestamp ms).

import { v } from "convex/values";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "../_generated/server";
import { internal } from "../_generated/api";

// ════════════════════════════════════════════════════════════════════
// 1. DIAGNOSTIC
// ════════════════════════════════════════════════════════════════════
export const diagnostic = internalQuery({
  args: {},
  handler: async (ctx) => {
    const messages = await ctx.db.query("messages").take(5000);

    let total = messages.length;
    let asString = 0;
    let asNumber = 0;
    let invalid = 0;
    const samples = [];

    for (const m of messages) {
      if (typeof m.date === "string") {
        asString++;
        if (samples.length < 5) {
          samples.push({ id: m._id, date: m.date, type: "string" });
        }
      } else if (typeof m.date === "number") {
        asNumber++;
      } else {
        invalid++;
      }
    }

    return { total, asString, asNumber, invalid, samples };
  },
});

// ════════════════════════════════════════════════════════════════════
// 2. NORMALISATION batch
// ════════════════════════════════════════════════════════════════════
export const normalizeBatch = internalMutation({
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

    for (const m of result.page) {
      if (typeof m.date === "string") {
        const parsed = Date.parse(m.date);
        if (!isNaN(parsed)) {
          await ctx.db.patch(m._id, { date: parsed });
          touched++;
        }
      }
    }

    return {
      processed: result.page.length,
      touched,
      isDone: result.isDone,
      nextCursor: result.continueCursor,
    };
  },
});

// ════════════════════════════════════════════════════════════════════
// 3. WRAPPER
// ════════════════════════════════════════════════════════════════════
export const normalizeAll = internalAction({
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

    while (iterations < maxIterations) {
      iterations++;

      const res: {
        touched: number;
        isDone: boolean;
        nextCursor: string;
      } = await ctx.runMutation(
        (internal as any).migrations.normalizeMessageDates.normalizeBatch,
        { batchSize, cursor }
      );

      totalTouched += res.touched;
      cursor = res.nextCursor;

      if (res.isDone) break;
    }

    return { iterations, totalTouched };
  },
});