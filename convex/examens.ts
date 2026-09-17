import { mutation, query, QueryCtx, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Type générique : fonctionne pour queries ET mutations
type AnyCtx = QueryCtx | MutationCtx;

// ============================================================
// HELPERS AUTH
// ============================================================

// ✅ FIX universel : superAdmin reconnu indépendamment des permissions
function isSuperAdmin(user: {
  role: string;
  ecoleId?: Id<"ecoles"> | null;
}): boolean {
  return (
    user.role === "superAdmin" ||
    (user.role === "admin" && !user.ecoleId)
  );
}

// Pour les MUTATIONS : exige admin/directeur de l'école ou superAdmin
async function requireEcoleAdmin(
  ctx: AnyCtx,
  userId: Id<"users"> | undefined,
  ecoleId: Id<"ecoles">
) {
  if (!userId) throw new Error("Authentification requise");
  const user = await ctx.db.get(userId);
  if (!user) throw new Error("Utilisateur introuvable");

  if (isSuperAdmin(user)) return user;

  const isEcoleAdmin =
    (user.role === "admin" || user.role === "directeur") &&
    user.ecoleId === ecoleId;

  if (!isEcoleAdmin) {
    throw new Error(
      "Accès refusé : vous n'êtes pas autorisé à gérer les examens de cette école."
    );
  }
  return user;
}

// Pour les QUERIES : autorise tout utilisateur rattaché à l'école + superAdmin
async function assertSameEcole(
  ctx: AnyCtx,
  userId: Id<"users"> | undefined,
  ecoleId: Id<"ecoles">
) {
  if (!userId) throw new Error("Authentification requise");
  const user = await ctx.db.get(userId);
  if (!user) throw new Error("Utilisateur introuvable");

  if (isSuperAdmin(user)) return user;

  if (user.ecoleId !== ecoleId) {
    throw new Error(
      "Accès refusé : cette école ne correspond pas à la vôtre."
    );
  }
  return user;
}

// ============================================================
// QUERIES
// ============================================================

export const listByClasse = query({
  args: {
    ecoleId: v.id("ecoles"),
    anneeId: v.id("anneesScolaires"),
    classe: v.string(),
    userId: v.id("users"), // ✅ requis (auth)
  },
  handler: async (ctx, args) => {
    await assertSameEcole(ctx, args.userId, args.ecoleId);

    // Extraction pour narrowing TS
    const classe = args.classe;
    const ecoleId = args.ecoleId;
    const anneeId = args.anneeId;

    return await ctx.db
      .query("examens")
      .withIndex("by_classe", (q) =>
        q.eq("classe", classe).eq("ecoleId", ecoleId)
      )
      .filter((q) => q.eq(q.field("anneeId"), anneeId))
      .take(500); // ✅ limite raisonnable (une classe = max ~30 examens)
  },
});

export const listByEcole = query({
  args: {
    ecoleId: v.id("ecoles"),
    anneeId: v.id("anneesScolaires"),
    userId: v.id("users"), // ✅ requis (auth)
  },
  handler: async (ctx, args) => {
    await assertSameEcole(ctx, args.userId, args.ecoleId);

    const ecoleId = args.ecoleId;
    const anneeId = args.anneeId;

    return await ctx.db
      .query("examens")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", ecoleId))
      .filter((q) => q.eq(q.field("anneeId"), anneeId))
      .take(1000); // ✅ borne haute (école entière)
  },
});

// ============================================================
// MUTATIONS
// ============================================================

export const add = mutation({
  args: {
    classe: v.string(),
    matiere: v.string(),
    date: v.string(),
    heure: v.optional(v.string()),
    salle: v.optional(v.string()),
    duree: v.optional(v.string()),
    ecoleId: v.id("ecoles"),
    anneeId: v.id("anneesScolaires"),
    userId: v.id("users"), // ✅ requis (auth + audit)
  },
  handler: async (ctx, args) => {
    await requireEcoleAdmin(ctx, args.userId, args.ecoleId);

    // ✅ Vérifie que l'année existe et appartient à l'école
    const annee = await ctx.db.get(args.anneeId);
    if (!annee) throw new Error("Année scolaire introuvable");
    if (annee.ecoleId && annee.ecoleId !== args.ecoleId) {
      throw new Error("Année scolaire d'une autre école");
    }

    // ✅ Insertion explicite (pas de spread pour éviter les surprises)
    const examenId = await ctx.db.insert("examens", {
      classe: args.classe,
      matiere: args.matiere,
      date: args.date,
      heure: args.heure,
      salle: args.salle,
      duree: args.duree,
      ecoleId: args.ecoleId,
      anneeId: args.anneeId,
    });

    // ✅ Audit systématique
    await ctx.db.insert("audit", {
      userId: args.userId,
      action: "create",
      table: "examens",
      documentId: examenId,
      details: `Création examen ${args.matiere} — ${args.classe} (${args.date})`,
      date: new Date().toISOString(),
      ecoleId: args.ecoleId,
    });

    return { success: true, examenId };
  },
});

export const update = mutation({
  args: {
    examenId: v.id("examens"),
    classe: v.optional(v.string()),
    matiere: v.optional(v.string()),
    date: v.optional(v.string()),
    heure: v.optional(v.string()),
    salle: v.optional(v.string()),
    duree: v.optional(v.string()),
    userId: v.id("users"), // ✅ requis
  },
  handler: async (ctx, args) => {
    const examen = await ctx.db.get(args.examenId);
    if (!examen) throw new Error("Examen introuvable");

    await requireEcoleAdmin(ctx, args.userId, examen.ecoleId);

    // ✅ Construit le patch uniquement avec les champs fournis (non undefined)
    const fields: Record<string, unknown> = {};
    if (args.classe !== undefined) fields.classe = args.classe;
    if (args.matiere !== undefined) fields.matiere = args.matiere;
    if (args.date !== undefined) fields.date = args.date;
    if (args.heure !== undefined) fields.heure = args.heure;
    if (args.salle !== undefined) fields.salle = args.salle;
    if (args.duree !== undefined) fields.duree = args.duree;

    if (Object.keys(fields).length === 0) {
      return { success: true, updated: false };
    }

    await ctx.db.patch(args.examenId, fields);

    // ✅ Audit
    await ctx.db.insert("audit", {
      userId: args.userId,
      action: "update",
      table: "examens",
      documentId: args.examenId,
      details: `Modification examen ${examen.matiere} — ${examen.classe}`,
      date: new Date().toISOString(),
      ecoleId: examen.ecoleId,
    });

    return { success: true, updated: true };
  },
});

export const remove = mutation({
  args: {
    examenId: v.id("examens"),
    userId: v.id("users"), // ✅ requis
  },
  handler: async (ctx, args) => {
    const examen = await ctx.db.get(args.examenId);
    if (!examen) return { success: false };

    await requireEcoleAdmin(ctx, args.userId, examen.ecoleId);

    await ctx.db.delete(args.examenId);

    // ✅ Audit systématique
    await ctx.db.insert("audit", {
      userId: args.userId,
      action: "delete",
      table: "examens",
      documentId: args.examenId,
      details: `Suppression examen ${examen.matiere} — ${examen.classe} (${examen.date})`,
      date: new Date().toISOString(),
      ecoleId: examen.ecoleId,
    });

    return { success: true };
  },
});