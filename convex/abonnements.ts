// convex/abonnements.ts
import {
  query,
  mutation,
  internalMutation,
  MutationCtx,
  QueryCtx,
} from "./_generated/server";
import { v } from "convex/values";
import { Id, Doc } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { requireGranularPermission } from "./helpers/permissions";

type AnyCtx = MutationCtx | QueryCtx;

// ════════════════════════════════════════════════════════════════════
// PALIERS PAR DÉFAUT
// ════════════════════════════════════════════════════════════════════
const PALIERS_DEFAUT = [
  { min: 1, max: 50, montant: 20 },
  { min: 51, max: 100, montant: 40 },
  { min: 101, max: 150, montant: 60 },
  { min: 151, max: 200, montant: 80 },
  { min: 201, max: 250, montant: 100 },
  { min: 251, max: 300, montant: 120 },
  { min: 301, max: 350, montant: 140 },
  { min: 351, max: 400, montant: 160 },
  { min: 401, max: 450, montant: 180 },
  { min: 451, max: 500, montant: 200 },
];

const DELAI_GRACE_DEFAUT = 14;
const ECOLES_MAX = 500;
const MS_JOUR = 24 * 60 * 60 * 1000;

// ════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════

function toTimestamp(v: unknown): number {
  if (!v) return 0;
  if (typeof v === "number") return v;
  const t = new Date(v as string).getTime();
  return Number.isFinite(t) ? t : 0;
}

function calculerFormule(nbUsers: number): {
  formule: string;
  montant: number;
} {
  if (nbUsers <= 0) {
    return { formule: "1-50", montant: 20 };
  }

  for (const palier of PALIERS_DEFAUT) {
    if (nbUsers >= palier.min && nbUsers <= palier.max) {
      return {
        formule: `${palier.min}-${palier.max}`,
        montant: palier.montant,
      };
    }
  }

  const dernierPalier = PALIERS_DEFAUT[PALIERS_DEFAUT.length - 1];
  const tranchesSupp = Math.ceil((nbUsers - dernierPalier.max) / 50);
  const palierMax = dernierPalier.max + tranchesSupp * 50;
  const palierMin = dernierPalier.max + 1 + (tranchesSupp - 1) * 50;
  return {
    formule: `${palierMin}-${palierMax}`,
    montant: dernierPalier.montant + tranchesSupp * 20,
  };
}

function ajouterJours(dateIso: string, jours: number): string {
  const d = new Date(dateIso);
  d.setDate(d.getDate() + jours);
  return d.toISOString();
}

async function compterUtilisateurs(
  ctx: AnyCtx,
  ecoleId: Id<"ecoles">
): Promise<number> {
  const users = await ctx.db
    .query("users")
    .withIndex("by_ecoleId", (q) => q.eq("ecoleId", ecoleId))
    .take(2000);

  return users.filter(
    (u) =>
      u.status === "active" ||
      u.status === undefined ||
      u.status === null
  ).length;
}

async function findContactEmail(
  ctx: AnyCtx,
  ecoleId: Id<"ecoles">
): Promise<{ nom: string; email: string } | null> {
  const users = await ctx.db
    .query("users")
    .withIndex("by_ecoleId", (q) => q.eq("ecoleId", ecoleId))
    .take(200);

  const admin = users.find(
    (u) =>
      (u.role === "admin" || u.role === "directeur") &&
      u.email &&
      u.email.includes("@")
  );
  if (admin) return { nom: admin.nom, email: admin.email! };

  const anyUser = users.find((u) => u.email && u.email.includes("@"));
  if (anyUser) return { nom: anyUser.nom, email: anyUser.email! };

  return null;
}

// ════════════════════════════════════════════════════════════════════
// QUERIES — Abonnements
// ════════════════════════════════════════════════════════════════════

export const getByEcole = query({
  args: {
    ecoleId: v.id("ecoles"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // ✨ Permission granulaire : abonnements.read
    await requireGranularPermission(ctx, args.userId, "abonnements.read");

    const abonnement = await ctx.db
      .query("abonnements")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId))
      .first();

    if (!abonnement) return null;

    const nbUsers = await compterUtilisateurs(ctx, args.ecoleId);
    const paiements = await ctx.db
      .query("paiementsAbonnement")
      .withIndex("by_abonnementId", (q) =>
        q.eq("abonnementId", abonnement._id)
      )
      .order("desc")
      .take(20);

    return {
      ...abonnement,
      nombreUtilisateurs: nbUsers,
      paiements,
    };
  },
});

export const listAll = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // ✨ Permission granulaire : abonnements.read
    await requireGranularPermission(ctx, args.userId, "abonnements.read");

    const abonnements = await ctx.db.query("abonnements").take(ECOLES_MAX);
    const resultats = [];

    for (const ab of abonnements) {
      const ecole = await ctx.db.get(ab.ecoleId);
      const nbUsers = await compterUtilisateurs(ctx, ab.ecoleId);
      resultats.push({
        ...ab,
        ecoleNom: ecole?.nom ?? "École supprimée",
        ecoleCode: ecole?.code ?? "",
        nombreUtilisateursActifs: nbUsers,
      });
    }

    return resultats;
  },
});

export const statsGlobales = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // ✨ Permission granulaire : abonnements.read
    await requireGranularPermission(ctx, args.userId, "abonnements.read");

    const abonnements = await ctx.db.query("abonnements").take(ECOLES_MAX);

    const stats = {
      total: abonnements.length,
      actifs: 0,
      enGrace: 0,
      suspendus: 0,
      expires: 0,
      revenuMensuelAttendu: 0,
      revenuMensuelEncaisse: 0,
      ecolesImpayees: 0,
    };

    const maintenantIso = new Date().toISOString();

    for (const ab of abonnements) {
      stats.revenuMensuelAttendu += ab.montantMensuel;

      if (ab.statut === "actif") stats.actifs++;
      else if (ab.statut === "grace") stats.enGrace++;
      else if (ab.statut === "suspendu") stats.suspendus++;
      else if (ab.statut === "expire") stats.expires++;

      if (ab.prochaineEcheance < maintenantIso && ab.statut !== "actif") {
        stats.ecolesImpayees++;
      }
    }

    return stats;
  },
});

export const getPaliers = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // ✨ Permission granulaire : abonnements.read
    await requireGranularPermission(ctx, args.userId, "abonnements.read");

    const record = await ctx.db
      .query("parametresAbonnement")
      .withIndex("by_cle", (q) => q.eq("cle", "paliers"))
      .first();

    if (!record) {
      return { paliers: PALIERS_DEFAUT, delaiGrace: DELAI_GRACE_DEFAUT };
    }

    try {
      const parsed = JSON.parse(record.valeur);
      return {
        paliers: parsed.paliers ?? PALIERS_DEFAUT,
        delaiGrace: parsed.delaiGrace ?? DELAI_GRACE_DEFAUT,
      };
    } catch {
      return { paliers: PALIERS_DEFAUT, delaiGrace: DELAI_GRACE_DEFAUT };
    }
  },
});

// ════════════════════════════════════════════════════════════════════
// STATS FINANCIÈRES — module Finances
// ════════════════════════════════════════════════════════════════════

export const statsFinancieres = query({
  args: {
    userId: v.id("users"),
    moisRecents: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // ✨ Permission granulaire : finances.read
    await requireGranularPermission(ctx, args.userId, "finances.read");

    const nbMois = Math.min(args.moisRecents ?? 6, 12);
    const maintenant = Date.now();

    const abonnements = await ctx.db.query("abonnements").take(1000);
    const ecoleIds = [...new Set(abonnements.map((a) => a.ecoleId))];
    const ecolesDocs = await Promise.all(ecoleIds.map((id) => ctx.db.get(id)));
    const ecolesMap = new Map<string, Doc<"ecoles">>();
    for (const e of ecolesDocs) {
      if (e) ecolesMap.set(e._id, e);
    }

    const actifs = abonnements.filter((a) => a.statut === "actif");
    const mrr = actifs.reduce((s, a) => s + (a.montantMensuel || 0), 0);
    const arr = mrr * 12;

    const impayes = abonnements.filter((a) => {
      if (a.statut === "grace") return true;
      if (a.statut === "actif") {
        const ts = toTimestamp(a.prochaineEcheance);
        return ts > 0 && ts < maintenant;
      }
      return false;
    });
    const montantImpayes = impayes.reduce(
      (s, a) => s + (a.montantMensuel || 0),
      0
    );

    const debutMois = new Date();
    debutMois.setDate(1);
    debutMois.setHours(0, 0, 0, 0);
    const suspendusCeMois = abonnements.filter(
      (a) => a.statut === "suspendu" && a._creationTime >= debutMois.getTime()
    );
    const actifsDebutMois = actifs.length + suspendusCeMois.length;
    const tauxChurn =
      actifsDebutMois > 0
        ? (suspendusCeMois.length / actifsDebutMois) * 100
        : 0;

    const debutPeriode = new Date();
    debutPeriode.setMonth(debutPeriode.getMonth() - (nbMois - 1));
    debutPeriode.setDate(1);
    debutPeriode.setHours(0, 0, 0, 0);

    const paiements = await ctx.db
      .query("paiementsAbonnement")
      .filter((q) => q.gte(q.field("_creationTime"), debutPeriode.getTime()))
      .take(5000);

    const buckets = new Map<string, number>();
    for (const p of paiements) {
      const d = new Date(p._creationTime);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      buckets.set(key, (buckets.get(key) || 0) + (p.montant || 0));
    }

    const revenusParMois: { mois: string; label: string; montant: number }[] = [];
    for (let i = nbMois - 1; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("fr-FR", {
        month: "short",
        year: "2-digit",
      });
      revenusParMois.push({ mois: key, label, montant: buckets.get(key) || 0 });
    }

    const totalParEcole = new Map<string, number>();
    for (const p of paiements) {
      totalParEcole.set(
        p.ecoleId,
        (totalParEcole.get(p.ecoleId) || 0) + (p.montant || 0)
      );
    }
    const topEcoles = [...totalParEcole.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([ecoleId, total]) => ({
        ecoleId,
        nom: ecolesMap.get(ecoleId)?.nom || "École inconnue",
        total,
      }));

    const dans30j = maintenant + 30 * MS_JOUR;
    const previsions30j = actifs
      .filter((a) => {
        const ts = toTimestamp(a.prochaineEcheance);
        return ts > 0 && ts <= dans30j;
      })
      .reduce((s, a) => s + (a.montantMensuel || 0), 0);

    const moisActuel = revenusParMois[revenusParMois.length - 1]?.montant || 0;
    const moisPrecedent = revenusParMois[revenusParMois.length - 2]?.montant || 0;
    const croissance =
      moisPrecedent > 0
        ? ((moisActuel - moisPrecedent) / moisPrecedent) * 100
        : 0;

    return {
      mrr,
      arr,
      montantImpayes,
      nbImpayes: impayes.length,
      nbEcolesActives: actifs.length,
      tauxChurn,
      nbSuspendusCeMois: suspendusCeMois.length,
      revenusParMois,
      topEcoles,
      previsions30j,
      moisActuel,
      moisPrecedent,
      croissance,
    };
  },
});

// ════════════════════════════════════════════════════════════════════
// TABLE IMPAYÉS — module Impayés (lecture)
// ════════════════════════════════════════════════════════════════════

export const listImpayes = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // ✨ Permission granulaire : impayes.read
    await requireGranularPermission(ctx, args.userId, "impayes.read");

    const now = Date.now();
    const abonnements = await ctx.db.query("abonnements").take(1000);

    const impayes: any[] = [];

    for (const abo of abonnements) {
      const echeanceMs = toTimestamp(abo.prochaineEcheance);
      const enRetard = echeanceMs > 0 && echeanceMs < now;
      const joursRetard = enRetard
        ? Math.floor((now - echeanceMs) / MS_JOUR)
        : 0;

      const isImpaye =
        abo.statut === "grace" ||
        abo.statut === "expire" ||
        abo.statut === "suspendu" ||
        (abo.statut === "actif" && enRetard);

      if (!isImpaye) continue;

      const ecole = await ctx.db.get(abo.ecoleId);
      if (!ecole) continue;

      const contact = await findContactEmail(ctx, abo.ecoleId);

      impayes.push({
        abonnementId: abo._id,
        ecoleId: abo.ecoleId,
        ecoleNom: ecole.nom,
        ecoleCode: ecole.code ?? "",
        statut: abo.statut,
        formule: abo.formule,
        montantMensuel: abo.montantMensuel,
        prochaineEcheance: abo.prochaineEcheance,
        joursRetard,
        delaiGraceJours: abo.delaiGraceJours,
        contactNom: contact?.nom ?? null,
        contactEmail: contact?.email ?? null,
      });
    }

    impayes.sort((a, b) => b.joursRetard - a.joursRetard);

    const total = impayes.length;
    const montantTotal = impayes.reduce(
      (s, i) => s + (i.montantMensuel || 0),
      0
    );
    const enGrace = impayes.filter((i) => i.statut === "grace").length;
    const expire = impayes.filter((i) => i.statut === "expire").length;
    const suspendu = impayes.filter((i) => i.statut === "suspendu").length;
    const sansContact = impayes.filter((i) => !i.contactEmail).length;
    const critiques = impayes.filter((i) => i.joursRetard > 30).length;

    return {
      impayes,
      stats: {
        total,
        montantTotal,
        enGrace,
        expire,
        suspendu,
        sansContact,
        critiques,
      },
    };
  },
});

export const getHistoriqueRelances = query({
  args: {
    userId: v.id("users"),
    abonnementId: v.id("abonnements"),
  },
  handler: async (ctx, args) => {
    // ✨ Permission granulaire : impayes.read
    await requireGranularPermission(ctx, args.userId, "impayes.read");

    const relances = await ctx.db
      .query("relancesAbonnement")
      .withIndex("by_abonnementId", (q) =>
        q.eq("abonnementId", args.abonnementId)
      )
      .order("desc")
      .take(100);

    return relances.map((r) => ({
      _id: r._id,
      template: r.template,
      destinataireEmail: r.destinataireEmail,
      destinataireNom: r.destinataireNom,
      envoyeParNom: r.envoyeParNom,
      dateEnvoi: r.dateEnvoi,
      statut: r.statut,
      joursRetardAuMoment: r.joursRetardAuMoment,
      montantDuAuMoment: r.montantDuAuMoment,
    }));
  },
});

export const getDernieresRelances = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // ✨ Permission granulaire : impayes.read
    await requireGranularPermission(ctx, args.userId, "impayes.read");

    const relances = await ctx.db
      .query("relancesAbonnement")
      .order("desc")
      .take(1000);

    const map = new Map<string, { dateEnvoi: string; template: string }>();
    for (const r of relances) {
      if (!map.has(r.abonnementId)) {
        map.set(r.abonnementId, {
          dateEnvoi: r.dateEnvoi,
          template: r.template,
        });
      }
    }

    return Array.from(map.entries()).map(([abonnementId, data]) => ({
      abonnementId,
      dateEnvoi: data.dateEnvoi,
      template: data.template,
    }));
  },
});

// ════════════════════════════════════════════════════════════════════
// MUTATIONS — Abonnements (write)
// ════════════════════════════════════════════════════════════════════

export const creerPourEcole = mutation({
  args: {
    ecoleId: v.id("ecoles"),
    userId: v.id("users"),
    dateDebut: v.string(),
    dateFin: v.string(),
    delaiGraceJours: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // ✨ Permission granulaire : abonnements.write
    await requireGranularPermission(ctx, args.userId, "abonnements.write");

    const existant = await ctx.db
      .query("abonnements")
      .withIndex("by_ecoleId", (q) => q.eq("ecoleId", args.ecoleId))
      .first();

    if (existant) {
      throw new Error("Un abonnement existe déjà pour cette école.");
    }

    const nbUsers = await compterUtilisateurs(ctx, args.ecoleId);
    const { formule, montant } = calculerFormule(nbUsers);

    const maintenant = new Date().toISOString();

    const abonnementId = await ctx.db.insert("abonnements", {
      ecoleId: args.ecoleId,
      statut: "actif",
      formule,
      nombreUtilisateurs: nbUsers,
      montantMensuel: montant,
      dateDebut: args.dateDebut,
      dateExpiration: args.dateFin,
      prochaineEcheance: ajouterJours(args.dateDebut, 30),
      delaiGraceJours: args.delaiGraceJours ?? DELAI_GRACE_DEFAUT,
      createdAt: maintenant,
      updatedAt: maintenant,
    });

    await ctx.db.insert("audit", {
      userId: args.userId,
      action: "create_abonnement",
      table: "abonnements",
      documentId: abonnementId,
      date: maintenant,
      ecoleId: args.ecoleId,
      details: `Création abonnement — ${formule} — ${montant} USD/mois`,
    });

    return { success: true, abonnementId };
  },
});

export const enregistrerPaiement = mutation({
  args: {
    abonnementId: v.id("abonnements"),
    montant: v.number(),
    devise: v.union(v.literal("USD"), v.literal("CDF")),
    methodePaiement: v.optional(v.string()),
    reference: v.optional(v.string()),
    periodeDebut: v.string(),
    periodeFin: v.string(),
    userId: v.id("users"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // ✨ Permission granulaire : abonnements.write
    await requireGranularPermission(ctx, args.userId, "abonnements.write");

    const abonnement = await ctx.db.get(args.abonnementId);
    if (!abonnement) throw new Error("Abonnement introuvable");

    const maintenant = new Date().toISOString();

    await ctx.db.insert("paiementsAbonnement", {
      ecoleId: abonnement.ecoleId,
      abonnementId: args.abonnementId,
      montant: args.montant,
      devise: args.devise,
      datePaiement: maintenant,
      methodePaiement: args.methodePaiement,
      reference: args.reference,
      periodeDebut: args.periodeDebut,
      periodeFin: args.periodeFin,
      enregistrePar: args.userId,
      notes: args.notes,
      createdAt: maintenant,
    });

    const nbUsers = await compterUtilisateurs(ctx, abonnement.ecoleId);
    const { formule, montant } = calculerFormule(nbUsers);
    const prochaineEcheance = ajouterJours(maintenant, 30);

    await ctx.db.patch(args.abonnementId, {
      statut: "actif",
      formule,
      nombreUtilisateurs: nbUsers,
      montantMensuel: montant,
      prochaineEcheance,
      dernierPaiementDate: maintenant,
      dernierPaiementMontant: args.montant,
      updatedAt: maintenant,
    });

    await ctx.db.insert("audit", {
      userId: args.userId,
      action: "abonnement_paiement",
      table: "abonnements",
      documentId: args.abonnementId,
      date: maintenant,
      ecoleId: abonnement.ecoleId,
      details: `Paiement ${args.montant} ${args.devise} — prochaine échéance ${prochaineEcheance.slice(0, 10)}`,
    });

    return {
      success: true,
      nouvelleFormule: formule,
      nouveauMontant: montant,
      prochaineEcheance,
    };
  },
});

export const recalculerFormule = mutation({
  args: {
    abonnementId: v.id("abonnements"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // ✨ Permission granulaire : abonnements.write
    await requireGranularPermission(ctx, args.userId, "abonnements.write");

    const abonnement = await ctx.db.get(args.abonnementId);
    if (!abonnement) throw new Error("Abonnement introuvable");

    const nbUsers = await compterUtilisateurs(ctx, abonnement.ecoleId);
    const { formule, montant } = calculerFormule(nbUsers);

    await ctx.db.patch(args.abonnementId, {
      formule,
      nombreUtilisateurs: nbUsers,
      montantMensuel: montant,
      updatedAt: new Date().toISOString(),
    });

    return { success: true, formule, montant, nbUsers };
  },
});

export const suspendre = mutation({
  args: {
    abonnementId: v.id("abonnements"),
    raison: v.optional(v.string()),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // ✨ Permission granulaire : abonnements.write
    await requireGranularPermission(ctx, args.userId, "abonnements.write");

    const ab = await ctx.db.get(args.abonnementId);
    if (!ab) throw new Error("Abonnement introuvable");

    await ctx.db.patch(args.abonnementId, {
      statut: "suspendu",
      notes: args.raison ?? ab.notes,
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  },
});

export const reactiver = mutation({
  args: {
    abonnementId: v.id("abonnements"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // ✨ Permission granulaire : abonnements.write
    await requireGranularPermission(ctx, args.userId, "abonnements.write");

    const ab = await ctx.db.get(args.abonnementId);
    if (!ab) throw new Error("Abonnement introuvable");

    await ctx.db.patch(args.abonnementId, {
      statut: "actif",
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  },
});

// ════════════════════════════════════════════════════════════════════
// MUTATIONS — Impayés (write)
// ════════════════════════════════════════════════════════════════════

async function buildRelanceInfo(ctx: AnyCtx, abo: Doc<"abonnements">) {
  const ecole = await ctx.db.get(abo.ecoleId);
  if (!ecole) return null;

  const contact = await findContactEmail(ctx, abo.ecoleId);
  if (!contact?.email) return null;

  const now = Date.now();
  const echeanceMs = toTimestamp(abo.prochaineEcheance);
  const joursRetard =
    echeanceMs > 0 && echeanceMs < now
      ? Math.floor((now - echeanceMs) / MS_JOUR)
      : 0;

  return { ecole, contact, joursRetard };
}

export const relancerImpaye = mutation({
  args: {
    userId: v.id("users"),
    abonnementId: v.id("abonnements"),
    template: v.union(
      v.literal("amiable"),
      v.literal("ferme"),
      v.literal("mise_en_demeure")
    ),
  },
  handler: async (ctx, args) => {
    // ✨ Permission granulaire : impayes.write
    const owner = await requireGranularPermission(
      ctx,
      args.userId,
      "impayes.write"
    );

    const abo = await ctx.db.get(args.abonnementId);
    if (!abo) throw new Error("Abonnement introuvable");

    const info = await buildRelanceInfo(ctx, abo);
    if (!info) {
      throw new Error(
        "Aucun contact email trouvé. Ajoutez un email à un admin de cette école."
      );
    }

    const { ecole, contact, joursRetard } = info;
    const now = new Date().toISOString();

    await ctx.scheduler.runAfter(0, internal.emails.sendRelanceAbonnement, {
      to: contact.email,
      ecoleNom: ecole.nom,
      montant: abo.montantMensuel,
      prochaineEcheance: abo.prochaineEcheance,
      joursRetard,
      statut: abo.statut,
      template: args.template,
    });

    await ctx.db.insert("relancesAbonnement", {
      abonnementId: args.abonnementId,
      ecoleId: abo.ecoleId,
      template: args.template,
      destinataireEmail: contact.email,
      destinataireNom: contact.nom,
      envoyePar: args.userId,
      envoyeParNom: owner.nom ?? "Super Admin",
      dateEnvoi: now,
      statut: "envoye",
      joursRetardAuMoment: joursRetard,
      montantDuAuMoment: abo.montantMensuel,
    });

    await ctx.db.insert("audit", {
      userId: args.userId,
      action: "relance_abonnement",
      table: "abonnements",
      documentId: args.abonnementId,
      date: now,
      ecoleId: abo.ecoleId,
      details: `Relance ${args.template} envoyée à ${contact.email} (${joursRetard}j retard)`,
    });

    return { success: true, sentTo: contact.email, contactNom: contact.nom };
  },
});

export const relancerImpayeGroup = mutation({
  args: {
    userId: v.id("users"),
    abonnementIds: v.array(v.id("abonnements")),
    template: v.union(
      v.literal("amiable"),
      v.literal("ferme"),
      v.literal("mise_en_demeure")
    ),
  },
  handler: async (ctx, args) => {
    // ✨ Permission granulaire : impayes.write
    const owner = await requireGranularPermission(
      ctx,
      args.userId,
      "impayes.write"
    );

    if (args.abonnementIds.length === 0) {
      throw new Error("Aucun abonnement sélectionné.");
    }
    if (args.abonnementIds.length > 50) {
      throw new Error("Maximum 50 relances par batch.");
    }

    const now = new Date().toISOString();
    let success = 0;
    let failed = 0;
    let sansContact = 0;
    const failedDetails: Array<{ ecole: string; raison: string }> = [];

    for (const aboId of args.abonnementIds) {
      const abo = await ctx.db.get(aboId);
      if (!abo) {
        failed++;
        continue;
      }

      const info = await buildRelanceInfo(ctx, abo);
      if (!info) {
        sansContact++;
        continue;
      }

      const { ecole, contact, joursRetard } = info;

      try {
        await ctx.scheduler.runAfter(
          0,
          internal.emails.sendRelanceAbonnement,
          {
            to: contact.email,
            ecoleNom: ecole.nom,
            montant: abo.montantMensuel,
            prochaineEcheance: abo.prochaineEcheance,
            joursRetard,
            statut: abo.statut,
            template: args.template,
          }
        );

        await ctx.db.insert("relancesAbonnement", {
          abonnementId: aboId,
          ecoleId: abo.ecoleId,
          template: args.template,
          destinataireEmail: contact.email,
          destinataireNom: contact.nom,
          envoyePar: args.userId,
          envoyeParNom: owner.nom ?? "Super Admin",
          dateEnvoi: now,
          statut: "envoye",
          joursRetardAuMoment: joursRetard,
          montantDuAuMoment: abo.montantMensuel,
        });

        success++;
      } catch (err: any) {
        failed++;
        failedDetails.push({
          ecole: ecole.nom,
          raison: err?.message ?? "erreur inconnue",
        });
      }
    }

    await ctx.db.insert("audit", {
      userId: args.userId,
      action: "relance_groupee",
      table: "abonnements",
      documentId: "group",
      date: now,
      ecoleId: undefined,
      details: `Relance groupée "${args.template}" — ${success} succès, ${failed} échecs, ${sansContact} sans contact`,
    });

    return {
      success: true,
      total: args.abonnementIds.length,
      sent: success,
      failed,
      sansContact,
      failedDetails,
    };
  },
});

export const marquerPaye = mutation({
  args: {
    userId: v.id("users"),
    abonnementId: v.id("abonnements"),
    montant: v.number(),
    methodePaiement: v.optional(v.string()),
    reference: v.optional(v.string()),
    notes: v.optional(v.string()),
    dureeMois: v.optional(v.number()),
    envoyerConfirmation: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // ✨ Permission granulaire : impayes.write
    await requireGranularPermission(ctx, args.userId, "impayes.write");

    if (args.montant <= 0) {
      throw new Error("Le montant doit être supérieur à 0.");
    }

    const abo = await ctx.db.get(args.abonnementId);
    if (!abo) throw new Error("Abonnement introuvable");

    const dureeMois = Math.max(args.dureeMois ?? 1, 1);
    if (dureeMois > 24) {
      throw new Error("Durée maximum : 24 mois.");
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const fin = new Date(now);
    fin.setMonth(fin.getMonth() + dureeMois);
    const finIso = fin.toISOString();

    await ctx.db.insert("paiementsAbonnement", {
      ecoleId: abo.ecoleId,
      abonnementId: abo._id,
      montant: args.montant,
      devise: "USD",
      datePaiement: nowIso,
      methodePaiement: args.methodePaiement,
      reference: args.reference,
      periodeDebut: nowIso,
      periodeFin: finIso,
      enregistrePar: args.userId,
      notes: args.notes,
      createdAt: nowIso,
    });

    await ctx.db.patch(args.abonnementId, {
      statut: "actif",
      prochaineEcheance: finIso,
      dateExpiration: finIso,
      dernierPaiementDate: nowIso,
      dernierPaiementMontant: args.montant,
      updatedAt: nowIso,
    });

    await ctx.db.insert("audit", {
      userId: args.userId,
      action: "marquer_paye",
      table: "abonnements",
      documentId: args.abonnementId,
      date: nowIso,
      ecoleId: abo.ecoleId,
      details: `Paiement enregistré : ${args.montant} USD (${dureeMois} mois, méthode: ${
        args.methodePaiement ?? "—"
      })`,
    });

    if (args.envoyerConfirmation !== false) {
      const ecole = await ctx.db.get(abo.ecoleId);
      const contact = await findContactEmail(ctx, abo.ecoleId);
      if (contact?.email && ecole) {
        await ctx.scheduler.runAfter(
          0,
          internal.emails.sendConfirmationPaiement,
          {
            to: contact.email,
            ecoleNom: ecole.nom,
            montant: args.montant,
            nouvelleEcheance: finIso,
          }
        );
      }
    }

    return { success: true, nouvelleEcheance: finIso };
  },
});

// ════════════════════════════════════════════════════════════════════
// TÂCHE AUTOMATIQUE — Cron (pas de permission)
// ════════════════════════════════════════════════════════════════════
export const verifierEcheances = internalMutation({
  args: {},
  handler: async (ctx) => {
    const abonnements = await ctx.db.query("abonnements").take(ECOLES_MAX);
    const maintenant = new Date().toISOString();
    const resultats = {
      rappels: 0,
      misesEnGrace: 0,
      suspensions: 0,
      expires: 0,
    };

    for (const ab of abonnements) {
      if (ab.statut === "actif" && ab.prochaineEcheance < maintenant) {
        await ctx.db.patch(ab._id, {
          statut: "grace",
          updatedAt: maintenant,
        });
        resultats.misesEnGrace++;
        continue;
      }

      if (ab.statut === "grace") {
        const dateGraceFin = ajouterJours(
          ab.prochaineEcheance,
          ab.delaiGraceJours
        );
        if (dateGraceFin < maintenant) {
          await ctx.db.patch(ab._id, {
            statut: "suspendu",
            updatedAt: maintenant,
          });
          resultats.suspensions++;
        }
        continue;
      }

      if (ab.dateExpiration < maintenant && ab.statut !== "expire") {
        await ctx.db.patch(ab._id, {
          statut: "expire",
          updatedAt: maintenant,
        });
        resultats.expires++;
      }
    }

    return resultats;
  },
});