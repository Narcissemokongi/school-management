// convex/crons.ts
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// 1. Échéances abonnements
crons.daily(
  "verifier-echeances-abonnements",
  { hourUTC: 0, minuteUTC: 0 },
  internal.abonnements.verifierEcheances
);

// 2. Expiration annonces
crons.hourly(
  "expirer-annonces",
  { minuteUTC: 15 },
  internal.annonces.expirerAnnonces
);

// 3. Récurrences annonces
crons.daily(
  "verifier-recurrences-annonces",
  { hourUTC: 0, minuteUTC: 30 },
  internal.annonces.verifierRecurrences
);

// 4. ✨ Purge rétention audit
crons.daily(
  "purge-audit-retention",
  { hourUTC: 3, minuteUTC: 0 },
  internal.audit.purgeRetention
);

export default crons;