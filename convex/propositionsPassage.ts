import { query, mutation, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "../convex/_generated/dataModel";

async function requireRole(ctx: MutationCtx, userId: string | undefined, allowedRoles: string[]) {
  if (!userId) throw new Error("Authentification requise");
  const user = await ctx.db.get(userId as Id<"users">);
  if (!user || !allowedRoles.includes(user.role)) {
    throw new Error("Accès refusé : rôle insuffisant");
  }
  return user;
}

// ----- QUERY : propositions pour une année (avec infos élève) -----
export const listPropositions = query({
  args: {
    ecoleId: v.id("ecoles"),
    anneeId: v.id("anneesScolaires"),
  },
  handler: async (ctx, args) => {
    const propositions = await ctx.db
      .query("propositionsPassage")
      .withIndex("by_ecole_annee", (q) =>
        q.eq("ecoleId", args.ecoleId).eq("anneeId", args.anneeId)
      )
      .collect();

    const eleveIds = propositions.map((p) => p.eleveId);
    const eleves = await Promise.all(eleveIds.map((id) => ctx.db.get(id)));

    return propositions.map((prop) => {
      const eleve = eleves.find((e) => e?._id === prop.eleveId);
      return {
        ...prop,
        nom: eleve?.nom ?? "—",
        postnom: eleve?.postnom ?? "",
        prenom: eleve?.prenom ?? "",
        code: eleve?.code ?? "",
      };
    });
  },
});

// ✅ NOUVELLE QUERY : propositions d'un enseignant pour une année
export const listByEnseignantAndAnnee = query({
  args: {
    ecoleId: v.id("ecoles"),
    anneeId: v.id("anneesScolaires"),
    enseignantId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const propositions = await ctx.db
      .query("propositionsPassage")
      .withIndex("by_ecole_annee", (q) =>
        q.eq("ecoleId", args.ecoleId).eq("anneeId", args.anneeId)
      )
      .filter((q) => q.eq(q.field("enseignantId"), args.enseignantId))
      .collect();

    return propositions;
  },
});

// ----- MUTATION : soumettre des propositions (enseignant) -----
export const soumettrePropositions = mutation({
  args: {
    ecoleId: v.id("ecoles"),
    anneeId: v.id("anneesScolaires"),
    decisions: v.array(
      v.object({
        eleveId: v.id("eleves"),
        statut: v.union(
          v.literal("passant"),
          v.literal("redoublant"),
          v.literal("transfere"),
          v.literal("exclu"),
          v.literal("diplome")
        ),
        classeDestination: v.optional(v.string()),
      })
    ),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.userId, ["enseignant"]);
    const user = await ctx.db.get(args.userId as Id<"users">);
    if (!user?.classe) throw new Error("Aucune classe assignée à cet enseignant.");

    // Vérifier que tous les élèves appartiennent à la classe de l'enseignant
    for (const decision of args.decisions) {
      const inscription = await ctx.db
        .query("inscriptions")
        .withIndex("by_eleve_annee", (q) =>
          q.eq("eleveId", decision.eleveId).eq("anneeId", args.anneeId)
        )
        .first();
      if (!inscription || inscription.classe !== user.classe) {
        throw new Error("Vous ne pouvez proposer que pour les élèves de votre classe.");
      }
    }

    // Insérer ou mettre à jour chaque proposition (soumission partielle possible)
    for (const decision of args.decisions) {
      const existing = await ctx.db
        .query("propositionsPassage")
        .withIndex("by_eleve_annee", (q) =>
          q.eq("eleveId", decision.eleveId).eq("anneeId", args.anneeId)
        )
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          statutPropose: decision.statut,
          classeDestinationPropose: decision.classeDestination,
          dateSoumission: new Date().toISOString(),
        });
      } else {
        await ctx.db.insert("propositionsPassage", {
          eleveId: decision.eleveId,
          ecoleId: args.ecoleId,
          anneeId: args.anneeId,
          enseignantId: args.userId!,
          statutPropose: decision.statut,
          classeDestinationPropose: decision.classeDestination,
          dateSoumission: new Date().toISOString(),
        });
      }
    }

    return { success: true };
  },
});

// ----- MUTATION : supprimer les propositions après promotion (admin/directeur) -----
export const supprimerPropositions = mutation({
  args: {
    ecoleId: v.id("ecoles"),
    anneeId: v.id("anneesScolaires"),
    eleveIds: v.array(v.id("eleves")),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, args.userId, ["admin", "directeur"]);

    for (const eleveId of args.eleveIds) {
      const props = await ctx.db
        .query("propositionsPassage")
        .withIndex("by_eleve_annee", (q) =>
          q.eq("eleveId", eleveId).eq("anneeId", args.anneeId)
        )
        .collect();
      for (const prop of props) {
        await ctx.db.delete(prop._id);
      }
    }
    return { success: true };
  },
});