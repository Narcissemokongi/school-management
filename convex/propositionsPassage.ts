import { query, mutation, MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// ============================================================
// TYPES
// ============================================================

type AnyCtx = MutationCtx | QueryCtx;

// ============================================================
// HELPERS
// ============================================================

/**
 * Vérifie les permissions école/rôle.
 *
 * CORRECTIF #2 : l'ancienne version rejetait à tort un superAdmin AVEC
 * permissions. Désormais tout superAdmin (avec ou sans permissions) passe.
 *
 * Signature élargie à MutationCtx | QueryCtx pour usage dans les queries.
 */
async function requireEcolePermission(
  ctx: AnyCtx,
  userId: string | undefined,
  ecoleId: string,
  allowedRoles: string[],
  classe?: string
) {
  if (!userId) throw new Error("Authentification requise");
  const user = await ctx.db.get(userId as Id<"users">);
  if (!user) throw new Error("Utilisateur introuvable");

  const isSuperAdmin =
    user.role === "superAdmin" ||
    (user.role === "admin" && !user.ecoleId);

  if (isSuperAdmin) return user;

  if (!allowedRoles.includes(user.role)) {
    throw new Error("Accès refusé : rôle insuffisant");
  }

  if (user.ecoleId !== ecoleId) {
    throw new Error("Vous n'êtes pas autorisé à gérer cette école.");
  }

  if (classe && user.role === "enseignant" && user.classe !== classe) {
    throw new Error("Vous n'êtes pas assigné à cette classe.");
  }

  return user;
}

/** Vérifie la date limite de soumission pour une année. */
async function checkDateLimite(
  ctx: AnyCtx,
  anneeId: Id<"anneesScolaires">
): Promise<{ passed: boolean; dateLimite: string | null }> {
  const annee = await ctx.db.get(anneeId);
  if (!annee) return { passed: false, dateLimite: null };

  const dateLimite = annee.dateLimitePassage;
  if (!dateLimite) return { passed: false, dateLimite: null };

  const now = new Date();
  const limite = new Date(dateLimite);
  return { passed: now > limite, dateLimite };
}

/** Envoie une notification interne via la messagerie. */
async function sendNotification(
  ctx: MutationCtx,
  {
    ecoleId,
    expediteurId,
    destinataireId,
    contenu,
    anneeId,
  }: {
    ecoleId: Id<"ecoles">;
    expediteurId: Id<"users">;
    destinataireId: Id<"users">;
    contenu: string;
    anneeId?: Id<"anneesScolaires">;
  }
) {
  await ctx.db.insert("messages", {
    ecoleId,
    expediteurId,
    destinataireId,
    contenu,
    date: new Date().toISOString(),
    lu: false,
    anneeId,
  });
}

/**
 * Chargement batch d'élèves par ids (fix N+1 → Map O(n)).
 */
async function loadEleveMap(
  ctx: AnyCtx,
  eleveIds: Id<"eleves">[]
): Promise<Map<Id<"eleves">, any>> {
  const unique = [...new Set(eleveIds)];
  const eleves = await Promise.all(unique.map((id) => ctx.db.get(id)));
  return new Map(
    eleves.filter(Boolean).map((e) => [e!._id, e!])
  );
}

/**
 * Charge un Map générique users par ids.
 */
async function loadUserMap(
  ctx: AnyCtx,
  userIds: Id<"users">[]
): Promise<Map<Id<"users">, any>> {
  const unique = [...new Set(userIds)];
  const users = await Promise.all(unique.map((id) => ctx.db.get(id)));
  return new Map(
    users.filter(Boolean).map((u) => [u!._id, u!])
  );
}

// ============================================================
// QUERIES
// ============================================================

/**
 * 🔴 SÉCURITÉ (fix #1) : `userId` requis.
 * 🔴 Auth (fix Q1) : admin/directeur → tout ; enseignant → sa classe uniquement.
 * 🟢 Perf (fix #10) : Map au lieu de find() O(n²).
 */
export const listPropositions = query({
  args: {
    ecoleId: v.id("ecoles"),
    anneeId: v.id("anneesScolaires"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await requireEcolePermission(
      ctx,
      args.userId,
      args.ecoleId,
      ["admin", "directeur", "enseignant"]
    );

    const propositions = await ctx.db
      .query("propositionsPassage")
      .withIndex("by_ecole_annee", (q) =>
        q.eq("ecoleId", args.ecoleId).eq("anneeId", args.anneeId)
      )
      .collect();

    const eleveMap = await loadEleveMap(
      ctx,
      propositions.map((p) => p.eleveId)
    );

    // Enseignant : filtre sur sa classe uniquement
    const isEnseignant = user.role === "enseignant";

    return propositions
      .filter((prop) => {
        if (!isEnseignant) return true;
        const eleve = eleveMap.get(prop.eleveId);
        return eleve?.classe === user.classe;
      })
      .map((prop) => {
        const eleve = eleveMap.get(prop.eleveId);
        return {
          ...prop,
          nom: eleve?.nom ?? "—",
          postnom: eleve?.postnom ?? "",
          prenom: eleve?.prenom ?? "",
          code: eleve?.code ?? "",
          classeEleve: eleve?.classe ?? "—",
        };
      });
  },
});

/**
 * 🔴 SÉCURITÉ (fix #1 + Q1) : un enseignant ne peut lire QUE ses propres
 * propositions. Un admin/directeur peut lire celles de n'importe quel
 * enseignant de son école.
 */
export const listByEnseignantAndAnnee = query({
  args: {
    ecoleId: v.id("ecoles"),
    anneeId: v.id("anneesScolaires"),
    enseignantId: v.id("users"),
    userId: v.id("users"), // ← appelant
  },
  handler: async (ctx, args) => {
    const user = await requireEcolePermission(
      ctx,
      args.userId,
      args.ecoleId,
      ["admin", "directeur", "enseignant"]
    );

    // Un enseignant ne peut lire que SES propres propositions
    if (user.role === "enseignant" && user._id !== args.enseignantId) {
      throw new Error(
        "Vous ne pouvez consulter que vos propres propositions."
      );
    }

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

/**
 * 🔴 SÉCURITÉ (fix #1 + Q1) : admin/directeur OU enseignant de cette classe.
 * 🟢 Perf (fix #10) : Map au lieu de Promise.all imbriqué.
 */
export const listByClasse = query({
  args: {
    ecoleId: v.id("ecoles"),
    anneeId: v.id("anneesScolaires"),
    classe: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireEcolePermission(
      ctx,
      args.userId,
      args.ecoleId,
      ["admin", "directeur", "enseignant"],
      args.classe // ← si enseignant, doit avoir cette classe
    );

    const propositions = await ctx.db
      .query("propositionsPassage")
      .withIndex("by_ecole_annee", (q) =>
        q.eq("ecoleId", args.ecoleId).eq("anneeId", args.anneeId)
      )
      .collect();

    // Batch : élèves + enseignants
    const eleveMap = await loadEleveMap(
      ctx,
      propositions.map((p) => p.eleveId)
    );
    const enseignantMap = await loadUserMap(
      ctx,
      propositions.map((p) => p.enseignantId)
    );

    return propositions
      .filter((p) => eleveMap.get(p.eleveId)?.classe === args.classe)
      .map((prop) => {
        const eleve = eleveMap.get(prop.eleveId);
        const enseignant = enseignantMap.get(prop.enseignantId);
        return {
          ...prop,
          nom: eleve?.nom ?? "—",
          postnom: eleve?.postnom ?? "",
          prenom: eleve?.prenom ?? "",
          codeEleve: eleve?.code ?? "",
          classeEleve: eleve?.classe ?? "—",
          enseignantNom: enseignant
            ? `${enseignant.nom} ${enseignant.postnom || ""}`.trim()
            : "—",
        };
      });
  },
});

/**
 * 🔴 SÉCURITÉ (fix #1 + Q1) : réservé admin/directeur (outil de pilotage).
 */
export const getStatsByClasse = query({
  args: {
    ecoleId: v.id("ecoles"),
    anneeId: v.id("anneesScolaires"),
    classe: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireEcolePermission(
      ctx,
      args.userId,
      args.ecoleId,
      ["admin", "directeur"] // ← enseignant exclu
    );

    const propositions = await ctx.db
      .query("propositionsPassage")
      .withIndex("by_ecole_annee", (q) =>
        q.eq("ecoleId", args.ecoleId).eq("anneeId", args.anneeId)
      )
      .collect();

    const eleveMap = await loadEleveMap(
      ctx,
      propositions.map((p) => p.eleveId)
    );

    const filtered = propositions.filter(
      (p) => eleveMap.get(p.eleveId)?.classe === args.classe
    );

    const total = filtered.length;
    const soumises = filtered.filter(
      (p) => !p.statutValidation || p.statutValidation === "soumise"
    ).length;
    const validees = filtered.filter(
      (p) => p.statutValidation === "validee"
    ).length;
    const modifiees = filtered.filter(
      (p) => p.statutValidation === "modifiee"
    ).length;
    const rejetees = filtered.filter(
      (p) => p.statutValidation === "rejetee"
    ).length;
    const divergences = filtered.filter(
      (p) =>
        p.statutValidation === "modifiee" ||
        (p.statutFinal && p.statutFinal !== p.statutPropose)
    ).length;
    const conseilDiscipline = filtered.filter(
      (p) => p.enConseilDiscipline
    ).length;

    return {
      total,
      soumises,
      validees,
      modifiees,
      rejetees,
      divergences,
      conseilDiscipline,
      // 🟢 Fix #13 : sans accent (compat JS)
      termine: total > 0 && soumises === 0,
    };
  },
});

/**
 * 🔴 SÉCURITÉ (fix #1 + Q1) : simple auth + vérif école de l'année.
 */
export const getDeadlineStatus = query({
  args: {
    anneeId: v.id("anneesScolaires"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("Authentification requise");

    const annee = await ctx.db.get(args.anneeId);
    if (!annee) {
      return { hasDeadline: false, dateLimite: null, passed: false };
    }

    // Vérif école (si le champ ecoleId existe sur anneesScolaires)
    const anneeEcoleId = (annee as any).ecoleId as Id<"ecoles"> | undefined;
    const isSuperAdmin =
      user.role === "superAdmin" ||
      (user.role === "admin" && !user.ecoleId);

    if (
      !isSuperAdmin &&
      anneeEcoleId &&
      user.ecoleId &&
      user.ecoleId !== anneeEcoleId
    ) {
      throw new Error("Vous n'êtes pas autorisé à consulter cette année.");
    }

    const dateLimite = annee.dateLimitePassage;
    if (!dateLimite) {
      return { hasDeadline: false, dateLimite: null, passed: false };
    }

    const passed = new Date() > new Date(dateLimite);
    return { hasDeadline: true, dateLimite, passed };
  },
});

// ============================================================
// MUTATIONS ENSEIGNANT
// ============================================================

/**
 * 🔴 Fix #3 : `userId` désormais REQUIS (plus optional).
 * 🟡 Fix #14 : refuse les décisions vides.
 * 🟡 Fix #17 : retourne { updated, skipped } pour que l'enseignant sache.
 * 🟢 Fix #4 : la race condition client (double-tap) est gérée par la
 *    vérification `existing` ; Convex sérialise les mutations.
 */
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
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    if (args.decisions.length === 0) {
      throw new Error("Aucune décision à soumettre.");
    }

    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("Utilisateur introuvable");

    await requireEcolePermission(ctx, args.userId, args.ecoleId, [
      "enseignant",
    ]);

    if (!user.classe) {
      throw new Error("Aucune classe assignée à cet enseignant.");
    }

    const deadlineCheck = await checkDateLimite(ctx, args.anneeId);
    if (deadlineCheck.passed) {
      throw new Error(
        `La date limite de soumission (${deadlineCheck.dateLimite}) est dépassée. Vous ne pouvez plus soumettre de propositions.`
      );
    }

    // Vérif classe : tous les élèves doivent appartenir à la classe de l'enseignant
    for (const decision of args.decisions) {
      const inscription = await ctx.db
        .query("inscriptions")
        .withIndex("by_eleve_annee", (q) =>
          q.eq("eleveId", decision.eleveId).eq("anneeId", args.anneeId)
        )
        .first();
      if (!inscription || inscription.classe !== user.classe) {
        throw new Error(
          "Vous ne pouvez proposer que pour les élèves de votre classe."
        );
      }
    }

    const now = new Date().toISOString();
    const updated: Id<"eleves">[] = [];
    const skipped: { eleveId: Id<"eleves">; reason: string }[] = [];

    for (const decision of args.decisions) {
      const existing = await ctx.db
        .query("propositionsPassage")
        .withIndex("by_eleve_annee", (q) =>
          q.eq("eleveId", decision.eleveId).eq("anneeId", args.anneeId)
        )
        .first();

      if (existing) {
        if (
          existing.statutValidation === "validee" ||
          existing.statutValidation === "modifiee"
        ) {
          skipped.push({
            eleveId: decision.eleveId,
            reason: "déjà validée par le directeur",
          });
          continue;
        }

        await ctx.db.patch(existing._id, {
          statutPropose: decision.statut,
          classeDestinationPropose: decision.classeDestination,
          dateSoumission: now,
          statutValidation: "soumise",
          statutFinal: undefined,
          classeDestinationFinale: undefined,
          commentaireDirecteur: undefined,
          valideePar: undefined,
          valideeLe: undefined,
          derniereModificationEnseignant: now,
        });
        updated.push(decision.eleveId);
      } else {
        await ctx.db.insert("propositionsPassage", {
          eleveId: decision.eleveId,
          ecoleId: args.ecoleId,
          anneeId: args.anneeId,
          enseignantId: args.userId,
          statutPropose: decision.statut,
          classeDestinationPropose: decision.classeDestination,
          dateSoumission: now,
          statutValidation: "soumise",
        });
        updated.push(decision.eleveId);
      }
    }

    return {
      success: true,
      updated: updated.length,
      skipped,
    };
  },
});

// ============================================================
// MUTATIONS DIRECTEUR
// ============================================================

/**
 * 🟡 Fix Q2 = Option B : réécriture autorisée (le directeur peut se raviser)
 *    mais l'ancienne décision est intégralement tracée dans l'audit.
 * 🟡 Fix #5 : audit enrichi en cas de réécriture.
 */
export const validerProposition = mutation({
  args: {
    propositionId: v.id("propositionsPassage"),
    statutFinal: v.union(
      v.literal("passant"),
      v.literal("redoublant"),
      v.literal("transfere"),
      v.literal("exclu"),
      v.literal("diplome")
    ),
    classeDestinationFinale: v.optional(v.string()),
    commentaireDirecteur: v.optional(v.string()),
    enConseilDiscipline: v.optional(v.boolean()),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const prop = await ctx.db.get(args.propositionId);
    if (!prop) throw new Error("Proposition introuvable");

    await requireEcolePermission(ctx, args.userId, prop.ecoleId, [
      "admin",
      "directeur",
    ]);

    // Détection de réécriture
    const isReecriture =
      prop.statutValidation === "validee" ||
      prop.statutValidation === "modifiee";

    const isDivergence =
      prop.statutPropose !== args.statutFinal ||
      (prop.classeDestinationPropose || "") !==
        (args.classeDestinationFinale || "");

    if (isDivergence && !args.commentaireDirecteur?.trim()) {
      throw new Error(
        "Une justification est obligatoire lorsque la décision diverge de la proposition de l'enseignant."
      );
    }

    const now = new Date().toISOString();

    await ctx.db.patch(args.propositionId, {
      statutValidation: isDivergence ? "modifiee" : "validee",
      statutFinal: args.statutFinal,
      classeDestinationFinale: args.classeDestinationFinale,
      commentaireDirecteur: args.commentaireDirecteur?.trim() || undefined,
      enConseilDiscipline: args.enConseilDiscipline || undefined,
      valideePar: args.userId,
      valideeLe: now,
    });

    // Audit — enrichi si réécriture
    let details: string;
    let action: string;

    if (isReecriture) {
      action = "rerewrite_proposition";
      details = [
        `Réécriture : ${prop.statutFinal ?? prop.statutPropose} → ${args.statutFinal}.`,
        `Décision précédente validée par ${prop.valideePar ?? "?"} le ${prop.valideeLe ?? "?"}.`,
        args.commentaireDirecteur
          ? `Motif : ${args.commentaireDirecteur}`
          : "",
      ]
        .filter(Boolean)
        .join(" ");
    } else {
      action = isDivergence ? "modify_proposition" : "validate_proposition";
      details = isDivergence
        ? `Décision modifiée : ${prop.statutPropose} → ${args.statutFinal}. Motif : ${args.commentaireDirecteur}`
        : `Proposition validée : ${args.statutFinal}`;
    }

    await ctx.db.insert("audit", {
      userId: args.userId,
      action,
      table: "propositionsPassage",
      documentId: args.propositionId,
      date: now,
      ecoleId: prop.ecoleId,
      details,
    });

    return { success: true, isDivergence, isReecriture };
  },
});

/**
 * 🟡 Fix #7 : retourne { count, skipped } pour que le directeur sache
 *    combien de propositions ont été réellement traitées.
 */
export const validerPropositionsEnMasse = mutation({
  args: {
    ecoleId: v.id("ecoles"),
    anneeId: v.id("anneesScolaires"),
    classe: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireEcolePermission(ctx, args.userId, args.ecoleId, [
      "admin",
      "directeur",
    ]);

    const propositions = await ctx.db
      .query("propositionsPassage")
      .withIndex("by_ecole_annee", (q) =>
        q.eq("ecoleId", args.ecoleId).eq("anneeId", args.anneeId)
      )
      .collect();

    const eleveMap = await loadEleveMap(
      ctx,
      propositions.map((p) => p.eleveId)
    );

    const now = new Date().toISOString();
    const validated: Id<"propositionsPassage">[] = [];
    const skipped: { id: Id<"propositionsPassage">; reason: string }[] = [];

    for (const prop of propositions) {
      const eleve = eleveMap.get(prop.eleveId);
      if (eleve?.classe !== args.classe) continue;

      if (
        prop.statutValidation === "validee" ||
        prop.statutValidation === "modifiee"
      ) {
        skipped.push({ id: prop._id, reason: "déjà traitée" });
        continue;
      }

      await ctx.db.patch(prop._id, {
        statutValidation: "validee",
        statutFinal: prop.statutPropose,
        classeDestinationFinale: prop.classeDestinationPropose,
        valideePar: args.userId,
        valideeLe: now,
      });
      validated.push(prop._id);
    }

    await ctx.db.insert("audit", {
      userId: args.userId,
      action: "bulk_validate_propositions",
      table: "propositionsPassage",
      documentId: args.anneeId,
      date: now,
      ecoleId: args.ecoleId,
      details: `${validated.length} validées, ${skipped.length} ignorées pour la classe ${args.classe}`,
    });

    return { success: true, count: validated.length, skipped };
  },
});

export const rejeterProposition = mutation({
  args: {
    propositionId: v.id("propositionsPassage"),
    commentaireDirecteur: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const prop = await ctx.db.get(args.propositionId);
    if (!prop) throw new Error("Proposition introuvable");

    await requireEcolePermission(ctx, args.userId, prop.ecoleId, [
      "admin",
      "directeur",
    ]);

    if (!args.commentaireDirecteur.trim()) {
      throw new Error("Une justification est obligatoire pour rejeter.");
    }

    const now = new Date().toISOString();

    await ctx.db.patch(args.propositionId, {
      statutValidation: "rejetee",
      commentaireDirecteur: args.commentaireDirecteur.trim(),
      valideePar: args.userId,
      valideeLe: now,
    });

    await ctx.db.insert("audit", {
      userId: args.userId,
      action: "reject_proposition",
      table: "propositionsPassage",
      documentId: args.propositionId,
      date: now,
      ecoleId: prop.ecoleId,
      details: `Proposition rejetée : ${args.commentaireDirecteur}`,
    });

    return { success: true };
  },
});

/**
 * 🟡 Fix #9 : audit ajouté (action sensible sans trace auparavant).
 */
export const toggleConseilDiscipline = mutation({
  args: {
    propositionId: v.id("propositionsPassage"),
    enConseil: v.boolean(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const prop = await ctx.db.get(args.propositionId);
    if (!prop) throw new Error("Proposition introuvable");

    await requireEcolePermission(ctx, args.userId, prop.ecoleId, [
      "admin",
      "directeur",
    ]);

    const now = new Date().toISOString();

    await ctx.db.patch(args.propositionId, {
      enConseilDiscipline: args.enConseil || undefined,
    });

    await ctx.db.insert("audit", {
      userId: args.userId,
      action: args.enConseil
        ? "flag_conseil_discipline"
        : "unflag_conseil_discipline",
      table: "propositionsPassage",
      documentId: args.propositionId,
      date: now,
      ecoleId: prop.ecoleId,
      details: args.enConseil
        ? "Marqué pour le conseil de discipline"
        : "Retiré du conseil de discipline",
    });

    return { success: true };
  },
});

export const notifierEnseignants = mutation({
  args: {
    ecoleId: v.id("ecoles"),
    anneeId: v.id("anneesScolaires"),
    classe: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireEcolePermission(ctx, args.userId, args.ecoleId, [
      "admin",
      "directeur",
    ]);

    const directeur = await ctx.db.get(args.userId);
    const directeurNom = directeur
      ? `${directeur.nom} ${directeur.postnom || ""}`.trim()
      : "Le Directeur";

    const propositions = await ctx.db
      .query("propositionsPassage")
      .withIndex("by_ecole_annee", (q) =>
        q.eq("ecoleId", args.ecoleId).eq("anneeId", args.anneeId)
      )
      .collect();

    const eleveMap = await loadEleveMap(
      ctx,
      propositions.map((p) => p.eleveId)
    );

    const filtered = propositions.filter(
      (p) => eleveMap.get(p.eleveId)?.classe === args.classe
    );

    // 🟢 Fix #11 : typage correct
    const byEnseignant: Record<string, typeof filtered> = {};
    for (const prop of filtered) {
      const key = prop.enseignantId as string;
      if (!byEnseignant[key]) byEnseignant[key] = [];
      byEnseignant[key].push(prop);
    }

    const now = new Date().toISOString();
    let notifCount = 0;

    for (const [enseignantId, props] of Object.entries(byEnseignant)) {
      const validees = props.filter(
        (p) => p.statutValidation === "validee"
      ).length;
      const modifiees = props.filter(
        (p) => p.statutValidation === "modifiee"
      ).length;
      const rejetees = props.filter(
        (p) => p.statutValidation === "rejetee"
      ).length;

      let contenu = `📋 ${directeurNom} a traité vos propositions de passage pour la classe ${args.classe}.\n\n`;
      contenu += `✅ Validées : ${validees}\n`;
      if (modifiees > 0) contenu += `✏️ Modifiées : ${modifiees}\n`;
      if (rejetees > 0) contenu += `❌ Rejetées : ${rejetees}\n`;
      contenu += `\nConnectez-vous pour consulter le détail des décisions.`;

      await sendNotification(ctx, {
        ecoleId: args.ecoleId,
        expediteurId: args.userId,
        destinataireId: enseignantId as Id<"users">,
        contenu,
        anneeId: args.anneeId,
      });
      notifCount++;
    }

    await ctx.db.insert("audit", {
      userId: args.userId,
      action: "notify_teachers_passage",
      table: "propositionsPassage",
      documentId: args.anneeId,
      date: now,
      ecoleId: args.ecoleId,
      details: `${notifCount} enseignant(s) notifié(s) pour la classe ${args.classe}`,
    });

    return { success: true, count: notifCount };
  },
});

// ============================================================
// MUTATION ADMIN : suppression après promotion
// ============================================================

/**
 * 🔴 Fix #6 : audit obligatoire + `userId` requis + retour `{ deleted }`.
 */
export const supprimerPropositions = mutation({
  args: {
    ecoleId: v.id("ecoles"),
    anneeId: v.id("anneesScolaires"),
    eleveIds: v.array(v.id("eleves")),
    userId: v.id("users"), // ← requis
  },
  handler: async (ctx, args) => {
    await requireEcolePermission(ctx, args.userId, args.ecoleId, [
      "admin",
      "directeur",
    ]);

    let deleted = 0;

    for (const eleveId of args.eleveIds) {
      const props = await ctx.db
        .query("propositionsPassage")
        .withIndex("by_eleve_annee", (q) =>
          q.eq("eleveId", eleveId).eq("anneeId", args.anneeId)
        )
        .collect();
      for (const prop of props) {
        await ctx.db.delete(prop._id);
        deleted++;
      }
    }

    await ctx.db.insert("audit", {
      userId: args.userId,
      action: "delete_propositions",
      table: "propositionsPassage",
      documentId: args.anneeId,
      date: new Date().toISOString(),
      ecoleId: args.ecoleId,
      details: `${deleted} propositions supprimées pour ${args.eleveIds.length} élève(s)`,
    });

    return { success: true, deleted };
  },
});