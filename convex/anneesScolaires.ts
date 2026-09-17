import { query, mutation, MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

type AnyCtx = MutationCtx | QueryCtx;

const MAX_ANNEES = 200;
const MAX_DEPENDENCIES = 1; // On arrête dès la 1ère dépendance trouvée

/**
 * Type helper pour accéder aux champs user sans que TS infère un union
 * de toutes les tables.
 */
type UserDoc = {
  _id: Id<"users">;
  role: string;
  ecoleId?: Id<"ecoles">;
  permissions?: string[];
};

// 🟢 FIX : helper pour charger un user avec typage propre
async function getUser(
  ctx: AnyCtx,
  userId: string | undefined
): Promise<UserDoc | null> {
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

// Vérifie que l'utilisateur est admin/directeur de l'école ou superAdmin
async function requireEcoleAdmin(
  ctx: AnyCtx,
  userId: string | undefined,
  ecoleId: string
) {
  const user = await getUser(ctx, userId);
  if (!user) throw new Error("Authentification requise");

  const superAdmin = isSuperAdmin(user);
  const isEcoleAdmin =
    (user.role === "admin" || user.role === "directeur") &&
    user.ecoleId === ecoleId;

  if (!superAdmin && !isEcoleAdmin) {
    throw new Error("Accès refusé : vous n'êtes pas autorisé à gérer cette école.");
  }
  return user;
}

// 🟢 FIX : helper cloisonnement pour les queries
async function assertEcoleAccess(
  ctx: AnyCtx,
  userId: string | undefined,
  ecoleId: string
) {
  if (!userId) return; // pas de userId → pas de vérif (legacy)
  const caller = await getUser(ctx, userId);
  if (!caller) throw new Error("Authentification requise");
  if (isSuperAdmin(caller)) return;
  if (!caller.ecoleId) throw new Error("Accès refusé");
  if (caller.ecoleId !== ecoleId) {
    throw new Error("Accès refusé : école différente.");
  }
}

// ============================================================
// QUERIES
// ============================================================

/**
 * ✅ FIX : `userId` optionnel + cloisonnement si fourni.
 */
export const getActive = query({
  args: {
    ecoleId: v.id("ecoles"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    await assertEcoleAccess(ctx, args.userId, args.ecoleId);

    return await ctx.db
      .query("anneesScolaires")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId))
      .filter((q) => q.eq(q.field("estActive"), true))
      .first();
  },
});

/**
 * ✅ FIX : `userId` optionnel + cloisonnement.
 * 🔴 Avant : n'importe qui pouvait lire n'importe quelle année par son ID.
 */
export const getById = query({
  args: {
    anneeId: v.id("anneesScolaires"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const annee = await ctx.db.get(args.anneeId);
    if (!annee) return null;

    // 🟡 Si userId fourni, vérifier le cloisonnement
    if (args.userId) {
      const caller = await getUser(ctx, args.userId);
      if (!caller) throw new Error("Authentification requise");
      if (!isSuperAdmin(caller)) {
        if (caller.ecoleId !== annee.ecoleId) {
          throw new Error("Accès refusé : école différente.");
        }
      }
    }

    return annee;
  },
});

/**
 * ✅ FIX : `userId` optionnel + cloisonnement.
 * 🟢 FIX : `.take(MAX_ANNEES)`.
 */
export const listByEcole = query({
  args: {
    ecoleId: v.id("ecoles"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    await assertEcoleAccess(ctx, args.userId, args.ecoleId);

    return await ctx.db
      .query("anneesScolaires")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId))
      .take(MAX_ANNEES);
  },
});

/**
 * 🟢 FIX : alias propre (Convex n'aime pas `export const list = listByEcole`)
 * → duplication explicite pour éviter tout problème de build.
 */
export const list = query({
  args: {
    ecoleId: v.id("ecoles"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    await assertEcoleAccess(ctx, args.userId, args.ecoleId);

    return await ctx.db
      .query("anneesScolaires")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId))
      .take(MAX_ANNEES);
  },
});

// ============================================================
// MUTATIONS
// ============================================================

/**
 * 🟡 FIX : `userId` REQUIS + audit + limite de désactivation en masse.
 */
export const add = mutation({
  args: {
    nom: v.string(),
    ecoleId: v.id("ecoles"),
    estActive: v.boolean(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireEcoleAdmin(ctx, args.userId, args.ecoleId);

    const nom = args.nom.trim();
    if (!nom) throw new Error("Le nom de l'année est requis.");

    // Vérifier les doublons
    const existing = await ctx.db
      .query("anneesScolaires")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId))
      .filter((q) => q.eq(q.field("nom"), nom))
      .first();
    if (existing) {
      throw new Error("Une année avec ce nom existe déjà pour cette école.");
    }

    if (args.estActive) {
      const actives = await ctx.db
        .query("anneesScolaires")
        .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId))
        .filter((q) => q.eq(q.field("estActive"), true))
        .take(MAX_ANNEES);
      for (const annee of actives) {
        await ctx.db.patch(annee._id, { estActive: false });
      }
    }

    const newId = await ctx.db.insert("anneesScolaires", {
      nom,
      ecoleId: args.ecoleId,
      estActive: args.estActive,
    });

    // 🟡 Audit
    await ctx.db.insert("audit", {
      userId: args.userId,
      action: "create_annee",
      table: "anneesScolaires",
      documentId: newId,
      date: new Date().toISOString(),
      ecoleId: args.ecoleId,
      details: `Création de l'année "${nom}"${args.estActive ? " (active)" : ""}`,
    });

    return { success: true, anneeId: newId };
  },
});

/**
 * 🟡 FIX : `userId` REQUIS + audit + `.take()`.
 */
export const setActive = mutation({
  args: {
    anneeId: v.id("anneesScolaires"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const annee = await ctx.db.get(args.anneeId);
    if (!annee) throw new Error("Année introuvable");

    await requireEcoleAdmin(ctx, args.userId, annee.ecoleId);

    // 🟢 FIX : si déjà active, ne rien faire (évite un patch inutile)
    if (annee.estActive) {
      return { success: true, noChange: true };
    }

    const actives = await ctx.db
      .query("anneesScolaires")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", annee.ecoleId))
      .filter((q) => q.eq(q.field("estActive"), true))
      .take(MAX_ANNEES);
    for (const a of actives) {
      await ctx.db.patch(a._id, { estActive: false });
    }

    await ctx.db.patch(args.anneeId, { estActive: true });

    // 🟡 Audit
    await ctx.db.insert("audit", {
      userId: args.userId,
      action: "set_active_annee",
      table: "anneesScolaires",
      documentId: args.anneeId,
      date: new Date().toISOString(),
      ecoleId: annee.ecoleId,
      details: `Année "${annee.nom}" activée`,
    });

    return { success: true };
  },
});

/**
 * 🟡 FIX : `userId` REQUIS + audit.
 */
export const rename = mutation({
  args: {
    id: v.id("anneesScolaires"),
    nom: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const annee = await ctx.db.get(args.id);
    if (!annee) throw new Error("Année introuvable");

    await requireEcoleAdmin(ctx, args.userId, annee.ecoleId);

    const trimmed = args.nom.trim();
    if (!trimmed) throw new Error("Le nom est requis.");

    if (trimmed === annee.nom) {
      return { success: true, noChange: true };
    }

    // Vérifier les doublons
    const existing = await ctx.db
      .query("anneesScolaires")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", annee.ecoleId))
      .filter((q) => q.eq(q.field("nom"), trimmed))
      .first();
    if (existing && existing._id !== args.id) {
      throw new Error("Une année avec ce nom existe déjà.");
    }

    await ctx.db.patch(args.id, { nom: trimmed });

    // 🟡 Audit
    await ctx.db.insert("audit", {
      userId: args.userId,
      action: "rename_annee",
      table: "anneesScolaires",
      documentId: args.id,
      date: new Date().toISOString(),
      ecoleId: annee.ecoleId,
      details: `Renommage : "${annee.nom}" → "${trimmed}"`,
    });

    return { success: true };
  },
});

/**
 * ✅ FIX : `userId` REQUIS + audit (déjà présent) — inchangé mais aligné
 * sur le helper `isSuperAdmin` corrigé.
 */
export const setDateLimitePassage = mutation({
  args: {
    anneeId: v.id("anneesScolaires"),
    dateLimite: v.union(v.string(), v.null()),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const annee = await ctx.db.get(args.anneeId);
    if (!annee) throw new Error("Année introuvable");

    await requireEcoleAdmin(ctx, args.userId, annee.ecoleId);

    // dateLimite = null → retirer la limite
    await ctx.db.patch(args.anneeId, {
      dateLimitePassage: args.dateLimite === null ? undefined : args.dateLimite,
    });

    // Audit
    await ctx.db.insert("audit", {
      userId: args.userId,
      action: "set_date_limite_passage",
      table: "anneesScolaires",
      documentId: args.anneeId,
      date: new Date().toISOString(),
      ecoleId: annee.ecoleId,
      details: args.dateLimite
        ? `Date limite de passage définie : ${args.dateLimite}`
        : "Date limite de passage supprimée",
    });

    return { success: true };
  },
});

/**
 * 🟡 FIX : `userId` REQUIS + audit + `.take(1)` sur les vérifs de dépendance.
 * 🟢 FIX : refuse de supprimer une année active (sécurité supplémentaire).
 */
export const remove = mutation({
  args: {
    id: v.id("anneesScolaires"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const annee = await ctx.db.get(args.id);
    if (!annee) throw new Error("Année introuvable");

    await requireEcoleAdmin(ctx, args.userId, annee.ecoleId);

    // 🟢 FIX : interdire la suppression d'une année active
    if (annee.estActive) {
      throw new Error(
        "Impossible de supprimer l'année active. Activez une autre année d'abord."
      );
    }

    // 🟡 FIX : on prend 1 seul élément pour vérifier l'existence
    const inscriptions = await ctx.db
      .query("inscriptions")
      .withIndex("by_anneeId", (q) => q.eq("anneeId", args.id))
      .take(MAX_DEPENDENCIES);
    if (inscriptions.length > 0) {
      throw new Error("Impossible de supprimer : des inscriptions sont liées à cette année.");
    }

    const notes = await ctx.db
      .query("notes")
      .withIndex("by_anneeId", (q) => q.eq("anneeId", args.id))
      .take(MAX_DEPENDENCIES);
    if (notes.length > 0) {
      throw new Error("Impossible de supprimer : des notes sont liées à cette année.");
    }

    const frais = await ctx.db
      .query("frais")
      .withIndex("by_anneeId", (q) => q.eq("anneeId", args.id))
      .take(MAX_DEPENDENCIES);
    if (frais.length > 0) {
      throw new Error("Impossible de supprimer : des frais sont liés à cette année.");
    }

    const absences = await ctx.db
      .query("absences")
      .withIndex("by_anneeId", (q) => q.eq("anneeId", args.id))
      .take(MAX_DEPENDENCIES);
    if (absences.length > 0) {
      throw new Error("Impossible de supprimer : des absences sont liées à cette année.");
    }

    const punitions = await ctx.db
      .query("punitions")
      .withIndex("by_anneeId", (q) => q.eq("anneeId", args.id))
      .take(MAX_DEPENDENCIES);
    if (punitions.length > 0) {
      throw new Error("Impossible de supprimer : des punitions sont liées à cette année.");
    }

    await ctx.db.delete(args.id);

    // 🟡 Audit
    await ctx.db.insert("audit", {
      userId: args.userId,
      action: "delete_annee",
      table: "anneesScolaires",
      documentId: args.id,
      date: new Date().toISOString(),
      ecoleId: annee.ecoleId,
      details: `Suppression de l'année "${annee.nom}"`,
    });

    return { success: true };
  },
});