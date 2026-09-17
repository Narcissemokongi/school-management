import { query, mutation, MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

type AnyCtx = MutationCtx | QueryCtx;

const MAX_ELEVES = 1000;

// 🟢 FIX : CSPRNG pour le matricule (avant : Math.random)
function generateMatricule(length = 6): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const arr = new Uint32Array(length);
  crypto.getRandomValues(arr);
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars.charAt(arr[i] % chars.length);
  }
  return code;
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

// 🟢 FIX : O(n) avec Map au lieu de O(n²) avec find() imbriqué
async function enrichInscriptionsWithEleves(ctx: AnyCtx, inscriptions: any[]) {
  if (inscriptions.length === 0) return [];
  const eleveIds = [...new Set(inscriptions.map((i) => i.eleveId))];
  const eleves = await Promise.all(eleveIds.map((id) => ctx.db.get(id)));
  const eleveMap = new Map(
    eleves.filter(Boolean).map((e) => [e!._id, e!])
  );

  return inscriptions
    .map((insc) => {
      const eleve = eleveMap.get(insc.eleveId);
      if (!eleve) return null;
      return {
        ...eleve,
        ...insc,
        _id: eleve._id,
      };
    })
    .filter(Boolean);
}

// ========== QUERIES ==========

/**
 * ✅ FIX : `userId` optionnel mais cloisonnement appliqué si fourni.
 * 🔴 Avant : un admin d'école A pouvait lister TOUS les élèves de toutes les écoles.
 * 🟢 Limite `.take(MAX_ELEVES)`.
 */
export const list = query({
  args: {
    ecoleId: v.optional(v.id("ecoles")),
    anneeId: v.optional(v.id("anneesScolaires")),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const { userId, ecoleId, anneeId } = args;

    // Résolution de l'école cible + vérification des droits
    let targetEcoleId = ecoleId;
    let caller: any = null;

    if (userId) {
      caller = await ctx.db.get(userId as Id<"users">);
      if (!caller) throw new Error("Utilisateur introuvable");

      // 🟡 Cas parent : retourner uniquement ses enfants
      if (caller.role === "parent") {
        const eleves = await ctx.db
          .query("eleves")
          .withIndex("by_parentId", (q) => q.eq("parentId", userId))
          .take(MAX_ELEVES);

        if (anneeId) {
          const inscriptions = await ctx.db
            .query("inscriptions")
            .withIndex("by_anneeId", (q) => q.eq("anneeId", anneeId))
            .take(MAX_ELEVES);
          const inscByEleve = new Map(inscriptions.map((i) => [i.eleveId, i]));
          return eleves
            .filter((e) => inscByEleve.has(e._id))
            .map((e) => ({ ...inscByEleve.get(e._id), ...e, _id: e._id }));
        }
        return eleves;
      }

      // 🔴 FIX : cloisonnement école pour les non-superAdmin
      if (!isSuperAdmin(caller)) {
        if (!caller.ecoleId) throw new Error("Accès refusé");
        if (ecoleId && caller.ecoleId !== ecoleId) {
          throw new Error("Accès refusé : école différente.");
        }
        targetEcoleId = caller.ecoleId;
      }
    }

    if (anneeId) {
      let q = ctx.db
        .query("inscriptions")
        .withIndex("by_anneeId", (q) => q.eq("anneeId", anneeId));
      if (targetEcoleId) {
        q = q.filter((q) => q.eq(q.field("ecoleId"), targetEcoleId));
      }
      const inscriptions = await q.take(MAX_ELEVES);
      return await enrichInscriptionsWithEleves(ctx, inscriptions);
    }

    if (targetEcoleId) {
      return await ctx.db
        .query("eleves")
        .withIndex("by_ecoleId", (q) => q.eq("ecoleId", targetEcoleId!))
        .take(MAX_ELEVES);
    }

    // 🟢 FIX : ne plus retourner TOUS les élèves sans auth
    if (!userId) {
      throw new Error("Authentification requise pour lister les élèves.");
    }
    return await ctx.db.query("eleves").take(MAX_ELEVES);
  },
});

/**
 * ✅ `listByParent` — ajout `userId` optionnel pour cloisonnement.
 * 🔴 Avant : un client pouvait lister les enfants de n'importe quel parent.
 */
export const listByParent = query({
  args: {
    parentId: v.id("users"),
    anneeId: v.optional(v.id("anneesScolaires")),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const { parentId, anneeId, userId } = args;

    // 🟡 FIX : si userId fourni, il doit être soit le parent, soit un admin
    if (userId) {
      const caller = await ctx.db.get(userId as Id<"users">);
      if (!caller) throw new Error("Utilisateur introuvable");
      if (caller._id !== parentId && !isSuperAdmin(caller)) {
        const isEcoleAdmin =
          (caller.role === "admin" || caller.role === "directeur") &&
          caller.ecoleId;
        if (!isEcoleAdmin) {
          throw new Error("Accès refusé : vous ne pouvez voir que vos propres enfants.");
        }
      }
    }

    const eleves = await ctx.db
      .query("eleves")
      .withIndex("by_parentId", (q) => q.eq("parentId", parentId))
      .take(MAX_ELEVES);

    if (anneeId) {
      const inscriptions = await ctx.db
        .query("inscriptions")
        .withIndex("by_anneeId", (q) => q.eq("anneeId", anneeId))
        .take(MAX_ELEVES);
      const inscByEleve = new Map(inscriptions.map((i) => [i.eleveId, i]));
      return eleves
        .filter((e) => inscByEleve.has(e._id))
        .map((e) => ({ ...inscByEleve.get(e._id), ...e, _id: e._id }));
    }
    return eleves;
  },
});

/**
 * ✅ `getByUserId` — inchangé au niveau signature.
 */
export const getByUserId = query({
  args: {
    userId: v.id("users"),
    anneeId: v.optional(v.id("anneesScolaires")),
  },
  handler: async (ctx, args) => {
    const { userId, anneeId } = args;

    const eleve = await ctx.db
      .query("eleves")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (!eleve) return null;

    if (anneeId) {
      const inscription = await ctx.db
        .query("inscriptions")
        .withIndex("by_eleve_annee", (q) =>
          q.eq("eleveId", eleve._id).eq("anneeId", anneeId)
        )
        .first();
      return inscription ? { ...inscription, ...eleve, _id: eleve._id } : eleve;
    }
    return eleve;
  },
});

/**
 * `get` — inchangé.
 */
export const get = query({
  args: { id: v.id("eleves") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * ✅ `listByClasse` — ajout `userId` optionnel + `.take()`.
 */
export const listByClasse = query({
  args: {
    ecoleId: v.id("ecoles"),
    anneeId: v.id("anneesScolaires"),
    classe: v.string(),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const { ecoleId, anneeId, classe, userId } = args;

    // 🟡 FIX : cloisonnement si userId fourni
    if (userId) {
      const caller = await ctx.db.get(userId as Id<"users">);
      if (!caller) throw new Error("Utilisateur introuvable");
      if (!isSuperAdmin(caller)) {
        if (caller.ecoleId !== ecoleId) {
          throw new Error("Accès refusé : école différente.");
        }
      }
    }

    const inscriptions = await ctx.db
      .query("inscriptions")
      .withIndex("by_classe_annee", (q) =>
        q.eq("classe", classe).eq("anneeId", anneeId)
      )
      .filter((q) => q.eq(q.field("ecoleId"), ecoleId))
      .take(MAX_ELEVES);
    return await enrichInscriptionsWithEleves(ctx, inscriptions);
  },
});

// ========== MUTATIONS ==========

/**
 * 🟡 FIX : `userId` devient REQUIS + audit.
 * 🟢 FIX : génère un code de matricule si non fourni.
 */
export const add = mutation({
  args: {
    nom: v.string(),
    postnom: v.string(),
    prenom: v.optional(v.string()),
    code: v.optional(v.string()),
    ecoleId: v.id("ecoles"),
    sexe: v.optional(v.union(v.literal("M"), v.literal("F"))),
    dateNaissance: v.optional(v.string()),
    lieuNaissance: v.optional(v.string()),
    province: v.optional(v.string()),
    territoire: v.optional(v.string()),
    secteur: v.optional(v.string()),
    village: v.optional(v.string()),
    adresse: v.optional(v.string()),
    telephone: v.optional(v.string()),
    nomPere: v.optional(v.string()),
    nomMere: v.optional(v.string()),
    tuteurNom: v.optional(v.string()),
    tuteurTelephone: v.optional(v.string()),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireEcoleAdmin(ctx, args.userId, args.ecoleId);

    // 🟢 FIX : générer un matricule unique si non fourni
    let code = args.code?.trim();
    if (!code) {
      let attempts = 0;
      while (attempts < 10) {
        code = generateMatricule();
        const existing = await ctx.db
          .query("eleves")
          .withIndex("by_code", (q) => q.eq("code", code!))
          .first();
        if (!existing) break;
        attempts++;
      }
      if (attempts >= 10) {
        throw new Error("Impossible de générer un matricule unique. Réessayez.");
      }
    }

    const newId = await ctx.db.insert("eleves", {
      nom: args.nom,
      postnom: args.postnom,
      prenom: args.prenom,
      code,
      ecoleId: args.ecoleId,
      sexe: args.sexe,
      dateNaissance: args.dateNaissance,
      lieuNaissance: args.lieuNaissance,
      province: args.province,
      territoire: args.territoire,
      secteur: args.secteur,
      village: args.village,
      adresse: args.adresse,
      telephone: args.telephone,
      nomPere: args.nomPere,
      nomMere: args.nomMere,
      tuteurNom: args.tuteurNom,
      tuteurTelephone: args.tuteurTelephone,
      codeUtilise: false,
    });

    // 🟡 Audit
    await ctx.db.insert("audit", {
      userId: args.userId,
      action: "create_eleve",
      table: "eleves",
      documentId: newId,
      date: new Date().toISOString(),
      ecoleId: args.ecoleId,
      details: `Création de l'élève ${args.nom} ${args.postnom} (matricule: ${code})`,
    });

    return { success: true, eleveId: newId, code };
  },
});

/**
 * 🟡 FIX : `actionUserId` devient REQUIS + audit.
 */
export const update = mutation({
  args: {
    id: v.id("eleves"),
    nom: v.optional(v.string()),
    postnom: v.optional(v.string()),
    prenom: v.optional(v.string()),
    code: v.optional(v.string()),
    sexe: v.optional(v.union(v.literal("M"), v.literal("F"))),
    dateNaissance: v.optional(v.string()),
    lieuNaissance: v.optional(v.string()),
    province: v.optional(v.string()),
    territoire: v.optional(v.string()),
    secteur: v.optional(v.string()),
    village: v.optional(v.string()),
    adresse: v.optional(v.string()),
    telephone: v.optional(v.string()),
    nomPere: v.optional(v.string()),
    nomMere: v.optional(v.string()),
    tuteurNom: v.optional(v.string()),
    tuteurTelephone: v.optional(v.string()),
    parentId: v.optional(v.id("users")),
    actionUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { id, actionUserId, ...fields } = args;
    const eleve = await ctx.db.get(id);
    if (!eleve) throw new Error("Élève introuvable");
    await requireEcoleAdmin(ctx, actionUserId, eleve.ecoleId);

    // 🟢 FIX : évite un patch vide
    if (Object.keys(fields).length === 0) {
      return { success: true, noChange: true };
    }

    await ctx.db.patch(id, fields);

    // 🟡 Audit
    await ctx.db.insert("audit", {
      userId: actionUserId,
      action: "update_eleve",
      table: "eleves",
      documentId: id,
      date: new Date().toISOString(),
      ecoleId: eleve.ecoleId,
      details: `Mise à jour de l'élève ${eleve.nom} ${eleve.postnom}`,
    });

    return { success: true };
  },
});

/**
 * 🟡 FIX : `actionUserId` REQUIS + audit.
 */
export const associerParent = mutation({
  args: {
    eleveId: v.id("eleves"),
    parentId: v.optional(v.id("users")),
    actionUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const eleve = await ctx.db.get(args.eleveId);
    if (!eleve) throw new Error("Élève introuvable");
    await requireEcoleAdmin(ctx, args.actionUserId, eleve.ecoleId);

    await ctx.db.patch(args.eleveId, { parentId: args.parentId });

    // 🟡 Audit
    await ctx.db.insert("audit", {
      userId: args.actionUserId,
      action: args.parentId ? "associer_parent" : "dissocier_parent",
      table: "eleves",
      documentId: args.eleveId,
      date: new Date().toISOString(),
      ecoleId: eleve.ecoleId,
      details: args.parentId
        ? `Parent ${args.parentId} associé à l'élève ${eleve.nom}`
        : `Parent dissocié de l'élève ${eleve.nom}`,
    });

    return { success: true };
  },
});

/**
 * 🟡 FIX : `actionUserId` REQUIS + audit.
 */
export const associerCompteEleve = mutation({
  args: {
    eleveId: v.id("eleves"),
    userId: v.optional(v.id("users")),
    actionUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const eleve = await ctx.db.get(args.eleveId);
    if (!eleve) throw new Error("Élève introuvable");
    await requireEcoleAdmin(ctx, args.actionUserId, eleve.ecoleId);

    await ctx.db.patch(args.eleveId, { userId: args.userId });

    // 🟡 Audit
    await ctx.db.insert("audit", {
      userId: args.actionUserId,
      action: args.userId ? "associer_compte_eleve" : "dissocier_compte_eleve",
      table: "eleves",
      documentId: args.eleveId,
      date: new Date().toISOString(),
      ecoleId: eleve.ecoleId,
      details: args.userId
        ? `Compte ${args.userId} associé à l'élève ${eleve.nom}`
        : `Compte dissocié de l'élève ${eleve.nom}`,
    });

    return { success: true };
  },
});

/**
 * 🟡 FIX : `actionUserId` REQUIS + limite tentatives matricule + audit + comptage.
 */
export const importEleves = mutation({
  args: {
    eleves: v.array(
      v.object({
        nom: v.string(),
        postnom: v.string(),
        prenom: v.optional(v.string()),
        classe: v.string(),
      })
    ),
    ecoleId: v.id("ecoles"),
    anneeId: v.id("anneesScolaires"),
    actionUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireEcoleAdmin(ctx, args.actionUserId, args.ecoleId);

    if (args.eleves.length === 0) {
      throw new Error("Aucun élève à importer.");
    }

    let inserted = 0;

    for (const el of args.eleves) {
      // 🟢 FIX : limite de tentatives pour éviter une boucle infinie
      let code = "";
      let attempts = 0;
      while (attempts < 10) {
        code = generateMatricule();
        const existingCode = await ctx.db
          .query("eleves")
          .withIndex("by_code", (q) => q.eq("code", code))
          .first();
        if (!existingCode) break;
        attempts++;
      }
      if (attempts >= 10) {
        throw new Error(
          `Impossible de générer un matricule pour ${el.nom} ${el.postnom}.`
        );
      }

      const eleveId = await ctx.db.insert("eleves", {
        nom: el.nom,
        postnom: el.postnom,
        prenom: el.prenom,
        code,
        codeUtilise: false,
        ecoleId: args.ecoleId,
      });

      await ctx.db.insert("inscriptions", {
        eleveId,
        ecoleId: args.ecoleId,
        anneeId: args.anneeId,
        classe: el.classe,
        statut: "inscrit",
        dateInscription: new Date().toISOString(),
      });

      inserted++;
    }

    // 🟡 Audit
    await ctx.db.insert("audit", {
      userId: args.actionUserId,
      action: "import_eleves",
      table: "eleves",
      documentId: args.ecoleId,
      date: new Date().toISOString(),
      ecoleId: args.ecoleId,
      details: `${inserted} élève(s) importé(s) pour l'année ${args.anneeId}`,
    });

    return { success: true, inserted };
  },
});

/**
 * 🟡 FIX : `actionUserId` REQUIS + audit.
 */
export const updateDecision = mutation({
  args: {
    inscriptionId: v.id("inscriptions"),
    decision: v.string(),
    actionUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const inscription = await ctx.db.get(args.inscriptionId);
    if (!inscription) throw new Error("Inscription introuvable");
    await requireEcoleAdmin(ctx, args.actionUserId, inscription.ecoleId);

    await ctx.db.patch(args.inscriptionId, { decisionConseil: args.decision });

    // 🟡 Audit
    await ctx.db.insert("audit", {
      userId: args.actionUserId,
      action: "update_decision",
      table: "inscriptions",
      documentId: args.inscriptionId,
      date: new Date().toISOString(),
      ecoleId: inscription.ecoleId,
      details: `Décision du conseil : ${args.decision}`,
    });

    return { success: true };
  },
});

/**
 * 🟡 FIX : `actionUserId` REQUIS + audit + suppression batch par table.
 * 🟢 FIX : limite `.take(500)` par table pour éviter timeout.
 */
export const remove = mutation({
  args: {
    id: v.id("eleves"),
    actionUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const eleve = await ctx.db.get(args.id);
    if (!eleve) throw new Error("Élève introuvable");
    await requireEcoleAdmin(ctx, args.actionUserId, eleve.ecoleId);

    // Suppression des inscriptions
    const inscriptions = await ctx.db
      .query("inscriptions")
      .withIndex("by_eleveId", (q) => q.eq("eleveId", args.id))
      .take(500);
    for (const ins of inscriptions) {
      await ctx.db.delete(ins._id);
    }

    // Suppression des données liées (batch 500 par table)
    const tables = ["notes", "absences", "frais", "punitions"];
    let totalDeleted = 0;
    for (const table of tables) {
      const records = await ctx.db
        .query(table as any)
        .filter((q: any) => q.eq(q.field("eleveId"), args.id))
        .take(500);
      for (const rec of records) {
        await ctx.db.delete(rec._id);
        totalDeleted++;
      }
    }

    // Suppression de l'élève
    await ctx.db.delete(args.id);

    // 🟡 Audit
    await ctx.db.insert("audit", {
      userId: args.actionUserId,
      action: "delete_eleve",
      table: "eleves",
      documentId: args.id,
      date: new Date().toISOString(),
      ecoleId: eleve.ecoleId,
      details: `Suppression de l'élève ${eleve.nom} ${eleve.postnom} (${inscriptions.length} inscription(s), ${totalDeleted} enregistrement(s) lié(s))`,
    });

    return { success: true, deletedInscriptions: inscriptions.length, deletedRecords: totalDeleted };
  },
});