// src/components/SaisirPunition.jsx
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import { getFaute } from "../utils";
import { trierEleves } from "@/utils/tri";
import toast from "react-hot-toast";
import {
  Loader, Search, Check, AlertTriangle, X, User,
  Calendar, Gavel, MessageSquare,
} from "lucide-react";
import { userFriendlyError } from "@/utils/errorMessages";
import { useConfirm } from "@/hooks/useConfirm";
import { ConfirmDialog } from "./ConfirmDialog";
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
const SaisirPunitionKeyframes = (
  <style>{`
    @keyframes sp-spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
    @keyframes sp-slide-up {
      from { transform: translateY(100%); }
      to   { transform: translateY(0); }
    }
    .sp-spin { animation: sp-spin 1s linear infinite; }
    .sp-slide-up { animation: sp-slide-up 0.2s ease-out; }
    @media (prefers-reduced-motion: reduce) {
      .sp-spin, .sp-slide-up { animation: none !important; }
    }
  `}</style>
);

// ════════════════════════════════════════════════════════════════════
// SECTION RÉUTILISABLE
// ════════════════════════════════════════════════════════════════════
function FormSection({ icon, label, children, dark, error }) {
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const accent = dark ? "#818CF8" : "#4F46E5";
  const accentBg = dark ? "#312E81" : "#EEF2FF";

  return (
    <div style={{ marginBottom: 14 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 6,
        }}
      >
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            background: accentBg,
            color: accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
          aria-hidden="true"
        >
          {icon}
        </div>
        <label
          style={{
            fontSize: 11.5,
            fontWeight: 700,
            color: error ? "#EF4444" : textPrimary,
            textTransform: "uppercase",
            letterSpacing: 0.3,
          }}
        >
          {label}
        </label>
        {error && (
          <span
            role="alert"
            style={{
              fontSize: 10.5,
              color: "#EF4444",
              fontWeight: 600,
              marginLeft: "auto",
            }}
          >
            Requis
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// SUGGESTION ROW — ✨ refactorisée avec state React
// ════════════════════════════════════════════════════════════════════
function SuggestionRow({ eleve, onClick, isLast, dark, isMobile, accentBg, accent, textPrimary, textSecondary, cardBorder, inputBg }) {
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
        padding: isMobile ? "12px" : "10px 12px",
        cursor: "pointer",
        borderBottom: isLast ? "none" : `1px solid ${cardBorder}`,
        display: "flex",
        alignItems: "center",
        gap: 10,
        // ✨ Feedback tap + hover state React
        background: pressed
          ? accentBg
          : hovered && !isMobile
          ? accentBg
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
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: accentBg,
          color: accent,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          fontSize: 11,
          flexShrink: 0,
        }}
        aria-hidden="true"
      >
        {eleve.nom?.[0]}
        {eleve.postnom?.[0]}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontWeight: 600,
            fontSize: 13,
            color: textPrimary,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {eleve.nom} {eleve.postnom} {eleve.prenom}
        </div>
        <div style={{ fontSize: 11, color: textSecondary }}>
          Classe {eleve.classe}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// GRAVITÉ FILTER BUTTON — ✨ feedback tap
// ════════════════════════════════════════════════════════════════════
function GraviteFilterButton({ gravite, isActive, onClick, dark, isMobile, cardBorder, textSecondary }) {
  const [pressed, setPressed] = useState(false);

  const gColor =
    gravite === "Grave"
      ? dark
        ? "#F87171"
        : "#EF4444"
      : gravite === "Moyenne"
      ? dark
        ? "#FBBF24"
        : "#F59E0B"
      : gravite === "Légère"
      ? "#10B981"
      : dark
      ? "#818CF8"
      : "#4F46E5";

  const handleTouchStart = () => setPressed(true);
  const handleTouchEnd = () => setPressed(false);
  const handleTouchCancel = () => setPressed(false);

  return (
    <button
      type="button"
      onClick={onClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      aria-pressed={isActive}
      style={{
        padding: isMobile ? "10px 14px" : "6px 12px",
        border: `1px solid ${isActive ? gColor : cardBorder}`,
        borderRadius: 20,
        background: isActive ? `${gColor}20` : "transparent",
        color: isActive ? gColor : textSecondary,
        fontWeight: 600,
        cursor: "pointer",
        fontSize: isMobile ? 13 : 12,
        flexShrink: 0,
        whiteSpace: "nowrap",
        minHeight: isMobile ? 40 : undefined,
        // ✨ Feedback tap
        transform: pressed ? "scale(0.95)" : "scale(1)",
        transition: "transform 0.1s ease, background 0.12s ease, border-color 0.15s ease",
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation",
        fontFamily: "inherit",
        boxSizing: "border-box",
      }}
    >
      {gravite === "toutes" ? "Toutes" : gravite}
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ════════════════════════════════════════════════════════════════════
export function SaisirPunition({
  user,
  ecoleId,
  eleves,
  fautes,
  sanctions,
  onNotif,
  anneeId,
  anneeActive,
}) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();
  const { confirm, dialogProps } = useConfirm();

  const userId = user?._id;
  const userNom = user?.nom || user?.prenom || "Disciplinaire";

  // Store Zustand
  const search = useAppStore((state) => state.saisirPunitionSearch || "");
  const setSearch = useAppStore((state) => state.setSaisirPunitionSearch);
  const selectedEleve = useAppStore(
    (state) => state.saisirPunitionSelectedEleve
  );
  const setSelectedEleve = useAppStore(
    (state) => state.setSaisirPunitionSelectedEleve
  );
  const idFaute = useAppStore((state) => state.saisirPunitionIdFaute || "");
  const setIdFaute = useAppStore((state) => state.setSaisirPunitionIdFaute);
  const date = useAppStore(
    (state) =>
      state.saisirPunitionDate || new Date().toISOString().split("T")[0]
  );
  const setDate = useAppStore((state) => state.setSaisirPunitionDate);
  const commentaire = useAppStore(
    (state) => state.saisirPunitionCommentaire || ""
  );
  const setCommentaire = useAppStore(
    (state) => state.setSaisirPunitionCommentaire
  );
  const sanction = useAppStore((state) => state.saisirPunitionSanction || "");
  const setSanction = useAppStore(
    (state) => state.setSaisirPunitionSanction
  );
  const graviteFilter = useAppStore(
    (state) => state.saisirPunitionGraviteFilter || "toutes"
  );
  const setGraviteFilter = useAppStore(
    (state) => state.setSaisirPunitionGraviteFilter
  );

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  // ✨ Feedback tap
  const [pressedBtn, setPressedBtn] = useState(null);
  // ✨ Focus state pour inputs
  const [focusedField, setFocusedField] = useState(null);

  const addPunitionMutation = useMutation(api.punitions.add);
  const searchTimeoutRef = useRef(null);

  // ✨ Handlers touch
  const pressBtn = useCallback((id) => () => setPressedBtn(id), []);
  const releaseBtn = useCallback(() => setPressedBtn(null), []);

  // Couleurs
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const inputBg = dark ? "#0F172A" : "#F8FAFC";
  const inputText = dark ? "#F1F5F9" : "#1E293B";
  const accent = dark ? "#818CF8" : "#4F46E5";
  const accentBg = dark ? "#312E81" : "#EEF2FF";
  const accentText = dark ? "#A5B4FC" : "#4F46E5";
  const danger = dark ? "#F87171" : "#EF4444";
  const warning = dark ? "#FBBF24" : "#F59E0B";
  const shadow = dark
    ? "0 1px 3px rgba(0,0,0,0.3)"
    : "0 1px 3px rgba(0,0,0,0.05)";

  // Debounce
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [search]);

  // Filtres
  const filteredFautes = useMemo(() => {
    if (graviteFilter === "toutes") return fautes;
    return fautes.filter((f) => f.gravite === graviteFilter);
  }, [fautes, graviteFilter]);

  const filteredEleves = useMemo(() => {
    if (debouncedSearch.trim().length < 2) return [];
    const query = debouncedSearch.toLowerCase();
    return eleves
      .filter((e) =>
        `${e.nom} ${e.postnom} ${e.prenom || ""}`
          .toLowerCase()
          .includes(query)
      )
      .sort(trierEleves)
      .slice(0, 10);
  }, [eleves, debouncedSearch]);

  // Faute sélectionnée
  const fauteSelectionnee = useMemo(
    () => (idFaute ? getFaute(fautes, idFaute) : null),
    [fautes, idFaute]
  );

  // Validation
  const validate = () => {
    const newErrors = {};
    if (!selectedEleve)
      newErrors.selectedEleve = "Veuillez sélectionner un élève.";
    if (!idFaute) newErrors.idFaute = "Veuillez choisir un type de faute.";
    if (!date) newErrors.date = "La date est requise.";
    if (!sanction) newErrors.sanction = "Veuillez choisir une sanction.";
    if (!userId) newErrors.global = "Session utilisateur invalide.";
    return newErrors;
  };

  const resetForm = () => {
    setSelectedEleve(null);
    setSearch("");
    setIdFaute("");
    setDate(new Date().toISOString().split("T")[0]);
    setCommentaire("");
    setSanction("");
    setGraviteFilter("toutes");
    setErrors({});
  };

  const handleSubmit = async () => {
    if (submitting) return;

    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      if (validationErrors.global) toast.error(validationErrors.global);
      return;
    }

    const ok = await confirm(
      "Enregistrer la punition",
      `Voulez-vous vraiment enregistrer cette punition pour ${selectedEleve.nom} ${selectedEleve.postnom} ?`
    );
    if (!ok) return;

    setSubmitting(true);
    try {
      await addPunitionMutation({
        idEleve: selectedEleve._id,
        idFaute,
        date,
        commentaire: commentaire || undefined,
        sanction,
        disciplinaire: userNom,
        ecoleId,
        anneeId,
        userId,
      });
      toast.success("Punition enregistrée");

      if (fauteSelectionnee?.gravite === "Grave" && onNotif) {
        onNotif(
          `${selectedEleve.nom} ${selectedEleve.postnom} (${selectedEleve.classe}) — ${fauteSelectionnee.libelle}`
        );
      }
      resetForm();
    } catch (err) {
      toast.error(userFriendlyError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const isFormValid = Boolean(selectedEleve && idFaute && date && sanction);
  const gravites = ["toutes", "Légère", "Moyenne", "Grave"];

  // ✨ inputStyle avec focus state + 16px mobile (évite zoom iOS)
  const inputStyle = (fieldName, hasError = false) => ({
    width: "100%",
    padding: isMobile ? "12px 14px" : "10px 14px",
    border: `1px solid ${
      hasError
        ? "#EF4444"
        : focusedField === fieldName
        ? accent
        : cardBorder
    }`,
    borderRadius: 10,
    // ✨ 16px mobile (évite le zoom iOS Safari)
    fontSize: isMobile ? 16 : 14,
    outline: "none",
    background: inputBg,
    color: inputText,
    boxSizing: "border-box",
    fontFamily: "inherit",
    appearance: "none",
    WebkitAppearance: "none",
    MozAppearance: "none",
    transition: "border-color 0.15s ease",
    minHeight: isMobile ? MOBILE_TAP : undefined,
    WebkitTapHighlightColor: "transparent",
    touchAction: "manipulation",
  });

  // ✨ Container padding avec safe-area
  const containerPadding = isMobile
    ? `calc(10px + ${SAFE_TOP}) calc(8px + ${SAFE_RIGHT}) calc(90px + ${SAFE_BOTTOM}) calc(8px + ${SAFE_LEFT})`
    : "20px 16px 40px";

  return (
    <>
      {SaisirPunitionKeyframes}
      <div
        style={{
          maxWidth: 720,
          margin: "0 auto",
          padding: containerPadding,
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {/* ═══ EN-TÊTE ═══ */}
        <div style={{ marginBottom: isMobile ? 12 : 20 }}>
          <h2
            style={{
              fontSize: isMobile ? 17 : 22,
              fontWeight: 700,
              color: textPrimary,
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            Nouvelle punition
          </h2>
          <p
            style={{
              color: textSecondary,
              marginTop: 2,
              marginBottom: 0,
              fontSize: isMobile ? 11.5 : 13,
            }}
          >
            Enregistrez une faute disciplinaire
            {anneeActive ? ` · ${anneeActive.nom}` : ""}
          </p>
        </div>

        {/* ═══ FORMULAIRE ═══ */}
        <div
          style={{
            background: cardBg,
            borderRadius: 14,
            border: `1px solid ${cardBorder}`,
            boxShadow: shadow,
            padding: isMobile ? 14 : 20,
            boxSizing: "border-box",
          }}
        >
          {/* ═══ ÉLÈVE ═══ */}
          <FormSection
            icon={<User size={13} />}
            label="Élève"
            dark={dark}
            error={!!errors.selectedEleve}
          >
            {selectedEleve ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  background: accentBg,
                  borderRadius: 10,
                  border: `1px solid ${accent}`,
                  boxSizing: "border-box",
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: accent,
                    color: "#FFFFFF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: 12,
                    flexShrink: 0,
                  }}
                  aria-hidden="true"
                >
                  {selectedEleve.nom?.[0]}
                  {selectedEleve.postnom?.[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 13.5,
                      color: textPrimary,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {selectedEleve.nom} {selectedEleve.postnom}{" "}
                    {selectedEleve.prenom}
                  </div>
                  <div style={{ fontSize: 11, color: textSecondary }}>
                    Classe {selectedEleve.classe}
                  </div>
                </div>
                {/* ✨ Bouton Changer : 44px tap target mobile */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedEleve(null);
                    setSearch("");
                  }}
                  onTouchStart={pressBtn("change-eleve")}
                  onTouchEnd={releaseBtn}
                  onTouchCancel={releaseBtn}
                  style={{
                    background: "transparent",
                    border: `1px solid ${accent}`,
                    borderRadius: 8,
                    padding: isMobile ? "10px 12px" : "6px 10px",
                    color: accentText,
                    cursor: "pointer",
                    fontSize: isMobile ? 13 : 11.5,
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    flexShrink: 0,
                    minHeight: isMobile ? MOBILE_TAP : undefined,
                    transform:
                      pressedBtn === "change-eleve"
                        ? "scale(0.96)"
                        : "scale(1)",
                    transition: "transform 0.1s ease",
                    WebkitTapHighlightColor: "transparent",
                    touchAction: "manipulation",
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                  }}
                  aria-label="Changer d'élève"
                >
                  <X size={isMobile ? 14 : 11} aria-hidden="true" /> Changer
                </button>
              </div>
            ) : (
              <>
                <div style={{ position: "relative" }}>
                  <Search
                    size={15}
                    color={textSecondary}
                    style={{
                      position: "absolute",
                      left: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      pointerEvents: "none",
                    }}
                    aria-hidden="true"
                  />
                  <input
                    style={{
                      ...inputStyle("search", !!errors.selectedEleve),
                      paddingLeft: 36,
                      paddingRight: isMobile ? 48 : 40,
                    }}
                    placeholder="Tapez le nom de l'élève…"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setErrors((prev) => ({
                        ...prev,
                        selectedEleve: undefined,
                      }));
                    }}
                    onFocus={() => setFocusedField("search")}
                    onBlur={() => setFocusedField(null)}
                    inputMode="search"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck="false"
                    aria-label="Rechercher un élève"
                  />
                  {search && (
                    // ✨ Clear X : 44px mobile
                    <button
                      type="button"
                      onClick={() => setSearch("")}
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
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Suggestions */}
                {debouncedSearch.length >= 2 && (
                  <div
                    style={{
                      marginTop: 8,
                      maxHeight: 220,
                      overflowY: "auto",
                      border: `1px solid ${cardBorder}`,
                      borderRadius: 10,
                      background: inputBg,
                      overscrollBehavior: "contain",
                      WebkitOverflowScrolling: "touch",
                    }}
                  >
                    {filteredEleves.length === 0 ? (
                      <div
                        style={{
                          padding: 16,
                          textAlign: "center",
                          color: textSecondary,
                          fontSize: 12.5,
                        }}
                      >
                        Aucun élève trouvé
                      </div>
                    ) : (
                      filteredEleves.map((e, idx) => (
                        <SuggestionRow
                          key={e._id}
                          eleve={e}
                          isLast={idx === filteredEleves.length - 1}
                          dark={dark}
                          isMobile={isMobile}
                          accentBg={accentBg}
                          accent={accent}
                          textPrimary={textPrimary}
                          textSecondary={textSecondary}
                          cardBorder={cardBorder}
                          inputBg={inputBg}
                          onClick={() => {
                            setSelectedEleve(e);
                            setSearch(`${e.nom} ${e.postnom}`);
                          }}
                        />
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </FormSection>

          {/* ═══ TYPE DE FAUTE ═══ */}
          <FormSection
            icon={<Gavel size={13} />}
            label="Type de faute"
            dark={dark}
            error={!!errors.idFaute}
          >
            <div
              style={{
                display: "flex",
                gap: 6,
                marginBottom: 10,
                overflowX: "auto",
                paddingBottom: 4,
                WebkitOverflowScrolling: "touch",
                scrollbarWidth: "none",
                overscrollBehaviorX: "contain",
              }}
              role="tablist"
              aria-label="Filtrer par gravité"
            >
              {gravites.map((g) => (
                <GraviteFilterButton
                  key={g}
                  gravite={g}
                  isActive={graviteFilter === g}
                  onClick={() => setGraviteFilter(g)}
                  dark={dark}
                  isMobile={isMobile}
                  cardBorder={cardBorder}
                  textSecondary={textSecondary}
                />
              ))}
            </div>

            <select
              value={idFaute}
              onChange={(e) => {
                setIdFaute(e.target.value);
                setErrors((prev) => ({ ...prev, idFaute: undefined }));
              }}
              onFocus={() => setFocusedField("faute")}
              onBlur={() => setFocusedField(null)}
              style={{ ...inputStyle("faute", !!errors.idFaute), cursor: "pointer" }}
              aria-label="Sélectionner un type de faute"
            >
              <option value="">Sélectionner une faute…</option>
              {filteredFautes.map((f) => (
                <option key={f._id} value={f._id}>
                  {f.libelle} ({f.gravite})
                </option>
              ))}
            </select>

            {fauteSelectionnee && (
              <div
                role="status"
                style={{
                  marginTop: 8,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 10px",
                  background:
                    fauteSelectionnee.gravite === "Grave"
                      ? dark
                        ? "#7F1D1D20"
                        : "#FEF2F2"
                      : dark
                      ? "#78350F20"
                      : "#FEF3C7",
                  border: `1px solid ${
                    fauteSelectionnee.gravite === "Grave" ? danger : warning
                  }40`,
                  borderRadius: 8,
                  fontSize: 11.5,
                  color:
                    fauteSelectionnee.gravite === "Grave" ? danger : warning,
                  fontWeight: 600,
                }}
              >
                <AlertTriangle size={12} aria-hidden="true" />
                Gravité : {fauteSelectionnee.gravite}
              </div>
            )}
          </FormSection>

          {/* ═══ DATE + SANCTION ═══ */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
              gap: 14,
            }}
          >
            <FormSection
              icon={<Calendar size={13} />}
              label="Date"
              dark={dark}
              error={!!errors.date}
            >
              <input
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setErrors((prev) => ({ ...prev, date: undefined }));
                }}
                onFocus={() => setFocusedField("date")}
                onBlur={() => setFocusedField(null)}
                style={{
                  ...inputStyle("date", !!errors.date),
                  colorScheme: dark ? "dark" : "light",
                }}
                aria-label="Date de la punition"
              />
            </FormSection>

            <FormSection
              icon={<Gavel size={13} />}
              label="Sanction"
              dark={dark}
              error={!!errors.sanction}
            >
              <select
                value={sanction}
                onChange={(e) => {
                  setSanction(e.target.value);
                  setErrors((prev) => ({ ...prev, sanction: undefined }));
                }}
                onFocus={() => setFocusedField("sanction")}
                onBlur={() => setFocusedField(null)}
                style={{
                  ...inputStyle("sanction", !!errors.sanction),
                  cursor: "pointer",
                }}
                aria-label="Sélectionner une sanction"
              >
                <option value="">Choisir une sanction…</option>
                {sanctions.map((s) => (
                  <option key={s._id} value={s.libelle}>
                    {s.libelle}
                  </option>
                ))}
              </select>
            </FormSection>
          </div>

          {/* ═══ COMMENTAIRE ═══ */}
          <FormSection
            icon={<MessageSquare size={13} />}
            label="Commentaire (optionnel)"
            dark={dark}
          >
            <textarea
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              onFocus={() => setFocusedField("commentaire")}
              onBlur={() => setFocusedField(null)}
              placeholder="Détails de l'incident…"
              rows={isMobile ? 3 : 2}
              style={{
                ...inputStyle("commentaire", false),
                resize: "vertical",
                minHeight: 70,
                lineHeight: 1.4,
              }}
              aria-label="Commentaire sur l'incident"
            />
          </FormSection>
        </div>

        {/* ═══ BARRE FLOTTANTE ENREGISTRER ═══ */}
        <div
          className="sp-slide-up"
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            background: cardBg,
            borderTop: `1px solid ${cardBorder}`,
            padding: isMobile
              ? `10px calc(14px + ${SAFE_LEFT}) calc(10px + ${SAFE_BOTTOM}) calc(14px + ${SAFE_RIGHT})`
              : "12px 24px",
            zIndex: 950,
            boxShadow: "0 -4px 20px rgba(0,0,0,0.15)",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              maxWidth: 720,
              margin: "0 auto",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            {!isMobile && (
              <div
                style={{
                  flex: 1,
                  fontSize: 12,
                  color: textSecondary,
                }}
              >
                {isFormValid ? (
                  <span style={{ color: "#10B981", fontWeight: 600 }}>
                    ✓ Formulaire prêt
                  </span>
                ) : (
                  <span>Complétez les champs obligatoires</span>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!isFormValid || submitting}
              onTouchStart={
                isFormValid && !submitting ? pressBtn("submit") : undefined
              }
              onTouchEnd={releaseBtn}
              onTouchCancel={releaseBtn}
              style={{
                flex: isMobile ? 1 : "none",
                padding: isMobile ? "14px 20px" : "12px 24px",
                background:
                  !isFormValid || submitting
                    ? dark
                      ? "#334155"
                      : "#E2E8F0"
                    : pressedBtn === "submit"
                    ? dark
                      ? "#6366F1"
                      : "#4338CA"
                    : accent,
                color:
                  !isFormValid || submitting
                    ? dark
                      ? "#64748B"
                      : "#94A3B8"
                    : "#FFFFFF",
                border: "none",
                borderRadius: 12,
                fontWeight: 700,
                cursor:
                  !isFormValid || submitting ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                fontSize: isMobile ? 15 : 14,
                minWidth: isMobile ? "auto" : 220,
                minHeight: MOBILE_TAP,
                // ✨ Feedback tap
                transform:
                  pressedBtn === "submit" && isFormValid && !submitting
                    ? "scale(0.98)"
                    : "scale(1)",
                transition:
                  "transform 0.1s ease, background 0.12s ease",
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation",
                fontFamily: "inherit",
                boxSizing: "border-box",
              }}
            >
              {submitting ? (
                <>
                  <Loader size={16} className="sp-spin" aria-hidden="true" />
                  Enregistrement…
                </>
              ) : (
                <>
                  <Check size={16} aria-hidden="true" />
                  Enregistrer la punition
                </>
              )}
            </button>
          </div>
        </div>

        <ConfirmDialog {...dialogProps} />
      </div>
    </>
  );
}