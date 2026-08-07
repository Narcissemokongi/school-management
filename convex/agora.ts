// convex/agora.ts
"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import crypto from "crypto";

export const generateToken = action({
  args: {
    channelName: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const appId = process.env.AGORA_APP_ID;
    const appCertificate = process.env.AGORA_APP_CERTIFICATE;

    if (!appId || !appCertificate) {
      throw new Error("Configuration Agora manquante");
    }

    const expiration = Math.floor(Date.now() / 1000) + 3600;
    const uid = 0; // ou utiliser un hash de userId

    // Construire le message à signer
    const message = `${appId}${args.channelName}${uid}${expiration}`;
    
    // Signer avec HMAC-SHA256
    const signature = crypto
      .createHmac("sha256", appCertificate)
      .update(message)
      .digest("hex");

    // Construire le token (format standard Agora)
    const token = `006${appId}${Buffer.from(args.channelName).toString("base64")}${Buffer.from(String(uid)).toString("base64")}${expiration}${signature}`;

    return token;
  },
});