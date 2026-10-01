// src/components/GestionElevesEtClasses.jsx
import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { GestionEleves } from "./GestionEleves";
import { GestionClassesAdmin } from "./GestionClassesAdmin";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import { Loader, GraduationCap, BookOpen, Calendar } from "lucide-react";

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
// KEYFRAMES MODULE-LEVEL (rendus UNE fois, partout)
// ════════════════════════════════════════════════════════════════════
const GecKeyframes = (
  <style>{`
    @keyframes gec-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .gec-spin { animation: gec-spin 1s linear infinite; }
    @media (prefers-reduced-motion: reduce) {
      .gec-spin { animation: none !important; }
    }
  `}</style>
);

// ════════════════════════════════════════════════════════════════════
// TAB BUTTON — feedback tap + focus ring via state React
// ════════════════════════════════════════════════════════════════════
function TabButton({
  tab, isActive, onClick, onKeyDown, tabRef,
  accentColor, textSecondary, accentBg, dark, isMobile,
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
      aria-selected={isActive}
      aria-controls={`panel-${tab.id}`}
      id={`tab-${tab.id}`}
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
        gap: 6,
        padding: isMobile ? "12px 14px" : "12px 18px",
        minHeight: isMobile ? 44 : 42,
        border: "none",
        background: "transparent",
        color: isActive ? accentColor : textSecondary,
        fontWeight: isActive ? 700 : 500,
        borderBottom: isActive
          ? `3px solid ${accentColor}`
          : "3px solid transparent",
        cursor: "pointer",
        fontSize: isMobile ? 14 : 15,
        flexShrink: 0,
        marginBottom: -2,
        outline: "none",
        borderRadius: "6px 6px 0 0",
        transform: pressed ? "scale(0.97)" : "scale(1)",
        transition: "color 0.15s, border-color 0.15s, transform 0.1s",
        fontFamily: "inherit",
        ...(focused ? FOCUS_RING(accentColor) : null),
      }}
    >
      <span aria-hidden="true" style={{ display: "inline-flex" }}>
        {tab.icon}
      </span>
      <span>{tab.label}</span>
      {tab.badge !== undefined && tab.badge > 0 && (
        <span
          aria-label={`${tab.badge} ${tab.badge > 1 ? "éléments" : "élément"}`}
          style={{
            minWidth: 20,
            height: 18,
            background: isActive ? accentBg : (dark ? "#334155" : "#F1F5F9"),
            color: isActive ? accentColor : textSecondary,
            borderRadius: 9,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 10.5,
            fontWeight: 700,
            padding: "0 6px",
            marginLeft: 2,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          <span aria-hidden="true">{tab.badge > 999 ? "999+" : tab.badge}</span>
        </span>
      )}
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ════════════════════════════════════════════════════════════════════
export function GestionElevesEtClasses({
  ecoleId, user, anneeId, anneeActive,
}) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();
  const [subTab, setSubTab] = useState("eleves");

  const tabRefs = useRef({});

  // ✅ Couleurs mémoïsées
  const colors = useMemo(() => ({
    textPrimary: dark ? "#F1F5F9" : "#1E293B",
    textSecondary: dark ? "#94A3B8" : "#64748B",
    cardBg: dark ? "#1E293B" : "#FFFFFF",
    cardBorder: dark ? "#334155" : "#E2E8F0",
    accent: dark ? "#818CF8" : "#4F46E5",
    accentBg: dark ? "#312E81" : "#EEF2FF",
    warning: "#F59E0B",
    warningBg: dark ? "#78350F" : "#FEF3C7",
    shadow: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)",
  }), [dark]);

  const {
    textPrimary, textSecondary, cardBg, cardBorder,
    accent, accentBg, warning, warningBg, shadow,
  } = colors;

  // ============================================================
  // QUERIES
  // ============================================================
  const classesQuery = useQuery(
    api.classes.list,
    ecoleId ? { ecoleId, anneeId: anneeId || undefined, userId: user?._id } : "skip"
  );
  const elevesQuery = useQuery(
    api.eleves.list,
    ecoleId ? { ecoleId, anneeId: anneeId || undefined, userId: user?._id } : "skip"
  );
  const enseignantsRaw = useQuery(
    api.users.listEnseignantsByEcole,
    ecoleId && user?._id ? { ecoleId, userId: user._id } : "skip"
  );

  const classes = useMemo(() => classesQuery ?? [], [classesQuery]);
  const eleves = useMemo(() => elevesQuery ?? [], [elevesQuery]);
  const enseignants = useMemo(() => enseignantsRaw ?? [], [enseignantsRaw]);
  const loading = classesQuery === undefined || elevesQuery === undefined;

  // Mutations
  const addEleve = useMutation(api.eleves.add);
  const removeEleve = useMutation(api.eleves.remove);
  const importEleves = useMutation(api.eleves.importEleves);
  const updateEleveClasseMutation = useMutation(api.classes.updateEleveClasse);

  // Tri des classes
  const sortedClasses = useMemo(() => {
    return [...classes].sort((a, b) =>
      a.nom.localeCompare(b.nom, undefined, { numeric: true, sensitivity: "base" })
    );
  }, [classes]);

  // ✅ Tabs mémoïsés
  const tabs = useMemo(() => [
    {
      id: "eleves",
      label: "Élèves",
      icon: <GraduationCap size={16} aria-hidden="true" />,
      badge: eleves.length,
    },
    {
      id: "classes",
      label: "Classes",
      icon: <BookOpen size={16} aria-hidden="true" />,
      badge: sortedClasses.length,
    },
  ], [eleves.length, sortedClasses.length]);

  // ==================== NAVIGATION CLAVIER ====================
  const handleTabKeyDown = useCallback(
    (e, currentIndex) => {
      let nextIndex = null;
      if (e.key === "ArrowRight") nextIndex = (currentIndex + 1) % tabs.length;
      else if (e.key === "ArrowLeft") nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      else if (e.key === "Home") nextIndex = 0;
      else if (e.key === "End") nextIndex = tabs.length - 1;

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

  // ✅ Callback stable pour updateEleveClasse
  const updateEleveClasse = useCallback(
    (eleveId, newClasseNom) => {
      return updateEleveClasseMutation({
        eleveId,
        newClasseNom,
        anneeId,
        userId: user._id,
      });
    },
    [updateEleveClasseMutation, anneeId, user._id]
  );

  // ============================================================
  // ÉTATS PRÉCOCES
  // ============================================================

  // Pas d'année active
  if (!anneeId) {
    return (
      <>
        {GecKeyframes}
        <div
          style={{
            maxWidth: 1280, margin: "0 auto",
            padding: isMobile ? "10px 8px 24px" : "20px 16px 32px",
            width: "100%", boxSizing: "border-box",
          }}
        >
          <div
            role="status"
            aria-live="polite"
            style={{
              maxWidth: 520, margin: "0 auto",
              padding: isMobile ? "40px 16px" : "60px 24px",
              textAlign: "center",
            }}
          >
            <div
              aria-hidden="true"
              style={{
                width: 64, height: 64, borderRadius: "50%",
                background: warningBg,
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <Calendar size={30} color={warning} />
            </div>
            <h2
              style={{
                fontSize: isMobile ? 17 : 20, fontWeight: 700,
                color: textPrimary, margin: "0 0 6px",
              }}
            >
              Aucune année scolaire active
            </h2>
            <p
              style={{
                color: textSecondary, fontSize: isMobile ? 13 : 14,
                margin: 0, maxWidth: 400,
                marginLeft: "auto", marginRight: "auto",
              }}
            >
              Veuillez créer ou activer une année scolaire dans les paramètres.
            </p>
          </div>
        </div>
      </>
    );
  }

  // Loading
  if (loading) {
    return (
      <>
        {GecKeyframes}
        <div
          role="status"
          aria-busy="true"
          aria-live="polite"
          style={{
            display: "flex", justifyContent: "center", alignItems: "center", minHeight: 300,
          }}
        >
          <Loader
            size={32}
            className="gec-spin"
            style={{ color: accent }}
            aria-hidden="true"
          />
          <span style={{ position: "absolute", left: -9999 }}>
            Chargement des élèves et classes
          </span>
        </div>
      </>
    );
  }

  // ============================================================
  // RENDU PRINCIPAL
  // ============================================================
  return (
    <div
      style={{
        maxWidth: 1280, margin: "0 auto",
        padding: isMobile ? "10px 8px 24px" : "20px 16px 32px",
        width: "100%", boxSizing: "border-box",
      }}
    >
      {GecKeyframes}

      {/* ==================== EN-TÊTE ==================== */}
      <div style={{ marginBottom: isMobile ? 12 : 20 }}>
        <h2
          style={{
            fontSize: isMobile ? 17 : 22, fontWeight: 700,
            color: textPrimary, margin: 0, lineHeight: 1.2,
          }}
        >
          Scolarité
        </h2>
        <p
          style={{
            color: textSecondary, marginTop: 2, marginBottom: 0,
            fontSize: isMobile ? 11.5 : 13,
          }}
        >
          {eleves.length} élève{eleves.length > 1 ? "s" : ""} ·{" "}
          {sortedClasses.length} classe{sortedClasses.length > 1 ? "s" : ""}
          {anneeActive ? ` · ${anneeActive.nom}` : ""}
        </p>
      </div>

      {/* ==================== TABS ==================== */}
      <div
        role="tablist"
        aria-label="Sections de scolarité"
        style={{
          display: "flex", gap: 4,
          borderBottom: `2px solid ${cardBorder}`,
          marginBottom: isMobile ? 14 : 20,
          overflowX: "auto", whiteSpace: "nowrap",
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
            accentColor={accent}
            textSecondary={textSecondary}
            accentBg={accentBg}
            dark={dark}
            isMobile={isMobile}
          />
        ))}
      </div>

      {/* ==================== CONTENU ==================== */}
      {subTab === "eleves" && (
        <div
          role="tabpanel"
          id="panel-eleves"
          aria-labelledby="tab-eleves"
          tabIndex={0}
        >
          <GestionEleves
            eleves={eleves}
            addEleve={addEleve}
            removeEleve={removeEleve}
            importEleves={importEleves}
            classes={sortedClasses}
            ecoleId={ecoleId}
            user={user}
            anneeId={anneeId}
          />
        </div>
      )}

      {subTab === "classes" && (
        <div
          role="tabpanel"
          id="panel-classes"
          aria-labelledby="tab-classes"
          tabIndex={0}
        >
          <GestionClassesAdmin
            classes={sortedClasses}
            ecoleId={ecoleId}
            userId={user._id}
            eleves={eleves}
            anneeId={anneeId}
            enseignants={enseignants}
            updateEleveClasse={updateEleveClasse}
          />
        </div>
      )}
    </div>
  );
}