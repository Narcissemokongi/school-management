// src/components/GestionCoursEtNotes.jsx
import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import { GestionCours } from "./GestionCours";
import { GestionNotes } from "./GestionNotes";
import { BookOpen, BarChart3, Loader } from "lucide-react";

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
const GcnKeyframes = (
  <style>{`
    @keyframes gcn-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .gcn-spin { animation: gcn-spin 1s linear infinite; }
    @media (prefers-reduced-motion: reduce) {
      .gcn-spin { animation: none !important; }
    }
  `}</style>
);

// ════════════════════════════════════════════════════════════════════
// TAB BUTTON — feedback tap + focus ring via state React
// ════════════════════════════════════════════════════════════════════
function TabButton({
  tab, isActive, onClick, onKeyDown, tabRef,
  accentColor, inactiveTabColor, badgeBg, badgeText, isMobile,
}) {
  const [pressed, setPressed] = useState(false);
  const [focused, setFocused] = useState(false);

  return (
    <button
      ref={tabRef}
      type="button"
      onClick={onClick}
      onKeyDown={onKeyDown}
      role="tab"
      id={`tab-${tab.id}`}
      aria-selected={isActive}
      aria-controls={`panel-${tab.id}`}
      tabIndex={isActive ? 0 : -1}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        ...TAP_BASE,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        padding: isMobile ? "12px 14px" : "12px 18px",
        minHeight: isMobile ? 44 : 42,
        border: "none",
        background: "transparent",
        color: isActive ? accentColor : inactiveTabColor,
        fontWeight: isActive ? 700 : 500,
        borderBottom: isActive
          ? `3px solid ${accentColor}`
          : "3px solid transparent",
        cursor: "pointer",
        transition: "color 0.15s, border-color 0.15s, transform 0.1s",
        position: "relative",
        flexShrink: 0,
        fontSize: isMobile ? 14 : 15,
        marginBottom: -2,
        outline: "none",
        transform: pressed ? "scale(0.97)" : "scale(1)",
        borderRadius: "6px 6px 0 0",
        fontFamily: "inherit",
        ...(focused ? FOCUS_RING(accentColor) : null),
      }}
    >
      <span aria-hidden="true" style={{ display: "inline-flex" }}>
        {tab.icon}
      </span>
      <span>{tab.label}</span>
      {tab.badge !== null && tab.badge !== undefined && (
        <span
          aria-label={`${tab.badge} ${tab.badge > 1 ? "éléments" : "élément"}`}
          style={{
            minWidth: 18,
            height: 18,
            background: badgeBg,
            color: badgeText,
            borderRadius: 9,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 700,
            padding: "0 6px",
            marginLeft: 2,
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
// COMPOSANT PRINCIPAL
// ════════════════════════════════════════════════════════════════════
export function GestionCoursEtNotes({
  ecoleId, eleves, classes, user, anneeId, anneeActive,
}) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();
  const [subTab, setSubTab] = useState("cours");

  const userId = user?._id;

  // Refs pour la navigation clavier
  const tabRefs = useRef({});

  // ✅ Query cours
  const coursDisponibles = useQuery(
    api.cours.list,
    ecoleId && userId
      ? anneeId
        ? { ecoleId, anneeId, userId }
        : { ecoleId, userId }
      : "skip"
  );

  const nbCours = coursDisponibles?.length ?? 0;
  const loadingCours = coursDisponibles === undefined;

  // ✅ Couleurs mémoïsées
  const colors = useMemo(() => ({
    textPrimary: dark ? "#F1F5F9" : "#1E293B",
    textSecondary: dark ? "#94A3B8" : "#64748B",
    borderColor: dark ? "#334155" : "#E2E8F0",
    accentColor: dark ? "#818CF8" : "#4F46E5",
    inactiveTabColor: dark ? "#94A3B8" : "#64748B",
    badgeBg: dark ? "#312E81" : "#EEF2FF",
    badgeText: dark ? "#A5B4FC" : "#4F46E5",
  }), [dark]);

  const {
    textPrimary, textSecondary, borderColor, accentColor,
    inactiveTabColor, badgeBg, badgeText,
  } = colors;

  // ✅ Tabs mémoïsés (avant : recréés à chaque render)
  const tabs = useMemo(() => [
    {
      id: "cours",
      label: "Cours",
      icon: <BookOpen size={isMobile ? 16 : 17} aria-hidden="true" />,
      badge: loadingCours ? null : nbCours,
    },
    {
      id: "notes",
      label: "Notes",
      icon: <BarChart3 size={isMobile ? 16 : 17} aria-hidden="true" />,
      badge: null,
    },
  ], [isMobile, loadingCours, nbCours]);

  // ==================== NAVIGATION CLAVIER ====================
  const handleTabKeyDown = useCallback(
    (e, currentIndex) => {
      let nextIndex = null;

      if (e.key === "ArrowRight") {
        nextIndex = (currentIndex + 1) % tabs.length;
      } else if (e.key === "ArrowLeft") {
        nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      } else if (e.key === "Home") {
        nextIndex = 0;
      } else if (e.key === "End") {
        nextIndex = tabs.length - 1;
      }

      if (nextIndex !== null) {
        e.preventDefault();
        const nextTab = tabs[nextIndex];
        setSubTab(nextTab.id);
        tabRefs.current[nextTab.id]?.focus();
      }
    },
    [tabs]
  );

  // ✅ Cleanup refs au démontage
  useEffect(() => {
    const refs = tabRefs.current;
    return () => {
      Object.keys(refs).forEach((key) => delete refs[key]);
    };
  }, []);

  // ==================== RENDU ====================
  return (
    <div
      style={{
        maxWidth: 1280,
        margin: "0 auto",
        padding: isMobile ? "12px 10px 24px" : "24px 16px",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {GcnKeyframes}

      {/* ═══════════ EN-TÊTE ═══════════ */}
      <div style={{ marginBottom: isMobile ? 14 : 24 }}>
        <h2
          style={{
            fontSize: isMobile ? 17 : 22,
            fontWeight: 700,
            color: textPrimary,
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          Évaluations & Cours
        </h2>
        {!isMobile && (
          <p
            style={{
              color: textSecondary,
              marginTop: 4,
              marginBottom: 0,
              fontSize: 13.5,
            }}
          >
            Gérez les matières, notes et résultats des élèves
          </p>
        )}
      </div>

      {/* ═══════════ ONGLETS ═══════════ */}
      <div
        role="tablist"
        aria-label="Sections d'évaluation"
        style={{
          display: "flex",
          gap: 4,
          borderBottom: `2px solid ${borderColor}`,
          marginBottom: isMobile ? 14 : 20,
          overflowX: "auto",
          whiteSpace: "nowrap",
          scrollbarWidth: "none",
          ...SCROLL_AREA,
        }}
      >
        {tabs.map((t, index) => (
          <TabButton
            key={t.id}
            tab={t}
            isActive={subTab === t.id}
            onClick={() => setSubTab(t.id)}
            onKeyDown={(e) => handleTabKeyDown(e, index)}
            tabRef={(el) => {
              if (el) tabRefs.current[t.id] = el;
              else delete tabRefs.current[t.id];
            }}
            accentColor={accentColor}
            inactiveTabColor={inactiveTabColor}
            badgeBg={badgeBg}
            badgeText={badgeText}
            isMobile={isMobile}
          />
        ))}
      </div>

      {/* ═══════════ CONTENU ═══════════ */}
      {subTab === "cours" && (
        <div
          role="tabpanel"
          id="panel-cours"
          aria-labelledby="tab-cours"
          tabIndex={0}
        >
          <GestionCours
            ecoleId={ecoleId}
            classes={classes}
            user={user}
            anneeId={anneeId}
            anneeActive={anneeActive}
          />
        </div>
      )}

      {subTab === "notes" && (
        <div
          role="tabpanel"
          id="panel-notes"
          aria-labelledby="tab-notes"
          tabIndex={0}
        >
          {loadingCours ? (
            <div
              role="status"
              aria-busy="true"
              aria-live="polite"
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                padding: isMobile ? 40 : 60,
              }}
            >
              <Loader
                size={24}
                className="gcn-spin"
                style={{ color: accentColor }}
                aria-hidden="true"
              />
              <span style={{ position: "absolute", left: -9999 }}>
                Chargement des cours
              </span>
            </div>
          ) : (
            <GestionNotes
              ecoleId={ecoleId}
              eleves={eleves}
              anneeId={anneeId}
              anneeActive={anneeActive}
              user={user}
              coursDisponibles={coursDisponibles}
            />
          )}
        </div>
      )}
    </div>
  );
}