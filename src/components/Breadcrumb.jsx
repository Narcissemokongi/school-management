import { ChevronRight, Home } from "lucide-react";
import { useStyles } from "../styles/theme";

export function Breadcrumb({ items = [], onNavigate }) {
  const { dark } = useStyles();

  const mutedColor = dark ? "#94A3B8" : "#64748B";
  const activeColor = dark ? "#F1F5F9" : "#1E293B";
  const hoverColor = dark ? "#CBD5E1" : "#334155";

  return (
    <nav aria-label="Fil d'ariane" style={{ marginBottom: 16 }}>
      <ol
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 14,
          color: mutedColor,
          flexWrap: "wrap",
          listStyle: "none",
          padding: 0,
          margin: 0,
        }}
      >
        {/* Accueil (toujours présent, non cliquable ici) */}
        <li style={{ display: "flex", alignItems: "center" }}>
          <Home size={16} />
        </li>

        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <li key={idx} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <ChevronRight size={14} aria-hidden="true" />
              {onNavigate && !isLast ? (
                <button
                  onClick={() => onNavigate(item)}
                  style={{
                    background: "none",
                    border: "none",
                    color: mutedColor,
                    cursor: "pointer",
                    fontSize: 14,
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                    padding: 0,
                    transition: "color 0.2s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = hoverColor)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = mutedColor)}
                >
                  {item}
                </button>
              ) : (
                <span
                  style={{
                    color: isLast ? activeColor : mutedColor,
                    fontWeight: isLast ? 600 : 400,
                    whiteSpace: "nowrap",
                  }}
                >
                  {item}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}