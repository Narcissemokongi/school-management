import { createContext, useContext, useState, useEffect, useCallback } from "react";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  // Fonction pour lire le thème initial
  const getInitialTheme = () => {
    try {
      const saved = localStorage.getItem("edu_dark_mode");
      if (saved !== null) {
        return JSON.parse(saved);
      }
      // Si pas de préférence enregistrée, on suit le système
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    } catch {
      return false;
    }
  };

  const [dark, setDark] = useState(getInitialTheme);
  const [isSystemTheme, setIsSystemTheme] = useState(() => {
    try {
      return localStorage.getItem("edu_dark_mode") === null;
    } catch {
      return true;
    }
  });

  // Écoute des changements du thème système
  useEffect(() => {
    if (!isSystemTheme) return; // on ne suit pas le système si l'utilisateur a choisi

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e) => {
      setDark(e.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [isSystemTheme]);

  // Applique le thème au document
  useEffect(() => {
    try {
      localStorage.setItem("edu_dark_mode", JSON.stringify(dark));
    } catch (err) {
      console.warn("Impossible d'écrire dans localStorage", err);
    }

    const root = document.documentElement;
    if (dark) {
      root.classList.add("dark");
      root.style.colorScheme = "dark";
    } else {
      root.classList.remove("dark");
      root.style.colorScheme = "light";
    }

    // Ajoute une classe temporaire pour permettre les transitions CSS
    root.classList.add("theme-transition");
    document.body.style.backgroundColor = dark ? "#0F172A" : "#F8FAFC";
    document.body.style.color = dark ? "#F1F5F9" : "#1E293B";

    // Retire la classe après un court délai pour éviter les conflits de transition
    const timeout = setTimeout(() => {
      root.classList.remove("theme-transition");
    }, 300);

    return () => clearTimeout(timeout);
  }, [dark]);

  // Fonction pour basculer le thème (l'utilisateur force un choix)
  const toggle = useCallback(() => {
    setDark((prev) => !prev);
    setIsSystemTheme(false); // l'utilisateur a maintenant une préférence explicite
  }, []);

  // Fonction pour réinitialiser et suivre le thème système
  const resetToSystemTheme = useCallback(() => {
    try {
      localStorage.removeItem("edu_dark_mode");
      setIsSystemTheme(true);
      setDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
    } catch (err) {
      console.warn("Impossible de réinitialiser le thème système", err);
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ dark, toggle, setDark, isSystemTheme, resetToSystemTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}