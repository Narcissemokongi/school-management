import { query, mutation, MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

type AnyCtx = MutationCtx | QueryCtx;

const MAX_COURS = 500;

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
  if (!userId) throw new Error("Authentification requise");
  const user = await ctx.db.get(userId as Id<"users">);
  if (!user) throw new Error("Utilisateur introuvable");

  const superAdmin = isSuperAdmin(user);
  const isEcoleAdmin =
    (user.role === "admin" || user.role === "directeur") &&
    user.ecoleId === ecoleId;

  if (!superAdmin && !isEcoleAdmin) {
    throw new Error("Accès refusé : vous n'êtes pas autorisé à gérer cette école.");
  }
  return user;
}

// Vérifie le rôle et éventuellement l'appartenance à une classe (pour les enseignants)
async function requireRole(
  ctx: AnyCtx,
  userId: string | undefined,
  allowedRoles: string[],
  classe?: string
) {
  if (!userId) throw new Error("Authentification requise");
  const user = await ctx.db.get(userId as Id<"users">);
  if (!user) throw new Error("Utilisateur introuvable");
  if (isSuperAdmin(user)) return user;
  if (!allowedRoles.includes(user.role)) {
    throw new Error("Accès refusé : rôle insuffisant");
  }
  if (classe && user.role === "enseignant" && user.classe !== classe) {
    throw new Error("Vous n'êtes pas assigné à cette classe");
  }
  return user;
}

// ========== QUERY ==========

/**
 * ✅ FIX : `userId` devient OPTIONNEL.
 * Si fourni → vérifie le cloisonnement école.
 * 🟢 FIX : `.take(MAX_COURS)` pour éviter les gros volumes.
 */
export const list = query({
  args: {
    ecoleId: v.id("ecoles"),
    classe: v.optional(v.string()),
    anneeId: v.optional(v.id("anneesScolaires")),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // ✅ Cloisonnement si userId fourni
    if (args.userId) {
      const caller = await ctx.db.get(args.userId);
      if (!caller) throw new Error("Authentification requise");

      if (!isSuperAdmin(caller)) {
        if (!caller.ecoleId) throw new Error("Accès refusé");
        if (caller.ecoleId !== args.ecoleId) {
          throw new Error("Accès refusé : école différente.");
        }
      }
    }

    if (args.anneeId) {
      let q = ctx.db
        .query("cours")
        .withIndex("by_anneeId", (q) => q.eq("anneeId", args.anneeId))
        .filter((q) => q.eq(q.field("ecoleId"), args.ecoleId));
      if (args.classe) {
        q = q.filter((q) => q.eq(q.field("classe"), args.classe));
      }
      return await q.take(MAX_COURS);
    }

    let q = ctx.db
      .query("cours")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId));
    if (args.classe) {
      q = q.filter((q) => q.eq(q.field("classe"), args.classe));
    }
    return await q.take(MAX_COURS);
  },
});

// ========== MUTATIONS ==========

/**
 * 🟡 FIX : `userId` devient REQUIS + audit.
 */
export const add = mutation({
  args: {
    nom: v.string(),
    classe: v.string(),
    coefficient: v.optional(v.float64()),
    bareme: v.optional(v.float64()),
    ecoleId: v.id("ecoles"),
    anneeId: v.optional(v.id("anneesScolaires")),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireEcoleAdmin(ctx, args.userId, args.ecoleId);

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

    const newId = await ctx.db.insert("cours", {
      nom: args.nom,
      classe: args.classe,
      coefficient: args.coefficient ?? 1,
      bareme: args.bareme ?? 20,
      ecoleId: args.ecoleId,
      anneeId: args.anneeId,
    });

    // 🟡 Audit
    await ctx.db.insert("audit", {
      userId: args.userId,
      action: "create_cours",
      table: "cours",
      documentId: newId,
      details: `Création du cours "${args.nom}" (classe ${args.classe})`,
      date: new Date().toISOString(),
      ecoleId: args.ecoleId,
    });

    return { success: true, coursId: newId };
  },
});

/**
 * 🟡 FIX : `userId` requis + audit (batch).
 * 🟢 FIX : retour { inserted, duplicates } pour cohérence avec importClasses.
 */
export const addBulk = mutation({
  args: {
    nom: v.string(),
    coefficient: v.optional(v.float64()),
    bareme: v.optional(v.float64()),
    classes: v.array(v.string()),
    ecoleId: v.id("ecoles"),
    anneeId: v.optional(v.id("anneesScolaires")),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireEcoleAdmin(ctx, args.userId, args.ecoleId);

    let inserted = 0;
    const duplicates: string[] = [];

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
        // 🟢 FIX : skip silencieux avec comptage au lieu de tout planter
        duplicates.push(classe);
        continue;
      }

      await ctx.db.insert("cours", {
        nom: args.nom,
        classe,
        coefficient: args.coefficient ?? 1,
        bareme: args.bareme ?? 20,
        ecoleId: args.ecoleId,
        anneeId: args.anneeId,
      });
      inserted++;
    }

    // 🟡 Audit
    if (inserted > 0) {
      await ctx.db.insert("audit", {
        userId: args.userId,
        action: "create_cours_bulk",
        table: "cours",
        documentId: args.ecoleId,
        details: `Cours "${args.nom}" ajouté à ${inserted} classe(s)${
          duplicates.length ? `, ${duplicates.length} doublon(s) ignoré(s)` : ""
        }`,
        date: new Date().toISOString(),
        ecoleId: args.ecoleId,
      });
    }

    return { inserted, duplicates };
  },
});

/**
 * 🟡 FIX : `userId` requis + audit.
 * 🟢 FIX : refuse la mise à jour si `fields` est vide (évite un patch inutile).
 */
export const update = mutation({
  args: {
    id: v.id("cours"),
    nom: v.optional(v.string()),
    classe: v.optional(v.string()),
    coefficient: v.optional(v.float64()),
    bareme: v.optional(v.float64()),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Cours introuvable.");

    await requireEcoleAdmin(ctx, args.userId, existing.ecoleId);

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

    // 🟢 FIX : évite un patch vide
    if (Object.keys(fields).length === 0) {
      return { success: true, noChange: true };
    }

    await ctx.db.patch(id, fields);

    // 🟡 Audit
    const changes: string[] = [];
    if (args.nom && args.nom !== existing.nom)
      changes.push(`nom: "${existing.nom}" → "${args.nom}"`);
    if (args.classe && args.classe !== existing.classe)
      changes.push(`classe: ${existing.classe} → ${args.classe}`);
    if (args.coefficient !== undefined && args.coefficient !== existing.coefficient)
      changes.push(`coef: ${existing.coefficient} → ${args.coefficient}`);
    if (args.bareme !== undefined && args.bareme !== existing.bareme)
      changes.push(`barème: ${existing.bareme} → ${args.bareme}`);

    await ctx.db.insert("audit", {
      userId: args.userId,
      action: "update_cours",
      table: "cours",
      documentId: args.id,
      details: changes.length > 0 ? changes.join(" · ") : "Mise à jour",
      date: new Date().toISOString(),
      ecoleId: existing.ecoleId,
    });

    return { success: true };
  },
});

/**
 * 🟡 FIX : `userId` requis + audit systématique.
 *
 * ⚠️ Note : la table `notes` ne contient PAS de champ `coursId` dans le
 * schéma actuel (les notes sont reliées par `matiere`/`cours` en string,
 * ou pas du tout). Donc on ne peut pas vérifier côté backend l'existence
 * de notes liées à ce cours. Si tu veux ajouter cette vérification, il
 * faut d'abord ajouter `coursId: v.optional(v.id("cours"))` à la table
 * `notes` dans `convex/schema.ts`.
 */
export const remove = mutation({
  args: {
    id: v.id("cours"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.id);
    if (!doc) return { success: true, alreadyDeleted: true };

    await requireEcoleAdmin(ctx, args.userId, doc.ecoleId);

    await ctx.db.delete(args.id);

    // 🟡 Audit systématique (avant : conditionnel à `args.userId`)
    await ctx.db.insert("audit", {
      userId: args.userId,
      action: "delete_cours",
      table: "cours",
      documentId: args.id,
      details: `Suppression du cours "${doc.nom}" (classe ${doc.classe})`,
      date: new Date().toISOString(),
      ecoleId: doc.ecoleId,
    });

    return { success: true };
  },
});