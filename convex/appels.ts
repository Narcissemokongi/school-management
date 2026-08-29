import { mutation, query, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id, Doc } from "../convex/_generated/dataModel";

// ========== OUTILS ==========
async function requireAuth(ctx: MutationCtx, userId: string | undefined) {
  if (!userId) throw new Error("Authentification requise");
  const user = await ctx.db.get(userId as Id<"users">);
  if (!user) throw new Error("Utilisateur introuvable");
  return user;
}

function generateChannelName(): string {
  return "call_" + Math.random().toString(36).substring(2, 12);
}

async function sendPushNotification(
  ctx: MutationCtx,
  userId: Id<"users">,
  title: string,
  body: string
) {
  const user = await ctx.db.get(userId);
  if (user && "fcmToken" in user && user.fcmToken) {
    const serverKey = process.env.FCM_SERVER_KEY;
    if (serverKey) {
      fetch("https://fcm.googleapis.com/fcm/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `key=${serverKey}`,
        },
        body: JSON.stringify({
          to: user.fcmToken,
          notification: { title, body },
        }),
      }).catch(console.error);
    }
  }
}

// ========== APPEL INDIVIDUEL ==========
export const createCall = mutation({
  args: {
    calleeId: v.id("users"),
    ecoleId: v.id("ecoles"),
    anneeId: v.optional(v.id("anneesScolaires")),
    userId: v.id("users"),
    type: v.optional(v.union(v.literal("audio"), v.literal("video"))),
    ipMasked: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const caller = await requireAuth(ctx, args.userId);
    const callee = await ctx.db.get(args.calleeId);
    if (!callee) throw new Error("Destinataire introuvable");

    // Terminer les anciens appels ringing entre ces deux utilisateurs
    const oldCalls = await ctx.db
      .query("appels")
      .withIndex("by_caller", (q) => q.eq("callerId", args.userId))
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

    const channelName = generateChannelName();
    await ctx.db.insert("appels", {
      callerId: args.userId,
      calleeId: args.calleeId,
      channelName,
      status: "ringing",
      ecoleId: args.ecoleId,
      anneeId: args.anneeId,
      type: args.type ?? "audio",
      isGroup: false,
      callDirection: "outgoing",
      ipMasked: args.ipMasked ?? false,
      createdAt: new Date().toISOString(),
    });

    await sendPushNotification(ctx, args.calleeId, "Appel entrant", `${caller.nom} vous appelle`);

    return channelName;
  },
});

// ========== APPEL DE GROUPE ==========
export const createGroupCall = mutation({
  args: {
    ecoleId: v.id("ecoles"),
    anneeId: v.optional(v.id("anneesScolaires")),
    userId: v.id("users"),
    groupId: v.string(),
    participantIds: v.array(v.id("users")),
    type: v.union(v.literal("audio"), v.literal("video")),
  },
  handler: async (ctx, args) => {
    const caller = await requireAuth(ctx, args.userId);
    if (!["admin", "directeur", "disciplinaire", "enseignant"].includes(caller.role)) {
      throw new Error("Vous n'êtes pas autorisé à créer un appel de groupe");
    }

    // Vérifier que les participants sont dans la même école
    const participants: (Doc<"users"> | null)[] = await Promise.all(
      args.participantIds.map((id) => ctx.db.get(id))
    );
    if (participants.some((p) => !p || p.ecoleId !== args.ecoleId)) {
      throw new Error("Tous les participants doivent être dans la même école");
    }

    const channelName = generateChannelName();
    await ctx.db.insert("appels", {
      ecoleId: args.ecoleId,
      callerId: args.userId,
      channelName,
      status: "ringing",
      isGroup: true,
      groupId: args.groupId,
      participants: args.participantIds,
      type: args.type,
      callDirection: "outgoing",
      ipMasked: true,
      createdAt: new Date().toISOString(),
      anneeId: args.anneeId,
    });

    // Notifier tous les participants sauf l'appelant
    for (const pid of args.participantIds) {
      if (pid !== args.userId) {
        await sendPushNotification(
          ctx,
          pid,
          "Appel de groupe",
          `${caller.nom} vous invite à un appel de groupe`
        );
      }
    }

    return channelName;
  },
});

// ========== RÉPONSES AUX APPELS ==========
export const acceptCall = mutation({
  args: { callId: v.id("appels"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const call = await ctx.db.get(args.callId);
    if (!call || call.status !== "ringing") throw new Error("Appel introuvable ou déjà terminé");
    const user = await requireAuth(ctx, args.userId);
    if (call.isGroup) {
      if (!call.participants?.includes(args.userId)) throw new Error("Vous n'êtes pas invité à cet appel");
      await ctx.db.patch(args.callId, { status: "accepted" });
    } else {
      if (call.calleeId !== args.userId) throw new Error("Vous n'êtes pas le destinataire");
      await ctx.db.patch(args.callId, { status: "accepted" });
    }
  },
});

export const rejectCall = mutation({
  args: { callId: v.id("appels"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const call = await ctx.db.get(args.callId);
    if (!call || call.status !== "ringing") throw new Error("Appel introuvable ou déjà terminé");
    if (call.isGroup) {
      // Le refus d'un participant ne termine pas l'appel de groupe, on ignore simplement.
      return { success: true };
    } else {
      if (call.calleeId !== args.userId) throw new Error("Vous n'êtes pas le destinataire");
      await ctx.db.patch(args.callId, { status: "rejected" });
    }
  },
});

export const endCall = mutation({
  args: { callId: v.id("appels"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const call = await ctx.db.get(args.callId);
    if (!call) return { success: true };
    const isParticipant = call.isGroup
      ? call.participants?.includes(args.userId) || call.callerId === args.userId
      : call.callerId === args.userId || call.calleeId === args.userId;
    if (!isParticipant) throw new Error("Vous ne pouvez pas terminer cet appel");
    await ctx.db.patch(args.callId, { status: "ended" });
    return { success: true };
  },
});

// Marquer comme manqué après timeout
export const markCallMissed = mutation({
  args: { callId: v.id("appels") },
  handler: async (ctx, args) => {
    const call = await ctx.db.get(args.callId);
    if (call && call.status === "ringing") {
      await ctx.db.patch(args.callId, { status: "missed" });
    }
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

// ========== QUERIES ==========
export const getPendingCall = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Pour les appels individuels
    const direct = await ctx.db
      .query("appels")
      .withIndex("by_callee", (q) => q.eq("calleeId", args.userId))
      .filter((q) => q.eq(q.field("status"), "ringing"))
      .order("desc")
      .first();
    if (direct) return direct;
    // Pour les appels de groupe (on filtre en mémoire car Convex ne supporte pas includes)
    const allRinging = await ctx.db
      .query("appels")
      .filter((q) => q.eq(q.field("status"), "ringing"))
      .collect();
    return (
      allRinging.find(
        (c: any) => c.isGroup && c.participants?.includes(args.userId)
      ) || null
    );
  },
});

export const getActiveCall = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const allAccepted = await ctx.db
      .query("appels")
      .filter((q) => q.eq(q.field("status"), "accepted"))
      .collect();

    return (
      allAccepted.find((c: any) =>
        c.isGroup
          ? c.participants?.includes(args.userId) || c.callerId === args.userId
          : c.callerId === args.userId || c.calleeId === args.userId
      ) || null
    );
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
    const directCalls = await ctx.db
      .query("appels")
      .filter((q) =>
        q.or(
          q.eq(q.field("callerId"), args.userId),
          q.eq(q.field("calleeId"), args.userId)
        )
      )
      .order("desc")
      .collect();

    const groupCalls = await ctx.db
      .query("appels")
      .filter((q) => q.eq(q.field("isGroup"), true))
      .collect();

    const userGroupCalls = groupCalls.filter((c: any) =>
      c.participants?.includes(args.userId)
    );

    return [...directCalls, ...userGroupCalls]
      .sort(
        (a: any, b: any) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, 100);
  },
});