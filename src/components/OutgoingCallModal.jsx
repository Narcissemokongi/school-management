// src/components/OutgoingCallModal.jsx
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  PhoneOutgoing, PhoneOff, Mic, MicOff, User,
} from "lucide-react";
import toast from "react-hot-toast";

const RING_DURATION = 60; // secondes

// ════════════════════════════════════════════════════════════════════
// KEYFRAMES module-level (injectés UNE SEULE FOIS)
// ════════════════════════════════════════════════════════════════════
const OutgoingCallModalKeyframes = (
  <style>{`
    @keyframes ocm-fade-in {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    @keyframes ocm-slide-up {
      from { transform: translateY(24px); opacity: 0; }
      to   { transform: translateY(0); opacity: 1; }
    }
    @keyframes ocm-pulse-light {
      0%   { box-shadow: 0 0 0 0 rgba(79, 70, 229, 0.4); }
      70%  { box-shadow: 0 0 0 24px rgba(79, 70, 229, 0); }
      100% { box-shadow: 0 0 0 0 rgba(79, 70, 229, 0); }
    }
    @keyframes ocm-pulse-dark {
      0%   { box-shadow: 0 0 0 0 rgba(129, 140, 248, 0.5); }
      70%  { box-shadow: 0 0 0 24px rgba(129, 140, 248, 0); }
      100% { box-shadow: 0 0 0 0 rgba(129, 140, 248, 0); }
    }
    .ocm-fade-in   { animation: ocm-fade-in 0.22s ease; }
    .ocm-slide-up  { animation: ocm-slide-up 0.3s cubic-bezier(0.4,0,0.2,1); }
    .ocm-pulse-light { animation: ocm-pulse-light 1.8s ease infinite; }
    .ocm-pulse-dark  { animation: ocm-pulse-dark 1.8s ease infinite; }
    @media (prefers-reduced-motion: reduce) {
      .ocm-fade-in,
      .ocm-slide-up,
      .ocm-pulse-light,
      .ocm-pulse-dark {
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
    modalBg: dark ? "#1E293B" : "#FFFFFF",
    modalBorder: dark
      ? "rgba(255,255,255,0.08)"
      : "rgba(0,0,0,0.04)",
    modalShadow: dark
      ? "0 12px 40px rgba(0,0,0,0.5)"
      : "0 12px 40px rgba(0,0,0,0.15)",
    overlay: dark ? "rgba(15, 23, 42, 0.8)" : "rgba(15, 23, 42, 0.6)",
    text: dark ? "#F1F5F9" : "#1E293B",
    textMuted: dark ? "#94A3B8" : "#64748B",
    textDim: dark ? "#CBD5E1" : "#475569",
    track: dark ? "#334155" : "#E2E8F0",
    avatarBg: dark ? "#312E81" : "#EEF2FF",
    avatarFg: dark ? "#818CF8" : "#4F46E5",
    primary: dark ? "#818CF8" : "#4F46E5",
    primaryBorder: dark ? "#1E293B" : "#FFFFFF",
    danger: "#EF4444",
    dangerHover: "#DC2626",
    dangerShadow: "0 6px 18px rgba(239,68,68,0.4)",
    muteBgActive: dark ? "#334155" : "#E2E8F0",
    muteBgInactive: dark ? "#0F172A" : "#F1F5F9",
    muteBorder: dark ? "#334155" : "#E2E8F0",
    muteText: dark ? "#CBD5E1" : "#475569",
    muteTextActive: dark ? "#F1F5F9" : "#1E293B",
    muteTextDisabled: dark ? "#475569" : "#CBD5E1",
    kbdBg: dark ? "#0F172A" : "#F1F5F9",
    kbdBorder: dark ? "#334155" : "#E2E8F0",
    kbdText: dark ? "#CBD5E1" : "#475569",
    progress: {
      safe: "#10B981",
      warn: "#F59E0B",
      danger: "#EF4444",
    },
  };
}

// ════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════
// ✅ FIX : 2 lettres (cohérent avec IncomingCallModal)
function getInitials(name) {
  if (!name) return "?";
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (
    parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
  ).toUpperCase();
}

// ════════════════════════════════════════════════════════════════════
// FALLBACK AUDIO (dialtone Web Audio API si dialtone.mp3 absent)
// ════════════════════════════════════════════════════════════════════
// ✅ FIX : accepte un masterGain node pour permettre le mute global
function createRingtone(ctx, masterGain) {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.frequency.value = 425;
  oscillator.type = "sine";
  oscillator.connect(gain);
  // ✅ Connecte au masterGain (qui gère le mute) au lieu de ctx.destination
  gain.connect(masterGain);
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.02);
  gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.35);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + 0.42);
  return oscillator;
}

// ════════════════════════════════════════════════════════════════════
// SOUS-COMPOSANT — Bouton rond avec hover/focus states
// ════════════════════════════════════════════════════════════════════
function RoundActionButton({
  icon,
  label,
  onClick,
  variant = "danger", // "danger" | "ghost"
  disabled = false,
  size,
  tokens,
  isMobile,
}) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);

  const styleByVariant = useMemo(() => {
    if (variant === "danger") {
      return {
        background: hovered
          ? `linear-gradient(135deg, ${tokens.dangerHover}, #B91C1C)`
          : `linear-gradient(135deg, ${tokens.danger}, ${tokens.dangerHover})`,
        color: "#FFFFFF",
        border: "none",
        boxShadow: tokens.dangerShadow,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
      };
    }
    return {
      background: disabled
        ? "transparent"
        : hovered
        ? tokens.muteBgActive
        : tokens.muteBgInactive,
      color: disabled
        ? tokens.muteTextDisabled
        : hovered
        ? tokens.muteTextActive
        : tokens.muteText,
      border: `1px solid ${tokens.muteBorder}`,
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.6 : 1,
    };
  }, [
    variant,
    hovered,
    disabled,
    tokens.danger,
    tokens.dangerHover,
    tokens.dangerShadow,
    tokens.muteBgActive,
    tokens.muteBgInactive,
    tokens.muteBorder,
    tokens.muteText,
    tokens.muteTextActive,
    tokens.muteTextDisabled,
  ]);

  const sizePx = size ?? (isMobile ? 64 : 68);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
      }}
    >
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => {
          setHovered(false);
          setPressed(false);
        }}
        onMouseDown={() => setPressed(true)}
        onMouseUp={() => setPressed(false)}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          setPressed(false);
        }}
        aria-label={label}
        title={label}
        style={{
          width: sizePx,
          height: sizePx,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
          transition:
            "background 0.15s ease, transform 0.1s ease, color 0.15s ease",
          transform: pressed && !disabled ? "scale(0.94)" : "scale(1)",
          outline: focused ? `2px solid ${tokens.primary}` : "none",
          outlineOffset: 3,
          WebkitTapHighlightColor: "transparent",
          ...styleByVariant,
        }}
      >
        {icon}
      </button>
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: disabled ? tokens.muteTextDisabled : tokens.textMuted,
          userSelect: "none",
        }}
      >
        {label}
      </span>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ════════════════════════════════════════════════════════════════════
export function OutgoingCallModal({ callId, calleeId, onCancel }) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();

  const tokens = useMemo(() => buildTokens(dark), [dark]);

  const calleeArgs = useMemo(
    () => (calleeId ? { userId: calleeId } : "skip"),
    [calleeId]
  );
  const calleeUser = useQuery(api.users.get, calleeArgs);

  const [secondsLeft, setSecondsLeft] = useState(RING_DURATION);
  const [muted, setMuted] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);

  const audioRef = useRef(null);
  const webAudioCtxRef = useRef(null);
  const webAudioIntervalRef = useRef(null);
  // ✅ FIX : ref vers le GainNode maître (permet le mute global)
  const webAudioMasterGainRef = useRef(null);
  const timerRef = useRef(null);

  // ✅ Refs pour éviter les doubles appels en Strict Mode
  const hasEndedRef = useRef(false);
  // ✅ Ref pour lire `muted` sans re-déclencher le useEffect de démarrage
  const mutedRef = useRef(muted);
  const onCancelRef = useRef(onCancel);

  useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);

  // ✅ Sync mutedRef avec muted
  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  // ════════════════════════════════════════════════════════════════════
  // ARRÊT AUDIO
  // ════════════════════════════════════════════════════════════════════
  const stopAllAudio = useCallback(() => {
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      } catch {}
    }
    if (webAudioIntervalRef.current) {
      clearInterval(webAudioIntervalRef.current);
      webAudioIntervalRef.current = null;
    }
    if (webAudioCtxRef.current) {
      try {
        webAudioCtxRef.current.close();
      } catch {}
      webAudioCtxRef.current = null;
    }
    // ✅ Reset master gain
    webAudioMasterGainRef.current = null;
  }, []);

  const handleCancel = useCallback(() => {
    if (hasEndedRef.current) return;
    hasEndedRef.current = true;
    clearInterval(timerRef.current);
    stopAllAudio();
    onCancelRef.current?.();
  }, [stopAllAudio]);

  // ════════════════════════════════════════════════════════════════════
  // TIMER
  // ════════════════════════════════════════════════════════════════════
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, []);

  // ✅ Fin de timer HORS du updater
  useEffect(() => {
    if (secondsLeft === 0 && !hasEndedRef.current) {
      toast.error("L'appel a expiré sans réponse.");
      handleCancel();
    }
  }, [secondsLeft, handleCancel]);

  // ════════════════════════════════════════════════════════════════════
  // AUDIO — Démarrage (une seule fois au montage)
  // ════════════════════════════════════════════════════════════════════
  // ✅ FIX : `muted` n'est plus lu directement (via mutedRef)
  useEffect(() => {
    let cancelled = false;

    const startRingtone = async () => {
      const audio = audioRef.current;
      if (audio) {
        audio.loop = true;
        // ✅ Utilise mutedRef.current (valeur actuelle sans dépendance)
        audio.volume = mutedRef.current ? 0 : 1;
        try {
          await audio.play();
          return;
        } catch {
          // Fallback Web Audio API
          if (cancelled) return;
          try {
            const AudioCtx =
              window.AudioContext || window.webkitAudioContext;
            const ctx = new AudioCtx();
            webAudioCtxRef.current = ctx;

            if (ctx.state === "suspended") {
              try {
                await ctx.resume();
              } catch (resumeErr) {
                console.warn(
                  "[OutgoingCallModal] resume failed:",
                  resumeErr
                );
              }
            }

            // ✅ FIX : masterGain qui permet de muter tout le ringtone
            const masterGain = ctx.createGain();
            masterGain.gain.value = mutedRef.current ? 0 : 1;
            masterGain.connect(ctx.destination);
            webAudioMasterGainRef.current = masterGain;

            createRingtone(ctx, masterGain);

            webAudioIntervalRef.current = setInterval(() => {
              const c = webAudioCtxRef.current;
              const g = webAudioMasterGainRef.current;
              if (c && g && c.state === "running") {
                createRingtone(c, g);
              }
            }, 3000);
          } catch (fallbackErr) {
            console.error(
              "[OutgoingCallModal] audio fallback failed:",
              fallbackErr
            );
            if (!cancelled) setAudioBlocked(true);
          }
        }
      }
    };

    startRingtone();

    return () => {
      cancelled = true;
      stopAllAudio();
    };
  }, [stopAllAudio]);

  // ════════════════════════════════════════════════════════════════════
  // AUDIO — Volume (indépendant du démarrage)
  // ════════════════════════════════════════════════════════════════════
  // ✅ FIX : ajuste `<audio>` ET le masterGain Web Audio
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = muted ? 0 : 1;
    }
    const masterGain = webAudioMasterGainRef.current;
    if (masterGain) {
      try {
        masterGain.gain.value = muted ? 0 : 1;
      } catch (err) {
        console.warn("[OutgoingCallModal] masterGain update failed:", err);
      }
    }
  }, [muted]);

  // ════════════════════════════════════════════════════════════════════
  // ESC pour annuler
  // ════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        handleCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleCancel]);

  // ════════════════════════════════════════════════════════════════════
  // COMPUTED
  // ════════════════════════════════════════════════════════════════════
  const formatTime = (sec) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const progress = ((RING_DURATION - secondsLeft) / RING_DURATION) * 100;

  // ✅ FIX : utilise getInitials() (2 lettres) comme IncomingCallModal
  const initials = useMemo(() => {
    if (!calleeUser?.nom) return null;
    return getInitials(calleeUser.nom);
  }, [calleeUser?.nom]);

  const progressColor =
    progress < 70
      ? tokens.progress.safe
      : progress < 90
      ? tokens.progress.warn
      : tokens.progress.danger;

  // ✅ Pulse class selon le mode
  const pulseClass = dark ? "ocm-pulse-dark" : "ocm-pulse-light";

  // ════════════════════════════════════════════════════════════════════
  // RENDU
  // ════════════════════════════════════════════════════════════════════
  return (
    <>
      {OutgoingCallModalKeyframes}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="outgoing-call-title"
        className="ocm-fade-in"
        style={{
          position: "fixed",
          inset: 0,
          background: tokens.overlay,
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          paddingTop: "calc(16px + env(safe-area-inset-top, 0px))",
          paddingBottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
          paddingLeft: 16,
          paddingRight: 16,
        }}
      >
        <div
          className="ocm-slide-up"
          style={{
            background: tokens.modalBg,
            borderRadius: 28,
            padding: isMobile ? "28px 20px" : "36px 32px",
            textAlign: "center",
            boxShadow: tokens.modalShadow,
            maxWidth: 380,
            width: "100%",
            border: `1px solid ${tokens.modalBorder}`,
            position: "relative",
            boxSizing: "border-box",
          }}
        >
          {/* ═══ AVATAR AVEC PASTILLE ═══ */}
          <div
            style={{
              position: "relative",
              display: "inline-block",
              marginBottom: 20,
            }}
          >
            <div
              className={pulseClass}
              style={{
                width: isMobile ? 96 : 112,
                height: isMobile ? 96 : 112,
                borderRadius: "50%",
                background: tokens.avatarBg,
                color: tokens.avatarFg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: isMobile ? 36 : 44,
                fontWeight: 700,
                border: `3px solid ${tokens.primaryBorder}`,
                position: "relative",
                zIndex: 1,
                letterSpacing: "-0.02em",
              }}
              aria-hidden="true"
            >
              {initials || <User size={isMobile ? 40 : 48} />}
            </div>

            <div
              style={{
                position: "absolute",
                bottom: -4,
                right: -4,
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: tokens.primary,
                color: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: `3px solid ${tokens.primaryBorder}`,
                boxShadow: "0 2px 8px rgba(79,70,229,0.4)",
                zIndex: 2,
              }}
              aria-hidden="true"
            >
              <PhoneOutgoing size={14} />
            </div>
          </div>

          {/* ═══ NOM + STATUT ═══ */}
          <h2
            id="outgoing-call-title"
            style={{
              fontSize: isMobile ? 18 : 20,
              fontWeight: 700,
              color: tokens.text,
              margin: "0 0 4px",
              lineHeight: 1.2,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {calleeUser ? calleeUser.nom : "Appel en cours"}
          </h2>

          <p
            style={{
              fontSize: 13,
              color: tokens.textMuted,
              margin: "0 0 6px",
            }}
          >
            Appel en cours…
          </p>

          {/* ═══ TIMER ═══ */}
          <div
            role="timer"
            aria-live="polite"
            aria-atomic="true"
            style={{
              fontSize: 15,
              fontFamily: "ui-monospace, 'SF Mono', monospace",
              fontWeight: 700,
              color: tokens.textDim,
              letterSpacing: 1,
              marginBottom: 20,
            }}
          >
            {formatTime(secondsLeft)}
          </div>

          {/* ═══ BARRE DE PROGRESSION ═══ */}
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress)}
            aria-label="Progression de l'appel"
            style={{
              width: "100%",
              height: 4,
              background: tokens.track,
              borderRadius: 2,
              overflow: "hidden",
              marginBottom: 28,
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: "100%",
                background: progressColor,
                borderRadius: 2,
                transition:
                  "width 0.3s ease, background-color 0.3s ease",
              }}
            />
          </div>

          {/* ═══ BOUTONS ═══ */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: isMobile ? 28 : 36,
            }}
          >
            <RoundActionButton
              icon={<PhoneOff size={isMobile ? 26 : 28} />}
              label="Annuler"
              onClick={handleCancel}
              variant="danger"
              tokens={tokens}
              isMobile={isMobile}
            />

            <RoundActionButton
              icon={
                muted ? (
                  <MicOff size={isMobile ? 24 : 26} />
                ) : (
                  <Mic size={isMobile ? 24 : 26} />
                )
              }
              label={
                audioBlocked
                  ? "Indispo."
                  : muted
                  ? "Réactiver"
                  : "Silencieux"
              }
              onClick={() => setMuted((m) => !m)}
              variant="ghost"
              disabled={audioBlocked}
              tokens={tokens}
              isMobile={isMobile}
            />
          </div>

          {/* ═══ NOTE ÉCHAP (desktop uniquement) ═══ */}
          {!isMobile && (
            <p
              style={{
                fontSize: 10.5,
                color: tokens.textMuted,
                marginTop: 20,
                marginBottom: 0,
                lineHeight: 1.4,
                opacity: 0.8,
              }}
            >
              Appuyez sur{" "}
              <kbd
                style={{
                  background: tokens.kbdBg,
                  color: tokens.kbdText,
                  padding: "1px 6px",
                  borderRadius: 4,
                  fontSize: 10,
                  fontFamily: "ui-monospace, monospace",
                  border: `1px solid ${tokens.kbdBorder}`,
                }}
              >
                Échap
              </kbd>{" "}
              pour annuler
            </p>
          )}
        </div>

        {/* ═══ AUDIO ═══ */}
        <audio ref={audioRef} src="/dialtone.mp3" preload="auto" />
      </div>
    </>
  );
}