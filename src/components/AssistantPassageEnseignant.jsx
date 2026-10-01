// src/components/AssistantPassageEnseignant.jsx
import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useConfirm } from "@/hooks/useConfirm";
import { ConfirmDialog } from "./ConfirmDialog";
import toast from "react-hot-toast";
import {
  Loader, Search, X, CheckCircle2, AlertTriangle, Send,
  ListChecks, SlidersHorizontal, RotateCcw, Users, Clock,
  UserCheck, GraduationCap, Calendar, CalendarClock, Pencil,
  XCircle, Check, MessageSquare, Info,
} from "lucide-react";

// ════════════════════════════════════════════════════════════════════
// CONSTANTES MODULE-LEVEL
// ════════════════════════════════════════════════════════════════════
const TAP_BASE = {
  touchAction: "manipulation",
  WebkitTapHighlightColor: "transparent",
  minHeight: 44,
};

const SCROLL_AREA = {
  overscrollBehavior: "contain",
  WebkitOverflowScrolling: "touch",
};

const SAFE_BOTTOM = {
  paddingBottom: "calc(24px + env(safe-area-inset-bottom, 0px))",
};

const FOCUS_RING = (color) => ({
  outline: `2px solid ${color}`,
  outlineOffset: 2,
});

// ════════════════════════════════════════════════════════════════════
// KEYFRAMES MODULE-LEVEL
// ════════════════════════════════════════════════════════════════════
const APEKeyframes = (
  <style>{`
    @keyframes ape-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    @keyframes ape-fade-in { from { opacity: 0; } to { opacity: 1; } }
    @keyframes ape-slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
    @keyframes ape-slide-up-bar { from { transform: translateY(100%); } to { transform: translateY(0); } }
    .ape-spin { animation: ape-spin 1s linear infinite; }
    .ape-fade-in { animation: ape-fade-in 0.18s ease-out; }
    .ape-slide-up { animation: ape-slide-up 0.25s cubic-bezier(0.22, 1, 0.36, 1); }
    .ape-slide-up-bar { animation: ape-slide-up-bar 0.2s ease-out; }
    @media (prefers-reduced-motion: reduce) {
      .ape-spin, .ape-fade-in, .ape-slide-up, .ape-slide-up-bar { animation: none !important; }
    }
  `}</style>
);

// ════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════
function formatDateFR(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const now = new Date();
  const target = new Date(dateStr);
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

// ════════════════════════════════════════════════════════════════════
// PRESSABLE — feedback tap + focus ring via state React
// ════════════════════════════════════════════════════════════════════
function Pressable({
  onClick, style, children, disabled = false, type = "button",
  focusColor, ariaLabel, ariaBusy, ariaPressed, ...rest
}) {
  const [pressed, setPressed] = useState(false);
  const [focused, setFocused] = useState(false);
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-busy={ariaBusy}
      aria-pressed={ariaPressed}
      onPointerDown={() => !disabled && setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        ...TAP_BASE,
        transform: pressed && !disabled ? "scale(0.97)" : "scale(1)",
        transition: "transform 0.12s ease, background-color 0.2s, border-color 0.2s",
        ...(focused && !disabled && focusColor ? FOCUS_RING(focusColor) : null),
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════
// BANDEAU DATE LIMITE
// ════════════════════════════════════════════════════════════════════
function DeadlineBanner({ deadline, dark, isMobile }) {
  if (!deadline || !deadline.hasDeadline) return null;

  const jours = daysUntil(deadline.dateLimite);
  const passed = deadline.passed;

  const bg = passed
    ? (dark ? "#7F1D1D40" : "#FEE2E2")
    : jours !== null && jours <= 3
    ? (dark ? "#78350F40" : "#FEF3C7")
    : (dark ? "#0F172A" : "#F1F5F9");

  const borderColor = passed
    ? (dark ? "#7F1D1D" : "#FECACA")
    : jours !== null && jours <= 3
    ? (dark ? "#78350F" : "#FDE68A")
    : (dark ? "#334155" : "#E2E8F0");

  const textColor = passed
    ? (dark ? "#F87171" : "#B91C1C")
    : jours !== null && jours <= 3
    ? (dark ? "#FBBF24" : "#92400E")
    : (dark ? "#CBD5E1" : "#475569");

  return (
    <div
      role={passed ? "alert" : "status"}
      aria-live="polite"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: isMobile ? "10px 12px" : "10px 14px",
        marginBottom: isMobile ? 12 : 16,
        background: bg,
        border: `1px solid ${borderColor}`,
        borderRadius: 12,
        flexWrap: "wrap",
      }}
    >
      <CalendarClock
        size={18}
        color={textColor}
        aria-hidden="true"
        style={{ flexShrink: 0 }}
      />
      <div
        style={{
          flex: 1, minWidth: 0,
          fontSize: isMobile ? 12 : 12.5,
          color: textColor, lineHeight: 1.4,
        }}
      >
        {passed ? (
          <>
            <strong>Date limite dépassée</strong> depuis{" "}
            {Math.abs(jours)} jour{Math.abs(jours) > 1 ? "s" : ""}. Vous ne
            pouvez plus soumettre ni modifier vos propositions.
          </>
        ) : (
          <>
            <strong>Date limite :</strong> {formatDateFR(deadline.dateLimite)}
            {jours !== null && (
              <span style={{ marginLeft: 6, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                {jours === 0
                  ? "(aujourd'hui)"
                  : jours === 1
                  ? "(demain)"
                  : `(dans ${jours} jours)`}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// CARTE STATISTIQUE COMPACTE
// ════════════════════════════════════════════════════════════════════
function StatCard({ icon, label, value, color, dark, isMobile }) {
  return (
    <article
      aria-label={`${label} : ${value}`}
      style={{
        background: dark ? "#1E293B" : "#FFFFFF",
        borderRadius: 12,
        padding: isMobile ? "10px 12px" : "14px 16px",
        boxShadow: dark ? "0 1px 2px rgba(0,0,0,0.25)" : "0 1px 2px rgba(0,0,0,0.04)",
        border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
        display: "flex",
        alignItems: "center",
        gap: 10,
        minWidth: isMobile ? 130 : "auto",
        flex: isMobile ? "0 0 auto" : 1,
        minHeight: 44,
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 32, height: 32, borderRadius: 8,
          background: `${color}20`,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, color,
        }}
      >
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ color: dark ? "#94A3B8" : "#64748B", fontSize: 10.5, fontWeight: 500, whiteSpace: "nowrap" }}>
          {label}
        </div>
        <div
          style={{
            color: dark ? "#F1F5F9" : "#1E293B",
            fontSize: 18, fontWeight: 700,
            lineHeight: 1.1,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {value}
        </div>
      </div>
    </article>
  );
}

// ════════════════════════════════════════════════════════════════════
// BOTTOM SHEET FILTRES / OPTIONS DE SOUMISSION
// ════════════════════════════════════════════════════════════════════
function FiltersSheet({
  open, onClose, dark,
  nouvelleAnneeId, setNouvelleAnneeId, anneesDestination,
  filter, setFilter,
  classeParDefaut, setClasseParDefaut, classesTriees,
  onMarquerTousPassants, nbSansDecision,
  onReset,
  nbAvecDecision,
}) {
  const [focusedField, setFocusedField] = useState(null);

  // ✅ Escape pour fermer
  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const accent = dark ? "#818CF8" : "#4F46E5";

  const labelStyle = {
    display: "block", fontSize: 12, fontWeight: 600,
    color: textSecondary,
    marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.3,
  };

  const fieldStyle = (name) => ({
    width: "100%",
    padding: "12px 14px",
    borderRadius: 10,
    border: `1px solid ${focusedField === name ? accent : dark ? "#334155" : "#E2E8F0"}`,
    background: dark ? "#0F172A" : "#F8FAFC",
    color: textPrimary,
    fontSize: 16,
    outline: "none",
    boxSizing: "border-box",
    appearance: "none",
    WebkitAppearance: "none",
    transition: "border-color 0.2s",
    minHeight: 44,
    ...TAP_BASE,
  });

  return (
    <>
      {APEKeyframes}
      <div
        onClick={onClose}
        className="ape-fade-in"
        aria-hidden="true"
        style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.45)",
          zIndex: 1100,
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ape-fs-title"
        className="ape-slide-up"
        style={{
          position: "fixed", left: 0, right: 0, bottom: 0,
          background: dark ? "#1E293B" : "#FFFFFF",
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          padding: "12px 16px 0",
          ...SAFE_BOTTOM,
          zIndex: 1101,
          maxHeight: "85vh",
          overflowY: "auto",
          boxShadow: "0 -8px 30px rgba(0,0,0,0.25)",
          ...SCROLL_AREA,
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: 40, height: 4, borderRadius: 2,
            background: dark ? "#475569" : "#CBD5E1",
            margin: "0 auto 16px",
          }}
        />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h3 id="ape-fs-title" style={{ margin: 0, fontSize: 17, fontWeight: 700, color: textPrimary }}>
            Options de soumission
          </h3>
          <Pressable
            onClick={onClose}
            focusColor={accent}
            ariaLabel="Fermer"
            style={{
              background: "none", border: "none", color: textSecondary,
              padding: 8, minWidth: 44, minHeight: 44,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <X size={22} aria-hidden="true" />
          </Pressable>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle} htmlFor="ape-fs-annee">
            <Calendar size={12} aria-hidden="true" style={{ marginRight: 4, verticalAlign: "middle" }} />
            Année de destination
          </label>
          <select
            id="ape-fs-annee"
            value={nouvelleAnneeId}
            onChange={(e) => setNouvelleAnneeId(e.target.value)}
            onFocus={() => setFocusedField("annee")}
            onBlur={() => setFocusedField(null)}
            aria-label="Année de destination"
            style={fieldStyle("annee")}
          >
            <option value="">-- Choisir une année --</option>
            {anneesDestination.map((annee) => (
              <option key={annee._id} value={annee._id}>{annee.nom}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Afficher</label>
          <div role="radiogroup" aria-label="Filtrer les élèves" style={{ display: "flex", gap: 8 }}>
            <Pressable
              onClick={() => setFilter("sans_decision")}
              focusColor={accent}
              role="radio"
              aria-checked={filter === "sans_decision"}
              style={{
                flex: 1, padding: "12px 12px", borderRadius: 10,
                border: `1px solid ${filter === "sans_decision" ? accent : (dark ? "#334155" : "#E2E8F0")}`,
                background: filter === "sans_decision" ? (dark ? "#312E81" : "#EEF2FF") : "transparent",
                color: filter === "sans_decision" ? (dark ? "#C7D2FE" : "#4F46E5") : (dark ? "#CBD5E1" : "#475569"),
                fontWeight: 600, fontSize: 13,
              }}
            >
              Sans décision ({nbSansDecision})
            </Pressable>
            <Pressable
              onClick={() => setFilter("avec_decision")}
              focusColor={accent}
              role="radio"
              aria-checked={filter === "avec_decision"}
              style={{
                flex: 1, padding: "12px 12px", borderRadius: 10,
                border: `1px solid ${filter === "avec_decision" ? accent : (dark ? "#334155" : "#E2E8F0")}`,
                background: filter === "avec_decision" ? (dark ? "#312E81" : "#EEF2FF") : "transparent",
                color: filter === "avec_decision" ? (dark ? "#C7D2FE" : "#4F46E5") : (dark ? "#CBD5E1" : "#475569"),
                fontWeight: 600, fontSize: 13,
              }}
            >
              Avec décision ({nbAvecDecision})
            </Pressable>
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle} htmlFor="ape-fs-classe">Action groupée</label>
          <select
            id="ape-fs-classe"
            value={classeParDefaut}
            onChange={(e) => setClasseParDefaut(e.target.value)}
            onFocus={() => setFocusedField("classe")}
            onBlur={() => setFocusedField(null)}
            aria-label="Classe de destination"
            style={{ ...fieldStyle("classe"), marginBottom: 10 }}
          >
            <option value="">-- Classe de destination --</option>
            {classesTriees.map((c) => (
              <option key={c._id} value={c.nom}>{c.nom}</option>
            ))}
          </select>
          <Pressable
            onClick={onMarquerTousPassants}
            disabled={!classeParDefaut || nbSansDecision === 0}
            focusColor={accent}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "12px 14px",
              background: !classeParDefaut || nbSansDecision === 0
                ? (dark ? "#334155" : "#E2E8F0")
                : accent,
              color: !classeParDefaut || nbSansDecision === 0
                ? (dark ? "#64748B" : "#94A3B8")
                : "#FFFFFF",
              border: "none", borderRadius: 10,
              cursor: !classeParDefaut || nbSansDecision === 0 ? "not-allowed" : "pointer",
              fontSize: 14, fontWeight: 600, width: "100%",
            }}
          >
            <ListChecks size={16} aria-hidden="true" />
            Marquer {nbSansDecision} passants vers {classeParDefaut || "…"}
          </Pressable>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <Pressable
            onClick={() => { onReset(); onClose(); }}
            focusColor={accent}
            style={{
              flex: 1, padding: "14px 16px", borderRadius: 12,
              border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
              background: "transparent",
              color: dark ? "#CBD5E1" : "#475569",
              fontWeight: 600, fontSize: 14,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            <RotateCcw size={16} aria-hidden="true" />
            Réinitialiser
          </Pressable>
          <Pressable
            onClick={onClose}
            focusColor={accent}
            style={{
              flex: 2, padding: "14px 16px", borderRadius: 12, border: "none",
              background: accent,
              color: "#FFFFFF", fontWeight: 700, fontSize: 14,
            }}
          >
            Voir les élèves
          </Pressable>
        </div>
      </div>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════
// CARTE ÉLÈVE (à traiter / édition)
// ════════════════════════════════════════════════════════════════════
function EleveCardToTreat({
  insc, decision, classesTriees, updateDecision,
  colors, dark, isMobile, isEditing, onCancelEdit,
}) {
  const hasDecision = !!decision?.statut;
  const borderColor = isEditing
    ? (dark ? "#818CF8" : "#4F46E5")
    : hasDecision
    ? colors.cardBorder
    : colors.warning;

  return (
    <article
      style={{
        background: colors.cardBg,
        borderRadius: 12,
        padding: isMobile ? "10px 12px" : "12px 14px",
        border: `1.5px solid ${borderColor}`,
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
        transition: "background-color 0.3s, border-color 0.3s",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: isMobile ? 13.5 : 14, color: colors.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {insc.nom} {insc.postnom} {insc.prenom}
          </div>
          <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
            {insc.code || "Pas de matricule"}
          </div>
        </div>

        {isEditing ? (
          <span
            style={{
              background: dark ? "#312E81" : "#EEF2FF",
              color: dark ? "#C7D2FE" : "#4F46E5",
              padding: "3px 10px", borderRadius: 12,
              fontSize: 10.5, fontWeight: 700,
              display: "inline-flex", alignItems: "center", gap: 4,
              flexShrink: 0,
            }}
          >
            <Pencil size={11} aria-hidden="true" /> Édition
          </span>
        ) : hasDecision ? (
          <span
            style={{
              background: dark ? "#334155" : "#F1F5F9",
              color: colors.textSecondary,
              padding: "3px 10px", borderRadius: 12,
              fontSize: 10.5, fontWeight: 700, flexShrink: 0,
            }}
          >
            Prêt
          </span>
        ) : (
          <span
            style={{
              color: colors.warning,
              display: "inline-flex", alignItems: "center", gap: 4,
              fontSize: 11, fontWeight: 600, flexShrink: 0,
            }}
          >
            <AlertTriangle size={12} aria-hidden="true" /> À décider
          </span>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: decision?.statut === "passant" ? "1fr 1fr" : "1fr",
          gap: 8,
        }}
      >
        <select
          value={decision?.statut || ""}
          onChange={(e) => updateDecision(insc.eleveId, "statut", e.target.value)}
          aria-label={`Décision pour ${insc.nom} ${insc.postnom}`}
          style={{
            width: "100%",
            padding: isMobile ? "12px 12px" : "10px 12px",
            border: `1px solid ${colors.cardBorder}`,
            borderRadius: 10,
            fontSize: isMobile ? 16 : 13,
            background: colors.selectBg, color: colors.selectText, outline: "none",
            minHeight: 44, ...TAP_BASE,
          }}
        >
          <option value="">-- Décision --</option>
          <option value="passant">Passant</option>
          <option value="redoublant">Redoublant</option>
          <option value="transfere">Transféré</option>
          <option value="exclu">Exclu</option>
          <option value="diplome">Diplômé</option>
        </select>

        {decision?.statut === "passant" && (
          <select
            value={decision.classeDestination || ""}
            onChange={(e) => updateDecision(insc.eleveId, "classeDestination", e.target.value)}
            aria-label="Classe de destination"
            style={{
              width: "100%",
              padding: isMobile ? "12px 12px" : "10px 12px",
              border: `1px solid ${colors.cardBorder}`,
              borderRadius: 10,
              fontSize: isMobile ? 16 : 13,
              background: colors.selectBg, color: colors.selectText, outline: "none",
              minHeight: 44, ...TAP_BASE,
            }}
          >
            <option value="">-- Classe --</option>
            {classesTriees.map((c) => (
              <option key={c._id} value={c.nom}>{c.nom}</option>
            ))}
          </select>
        )}
      </div>

      {isEditing && (
        <Pressable
          onClick={onCancelEdit}
          focusColor={colors.accent}
          ariaLabel="Annuler la modification"
          style={{
            marginTop: 10, width: "100%",
            padding: "10px 12px", borderRadius: 10,
            border: `1px solid ${colors.cardBorder}`,
            background: "transparent", color: colors.textSecondary,
            fontSize: 12, fontWeight: 600,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
          }}
        >
          <X size={12} aria-hidden="true" />
          Annuler la modification
        </Pressable>
      )}
    </article>
  );
}

// ════════════════════════════════════════════════════════════════════
// CARTE ÉLÈVE (soumis) — avec suivi de validation
// ════════════════════════════════════════════════════════════════════
function EleveCardSubmitted({
  prop, colors, dark, isMobile, deadlinePassed, onModifier,
}) {
  const statutValidation = prop.statutValidation || "soumise";
  const isSoumise = statutValidation === "soumise";
  const isValidee = statutValidation === "validee";
  const isModifiee = statutValidation === "modifiee";
  const isRejetee = statutValidation === "rejetee";

  const propBadgeBg =
    prop.statutPropose === "passant"
      ? colors.badgePassant
      : prop.statutPropose === "redoublant"
      ? colors.badgeRedoublant
      : colors.cardBorder;
  const propBadgeColor =
    prop.statutPropose === "passant"
      ? colors.badgePassantText
      : prop.statutPropose === "redoublant"
      ? colors.badgeRedoublantText
      : colors.textSecondary;

  const statusConfig = isSoumise
    ? {
        bg: dark ? "#78350F40" : "#FEF3C7",
        color: dark ? "#FBBF24" : "#92400E",
        border: dark ? "#78350F" : "#FDE68A",
        icon: <Clock size={12} aria-hidden="true" />,
        label: "En attente de validation",
      }
    : isValidee
    ? {
        bg: dark ? "#064E3B40" : "#D1FAE5",
        color: dark ? "#34D399" : "#065F46",
        border: dark ? "#065F46" : "#A7F3D0",
        icon: <Check size={12} aria-hidden="true" />,
        label: "Validée par le directeur",
      }
    : isModifiee
    ? {
        bg: dark ? "#4C1D9540" : "#EDE9FE",
        color: dark ? "#C4B5FD" : "#6D28D9",
        border: dark ? "#7C3AED" : "#DDD6FE",
        icon: <Pencil size={12} aria-hidden="true" />,
        label: "Modifiée par le directeur",
      }
    : {
        bg: dark ? "#7F1D1D40" : "#FEE2E2",
        color: dark ? "#F87171" : "#B91C1C",
        border: dark ? "#7F1D1D" : "#FECACA",
        icon: <XCircle size={12} aria-hidden="true" />,
        label: "Rejetée par le directeur",
      };

  const hasDivergence =
    (isModifiee || isRejetee) &&
    prop.statutFinal &&
    prop.statutFinal !== prop.statutPropose;

  const canModify = isSoumise && !deadlinePassed;

  return (
    <article
      style={{
        background: colors.cardBg,
        borderRadius: 12,
        padding: isMobile ? "10px 12px" : "12px 14px",
        border: `1.5px solid ${statusConfig.border}`,
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: isMobile ? 13.5 : 14, color: colors.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {prop.nom} {prop.postnom} {prop.prenom}
          </div>
          <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
            {prop.code || "Pas de matricule"}
          </div>
        </div>
        <span
          style={{
            background: propBadgeBg,
            color: propBadgeColor,
            padding: "3px 10px",
            borderRadius: 12,
            fontSize: 10.5,
            fontWeight: 700,
            textTransform: "capitalize",
            flexShrink: 0,
          }}
        >
          {prop.statutPropose}
        </span>
      </div>

      <div style={{ fontSize: 11.5, color: colors.textSecondary, marginBottom: 8 }}>
        {prop.classeDestinationPropose && (
          <>
            Proposé vers{" "}
            <strong style={{ color: colors.textPrimary }}>
              {prop.classeDestinationPropose}
            </strong>
          </>
        )}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 10px",
          background: statusConfig.bg,
          color: statusConfig.color,
          borderRadius: 8,
          fontSize: 11.5,
          fontWeight: 600,
          marginBottom: hasDivergence || prop.commentaireDirecteur ? 10 : 0,
        }}
      >
        {statusConfig.icon}
        {statusConfig.label}
      </div>

      {(hasDivergence || isValidee || isRejetee) && prop.statutFinal && (
        <div
          style={{
            marginTop: 8,
            padding: "8px 10px",
            background: dark ? "#0F172A" : "#F8FAFC",
            border: `1px solid ${colors.cardBorder}`,
            borderRadius: 8,
            fontSize: 11.5,
          }}
        >
          <div
            style={{
              color: colors.textSecondary, fontWeight: 600,
              fontSize: 10, textTransform: "uppercase", letterSpacing: 0.3,
              marginBottom: 4,
            }}
          >
            Décision du directeur
          </div>
          <div style={{ color: colors.textPrimary, fontWeight: 700 }}>
            {prop.statutFinal}
            {prop.classeDestinationFinale ? ` → ${prop.classeDestinationFinale}` : ""}
          </div>
        </div>
      )}

      {prop.commentaireDirecteur && (
        <div
          style={{
            marginTop: 8,
            padding: "8px 10px",
            background: isRejetee
              ? (dark ? "#7F1D1D20" : "#FEF2F2")
              : (dark ? "#4C1D9520" : "#F5F3FF"),
            border: `1px solid ${isRejetee ? (dark ? "#7F1D1D" : "#FECACA") : (dark ? "#7C3AED" : "#DDD6FE")}`,
            borderRadius: 8,
            fontSize: 11.5,
          }}
        >
          <div
            style={{
              color: isRejetee
                ? (dark ? "#F87171" : "#B91C1C")
                : (dark ? "#C4B5FD" : "#6D28D9"),
              fontWeight: 700, fontSize: 10,
              textTransform: "uppercase", letterSpacing: 0.3,
              marginBottom: 4,
              display: "flex", alignItems: "center", gap: 4,
            }}
          >
            <MessageSquare size={11} aria-hidden="true" />
            Motif du directeur
          </div>
          <div style={{ color: colors.textPrimary, fontStyle: "italic", lineHeight: 1.4 }}>
            « {prop.commentaireDirecteur} »
          </div>
        </div>
      )}

      {canModify && (
        <Pressable
          onClick={onModifier}
          focusColor={colors.accent}
          ariaLabel="Modifier ma proposition"
          style={{
            marginTop: 10, width: "100%",
            padding: "10px 12px", borderRadius: 10,
            border: `1px solid ${colors.accent}40`,
            background: "transparent", color: colors.accent,
            fontSize: 12, fontWeight: 600,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
          }}
        >
          <Pencil size={12} aria-hidden="true" />
          Modifier ma proposition
        </Pressable>
      )}

      {isSoumise && deadlinePassed && (
        <div
          style={{
            marginTop: 10, padding: "6px 10px",
            background: dark ? "#0F172A" : "#F8FAFC",
            border: `1px solid ${colors.cardBorder}`,
            borderRadius: 8, fontSize: 11, color: colors.textSecondary,
            display: "flex", alignItems: "center", gap: 6, fontStyle: "italic",
          }}
        >
          <Info size={11} aria-hidden="true" />
          Date limite dépassée — modification impossible
        </div>
      )}
    </article>
  );
}

// ════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ════════════════════════════════════════════════════════════════════
export function AssistantPassageEnseignant({ ecoleId, anneeActiveId, user }) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();
  const { confirm, dialogProps } = useConfirm();

  const [nouvelleAnneeId, setNouvelleAnneeId] = useState("");
  const [decisions, setDecisions] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("sans_decision");
  const [classeParDefaut, setClasseParDefaut] = useState("");
  const [activeTab, setActiveTab] = useState("a_traiter");
  const [showFilters, setShowFilters] = useState(false);
  const [editingIds, setEditingIds] = useState(() => new Set());
  const [searchFocused, setSearchFocused] = useState(false);

  // ── Queries ─────────────────────────────────────────────────
  const inscriptionsRaw = useQuery(
    api.inscriptions.listByAnnee,
    ecoleId && anneeActiveId ? { ecoleId, anneeId: anneeActiveId } : "skip"
  );

  const anneesRaw = useQuery(
    api.anneesScolaires.listByEcole,
    ecoleId ? { ecoleId } : "skip"
  );

  const classesDisponiblesRaw = useQuery(
    api.classes.list,
    ecoleId ? { ecoleId, anneeId: anneeActiveId } : "skip"
  );

  const propositionsExistantesRaw = useQuery(
    api.propositionsPassage.listByEnseignantAndAnnee,
    ecoleId && anneeActiveId && user?._id
      ? { ecoleId, anneeId: anneeActiveId, enseignantId: user._id, userId: user._id }
      : "skip"
  );

  const deadline = useQuery(
    api.propositionsPassage.getDeadlineStatus,
    anneeActiveId && user?._id
      ? { anneeId: anneeActiveId, userId: user._id }
      : "skip"
  );

  const inscriptions = useMemo(() => inscriptionsRaw ?? [], [inscriptionsRaw]);
  const annees = useMemo(() => anneesRaw ?? [], [anneesRaw]);
  const classesDisponibles = useMemo(() => classesDisponiblesRaw ?? [], [classesDisponiblesRaw]);
  const propositionsExistantes = useMemo(() => propositionsExistantesRaw ?? [], [propositionsExistantesRaw]);

  const soumettrePropositions = useMutation(
    api.propositionsPassage.soumettrePropositions
  );

  const classeEnseignant = user.classe;
  const deadlinePassed = deadline?.passed || false;

  const inscriptionsDeMaClasse = useMemo(() => {
    return inscriptions
      .filter((insc) => insc.classe === classeEnseignant)
      .sort((a, b) => {
        const nomA = `${a.nom} ${a.postnom} ${a.prenom || ""}`.toLowerCase().trim();
        const nomB = `${b.nom} ${b.postnom} ${b.prenom || ""}`.toLowerCase().trim();
        return nomA.localeCompare(nomB, "fr", { sensitivity: "base" });
      });
  }, [inscriptions, classeEnseignant]);

  const elevesDejaSoumis = useMemo(() => {
    const submittedIds = new Set(propositionsExistantes.map((p) => p.eleveId));
    editingIds.forEach((id) => submittedIds.delete(id));
    return submittedIds;
  }, [propositionsExistantes, editingIds]);

  const elevesATraiter = useMemo(
    () => inscriptionsDeMaClasse.filter((insc) => !elevesDejaSoumis.has(insc.eleveId)),
    [inscriptionsDeMaClasse, elevesDejaSoumis]
  );

  const elevesSoumis = useMemo(() => {
    return propositionsExistantes
      .filter((prop) => !editingIds.has(prop.eleveId))
      .map((prop) => {
        const inscription = inscriptionsDeMaClasse.find((i) => i.eleveId === prop.eleveId);
        return {
          ...prop,
          nom: inscription?.nom || "—",
          postnom: inscription?.postnom || "",
          prenom: inscription?.prenom || "",
          code: inscription?.code || "",
        };
      });
  }, [propositionsExistantes, inscriptionsDeMaClasse, editingIds]);

  const filteredATraiter = useMemo(() => {
    let list = elevesATraiter;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter((insc) =>
        `${insc.nom} ${insc.postnom} ${insc.prenom || ""}`.toLowerCase().includes(q)
      );
    }
    if (filter === "sans_decision") {
      list = list.filter((insc) => !decisions[insc.eleveId]);
    } else if (filter === "avec_decision") {
      list = list.filter((insc) => decisions[insc.eleveId]);
    }
    return list;
  }, [elevesATraiter, searchTerm, filter, decisions]);

  const filteredSoumis = useMemo(() => {
    if (!searchTerm.trim()) return elevesSoumis;
    const q = searchTerm.toLowerCase();
    return elevesSoumis.filter((p) =>
      `${p.nom} ${p.postnom} ${p.prenom || ""}`.toLowerCase().includes(q)
    );
  }, [elevesSoumis, searchTerm]);

  const classesTriees = useMemo(
    () =>
      [...classesDisponibles].sort((a, b) =>
        a.nom.localeCompare(b.nom, undefined, { numeric: true })
      ),
    [classesDisponibles]
  );

  const anneesDestination = useMemo(
    () => annees.filter((a) => a._id !== anneeActiveId),
    [annees, anneeActiveId]
  );

  const nbTotal = inscriptionsDeMaClasse.length;
  const nbSoumis = elevesSoumis.length;
  const nbATraiter = nbTotal - nbSoumis - editingIds.size;
  const nbSansDecision = elevesATraiter.filter((insc) => !decisions[insc.eleveId]).length;
  const nbAvecDecision = elevesATraiter.filter((insc) => decisions[insc.eleveId]).length;
  const nbPassant = Object.values(decisions).filter((d) => d.statut === "passant").length;
  const nbRedoublant = Object.values(decisions).filter((d) => d.statut === "redoublant").length;

  const elevesASoumettre = elevesATraiter.filter((insc) => decisions[insc.eleveId]);
  const nbASoumettre = elevesASoumettre.length;

  const isLoading =
    (ecoleId && anneesRaw === undefined) ||
    (ecoleId && anneeActiveId && inscriptionsRaw === undefined) ||
    (ecoleId && anneeActiveId && classesDisponiblesRaw === undefined) ||
    (ecoleId && anneeActiveId && propositionsExistantesRaw === undefined);

  // ── Handlers ────────────────────────────────────────────────
  const updateDecision = useCallback((eleveId, field, value) => {
    if (elevesDejaSoumis.has(eleveId)) return;
    setDecisions((prev) => ({
      ...prev,
      [eleveId]: { ...prev[eleveId], [field]: value },
    }));
  }, [elevesDejaSoumis]);

  const marquerTousPassants = useCallback(() => {
    if (!classeParDefaut) {
      toast.error("Veuillez d'abord choisir la classe de destination.");
      return;
    }
    const newDecisions = { ...decisions };
    elevesATraiter.forEach((insc) => {
      if (!decisions[insc.eleveId]) {
        newDecisions[insc.eleveId] = {
          statut: "passant",
          classeDestination: classeParDefaut,
        };
      }
    });
    setDecisions(newDecisions);
    toast.success(`Élèves non soumis marqués passants vers ${classeParDefaut}.`);
    setShowFilters(false);
  }, [classeParDefaut, decisions, elevesATraiter]);

  const handleSoumettre = useCallback(async () => {
    if (deadlinePassed) {
      toast.error("La date limite de soumission est dépassée.");
      return;
    }
    if (!nouvelleAnneeId) {
      toast.error("Veuillez sélectionner l'année de destination.");
      return;
    }
    if (elevesASoumettre.length === 0) {
      toast.error("Aucun élève traité à soumettre.");
      return;
    }

    const ok = await confirm(
      "Soumettre les propositions traitées",
      `Vous allez soumettre ${elevesASoumettre.length} proposition(s). Confirmer ?`
    );
    if (!ok) return;

    const decisionsArray = elevesASoumettre.map((insc) => ({
      eleveId: insc.eleveId,
      statut: decisions[insc.eleveId].statut,
      classeDestination: decisions[insc.eleveId].classeDestination,
    }));

    setSubmitting(true);
    try {
      await soumettrePropositions({
        ecoleId,
        anneeId: anneeActiveId,
        decisions: decisionsArray,
        userId: user._id,
      });
      const newDecisions = { ...decisions };
      elevesASoumettre.forEach((insc) => delete newDecisions[insc.eleveId]);
      setDecisions(newDecisions);
      setEditingIds((prev) => {
        const next = new Set(prev);
        elevesASoumettre.forEach((insc) => next.delete(insc.eleveId));
        return next;
      });
      toast.success(`${elevesASoumettre.length} proposition(s) soumise(s).`);
      setActiveTab("soumis");
    } catch (err) {
      console.error("[AssistantPassageEnseignant] submit failed:", err);
      toast.error("Impossible de soumettre les propositions");
    } finally {
      setSubmitting(false);
    }
  }, [deadlinePassed, nouvelleAnneeId, elevesASoumettre, decisions, ecoleId, anneeActiveId, user._id, soumettrePropositions, confirm]);

  const handleModifierSoumission = useCallback(async (prop) => {
    const ok = await confirm(
      "Modifier la proposition",
      `Rouvrir la proposition pour ${prop.nom} ${prop.postnom} ? Vous pourrez modifier la décision et la resoumettre.`
    );
    if (!ok) return;

    setEditingIds((prev) => new Set([...prev, prop.eleveId]));
    setDecisions((prev) => ({
      ...prev,
      [prop.eleveId]: {
        statut: prop.statutPropose,
        classeDestination: prop.classeDestinationPropose || "",
      },
    }));
    setActiveTab("a_traiter");
    toast.success(`${prop.nom} ajouté à la liste à traiter.`);
  }, [confirm]);

  const handleCancelEdit = useCallback((eleveId) => {
    setEditingIds((prev) => {
      const next = new Set(prev);
      next.delete(eleveId);
      return next;
    });
    setDecisions((prev) => {
      const next = { ...prev };
      delete next[eleveId];
      return next;
    });
  }, []);

  const resetFilters = useCallback(() => {
    setSearchTerm("");
    setFilter("sans_decision");
  }, []);

  const colors = useMemo(() => ({
    textPrimary: dark ? "#F1F5F9" : "#1E293B",
    textSecondary: dark ? "#94A3B8" : "#64748B",
    cardBg: dark ? "#1E293B" : "#FFFFFF",
    cardBorder: dark ? "#334155" : "#E2E8F0",
    selectBg: dark ? "#0F172A" : "#F9FAFB",
    selectText: dark ? "#F1F5F9" : "#1E293B",
    accent: dark ? "#818CF8" : "#4F46E5",
    danger: dark ? "#F87171" : "#EF4444",
    success: dark ? "#34D399" : "#10B981",
    warning: dark ? "#FBBF24" : "#F59E0B",
    badgePassant: dark ? "#064E3B" : "#D1FAE5",
    badgePassantText: dark ? "#34D399" : "#065F46",
    badgeRedoublant: dark ? "#78350F" : "#FEF3C7",
    badgeRedoublantText: dark ? "#FBBF24" : "#92400E",
    badgeSoumis: dark ? "#312E81" : "#EEF2FF",
    badgeSoumisText: dark ? "#A5B4FC" : "#4F46E5",
  }), [dark]);

  // ── Rendu : no classe ──────────────────────────────────────
  if (!classeEnseignant) {
    return (
      <>
        {APEKeyframes}
        <div
          role="status"
          aria-live="polite"
          style={{
            maxWidth: 1000, margin: "0 auto",
            padding: isMobile ? "40px 16px" : "60px 24px",
            textAlign: "center", color: colors.textSecondary,
          }}
        >
          <Users size={48} aria-hidden="true" style={{ marginBottom: 12, opacity: 0.5 }} />
          <p style={{ margin: 0, fontSize: 14 }}>
            Aucune classe ne vous est assignée.
          </p>
        </div>
      </>
    );
  }

  // ── Rendu : loading ────────────────────────────────────────
  if (isLoading) {
    return (
      <>
        {APEKeyframes}
        <div
          role="status"
          aria-busy="true"
          aria-live="polite"
          style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 300 }}
        >
          <Loader
            size={32}
            className="ape-spin"
            style={{ color: colors.accent }}
            aria-hidden="true"
          />
          <span style={{ position: "absolute", left: -9999 }}>Chargement des données</span>
        </div>
      </>
    );
  }

  // ── Rendu principal ────────────────────────────────────────
  return (
    <div
      style={{
        maxWidth: 1000, margin: "0 auto",
        padding: isMobile ? "10px 8px 100px" : "20px 16px 40px",
        width: "100%", boxSizing: "border-box",
      }}
    >
      {APEKeyframes}

      {/* En-tête */}
      <div style={{ marginBottom: isMobile ? 12 : 16 }}>
        <h2 style={{ fontSize: isMobile ? 17 : 22, fontWeight: 700, color: colors.textPrimary, margin: 0, lineHeight: 1.2 }}>
          Passage — {classeEnseignant}
        </h2>
        <p style={{ color: colors.textSecondary, marginTop: 2, marginBottom: 0, fontSize: isMobile ? 11.5 : 13 }}>
          {nbTotal} élève{nbTotal > 1 ? "s" : ""} · {nbATraiter} à traiter · {nbSoumis} soumis
          {editingIds.size > 0 ? ` · ${editingIds.size} en édition` : ""}
        </p>
      </div>

      {/* Bandeau date limite */}
      <DeadlineBanner deadline={deadline} dark={dark} isMobile={isMobile} />

      {/* Stats */}
      <div
        style={{
          display: isMobile ? "flex" : "grid",
          gridTemplateColumns: isMobile ? undefined : "repeat(auto-fit, minmax(150px, 1fr))",
          gap: isMobile ? 8 : 12,
          marginBottom: isMobile ? 12 : 18,
          overflowX: isMobile ? "auto" : "visible",
          paddingBottom: isMobile ? 4 : 0,
          scrollbarWidth: "none",
          ...SCROLL_AREA,
        }}
      >
        <StatCard icon={<Users size={16} />} label="Total" value={nbTotal} color="#4F46E5" dark={dark} isMobile={isMobile} />
        <StatCard icon={<Clock size={16} />} label="À traiter" value={nbATraiter} color="#F59E0B" dark={dark} isMobile={isMobile} />
        <StatCard icon={<UserCheck size={16} />} label="Prêts" value={nbAvecDecision} color="#8B5CF6" dark={dark} isMobile={isMobile} />
        <StatCard icon={<CheckCircle2 size={16} />} label="Soumis" value={nbSoumis} color="#10B981" dark={dark} isMobile={isMobile} />
        <StatCard icon={<GraduationCap size={16} />} label="Passants" value={nbPassant} color="#10B981" dark={dark} isMobile={isMobile} />
        <StatCard icon={<AlertTriangle size={16} />} label="Redoubl." value={nbRedoublant} color="#EF4444" dark={dark} isMobile={isMobile} />
      </div>

      {/* Tabs */}
      <div
        role="tablist"
        style={{
          display: "flex", gap: 4,
          borderBottom: `2px solid ${colors.cardBorder}`,
          marginBottom: isMobile ? 12 : 18,
          overflowX: "auto", whiteSpace: "nowrap", scrollbarWidth: "none",
          ...SCROLL_AREA,
        }}
      >
        <Pressable
          onClick={() => { setActiveTab("a_traiter"); setSearchTerm(""); }}
          role="tab"
          aria-selected={activeTab === "a_traiter"}
          focusColor={colors.accent}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: isMobile ? "12px 14px" : "12px 18px",
            border: "none", background: "transparent",
            color: activeTab === "a_traiter" ? colors.accent : colors.textSecondary,
            fontWeight: activeTab === "a_traiter" ? 700 : 500,
            borderBottom: activeTab === "a_traiter" ? `3px solid ${colors.accent}` : "3px solid transparent",
            fontSize: isMobile ? 14 : 15,
            flexShrink: 0, marginBottom: -2,
          }}
        >
          À traiter
          <span
            style={{
              background: activeTab === "a_traiter" ? (dark ? "#312E81" : "#EEF2FF") : (dark ? "#334155" : "#F1F5F9"),
              color: activeTab === "a_traiter" ? (dark ? "#C7D2FE" : "#4F46E5") : colors.textSecondary,
              padding: "1px 8px", borderRadius: 10, fontSize: 10.5, fontWeight: 700,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {nbATraiter}
          </span>
        </Pressable>
        <Pressable
          onClick={() => { setActiveTab("soumis"); setSearchTerm(""); }}
          role="tab"
          aria-selected={activeTab === "soumis"}
          focusColor={colors.accent}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: isMobile ? "12px 14px" : "12px 18px",
            border: "none", background: "transparent",
            color: activeTab === "soumis" ? colors.accent : colors.textSecondary,
            fontWeight: activeTab === "soumis" ? 700 : 500,
            borderBottom: activeTab === "soumis" ? `3px solid ${colors.accent}` : "3px solid transparent",
            fontSize: isMobile ? 14 : 15,
            flexShrink: 0, marginBottom: -2,
          }}
        >
          Soumis
          <span
            style={{
              background: activeTab === "soumis" ? (dark ? "#312E81" : "#EEF2FF") : (dark ? "#334155" : "#F1F5F9"),
              color: activeTab === "soumis" ? (dark ? "#C7D2FE" : "#4F46E5") : colors.textSecondary,
              padding: "1px 8px", borderRadius: 10, fontSize: 10.5, fontWeight: 700,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {nbSoumis}
          </span>
        </Pressable>
      </div>

      {/* Barre outils */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "stretch" }}>
        <div style={{ position: "relative", flex: 1 }}>
          <Search
            size={16}
            aria-hidden="true"
            style={{
              position: "absolute", left: 12, top: "50%",
              transform: "translateY(-50%)",
              color: colors.textSecondary,
              pointerEvents: "none",
            }}
          />
          <input
            type="search"
            inputMode="search"
            enterKeyHint="search"
            autoCorrect="off"
            spellCheck="false"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Rechercher un élève…"
            aria-label="Rechercher un élève"
            style={{
              width: "100%", padding: "12px 12px 12px 38px",
              borderRadius: 12,
              border: `1px solid ${searchFocused ? colors.accent : colors.cardBorder}`,
              background: colors.cardBg, color: colors.textPrimary,
              fontSize: 16, outline: "none", boxSizing: "border-box",
              minHeight: 44, ...TAP_BASE,
              transition: "border-color 0.2s",
            }}
          />
          {searchTerm && (
            <Pressable
              onClick={() => setSearchTerm("")}
              focusColor={colors.accent}
              ariaLabel="Effacer la recherche"
              style={{
                position: "absolute", right: 4, top: "50%",
                transform: "translateY(-50%)",
                background: "none", border: "none",
                color: colors.textSecondary,
                display: "flex", alignItems: "center", justifyContent: "center",
                minWidth: 44, minHeight: 44,
              }}
            >
              <X size={16} aria-hidden="true" />
            </Pressable>
          )}
        </div>

        {activeTab === "a_traiter" && (
          <Pressable
            onClick={() => setShowFilters(true)}
            focusColor={colors.accent}
            ariaLabel="Ouvrir les options de soumission"
            style={{
              position: "relative", padding: "0 14px", borderRadius: 12,
              border: `1px solid ${nouvelleAnneeId ? colors.accent : colors.cardBorder}`,
              background: nouvelleAnneeId ? (dark ? "#312E81" : "#EEF2FF") : colors.cardBg,
              color: nouvelleAnneeId ? (dark ? "#C7D2FE" : "#4F46E5") : colors.textPrimary,
              display: "flex", alignItems: "center", gap: 6,
              fontWeight: 600, fontSize: 13,
              minWidth: 44,
            }}
          >
            <SlidersHorizontal size={16} aria-hidden="true" />
            {nouvelleAnneeId && (
              <span
                aria-hidden="true"
                style={{ width: 8, height: 8, borderRadius: 4, background: colors.accent }}
              />
            )}
          </Pressable>
        )}
      </div>

      {/* Puce année sélectionnée */}
      {activeTab === "a_traiter" && nouvelleAnneeId && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
          <span
            style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "4px 10px",
              background: dark ? "#312E81" : "#EEF2FF",
              color: dark ? "#C7D2FE" : "#4F46E5",
              borderRadius: 20, fontSize: 11, fontWeight: 600,
            }}
          >
            <Calendar size={11} aria-hidden="true" />
            {annees.find((a) => a._id === nouvelleAnneeId)?.nom || "Année"}
            <button
              onClick={() => setNouvelleAnneeId("")}
              aria-label="Retirer l'année sélectionnée"
              style={{
                background: "none", border: "none",
                color: "inherit", cursor: "pointer",
                padding: 4, minWidth: 24, minHeight: 24,
                display: "flex", alignItems: "center", justifyContent: "center",
                touchAction: "manipulation",
              }}
            >
              <X size={12} aria-hidden="true" />
            </button>
          </span>
        </div>
      )}

      {/* Liste */}
      {activeTab === "a_traiter" ? (
        filteredATraiter.length === 0 ? (
          <div
            role="status"
            aria-live="polite"
            style={{ textAlign: "center", padding: isMobile ? 32 : 60, color: colors.textSecondary }}
          >
            <CheckCircle2 size={isMobile ? 40 : 56} aria-hidden="true" style={{ marginBottom: 12, opacity: 0.5 }} />
            <p style={{ margin: 0, fontSize: isMobile ? 13 : 15 }}>
              {nbATraiter === 0
                ? "Tous les élèves ont été traités et soumis."
                : "Aucun élève ne correspond aux critères."}
            </p>
            {filter !== "sans_decision" && (
              <Pressable
                onClick={() => setFilter("sans_decision")}
                focusColor={colors.accent}
                style={{
                  marginTop: 12, padding: "10px 16px", borderRadius: 8,
                  border: `1px solid ${colors.cardBorder}`,
                  background: "transparent", color: colors.textPrimary,
                  fontSize: 13, fontWeight: 600,
                }}
              >
                Voir les sans-décision
              </Pressable>
            )}
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(340px, 1fr))",
              gap: isMobile ? 8 : 10,
              ...SCROLL_AREA,
            }}
          >
            {filteredATraiter.map((insc) => (
              <EleveCardToTreat
                key={insc._id}
                insc={insc}
                decision={decisions[insc.eleveId]}
                classesTriees={classesTriees}
                updateDecision={updateDecision}
                colors={colors}
                dark={dark}
                isMobile={isMobile}
                isEditing={editingIds.has(insc.eleveId)}
                onCancelEdit={() => handleCancelEdit(insc.eleveId)}
              />
            ))}
          </div>
        )
      ) : (
        filteredSoumis.length === 0 ? (
          <div
            role="status"
            aria-live="polite"
            style={{ textAlign: "center", padding: isMobile ? 32 : 60, color: colors.textSecondary }}
          >
            <Clock size={isMobile ? 40 : 56} aria-hidden="true" style={{ marginBottom: 12, opacity: 0.5 }} />
            <p style={{ margin: 0, fontSize: isMobile ? 13 : 15 }}>
              {searchTerm
                ? "Aucun élève soumis ne correspond à la recherche."
                : "Aucune proposition soumise pour l'instant."}
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(340px, 1fr))",
              gap: isMobile ? 8 : 10,
              ...SCROLL_AREA,
            }}
          >
            {filteredSoumis.map((prop) => (
              <EleveCardSubmitted
                key={prop._id}
                prop={prop}
                colors={colors}
                dark={dark}
                isMobile={isMobile}
                deadlinePassed={deadlinePassed}
                onModifier={() => handleModifierSoumission(prop)}
              />
            ))}
          </div>
        )
      )}

      {/* Barre flottante soumettre */}
      {activeTab === "a_traiter" && nbASoumettre > 0 && (
        <div
          className="ape-slide-up-bar"
          style={{
            position: "fixed", bottom: 0, left: 0, right: 0,
            background: colors.cardBg,
            borderTop: `1px solid ${colors.cardBorder}`,
            padding: isMobile
              ? "10px 14px calc(10px + env(safe-area-inset-bottom, 0px))"
              : "12px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: isMobile ? "space-between" : "center",
            gap: 12,
            zIndex: 950,
            boxShadow: "0 -4px 20px rgba(0,0,0,0.15)",
          }}
        >
          {isMobile && (
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 2 }}>
                {nouvelleAnneeId
                  ? `Année : ${annees.find((a) => a._id === nouvelleAnneeId)?.nom || "—"}`
                  : "Choisir une année"}
              </div>
              <div
                style={{
                  fontSize: 13, fontWeight: 700, color: colors.textPrimary,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {nbASoumettre} à soumettre
              </div>
            </div>
          )}

          <Pressable
            onClick={handleSoumettre}
            disabled={submitting || !nouvelleAnneeId || deadlinePassed}
            focusColor={colors.accent}
            ariaBusy={submitting}
            ariaLabel={
              deadlinePassed
                ? "Soumission impossible, date limite dépassée"
                : !nouvelleAnneeId
                ? "Choisissez une année de destination"
                : `Soumettre ${nbASoumettre} proposition(s)`
            }
            style={{
              padding: isMobile ? "10px 16px" : "10px 24px",
              background: submitting || !nouvelleAnneeId || deadlinePassed
                ? (dark ? "#334155" : "#E2E8F0")
                : colors.accent,
              color: submitting || !nouvelleAnneeId || deadlinePassed
                ? (dark ? "#64748B" : "#94A3B8")
                : "#FFFFFF",
              border: "none", borderRadius: 10,
              fontWeight: 700,
              cursor: submitting || !nouvelleAnneeId || deadlinePassed ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              gap: 6, fontSize: 13.5,
              minWidth: isMobile ? "auto" : 200,
            }}
          >
            {submitting ? (
              <Loader size={16} className="ape-spin" role="status" aria-label="Envoi en cours" />
            ) : (
              <Send size={16} aria-hidden="true" />
            )}
            Soumettre ({nbASoumettre})
          </Pressable>
        </div>
      )}

      {/* Bottom sheet filtres */}
      <FiltersSheet
        open={showFilters}
        onClose={() => setShowFilters(false)}
        dark={dark}
        nouvelleAnneeId={nouvelleAnneeId}
        setNouvelleAnneeId={setNouvelleAnneeId}
        anneesDestination={anneesDestination}
        filter={filter}
        setFilter={setFilter}
        classeParDefaut={classeParDefaut}
        setClasseParDefaut={setClasseParDefaut}
        classesTriees={classesTriees}
        onMarquerTousPassants={marquerTousPassants}
        nbSansDecision={nbSansDecision}
        nbAvecDecision={nbAvecDecision}
        onReset={resetFilters}
      />

      <ConfirmDialog {...dialogProps} />
    </div>
  );
}