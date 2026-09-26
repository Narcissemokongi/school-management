// convex/fcm.ts
import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

/**
 * Récupère une variable d'env sans dépendre de @types/node.
 */
function getEnv(key: string): string | undefined {
  const p = (globalThis as { process?: { env?: Record<string, string> } })
    .process;
  return p?.env?.[key];
}

// ════════════════════════════════════════════════════════════════
// 1️⃣ Notification FCM simple (1 token → 1 message)
// ════════════════════════════════════════════════════════════════

export const sendFCMNotification = internalAction({
  args: {
    fcmToken: v.string(),
    title: v.string(),
    body: v.string(),
  },
  handler: async (_ctx, args) => {
    const serverKey = getEnv("FCM_SERVER_KEY");
    if (!serverKey) return { skipped: true };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const res = await fetch("https://fcm.googleapis.com/fcm/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `key=${serverKey}`,
        },
        body: JSON.stringify({
          to: args.fcmToken,
          notification: {
            title: args.title,
            body: args.body,
          },
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        console.error(
          `[fcm] Notification échouée (${res.status}): ${await res.text()}`
        );
        return { success: false, status: res.status };
      }

      return { success: true };
    } catch (err) {
      console.error("[fcm] Notification error:", err);
      return { success: false, error: String(err) };
    } finally {
      clearTimeout(timeoutId);
    }
  },
});

// ════════════════════════════════════════════════════════════════
// 2️⃣ ✨ V2 — Push pour annonces (multicast ciblé)
// ════════════════════════════════════════════════════════════════

export const sendAnnoncePush = internalAction({
  args: {
    annonceId: v.id("annonces"),
    titre: v.string(),
    message: v.string(),
    type: v.string(),
    cible: v.string(),
    ecoleId: v.optional(v.id("ecoles")),
    role: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const serverKey = getEnv("FCM_SERVER_KEY");
    if (!serverKey) return { skipped: true, reason: "no server key" };

    // Récupérer les users ciblés avec fcmToken
    let users: Array<{ fcmToken?: string }> = [];

    if (args.cible === "toutes") {
      users = await ctx.runQuery(internal.fcmHelpers.getUsersWithTokens, {
        scope: "all",
      });
    } else if (args.cible === "ecole" && args.ecoleId) {
      users = await ctx.runQuery(internal.fcmHelpers.getUsersWithTokens, {
        scope: "ecole",
        ecoleId: args.ecoleId,
      });
    } else if (args.cible === "role" && args.role) {
      users = await ctx.runQuery(internal.fcmHelpers.getUsersWithTokens, {
        scope: "role",
        role: args.role,
      });
    }

    const tokens = users
      .map((u) => u.fcmToken)
      .filter((t): t is string => !!t);

    if (tokens.length === 0) {
      return { skipped: true, reason: "no tokens" };
    }

    // FCM multicast — on limite à 100 pour V1
    const batch = tokens.slice(0, 100);
    const icone =
      args.type === "warning"
        ? "⚠️"
        : args.type === "maintenance"
        ? "🔧"
        : args.type === "success"
        ? "✅"
        : "ℹ️";

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const res = await fetch("https://fcm.googleapis.com/fcm/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `key=${serverKey}`,
        },
        body: JSON.stringify({
          registration_ids: batch,
          notification: {
            title: `${icone} ${args.titre}`,
            body:
              args.message.length > 140
                ? args.message.slice(0, 140) + "…"
                : args.message,
          },
          data: {
            type: "annonce",
            annonceId: String(args.annonceId),
          },
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        console.error(
          `[fcm] Annonce push échoué (${res.status}): ${await res.text()}`
        );
        return { success: false, status: res.status };
      }

      return { success: true, sent: batch.length, total: tokens.length };
    } catch (err) {
      console.error("[fcm] Annonce push error:", err);
      return { success: false, error: String(err) };
    } finally {
      clearTimeout(timeoutId);
    }
  },
});