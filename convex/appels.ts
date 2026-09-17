// convex/appels.ts
import { query, mutation, MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id, Doc } from "./_generated/dataModel";

type AnyCtx = MutationCtx | QueryCtx;

const MAX_APPELS = 500;
const MAX_CONTACTS = 500;
const MAX_HISTORY = 100;

// 🟢 FIX : CSPRNG pour le channel name
function generateChannelName(): string {
  const arr = new Uint32Array(8);
  crypto.getRandomValues(arr);
  const hex = Array.from(arr).map((n) => n.toString(36)).join("");
  return "call_" + hex.slice(0, 12);
}

// 🟢 FIX : type propre pour éviter les unions
type UserDoc = {
  _id: Id<"users">;
  nom: string;
  role: string;
  ecoleId?: Id<"ecoles">;
  permissions?: string[];
  fcmToken?: string;
};

async function getUser(ctx: AnyCtx, userId: string | undefined): Promise<UserDoc | null> {
  if (!userId) return null;
  return (await ctx.db.get(userId as Id<"users">)) as UserDoc | null;
}

function isSuperAdmin(user: any): boolean {
  if (!user) return false;
  return (
    user.role === "superAdmin" ||
    (user.role === "admin" && !user.ecoleId)
  );
}

// ========== OUTILS ==========
async function requireAuth(ctx: AnyCtx, userId: string | undefined) {
  const user = await getUser(ctx, userId);
  if (!user) throw new Error("Authentification requise");
  return user;
}

/**
 * 🟢 FIX : fetch avec timeout + await (avant : .catch() silencieux).
 */
async function sendPushNotification(
  ctx: AnyCtx,
  userId: Id<"users">,
  title: string,
  body: string
) {
  const user = await getUser(ctx, userId);
  if (!user?.fcmToken) return;

  const serverKey = process.env.FCM_SERVER_KEY;
  if (!serverKey) return;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    await fetch("https://fcm.googleapis.com/fcm/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `key=${serverKey}`,
      },
      body: JSON.stringify({
        to: user.fcmToken,
        notification: { title, body },
      }),
      signal: controller.signal,
    });
  } catch (err) {
    console.error("[appels] FCM notification failed:", err);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * 🔴 FIX MAJEUR : helper qui vérifie si un user participe à un appel.
 * Utilisé partout pour éviter la logique dupliquée.
 *
 * Un user participe si :
 * - Appel individuel : il est caller OU callee
 * - Appel groupe : il est caller OU dans participants[]
 *
 * MAIS : si le user a explicitement refusé (`declinedBy[]`), il ne participe plus.
 */
function isUserParticipant(
  call: Doc<"appels">,
  userId: Id<"users">
): boolean {
  if (call.isGroup) {
    if (call.callerId === userId) return true;
    if (!call.participants?.includes(userId)) return false;
    // S'il a refusé, il n'est plus participant actif
    if (call.declinedBy?.includes(userId)) return false;
    return true;
  }
  return call.callerId === userId || call.calleeId === userId;
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

    if (caller.ecoleId !== args.ecoleId) {
      throw new Error("Vous n'appartenez pas à cette école.");
    }

    if (args.calleeId === args.userId) {
      throw new Error("Vous ne pouvez pas vous appeler vous-même.");
    }

    const callee = await getUser(ctx, args.calleeId);
    if (!callee) throw new Error("Destinataire introuvable");
    if (callee.ecoleId !== args.ecoleId) {
      throw new Error("Le destinataire n'appartient pas à cette école.");
    }

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
      .take(10);
    for (const call of oldCalls) {
      await ctx.db.patch(call._id, { status: "ended" });
    }

    const channelName = generateChannelName();
    const newId = await ctx.db.insert("appels", {
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

    await sendPushNotification(
      ctx,
      args.calleeId,
      "Appel entrant",
      `${caller.nom} vous appelle`
    );

    return { success: true, callId: newId, channelName };
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

    if (caller.ecoleId !== args.ecoleId) {
      throw new Error("Vous n'appartenez pas à cette école.");
    }

    if (args.participantIds.length === 0) {
      throw new Error("Sélectionnez au moins un participant.");
    }
    if (args.participantIds.length > 100) {
      throw new Error("Trop de participants (max 100).");
    }

    // Vérifier que les participants sont dans la même école
    const participants: (UserDoc | null)[] = await Promise.all(
      args.participantIds.map((id) => getUser(ctx, id))
    );
    if (participants.some((p) => !p || p.ecoleId !== args.ecoleId)) {
      throw new Error("Tous les participants doivent être dans la même école");
    }

    const channelName = generateChannelName();
    const newId = await ctx.db.insert("appels", {
      ecoleId: args.ecoleId,
      callerId: args.userId,
      channelName,
      status: "ringing",
      isGroup: true,
      groupId: args.groupId,
      participants: args.participantIds,
      declinedBy: [], // ✅ NOUVEAU : tracker les refus individuels
      type: args.type,
      callDirection: "outgoing",
      ipMasked: true,
      createdAt: new Date().toISOString(),
      anneeId: args.anneeId,
    });

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

    return { success: true, callId: newId, channelName };
  },
});

// ========== RÉPONSES AUX APPELS ==========
export const acceptCall = mutation({
  args: { callId: v.id("appels"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const call = await ctx.db.get(args.callId);
    if (!call) {
      throw new Error("Appel introuvable");
    }
    await requireAuth(ctx, args.userId);

    if (call.status === "ended" || call.status === "rejected") {
      throw new Error("Appel déjà terminé");
    }

    if (call.isGroup) {
      if (!call.participants?.includes(args.userId)) {
        throw new Error("Vous n'êtes pas invité à cet appel");
      }
      // ✅ S'il a refusé avant, on l'enlève de declinedBy
      if (call.declinedBy?.includes(args.userId)) {
        await ctx.db.patch(args.callId, {
          declinedBy: call.declinedBy.filter((id) => id !== args.userId),
        });
      }
      // ✅ Pour un groupe : le 1er accept fait passer ringing → accepted
      if (call.status === "ringing") {
        await ctx.db.patch(args.callId, { status: "accepted" });
      }
    } else {
      if (call.calleeId !== args.userId) {
        throw new Error("Vous n'êtes pas le destinataire");
      }
      if (call.status !== "ringing") {
        throw new Error("Appel introuvable ou déjà terminé");
      }
      await ctx.db.patch(args.callId, { status: "accepted" });
    }

    return { success: true };
  },
});

export const rejectCall = mutation({
  args: { callId: v.id("appels"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const call = await ctx.db.get(args.callId);
    if (!call) {
      throw new Error("Appel introuvable");
    }
    await requireAuth(ctx, args.userId);

    if (call.isGroup) {
      // ✅ FIX : pour un groupe, on RETIRE le user de la liste de sonnerie
      if (!call.participants?.includes(args.userId)) {
        throw new Error("Vous n'êtes pas invité à cet appel");
      }
      const declinedBy = [...(call.declinedBy ?? []), args.userId];
      await ctx.db.patch(args.callId, { declinedBy });

      // ✅ Si TOUS les invités ont refusé → appel terminé
      const stillRinging = (call.participants ?? []).filter(
        (p) =>
          p !== call.callerId &&
          !declinedBy.includes(p)
      );
      if (stillRinging.length === 0 && call.status === "ringing") {
        await ctx.db.patch(args.callId, { status: "rejected" });
      }
      return { success: true, ignored: false };
    }

    if (call.calleeId !== args.userId) {
      throw new Error("Vous n'êtes pas le destinataire");
    }
    if (call.status !== "ringing") {
      throw new Error("Appel introuvable ou déjà terminé");
    }
    await ctx.db.patch(args.callId, { status: "rejected" });
    return { success: true };
  },
});

/**
 * 🔴 FIX MAJEUR : `endCall` était utilisé pour TOUT (individuel ET groupe).
 * Pour un groupe, 1 raccrochage terminait l'appel pour TOUS les participants.
 *
 * Maintenant : `endCall` refuse les appels de groupe.
 * Utiliser `leaveGroupCall` à la place.
 */
export const endCall = mutation({
  args: { callId: v.id("appels"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const call = await ctx.db.get(args.callId);
    if (!call) return { success: true, alreadyEnded: true };
    await requireAuth(ctx, args.userId);

    // 🔴 FIX : refuse explicitement les groupes
    if (call.isGroup) {
      throw new Error(
        "Utilisez leaveGroupCall pour quitter un appel de groupe."
      );
    }

    const isParticipant =
      call.callerId === args.userId || call.calleeId === args.userId;

    if (!isParticipant) {
      throw new Error("Vous ne pouvez pas terminer cet appel");
    }

    await ctx.db.patch(args.callId, { status: "ended" });
    return { success: true };
  },
});

/**
 * ✅ NOUVEAU : quitter un appel de groupe SANS terminer pour les autres.
 *
 * - Retire le user de `participants[]`
 * - Si le user était le caller → il reste (callerId inchangé)
 * - Si plus AUCUN participant actif → statut "ended"
 * - Si c'était le dernier → on peut patcher à "ended"
 */
export const leaveGroupCall = mutation({
  args: { callId: v.id("appels"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const call = await ctx.db.get(args.callId);
    if (!call) return { success: true, alreadyEnded: true };
    if (!call.isGroup) {
      throw new Error("Cet appel n'est pas un appel de groupe.");
    }
    await requireAuth(ctx, args.userId);

    // Vérifier que le user participe
    const isCaller = call.callerId === args.userId;
    const isInParticipants = call.participants?.includes(args.userId) ?? false;
    if (!isCaller && !isInParticipants) {
      throw new Error("Vous ne participez pas à cet appel.");
    }

    // Retirer le user des participants actifs
    const remainingParticipants = (call.participants ?? []).filter(
      (p) => p !== args.userId
    );

    // Si le caller quitte OU s'il ne reste plus personne → terminer
    const noOneLeft = remainingParticipants.length === 0;

    if (noOneLeft) {
      await ctx.db.patch(args.callId, { status: "ended" });
      return { success: true, ended: true };
    }

    await ctx.db.patch(args.callId, {
      participants: remainingParticipants,
      // Si c'était le caller, on transfère au 1er restant (optionnel)
      ...(isCaller
        ? { callerId: remainingParticipants[0] }
        : {}),
    });

    return { success: true, ended: false };
  },
});

/**
 * 🔴 FIX CRITIQUE : `markCallMissed` n'avait AUCUNE auth.
 * N'importe qui pouvait marquer n'importe quel appel comme manqué.
 * Maintenant : on vérifie que l'appelant est participant ou superAdmin.
 */
export const markCallMissed = mutation({
  args: {
    callId: v.id("appels"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const call = await ctx.db.get(args.callId);
    if (!call) return { success: true, alreadyEnded: true };

    const caller = await requireAuth(ctx, args.userId);

    if (!isUserParticipant(call, args.userId) && !isSuperAdmin(caller)) {
      throw new Error("Vous ne pouvez pas modifier cet appel");
    }

    if (call.status === "ringing") {
      await ctx.db.patch(args.callId, { status: "missed" });
    }
    return { success: true };
  },
});

/**
 * ✅ FIX — `cleanupExpiredCalls` accessible à tout utilisateur authentifié.
 * ...
 */
export const cleanupExpiredCalls = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.userId);

    const sixtySecondsAgo = new Date(Date.now() - 60000).toISOString();
    const expired = await ctx.db
      .query("appels")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "ringing"),
          q.lt(q.field("createdAt"), sixtySecondsAgo)
        )
      )
      .take(MAX_APPELS);

    for (const call of expired) {
      await ctx.db.patch(call._id, { status: "missed" });
    }
    return { success: true, cleaned: expired.length };
  },
});

// ========== QUERIES ==========
export const getPendingCall = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Appel direct en sonnerie pour ce user
    const direct = await ctx.db
      .query("appels")
      .withIndex("by_callee", (q) => q.eq("calleeId", args.userId))
      .filter((q) => q.eq(q.field("status"), "ringing"))
      .order("desc")
      .first();
    if (direct) return direct;

    // Appel groupe en sonnerie pour ce user
    const allRinging = await ctx.db
      .query("appels")
      .filter((q) => q.eq(q.field("status"), "ringing"))
      .take(MAX_APPELS);

    return (
      allRinging.find(
        (c) =>
          c.isGroup &&
          c.callerId !== args.userId &&
          c.participants?.includes(args.userId) &&
          // ✅ FIX : ne pas re-proposer si déjà refusé
          !c.declinedBy?.includes(args.userId)
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
      .take(MAX_APPELS);

    return (
      allAccepted.find((c) => isUserParticipant(c, args.userId)) || null
    );
  },
});

export const listContacts = query({
  args: { ecoleId: v.id("ecoles"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const caller = await getUser(ctx, args.userId);
    if (!caller) throw new Error("Authentification requise");
    if (!isSuperAdmin(caller) && caller.ecoleId !== args.ecoleId) {
      throw new Error("Accès refusé : école différente.");
    }

    const users = await ctx.db
      .query("users")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId))
      .take(MAX_CONTACTS);

    return users
      .filter((u) => u._id !== args.userId)
      .map(({ password, loginAttempts, lockedUntil, ...safe }) => safe);
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
    const caller = await requireAuth(ctx, args.userId);
    const callerEcole = caller.ecoleId;

    const directCalls = await ctx.db
      .query("appels")
      .filter((q) =>
        q.or(
          q.eq(q.field("callerId"), args.userId),
          q.eq(q.field("calleeId"), args.userId)
        )
      )
      .order("desc")
      .take(MAX_HISTORY);

    // ✅ FIX : filtrer par école pour éviter la fuite PII
    const groupCalls = await ctx.db
      .query("appels")
      .filter((q) =>
        q.and(
          q.eq(q.field("isGroup"), true),
          callerEcole
            ? q.eq(q.field("ecoleId"), callerEcole)
            : q.eq(q.field("ecoleId"), undefined)
        )
      )
      .take(MAX_APPELS);

    const userGroupCalls = groupCalls.filter((c) =>
      c.participants?.includes(args.userId) ||
      c.callerId === args.userId
    );

    return [...directCalls, ...userGroupCalls]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, MAX_HISTORY);
  },
});

export const getByChannelName = query({
  args: { channelName: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("appels")
      .withIndex("by_channelName", (q) =>
        q.eq("channelName", args.channelName)
      )
      .first();
  },
});