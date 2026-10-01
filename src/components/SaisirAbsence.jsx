// src/components/SaisirAbsence.jsx
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import { Search, Calendar, Check, X, Loader, RotateCcw, CalendarDays } from "lucide-react";
import toast from "react-hot-toast";
import { useConfirm } from "@/hooks/useConfirm";
import { ConfirmDialog } from "./ConfirmDialog";
import { trierEleves } from "@/utils/tri";
import { useAppStore } from "@/store/appStore";

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
const SaisirAbsenceKeyframes = (
  <style>{`
    @keyframes sa-spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
    .sa-spin { animation: sa-spin 1s linear infinite; }
    @media (prefers-reduced-motion: reduce) {
      .sa-spin { animation: none !important; }
    }
  `}</style>
);

// ════════════════════════════════════════════════════════════════════
// SUGGESTION ROW — ✨ refactorisée avec state React
// ════════════════════════════════════════════════════════════════════
function SuggestionRow({
  eleve,
  onClick,
  isLast,
  isMobile,
  badgeBg,
  accent,
  textPrimary,
  textSecondary,
  cardBorder,
}) {
  const [pressed, setPressed] = useState(false);
  const [hovered, setHovered] = useState(false);

  const handleTouchStart = () => setPressed(true);
  const handleTouchEnd = () => setPressed(false);
  const handleTouchCancel = () => setPressed(false);

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      onMouseEnter={() => !isMobile && setHovered(true)}
      onMouseLeave={() => !isMobile && setHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      style={{
        padding: isMobile ? "12px 14px" : "10px 14px",
        cursor: "pointer",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: isLast ? "none" : `1px solid ${cardBorder}`,
        background: pressed
          ? badgeBg
          : hovered && !isMobile
          ? badgeBg
          : "transparent",
        transform: pressed ? "scale(0.985)" : "scale(1)",
        transition: "background 0.12s ease, transform 0.1s ease",
        minHeight: isMobile ? MOBILE_TAP : undefined,
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation",
        userSelect: "none",
        boxSizing: "border-box",
      }}
      aria-label={`Sélectionner ${eleve.nom} ${eleve.postnom}`}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontWeight: 600,
            fontSize: isMobile ? 15 : 14,
            color: textPrimary,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {eleve.nom} {eleve.postnom} {eleve.prenom}
        </div>
        <div style={{ fontSize: 12, color: textSecondary }}>
          Classe {eleve.classe}
        </div>
      </div>
      <Check
        size={16}
        color={accent}
        style={{ opacity: 0, flexShrink: 0 }}
        aria-hidden="true"
      />
    </div>
  );
}

export function SaisirAbsence({ ecoleId, eleves, user, anneeId, anneeActive }) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();
  const { confirm, dialogProps } = useConfirm();
  const addAbsence = useMutation(api.absences.add);

  // États persistés dans le store
  const selectedEleve = useAppStore((state) => state.saisirAbsenceSelectedEleve);
  const setSelectedEleve = useAppStore((state) => state.setSaisirAbsenceSelectedEleve);
  const type = useAppStore((state) => state.saisirAbsenceType || "absence");
  const setType = useAppStore((state) => state.setSaisirAbsenceType);
  const date = useAppStore(
    (state) => state.saisirAbsenceDate || new Date().toISOString().split("T")[0]
  );
  const setDate = useAppStore((state) => state.setSaisirAbsenceDate);
  const commentaire = useAppStore((state) => state.saisirAbsenceCommentaire || "");
  const setCommentaire = useAppStore((state) => state.setSaisirAbsenceCommentaire);
  const search = useAppStore((state) => state.saisirAbsenceSearch || "");
  const setSearch = useAppStore((state) => state.setSaisirAbsenceSearch);

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  // ✨ Feedback tap
  const [pressedBtn, setPressedBtn] = useState(null);
  // ✨ Focus state
  const [focusedField, setFocusedField] = useState(null);

  // ✨ Handlers touch génériques
  const pressBtn = useCallback((id) => () => setPressedBtn(id), []);
  const releaseBtn = useCallback(() => setPressedBtn(null), []);

  // Debounce de la recherche
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const timeoutRef = useRef(null);
  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timeoutRef.current);
  }, [search]);

  const filtered = useMemo(() => {
    if (debouncedSearch.trim().length < 2) return [];
    const query = debouncedSearch.toLowerCase();
    return eleves
      .filter((e) =>
        `${e.nom} ${e.postnom} ${e.prenom || ""}`.toLowerCase().includes(query)
      )
      .sort(trierEleves)
      .slice(0, 10);
  }, [eleves, debouncedSearch]);

  const selectEleve = (eleve) => {
    setSelectedEleve(eleve);
    setSearch(`${eleve.nom} ${eleve.postnom}`);
    setErrors((prev) => ({ ...prev, selectedEleve: undefined }));
  };

  const clearSelectedEleve = () => {
    setSelectedEleve(null);
    setSearch("");
    setErrors((prev) => ({ ...prev, selectedEleve: undefined }));
  };

  const validate = () => {
    const err = {};
    if (!selectedEleve) err.selectedEleve = "Veuillez sélectionner un élève.";
    if (!date) err.date = "La date est requise.";
    if (!user?._id) err.global = "Session utilisateur invalide.";
    return err;
  };

  const resetForm = () => {
    setSelectedEleve(null);
    setSearch("");
    setType("absence");
    setDate(new Date().toISOString().split("T")[0]);
    setCommentaire("");
    setErrors({});
  };

  const handleSubmit = async () => {
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      if (validationErrors.global) toast.error(validationErrors.global);
      return;
    }

    const ok = await confirm(
      "Enregistrer l'absence / retard",
      `Voulez-vous vraiment enregistrer ${
        type === "absence" ? "une absence" : "un retard"
      } pour ${selectedEleve.nom} ${selectedEleve.postnom} ?`
    );
    if (!ok) return;

    setSubmitting(true);
    try {
      await addAbsence({
        eleveId: selectedEleve._id,
        ecoleId,
        type,
        date,
        commentaire: commentaire || undefined,
        anneeId,
        userId: user._id,
      });
      toast.success(`${type === "absence" ? "Absence" : "Retard"} enregistré(e)`);
      resetForm();
    } catch (err) {
      toast.error("Erreur : " + (err?.message || "enregistrement impossible"));
    } finally {
      setSubmitting(false);
    }
  };

  const setToday = () => {
    setDate(new Date().toISOString().split("T")[0]);
    setErrors((prev) => ({ ...prev, date: undefined }));
  };

  // Couleurs adaptatives
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const inputBg = dark ? "#0F172A" : "#F9FAFB";
  const inputText = dark ? "#F1F5F9" : "#1E293B";
  const errorBg = dark ? "#7F1D1D" : "#FEF2F2";
  const errorText = "#EF4444";
  const badgeBg = dark ? "#312E81" : "#EEF2FF";
  const badgeText = dark ? "#A5B4FC" : "#4F46E5";
  const buttonBg = dark ? "#818CF8" : "#4F46E5";
  const buttonBgHover = dark ? "#6366F1" : "#4338CA";
  const secondaryBtnBg = dark ? "#334155" : "#F1F5F9";
  const secondaryBtnText = dark ? "#F1F5F9" : "#1E293B";
  const accent = dark ? "#818CF8" : "#4F46E5";

  // Styles adaptatifs
  const containerPadding = isMobile
    ? `calc(16px + ${SAFE_TOP}) calc(12px + ${SAFE_RIGHT}) calc(16px + ${SAFE_BOTTOM}) calc(12px + ${SAFE_LEFT})`
    : "24px 16px";
  const headerMarginBottom = isMobile ? 20 : 32;
  const titleSize = isMobile ? 22 : 28;
  const subtitleSize = isMobile ? 13 : 14;
  const cardPadding = isMobile ? 14 : 24;
  const cardMarginBottom = isMobile ? 16 : 24;
  const labelFontSize = isMobile ? 15 : 14;
  const inputPadding = isMobile
    ? "12px 48px 12px 42px"
    : "10px 14px 10px 42px";
  const inputFontSize = isMobile ? 16 : 14; // 16px évite zoom iOS
  const selectPadding = isMobile ? "12px 14px" : "10px 14px";
  const selectFontSize = isMobile ? 16 : 14;
  const suggestionItemPadding = isMobile ? "12px 14px" : "10px 14px";
  const selectedElevePadding = isMobile ? "12px 14px" : "10px 14px";
  const todayButtonPadding = isMobile ? "12px 14px" : "8px 10px";
  const actionButtonsFlexDirection = isMobile ? "column" : "row";
  const actionButtonsGap = isMobile ? 8 : 12;

  // ✨ inputStyle avec focus state + mobile minHeight
  const inputStyle = (field) => ({
    width: "100%",
    padding: inputPadding,
    border: `1.5px solid ${
      errors[field]
        ? errorText
        : focusedField === field
        ? accent
        : cardBorder
    }`,
    borderRadius: 10,
    fontSize: inputFontSize,
    outline: "none",
    background: errors[field] ? errorBg : inputBg,
    color: inputText,
    transition: "border-color 0.15s ease, background-color 0.3s ease",
    boxSizing: "border-box",
    fontFamily: "inherit",
    WebkitAppearance: "none",
    MozAppearance: "none",
    minHeight: isMobile ? MOBILE_TAP : undefined,
    WebkitTapHighlightColor: "transparent",
    touchAction: "manipulation",
  });

  return (
    <>
      {SaisirAbsenceKeyframes}
      <div
        style={{
          maxWidth: 800,
          margin: "0 auto",
          padding: containerPadding,
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {/* ═══ EN-TÊTE ═══ */}
        <div style={{ marginBottom: headerMarginBottom }}>
          <h2
            style={{
              fontSize: titleSize,
              fontWeight: 700,
              color: textPrimary,
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            Saisir une absence ou un retard
          </h2>
          <p
            style={{
              color: textSecondary,
              marginTop: 4,
              fontSize: subtitleSize,
            }}
          >
            {eleves.length} élève(s) {anneeActive ? `· ${anneeActive.nom}` : ""}
          </p>
        </div>

        {/* ═══ CARTE RECHERCHE ═══ */}
        <div
          style={{
            background: cardBg,
            borderRadius: 16,
            padding: cardPadding,
            boxShadow: dark
              ? "0 1px 3px rgba(0,0,0,0.3)"
              : "0 1px 3px rgba(0,0,0,0.05)",
            border: `1px solid ${cardBorder}`,
            marginBottom: cardMarginBottom,
            boxSizing: "border-box",
          }}
        >
          <label
            htmlFor="recherche-eleve"
            style={{
              display: "block",
              marginBottom: 6,
              fontWeight: 500,
              fontSize: labelFontSize,
              color: textSecondary,
            }}
          >
            Rechercher un élève
          </label>
          <div style={{ position: "relative" }}>
            <Search
              size={18}
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
              id="recherche-eleve"
              type="text"
              placeholder="Tapez le nom de l'élève..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSelectedEleve(null);
                setErrors((prev) => ({ ...prev, selectedEleve: undefined }));
              }}
              onFocus={() => setFocusedField("selectedEleve")}
              onBlur={() => setFocusedField(null)}
              style={inputStyle("selectedEleve")}
              inputMode="search"
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
              aria-label="Rechercher un élève"
            />
            {/* ✨ Clear X : 44×44px mobile */}
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setSelectedEleve(null);
                }}
                onTouchStart={pressBtn("clear-search")}
                onTouchEnd={releaseBtn}
                onTouchCancel={releaseBtn}
                aria-label="Effacer la recherche"
                style={{
                  position: "absolute",
                  right: isMobile ? 2 : 6,
                  top: "50%",
                  transform: `translateY(-50%) scale(${
                    pressedBtn === "clear-search" ? 0.9 : 1
                  })`,
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: textSecondary,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
                  width: isMobile ? MOBILE_TAP : 32,
                  height: isMobile ? MOBILE_TAP : 32,
                  borderRadius: 8,
                  transition: "transform 0.1s ease",
                  WebkitTapHighlightColor: "transparent",
                  touchAction: "manipulation",
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>
          {errors.selectedEleve && (
            <div
              role="alert"
              style={{ color: errorText, fontSize: 13, marginTop: 4 }}
            >
              {errors.selectedEleve}
            </div>
          )}

          {/* ═══ Suggestions ═══ */}
          {debouncedSearch.length >= 2 && !selectedEleve && (
            <div
              style={{
                marginTop: 12,
                border: `1px solid ${cardBorder}`,
                borderRadius: 10,
                overflow: "hidden",
                background: cardBg,
                maxHeight: 260,
                overflowY: "auto",
                overscrollBehavior: "contain",
                WebkitOverflowScrolling: "touch",
              }}
            >
              {filtered.length === 0 ? (
                <div
                  style={{
                    padding: 12,
                    textAlign: "center",
                    color: textSecondary,
                    fontSize: 13,
                  }}
                >
                  Aucun élève trouvé pour "{debouncedSearch}"
                </div>
              ) : (
                filtered.map((e, idx) => (
                  <SuggestionRow
                    key={e._id}
                    eleve={e}
                    isLast={idx === filtered.length - 1}
                    isMobile={isMobile}
                    badgeBg={badgeBg}
                    accent={accent}
                    textPrimary={textPrimary}
                    textSecondary={textSecondary}
                    cardBorder={cardBorder}
                    onClick={() => selectEleve(e)}
                  />
                ))
              )}
            </div>
          )}

          {/* ═══ Élève sélectionné ═══ */}
          {selectedEleve && (
            <div
              style={{
                marginTop: 12,
                padding: selectedElevePadding,
                background: badgeBg,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                boxSizing: "border-box",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                  minWidth: 0,
                  flex: 1,
                }}
              >
                <Check size={16} color={badgeText} aria-hidden="true" />
                <span
                  style={{
                    fontWeight: 600,
                    fontSize: isMobile ? 15 : 14,
                    color: textPrimary,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {selectedEleve.nom} {selectedEleve.postnom}{" "}
                  {selectedEleve.prenom}
                </span>
                <span style={{ color: textSecondary, fontSize: 13 }}>
                  ({selectedEleve.classe})
                </span>
              </div>
              {/* ✨ Clear élève : 44×44px mobile */}
              <button
                type="button"
                onClick={clearSelectedEleve}
                onTouchStart={pressBtn("clear-eleve")}
                onTouchEnd={releaseBtn}
                onTouchCancel={releaseBtn}
                aria-label="Retirer l'élève sélectionné"
                style={{
                  background: "transparent",
                  border: "none",
                  color: errorText,
                  cursor: "pointer",
                  padding: 0,
                  width: isMobile ? MOBILE_TAP : 32,
                  height: isMobile ? MOBILE_TAP : 32,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 8,
                  transform: `scale(${
                    pressedBtn === "clear-eleve" ? 0.9 : 1
                  })`,
                  transition: "transform 0.1s ease",
                  flexShrink: 0,
                  WebkitTapHighlightColor: "transparent",
                  touchAction: "manipulation",
                }}
              >
                <X size={16} />
              </button>
            </div>
          )}
        </div>

        {/* ═══ CARTE DÉTAILS ═══ */}
        <div
          style={{
            background: cardBg,
            borderRadius: 16,
            padding: cardPadding,
            boxShadow: dark
              ? "0 1px 3px rgba(0,0,0,0.3)"
              : "0 1px 3px rgba(0,0,0,0.05)",
            border: `1px solid ${cardBorder}`,
            marginBottom: cardMarginBottom,
            boxSizing: "border-box",
          }}
        >
          {/* Type */}
          <div style={{ marginBottom: 20 }}>
            <label
              htmlFor="type"
              style={{
                display: "block",
                marginBottom: 6,
                fontWeight: 500,
                fontSize: labelFontSize,
                color: textSecondary,
              }}
            >
              Type
            </label>
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              onFocus={() => setFocusedField("type")}
              onBlur={() => setFocusedField(null)}
              style={{
                width: "100%",
                padding: selectPadding,
                border: `1.5px solid ${
                  focusedField === "type" ? accent : cardBorder
                }`,
                borderRadius: 10,
                fontSize: selectFontSize,
                outline: "none",
                background: inputBg,
                color: inputText,
                cursor: "pointer",
                fontFamily: "inherit",
                WebkitAppearance: "none",
                appearance: "none",
                minHeight: isMobile ? MOBILE_TAP : undefined,
                transition: "border-color 0.15s ease",
                boxSizing: "border-box",
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation",
              }}
              aria-label="Type d'absence"
            >
              <option value="absence">Absence</option>
              <option value="retard">Retard</option>
            </select>
          </div>

          {/* Date */}
          <div style={{ marginBottom: 20 }}>
            <label
              htmlFor="date"
              style={{
                display: "block",
                marginBottom: 6,
                fontWeight: 500,
                fontSize: labelFontSize,
                color: textSecondary,
              }}
            >
              Date
            </label>
            <div
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexDirection: isMobile ? "column" : "row",
              }}
            >
              <div style={{ position: "relative", flex: 1, width: "100%" }}>
                <Calendar
                  size={18}
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
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    setErrors((prev) => ({ ...prev, date: undefined }));
                  }}
                  onFocus={() => setFocusedField("date")}
                  onBlur={() => setFocusedField(null)}
                  style={{
                    ...inputStyle("date"),
                    colorScheme: dark ? "dark" : "light",
                  }}
                  aria-label="Date de l'absence"
                />
              </div>
              {/* ✨ Bouton Aujourd'hui : 44px mobile */}
              <button
                type="button"
                onClick={setToday}
                onTouchStart={pressBtn("today")}
                onTouchEnd={releaseBtn}
                onTouchCancel={releaseBtn}
                title="Aujourd'hui"
                aria-label="Utiliser la date d'aujourd'hui"
                style={{
                  background: "transparent",
                  border: `1px solid ${cardBorder}`,
                  borderRadius: 8,
                  padding: todayButtonPadding,
                  cursor: "pointer",
                  color: textSecondary,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                  fontSize: isMobile ? 14 : 14,
                  whiteSpace: "nowrap",
                  width: isMobile ? "100%" : "auto",
                  minHeight: MOBILE_TAP,
                  transform:
                    pressedBtn === "today" ? "scale(0.97)" : "scale(1)",
                  transition: "transform 0.1s ease, background 0.12s ease",
                  WebkitTapHighlightColor: "transparent",
                  touchAction: "manipulation",
                  fontFamily: "inherit",
                  boxSizing: "border-box",
                }}
              >
                <CalendarDays size={16} aria-hidden="true" /> Aujourd'hui
              </button>
            </div>
            {errors.date && (
              <div
                role="alert"
                style={{ color: errorText, fontSize: 13, marginTop: 4 }}
              >
                {errors.date}
              </div>
            )}
          </div>

          {/* Commentaire */}
          <div style={{ marginBottom: 20 }}>
            <label
              htmlFor="commentaire"
              style={{
                display: "block",
                marginBottom: 6,
                fontWeight: 500,
                fontSize: labelFontSize,
                color: textSecondary,
              }}
            >
              Commentaire (optionnel)
            </label>
            <textarea
              id="commentaire"
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              onFocus={() => setFocusedField("commentaire")}
              onBlur={() => setFocusedField(null)}
              placeholder="Raison de l'absence ou du retard..."
              style={{
                width: "100%",
                padding: selectPadding,
                border: `1.5px solid ${
                  focusedField === "commentaire" ? accent : cardBorder
                }`,
                borderRadius: 10,
                fontSize: selectFontSize,
                outline: "none",
                background: inputBg,
                color: inputText,
                height: isMobile ? 120 : 100,
                resize: "vertical",
                fontFamily: "inherit",
                boxSizing: "border-box",
                transition: "border-color 0.15s ease",
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation",
              }}
              aria-label="Commentaire sur l'absence"
            />
          </div>
        </div>

        {/* ═══ BOUTONS D'ACTION ═══ */}
        <div
          style={{
            display: "flex",
            gap: actionButtonsGap,
            flexDirection: actionButtonsFlexDirection,
            marginBottom: `calc(80px + ${SAFE_BOTTOM})`,
          }}
        >
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!selectedEleve || !date || submitting}
            onTouchStart={
              selectedEleve && date && !submitting
                ? pressBtn("submit")
                : undefined
            }
            onTouchEnd={releaseBtn}
            onTouchCancel={releaseBtn}
            style={{
              flex: 1,
              padding: isMobile ? "14px 0" : "12px 0",
              background:
                !selectedEleve || !date || submitting
                  ? "#A5B4FC"
                  : pressedBtn === "submit"
                  ? buttonBgHover
                  : buttonBg,
              color: "#FFFFFF",
              border: "none",
              borderRadius: 10,
              fontSize: 16,
              fontWeight: 600,
              cursor:
                !selectedEleve || !date || submitting
                  ? "not-allowed"
                  : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "background 0.12s ease, transform 0.1s ease",
              transform:
                pressedBtn === "submit" &&
                selectedEleve &&
                date &&
                !submitting
                  ? "scale(0.98)"
                  : "scale(1)",
              boxShadow:
                !selectedEleve || !date || submitting
                  ? "none"
                  : "0 4px 12px rgba(79,70,229,0.2)",
              minHeight: MOBILE_TAP,
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
              fontFamily: "inherit",
              boxSizing: "border-box",
            }}
          >
            {submitting ? (
              <>
                <Loader size={16} className="sa-spin" aria-hidden="true" />
                Enregistrement...
              </>
            ) : (
              "Enregistrer"
            )}
          </button>
          <button
            type="button"
            onClick={resetForm}
            disabled={submitting}
            onTouchStart={!submitting ? pressBtn("reset") : undefined}
            onTouchEnd={releaseBtn}
            onTouchCancel={releaseBtn}
            style={{
              padding: isMobile ? "14px 20px" : "12px 20px",
              background: secondaryBtnBg,
              color: secondaryBtnText,
              border: "none",
              borderRadius: 10,
              fontSize: 16,
              fontWeight: 500,
              cursor: submitting ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              minHeight: MOBILE_TAP,
              transform:
                pressedBtn === "reset" && !submitting ? "scale(0.98)" : "scale(1)",
              transition: "transform 0.1s ease, background 0.12s ease",
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
              fontFamily: "inherit",
              boxSizing: "border-box",
            }}
          >
            <RotateCcw size={16} aria-hidden="true" /> Réinitialiser
          </button>
        </div>

        <ConfirmDialog {...dialogProps} />
      </div>
    </>
  );
}