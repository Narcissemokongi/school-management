import { query, mutation, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "../convex/_generated/dataModel";

async function requireRole(
  ctx: MutationCtx,
  userId: string | undefined,
  allowedRoles: string[]
) {
  if (!userId) throw new Error("Authentification requise");
  const user = await ctx.db.get(userId as Id<"users">);
  if (!user || !allowedRoles.includes(user.role)) {
    throw new Error("Accès refusé : rôle insuffisant");
  }
  return user;
}

export const list = query({
  args: {
    ecoleId: v.optional(v.id("ecoles")),
    anneeId: v.optional(v.id("anneesScolaires")),
  },
  handler: async (ctx, args) => {
    if (args.anneeId) {
      let q = ctx.db
        .query("punitions")
        .withIndex("by_anneeId", (q) => q.eq("anneeId", args.anneeId!));
      if (args.ecoleId) {
        q = q.filter((q) => q.eq(q.field("ecoleId"), args.ecoleId!));
      }
      return await q.collect();
    }
    if (args.ecoleId) {
      return await ctx.db
        .query("punitions")
        .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId!))
        .collect();
    }
    return await ctx.db.query("punitions").collect();
  },
});

export const listByEleves = query({
  args: {
    eleveIds: v.array(v.id("eleves")),
    anneeId: v.optional(v.id("anneesScolaires")),
  },
  handler: async (ctx, args) => {
    if (args.eleveIds.length === 0) return [];
    const promises = args.eleveIds.map((eleveId) => {
      let q = ctx.db
        .query("punitions")
        .withIndex("by_eleveId", (q) => q.eq("idEleve", eleveId));
      if (args.anneeId) {
        q = q.filter((q) => q.eq(q.field("anneeId"), args.anneeId!));
      }
      return q.collect();
    });
    const results = await Promise.all(promises);
    return results.flat();
  },
});

export const add = mutation({
  args: {
    ecoleId: v.id("ecoles"),
    idEleve: v.id("eleves"),
    idFaute: v.id("fautes"),
    date: v.string(),
    sanction: v.string(),
    commentaire: v.optional(v.string()),
    disciplinaire: v.string(),
    anneeId: v.optional(v.id("anneesScolaires")),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.userId, [
      "admin",
      "directeur",
      "disciplinaire",
      "enseignant",
    ]);

    const punitionId = await ctx.db.insert("punitions", {
      ecoleId: args.ecoleId,
      idEleve: args.idEleve,
      idFaute: args.idFaute,
      date: args.date,
      sanction: args.sanction,
      commentaire: args.commentaire,
      disciplinaire: args.disciplinaire,
      anneeId: args.anneeId,
    });

    // Envoyer une push si la faute est grave et que l'élève a un parent avec un token FCM
    const faute = await ctx.db.get(args.idFaute);
    if (faute?.gravite === "Grave") {
      const eleve = await ctx.db.get(args.idEleve);
      if (eleve?.parentId) {
        const parent = await ctx.db.get(eleve.parentId);
        if (parent && "fcmToken" in parent && parent.fcmToken) {
          const serverKey = process.env.FCM_SERVER_KEY;
          if (serverKey) {
            fetch("https://fcm.googleapis.com/fcm/send", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `key=${serverKey}`,
              },
              body: JSON.stringify({
                to: parent.fcmToken,
                notification: {
                  title: "⚠️ Punition grave",
                  body: `${eleve.nom} ${eleve.postnom} : ${faute.libelle}`,
                },
              }),
            }).catch(console.error);
          }
        }
      }
    }

    return punitionId;
  },
});

// Ajoutez ici vos éventuelles autres mutations (remove, update) si elles existent