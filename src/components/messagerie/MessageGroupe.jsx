// src/components/messagerie/MessageGroupe.jsx
import { useState, useMemo, useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  Send,
  ArrowLeft,
  Users,
  GraduationCap,
  BookOpen,
  Loader,
  Megaphone,
} from "lucide-react";
import toast from "react-hot-toast";

// ════════════════════════════════════════════════════════════════════
// CONSTANTES MODULE-LEVEL
// ════════════════════════════════════════════════════════════════════
const ROLES_AUTORISES_DIFFUSION = ["admin", "directeur", "disciplinaire"];

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
    inputBg: dark ? "#0F172A" : "#F8FAFC",
    buttonSecondaryBg: dark ? "#334155" : "#F1F5F9",
    buttonSecondaryText: dark ? "#F1F5F9" : "#1E293B",
    buttonSecondaryHover: dark ? "#475569" : "#E2E8F0",
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

  const bg = isActive
    ? tokens.primary
    : hovered && !disabled
    ? tokens.buttonSecondaryHover
    : tokens.buttonSecondaryBg;

  const color = isActive ? "#FFFFFF" : tokens.buttonSecondaryText;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
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
        transition: "background 0.15s ease, border-color 0.15s ease",
        outline: focused ? `2px solid ${tokens.primary}` : "none",
        outlineOffset: 2,
        minHeight: isMobile ? 48 : 44,
        boxSizing: "border-box",
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

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        background: hovered ? tokens.ghostHover : "transparent",
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
        transition: "background 0.15s ease",
        outline: focused ? `2px solid ${tokens.primary}` : "none",
        outlineOffset: 2,
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

  const tokens = useMemo(() => buildTokens(dark), [dark]);

  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [target, setTarget] = useState("parents");
  const [selectedClasse, setSelectedClasse] = useState("");

  // ════════════════════════════════════════════════════════════════════
  // QUERIES / MUTATIONS
  // ════════════════════════════════════════════════════════════════════
  const sendToAllParents = useMutation(api.messages.sendToAllParents);
  const sendToAllEleves = useMutation(api.messages.sendToAllEleves);
  const sendToClasse = useMutation(api.messages.sendToClasse);

  const classesArgs = useMemo(
    () => (ecoleId ? { ecoleId } : "skip"),
    [ecoleId]
  );
  const classesRaw = useQuery(api.classes.list, classesArgs);
  const classes = useMemo(() => classesRaw ?? [], [classesRaw]);

  // ════════════════════════════════════════════════════════════════════
  // VALIDATION
  // ════════════════════════════════════════════════════════════════════
  const canSend = useMemo(() => {
    if (sending) return false;
    if (!message.trim()) return false;
    if (target === "classe" && !selectedClasse) return false;
    return true;
  }, [sending, message, target, selectedClasse]);

  const hasRole = useMemo(
    () => ROLES_AUTORISES_DIFFUSION.includes(user?.role),
    [user?.role]
  );

  // ════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ════════════════════════════════════════════════════════════════════
  const handleSend = useCallback(async () => {
    if (!message.trim()) {
      toast.error("Veuillez écrire un message.");
      return;
    }
    if (target === "classe" && !selectedClasse) {
      toast.error("Veuillez choisir une classe.");
      return;
    }

    setSending(true);
    try {
      let count = 0;
      switch (target) {
        case "parents":
          count = await sendToAllParents({
            ecoleId,
            expediteurId: user._id,
            contenu: message.trim(),
          });
          break;
        case "eleves":
          count = await sendToAllEleves({
            ecoleId,
            expediteurId: user._id,
            contenu: message.trim(),
          });
          break;
        case "classe":
          count = await sendToClasse({
            ecoleId,
            expediteurId: user._id,
            classe: selectedClasse,
            contenu: message.trim(),
          });
          break;
      }
      toast.success(`Message envoyé à ${count} personne(s).`);
      onBack();
    } catch (err) {
      toast.error("Erreur : " + (err?.message ?? "inconnue"));
    } finally {
      setSending(false);
    }
  }, [
    message,
    target,
    selectedClasse,
    ecoleId,
    user,
    sendToAllParents,
    sendToAllEleves,
    sendToClasse,
    onBack,
  ]);

  if (!hasRole) return null;

  // ════════════════════════════════════════════════════════════════════
  // COMPUTED
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
  // RENDU
  // ════════════════════════════════════════════════════════════════════
  return (
    <div
      style={{
        minHeight: "100%",
        background: tokens.bg,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {MessageGroupeKeyframes}

      <div
        className="mg-fade-in"
        style={{
          maxWidth: 720,
          margin: "0 auto",
          padding: isMobile
            ? "calc(12px + env(safe-area-inset-top, 0px)) 12px 16px"
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
              display: "block",
              marginBottom: 8,
              fontWeight: 700,
              fontSize: 11,
              color: tokens.textMuted,
              textTransform: "uppercase",
              letterSpacing: 0.6,
            }}
          >
            Message
          </label>
          <textarea
            id="message-input"
            style={{
              width: "100%",
              padding: isMobile ? "14px 14px" : "12px 14px",
              borderRadius: 10,
              border: `1.5px solid ${tokens.border}`,
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
            }}
            placeholder="Écrivez votre communiqué…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={sending}
          />

          {/* Info destinataires */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              padding: "10px 12px",
              borderRadius: 10,
              background: tokens.primarySoft,
              color: tokens.primary,
              marginTop: 12,
              marginBottom: 20,
              fontSize: isMobile ? 12.5 : 13,
              lineHeight: 1.4,
            }}
          >
            <Send size={14} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>
              Ce message sera envoyé à{" "}
              <strong>{targetDescription}</strong>.
            </span>
          </div>

          {/* Bouton Envoyer — ✅ gradient Hero */}
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            style={{
              padding: isMobile ? "16px 20px" : "14px 20px",
              borderRadius: 12,
              background: canSend
                ? `linear-gradient(135deg, ${tokens.primary}, ${tokens.primaryHover})`
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
              boxShadow: canSend
                ? "0 6px 18px rgba(79,70,229,0.3)"
                : "none",
              transition: "background 0.15s ease, box-shadow 0.15s ease",
              minHeight: 52,
              outline: "none",
            }}
            onFocus={(e) => {
              e.currentTarget.style.outline = `2px solid ${tokens.primary}`;
              e.currentTarget.style.outlineOffset = "2px";
            }}
            onBlur={(e) => {
              e.currentTarget.style.outline = "none";
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