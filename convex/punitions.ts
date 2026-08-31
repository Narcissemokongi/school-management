import { query, mutation, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Vérifie que l'utilisateur est autorisé à gérer les punitions de l'école
async function requireEcoleAdmin(
  ctx: MutationCtx,
  userId: string | undefined,
  ecoleId: string
) {
  if (!userId) throw new Error("Authentification requise");
  const user = await ctx.db.get(userId as Id<"users">);
  if (!user) throw new Error("Utilisateur introuvable");

  const isSuperAdminPrincipal =
    (user.role === "admin" && !user.ecoleId) ||
    (user.role === "superAdmin" && (!user.permissions || user.permissions.length === 0));

  const allowedRoles = ["admin", "directeur", "disciplinaire", "enseignant"];
  const isEcoleStaff =
    allowedRoles.includes(user.role) && user.ecoleId === ecoleId;

  if (!isSuperAdminPrincipal && !isEcoleStaff) {
    throw new Error("Accès refusé : vous n'êtes pas autorisé à gérer les punitions de cette école.");
  }
  return user;
}

// ========== QUERIES ==========

// Liste des punitions (filtrée par école et/ou année)
export const list = query({
  args: {
    ecoleId: v.optional(v.id("ecoles")),
    anneeId: v.optional(v.id("anneesScolaires")),
  },
  handler: async (ctx, args) => {
    const { ecoleId, anneeId } = args;

    if (anneeId) {
      let q = ctx.db
        .query("punitions")
        .withIndex("by_anneeId", (q) => q.eq("anneeId", anneeId));
      if (ecoleId) {
        q = q.filter((q) => q.eq(q.field("ecoleId"), ecoleId));
      }
      return await q.collect();
    }

    if (ecoleId) {
      return await ctx.db
        .query("punitions")
        .withIndex("by_ecoleId", (q) => q.eq("ecoleId", ecoleId))
        .collect();
    }

    return await ctx.db.query("punitions").collect();
  },
});

// Liste des punitions pour un ensemble d'élèves
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
        q = q.filter((q) => q.eq(q.field("anneeId"), args.anneeId));
      }
      return q.collect();
    });

    const results = await Promise.all(promises);
    return results.flat();
  },
});

// ========== MUTATIONS ==========

// Ajouter une punition
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
    await requireEcoleAdmin(ctx, args.userId, args.ecoleId);

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

    // Envoyer une notification push si la faute est grave et que le parent a un token FCM
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

// Mettre à jour une punition (utile pour corriger une erreur)
export const update = mutation({
  args: {
    id: v.id("punitions"),
    date: v.optional(v.string()),
    sanction: v.optional(v.string()),
    commentaire: v.optional(v.string()),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const punition = await ctx.db.get(args.id);
    if (!punition) throw new Error("Punition introuvable");

    await requireEcoleAdmin(ctx, args.userId, punition.ecoleId);

    const { id, userId, ...fields } = args;
    await ctx.db.patch(id, fields);
    return { success: true };
  },
});

// Supprimer une punition
export const remove = mutation({
  args: {
    id: v.id("punitions"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const punition = await ctx.db.get(args.id);
    if (!punition) throw new Error("Punition introuvable");

    await requireEcoleAdmin(ctx, args.userId, punition.ecoleId);

    await ctx.db.delete(args.id);
    return { success: true };
  },
});