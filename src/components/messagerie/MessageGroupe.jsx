// src/components/messagerie/MessageGroupe.jsx
import { useState, useMemo, useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useConfirm } from "@/hooks/useConfirm";
import {
  Send,
  ArrowLeft,
  Users,
  GraduationCap,
  BookOpen,
  Loader,
  Megaphone,
  AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";

// ════════════════════════════════════════════════════════════════════
// SAFE-AREA
// ════════════════════════════════════════════════════════════════════
const SAFE_TOP = "env(safe-area-inset-top, 0px)";
const SAFE_BOTTOM = "env(safe-area-inset-bottom, 0px)";
const SAFE_LEFT = "env(safe-area-inset-left, 0px)";
const SAFE_RIGHT = "env(safe-area-inset-right, 0px)";

// ════════════════════════════════════════════════════════════════════
// CONSTANTES
// ════════════════════════════════════════════════════════════════════
const ROLES_AUTORISES_DIFFUSION = ["admin", "directeur", "disciplinaire"];

const MAX_MESSAGE_LENGTH = 5000;

const TARGETS = [
  {
    id: "parents",
    label: "Parents",
    labelMobile: "Parents",
    icon: Users,
    description: "tous les parents de l'école",
  },
  {
    id: "eleves",
    label: "Tous les élèves",
    labelMobile: "Élèves",
    icon: GraduationCap,
    description: "tous les élèves de l'école",
  },
  {
    id: "classe",
    label: "Par classe",
    labelMobile: "Classe",
    icon: BookOpen,
    description: "les élèves d'une classe spécifique",
  },
];

// ════════════════════════════════════════════════════════════════════
// KEYFRAMES module-level
// ════════════════════════════════════════════════════════════════════
const MessageGroupeKeyframes = (
  <style>{`
    @keyframes mg-spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
    @keyframes mg-fade-in {
      from { opacity: 0; transform: translateY(6px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes mg-slide-in {
      from { opacity: 0; transform: translateY(-4px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .mg-spin { animation: mg-spin 0.9s linear infinite; }
    .mg-fade-in { animation: mg-fade-in 0.25s ease-out; }
    .mg-slide-in { animation: mg-slide-in 0.2s ease-out; }
    @media (prefers-reduced-motion: reduce) {
      .mg-spin, .mg-fade-in, .mg-slide-in { animation: none !important; }
    }
  `}</style>
);

// ════════════════════════════════════════════════════════════════════
// TOKENS
// ════════════════════════════════════════════════════════════════════
function buildTokens(dark) {
  return {
    bg: dark ? "#0F172A" : "#F8FAFC",
    surface: dark ? "#1E293B" : "#FFFFFF",
    surfaceHover: dark ? "#26334D" : "#F8FAFC",
    border: dark ? "#334155" : "#E2E8F0",
    text: dark ? "#F1F5F9" : "#1E293B",
    textMuted: dark ? "#94A3B8" : "#64748B",
    textLabel: dark ? "#CBD5E1" : "#374151",
    primary: dark ? "#818CF8" : "#4F46E5",
    primaryHover: dark ? "#6366F1" : "#4338CA",
    primarySoft: dark ? "#312E81" : "#EEF2FF",
    primaryDisabled: dark ? "#4B5563" : "#A5B4FC",
    ghostHover: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
    ghostActive: dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
    inputBg: dark ? "#0F172A" : "#F8FAFC",
    buttonSecondaryBg: dark ? "#334155" : "#F1F5F9",
    buttonSecondaryText: dark ? "#F1F5F9" : "#1E293B",
    buttonSecondaryHover: dark ? "#475569" : "#E2E8F0",
    danger: dark ? "#F87171" : "#EF4444",
    shadow: dark
      ? "0 1px 3px rgba(0,0,0,0.3)"
      : "0 1px 3px rgba(0,0,0,0.05)",
  };
}

// ════════════════════════════════════════════════════════════════════
// SOUS-COMPOSANTS
// ════════════════════════════════════════════════════════════════════

function TargetButton({
  icon: Icon,
  label,
  isActive,
  onClick,
  disabled,
  tokens,
  isMobile,
}) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);

  const bg = isActive
    ? pressed
      ? tokens.primaryHover
      : tokens.primary
    : pressed
    ? tokens.buttonSecondaryHover
    : hovered && !disabled
    ? tokens.buttonSecondaryHover
    : tokens.buttonSecondaryBg;

  const color = isActive ? "#FFFFFF" : tokens.buttonSecondaryText;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => !isMobile && setHovered(true)}
      onMouseLeave={() => !isMobile && setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      onTouchCancel={() => setPressed(false)}
      style={{
        padding: isMobile ? "14px 14px" : "12px 16px",
        borderRadius: 12,
        background: bg,
        color,
        border: isActive
          ? `2px solid ${tokens.primary}`
          : "2px solid transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        fontWeight: 600,
        fontSize: 14,
        flex: isMobile ? "none" : 1,
        width: isMobile ? "100%" : "auto",
        transition:
          "background 0.12s ease, border-color 0.15s ease, transform 0.1s ease",
        transform: pressed && !disabled ? "scale(0.97)" : "scale(1)",
        outline: focused ? `2px solid ${tokens.primary}` : "none",
        outlineOffset: 2,
        minHeight: isMobile ? 48 : 44,
        boxSizing: "border-box",
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation",
      }}
      aria-pressed={isActive}
    >
      <Icon size={isMobile ? 18 : 17} />
      {label}
    </button>
  );
}

function BackButton({ onClick, tokens }) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      onTouchCancel={() => setPressed(false)}
      style={{
        background: pressed
          ? tokens.ghostActive
          : hovered
          ? tokens.ghostHover
          : "transparent",
        border: "none",
        cursor: "pointer",
        color: tokens.text,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 44,
        height: 44,
        padding: 0,
        marginLeft: -8,
        borderRadius: 12,
        flexShrink: 0,
        transition: "background 0.12s ease, transform 0.1s ease",
        transform: pressed ? "scale(0.92)" : "scale(1)",
        outline: focused ? `2px solid ${tokens.primary}` : "none",
        outlineOffset: 2,
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation",
      }}
      aria-label="Retour"
      title="Retour"
    >
      <ArrowLeft size={22} />
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ════════════════════════════════════════════════════════════════════
export function MessageGroupe({ user, ecoleId, onBack }) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();
  const confirm = useConfirm();

  const tokens = useMemo(() => buildTokens(dark), [dark]);

  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [target, setTarget] = useState("parents");
  const [selectedClasse, setSelectedClasse] = useState("");
  const [sendPressed, setSendPressed] = useState(false);

  // ════════════════════════════════════════════════════════════════════
  // MUTATIONS
  // ════════════════════════════════════════════════════════════════════
  const sendToAllParents = useMutation(api.messages.sendToAllParents);
  const sendToAllEleves = useMutation(api.messages.sendToAllEleves);
  const sendToClasse = useMutation(api.messages.sendToClasse);

  // ════════════════════════════════════════════════════════════════════
  // QUERY CLASSES
  // ════════════════════════════════════════════════════════════════════
  const classesArgs = useMemo(
    () => (ecoleId ? { ecoleId } : "skip"),
    [ecoleId]
  );
  const classesRaw = useQuery(api.classes.list, classesArgs);
  const classes = useMemo(() => classesRaw ?? [], [classesRaw]);

  // ════════════════════════════════════════════════════════════════════
  // VALIDATION
  // ════════════════════════════════════════════════════════════════════
  const trimmedMessage = message.trim();
  const messageLength = trimmedMessage.length;
  const isOverLimit = messageLength > MAX_MESSAGE_LENGTH;

  const canSend = useMemo(() => {
    if (sending) return false;
    if (!trimmedMessage) return false;
    if (isOverLimit) return false;
    if (target === "classe" && !selectedClasse) return false;
    return true;
  }, [sending, trimmedMessage, isOverLimit, target, selectedClasse]);

  const hasRole = useMemo(
    () => ROLES_AUTORISES_DIFFUSION.includes(user?.role),
    [user?.role]
  );

  // ════════════════════════════════════════════════════════════════════
  // DESCRIPTION DESTINATAIRES
  // ════════════════════════════════════════════════════════════════════
  const targetDescription = useMemo(() => {
    if (target === "parents") return "tous les parents de l'école";
    if (target === "eleves") return "tous les élèves de l'école";
    if (target === "classe") {
      return selectedClasse
        ? `les élèves de la classe ${selectedClasse}`
        : "la classe sélectionnée";
    }
    return "—";
  }, [target, selectedClasse]);

  // ════════════════════════════════════════════════════════════════════
  // HANDLER SEND
  // ════════════════════════════════════════════════════════════════════
  const handleSend = useCallback(async () => {
    if (!trimmedMessage) {
      toast.error("Veuillez écrire un message.");
      return;
    }
    if (target === "classe" && !selectedClasse) {
      toast.error("Veuillez choisir une classe.");
      return;
    }

    // ✅ Confirmation avant envoi de masse
    const ok = await confirm({
      title: "Confirmer la diffusion",
      message: `Envoyer ce message à ${targetDescription} ? Cette action est irréversible.`,
      confirmLabel: "Envoyer",
      cancelLabel: "Annuler",
    });
    if (!ok) return;

    setSending(true);
    try {
      let result;
      switch (target) {
        case "parents":
          result = await sendToAllParents({
            ecoleId,
            expediteurId: user._id,
            contenu: trimmedMessage,
          });
          break;
        case "eleves":
          result = await sendToAllEleves({
            ecoleId,
            expediteurId: user._id,
            contenu: trimmedMessage,
          });
          break;
        case "classe":
          result = await sendToClasse({
            ecoleId,
            expediteurId: user._id,
            classe: selectedClasse,
            contenu: trimmedMessage,
          });
          break;
        default:
          throw new Error("Cible invalide");
      }

      // ✅ FIX : le backend renvoie { success, sent, skipped }
      const sent = result?.sent ?? 0;
      const skipped = result?.skipped ?? 0;

      if (sent === 0) {
        toast.error("Aucun destinataire trouvé.");
      } else {
        toast.success(
          `Message envoyé à ${sent} personne${sent > 1 ? "s" : ""}${
            skipped ? ` (${skipped} ignoré${skipped > 1 ? "s" : ""})` : ""
          }.`
        );
        onBack();
      }
    } catch (err) {
      const msg = err?.message ?? "inconnue";
      toast.error("Erreur : " + msg);
    } finally {
      setSending(false);
    }
  }, [
    trimmedMessage,
    target,
    selectedClasse,
    targetDescription,
    confirm,
    ecoleId,
    user,
    sendToAllParents,
    sendToAllEleves,
    sendToClasse,
    onBack,
  ]);

  if (!hasRole) return null;

  // ════════════════════════════════════════════════════════════════════
  // RENDU
  // ════════════════════════════════════════════════════════════════════
  return (
    <div
      style={{
        minHeight: "100%",
        background: tokens.bg,
        paddingBottom: `calc(16px + ${SAFE_BOTTOM})`,
      }}
    >
      {MessageGroupeKeyframes}

      <div
        className="mg-fade-in"
        style={{
          maxWidth: 720,
          margin: "0 auto",
          padding: isMobile
            ? `calc(12px + ${SAFE_TOP}) calc(12px + ${SAFE_LEFT}) 16px calc(12px + ${SAFE_RIGHT})`
            : "20px 16px",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {/* ═══════════ EN-TÊTE ═══════════ */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: isMobile ? 16 : 20,
          }}
        >
          {isMobile && <BackButton onClick={onBack} tokens={tokens} />}

          <div
            style={{
              width: isMobile ? 40 : 44,
              height: isMobile ? 40 : 44,
              borderRadius: 12,
              background: tokens.primarySoft,
              color: tokens.primary,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
            aria-hidden="true"
          >
            <Megaphone size={isMobile ? 20 : 22} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <h2
              style={{
                margin: 0,
                fontSize: isMobile ? 18 : 20,
                fontWeight: 700,
                color: tokens.text,
                lineHeight: 1.2,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              Diffusion groupée
            </h2>
            <p
              style={{
                margin: 0,
                marginTop: 2,
                fontSize: isMobile ? 12.5 : 13,
                color: tokens.textMuted,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              Envoyez un communiqué à un groupe ciblé
            </p>
          </div>
        </div>

        {/* ═══════════ CARTE ═══════════ */}
        <div
          style={{
            background: tokens.surface,
            borderRadius: 16,
            border: `1px solid ${tokens.border}`,
            padding: isMobile ? 16 : 20,
            boxShadow: tokens.shadow,
          }}
        >
          {/* Destinataires */}
          <label
            style={{
              display: "block",
              marginBottom: 8,
              fontWeight: 700,
              fontSize: 11,
              color: tokens.textMuted,
              textTransform: "uppercase",
              letterSpacing: 0.6,
            }}
          >
            Destinataires
          </label>

          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 20,
              flexDirection: isMobile ? "column" : "row",
            }}
          >
            {TARGETS.map((t) => (
              <TargetButton
                key={t.id}
                icon={t.icon}
                label={isMobile ? t.labelMobile : t.label}
                isActive={target === t.id}
                onClick={() => setTarget(t.id)}
                disabled={sending}
                tokens={tokens}
                isMobile={isMobile}
              />
            ))}
          </div>

          {/* Classe */}
          {target === "classe" && (
            <div className="mg-slide-in" style={{ marginBottom: 20 }}>
              <label
                htmlFor="classe-select"
                style={{
                  display: "block",
                  marginBottom: 8,
                  fontWeight: 700,
                  fontSize: 11,
                  color: tokens.textMuted,
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                }}
              >
                Classe
              </label>
              <select
                id="classe-select"
                value={selectedClasse}
                onChange={(e) => setSelectedClasse(e.target.value)}
                disabled={sending}
                style={{
                  width: "100%",
                  padding: isMobile ? "14px 14px" : "12px 14px",
                  borderRadius: 10,
                  border: `1.5px solid ${tokens.border}`,
                  background: tokens.inputBg,
                  color: tokens.text,
                  fontSize: isMobile ? 16 : 14,
                  outline: "none",
                  boxSizing: "border-box",
                  cursor: sending ? "not-allowed" : "pointer",
                  opacity: sending ? 0.6 : 1,
                  minHeight: 48,
                  fontFamily: "inherit",
                  WebkitAppearance: "none",
                  touchAction: "manipulation",
                }}
              >
                <option value="">— Choisir une classe —</option>
                {classes.map((c) => (
                  <option key={c._id} value={c.nom}>
                    {c.nom}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Message */}
          <label
            htmlFor="message-input"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
              fontWeight: 700,
              fontSize: 11,
              color: tokens.textMuted,
              textTransform: "uppercase",
              letterSpacing: 0.6,
            }}
          >
            <span>Message</span>
            {/* ✨ Compteur de caractères */}
            <span
              style={{
                fontWeight: 600,
                color: isOverLimit ? tokens.danger : tokens.textMuted,
                fontSize: 11,
                letterSpacing: 0,
                textTransform: "none",
              }}
            >
              {messageLength} / {MAX_MESSAGE_LENGTH}
            </span>
          </label>
          <textarea
            id="message-input"
            style={{
              width: "100%",
              padding: isMobile ? "14px 14px" : "12px 14px",
              borderRadius: 10,
              border: `1.5px solid ${
                isOverLimit ? tokens.danger : tokens.border
              }`,
              background: tokens.inputBg,
              color: tokens.text,
              fontSize: isMobile ? 15 : 14,
              outline: "none",
              boxSizing: "border-box",
              resize: "vertical",
              minHeight: isMobile ? 140 : 160,
              fontFamily: "inherit",
              lineHeight: 1.5,
              opacity: sending ? 0.6 : 1,
              WebkitAppearance: "none",
              touchAction: "manipulation",
            }}
            placeholder="Écrivez votre communiqué…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={sending}
            enterKeyHint="enter"
            autoComplete="off"
          />

          {/* Info destinataires */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              padding: "10px 12px",
              borderRadius: 10,
              background: isOverLimit ? tokens.primarySoft : tokens.primarySoft,
              color: tokens.primary,
              marginTop: 12,
              marginBottom: 20,
              fontSize: isMobile ? 12.5 : 13,
              lineHeight: 1.4,
            }}
          >
            {isOverLimit ? (
              <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 2 }} />
            ) : (
              <Send size={14} style={{ flexShrink: 0, marginTop: 2 }} />
            )}
            <span>
              {isOverLimit ? (
                <>
                  Message trop long : <strong>{MAX_MESSAGE_LENGTH} caractères max</strong>.
                </>
              ) : (
                <>
                  Ce message sera envoyé à <strong>{targetDescription}</strong>.
                </>
              )}
            </span>
          </div>

          {/* Bouton Envoyer */}
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            onTouchStart={() => setSendPressed(true)}
            onTouchEnd={() => setSendPressed(false)}
            onTouchCancel={() => setSendPressed(false)}
            style={{
              padding: isMobile ? "16px 20px" : "14px 20px",
              borderRadius: 12,
              background: canSend
                ? sendPressed
                  ? `linear-gradient(135deg, ${tokens.primaryHover}, ${tokens.primary})`
                  : `linear-gradient(135deg, ${tokens.primary}, ${tokens.primaryHover})`
                : tokens.primaryDisabled,
              color: "#FFFFFF",
              border: "none",
              fontWeight: 700,
              fontSize: isMobile ? 15 : 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              cursor: canSend ? "pointer" : "not-allowed",
              width: "100%",
              boxShadow: canSend && !sendPressed
                ? "0 6px 18px rgba(79,70,229,0.3)"
                : "none",
              transition:
                "background 0.12s ease, box-shadow 0.15s ease, transform 0.1s ease",
              transform: sendPressed && canSend ? "scale(0.98)" : "scale(1)",
              minHeight: 52,
              outline: "none",
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
            }}
          >
            {sending ? (
              <>
                <Loader size={18} className="mg-spin" />
                Envoi en cours…
              </>
            ) : (
              <>
                <Send size={18} />
                Envoyer la diffusion
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}