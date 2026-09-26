// src/hooks/useMediaQuery.js
// ════════════════════════════════════════════════════════════════════
// HOOK — useMediaQuery
//
// Écoute une media query CSS et retourne true/false en temps réel.
// Compatible Safari ancien (fallback addListener).
//
// Utilisation :
//   const isDesktop = useMediaQuery("(min-width: 1025px)");
//   const isTablet = useMediaQuery("(min-width: 769px) and (max-width: 1024px)");
//   const prefersDark = useMediaQuery("(prefers-color-scheme: dark)");
// ════════════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";

/**
 * @param {string} query - Media query CSS (ex: "(min-width: 768px)")
 * @returns {boolean} true si la query match, false sinon
 */
export function useMediaQuery(query) {
  // ✅ Init synchrone pour éviter un premier render incorrect
  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const media = window.matchMedia(query);

    // Sync immédiate (au cas où la query aurait changé)
    setMatches(media.matches);

    const handler = (e) => setMatches(e.matches);

    // ✅ Fallback pour Safari < 14 (addListener deprecated)
    if (media.addEventListener) {
      media.addEventListener("change", handler);
      return () => media.removeEventListener("change", handler);
    } else if (media.addListener) {
      media.addListener(handler);
      return () => media.removeListener(handler);
    }
  }, [query]);

  return matches;
}

// ────────────────────────────────────────────────────────────────
// HOOKS PRÉDÉFINIS (raccourcis pratiques)
// ────────────────────────────────────────────────────────────────

/** Mobile : < 768px */
export function useIsMobileBreakpoint() {
  return useMediaQuery("(max-width: 767px)");
}

/** Tablette : 768px – 1024px */
export function useIsTabletBreakpoint() {
  return useMediaQuery("(min-width: 768px) and (max-width: 1024px)");
}

/** Desktop : > 1024px */
export function useIsDesktopBreakpoint() {
  return useMediaQuery("(min-width: 1025px)");
}

/** Préférence système : mode sombre */
export function usePrefersDarkMode() {
  return useMediaQuery("(prefers-color-scheme: dark)");
}

/** Préférence système : animations réduites */
export function usePrefersReducedMotion() {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}

export default useMediaQuery;