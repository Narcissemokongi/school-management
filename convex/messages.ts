import { query, mutation, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "../convex/_generated/dataModel";

async function requireRole(ctx: MutationCtx, userId: string | undefined, allowedRoles: string[]) {
  if (!userId) throw new Error("Authentification requise");
  const user = await ctx.db.get(userId as Id<"users">);
  if (!user || !allowedRoles.includes(user.role)) {
    throw new Error("Accès refusé : rôle insuffisant");
  }
  return user;
}

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
    await requireRole(ctx, args.expediteurId, ["admin", "directeur", "disciplinaire", "enseignant", "parent", "eleve"]);

    const message = {
      ...args,
      date: new Date().toISOString(),
      lu: false,
    };
    const messageId = await ctx.db.insert("messages", message);

    // Envoyer une push au destinataire
    const destinataire = await ctx.db.get(args.destinataireId);
    if (destinataire && "fcmToken" in destinataire && destinataire.fcmToken) {
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

export const markAsRead = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, { lu: true });
  },
});

export const sendToAllParents = mutation({
  args: {
    ecoleId: v.id("ecoles"),
    expediteurId: v.id("users"),
    contenu: v.string(),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.expediteurId, ["admin", "directeur", "disciplinaire"]);

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

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// Envoyer un message à un groupe
// Envoyer un message de groupe
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
    await requireRole(ctx, args.expediteurId, ["admin", "directeur", "disciplinaire", "enseignant", "eleve"]);
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

// Lister les messages d’un groupe
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
    return messages.reverse(); // ordre chronologique
  },
});