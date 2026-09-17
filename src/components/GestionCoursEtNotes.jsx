import { useState, useRef, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import { GestionCours } from "./GestionCours";
import { GestionNotes } from "./GestionNotes";
import { BookOpen, BarChart3, Loader } from "lucide-react";

export function GestionCoursEtNotes({
  ecoleId,
  eleves,
  classes,
  user,
  anneeId,
  anneeActive,
}) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();
  const [subTab, setSubTab] = useState("cours");

  const userId = user?._id;

  // Refs pour la navigation clavier entre onglets
  const tabRefs = useRef({});

  // ✅ userId ajouté sur la query
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

  const tabs = [
    {
      id: "cours",
      label: "Cours",
      icon: <BookOpen size={isMobile ? 16 : 17} />,
      badge: loadingCours ? null : nbCours,
    },
    {
      id: "notes",
      label: "Notes",
      icon: <BarChart3 size={isMobile ? 16 : 17} />,
      badge: null,
    },
  ];

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
        // Focus le nouvel onglet
        tabRefs.current[nextTab.id]?.focus();
      }
    },
    [tabs.length]
  );

  // ==================== COULEURS ====================
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const borderColor = dark ? "#334155" : "#E2E8F0";
  const accentColor = dark ? "#818CF8" : "#4F46E5";
  const inactiveTabColor = dark ? "#94A3B8" : "#64748B";
  const badgeBg = dark ? "#312E81" : "#EEF2FF";
  const badgeText = dark ? "#A5B4FC" : "#4F46E5";

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
      {/* Keyframes préfixés gcn-* (Gestion Cours & Notes) */}
      <style>{`
        @keyframes gcn-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .gcn-spin { animation: gcn-spin 1s linear infinite; }
        @media (prefers-reduced-motion: reduce) {
          .gcn-spin { animation: none !important; }
        }
      `}</style>

      {/* ==================== EN-TÊTE ==================== */}
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

      {/* ==================== ONGLETS ==================== */}
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
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
        }}
      >
        {tabs.map((t, index) => {
          const isActive = subTab === t.id;
          return (
            <button
              key={t.id}
              ref={(el) => {
                // ✅ Callback de cleanup propre
                if (el) {
                  tabRefs.current[t.id] = el;
                } else {
                  delete tabRefs.current[t.id];
                }
              }}
              onClick={() => setSubTab(t.id)}
              onKeyDown={(e) => handleTabKeyDown(e, index)}
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={isActive}
              aria-controls={`panel-${t.id}`}
              tabIndex={isActive ? 0 : -1}
              style={{
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
                transition: "color 0.15s, border-color 0.15s",
                position: "relative",
                flexShrink: 0,
                fontSize: isMobile ? 14 : 15,
                marginBottom: -2,
                outline: "none",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              {t.icon}
              <span>{t.label}</span>
              {t.badge !== null && t.badge !== undefined && (
                <span
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
                  }}
                >
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ==================== CONTENU ==================== */}
      {subTab === "cours" && (
        <div
          role="tabpanel"
          id="panel-cours"
          aria-labelledby="tab-cours"
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
        >
          {loadingCours ? (
            <div
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
              />
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