import { useStyles } from "../styles/theme";
import { useIsMobile } from "../hooks/useIsMobile"; // <-- Import du hook
import { Users, ClipboardList, ArrowRight, AlertTriangle } from "lucide-react";

export function AccueilParent({ user, eleves, punitions }) {
  const { S, dark } = useStyles();
  const isMobile = useIsMobile(); // Détection mobile

  const totalPunitions = eleves.reduce(
    (acc, e) => acc + punitions.filter((p) => p.idEleve === e._id).length,
    0
  );

  // Couleurs adaptatives
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const accent = dark ? "#818CF8" : "#4F46E5";
  const warning = dark ? "#FBBF24" : "#F59E0B";
  const shadow = dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)";

  // Styles adaptatifs
  const containerPadding = isMobile ? "16px 12px" : "24px 16px";
  const titleSize = isMobile ? 22 : 28;
  const subtitleSize = isMobile ? 14 : 16;
  const statGridStyle = {
    display: "grid",
    gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(200px, 1fr))",
    gap: isMobile ? 12 : 16,
    marginBottom: isMobile ? 20 : 32,
  };
  const cardPadding = isMobile ? 14 : 20;
  const statIconSize = isMobile ? 28 : 32;
  const statValueSize = isMobile ? 24 : 28;
  const statLabelSize = isMobile ? 13 : 14;
  const childCardPadding = isMobile ? "12px 14px" : "16px 20px";
  const childNameSize = isMobile ? 15 : 16;
  const childClassSize = isMobile ? 12 : 13;
  const badgeSize = isMobile ? 11 : 12;
  const arrowSize = isMobile ? 16 : 18;

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: containerPadding }}>
      {/* En-tête */}
      <div style={{ marginBottom: isMobile ? 20 : 32 }}>
        <h2 style={{ fontSize: titleSize, fontWeight: 700, color: textPrimary, margin: 0 }}>
          👋 Bienvenue, {user.nom}
        </h2>
        <p style={{ color: textSecondary, marginTop: 4, fontSize: subtitleSize }}>
          Résumé concernant vos enfants.
        </p>
      </div>

      {/* Cartes statistiques */}
      <div style={statGridStyle}>
        <div style={{
          background: cardBg,
          borderRadius: 16,
          padding: cardPadding,
          textAlign: "center",
          boxShadow: shadow,
          border: `1px solid ${cardBorder}`,
          transition: "background-color 0.3s",
        }}>
          <Users size={statIconSize} color={accent} />
          <div style={{ fontSize: statValueSize, fontWeight: 900, color: accent, marginTop: 8 }}>
            {eleves.length}
          </div>
          <div style={{ color: textSecondary, fontSize: statLabelSize, marginTop: 4 }}>
            Enfants suivis
          </div>
        </div>
        <div style={{
          background: cardBg,
          borderRadius: 16,
          padding: cardPadding,
          textAlign: "center",
          boxShadow: shadow,
          border: `1px solid ${cardBorder}`,
          transition: "background-color 0.3s",
        }}>
          <ClipboardList size={statIconSize} color={warning} />
          <div style={{ fontSize: statValueSize, fontWeight: 900, color: warning, marginTop: 8 }}>
            {totalPunitions}
          </div>
          <div style={{ color: textSecondary, fontSize: statLabelSize, marginTop: 4 }}>
            Total punitions
          </div>
        </div>
      </div>

      {/* Liste des enfants */}
      <div>
        <h3 style={{ fontSize: isMobile ? 18 : 20, fontWeight: 600, color: textPrimary, marginBottom: isMobile ? 12 : 16 }}>
          Mes enfants
        </h3>
        {eleves.length === 0 ? (
          <div style={{
            background: cardBg,
            borderRadius: 16,
            padding: isMobile ? 32 : 48,
            textAlign: "center",
            boxShadow: shadow,
            border: `1px solid ${cardBorder}`,
            color: textSecondary,
          }}>
            <Users size={isMobile ? 36 : 48} color={dark ? "#334155" : "#94A3B8"} style={{ marginBottom: 12 }} />
            <p style={{ margin: 0, fontSize: subtitleSize }}>Aucun enfant enregistré.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: isMobile ? 8 : 12 }}>
            {eleves.map((e) => {
              const nbPunitions = punitions.filter((p) => p.idEleve === e._id).length;
              return (
                <div
                  key={e._id}
                  style={{
                    background: cardBg,
                    borderRadius: 12,
                    padding: childCardPadding,
                    boxShadow: shadow,
                    border: `1px solid ${cardBorder}`,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    transition: "background-color 0.3s",
                    flexWrap: isMobile ? "wrap" : "nowrap",
                    gap: isMobile ? 8 : 0,
                  }}
                >
                  <div style={{ flex: 1, minWidth: isMobile ? "100%" : 0 }}>
                    <div style={{ fontWeight: 600, fontSize: childNameSize, color: textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {e.nom} {e.postnom} {e.prenom && <span style={{ fontWeight: 400, color: textSecondary }}>{e.prenom}</span>}
                    </div>
                    <div style={{ color: textSecondary, fontSize: childClassSize, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      Classe {e.classe}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 12, marginLeft: isMobile ? 0 : 8, flexShrink: 0 }}>
                    {nbPunitions > 0 && (
                      <span style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        background: nbPunitions > 0 ? (dark ? "#78350F" : "#FEF3C7") : "transparent",
                        color: nbPunitions > 0 ? (dark ? "#FBBF24" : "#92400E") : textSecondary,
                        padding: "2px 8px",
                        borderRadius: 12,
                        fontSize: badgeSize,
                        fontWeight: 600,
                      }}>
                        <AlertTriangle size={isMobile ? 12 : 14} />
                        {nbPunitions} punition{nbPunitions > 1 ? "s" : ""}
                      </span>
                    )}
                    <ArrowRight size={arrowSize} color={accent} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}