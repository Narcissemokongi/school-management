import { FileText } from "lucide-react";
import { useTheme } from "./ThemeProvider"; // adaptez le chemin si nécessaire

export function EmptyState({
  icon: Icon = FileText,
  title = "Aucune donnée",
  message = "Il n'y a rien à afficher pour le moment.",
}) {
  // Récupération du thème via le contexte (préféré), avec fallback sur localStorage
  let dark = false;
  try {
    const { dark: themeDark } = useTheme();
    dark = themeDark;
  } catch {
    // fallback si le contexte n'est pas disponible
    dark = localStorage.getItem("theme") === "dark";
  }

  return (
    <div
      style={{
        textAlign: "center",
        padding: "48px 24px",
        background: dark ? "transparent" : "#FFFFFF",
        borderRadius: 16,
        boxShadow: dark ? "none" : "0 1px 3px rgba(0,0,0,0.05)",
      }}
    >
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: "50%",
          background: dark ? "#1E293B" : "#EEF2FF",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 20,
        }}
      >
        <Icon size={36} color={dark ? "#94A3B8" : "#4F46E5"} strokeWidth={1.5} />
      </div>
      <h3
        style={{
          fontSize: 18,
          fontWeight: 600,
          color: dark ? "#F1F5F9" : "#1E293B",
          margin: "0 0 8px",
        }}
      >
        {title}
      </h3>
      <p style={{ fontSize: 14, color: dark ? "#94A3B8" : "#64748B", maxWidth: 360, margin: "0 auto" }}>
        {message}
      </p>
    </div>
  );
}