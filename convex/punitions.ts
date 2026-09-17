import { query, mutation, MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

type AnyCtx = MutationCtx | QueryCtx;

const MAX_PUNITIONS = 500;

type UserDoc = {
  _id: Id<"users">;
  role: string;
  ecoleId?: Id<"ecoles">;
  permissions?: string[];
  fcmToken?: string;
};

async function getUser(ctx: AnyCtx, userId: string | undefined): Promise<UserDoc | null> {
  if (!userId) return null;
  return (await ctx.db.get(userId as Id<"users">)) as UserDoc | null;
}

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

// Vérifie que l'utilisateur est autorisé à gérer les punitions de l'école
async function requireEcoleAdmin(
  ctx: AnyCtx,
  userId: string | undefined,
  ecoleId: string
) {
  const user = await getUser(ctx, userId);
  if (!user) throw new Error("Authentification requise");

  const superAdmin = isSuperAdmin(user);
  const allowedRoles = ["admin", "directeur", "disciplinaire", "enseignant"];
  const isEcoleStaff =
    allowedRoles.includes(user.role) && user.ecoleId === ecoleId;

  if (!superAdmin && !isEcoleStaff) {
    throw new Error(
      "Accès refusé : vous n'êtes pas autorisé à gérer les punitions de cette école."
    );
  }
  return user;
}

// 🟢 FIX : cloisonnement souple pour queries
async function assertEcoleAccess(
  ctx: AnyCtx,
  userId: string | undefined,
  ecoleId: string
) {
  if (!userId) return;
  const caller = await getUser(ctx, userId);
  if (!caller) throw new Error("Authentification requise");
  if (isSuperAdmin(caller)) return;
  if (!caller.ecoleId) throw new Error("Accès refusé");
  if (caller.ecoleId !== ecoleId) {
    throw new Error("Accès refusé : école différente.");
  }
}

// 🟢 FIX : FCM avec timeout (non bloquant)
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
    console.error("[punitions] FCM notification failed:", err);
  } finally {
    clearTimeout(timeoutId);
  }
}

// ========== QUERIES ==========

/**
 * 🔴 FIX : `userId` optionnel + cloisonnement école.
 * 🟢 FIX : `.take()` partout.
 */
export const list = query({
  args: {
    ecoleId: v.optional(v.id("ecoles")),
    anneeId: v.optional(v.id("anneesScolaires")),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const { ecoleId, anneeId, userId } = args;

    // 🟡 Résolution école cible
    let targetEcoleId = ecoleId;
    if (userId) {
      const caller = await getUser(ctx, userId);
      if (!caller) throw new Error("Authentification requise");
      if (!isSuperAdmin(caller)) {
        if (!caller.ecoleId) throw new Error("Accès refusé");
        if (ecoleId && caller.ecoleId !== ecoleId) {
          throw new Error("Accès refusé : école différente.");
        }
        targetEcoleId = caller.ecoleId;
      }
    }

    if (anneeId) {
      let q = ctx.db
        .query("punitions")
        .withIndex("by_anneeId", (q) => q.eq("anneeId", anneeId));
      if (targetEcoleId) {
        q = q.filter((q) => q.eq(q.field("ecoleId"), targetEcoleId));
      }
      return await q.take(MAX_PUNITIONS);
    }

    if (targetEcoleId) {
      return await ctx.db
        .query("punitions")
        .withIndex("by_ecoleId", (q) => q.eq("ecoleId", targetEcoleId!))
        .take(MAX_PUNITIONS);
    }

    // 🟢 FIX : refuse l'appel sans auth (au lieu de tout retourner)
    if (!userId) {
      throw new Error("Authentification requise pour lister les punitions.");
    }
    return await ctx.db.query("punitions").take(MAX_PUNITIONS);
  },
});

/**
 * 🔴 FIX : `userId` optionnel + cloisonnement. On vérifie que chaque
 * élève appartient bien à l'école de l'appelant.
 * 🟡 FIX : `by_eleveId` — le nom d'index était correct mais le champ
 * utilisé pour filtrer était `idEleve` (OK pour `withIndex`).
 */
export const listByEleves = query({
  args: {
    eleveIds: v.array(v.id("eleves")),
    anneeId: v.optional(v.id("anneesScolaires")),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    if (args.eleveIds.length === 0) return [];

    // 🟡 Cloisonnement
    if (args.userId) {
      const caller = await getUser(ctx, args.userId);
      if (!caller) throw new Error("Authentification requise");

      if (!isSuperAdmin(caller)) {
        // Récupérer les élèves et vérifier qu'ils appartiennent tous à l'école
        const eleves = await Promise.all(
          args.eleveIds.slice(0, 100).map((id) => ctx.db.get(id))
        );
        for (const e of eleves) {
          if (e && (e as any).ecoleId !== caller.ecoleId) {
            throw new Error("Accès refusé : un des élèves n'appartient pas à votre école.");
          }
        }
      }
    }

    const promises = args.eleveIds.slice(0, 100).map((eleveId) => {
      let q = ctx.db
        .query("punitions")
        .withIndex("by_eleveId", (q) => q.eq("idEleve", eleveId));
      if (args.anneeId) {
        q = q.filter((q) => q.eq(q.field("anneeId"), args.anneeId!));
      }
      return q.take(MAX_PUNITIONS);
    });

    const results = await Promise.all(promises);
    return results.flat();
  },
});

// ========== MUTATIONS ==========

/**
 * 🟡 FIX : `userId` REQUIS + audit + FCM avec timeout + validation.
 * 🟢 FIX : vérifie que l'élève et la faute appartiennent à la même école.
 */
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
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireEcoleAdmin(ctx, args.userId, args.ecoleId);

    // 🟢 FIX : validation
    if (!args.sanction.trim()) {
      throw new Error("La sanction est requise.");
    }
    if (!args.disciplinaire.trim()) {
      throw new Error("Le nom du disciplinaire est requis.");
    }

    // 🟢 FIX : vérifier que l'élève appartient à l'école
    const eleve = await ctx.db.get(args.idEleve);
    if (!eleve) throw new Error("Élève introuvable");
    if ((eleve as any).ecoleId !== args.ecoleId) {
      throw new Error("L'élève n'appartient pas à cette école.");
    }

    // 🟢 FIX : vérifier que la faute appartient à l'école
    const faute = await ctx.db.get(args.idFaute);
    if (!faute) throw new Error("Faute introuvable");
    if ((faute as any).ecoleId && (faute as any).ecoleId !== args.ecoleId) {
      throw new Error("La faute n'appartient pas à cette école.");
    }

    const punitionId = await ctx.db.insert("punitions", {
      ecoleId: args.ecoleId,
      idEleve: args.idEleve,
      idFaute: args.idFaute,
      date: args.date,
      sanction: args.sanction.trim(),
      commentaire: args.commentaire?.trim(),
      disciplinaire: args.disciplinaire.trim(),
      anneeId: args.anneeId,
    });

    // 🟡 Audit
    await ctx.db.insert("audit", {
      userId: args.userId,
      action: "create_punition",
      table: "punitions",
      documentId: punitionId,
      date: new Date().toISOString(),
      ecoleId: args.ecoleId,
      details: `Punition pour ${eleve.nom} ${eleve.postnom} : ${args.sanction.trim()}`,
    });

    // 🟡 FCM si faute grave
    if (faute.gravite === "Grave" && (eleve as any).parentId) {
      const parent = await getUser(ctx, (eleve as any).parentId);
      if (parent?.fcmToken) {
        await sendFCMNotification(
          parent.fcmToken,
          "⚠️ Punition grave",
          `${eleve.nom} ${eleve.postnom} : ${faute.libelle}`
        );
      }
    }

    return { success: true, punitionId };
  },
});

/**
 * 🟡 FIX : `userId` REQUIS + audit.
 * 🟢 FIX : refuse si aucun champ à mettre à jour.
 */
export const update = mutation({
  args: {
    id: v.id("punitions"),
    date: v.optional(v.string()),
    sanction: v.optional(v.string()),
    commentaire: v.optional(v.string()),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const punition = await ctx.db.get(args.id);
    if (!punition) throw new Error("Punition introuvable");

    await requireEcoleAdmin(ctx, args.userId, punition.ecoleId);

    const { id, userId, ...fields } = args;

    // 🟢 FIX : évite un patch vide
    if (Object.keys(fields).length === 0) {
      return { success: true, noChange: true };
    }

    // 🟢 FIX : validation si sanction fournie
    if (fields.sanction !== undefined && !fields.sanction.trim()) {
      throw new Error("La sanction ne peut pas être vide.");
    }

    if (fields.sanction) fields.sanction = fields.sanction.trim();
    if (fields.commentaire) fields.commentaire = fields.commentaire.trim();

    await ctx.db.patch(id, fields);

    // 🟡 Audit
    const changes: string[] = [];
    if (fields.date && fields.date !== punition.date)
      changes.push(`date: ${punition.date} → ${fields.date}`);
    if (fields.sanction && fields.sanction !== punition.sanction)
      changes.push(`sanction: "${punition.sanction}" → "${fields.sanction}"`);
    if (fields.commentaire !== undefined)
      changes.push("commentaire modifié");

    await ctx.db.insert("audit", {
      userId: args.userId,
      action: "update_punition",
      table: "punitions",
      documentId: id,
      date: new Date().toISOString(),
      ecoleId: punition.ecoleId,
      details: changes.length > 0 ? changes.join(" · ") : "Mise à jour",
    });

    return { success: true };
  },
});

/**
 * 🟡 FIX : `userId` REQUIS + audit + trace détaillée.
 */
export const remove = mutation({
  args: {
    id: v.id("punitions"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const punition = await ctx.db.get(args.id);
    if (!punition) throw new Error("Punition introuvable");

    await requireEcoleAdmin(ctx, args.userId, punition.ecoleId);

    const eleve = await ctx.db.get(punition.idEleve);

    await ctx.db.delete(args.id);

    // 🟡 Audit systématique
    await ctx.db.insert("audit", {
      userId: args.userId,
      action: "delete_punition",
      table: "punitions",
      documentId: args.id,
      date: new Date().toISOString(),
      ecoleId: punition.ecoleId,
      details: `Suppression punition ${(eleve as any)?.nom ?? "?"} ${(eleve as any)?.postnom ?? ""} : ${punition.sanction}`,
    });

    return { success: true };
  },
});