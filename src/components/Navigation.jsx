import { useStyles } from "../styles/theme";
import { useIsMobile } from "../hooks/useIsMobile";

export function Navigation({ tabs, active, onChange, variant = "desktop" }) {
  const { S } = useStyles();

  // Navigation desktop : onglets avec barre inférieure active
  if (variant === "desktop") {
    return (
      <div style={{ display: "flex", gap: 0, borderBottom: "2px solid #E2E8F0", marginBottom: 24 }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "12px 20px",
              border: "none",
              background: "transparent",
              color: active === t.id ? "#4F46E5" : "#64748B",
              fontWeight: active === t.id ? 600 : 400,
              borderBottom: active === t.id ? "3px solid #4F46E5" : "3px solid transparent",
              cursor: "pointer",
              transition: "all 0.2s",
              whiteSpace: "nowrap",
            }}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>
    );
  }

  // Navigation mobile : barre inférieure fixe
  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: "#FFFFFF",
        borderTop: "1px solid #E2E8F0",
        display: "flex",
        justifyContent: "space-around",
        padding: "8px 0",
        zIndex: 100,
        boxShadow: "0 -2px 10px rgba(0,0,0,0.05)",
      }}
    >
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
            background: "none",
            border: "none",
            color: active === t.id ? "#4F46E5" : "#64748B",
            fontWeight: active === t.id ? 600 : 400,
            fontSize: 12,
            cursor: "pointer",
            padding: "4px 12px",
            borderRadius: 8,
            transition: "all 0.2s",
          }}
        >
          <span style={{ fontSize: 22 }}>{t.icon}</span>
          <span>{t.label}</span>
        </button>
      ))}
    </div>
  );
}