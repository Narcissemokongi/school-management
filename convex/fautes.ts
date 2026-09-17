import { query, mutation, MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

type AnyCtx = MutationCtx | QueryCtx;

const MAX_FAUTES = 500;

type UserDoc = {
  _id: Id<"users">;
  role: string;
  ecoleId?: Id<"ecoles">;
  permissions?: string[];
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

// Vérifie que l'utilisateur est admin de l'école ou superAdmin
async function requireEcoleAdmin(
  ctx: AnyCtx,
  userId: string | undefined,
  ecoleId: string
) {
  const user = await getUser(ctx, userId);
  if (!user) throw new Error("Authentification requise");

  const superAdmin = isSuperAdmin(user);
  const isEcoleAdmin = user.role === "admin" && user.ecoleId === ecoleId;

  if (!superAdmin && !isEcoleAdmin) {
    throw new Error(
      "Accès refusé : vous n'êtes pas autorisé à gérer les fautes de cette école."
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

// ========== QUERY ==========

/**
 * 🔴 FIX : `userId` optionnel + cloisonnement.
 * 🔴 Avant : si `ecoleId` absent, retournait TOUTES les fautes de TOUTES
 * les écoles (fuite de données multi-tenant).
 * 🟢 FIX : `.take(MAX_FAUTES)`.
 */
export const list = query({
  args: {
    ecoleId: v.optional(v.id("ecoles")),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const { ecoleId, userId } = args;

    let targetEcoleId = ecoleId;

    // 🟡 Cloisonnement si userId fourni
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

    if (targetEcoleId) {
      return await ctx.db
        .query("fautes")
        .withIndex("by_ecoleId", (q) => q.eq("ecoleId", targetEcoleId!))
        .take(MAX_FAUTES);
    }

    // 🟢 FIX : refuse l'appel sans auth (au lieu de tout retourner)
    if (!userId) {
      throw new Error("Authentification requise pour lister les fautes.");
    }
    return await ctx.db.query("fautes").take(MAX_FAUTES);
  },
});

// ========== MUTATIONS ==========

/**
 * 🟡 FIX : `userId` REQUIS + validation + doublon + audit + retour `{ fauteId }`.
 */
export const add = mutation({
  args: {
    libelle: v.string(),
    gravite: v.union(v.literal("Légère"), v.literal("Moyenne"), v.literal("Grave")),
    ecoleId: v.id("ecoles"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireEcoleAdmin(ctx, args.userId, args.ecoleId);

    const libelle = args.libelle.trim();
    if (!libelle) {
      throw new Error("Le libellé de la faute est requis.");
    }

    // 🟢 FIX : vérifier les doublons
    const existing = await ctx.db
      .query("fautes")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId))
      .filter((q) => q.eq(q.field("libelle"), libelle))
      .first();
    if (existing) {
      throw new Error("Cette faute existe déjà pour cette école.");
    }

    const newId = await ctx.db.insert("fautes", {
      libelle,
      gravite: args.gravite,
      ecoleId: args.ecoleId,
    });

    // 🟡 Audit
    await ctx.db.insert("audit", {
      userId: args.userId,
      action: "create_faute",
      table: "fautes",
      documentId: newId,
      date: new Date().toISOString(),
      ecoleId: args.ecoleId,
      details: `Création de la faute "${libelle}" (${args.gravite})`,
    });

    return { success: true, fauteId: newId };
  },
});

/**
 * 🟡 FIX : `userId` REQUIS + refuse no-op + doublon + audit.
 */
export const update = mutation({
  args: {
    id: v.id("fautes"),
    libelle: v.string(),
    gravite: v.union(v.literal("Légère"), v.literal("Moyenne"), v.literal("Grave")),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const faute = await ctx.db.get(args.id);
    if (!faute) throw new Error("Faute introuvable");

    await requireEcoleAdmin(ctx, args.userId, faute.ecoleId);

    const libelle = args.libelle.trim();
    if (!libelle) {
      throw new Error("Le libellé de la faute est requis.");
    }

    // 🟢 FIX : refuse no-op
    if (libelle === faute.libelle && args.gravite === faute.gravite) {
      return { success: true, noChange: true };
    }

    // 🟢 FIX : vérifier les doublons si le libellé change
    if (libelle !== faute.libelle) {
      const existing = await ctx.db
        .query("fautes")
        .withIndex("by_ecoleId", (q) => q.eq("ecoleId", faute.ecoleId))
        .filter((q) => q.eq(q.field("libelle"), libelle))
        .first();
      if (existing && existing._id !== args.id) {
        throw new Error("Une faute avec ce libellé existe déjà.");
      }
    }

    await ctx.db.patch(args.id, {
      libelle,
      gravite: args.gravite,
    });

    // 🟡 Audit
    const changes: string[] = [];
    if (libelle !== faute.libelle)
      changes.push(`libellé: "${faute.libelle}" → "${libelle}"`);
    if (args.gravite !== faute.gravite)
      changes.push(`gravité: ${faute.gravite} → ${args.gravite}`);

    await ctx.db.insert("audit", {
      userId: args.userId,
      action: "update_faute",
      table: "fautes",
      documentId: args.id,
      date: new Date().toISOString(),
      ecoleId: faute.ecoleId,
      details: changes.join(" · ") || "Mise à jour",
    });

    return { success: true };
  },
});

/**
 * 🟡 FIX : `userId` REQUIS + audit systématique + vérif dépendances.
 * 🟢 FIX : refuse si la faute est utilisée dans des punitions.
 */
export const remove = mutation({
  args: {
    id: v.id("fautes"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const faute = await ctx.db.get(args.id);
    if (!faute) throw new Error("Faute introuvable");

    await requireEcoleAdmin(ctx, args.userId, faute.ecoleId);

    // 🟢 FIX : vérif dépendances — les punitions référencent `idFaute`
    const punitionsLiees = await ctx.db
      .query("punitions")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", faute.ecoleId))
      .filter((q) => q.eq(q.field("idFaute"), args.id))
      .take(1);

    if (punitionsLiees.length > 0) {
      throw new Error(
        "Cette faute est utilisée dans des punitions. Supprimez-les d'abord."
      );
    }

    await ctx.db.delete(args.id);

    // 🟡 Audit systématique
    await ctx.db.insert("audit", {
      userId: args.userId,
      action: "delete_faute",
      table: "fautes",
      documentId: args.id,
      date: new Date().toISOString(),
      ecoleId: faute.ecoleId,
      details: `Suppression de la faute "${faute.libelle}" (${faute.gravite})`,
    });

    return { success: true };
  },
});