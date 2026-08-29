"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "../convex/_generated/api";

export const generateToken = action({
  args: {
    channelName: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // 1. Récupérer l'utilisateur
    const user = await ctx.runQuery(api.users.get, { userId: args.userId });
    if (!user) throw new Error("Utilisateur introuvable");

    // 2. Valider le format du canal
    if (!args.channelName.match(/^[a-zA-Z0-9_]+$/)) {
      throw new Error("Nom de canal invalide");
    }

    // 3. Générer le token
    const appId = process.env.AGORA_APP_ID!;
    const appCertificate = process.env.AGORA_APP_CERTIFICATE!;
    const expirationTimeInSeconds = 3600;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    // 4. Import dynamique robuste du module Agora
    let RtcTokenBuilder: any, RtcRole: any;
    try {
      const agoraModule: any = await import("agora-token");
      RtcTokenBuilder = agoraModule.RtcTokenBuilder ?? agoraModule.default?.RtcTokenBuilder;
      RtcRole = agoraModule.RtcRole ?? agoraModule.default?.RtcRole;
    } catch (e) {
      // Fallback au cas où le package serait "agora-access-token"
      const agoraModule: any = await import("agora-access-token");
      RtcTokenBuilder = agoraModule.RtcTokenBuilder ?? agoraModule.default?.RtcTokenBuilder;
      RtcRole = agoraModule.RtcRole ?? agoraModule.default?.RtcRole;
    }

    if (!RtcTokenBuilder || !RtcRole) {
      throw new Error("Impossible de charger le module Agora (RtcTokenBuilder/RtcRole manquants)");
    }

    // 5. Génération du token (signature standard : 6 arguments)
    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      args.channelName,
      0, // uid = 0 (mode public)
      RtcRole.PUBLISHER,
      privilegeExpiredTs
    );

    return token;
  },
});