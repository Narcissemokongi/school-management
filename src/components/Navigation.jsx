import { useRef, useEffect } from "react";
import { useStyles } from "../styles/theme";
import { useIsMobile } from "../hooks/useIsMobile";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function Navigation({ tabs, active, onChange }) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();
  const scrollContainerRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Mise à jour des indicateurs de défilement
  const updateScrollIndicators = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 5);
  };

  useEffect(() => {
    updateScrollIndicators();
    window.addEventListener("resize", updateScrollIndicators);
    return () => window.removeEventListener("resize", updateScrollIndicators);
  }, [tabs.length]);

  const scrollBy = (direction) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * 200, behavior: "smooth" });
    setTimeout(updateScrollIndicators, 300);
  };

  // Couleurs adaptatives
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const borderColor = dark ? "#334155" : "#E2E8F0";
  const accentColor = dark ? "#818CF8" : "#4F46E5";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const shadowColor = dark
    ? "0 -2px 10px rgba(0,0,0,0.3)"
    : "0 -2px 10px rgba(0,0,0,0.05)";
  const badgeBg = "#EF4444";
  const badgeText = "#FFFFFF";

  // ====== Variante desktop ======
  if (!isMobile) {
    return (
      <div style={{ position: "relative", display: "flex", alignItems: "center", marginBottom: 24 }}>
        {/* Bouton gauche */}
        {canScrollLeft && (
          <button
            onClick={() => scrollBy(-1)}
            aria-label="Défiler à gauche"
            style={{
              position: "absolute",
              left: 0,
              zIndex: 10,
              background: cardBg,
              border: `1px solid ${borderColor}`,
              borderRadius: "50%",
              width: 28,
              height: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: textSecondary,
              boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
            }}
          >
            <ChevronLeft size={16} />
          </button>
        )}
        {/* Conteneur défilant */}
        <div
          ref={scrollContainerRef}
          onScroll={updateScrollIndicators}
          style={{
            display: "flex",
            gap: 0,
            borderBottom: `2px solid ${borderColor}`,
            overflowX: "auto",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            WebkitOverflowScrolling: "touch",
            padding: "0 20px",
            width: "100%",
          }}
        >
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => onChange(t.id)}
              aria-current={active === t.id ? "page" : undefined}
              title={t.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "12px 20px",
                border: "none",
                background: "transparent",
                color: active === t.id ? accentColor : textSecondary,
                fontWeight: active === t.id ? 600 : 400,
                borderBottom: active === t.id ? `3px solid ${accentColor}` : "3px solid transparent",
                cursor: "pointer",
                transition: "color 0.2s, border-color 0.2s, background 0.2s",
                whiteSpace: "nowrap",
                position: "relative",
                borderRadius: "0 0 8px 8px",
              }}
              onMouseEnter={(e) => {
                if (active !== t.id) e.currentTarget.style.background = dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              {t.icon}
              <span>{t.label}</span>
              {t.badge !== undefined && t.badge > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: 4,
                    right: 6,
                    background: badgeBg,
                    color: badgeText,
                    borderRadius: "50%",
                    minWidth: 18,
                    height: 18,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "0 4px",
                  }}
                >
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>
        {/* Bouton droit */}
        {canScrollRight && (
          <button
            onClick={() => scrollBy(1)}
            aria-label="Défiler à droite"
            style={{
              position: "absolute",
              right: 0,
              zIndex: 10,
              background: cardBg,
              border: `1px solid ${borderColor}`,
              borderRadius: "50%",
              width: 28,
              height: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: textSecondary,
              boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
            }}
          >
            <ChevronRight size={16} />
          </button>
        )}
        {/* Masquer la scrollbar sur Chrome/Safari/Edge */}
        <style>{`
          div::-webkit-scrollbar {
            display: none;
          }
        `}</style>
      </div>
    );
  }

  // ====== Variante mobile ======
  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: dark ? "rgba(30,41,59,0.95)" : "rgba(255,255,255,0.95)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        borderTop: `1px solid ${borderColor}`,
        display: "flex",
        justifyContent: "space-around",
        alignItems: "stretch",
        padding: "6px 0",
        zIndex: 100,
        boxShadow: shadowColor,
        transition: "background-color 0.3s, backdrop-filter 0.3s",
        height: "64px",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          aria-current={active === t.id ? "page" : undefined}
          title={t.label}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
            background: "none",
            border: "none",
            color: active === t.id ? accentColor : textSecondary,
            fontWeight: active === t.id ? 600 : 400,
            fontSize: 10,
            cursor: "pointer",
            padding: "4px 8px",
            borderRadius: 8,
            transition: "all 0.2s",
            flex: 1,
            position: "relative",
            minWidth: 0,
          }}
          onMouseEnter={(e) => {
            if (active !== t.id) e.currentTarget.style.background = dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          <span style={{ fontSize: 22, lineHeight: 1 }}>{t.icon}</span>
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: "100%",
            }}
          >
            {t.label}
          </span>
          {t.badge !== undefined && t.badge > 0 && (
            <span
              style={{
                position: "absolute",
                top: 0,
                right: "15%",
                background: badgeBg,
                color: badgeText,
                borderRadius: "50%",
                minWidth: 16,
                height: 16,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10,
                fontWeight: 700,
                padding: "0 3px",
              }}
            >
              {t.badge}
            </span>
          )}
          {/* Indicateur actif */}
          {active === t.id && (
            <div
              style={{
                position: "absolute",
                bottom: -2,
                left: "25%",
                right: "25%",
                height: 3,
                background: accentColor,
                borderRadius: "2px",
                animation: "fadeInScale 0.3s ease",
              }}
            />
          )}
        </button>
      ))}
      <style>{`
        @keyframes fadeInScale {
          from { transform: scaleX(0); opacity: 0; }
          to { transform: scaleX(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}