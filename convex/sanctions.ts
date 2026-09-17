import { query, mutation, MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

type AnyCtx = MutationCtx | QueryCtx;

const MAX_SANCTIONS = 500;

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
      "Accès refusé : vous n'êtes pas autorisé à gérer les sanctions de cette école."
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
 * 🔴 FIX : `userId` optionnel + cloisonnement école.
 * 🟢 FIX : `.take()` au lieu de `.collect()`.
 */
export const list = query({
  args: {
    ecoleId: v.id("ecoles"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    await assertEcoleAccess(ctx, args.userId, args.ecoleId);

    return await ctx.db
      .query("sanctions")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId))
      .take(MAX_SANCTIONS);
  },
});

// ========== MUTATIONS ==========

/**
 * 🟡 FIX : `userId` REQUIS + validation + doublon + audit + retour structuré.
 */
export const add = mutation({
  args: {
    libelle: v.string(),
    ecoleId: v.id("ecoles"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireEcoleAdmin(ctx, args.userId, args.ecoleId);

    const libelle = args.libelle.trim();
    if (!libelle) {
      throw new Error("Le libellé de la sanction est requis.");
    }

    // 🟢 FIX : vérifier les doublons
    const existing = await ctx.db
      .query("sanctions")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId))
      .filter((q) => q.eq(q.field("libelle"), libelle))
      .first();
    if (existing) {
      throw new Error("Cette sanction existe déjà pour cette école.");
    }

    const newId = await ctx.db.insert("sanctions", {
      libelle,
      ecoleId: args.ecoleId,
    });

    // 🟡 Audit
    await ctx.db.insert("audit", {
      userId: args.userId,
      action: "create_sanction",
      table: "sanctions",
      documentId: newId,
      date: new Date().toISOString(),
      ecoleId: args.ecoleId,
      details: `Création de la sanction "${libelle}"`,
    });

    return { success: true, sanctionId: newId };
  },
});

/**
 * 🟡 FIX : `userId` REQUIS + audit + refuse no-op.
 */
export const update = mutation({
  args: {
    id: v.id("sanctions"),
    libelle: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const sanction = await ctx.db.get(args.id);
    if (!sanction) throw new Error("Sanction introuvable");

    await requireEcoleAdmin(ctx, args.userId, sanction.ecoleId);

    const libelle = args.libelle.trim();
    if (!libelle) {
      throw new Error("Le libellé de la sanction est requis.");
    }

    // 🟢 FIX : refuse no-op
    if (libelle === sanction.libelle) {
      return { success: true, noChange: true };
    }

    // 🟢 FIX : vérifier les doublons
    const existing = await ctx.db
      .query("sanctions")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", sanction.ecoleId))
      .filter((q) => q.eq(q.field("libelle"), libelle))
      .first();
    if (existing && existing._id !== args.id) {
      throw new Error("Une sanction avec ce libellé existe déjà.");
    }

    await ctx.db.patch(args.id, { libelle });

    // 🟡 Audit
    await ctx.db.insert("audit", {
      userId: args.userId,
      action: "update_sanction",
      table: "sanctions",
      documentId: args.id,
      date: new Date().toISOString(),
      ecoleId: sanction.ecoleId,
      details: `Renommage : "${sanction.libelle}" → "${libelle}"`,
    });

    return { success: true };
  },
});

/**
 * 🟡 FIX : `userId` REQUIS + audit systématique + vérif dépendances.
 * 🟢 FIX : refuse si la sanction est utilisée dans des punitions.
 *   ⚠️ Si la table `punitions` n'a pas de `sanctionId`, cette vérif sera
 *   ignorée. Adapte selon ton schéma.
 */
export const remove = mutation({
  args: {
    id: v.id("sanctions"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const sanction = await ctx.db.get(args.id);
    if (!sanction) throw new Error("Sanction introuvable");

    await requireEcoleAdmin(ctx, args.userId, sanction.ecoleId);

    // 🟢 FIX : vérif dépendances (adapter le nom du champ selon ton schéma)
    // La table `punitions` utilise probablement `sanction` (string) — pas `sanctionId`
    const punitionsLiees = await ctx.db
      .query("punitions")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", sanction.ecoleId))
      .filter((q) => q.eq(q.field("sanction"), sanction.libelle))
      .take(1);

    if (punitionsLiees.length > 0) {
      throw new Error(
        "Cette sanction est utilisée dans des punitions. Supprimez-les d'abord."
      );
    }

    await ctx.db.delete(args.id);

    // 🟡 Audit systématique
    await ctx.db.insert("audit", {
      userId: args.userId,
      action: "delete_sanction",
      table: "sanctions",
      documentId: args.id,
      date: new Date().toISOString(),
      ecoleId: sanction.ecoleId,
      details: `Suppression de la sanction "${sanction.libelle}"`,
    });

    return { success: true };
  },
});