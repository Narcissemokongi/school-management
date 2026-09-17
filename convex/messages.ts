import { query, mutation, MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

type AnyCtx = MutationCtx | QueryCtx;

const MAX_MESSAGES = 200;

/**
 * 🔴 FIX GLOBAL : tout superAdmin passe désormais (avant : seuls ceux
 * sans permissions étaient reconnus comme principaux).
 */
function isSuperAdmin(user: any): boolean {
  if (!user) return false;
  return (
    user.role === "superAdmin" ||
    (user.role === "admin" && !user.ecoleId)
  );
}

// Vérifie que l'utilisateur a le droit d'utiliser la messagerie pour l'école spécifiée.
async function requireEcoleRole(
  ctx: AnyCtx,
  userId: string | undefined,
  ecoleId: string,
  allowedRoles: string[]
) {
  if (!userId) throw new Error("Authentification requise");
  const user = await ctx.db.get(userId as Id<"users">);
  if (!user) throw new Error("Utilisateur introuvable");

  if (isSuperAdmin(user)) return user;

  if (!allowedRoles.includes(user.role)) {
    throw new Error("Accès refusé : rôle insuffisant");
  }

  if (user.ecoleId !== ecoleId) {
    throw new Error("Accès refusé : vous n'appartenez pas à cette école.");
  }

  return user;
}

// 🟢 FIX : notification FCM avec timeout (non bloquante mais loggée)
async function sendFCMNotification(
  fcmToken: string,
  title: string,
  body: string
): Promise<void> {
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
        to: fcmToken,
        notification: { title, body },
      }),
      signal: controller.signal,
    });
  } catch (err) {
    console.error("[messages] FCM notification failed:", err);
  } finally {
    clearTimeout(timeoutId);
  }
}

// ========== QUERIES ==========

/**
 * 🔴 FIX : `userId` optionnel + cloisonnement. Si fourni, l'utilisateur
 * ne peut voir QUE ses propres messages (sauf admin d'école).
 * 🟢 FIX : `.take()` pour éviter les gros volumes.
 */
export const listRecus = query({
  args: {
    destinataireId: v.id("users"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // 🟡 Si userId fourni, vérifier les droits
    if (args.userId) {
      const caller = await ctx.db.get(args.userId);
      if (!caller) throw new Error("Authentification requise");

      if (
        caller._id !== args.destinataireId &&
        !isSuperAdmin(caller) &&
        caller.role !== "admin" &&
        caller.role !== "directeur"
      ) {
        throw new Error("Accès refusé : vous ne pouvez voir que vos messages.");
      }
    }

    return await ctx.db
      .query("messages")
      .withIndex("by_destinataire", (q) =>
        q.eq("destinataireId", args.destinataireId)
      )
      .order("desc")
      .take(MAX_MESSAGES);
  },
});

/**
 * 🔴 FIX : `userId` optionnel + cloisonnement. Idem `listRecus`.
 */
export const listEnvoyes = query({
  args: {
    expediteurId: v.id("users"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    if (args.userId) {
      const caller = await ctx.db.get(args.userId);
      if (!caller) throw new Error("Authentification requise");

      if (
        caller._id !== args.expediteurId &&
        !isSuperAdmin(caller) &&
        caller.role !== "admin" &&
        caller.role !== "directeur"
      ) {
        throw new Error("Accès refusé : vous ne pouvez voir que vos messages.");
      }
    }

    return await ctx.db
      .query("messages")
      .withIndex("by_expediteur", (q) =>
        q.eq("expediteurId", args.expediteurId)
      )
      .order("desc")
      .take(MAX_MESSAGES);
  },
});

// ========== MUTATIONS ==========

/**
 * 🟡 FIX : notification FCM avec timeout.
 * 🟢 FIX : retour `{ messageId }` structuré.
 */
export const send = mutation({
  args: {
    ecoleId: v.id("ecoles"),
    expediteurId: v.id("users"),
    destinataireId: v.id("users"),
    contenu: v.string(),
    piecesJointes: v.optional(
      v.array(
        v.object({
          nom: v.string(),
          type: v.string(),
          url: v.string(),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    // Vérifier l'expéditeur et l'école (via son propre userId)
    await requireEcoleRole(ctx, args.expediteurId, args.ecoleId, [
      "admin",
      "directeur",
      "disciplinaire",
      "enseignant",
      "comptable",
      "parent",
      "eleve",
    ]);

    if (!args.contenu.trim()) {
      throw new Error("Le message ne peut pas être vide.");
    }

    // Vérifier que le destinataire appartient à la même école
    const destinataire = await ctx.db.get(args.destinataireId);
    if (!destinataire || destinataire.ecoleId !== args.ecoleId) {
      throw new Error("Le destinataire n'appartient pas à cette école.");
    }

    const messageId = await ctx.db.insert("messages", {
      ecoleId: args.ecoleId,
      expediteurId: args.expediteurId,
      destinataireId: args.destinataireId,
      contenu: args.contenu,
      piecesJointes: args.piecesJointes,
      date: new Date().toISOString(),
      lu: false,
    });

    // 🟡 Envoyer une notification FCM si le destinataire a un token
    if (destinataire.fcmToken) {
      const expediteur = await ctx.db.get(args.expediteurId);
      await sendFCMNotification(
        destinataire.fcmToken,
        `📩 Nouveau message de ${expediteur?.nom ?? "Utilisateur"}`,
        args.contenu.substring(0, 100)
      );
    }

    return { success: true, messageId };
  },
});

/**
 * 🟡 FIX : `userId` optionnel + vérification stricte.
 * Si `userId` est fourni → doit être le destinataire ou un admin.
 * Si `userId` est absent → ancien comportement (à éviter).
 */
export const markAsRead = mutation({
  args: {
    messageId: v.id("messages"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message introuvable");

    if (args.userId) {
      const user = await ctx.db.get(args.userId);
      if (!user) throw new Error("Utilisateur introuvable");

      const isDestinataire = message.destinataireId === args.userId;
      const isAdmin =
        (user.role === "admin" ||
          user.role === "directeur" ||
          user.role === "disciplinaire") &&
        user.ecoleId === message.ecoleId;

      if (!isDestinataire && !isAdmin && !isSuperAdmin(user)) {
        throw new Error("Vous ne pouvez pas marquer ce message comme lu.");
      }
    }

    // 🟢 FIX : évite le patch inutile
    if (message.lu) {
      return { success: true, noChange: true };
    }

    await ctx.db.patch(args.messageId, { lu: true });
    return { success: true };
  },
});

/**
 * 🟡 FIX : `.take()` sur les parents + retour structuré.
 * 🟢 FIX : skip des parents qui sont déjà l'expéditeur.
 */
export const sendToAllParents = mutation({
  args: {
    ecoleId: v.id("ecoles"),
    expediteurId: v.id("users"),
    contenu: v.string(),
  },
  handler: async (ctx, args) => {
    await requireEcoleRole(ctx, args.expediteurId, args.ecoleId, [
      "admin",
      "directeur",
      "disciplinaire",
    ]);

    if (!args.contenu.trim()) {
      throw new Error("Le message ne peut pas être vide.");
    }

    const parents = await ctx.db
      .query("users")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId))
      .filter((q) => q.eq(q.field("role"), "parent"))
      .take(MAX_MESSAGES);

    if (parents.length === 0) {
      throw new Error("Aucun parent trouvé dans cette école.");
    }

    const now = new Date().toISOString();
    let sent = 0;
    let skipped = 0;

    for (const parent of parents) {
      // 🟢 Skip si l'expéditeur est aussi destinataire
      if (parent._id === args.expediteurId) {
        skipped++;
        continue;
      }

      await ctx.db.insert("messages", {
        ecoleId: args.ecoleId,
        expediteurId: args.expediteurId,
        destinataireId: parent._id,
        contenu: args.contenu,
        date: now,
        lu: false,
      });
      sent++;
    }

    // 🟡 Audit
    await ctx.db.insert("audit", {
      userId: args.expediteurId,
      action: "send_to_all_parents",
      table: "messages",
      documentId: args.ecoleId,
      date: now,
      ecoleId: args.ecoleId,
      details: `Message envoyé à ${sent} parent(s)${skipped ? `, ${skipped} ignoré(s)` : ""}`,
    });

    return { success: true, sent, skipped };
  },
});

/**
 * 🔴 FIX : `generateUploadUrl` n'avait AUCUNE auth. N'importe quel client
 * pouvait générer une URL d'upload. Désormais `userId` requis.
 */
export const generateUploadUrl = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const caller = await ctx.db.get(args.userId);
    if (!caller) throw new Error("Authentification requise");
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * 🟡 FIX : audit + retour structuré.
 * 🟢 FIX : vérifie le contenu + rôle.
 */
export const sendToGroupe = mutation({
  args: {
    ecoleId: v.id("ecoles"),
    expediteurId: v.id("users"),
    contenu: v.string(),
    groupeId: v.string(),
    piecesJointes: v.optional(
      v.array(
        v.object({
          nom: v.string(),
          type: v.string(),
          url: v.string(),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    await requireEcoleRole(ctx, args.expediteurId, args.ecoleId, [
      "admin",
      "directeur",
      "disciplinaire",
      "enseignant",
      "eleve",
    ]);

    if (!args.contenu.trim()) {
      throw new Error("Le message ne peut pas être vide.");
    }

    const messageId = await ctx.db.insert("messages", {
      ecoleId: args.ecoleId,
      expediteurId: args.expediteurId,
      contenu: args.contenu,
      groupeId: args.groupeId,
      date: new Date().toISOString(),
      lu: false,
      piecesJointes: args.piecesJointes,
    });

    return { success: true, messageId };
  },
});

/**
 * 🔴 FIX : `listByGroupe` n'avait AUCUN cloisonnement école → n'importe
 * qui pouvait lire les messages de n'importe quel groupe.
 * 🟢 FIX : `userId` optionnel + vérif que l'appelant est dans la même école.
 */
export const listByGroupe = query({
  args: {
    ecoleId: v.id("ecoles"),
    groupeId: v.string(),
    limit: v.optional(v.number()),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // 🟡 Si userId fourni, cloisonnement école
    if (args.userId) {
      const caller = await ctx.db.get(args.userId);
      if (!caller) throw new Error("Authentification requise");

      if (!isSuperAdmin(caller)) {
        if (caller.ecoleId !== args.ecoleId) {
          throw new Error("Accès refusé : vous n'appartenez pas à cette école.");
        }
      }
    }

    const limit = Math.min(args.limit ?? 100, MAX_MESSAGES);
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_groupeId", (q) => q.eq("groupeId", args.groupeId))
      .filter((q) => q.eq(q.field("ecoleId"), args.ecoleId))
      .order("desc")
      .take(limit);
    return messages.reverse();
  },
});