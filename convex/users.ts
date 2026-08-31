import { query, mutation, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id, Doc } from "./_generated/dataModel"; // Correction du chemin d'import
import { api } from "./_generated/api"; // Correction du chemin d'import
import { hashPassword, verifyPassword } from "./utils/crypto"; // Assurez-vous que ce fichier existe

// ========== OUTILS ==========
function isSuperAdminPrincipal(user: any): boolean {
  return (
    (user?.role === "admin" && !user.ecoleId) ||
    (user?.role === "superAdmin" && (!user.permissions || user.permissions.length === 0))
  );
}

function hasPermission(user: any, permission: string): boolean {
  if (!user) return false;
  if (isSuperAdminPrincipal(user)) return true;
  if (user.role !== "superAdmin") return false;
  return user.permissions?.includes(permission) ?? false;
}

async function requirePermission(ctx: MutationCtx, userId: string | undefined, permission: string) {
  if (!userId) throw new Error("Authentification requise");
  const user = await ctx.db.get(userId as Id<"users">);
  if (!user) throw new Error("Utilisateur introuvable");
  if (!hasPermission(user, permission)) {
    throw new Error(`Permission insuffisante : ${permission}`);
  }
  return user;
}

async function requireRole(ctx: MutationCtx, userId: string | undefined, allowedRoles: string[]) {
  if (!userId) throw new Error("Authentification requise");
  const user = await ctx.db.get(userId as Id<"users">);
  if (!user) throw new Error("Utilisateur introuvable");
  if (!allowedRoles.includes(user.role)) {
    throw new Error("Accès refusé : rôle insuffisant");
  }
  if (allowedRoles.includes("admin") && user.role === "admin" && user.ecoleId !== undefined) {
    throw new Error("Seul le superadmin peut gérer les écoles");
  }
  return user;
}

async function requireRoleOrPermission(
  ctx: MutationCtx,
  userId: string | undefined,
  allowedRoles: string[],
  permission?: string
) {
  if (!userId) throw new Error("Authentification requise");
  const user = await ctx.db.get(userId as Id<"users">);
  if (!user) throw new Error("Utilisateur introuvable");

  if (allowedRoles.includes(user.role)) return user;

  if (permission && hasPermission(user, permission)) return user;

  throw new Error("Accès refusé : rôle ou permission insuffisante");
}

// ========== OUTILS 2FA EMAIL ==========
function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendEmail(to: string, code: string) {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) throw new Error("Clé API Resend non configurée.");

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
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erreur d'envoi d'email : ${error}`);
  }
}

// ========== LOGIN ==========
export const login = mutation({
  args: { login: v.string(), password: v.string() },
  handler: async (ctx, args) => {
    const rateKey = `login:${args.login}`;
    const { allowed } = await ctx.runMutation(api.rateLimit.checkRateLimit, {
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
      throw new Error(`Compte temporairement verrouillé. Réessayez dans ${remainingMinutes} minute(s).`);
    }

    // ===== Vérification du mot de passe avec migration à la volée =====
    const storedPassword = user.password;
    let passwordMatch = false;

    // Détecter si le mot de passe stocké est déjà haché (format PBKDF2 : "iterations:salt:hash")
    const isHashed = /^\d+:[0-9a-fA-F]+:[0-9a-fA-F]+$/.test(storedPassword);

    if (!isHashed) {
      // Ancien mot de passe en clair
      if (args.password === storedPassword) {
        passwordMatch = true;
        // Migrer automatiquement vers le hachage
        const newHash = await hashPassword(args.password);
        await ctx.db.patch(user._id, { password: newHash });
      }
    } else {
      // Vérification normale
      passwordMatch = await verifyPassword(args.password, storedPassword);
    }

    if (!passwordMatch) {
      const attempts = (user.loginAttempts ?? 0) + 1;
      const updates: any = { loginAttempts: attempts };
      if (attempts >= 5) {
        updates.lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      }
      await ctx.db.patch(user._id, updates);
      return null;
    }

    if (user.status === "pending") {
      throw new Error("Votre compte est en attente d'approbation par l'établissement.");
    }
    if (user.status === "rejected") {
      const reason = user.rejectionReason || "Aucune raison fournie";
      throw new Error(`Votre compte a été rejeté : ${reason}`);
    }

    if (user.ecoleId) {
      const ecole = await ctx.db.get(user.ecoleId);
      if (ecole?.statut === "suspendue") {
        throw new Error("Votre école est actuellement suspendue. Contactez l'administration.");
      }
    }

    if (user.loginAttempts !== undefined || user.lockedUntil !== undefined) {
      await ctx.db.patch(user._id, {
        loginAttempts: 0,
        lockedUntil: undefined,
      });
    }

    // ===== Vérification 2FA email =====
    const twoFactorRecord = await ctx.db
      .query("twoFactorEmail")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();

    if (twoFactorRecord?.enabled) {
      // Générer et envoyer un code
      const code = generateCode();
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
      await ctx.db.patch(twoFactorRecord._id, {
        code,
        expiresAt,
        attempts: 0,
      });
      await sendEmail(twoFactorRecord.email, code);

      return {
        _id: user._id,
        nom: user.nom,
        postnom: user.postnom ?? null,
        prenom: user.prenom ?? null,
        role: user.role,
        ecoleId: user.ecoleId ?? null,
        classe: user.classe ?? null,
        permissions: user.permissions ?? null,
        requiresTwoFactor: true,
      };
    }

    // Retour normal sans 2FA
    return {
      _id: user._id,
      nom: user.nom,
      postnom: user.postnom ?? null,
      prenom: user.prenom ?? null,
      role: user.role,
      ecoleId: user.ecoleId ?? null,
      classe: user.classe ?? null,
      permissions: user.permissions ?? null,
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

// ----- ENREGISTREMENT D'UN NOUVEL UTILISATEUR -----
export const register = mutation({
  args: {
    nom: v.string(),
    login: v.string(),
    password: v.string(),
    codeEcole: v.string(),
    role: v.union(v.literal("parent"), v.literal("eleve"), v.literal("enseignant")),
    matricule: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const rateKey = `register:${args.login}`;
    const { allowed } = await ctx.runMutation(api.rateLimit.checkRateLimit, {
      key: rateKey,
      maxRequests: 5,
      windowMs: 60_000,
    });
    if (!allowed) {
      throw new Error("Trop de tentatives d'inscription. Veuillez réessayer dans une minute.");
    }

    const ecole = await ctx.db
      .query("ecoles")
      .withIndex("by_code", (q) => q.eq("code", args.codeEcole.toUpperCase()))
      .first();
    if (!ecole) throw new Error("Code d'école invalide.");
    if (ecole.statut === "suspendue") {
      throw new Error("L'établissement est actuellement suspendu. Inscription impossible.");
    }

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_login", (q) => q.eq("login", args.login))
      .first();
    if (existingUser) throw new Error("Cet identifiant est déjà utilisé.");

    // Hacher le mot de passe avant insertion
    const hashedPassword = await hashPassword(args.password);

    if (args.role === "eleve" && args.matricule) {
      const matriculeUpper = args.matricule.toUpperCase();
      const eleve = await ctx.db
        .query("eleves")
        .withIndex("by_code", (q) => q.eq("code", matriculeUpper))
        .first();
      if (!eleve) throw new Error("Matricule invalide.");
      if (eleve.ecoleId !== ecole._id) throw new Error("Matricule non associé à cette école.");
      if (eleve.userId) throw new Error("Un compte est déjà lié à ce matricule.");
      if (eleve.codeUtilise) throw new Error("Ce matricule a déjà été utilisé.");

      const nomEleve = `${eleve.nom} ${eleve.postnom}${eleve.prenom ? ' ' + eleve.prenom : ''}`;
      const nomNormalise = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
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

      return userId;
    }

    return await ctx.db.insert("users", {
      nom: args.nom,
      login: args.login,
      password: hashedPassword,
      role: args.role,
      ecoleId: ecole._id,
      status: "pending",
    });
  },
});

// ========== GESTION DES SUPER ADMINS SECONDAIRES ==========
export const listSuperAdmins = query({
  handler: async (ctx) => {
    const users = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("role"), "superAdmin"))
      .collect();
    return users.filter((u) => u.permissions && u.permissions.length > 0);
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
    if (!caller || !isSuperAdminPrincipal(caller)) {
      throw new Error("Seul le super admin principal peut créer un autre super admin.");
    }

    const existing = await ctx.db
      .query("users")
      .withIndex("by_login", (q) => q.eq("login", args.login))
      .unique();
    if (existing) throw new Error("Ce login est déjà utilisé.");

    // Hacher le mot de passe
    const hashedPassword = await hashPassword(args.password);

    await ctx.db.insert("users", {
      nom: args.nom,
      login: args.login,
      password: hashedPassword,
      role: "superAdmin",
      status: "active",
      permissions: args.permissions,
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
    if (!caller || !isSuperAdminPrincipal(caller)) {
      throw new Error("Seul le super admin principal peut modifier les permissions.");
    }
    await ctx.db.patch(args.userId, { permissions: args.permissions });
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
    if (!caller || !isSuperAdminPrincipal(caller)) {
      throw new Error("Seul le super admin principal peut supprimer un super admin.");
    }
    const target = await ctx.db.get(args.userId);
    if (!target || target.role !== "superAdmin") {
      throw new Error("Utilisateur introuvable ou n'est pas un super admin.");
    }
    await ctx.db.delete(args.userId);
    return { success: true };
  },
});

// ========== APPROBATION / REJET ==========
export const approveUser = mutation({
  args: { userId: v.id("users"), adminId: v.id("users") },
  handler: async (ctx, args) => {
    await requireRoleOrPermission(ctx, args.adminId, ["admin", "superAdmin"], "gestion_demandes");
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("Utilisateur introuvable");
    if (user.status !== "pending") throw new Error("Cet utilisateur n'est pas en attente.");
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
  args: { userId: v.id("users"), reason: v.optional(v.string()), adminId: v.id("users") },
  handler: async (ctx, args) => {
    await requireRoleOrPermission(ctx, args.adminId, ["admin", "superAdmin"], "gestion_demandes");
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("Utilisateur introuvable");
    if (user.status !== "pending") throw new Error("Cet utilisateur n'est pas en attente.");
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
      details: `Rejet de l'utilisateur ${user.nom} (${user.login})${args.reason ? ` : ${args.reason}` : ""}`,
    });

    return { success: true };
  },
});

// ----- LISTES -----
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

export const listAllPendingUsers = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();
  },
});

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

// ========== AJOUT MANUEL PAR L'ADMIN ==========
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
    await requireRoleOrPermission(ctx, args.userId, ["admin", "superAdmin"], "gestion_utilisateurs");

    const rateKey = `add:${args.userId}`;
    const { allowed } = await ctx.runMutation(api.rateLimit.checkRateLimit, {
      key: rateKey,
      maxRequests: 10,
      windowMs: 60_000,
    });
    if (!allowed) {
      throw new Error("Trop de créations de comptes. Veuillez ralentir.");
    }

    const existing = await ctx.db
      .query("users")
      .withIndex("by_login", (q) => q.eq("login", args.login))
      .unique();
    if (existing) throw new Error("Ce login existe déjà.");

    // Hacher le mot de passe
    const hashedPassword = await hashPassword(args.password);

    await ctx.db.insert("users", {
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
  },
});

// ========== MISE À JOUR PAR L'ADMIN ==========
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
    await requireRoleOrPermission(ctx, args.adminId, ["admin", "superAdmin"], "gestion_utilisateurs");
    const updates: any = {
      nom: args.nom,
      role: args.role,
      classe: args.classe || undefined,
    };
    if (args.password && args.password.length > 0) {
      updates.password = await hashPassword(args.password);
    }
    await ctx.db.patch(args.id, updates);
    return { success: true };
  },
});

// ========== MISE À JOUR DU PROFIL ÉLÈVE ==========
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
    if (args.dateNaissance !== undefined) updates.dateNaissance = args.dateNaissance;
    if (args.lieuNaissance !== undefined) updates.lieuNaissance = args.lieuNaissance;
    if (args.province !== undefined) updates.province = args.province;
    if (args.territoire !== undefined) updates.territoire = args.territoire;
    if (args.secteur !== undefined) updates.secteur = args.secteur;
    if (args.village !== undefined) updates.village = args.village;
    if (args.adresse !== undefined) updates.adresse = args.adresse;
    if (args.telephone !== undefined) updates.telephone = args.telephone;
    if (args.nomPere !== undefined) updates.nomPere = args.nomPere;
    if (args.nomMere !== undefined) updates.nomMere = args.nomMere;
    if (args.tuteurNom !== undefined) updates.tuteurNom = args.tuteurNom;
    if (args.tuteurTelephone !== undefined) updates.tuteurTelephone = args.tuteurTelephone;

    await ctx.db.patch(eleve._id, updates);
    return { success: true };
  },
});

// ========== SUPPRESSION D'UN UTILISATEUR ==========
export const remove = mutation({
  args: { id: v.id("users"), adminId: v.id("users") },
  handler: async (ctx, args) => {
    await requireRoleOrPermission(ctx, args.adminId, ["admin", "superAdmin"], "gestion_utilisateurs");
    const user = await ctx.db.get(args.id);
    if (!user) throw new Error("Utilisateur introuvable");

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

// ========== CHANGEMENT DE MOT DE PASSE ==========
export const changePassword = mutation({
  args: { userId: v.id("users"), currentPassword: v.string(), newPassword: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("Utilisateur introuvable");

    // Vérifier l'ancien mot de passe avec vérification adaptative
    const storedPassword = user.password;
    let isCurrentValid = false;

    const isHashed = /^\d+:[0-9a-fA-F]+:[0-9a-fA-F]+$/.test(storedPassword);
    if (!isHashed) {
      // Ancien format en clair
      if (args.currentPassword === storedPassword) {
        isCurrentValid = true;
      }
    } else {
      isCurrentValid = await verifyPassword(args.currentPassword, storedPassword);
    }

    if (!isCurrentValid) {
      throw new Error("Mot de passe actuel incorrect");
    }

    // Hacher le nouveau mot de passe
    const newHashedPassword = await hashPassword(args.newPassword);
    await ctx.db.patch(args.userId, { password: newHashedPassword });
    return { success: true };
  },
});

// ========== MISE À JOUR DU RÔLE ==========
export const updateRole = mutation({
  args: { userId: v.id("users"), newRole: v.string(), adminId: v.id("users") },
  handler: async (ctx, args) => {
    await requireRoleOrPermission(ctx, args.adminId, ["admin", "superAdmin"], "gestion_utilisateurs");
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("Utilisateur introuvable");
    await ctx.db.patch(args.userId, { role: args.newRole });
    return { success: true };
  },
});

// ========== RÉCUPÉRER UN UTILISATEUR ==========
export const get = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;
    return {
      ...user,
      permissions: user.permissions ?? null,
    };
  },
});

// ========== DERNIERS UTILISATEURS ==========
export const listRecent = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("users")
      .order("desc")
      .take(10);
  },
});

export const listEnseignantsByEcole = query({
  args: { ecoleId: v.id("ecoles") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId))
      .filter((q) => q.eq(q.field("role"), "enseignant"))
      .collect();
  },
});

// ========== RÉCUPÉRER PLUSIEURS UTILISATEURS PAR IDS ==========
export const getByIds = query({
  args: { ids: v.array(v.id("users")) },
  handler: async (ctx, args) => {
    const users = await Promise.all(
      args.ids.map(async (id) => {
        const user = await ctx.db.get(id);
        return user;
      })
    );
    return users.filter((u): u is NonNullable<typeof u> => u !== null);
  },
});

// ========== RÉCUPÉRER UN UTILISATEUR PAR ID (alias) ==========
export const getById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});