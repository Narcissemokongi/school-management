import { Link } from "react-router-dom";
import { useStyles } from "../styles/theme";
import { useIsMobile } from "../hooks/useIsMobile";
import { Home, Search, ArrowLeft } from "lucide-react";

export function NotFound() {
  const { dark } = useStyles();
  const isMobile = useIsMobile();

  // Couleurs adaptatives
  const bg = dark ? "#0F172A" : "#F8FAFC";
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const circleBg = dark ? "#1E293B" : "#EEF2FF";
  const circleBorder = dark ? "#334155" : "#E2E8F0";
  const buttonBg = dark ? "#818CF8" : "#4F46E5";
  const buttonHover = dark ? "#6366F1" : "#4338CA";

  // Styles adaptatifs
  const containerPadding = isMobile ? "32px 16px" : "32px 24px";
  const iconContainerSize = isMobile ? 80 : 100;
  const iconSize = isMobile ? 36 : 48;
  const title404 = isMobile ? "64px" : "clamp(64px, 12vw, 96px)";
  const subtitleSize = isMobile ? "20px" : "clamp(20px, 4vw, 28px)";
  const descriptionSize = isMobile ? 13 : 14;
  const actionsFlexDirection = isMobile ? "column" : "row";
  const actionButtonPadding = isMobile ? "12px 16px" : "12px 24px";
  const actionButtonWidth = isMobile ? "100%" : "auto";

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: containerPadding,
        textAlign: "center",
        background: bg,
        color: textPrimary,
        transition: "background-color 0.3s, color 0.3s",
        animation: "fadeInZoom 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      {/* Icône principale avec animation */}
      <div
        style={{
          width: iconContainerSize,
          height: iconContainerSize,
          borderRadius: "50%",
          background: circleBg,
          border: `1px solid ${circleBorder}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: isMobile ? 16 : 24,
          boxShadow: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.1)",
          animation: "float 3s ease-in-out infinite",
        }}
      >
        <Search size={iconSize} color={dark ? "#818CF8" : "#4F46E5"} />
      </div>

      {/* Titre 404 animé */}
      <h1
        style={{
          fontSize: title404,
          fontWeight: 900,
          color: dark ? "#818CF8" : "#4F46E5",
          margin: "0 0 8px",
          lineHeight: 1,
          letterSpacing: "-2px",
          animation: "pulse 2s ease-in-out infinite",
        }}
      >
        404
      </h1>

      {/* Sous-titre */}
      <h2
        style={{
          fontSize: subtitleSize,
          fontWeight: 600,
          color: dark ? "#CBD5E1" : "#1E293B",
          margin: "0 0 8px",
        }}
      >
        Page introuvable
      </h2>

      {/* Description */}
      <p
        style={{
          fontSize: descriptionSize,
          color: textSecondary,
          marginBottom: isMobile ? 24 : 32,
          maxWidth: 420,
          lineHeight: 1.6,
        }}
      >
        Désolé, la page que vous recherchez n'existe pas ou a été déplacée.
        Veuillez vérifier l'URL ou retourner à l'accueil.
      </p>

      {/* Boutons d'action */}
      <div style={{
        display: "flex",
        gap: 12,
        flexWrap: "wrap",
        justifyContent: "center",
        flexDirection: actionsFlexDirection,
        width: isMobile ? "100%" : "auto",
      }}>
        <Link
          to="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: actionButtonPadding,
            background: buttonBg,
            color: "#FFFFFF",
            borderRadius: 12,
            textDecoration: "none",
            fontWeight: 600,
            fontSize: isMobile ? 16 : 14,
            boxShadow: dark ? "0 4px 12px rgba(0,0,0,0.3)" : "0 4px 12px rgba(79,70,229,0.2)",
            transition: "background 0.2s, transform 0.2s, box-shadow 0.2s",
            width: actionButtonWidth,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = buttonHover;
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = dark ? "0 6px 16px rgba(0,0,0,0.5)" : "0 6px 16px rgba(79,70,229,0.3)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = buttonBg;
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = dark ? "0 4px 12px rgba(0,0,0,0.3)" : "0 4px 12px rgba(79,70,229,0.2)";
          }}
        >
          <Home size={isMobile ? 20 : 20} /> Retour à l'accueil
        </Link>

        <button
          onClick={() => window.history.back()}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: actionButtonPadding,
            background: "transparent",
            color: dark ? "#CBD5E1" : "#1E293B",
            border: `1px solid ${circleBorder}`,
            borderRadius: 12,
            fontWeight: 600,
            fontSize: isMobile ? 16 : 14,
            cursor: "pointer",
            transition: "background 0.2s, transform 0.1s",
            width: actionButtonWidth,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";
            e.currentTarget.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          <ArrowLeft size={isMobile ? 18 : 18} /> Page précédente
        </button>
      </div>

      {/* Animations CSS */}
      <style>{`
        @keyframes fadeInZoom {
          0% { opacity: 0; transform: scale(0.95) translateY(20px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
}