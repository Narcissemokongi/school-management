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
    // Vérifier que l'utilisateur est bien admin (optionnel)
    // const admin = await ctx.db.get(args.adminId);
    // if (!admin || admin.role !== "admin" || admin.ecoleId) throw new Error("Non autorisé");

    const existing = await ctx.db.query("settings").first();
    if (existing) {
      await ctx.db.patch(existing._id, args);
    } else {
      await ctx.db.insert("settings", args);
    }
  },
});