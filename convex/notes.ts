import { query, mutation, MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

type AnyCtx = MutationCtx | QueryCtx;

const MAX_NOTES = 2000;

type UserDoc = {
  _id: Id<"users">;
  role: string;
  ecoleId?: Id<"ecoles">;
  permissions?: string[];
  classe?: string;
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

// Vérifie les permissions pour les notes.
async function requireNotePermission(
  ctx: AnyCtx,
  userId: string | undefined,
  ecoleId: string,
  classe?: string
) {
  const user = await getUser(ctx, userId);
  if (!user) throw new Error("Authentification requise");

  if (isSuperAdmin(user)) return user;

  const isEcoleAdmin =
    (user.role === "admin" || user.role === "directeur") &&
    user.ecoleId === ecoleId;
  const isEnseignant = user.role === "enseignant" && user.ecoleId === ecoleId;

  if (!isEcoleAdmin && !isEnseignant) {
    throw new Error(
      "Accès refusé : vous n'êtes pas autorisé à gérer les notes de cette école."
    );
  }

  if (isEnseignant && classe && user.classe !== classe) {
    throw new Error("Vous n'êtes pas assigné à cette classe.");
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

// 🟢 FIX : validation des notes
function validateNote(note: number, coefficient: number) {
  if (note < 0 || note > 20) {
    throw new Error("La note doit être comprise entre 0 et 20.");
  }
  if (coefficient <= 0) {
    throw new Error("Le coefficient doit être positif.");
  }
}

// ========== QUERIES ==========

/**
 * 🔴 FIX : `userId` optionnel + cloisonnement école.
 * 🟢 FIX : `.take()` au lieu de `.collect()`.
 */
export const listByEleve = query({
  args: {
    eleveId: v.id("eleves"),
    anneeId: v.optional(v.id("anneesScolaires")),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // 🟡 Cloisonnement : vérifier que l'élève appartient à l'école de l'appelant
    if (args.userId) {
      const caller = await getUser(ctx, args.userId);
      if (!caller) throw new Error("Authentification requise");
      if (!isSuperAdmin(caller)) {
        const eleve = await ctx.db.get(args.eleveId);
        if (!eleve) throw new Error("Élève introuvable");
        if ((eleve as any).ecoleId !== caller.ecoleId) {
          throw new Error("Accès refusé : élève d'une autre école.");
        }
      }
    }

    if (args.anneeId) {
      return await ctx.db
        .query("notes")
        .withIndex("by_eleveId", (q) => q.eq("eleveId", args.eleveId))
        .filter((q) => q.eq(q.field("anneeId"), args.anneeId))
        .take(MAX_NOTES);
    }
    return await ctx.db
      .query("notes")
      .withIndex("by_eleveId", (q) => q.eq("eleveId", args.eleveId))
      .take(MAX_NOTES);
  },
});

/**
 * 🔴 FIX : `userId` optionnel + cloisonnement.
 * 🟢 FIX : `.take()`.
 */
export const listByEcole = query({
  args: {
    ecoleId: v.id("ecoles"),
    anneeId: v.optional(v.id("anneesScolaires")),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    await assertEcoleAccess(ctx, args.userId, args.ecoleId);

    if (args.anneeId) {
      return await ctx.db
        .query("notes")
        .withIndex("by_anneeId", (q) => q.eq("anneeId", args.anneeId!))
        .filter((q) => q.eq(q.field("ecoleId"), args.ecoleId))
        .take(MAX_NOTES);
    }
    return await ctx.db
      .query("notes")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId))
      .take(MAX_NOTES);
  },
});

/**
 * 🔴 FIX : `userId` optionnel + cloisonnement.
 * 🟢 FIX : `.take()` sur les inscriptions et notes + filtre école AVANT de charger les notes.
 * 🟢 FIX : la version originale chargeait TOUTES les notes de l'école → très lourd.
 */
export const listByClasse = query({
  args: {
    ecoleId: v.id("ecoles"),
    anneeId: v.id("anneesScolaires"),
    classe: v.string(),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    await assertEcoleAccess(ctx, args.userId, args.ecoleId);

    // 1. Inscriptions de cette classe/année/école
    const inscriptions = await ctx.db
      .query("inscriptions")
      .withIndex("by_classe_annee", (q) =>
        q.eq("classe", args.classe).eq("anneeId", args.anneeId)
      )
      .filter((q) => q.eq(q.field("ecoleId"), args.ecoleId))
      .take(MAX_NOTES);

    if (inscriptions.length === 0) return [];

    const eleveIds = inscriptions.map((i) => i.eleveId);
    const eleveIdSet = new Set(eleveIds);

    // 2. Notes filtrées par année (index by_anneeId) puis école puis élèves
    const notes = await ctx.db
      .query("notes")
      .withIndex("by_anneeId", (q) => q.eq("anneeId", args.anneeId))
      .filter((q) => q.eq(q.field("ecoleId"), args.ecoleId))
      .take(MAX_NOTES);

    return notes.filter((n) => eleveIdSet.has(n.eleveId));
  },
});

// ========== MUTATIONS ==========

/**
 * 🟡 FIX : `userId` REQUIS + validation + audit + `.first()` (au lieu de `.unique()`).
 * 🟢 FIX : vérifie que l'élève appartient à l'école.
 */
export const upsert = mutation({
  args: {
    eleveId: v.id("eleves"),
    ecoleId: v.id("ecoles"),
    matiere: v.string(),
    note: v.float64(),
    coefficient: v.float64(),
    periode: v.string(),
    appreciation: v.optional(v.string()),
    anneeId: v.id("anneesScolaires"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const eleve = await ctx.db.get(args.eleveId);
    if (!eleve) throw new Error("Élève introuvable");
    if ((eleve as any).ecoleId !== args.ecoleId) {
      throw new Error("L'élève n'appartient pas à cette école.");
    }

    await requireNotePermission(
      ctx,
      args.userId,
      args.ecoleId,
      (eleve as any).classe
    );

    // 🟢 FIX : validation des valeurs
    validateNote(args.note, args.coefficient);
    if (!args.matiere.trim()) throw new Error("La matière est requise.");
    if (!args.periode.trim()) throw new Error("La période est requise.");

    // 🟢 FIX : `.first()` au lieu de `.unique()` (évite crash sur doublon historique)
    const existing = await ctx.db
      .query("notes")
      .withIndex("by_eleveId", (q) => q.eq("eleveId", args.eleveId))
      .filter((q) =>
        q.and(
          q.eq(q.field("matiere"), args.matiere),
          q.eq(q.field("periode"), args.periode),
          q.eq(q.field("anneeId"), args.anneeId)
        )
      )
      .first();

    let docId;
    let action: string;

    if (existing) {
      await ctx.db.patch(existing._id, {
        note: args.note,
        coefficient: args.coefficient,
        appreciation: args.appreciation,
      });
      docId = existing._id;
      action = "update_note";
    } else {
      docId = await ctx.db.insert("notes", {
        eleveId: args.eleveId,
        ecoleId: args.ecoleId,
        anneeId: args.anneeId,
        matiere: args.matiere.trim(),
        note: args.note,
        coefficient: args.coefficient,
        periode: args.periode.trim(),
        appreciation: args.appreciation,
      });
      action = "create_note";
    }

    // 🟡 Audit systématique (avant : conditionnel à userId)
    await ctx.db.insert("audit", {
      userId: args.userId,
      action,
      table: "notes",
      documentId: docId,
      date: new Date().toISOString(),
      ecoleId: args.ecoleId,
      details: `${action === "create_note" ? "Création" : "Mise à jour"} note ${args.matiere} (${args.periode}) pour ${(eleve as any).nom} : ${args.note}/${20} coef ${args.coefficient}`,
    });

    return { success: true, noteId: docId, action };
  },
});

/**
 * 🟡 FIX : `userId` REQUIS + validation + audit + comptage succès/échecs.
 * 🟢 FIX : `.first()` au lieu de `.unique()` + vérifie chaque élève.
 */
export const upsertBulk = mutation({
  args: {
    eleveIds: v.array(v.id("eleves")),
    ecoleId: v.id("ecoles"),
    matiere: v.string(),
    note: v.float64(),
    coefficient: v.float64(),
    periode: v.string(),
    appreciation: v.optional(v.string()),
    anneeId: v.id("anneesScolaires"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    if (args.eleveIds.length === 0) {
      throw new Error("Aucun élève sélectionné.");
    }

    // Vérif rôle sur le premier élève (comme avant)
    const firstEleve = await ctx.db.get(args.eleveIds[0]);
    if (!firstEleve) throw new Error("Élève introuvable");
    await requireNotePermission(
      ctx,
      args.userId,
      args.ecoleId,
      (firstEleve as any).classe
    );

    // 🟢 FIX : validation une seule fois
    validateNote(args.note, args.coefficient);
    if (!args.matiere.trim()) throw new Error("La matière est requise.");
    if (!args.periode.trim()) throw new Error("La période est requise.");

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const skippedReasons: string[] = [];

    for (const eleveId of args.eleveIds) {
      const eleve = await ctx.db.get(eleveId);
      if (!eleve) {
        skipped++;
        skippedReasons.push(`${eleveId} introuvable`);
        continue;
      }
      if ((eleve as any).ecoleId !== args.ecoleId) {
        skipped++;
        skippedReasons.push(`${(eleve as any).nom} : école différente`);
        continue;
      }

      const existing = await ctx.db
        .query("notes")
        .withIndex("by_eleveId", (q) => q.eq("eleveId", eleveId))
        .filter((q) =>
          q.and(
            q.eq(q.field("matiere"), args.matiere),
            q.eq(q.field("periode"), args.periode),
            q.eq(q.field("anneeId"), args.anneeId)
          )
        )
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          note: args.note,
          coefficient: args.coefficient,
          appreciation: args.appreciation,
        });
        updated++;
      } else {
        await ctx.db.insert("notes", {
          eleveId,
          ecoleId: args.ecoleId,
          anneeId: args.anneeId,
          matiere: args.matiere.trim(),
          note: args.note,
          coefficient: args.coefficient,
          periode: args.periode.trim(),
          appreciation: args.appreciation,
        });
        created++;
      }
    }

    // 🟡 Audit
    await ctx.db.insert("audit", {
      userId: args.userId,
      action: "upsert_notes_bulk",
      table: "notes",
      documentId: args.ecoleId,
      date: new Date().toISOString(),
      ecoleId: args.ecoleId,
      details: `${created} créé(s), ${updated} mis à jour, ${skipped} ignoré(s) · ${args.matiere} (${args.periode}) = ${args.note}/20`,
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
 * 🟢 FIX : trace le nom de l'élève + la note supprimée.
 */
export const remove = mutation({
  args: {
    id: v.id("notes"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.id);
    if (!doc) throw new Error("Note introuvable");

    const eleve = await ctx.db.get(doc.eleveId);
    await requireNotePermission(
      ctx,
      args.userId,
      doc.ecoleId,
      (eleve as any)?.classe
    );

    await ctx.db.delete(args.id);

    // 🟡 Audit systématique
    await ctx.db.insert("audit", {
      userId: args.userId,
      action: "delete_note",
      table: "notes",
      documentId: args.id,
      date: new Date().toISOString(),
      ecoleId: doc.ecoleId,
      details: `Suppression note ${doc.matiere} (${doc.periode}) = ${doc.note}/20 pour ${(eleve as any)?.nom ?? "?"} ${(eleve as any)?.postnom ?? ""}`,
    });

    return { success: true };
  },
});