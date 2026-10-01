// src/components/Navigation.jsx
import { useState, useRef, useEffect, useCallback } from "react";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import { ChevronLeft, ChevronRight } from "lucide-react";

// ════════════════════════════════════════════════════════════════════
// CONSTANTES MODULE-LEVEL
// ════════════════════════════════════════════════════════════════════
const TAP_BASE = {
  touchAction: "manipulation",
  WebkitTapHighlightColor: "transparent",
};

const SCROLL_AREA = {
  overscrollBehavior: "contain",
  WebkitOverflowScrolling: "touch",
};

const FOCUS_RING = (color) => ({
  outline: `2px solid ${color}`,
  outlineOffset: 2,
});

// ════════════════════════════════════════════════════════════════════
// KEYFRAMES MODULE-LEVEL (rendus UNE fois)
// ════════════════════════════════════════════════════════════════════
const NavigationKeyframes = (
  <style>{`
    @keyframes nav-fadeInScale {
      from { transform: scaleX(0); opacity: 0; }
      to   { transform: scaleX(1); opacity: 1; }
    }
    .nav-active-indicator {
      animation: nav-fadeInScale 0.3s ease;
    }
    .nav-scroll-container::-webkit-scrollbar {
      display: none;
    }
    @media (prefers-reduced-motion: reduce) {
      .nav-active-indicator { animation: none !important; }
    }
  `}</style>
);

// ════════════════════════════════════════════════════════════════════
// PRESSABLE — feedback tap + focus ring via state React
// ════════════════════════════════════════════════════════════════════
function Pressable({
  onClick, style, children, disabled = false, type = "button",
  focusColor, ariaLabel, ariaCurrent, title, ...rest
}) {
  const [pressed, setPressed] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-current={ariaCurrent}
      title={title}
      onPointerDown={() => !disabled && setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => { setPressed(false); setHovered(false); }}
      onPointerCancel={() => setPressed(false)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        ...TAP_BASE,
        transform: pressed && !disabled ? "scale(0.97)" : "scale(1)",
        transition:
          "transform 0.12s ease, background-color 0.2s, border-color 0.2s, color 0.2s",
        ...(focused && !disabled && focusColor ? FOCUS_RING(focusColor) : null),
        ...style,
      }}
      {...rest}
      data-hovered={hovered ? "true" : undefined}
      data-active={pressed ? "true" : undefined}
    >
      {children}
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════
// DESKTOP TAB — state React pour hover
// ════════════════════════════════════════════════════════════════════
function DesktopTab({ tab, isActive, onSelect, colors, dark }) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);

  const showHoverBg = hovered && !isActive;
  const hoverBg = dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)";

  return (
    <button
      type="button"
      onClick={() => onSelect(tab.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false); }}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      aria-current={isActive ? "page" : undefined}
      style={{
        ...TAP_BASE,
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "12px 20px",
        minHeight: 44,
        border: "none",
        background: showHoverBg ? hoverBg : "transparent",
        color: isActive ? colors.accentColor : colors.textSecondary,
        fontWeight: isActive ? 600 : 400,
        borderBottom: isActive
          ? `3px solid ${colors.accentColor}`
          : "3px solid transparent",
        cursor: "pointer",
        transition: "color 0.2s, border-color 0.2s, background 0.2s",
        whiteSpace: "nowrap",
        position: "relative",
        borderRadius: "0 0 8px 8px",
        outline: "none",
        ...(focused ? FOCUS_RING(colors.accentColor) : null),
        ...(pressed ? { transform: "scale(0.97)" } : null),
      }}
    >
      <span aria-hidden="true" style={{ display: "inline-flex" }}>{tab.icon}</span>
      <span>{tab.label}</span>
      {tab.badge !== undefined && tab.badge > 0 && (
        <span
          aria-label={`${tab.badge} notification${tab.badge > 1 ? "s" : ""}`}
          style={{
            position: "absolute",
            top: 4,
            right: 6,
            background: colors.badgeBg,
            color: colors.badgeText,
            borderRadius: "50%",
            minWidth: 18,
            height: 18,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 700,
            padding: "0 4px",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          <span aria-hidden="true">{tab.badge}</span>
        </span>
      )}
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════
// MOBILE TAB — state React pour hover
// ════════════════════════════════════════════════════════════════════
function MobileTab({ tab, isActive, onSelect, colors, dark }) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);

  const showHoverBg = hovered && !isActive;
  const hoverBg = dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)";

  return (
    <button
      type="button"
      onClick={() => onSelect(tab.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false); }}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      aria-current={isActive ? "page" : undefined}
      style={{
        ...TAP_BASE,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        background: showHoverBg ? hoverBg : "none",
        border: "none",
        color: isActive ? colors.accentColor : colors.textSecondary,
        fontWeight: isActive ? 600 : 400,
        fontSize: 10,
        cursor: "pointer",
        padding: "6px 8px",
        minHeight: 44,
        borderRadius: 8,
        transition: "background-color 0.2s, color 0.2s",
        flex: 1,
        position: "relative",
        minWidth: 0,
        outline: "none",
        ...(focused ? FOCUS_RING(colors.accentColor) : null),
        ...(pressed ? { transform: "scale(0.95)" } : null),
      }}
    >
      <span
        aria-hidden="true"
        style={{ fontSize: 22, lineHeight: 1, display: "inline-flex" }}
      >
        {tab.icon}
      </span>
      <span
        style={{
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          maxWidth: "100%",
        }}
      >
        {tab.label}
      </span>
      {tab.badge !== undefined && tab.badge > 0 && (
        <span
          aria-label={`${tab.badge} notification${tab.badge > 1 ? "s" : ""}`}
          style={{
            position: "absolute",
            top: 0,
            right: "15%",
            background: colors.badgeBg,
            color: colors.badgeText,
            borderRadius: "50%",
            minWidth: 16,
            height: 16,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 10,
            fontWeight: 700,
            padding: "0 3px",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          <span aria-hidden="true">{tab.badge}</span>
        </span>
      )}
      {isActive && (
        <div
          className="nav-active-indicator"
          aria-hidden="true"
          style={{
            position: "absolute",
            bottom: -2,
            left: "25%",
            right: "25%",
            height: 3,
            background: colors.accentColor,
            borderRadius: "2px",
          }}
        />
      )}
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════
// SCROLL ARROW (desktop) — 44×44 pour WCAG
// ════════════════════════════════════════════════════════════════════
function ScrollArrow({ direction, onClick, colors }) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);

  const isLeft = direction === "left";
  const Icon = isLeft ? ChevronLeft : ChevronRight;
  const label = isLeft ? "Défiler à gauche" : "Défiler à droite";

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
      aria-label={label}
      style={{
        ...TAP_BASE,
        position: "absolute",
        [isLeft ? "left" : "right"]: 0,
        zIndex: 10,
        background: colors.cardBg,
        border: `1px solid ${colors.borderColor}`,
        borderRadius: "50%",
        width: 44,
        height: 44,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        color: colors.textSecondary,
        boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
        transform: pressed ? "scale(0.94)" : "scale(1)",
        transition: "transform 0.1s ease, background-color 0.15s",
        backgroundColor: hovered ? colors.cardBg : colors.cardBg,
        ...(focused ? FOCUS_RING(colors.accentColor) : null),
      }}
    >
      <Icon size={18} aria-hidden="true" />
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ════════════════════════════════════════════════════════════════════
export function Navigation({ tabs, active, onChange }) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();
  const scrollContainerRef = useRef(null);
  const rafRef = useRef(null);
  const scrollTimeoutRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // ════════════════════════════════════════════════════════════════════
  // prefers-reduced-motion (fallback Safari < 14)
  // ════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const handler = (e) => setPrefersReducedMotion(e.matches);
    if (mq.addEventListener) {
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    } else if (mq.addListener) {
      mq.addListener(handler);
      return () => mq.removeListener(handler);
    }
  }, []);

  // ===== Mise à jour throttlée via RAF =====
  const updateScrollIndicators = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const el = scrollContainerRef.current;
      if (!el) return;
      setCanScrollLeft(el.scrollLeft > 0);
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 5);
    });
  }, []);

  useEffect(() => {
    updateScrollIndicators();
    window.addEventListener("resize", updateScrollIndicators);
    return () => {
      window.removeEventListener("resize", updateScrollIndicators);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, [updateScrollIndicators, tabs.length]);

  // ════════════════════════════════════════════════════════════════════
  // scrollBy — respecte prefers-reduced-motion
  // ════════════════════════════════════════════════════════════════════
  const scrollBy = useCallback((direction) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollBy({
      left: direction * 200,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(updateScrollIndicators, 300);
  }, [prefersReducedMotion, updateScrollIndicators]);

  // Couleurs adaptatives
  const colors = {
    textSecondary: dark ? "#94A3B8" : "#64748B",
    borderColor: dark ? "#334155" : "#E2E8F0",
    accentColor: dark ? "#818CF8" : "#4F46E5",
    cardBg: dark ? "#1E293B" : "#FFFFFF",
    shadowColor: dark
      ? "0 -2px 10px rgba(0,0,0,0.3)"
      : "0 -2px 10px rgba(0,0,0,0.05)",
    badgeBg: "#EF4444",
    badgeText: "#FFFFFF",
  };

  // ════════════════════════════════════════════════════════════════════
  // VARIANTE DESKTOP
  // ════════════════════════════════════════════════════════════════════
  if (!isMobile) {
    return (
      <>
        {NavigationKeyframes}
        <nav
          aria-label="Navigation par onglets"
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          {canScrollLeft && (
            <ScrollArrow
              direction="left"
              onClick={() => scrollBy(-1)}
              colors={colors}
            />
          )}

          <div
            ref={scrollContainerRef}
            className="nav-scroll-container"
            onScroll={updateScrollIndicators}
            style={{
              display: "flex",
              gap: 0,
              borderBottom: `2px solid ${colors.borderColor}`,
              overflowX: "auto",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              ...SCROLL_AREA,
              padding: "0 20px",
              width: "100%",
            }}
          >
            {tabs.map((tab) => (
              <DesktopTab
                key={tab.id}
                tab={tab}
                isActive={active === tab.id}
                onSelect={onChange}
                colors={colors}
                dark={dark}
              />
            ))}
          </div>

          {canScrollRight && (
            <ScrollArrow
              direction="right"
              onClick={() => scrollBy(1)}
              colors={colors}
            />
          )}
        </nav>
      </>
    );
  }

  // ════════════════════════════════════════════════════════════════════
  // VARIANTE MOBILE
  // ════════════════════════════════════════════════════════════════════
  return (
    <>
      {NavigationKeyframes}
      <nav
        aria-label="Navigation mobile"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: dark
            ? "rgba(30,41,59,0.95)"
            : "rgba(255,255,255,0.95)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          borderTop: `1px solid ${colors.borderColor}`,
          display: "flex",
          justifyContent: "space-around",
          alignItems: "stretch",
          padding: "6px 0",
          paddingBottom: "calc(6px + env(safe-area-inset-bottom, 0px))",
          zIndex: 100,
          boxShadow: colors.shadowColor,
          transition: "background-color 0.3s, backdrop-filter 0.3s",
          minHeight: 64,
          overscrollBehavior: "contain",
        }}
      >
        {tabs.map((tab) => (
          <MobileTab
            key={tab.id}
            tab={tab}
            isActive={active === tab.id}
            onSelect={onChange}
            colors={colors}
            dark={dark}
          />
        ))}
      </nav>
    </>
  );
}