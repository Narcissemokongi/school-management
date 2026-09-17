// convex/helpers/auth.ts
import { Id, Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type Ctx = MutationCtx | QueryCtx;

type UserLike =
  | {
      role?: string;
      ecoleId?: Id<"ecoles"> | undefined;
      permissions?: string[];
    }
  | null
  | undefined;

/**
 * ✅ Super Admin PRINCIPAL — propriétaire de la plateforme.
 * Seul lui peut créer/supprimer/déléguer les autres super admins.
 */
export function isSuperAdminPrincipal(user: UserLike): boolean {
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

/**
 * ✅ Super Admin (principal OU secondaire) — accès large à la plateforme.
 * À utiliser partout SAUF pour gérer les super admins.
 */
export function isSuperAdmin(user: UserLike): boolean {
  if (!user) return false;
  if (user.role === "admin" && !user.ecoleId) return true;
  if (user.role === "superAdmin") return true;
  return false;
}

/**
 * ✅ Super Admin SECONDAIRE — a des permissions restreintes.
 */
export function isSuperAdminSecondary(user: UserLike): boolean {
  return isSuperAdmin(user) && !isSuperAdminPrincipal(user);
}

/**
 * ✅ Garde à appeler en début de mutation sensible (create/remove/update super admin).
 */
export async function requireSuperAdminPrincipal(
  ctx: Ctx,
  userId: Id<"users"> | string | undefined
): Promise<Doc<"users">> {
  if (!userId) {
    throw new Error("userId requis pour cette action.");
  }

  const user = await ctx.db.get(userId as Id<"users">);

  if (!isSuperAdminPrincipal(user)) {
    throw new Error(
      "Action réservée au super administrateur principal. " +
        "Votre compte n'a pas les droits nécessaires."
    );
  }

  return user as Doc<"users">;
}