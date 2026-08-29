import { query, mutation, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "../convex/_generated/dataModel";

// ========== OUTILS ==========
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

// ========== QUERY ==========

// Récupère l'emploi du temps annuel d'une classe (un seul document ou null)
export const getByClasse = query({
  args: {
    classe: v.string(),
    ecoleId: v.id("ecoles"),
    anneeId: v.optional(v.id("anneesScolaires")),
  },
  handler: async (ctx, args) => {
    // Si anneeId fourni, on utilise l'index complet
    if (args.anneeId) {
      const anneeId = args.anneeId as Id<"anneesScolaires">; // ✅ assertion de type
      const emploi = await ctx.db
        .query("emploiDuTemps")
        .withIndex("by_classe_ecole_annee", (q) =>
          q
            .eq("classe", args.classe)
            .eq("ecoleId", args.ecoleId)
            .eq("anneeId", anneeId) // ✅ utilise la variable typée
        )
        .first();
      return emploi ?? null;
    }

    // Sinon, on recherche par classe et école sans contrainte d'année
    const result = await ctx.db
      .query("emploiDuTemps")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId))
      .filter((q) => q.eq(q.field("classe"), args.classe))
      .collect();

    return result.length > 0 ? result[0] : null;
  },
});

// ========== MUTATIONS ==========

// Crée ou met à jour l'emploi du temps annuel d'une classe
export const upsert = mutation({
  args: {
    classe: v.string(),
    ecoleId: v.id("ecoles"),
    contenu: v.string(),
    anneeId: v.id("anneesScolaires"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.userId, ["admin", "directeur"]);

    const { userId, ...rest } = args;
    const existing = await ctx.db
      .query("emploiDuTemps")
      .withIndex("by_classe_ecole_annee", (q) =>
        q
          .eq("classe", rest.classe)
          .eq("ecoleId", rest.ecoleId)
          .eq("anneeId", rest.anneeId)
      )
      .first();

    let docId: string;
    let action: "create" | "update";
    if (existing) {
      await ctx.db.patch(existing._id, { contenu: rest.contenu });
      docId = existing._id;
      action = "update";
    } else {
      docId = await ctx.db.insert("emploiDuTemps", rest);
      action = "create";
    }

    // Audit
    if (userId) {
      await ctx.db.insert("audit", {
        userId,
        action,
        table: "emploiDuTemps",
        documentId: docId,
        details: `Emploi du temps annuel ${rest.classe} (${rest.anneeId})`,
        date: new Date().toISOString(),
        ecoleId: rest.ecoleId,
      });
    }
    return docId;
  },
});

// Supprime un emploi du temps par son ID
export const remove = mutation({
  args: {
    id: v.id("emploiDuTemps"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.userId, ["admin", "directeur"]);

    const doc = await ctx.db.get(args.id);
    if (!doc) return;

    await ctx.db.delete(args.id);

    if (args.userId) {
      await ctx.db.insert("audit", {
        userId: args.userId,
        action: "delete",
        table: "emploiDuTemps",
        documentId: args.id,
        details: `Suppression EDT annuel ${doc.classe}`,
        date: new Date().toISOString(),
        ecoleId: doc.ecoleId,
      });
    }
  },
});

// Supprime l'emploi du temps d'une classe pour une année donnée (pratique pour le frontend)
export const removeByClasse = mutation({
  args: {
    classe: v.string(),
    ecoleId: v.id("ecoles"),
    anneeId: v.id("anneesScolaires"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.userId, ["admin", "directeur"]);

    const existing = await ctx.db
      .query("emploiDuTemps")
      .withIndex("by_classe_ecole_annee", (q) =>
        q
          .eq("classe", args.classe)
          .eq("ecoleId", args.ecoleId)
          .eq("anneeId", args.anneeId)
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
    return { success: true };
  },
});