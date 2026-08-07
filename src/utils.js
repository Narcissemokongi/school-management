export const getEleve = (eleves, id) => eleves.find((e) => e._id === id);
export const getFaute = (fautes, id) => fautes.find((f) => f._id === id);

export function getPunitionsParClasse(punitions, eleves, classes) {
  const stats = {};
  classes.forEach((c) => (stats[c.nom] = 0));
  punitions.forEach((p) => {
    const el = getEleve(eleves, p.idEleve);
    if (el && classes.some((c) => c.nom === el.classe)) stats[el.classe] = (stats[el.classe] || 0) + 1;
  });
  return stats;
}

export function getTopDerangeurs(punitions, eleves, n = 5) {
  const counts = {};
  punitions.forEach((p) => {
    counts[p.idEleve] = (counts[p.idEleve] || 0) + 1;
  });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([id, count]) => ({ eleve: getEleve(eleves, id), count }))
    .filter((x) => x.eleve);
}