import { v } from "convex/values";
import { query, mutation, MutationCtx, QueryCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

type AnyCtx = MutationCtx | QueryCtx;

type UserDoc = {
  _id: Id<"users">;
  role: string;
  ecoleId?: Id<"ecoles">;
  permissions?: string[];
};

async function getUser(ctx: AnyCtx, userId: string | undefined): Promise<UserDoc | null> {
  if (!userId) return null;
  return (await ctx.db.get(userId as Id<"users">)) as UserDoc | null;
}

/**
 * 🔴 FIX GLOBAL : tout superAdmin passe désormais (avant : seuls ceux
 * sans permissions étaient reconnus comme principaux).
 */
function isSuperAdmin(user: any): boolean {
  if (!user) return false;
  return (
    user.role === "superAdmin" ||
    (user.role === "admin" && !user.ecoleId)
  );
}

// Récupérer les paramètres globaux
/**
 * ✅ `userId` optionnel — pas de cloisonnement (settings publics au sein
 * de l'app), mais on garde la possibilité de vérifier plus tard.
 */
export const getGlobalSettings = query({
  args: {
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // Si userId fourni, vérifie simplement que l'utilisateur existe
    if (args.userId) {
      const caller = await getUser(ctx, args.userId);
      if (!caller) throw new Error("Authentification requise");
    }

    return await ctx.db.query("settings").first();
  },
});

// Mettre à jour ou créer les paramètres globaux
/**
 * 🟡 FIX : `adminId` toujours requis + superAdmin strict + audit + retour structuré.
 * 🟢 FIX : validation basique des champs.
 */
export const updateGlobalSettings = mutation({
  args: {
    appName: v.string(),
    supportEmail: v.string(),
    supportPhone: v.optional(v.string()),
    address: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    slogan: v.optional(v.string()),
    primaryColor: v.string(),
    adminId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { adminId, ...settingsData } = args;

    // 🔴 FIX : superAdmin strict (tout superAdmin passe)
    const admin = await getUser(ctx, adminId);
    if (!admin) throw new Error("Utilisateur introuvable");
    if (!isSuperAdmin(admin)) {
      throw new Error(
        "Seul le super admin principal peut modifier les paramètres globaux."
      );
    }

    // 🟢 FIX : validation basique
    if (!settingsData.appName.trim()) {
      throw new Error("Le nom de l'application est requis.");
    }
    if (!settingsData.supportEmail.trim()) {
      throw new Error("L'email de support est requis.");
    }
    // 🟢 FIX : validation couleur hex
    if (!/^#([0-9A-F]{3}|[0-9A-F]{6})$/i.test(settingsData.primaryColor)) {
      throw new Error("Couleur principale invalide (format hex attendu).");
    }

    const existing = await ctx.db.query("settings").first();

    let action: string;
    let docId;

    if (existing) {
      await ctx.db.patch(existing._id, settingsData);
      docId = existing._id;
      action = "update_global_settings";
    } else {
      docId = await ctx.db.insert("settings", settingsData);
      action = "create_global_settings";
    }

    // 🟡 Audit
    await ctx.db.insert("audit", {
      userId: adminId,
      action,
      table: "settings",
      documentId: docId,
      date: new Date().toISOString(),
      ecoleId: undefined,
      details: existing
        ? `Paramètres globaux mis à jour (appName: "${settingsData.appName}")`
        : `Paramètres globaux créés (appName: "${settingsData.appName}")`,
    });

    return { success: true, settingsId: docId, action };
  },
});