// src/components/StatsCards.jsx
import { useIsMobile } from "@/hooks/useIsMobile";
import { useStyles } from "@/styles/theme";
import { Users, GraduationCap, AlertTriangle, BookOpen } from "lucide-react";

// ✅ FIX #4 — interpolation hex sécurisée (supporte #RGB, #RRGGBB, rgb, etc.)
function colorWithAlpha(color, alpha) {
  if (!color || typeof color !== "string") return "transparent";

  // #RGB → #RRGGBB
  let hex = color;
  if (/^#[0-9a-f]{3}$/i.test(hex)) {
    hex = "#" + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
  }

  // #RRGGBB → rgba(r,g,b,alpha)
  if (/^#[0-9a-f]{6}$/i.test(hex)) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // Fallback : couleur déjà au format CSS (rgb, named, etc.)
  return color;
}

// ✅ FIX #1 — iconMap devient une fonction qui prend size
const ICON_MAP = {
  "Élèves": GraduationCap,
  "Punitions": AlertTriangle,
  "Classes": BookOpen,
  "Utilisateurs": Users,
};

export function StatsCards({ stats = [] }) {   // ✅ FIX #2
  const isMobile = useIsMobile();
  const { dark } = useStyles();

  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const borderColor = dark ? "#334155" : "#E2E8F0";
  const shadow = dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)";

  const gridColumns = isMobile ? "1fr" : "repeat(auto-fit, minmax(160px, 1fr))";
  const gap = isMobile ? 8 : 16;
  const padding = isMobile ? 14 : 20;
  const iconSize = isMobile ? 20 : 24;
  const iconContainerSize = isMobile ? 40 : 48;
  const valueSize = isMobile ? 18 : 24;
  const labelSize = isMobile ? 12 : 14;

  // ✅ FIX #5 — empty state
  if (stats.length === 0) {
    return (
      <div style={{
        padding: isMobile ? 16 : 24,
        textAlign: "center",
        color: textSecondary,
        fontSize: labelSize,
      }}>
        Aucune statistique à afficher
      </div>
    );
  }

  return (
    <div
      style={{ display: "grid", gridTemplateColumns: gridColumns, gap, marginBottom: isMobile ? 20 : 32 }}
      aria-label="Cartes de statistiques"   // ✅ FIX #6
    >
      {stats.map((s) => {
        // ✅ FIX #1 — récupère le composant Icône et l'instancie avec la bonne taille
        const Icon = ICON_MAP[s.label] || Users;
        return (
          <div
            key={s.label}    // ✅ FIX #3 — clé stable
            style={{
              background: cardBg,
              borderRadius: 16,
              padding,
              display: "flex",
              alignItems: "center",
              gap: isMobile ? 10 : 16,
              boxShadow: shadow,
              border: `1px solid ${borderColor}`,
            }}
          >
            <div
              style={{
                width: iconContainerSize,
                height: iconContainerSize,
                // ✅ FIX #4 — helper défensif au lieu de concaténation naïve
                background: colorWithAlpha(s.color, dark ? 0.2 : 0.08),
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: s.color || textPrimary,
                flexShrink: 0,          // évite l'écrasement de l'icône
              }}
            >
              {/* ✅ FIX #1 — Icon reçoit iconSize (20 ou 24) */}
              <Icon size={iconSize} />
            </div>
            <div style={{ minWidth: 0 }}>  {/* évite le débordement de texte long */}
              <div style={{ fontSize: valueSize, fontWeight: 700, color: textPrimary }}>
                {s.value}
              </div>
              <div style={{ fontSize: labelSize, color: textSecondary }}>{s.label}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}