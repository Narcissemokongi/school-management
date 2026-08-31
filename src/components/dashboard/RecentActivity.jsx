import { useIsMobile } from "../hooks/useIsMobile"; // <-- Import du hook
import { useStyles } from "../styles/theme"; // <-- Pour le mode sombre
import { Clock, AlertTriangle } from "lucide-react";

export function RecentActivity({ dernierEleve, dernierePunition, fautes, eleves }) {
  const isMobile = useIsMobile(); // Détection mobile
  const { dark } = useStyles(); // Mode sombre

  const fauteDerniere = dernierePunition ? fautes.find(f => f._id === dernierePunition.idFaute) : null;
  const eleveDernierePunition = dernierePunition ? eleves.find(e => e._id === dernierePunition.idEleve) : null;

  // Couleurs adaptatives
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const shadow = dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)";

  // Styles adaptatifs
  const gridColumns = isMobile ? "1fr" : "repeat(auto-fit, minmax(300px, 1fr))";
  const gap = isMobile ? 12 : 24;
  const padding = isMobile ? 16 : 24;
  const titleSize = isMobile ? 16 : 18;
  const textSize = isMobile ? 13 : 14;

  return (
    <div style={{ display: "grid", gridTemplateColumns: gridColumns, gap: gap }}>
      {/* Dernier élève ajouté */}
      <div style={{ background: cardBg, borderRadius: 16, padding: padding, boxShadow: shadow, border: `1px solid ${cardBorder}` }}>
        <h3 style={{ fontSize: titleSize, fontWeight: 600, marginBottom: 16, display: "flex", alignItems: "center", gap: 8, color: textPrimary }}>
          <Clock size={20} /> Dernier élève ajouté
        </h3>
        {dernierEleve ? (
          <div>
            <strong style={{ color: textPrimary }}>{dernierEleve.nom} {dernierEleve.postnom}</strong>
            <div style={{ color: textSecondary, fontSize: textSize }}>Classe {dernierEleve.classe}</div>
          </div>
        ) : (
          <p style={{ color: textSecondary }}>Aucun élève</p>
        )}
      </div>

      {/* Dernière punition */}
      <div style={{ background: cardBg, borderRadius: 16, padding: padding, boxShadow: shadow, border: `1px solid ${cardBorder}` }}>
        <h3 style={{ fontSize: titleSize, fontWeight: 600, marginBottom: 16, display: "flex", alignItems: "center", gap: 8, color: textPrimary }}>
          <AlertTriangle size={20} /> Dernière punition
        </h3>
        {dernierePunition ? (
          <div>
            <strong style={{ color: textPrimary }}>{eleveDernierePunition?.nom} {eleveDernierePunition?.postnom}</strong>
            <div style={{ fontSize: textSize, color: textSecondary }}>
              {fauteDerniere?.libelle} ({fauteDerniere?.gravite})
            </div>
            <div style={{ fontSize: isMobile ? 12 : 13, marginTop: 4, color: textSecondary }}>
              Sanction : {dernierePunition.sanction} – {dernierePunition.date}
            </div>
          </div>
        ) : (
          <p style={{ color: textSecondary }}>Aucune punition</p>
        )}
      </div>
    </div>
  );
}