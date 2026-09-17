// src/components/RecentActivity.jsx
import { useMemo } from "react";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useStyles } from "@/styles/theme";
import { Clock, AlertTriangle } from "lucide-react";

// ✅ FIX #2 — formate date (ISO, FR, ou timestamp)
function formatDate(date) {
  if (date == null) return "—";
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [y, m, d] = date.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("fr-FR");
  }
  const d = typeof date === "number" ? new Date(date) : new Date(date);
  return isNaN(d.getTime()) ? String(date) : d.toLocaleDateString("fr-FR");
}

export function RecentActivity({
  dernierEleve = null,          // ✅ FIX #4
  dernierePunition = null,
  fautes = [],                  // ✅ FIX #1
  eleves = [],
}) {
  const isMobile = useIsMobile();
  const { dark } = useStyles();

  // ✅ FIX #3 — useMemo (mineur mais cohérent)
  const { fauteDerniere, eleveDernierePunition } = useMemo(() => {
    if (!dernierePunition) return { fauteDerniere: null, eleveDernierePunition: null };
    return {
      fauteDerniere: fautes.find(f => f._id === dernierePunition.idFaute) ?? null,
      eleveDernierePunition: eleves.find(e => e._id === dernierePunition.idEleve) ?? null,
    };
  }, [dernierePunition, fautes, eleves]);

  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const shadow = dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)";

  const gridColumns = isMobile ? "1fr" : "repeat(auto-fit, minmax(300px, 1fr))";
  const gap = isMobile ? 12 : 24;
  const padding = isMobile ? 16 : 24;
  const titleSize = isMobile ? 16 : 18;
  const textSize = isMobile ? 13 : 14;

  const cardStyle = {
    background: cardBg,
    borderRadius: 16,
    padding,
    boxShadow: shadow,
    border: `1px solid ${cardBorder}`,
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: gridColumns, gap }}>
      {/* Dernier élève ajouté */}
      <div style={cardStyle}>
        <h3 style={{
          fontSize: titleSize, fontWeight: 600, marginBottom: 16,
          display: "flex", alignItems: "center", gap: 8, color: textPrimary,
        }}>
          <Clock size={20} /> Dernier élève ajouté
        </h3>
        {dernierEleve ? (
          <div>
            <strong style={{ color: textPrimary }}>
              {dernierEleve.nom} {dernierEleve.postnom}
            </strong>
            <div style={{ color: textSecondary, fontSize: textSize }}>
              Classe {dernierEleve.classe}
            </div>
          </div>
        ) : (
          <p style={{ color: textSecondary }}>Aucun élève</p>
        )}
      </div>

      {/* Dernière punition */}
      <div style={cardStyle}>
        <h3 style={{
          fontSize: titleSize, fontWeight: 600, marginBottom: 16,
          display: "flex", alignItems: "center", gap: 8, color: textPrimary,
        }}>
          <AlertTriangle size={20} /> Dernière punition
        </h3>
        {dernierePunition ? (
          <div>
            <strong style={{ color: textPrimary }}>
              {eleveDernierePunition?.nom} {eleveDernierePunition?.postnom}
            </strong>
            <div style={{ fontSize: textSize, color: textSecondary }}>
              {fauteDerniere?.libelle} ({fauteDerniere?.gravite})
            </div>
            <div style={{ fontSize: isMobile ? 12 : 13, marginTop: 4, color: textSecondary }}>
              {/* ✅ FIX #2 — date formatée */}
              Sanction : {dernierePunition.sanction} – {formatDate(dernierePunition.date)}
            </div>
          </div>
        ) : (
          <p style={{ color: textSecondary }}>Aucune punition</p>
        )}
      </div>
    </div>
  );
}