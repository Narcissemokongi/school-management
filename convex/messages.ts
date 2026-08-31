import { query, mutation, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Vérifie que l'utilisateur a le droit d'utiliser la messagerie pour l'école spécifiée.
// Le superadmin principal est autorisé partout, sinon le rôle doit être dans la liste
// et l'utilisateur doit appartenir à la même école.
async function requireEcoleRole(
  ctx: MutationCtx,
  userId: string | undefined,
  ecoleId: string,
  allowedRoles: string[]
) {
  if (!userId) throw new Error("Authentification requise");
  const user = await ctx.db.get(userId as Id<"users">);
  if (!user) throw new Error("Utilisateur introuvable");

  const isSuperAdminPrincipal =
    (user.role === "admin" && !user.ecoleId) ||
    (user.role === "superAdmin" && (!user.permissions || user.permissions.length === 0));

  if (isSuperAdminPrincipal) return user;

  if (!allowedRoles.includes(user.role)) {
    throw new Error("Accès refusé : rôle insuffisant");
  }

  if (user.ecoleId !== ecoleId) {
    throw new Error("Accès refusé : vous n'appartenez pas à cette école.");
  }

  return user;
}

// ========== QUERIES ==========

// Messages reçus par un utilisateur
export const listRecus = query({
  args: { destinataireId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_destinataire", (q) => q.eq("destinataireId", args.destinataireId))
      .order("desc")
      .collect();
  },
});

// Messages envoyés par un utilisateur
export const listEnvoyes = query({
  args: { expediteurId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_expediteur", (q) => q.eq("expediteurId", args.expediteurId))
      .order("desc")
      .collect();
  },
});

// ========== MUTATIONS ==========

// Envoyer un message direct
export const send = mutation({
  args: {
    ecoleId: v.id("ecoles"),
    expediteurId: v.id("users"),
    destinataireId: v.id("users"),
    contenu: v.string(),
    piecesJointes: v.optional(v.array(v.object({
      nom: v.string(),
      type: v.string(),
      url: v.string(),
    }))),
  },
  handler: async (ctx, args) => {
    // Vérifier l'expéditeur et l'école
    await requireEcoleRole(ctx, args.expediteurId, args.ecoleId, [
      "admin", "directeur", "disciplinaire", "enseignant", "parent", "eleve",
    ]);

    // Vérifier que le destinataire appartient à la même école
    const destinataire = await ctx.db.get(args.destinataireId);
    if (!destinataire || destinataire.ecoleId !== args.ecoleId) {
      throw new Error("Le destinataire n'appartient pas à cette école.");
    }

    const message = {
      ...args,
      date: new Date().toISOString(),
      lu: false,
    };
    const messageId = await ctx.db.insert("messages", message);

    // Envoyer une notification push si le destinataire a un token FCM
    if (destinataire.fcmToken) {
      const expediteur = await ctx.db.get(args.expediteurId);
      const serverKey = process.env.FCM_SERVER_KEY;
      if (serverKey) {
        fetch("https://fcm.googleapis.com/fcm/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `key=${serverKey}`,
          },
          body: JSON.stringify({
            to: destinataire.fcmToken,
            notification: {
              title: `📩 Nouveau message de ${expediteur?.nom}`,
              body: args.contenu.substring(0, 100),
            },
          }),
        }).catch(console.error);
      }
    }

    return messageId;
  },
});

// Marquer un message comme lu
export const markAsRead = mutation({
  args: {
    messageId: v.id("messages"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // Seul le destinataire (ou un admin de l'école) peut marquer comme lu
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message introuvable");

    if (args.userId && message.destinataireId !== args.userId) {
      const user = await ctx.db.get(args.userId as Id<"users">);
      const isAdmin =
        (user?.role === "admin" || user?.role === "directeur" || user?.role === "disciplinaire") &&
        user.ecoleId === message.ecoleId;
      if (!isAdmin) {
        throw new Error("Vous ne pouvez pas marquer ce message comme lu.");
      }
    }

    await ctx.db.patch(args.messageId, { lu: true });
  },
});

// Envoyer un message à tous les parents de l'école
export const sendToAllParents = mutation({
  args: {
    ecoleId: v.id("ecoles"),
    expediteurId: v.id("users"),
    contenu: v.string(),
  },
  handler: async (ctx, args) => {
    await requireEcoleRole(ctx, args.expediteurId, args.ecoleId, [
      "admin", "directeur", "disciplinaire",
    ]);

    const parents = await ctx.db
      .query("users")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId))
      .filter((q) => q.eq(q.field("role"), "parent"))
      .collect();

    if (parents.length === 0) throw new Error("Aucun parent trouvé dans cette école.");

    const now = new Date().toISOString();
    for (const parent of parents) {
      await ctx.db.insert("messages", {
        ecoleId: args.ecoleId,
        expediteurId: args.expediteurId,
        destinataireId: parent._id,
        contenu: args.contenu,
        date: now,
        lu: false,
      });
    }

    return parents.length;
  },
});

// Générer une URL d'upload
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// Envoyer un message à un groupe
export const sendToGroupe = mutation({
  args: {
    ecoleId: v.id("ecoles"),
    expediteurId: v.id("users"),
    contenu: v.string(),
    groupeId: v.string(),
    piecesJointes: v.optional(v.array(v.object({
      nom: v.string(),
      type: v.string(),
      url: v.string(),
    }))),
  },
  handler: async (ctx, args) => {
    await requireEcoleRole(ctx, args.expediteurId, args.ecoleId, [
      "admin", "directeur", "disciplinaire", "enseignant", "eleve",
    ]);

    return await ctx.db.insert("messages", {
      ecoleId: args.ecoleId,
      expediteurId: args.expediteurId,
      contenu: args.contenu,
      groupeId: args.groupeId,
      date: new Date().toISOString(),
      lu: false,
      piecesJointes: args.piecesJointes,
    });
  },
});

// Lister les messages d'un groupe (ordre chronologique)
export const listByGroupe = query({
  args: {
    ecoleId: v.id("ecoles"),
    groupeId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_groupeId", (q) => q.eq("groupeId", args.groupeId))
      .filter((q) => q.eq(q.field("ecoleId"), args.ecoleId))
      .order("desc")
      .take(args.limit ?? 100);
    return messages.reverse();
  },
});