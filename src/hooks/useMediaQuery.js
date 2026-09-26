// src/hooks/useMediaQuery.js
import { useState, useEffect } from "react";

export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const media = window.matchMedia(query);
    setMatches(media.matches);
    const handler = (e) => setMatches(e.matches);
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

export function useIsMobileBreakpoint() {
  return useMediaQuery("(max-width: 767px)");
}

export function useIsTabletBreakpoint() {
  return useMediaQuery("(min-width: 768px) and (max-width: 1024px)");
}

export function useIsDesktopBreakpoint() {
  return useMediaQuery("(min-width: 1025px)");
}

export default useMediaQuery;