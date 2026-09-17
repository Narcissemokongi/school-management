// src/components/ScrollToTop.jsx
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { ChevronUp } from "lucide-react";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";

// ════════════════════════════════════════════════════════════════════
// KEYFRAMES module-level (injectés UNE SEULE FOIS)
// ════════════════════════════════════════════════════════════════════
const ScrollToTopKeyframes = (
  <style>{`
    @keyframes stt-pulse-light {
      0%   { box-shadow: 0 0 0 0 rgba(79,70,229,0.4); }
      70%  { box-shadow: 0 0 0 12px rgba(79,70,229,0); }
      100% { box-shadow: 0 0 0 0 rgba(79,70,229,0); }
    }
    @keyframes stt-pulse-dark {
      0%   { box-shadow: 0 0 0 0 rgba(129,140,248,0.5); }
      70%  { box-shadow: 0 0 0 12px rgba(129,140,248,0); }
      100% { box-shadow: 0 0 0 0 rgba(129,140,248,0); }
    }
    .stt-pulse-light { animation: stt-pulse-light 2s ease-out infinite; }
    .stt-pulse-dark { animation: stt-pulse-dark 2s ease-out infinite; }
    @media (prefers-reduced-motion: reduce) {
      .stt-pulse-light,
      .stt-pulse-dark {
        animation: none !important;
      }
    }
  `}</style>
);

export function ScrollToTop({
  bottom = 24,
  right = 24,
  showAfter = 300,
}) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();

  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const rafRef = useRef(null);

  // ════════════════════════════════════════════════════════════════════
  // PREFERS-REDUCED-MOTION (fallback Safari < 14)
  // ════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);

    const handleChange = (e) => setPrefersReducedMotion(e.matches);

    if (mq.addEventListener) {
      mq.addEventListener("change", handleChange);
      return () => mq.removeEventListener("change", handleChange);
    } else if (mq.addListener) {
      mq.addListener(handleChange);
      return () => mq.removeListener(handleChange);
    }
  }, []);

  // ════════════════════════════════════════════════════════════════════
  // SCROLL LISTENER avec RAF throttle
  // ════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const onScroll = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        const scrollTop = window.scrollY;
        const docHeight =
          document.documentElement.scrollHeight - window.innerHeight;
        const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
        setProgress(pct);
        setVisible(scrollTop > showAfter);
        rafRef.current = null;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [showAfter]);

  // ════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ════════════════════════════════════════════════════════════════════
  const scrollToTop = useCallback(() => {
    if (prefersReducedMotion) {
      window.scrollTo({ top: 0 });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [prefersReducedMotion]);

  // ════════════════════════════════════════════════════════════════════
  // TOKENS
  // ════════════════════════════════════════════════════════════════════
  const tokens = useMemo(
    () => ({
      primary: dark ? "#818CF8" : "#4F46E5",
      primaryHover: dark ? "#6366F1" : "#4338CA",
      buttonBg: dark
        ? "rgba(255,255,255,0.1)"
        : "rgba(255,255,255,0.9)",
      trackColor: dark
        ? "rgba(255,255,255,0.15)"
        : "rgba(0,0,0,0.1)",
      boxShadow: dark
        ? "0 4px 12px rgba(0,0,0,0.5)"
        : "0 4px 12px rgba(79,70,229,0.3)",
    }),
    [dark]
  );

  // ════════════════════════════════════════════════════════════════════
  // DIMENSIONS (mémoïsées pour éviter le recalcul des paths SVG)
  // ════════════════════════════════════════════════════════════════════
  const dims = useMemo(() => {
    const buttonSize = isMobile ? 44 : 50;
    const innerButtonSize = isMobile ? 34 : 40;
    const iconSize = isMobile ? 18 : 20;
    const circleRadius = buttonSize / 2 - 3;
    const circumference = 2 * Math.PI * circleRadius;
    return {
      buttonSize,
      innerButtonSize,
      iconSize,
      circleRadius,
      circumference,
      center: buttonSize / 2,
    };
  }, [isMobile]);

  // ✅ Safe-area bottom-right
  const bottomPosition = isMobile
    ? "calc(16px + env(safe-area-inset-bottom, 0px))"
    : bottom;
  const rightPosition = isMobile
    ? "calc(16px + env(safe-area-inset-right, 0px))"
    : right;

  // ✅ Classe du pulse selon dark mode
  const pulseClass = prefersReducedMotion
    ? ""
    : dark
    ? "stt-pulse-dark"
    : "stt-pulse-light";

  // ✅ Style du bouton intérieur (extrait pour clarté)
  const innerButtonStyle = {
    position: "absolute",
    top: "50%",
    left: "50%",
    background: hovered || focused ? tokens.primaryHover : tokens.primary,
    color: "#FFFFFF",
    border: "none",
    borderRadius: "50%",
    width: dims.innerButtonSize,
    height: dims.innerButtonSize,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    padding: 0,
    // ✅ transition sur background + transform
    transition: prefersReducedMotion
      ? "background 0.2s ease"
      : "background 0.2s ease, transform 0.2s ease",
    // ✅ transform combiné (centrage + scale)
    transform: `translate(-50%, -50%) scale(${
      hovered && !prefersReducedMotion ? 1.08 : 1
    })`,
    // ✅ outline visible au focus
    outline: focused ? `2px solid ${tokens.primary}` : "none",
    outlineOffset: 2,
    // ✅ Pulse appliqué via className (dark-aware + reduced-motion)
    // Ne s'applique pas si hovered (évite le double effet visuel)
    WebkitTapHighlightColor: "transparent",
  };

  return (
    <>
      {ScrollToTopKeyframes}
      <div
        // ✅ ARIA — masqué aux lecteurs d'écran quand invisible
        aria-hidden={!visible}
        style={{
          position: "fixed",
          bottom: bottomPosition,
          right: rightPosition,
          zIndex: 1000,
          opacity: visible ? 1 : 0,
          // ✅ scale seulement si pas reduced-motion
          transform:
            visible || prefersReducedMotion ? "scale(1)" : "scale(0.8)",
          transition: prefersReducedMotion
            ? "opacity 0.2s ease"
            : "opacity 0.3s ease, transform 0.3s ease",
          pointerEvents: visible ? "auto" : "none",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 4,
        }}
      >
        {/* Conteneur principal avec SVG de progression */}
        <div
          style={{
            position: "relative",
            width: dims.buttonSize,
            height: dims.buttonSize,
            borderRadius: "50%",
            background: tokens.buttonBg,
            boxShadow: tokens.boxShadow,
            // ✅ Pulse via className sur ce wrapper (pas sur le bouton intérieur)
            // → l'ombre ne rentre plus en conflit avec l'anneau SVG
          }}
        >
          {/* SVG de progression */}
          <svg
            width={dims.buttonSize}
            height={dims.buttonSize}
            style={{ position: "absolute", top: 0, left: 0 }}
            aria-hidden="true"
          >
            {/* Anneau de fond */}
            <circle
              cx={dims.center}
              cy={dims.center}
              r={dims.circleRadius}
              fill="none"
              stroke={tokens.trackColor}
              strokeWidth="3"
            />
            {/* Anneau de progression */}
            <circle
              cx={dims.center}
              cy={dims.center}
              r={dims.circleRadius}
              fill="none"
              stroke={tokens.primary}
              strokeWidth="3"
              strokeDasharray={dims.circumference}
              strokeDashoffset={
                dims.circumference * (1 - progress / 100)
              }
              strokeLinecap="round"
              transform={`rotate(-90 ${dims.center} ${dims.center})`}
              style={{
                // ✅ transition désactivée si reduced-motion
                transition: prefersReducedMotion
                  ? "none"
                  : "stroke-dashoffset 0.1s linear",
              }}
            />
          </svg>

          {/* ✅ Pulse : appliqué sur un div autour du bouton, pas sur le bouton lui-même
              → évite la collision visuelle entre box-shadow animé et l'anneau SVG */}
          <div
            className={pulseClass}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: dims.buttonSize,
              height: dims.buttonSize,
              borderRadius: "50%",
              pointerEvents: "none",
            }}
            aria-hidden="true"
          />

          {/* Bouton intérieur */}
          <button
            type="button"
            onClick={scrollToTop}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            aria-label={`Retour en haut (${Math.round(progress)}%)`}
            title="Retour en haut"
            style={innerButtonStyle}
          >
            <ChevronUp size={dims.iconSize} />
          </button>
        </div>
      </div>
    </>
  );
}