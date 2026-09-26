// convex/helpers/permissions.ts
/**
 * 🎯 Système de permissions granulaires.
 *
 * Convention : "module.action"
 * Exemples : "ecoles.read", "users.write", "annonces.delete"
 */

import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type AnyCtx = MutationCtx | QueryCtx;

// ────────────────────────────────────────────────
// Catalogue des modules et actions
// ────────────────────────────────────────────────
export const PERMISSION_MODULES = {
  ecoles: {
    label: "Écoles",
    description: "Gestion des écoles (création, édition, suspension)",
    icon: "School",
    actions: ["read", "write", "delete"],
  },
  users: {
    label: "Utilisateurs",
    description: "Gestion des utilisateurs et rôles",
    icon: "Users",
    actions: ["read", "write", "delete"],
  },
  annonces: {
    label: "Annonces",
    description: "Communication globale",
    icon: "Megaphone",
    actions: ["read", "write", "delete"],
  },
  abonnements: {
    label: "Abonnements",
    description: "Configuration des abonnements",
    icon: "CreditCard",
    actions: ["read", "write"],
  },
  finances: {
    label: "Finances",
    description: "Dashboard financier et revenus",
    icon: "DollarSign",
    actions: ["read"],
  },
  impayes: {
    label: "Impayés",
    description: "Relances et paiements",
    icon: "AlertTriangle",
    actions: ["read", "write"],
  },
  demandes: {
    label: "Demandes",
    description: "Approbation des inscriptions",
    icon: "Clock",
    actions: ["read", "write"],
  },
  audit: {
    label: "Journal d'audit",
    description: "Historique des actions",
    icon: "Activity",
    actions: ["read"],
  },
  stats: {
    label: "Statistiques",
    description: "Dashboard et KPIs",
    icon: "BarChart3",
    actions: ["read"],
  },
  parametres: {
    label: "Paramètres",
    description: "Configuration de la plateforme",
    icon: "Settings",
    actions: ["read", "write"],
  },
};

// ────────────────────────────────────────────────
// Presets prédéfinis
// ────────────────────────────────────────────────
export const PERMISSION_PRESETS = {
  support_lecture: {
    label: "Support (lecture seule)",
    description: "Consultation uniquement, aucune modification",
    permissions: [
      "ecoles.read",
      "users.read",
      "stats.read",
      "audit.read",
      "demandes.read",
      "annonces.read",
      "impayes.read",
      "abonnements.read",
      "finances.read",
    ],
  },
  support_complet: {
    label: "Support (complet)",
    description: "Tout sauf les suppressions et la gestion des super admins",
    permissions: [
      "ecoles.read", "ecoles.write",
      "users.read", "users.write",
      "stats.read",
      "audit.read",
      "demandes.read", "demandes.write",
      "annonces.read", "annonces.write", "annonces.delete",
      "impayes.read", "impayes.write",
      "abonnements.read", "abonnements.write",
      "finances.read",
      "parametres.read",
    ],
  },
  comptable: {
    label: "Comptable",
    description: "Focus sur les finances et abonnements",
    permissions: [
      "stats.read",
      "finances.read",
      "abonnements.read", "abonnements.write",
      "impayes.read", "impayes.write",
      "ecoles.read",
      "users.read",
    ],
  },
  gestionnaire_ecoles: {
    label: "Gestionnaire d'écoles",
    description: "Gestion des écoles et utilisateurs",
    permissions: [
      "ecoles.read", "ecoles.write", "ecoles.delete",
      "users.read", "users.write",
      "demandes.read", "demandes.write",
      "stats.read",
      "annonces.read", "annonces.write",
    ],
  },
};

// ────────────────────────────────────────────────
// Helpers — Vérifications (sync)
// ────────────────────────────────────────────────

/**
 * Vérifie qu'un user a la permission exacte.
 * Owner = accès total.
 * Format : "module.action"
 */
export function hasPermission(user: any, permission: string): boolean {
  if (!user) return false;

  // Owner a tout
  if (isOwnerStrict(user)) return true;

  if (user.role !== "superAdmin") return false;

  const perms: string[] = Array.isArray(user.permissions)
    ? (user.permissions as string[])
    : [];
  return perms.includes(permission);
}

/**
 * Vérifie qu'un user a au moins une action sur un module.
 * Ex: hasModuleAccess(user, "ecoles") → true si "ecoles.read" ou "ecoles.write"
 */
export function hasModuleAccess(user: any, moduleName: string): boolean {
  if (!user) return false;

  if (isOwnerStrict(user)) return true;
  if (user.role !== "superAdmin") return false;

  const perms: string[] = Array.isArray(user.permissions)
    ? (user.permissions as string[])
    : [];
  return perms.some((p: string) => p.startsWith(`${moduleName}.`));
}

/**
 * Détection strict OWNER.
 */
export function isOwnerStrict(user: any): boolean {
  if (!user) return false;
  if (user.role === "admin" && !user.ecoleId) return true;
  return user.role === "superAdmin" && user.isOwner === true;
}

/**
 * Valide une liste de permissions.
 * Filtre celles qui ne sont pas dans le catalogue.
 */
export function sanitizePermissions(perms: string[]): string[] {
  const valid = new Set<string>();
  for (const [mod, conf] of Object.entries(PERMISSION_MODULES)) {
    for (const action of conf.actions) {
      valid.add(`${mod}.${action}`);
    }
  }
  return perms.filter((p: string) => valid.has(p));
}

/**
 * Retourne la liste complète de toutes les permissions possibles.
 */
export function getAllPermissionStrings(): string[] {
  const result: string[] = [];
  for (const [mod, conf] of Object.entries(PERMISSION_MODULES)) {
    for (const action of conf.actions) {
      result.push(`${mod}.${action}`);
    }
  }
  return result;
}

// ────────────────────────────────────────────────
// ✨ Helpers — Vérifications (async avec ctx)
// ────────────────────────────────────────────────

/**
 * ✨ Vérifie qu'un user a la permission requise.
 * - OWNER strict → bypass (accès total)
 * - Super admin secondaire → doit avoir la permission exacte ("module.action")
 * - Autres rôles → refus
 *
 * Lève une erreur si refusé.
 * Retourne le user si autorisé.
 */
export async function requireGranularPermission(
  ctx: AnyCtx,
  userId: Id<"users"> | undefined,
  permission: string
) {
  if (!userId) throw new Error("Authentification requise");

  const user = await ctx.db.get(userId);
  if (!user) throw new Error("Utilisateur introuvable");

  // Owner strict → bypass total
  if (isOwnerStrict(user)) return user;

  // Doit être super admin pour avoir des permissions granulaires
  if (user.role !== "superAdmin") {
    throw new Error("Accès refusé.");
  }

  const perms: string[] = Array.isArray(user.permissions)
    ? (user.permissions as string[])
    : [];

  const hasAccess = perms.some((p: string) => p === permission);

  if (!hasAccess) {
    throw new Error(`Permission requise : ${permission}`);
  }

  return user;
}

/**
 * ✨ Vérifie qu'un user a AU MOINS UNE action sur un module.
 * Utile pour les queries de lecture où on veut accepter read OU write.
 *
 * Ex: requireModuleAccess(ctx, userId, "annonces")
 *     → OK si "annonces.read" OU "annonces.write" OU "annonces.delete"
 */
export async function requireModuleAccess(
  ctx: AnyCtx,
  userId: Id<"users"> | undefined,
  moduleName: string
) {
  if (!userId) throw new Error("Authentification requise");

  const user = await ctx.db.get(userId);
  if (!user) throw new Error("Utilisateur introuvable");

  if (isOwnerStrict(user)) return user;

  if (user.role !== "superAdmin") {
    throw new Error("Accès refusé.");
  }

  const perms: string[] = Array.isArray(user.permissions)
    ? (user.permissions as string[])
    : [];

  const prefix = `${moduleName}.`;
  const hasAccess = perms.some((p: string) => p.startsWith(prefix));

  if (!hasAccess) {
    throw new Error(`Accès refusé au module : ${moduleName}`);
  }

  return user;
}