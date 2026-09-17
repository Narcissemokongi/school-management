import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";
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

// Pour les MUTATIONS : exige rôle admin/directeur de l'école ou superAdmin
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
      "Accès refusé : vous n'êtes pas autorisé à gérer cette école."
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
// QUERY
// ============================================================

// Récupère l'emploi du temps annuel d'une classe (un seul document ou null)
export const getByClasse = query({
  args: {
    classe: v.string(),
    ecoleId: v.id("ecoles"),
    anneeId: v.optional(v.id("anneesScolaires")),
    userId: v.id("users"), // ✅ requis (auth)
  },
  handler: async (ctx, args) => {
    // ✅ Cloisonnement multi-tenant obligatoire
    await assertSameEcole(ctx, args.userId, args.ecoleId);

    // ✅ Extraction dans des const locales pour préserver le narrowing TS
    const classe = args.classe;
    const ecoleId = args.ecoleId;
    const anneeId = args.anneeId;

    if (anneeId) {
      const emploi = await ctx.db
        .query("emploiDuTemps")
        .withIndex("by_classe_ecole_annee", (q) =>
          q
            .eq("classe", classe)
            .eq("ecoleId", ecoleId)
            .eq("anneeId", anneeId) // ✅ anneeId: Id<"anneesScolaires">
        )
        .first();
      return emploi ?? null;
    }

    // Fallback sans année : on prend le plus récent par _creationTime
    const result = await ctx.db
      .query("emploiDuTemps")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", ecoleId))
      .filter((q) => q.eq(q.field("classe"), classe))
      .order("desc") // ✅ déterministe (le plus récent)
      .take(1); // ✅ au lieu de .collect()

    return result[0] ?? null;
  },
});

// ============================================================
// MUTATIONS
// ============================================================

// Crée ou met à jour l'emploi du temps annuel d'une classe
export const upsert = mutation({
  args: {
    classe: v.string(),
    ecoleId: v.id("ecoles"),
    contenu: v.string(),
    anneeId: v.id("anneesScolaires"),
    userId: v.id("users"), // ✅ requis (auth + audit)
  },
  handler: async (ctx, args) => {
    await requireEcoleAdmin(ctx, args.userId, args.ecoleId);

    const existing = await ctx.db
      .query("emploiDuTemps")
      .withIndex("by_classe_ecole_annee", (q) =>
        q
          .eq("classe", args.classe)
          .eq("ecoleId", args.ecoleId)
          .eq("anneeId", args.anneeId)
      )
      .first();

    let docId: Id<"emploiDuTemps">;
    let action: "create" | "update";

    if (existing) {
      await ctx.db.patch(existing._id, { contenu: args.contenu });
      docId = existing._id;
      action = "update";
    } else {
      docId = await ctx.db.insert("emploiDuTemps", {
        classe: args.classe,
        ecoleId: args.ecoleId,
        contenu: args.contenu,
        anneeId: args.anneeId,
      });
      action = "create";
    }

    // ✅ Audit systématique
    await ctx.db.insert("audit", {
      userId: args.userId,
      action,
      table: "emploiDuTemps",
      documentId: docId,
      details: `Emploi du temps annuel ${args.classe} (${args.anneeId})`,
      date: new Date().toISOString(),
      ecoleId: args.ecoleId,
    });

    return docId;
  },
});

// Supprime un emploi du temps par son ID
export const remove = mutation({
  args: {
    id: v.id("emploiDuTemps"),
    userId: v.id("users"), // ✅ requis
  },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.id);
    if (!doc) return { success: false };

    // Vérifie que le caller gère bien l'école du document
    await requireEcoleAdmin(ctx, args.userId, doc.ecoleId);

    await ctx.db.delete(args.id);

    // ✅ Audit systématique
    await ctx.db.insert("audit", {
      userId: args.userId,
      action: "delete",
      table: "emploiDuTemps",
      documentId: args.id,
      details: `Suppression EDT annuel ${doc.classe}`,
      date: new Date().toISOString(),
      ecoleId: doc.ecoleId,
    });

    return { success: true };
  },
});

// Supprime l'emploi du temps d'une classe pour une année donnée
export const removeByClasse = mutation({
  args: {
    classe: v.string(),
    ecoleId: v.id("ecoles"),
    anneeId: v.id("anneesScolaires"),
    userId: v.id("users"), // ✅ requis
  },
  handler: async (ctx, args) => {
    await requireEcoleAdmin(ctx, args.userId, args.ecoleId);

    const existing = await ctx.db
      .query("emploiDuTemps")
      .withIndex("by_classe_ecole_annee", (q) =>
        q
          .eq("classe", args.classe)
          .eq("ecoleId", args.ecoleId)
          .eq("anneeId", args.anneeId)
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);

      // ✅ Audit ajouté (manquait dans la version originale)
      await ctx.db.insert("audit", {
        userId: args.userId,
        action: "delete",
        table: "emploiDuTemps",
        documentId: existing._id,
        details: `Suppression EDT annuel ${args.classe} (${args.anneeId})`,
        date: new Date().toISOString(),
        ecoleId: args.ecoleId,
      });
    }

    return { success: true };
  },
});