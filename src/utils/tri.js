export function trierEleves(a, b) {
  // Trier par classe en utilisant le tri naturel (les nombres dans les chaînes sont traités comme des nombres)
  const classeCompare = (a.classe || '').localeCompare(b.classe || '', undefined, {
    numeric: true,
    sensitivity: 'base',
  });
  if (classeCompare !== 0) return classeCompare;

  // Trier par nom complet (nom + postnom + prénom) insensible à la casse et aux accents
  const nomCompletA = `${a.nom} ${a.postnom} ${a.prenom || ''}`.toLowerCase().trim();
  const nomCompletB = `${b.nom} ${b.postnom} ${b.prenom || ''}`.toLowerCase().trim();
  return nomCompletA.localeCompare(nomCompletB, 'fr', { sensitivity: 'base' });
}