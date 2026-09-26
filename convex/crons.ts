// convex/crons.ts
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

/**
 * 1️⃣ Vérifie les échéances d'abonnement chaque nuit à minuit (UTC).
 * - Active les rappels
 * - Met en grâce les retards
 * - Suspend les impayés après la grâce
 * - Expire les contrats arrivés à terme
 */
crons.daily(
  "verifier-echeances-abonnements",
  { hourUTC: 0, minuteUTC: 0 },
  internal.abonnements.verifierEcheances
);

/**
 * 2️⃣ Expire les annonces dont la date de fin est passée.
 * Passage toutes les heures (minute 15) → les annonces disparaissent
 * de l'UI côté admin école au maximum 1h après leur date de fin.
 */
crons.hourly(
  "expirer-annonces",
  { minuteUTC: 15 },
  internal.annonces.expirerAnnonces
);

/**
 * 3️⃣ ✨ V3 — Régénère les annonces récurrentes expirées.
 *
 * Passage quotidien à 00h30 UTC (après le cron #1 qui tourne à minuit).
 * Pour chaque annonce marquée `recurrence: "hebdo" | "mensuel" | "trimestriel"`
 * dont la `dateFin` est dépassée :
 *   - Crée un clone avec les dates décalées
 *   - Désactive l'original
 *   - S'arrête automatiquement si `recurrenceFin` est atteinte
 */
crons.daily(
  "verifier-recurrences-annonces",
  { hourUTC: 0, minuteUTC: 30 },
  internal.annonces.verifierRecurrences
);

export default crons;