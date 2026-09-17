import { query, mutation, MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

type AnyCtx = MutationCtx | QueryCtx;

const MAX_CLASSES = 500;

/**
 * 🔴 FIX GLOBAL : tout superAdmin passe désormais (avant : seuls
 * les superAdmins SANS permissions étaient reconnus comme principaux).
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

// ========== QUERY ==========

/**
 * ✅ FIX : `userId` devient OPTIONNEL.
 * Si fourni → vérifie le cloisonnement école.
 * Limite ajoutée pour éviter les gros volumes.
 */
export const list = query({
  args: {
    ecoleId: v.optional(v.id("ecoles")),
    anneeId: v.optional(v.id("anneesScolaires")),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const { ecoleId, anneeId, userId } = args;

    // ✅ Cloisonnement si userId fourni
    if (userId) {
      const caller = await ctx.db.get(userId);
      if (!caller) throw new Error("Authentification requise");

      if (!isSuperAdmin(caller)) {
        if (!caller.ecoleId) throw new Error("Accès refusé");
        if (ecoleId && ecoleId !== caller.ecoleId) {
          throw new Error("Accès refusé : école différente.");
        }
      }
    }

    // Résolution de l'école cible
    let targetEcoleId = ecoleId;
    if (userId) {
      const caller = await ctx.db.get(userId);
      if (caller && !isSuperAdmin(caller)) {
        targetEcoleId = caller.ecoleId;
      }
    }

    let classes: any[] = [];

    if (targetEcoleId) {
      classes = await ctx.db
        .query("classes")
        .withIndex("by_ecoleId", (q) => q.eq("ecoleId", targetEcoleId!))
        .take(MAX_CLASSES);
    } else {
      classes = await ctx.db.query("classes").take(MAX_CLASSES);
    }

    if (anneeId) {
      classes = classes.filter((c) => c.anneeId === anneeId);
    }

    return classes.sort((a, b) =>
      a.nom.localeCompare(b.nom, undefined, {
        numeric: true,
        sensitivity: "base",
      })
    );
  },
});

// ========== MUTATIONS ==========

/**
 * 🟡 FIX : `userId` devient REQUIS (avant optional → crash silencieux).
 * Audit ajouté.
 */
export const add = mutation({
  args: {
    nom: v.string(),
    ecoleId: v.id("ecoles"),
    anneeId: v.optional(v.id("anneesScolaires")),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireEcoleAdmin(ctx, args.userId, args.ecoleId);

    const nom = args.nom.trim();
    if (!nom) throw new Error("Le nom de la classe est requis.");

    const existingClasses = await ctx.db
      .query("classes")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId))
      .collect();

    const doublon = existingClasses.some(
      (c) =>
        c.nom === nom &&
        (args.anneeId ? c.anneeId === args.anneeId : !c.anneeId)
    );
    if (doublon) throw new Error("Cette classe existe déjà pour cette année.");

    const newId = await ctx.db.insert("classes", {
      nom,
      ecoleId: args.ecoleId,
      anneeId: args.anneeId,
    });

    // 🟡 Audit
    await ctx.db.insert("audit", {
      userId: args.userId,
      action: "create_classe",
      table: "classes",
      documentId: newId,
      date: new Date().toISOString(),
      ecoleId: args.ecoleId,
      details: `Création de la classe "${nom}"`,
    });

    return { success: true, classeId: newId };
  },
});

/**
 * 🟡 FIX : `userId` requis + audit.
 */
export const remove = mutation({
  args: {
    id: v.id("classes"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const classe = await ctx.db.get(args.id);
    if (!classe) throw new Error("Classe introuvable");
    await requireEcoleAdmin(ctx, args.userId, classe.ecoleId);

    const anneeId: Id<"anneesScolaires"> | undefined = classe.anneeId;

    let inscriptions: any[] = [];

    if (anneeId) {
      inscriptions = await ctx.db
        .query("inscriptions")
        .withIndex("by_ecole_annee", (q) =>
          q.eq("ecoleId", classe.ecoleId).eq("anneeId", anneeId)
        )
        .collect();
    } else {
      const all = await ctx.db.query("inscriptions").collect();
      inscriptions = all.filter((i) => i.ecoleId === classe.ecoleId);
    }

    const inscriptionsDansClasse = inscriptions.filter(
      (i) => i.classe === classe.nom
    );

    if (inscriptionsDansClasse.length > 0) {
      throw new Error("Des élèves sont encore inscrits dans cette classe.");
    }

    await ctx.db.delete(args.id);

    // 🟡 Audit
    await ctx.db.insert("audit", {
      userId: args.userId,
      action: "delete_classe",
      table: "classes",
      documentId: args.id,
      date: new Date().toISOString(),
      ecoleId: classe.ecoleId,
      details: `Suppression de la classe "${classe.nom}"`,
    });

    return { success: true };
  },
});

/**
 * 🟡 FIX : `userId` requis.
 */
export const updateEleveClasse = mutation({
  args: {
    eleveId: v.id("eleves"),
    newClasseNom: v.string(),
    anneeId: v.id("anneesScolaires"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { eleveId, newClasseNom, anneeId } = args;

    const eleve = await ctx.db.get(eleveId);
    if (!eleve) throw new Error("Élève introuvable.");

    await requireEcoleAdmin(ctx, args.userId, eleve.ecoleId);

    if (newClasseNom !== "") {
      const classe = await ctx.db
        .query("classes")
        .withIndex("by_ecoleId", (q) => q.eq("ecoleId", eleve.ecoleId))
        .filter((q) => q.eq(q.field("nom"), newClasseNom))
        .first();
      if (!classe) {
        throw new Error("La classe spécifiée n'existe pas.");
      }
      if (classe.anneeId && classe.anneeId !== anneeId) {
        throw new Error(
          "La classe n'appartient pas à l'année scolaire sélectionnée."
        );
      }
    }

    const inscription = await ctx.db
      .query("inscriptions")
      .withIndex("by_eleve_annee", (q) =>
        q.eq("eleveId", eleveId).eq("anneeId", anneeId)
      )
      .first();

    if (!inscription) {
      throw new Error(
        "Cet élève n'a pas d'inscription pour l'année sélectionnée."
      );
    }

    await ctx.db.patch(inscription._id, { classe: newClasseNom });

    return { success: true };
  },
});

/**
 * 🟡 FIX : `userId` requis + audit.
 */
export const rename = mutation({
  args: {
    id: v.id("classes"),
    nom: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const classe = await ctx.db.get(args.id);
    if (!classe) throw new Error("Classe introuvable");
    await requireEcoleAdmin(ctx, args.userId, classe.ecoleId);

    const trimmed = args.nom.trim();
    if (!trimmed) throw new Error("Le nom est requis.");

    const existing = await ctx.db
      .query("classes")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", classe.ecoleId))
      .collect();
    const conflit = existing.some(
      (c) =>
        c._id !== args.id &&
        c.nom === trimmed &&
        (classe.anneeId ? c.anneeId === classe.anneeId : !c.anneeId)
    );
    if (conflit)
      throw new Error("Une classe avec ce nom existe déjà pour cette année.");

    const ancienNom = classe.nom;
    await ctx.db.patch(args.id, { nom: trimmed });

    // 🟡 Audit
    await ctx.db.insert("audit", {
      userId: args.userId,
      action: "rename_classe",
      table: "classes",
      documentId: args.id,
      date: new Date().toISOString(),
      ecoleId: classe.ecoleId,
      details: `Renommage : "${ancienNom}" → "${trimmed}"`,
    });

    return { success: true };
  },
});

/**
 * 🟡 FIX : `userId` requis + audit.
 */
export const importClasses = mutation({
  args: {
    noms: v.array(v.string()),
    ecoleId: v.id("ecoles"),
    anneeId: v.optional(v.id("anneesScolaires")),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireEcoleAdmin(ctx, args.userId, args.ecoleId);

    const existingClasses = await ctx.db
      .query("classes")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId))
      .collect();
    const existingNames = new Set(existingClasses.map((c) => c.nom));
    let inserted = 0;
    const duplicates: string[] = [];

    for (const nom of args.noms) {
      const trimmed = nom.trim();
      if (!trimmed) continue;
      if (existingNames.has(trimmed)) {
        duplicates.push(trimmed);
        continue;
      }
      await ctx.db.insert("classes", {
        nom: trimmed,
        ecoleId: args.ecoleId,
        anneeId: args.anneeId,
      });
      existingNames.add(trimmed);
      inserted++;
    }

    // 🟡 Audit
    if (inserted > 0) {
      await ctx.db.insert("audit", {
        userId: args.userId,
        action: "import_classes",
        table: "classes",
        documentId: args.ecoleId,
        date: new Date().toISOString(),
        ecoleId: args.ecoleId,
        details: `${inserted} classe(s) importée(s), ${duplicates.length} doublon(s)`,
      });
    }

    return { inserted, duplicates };
  },
});