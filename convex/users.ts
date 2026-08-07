import { query, mutation, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "../convex/_generated/dataModel";

// Utilitaire de vérification de rôle
async function requireRole(ctx: MutationCtx, userId: string | undefined, allowedRoles: string[]) {
  if (!userId) throw new Error("Authentification requise");
  const user = await ctx.db.get(userId as Id<"users">);
  if (!user || !allowedRoles.includes(user.role)) {
    throw new Error("Accès refusé : rôle insuffisant");
  }
  return user;
}

// ----- LOGIN (avec gestion du statut) -----
export const login = mutation({
  args: { login: v.string(), password: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_login", (q) => q.eq("login", args.login))
      .unique();
    if (!user) return null;

    // Vérifier si le compte est verrouillé
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      const remainingMs = new Date(user.lockedUntil).getTime() - Date.now();
      const remainingMinutes = Math.ceil(remainingMs / 60000);
      throw new Error(`Compte temporairement verrouillé. Réessayez dans ${remainingMinutes} minute(s).`);
    }

    // Vérifier le mot de passe (hashé ou ancien format)
    const passwordMatch = user.password.includes(":")
      ? user.password === args.password
      : user.password === args.password;

    if (!passwordMatch) {
      const attempts = (user.loginAttempts ?? 0) + 1;
      const updates: any = { loginAttempts: attempts };
      if (attempts >= 5) {
        updates.lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      }
      await ctx.db.patch(user._id, updates);
      return null;
    }

    // Vérifier le statut du compte (s'il existe, sinon considérer comme actif)
    if (user.status) {
      if (user.status === "pending") {
        throw new Error("Votre compte est en attente d'approbation par l'établissement.");
      }
      if (user.status === "rejected") {
        const reason = user.rejectionReason || "Aucune raison fournie";
        throw new Error(`Votre compte a été rejeté : ${reason}`);
      }
    }

    // Réinitialiser les tentatives après succès
    if (user.loginAttempts !== undefined || user.lockedUntil !== undefined) {
      await ctx.db.patch(user._id, {
        loginAttempts: 0,
        lockedUntil: undefined,
      });
    }

    return {
      _id: user._id,
      nom: user.nom,
      role: user.role,
      ecoleId: user.ecoleId ?? null,
      classe: user.classe ?? null,
    };
  },
});

// ----- Récupération du format du mot de passe -----
export const getPasswordFormat = query({
  args: { login: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_login", (q) => q.eq("login", args.login))
      .unique();
    if (!user) return null;
    return user.password.includes(":") ? "hash" : "plain";
  },
});

// ----- ENREGISTREMENT D'UN NOUVEL UTILISATEUR (STATUT PENDING) -----
export const register = mutation({
  args: {
    nom: v.string(),
    login: v.string(),
    password: v.string(), // déjà hashé côté client
    role: v.union(
      v.literal("disciplinaire"),
      v.literal("directeur"),
      v.literal("admin"),
      v.literal("parent"),
      v.literal("enseignant"),
      v.literal("comptable"),
      v.literal("eleve")
    ),
    codeEcole: v.string(),
  },
  handler: async (ctx, args) => {
    // Vérifier que le login n'est pas déjà utilisé
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_login", (q) => q.eq("login", args.login))
      .unique();
    if (existingUser) throw new Error("Cet identifiant est déjà utilisé.");

    // Trouver l'école par code
    const ecole = await ctx.db
      .query("ecoles")
      .withIndex("by_code", (q) => q.eq("code", args.codeEcole))
      .unique();
    if (!ecole) throw new Error("Code école invalide.");

    // Insérer l'utilisateur avec statut "pending"
    await ctx.db.insert("users", {
      nom: args.nom,
      login: args.login,
      password: args.password,
      role: args.role,
      ecoleId: ecole._id,
      status: "pending",
      loginAttempts: 0,
    });

    return { success: true };
  },
});

// ----- APPROBATION / REJET PAR L'ADMIN -----
export const approveUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("Utilisateur introuvable");
    if (user.status !== "pending") throw new Error("Cet utilisateur n'est pas en attente.");
    await ctx.db.patch(args.userId, { status: "active" });
    return { success: true };
  },
});

export const rejectUser = mutation({
  args: { userId: v.id("users"), reason: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("Utilisateur introuvable");
    if (user.status !== "pending") throw new Error("Cet utilisateur n'est pas en attente.");
    await ctx.db.patch(args.userId, {
      status: "rejected",
      rejectionReason: args.reason,
    });
    return { success: true };
  },
});

// ----- LISTE DES UTILISATEURS EN ATTENTE (POUR L'ADMIN D'UNE ÉCOLE) -----
export const listPendingUsers = query({
  args: { ecoleId: v.id("ecoles") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();
  },
});

// ----- LISTE DE TOUS LES UTILISATEURS EN ATTENTE (SUPER ADMIN) -----
export const listAllPendingUsers = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();
  },
});

// ----- LISTE PAR ÉCOLE (EXISTANTE) -----
export const listByEcole = query({
  args: { ecoleId: v.optional(v.id("ecoles")) },
  handler: async (ctx, args) => {
    if (args.ecoleId) {
      return await ctx.db
        .query("users")
        .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId))
        .collect();
    }
    return await ctx.db.query("users").collect();
  },
});

// ----- LISTE DES PARENTS PAR ÉCOLE -----
export const listParentsByEcole = query({
  args: { ecoleId: v.id("ecoles") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId))
      .filter((q) => q.eq(q.field("role"), "parent"))
      .collect();
  },
});

// ----- LISTE DES ÉLÈVES (COMPTES UTILISATEURS) PAR ÉCOLE -----
export const listElevesUsers = query({
  args: { ecoleId: v.id("ecoles") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId))
      .filter((q) => q.eq(q.field("role"), "eleve"))
      .collect();
  },
});

// ----- AJOUT MANUEL PAR L'ADMIN (EXISTANT) -----
export const add = mutation({
  args: {
    nom: v.string(),
    login: v.string(),
    password: v.string(),
    role: v.union(
      v.literal("disciplinaire"),
      v.literal("directeur"),
      v.literal("admin"),
      v.literal("parent"),
      v.literal("enseignant"),
      v.literal("comptable"),
      v.literal("eleve")
    ),
    ecoleId: v.id("ecoles"),
    classe: v.optional(v.string()),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.userId, ["admin"]);
    const existing = await ctx.db
      .query("users")
      .withIndex("by_login", (q) => q.eq("login", args.login))
      .unique();
    if (existing) throw new Error("Ce login existe déjà.");
    return await ctx.db.insert("users", {
      nom: args.nom,
      login: args.login,
      password: args.password,
      role: args.role,
      ecoleId: args.ecoleId,
      classe: args.classe,
      status: "active", // l'admin ajoute directement des comptes actifs
      loginAttempts: 0,
    });
  },
});

// ----- MISE À JOUR D'UN UTILISATEUR (ajout) -----
export const update = mutation({
  args: {
    id: v.id("users"),
    nom: v.string(),
    role: v.string(),
    classe: v.optional(v.string()),
    password: v.optional(v.string()),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    if (args.userId) {
      await requireRole(ctx, args.userId, ["admin"]);
    }
    const updates: any = {
      nom: args.nom,
      role: args.role,
      classe: args.classe || undefined,
    };
    if (args.password && args.password.length > 0) {
      updates.password = args.password;
    }
    await ctx.db.patch(args.id, updates);
    return { success: true };
  },
});

// ----- SUPPRESSION D'UN UTILISATEUR (ajout) -----
export const remove = mutation({
  args: { id: v.id("users"), userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    if (args.userId) {
      await requireRole(ctx, args.userId, ["admin"]);
    }
    const user = await ctx.db.get(args.id);
    if (!user) throw new Error("Utilisateur introuvable");
    await ctx.db.delete(args.id);
    return { success: true };
  },
});

// ----- CHANGEMENT DE MOT DE PASSE -----
export const changePassword = mutation({
  args: { userId: v.id("users"), newPassword: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("Utilisateur introuvable");
    await ctx.db.patch(args.userId, { password: args.newPassword });
    return { success: true };
  },
});

// ----- MISE À JOUR DU RÔLE D'UN UTILISATEUR -----
export const updateRole = mutation({
  args: { userId: v.id("users"), newRole: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("Utilisateur introuvable");
    await ctx.db.patch(args.userId, { role: args.newRole });
    return { success: true };
  },
});

// ----- RÉCUPÉRER UN UTILISATEUR PAR ID -----
export const get = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

// Derniers utilisateurs inscrits (tous rôles, toutes écoles)
export const listRecent = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("users")
      .order("desc") // suppose un index sur _creationTime (automatique)
      .take(10);
  },
});