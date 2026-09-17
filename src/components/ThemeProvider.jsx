// src/components/ThemeProvider.jsx
import {
  createContext, useContext, useState, useEffect,
  useCallback, useMemo,
} from "react";

const ThemeContext = createContext(null);

const STORAGE_KEY = "edu_dark_mode";

// ✅ FIX #3 — media query partagée
const getDarkMediaQuery = () =>
  typeof window !== "undefined" && window.matchMedia
    ? window.matchMedia("(prefers-color-scheme: dark)")
    : null;

// ✅ FIX #4 — lecture localStorage safe (SSR + privacy mode)
function readSavedTheme() {
  try {
    if (typeof window === "undefined") return null;
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved !== null ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

function readSystemPrefersDark() {
  const mq = getDarkMediaQuery();
  return mq ? mq.matches : false;
}

export function ThemeProvider({ children }) {
  // Initialisation cohérente : un seul calcul pour dark + isSystemTheme
  const [initialState] = useState(() => {
    const saved = readSavedTheme();
    const isSystem = saved === null;
    return {
      dark: isSystem ? readSystemPrefersDark() : saved,
      isSystemTheme: isSystem,
    };
  });

  const [dark, setDark] = useState(initialState.dark);
  const [isSystemTheme, setIsSystemTheme] = useState(initialState.isSystemTheme);

  // Écoute des changements système (uniquement si l'utilisateur suit le système)
  useEffect(() => {
    if (!isSystemTheme) return;
    const mq = getDarkMediaQuery();
    if (!mq) return;

    const handleChange = (e) => setDark(e.matches);
    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, [isSystemTheme]);

  // Applique le thème au document
  useEffect(() => {
    // ✅ FIX #1 + #2 — ne persiste QUE si l'utilisateur a un choix explicite
    if (!isSystemTheme) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dark));
      } catch (err) {
        console.warn("Impossible d'écrire dans localStorage", err);
      }
    }

    const root = document.documentElement;
    root.classList.toggle("dark", dark);
    root.style.colorScheme = dark ? "dark" : "light";
    document.body.style.backgroundColor = dark ? "#0F172A" : "#F8FAFC";
    document.body.style.color = dark ? "#F1F5F9" : "#1E293B";

    // ✅ FIX #7 — transition seulement si reduced-motion non demandé
    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    root.classList.add("theme-transition");
    const timeout = setTimeout(() => {
      root.classList.remove("theme-transition");
    }, 300);

    return () => clearTimeout(timeout);
  }, [dark, isSystemTheme]);   // ✅ ajout de isSystemTheme en dep

  // ✅ FIX #5 — toggle marque bien le choix explicite
  const toggle = useCallback(() => {
    setDark((prev) => !prev);
    setIsSystemTheme(false);
  }, []);

  // ✅ FIX #5 — wrapper setDark qui désactive le suivi système
  const setExplicitDark = useCallback((value) => {
    setDark(value);
    setIsSystemTheme(false);
  }, []);

  const resetToSystemTheme = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.warn("Impossible de réinitialiser le thème système", err);
    }
    setIsSystemTheme(true);
    setDark(readSystemPrefersDark());
  }, []);

  // ✅ FIX #6 — value mémoïsée
  const value = useMemo(
    () => ({
      dark,
      toggle,
      setDark: setExplicitDark,   // ✅ désormais un choix explicite
      isSystemTheme,
      resetToSystemTheme,
    }),
    [dark, toggle, setExplicitDark, isSystemTheme, resetToSystemTheme]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}