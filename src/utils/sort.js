export function trierClasses(a, b) {
  const extraire = (s) => {
    const match = s.match(/(\d+)(?:\s*(ème|er|e))?\s*([A-Za-z]*)/);
    if (!match) return { niveau: 0, lettre: '' };
    const niveau = parseInt(match[1], 10);
    const lettre = match[3] || '';
    return { niveau, lettre };
  };
  const ca = extraire(a);
  const cb = extraire(b);
  if (ca.niveau !== cb.niveau) return ca.niveau - cb.niveau;
  return ca.lettre.localeCompare(cb.lettre);
}