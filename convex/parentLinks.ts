import { v } from "convex/values";
import { mutation, query, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Vérifier que l'utilisateur est admin de la même école que l'élève, ou super admin principal
async function assertAdminEcole(
  ctx: MutationCtx,
  adminId: Id<"users">,
  eleveId: Id<"eleves">
) {
  const admin = await ctx.db.get(adminId);
  if (!admin) throw new Error("Admin introuvable");

  // Super admin principal : role "admin" sans ecoleId, ou role "superAdmin" sans permissions
  const isSuperAdminPrincipal =
    (admin.role === "admin" && !admin.ecoleId) ||
    (admin.role === "superAdmin" && (!admin.permissions || admin.permissions.length === 0));

  // Admin d'école : role "admin" ou "directeur" avec ecoleId
  const isAdminEcole = admin.ecoleId !== undefined && (admin.role === "admin" || admin.role === "directeur");

  if (!isSuperAdminPrincipal && !isAdminEcole) {
    throw new Error("Non autorisé");
  }

  const eleve = await ctx.db.get(eleveId);
  if (!eleve) throw new Error("Élève introuvable");

  if (isAdminEcole && admin.ecoleId !== eleve.ecoleId) {
    throw new Error("Vous n'êtes pas autorisé à gérer cet élève (école différente).");
  }
}

// Créer une demande d'association parent-enfant
export const createParentLinkRequest = mutation({
  args: {
    parentId: v.id("users"),
    eleveMatricule: v.string(),
  },
  handler: async (ctx, args) => {
    const parent = await ctx.db.get(args.parentId);
    if (!parent || parent.role !== "parent") throw new Error("Parent introuvable");

    const eleve = await ctx.db
      .query("eleves")
      .withIndex("by_code", (q) => q.eq("code", args.eleveMatricule.toUpperCase()))
      .first();
    if (!eleve) throw new Error("Matricule invalide.");

    // Vérifier que le parent et l'élève sont de la même école
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
      status: "pending",
      createdAt: new Date().toISOString(),
    });

    return { success: true };
  },
});

// Lister les demandes pour un parent
export const listByParent = query({
  args: { parentId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("parentLinkRequests")
      .withIndex("by_parentId", (q) => q.eq("parentId", args.parentId))
      .collect();
  },
});

// Admin : lister toutes les demandes en attente (filtrées par école si admin d'école)
export const listAllPending = query({
  args: { ecoleId: v.optional(v.id("ecoles")) },
  handler: async (ctx, args) => {
    let requests = await ctx.db
      .query("parentLinkRequests")
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    if (args.ecoleId) {
      const eleveIds = requests.map((r) => r.eleveId);
      const eleves = await Promise.all(eleveIds.map((id) => ctx.db.get(id)));
      requests = requests.filter((req) => {
        const eleve = eleves.find((e) => e && e._id === req.eleveId);
        return eleve?.ecoleId === args.ecoleId;
      });
    }
    return requests;
  },
});

// Admin : approuver une demande
export const approveParentLinkRequest = mutation({
  args: {
    requestId: v.id("parentLinkRequests"),
    adminId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request || request.status !== "pending") throw new Error("Demande introuvable");

    await assertAdminEcole(ctx, args.adminId, request.eleveId);

    await ctx.db.patch(request.eleveId, { parentId: request.parentId });
    await ctx.db.patch(args.requestId, {
      status: "approved",
      reviewedBy: args.adminId,
    });

    return { success: true };
  },
});

// Admin : rejeter une demande
export const rejectParentLinkRequest = mutation({
  args: {
    requestId: v.id("parentLinkRequests"),
    adminId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request || request.status !== "pending") throw new Error("Demande introuvable");

    await assertAdminEcole(ctx, args.adminId, request.eleveId);

    await ctx.db.patch(args.requestId, {
      status: "rejected",
      reviewedBy: args.adminId,
    });

    return { success: true };
  },
});

// Admin : associer directement un ou plusieurs enfants à un parent existant
export const linkEnfantsToParent = mutation({
  args: {
    parentId: v.id("users"),
    eleveIds: v.array(v.id("eleves")),
    adminId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const parent = await ctx.db.get(args.parentId);
    if (!parent || parent.role !== "parent") throw new Error("Parent introuvable");

    for (const eleveId of args.eleveIds) {
      const eleve = await ctx.db.get(eleveId);
      if (!eleve) continue;
      if (eleve.parentId) continue;

      await assertAdminEcole(ctx, args.adminId, eleveId);
      if (parent.ecoleId !== eleve.ecoleId) {
        throw new Error(`L'élève ${eleve.nom} n'appartient pas à la même école que le parent.`);
      }

      await ctx.db.patch(eleveId, { parentId: args.parentId });
    }

    return { success: true };
  },
});

// Admin : dissocier un enfant de son parent
export const unlinkParent = mutation({
  args: {
    eleveId: v.id("eleves"),
    adminId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await assertAdminEcole(ctx, args.adminId, args.eleveId);

    const eleve = await ctx.db.get(args.eleveId);
    if (!eleve || !eleve.parentId) throw new Error("Aucun parent associé à cet enfant.");

    await ctx.db.patch(args.eleveId, { parentId: undefined });
    return { success: true };
  },
});

// Lister toutes les demandes (avec filtre statut et école)
export const listAll = query({
  args: { status: v.optional(v.string()), ecoleId: v.optional(v.id("ecoles")) },
  handler: async (ctx, args) => {
    let requests;
    if (args.status && args.status !== "all") {
      requests = await ctx.db
        .query("parentLinkRequests")
        .filter((q) => q.eq(q.field("status"), args.status))
        .collect();
    } else {
      requests = await ctx.db.query("parentLinkRequests").collect();
    }

    if (args.ecoleId) {
      const eleveIds = requests.map((r) => r.eleveId);
      const eleves = await Promise.all(eleveIds.map((id) => ctx.db.get(id)));
      requests = requests.filter((req) => {
        const eleve = eleves.find((e) => e && e._id === req.eleveId);
        return eleve?.ecoleId === args.ecoleId;
      });
    }
    return requests;
  },
});