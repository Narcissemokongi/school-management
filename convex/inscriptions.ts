import { query, mutation, MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

type AnyCtx = MutationCtx | QueryCtx;

const MAX_INSCRIPTIONS = 1000;

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

// Vérifie que l'utilisateur est autorisé à gérer l'école donnée
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

// 🟢 FIX : helper pour charger un Map d'élèves en une passe
async function loadEleveMap(ctx: AnyCtx, eleveIds: Id<"eleves">[]) {
  const unique = [...new Set(eleveIds)];
  const eleves = await Promise.all(unique.map((id) => ctx.db.get(id)));
  return new Map(
    eleves.filter(Boolean).map((e) => [e!._id, e!])
  );
}

// ----- QUERY : liste des inscriptions pour une année donnée -----
/**
 * 🔴 FIX : `userId` optionnel + cloisonnement école si fourni.
 * 🟢 FIX : Map au lieu de find() imbriqué + `.take()`.
 */
export const listByAnnee = query({
  args: {
    ecoleId: v.id("ecoles"),
    anneeId: v.id("anneesScolaires"),
    classe: v.optional(v.string()),
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
      .query("inscriptions")
      .withIndex("by_ecole_annee", (q) =>
        q.eq("ecoleId", args.ecoleId).eq("anneeId", args.anneeId)
      );
    if (args.classe) {
      q = q.filter((q) => q.eq(q.field("classe"), args.classe));
    }
    const inscriptions = await q.take(MAX_INSCRIPTIONS);

    // 🟢 FIX : Map O(n) au lieu de find() O(n²)
    const eleveMap = await loadEleveMap(
      ctx,
      inscriptions.map((i) => i.eleveId)
    );

    return inscriptions.map((insc) => {
      const eleve = eleveMap.get(insc.eleveId);
      return {
        ...insc,
        nom: eleve?.nom ?? "—",
        postnom: eleve?.postnom ?? "",
        prenom: eleve?.prenom ?? "",
        code: eleve?.code ?? "",
      };
    });
  },
});

// ----- MUTATION : inscription manuelle d'un élève -----
/**
 * 🟡 FIX : `actionUserId` REQUIS + audit.
 * 🟢 FIX : vérifie que l'élève appartient bien à l'école.
 */
export const addInscription = mutation({
  args: {
    eleveId: v.id("eleves"),
    ecoleId: v.id("ecoles"),
    anneeId: v.id("anneesScolaires"),
    classe: v.string(),
    statut: v.optional(
      v.union(
        v.literal("inscrit"),
        v.literal("passant"),
        v.literal("redoublant"),
        v.literal("transfere"),
        v.literal("exclu"),
        v.literal("diplome")
      )
    ),
    userId: v.optional(v.id("users")),
    actionUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireEcoleAdmin(ctx, args.actionUserId, args.ecoleId);

    // 🟢 FIX : vérifier que l'élève appartient bien à l'école
    const eleve = await ctx.db.get(args.eleveId);
    if (!eleve) throw new Error("Élève introuvable.");
    if (eleve.ecoleId !== args.ecoleId) {
      throw new Error("L'élève n'appartient pas à cette école.");
    }

    const existing = await ctx.db
      .query("inscriptions")
      .withIndex("by_eleve_annee", (q) =>
        q.eq("eleveId", args.eleveId).eq("anneeId", args.anneeId)
      )
      .first();
    if (existing) {
      throw new Error("Cet élève a déjà une inscription pour cette année.");
    }

    const newId = await ctx.db.insert("inscriptions", {
      eleveId: args.eleveId,
      ecoleId: args.ecoleId,
      anneeId: args.anneeId,
      classe: args.classe,
      statut: args.statut ?? "inscrit",
      dateInscription: new Date().toISOString(),
      userId: args.userId,
    });

    // 🟡 Audit
    await ctx.db.insert("audit", {
      userId: args.actionUserId,
      action: "add_inscription",
      table: "inscriptions",
      documentId: newId,
      date: new Date().toISOString(),
      ecoleId: args.ecoleId,
      details: `Inscription de ${eleve.nom} ${eleve.postnom} en ${args.classe}`,
    });

    return { success: true, inscriptionId: newId };
  },
});

// ----- MUTATION : promotion des élèves -----
/**
 * 🟡 FIX : `userId` REQUIS + audit global + comptage.
 * 🟢 FIX : `.take()` sur les propositions.
 * 🟢 FIX : refuse `decisions` vide.
 */
export const promouvoirEleves = mutation({
  args: {
    ecoleId: v.id("ecoles"),
    anneeActuelleId: v.id("anneesScolaires"),
    nouvelleAnneeId: v.id("anneesScolaires"),
    decisions: v.array(
      v.object({
        eleveId: v.id("eleves"),
        statut: v.union(
          v.literal("passant"),
          v.literal("redoublant"),
          v.literal("transfere"),
          v.literal("exclu"),
          v.literal("diplome")
        ),
        classeDestination: v.optional(v.string()),
      })
    ),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireEcoleAdmin(ctx, args.userId, args.ecoleId);

    if (args.decisions.length === 0) {
      throw new Error("Aucune décision à appliquer.");
    }
    if (args.anneeActuelleId === args.nouvelleAnneeId) {
      throw new Error("L'année de destination doit être différente.");
    }

    const anneeActuelle = await ctx.db.get(args.anneeActuelleId);
    if (!anneeActuelle) throw new Error("Année actuelle introuvable.");
    if (anneeActuelle.ecoleId !== args.ecoleId) {
      throw new Error("Année actuelle n'appartient pas à cette école.");
    }
    const nouvelleAnnee = await ctx.db.get(args.nouvelleAnneeId);
    if (!nouvelleAnnee) throw new Error("La nouvelle année n'existe pas.");
    if (nouvelleAnnee.ecoleId !== args.ecoleId) {
      throw new Error("Nouvelle année n'appartient pas à cette école.");
    }

    let promoted = 0;
    let exited = 0;
    let skipped = 0;

    for (const decision of args.decisions) {
      const inscriptionActuelle = await ctx.db
        .query("inscriptions")
        .withIndex("by_eleve_annee", (q) =>
          q.eq("eleveId", decision.eleveId).eq("anneeId", args.anneeActuelleId)
        )
        .first();

      if (!inscriptionActuelle) {
        skipped++;
        continue;
      }

      let classeDestination = "";
      if (decision.statut === "passant") {
        if (!decision.classeDestination) {
          throw new Error(
            "La classe destination est requise pour un élève passant."
          );
        }
        classeDestination = decision.classeDestination;
      } else if (decision.statut === "redoublant") {
        classeDestination = inscriptionActuelle.classe;
      } else {
        // Transféré, exclu, diplômé → marquer la sortie
        await ctx.db.patch(inscriptionActuelle._id, {
          statut: decision.statut,
          dateSortie: new Date().toISOString(),
        });
        exited++;
        continue;
      }

      const existNouvelle = await ctx.db
        .query("inscriptions")
        .withIndex("by_eleve_annee", (q) =>
          q.eq("eleveId", decision.eleveId).eq("anneeId", args.nouvelleAnneeId)
        )
        .first();
      if (existNouvelle) {
        skipped++;
        continue;
      }

      await ctx.db.insert("inscriptions", {
        eleveId: decision.eleveId,
        ecoleId: args.ecoleId,
        anneeId: args.nouvelleAnneeId,
        classe: classeDestination,
        statut: decision.statut,
        dateInscription: new Date().toISOString(),
        userId: inscriptionActuelle.userId,
      });
      promoted++;
    }

    // 🟢 FIX : suppression propositions par batch + `.take()`
    const eleveIds = args.decisions.map((d) => d.eleveId);
    let deletedProps = 0;
    for (const eleveId of eleveIds) {
      const propositions = await ctx.db
        .query("propositionsPassage")
        .withIndex("by_eleve_annee", (q) =>
          q.eq("eleveId", eleveId).eq("anneeId", args.anneeActuelleId)
        )
        .take(100);
      for (const prop of propositions) {
        await ctx.db.delete(prop._id);
        deletedProps++;
      }
    }

    // 🟡 Audit
    await ctx.db.insert("audit", {
      userId: args.userId,
      action: "promouvoir_eleves",
      table: "inscriptions",
      documentId: args.ecoleId,
      date: new Date().toISOString(),
      ecoleId: args.ecoleId,
      details: `${promoted} promu(s), ${exited} sortie(s), ${skipped} ignoré(s), ${deletedProps} proposition(s) supprimée(s)`,
    });

    return {
      success: true,
      promoted,
      exited,
      skipped,
      deletedProps,
    };
  },
});

// ----- MUTATION : clôturer l'année scolaire -----
/**
 * 🟡 FIX : `userId` REQUIS + audit.
 */
export const cloturerAnnee = mutation({
  args: {
    ecoleId: v.id("ecoles"),
    anneeId: v.id("anneesScolaires"),
    nouvelleAnneeId: v.optional(v.id("anneesScolaires")),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireEcoleAdmin(ctx, args.userId, args.ecoleId);

    const annee = await ctx.db.get(args.anneeId);
    if (!annee || annee.ecoleId !== args.ecoleId) {
      throw new Error("Année introuvable ou ne correspond pas à l'école.");
    }
    if (!annee.estActive) {
      throw new Error("Cette année est déjà clôturée.");
    }

    await ctx.db.patch(args.anneeId, { estActive: false });

    if (args.nouvelleAnneeId) {
      const nouvelle = await ctx.db.get(args.nouvelleAnneeId);
      if (!nouvelle || nouvelle.ecoleId !== args.ecoleId) {
        throw new Error("Nouvelle année invalide.");
      }
      await ctx.db.patch(args.nouvelleAnneeId, { estActive: true });
    }

    // 🟡 Audit
    await ctx.db.insert("audit", {
      userId: args.userId,
      action: "cloturer_annee",
      table: "anneesScolaires",
      documentId: args.anneeId,
      date: new Date().toISOString(),
      ecoleId: args.ecoleId,
      details: `Clôture de l'année ${annee.nom}${
        args.nouvelleAnneeId ? ` · nouvelle année activée` : ""
      }`,
    });

    return { success: true };
  },
});

// ----- MUTATION : migration des anciennes données -----
/**
 * 🔴 FIX : la migration était un no-op sans auth → n'importe qui pouvait
 * la déclencher. Désormais :
 *  - réservée superAdmin
 *  - retourne un vrai résultat
 *  - si tu veux l'activer un jour, écris la vraie logique ici.
 */
export const migrateElevesToInscriptions = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const caller = await ctx.db.get(args.userId);
    if (!caller || !isSuperAdmin(caller)) {
      throw new Error("Réservé au super-admin.");
    }

    // ⚠️ Migration désactivée volontairement. Implémente la vraie logique
    // (ex: créer des inscriptions pour les élèves qui n'en ont pas)
    // avant de retirer ce garde-fou.
    return {
      success: true,
      skipped: true,
      message: "Migration non implémentée — voir commentaire dans le code.",
    };
  },
});