// src/components/GestionEcoles.jsx
import { useState, useMemo, useCallback, useDeferredValue, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useConfirm } from "@/hooks/useConfirm";
import { ConfirmDialog } from "./ConfirmDialog";
import toast from "react-hot-toast";
import {
  Loader, Plus, Edit2, Trash2, Search, X, Check,
  Users, Building2, ArrowRight, ChevronUp, ChevronDown,
  Power, Ban, CheckCircle2, XCircle, LayoutGrid, List,
  School, Download, CheckSquare, Square,
  ChevronLeft, ChevronRight, UserPlus, UserMinus,
} from "lucide-react";

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
const GestionEcolesKeyframes = (
  <style>{`
    @keyframes ge-spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
    .ge-spin { animation: ge-spin 1s linear infinite; }
    @media (prefers-reduced-motion: reduce) {
      .ge-spin { animation: none !important; }
    }
  `}</style>
);

// ════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════
// ✨ Mémoïsé une seule fois (au lieu d'un appel par render)
const PREFERS_REDUCED_MOTION =
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// ════════════════════════════════════════════════════════════════════
// STATUT BADGE
// ════════════════════════════════════════════════════════════════════
const StatutBadge = ({ statut, dark }) => {
  const isActive = statut !== "suspendue";
  const badgeActiveBg = dark ? "#064E3B" : "#D1FAE5";
  const badgeActiveText = dark ? "#34D399" : "#065F46";
  const badgeSuspendedBg = dark ? "#78350F" : "#FEF3C7";
  const badgeSuspendedText = dark ? "#FBBF24" : "#92400E";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "4px 10px",
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 600,
        background: isActive ? badgeActiveBg : badgeSuspendedBg,
        color: isActive ? badgeActiveText : badgeSuspendedText,
        flexShrink: 0,
      }}
    >
      {isActive ? (
        <CheckCircle2 size={14} aria-hidden="true" />
      ) : (
        <XCircle size={14} aria-hidden="true" />
      )}
      {isActive ? "Active" : "Suspendue"}
    </span>
  );
};

// ════════════════════════════════════════════════════════════════════
// SEARCH BAR — ✨ Clear X 44×44px mobile
// ════════════════════════════════════════════════════════════════════
const SearchBar = ({
  searchTerm,
  setSearchTerm,
  textSecondary,
  cardBg,
  cardBorder,
  textPrimary,
  isMobile,
}) => {
  const [focused, setFocused] = useState(false);
  const [pressedClear, setPressedClear] = useState(false);

  return (
    <div
      style={{
        background: cardBg,
        border: `1px solid ${focused ? (textPrimary === "#F1F5F9" ? "#818CF8" : "#4F46E5") : cardBorder}`,
        borderRadius: 12,
        padding: isMobile ? "10px 12px" : "8px 12px",
        display: "flex",
        alignItems: "center",
        gap: 8,
        flex: 1,
        minWidth: isMobile ? "100%" : 200,
        minHeight: isMobile ? MOBILE_TAP : undefined,
        boxSizing: "border-box",
        transition: "border-color 0.15s ease",
      }}
    >
      <Search size={16} color={textSecondary} aria-hidden="true" />
      <input
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Rechercher une école..."
        inputMode="search"
        autoComplete="off"
        autoCorrect="off"
        spellCheck="false"
        aria-label="Rechercher une école"
        style={{
          border: "none",
          outline: "none",
          background: "transparent",
          color: textPrimary,
          fontSize: isMobile ? 16 : 14,
          width: "100%",
          fontFamily: "inherit",
          minWidth: 0,
          WebkitTapHighlightColor: "transparent",
          touchAction: "manipulation",
        }}
      />
      {searchTerm && (
        <button
          type="button"
          onClick={() => setSearchTerm("")}
          onTouchStart={() => setPressedClear(true)}
          onTouchEnd={() => setPressedClear(false)}
          onTouchCancel={() => setPressedClear(false)}
          aria-label="Effacer la recherche"
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: textSecondary,
            padding: 0,
            width: isMobile ? MOBILE_TAP : 32,
            height: isMobile ? MOBILE_TAP : 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 8,
            transform: pressedClear ? "scale(0.9)" : "scale(1)",
            transition: "transform 0.1s ease",
            WebkitTapHighlightColor: "transparent",
            touchAction: "manipulation",
            flexShrink: 0,
          }}
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════
// SORT BUTTON
// ════════════════════════════════════════════════════════════════════
const SortButton = ({
  label,
  field,
  currentSort,
  currentOrder,
  onClick,
  activeBg,
  activeText,
  textSecondary,
  cardBg,
  cardBorder,
  isMobile,
}) => {
  const [pressed, setPressed] = useState(false);
  const isActive = currentSort === field;

  return (
    <button
      type="button"
      onClick={() => onClick(field)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      onTouchCancel={() => setPressed(false)}
      aria-pressed={isActive}
      aria-label={`Trier par ${label}`}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        padding: isMobile ? "10px 12px" : "8px 12px",
        background: isActive ? activeBg : cardBg,
        color: isActive ? activeText : textSecondary,
        border: `1px solid ${cardBorder}`,
        borderRadius: 8,
        cursor: "pointer",
        fontSize: 13,
        fontWeight: isActive ? 600 : 400,
        flex: isMobile ? 1 : "none",
        minHeight: MOBILE_TAP,
        transform: pressed ? "scale(0.96)" : "scale(1)",
        transition: "transform 0.1s ease, background 0.12s ease",
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation",
        fontFamily: "inherit",
        boxSizing: "border-box",
      }}
    >
      {label}
      {isActive &&
        (currentOrder === "asc" ? (
          <ChevronUp size={14} aria-hidden="true" />
        ) : (
          <ChevronDown size={14} aria-hidden="true" />
        ))}
    </button>
  );
};

// ════════════════════════════════════════════════════════════════════
// ECOLE CARD — ✨ refactorée avec feedback tap + focus
// ════════════════════════════════════════════════════════════════════
const EcoleCard = ({
  ecole,
  editingId,
  editNom,
  setEditNom,
  startEdit,
  cancelEdit,
  handleUpdate,
  handleToggleStatus,
  handleDelete,
  onSelectEcole,
  togglingId,
  deletingId,
  dark,
  textPrimary,
  textSecondary,
  cardBg,
  cardBorder,
  inputBg,
  accentColor,
  successColor,
  warningColor,
  dangerColor,
  selected,
  onToggleSelect,
  isMobile,
}) => {
  const isEditing = editingId === ecole._id;
  const [hovered, setHovered] = useState(false);
  const [pressedCard, setPressedCard] = useState(false);
  const [pressedBtn, setPressedBtn] = useState(null);

  const pressBtn = (key) => () => setPressedBtn(key);
  const releaseBtn = () => setPressedBtn(null);

  const noMotion = PREFERS_REDUCED_MOTION;

  return (
    <div
      onMouseEnter={() => !noMotion && !isMobile && setHovered(true)}
      onMouseLeave={() => !isMobile && setHovered(false)}
      onTouchStart={() => setPressedCard(true)}
      onTouchEnd={() => setPressedCard(false)}
      onTouchCancel={() => setPressedCard(false)}
      style={{
        background: cardBg,
        borderRadius: 16,
        padding: isMobile ? 14 : 20,
        boxShadow: hovered
          ? dark
            ? "0 4px 12px rgba(0,0,0,0.5)"
            : "0 4px 12px rgba(0,0,0,0.1)"
          : dark
          ? "0 1px 3px rgba(0,0,0,0.3)"
          : "0 1px 3px rgba(0,0,0,0.05)",
        border: `1px solid ${selected ? accentColor : cardBorder}`,
        transition: noMotion
          ? "none"
          : "box-shadow 0.2s ease, transform 0.1s ease, border-color 0.2s ease",
        transform: pressedCard
          ? "scale(0.99)"
          : hovered && !noMotion && !isMobile
          ? "translateY(-2px)"
          : "translateY(0)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        position: "relative",
        boxSizing: "border-box",
      }}
    >
      {/* ✨ Checkbox avec zone 44×44 mobile */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleSelect(ecole._id);
        }}
        onTouchStart={pressBtn("select")}
        onTouchEnd={releaseBtn}
        onTouchCancel={releaseBtn}
        style={{
          position: "absolute",
          top: isMobile ? 2 : 6,
          right: isMobile ? 2 : 6,
          background: "transparent",
          border: "none",
          cursor: "pointer",
          padding: 0,
          width: MOBILE_TAP,
          height: MOBILE_TAP,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 8,
          color: selected ? accentColor : textSecondary,
          transform:
            pressedBtn === "select" ? "scale(0.9)" : "scale(1)",
          transition: "transform 0.1s ease",
          WebkitTapHighlightColor: "transparent",
          touchAction: "manipulation",
        }}
        aria-label={selected ? "Désélectionner" : "Sélectionner"}
      >
        {selected ? <CheckSquare size={20} /> : <Square size={20} />}
      </button>

      {isEditing ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            value={editNom}
            onChange={(e) => setEditNom(e.target.value)}
            aria-label="Modifier le nom de l'école"
            style={{
              flex: 1,
              padding: "10px 12px",
              borderRadius: 8,
              border: `1px solid ${accentColor}`,
              background: inputBg,
              color: textPrimary,
              fontSize: 16,
              outline: "none",
              fontFamily: "inherit",
              minHeight: MOBILE_TAP,
              boxSizing: "border-box",
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
            }}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleUpdate(ecole._id);
              if (e.key === "Escape") cancelEdit();
            }}
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleUpdate(ecole._id);
            }}
            onTouchStart={pressBtn("save-edit")}
            onTouchEnd={releaseBtn}
            onTouchCancel={releaseBtn}
            aria-label="Enregistrer"
            style={{
              background: successColor,
              color: "white",
              border: "none",
              borderRadius: 8,
              padding: 0,
              cursor: "pointer",
              width: MOBILE_TAP,
              height: MOBILE_TAP,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transform:
                pressedBtn === "save-edit" ? "scale(0.92)" : "scale(1)",
              transition: "transform 0.1s ease",
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
              flexShrink: 0,
            }}
          >
            <Check size={16} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              cancelEdit();
            }}
            onTouchStart={pressBtn("cancel-edit")}
            onTouchEnd={releaseBtn}
            onTouchCancel={releaseBtn}
            aria-label="Annuler"
            style={{
              background: "transparent",
              border: "none",
              color: textSecondary,
              cursor: "pointer",
              padding: 0,
              borderRadius: 8,
              width: MOBILE_TAP,
              height: MOBILE_TAP,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transform:
                pressedBtn === "cancel-edit" ? "scale(0.92)" : "scale(1)",
              transition: "transform 0.1s ease",
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
              flexShrink: 0,
            }}
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingRight: isMobile ? 44 : 48,
              gap: 8,
              minWidth: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                minWidth: 0,
              }}
            >
              <Building2
                size={20}
                color={accentColor}
                aria-hidden="true"
                style={{ flexShrink: 0 }}
              />
              <span
                style={{
                  fontWeight: 700,
                  fontSize: isMobile ? 15 : 16,
                  color: textPrimary,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {ecole.nom}
              </span>
            </div>
            <StatutBadge statut={ecole.statut} dark={dark} />
          </div>

          {ecole.code && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13,
                color: textSecondary,
              }}
            >
              Code : <span style={{ fontFamily: "monospace" }}>{ecole.code}</span>
            </div>
          )}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: textSecondary,
              fontSize: 13,
            }}
          >
            <Users size={14} aria-hidden="true" />
            <span>{ecole.userCount ?? 0} utilisateur(s)</span>
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              marginTop: "auto",
              flexDirection: isMobile ? "column" : "row",
            }}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectEcole(ecole._id);
              }}
              onTouchStart={pressBtn("open")}
              onTouchEnd={releaseBtn}
              onTouchCancel={releaseBtn}
              aria-label={`Ouvrir ${ecole.nom}`}
              style={{
                flex: 1,
                padding: isMobile ? "12px 12px" : "8px 12px",
                background: accentColor,
                color: "white",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                minHeight: MOBILE_TAP,
                transform: pressedBtn === "open" ? "scale(0.97)" : "scale(1)",
                transition: "transform 0.1s ease",
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation",
                fontFamily: "inherit",
                boxSizing: "border-box",
              }}
            >
              Ouvrir <ArrowRight size={14} aria-hidden="true" />
            </button>
            <div
              style={{
                display: "flex",
                gap: 4,
                justifyContent: isMobile ? "space-around" : "flex-start",
              }}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  startEdit(ecole);
                }}
                onTouchStart={pressBtn("edit")}
                onTouchEnd={releaseBtn}
                onTouchCancel={releaseBtn}
                aria-label="Modifier"
                title="Modifier"
                style={{
                  background: "transparent",
                  border: "none",
                  color: accentColor,
                  cursor: "pointer",
                  padding: 0,
                  borderRadius: 8,
                  width: MOBILE_TAP,
                  height: MOBILE_TAP,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transform: pressedBtn === "edit" ? "scale(0.9)" : "scale(1)",
                  transition: "transform 0.1s ease",
                  WebkitTapHighlightColor: "transparent",
                  touchAction: "manipulation",
                }}
              >
                <Edit2 size={16} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleStatus(ecole);
                }}
                disabled={togglingId === ecole._id}
                onTouchStart={
                  togglingId !== ecole._id ? pressBtn("toggle") : undefined
                }
                onTouchEnd={releaseBtn}
                onTouchCancel={releaseBtn}
                aria-label={
                  ecole.statut === "suspendue" ? "Activer" : "Suspendre"
                }
                title={
                  ecole.statut === "suspendue" ? "Activer" : "Suspendre"
                }
                style={{
                  background: "transparent",
                  border: "none",
                  color:
                    ecole.statut === "suspendue"
                      ? successColor
                      : warningColor,
                  cursor:
                    togglingId === ecole._id ? "not-allowed" : "pointer",
                  padding: 0,
                  borderRadius: 8,
                  opacity: togglingId === ecole._id ? 0.6 : 1,
                  width: MOBILE_TAP,
                  height: MOBILE_TAP,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transform:
                    pressedBtn === "toggle" ? "scale(0.9)" : "scale(1)",
                  transition: "transform 0.1s ease",
                  WebkitTapHighlightColor: "transparent",
                  touchAction: "manipulation",
                }}
              >
                {togglingId === ecole._id ? (
                  <Loader size={16} className="ge-spin" />
                ) : ecole.statut === "suspendue" ? (
                  <Power size={16} />
                ) : (
                  <Ban size={16} />
                )}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(ecole);
                }}
                disabled={deletingId === ecole._id}
                onTouchStart={
                  deletingId !== ecole._id ? pressBtn("delete") : undefined
                }
                onTouchEnd={releaseBtn}
                onTouchCancel={releaseBtn}
                aria-label="Supprimer"
                title="Supprimer"
                style={{
                  background: "transparent",
                  border: "none",
                  color: dangerColor,
                  cursor:
                    deletingId === ecole._id ? "not-allowed" : "pointer",
                  padding: 0,
                  borderRadius: 8,
                  opacity: deletingId === ecole._id ? 0.6 : 1,
                  width: MOBILE_TAP,
                  height: MOBILE_TAP,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transform:
                    pressedBtn === "delete" ? "scale(0.9)" : "scale(1)",
                  transition: "transform 0.1s ease",
                  WebkitTapHighlightColor: "transparent",
                  touchAction: "manipulation",
                }}
              >
                {deletingId === ecole._id ? (
                  <Loader size={16} className="ge-spin" />
                ) : (
                  <Trash2 size={16} />
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════
// ECOLE LIST VIEW
// ════════════════════════════════════════════════════════════════════
const EcoleListView = ({
  ecoles,
  editingId,
  editNom,
  setEditNom,
  startEdit,
  cancelEdit,
  handleUpdate,
  handleToggleStatus,
  handleDelete,
  onSelectEcole,
  togglingId,
  deletingId,
  dark,
  textPrimary,
  textSecondary,
  cardBg,
  cardBorder,
  inputBg,
  accentColor,
  successColor,
  warningColor,
  dangerColor,
  selectedIds,
  onToggleSelect,
  isMobile,
}) => (
  <div
    style={{
      marginTop: 12,
      display: "flex",
      flexDirection: "column",
      gap: 8,
      width: "100%",
    }}
  >
    {ecoles.map((ecole) => (
      <div
        key={ecole._id}
        style={{
          background: cardBg,
          border: `1px solid ${
            selectedIds.has(ecole._id) ? accentColor : cardBorder
          }`,
          borderRadius: 12,
          padding: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
          width: "100%",
          flexDirection: isMobile ? "column" : "row",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flex: 1,
            minWidth: isMobile ? "100%" : 200,
            minHeight: MOBILE_TAP,
          }}
        >
          <button
            type="button"
            onClick={() => onToggleSelect(ecole._id)}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: 0,
              width: MOBILE_TAP,
              height: MOBILE_TAP,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 8,
              color: selectedIds.has(ecole._id)
                ? accentColor
                : textSecondary,
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
              flexShrink: 0,
            }}
            aria-label={
              selectedIds.has(ecole._id) ? "Désélectionner" : "Sélectionner"
            }
          >
            {selectedIds.has(ecole._id) ? (
              <CheckSquare size={20} />
            ) : (
              <Square size={20} />
            )}
          </button>
          <Building2
            size={18}
            color={accentColor}
            aria-hidden="true"
            style={{ flexShrink: 0 }}
          />
          <span
            style={{
              fontWeight: 600,
              color: textPrimary,
              fontSize: isMobile ? 15 : 16,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              minWidth: 0,
            }}
          >
            {ecole.nom}
          </span>
          {ecole.code && (
            <span
              style={{
                fontFamily: "monospace",
                fontSize: 12,
                color: textSecondary,
              }}
            >
              ({ecole.code})
            </span>
          )}
          <StatutBadge statut={ecole.statut} dark={dark} />
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            flexWrap: "wrap",
            justifyContent: isMobile ? "space-around" : "flex-start",
            width: isMobile ? "100%" : "auto",
          }}
        >
          <span
            style={{
              color: textSecondary,
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "0 8px",
            }}
          >
            <Users size={14} aria-hidden="true" /> {ecole.userCount ?? 0}
          </span>
          <button
            type="button"
            onClick={() => onSelectEcole(ecole._id)}
            style={{
              background: accentColor,
              color: "white",
              border: "none",
              borderRadius: 8,
              padding: "10px 14px",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              minHeight: MOBILE_TAP,
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
              fontFamily: "inherit",
            }}
          >
            Ouvrir
          </button>
          <button
            type="button"
            onClick={() => startEdit(ecole)}
            aria-label="Modifier"
            title="Modifier"
            style={{
              background: "transparent",
              border: "none",
              color: accentColor,
              cursor: "pointer",
              padding: 0,
              width: MOBILE_TAP,
              height: MOBILE_TAP,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 8,
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
            }}
          >
            <Edit2 size={16} />
          </button>
          <button
            type="button"
            onClick={() => handleToggleStatus(ecole)}
            disabled={togglingId === ecole._id}
            aria-label={
              ecole.statut === "suspendue" ? "Activer" : "Suspendre"
            }
            title={ecole.statut === "suspendue" ? "Activer" : "Suspendre"}
            style={{
              background: "transparent",
              border: "none",
              color:
                ecole.statut === "suspendue" ? successColor : warningColor,
              cursor: togglingId === ecole._id ? "not-allowed" : "pointer",
              padding: 0,
              opacity: togglingId === ecole._id ? 0.6 : 1,
              width: MOBILE_TAP,
              height: MOBILE_TAP,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 8,
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
            }}
          >
            {togglingId === ecole._id ? (
              <Loader size={16} className="ge-spin" />
            ) : ecole.statut === "suspendue" ? (
              <Power size={16} />
            ) : (
              <Ban size={16} />
            )}
          </button>
          <button
            type="button"
            onClick={() => handleDelete(ecole)}
            disabled={deletingId === ecole._id}
            aria-label="Supprimer"
            title="Supprimer"
            style={{
              background: "transparent",
              border: "none",
              color: dangerColor,
              cursor: deletingId === ecole._id ? "not-allowed" : "pointer",
              padding: 0,
              opacity: deletingId === ecole._id ? 0.6 : 1,
              width: MOBILE_TAP,
              height: MOBILE_TAP,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 8,
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
            }}
          >
            {deletingId === ecole._id ? (
              <Loader size={16} className="ge-spin" />
            ) : (
              <Trash2 size={16} />
            )}
          </button>
        </div>
        {editingId === ecole._id && (
          <div
            style={{
              width: "100%",
              display: "flex",
              gap: 8,
              marginTop: 4,
              alignItems: "center",
            }}
          >
            <input
              value={editNom}
              onChange={(e) => setEditNom(e.target.value)}
              aria-label="Modifier le nom de l'école"
              style={{
                flex: 1,
                padding: "10px 12px",
                borderRadius: 8,
                border: `1px solid ${accentColor}`,
                background: inputBg,
                color: textPrimary,
                fontSize: 16,
                outline: "none",
                fontFamily: "inherit",
                minHeight: MOBILE_TAP,
                boxSizing: "border-box",
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation",
              }}
              autoFocus
            />
            <button
              type="button"
              onClick={() => handleUpdate(ecole._id)}
              aria-label="Enregistrer"
              style={{
                background: successColor,
                color: "white",
                border: "none",
                borderRadius: 8,
                padding: 0,
                cursor: "pointer",
                width: MOBILE_TAP,
                height: MOBILE_TAP,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation",
                flexShrink: 0,
              }}
            >
              <Check size={16} />
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              aria-label="Annuler"
              style={{
                background: "transparent",
                border: "none",
                color: textSecondary,
                cursor: "pointer",
                padding: 0,
                width: MOBILE_TAP,
                height: MOBILE_TAP,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 8,
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation",
                flexShrink: 0,
              }}
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>
    ))}
  </div>
);

// ════════════════════════════════════════════════════════════════════
// PAGINATION CONTROLS — ✨ 44px mobile
// ════════════════════════════════════════════════════════════════════
const PaginationControls = ({
  currentPage,
  totalPages,
  onPageChange,
  textPrimary,
  textSecondary,
  borderColor,
}) => {
  const [pressedBtn, setPressedBtn] = useState(null);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: 8,
        marginTop: 16,
        width: "100%",
      }}
    >
      <button
        type="button"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        onTouchStart={
          currentPage !== 1 ? () => setPressedBtn("prev") : undefined
        }
        onTouchEnd={() => setPressedBtn(null)}
        onTouchCancel={() => setPressedBtn(null)}
        aria-label="Page précédente"
        style={{
          padding: 0,
          border: `1px solid ${borderColor}`,
          borderRadius: 8,
          background: "transparent",
          cursor: currentPage === 1 ? "not-allowed" : "pointer",
          color: textPrimary,
          width: MOBILE_TAP,
          height: MOBILE_TAP,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform:
            pressedBtn === "prev" && currentPage !== 1
              ? "scale(0.92)"
              : "scale(1)",
          transition: "transform 0.1s ease",
          opacity: currentPage === 1 ? 0.5 : 1,
          WebkitTapHighlightColor: "transparent",
          touchAction: "manipulation",
        }}
      >
        <ChevronLeft size={18} />
      </button>
      <span
        style={{
          fontSize: 13,
          color: textSecondary,
          fontVariantNumeric: "tabular-nums",
          padding: "0 8px",
        }}
      >
        Page {currentPage} / {totalPages}
      </span>
      <button
        type="button"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        onTouchStart={
          currentPage !== totalPages ? () => setPressedBtn("next") : undefined
        }
        onTouchEnd={() => setPressedBtn(null)}
        onTouchCancel={() => setPressedBtn(null)}
        aria-label="Page suivante"
        style={{
          padding: 0,
          border: `1px solid ${borderColor}`,
          borderRadius: 8,
          background: "transparent",
          cursor: currentPage === totalPages ? "not-allowed" : "pointer",
          color: textPrimary,
          width: MOBILE_TAP,
          height: MOBILE_TAP,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform:
            pressedBtn === "next" && currentPage !== totalPages
              ? "scale(0.92)"
              : "scale(1)",
          transition: "transform 0.1s ease",
          opacity: currentPage === totalPages ? 0.5 : 1,
          WebkitTapHighlightColor: "transparent",
          touchAction: "manipulation",
        }}
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════
// HELPER : batch + rapport
// ════════════════════════════════════════════════════════════════════
const runInBatchesWithReport = async (items, fn, size = 5) => {
  let succeeded = 0;
  let failed = 0;
  const errors = [];

  for (let i = 0; i < items.length; i += size) {
    const batch = items.slice(i, i + size);
    const results = await Promise.allSettled(batch.map(fn));
    for (const r of results) {
      if (r.status === "fulfilled") succeeded++;
      else {
        failed++;
        errors.push(r.reason?.message ?? "Erreur inconnue");
      }
    }
  }

  return { succeeded, failed, errors };
};

// ════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ════════════════════════════════════════════════════════════════════
export function GestionEcoles({ onSelectEcole, user }) {
  const { S, dark } = useStyles();
  const isMobile = useIsMobile();
  const { confirm, dialogProps } = useConfirm();

  const currentUserId = user?._id;

  // ✨ Feedback tap
  const [pressedBtn, setPressedBtn] = useState(null);

  const [nouveauNom, setNouveauNom] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editNom, setEditNom] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [success, setSuccess] = useState(false);
  const [sortBy, setSortBy] = useState("nom");
  const [sortOrder, setSortOrder] = useState("asc");
  const [filterStatut, setFilterStatut] = useState("all");
  const [viewMode, setViewMode] = useState("grid");

  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const PAGE_SIZE = 10;

  const deferredSearchTerm = useDeferredValue(searchTerm);

  const ecolesQuery = useQuery(
    api.ecoles.listWithUserCount,
    currentUserId ? { userId: currentUserId } : "skip"
  );
  const ecoles = useMemo(() => ecolesQuery ?? [], [ecolesQuery]);
  const isLoading = ecolesQuery === undefined;

  const addEcole = useMutation(api.ecoles.add);
  const updateEcole = useMutation(api.ecoles.update);
  const suspendEcole = useMutation(api.ecoles.suspendEcole);
  const reactiverEcole = useMutation(api.ecoles.reactiverEcole);
  const removeEcole = useMutation(api.ecoles.remove);

  const stats = useMemo(() => {
    const total = ecoles.length;
    const actives = ecoles.filter((e) => e.statut !== "suspendue").length;
    const suspendues = total - actives;
    return { total, actives, suspendues };
  }, [ecoles]);

  const ecolesTriees = useMemo(() => {
    let filtered = ecoles;
    if (filterStatut === "active")
      filtered = filtered.filter((e) => e.statut !== "suspendue");
    else if (filterStatut === "suspendue")
      filtered = filtered.filter((e) => e.statut === "suspendue");
    if (deferredSearchTerm.trim()) {
      const term = deferredSearchTerm.toLowerCase();
      filtered = filtered.filter((e) =>
        (e.nom ?? "").toLowerCase().includes(term)
      );
    }
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === "nom") {
        const an = a.nom ?? "";
        const bn = b.nom ?? "";
        return sortOrder === "asc"
          ? an.localeCompare(bn, undefined, { sensitivity: "base" })
          : bn.localeCompare(an, undefined, { sensitivity: "base" });
      } else if (sortBy === "users") {
        const aUsers = a.userCount ?? 0;
        const bUsers = b.userCount ?? 0;
        return sortOrder === "asc" ? aUsers - bUsers : bUsers - aUsers;
      } else if (sortBy === "statut") {
        const aActive = a.statut !== "suspendue" ? 0 : 1;
        const bActive = b.statut !== "suspendue" ? 0 : 1;
        return sortOrder === "asc" ? aActive - bActive : bActive - aActive;
      }
      return 0;
    });
    return sorted;
  }, [ecoles, filterStatut, deferredSearchTerm, sortBy, sortOrder]);

  const totalPages = Math.ceil(ecolesTriees.length / PAGE_SIZE);
  const safeCurrentPage = Math.min(currentPage, totalPages || 1);
  const paginatedEcoles = useMemo(
    () =>
      ecolesTriees.slice(
        (safeCurrentPage - 1) * PAGE_SIZE,
        safeCurrentPage * PAGE_SIZE
      ),
    [ecolesTriees, safeCurrentPage]
  );

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [deferredSearchTerm, filterStatut, sortBy, sortOrder]);

  const toggleSelectOne = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const bulkSuspend = useCallback(async () => {
    if (selectedIds.size === 0) return;
    if (!currentUserId) {
      toast.error("Session invalide.");
      return;
    }
    const ok = await confirm(
      "Suspendre les écoles sélectionnées",
      `Voulez-vous suspendre ${selectedIds.size} école(s) ?`
    );
    if (!ok) return;
    setBulkProcessing(true);
    try {
      const { succeeded, failed, errors } = await runInBatchesWithReport(
        Array.from(selectedIds),
        (id) => suspendEcole({ ecoleId: id, userId: currentUserId })
      );
      if (failed === 0) toast.success(`${succeeded} école(s) suspendue(s)`);
      else if (succeeded === 0)
        toast.error(`Aucune école suspendue (${failed} échec(s))`);
      else
        toast.error(
          `${succeeded} réussie(s), ${failed} échec(s) : ${errors[0]}`
        );
      clearSelection();
    } catch (err) {
      console.error("[GestionEcoles] bulkSuspend failed:", err);
      toast.error("Impossible de suspendre les écoles");
    } finally {
      setBulkProcessing(false);
    }
  }, [selectedIds, currentUserId, confirm, suspendEcole, clearSelection]);

  const bulkActivate = useCallback(async () => {
    if (selectedIds.size === 0) return;
    if (!currentUserId) {
      toast.error("Session invalide.");
      return;
    }
    const ok = await confirm(
      "Activer les écoles sélectionnées",
      `Voulez-vous activer ${selectedIds.size} école(s) ?`
    );
    if (!ok) return;
    setBulkProcessing(true);
    try {
      const { succeeded, failed, errors } = await runInBatchesWithReport(
        Array.from(selectedIds),
        (id) => reactiverEcole({ ecoleId: id, userId: currentUserId })
      );
      if (failed === 0) toast.success(`${succeeded} école(s) activée(s)`);
      else if (succeeded === 0)
        toast.error(`Aucune école activée (${failed} échec(s))`);
      else
        toast.error(
          `${succeeded} réussie(s), ${failed} échec(s) : ${errors[0]}`
        );
      clearSelection();
    } catch (err) {
      console.error("[GestionEcoles] bulkActivate failed:", err);
      toast.error("Impossible d'activer les écoles");
    } finally {
      setBulkProcessing(false);
    }
  }, [selectedIds, currentUserId, confirm, reactiverEcole, clearSelection]);

  const bulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    if (!currentUserId) {
      toast.error("Session invalide.");
      return;
    }
    const ok = await confirm(
      "Supprimer les écoles sélectionnées",
      `⚠️ Attention : ${selectedIds.size} école(s) et leurs utilisateurs associés seront supprimés définitivement. Cette action est irréversible.`
    );
    if (!ok) return;
    setBulkProcessing(true);
    try {
      const { succeeded, failed, errors } = await runInBatchesWithReport(
        Array.from(selectedIds),
        (id) => removeEcole({ ecoleId: id, userId: currentUserId })
      );
      if (failed === 0) toast.success(`${succeeded} école(s) supprimée(s)`);
      else if (succeeded === 0)
        toast.error(`Aucune école supprimée (${failed} échec(s))`);
      else
        toast.error(
          `${succeeded} réussie(s), ${failed} échec(s) : ${errors[0]}`
        );
      clearSelection();
    } catch (err) {
      console.error("[GestionEcoles] bulkDelete failed:", err);
      toast.error("Impossible de supprimer les écoles");
    } finally {
      setBulkProcessing(false);
    }
  }, [selectedIds, currentUserId, confirm, removeEcole, clearSelection]);

  const toggleSort = useCallback((field) => {
    setSortBy((prevField) => {
      if (prevField === field) {
        setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortOrder("asc");
      }
      return field;
    });
  }, []);

  const handleAdd = useCallback(
    async (e) => {
      e.preventDefault();
      if (!currentUserId) {
        toast.error("Session invalide.");
        return;
      }
      if (!nouveauNom.trim()) {
        toast.error("Veuillez saisir un nom d'école.");
        return;
      }
      setAdding(true);
      try {
        await addEcole({ nom: nouveauNom.trim(), userId: currentUserId });
        setNouveauNom("");
        setSuccess(true);
        toast.success("École créée avec succès");
        setTimeout(() => setSuccess(false), 2000);
      } catch (err) {
        console.error("[GestionEcoles] add failed:", err);
        toast.error(err?.message ?? "Impossible de créer l'école");
      } finally {
        setAdding(false);
      }
    },
    [addEcole, nouveauNom, currentUserId]
  );

  const startEdit = useCallback((ecole) => {
    setEditingId(ecole._id);
    setEditNom(ecole.nom);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditNom("");
  }, []);

  const handleUpdate = useCallback(
    async (id) => {
      if (!currentUserId) {
        toast.error("Session invalide.");
        return;
      }
      if (!editNom.trim()) {
        toast.error("Le nom ne peut pas être vide");
        return;
      }
      try {
        await updateEcole({
          ecoleId: id,
          nom: editNom.trim(),
          userId: currentUserId,
        });
        toast.success("École mise à jour");
        setEditingId(null);
        setEditNom("");
      } catch (err) {
        console.error("[GestionEcoles] update failed:", err);
        toast.error(err?.message ?? "Impossible de mettre à jour l'école");
      }
    },
    [editNom, updateEcole, currentUserId]
  );

  const handleToggleStatus = useCallback(
    async (ecole) => {
      if (!currentUserId) {
        toast.error("Session invalide.");
        return;
      }
      const nouveauStatut =
        ecole.statut === "suspendue" ? "active" : "suspendue";
      const action = nouveauStatut === "suspendue" ? "suspendre" : "activer";
      const ok = await confirm(
        nouveauStatut === "suspendue" ? "Suspendre l'école" : "Activer l'école",
        `Voulez-vous vraiment ${action} l'école "${ecole.nom}" ?`
      );
      if (!ok) return;
      setTogglingId(ecole._id);
      try {
        if (nouveauStatut === "suspendue")
          await suspendEcole({ ecoleId: ecole._id, userId: currentUserId });
        else
          await reactiverEcole({
            ecoleId: ecole._id,
            userId: currentUserId,
          });
        toast.success(`École ${action}`);
      } catch (err) {
        console.error("[GestionEcoles] toggleStatus failed:", err);
        toast.error(
          err?.message ?? "Impossible de changer le statut de l'école"
        );
      } finally {
        setTogglingId(null);
      }
    },
    [confirm, suspendEcole, reactiverEcole, currentUserId]
  );

  const handleDelete = useCallback(
    async (ecole) => {
      if (!currentUserId) {
        toast.error("Session invalide.");
        return;
      }
      const userCount = ecole.userCount ?? 0;
      const ok = await confirm(
        "Supprimer l'école",
        `Voulez-vous vraiment supprimer "${ecole.nom}" ?\n${
          userCount > 0
            ? `⚠️ ${userCount} utilisateur(s) associé(s) seront également supprimés.`
            : "Cette école n'a aucun utilisateur associé."
        }\nCette action est irréversible.`
      );
      if (!ok) return;
      setDeletingId(ecole._id);
      try {
        await removeEcole({ ecoleId: ecole._id, userId: currentUserId });
        toast.success("École supprimée");
      } catch (err) {
        console.error("[GestionEcoles] delete failed:", err);
        toast.error(err?.message ?? "Impossible de supprimer l'école");
      } finally {
        setDeletingId(null);
      }
    },
    [confirm, removeEcole, currentUserId]
  );

  const handleExportExcel = useCallback(async () => {
    if (ecolesTriees.length === 0) {
      toast.error("Aucune donnée à exporter");
      return;
    }
    try {
      const XLSX = await import("xlsx");
      const data = ecolesTriees.map((e) => ({
        Nom: e.nom,
        Code: e.code || "N/A",
        Statut: e.statut === "suspendue" ? "Suspendue" : "Active",
        Utilisateurs: e.userCount ?? 0,
      }));
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Écoles");
      XLSX.writeFile(workbook, "ecoles.xlsx");
      toast.success("Export Excel généré");
    } catch (err) {
      console.error("[GestionEcoles] export failed:", err);
      toast.error("Impossible de générer l'export");
    }
  }, [ecolesTriees]);

  // Couleurs
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const inputBg = dark ? "#0F172A" : "#F9FAFB";
  const buttonBg = dark ? "#818CF8" : "#4F46E5";
  const accentColor = dark ? "#818CF8" : "#4F46E5";
  const dangerColor = "#EF4444";
  const successColor = dark ? "#34D399" : "#10B981";
  const warningColor = dark ? "#FBBF24" : "#F59E0B";
  const badgeActiveBg = dark ? "#064E3B" : "#D1FAE5";
  const badgeActiveText = dark ? "#34D399" : "#065F46";

  // Padding container avec safe-area
  const containerPadding = isMobile
    ? `calc(16px + ${SAFE_TOP}) calc(12px + ${SAFE_RIGHT}) calc(24px + ${SAFE_BOTTOM}) calc(12px + ${SAFE_LEFT})`
    : 0;

  return (
    <>
      {GestionEcolesKeyframes}
      <div
        style={{
          width: "100%",
          maxWidth: "100%",
          margin: 0,
          padding: containerPadding,
          boxSizing: "border-box",
        }}
      >
        {/* En-tête */}
        <div style={{ marginBottom: 20 }}>
          <h2
            style={{
              ...S.h2,
              color: textPrimary,
              fontSize: isMobile ? 20 : 24,
              margin: 0,
            }}
          >
            Gestion des écoles
          </h2>
          <p
            style={{
              ...S.muted,
              color: textSecondary,
              fontSize: isMobile ? 13 : 14,
              marginTop: 4,
            }}
          >
            {isLoading
              ? "Chargement..."
              : `${ecolesTriees.length} école(s) affichée(s) sur ${stats.total} au total`}
          </p>
          <div
            style={{
              display: "flex",
              gap: 16,
              marginTop: 8,
              flexWrap: "wrap",
            }}
          >
            <span style={{ color: textSecondary, fontSize: 13 }}>
              <School
                size={14}
                style={{ verticalAlign: "middle", marginRight: 4 }}
                aria-hidden="true"
              />{" "}
              Total: {stats.total}
            </span>
            <span style={{ color: successColor, fontSize: 13 }}>
              <CheckCircle2
                size={14}
                style={{ verticalAlign: "middle", marginRight: 4 }}
                aria-hidden="true"
              />{" "}
              Actives: {stats.actives}
            </span>
            <span style={{ color: warningColor, fontSize: 13 }}>
              <XCircle
                size={14}
                style={{ verticalAlign: "middle", marginRight: 4 }}
                aria-hidden="true"
              />{" "}
              Suspendues: {stats.suspendues}
            </span>
          </div>
        </div>

        {/* Formulaire création */}
        <div
          style={{
            ...S.card,
            background: cardBg,
            border: `1px solid ${cardBorder}`,
            transition: "background-color 0.3s",
            padding: isMobile ? 14 : 20,
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              fontWeight: 700,
              marginBottom: 12,
              color: accentColor,
              fontSize: isMobile ? 15 : 16,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Plus size={16} aria-hidden="true" /> Créer une nouvelle école
          </div>
          <form
            onSubmit={handleAdd}
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              flexDirection: isMobile ? "column" : "row",
            }}
          >
            <input
              style={{
                ...S.input,
                marginBottom: 0,
                flex: 1,
                minWidth: isMobile ? "100%" : 180,
                background: inputBg,
                border: `1px solid ${cardBorder}`,
                color: textPrimary,
                padding: isMobile ? "12px 14px" : "10px 14px",
                fontSize: isMobile ? 16 : 14,
                fontFamily: "inherit",
                minHeight: MOBILE_TAP,
                boxSizing: "border-box",
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation",
              }}
              placeholder="Nom de l'école"
              value={nouveauNom}
              onChange={(e) => setNouveauNom(e.target.value)}
              disabled={adding}
              aria-label="Nom de la nouvelle école"
            />
            <button
              type="submit"
              disabled={adding || !nouveauNom.trim()}
              onTouchStart={
                !adding && nouveauNom.trim()
                  ? () => setPressedBtn("add-ecole")
                  : undefined
              }
              onTouchEnd={() => setPressedBtn(null)}
              onTouchCancel={() => setPressedBtn(null)}
              style={{
                ...S.btn(buttonBg),
                width: isMobile ? "100%" : "auto",
                padding: isMobile ? "12px 20px" : "10px 20px",
                cursor: adding ? "not-allowed" : "pointer",
                opacity: adding || !nouveauNom.trim() ? 0.7 : 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                fontSize: isMobile ? 16 : 14,
                minHeight: MOBILE_TAP,
                transform:
                  pressedBtn === "add-ecole" && !adding && nouveauNom.trim()
                    ? "scale(0.97)"
                    : "scale(1)",
                transition: "transform 0.1s ease, opacity 0.15s ease",
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation",
                fontFamily: "inherit",
                boxSizing: "border-box",
              }}
            >
              {adding ? (
                <Loader size={16} className="ge-spin" aria-hidden="true" />
              ) : success ? (
                <CheckCircle2 size={16} aria-hidden="true" />
              ) : (
                <Plus size={16} aria-hidden="true" />
              )}
              {adding ? "Création..." : success ? "Créée" : "Créer"}
            </button>
          </form>
        </div>

        {/* Barre outils */}
        <div
          style={{
            margin: "16px 0",
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            alignItems: "stretch",
            flexDirection: isMobile ? "column" : "row",
          }}
        >
          <SearchBar
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            textSecondary={textSecondary}
            cardBg={cardBg}
            cardBorder={cardBorder}
            textPrimary={textPrimary}
            isMobile={isMobile}
          />

          <div
            style={{
              display: "flex",
              gap: 4,
              flexDirection: isMobile ? "column" : "row",
              width: isMobile ? "100%" : "auto",
            }}
          >
            {[
              { value: "all", label: "Toutes" },
              { value: "active", label: "Actives" },
              { value: "suspendue", label: "Suspendues" },
            ].map((f) => {
              const isActive = filterStatut === f.value;
              const isPressed = pressedBtn === `filter-${f.value}`;
              return (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFilterStatut(f.value)}
                  onTouchStart={() => setPressedBtn(`filter-${f.value}`)}
                  onTouchEnd={() => setPressedBtn(null)}
                  onTouchCancel={() => setPressedBtn(null)}
                  aria-pressed={isActive}
                  style={{
                    padding: isMobile ? "10px 12px" : "6px 12px",
                    borderRadius: 20,
                    border: `1px solid ${cardBorder}`,
                    background: isActive ? accentColor : cardBg,
                    color: isActive ? "white" : textSecondary,
                    cursor: "pointer",
                    fontSize: isMobile ? 14 : 12,
                    fontWeight: isActive ? 600 : 400,
                    width: isMobile ? "100%" : "auto",
                    textAlign: "center",
                    minHeight: MOBILE_TAP,
                    transform: isPressed ? "scale(0.97)" : "scale(1)",
                    transition: "transform 0.1s ease, background 0.12s ease",
                    WebkitTapHighlightColor: "transparent",
                    touchAction: "manipulation",
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                  }}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              flexDirection: isMobile ? "column" : "row",
              width: isMobile ? "100%" : "auto",
            }}
          >
            <SortButton
              label="Nom"
              field="nom"
              currentSort={sortBy}
              currentOrder={sortOrder}
              onClick={toggleSort}
              activeBg={badgeActiveBg}
              activeText={badgeActiveText}
              textSecondary={textSecondary}
              cardBg={cardBg}
              cardBorder={cardBorder}
              isMobile={isMobile}
            />
            <SortButton
              label="Utilisateurs"
              field="users"
              currentSort={sortBy}
              currentOrder={sortOrder}
              onClick={toggleSort}
              activeBg={badgeActiveBg}
              activeText={badgeActiveText}
              textSecondary={textSecondary}
              cardBg={cardBg}
              cardBorder={cardBorder}
              isMobile={isMobile}
            />
            <SortButton
              label="Statut"
              field="statut"
              currentSort={sortBy}
              currentOrder={sortOrder}
              onClick={toggleSort}
              activeBg={badgeActiveBg}
              activeText={badgeActiveText}
              textSecondary={textSecondary}
              cardBg={cardBg}
              cardBorder={cardBorder}
              isMobile={isMobile}
            />
          </div>

          <div
            style={{
              display: "flex",
              gap: 4,
              marginLeft: isMobile ? "0" : "auto",
              justifyContent: isMobile ? "space-between" : "flex-start",
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              aria-label="Vue en grille"
              title="Vue en grille"
              style={{
                padding: 0,
                background: viewMode === "grid" ? accentColor : cardBg,
                color: viewMode === "grid" ? "white" : textSecondary,
                border: `1px solid ${cardBorder}`,
                borderRadius: 8,
                cursor: "pointer",
                width: MOBILE_TAP,
                height: MOBILE_TAP,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation",
              }}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              aria-label="Vue en liste"
              title="Vue en liste"
              style={{
                padding: 0,
                background: viewMode === "list" ? accentColor : cardBg,
                color: viewMode === "list" ? "white" : textSecondary,
                border: `1px solid ${cardBorder}`,
                borderRadius: 8,
                cursor: "pointer",
                width: MOBILE_TAP,
                height: MOBILE_TAP,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation",
              }}
            >
              <List size={16} />
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              aria-label="Exporter en Excel"
              title="Exporter en Excel"
              style={{
                padding: 0,
                background: cardBg,
                color: textSecondary,
                border: `1px solid ${cardBorder}`,
                borderRadius: 8,
                cursor: "pointer",
                width: MOBILE_TAP,
                height: MOBILE_TAP,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation",
              }}
            >
              <Download size={16} />
            </button>
          </div>
        </div>

        {/* Actions groupées */}
        {selectedIds.size > 0 && (
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              flexWrap: "wrap",
              marginBottom: 16,
              flexDirection: isMobile ? "column" : "row",
              width: "100%",
            }}
          >
            <span style={{ fontSize: 13, color: textSecondary }}>
              {selectedIds.size} sélectionnée(s)
            </span>
            <button
              type="button"
              onClick={bulkActivate}
              disabled={bulkProcessing}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                padding: isMobile ? "10px 12px" : "6px 12px",
                background: "#10B981",
                color: "white",
                border: "none",
                borderRadius: 8,
                cursor: bulkProcessing ? "not-allowed" : "pointer",
                fontSize: 13,
                width: isMobile ? "100%" : "auto",
                minHeight: MOBILE_TAP,
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation",
                fontFamily: "inherit",
                boxSizing: "border-box",
              }}
            >
              <UserPlus size={14} aria-hidden="true" /> Activer
            </button>
            <button
              type="button"
              onClick={bulkSuspend}
              disabled={bulkProcessing}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                padding: isMobile ? "10px 12px" : "6px 12px",
                background: "#F59E0B",
                color: "white",
                border: "none",
                borderRadius: 8,
                cursor: bulkProcessing ? "not-allowed" : "pointer",
                fontSize: 13,
                width: isMobile ? "100%" : "auto",
                minHeight: MOBILE_TAP,
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation",
                fontFamily: "inherit",
                boxSizing: "border-box",
              }}
            >
              <UserMinus size={14} aria-hidden="true" /> Suspendre
            </button>
            <button
              type="button"
              onClick={bulkDelete}
              disabled={bulkProcessing}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                padding: isMobile ? "10px 12px" : "6px 12px",
                background: "#EF4444",
                color: "white",
                border: "none",
                borderRadius: 8,
                cursor: bulkProcessing ? "not-allowed" : "pointer",
                fontSize: 13,
                width: isMobile ? "100%" : "auto",
                minHeight: MOBILE_TAP,
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation",
                fontFamily: "inherit",
                boxSizing: "border-box",
              }}
            >
              <Trash2 size={14} aria-hidden="true" /> Supprimer
            </button>
            <button
              type="button"
              onClick={clearSelection}
              disabled={bulkProcessing}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                padding: isMobile ? "10px 12px" : "6px 12px",
                background: "transparent",
                border: `1px solid ${cardBorder}`,
                borderRadius: 8,
                cursor: "pointer",
                fontSize: 13,
                color: textPrimary,
                width: isMobile ? "100%" : "auto",
                minHeight: MOBILE_TAP,
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation",
                fontFamily: "inherit",
                boxSizing: "border-box",
              }}
            >
              <X size={14} aria-hidden="true" /> Annuler
            </button>
          </div>
        )}

        {/* Contenu principal */}
        {isLoading ? (
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
              className="ge-spin"
              aria-hidden="true"
            />
          </div>
        ) : ecolesTriees.length === 0 ? (
          <div
            style={{
              marginTop: 12,
              background: cardBg,
              border: `1px solid ${cardBorder}`,
              textAlign: "center",
              color: textSecondary,
              padding: 40,
              borderRadius: 12,
              boxSizing: "border-box",
            }}
          >
            {searchTerm || filterStatut !== "all"
              ? "Aucune école ne correspond à vos critères."
              : "Aucune école disponible. Créez votre première école ci-dessus."}
          </div>
        ) : viewMode === "grid" ? (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : "repeat(auto-fill, minmax(280px, 1fr))",
                gap: 16,
                marginTop: 12,
                width: "100%",
              }}
            >
              {paginatedEcoles.map((ecole) => (
                <EcoleCard
                  key={ecole._id}
                  ecole={ecole}
                  editingId={editingId}
                  editNom={editNom}
                  setEditNom={setEditNom}
                  startEdit={startEdit}
                  cancelEdit={cancelEdit}
                  handleUpdate={handleUpdate}
                  handleToggleStatus={handleToggleStatus}
                  handleDelete={handleDelete}
                  onSelectEcole={onSelectEcole}
                  togglingId={togglingId}
                  deletingId={deletingId}
                  dark={dark}
                  textPrimary={textPrimary}
                  textSecondary={textSecondary}
                  cardBg={cardBg}
                  cardBorder={cardBorder}
                  inputBg={inputBg}
                  accentColor={accentColor}
                  successColor={successColor}
                  warningColor={warningColor}
                  dangerColor={dangerColor}
                  selected={selectedIds.has(ecole._id)}
                  onToggleSelect={toggleSelectOne}
                  isMobile={isMobile}
                />
              ))}
            </div>
            <PaginationControls
              currentPage={safeCurrentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              borderColor={cardBorder}
            />
          </>
        ) : (
          <>
            <EcoleListView
              ecoles={paginatedEcoles}
              editingId={editingId}
              editNom={editNom}
              setEditNom={setEditNom}
              startEdit={startEdit}
              cancelEdit={cancelEdit}
              handleUpdate={handleUpdate}
              handleToggleStatus={handleToggleStatus}
              handleDelete={handleDelete}
              onSelectEcole={onSelectEcole}
              togglingId={togglingId}
              deletingId={deletingId}
              dark={dark}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              cardBg={cardBg}
              cardBorder={cardBorder}
              inputBg={inputBg}
              accentColor={accentColor}
              successColor={successColor}
              warningColor={warningColor}
              dangerColor={dangerColor}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelectOne}
              isMobile={isMobile}
            />
            <PaginationControls
              currentPage={safeCurrentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              borderColor={cardBorder}
            />
          </>
        )}

        <ConfirmDialog {...dialogProps} />
      </div>
    </>
  );
}