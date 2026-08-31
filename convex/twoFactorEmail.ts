import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

const CODE_EXPIRATION_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 5;

// Génère un code à 6 chiffres
function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Envoie un email via Resend (API REST)
async function sendEmail(to: string, code: string) {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) throw new Error("Clé API Resend non configurée.");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from: "EduDiscipline <no-reply@yourdomain.com>",
      to: [to],
      subject: "Votre code de sécurité EduDiscipline",
      html: `<p>Votre code de connexion est : <strong>${code}</strong></p>
             <p>Ce code expire dans 10 minutes.</p>`,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erreur d'envoi d'email : ${error}`);
  }
}

// ========== QUERY ==========

// Récupère la configuration 2FA email d'un utilisateur
export const getByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("twoFactorEmail")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
  },
});

// ========== MUTATIONS ==========

// Enregistre ou met à jour l'email 2FA pour un utilisateur
export const setupEmail = mutation({
  args: {
    userId: v.id("users"),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    // Rate limiting
    const rateKey = `2fa_setup:${args.userId}`;
    const { allowed } = await ctx.runMutation(api.rateLimit.checkRateLimit, {
      key: rateKey,
      maxRequests: 3,
      windowMs: 60_000,
    });
    if (!allowed) {
      throw new Error("Trop de tentatives. Veuillez patienter avant de réessayer.");
    }

    const existing = await ctx.db
      .query("twoFactorEmail")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (existing?.enabled) {
      throw new Error("La 2FA par email est déjà activée.");
    }

    const code = generateCode();
    const expiresAt = Date.now() + CODE_EXPIRATION_MS;

    if (existing) {
      await ctx.db.patch(existing._id, {
        email: args.email,
        code,
        expiresAt,
        attempts: 0,
        enabled: false,
      });
    } else {
      await ctx.db.insert("twoFactorEmail", {
        userId: args.userId,
        email: args.email,
        code,
        expiresAt,
        attempts: 0,
        enabled: false,
        createdAt: new Date().toISOString(),
      });
    }

    await sendEmail(args.email, code);
    return { success: true, message: "Code envoyé à votre email." };
  },
});

// Vérifie le code reçu et active la 2FA
export const verifyAndEnableEmail = mutation({
  args: {
    userId: v.id("users"),
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query("twoFactorEmail")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (!record) throw new Error("Aucune configuration en attente.");
    if (record.enabled) throw new Error("La 2FA est déjà active.");
    if (Date.now() > (record.expiresAt || 0)) {
      throw new Error("Code expiré, veuillez recommencer.");
    }
    if (record.attempts >= MAX_ATTEMPTS) {
      throw new Error("Trop de tentatives, veuillez recommencer.");
    }

    if (record.code !== args.code) {
      await ctx.db.patch(record._id, { attempts: record.attempts + 1 });
      throw new Error("Code invalide.");
    }

    await ctx.db.patch(record._id, {
      enabled: true,
      code: undefined,
      expiresAt: undefined,
      attempts: 0,
    });

    return { success: true };
  },
});

// Désactive la 2FA par email
export const disableEmail = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query("twoFactorEmail")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
    if (record) {
      await ctx.db.delete(record._id);
    }
    return { success: true };
  },
});

// Envoie un code lors de la connexion (si 2FA activée)
export const sendLoginCode = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Rate limiting
    const rateKey = `2fa_send:${args.userId}`;
    const { allowed } = await ctx.runMutation(api.rateLimit.checkRateLimit, {
      key: rateKey,
      maxRequests: 3,
      windowMs: 60_000,
    });
    if (!allowed) {
      throw new Error("Trop de demandes de code. Veuillez patienter.");
    }

    const record = await ctx.db
      .query("twoFactorEmail")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (!record || !record.enabled) {
      throw new Error("2FA non activée pour cet utilisateur.");
    }

    const code = generateCode();
    const expiresAt = Date.now() + CODE_EXPIRATION_MS;

    await ctx.db.patch(record._id, {
      code,
      expiresAt,
      attempts: 0,
    });

    await sendEmail(record.email, code);
    return { success: true };
  },
});

// Vérifie le code de connexion
export const verifyLoginCode = mutation({
  args: {
    userId: v.id("users"),
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query("twoFactorEmail")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (!record || !record.enabled) {
      return { success: true };
    }

    if (Date.now() > (record.expiresAt || 0)) {
      throw new Error("Code expiré, veuillez demander un nouveau code.");
    }
    if (record.attempts >= MAX_ATTEMPTS) {
      throw new Error("Trop de tentatives, veuillez demander un nouveau code.");
    }

    if (record.code !== args.code) {
      await ctx.db.patch(record._id, { attempts: record.attempts + 1 });
      throw new Error("Code invalide.");
    }

    await ctx.db.patch(record._id, {
      code: undefined,
      expiresAt: undefined,
      attempts: 0,
    });

    return { success: true };
  },
});