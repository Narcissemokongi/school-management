import { internalMutation } from "./_generated/server";
import { hashPassword } from "./utils/crypto"; // adaptez le chemin selon votre structure

export default internalMutation(async (ctx) => {
  // --- Nettoyage des anciennes données ---
  // Supprimer d'abord les utilisateurs
  const oldUsers = await ctx.db.query("users").collect();
  for (const u of oldUsers) {
    await ctx.db.delete(u._id);
  }

  // Supprimer les fautes liées aux écoles
  const oldFautes = await ctx.db.query("fautes").collect();
  for (const f of oldFautes) {
    await ctx.db.delete(f._id);
  }

  // Supprimer les écoles (après avoir nettoyé les dépendances)
  const oldEcoles = await ctx.db.query("ecoles").collect();
  for (const e of oldEcoles) {
    await ctx.db.delete(e._id);
  }

  // --- Création des nouvelles écoles ---
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

  // --- Types de fautes par défaut ---
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

  // --- Utilisateurs avec école ---
  const usersAvecEcole = [
    { nom: "Prof. Kazadi", login: "disc1", password: "1234", role: "disciplinaire", ecoleId: ecole1 },
    { nom: "Dir. Mwamba", login: "dir1", password: "1234", role: "directeur", ecoleId: ecole1 },
    { nom: "Admin Alpha", login: "admin1", password: "1234", role: "admin", ecoleId: ecole1 },
    { nom: "Prof. Ngoie", login: "disc2", password: "1234", role: "disciplinaire", ecoleId: ecole2 },
    { nom: "Dir. Tshibangu", login: "dir2", password: "1234", role: "directeur", ecoleId: ecole2 },
    { nom: "Admin Beta", login: "admin2", password: "1234", role: "admin", ecoleId: ecole2 },
  ] as const;

  for (const u of usersAvecEcole) {
    // ✅ Hacher le mot de passe avant insertion
    const hashedPassword = await hashPassword(u.password);

    await ctx.db.insert("users", {
      nom: u.nom,
      login: u.login,
      password: hashedPassword, // stockage du hash
      role: u.role,
      ecoleId: u.ecoleId,
      status: "active",
      loginAttempts: 0,
    });

    // Mettre à jour le compteur d'utilisateurs de l'école
    const ecole = await ctx.db.get(u.ecoleId);
    if (ecole) {
      await ctx.db.patch(u.ecoleId, { userCount: (ecole.userCount ?? 0) + 1 });
    }
  }

  // --- Super Admin (sans ecoleId) ---
  const superAdminPassword = await hashPassword("1234");
  await ctx.db.insert("users", {
    nom: "Super Admin",
    login: "root",
    password: superAdminPassword,
    role: "admin",
    status: "active",
    loginAttempts: 0,
  });
});