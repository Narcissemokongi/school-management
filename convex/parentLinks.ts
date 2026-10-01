import { v } from "convex/values";
import { mutation, query, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";

// ════════════════════════════════════════════════════════════════════
// Helpers internes
// ════════════════════════════════════════════════════════════════════

/**
 * Vérifie que l'appelant est admin d'école (même école que l'élève)
 * ou super admin principal.
 *
 * CORRECTIF : un superAdmin AVEC permissions était rejeté à tort par
 * l'ancienne version. Désormais tout superAdmin passe.
 */
async function assertAdminEcole(
  ctx: MutationCtx,
  adminId: Id<"users">,
  eleveId: Id<"eleves">
) {
  const admin = await ctx.db.get(adminId);
  if (!admin) throw new Error("Admin introuvable");

  const isSuperAdmin =
    admin.role === "superAdmin" ||
    (admin.role === "admin" && !admin.ecoleId);

  const isAdminEcole =
    !!admin.ecoleId &&
    (admin.role === "admin" || admin.role === "directeur");

  if (!isSuperAdmin && !isAdminEcole) {
    throw new Error("Non autorisé");
  }

  const eleve = await ctx.db.get(eleveId);
  if (!eleve) throw new Error("Élève introuvable");

  if (isAdminEcole && admin.ecoleId !== eleve.ecoleId) {
    throw new Error(
      "Vous n'êtes pas autorisé à gérer cet élève (école différente)."
    );
  }
}

/**
 * Variante sans vérification d'élève — utile pour les boucles
 * (évite N lectures admin identiques).
 */
async function assertAdmin(ctx: MutationCtx, adminId: Id<"users">) {
  const admin = await ctx.db.get(adminId);
  if (!admin) throw new Error("Admin introuvable");

  const isSuperAdmin =
    admin.role === "superAdmin" ||
    (admin.role === "admin" && !admin.ecoleId);

  const isAdminEcole =
    !!admin.ecoleId &&
    (admin.role === "admin" || admin.role === "directeur");

  if (!isSuperAdmin && !isAdminEcole) throw new Error("Non autorisé");

  return { admin, isSuperAdmin };
}

/**
 * Audit — ⚠️ À ADAPTER au schéma réel de ta table `audit`.
 * Échec silencieux volontaire : on ne casse jamais une action métier
 * parce que l'audit a échoué.
 */
async function logAudit(
  ctx: MutationCtx,
  userId: Id<"users">,
  action: string,
  targetId: string,
  details?: Record<string, unknown>
) {
  try {
    await ctx.db.insert("audit", {
      userId,
      action,
      targetId,
      details: details ? JSON.stringify(details) : undefined,
      timestamp: Date.now(),
    } as any); // ⚠️ retire le `as any` quand le shape sera aligné
  } catch (err) {
    console.error("[parentLinks] audit failed:", err);
  }
}

// ════════════════════════════════════════════════════════════════════
// Côté parent
// ════════════════════════════════════════════════════════════════════

export const createParentLinkRequest = mutation({
  args: {
    parentId: v.id("users"),
    eleveMatricule: v.string(),
  },
  handler: async (ctx, args) => {
    // ✅ FIX SÉCURITÉ : rate limiting anti-spam (5 tentatives / minute par parent)
    const { allowed } = await ctx.runMutation(internal.rateLimit.checkRateLimit, {
      key: `parentLinkRequest:${args.parentId}`,
      maxRequests: 5,
      windowMs: 60_000,
    });
    if (!allowed) {
      throw new Error("Trop de demandes. Veuillez patienter une minute.");
    }

    const parent = await ctx.db.get(args.parentId);
    if (!parent || parent.role !== "parent") {
      throw new Error("Parent introuvable");
    }

    // ✅ FIX SÉCURITÉ : valider la longueur du matricule
    const matricule = args.eleveMatricule.trim().toUpperCase();
    if (!matricule || matricule.length < 4 || matricule.length > 20) {
      throw new Error("Matricule invalide.");
    }

    const eleve = await ctx.db
      .query("eleves")
      .withIndex("by_code", (q) =>
        q.eq("code", matricule)
      )
      .first();
    if (!eleve) throw new Error("Matricule invalide.");

    if (parent.ecoleId !== eleve.ecoleId) {
      throw new Error("Vous n'appartenez pas à la même école que cet élève.");
    }

    if (eleve.parentId) {
      if (eleve.parentId === args.parentId) {
        throw new Error("Vous êtes déjà associé à cet enfant.");
      }
      throw new Error("Cet enfant est déjà associé à un parent.");
    }

    const existing = await ctx.db
      .query("parentLinkRequests")
      .withIndex("by_eleveId", (q) => q.eq("eleveId", eleve._id))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .first();
    if (existing) {
      throw new Error("Une demande est déjà en attente pour cet enfant.");
    }

    await ctx.db.insert("parentLinkRequests", {
      parentId: args.parentId,
      eleveId: eleve._id,
      ecoleId: eleve.ecoleId, // ← dénormalisé (fix perf)
      status: "pending",
      createdAt: new Date().toISOString(),
    });

    return { success: true };
  },
});

export const listByParent = query({
  // ✅ FIX SÉCURITÉ C7 : ajout callerId — tout le monde pouvait voir les
  // demandes de lien parent/enfant de n'importe quel parent
  args: {
    parentId: v.id("users"),
    callerId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const caller = await ctx.db.get(args.callerId);
    if (!caller) throw new Error("Authentification requise");

    const isSuperAdmin =
      caller.role === "superAdmin" ||
      (caller.role === "admin" && !caller.ecoleId);

    const isAdminEcole =
      !!caller.ecoleId &&
      (caller.role === "admin" || caller.role === "directeur");

    // Seuls le parent lui-même, un admin de son école ou un superAdmin peuvent voir
    const isSelf = args.callerId === args.parentId;
    if (!isSelf && !isSuperAdmin && !isAdminEcole) {
      throw new Error("Accès refusé : vous ne pouvez consulter que vos propres demandes.");
    }

    const requests = await ctx.db
      .query("parentLinkRequests")
      .withIndex("by_parentId", (q) => q.eq("parentId", args.parentId))
      .take(200);

    return requests.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
});

// ════════════════════════════════════════════════════════════════════
// Côté admin
// ════════════════════════════════════════════════════════════════════

/**
 * 🔴 SÉCURITÉ — `adminId` désormais requis.
 * L'ancien paramètre `ecoleId` (fourni par le client) permettait à
 * n'importe qui de lire les demandes de toutes les écoles.
 *
 * ⚠️ L'ancienne signature est SUPPRIMÉE. Le frontend DOIT être mis à
 * jour en même temps que ce déploiement :
 *   useQuery(api.parentLinks.listAll, { adminId: user._id, status })
 */
export const listAll = query({
  args: {
    adminId: v.id("users"),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("approved"),
        v.literal("rejected"),
        v.literal("all")
      )
    ),
  },
  handler: async (ctx, args) => {
    const admin = await ctx.db.get(args.adminId);
    if (!admin) {
      throw new Error(
        "Session expirée ou version obsolète. Rechargez l'application."
      );
    }

    const isSuperAdmin =
      admin.role === "superAdmin" ||
      (admin.role === "admin" && !admin.ecoleId);

    const isAdminEcole =
      !!admin.ecoleId &&
      (admin.role === "admin" || admin.role === "directeur");

    if (!isSuperAdmin && !isAdminEcole) {
      throw new Error("Non autorisé");
    }

    const statusFilter =
      args.status && args.status !== "all" ? args.status : undefined;

    // Filtrage école via index dénormalisé
    if (!isSuperAdmin && admin.ecoleId) {
      if (statusFilter) {
        return await ctx.db
          .query("parentLinkRequests")
          .withIndex("by_ecoleId_status", (q) =>
            q.eq("ecoleId", admin.ecoleId).eq("status", statusFilter)
          )
          .take(500);
      }
      return await ctx.db
        .query("parentLinkRequests")
        .withIndex("by_ecoleId", (q) => q.eq("ecoleId", admin.ecoleId))
        .take(500);
    }

    // Super admin : tout voir
    if (statusFilter) {
      return await ctx.db
        .query("parentLinkRequests")
        .withIndex("by_status", (q) => q.eq("status", statusFilter))
        .take(500);
    }
    return await ctx.db.query("parentLinkRequests").take(500);
  },
});

export const approveParentLinkRequest = mutation({
  args: {
    requestId: v.id("parentLinkRequests"),
    adminId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request || request.status !== "pending") {
      throw new Error("Demande introuvable");
    }

    await assertAdminEcole(ctx, args.adminId, request.eleveId);

    // 🔴 FIX : empêche l'écrasement silencieux d'un parent existant
    const eleve = await ctx.db.get(request.eleveId);
    if (!eleve) throw new Error("Élève introuvable");

    if (eleve.parentId && eleve.parentId !== request.parentId) {
      throw new Error(
        "Cet élève est déjà associé à un autre parent. Détachez-le d'abord."
      );
    }

    await ctx.db.patch(request.eleveId, { parentId: request.parentId });
    await ctx.db.patch(args.requestId, {
      status: "approved",
      reviewedBy: args.adminId,
    });

    await logAudit(ctx, args.adminId, "approve_parent_link", args.requestId, {
      eleveId: request.eleveId,
      parentId: request.parentId,
    });

    return { success: true };
  },
});

export const rejectParentLinkRequest = mutation({
  args: {
    requestId: v.id("parentLinkRequests"),
    adminId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request || request.status !== "pending") {
      throw new Error("Demande introuvable");
    }

    await assertAdminEcole(ctx, args.adminId, request.eleveId);

    await ctx.db.patch(args.requestId, {
      status: "rejected",
      reviewedBy: args.adminId,
    });

    await logAudit(ctx, args.adminId, "reject_parent_link", args.requestId, {
      eleveId: request.eleveId,
      parentId: request.parentId,
    });

    return { success: true };
  },
});

/**
 * Association en masse. Retourne désormais un rapport détaillé
 * (fix #4) : l'admin sait ce qui a échoué et pourquoi.
 */
export const linkEnfantsToParent = mutation({
  args: {
    parentId: v.id("users"),
    eleveIds: v.array(v.id("eleves")),
    adminId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const parent = await ctx.db.get(args.parentId);
    if (!parent || parent.role !== "parent") {
      throw new Error("Parent introuvable");
    }

    const { admin, isSuperAdmin } = await assertAdmin(ctx, args.adminId);

    const attached: { id: Id<"eleves">; nom: string }[] = [];
    const skipped: { id: Id<"eleves">; reason: string }[] = [];

    for (const eleveId of args.eleveIds) {
      const eleve = await ctx.db.get(eleveId);
      if (!eleve) {
        skipped.push({ id: eleveId, reason: "introuvable" });
        continue;
      }
      if (eleve.parentId) {
        skipped.push({ id: eleveId, reason: "déjà associé à un parent" });
        continue;
      }
      if (!isSuperAdmin && admin.ecoleId !== eleve.ecoleId) {
        skipped.push({ id: eleveId, reason: "école différente de la vôtre" });
        continue;
      }
      if (parent.ecoleId !== eleve.ecoleId) {
        skipped.push({ id: eleveId, reason: "parent d'une autre école" });
        continue;
      }

      await ctx.db.patch(eleveId, { parentId: args.parentId });
      attached.push({ id: eleveId, nom: eleve.nom });
    }

    if (attached.length > 0) {
      await logAudit(
        ctx,
        args.adminId,
        "link_enfants_to_parent",
        args.parentId,
        {
          attached: attached.map((a) => a.id),
          skippedCount: skipped.length,
        }
      );
    }

    return {
      success: true,
      attached: attached.length,
      skipped,
    };
  },
});

export const unlinkParent = mutation({
  args: {
    eleveId: v.id("eleves"),
    adminId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await assertAdminEcole(ctx, args.adminId, args.eleveId);

    const eleve = await ctx.db.get(args.eleveId);
    if (!eleve || !eleve.parentId) {
      throw new Error("Aucun parent associé à cet enfant.");
    }

    const previousParentId = eleve.parentId;
    await ctx.db.patch(args.eleveId, { parentId: undefined });

    await logAudit(ctx, args.adminId, "unlink_parent", args.eleveId, {
      previousParentId,
    });

    return { success: true };
  },
});

// ════════════════════════════════════════════════════════════════════
// Migration one-shot — à exécuter UNE SEULE FOIS après déploiement
// du schéma avec `ecoleId` optionnel.
// ════════════════════════════════════════════════════════════════════

export const backfillParentLinkEcoleId = mutation({
  // ✅ FIX SÉCURITÉ C6 : mutation de migration sans aucune auth → ajout admin obligatoire
  args: { adminId: v.id("users") },
  handler: async (ctx, args) => {
    const { isSuperAdmin: isSuper } = await assertAdmin(ctx, args.adminId);
    if (!isSuper) throw new Error("Réservé au super-admin.");

    const requests = await ctx.db.query("parentLinkRequests").take(500);
    let updated = 0;

    for (const req of requests) {
      if (req.ecoleId) continue;
      const eleve = await ctx.db.get(req.eleveId);
      if (!eleve) continue;
      await ctx.db.patch(req._id, { ecoleId: eleve.ecoleId });
      updated += 1;
    }

    return { updated, remaining: Math.max(0, requests.length - updated) };
  },
});