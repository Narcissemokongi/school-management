import { useMemo } from "react";
import { DashboardDirecteur } from "./DashboardDirecteur";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import { Shield, Sparkles } from "lucide-react";

export function AccueilDirecteur({
  ecoleId,
  anneeId,
  anneeActive,
  punitions = [],
  eleves = [],
  classes = [],
  fautes = [],
  notifs = [],
}) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();

  // Couleurs
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const accent = dark ? "#818CF8" : "#4F46E5";

  // Nombre de punitions (source unique de vérité)
  const nbPunitions = punitions.length;

  // Message contextuel mémoïsé (recalcul uniquement si nbPunitions change)
  const welcomeMessage = useMemo(() => {
    if (nbPunitions === 0) {
      return "Aucune punition enregistrée. La discipline est au beau fixe.";
    }
    if (nbPunitions < 10) {
      return `${nbPunitions} punition${nbPunitions > 1 ? "s" : ""} enregistrée${nbPunitions > 1 ? "s" : ""}. Situation sous contrôle.`;
    }
    return `${nbPunitions} punitions enregistrées. Surveillez les indicateurs ci-dessous.`;
  }, [nbPunitions]);

  return (
    <div
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: isMobile ? "10px 8px 24px" : "20px 16px 32px",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* ==================== EN-TÊTE DE BIENVENUE ==================== */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: isMobile ? 10 : 14,
          padding: isMobile ? "12px 14px" : "16px 18px",
          marginBottom: isMobile ? 14 : 20,
          background: dark
            ? "linear-gradient(135deg, #312E81 0%, #1E293B 100%)"
            : "linear-gradient(135deg, #EEF2FF 0%, #FFFFFF 100%)",
          borderRadius: 14,
          border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
        }}
      >
        {/* Avatar / icône */}
        <div
          style={{
            width: isMobile ? 44 : 52,
            height: isMobile ? 44 : 52,
            borderRadius: "50%",
            background: "#4F46E5",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#FFFFFF",
            flexShrink: 0,
            boxShadow: "0 4px 12px rgba(79,70,229,0.35)",
          }}
        >
          <Shield size={isMobile ? 22 : 26} />
        </div>

        {/* Texte */}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 2,
            }}
          >
            <span
              style={{
                fontSize: isMobile ? 15 : 17,
                fontWeight: 700,
                color: textPrimary,
                lineHeight: 1.2,
              }}
            >
              Bienvenue
            </span>
            <Sparkles size={14} color={accent} />
          </div>
          <div
            style={{
              fontSize: isMobile ? 12 : 13,
              color: textSecondary,
              lineHeight: 1.4,
            }}
          >
            {welcomeMessage}
          </div>
        </div>
      </div>

      {/* ==================== TABLEAU DE BORD ==================== */}
      <DashboardDirecteur
        ecoleId={ecoleId}
        anneeId={anneeId}
        anneeActive={anneeActive}
        punitions={punitions}
        eleves={eleves}
        classes={classes}
        fautes={fautes}
        notifs={notifs}
      />
    </div>
  );
}