import { createContext, useContext, useState, useEffect } from "react";
import { getStyles } from "../styles/theme";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => {
    try {
      const saved = localStorage.getItem("edu_dark_mode");
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    // Persister la préférence
    localStorage.setItem("edu_dark_mode", JSON.stringify(dark));

    // Appliquer au body
    document.body.style.transition = "background-color 0.3s, color 0.3s";
    document.body.style.backgroundColor = dark ? "#0F172A" : "#F8FAFC";
    document.body.style.color = dark ? "#F1F5F9" : "#1E293B";
  }, [dark]);

  const toggle = () => setDark((prev) => !prev);

  return (
    <ThemeContext.Provider value={{ dark, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function useStyles() {
  const { dark, toggle } = useTheme();
  const S = getStyles(dark);
  return { S, dark, toggle };
}