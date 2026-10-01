// convex/messages.ts
import { query, mutation, MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";

type AnyCtx = MutationCtx | QueryCtx;

const MAX_MESSAGES = 200;
const MAX_MESSAGE_LENGTH = 10_000;
const MAX_PIECES_JOINTES = 5;
const MAX_NOM_FICHIER = 255;
const MAX_DESTINATAIRES_BULK = 500;

// ════════════════════════════════════════════════════════════════════
// ✨ TYPES PARTAGÉS
// ════════════════════════════════════════════════════════════════════
type PieceJointe = {
  nom: string;
  type: string;
  url: string;
  storageId?: string;
};

// ════════════════════════════════════════════════════════════════════
// AUTH HELPERS
// ════════════════════════════════════════════════════════════════════

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
 * Vérifie que l'utilisateur a le droit d'utiliser la messagerie pour l'école.
 */
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

// ════════════════════════════════════════════════════════════════════
// VALIDATION HELPERS
// ════════════════════════════════════════════════════════════════════

/**
 * ✅ FIX SÉCURITÉ : validation centralisée des pièces jointes.
 * ✨ Supporte storageId optionnel (Convex _storage).
 */
function validatePiecesJointes(
  piecesJointes: PieceJointe[] | undefined
) {
  if (!piecesJointes) return;
  if (piecesJointes.length > MAX_PIECES_JOINTES) {
    throw new Error(`Maximum ${MAX_PIECES_JOINTES} pièces jointes par message.`);
  }

  const dangerousTypes = [
    "exe", "bat", "sh", "ps1", "cmd", "vbs", "js", "php", "py", "jar",
  ];

  for (const pj of piecesJointes) {
    if (pj.nom.length > MAX_NOM_FICHIER) {
      throw new Error("Nom de fichier trop long.");
    }
    if (
      !pj.url.startsWith("https://") ||
      pj.url.includes("<") ||
      pj.url.includes("javascript:")
    ) {
      throw new Error("URL de pièce jointe invalide.");
    }

    // ✨ Validation storageId (optionnel mais contrôlé si présent)
    if (pj.storageId !== undefined) {
      if (typeof pj.storageId !== "string") {
        throw new Error("storageId invalide (doit être une chaîne).");
      }
      if (pj.storageId.length < 10 || pj.storageId.length > 100) {
        throw new Error("storageId invalide (longueur anormale).");
      }
      // Les IDs de _storage Convex commencent par "kg"
      if (!pj.storageId.startsWith("kg")) {
        throw new Error("storageId invalide (format inattendu).");
      }
    }

    const ext = pj.nom.split(".").pop()?.toLowerCase() ?? "";
    if (dangerousTypes.includes(ext)) {
      throw new Error(`Type de fichier interdit : .${ext}`);
    }
  }
}

/**
 * ✅ FIX SÉCURITÉ + UX : validation centralisée du contenu.
 * ✨ Autorise un contenu vide SI au moins 1 pièce jointe est fournie.
 */
function validateContenu(
  contenu: string,
  hasPiecesJointes: boolean = false
): string {
  const trimmed = contenu.trim();

  if (!trimmed && !hasPiecesJointes) {
    throw new Error(
      "Le message ne peut pas être vide (texte ou pièce jointe requis)."
    );
  }

  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    throw new Error(
      `Message trop long (${MAX_MESSAGE_LENGTH} caractères maximum).`
    );
  }

  return trimmed;
}

// ════════════════════════════════════════════════════════════════════
// QUERIES
// ════════════════════════════════════════════════════════════════════

export const listRecus = query({
  args: {
    destinataireId: v.id("users"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
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

    return await ctx.db
      .query("messages")
      .withIndex("by_destinataire", (q) =>
        q.eq("destinataireId", args.destinataireId)
      )
      .order("desc")
      .take(MAX_MESSAGES);
  },
});

export const listEnvoyes = query({
  args: {
    expediteurId: v.id("users"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
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

    return await ctx.db
      .query("messages")
      .withIndex("by_expediteur", (q) =>
        q.eq("expediteurId", args.expediteurId)
      )
      .order("desc")
      .take(MAX_MESSAGES);
  },
});

export const listByGroupe = query({
  args: {
    ecoleId: v.id("ecoles"),
    groupeId: v.string(),
    limit: v.optional(v.number()),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const caller = await ctx.db.get(args.userId);
    if (!caller) throw new Error("Authentification requise");

    if (!isSuperAdmin(caller)) {
      if (caller.ecoleId !== args.ecoleId) {
        throw new Error("Accès refusé : vous n'appartenez pas à cette école.");
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

// ════════════════════════════════════════════════════════════════════
// MUTATIONS
// ════════════════════════════════════════════════════════════════════

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
          storageId: v.optional(v.string()), // ✨ AJOUTÉ
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    // Auth + cloisonnement école
    await requireEcoleRole(ctx, args.expediteurId, args.ecoleId, [
      "admin",
      "directeur",
      "disciplinaire",
      "enseignant",
      "comptable",
      "parent",
      "eleve",
    ]);

    // ✨ Autoriser contenu vide si PJ présente
    const hasPJ = !!args.piecesJointes && args.piecesJointes.length > 0;
    const contenu = validateContenu(args.contenu, hasPJ);

    // Validation pièces jointes
    validatePiecesJointes(args.piecesJointes);

    // Destinataire doit être dans la même école
    const destinataire = await ctx.db.get(args.destinataireId);
    if (!destinataire || destinataire.ecoleId !== args.ecoleId) {
      throw new Error("Le destinataire n'appartient pas à cette école.");
    }

    // ✨ Fallback : contenu = "(pièce jointe)" si vide et PJ présente
    const contenuFinal = contenu || "(pièce jointe)";

    const messageId = await ctx.db.insert("messages", {
      ecoleId: args.ecoleId,
      expediteurId: args.expediteurId,
      destinataireId: args.destinataireId,
      contenu: contenuFinal,
      piecesJointes: args.piecesJointes,
      date: new Date().toISOString(),
      lu: false,
    });

    // 🔔 Notification FCM (action séparée, non bloquante)
    if (destinataire.fcmToken) {
      const expediteur = await ctx.db.get(args.expediteurId);
      await ctx.scheduler.runAfter(0, internal.fcm.sendFCMNotification, {
        fcmToken: destinataire.fcmToken,
        title: `📩 Nouveau message de ${expediteur?.nom ?? "Utilisateur"}`,
        body: contenuFinal.substring(0, 100),
      });
    }

    return { success: true, messageId };
  },
});

export const markAsRead = mutation({
  args: {
    messageId: v.id("messages"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message introuvable");

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

    // Évite le patch inutile
    if (message.lu) {
      return { success: true, noChange: true };
    }

    await ctx.db.patch(args.messageId, { lu: true });
    return { success: true };
  },
});

// ════════════════════════════════════════════════════════════════════
// ✨ NOUVEAU — Marquer TOUTE une conversation comme lue (batch)
// Évite N mutations quand on ouvre une conv avec 50 messages non lus.
// ════════════════════════════════════════════════════════════════════
export const markConversationAsRead = mutation({
  args: {
    userId: v.id("users"),
    expediteurId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const caller = await ctx.db.get(args.userId);
    if (!caller) throw new Error("Authentification requise");

    // Sécurité : on ne peut marquer que SES messages (comme destinataire)
    // (l'expéditeurId est celui de l'autre → on cherche les messages
    // reçus PAR userId, envoyés PAR expediteurId, non lus)
    const unread = await ctx.db
      .query("messages")
      .withIndex("by_destinataire", (q) =>
        q.eq("destinataireId", args.userId)
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("expediteurId"), args.expediteurId),
          q.eq(q.field("lu"), false)
        )
      )
      .take(500);

    for (const msg of unread) {
      await ctx.db.patch(msg._id, { lu: true });
    }

    return { marked: unread.length };
  },
});

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

    // ✅ FIX SÉCURITÉ : valider le contenu
    // ⚠️ Pas de PJ possible ici → contenu obligatoire
    const contenu = validateContenu(args.contenu, false);

    const parents = await ctx.db
      .query("users")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId))
      .filter((q) => q.eq(q.field("role"), "parent"))
      .take(MAX_DESTINATAIRES_BULK);

    if (parents.length === 0) {
      throw new Error("Aucun parent trouvé dans cette école.");
    }

    const now = new Date().toISOString();
    let sent = 0;
    let skipped = 0;

    for (const parent of parents) {
      if (parent._id === args.expediteurId) {
        skipped++;
        continue;
      }

      await ctx.db.insert("messages", {
        ecoleId: args.ecoleId,
        expediteurId: args.expediteurId,
        destinataireId: parent._id,
        contenu,
        date: now,
        lu: false,
      });
      sent++;
    }

    // Audit
    await ctx.db.insert("audit", {
      userId: args.expediteurId,
      action: "send_to_all_parents",
      table: "messages",
      documentId: args.ecoleId,
      date: now,
      ecoleId: args.ecoleId,
      details: `Message envoyé à ${sent} parent(s)${
        skipped ? `, ${skipped} ignoré(s)` : ""
      }`,
    });

    return { success: true, sent, skipped };
  },
});

// ════════════════════════════════════════════════════════════════════
// ✨ DIFFUSION GROUPÉE — Élèves & Classe
// ════════════════════════════════════════════════════════════════════

export const sendToAllEleves = mutation({
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

    // Contenu obligatoire (pas de PJ)
    const contenu = validateContenu(args.contenu, false);

    // ✨ .take() limite — on ne charge que 500 élèves max
    const eleves = await ctx.db
      .query("users")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId))
      .filter((q) => q.eq(q.field("role"), "eleve"))
      .take(MAX_DESTINATAIRES_BULK);

    if (eleves.length === 0) {
      throw new Error("Aucun élève trouvé dans cette école.");
    }

    const now = new Date().toISOString();
    let sent = 0;
    let skipped = 0;

    for (const eleve of eleves) {
      if (eleve._id === args.expediteurId) {
        skipped++;
        continue;
      }
      if (eleve.isActive === false) {
        skipped++;
        continue;
      }

      await ctx.db.insert("messages", {
        ecoleId: args.ecoleId,
        expediteurId: args.expediteurId,
        destinataireId: eleve._id,
        contenu,
        date: now,
        lu: false,
      });
      sent++;
    }

    // Audit
    await ctx.db.insert("audit", {
      userId: args.expediteurId,
      action: "send_to_all_eleves",
      table: "messages",
      documentId: args.ecoleId,
      date: now,
      ecoleId: args.ecoleId,
      details: `Message envoyé à ${sent} élève(s)${
        skipped ? `, ${skipped} ignoré(s)` : ""
      }`,
    });

    return { success: true, sent, skipped };
  },
});

export const sendToClasse = mutation({
  args: {
    ecoleId: v.id("ecoles"),
    expediteurId: v.id("users"),
    classe: v.string(),
    contenu: v.string(),
  },
  handler: async (ctx, args) => {
    await requireEcoleRole(ctx, args.expediteurId, args.ecoleId, [
      "admin",
      "directeur",
      "disciplinaire",
    ]);

    const contenu = validateContenu(args.contenu, false);

    // ✨ Valider la classe
    const classe = args.classe.trim();
    if (!classe || classe.length > 50) {
      throw new Error("Nom de classe invalide.");
    }

    // ✨ .take() — 500 max
    const eleves = await ctx.db
      .query("users")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId))
      .filter((q) =>
        q.and(
          q.eq(q.field("role"), "eleve"),
          q.eq(q.field("classe"), classe)
        )
      )
      .take(MAX_DESTINATAIRES_BULK);

    if (eleves.length === 0) {
      throw new Error(`Aucun élève trouvé dans la classe ${classe}.`);
    }

    const now = new Date().toISOString();
    let sent = 0;
    let skipped = 0;

    for (const eleve of eleves) {
      if (eleve._id === args.expediteurId) {
        skipped++;
        continue;
      }
      if (eleve.isActive === false) {
        skipped++;
        continue;
      }

      await ctx.db.insert("messages", {
        ecoleId: args.ecoleId,
        expediteurId: args.expediteurId,
        destinataireId: eleve._id,
        contenu,
        date: now,
        lu: false,
      });
      sent++;
    }

    // Audit
    await ctx.db.insert("audit", {
      userId: args.expediteurId,
      action: "send_to_classe",
      table: "messages",
      documentId: args.ecoleId,
      date: now,
      ecoleId: args.ecoleId,
      details: `Message envoyé à ${sent} élève(s) de ${classe}${
        skipped ? `, ${skipped} ignoré(s)` : ""
      }`,
    });

    return { success: true, sent, skipped };
  },
});

export const generateUploadUrl = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const caller = await ctx.db.get(args.userId);
    if (!caller) throw new Error("Authentification requise");
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * ✨ Retourne l'URL publique d'un fichier stocké.
 * Utilisé après un upload pour construire la vraie URL (au lieu
 * de l'URL d'upload temporaire).
 */
export const getStorageUrl = mutation({
  args: {
    userId: v.id("users"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const caller = await ctx.db.get(args.userId);
    if (!caller) throw new Error("Authentification requise");

    const url = await ctx.storage.getUrl(args.storageId);
    if (!url) throw new Error("Fichier introuvable");

    return { url };
  },
});

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
          storageId: v.optional(v.string()), // ✨ AJOUTÉ
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

    // ✨ Autoriser contenu vide si PJ présente
    const hasPJ = !!args.piecesJointes && args.piecesJointes.length > 0;
    const contenu = validateContenu(args.contenu, hasPJ);
    validatePiecesJointes(args.piecesJointes);

    // ✅ FIX SÉCURITÉ : valider le groupeId
    const groupeId = args.groupeId.trim();
    if (!groupeId || groupeId.length > 100) {
      throw new Error("Identifiant de groupe invalide.");
    }

    // ✨ Fallback
    const contenuFinal = contenu || "(pièce jointe)";

    const messageId = await ctx.db.insert("messages", {
      ecoleId: args.ecoleId,
      expediteurId: args.expediteurId,
      contenu: contenuFinal,
      groupeId,
      date: new Date().toISOString(),
      lu: false,
      piecesJointes: args.piecesJointes,
    });

    return { success: true, messageId };
  },
});