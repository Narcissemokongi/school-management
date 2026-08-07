import { internalMutation } from "./_generated/server";
import { hashPassword } from "./utils/crypto";

export default internalMutation(async (ctx) => {
  // Nettoyer les anciens utilisateurs
  const oldUsers = await ctx.db.query("users").collect();
  for (const u of oldUsers) {
    await ctx.db.delete(u._id);
  }

  // Créer les écoles
  const ecole1 = await ctx.db.insert("ecoles", { nom: "École Alpha" });
  const ecole2 = await ctx.db.insert("ecoles", { nom: "École Beta" });

  // Types de fautes par défaut
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

  // Utilisateurs avec ecoleId (tous sauf Super Admin)
  const usersAvecEcole = [
    { nom: "Prof. Kazadi", login: "disc1", password: "1234", role: "disciplinaire", ecoleId: ecole1 },
    { nom: "Dir. Mwamba", login: "dir1", password: "1234", role: "directeur", ecoleId: ecole1 },
    { nom: "Admin Alpha", login: "admin1", password: "1234", role: "admin", ecoleId: ecole1 },
    { nom: "Prof. Ngoie", login: "disc2", password: "1234", role: "disciplinaire", ecoleId: ecole2 },
    { nom: "Dir. Tshibangu", login: "dir2", password: "1234", role: "directeur", ecoleId: ecole2 },
    { nom: "Admin Beta", login: "admin2", password: "1234", role: "admin", ecoleId: ecole2 },
  ] as const;

  for (const u of usersAvecEcole) {
    const hashed = await hashPassword(u.password);
    await ctx.db.insert("users", {
      nom: u.nom,
      login: u.login,
      password: hashed,
      role: u.role,
      ecoleId: u.ecoleId,
    });
  }

  // Super Admin (sans ecoleId)
  const superAdmin = { nom: "Super Admin", login: "root", password: "1234", role: "admin" as const };
  const hashedRoot = await hashPassword(superAdmin.password);
  await ctx.db.insert("users", {
    nom: superAdmin.nom,
    login: superAdmin.login,
    password: hashedRoot,
    role: superAdmin.role,
  });
});