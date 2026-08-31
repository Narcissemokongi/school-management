import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronUp } from "lucide-react";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile"; // <-- Import du hook

export function ScrollToTop({
  bottom = 24,
  right = 24,
  showAfter = 300,
}) {
  const { dark } = useStyles();
  const isMobile = useIsMobile(); // Détection mobile
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const rafRef = useRef(null);
  const prefersReducedMotion = useRef(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    prefersReducedMotion.current = mediaQuery.matches;
    const handleChange = (e) => { prefersReducedMotion.current = e.matches; };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    const onScroll = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
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

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Styles adaptatifs
  const buttonSize = isMobile ? 44 : 50;
  const innerButtonSize = isMobile ? 34 : 40;
  const iconSize = isMobile ? 18 : 20;
  const bottomPosition = isMobile ? 16 : bottom;
  const rightPosition = isMobile ? 16 : right;
  const borderRadius = buttonSize / 2;
  const circleRadius = (buttonSize / 2) - 3; // rayon de l'anneau de progression

  const buttonBg = dark ? "#818CF8" : "#4F46E5";
  const buttonColor = "#FFFFFF";
  const boxShadow = dark ? "0 4px 12px rgba(0,0,0,0.5)" : "0 4px 12px rgba(79,70,229,0.3)";
  const hoverBg = dark ? "#6366F1" : "#4338CA";
  const trackColor = dark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)";

  return (
    <div
      style={{
        position: "fixed",
        bottom: bottomPosition,
        right: rightPosition,
        zIndex: 1000,
        opacity: visible ? 1 : 0,
        transform: visible ? "scale(1)" : "scale(0.8)",
        transition: "opacity 0.3s ease, transform 0.3s ease",
        pointerEvents: visible ? "auto" : "none",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
      }}
    >
      <div
        style={{
          position: "relative",
          width: buttonSize,
          height: buttonSize,
          borderRadius: "50%",
          background: dark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.9)",
          boxShadow,
          overflow: "hidden",
        }}
      >
        <svg width={buttonSize} height={buttonSize} style={{ position: "absolute", top: 0, left: 0 }}>
          <circle
            cx={buttonSize / 2}
            cy={buttonSize / 2}
            r={circleRadius}
            fill="none"
            stroke={trackColor}
            strokeWidth="3"
          />
          <circle
            cx={buttonSize / 2}
            cy={buttonSize / 2}
            r={circleRadius}
            fill="none"
            stroke={buttonBg}
            strokeWidth="3"
            strokeDasharray={`${2 * Math.PI * circleRadius}`}
            strokeDashoffset={`${2 * Math.PI * circleRadius * (1 - progress / 100)}`}
            strokeLinecap="round"
            transform={`rotate(-90 ${buttonSize / 2} ${buttonSize / 2})`}
            style={{ transition: "stroke-dashoffset 0.1s linear" }}
          />
        </svg>
        <button
          onClick={scrollToTop}
          aria-label="Retour en haut de la page"
          title="Retour en haut"
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: buttonBg,
            color: buttonColor,
            border: "none",
            borderRadius: "50%",
            width: innerButtonSize,
            height: innerButtonSize,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "background 0.2s, transform 0.2s",
            animation: prefersReducedMotion.current ? "none" : "pulse 2s infinite",
            outline: "none",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = hoverBg;
            e.currentTarget.style.transform = "translate(-50%, -50%) scale(1.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = buttonBg;
            e.currentTarget.style.transform = "translate(-50%, -50%) scale(1)";
          }}
          onFocus={(e) => {
            e.currentTarget.style.outline = `2px solid ${buttonBg}`;
            e.currentTarget.style.outlineOffset = "2px";
          }}
          onBlur={(e) => {
            e.currentTarget.style.outline = "none";
          }}
        >
          <ChevronUp size={iconSize} />
        </button>
      </div>
      <style>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(79,70,229,0.4); }
          70% { box-shadow: 0 0 0 10px rgba(79,70,229,0); }
          100% { box-shadow: 0 0 0 0 rgba(79,70,229,0); }
        }
      `}</style>
    </div>
  );
}