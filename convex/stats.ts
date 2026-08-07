import { query } from "./_generated/server";

export const globalStats = query({
  handler: async (ctx) => {
    const ecoles = await ctx.db.query("ecoles").collect();
    const users = await ctx.db.query("users").collect();
    const eleves = await ctx.db.query("eleves").collect();
    const classes = await ctx.db.query("classes").collect();
    const punitions = await ctx.db.query("punitions").collect();

    return {
      totalEcoles: ecoles.length,
      totalUsers: users.length,
      totalEleves: eleves.length,
      totalClasses: classes.length,
      totalPunitions: punitions.length,
    };
  },
});