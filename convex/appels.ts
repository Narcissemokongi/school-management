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
    if (!call || call.status !== "ringing") {
      throw new Error("Appel introuvable ou déjà terminé");
    }
    await requireAuth(ctx, args.userId);

    if (call.isGroup) {
      if (!call.participants?.includes(args.userId)) {
        throw new Error("Vous n'êtes pas invité à cet appel");
      }
    } else {
      if (call.calleeId !== args.userId) {
        throw new Error("Vous n'êtes pas le destinataire");
      }
    }

    await ctx.db.patch(args.callId, { status: "accepted" });
    return { success: true };
  },
});

export const rejectCall = mutation({
  args: { callId: v.id("appels"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const call = await ctx.db.get(args.callId);
    if (!call || call.status !== "ringing") {
      throw new Error("Appel introuvable ou déjà terminé");
    }
    await requireAuth(ctx, args.userId);

    if (call.isGroup) {
      // Le refus d'un participant ne termine pas l'appel de groupe
      return { success: true, ignored: true };
    }

    if (call.calleeId !== args.userId) {
      throw new Error("Vous n'êtes pas le destinataire");
    }
    await ctx.db.patch(args.callId, { status: "rejected" });
    return { success: true };
  },
});

export const endCall = mutation({
  args: { callId: v.id("appels"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const call = await ctx.db.get(args.callId);
    if (!call) return { success: true, alreadyEnded: true };
    await requireAuth(ctx, args.userId);

    const isParticipant = call.isGroup
      ? call.participants?.includes(args.userId) || call.callerId === args.userId
      : call.callerId === args.userId || call.calleeId === args.userId;

    if (!isParticipant) {
      throw new Error("Vous ne pouvez pas terminer cet appel");
    }

    await ctx.db.patch(args.callId, { status: "ended" });
    return { success: true };
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

    const isParticipant = call.isGroup
      ? call.participants?.includes(args.userId) || call.callerId === args.userId
      : call.callerId === args.userId || call.calleeId === args.userId;

    if (!isParticipant && !isSuperAdmin(caller)) {
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
 *
 * C'est une opération de MAINTENANCE technique :
 * - Idempotente : relancer ne casse rien (marque "missed" uniquement les
 *   appels ringing vieux de plus de 60s)
 * - Sans impact métier : ne modifie que le statut d'appels fantômes
 * - Ne retourne aucune donnée sensible (juste un count)
 *
 * AVANT : réservé au super-admin → non-exécuté pour 99% des utilisateurs
 *         → accumulation d'appels fantômes en base
 * APRÈS : tout utilisateur connecté peut le déclencher
 *         → auto-nettoyage à chaque ouverture de l'onglet Appels
 */
export const cleanupExpiredCalls = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // ✅ Vérifie seulement que l'utilisateur est authentifié
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
    const direct = await ctx.db
      .query("appels")
      .withIndex("by_callee", (q) => q.eq("calleeId", args.userId))
      .filter((q) => q.eq(q.field("status"), "ringing"))
      .order("desc")
      .first();
    if (direct) return direct;

    const allRinging = await ctx.db
      .query("appels")
      .filter((q) => q.eq(q.field("status"), "ringing"))
      .take(MAX_APPELS);

    return (
      allRinging.find(
        (c) => c.isGroup && c.participants?.includes(args.userId)
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
      allAccepted.find((c) =>
        c.isGroup
          ? c.participants?.includes(args.userId) || c.callerId === args.userId
          : c.callerId === args.userId || c.calleeId === args.userId
      ) || null
    );
  },
});

/**
 * 🔴 FIX : `.take()` au lieu de `.collect()`.
 * 🟡 Note : filtrer par école est déjà fait via l'index `by_ecoleId`.
 */
export const listContacts = query({
  args: { ecoleId: v.id("ecoles"), userId: v.id("users") },
  handler: async (ctx, args) => {
    // 🟡 Vérif que l'appelant appartient bien à cette école
    const caller = await getUser(ctx, args.userId);
    if (!caller) throw new Error("Authentification requise");
    if (!isSuperAdmin(caller) && caller.ecoleId !== args.ecoleId) {
      throw new Error("Accès refusé : école différente.");
    }

    const users = await ctx.db
      .query("users")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId))
      .take(MAX_CONTACTS);

    // Ne pas retourner les champs sensibles
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

    const groupCalls = await ctx.db
      .query("appels")
      .filter((q) => q.eq(q.field("isGroup"), true))
      .take(MAX_APPELS);

    const userGroupCalls = groupCalls.filter((c) =>
      c.participants?.includes(args.userId)
    );

    return [...directCalls, ...userGroupCalls]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, MAX_HISTORY);
  },
});

/**
 * 🟢 NOUVEAU : récupérer un appel par son `channelName`.
 * Utilisé par `agora.generateToken` pour vérifier que l'appelant
 * est bien participant de l'appel avant de générer un token Agora.
 *
 * 🔴 Sécurité : sans cette vérification, un client authentifié pourrait
 * générer un token valide pour n'importe quel channel → espionnage.
 */
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