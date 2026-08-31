import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile"; // <-- Import du hook
import { DollarSign, TrendingDown, CheckCircle, Clock } from "lucide-react";
import { Skeleton } from "./Skeleton";

export function FraisEnfant({ eleveId }) {
  const { dark } = useStyles();
  const isMobile = useIsMobile(); // Détection mobile

  const frais = useQuery(api.frais.listByEleve, { eleveId }) ?? [];
  const eleve = useQuery(api.eleves.get, { id: eleveId });
  const ecole = useQuery(api.ecoles.get, eleve ? { ecoleId: eleve.ecoleId } : "skip");

  // Couleurs adaptatives
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const shadow = dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)";
  const accent = dark ? "#818CF8" : "#4F46E5";
  const success = dark ? "#34D399" : "#10B981";
  const danger = dark ? "#F87171" : "#EF4444";
  const badgePayeBg = dark ? "#064E3B" : "#D1FAE5";
  const badgePayeText = dark ? "#34D399" : "#065F46";
  const badgeAttenteBg = dark ? "#78350F" : "#FEF3C7";
  const badgeAttenteText = dark ? "#FBBF24" : "#92400E";
  const progressBg = dark ? "#334155" : "#F1F5F9";
  const borderLight = dark ? "rgba(255,255,255,0.05)" : "#F1F5F9";

  if (eleve === undefined || (eleve && ecole === undefined)) {
    return <Skeleton height={200} style={{ marginTop: 16 }} />;
  }

  if (eleve === null) {
    return (
      <div style={{
        background: cardBg,
        borderRadius: 16,
        padding: isMobile ? 16 : 24,
        boxShadow: shadow,
        marginTop: 16,
        textAlign: "center",
        border: `1px solid ${cardBorder}`,
      }}>
        <p style={{ color: textSecondary, fontSize: isMobile ? 14 : 14, margin: 0 }}>Élève introuvable.</p>
      </div>
    );
  }

  if (frais.length === 0) {
    return (
      <div style={{
        background: cardBg,
        borderRadius: 16,
        padding: isMobile ? 20 : 24,
        boxShadow: shadow,
        marginTop: 16,
        textAlign: "center",
        border: `1px solid ${cardBorder}`,
      }}>
        <DollarSign size={isMobile ? 28 : 32} color={dark ? "#94A3B8" : "#94A3B8"} style={{ marginBottom: 8 }} />
        <h3 style={{ fontSize: isMobile ? 15 : 16, fontWeight: 600, color: textPrimary, margin: "0 0 4px" }}>
          Frais scolaires
        </h3>
        <p style={{ color: textSecondary, fontSize: isMobile ? 13 : 14, margin: 0 }}>
          Aucune information de frais disponible.
        </p>
      </div>
    );
  }

  const devise = ecole?.devise || "CDF";
  const deviseLabel = devise === "USD" ? "$" : "FC";

  // Styles adaptatifs
  const cardPadding = isMobile ? 14 : 20;
  const gap = isMobile ? 8 : 12;
  const titleSize = isMobile ? 15 : 16;
  const labelFontSize = isMobile ? 13 : 14;
  const valueFontSize = isMobile ? 14 : 14;
  const headerMarginBottom = isMobile ? 12 : 16;
  const montantsMarginBottom = isMobile ? 12 : 16;
  const progressionMarginBottom = isMobile ? 4 : 8;

  return (
    <div style={{ marginTop: 16, display: "grid", gap: gap }}>
      {frais.map((f) => {
        const reste = f.montantTotal - f.montantPaye;
        const pourcentagePaye = f.montantTotal > 0 ? Math.round((f.montantPaye / f.montantTotal) * 100) : 0;
        const estPaye = reste <= 0;

        const montantTotalFormatted = f.montantTotal.toFixed(2);
        const montantPayeFormatted = f.montantPaye.toFixed(2);
        const resteFormatted = reste.toFixed(2);

        return (
          <div
            key={f._id}
            style={{
              background: cardBg,
              borderRadius: 16,
              padding: cardPadding,
              boxShadow: shadow,
              border: `1px solid ${cardBorder}`,
              transition: "box-shadow 0.15s, background-color 0.3s",
            }}
          >
            {/* En-tête */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: headerMarginBottom,
            }}>
              <h3 style={{
                fontSize: titleSize,
                fontWeight: 600,
                color: textPrimary,
                margin: 0,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}>
                <DollarSign size={isMobile ? 18 : 20} color={accent} />
                Frais scolaires
              </h3>
              {estPaye ? (
                <span style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  background: badgePayeBg,
                  color: badgePayeText,
                  padding: "4px 10px",
                  borderRadius: 20,
                  fontSize: isMobile ? 11 : 12,
                  fontWeight: 600,
                }}>
                  <CheckCircle size={14} />
                  Payé
                </span>
              ) : (
                <span style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  background: badgeAttenteBg,
                  color: badgeAttenteText,
                  padding: "4px 10px",
                  borderRadius: 20,
                  fontSize: isMobile ? 11 : 12,
                  fontWeight: 600,
                }}>
                  <Clock size={14} />
                  En attente
                </span>
              )}
            </div>

            {/* Montants */}
            <div style={{ marginBottom: montantsMarginBottom }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ color: textSecondary, fontSize: labelFontSize }}>Montant total</span>
                <span style={{ fontWeight: 600, fontSize: valueFontSize, color: textPrimary }}>
                  {montantTotalFormatted} {deviseLabel}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ color: textSecondary, fontSize: labelFontSize }}>Montant payé</span>
                <span style={{ fontWeight: 600, fontSize: valueFontSize, color: success }}>
                  {montantPayeFormatted} {deviseLabel}
                </span>
              </div>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                paddingTop: 8,
                borderTop: `1px solid ${borderLight}`,
              }}>
                <span style={{ fontWeight: 600, fontSize: valueFontSize, color: textPrimary }}>
                  Reste à payer
                </span>
                <span style={{
                  fontWeight: 700,
                  fontSize: valueFontSize,
                  color: reste > 0 ? danger : success,
                }}>
                  {resteFormatted} {deviseLabel}
                </span>
              </div>
            </div>

            {/* Barre de progression */}
            <div style={{ marginBottom: progressionMarginBottom }}>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 4,
                fontSize: isMobile ? 11 : 12,
                color: textSecondary,
              }}>
                <span>Progression</span>
                <span>{pourcentagePaye}%</span>
              </div>
              <div style={{
                width: "100%",
                height: 8,
                background: progressBg,
                borderRadius: 4,
                overflow: "hidden",
              }}>
                <div style={{
                  width: `${pourcentagePaye}%`,
                  height: "100%",
                  background: estPaye ? success : accent,
                  borderRadius: 4,
                  transition: "width 0.3s ease",
                }} />
              </div>
            </div>

            {/* Commentaire */}
            {f.commentaire && (
              <div style={{
                fontSize: isMobile ? 12 : 13,
                color: textSecondary,
                display: "flex",
                alignItems: "center",
                gap: 4,
                marginTop: 4,
              }}>
                <span>📝</span>
                <span>{f.commentaire}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}