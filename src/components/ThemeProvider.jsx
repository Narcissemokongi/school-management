import { createContext, useContext, useState, useEffect, useCallback } from "react";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => {
    try {
      const saved = localStorage.getItem("edu_dark_mode");
      if (saved !== null) return JSON.parse(saved);
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    } catch {
      return false;
    }
  });

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

    document.body.style.transition = "background-color 0.3s, color 0.3s";
    document.body.style.backgroundColor = dark ? "#0F172A" : "#F8FAFC";
    document.body.style.color = dark ? "#F1F5F9" : "#1E293B";
  }, [dark]);

  const toggle = useCallback(() => setDark((prev) => !prev), []);

  return (
    <ThemeContext.Provider value={{ dark, toggle, setDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}