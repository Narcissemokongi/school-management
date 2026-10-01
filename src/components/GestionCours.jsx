// src/components/GestionCours.jsx
import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useConfirm } from "@/hooks/useConfirm";
import { ConfirmDialog } from "./ConfirmDialog";
import {
  Plus, BookOpen, Loader, Search,
  ChevronRight, X, SlidersHorizontal, RotateCcw,
} from "lucide-react";
import toast from "react-hot-toast";
import { AddCoursModal, DetailCoursModal } from "./CoursModals";
import { Fab } from "./ui/Fab";

// ════════════════════════════════════════════════════════════════════
// SAFE-AREA
// ════════════════════════════════════════════════════════════════════
const SAFE_TOP = "env(safe-area-inset-top, 0px)";
const SAFE_BOTTOM = "env(safe-area-inset-bottom, 0px)";
const SAFE_LEFT = "env(safe-area-inset-left, 0px)";
const SAFE_RIGHT = "env(safe-area-inset-right, 0px)";

const MOBILE_TAP = 44;

// ════════════════════════════════════════════════════════════════════
// KEYFRAMES module-level
// ════════════════════════════════════════════════════════════════════
const GestionCoursKeyframes = (
  <style>{`
    @keyframes gc-spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
    @keyframes gc-slideUp {
      from { transform: translateY(100%); }
      to   { transform: translateY(0); }
    }
    @keyframes gc-fadeIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    .gc-spin { animation: gc-spin 1s linear infinite; }
    .gc-slideUp { animation: gc-slideUp 0.25s cubic-bezier(0.22, 1, 0.36, 1); }
    .gc-fadeIn { animation: gc-fadeIn 0.18s ease-out; }
    @media (prefers-reduced-motion: reduce) {
      .gc-spin, .gc-slideUp, .gc-fadeIn { animation: none !important; }
    }
  `}</style>
);

// ════════════════════════════════════════════════════════════════════
// HELPER ERREUR
// ════════════════════════════════════════════════════════════════════
function extractErrMsg(err, fallback = "Erreur inconnue") {
  if (!err) return fallback;
  if (typeof err === "string") return err;
  if (typeof err === "object" && err.message) return err.message;
  return fallback;
}

// ════════════════════════════════════════════════════════════════════
// BOUTON FERMER — ✨ zone 44×44px
// ════════════════════════════════════════════════════════════════════
function CloseButton({ onClick, dark, ariaLabel = "Fermer" }) {
  const [pressed, setPressed] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      onTouchCancel={() => setPressed(false)}
      aria-label={ariaLabel}
      title={ariaLabel}
      style={{
        background: "transparent",
        border: "none",
        cursor: "pointer",
        color: dark ? "#94A3B8" : "#64748B",
        padding: 0,
        minWidth: MOBILE_TAP,
        minHeight: MOBILE_TAP,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 8,
        transform: pressed ? "scale(0.9)" : "scale(1)",
        transition: "transform 0.1s ease",
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation",
      }}
    >
      <X size={22} />
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════
// CARTE COURS — ✨ refactorée avec state React
// ════════════════════════════════════════════════════════════════════
function CoursCard({ cours, dark, isMobile, onClick }) {
  const [pressed, setPressed] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  };

  const handleTouchStart = () => setPressed(true);
  const handleTouchEnd = () => setPressed(false);
  const handleTouchCancel = () => setPressed(false);

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => !isMobile && setHovered(true)}
      onMouseLeave={() => !isMobile && setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      style={{
        background: dark ? "#1E293B" : "#FFFFFF",
        borderRadius: 12,
        padding: isMobile ? "10px 12px" : "12px 14px",
        boxShadow: dark
          ? "0 1px 2px rgba(0,0,0,0.25)"
          : "0 1px 2px rgba(0,0,0,0.04)",
        border: `1px solid ${
          focused
            ? dark
              ? "#818CF8"
              : "#4F46E5"
            : dark
            ? "#334155"
            : "#E2E8F0"
        }`,
        display: "flex",
        alignItems: "center",
        gap: isMobile ? 10 : 12,
        cursor: "pointer",
        transition: "border-color 0.15s ease, transform 0.1s ease",
        userSelect: "none",
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation",
        minWidth: 0,
        boxSizing: "border-box",
        minHeight: isMobile ? 60 : undefined,
        transform: pressed ? "scale(0.985)" : "scale(1)",
        outline: focused
          ? `2px solid ${dark ? "#818CF8" : "#4F46E5"}`
          : "none",
        outlineOffset: -2,
      }}
      aria-label={`Ouvrir le cours ${cours.nom}`}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: dark ? "#312E81" : "#EEF2FF",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: dark ? "#A5B4FC" : "#4F46E5",
          flexShrink: 0,
        }}
        aria-hidden="true"
      >
        <BookOpen size={18} />
      </div>

      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontWeight: 600,
            fontSize: isMobile ? 13.5 : 14,
            color: dark ? "#F1F5F9" : "#1E293B",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {cours.nom}
        </div>
        <div
          style={{
            fontSize: isMobile ? 11 : 11.5,
            color: dark ? "#94A3B8" : "#64748B",
            marginTop: 2,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {cours.classe}
          {cours.coefficient ? ` · Coeff. ${cours.coefficient}` : ""}
          {cours.bareme ? ` · Barème ${cours.bareme}` : ""}
        </div>
      </div>

      <ChevronRight
        size={18}
        color={dark ? "#475569" : "#CBD5E1"}
        style={{ flexShrink: 0 }}
        aria-hidden="true"
      />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// FILTER CHIP — ✨ zone tap 24px
// ════════════════════════════════════════════════════════════════════
function FilterChip({ label, onClear, dark }) {
  const [pressed, setPressed] = useState(false);

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "4px 4px 4px 10px",
        background: dark ? "#312E81" : "#EEF2FF",
        color: dark ? "#C7D2FE" : "#4F46E5",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 600,
        minHeight: 28,
      }}
    >
      {label}
      <button
        type="button"
        onClick={onClear}
        onTouchStart={() => setPressed(true)}
        onTouchEnd={() => setPressed(false)}
        onTouchCancel={() => setPressed(false)}
        aria-label={`Retirer le filtre ${label}`}
        style={{
          background: pressed ? "rgba(0,0,0,0.15)" : "rgba(0,0,0,0.06)",
          border: "none",
          borderRadius: "50%",
          cursor: "pointer",
          color: "inherit",
          width: 24,
          height: 24,
          padding: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: pressed ? "scale(0.85)" : "scale(1)",
          transition: "transform 0.1s ease, background 0.12s ease",
          WebkitTapHighlightColor: "transparent",
          touchAction: "manipulation",
        }}
      >
        <X size={12} />
      </button>
    </span>
  );
}

// ════════════════════════════════════════════════════════════════════
// BOTTOM SHEET FILTRES
// ════════════════════════════════════════════════════════════════════
function CoursFiltersSheet({
  open,
  onClose,
  dark,
  searchTerm,
  setSearchTerm,
  classeFiltre,
  setClasseFiltre,
  sortedClasses,
  onReset,
}) {
  // ✨ Feedback tap + focus
  const [pressedBtn, setPressedBtn] = useState(null);
  const [focusedField, setFocusedField] = useState(null);

  const pressBtn = useCallback((id) => () => setPressedBtn(id), []);
  const releaseBtn = useCallback(() => setPressedBtn(null), []);

  if (!open) return null;

  const accent = dark ? "#818CF8" : "#4F46E5";

  const labelStyle = {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: dark ? "#94A3B8" : "#64748B",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  };

  const fieldStyle = (fieldName) => ({
    width: "100%",
    padding: "12px 14px",
    borderRadius: 10,
    border: `1px solid ${
      focusedField === fieldName ? accent : dark ? "#334155" : "#E2E8F0"
    }`,
    background: dark ? "#0F172A" : "#F8FAFC",
    color: dark ? "#F1F5F9" : "#1E293B",
    fontSize: 16,
    outline: "none",
    boxSizing: "border-box",
    appearance: "none",
    WebkitAppearance: "none",
    MozAppearance: "none",
    fontFamily: "inherit",
    minHeight: MOBILE_TAP,
    transition: "border-color 0.15s ease",
    WebkitTapHighlightColor: "transparent",
    touchAction: "manipulation",
  });

  return (
    <>
      {GestionCoursKeyframes}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.45)",
          zIndex: 1100,
          animation: "gc-fadeIn 0.18s ease-out",
        }}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Filtrer les cours"
        className="gc-slideUp"
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          background: dark ? "#1E293B" : "#FFFFFF",
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          padding: `12px calc(16px + ${SAFE_LEFT}) calc(24px + ${SAFE_BOTTOM}) calc(16px + ${SAFE_RIGHT})`,
          zIndex: 1101,
          maxHeight: "85vh",
          overflowY: "auto",
          boxShadow: "0 -8px 30px rgba(0,0,0,0.25)",
          boxSizing: "border-box",
          overscrollBehavior: "contain",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <div
          style={{
            width: 40,
            height: 4,
            borderRadius: 2,
            background: dark ? "#475569" : "#CBD5E1",
            margin: "0 auto 16px",
          }}
          aria-hidden="true"
        />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 18,
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: 17,
              fontWeight: 700,
              color: dark ? "#F1F5F9" : "#1E293B",
            }}
          >
            Filtrer les cours
          </h3>
          <CloseButton onClick={onClose} dark={dark} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label htmlFor="cours-search-filter" style={labelStyle}>
            Recherche
          </label>
          <div style={{ position: "relative" }}>
            <Search
              size={16}
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: dark ? "#94A3B8" : "#64748B",
                pointerEvents: "none",
              }}
              aria-hidden="true"
            />
            <input
              id="cours-search-filter"
              type="text"
              placeholder="Nom du cours…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setFocusedField("search")}
              onBlur={() => setFocusedField(null)}
              inputMode="search"
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
              aria-label="Rechercher un cours"
              style={{ ...fieldStyle("search"), paddingLeft: 36 }}
            />
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label htmlFor="cours-classe-filter" style={labelStyle}>
            Classe
          </label>
          <select
            id="cours-classe-filter"
            value={classeFiltre}
            onChange={(e) => setClasseFiltre(e.target.value)}
            onFocus={() => setFocusedField("classe")}
            onBlur={() => setFocusedField(null)}
            aria-label="Filtrer par classe"
            style={{ ...fieldStyle("classe"), cursor: "pointer" }}
          >
            <option value="">Toutes les classes</option>
            {sortedClasses.map((c) => (
              <option key={c._id} value={c.nom}>
                {c.nom}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            onClick={() => {
              onReset();
              onClose();
            }}
            onTouchStart={pressBtn("reset")}
            onTouchEnd={releaseBtn}
            onTouchCancel={releaseBtn}
            style={{
              flex: 1,
              padding: "14px 16px",
              borderRadius: 12,
              border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
              background: "transparent",
              color: dark ? "#CBD5E1" : "#475569",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              minHeight: MOBILE_TAP,
              transform: pressedBtn === "reset" ? "scale(0.97)" : "scale(1)",
              transition: "transform 0.1s ease",
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
              fontFamily: "inherit",
              boxSizing: "border-box",
            }}
          >
            <RotateCcw size={16} aria-hidden="true" />
            Réinitialiser
          </button>
          <button
            type="button"
            onClick={onClose}
            onTouchStart={pressBtn("apply")}
            onTouchEnd={releaseBtn}
            onTouchCancel={releaseBtn}
            style={{
              flex: 2,
              padding: "14px 16px",
              borderRadius: 12,
              border: "none",
              background: pressedBtn === "apply" ? "#4338CA" : accent,
              color: "#FFFFFF",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
              minHeight: MOBILE_TAP,
              transform: pressedBtn === "apply" ? "scale(0.97)" : "scale(1)",
              transition: "transform 0.1s ease, background 0.12s ease",
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
              fontFamily: "inherit",
              boxSizing: "border-box",
            }}
          >
            Voir les résultats
          </button>
        </div>
      </div>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ════════════════════════════════════════════════════════════════════
export function GestionCours({ ecoleId, classes, user, anneeId, anneeActive }) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();
  const { confirm, dialogProps } = useConfirm();

  const userId = user?._id;

  // ✨ Feedback tap + focus
  const [pressedBtn, setPressedBtn] = useState(null);
  const [focusedSearch, setFocusedSearch] = useState(false);

  const pressBtn = useCallback((id) => () => setPressedBtn(id), []);
  const releaseBtn = useCallback(() => setPressedBtn(null), []);

  // États
  const [classeFiltre, setClasseFiltre] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalMode, setAddModalMode] = useState("individuel");
  const [editingCours, setEditingCours] = useState(null);
  const [detailCours, setDetailCours] = useState(null);

  const coursRaw = useQuery(
    api.cours.list,
    ecoleId && userId
      ? {
          ecoleId,
          classe: classeFiltre || undefined,
          anneeId,
          userId,
        }
      : "skip"
  );

  const cours = useMemo(() => coursRaw ?? [], [coursRaw]);

  const addCours = useMutation(api.cours.add);
  const addBulk = useMutation(api.cours.addBulk);
  const removeCours = useMutation(api.cours.remove);
  const updateCours = useMutation(api.cours.update);

  // Couleurs
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const accent = dark ? "#818CF8" : "#4F46E5";
  const warning = "#F59E0B";

  // Container padding avec safe-area
  const containerPadding = isMobile
    ? `calc(10px + ${SAFE_TOP}) calc(8px + ${SAFE_RIGHT}) calc(90px + ${SAFE_BOTTOM}) calc(8px + ${SAFE_LEFT})`
    : "20px 16px";

  const sortedClasses = useMemo(
    () =>
      [...classes].sort((a, b) =>
        a.nom.localeCompare(b.nom, undefined, {
          numeric: true,
          sensitivity: "base",
        })
      ),
    [classes]
  );

  const filteredCours = useMemo(() => {
    if (!searchTerm.trim()) return cours;
    const q = searchTerm.toLowerCase();
    return cours.filter((c) => c.nom.toLowerCase().includes(q));
  }, [cours, searchTerm]);

  const activeFiltersCount = useMemo(() => {
    let n = 0;
    if (searchTerm.trim()) n++;
    if (classeFiltre) n++;
    return n;
  }, [searchTerm, classeFiltre]);

  const resetFilters = useCallback(() => {
    setSearchTerm("");
    setClasseFiltre("");
  }, []);

  const handleOpenAdd = (mode = "individuel", initialData = null) => {
    setAddModalMode(mode);
    setEditingCours(initialData);
    setShowAddModal(true);
  };

  const handleCloseAdd = () => {
    setShowAddModal(false);
    setEditingCours(null);
  };

  const handleDeleteCours = useCallback(
    async (c) => {
      if (!userId) {
        toast.error("Session invalide.");
        return;
      }
      const ok = await confirm(
        "Supprimer le cours",
        `Voulez-vous vraiment supprimer le cours "${c.nom}" ?`
      );
      if (!ok) return;
      try {
        await removeCours({ id: c._id, userId });
        toast.success("Cours supprimé");
        setDetailCours(null);
      } catch (err) {
        toast.error(extractErrMsg(err, "Impossible de supprimer le cours"));
      }
    },
    [userId, confirm, removeCours]
  );

  // ════════════════════════════════════════════════════════════════
  // RENDU PRÉCOCE : session invalide
  // ════════════════════════════════════════════════════════════════
  if (!user || !userId) {
    return (
      <>
        {GestionCoursKeyframes}
        <div
          role="status"
          aria-live="polite"
          aria-busy="true"
          style={{
            display: "flex",
            justifyContent: "center",
            padding: 40,
          }}
        >
          <Loader
            size={28}
            className="gc-spin"
            style={{ color: accent }}
            aria-hidden="true"
          />
        </div>
      </>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // RENDU PRÉCOCE : pas d'année
  // ════════════════════════════════════════════════════════════════
  if (!anneeId) {
    return (
      <>
        {GestionCoursKeyframes}
        <div
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            padding: containerPadding,
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              background: cardBg,
              borderRadius: 16,
              padding: isMobile ? 32 : 48,
              textAlign: "center",
              boxShadow: dark
                ? "0 1px 3px rgba(0,0,0,0.3)"
                : "0 1px 3px rgba(0,0,0,0.05)",
              border: `1px solid ${cardBorder}`,
              boxSizing: "border-box",
            }}
          >
            <BookOpen
              size={isMobile ? 40 : 48}
              color={warning}
              style={{ marginBottom: 16 }}
              aria-hidden="true"
            />
            <h2
              style={{
                fontSize: isMobile ? 17 : 22,
                fontWeight: 700,
                color: textPrimary,
                margin: "0 0 8px",
              }}
            >
              Aucune année scolaire active
            </h2>
            <p style={{ color: textSecondary, fontSize: 13.5, margin: 0 }}>
              Veuillez créer ou activer une année scolaire dans les paramètres.
            </p>
          </div>
        </div>
      </>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // RENDU PRINCIPAL
  // ════════════════════════════════════════════════════════════════
  return (
    <>
      {GestionCoursKeyframes}
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: containerPadding,
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {/* ═══ EN-TÊTE ═══ */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 10,
            marginBottom: isMobile ? 12 : 20,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <h2
              style={{
                fontSize: isMobile ? 17 : 22,
                fontWeight: 700,
                color: textPrimary,
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              Gestion des cours
            </h2>
            <p
              style={{
                color: textSecondary,
                marginTop: 2,
                marginBottom: 0,
                fontSize: isMobile ? 11.5 : 13,
              }}
            >
              {filteredCours.length} cours
              {anneeActive ? ` · ${anneeActive.nom}` : ""}
            </p>
          </div>

          {!isMobile && (
            <button
              type="button"
              onClick={() => handleOpenAdd("individuel")}
              onTouchStart={pressBtn("add-header")}
              onTouchEnd={releaseBtn}
              onTouchCancel={releaseBtn}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 8,
                background: accent,
                color: "#FFF",
                border: "none",
                fontWeight: 600,
                cursor: "pointer",
                fontSize: 13,
                transform:
                  pressedBtn === "add-header" ? "scale(0.97)" : "scale(1)",
                transition: "transform 0.1s ease",
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation",
                fontFamily: "inherit",
              }}
            >
              <Plus size={15} aria-hidden="true" /> Ajouter un cours
            </button>
          )}
        </div>

        {/* ═══ BARRE OUTILS ═══ */}
        {isMobile ? (
          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 12,
              alignItems: "stretch",
            }}
          >
            <div style={{ position: "relative", flex: 1 }}>
              <Search
                size={16}
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: textSecondary,
                  pointerEvents: "none",
                }}
                aria-hidden="true"
              />
              <input
                type="text"
                placeholder="Rechercher…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setFocusedSearch(true)}
                onBlur={() => setFocusedSearch(false)}
                inputMode="search"
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
                aria-label="Rechercher un cours"
                style={{
                  width: "100%",
                  padding: "12px 12px 12px 38px",
                  borderRadius: 12,
                  border: `1px solid ${
                    focusedSearch ? accent : cardBorder
                  }`,
                  background: cardBg,
                  color: textPrimary,
                  fontSize: 16,
                  outline: "none",
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                  minHeight: MOBILE_TAP,
                  transition: "border-color 0.15s ease",
                  WebkitAppearance: "none",
                  WebkitTapHighlightColor: "transparent",
                  touchAction: "manipulation",
                }}
              />
            </div>
            <button
              type="button"
              onClick={() => setShowFilters(true)}
              onTouchStart={pressBtn("filters")}
              onTouchEnd={releaseBtn}
              onTouchCancel={releaseBtn}
              aria-label="Ouvrir les filtres"
              style={{
                position: "relative",
                padding: "0 14px",
                borderRadius: 12,
                border: `1px solid ${
                  activeFiltersCount > 0 ? accent : cardBorder
                }`,
                background:
                  activeFiltersCount > 0
                    ? dark
                      ? "#312E81"
                      : "#EEF2FF"
                    : cardBg,
                color:
                  activeFiltersCount > 0
                    ? dark
                      ? "#C7D2FE"
                      : "#4F46E5"
                    : textPrimary,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontWeight: 600,
                fontSize: 13,
                minHeight: MOBILE_TAP,
                minWidth: MOBILE_TAP,
                transform:
                  pressedBtn === "filters" ? "scale(0.97)" : "scale(1)",
                transition: "transform 0.1s ease",
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation",
                fontFamily: "inherit",
              }}
            >
              <SlidersHorizontal size={16} aria-hidden="true" />
              {activeFiltersCount > 0 && (
                <span
                  style={{
                    background: accent,
                    color: "#FFF",
                    borderRadius: 10,
                    padding: "1px 6px",
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              gap: 10,
              marginBottom: 16,
              alignItems: "stretch",
            }}
          >
            <div style={{ position: "relative", flex: 1, minWidth: 240 }}>
              <Search
                size={16}
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: textSecondary,
                }}
                aria-hidden="true"
              />
              <input
                type="text"
                placeholder="Rechercher un cours…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                inputMode="search"
                autoComplete="off"
                style={{
                  width: "100%",
                  padding: "10px 12px 10px 38px",
                  borderRadius: 8,
                  border: `1px solid ${cardBorder}`,
                  background: cardBg,
                  color: textPrimary,
                  fontSize: 14,
                  outline: "none",
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                }}
              />
            </div>
            <select
              value={classeFiltre}
              onChange={(e) => setClasseFiltre(e.target.value)}
              aria-label="Filtrer par classe"
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                border: `1px solid ${cardBorder}`,
                background: cardBg,
                color: textPrimary,
                fontSize: 14,
                cursor: "pointer",
                minWidth: 180,
                fontFamily: "inherit",
              }}
            >
              <option value="">Toutes les classes</option>
              {sortedClasses.map((c) => (
                <option key={c._id} value={c.nom}>
                  {c.nom}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* ═══ PUCES FILTRES ACTIFS ═══ */}
        {activeFiltersCount > 0 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              marginBottom: 12,
            }}
          >
            {searchTerm.trim() && (
              <FilterChip
                label={`« ${searchTerm} »`}
                onClear={() => setSearchTerm("")}
                dark={dark}
              />
            )}
            {classeFiltre && (
              <FilterChip
                label={classeFiltre}
                onClear={() => setClasseFiltre("")}
                dark={dark}
              />
            )}
            <button
              type="button"
              onClick={resetFilters}
              style={{
                padding: "6px 12px",
                background: "transparent",
                border: `1px solid ${cardBorder}`,
                color: textSecondary,
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                minHeight: 32,
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation",
                fontFamily: "inherit",
              }}
            >
              Tout effacer
            </button>
          </div>
        )}

        {/* ═══ LISTE ═══ */}
        {coursRaw === undefined ? (
          <div
            role="status"
            aria-live="polite"
            aria-busy="true"
            style={{
              display: "flex",
              justifyContent: "center",
              padding: isMobile ? 40 : 60,
            }}
          >
            <Loader
              size={28}
              className="gc-spin"
              style={{ color: accent }}
              aria-hidden="true"
            />
          </div>
        ) : filteredCours.length === 0 ? (
          <div
            style={{
              background: cardBg,
              borderRadius: 16,
              padding: isMobile ? 32 : 48,
              textAlign: "center",
              boxShadow: dark
                ? "0 1px 3px rgba(0,0,0,0.3)"
                : "0 1px 3px rgba(0,0,0,0.05)",
              border: `1px solid ${cardBorder}`,
              color: textSecondary,
              boxSizing: "border-box",
            }}
          >
            <BookOpen
              size={isMobile ? 28 : 32}
              style={{ marginBottom: 8, opacity: 0.5 }}
              aria-hidden="true"
            />
            <p style={{ margin: 0, fontSize: 13.5 }}>
              {searchTerm
                ? `Aucun cours trouvé pour "${searchTerm}"`
                : classeFiltre
                ? `Aucun cours pour la classe ${classeFiltre}`
                : "Aucun cours enregistré"}
            </p>
            {(searchTerm || classeFiltre) && (
              <button
                type="button"
                onClick={resetFilters}
                style={{
                  marginTop: 12,
                  padding: "10px 18px",
                  borderRadius: 8,
                  border: `1px solid ${cardBorder}`,
                  background: "transparent",
                  color: textPrimary,
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                  minHeight: MOBILE_TAP,
                  WebkitTapHighlightColor: "transparent",
                  touchAction: "manipulation",
                  fontFamily: "inherit",
                }}
              >
                Réinitialiser les filtres
              </button>
            )}
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile
                ? "1fr"
                : "repeat(auto-fill, minmax(320px, 1fr))",
              gap: isMobile ? 8 : 12,
            }}
          >
            {filteredCours.map((c) => (
              <CoursCard
                key={c._id}
                cours={c}
                dark={dark}
                isMobile={isMobile}
                onClick={() => setDetailCours(c)}
              />
            ))}
          </div>
        )}

        {/* ═══ FAB AJOUTER — ✨ design system ═══ */}
        {isMobile && (
          <Fab
            icon={<Plus size={24} />}
            onClick={() => handleOpenAdd("individuel")}
            label="Ajouter un cours"
            bottom={24}
          />
        )}

        {/* ═══ BOTTOM SHEET FILTRES ═══ */}
        <CoursFiltersSheet
          open={showFilters}
          onClose={() => setShowFilters(false)}
          dark={dark}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          classeFiltre={classeFiltre}
          setClasseFiltre={setClasseFiltre}
          sortedClasses={sortedClasses}
          onReset={resetFilters}
        />

        {/* ═══ MODALES ═══ */}
        <AddCoursModal
          open={showAddModal}
          onClose={handleCloseAdd}
          initialMode={addModalMode}
          initialData={editingCours}
          classes={sortedClasses}
          addCours={addCours}
          updateCours={updateCours}
          addBulk={addBulk}
          ecoleId={ecoleId}
          anneeId={anneeId}
          userId={userId}
          dark={dark}
          isMobile={isMobile}
        />

        {detailCours && (
          <DetailCoursModal
            cours={detailCours}
            onClose={() => setDetailCours(null)}
            onEdit={() => {
              setDetailCours(null);
              handleOpenAdd("individuel", detailCours);
            }}
            onDelete={() => handleDeleteCours(detailCours)}
            dark={dark}
            isMobile={isMobile}
          />
        )}

        <ConfirmDialog {...dialogProps} />
      </div>
    </>
  );
}