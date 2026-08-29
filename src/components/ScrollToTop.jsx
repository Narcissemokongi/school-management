import { useState, useEffect, useCallback } from "react";
import { ChevronUp } from "lucide-react";
import { useStyles } from "../styles/theme";

export function ScrollToTop() {
  const { dark } = useStyles();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0); // 0 à 100

  useEffect(() => {
    const onScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      setProgress(pct);
      setVisible(scrollTop > 300);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll(); // initialisation
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Couleurs adaptatives
  const buttonBg = dark ? "#818CF8" : "#4F46E5";
  const buttonColor = "#FFFFFF";
  const boxShadow = dark ? "0 4px 12px rgba(0,0,0,0.5)" : "0 4px 12px rgba(79,70,229,0.3)";
  const hoverBg = dark ? "#6366F1" : "#4338CA";

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
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
      {/* Barre de progression circulaire autour du bouton */}
      <div
        style={{
          position: "relative",
          width: 50,
          height: 50,
          borderRadius: "50%",
          background: dark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.9)",
          boxShadow,
          overflow: "hidden",
        }}
      >
        <svg width="50" height="50" style={{ position: "absolute", top: 0, left: 0 }}>
          <circle
            cx="25"
            cy="25"
            r="22"
            fill="none"
            stroke={dark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)"}
            strokeWidth="3"
          />
          <circle
            cx="25"
            cy="25"
            r="22"
            fill="none"
            stroke={buttonBg}
            strokeWidth="3"
            strokeDasharray={`${2 * Math.PI * 22}`}
            strokeDashoffset={`${2 * Math.PI * 22 * (1 - progress / 100)}`}
            strokeLinecap="round"
            transform="rotate(-90 25 25)"
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
            width: 40,
            height: 40,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "background 0.2s, transform 0.2s",
            animation: "pulse 2s infinite",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = hoverBg;
            e.currentTarget.style.transform = "translate(-50%, -50%) scale(1.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = buttonBg;
            e.currentTarget.style.transform = "translate(-50%, -50%) scale(1)";
          }}
        >
          <ChevronUp size={20} />
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