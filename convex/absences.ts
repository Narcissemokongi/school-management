import { query, mutation, MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

type AnyCtx = MutationCtx | QueryCtx;

const MAX_ABSENCES = 1000;
const MAX_INSCRIPTIONS = 1000;
const MAX_ELEVES = 2000;

type UserDoc = {
  _id: Id<"users">;
  role: string;
  ecoleId?: Id<"ecoles">;
  permissions?: string[];
  classe?: string;
};

/**
 * 🔴 FIX GLOBAL : tout superAdmin passe désormais.
 */
function isSuperAdmin(user: any): boolean {
  if (!user) return false;
  return (
    user.role === "superAdmin" ||
    (user.role === "admin" && !user.ecoleId)
  );
}

async function getUser(ctx: AnyCtx, userId: string | undefined): Promise<UserDoc | null> {
  if (!userId) return null;
  return (await ctx.db.get(userId as Id<"users">)) as UserDoc | null;
}

// Vérifie que l'utilisateur est admin/directeur/disciplinaire/enseignant de l'école
async function requireEcoleStaff(
  ctx: AnyCtx,
  userId: string | undefined,
  ecoleId: string,
  classe?: string
) {
  const user = await getUser(ctx, userId);
  if (!user) throw new Error("Authentification requise");

  if (isSuperAdmin(user)) return user;

  const allowedRoles = ["admin", "directeur", "disciplinaire", "enseignant"];
  if (!allowedRoles.includes(user.role)) {
    throw new Error("Accès refusé : rôle insuffisant");
  }

  if (user.ecoleId !== ecoleId) {
    throw new Error("Vous n'appartenez pas à cette école.");
  }

  if (classe && user.role === "enseignant" && user.classe !== classe) {
    throw new Error("Vous n'êtes pas assigné à cette classe");
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

// 🟢 FIX : Map O(n) au lieu de find() imbriqué
async function loadEleveMap(ctx: AnyCtx, eleveIds: Id<"eleves">[]) {
  const unique = [...new Set(eleveIds)];
  const eleves = await Promise.all(unique.map((id) => ctx.db.get(id)));
  return new Map(eleves.filter(Boolean).map((e) => [e!._id, e!]));
}

// ========== QUERIES ==========

/**
 * 🔴 FIX : `userId` optionnel + cloisonnement école.
 * 🟢 FIX : `.take()`.
 */
export const listByEleve = query({
  args: {
    eleveId: v.id("eleves"),
    anneeId: v.optional(v.id("anneesScolaires")),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // 🟡 Si userId fourni, vérifier que l'appelant peut voir cet élève
    if (args.userId) {
      const caller = await getUser(ctx, args.userId);
      if (!caller) throw new Error("Authentification requise");

      const eleve = await ctx.db.get(args.eleveId);
      if (!eleve) throw new Error("Élève introuvable");

      if (!isSuperAdmin(caller)) {
        // Parent de cet élève OU staff de l'école
        const isParent = (eleve as any).parentId === args.userId;
        const isStaff =
          caller.ecoleId === (eleve as any).ecoleId &&
          ["admin", "directeur", "disciplinaire", "enseignant"].includes(caller.role);

        if (!isParent && !isStaff) {
          throw new Error("Accès refusé.");
        }
      }
    }

    if (args.anneeId) {
      return await ctx.db
        .query("absences")
        .withIndex("by_eleveId", (q) => q.eq("eleveId", args.eleveId))
        .filter((q) => q.eq(q.field("anneeId"), args.anneeId!))
        .take(MAX_ABSENCES);
    }
    return await ctx.db
      .query("absences")
      .withIndex("by_eleveId", (q) => q.eq("eleveId", args.eleveId))
      .take(MAX_ABSENCES);
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
    await assertEcoleAccess(ctx, args.userId, args.ecoleId);

    if (args.anneeId) {
      return await ctx.db
        .query("absences")
        .withIndex("by_anneeId", (q) => q.eq("anneeId", args.anneeId!))
        .filter((q) => q.eq(q.field("ecoleId"), args.ecoleId))
        .take(MAX_ABSENCES);
    }
    return await ctx.db
      .query("absences")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId))
      .take(MAX_ABSENCES);
  },
});

/**
 * 🔴 FIX : `userId` optionnel + cloisonnement école.
 * 🟢 FIX : filtre par année + école (avant : chargeait toutes les absences).
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

    // 1. Élèves inscrits dans cette classe/année
    const inscriptions = await ctx.db
      .query("inscriptions")
      .withIndex("by_classe_annee", (q) =>
        q.eq("classe", args.classe).eq("anneeId", args.anneeId)
      )
      .filter((q) => q.eq(q.field("ecoleId"), args.ecoleId))
      .take(MAX_INSCRIPTIONS);

    const eleveIds = inscriptions.map((i) => i.eleveId);
    if (eleveIds.length === 0) return [];

    // 🟢 FIX : filtrer par année AVANT de charger (au lieu de tout charger)
    const absences = await ctx.db
      .query("absences")
      .withIndex("by_anneeId", (q) => q.eq("anneeId", args.anneeId))
      .filter((q) => q.eq(q.field("ecoleId"), args.ecoleId))
      .take(MAX_ABSENCES);

    const eleveIdSet = new Set(eleveIds);
    return absences.filter((a) => eleveIdSet.has(a.eleveId));
  },
});

/**
 * 🔴 FIX : `userId` optionnel + cloisonnement école.
 * 🟢 FIX : `.take()` + Map au lieu de find() imbriqué.
 */
export const listEnAttente = query({
  args: {
    ecoleId: v.id("ecoles"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    await assertEcoleAccess(ctx, args.userId, args.ecoleId);

    const absences = await ctx.db
      .query("absences")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId))
      .filter((q) => q.eq(q.field("statutJustification"), "en_attente"))
      .take(MAX_ABSENCES);

    // 🟢 FIX : Map au lieu de find() imbriqué
    const eleveMap = await loadEleveMap(
      ctx,
      absences.map((a) => a.eleveId)
    );

    return absences.map((a) => {
      const eleve = eleveMap.get(a.eleveId);
      return {
        ...a,
        eleveNom: eleve ? `${eleve.nom} ${eleve.postnom}` : "Inconnu",
      };
    });
  },
});

// ========== MUTATIONS ==========

/**
 * 🟡 FIX : `userId` REQUIS + audit systématique + vérifie élève/école.
 */
export const add = mutation({
  args: {
    eleveId: v.id("eleves"),
    ecoleId: v.id("ecoles"),
    type: v.union(v.literal("absence"), v.literal("retard")),
    date: v.string(),
    commentaire: v.optional(v.string()),
    signaleurId: v.id("users"),
    anneeId: v.id("anneesScolaires"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const eleve = await ctx.db.get(args.eleveId);
    if (!eleve) throw new Error("Élève introuvable");
    if ((eleve as any).ecoleId !== args.ecoleId) {
      throw new Error("L'élève n'appartient pas à cette école.");
    }

    await requireEcoleStaff(ctx, args.userId, args.ecoleId, (eleve as any).classe);

    const newId = await ctx.db.insert("absences", {
      eleveId: args.eleveId,
      ecoleId: args.ecoleId,
      type: args.type,
      date: args.date,
      commentaire: args.commentaire,
      signaleurId: args.signaleurId,
      anneeId: args.anneeId,
    });

    // 🟡 Audit systématique
    await ctx.db.insert("audit", {
      userId: args.userId,
      action: "create_absence",
      table: "absences",
      documentId: newId,
      date: new Date().toISOString(),
      ecoleId: args.ecoleId,
      details: `${args.type === "absence" ? "Absence" : "Retard"} pour ${(eleve as any).nom} ${(eleve as any).postnom} le ${args.date}`,
    });

    return { success: true, absenceId: newId };
  },
});

/**
 * 🟡 FIX : `userId` REQUIS + audit systématique.
 */
export const remove = mutation({
  args: {
    id: v.id("absences"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.id);
    if (!doc) throw new Error("Absence introuvable");

    const eleve = await ctx.db.get(doc.eleveId);
    await requireEcoleStaff(ctx, args.userId, doc.ecoleId, (eleve as any)?.classe);

    await ctx.db.delete(args.id);

    // 🟡 Audit systématique
    await ctx.db.insert("audit", {
      userId: args.userId,
      action: "delete_absence",
      table: "absences",
      documentId: args.id,
      date: new Date().toISOString(),
      ecoleId: doc.ecoleId,
      details: `Suppression d'un(e) ${doc.type} du ${doc.date} pour ${(eleve as any)?.nom ?? "?"}`,
    });

    return { success: true };
  },
});

// ----- JUSTIFICATION PAR LE PARENT -----

/**
 * 🟡 FIX : validation + vérifie que l'absence n'a pas déjà un justificatif en attente/validé.
 */
export const soumettreJustificatif = mutation({
  args: {
    absenceId: v.id("absences"),
    justificatif: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const absence = await ctx.db.get(args.absenceId);
    if (!absence) throw new Error("Absence introuvable");

    const eleve = await ctx.db.get(absence.eleveId);
    if (!eleve || (eleve as any).parentId !== args.userId) {
      throw new Error("Vous n'êtes pas autorisé à justifier cette absence.");
    }

    // 🟢 FIX : refuse si déjà justifiée ou en attente
    if (absence.statutJustification === "justifiee") {
      throw new Error("Cette absence est déjà justifiée.");
    }
    if (absence.statutJustification === "en_attente") {
      throw new Error("Un justificatif est déjà en attente de validation.");
    }

    const justificatif = args.justificatif.trim();
    if (!justificatif) {
      throw new Error("Le justificatif ne peut pas être vide.");
    }

    await ctx.db.patch(args.absenceId, {
      justificatif,
      statutJustification: "en_attente",
      justifiePar: args.userId,
    });

    // 🟡 Audit
    await ctx.db.insert("audit", {
      userId: args.userId,
      action: "soumettre_justificatif",
      table: "absences",
      documentId: args.absenceId,
      date: new Date().toISOString(),
      ecoleId: absence.ecoleId,
      details: `Justificatif soumis pour ${(eleve as any).nom} ${(eleve as any).postnom} (${absence.type} du ${absence.date})`,
    });

    return { success: true };
  },
});

// ----- VALIDATION / REJET PAR LE PERSONNEL -----

/**
 * 🟡 FIX : audit + validation du commentaire.
 */
export const statuerJustificatif = mutation({
  args: {
    absenceId: v.id("absences"),
    statut: v.union(v.literal("justifiee"), v.literal("rejetee")),
    commentaire: v.optional(v.string()),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const absence = await ctx.db.get(args.absenceId);
    if (!absence) throw new Error("Absence introuvable");
    if (absence.statutJustification !== "en_attente") {
      throw new Error("Cette absence n'a pas de demande en attente.");
    }

    await requireEcoleStaff(ctx, args.userId, absence.ecoleId);

    const eleve = await ctx.db.get(absence.eleveId);

    await ctx.db.patch(args.absenceId, {
      statutJustification: args.statut,
      commentaire: args.commentaire?.trim() || absence.commentaire,
    });

    // 🟡 Audit
    await ctx.db.insert("audit", {
      userId: args.userId,
      action:
        args.statut === "justifiee"
          ? "valider_justificatif"
          : "rejeter_justificatif",
      table: "absences",
      documentId: args.absenceId,
      date: new Date().toISOString(),
      ecoleId: absence.ecoleId,
      details: `${args.statut === "justifiee" ? "Justificatif validé" : "Justificatif rejeté"} pour ${(eleve as any)?.nom ?? "?"} ${(eleve as any)?.postnom ?? ""}${args.commentaire ? ` : ${args.commentaire}` : ""}`,
    });

    return { success: true };
  },
});