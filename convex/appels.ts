import { mutation, query, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "../convex/_generated/dataModel";

async function requireRole(ctx: MutationCtx, userId: string | undefined, allowedRoles: string[]) {
  if (!userId) throw new Error("Authentification requise");
  const user = await ctx.db.get(userId as Id<"users">);
  if (!user || !allowedRoles.includes(user.role)) {
    throw new Error("Accès refusé : rôle insuffisant");
  }
  return user;
}

export const createCall = mutation({
  args: {
    calleeId: v.id("users"),
    ecoleId: v.id("ecoles"),
    anneeId: v.optional(v.id("anneesScolaires")),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.userId, ["admin", "directeur", "disciplinaire", "enseignant", "parent", "eleve"]);

    // Terminer les anciens appels "ringing" entre ces deux utilisateurs
    const oldCalls = await ctx.db
      .query("appels")
      .withIndex("by_caller", (q) => q.eq("callerId", args.userId!))
      .filter((q) =>
        q.and(
          q.eq(q.field("calleeId"), args.calleeId),
          q.eq(q.field("status"), "ringing")
        )
      )
      .collect();
    for (const call of oldCalls) {
      await ctx.db.patch(call._id, { status: "ended" });
    }

    const channelName = "call_" + Math.random().toString(36).substring(2, 12);
    await ctx.db.insert("appels", {
      callerId: args.userId!,
      calleeId: args.calleeId,
      channelName,
      status: "ringing",
      ecoleId: args.ecoleId,
      anneeId: args.anneeId,
      createdAt: new Date().toISOString(),
    });

    // Envoyer une push au destinataire
    const callee = await ctx.db.get(args.calleeId);
    if (callee && "fcmToken" in callee && callee.fcmToken) {
      const caller = await ctx.db.get(args.userId!);
      const serverKey = process.env.FCM_SERVER_KEY;
      if (serverKey) {
        fetch("https://fcm.googleapis.com/fcm/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `key=${serverKey}`,
          },
          body: JSON.stringify({
            to: callee.fcmToken,
            notification: {
              title: "📞 Appel entrant",
              body: `${caller?.nom ?? "Quelqu'un"} vous appelle`,
            },
          }),
        }).catch(console.error);
      }
    }

    return channelName;
  },
});

export const acceptCall = mutation({
  args: { callId: v.id("appels"), userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    const call = await ctx.db.get(args.callId);
    if (!call || call.status !== "ringing") throw new Error("Appel introuvable ou déjà terminé.");
    if (call.calleeId !== args.userId) throw new Error("Vous n'êtes pas le destinataire de cet appel.");
    await ctx.db.patch(args.callId, { status: "accepted" });
  },
});

export const rejectCall = mutation({
  args: { callId: v.id("appels"), userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    const call = await ctx.db.get(args.callId);
    if (!call || call.status !== "ringing") throw new Error("Appel introuvable ou déjà terminé.");
    if (call.calleeId !== args.userId) throw new Error("Vous n'êtes pas le destinataire.");
    await ctx.db.patch(args.callId, { status: "rejected" });
  },
});

export const endCall = mutation({
  args: { callId: v.id("appels"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const call = await ctx.db.get(args.callId);
    if (!call) return { success: true };
    if (call.callerId !== args.userId && call.calleeId !== args.userId) {
      throw new Error("Vous ne pouvez pas terminer cet appel");
    }
    await ctx.db.patch(args.callId, { status: "ended" });
    return { success: true };
  },
});

export const cleanupExpiredCalls = mutation({
  handler: async (ctx) => {
    const sixtySecondsAgo = new Date(Date.now() - 60000).toISOString();
    const expired = await ctx.db
      .query("appels")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "ringing"),
          q.lt(q.field("createdAt"), sixtySecondsAgo)
        )
      )
      .collect();
    for (const call of expired) {
      await ctx.db.patch(call._id, { status: "missed" });
    }
    return expired.length;
  },
});

export const getPendingCall = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("appels")
      .withIndex("by_callee", (q) => q.eq("calleeId", args.userId))
      .filter((q) => q.eq(q.field("status"), "ringing"))
      .order("desc")
      .first();
  },
});

export const getActiveCall = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const calls = await ctx.db
      .query("appels")
      .withIndex("by_caller", (q) => q.eq("callerId", args.userId))
      .filter((q) => q.eq(q.field("status"), "accepted"))
      .collect();
    if (calls.length > 0) return calls[0];
    const calleeCalls = await ctx.db
      .query("appels")
      .withIndex("by_callee", (q) => q.eq("calleeId", args.userId))
      .filter((q) => q.eq(q.field("status"), "accepted"))
      .collect();
    return calleeCalls[0] || null;
  },
});

export const listContacts = query({
  args: { ecoleId: v.id("ecoles"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const users = await ctx.db
      .query("users")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId))
      .collect();
    return users.filter((u) => u._id !== args.userId);
  },
});

export const getOutgoingCall = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("appels")
      .withIndex("by_caller", (q) => q.eq("callerId", args.userId))
      .filter((q) => q.eq(q.field("status"), "ringing"))
      .order("desc")
      .first();
  },
});

export const listHistory = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("appels")
      .filter((q) =>
        q.or(
          q.eq(q.field("callerId"), args.userId),
          q.eq(q.field("calleeId"), args.userId)
        )
      )
      .order("desc")
      .take(100);
  },
});