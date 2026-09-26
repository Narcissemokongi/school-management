// convex/helpers/auth.ts
import { Id, Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type Ctx = MutationCtx | QueryCtx;

type UserLike =
  | {
      role?: string;
      ecoleId?: Id<"ecoles"> | undefined;
      permissions?: string[];
      isOwner?: boolean;
      isActive?: boolean;
    }
  | null
  | undefined;

// ════════════════════════════════════════════════════════════════════
// ✅ NOUVEAU — Propriétaire de la plateforme
// Reconnaissance STRICTE par `isOwner: true`
// ════════════════════════════════════════════════════════════════════
export function isOwner(user: UserLike): boolean {
  if (!user) return false;

  // Legacy : admin sans école → considéré comme propriétaire
  if (user.role === "admin" && !user.ecoleId) return true;

  // Nouveau : superAdmin avec isOwner explicitement true
  if (user.role === "superAdmin" && user.isOwner === true) return true;

  return false;
}

// ════════════════════════════════════════════════════════════════════
// ✅ ALIAS — Ancienne dénomination (rétrocompatibilité)
// ════════════════════════════════════════════════════════════════════
export function isSuperAdminPrincipal(user: UserLike): boolean {
  return isOwner(user);
}

// ════════════════════════════════════════════════════════════════════
// ✅ Super Admin (principal OU secondaire) — accès large
// ════════════════════════════════════════════════════════════════════
export function isSuperAdmin(user: UserLike): boolean {
  if (!user) return false;
  if (user.role === "admin" && !user.ecoleId) return true;
  if (user.role === "superAdmin") return true;
  return false;
}

// ════════════════════════════════════════════════════════════════════
// ✅ Super Admin SECONDAIRE — permissions restreintes
// ════════════════════════════════════════════════════════════════════
export function isSuperAdminSecondary(user: UserLike): boolean {
  return isSuperAdmin(user) && !isOwner(user);
}

// ════════════════════════════════════════════════════════════════════
// ✅ NOUVEAU — Vérifie qu'un user a une permission donnée
// ════════════════════════════════════════════════════════════════════
export function hasPermission(user: UserLike, permission: string): boolean {
  if (!user) return false;

  // Owner : a toutes les permissions
  if (isOwner(user)) return true;

  // Super admin : doit avoir la permission explicitement
  if (user.role === "superAdmin") {
    return user.permissions?.includes(permission) ?? false;
  }

  return false;
}

// ════════════════════════════════════════════════════════════════════
// ✅ NOUVEAU — Vérifie que le compte est actif (non désactivé)
// ════════════════════════════════════════════════════════════════════
export function isActiveUser(user: UserLike): boolean {
  if (!user) return false;
  // isActive: undefined ou true → actif
  // isActive: false → désactivé
  return user.isActive !== false;
}

// ════════════════════════════════════════════════════════════════════
// ✅ GARDE — Owner requis (nouveau)
// À utiliser pour : createSuperAdmin, updateSuperAdminPermissions,
// removeSuperAdmin, promoteToOwner, demoteOwner
// ════════════════════════════════════════════════════════════════════
export async function requireOwner(
  ctx: Ctx,
  userId: Id<"users"> | string | undefined
): Promise<Doc<"users">> {
  if (!userId) {
    throw new Error("userId requis pour cette action.");
  }

  const user = await ctx.db.get(userId as Id<"users">);

  if (!user) {
    throw new Error("Utilisateur introuvable.");
  }

  if (!isActiveUser(user)) {
    throw new Error("Votre compte est désactivé.");
  }

  if (!isOwner(user)) {
    throw new Error(
      "Action réservée au propriétaire de la plateforme. " +
        "Votre compte n'a pas les droits nécessaires."
    );
  }

  return user as Doc<"users">;
}

// ════════════════════════════════════════════════════════════════════
// ✅ ALIAS — Ancienne dénomination (rétrocompatibilité)
// ════════════════════════════════════════════════════════════════════
export async function requireSuperAdminPrincipal(
  ctx: Ctx,
  userId: Id<"users"> | string | undefined
): Promise<Doc<"users">> {
  return requireOwner(ctx, userId);
}

// ════════════════════════════════════════════════════════════════════
// ✅ GARDE — Super Admin requis (large)
// ════════════════════════════════════════════════════════════════════
export async function requireSuperAdmin(
  ctx: Ctx,
  userId: Id<"users"> | string | undefined
): Promise<Doc<"users">> {
  if (!userId) {
    throw new Error("userId requis pour cette action.");
  }

  const user = await ctx.db.get(userId as Id<"users">);

  if (!user) {
    throw new Error("Utilisateur introuvable.");
  }

  if (!isActiveUser(user)) {
    throw new Error("Votre compte est désactivé.");
  }

  if (!isSuperAdmin(user)) {
    throw new Error("Action réservée au super administrateur.");
  }

  return user as Doc<"users">;
}

// ════════════════════════════════════════════════════════════════════
// ✅ GARDE — Permission requise
// ════════════════════════════════════════════════════════════════════
export async function requirePermission(
  ctx: Ctx,
  userId: Id<"users"> | string | undefined,
  permission: string
): Promise<Doc<"users">> {
  if (!userId) {
    throw new Error("userId requis pour cette action.");
  }

  const user = await ctx.db.get(userId as Id<"users">);

  if (!user) {
    throw new Error("Utilisateur introuvable.");
  }

  if (!isActiveUser(user)) {
    throw new Error("Votre compte est désactivé.");
  }

  if (!hasPermission(user, permission)) {
    throw new Error(`Permission insuffisante : ${permission}`);
  }

  return user as Doc<"users">;
}