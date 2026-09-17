// convex/users.ts
import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id, Doc } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { hashPassword, verifyPassword } from "./utils/crypto";

type AnyCtx = MutationCtx | QueryCtx;

// ════════════════════════════════════════════════════════════════════
// HELPERS — AUTH & PERMISSIONS
// ════════════════════════════════════════════════════════════════════

/**
 * ✅ FIX MAJEUR — `isSuperAdmin` (accès LARGE)
 * Principal OU secondaire. Utilisé pour bypass assertSameEcole,
 * voir toutes les écoles, voir les demandes, etc.
 */
function isSuperAdmin(user: any): boolean {
  if (!user) return false;
  return (
    user.role === "superAdmin" ||
    (user.role === "admin" && !user.ecoleId)
  );
}

/**
 * ✅ FIX MAJEUR — `isSuperAdminPrincipal` (accès RESTREINT)
 * Uniquement le propriétaire de la plateforme.
 *
 * Reconnaissance :
 * - `role === "admin"` + pas d'ecoleId → principal (legacy)
 * - `role === "superAdmin"` + AUCUNE permission → principal (nouveau)
 * - `role === "superAdmin"` + DES permissions → SECONDAIRE (exclu)
 *
 * ⚠️ AVANT : cette fonction acceptait TOUS les superAdmins → faille de sécurité.
 */
function isSuperAdminPrincipal(user: any): boolean {
  if (!user) return false;
  if (user.role === "admin" && !user.ecoleId) return true;
  if (
    user.role === "superAdmin" &&
    (!user.permissions || user.permissions.length === 0)
  ) {
    return true;
  }
  return false;
}

function hasPermission(user: any, permission: string): boolean {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;
  if (user.role !== "superAdmin") return false;
  return user.permissions?.includes(permission) ?? false;
}

function stripSensitive<T extends Record<string, any>>(
  user: T
): Omit<T, "password" | "loginAttempts" | "lockedUntil"> {
  if (!user) return user;
  const { password, loginAttempts, lockedUntil, ...safe } = user;
  return safe as any;
}

async function requirePermission(
  ctx: AnyCtx,
  userId: string | undefined,
  permission: string
) {
  if (!userId) throw new Error("Authentification requise");
  const user = await ctx.db.get(userId as Id<"users">);
  if (!user) throw new Error("Utilisateur introuvable");
  if (!hasPermission(user, permission)) {
    throw new Error(`Permission insuffisante : ${permission}`);
  }
  return user;
}

async function requireRole(
  ctx: AnyCtx,
  userId: string | undefined,
  allowedRoles: string[]
) {
  if (!userId) throw new Error("Authentification requise");
  const user = await ctx.db.get(userId as Id<"users">);
  if (!user) throw new Error("Utilisateur introuvable");
  if (!allowedRoles.includes(user.role)) {
    throw new Error("Accès refusé : rôle insuffisant");
  }
  if (
    allowedRoles.includes("admin") &&
    user.role === "admin" &&
    user.ecoleId !== undefined
  ) {
    throw new Error("Seul le superadmin peut gérer les écoles");
  }
  return user;
}

async function requireRoleOrPermission(
  ctx: AnyCtx,
  userId: string | undefined,
  allowedRoles: string[],
  permission?: string
) {
  if (!userId) throw new Error("Authentification requise");
  const user = await ctx.db.get(userId as Id<"users">);
  if (!user) throw new Error("Utilisateur introuvable");

  // ✅ Super admin (principal OU secondaire) bypass les checks de rôle/permission
  if (isSuperAdmin(user)) return user;
  if (allowedRoles.includes(user.role)) return user;
  if (permission && hasPermission(user, permission)) return user;

  throw new Error("Accès refusé : rôle ou permission insuffisante");
}

/**
 * ✅ FIX — utilise `isSuperAdmin` (large) : un secondaire peut
 * toujours agir sur toutes les écoles (bypass d'école).
 */
function assertSameEcole(
  caller: Doc<"users">,
  targetEcoleId: Id<"ecoles"> | undefined
) {
  if (isSuperAdmin(caller)) return;
  if (!caller.ecoleId || caller.ecoleId !== targetEcoleId) {
    throw new Error("Vous ne pouvez agir que sur votre propre école.");
  }
}

function validatePasswordStrength(pwd: string) {
  if (!pwd || pwd.length < 8) {
    throw new Error("Le mot de passe doit contenir au moins 8 caractères.");
  }
  if (!/[A-Z]/.test(pwd) || !/[a-z]/.test(pwd) || !/[0-9]/.test(pwd)) {
    throw new Error(
      "Le mot de passe doit contenir majuscule, minuscule et chiffre."
    );
  }
}

// ════════════════════════════════════════════════════════════════════
// HELPERS — 2FA EMAIL
// ════════════════════════════════════════════════════════════════════

function generateCode(): string {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return (100000 + (arr[0] % 900000)).toString();
}

async function sendEmail(to: string, code: string) {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) throw new Error("Clé API Resend non configurée.");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "EduDiscipline <no-reply@yourdomain.com>",
        to: [to],
        subject: "Votre code de sécurité EduDiscipline",
        html: `<p>Votre code de connexion est : <strong>${code}</strong></p>
               <p>Ce code expire dans 10 minutes.</p>`,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Erreur d'envoi d'email : ${error}`);
    }
  } finally {
    clearTimeout(timeoutId);
  }
}

// ════════════════════════════════════════════════════════════════════
// LOGIN
// ════════════════════════════════════════════════════════════════════

export const login = mutation({
  args: { login: v.string(), password: v.string() },
  handler: async (ctx, args) => {
    const rateKey = `login:${args.login}`;
    const { allowed } = await ctx.runMutation(internal.rateLimit.checkRateLimit, {
      key: rateKey,
      maxRequests: 5,
      windowMs: 60_000,
    });
    if (!allowed) {
      throw new Error("Trop de tentatives. Veuillez réessayer dans une minute.");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_login", (q) => q.eq("login", args.login))
      .unique();
    if (!user) return null;

    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      const remainingMs = new Date(user.lockedUntil).getTime() - Date.now();
      const remainingMinutes = Math.ceil(remainingMs / 60000);
      throw new Error(
        `Compte temporairement verrouillé. Réessayez dans ${remainingMinutes} minute(s).`
      );
    }

    const storedPassword = user.password;
    let passwordMatch = false;

    const isHashed = /^\d+:[0-9a-fA-F]+:[0-9a-fA-F]+$/.test(storedPassword);

    if (!isHashed) {
      if (args.password === storedPassword) {
        passwordMatch = true;
        const newHash = await hashPassword(args.password);
        await ctx.db.patch(user._id, { password: newHash });
      }
    } else {
      passwordMatch = await verifyPassword(args.password, storedPassword);
    }

    if (!passwordMatch) {
      const attempts = (user.loginAttempts ?? 0) + 1;
      const updates: any = { loginAttempts: attempts };
      if (attempts >= 5) {
        updates.lockedUntil = new Date(
          Date.now() + 15 * 60 * 1000
        ).toISOString();
      }
      await ctx.db.patch(user._id, updates);
      return null;
    }

    if (user.status === "pending") {
      throw new Error(
        "Votre compte est en attente d'approbation par l'établissement."
      );
    }
    if (user.status === "rejected") {
      const reason = user.rejectionReason || "Aucune raison fournie";
      throw new Error(`Votre compte a été rejeté : ${reason}`);
    }

    if (user.ecoleId) {
      const ecole = await ctx.db.get(user.ecoleId);
      if (ecole?.statut === "suspendue") {
        throw new Error(
          "Votre école est actuellement suspendue. Contactez l'administration."
        );
      }
    }

    if (user.loginAttempts !== undefined || user.lockedUntil !== undefined) {
      await ctx.db.patch(user._id, {
        loginAttempts: 0,
        lockedUntil: undefined,
      });
    }

    const twoFactorRecord = await ctx.db
      .query("twoFactorEmail")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();

    if (twoFactorRecord?.enabled) {
      const code = generateCode();
      const expiresAt = Date.now() + 10 * 60 * 1000;
      await ctx.db.patch(twoFactorRecord._id, {
        code,
        expiresAt,
        attempts: 0,
      });
      await sendEmail(twoFactorRecord.email, code);

      return {
        requiresTwoFactor: true,
        pendingUserId: user._id,
      };
    }

    return stripSensitive(user);
  },
});

export const verify2FACode = mutation({
  args: {
    pendingUserId: v.id("users"),
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const rec = await ctx.db
      .query("twoFactorEmail")
      .withIndex("by_userId", (q) => q.eq("userId", args.pendingUserId))
      .first();

    if (!rec || !rec.enabled) {
      throw new Error("Authentification à deux facteurs non configurée.");
    }
    if (!rec.code || !rec.expiresAt) {
      throw new Error("Aucun code en cours. Reconnectez-vous.");
    }
    if (Date.now() > rec.expiresAt) {
      throw new Error("Code expiré. Reconnectez-vous.");
    }
    if ((rec.attempts ?? 0) >= 5) {
      throw new Error("Trop de tentatives. Reconnectez-vous.");
    }
    if (rec.code !== args.code.trim()) {
      await ctx.db.patch(rec._id, { attempts: (rec.attempts ?? 0) + 1 });
      throw new Error("Code invalide.");
    }

    await ctx.db.patch(rec._id, {
      code: undefined,
      expiresAt: undefined,
      attempts: 0,
    });

    const user = await ctx.db.get(args.pendingUserId);
    if (!user) throw new Error("Utilisateur introuvable");

    if (user.ecoleId) {
      const ecole = await ctx.db.get(user.ecoleId);
      if (ecole?.statut === "suspendue") {
        throw new Error("Votre école est actuellement suspendue.");
      }
    }

    return stripSensitive(user);
  },
});

// ════════════════════════════════════════════════════════════════════
// FORMAT DU MOT DE PASSE (debug — réservé admin)
// ════════════════════════════════════════════════════════════════════

export const getPasswordFormat = query({
  args: {
    login: v.string(),
    adminId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.adminId, "gestion_utilisateurs");
    const user = await ctx.db
      .query("users")
      .withIndex("by_login", (q) => q.eq("login", args.login))
      .unique();
    if (!user) return null;
    return user.password.includes(":") ? "hash" : "plain";
  },
});

// ════════════════════════════════════════════════════════════════════
// ENREGISTREMENT
// ════════════════════════════════════════════════════════════════════

export const register = mutation({
  args: {
    nom: v.string(),
    login: v.string(),
    password: v.string(),
    codeEcole: v.string(),
    role: v.union(
      v.literal("parent"),
      v.literal("eleve"),
      v.literal("enseignant")
    ),
    matricule: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const rateKey = `register:${args.login}`;
    const { allowed } = await ctx.runMutation(internal.rateLimit.checkRateLimit, {
      key: rateKey,
      maxRequests: 5,
      windowMs: 60_000,
    });
    if (!allowed) {
      throw new Error(
        "Trop de tentatives d'inscription. Veuillez réessayer dans une minute."
      );
    }

    validatePasswordStrength(args.password);

    const ecole = await ctx.db
      .query("ecoles")
      .withIndex("by_code", (q) => q.eq("code", args.codeEcole.toUpperCase()))
      .first();
    if (!ecole) throw new Error("Code d'école invalide.");
    if (ecole.statut === "suspendue") {
      throw new Error(
        "L'établissement est actuellement suspendu. Inscription impossible."
      );
    }

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_login", (q) => q.eq("login", args.login))
      .first();
    if (existingUser) throw new Error("Cet identifiant est déjà utilisé.");

    const hashedPassword = await hashPassword(args.password);

    if (args.role === "eleve" && args.matricule) {
      const matriculeUpper = args.matricule.toUpperCase();
      const eleve = await ctx.db
        .query("eleves")
        .withIndex("by_code", (q) => q.eq("code", matriculeUpper))
        .first();
      if (!eleve) throw new Error("Matricule invalide.");
      if (eleve.ecoleId !== ecole._id) {
        throw new Error("Matricule non associé à cette école.");
      }
      if (eleve.userId)
        throw new Error("Un compte est déjà lié à ce matricule.");
      if (eleve.codeUtilise)
        throw new Error("Ce matricule a déjà été utilisé.");

      const nomEleve = `${eleve.nom} ${eleve.postnom}${
        eleve.prenom ? " " + eleve.prenom : ""
      }`;
      const nomNormalise = (s: string) =>
        s.toLowerCase().replace(/\s+/g, " ").trim();
      if (nomNormalise(args.nom) !== nomNormalise(nomEleve)) {
        throw new Error("Le nom saisi ne correspond pas au matricule fourni.");
      }

      const userId = await ctx.db.insert("users", {
        nom: args.nom,
        login: args.login,
        password: hashedPassword,
        role: "eleve",
        ecoleId: ecole._id,
        status: "active",
      });

      await ctx.db.patch(eleve._id, {
        userId,
        codeUtilise: true,
      });

      await ctx.db.patch(ecole._id, {
        userCount: (ecole.userCount ?? 0) + 1,
      });

      return userId;
    }

    const userId = await ctx.db.insert("users", {
      nom: args.nom,
      login: args.login,
      password: hashedPassword,
      role: args.role,
      ecoleId: ecole._id,
      status: "pending",
    });

    await ctx.db.patch(ecole._id, {
      userCount: (ecole.userCount ?? 0) + 1,
    });

    return userId;
  },
});

// ════════════════════════════════════════════════════════════════════
// SUPER ADMINS SECONDAIRES
// ════════════════════════════════════════════════════════════════════

/**
 * ✅ FIX CRITIQUE — Tout super admin (principal OU secondaire) peut LIRE
 * la liste des super admins secondaires. Cela évite le crash de l'écran
 * GestionSuperAdmins quand un secondaire consulte la page.
 *
 * Les mutations create/update/remove restent strictement réservées au
 * super admin principal (voir plus bas).
 */
export const listSuperAdmins = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const caller = await ctx.db.get(args.userId);
    if (!caller || !isSuperAdmin(caller)) {
      throw new Error("Réservé au super-admin.");
    }
    const users = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("role"), "superAdmin"))
      .take(200);
    return users
      .filter((u) => u.permissions && u.permissions.length > 0)
      .map(stripSensitive);
  },
});

export const createSuperAdmin = mutation({
  args: {
    nom: v.string(),
    login: v.string(),
    password: v.string(),
    permissions: v.array(v.string()),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const caller = await ctx.db.get(args.userId);
    // ✅ FIX MAJEUR — isSuperAdminPrincipal est maintenant STRICT :
    // un secondaire (superAdmin avec permissions) est refusé.
    if (!caller || !isSuperAdminPrincipal(caller)) {
      throw new Error(
        "Seul le super admin principal peut créer un autre super admin."
      );
    }

    validatePasswordStrength(args.password);

    const existing = await ctx.db
      .query("users")
      .withIndex("by_login", (q) => q.eq("login", args.login))
      .unique();
    if (existing) throw new Error("Ce login est déjà utilisé.");

    const hashedPassword = await hashPassword(args.password);

    const newId = await ctx.db.insert("users", {
      nom: args.nom,
      login: args.login,
      password: hashedPassword,
      role: "superAdmin",
      status: "active",
      permissions: args.permissions,
    });

    await ctx.db.insert("audit", {
      userId: args.userId,
      action: "create_super_admin",
      table: "users",
      documentId: newId,
      date: new Date().toISOString(),
      ecoleId: undefined,
      details: `Création du super-admin ${args.login} avec ${args.permissions.length} permission(s)`,
    });

    return { success: true };
  },
});

export const updateSuperAdminPermissions = mutation({
  args: {
    userId: v.id("users"),
    permissions: v.array(v.string()),
    adminId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const caller = await ctx.db.get(args.adminId);
    // ✅ FIX MAJEUR — refuse un secondaire
    if (!caller || !isSuperAdminPrincipal(caller)) {
      throw new Error(
        "Seul le super admin principal peut modifier les permissions."
      );
    }

    // ✅ Empêche le principal de modifier ses propres permissions (escalade)
    if (args.userId === args.adminId) {
      throw new Error(
        "Vous ne pouvez pas modifier vos propres permissions."
      );
    }

    // ✅ Vérifie que la cible est bien un superAdmin secondaire
    const target = await ctx.db.get(args.userId);
    if (!target || target.role !== "superAdmin") {
      throw new Error("Utilisateur introuvable ou n'est pas un super admin.");
    }
    if (isSuperAdminPrincipal(target)) {
      throw new Error("Impossible de modifier un super admin principal.");
    }

    await ctx.db.patch(args.userId, { permissions: args.permissions });

    await ctx.db.insert("audit", {
      userId: args.adminId,
      action: "update_super_admin_permissions",
      table: "users",
      documentId: args.userId,
      date: new Date().toISOString(),
      ecoleId: undefined,
      details: `Permissions mises à jour (${args.permissions.length})`,
    });

    return { success: true };
  },
});

export const removeSuperAdmin = mutation({
  args: {
    userId: v.id("users"),
    adminId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const caller = await ctx.db.get(args.adminId);
    // ✅ FIX MAJEUR — refuse un secondaire
    if (!caller || !isSuperAdminPrincipal(caller)) {
      throw new Error(
        "Seul le super admin principal peut supprimer un super admin."
      );
    }
    if (args.userId === args.adminId) {
      throw new Error("Vous ne pouvez pas vous supprimer vous-même.");
    }
    const target = await ctx.db.get(args.userId);
    if (!target || target.role !== "superAdmin") {
      throw new Error("Utilisateur introuvable ou n'est pas un super admin.");
    }
    if (isSuperAdminPrincipal(target)) {
      throw new Error("Impossible de supprimer un super admin principal.");
    }
    await ctx.db.delete(args.userId);

    await ctx.db.insert("audit", {
      userId: args.adminId,
      action: "delete_super_admin",
      table: "users",
      documentId: args.userId,
      date: new Date().toISOString(),
      ecoleId: undefined,
      details: `Suppression du super-admin ${target.nom} (${target.login})`,
    });

    return { success: true };
  },
});

// ════════════════════════════════════════════════════════════════════
// APPROBATION / REJET
// ════════════════════════════════════════════════════════════════════

export const approveUser = mutation({
  args: { userId: v.id("users"), adminId: v.id("users") },
  handler: async (ctx, args) => {
    const caller = await requireRoleOrPermission(
      ctx,
      args.adminId,
      ["admin", "superAdmin"],
      "gestion_demandes"
    );
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("Utilisateur introuvable");

    assertSameEcole(caller, user.ecoleId);

    if (user.status !== "pending") {
      throw new Error("Cet utilisateur n'est pas en attente.");
    }
    await ctx.db.patch(args.userId, { status: "active" });

    await ctx.db.insert("audit", {
      userId: args.adminId,
      action: "approve_user",
      table: "users",
      documentId: args.userId,
      date: new Date().toISOString(),
      ecoleId: user.ecoleId,
      details: `Approbation de l'utilisateur ${user.nom} (${user.login})`,
    });

    return { success: true };
  },
});

export const rejectUser = mutation({
  args: {
    userId: v.id("users"),
    reason: v.optional(v.string()),
    adminId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const caller = await requireRoleOrPermission(
      ctx,
      args.adminId,
      ["admin", "superAdmin"],
      "gestion_demandes"
    );
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("Utilisateur introuvable");

    assertSameEcole(caller, user.ecoleId);

    if (user.status !== "pending") {
      throw new Error("Cet utilisateur n'est pas en attente.");
    }
    await ctx.db.patch(args.userId, {
      status: "rejected",
      rejectionReason: args.reason,
    });

    await ctx.db.insert("audit", {
      userId: args.adminId,
      action: "reject_user",
      table: "users",
      documentId: args.userId,
      date: new Date().toISOString(),
      ecoleId: user.ecoleId,
      details: `Rejet de l'utilisateur ${user.nom} (${user.login})${
        args.reason ? ` : ${args.reason}` : ""
      }`,
    });

    return { success: true };
  },
});

// ════════════════════════════════════════════════════════════════════
// LISTES "ANNUAIRE" — userId OPTIONNEL
// ════════════════════════════════════════════════════════════════════

export const listPendingUsers = query({
  args: {
    ecoleId: v.id("ecoles"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    if (args.userId) {
      const caller = await ctx.db.get(args.userId);
      if (!caller) throw new Error("Authentification requise");
      assertSameEcole(caller, args.ecoleId);
    }

    const users = await ctx.db
      .query("users")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .take(200);

    return users.map(stripSensitive);
  },
});

export const listAllPendingUsers = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const caller = await ctx.db.get(args.userId);
    // ✅ FIX — passe à `isSuperAdmin` (large) : secondaire peut voir les demandes
    if (!caller || !isSuperAdmin(caller)) {
      throw new Error("Réservé au super-admin.");
    }

    const users = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("status"), "pending"))
      .take(200);

    return users.map(stripSensitive);
  },
});

export const listByEcole = query({
  args: {
    ecoleId: v.optional(v.id("ecoles")),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    let targetEcoleId = args.ecoleId;

    if (args.userId) {
      const caller = await ctx.db.get(args.userId);
      if (!caller) throw new Error("Authentification requise");

      // ✅ FIX — passe à `isSuperAdmin` (large)
      if (!isSuperAdmin(caller)) {
        if (!caller.ecoleId) throw new Error("Accès refusé");
        if (args.ecoleId && args.ecoleId !== caller.ecoleId) {
          throw new Error("Accès refusé : école différente.");
        }
        targetEcoleId = caller.ecoleId;
      }
    }

    const users = targetEcoleId
      ? await ctx.db
          .query("users")
          .withIndex("by_ecoleId", (q) => q.eq("ecoleId", targetEcoleId!))
          .take(500)
      : await ctx.db.query("users").take(500);

    return users.map(stripSensitive);
  },
});

export const listParentsByEcole = query({
  args: {
    ecoleId: v.id("ecoles"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    if (args.userId) {
      const caller = await ctx.db.get(args.userId);
      if (!caller) throw new Error("Authentification requise");
      assertSameEcole(caller, args.ecoleId);
    }

    const users = await ctx.db
      .query("users")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId))
      .filter((q) => q.eq(q.field("role"), "parent"))
      .take(500);

    return users.map(stripSensitive);
  },
});

export const listElevesUsers = query({
  args: {
    ecoleId: v.id("ecoles"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    if (args.userId) {
      const caller = await ctx.db.get(args.userId);
      if (!caller) throw new Error("Authentification requise");
      assertSameEcole(caller, args.ecoleId);
    }

    const users = await ctx.db
      .query("users")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId))
      .filter((q) => q.eq(q.field("role"), "eleve"))
      .take(500);

    return users.map(stripSensitive);
  },
});

export const listEnseignantsByEcole = query({
  args: {
    ecoleId: v.id("ecoles"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    if (args.userId) {
      const caller = await ctx.db.get(args.userId);
      if (!caller) throw new Error("Authentification requise");
      assertSameEcole(caller, args.ecoleId);
    }

    const users = await ctx.db
      .query("users")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId))
      .filter((q) => q.eq(q.field("role"), "enseignant"))
      .take(500);

    return users.map(stripSensitive);
  },
});

// ════════════════════════════════════════════════════════════════════
// AJOUT MANUEL PAR L'ADMIN
// ════════════════════════════════════════════════════════════════════

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
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const caller = await requireRoleOrPermission(
      ctx,
      args.userId,
      ["admin", "superAdmin"],
      "gestion_utilisateurs"
    );

    assertSameEcole(caller, args.ecoleId);

    if (args.role === "admin" && !isSuperAdminPrincipal(caller)) {
      throw new Error("Seul le super-admin peut créer un admin.");
    }

    const rateKey = `add:${args.userId}`;
    const { allowed } = await ctx.runMutation(internal.rateLimit.checkRateLimit, {
      key: rateKey,
      maxRequests: 10,
      windowMs: 60_000,
    });
    if (!allowed) {
      throw new Error("Trop de créations de comptes. Veuillez ralentir.");
    }

    validatePasswordStrength(args.password);

    const existing = await ctx.db
      .query("users")
      .withIndex("by_login", (q) => q.eq("login", args.login))
      .unique();
    if (existing) throw new Error("Ce login existe déjà.");

    const hashedPassword = await hashPassword(args.password);

    const newId = await ctx.db.insert("users", {
      nom: args.nom,
      login: args.login,
      password: hashedPassword,
      role: args.role,
      ecoleId: args.ecoleId,
      classe: args.classe,
      status: "active",
      loginAttempts: 0,
    });

    const ecole = await ctx.db.get(args.ecoleId);
    if (ecole) {
      await ctx.db.patch(args.ecoleId, {
        userCount: (ecole.userCount ?? 0) + 1,
      });
    }

    await ctx.db.insert("audit", {
      userId: args.userId,
      action: "add_user",
      table: "users",
      documentId: newId,
      date: new Date().toISOString(),
      ecoleId: args.ecoleId,
      details: `Création de l'utilisateur ${args.login} (${args.role})`,
    });

    return { success: true, userId: newId };
  },
});

// ════════════════════════════════════════════════════════════════════
// MISE À JOUR PAR L'ADMIN
// ════════════════════════════════════════════════════════════════════

export const update = mutation({
  args: {
    id: v.id("users"),
    nom: v.string(),
    role: v.string(),
    classe: v.optional(v.string()),
    password: v.optional(v.string()),
    adminId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const caller = await requireRoleOrPermission(
      ctx,
      args.adminId,
      ["admin", "superAdmin"],
      "gestion_utilisateurs"
    );
    const target = await ctx.db.get(args.id);
    if (!target) throw new Error("Utilisateur introuvable");

    assertSameEcole(caller, target.ecoleId);

    if (
      !isSuperAdminPrincipal(caller) &&
      (args.role === "superAdmin" || args.role === "admin")
    ) {
      throw new Error("Permissions insuffisantes pour attribuer ce rôle.");
    }

    const updates: any = {
      nom: args.nom,
      role: args.role,
      classe: args.classe || undefined,
    };
    if (args.password && args.password.length > 0) {
      validatePasswordStrength(args.password);
      updates.password = await hashPassword(args.password);
    }
    await ctx.db.patch(args.id, updates);

    await ctx.db.insert("audit", {
      userId: args.adminId,
      action: "update_user",
      table: "users",
      documentId: args.id,
      date: new Date().toISOString(),
      ecoleId: target.ecoleId,
      details: `Mise à jour (rôle: ${args.role}, mot de passe modifié: ${!!args.password})`,
    });

    return { success: true };
  },
});

// ════════════════════════════════════════════════════════════════════
// MISE À JOUR DU PROFIL ÉLÈVE
// ════════════════════════════════════════════════════════════════════

export const updateProfile = mutation({
  args: {
    userId: v.id("users"),
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
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("Utilisateur introuvable");
    if (user.role !== "eleve") {
      throw new Error("Seuls les élèves peuvent modifier ces informations.");
    }

    const eleve = await ctx.db
      .query("eleves")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
    if (!eleve) throw new Error("Aucun élève associé à ce compte.");

    const updates: Partial<Doc<"eleves">> = {};
    if (args.sexe !== undefined) updates.sexe = args.sexe;
    if (args.dateNaissance !== undefined)
      updates.dateNaissance = args.dateNaissance;
    if (args.lieuNaissance !== undefined)
      updates.lieuNaissance = args.lieuNaissance;
    if (args.province !== undefined) updates.province = args.province;
    if (args.territoire !== undefined) updates.territoire = args.territoire;
    if (args.secteur !== undefined) updates.secteur = args.secteur;
    if (args.village !== undefined) updates.village = args.village;
    if (args.adresse !== undefined) updates.adresse = args.adresse;
    if (args.telephone !== undefined) updates.telephone = args.telephone;
    if (args.nomPere !== undefined) updates.nomPere = args.nomPere;
    if (args.nomMere !== undefined) updates.nomMere = args.nomMere;
    if (args.tuteurNom !== undefined) updates.tuteurNom = args.tuteurNom;
    if (args.tuteurTelephone !== undefined)
      updates.tuteurTelephone = args.tuteurTelephone;

    await ctx.db.patch(eleve._id, updates);
    return { success: true };
  },
});

// ════════════════════════════════════════════════════════════════════
// SUPPRESSION D'UN UTILISATEUR
// ════════════════════════════════════════════════════════════════════

export const remove = mutation({
  args: { id: v.id("users"), adminId: v.id("users") },
  handler: async (ctx, args) => {
    const caller = await requireRoleOrPermission(
      ctx,
      args.adminId,
      ["admin", "superAdmin"],
      "gestion_utilisateurs"
    );
    const user = await ctx.db.get(args.id);
    if (!user) throw new Error("Utilisateur introuvable");

    assertSameEcole(caller, user.ecoleId);

    if (args.id === args.adminId) {
      throw new Error("Vous ne pouvez pas vous supprimer vous-même.");
    }

    const tf = await ctx.db
      .query("twoFactorEmail")
      .withIndex("by_userId", (q) => q.eq("userId", args.id))
      .first();
    if (tf) await ctx.db.delete(tf._id);

    const eleve = await ctx.db
      .query("eleves")
      .withIndex("by_userId", (q) => q.eq("userId", args.id))
      .first();
    if (eleve) {
      await ctx.db.patch(eleve._id, {
        userId: undefined,
        codeUtilise: false,
      });
    }

    const pendingLinks = await ctx.db
      .query("parentLinkRequests")
      .withIndex("by_parentId", (q) => q.eq("parentId", args.id))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .take(100);
    for (const link of pendingLinks) {
      await ctx.db.patch(link._id, {
        status: "rejected",
        reviewedBy: args.adminId,
      });
    }

    await ctx.db.delete(args.id);

    if (user.ecoleId) {
      const ecole = await ctx.db.get(user.ecoleId);
      if (ecole) {
        await ctx.db.patch(user.ecoleId, {
          userCount: Math.max((ecole.userCount ?? 1) - 1, 0),
        });
      }
    }

    await ctx.db.insert("audit", {
      userId: args.adminId,
      action: "delete_user",
      table: "users",
      documentId: args.id,
      date: new Date().toISOString(),
      ecoleId: user.ecoleId,
      details: `Suppression de l'utilisateur ${user.nom} (${user.login})`,
    });

    return { success: true };
  },
});

// ════════════════════════════════════════════════════════════════════
// CHANGEMENT DE MOT DE PASSE
// ════════════════════════════════════════════════════════════════════

export const changePassword = mutation({
  args: {
    userId: v.id("users"),
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("Utilisateur introuvable");

    const storedPassword = user.password;
    let isCurrentValid = false;

    const isHashed = /^\d+:[0-9a-fA-F]+:[0-9a-fA-F]+$/.test(storedPassword);
    if (!isHashed) {
      if (args.currentPassword === storedPassword) isCurrentValid = true;
    } else {
      isCurrentValid = await verifyPassword(
        args.currentPassword,
        storedPassword
      );
    }

    if (!isCurrentValid) {
      throw new Error("Mot de passe actuel incorrect");
    }

    validatePasswordStrength(args.newPassword);

    const newHashedPassword = await hashPassword(args.newPassword);
    await ctx.db.patch(args.userId, { password: newHashedPassword });

    await ctx.db.insert("audit", {
      userId: args.userId,
      action: "change_password",
      table: "users",
      documentId: args.userId,
      date: new Date().toISOString(),
      ecoleId: user.ecoleId,
      details: `Mot de passe modifié`,
    });

    return { success: true };
  },
});

// ════════════════════════════════════════════════════════════════════
// MISE À JOUR DU RÔLE
// ════════════════════════════════════════════════════════════════════

export const updateRole = mutation({
  args: {
    userId: v.id("users"),
    newRole: v.string(),
    adminId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const caller = await requireRoleOrPermission(
      ctx,
      args.adminId,
      ["admin", "superAdmin"],
      "gestion_utilisateurs"
    );
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("Utilisateur introuvable");

    assertSameEcole(caller, user.ecoleId);

    if (
      !isSuperAdminPrincipal(caller) &&
      (args.newRole === "superAdmin" || args.newRole === "admin")
    ) {
      throw new Error("Permissions insuffisantes pour attribuer ce rôle.");
    }

    await ctx.db.patch(args.userId, { role: args.newRole });

    await ctx.db.insert("audit", {
      userId: args.adminId,
      action: "update_role",
      table: "users",
      documentId: args.userId,
      date: new Date().toISOString(),
      ecoleId: user.ecoleId,
      details: `Rôle : ${user.role} → ${args.newRole}`,
    });

    return { success: true };
  },
});

// ════════════════════════════════════════════════════════════════════
// LECTURE D'UN UTILISATEUR (password retiré)
// ════════════════════════════════════════════════════════════════════

export const get = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;
    return {
      ...stripSensitive(user),
      permissions: user.permissions ?? null,
    };
  },
});

export const getById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;
    return stripSensitive(user);
  },
});

// ════════════════════════════════════════════════════════════════════
// DERNIERS UTILISATEURS (réservé super-admin)
// ════════════════════════════════════════════════════════════════════

export const listRecent = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const caller = await ctx.db.get(args.userId);
    // ✅ FIX — passe à `isSuperAdmin` (large)
    if (!caller || !isSuperAdmin(caller)) {
      throw new Error("Réservé au super-admin.");
    }
    const users = await ctx.db.query("users").order("desc").take(10);
    return users.map(stripSensitive);
  },
});

// ════════════════════════════════════════════════════════════════════
// RÉCUPÉRER PLUSIEURS UTILISATEURS PAR IDS
// ════════════════════════════════════════════════════════════════════

export const getByIds = query({
  args: { ids: v.array(v.id("users")) },
  handler: async (ctx, args) => {
    if (args.ids.length > 200) {
      throw new Error("Trop d'IDs demandés (max 200).");
    }
    const users = await Promise.all(args.ids.map((id) => ctx.db.get(id)));
    return users
      .filter((u): u is NonNullable<typeof u> => u !== null)
      .map(stripSensitive);
  },
});