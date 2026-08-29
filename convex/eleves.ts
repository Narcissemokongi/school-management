import { query, mutation, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "../convex/_generated/dataModel";

function generateMatricule(length = 6): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

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

// ========== QUERIES ==========

// Liste des élèves inscrits pour une année donnée (avec infos élève)
export const list = query({
  args: {
    ecoleId: v.optional(v.id("ecoles")),
    anneeId: v.optional(v.id("anneesScolaires")),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const { userId, ecoleId, anneeId } = args;

    // Cas parent : retourner directement les élèves liés au parent
    if (userId) {
      const user = await ctx.db.get(userId as Id<"users">);
      if (user?.role === "parent") {
        const eleves = await ctx.db
          .query("eleves")
          .withIndex("by_parentId", (q) => q.eq("parentId", userId))
          .collect();

        if (anneeId) {
          const inscriptions = await ctx.db
            .query("inscriptions")
            .withIndex("by_anneeId", (q) => q.eq("anneeId", anneeId))
            .collect();
          const inscByEleve = new Map(inscriptions.map((i) => [i.eleveId, i]));
          return eleves
            .filter((e) => inscByEleve.has(e._id))
            .map((e) => ({ ...inscByEleve.get(e._id), ...e, _id: e._id })); // ✅ _id élève
        }
        return eleves;
      }
    }

    // Si une année est fournie, on joint les inscriptions et les élèves
    if (anneeId) {
      let q = ctx.db
        .query("inscriptions")
        .withIndex("by_anneeId", (q) => q.eq("anneeId", anneeId));
      if (ecoleId) {
        q = q.filter((q) => q.eq(q.field("ecoleId"), ecoleId));
      }
      const inscriptions = await q.collect();
      return await enrichInscriptionsWithEleves(ctx, inscriptions);
    }

    // Sinon, on retourne tous les élèves (sans inscription)
    if (ecoleId) {
      return await ctx.db
        .query("eleves")
        .withIndex("by_ecoleId", (q) => q.eq("ecoleId", ecoleId))
        .collect();
    }
    return await ctx.db.query("eleves").collect();
  },
});

// Liste des élèves par parent (avec inscription de l'année si fournie)
export const listByParent = query({
  args: {
    parentId: v.id("users"),
    anneeId: v.optional(v.id("anneesScolaires")),
  },
  handler: async (ctx, args) => {
    const { parentId, anneeId } = args;

    const eleves = await ctx.db
      .query("eleves")
      .withIndex("by_parentId", (q) => q.eq("parentId", parentId))
      .collect();

    if (anneeId) {
      const inscriptions = await ctx.db
        .query("inscriptions")
        .withIndex("by_anneeId", (q) => q.eq("anneeId", anneeId))
        .collect();
      const inscByEleve = new Map(inscriptions.map((i) => [i.eleveId, i]));
      return eleves
        .filter((e) => inscByEleve.has(e._id))
        .map((e) => ({ ...inscByEleve.get(e._id), ...e, _id: e._id })); // ✅ _id élève
    }
    return eleves;
  },
});

// Récupérer un élève par son compte utilisateur (avec inscription active)
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
      return inscription ? { ...inscription, ...eleve, _id: eleve._id } : eleve; // ✅ _id élève
    }
    return eleve;
  },
});

// Récupérer un élève par ID
export const get = query({
  args: { id: v.id("eleves") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Lister les élèves d'une classe spécifique pour une année
export const listByClasse = query({
  args: {
    ecoleId: v.id("ecoles"),
    anneeId: v.id("anneesScolaires"),
    classe: v.string(),
  },
  handler: async (ctx, args) => {
    const { ecoleId, anneeId, classe } = args;

    const inscriptions = await ctx.db
      .query("inscriptions")
      .withIndex("by_classe_annee", (q) =>
        q.eq("classe", classe).eq("anneeId", anneeId)
      )
      .filter((q) => q.eq(q.field("ecoleId"), ecoleId))
      .collect();
    return await enrichInscriptionsWithEleves(ctx, inscriptions);
  },
});

// ========== MUTATIONS ==========

// Ajouter un élève (sans inscription, l'inscription se fait séparément)
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
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // Vérification du rôle
    await requireRole(ctx, args.userId, ["admin", "directeur"]);
    
    // On insère l'élève dans la table eleves
    await ctx.db.insert("eleves", {
      nom: args.nom,
      postnom: args.postnom,
      prenom: args.prenom,
      code: args.code,
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
      userId: args.userId,
    });
  },
});

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
    userId: v.optional(v.id("users")),
    parentId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
  },
});

// Associer un parent à un élève (ou dissocier avec undefined)
export const associerParent = mutation({
  args: {
    eleveId: v.id("eleves"),
    parentId: v.optional(v.id("users")), // undefined pour dissocier
    actionUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.actionUserId, ["admin", "directeur"]);
    await ctx.db.patch(args.eleveId, { parentId: args.parentId });
  },
});

// Associer un compte utilisateur (élève) à un élève (ou dissocier avec undefined)
export const associerCompteEleve = mutation({
  args: {
    eleveId: v.id("eleves"),
    userId: v.optional(v.id("users")), // undefined pour dissocier
    actionUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.actionUserId, ["admin", "directeur"]);
    await ctx.db.patch(args.eleveId, { userId: args.userId });
  },
});

// Importer plusieurs élèves avec leurs inscriptions
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
    actionUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.actionUserId, ["admin", "directeur"]);

    for (const el of args.eleves) {
      // Générer le matricule
      let code = "";
      let codeUnique = false;
      while (!codeUnique) {
        code = generateMatricule();
        const existingCode = await ctx.db
          .query("eleves")
          .withIndex("by_code", (q) => q.eq("code", code))
          .first();
        if (!existingCode) codeUnique = true;
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
    }
  },
});

// Mettre à jour la décision du conseil de classe (pour une inscription)
export const updateDecision = mutation({
  args: {
    inscriptionId: v.id("inscriptions"),
    decision: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.inscriptionId, { decisionConseil: args.decision });
    return { success: true };
  },
});

// Supprimer un élève (et ses inscriptions + données liées)
export const remove = mutation({
  args: {
    id: v.id("eleves"),
    actionUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.actionUserId, ["admin", "directeur"]);

    // Supprimer les inscriptions
    const inscriptions = await ctx.db
      .query("inscriptions")
      .withIndex("by_eleveId", (q) => q.eq("eleveId", args.id))
      .collect();
    for (const ins of inscriptions) {
      await ctx.db.delete(ins._id);
    }

    // Supprimer les données liées
    const tables = ["notes", "absences", "frais", "punitions"];
    for (const table of tables) {
      const records = await ctx.db
        .query(table as any)
        .filter((q: any) => q.eq(q.field("eleveId"), args.id))
        .collect();
      for (const rec of records) {
        await ctx.db.delete(rec._id);
      }
    }

    await ctx.db.delete(args.id);
    return { success: true };
  },
});

// ========== FONCTION UTILITAIRE ==========
async function enrichInscriptionsWithEleves(ctx: any, inscriptions: any[]) {
  const eleveIds = inscriptions.map((i) => i.eleveId);
  const eleves = await Promise.all(
    eleveIds.map((id) => ctx.db.get(id))
  );
  return inscriptions
    .map((insc) => {
      const eleve = eleves.find((e) => e && e._id === insc.eleveId);
      if (!eleve) return null;
      return {
        ...eleve,
        ...insc,
        _id: eleve._id,
      };
    })
    .filter(Boolean);
}