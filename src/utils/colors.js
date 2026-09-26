// src/utils/colors.js

/**
 * Convertit une couleur hex en rgba.
 * Accepte #RGB, #RRGGBB (avec ou sans #).
 * Retourne une couleur de fallback si le format est invalide.
 *
 * @param {string} hex - Couleur hex (#FFF, #FFFFFF, FFFFFF)
 * @param {number} alpha - Opacité [0..1]
 * @returns {string} - Couleur rgba(...)
 */
export function hexToRgba(hex, alpha = 1) {
  if (!hex || typeof hex !== "string") {
    return `rgba(0, 0, 0, ${alpha})`;
  }

  let clean = hex.replace(/^#/, "");

  // #FFF → #FFFFFF
  if (clean.length === 3) {
    clean = clean
      .split("")
      .map((c) => c + c)
      .join("");
  }

  if (!/^[0-9A-F]{6}$/i.test(clean)) {
    return `rgba(0, 0, 0, ${alpha})`;
  }

  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}