// convex/annonces.ts
import { query, mutation, internalMutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { requireGranularPermission } from "./helpers/permissions";

// ════════════════════════════════════════════════════════════════
// CONSTANTES
// ════════════════════════════════════════════════════════════════
const MAX_PJ = 5;
const MAX_PJ_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_PJ_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
];

// ════════════════════════════════════════════════════════════════
// HELPER — Audit
// ════════════════════════════════════════════════════════════════
async function logAudit(
  ctx: MutationCtx,
  params: {
    userId: Id<"users">;
    action: string;
    documentId: string;
    details: string;
  }
) {
  await ctx.db.insert("audit", {
    userId: params.userId,
    action: params.action,
    table: "annonces",
    documentId: params.documentId,
    details: params.details,
    date: new Date().toISOString(),
  });
}

// ════════════════════════════════════════════════════════════════
// HELPER — Validation pièces jointes
// ════════════════════════════════════════════════════════════════
function validatePiecesJointes(
  pjs:
    | Array<{ nom: string; type: string; url: string; taille?: number }>
    | undefined
) {
  if (!pjs) return;
  if (pjs.length > MAX_PJ) {
    throw new Error(`Maximum ${MAX_PJ} pièces jointes.`);
  }
  for (const pj of pjs) {
    if (pj.nom.length > 255) {
      throw new Error("Nom de pièce jointe trop long (max 255).");
    }
    if (!pj.url.startsWith("https://")) {
      throw new Error("URL de pièce jointe invalide.");
    }
    if (!ALLOWED_PJ_TYPES.includes(pj.type)) {
      throw new Error(
        `Type de fichier non autorisé : ${pj.type}. Utilisez PDF ou image.`
      );
    }
    if (pj.taille && pj.taille > MAX_PJ_SIZE) {
      throw new Error("Pièce jointe trop volumineuse (max 5 MB).");
    }
  }
}

// ════════════════════════════════════════════════════════════════
// QUERIES
// ════════════════════════════════════════════════════════════════

export const listAll = query({
  args: {
    userId: v.id("users"),
    filtreType: v.optional(v.string()),
    filtreActif: v.optional(v.boolean()),
    filtreBrouillon: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // ✨ Permission granulaire : annonces.read
    await requireGranularPermission(ctx, args.userId, "annonces.read");

    const all = await ctx.db.query("annonces").order("desc").take(200);
    return all.filter((a) => {
      if (args.filtreType && a.type !== args.filtreType) return false;
      if (args.filtreActif !== undefined && a.actif !== args.filtreActif) {
        return false;
      }
      if (args.filtreBrouillon === true) {
        if (a.brouillon !== true) return false;
      } else if (args.filtreBrouillon === false) {
        if (a.brouillon === true) return false;
      }
      return true;
    });
  },
});

/**
 * ⚠️ Publique (admin école + tous utilisateurs) — pas de permission requise.
 * Chaque user voit ses propres annonces non lues.
 */
export const listActivesForUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return [];
    if (user.isActive === false) return [];

    const maintenant = Date.now();
    const annoncesActives = await ctx.db
      .query("annonces")
      .withIndex("by_actif", (q) => q.eq("actif", true))
      .take(100);

    const pertinentes = annoncesActives.filter((a) => {
      if (a.brouillon === true) return false;
      if (a.dateDebut > maintenant) return false;
      if (a.dateFin < maintenant) return false;
      if (a.cible === "toutes") return true;
      if (a.cible === "ecole") return a.ecoleId === user.ecoleId;
      if (a.cible === "role") return a.role === user.role;
      return false;
    });

    const lectures = await ctx.db
      .query("annoncesLectures")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .take(500);
    const luesSet = new Set(lectures.map((l) => l.annonceId));

    return pertinentes
      .filter((a) => !luesSet.has(a._id))
      .sort((a, b) => {
        const aEpinglee = a.epinglee === true ? 1 : 0;
        const bEpinglee = b.epinglee === true ? 1 : 0;
        if (aEpinglee !== bEpinglee) return bEpinglee - aEpinglee;
        return 0;
      })
      .map((a) => ({
        _id: a._id,
        titre: a.titre,
        message: a.message,
        type: a.type,
        dateFin: a.dateFin,
        epinglee: a.epinglee === true,
        piecesJointes: a.piecesJointes ?? [],
      }));
  },
});

export const stats = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // ✨ Permission granulaire : annonces.read
    await requireGranularPermission(ctx, args.userId, "annonces.read");

    const toutes = await ctx.db.query("annonces").take(500);
    const maintenant = Date.now();

    return {
      total: toutes.filter((a) => a.brouillon !== true).length,
      actives: toutes.filter(
        (a) =>
          a.brouillon !== true &&
          a.actif &&
          a.dateDebut <= maintenant &&
          a.dateFin >= maintenant
      ).length,
      programmees: toutes.filter(
        (a) => a.brouillon !== true && a.dateDebut > maintenant
      ).length,
      expirees: toutes.filter(
        (a) => a.brouillon !== true && a.dateFin < maintenant
      ).length,
      epinglees: toutes.filter(
        (a) => a.brouillon !== true && a.epinglee === true
      ).length,
      brouillons: toutes.filter((a) => a.brouillon === true).length,
    };
  },
});

export const statsLecturesDetail = query({
  args: { userId: v.id("users"), annonceId: v.id("annonces") },
  handler: async (ctx, args) => {
    // ✨ Permission granulaire : annonces.read
    await requireGranularPermission(ctx, args.userId, "annonces.read");

    const annonce = await ctx.db.get(args.annonceId);
    if (!annonce) throw new Error("Annonce introuvable");

    const lectures = await ctx.db
      .query("annoncesLectures")
      .withIndex("by_annonce", (q) => q.eq("annonceId", args.annonceId))
      .take(2000);

    const userIds = [...new Set(lectures.map((l) => l.userId))];
    const usersDocs = await Promise.all(userIds.map((id) => ctx.db.get(id)));
    const usersMap = new Map<
      string,
      { nom: string; role: string; login: string }
    >();
    for (const u of usersDocs) {
      if (u) usersMap.set(u._id, { nom: u.nom, role: u.role, login: u.login });
    }

    const lecteurs = lectures
      .map((l) => {
        const u = usersMap.get(l.userId);
        return {
          userId: l.userId,
          nom: u?.nom ?? "Utilisateur supprimé",
          role: u?.role ?? "—",
          login: u?.login ?? "—",
          dateLecture: l.dateLecture ?? null,
        };
      })
      .sort((a, b) => {
        if (!a.dateLecture) return 1;
        if (!b.dateLecture) return -1;
        return b.dateLecture.localeCompare(a.dateLecture);
      });

    let totalCible = 0;
    if (annonce.cible === "toutes") {
      const users = await ctx.db.query("users").take(5000);
      totalCible = users.filter((u) => u.isActive !== false).length;
    } else if (annonce.cible === "ecole" && annonce.ecoleId) {
      const users = await ctx.db
        .query("users")
        .withIndex("by_ecoleId", (q) => q.eq("ecoleId", annonce.ecoleId!))
        .take(2000);
      totalCible = users.filter((u) => u.isActive !== false).length;
    } else if (annonce.cible === "role" && annonce.role) {
      const users = await ctx.db.query("users").take(5000);
      totalCible = users.filter(
        (u) => u.role === annonce.role && u.isActive !== false
      ).length;
    }

    return {
      annonceTitre: annonce.titre,
      cible: annonce.cible,
      nbLectures: lectures.length,
      totalCible,
      tauxLecture: totalCible > 0 ? (lectures.length / totalCible) * 100 : 0,
      lecteurs,
    };
  },
});

export const statsLectures = query({
  args: { userId: v.id("users"), annonceId: v.id("annonces") },
  handler: async (ctx, args) => {
    // ✨ Permission granulaire : annonces.read
    await requireGranularPermission(ctx, args.userId, "annonces.read");

    const lectures = await ctx.db
      .query("annoncesLectures")
      .withIndex("by_annonce", (q) => q.eq("annonceId", args.annonceId))
      .take(2000);
    return { nbLectures: lectures.length };
  },
});

// ════════════════════════════════════════════════════════════════
// MUTATIONS
// ════════════════════════════════════════════════════════════════

export const creer = mutation({
  args: {
    userId: v.id("users"),
    titre: v.string(),
    message: v.string(),
    type: v.union(
      v.literal("info"),
      v.literal("warning"),
      v.literal("maintenance"),
      v.literal("success")
    ),
    cible: v.union(
      v.literal("toutes"),
      v.literal("ecole"),
      v.literal("role")
    ),
    ecoleId: v.optional(v.id("ecoles")),
    role: v.optional(v.string()),
    dateDebut: v.optional(v.number()),
    dateFin: v.number(),
    epinglee: v.optional(v.boolean()),
    brouillon: v.optional(v.boolean()),
    piecesJointes: v.optional(
      v.array(
        v.object({
          nom: v.string(),
          type: v.string(),
          url: v.string(),
          taille: v.optional(v.number()),
        })
      )
    ),
    recurrence: v.optional(
      v.union(
        v.literal("unique"),
        v.literal("hebdo"),
        v.literal("mensuel"),
        v.literal("trimestriel")
      )
    ),
    recurrenceFin: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // ✨ Permission granulaire : annonces.write
    const auteur = await requireGranularPermission(
      ctx,
      args.userId,
      "annonces.write"
    );

    if (!args.titre.trim()) throw new Error("Titre requis");
    if (!args.message.trim()) throw new Error("Message requis");
    if (args.titre.length > 120) throw new Error("Titre trop long (max 120)");
    if (args.message.length > 2000) {
      throw new Error("Message trop long (max 2000)");
    }

    if (args.cible === "ecole" && !args.ecoleId) {
      throw new Error("ecoleId requis pour ciblage école");
    }
    if (args.cible === "role" && !args.role) {
      throw new Error("role requis pour ciblage par rôle");
    }

    const dateDebut = args.dateDebut ?? Date.now();
    if (args.dateFin <= dateDebut) {
      throw new Error("dateFin doit être postérieure à dateDebut");
    }

    validatePiecesJointes(args.piecesJointes);

    if (
      args.recurrence &&
      args.recurrence !== "unique" &&
      args.recurrenceFin &&
      args.recurrenceFin <= args.dateFin
    ) {
      throw new Error("La fin de récurrence doit être après la date de fin.");
    }

    if (!args.brouillon) {
      const actives = await ctx.db
        .query("annonces")
        .withIndex("by_actif", (q) => q.eq("actif", true))
        .take(25);
      const nonBrouillons = actives.filter((a) => a.brouillon !== true);
      if (nonBrouillons.length >= 20) {
        throw new Error(
          "Trop d'annonces actives (max 20). Désactivez-en avant."
        );
      }
    }

    const id = await ctx.db.insert("annonces", {
      titre: args.titre.trim(),
      message: args.message.trim(),
      type: args.type,
      cible: args.cible,
      ecoleId: args.cible === "ecole" ? args.ecoleId : undefined,
      role: args.cible === "role" ? args.role : undefined,
      dateDebut,
      dateFin: args.dateFin,
      actif: !args.brouillon,
      epinglee: args.epinglee ?? false,
      brouillon: args.brouillon ?? false,
      piecesJointes: args.piecesJointes,
      recurrence: args.recurrence ?? "unique",
      recurrenceFin: args.recurrenceFin,
      auteurId: args.userId,
      auteurNom: auteur?.nom ?? "Super Admin",
    });

    await logAudit(ctx, {
      userId: args.userId,
      action: args.brouillon ? "creation_brouillon" : "creation",
      documentId: id,
      details: `Annonce ${args.brouillon ? "(brouillon)" : "créée"} : "${
        args.titre
      }" (cible: ${args.cible}${args.epinglee ? ", épinglée" : ""}${
        args.piecesJointes?.length ? `, ${args.piecesJointes.length} PJ` : ""
      })`,
    });

    if (!args.brouillon) {
      await ctx.scheduler.runAfter(0, internal.fcm.sendAnnoncePush, {
        annonceId: id,
        titre: args.titre.trim(),
        message: args.message.trim(),
        type: args.type,
        cible: args.cible,
        ecoleId: args.ecoleId,
        role: args.role,
      });
    }

    return id;
  },
});

export const modifier = mutation({
  args: {
    userId: v.id("users"),
    annonceId: v.id("annonces"),
    titre: v.optional(v.string()),
    message: v.optional(v.string()),
    type: v.optional(v.string()),
    dateFin: v.optional(v.number()),
    piecesJointes: v.optional(
      v.array(
        v.object({
          nom: v.string(),
          type: v.string(),
          url: v.string(),
          taille: v.optional(v.number()),
        })
      )
    ),
    recurrence: v.optional(v.string()),
    recurrenceFin: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // ✨ Permission granulaire : annonces.write
    await requireGranularPermission(ctx, args.userId, "annonces.write");

    const patch: Record<string, unknown> = {};
    if (args.titre !== undefined) patch.titre = args.titre.trim();
    if (args.message !== undefined) patch.message = args.message.trim();
    if (args.type !== undefined) patch.type = args.type;
    if (args.dateFin !== undefined) patch.dateFin = args.dateFin;
    if (args.piecesJointes !== undefined) {
      validatePiecesJointes(args.piecesJointes);
      patch.piecesJointes = args.piecesJointes;
    }
    if (args.recurrence !== undefined) patch.recurrence = args.recurrence;
    if (args.recurrenceFin !== undefined)
      patch.recurrenceFin = args.recurrenceFin;

    await ctx.db.patch(args.annonceId, patch);

    await logAudit(ctx, {
      userId: args.userId,
      action: "modification",
      documentId: args.annonceId,
      details: `Annonce modifiée (champs: ${Object.keys(patch).join(", ")})`,
    });
  },
});

export const toggleActif = mutation({
  args: { userId: v.id("users"), annonceId: v.id("annonces") },
  handler: async (ctx, args) => {
    // ✨ Permission granulaire : annonces.write
    await requireGranularPermission(ctx, args.userId, "annonces.write");

    const a = await ctx.db.get(args.annonceId);
    if (!a) throw new Error("Annonce introuvable");
    const nouveauStatut = !a.actif;
    await ctx.db.patch(args.annonceId, { actif: nouveauStatut });

    await logAudit(ctx, {
      userId: args.userId,
      action: nouveauStatut ? "activation" : "desactivation",
      documentId: args.annonceId,
      details: `Annonce "${a.titre}" ${nouveauStatut ? "activée" : "désactivée"}`,
    });
  },
});

export const toggleEpinglee = mutation({
  args: { userId: v.id("users"), annonceId: v.id("annonces") },
  handler: async (ctx, args) => {
    // ✨ Permission granulaire : annonces.write
    await requireGranularPermission(ctx, args.userId, "annonces.write");

    const a = await ctx.db.get(args.annonceId);
    if (!a) throw new Error("Annonce introuvable");
    const nouveauStatut = !a.epinglee;
    await ctx.db.patch(args.annonceId, { epinglee: nouveauStatut });

    await logAudit(ctx, {
      userId: args.userId,
      action: nouveauStatut ? "epingler_annonce" : "desepingler_annonce",
      documentId: args.annonceId,
      details: `Annonce "${a.titre}" ${
        nouveauStatut ? "épinglée" : "désépinglée"
      }`,
    });
  },
});

export const publierBrouillon = mutation({
  args: { userId: v.id("users"), annonceId: v.id("annonces") },
  handler: async (ctx, args) => {
    // ✨ Permission granulaire : annonces.write
    await requireGranularPermission(ctx, args.userId, "annonces.write");

    const a = await ctx.db.get(args.annonceId);
    if (!a) throw new Error("Annonce introuvable");
    if (a.brouillon !== true)
      throw new Error("Cette annonce n'est pas un brouillon");

    await ctx.db.patch(args.annonceId, {
      brouillon: false,
      actif: true,
      dateDebut: Date.now(),
    });

    await logAudit(ctx, {
      userId: args.userId,
      action: "publication_brouillon",
      documentId: args.annonceId,
      details: `Brouillon "${a.titre}" publié`,
    });

    await ctx.scheduler.runAfter(0, internal.fcm.sendAnnoncePush, {
      annonceId: args.annonceId,
      titre: a.titre,
      message: a.message,
      type: a.type,
      cible: a.cible,
      ecoleId: a.ecoleId,
      role: a.role,
    });

    return { success: true };
  },
});

export const supprimer = mutation({
  args: { userId: v.id("users"), annonceId: v.id("annonces") },
  handler: async (ctx, args) => {
    // ✨ Permission granulaire : annonces.delete
    await requireGranularPermission(ctx, args.userId, "annonces.delete");

    const a = await ctx.db.get(args.annonceId);
    if (!a) throw new Error("Annonce introuvable");

    const lectures = await ctx.db
      .query("annoncesLectures")
      .withIndex("by_annonce", (q) => q.eq("annonceId", args.annonceId))
      .take(5000);
    for (const l of lectures) {
      await ctx.db.delete(l._id);
    }

    await ctx.db.delete(args.annonceId);

    await logAudit(ctx, {
      userId: args.userId,
      action: "suppression",
      documentId: args.annonceId,
      details: `Annonce supprimée : "${a.titre}"`,
    });
  },
});

/**
 * ⚠️ Publique — un user marque ses propres annonces comme lues.
 * Pas de permission requise.
 */
export const marquerLue = mutation({
  args: { userId: v.id("users"), annonceId: v.id("annonces") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return;

    const existing = await ctx.db
      .query("annoncesLectures")
      .withIndex("by_annonce_user", (q) =>
        q.eq("annonceId", args.annonceId).eq("userId", args.userId)
      )
      .first();
    if (existing) return;

    await ctx.db.insert("annoncesLectures", {
      annonceId: args.annonceId,
      userId: args.userId,
      dateLecture: new Date().toISOString(),
    });
  },
});

// ════════════════════════════════════════════════════════════════
// INTERNAL (cron) — pas de changement
// ════════════════════════════════════════════════════════════════

export const expirerAnnonces = internalMutation({
  args: {},
  handler: async (ctx) => {
    const maintenant = Date.now();
    const actives = await ctx.db
      .query("annonces")
      .withIndex("by_actif", (q) => q.eq("actif", true))
      .take(500);

    let count = 0;
    for (const a of actives) {
      if (a.dateFin < maintenant) {
        await ctx.db.patch(a._id, { actif: false });
        count++;
      }
    }
    return { expired: count };
  },
});

export const verifierRecurrences = internalMutation({
  args: {},
  handler: async (ctx) => {
    const maintenant = Date.now();
    let created = 0;

    const recs = await ctx.db
      .query("annonces")
      .withIndex("by_recurrence")
      .take(500);

    for (const a of recs) {
      if (!a.recurrence || a.recurrence === "unique") continue;
      if (a.brouillon === true) continue;
      if (a.parentId) continue;
      if (a.dateFin >= maintenant) continue;

      if (a.recurrenceFin && maintenant > a.recurrenceFin) {
        await ctx.db.patch(a._id, { recurrence: "unique" });
        continue;
      }

      const dureeMs = a.dateFin - a.dateDebut;
      let deltaMs = 0;
      if (a.recurrence === "hebdo") deltaMs = 7 * 24 * 60 * 60 * 1000;
      else if (a.recurrence === "mensuel")
        deltaMs = 30 * 24 * 60 * 60 * 1000;
      else if (a.recurrence === "trimestriel")
        deltaMs = 90 * 24 * 60 * 60 * 1000;

      if (deltaMs === 0) continue;

      const nouvelleDebut = a.dateFin + 1;
      const nouvelleFin = nouvelleDebut + dureeMs;

      if (a.recurrenceFin && nouvelleFin > a.recurrenceFin) {
        await ctx.db.patch(a._id, { recurrence: "unique" });
        continue;
      }

      await ctx.db.insert("annonces", {
        titre: a.titre,
        message: a.message,
        type: a.type,
        cible: a.cible,
        ecoleId: a.ecoleId,
        role: a.role,
        dateDebut: nouvelleDebut,
        dateFin: nouvelleFin,
        actif: true,
        epinglee: a.epinglee ?? false,
        brouillon: false,
        piecesJointes: a.piecesJointes,
        recurrence: a.recurrence,
        recurrenceFin: a.recurrenceFin,
        parentId: a._id,
        auteurId: a.auteurId,
        auteurNom: a.auteurNom,
      });

      await ctx.db.patch(a._id, { actif: false });
      created++;
    }

    return { created };
  },
});