export function userFriendlyError(error) {
  const msg = error?.message || String(error);
  if (msg.includes("Accès refusé : rôle insuffisant")) return "Vous n’avez pas les permissions nécessaires pour effectuer cette action.";
  if (msg.includes("Authentification requise")) return "Vous devez être connecté pour effectuer cette action.";
  if (msg.includes("Ce login existe déjà")) return "Cet identifiant est déjà utilisé.";
  if (msg.includes("Appel introuvable")) return "L’appel n’existe plus ou a déjà été terminé.";
  if (msg.includes("Aucun parent trouvé")) return "Aucun parent n’est enregistré dans cette école.";
  if (msg.includes("Aucun élève trouvé")) return "Aucun élève trouvé dans cette classe.";
  if (msg.includes("ancien mot de passe incorrect")) return "L’ancien mot de passe est incorrect.";
  // Ajouter d’autres correspondances selon vos besoins
    return msg; // fallback : message original
} 
  if (msg.includes("Compte temporairement verrouillé")) 
    return "Compte temporairement verrouillé. Veuillez réessayer dans 15 minutes.";