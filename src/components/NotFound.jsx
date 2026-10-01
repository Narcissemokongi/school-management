// src/components/NotFound.jsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import { Home, Search, ArrowLeft } from "lucide-react";

// ════════════════════════════════════════════════════════════════════
// CONSTANTES MODULE-LEVEL
// ════════════════════════════════════════════════════════════════════
const TAP_BASE = {
  touchAction: "manipulation",
  WebkitTapHighlightColor: "transparent",
  minHeight: 44,
};

const FOCUS_RING = (color) => ({
  outline: `2px solid ${color}`,
  outlineOffset: 2,
});

// ════════════════════════════════════════════════════════════════════
// KEYFRAMES MODULE-LEVEL (rendus UNE fois)
// ════════════════════════════════════════════════════════════════════
const NotFoundKeyframes = (
  <style>{`
    @keyframes nf-fadeInZoom {
      0% { opacity: 0; transform: scale(0.95) translateY(20px); }
      100% { opacity: 1; transform: scale(1) translateY(0); }
    }
    @keyframes nf-float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }
    @keyframes nf-pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.8; transform: scale(1.05); }
    }
    .nf-container {
      animation: nf-fadeInZoom 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .nf-float {
      animation: nf-float 3s ease-in-out infinite;
    }
    .nf-pulse {
      animation: nf-pulse 2s ease-in-out infinite;
    }
    @media (prefers-reduced-motion: reduce) {
      .nf-container,
      .nf-float,
      .nf-pulse {
        animation: none !important;
      }
    }
  `}</style>
);

// ════════════════════════════════════════════════════════════════════
// HOME LINK — état React pour hover/focus/pressed
// ════════════════════════════════════════════════════════════════════
function HomeLink({
  to, buttonBg, buttonHover, buttonShadow, buttonShadowHover,
  actionButtonPadding, actionButtonWidth, actionButtonFontSize,
}) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);

  const isActive = hovered && !pressed;

  return (
    <Link
      to={to}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false); }}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        ...TAP_BASE,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: actionButtonPadding,
        background: isActive ? buttonHover : buttonBg,
        color: "#FFFFFF",
        borderRadius: 12,
        textDecoration: "none",
        fontWeight: 600,
        fontSize: actionButtonFontSize,
        boxShadow: isActive ? buttonShadowHover : buttonShadow,
        transform: pressed
          ? "scale(0.97)"
          : isActive
          ? "translateY(-2px)"
          : "translateY(0)",
        transition: "background 0.2s, transform 0.15s, box-shadow 0.2s",
        width: actionButtonWidth,
        ...(focused ? FOCUS_RING(buttonBg) : null),
      }}
    >
      <Home size={20} aria-hidden="true" /> Retour à l'accueil
    </Link>
  );
}

// ════════════════════════════════════════════════════════════════════
// BACK BUTTON — état React pour hover/focus/pressed
// ════════════════════════════════════════════════════════════════════
function BackButton({
  onClick, dark, circleBorder,
  actionButtonPadding, actionButtonWidth, actionButtonFontSize,
  buttonBg,
}) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);

  const hoverBg = dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";
  const isActive = hovered && !pressed;

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false); }}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      aria-label="Retour à la page précédente"
      style={{
        ...TAP_BASE,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: actionButtonPadding,
        background: isActive ? hoverBg : "transparent",
        color: dark ? "#CBD5E1" : "#1E293B",
        border: `1px solid ${circleBorder}`,
        borderRadius: 12,
        fontWeight: 600,
        fontSize: actionButtonFontSize,
        cursor: "pointer",
        transform: pressed
          ? "scale(0.97)"
          : isActive
          ? "translateY(-1px)"
          : "translateY(0)",
        transition: "background 0.2s, transform 0.12s",
        width: actionButtonWidth,
        fontFamily: "inherit",
        ...(focused ? FOCUS_RING(buttonBg) : null),
      }}
    >
      <ArrowLeft size={18} aria-hidden="true" /> Page précédente
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ════════════════════════════════════════════════════════════════════
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
  const buttonShadow = dark
    ? "0 4px 12px rgba(0,0,0,0.3)"
    : "0 4px 12px rgba(79,70,229,0.2)";
  const buttonShadowHover = dark
    ? "0 6px 16px rgba(0,0,0,0.5)"
    : "0 6px 16px rgba(79,70,229,0.3)";

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
  const actionButtonFontSize = isMobile ? 16 : 14;

  return (
    <>
      {NotFoundKeyframes}
      <div
        className="nf-container"
        style={{
          minHeight: "100vh",
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: containerPadding,
          textAlign: "center",
          background: bg,
          color: textPrimary,
          transition: "background-color 0.3s, color 0.3s",
        }}
      >
        {/* ═══════════ Icône principale avec animation ═══════════ */}
        <div
          className="nf-float"
          aria-hidden="true"
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
            boxShadow: dark
              ? "0 1px 3px rgba(0,0,0,0.3)"
              : "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          <Search size={iconSize} color={dark ? "#818CF8" : "#4F46E5"} />
        </div>

        {/* ═══════════ Titre 404 animé ═══════════ */}
        <h1
          className="nf-pulse"
          style={{
            fontSize: title404,
            fontWeight: 900,
            color: dark ? "#818CF8" : "#4F46E5",
            margin: "0 0 8px",
            lineHeight: 1,
            letterSpacing: "-2px",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          404
        </h1>

        {/* ═══════════ Sous-titre ═══════════ */}
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

        {/* ═══════════ Description ═══════════ */}
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

        {/* ═══════════ Boutons d'action ═══════════ */}
        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            justifyContent: "center",
            flexDirection: actionsFlexDirection,
            width: isMobile ? "100%" : "auto",
          }}
        >
          <HomeLink
            to="/"
            buttonBg={buttonBg}
            buttonHover={buttonHover}
            buttonShadow={buttonShadow}
            buttonShadowHover={buttonShadowHover}
            actionButtonPadding={actionButtonPadding}
            actionButtonWidth={actionButtonWidth}
            actionButtonFontSize={actionButtonFontSize}
          />
          <BackButton
            onClick={() => window.history.back()}
            dark={dark}
            circleBorder={circleBorder}
            actionButtonPadding={actionButtonPadding}
            actionButtonWidth={actionButtonWidth}
            actionButtonFontSize={actionButtonFontSize}
            buttonBg={buttonBg}
          />
        </div>
      </div>
    </>
  );
}