import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Récupérer les paramètres globaux
export const getGlobalSettings = query({
  handler: async (ctx) => {
    return await ctx.db.query("settings").first();
  },
});

// Mettre à jour ou créer les paramètres globaux
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

    // Vérifier que l'utilisateur est le superadmin principal
    const admin = await ctx.db.get(adminId);
    const isSuperAdminPrincipal =
      (admin?.role === "admin" && !admin.ecoleId) ||
      (admin?.role === "superAdmin" &&
        (!admin.permissions || admin.permissions.length === 0));

    if (!isSuperAdminPrincipal) {
      throw new Error("Seul le super admin principal peut modifier les paramètres globaux.");
    }

    const existing = await ctx.db.query("settings").first();
    if (existing) {
      await ctx.db.patch(existing._id, settingsData);
    } else {
      await ctx.db.insert("settings", settingsData);
    }
  },
});