import { internalMutation } from "./_generated/server";
import { hashPassword } from "./utils/crypto";

/**
 * ⚠️ ATTENTION : ce seed SUPPRIME toutes les données existantes
 * (users, fautes, ecoles) puis recrée un jeu de démo.
 *
 * À utiliser UNIQUEMENT en développement.
 */
export default internalMutation(async (ctx) => {
  // ─────────────────────────────────────────────────────────────
  // 1. Nettoyage (avec `.take()` pour éviter les timeouts)
  // ─────────────────────────────────────────────────────────────
  const MAX_DELETE = 1000;

  const oldUsers = await ctx.db.query("users").take(MAX_DELETE);
  for (const u of oldUsers) {
    await ctx.db.delete(u._id);
  }

  const oldFautes = await ctx.db.query("fautes").take(MAX_DELETE);
  for (const f of oldFautes) {
    await ctx.db.delete(f._id);
  }

  // ⚠️ Supprimer aussi les autres dépendances avant les écoles
  const tablesToClean = [
    "inscriptions",
    "classes",
    "cours",
    "notes",
    "absences",
    "punitions",
    "sanctions",
    "frais",
    "fraisClasses",
    "anneesScolaires",
    "emploiDuTemps",
    "examens",
    "messages",
    "appels",
    "audit",
  ];
  for (const table of tablesToClean) {
    const records = await ctx.db.query(table as any).take(MAX_DELETE);
    for (const r of records) {
      await ctx.db.delete(r._id);
    }
  }

  const oldEcoles = await ctx.db.query("ecoles").take(MAX_DELETE);
  for (const e of oldEcoles) {
    await ctx.db.delete(e._id);
  }

  // ─────────────────────────────────────────────────────────────
  // 2. Nouvelles écoles
  // ─────────────────────────────────────────────────────────────
  const ecole1 = await ctx.db.insert("ecoles", {
    nom: "École Alpha",
    code: "ALPHA1",
    userCount: 0,
    statut: "active",
  });
  const ecole2 = await ctx.db.insert("ecoles", {
    nom: "École Beta",
    code: "BETA2",
    userCount: 0,
    statut: "active",
  });

  // ─────────────────────────────────────────────────────────────
  // 3. Types de fautes par défaut
  // ─────────────────────────────────────────────────────────────
  const fautesDefaut = [
    { libelle: "Retard", gravite: "Légère" },
    { libelle: "Insolence", gravite: "Moyenne" },
    { libelle: "Bagarre", gravite: "Grave" },
    { libelle: "Triche", gravite: "Moyenne" },
    { libelle: "Absentéisme", gravite: "Grave" },
    { libelle: "Vandalisme", gravite: "Grave" },
    { libelle: "Téléphone en classe", gravite: "Légère" },
    { libelle: "Tenue incorrecte", gravite: "Légère" },
  ] as const;

  for (const f of fautesDefaut) {
    await ctx.db.insert("fautes", { ...f, ecoleId: ecole1 });
    await ctx.db.insert("fautes", { ...f, ecoleId: ecole2 });
  }

  // ─────────────────────────────────────────────────────────────
  // 4. Utilisateurs démo
  // 🟢 FIX : mot de passe fort (respecte validatePasswordStrength)
  // ─────────────────────────────────────────────────────────────
  const DEMO_PASSWORD = "Demo1234"; // 8 car, maj, min, chiffre

  const usersAvecEcole = [
    { nom: "Prof. Kazadi", login: "disc1", role: "disciplinaire", ecoleId: ecole1 },
    { nom: "Dir. Mwamba", login: "dir1", role: "directeur", ecoleId: ecole1 },
    { nom: "Admin Alpha", login: "admin1", role: "admin", ecoleId: ecole1 },
    { nom: "Prof. Ngoie", login: "disc2", role: "disciplinaire", ecoleId: ecole2 },
    { nom: "Dir. Tshibangu", login: "dir2", role: "directeur", ecoleId: ecole2 },
    { nom: "Admin Beta", login: "admin2", role: "admin", ecoleId: ecole2 },
  ] as const;

  // 🟢 FIX : hacher une seule fois (même mot de passe pour tous)
  const hashedPassword = await hashPassword(DEMO_PASSWORD);

  for (const u of usersAvecEcole) {
    await ctx.db.insert("users", {
      nom: u.nom,
      login: u.login,
      password: hashedPassword,
      role: u.role,
      ecoleId: u.ecoleId,
      status: "active",
      loginAttempts: 0,
    });

    const ecole = await ctx.db.get(u.ecoleId);
    if (ecole) {
      await ctx.db.patch(u.ecoleId, {
        userCount: (ecole.userCount ?? 0) + 1,
      });
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 5. Super Admin (sans ecoleId → reconnu comme superAdmin principal)
  // ─────────────────────────────────────────────────────────────
  await ctx.db.insert("users", {
    nom: "Super Admin",
    login: "root",
    password: hashedPassword,
    role: "admin",
    status: "active",
    loginAttempts: 0,
  });

  return {
    success: true,
    message: "Seed effectué. Login: root / Demo1234 (ou disc1, dir1, admin1, etc.)",
  };
});