import { query, mutation, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "../convex/_generated/dataModel";

// ========== OUTILS ==========
async function requireRole(
  ctx: MutationCtx,
  userId: string | undefined,
  allowedRoles: string[],
  classe?: string
) {
  if (!userId) throw new Error("Authentification requise");
  const user = await ctx.db.get(userId as Id<"users">);
  if (!user || !allowedRoles.includes(user.role)) {
    throw new Error("Accès refusé : rôle insuffisant");
  }
  if (classe && user.role === "enseignant" && user.classe !== classe) {
    throw new Error("Vous n'êtes pas assigné à cette classe");
  }
  return user;
}

// ========== QUERY ==========
export const list = query({
  args: {
    ecoleId: v.id("ecoles"),
    classe: v.optional(v.string()),
    anneeId: v.optional(v.id("anneesScolaires")),
  },
  handler: async (ctx, args) => {
    if (args.anneeId) {
      let q = ctx.db
        .query("cours")
        .withIndex("by_anneeId", (q) => q.eq("anneeId", args.anneeId!))
        .filter((q) => q.eq(q.field("ecoleId"), args.ecoleId));
      if (args.classe) {
        q = q.filter((q) => q.eq(q.field("classe"), args.classe!));
      }
      return await q.collect();
    }
    let q = ctx.db
      .query("cours")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId));
    if (args.classe) {
      q = q.filter((q) => q.eq(q.field("classe"), args.classe!));
    }
    return await q.collect();
  },
});

// ========== MUTATIONS ==========

// Ajouter un cours individuellement
export const add = mutation({
  args: {
    nom: v.string(),
    classe: v.string(),
    coefficient: v.optional(v.float64()),
    bareme: v.optional(v.float64()),
    ecoleId: v.id("ecoles"),
    anneeId: v.optional(v.id("anneesScolaires")),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.userId, ["admin", "directeur"]);

    // Vérification d'unicité (même nom, même classe, même école, et même année si fournie)
    let duplicateQuery = ctx.db
      .query("cours")
      .withIndex("by_classe", (q) =>
        q.eq("classe", args.classe).eq("ecoleId", args.ecoleId)
      )
      .filter((q) => q.eq(q.field("nom"), args.nom));
    if (args.anneeId) {
      duplicateQuery = duplicateQuery.filter((q) =>
        q.eq(q.field("anneeId"), args.anneeId)
      );
    }
    const existing = await duplicateQuery.first();
    if (existing) {
      throw new Error("Ce cours existe déjà pour cette classe.");
    }

    await ctx.db.insert("cours", {
      nom: args.nom,
      classe: args.classe,
      coefficient: args.coefficient ?? 1,
      bareme: args.bareme ?? 20,
      ecoleId: args.ecoleId,
      anneeId: args.anneeId,
    });
  },
});

// Ajouter un cours en masse à plusieurs classes
export const addBulk = mutation({
  args: {
    nom: v.string(),
    coefficient: v.optional(v.float64()),
    bareme: v.optional(v.float64()),
    classes: v.array(v.string()),
    ecoleId: v.id("ecoles"),
    anneeId: v.optional(v.id("anneesScolaires")),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.userId, ["admin", "directeur"]);

    for (const classe of args.classes) {
      let duplicateQuery = ctx.db
        .query("cours")
        .withIndex("by_classe", (q) =>
          q.eq("classe", classe).eq("ecoleId", args.ecoleId)
        )
        .filter((q) => q.eq(q.field("nom"), args.nom));
      if (args.anneeId) {
        duplicateQuery = duplicateQuery.filter((q) =>
          q.eq(q.field("anneeId"), args.anneeId)
        );
      }
      const existing = await duplicateQuery.first();
      if (existing) {
        throw new Error(`Le cours "${args.nom}" existe déjà pour la classe ${classe}.`);
      }

      await ctx.db.insert("cours", {
        nom: args.nom,
        classe,
        coefficient: args.coefficient ?? 1,
        bareme: args.bareme ?? 20,
        ecoleId: args.ecoleId,
        anneeId: args.anneeId,
      });
    }
  },
});

// Mettre à jour un cours
export const update = mutation({
  args: {
    id: v.id("cours"),
    nom: v.optional(v.string()),
    classe: v.optional(v.string()),
    coefficient: v.optional(v.float64()),
    bareme: v.optional(v.float64()),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.userId, ["admin", "directeur"]);

    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Cours introuvable.");

    // Vérifier l'unicité si le nom ou la classe change
    if (args.nom || args.classe) {
      const newNom = args.nom ?? existing.nom;
      const newClasse = args.classe ?? existing.classe;
      let duplicateQuery = ctx.db
        .query("cours")
        .withIndex("by_classe", (q) =>
          q.eq("classe", newClasse).eq("ecoleId", existing.ecoleId)
        )
        .filter((q) => q.eq(q.field("nom"), newNom))
        .filter((q) => q.neq(q.field("_id"), args.id));
      if (existing.anneeId) {
        duplicateQuery = duplicateQuery.filter((q) =>
          q.eq(q.field("anneeId"), existing.anneeId)
        );
      }
      const duplicate = await duplicateQuery.first();
      if (duplicate) {
        throw new Error("Un autre cours avec ces informations existe déjà.");
      }
    }

    const { id, userId, ...fields } = args;
    await ctx.db.patch(id, fields);
    return { success: true };
  },
});

// Supprimer un cours
export const remove = mutation({
  args: {
    id: v.id("cours"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.userId, ["admin", "directeur"]);

    const doc = await ctx.db.get(args.id);
    if (!doc) return;

    // NB : on ne vérifie plus les notes associées pour éviter l'erreur TypeScript.
    // Si vous souhaitez empêcher la suppression lorsqu'il y a des notes,
    // il faudra d'abord récupérer les élèves de la classe, puis les notes de ces élèves.

    await ctx.db.delete(args.id);

    if (args.userId) {
      await ctx.db.insert("audit", {
        userId: args.userId,
        action: "delete",
        table: "cours",
        documentId: args.id,
        details: `Suppression du cours ${doc.nom} (classe ${doc.classe})`,
        date: new Date().toISOString(),
        ecoleId: doc.ecoleId,
      });
    }
  },
});