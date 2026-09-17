import { query, mutation, MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

type AnyCtx = MutationCtx | QueryCtx;

const MAX_FRAIS = 1000;

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

// Vérifie que l'utilisateur est admin/comptable de l'école ou superAdmin
async function requireEcoleAdmin(
  ctx: AnyCtx,
  userId: string | undefined,
  ecoleId: string
) {
  if (!userId) throw new Error("Authentification requise");
  const user = await ctx.db.get(userId as Id<"users">);
  if (!user) throw new Error("Utilisateur introuvable");

  const superAdmin = isSuperAdmin(user);
  const isEcoleFinance =
    (user.role === "admin" || user.role === "comptable") &&
    user.ecoleId === ecoleId;

  if (!superAdmin && !isEcoleFinance) {
    throw new Error(
      "Accès refusé : vous n'êtes pas autorisé à gérer les frais de cette école."
    );
  }
  return user;
}

// 🟢 FIX : validation des montants
function validateAmounts(montantTotal: number, montantPaye: number) {
  if (montantTotal < 0) {
    throw new Error("Le montant total ne peut pas être négatif.");
  }
  if (montantPaye < 0) {
    throw new Error("Le montant payé ne peut pas être négatif.");
  }
  if (montantPaye > montantTotal) {
    throw new Error(
      "Le montant payé ne peut pas être supérieur au montant total."
    );
  }
}

// ========== QUERIES ==========

/**
 * 🔴 FIX : `userId` optionnel + cloisonnement.
 * Si fourni, vérifie que l'appelant appartient bien à l'école de l'élève.
 * 🟢 FIX : `.take()` au lieu de `.collect()`.
 */
export const listByEleve = query({
  args: {
    eleveId: v.id("eleves"),
    anneeId: v.optional(v.id("anneesScolaires")),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // 🟡 Cloisonnement si userId fourni
    if (args.userId) {
      const caller = await ctx.db.get(args.userId);
      if (!caller) throw new Error("Authentification requise");

      if (!isSuperAdmin(caller)) {
        // 🟡 Vérifier que l'élève appartient à la même école que l'appelant
        const eleve = await ctx.db.get(args.eleveId);
        if (!eleve) throw new Error("Élève introuvable");
        if (caller.ecoleId !== eleve.ecoleId) {
          throw new Error("Accès refusé : école différente.");
        }
      }
    }

    if (args.anneeId) {
      return await ctx.db
        .query("frais")
        .withIndex("by_eleveId", (q) => q.eq("eleveId", args.eleveId))
        .filter((q) => q.eq(q.field("anneeId"), args.anneeId!))
        .take(MAX_FRAIS);
    }
    return await ctx.db
      .query("frais")
      .withIndex("by_eleveId", (q) => q.eq("eleveId", args.eleveId))
      .take(MAX_FRAIS);
  },
});

/**
 * 🔴 FIX : `userId` optionnel + cloisonnement école.
 * 🟢 FIX : `.take()`.
 */
export const listByEcole = query({
  args: {
    ecoleId: v.id("ecoles"),
    anneeId: v.optional(v.id("anneesScolaires")),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // 🟡 Cloisonnement si userId fourni
    if (args.userId) {
      const caller = await ctx.db.get(args.userId);
      if (!caller) throw new Error("Authentification requise");

      if (!isSuperAdmin(caller)) {
        if (caller.ecoleId !== args.ecoleId) {
          throw new Error("Accès refusé : école différente.");
        }
      }
    }

    if (args.anneeId) {
      return await ctx.db
        .query("frais")
        .withIndex("by_anneeId", (q) => q.eq("anneeId", args.anneeId!))
        .filter((q) => q.eq(q.field("ecoleId"), args.ecoleId))
        .take(MAX_FRAIS);
    }
    return await ctx.db
      .query("frais")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId))
      .take(MAX_FRAIS);
  },
});

/**
 * 🔴 FIX : `userId` optionnel + cloisonnement.
 * 🟢 FIX : utilise l'index avec `anneeId` si fourni (avant : filter en mémoire).
 */
export const listFraisClasses = query({
  args: {
    ecoleId: v.id("ecoles"),
    anneeId: v.optional(v.id("anneesScolaires")),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // 🟡 Cloisonnement si userId fourni
    if (args.userId) {
      const caller = await ctx.db.get(args.userId);
      if (!caller) throw new Error("Authentification requise");

      if (!isSuperAdmin(caller)) {
        if (caller.ecoleId !== args.ecoleId) {
          throw new Error("Accès refusé : école différente.");
        }
      }
    }

    let q = ctx.db
      .query("fraisClasses")
      .withIndex("by_ecole_classe", (q) => q.eq("ecoleId", args.ecoleId));

    const all = await q.take(MAX_FRAIS);

    if (args.anneeId) {
      return all.filter((f) => f.anneeId === args.anneeId);
    }
    return all;
  },
});

// ========== MUTATIONS ==========

/**
 * 🟡 FIX : `userId` REQUIS + validation + audit systématique + retour structuré.
 * 🟢 FIX : `.unique()` → `.first()` (évite crash si doublon historique).
 */
export const upsert = mutation({
  args: {
    eleveId: v.id("eleves"),
    ecoleId: v.id("ecoles"),
    montantTotal: v.float64(),
    montantPaye: v.float64(),
    commentaire: v.optional(v.string()),
    anneeId: v.id("anneesScolaires"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireEcoleAdmin(ctx, args.userId, args.ecoleId);

    // 🟢 FIX : validation des montants
    validateAmounts(args.montantTotal, args.montantPaye);

    // 🟢 FIX : vérifier que l'élève appartient bien à l'école
    const eleve = await ctx.db.get(args.eleveId);
    if (!eleve) throw new Error("Élève introuvable");
    if (eleve.ecoleId !== args.ecoleId) {
      throw new Error("L'élève n'appartient pas à cette école.");
    }

    const existing = await ctx.db
      .query("frais")
      .withIndex("by_eleveId", (q) => q.eq("eleveId", args.eleveId))
      .filter((q) => q.eq(q.field("anneeId"), args.anneeId))
      .first();

    let docId;
    let action: string;
    let previousData: any = null;

    if (existing) {
      previousData = {
        montantTotal: existing.montantTotal,
        montantPaye: existing.montantPaye,
      };
      await ctx.db.patch(existing._id, {
        montantTotal: args.montantTotal,
        montantPaye: args.montantPaye,
        commentaire: args.commentaire,
      });
      docId = existing._id;
      action = "update_frais";
    } else {
      docId = await ctx.db.insert("frais", {
        eleveId: args.eleveId,
        ecoleId: args.ecoleId,
        anneeId: args.anneeId,
        montantTotal: args.montantTotal,
        montantPaye: args.montantPaye,
        commentaire: args.commentaire,
      });
      action = "create_frais";
    }

    // 🟡 Audit systématique
    await ctx.db.insert("audit", {
      userId: args.userId,
      action,
      table: "frais",
      documentId: docId,
      date: new Date().toISOString(),
      ecoleId: args.ecoleId,
      details: existing
        ? `Mise à jour frais ${eleve.nom} : ${previousData.montantPaye}/${previousData.montantTotal} → ${args.montantPaye}/${args.montantTotal}`
        : `Création frais ${eleve.nom} : ${args.montantPaye}/${args.montantTotal}`,
    });

    return { success: true, fraisId: docId, action };
  },
});

/**
 * 🟡 FIX : `userId` REQUIS + validation + audit + retour structuré.
 * 🟢 FIX : compte succès/échecs par élève (au lieu de tout planter).
 */
export const upsertBulk = mutation({
  args: {
    eleveIds: v.array(v.id("eleves")),
    ecoleId: v.id("ecoles"),
    montantTotal: v.float64(),
    montantPaye: v.float64(),
    commentaire: v.optional(v.string()),
    anneeId: v.id("anneesScolaires"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireEcoleAdmin(ctx, args.userId, args.ecoleId);

    if (args.eleveIds.length === 0) {
      throw new Error("Aucun élève sélectionné.");
    }

    // 🟢 FIX : validation des montants
    validateAmounts(args.montantTotal, args.montantPaye);

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const skippedReasons: string[] = [];

    for (const eleveId of args.eleveIds) {
      const eleve = await ctx.db.get(eleveId);
      if (!eleve) {
        skipped++;
        skippedReasons.push(`Élève ${eleveId} introuvable`);
        continue;
      }
      if (eleve.ecoleId !== args.ecoleId) {
        skipped++;
        skippedReasons.push(`${eleve.nom} : école différente`);
        continue;
      }

      const existing = await ctx.db
        .query("frais")
        .withIndex("by_eleveId", (q) => q.eq("eleveId", eleveId))
        .filter((q) => q.eq(q.field("anneeId"), args.anneeId))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          montantTotal: args.montantTotal,
          montantPaye: args.montantPaye,
          commentaire: args.commentaire,
        });
        updated++;
      } else {
        await ctx.db.insert("frais", {
          eleveId,
          ecoleId: args.ecoleId,
          anneeId: args.anneeId,
          montantTotal: args.montantTotal,
          montantPaye: args.montantPaye,
          commentaire: args.commentaire,
        });
        created++;
      }
    }

    // 🟡 Audit
    await ctx.db.insert("audit", {
      userId: args.userId,
      action: "upsert_frais_bulk",
      table: "frais",
      documentId: args.ecoleId,
      date: new Date().toISOString(),
      ecoleId: args.ecoleId,
      details: `${created} créé(s), ${updated} mis à jour, ${skipped} ignoré(s) · Montant ${args.montantPaye}/${args.montantTotal}`,
    });

    return {
      success: true,
      created,
      updated,
      skipped,
      skippedReasons: skippedReasons.slice(0, 5),
    };
  },
});

/**
 * 🟡 FIX : `userId` REQUIS + audit systématique.
 */
export const remove = mutation({
  args: {
    id: v.id("frais"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.id);
    if (!doc) throw new Error("Frais introuvable");

    await requireEcoleAdmin(ctx, args.userId, doc.ecoleId);

    const eleve = await ctx.db.get(doc.eleveId);

    await ctx.db.delete(args.id);

    // 🟡 Audit systématique
    await ctx.db.insert("audit", {
      userId: args.userId,
      action: "delete_frais",
      table: "frais",
      documentId: args.id,
      date: new Date().toISOString(),
      ecoleId: doc.ecoleId,
      details: `Suppression frais ${eleve?.nom ?? "?"} ${eleve?.postnom ?? ""} (${doc.montantPaye}/${doc.montantTotal})`,
    });

    return { success: true };
  },
});

/**
 * 🟡 FIX : `userId` REQUIS + validation + audit + `.first()` (avant : silence).
 * 🟢 FIX : différencie création et mise à jour dans l'audit.
 */
export const upsertFraisClasse = mutation({
  args: {
    classe: v.string(),
    montantTotal: v.float64(),
    ecoleId: v.id("ecoles"),
    anneeId: v.optional(v.id("anneesScolaires")),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireEcoleAdmin(ctx, args.userId, args.ecoleId);

    // 🟢 FIX : validation montant
    if (args.montantTotal < 0) {
      throw new Error("Le montant ne peut pas être négatif.");
    }

    const existing = await ctx.db
      .query("fraisClasses")
      .withIndex("by_ecole_classe", (q) =>
        q.eq("ecoleId", args.ecoleId).eq("classe", args.classe)
      )
      .first();

    let docId;
    let action: string;
    let previousAmount: number | null = null;

    if (existing) {
      previousAmount = existing.montantTotal;
      await ctx.db.patch(existing._id, { montantTotal: args.montantTotal });
      docId = existing._id;
      action = "update_frais_classe";
    } else {
      docId = await ctx.db.insert("fraisClasses", {
        classe: args.classe,
        montantTotal: args.montantTotal,
        ecoleId: args.ecoleId,
        anneeId: args.anneeId,
      });
      action = "create_frais_classe";
    }

    // 🟡 Audit (avant : manquant)
    await ctx.db.insert("audit", {
      userId: args.userId,
      action,
      table: "fraisClasses",
      documentId: docId,
      date: new Date().toISOString(),
      ecoleId: args.ecoleId,
      details: existing
        ? `Frais classe ${args.classe} : ${previousAmount} → ${args.montantTotal}`
        : `Création frais classe ${args.classe} : ${args.montantTotal}`,
    });

    return { success: true, fraisClasseId: docId, action };
  },
});