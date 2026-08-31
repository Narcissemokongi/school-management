import { useIsMobile } from "@/hooks/useIsMobile"; // <-- Import du hook
import { useStyles } from "@/styles/theme"; // <-- Pour le mode sombre
import { Users, GraduationCap, AlertTriangle, BookOpen } from "lucide-react";

const iconMap = {
  "Élèves": <GraduationCap size={24} />,
  "Punitions": <AlertTriangle size={24} />,
  "Classes": <BookOpen size={24} />,
  "Utilisateurs": <Users size={24} />,
};

export function StatsCards({ stats }) {
  const isMobile = useIsMobile();
  const { dark } = useStyles();

  // Couleurs adaptatives
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const borderColor = dark ? "#334155" : "#E2E8F0";
  const shadow = dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)";

  // Styles adaptatifs
  const gridColumns = isMobile ? "1fr" : "repeat(auto-fit, minmax(160px, 1fr))";
  const gap = isMobile ? 8 : 16;
  const padding = isMobile ? 14 : 20;
  const iconSize = isMobile ? 20 : 24; // Taille des icônes
  const iconContainerSize = isMobile ? 40 : 48;
  const valueSize = isMobile ? 18 : 24;
  const labelSize = isMobile ? 12 : 14;

  return (
    <div style={{ display: "grid", gridTemplateColumns: gridColumns, gap: gap, marginBottom: isMobile ? 20 : 32 }}>
      {stats.map((s, i) => (
        <div
          key={i}
          style={{
            background: cardBg,
            borderRadius: 16,
            padding: padding,
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
              background: `${s.color}${dark ? "33" : "15"}`, // adaptation de l'opacité
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: s.color,
            }}
          >
            {iconMap[s.label] || <Users size={iconSize} />}
          </div>
          <div>
            <div style={{ fontSize: valueSize, fontWeight: 700, color: textPrimary }}>{s.value}</div>
            <div style={{ fontSize: labelSize, color: textSecondary }}>{s.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}