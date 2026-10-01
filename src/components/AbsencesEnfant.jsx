// src/components/AbsencesEnfant.jsx
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import toast from "react-hot-toast";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import { Skeleton } from "./Skeleton";
import {
  Calendar, AlertTriangle, CheckCircle, XCircle, Loader,
  FileText, Clock, X, Send, MessageSquare,
} from "lucide-react";

// ════════════════════════════════════════════════════════════════════
// CONSTANTES MODULE-LEVEL
// ════════════════════════════════════════════════════════════════════
const TAP_BASE = {
  touchAction: "manipulation",
  WebkitTapHighlightColor: "transparent",
  minHeight: 44,
};

const FOCUS_RING = (color) => ({
  outline: `2px solid ${color}`,
  outlineOffset: 2,
});

// ════════════════════════════════════════════════════════════════════
// KEYFRAMES module-level
// ════════════════════════════════════════════════════════════════════
const AbsencesEnfantKeyframes = (
  <style>{`
    @keyframes ae-spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
    @keyframes ae-fade-in {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    @keyframes ae-slide-up {
      from { transform: translateY(100%); }
      to   { transform: translateY(0); }
    }
    .ae-spin     { animation: ae-spin 1s linear infinite; }
    .ae-fade-in  { animation: ae-fade-in 0.18s ease-out; }
    .ae-slide-up { animation: ae-slide-up 0.25s cubic-bezier(0.22, 1, 0.36, 1); }

    @media (prefers-reduced-motion: reduce) {
      .ae-spin, .ae-fade-in, .ae-slide-up {
        animation: none !important;
      }
    }
  `}</style>
);

// ════════════════════════════════════════════════════════════════════
// TOKENS
// ════════════════════════════════════════════════════════════════════
function buildTokens(dark) {
  return {
    text: dark ? "#F1F5F9" : "#1E293B",
    textMuted: dark ? "#94A3B8" : "#64748B",
    textLabel: dark ? "#CBD5E1" : "#374151",
    surface: dark ? "#1E293B" : "#FFFFFF",
    border: dark ? "#334155" : "#E2E8F0",
    inputBg: dark ? "#0F172A" : "#F8FAFC",
    inputText: dark ? "#F1F5F9" : "#1E293B",
    primary: dark ? "#818CF8" : "#4F46E5",
    primaryHover: dark ? "#6366F1" : "#4338CA",
    primaryDisabled: dark ? "#4B5563" : "#A5B4FC",
    primarySoft: dark ? "#312E81" : "#EEF2FF",
    success: dark ? "#34D399" : "#10B981",
    successSoft: dark ? "#064E3B" : "#D1FAE5",
    warning: dark ? "#FBBF24" : "#F59E0B",
    warningSoft: dark ? "#78350F" : "#FEF3C7",
    danger: dark ? "#F87171" : "#EF4444",
    dangerSoft: dark ? "#7F1D1D" : "#FEE2E2",
    info: dark ? "#60A5FA" : "#1D4ED8",
    infoSoft: dark ? "#1E3A8A" : "#DBEAFE",
    shadow: dark
      ? "0 1px 3px rgba(0,0,0,0.3)"
      : "0 1px 3px rgba(0,0,0,0.05)",
    shadowCard: dark
      ? "0 1px 2px rgba(0,0,0,0.25)"
      : "0 1px 2px rgba(0,0,0,0.04)",
  };
}

// ════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════
function formatDateLabel(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const d = new Date(date);
  d.setHours(0, 0, 0, 0);

  if (d.getTime() === today.getTime()) return "Aujourd'hui";
  if (d.getTime() === yesterday.getTime()) return "Hier";

  const diffDays = Math.round((today - d) / (1000 * 60 * 60 * 24));
  if (diffDays > 0 && diffDays < 7) {
    return date.toLocaleDateString("fr-FR", { weekday: "long" });
  }
  if (date.getFullYear() === today.getFullYear()) {
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
    });
  }
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ════════════════════════════════════════════════════════════════════
// PRESSABLE — feedback tap + focus ring via state React
// ════════════════════════════════════════════════════════════════════
function Pressable({
  onClick, style, children, disabled = false, type = "button",
  focusColor, ariaLabel, ariaBusy, ...rest
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
      onPointerDown={() => !disabled && setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        ...TAP_BASE,
        transform: pressed && !disabled ? "scale(0.97)" : "scale(1)",
        transition: "transform 0.12s ease, background-color 0.2s, border-color 0.2s, box-shadow 0.2s",
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
// MODAL JUSTIFICATIF
// ════════════════════════════════════════════════════════════════════
function JustifModal({ open, onClose, onSubmit, sending, tokens, isMobile }) {
  const [texte, setTexte] = useState("");
  const textareaRef = useRef(null);

  useEffect(() => {
    if (open) {
      setTexte("");
      const t = setTimeout(() => textareaRef.current?.focus(), 200);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === "Escape" && !sending) onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, sending, onClose]);

  const handleSubmit = useCallback(async () => {
    if (!texte.trim()) {
      toast.error("Veuillez saisir un justificatif.");
      return;
    }
    await onSubmit(texte.trim());
    setTexte("");
  }, [texte, onSubmit]);

  const handleClose = useCallback(() => {
    if (sending) return;
    setTexte("");
    onClose();
  }, [sending, onClose]);

  if (!open) return null;

  const content = (
    <>
      {isMobile && (
        <div
          aria-hidden="true"
          style={{
            width: 40,
            height: 8,
            borderRadius: 4,
            background: tokens.border,
            margin: "0 auto 14px",
          }}
        />
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <div
            aria-hidden="true"
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: tokens.primarySoft,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: tokens.primary,
              flexShrink: 0,
            }}
          >
            <MessageSquare size={16} />
          </div>
          <h3
            id="justif-modal-title"
            style={{
              margin: 0,
              fontSize: isMobile ? 16 : 17,
              fontWeight: 700,
              color: tokens.text,
            }}
          >
            Justifier l'absence
          </h3>
        </div>
        <Pressable
          onClick={handleClose}
          disabled={sending}
          focusColor={tokens.primary}
          ariaLabel="Fermer"
          style={{
            background: "none",
            border: "none",
            cursor: sending ? "not-allowed" : "pointer",
            color: tokens.textMuted,
            padding: 8,
            minWidth: 44,
            minHeight: 44,
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: sending ? 0.5 : 1,
          }}
        >
          <X size={22} aria-hidden="true" />
        </Pressable>
      </div>

      <label
        htmlFor="justif-textarea"
        style={{
          display: "block",
          fontSize: 12,
          fontWeight: 600,
          color: tokens.textLabel,
          marginBottom: 6,
          textTransform: "uppercase",
          letterSpacing: 0.3,
        }}
      >
        Motif / Justificatif
      </label>
      <textarea
        id="justif-textarea"
        ref={textareaRef}
        value={texte}
        onChange={(e) => setTexte(e.target.value)}
        placeholder="Ex : Certificat médical fourni le 15/09…"
        rows={isMobile ? 4 : 3}
        disabled={sending}
        enterKeyHint="done"
        style={{
          width: "100%",
          padding: "12px 14px",
          border: `1.5px solid ${tokens.border}`,
          borderRadius: 10,
          fontSize: isMobile ? 16 : 14,
          outline: "none",
          background: tokens.inputBg,
          color: tokens.inputText,
          resize: "vertical",
          fontFamily: "inherit",
          boxSizing: "border-box",
          lineHeight: 1.4,
          minHeight: 90,
          opacity: sending ? 0.6 : 1,
        }}
      />

      <p
        style={{
          fontSize: 11.5,
          color: tokens.textMuted,
          marginTop: 8,
          marginBottom: 16,
          lineHeight: 1.4,
        }}
      >
        Votre justificatif sera transmis à l'administration pour validation.
      </p>

      <div
        style={{
          display: "flex",
          gap: 10,
          flexDirection: isMobile ? "column" : "row",
        }}
      >
        <Pressable
          onClick={handleClose}
          disabled={sending}
          focusColor={tokens.primary}
          style={{
            flex: isMobile ? "none" : 1,
            padding: isMobile ? "14px 16px" : "12px 16px",
            background: "transparent",
            border: `1.5px solid ${tokens.border}`,
            borderRadius: 12,
            cursor: sending ? "not-allowed" : "pointer",
            color: tokens.textMuted,
            fontWeight: 600,
            fontSize: 14,
            order: isMobile ? 2 : 1,
            opacity: sending ? 0.6 : 1,
          }}
        >
          Annuler
        </Pressable>
        <Pressable
          onClick={handleSubmit}
          disabled={sending || !texte.trim()}
          focusColor={tokens.primary}
          ariaBusy={sending}
          style={{
            flex: isMobile ? "none" : 2,
            padding: isMobile ? "14px 18px" : "12px 18px",
            background:
              sending || !texte.trim()
                ? tokens.primaryDisabled
                : `linear-gradient(135deg, ${tokens.primary}, ${tokens.primaryHover})`,
            color: "white",
            border: "none",
            borderRadius: 12,
            cursor: sending || !texte.trim() ? "not-allowed" : "pointer",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            fontSize: 14,
            order: isMobile ? 1 : 2,
            boxShadow:
              sending || !texte.trim()
                ? "none"
                : "0 6px 18px rgba(79,70,229,0.3)",
          }}
        >
          {sending ? (
            <Loader size={16} className="ae-spin" role="status" aria-label="Envoi en cours" />
          ) : (
            <Send size={16} aria-hidden="true" />
          )}
          {sending ? "Envoi…" : "Envoyer le justificatif"}
        </Pressable>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <>
        {AbsencesEnfantKeyframes}
        <div
          onClick={handleClose}
          className="ae-fade-in"
          aria-hidden="true"
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
            zIndex: 1300,
          }}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="justif-modal-title"
          className="ae-slide-up"
          style={{
            position: "fixed", left: 0, right: 0, bottom: 0,
            background: tokens.surface,
            borderTopLeftRadius: 20, borderTopRightRadius: 20,
            padding: "12px 16px calc(24px + env(safe-area-inset-bottom, 0px))",
            zIndex: 1301, maxHeight: "90vh", overflowY: "auto",
            overscrollBehavior: "contain",
            WebkitOverflowScrolling: "touch",
            boxShadow: "0 -8px 30px rgba(0,0,0,0.25)",
          }}
        >
          {content}
        </div>
      </>
    );
  }

  return (
    <>
      {AbsencesEnfantKeyframes}
      <div
        onClick={handleClose}
        className="ae-fade-in"
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1300, padding: 16,
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="justif-modal-title"
          onClick={(e) => e.stopPropagation()}
          style={{
            background: tokens.surface,
            borderRadius: 16, padding: 24,
            width: "100%", maxWidth: 480,
            boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
            border: `1px solid ${tokens.border}`,
            overscrollBehavior: "contain",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {content}
        </div>
      </div>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════
// CARTE ABSENCE
// ════════════════════════════════════════════════════════════════════
function AbsenceCard({ abs, tokens, isMobile, onJustifier }) {
  const estJustifiee = abs.statutJustification === "justifiee";
  const estRejetee = abs.statutJustification === "rejetee";
  const estEnAttente = abs.statutJustification === "en_attente";
  const canJustify =
    !abs.statutJustification || abs.statutJustification === "rejetee";

  const statusConfig = estJustifiee
    ? {
        bg: tokens.successSoft,
        color: tokens.success,
        icon: <CheckCircle size={11} aria-hidden="true" />,
        label: "Justifiée",
      }
    : estRejetee
    ? {
        bg: tokens.dangerSoft,
        color: tokens.danger,
        icon: <XCircle size={11} aria-hidden="true" />,
        label: "Rejetée",
      }
    : estEnAttente
    ? {
        bg: tokens.infoSoft,
        color: tokens.info,
        icon: <Clock size={11} aria-hidden="true" />,
        label: "En attente",
      }
    : {
        bg: tokens.warningSoft,
        color: tokens.warning,
        icon: <AlertTriangle size={11} aria-hidden="true" />,
        label: "Non justifiée",
      };

  const typeConfig =
    abs.type === "absence"
      ? { bg: tokens.dangerSoft, color: tokens.danger, label: "Absence" }
      : { bg: tokens.warningSoft, color: tokens.warning, label: "Retard" };

  return (
    <article
      style={{
        background: tokens.surface,
        borderRadius: 12,
        padding: isMobile ? "12px 14px" : "14px 16px",
        boxShadow: tokens.shadowCard,
        border: `1px solid ${tokens.border}`,
        minWidth: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 6,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            flex: 1,
            minWidth: 0,
          }}
        >
          <Calendar
            size={14}
            color={tokens.primary}
            aria-hidden="true"
            style={{ flexShrink: 0 }}
          />
          <span
            style={{
              fontSize: isMobile ? 13.5 : 14,
              fontWeight: 600,
              color: tokens.text,
              textTransform: "capitalize",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {formatDateLabel(abs.date)}
          </span>
          <span
            style={{
              padding: "2px 8px",
              borderRadius: 10,
              fontSize: 10.5,
              fontWeight: 700,
              background: typeConfig.bg,
              color: typeConfig.color,
              flexShrink: 0,
            }}
          >
            {typeConfig.label}
          </span>
        </div>

        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "3px 9px",
            borderRadius: 12,
            fontSize: 10.5,
            fontWeight: 700,
            background: statusConfig.bg,
            color: statusConfig.color,
            flexShrink: 0,
          }}
        >
          {statusConfig.icon}
          {statusConfig.label}
        </span>
      </div>

      {abs.commentaire && (
        <div
          style={{
            fontSize: isMobile ? 11.5 : 12,
            color: tokens.textMuted,
            marginTop: 2,
            marginBottom: 4,
            lineHeight: 1.4,
            fontStyle: "italic",
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
          }}
        >
          {abs.commentaire}
        </div>
      )}

      {abs.justificatif && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 6,
            marginTop: 8,
            padding: "8px 10px",
            background: tokens.inputBg,
            border: `1px solid ${tokens.border}`,
            borderRadius: 8,
            fontSize: isMobile ? 11.5 : 12,
            color: tokens.textMuted,
            lineHeight: 1.4,
          }}
        >
          <FileText
            size={13}
            aria-hidden="true"
            style={{ flexShrink: 0, marginTop: 1 }}
          />
          <span style={{ minWidth: 0, overflow: "hidden" }}>
            {abs.justificatif}
          </span>
        </div>
      )}

      {canJustify && (
        <JustifierButton
          onClick={onJustifier}
          isMobile={isMobile}
          tokens={tokens}
          estRejetee={estRejetee}
        />
      )}
    </article>
  );
}

// ✅ Extraction du bouton pour state React (avant : manipulation DOM)
function JustifierButton({ onClick, isMobile, tokens, estRejetee }) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [focused, setFocused] = useState(false);

  const bg = hovered || pressed ? tokens.primaryHover : tokens.primary;

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
      style={{
        ...TAP_BASE,
        marginTop: 10,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        padding: isMobile ? "10px 14px" : "10px 14px",
        background: bg,
        color: "white",
        border: "none",
        borderRadius: 8,
        cursor: "pointer",
        fontWeight: 600,
        fontSize: 12.5,
        alignSelf: "flex-start",
        transform: pressed ? "scale(0.97)" : "scale(1)",
        transition: "transform 0.12s ease, background-color 0.15s ease",
        ...(focused ? FOCUS_RING(tokens.primary) : null),
      }}
    >
      <Send size={13} aria-hidden="true" />
      {estRejetee ? "Soumettre à nouveau" : "Justifier"}
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ════════════════════════════════════════════════════════════════════
export function AbsencesEnfant({ eleveId, userId }) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();

  const tokens = useMemo(() => buildTokens(dark), [dark]);

  const absencesArgs = useMemo(
    () => (eleveId && userId ? { eleveId, userId } : "skip"),
    [eleveId, userId]
  );

  const absencesRaw = useQuery(api.absences.listByEleve, absencesArgs);
  const soumettreJustificatif = useMutation(
    api.absences.soumettreJustificatif
  );

  const [justifAbsenceId, setJustifAbsenceId] = useState(null);
  const [sending, setSending] = useState(false);

  const absences = useMemo(() => absencesRaw ?? [], [absencesRaw]);

  const handleSubmitJustif = useCallback(
    async (texte) => {
      setSending(true);
      try {
        await soumettreJustificatif({
          absenceId: justifAbsenceId,
          justificatif: texte,
          userId,
        });
        toast.success("Justificatif envoyé pour validation");
        setJustifAbsenceId(null);
      } catch (err) {
        console.error("[AbsencesEnfant] submit failed:", err);
        toast.error(
          err?.message ?? "Impossible d'envoyer le justificatif"
        );
      } finally {
        setSending(false);
      }
    },
    [justifAbsenceId, userId, soumettreJustificatif]
  );

  const handleCloseModal = useCallback(() => {
    setJustifAbsenceId(null);
  }, []);

  // ════════════════════════════════════════════════════════════════════
  // CHARGEMENT
  // ════════════════════════════════════════════════════════════════════
  if (absencesRaw === undefined) {
    return <Skeleton height={200} />;
  }

  // ════════════════════════════════════════════════════════════════════
  // EN-TÊTE
  // ════════════════════════════════════════════════════════════════════
  const header = (
    <div style={{ marginBottom: isMobile ? 12 : 16 }}>
      <h2
        style={{
          fontSize: isMobile ? 15 : 17,
          fontWeight: 700,
          color: tokens.text,
          margin: 0,
          lineHeight: 1.2,
        }}
      >
        Absences et retards
      </h2>
      <p
        style={{
          color: tokens.textMuted,
          marginTop: 2,
          marginBottom: 0,
          fontSize: isMobile ? 11.5 : 12.5,
        }}
      >
        {absences.length === 0
          ? "Aucune absence enregistrée"
          : `${absences.length} enregistrement${absences.length > 1 ? "s" : ""}`}
      </p>
    </div>
  );

  // ════════════════════════════════════════════════════════════════════
  // ÉTAT VIDE
  // ════════════════════════════════════════════════════════════════════
  if (absences.length === 0) {
    return (
      <div style={{ marginTop: isMobile ? 12 : 16 }}>
        {header}
        <div
          role="status"
          aria-live="polite"
          style={{
            background: tokens.surface,
            borderRadius: 14,
            padding: isMobile ? 32 : 44,
            textAlign: "center",
            boxShadow: tokens.shadow,
            border: `1px solid ${tokens.border}`,
            color: tokens.textMuted,
          }}
        >
          <div
            aria-hidden="true"
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: tokens.successSoft,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 12px",
            }}
          >
            <CheckCircle size={26} color={tokens.success} />
          </div>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              fontWeight: 600,
              color: tokens.text,
            }}
          >
            Aucune absence
          </p>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: 12.5,
              maxWidth: 280,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            Aucune absence ou retard n'a été enregistré pour cet élève
          </p>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════
  // LISTE
  // ════════════════════════════════════════════════════════════════════
  return (
    <div style={{ marginTop: isMobile ? 12 : 16 }}>
      {header}

      <ul
        role="list"
        style={{
          display: "grid",
          gap: isMobile ? 8 : 10,
          listStyle: "none",
          padding: 0,
          margin: 0,
          overscrollBehavior: "contain",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {absences.map((a) => (
          <li key={a._id}>
            <AbsenceCard
              abs={a}
              tokens={tokens}
              isMobile={isMobile}
              onJustifier={() => setJustifAbsenceId(a._id)}
            />
          </li>
        ))}
      </ul>

      <JustifModal
        open={justifAbsenceId !== null}
        onClose={handleCloseModal}
        onSubmit={handleSubmitJustif}
        sending={sending}
        tokens={tokens}
        isMobile={isMobile}
      />
    </div>
  );
}