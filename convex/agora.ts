// convex/agora.ts
"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

/**
 * 🔴 FIX CRITIQUE #1 : vérifier que l'appelant est bien participant de l'appel
 * identifié par `channelName` avant de générer un token.
 *
 * Avant : n'importe quel client authentifié pouvait générer un token pour
 * n'importe quel channel → espionnage d'appels.
 *
 * 🔴 FIX CRITIQUE #2 (NOUVEAU) : le token utilisait uid=0 (wildcard), mais le
 * client faisait `join(APP_ID, channel, token, null)` → Agora acceptait la
 * connexion (compteur tourne) mais rejetait SILENCIEUSEMENT tous les médias
 * (audio/vidéo ne passent pas).
 *
 * Solution : dériver un uid numérique STABLE depuis userId et l'utiliser
 * AUSSI BIEN dans le token que dans le join côté client.
 */

/**
 * Convertit un userId (string ObjectId Convex) en uid numérique uint32.
 * Le même userId produira TOUJOURS le même uid.
 *
 * Note : Agora exige un uid dans la plage [1, 2^32-1], donc on évite 0.
 */
function userIdToUid(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  }
  // Math.abs + modulo pour rentrer dans uint32 valide, et éviter 0
  const uid = Math.abs(hash) % 2147483646;
  return uid === 0 ? 1 : uid + 1;
}

export const generateToken = action({
  args: {
    channelName: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // 1. Récupérer l'utilisateur
    const user = await ctx.runQuery(api.users.get, { userId: args.userId });
    if (!user) throw new Error("Utilisateur introuvable");

    // 🟢 FIX : vérifier que le compte est actif
    if (user.status && user.status !== "active") {
      throw new Error(
        "Votre compte n'est pas actif. Contactez l'administration."
      );
    }

    // 2. Valider le format du canal
    if (!args.channelName.match(/^[a-zA-Z0-9_]+$/)) {
      throw new Error("Nom de canal invalide");
    }

    // 3. 🔴 FIX CRITIQUE : vérifier que l'utilisateur participe à cet appel
    // On cherche l'appel correspondant au channelName et on vérifie que
    // l'utilisateur est bien caller, callee ou participant.
    const call = await ctx.runQuery(api.appels.getByChannelName, {
      channelName: args.channelName,
    });

    if (!call) {
      throw new Error(
        "Appel introuvable ou terminé. Reconnectez-vous."
      );
    }

    // Statut autorisé : ringing, accepted (pas ended/rejected/missed)
    if (!["ringing", "accepted"].includes(call.status)) {
      throw new Error("Cet appel est terminé.");
    }

    // Vérif participant
    const isCaller = call.callerId === args.userId;
    const isCallee = call.calleeId === args.userId;
    const isParticipant =
      call.isGroup && call.participants?.includes(args.userId);

    if (!isCaller && !isCallee && !isParticipant) {
      // Message volontairement vague pour ne pas leak d'info
      throw new Error("Vous n'êtes pas autorisé à rejoindre cet appel.");
    }

    // 4. Générer le token
    const appId = process.env.AGORA_APP_ID;
    const appCertificate = process.env.AGORA_APP_CERTIFICATE;

    if (!appId || !appCertificate) {
      throw new Error("Variables d'environnement Agora manquantes.");
    }

    // 🟢 FIX : durée basée sur le temps écoulé depuis le début de l'appel
    // (max 60 min à partir de maintenant, mais on peut réduire si l'appel
    // est déjà en cours depuis longtemps)
    const MAX_TOKEN_DURATION_SECONDS = 3600; // 1h max
    const currentTimestamp = Math.floor(Date.now() / 1000);

    // Calcul : s'il reste moins d'1h avant la limite des 60 min de l'appel,
    // on aligne l'expiration du token sur la fin de l'appel + 5 min de marge.
    const callStartMs = new Date(call.createdAt).getTime();
    const callMaxEndMs = callStartMs + 60 * 60 * 1000; // +60 min
    const secondsUntilCallEnd = Math.floor(
      (callMaxEndMs - Date.now()) / 1000
    );
    const tokenDuration = Math.max(
      300, // minimum 5 min pour laisser le temps de se connecter
      Math.min(secondsUntilCallEnd + 300, MAX_TOKEN_DURATION_SECONDS)
    );
    const privilegeExpiredTs = currentTimestamp + tokenDuration;

    // 5. Import dynamique robuste du module Agora
    let RtcTokenBuilder: any, RtcRole: any;
    try {
      const agoraModule: any = await import("agora-token");
      RtcTokenBuilder =
        agoraModule.RtcTokenBuilder ?? agoraModule.default?.RtcTokenBuilder;
      RtcRole = agoraModule.RtcRole ?? agoraModule.default?.RtcRole;
    } catch (e) {
      try {
        const agoraModule: any = await import("agora-access-token");
        RtcTokenBuilder =
          agoraModule.RtcTokenBuilder ?? agoraModule.default?.RtcTokenBuilder;
        RtcRole = agoraModule.RtcRole ?? agoraModule.default?.RtcRole;
      } catch (e2) {
        throw new Error(
          "Impossible de charger le module Agora (ni agora-token ni agora-access-token)"
        );
      }
    }

    if (!RtcTokenBuilder || !RtcRole) {
      throw new Error(
        "Impossible de charger le module Agora (RtcTokenBuilder/RtcRole manquants)"
      );
    }

    // 6. 🔴 FIX CRITIQUE : uid explicite et stable
    // On dérive un uid numérique unique depuis userId pour que :
    // - le token contienne CE uid précis
    // - le client fasse join() avec CE MÊME uid
    // → Agora sait qui publie quoi → audio/vidéo fonctionnent.
    const uid = userIdToUid(args.userId);

    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      args.channelName,
      uid,                // ✅ uid explicite (pas 0)
      RtcRole.PUBLISHER,
      privilegeExpiredTs
    );

    // ✅ Retourner AUSSI l'uid pour que le client l'utilise au join()
    return { token, uid };
  },
});