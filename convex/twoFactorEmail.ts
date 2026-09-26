// convex/twoFactorEmail.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { api, internal } from "./_generated/api";
import { sendEmail, render2FACodeHtml } from "./helpers/email";

const CODE_EXPIRATION_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 5;

type UserDoc = {
  _id: Id<"users">;
  role: string;
  ecoleId?: Id<"ecoles">;
  permissions?: string[];
};

/**
 * 🔴 FIX GLOBAL : tout superAdmin passe désormais.
 */
function isSuperAdmin(user: any): boolean {
  if (!user) return false;
  return (
    user.role === "superAdmin" ||
    (user.role === "admin" && !user.ecoleId)
  );
}

/**
 * 🟢 FIX : CSPRNG au lieu de Math.random() pour le code 2FA.
 */
function generateCode(): string {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return (100000 + (arr[0] % 900000)).toString();
}

/**
 * ✅ FIX SÉCURITÉ M8 : comparaison en temps constant pour éviter les timing attacks.
 * String comparison !== est vulnérable aux attaques par mesure de timing.
 * Avec un rate limit de 5 tentatives, le risque pratique est faible,
 * mais la bonne pratique s'impose pour les codes de sécurité.
 */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * 🔴 FIX : helper pour vérifier que l'appelant agit sur son propre compte,
 * OU qu'il est admin/superAdmin.
 */
async function assertCanManage2FA(
  ctx: any,
  requesterId: Id<"users">,
  targetUserId: Id<"users">
) {
  const requester = (await ctx.db.get(requesterId)) as UserDoc | null;
  if (!requester) throw new Error("Authentification requise");

  // Cas 1 : l'utilisateur agit sur lui-même
  if (requesterId === targetUserId) return requester;

  // Cas 2 : superAdmin
  if (isSuperAdmin(requester)) return requester;

  // Cas 3 : admin d'école (même école que la cible)
  const target = await ctx.db.get(targetUserId);
  if (!target) throw new Error("Utilisateur cible introuvable");

  const isEcoleAdmin =
    (requester.role === "admin" || requester.role === "directeur") &&
    requester.ecoleId &&
    requester.ecoleId === (target as any).ecoleId;

  if (!isEcoleAdmin) {
    throw new Error("Vous ne pouvez gérer la 2FA que de votre propre compte.");
  }

  return requester;
}

// ========== QUERY ==========

export const getByUser = query({
  args: {
    userId: v.id("users"),
    requesterId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await assertCanManage2FA(ctx, args.requesterId, args.userId);

    const record = await ctx.db
      .query("twoFactorEmail")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (!record) return null;

    // 🟢 Ne pas exposer le code ni les tentatives au client
    const { code, attempts, expiresAt, ...safe } = record;
    return safe;
  },
});

// ========== MUTATIONS ==========

export const setupEmail = mutation({
  args: {
    userId: v.id("users"),
    email: v.string(),
    requesterId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await assertCanManage2FA(ctx, args.requesterId, args.userId);

    // 🟢 Validation email
    const email = args.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Adresse email invalide.");
    }

    // Rate limiting
    const rateKey = `2fa_setup:${args.userId}`;
    const { allowed } = await ctx.runMutation(
      internal.rateLimit.checkRateLimit,
      {
        key: rateKey,
        maxRequests: 3,
        windowMs: 60_000,
      }
    );
    if (!allowed) {
      throw new Error(
        "Trop de tentatives. Veuillez patienter avant de réessayer."
      );
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
        email,
        code,
        expiresAt,
        attempts: 0,
        enabled: false,
      });
    } else {
      await ctx.db.insert("twoFactorEmail", {
        userId: args.userId,
        email,
        code,
        expiresAt,
        attempts: 0,
        enabled: false,
        createdAt: new Date().toISOString(),
      });
    }

    // ✅ Utilisation du helper partagé
    await sendEmail({
      to: email,
      subject: "Votre code de sécurité EduDiscipline",
      html: render2FACodeHtml(code),
      throwOnError: true,
    });

    // 🟡 Audit
    await ctx.db.insert("audit", {
      userId: args.requesterId,
      action: "2fa_setup_initiated",
      table: "twoFactorEmail",
      documentId: args.userId,
      date: new Date().toISOString(),
      ecoleId: undefined,
      details: `Configuration 2FA initiée pour ${args.userId} (email masqué: ${email.slice(0, 3)}***)`,
    });

    return { success: true, message: "Code envoyé à votre email." };
  },
});

export const verifyAndEnableEmail = mutation({
  args: {
    userId: v.id("users"),
    code: v.string(),
    requesterId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await assertCanManage2FA(ctx, args.requesterId, args.userId);

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

    // ✅ FIX M8 : comparaison en temps constant
    if (!safeEqual(record.code ?? "", args.code.trim())) {
      await ctx.db.patch(record._id, { attempts: record.attempts + 1 });
      throw new Error("Code invalide.");
    }

    await ctx.db.patch(record._id, {
      enabled: true,
      code: undefined,
      expiresAt: undefined,
      attempts: 0,
    });

    // 🟡 Audit
    await ctx.db.insert("audit", {
      userId: args.requesterId,
      action: "2fa_enabled",
      table: "twoFactorEmail",
      documentId: args.userId,
      date: new Date().toISOString(),
      ecoleId: undefined,
      details: `2FA activée pour ${args.userId}`,
    });

    return { success: true };
  },
});

export const disableEmail = mutation({
  args: {
    userId: v.id("users"),
    requesterId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await assertCanManage2FA(ctx, args.requesterId, args.userId);

    const record = await ctx.db
      .query("twoFactorEmail")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (record) {
      await ctx.db.delete(record._id);

      // 🟡 Audit
      await ctx.db.insert("audit", {
        userId: args.requesterId,
        action: "2fa_disabled",
        table: "twoFactorEmail",
        documentId: args.userId,
        date: new Date().toISOString(),
        ecoleId: undefined,
        details: `2FA désactivée pour ${args.userId}`,
      });
    }

    return { success: true };
  },
});

export const sendLoginCode = mutation({
  args: {
    userId: v.id("users"),
    requesterId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await assertCanManage2FA(ctx, args.requesterId, args.userId);

    // Rate limiting
    const rateKey = `2fa_send:${args.userId}`;
    const { allowed } = await ctx.runMutation(
      internal.rateLimit.checkRateLimit,
      {
        key: rateKey,
        maxRequests: 3,
        windowMs: 60_000,
      }
    );
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

    // ✅ Utilisation du helper partagé
    await sendEmail({
      to: record.email,
      subject: "Votre code de sécurité EduDiscipline",
      html: render2FACodeHtml(code),
      throwOnError: true,
    });

    return { success: true };
  },
});

export const verifyLoginCode = mutation({
  args: {
    userId: v.id("users"),
    code: v.string(),
    requesterId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await assertCanManage2FA(ctx, args.requesterId, args.userId);

    const record = await ctx.db
      .query("twoFactorEmail")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    // 🟢 Retour explicite si pas de 2FA active
    if (!record || !record.enabled) {
      return { success: true, skipped: true, reason: "2FA non activée" };
    }

    if (Date.now() > (record.expiresAt || 0)) {
      throw new Error("Code expiré, veuillez demander un nouveau code.");
    }
    if (record.attempts >= MAX_ATTEMPTS) {
      throw new Error(
        "Trop de tentatives, veuillez demander un nouveau code."
      );
    }

    // ✅ FIX M8 : comparaison en temps constant
    if (!safeEqual(record.code ?? "", args.code.trim())) {
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