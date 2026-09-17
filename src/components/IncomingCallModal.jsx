// src/components/IncomingCallModal.jsx
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  PhoneIncoming, PhoneOff, Phone, User, Volume2, VolumeX,
} from "lucide-react";
import toast from "react-hot-toast";

const RING_DURATION = 60; // secondes

// ════════════════════════════════════════════════════════════════════
// KEYFRAMES module-level
// ════════════════════════════════════════════════════════════════════
const IncomingCallModalKeyframes = (
  <style>{`
    @keyframes icm-fade-in {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    @keyframes icm-slide-up {
      from { transform: translateY(24px); opacity: 0; }
      to   { transform: translateY(0); opacity: 1; }
    }
    @keyframes icm-halo {
      0%, 100% { transform: scale(1);    opacity: 0.4; }
      50%      { transform: scale(1.15); opacity: 0.1; }
    }
    @keyframes icm-shake {
      0%, 100% { transform: rotate(0deg); }
      25%      { transform: rotate(-12deg); }
      75%      { transform: rotate(12deg); }
    }
    @keyframes icm-pulse-green {
      0% {
        box-shadow: 0 6px 18px rgba(16,185,129,0.4),
                    0 0 0 0 rgba(16,185,129,0.5);
      }
      70% {
        box-shadow: 0 6px 18px rgba(16,185,129,0.4),
                    0 0 0 16px rgba(16,185,129,0);
      }
      100% {
        box-shadow: 0 6px 18px rgba(16,185,129,0.4),
                    0 0 0 0 rgba(16,185,129,0);
      }
    }
    .icm-fade-in    { animation: icm-fade-in 0.22s ease; }
    .icm-slide-up   { animation: icm-slide-up 0.3s cubic-bezier(0.4,0,0.2,1); }
    .icm-halo       { animation: icm-halo 1.8s ease-in-out infinite; }
    .icm-shake      { animation: icm-shake 1.2s ease-in-out infinite; }
    .icm-pulse-green { animation: icm-pulse-green 1.5s ease-in-out infinite; }

    @media (prefers-reduced-motion: reduce) {
      .icm-fade-in,
      .icm-slide-up,
      .icm-halo,
      .icm-shake,
      .icm-pulse-green {
        animation: none !important;
      }
    }
  `}</style>
);

// ════════════════════════════════════════════════════════════════════
// TOKENS (mêmes que OutgoingCallModal pour cohérence)
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
    overlay: dark ? "rgba(15, 23, 42, 0.8)" : "rgba(15, 23, 42, 0.7)",
    text: dark ? "#F1F5F9" : "#1E293B",
    textMuted: dark ? "#94A3B8" : "#64748B",
    textDim: dark ? "#CBD5E1" : "#475569",
    track: dark ? "#334155" : "#E2E8F0",
    avatarBg: dark ? "#312E81" : "#EEF2FF",
    avatarFg: dark ? "#818CF8" : "#4F46E5",
    primary: dark ? "#818CF8" : "#4F46E5",
    primaryBorder: dark ? "#1E293B" : "#FFFFFF",
    rejectGradient: "linear-gradient(135deg, #EF4444, #DC2626)",
    rejectShadow: "0 6px 18px rgba(239,68,68,0.4)",
    acceptGradient: "linear-gradient(135deg, #10B981, #059669)",
    acceptShadow: "0 6px 18px rgba(16,185,129,0.4)",
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
function getInitials(name) {
  if (!name) return "?";
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (
    parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
  ).toUpperCase();
}

/**
 * ✅ FIX : accepte un `masterGain` node pour permettre le mute global.
 * Le gain individuel du ringtone reste à 0.15, mais le masterGain
 * multiplie tout (0 = muted, 1 = normal).
 */
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
// SOUS-COMPOSANT — Bouton rond avec hover/press/focus state
// ════════════════════════════════════════════════════════════════════
function RoundActionButton({
  icon,
  label,
  onClick,
  variant = "reject", // "reject" | "accept"
  size,
  pulse = false,
  tokens,
}) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);

  const styleByVariant = useMemo(() => {
    if (variant === "reject") {
      return {
        background: hovered
          ? "linear-gradient(135deg, #DC2626, #B91C1C)"
          : tokens.rejectGradient,
        color: "#FFFFFF",
        boxShadow: tokens.rejectShadow,
      };
    }
    return {
      background: hovered
        ? "linear-gradient(135deg, #059669, #047857)"
        : tokens.acceptGradient,
      color: "#FFFFFF",
      boxShadow: tokens.acceptShadow,
    };
  }, [variant, hovered, tokens]);

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
        className={pulse && !focused ? "icm-pulse-green" : undefined}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
          transition:
            "background 0.15s ease, transform 0.1s ease",
          transform: pressed ? "scale(0.94)" : "scale(1)",
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
          color: tokens.textMuted,
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
export function IncomingCallModal({ callerId, onAccept, onReject }) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();

  const tokens = useMemo(() => buildTokens(dark), [dark]);

  // ✅ Args stables
  const callerArgs = useMemo(
    () => (callerId ? { userId: callerId } : "skip"),
    [callerId]
  );
  const callerUser = useQuery(api.users.get, callerArgs);

  const [secondsLeft, setSecondsLeft] = useState(RING_DURATION);
  const [muted, setMuted] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);

  const audioRef = useRef(null);
  const webAudioCtxRef = useRef(null);
  const webAudioIntervalRef = useRef(null);
  // ✅ FIX : ref vers le GainNode maître (permet le mute global)
  const webAudioMasterGainRef = useRef(null);
  const timerRef = useRef(null);

  const hasEndedRef = useRef(false);
  // ✅ Ref pour lire `muted` sans re-déclencher le useEffect de démarrage
  const mutedRef = useRef(muted);
  const onRejectRef = useRef(onReject);
  const onAcceptRef = useRef(onAccept);

  useEffect(() => {
    onRejectRef.current = onReject;
    onAcceptRef.current = onAccept;
  }, [onReject, onAccept]);

  // ✅ Sync mutedRef avec muted (pour lecture dans le useEffect audio)
  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  // ════════════════════════════════════════════════════════════════════
  // STOP AUDIO
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

  const handleAccept = useCallback(() => {
    if (hasEndedRef.current) return;
    hasEndedRef.current = true;
    clearInterval(timerRef.current);
    stopAllAudio();
    onAcceptRef.current?.();
  }, [stopAllAudio]);

  const handleReject = useCallback(() => {
    if (hasEndedRef.current) return;
    hasEndedRef.current = true;
    clearInterval(timerRef.current);
    stopAllAudio();
    onRejectRef.current?.();
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

  // ✅ Expiration HORS du updater
  useEffect(() => {
    if (secondsLeft === 0 && !hasEndedRef.current) {
      toast.error("Appel manqué (expiré).");
      handleReject();
    }
  }, [secondsLeft, handleReject]);

  // ════════════════════════════════════════════════════════════════════
  // AUDIO — Démarrage (une seule fois au montage)
  // ════════════════════════════════════════════════════════════════════
  // ✅ FIX : `muted` retiré des deps → ne redémarre plus à chaque toggle
  //          Le volume est ajusté séparément (useEffect ci-dessous).
  useEffect(() => {
    let cancelled = false;

    const startRingtone = async () => {
      const audio = audioRef.current;
      if (!audio) return;

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
          const AudioCtx = window.AudioContext || window.webkitAudioContext;
          const ctx = new AudioCtx();
          webAudioCtxRef.current = ctx;

          if (ctx.state === "suspended") {
            try {
              await ctx.resume();
            } catch (resumeErr) {
              console.warn("[IncomingCallModal] resume failed:", resumeErr);
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
            "[IncomingCallModal] audio fallback failed:",
            fallbackErr
          );
          if (!cancelled) setAudioBlocked(true);
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
        console.warn("[IncomingCallModal] masterGain update failed:", err);
      }
    }
  }, [muted]);

  // ════════════════════════════════════════════════════════════════════
  // RACCOURCIS CLAVIER
  // ════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        handleReject();
      }
      if (e.key === "Enter") {
        handleAccept();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleReject, handleAccept]);

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

  const initials = useMemo(() => {
    if (!callerUser?.nom) return null;
    return getInitials(callerUser.nom);
  }, [callerUser?.nom]);

  const progressColor =
    progress < 70
      ? tokens.progress.safe
      : progress < 90
      ? tokens.progress.warn
      : tokens.progress.danger;

  const buttonSize = isMobile ? 64 : 68;

  // ════════════════════════════════════════════════════════════════════
  // RENDU
  // ════════════════════════════════════════════════════════════════════
  return (
    <>
      {IncomingCallModalKeyframes}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="incoming-call-title"
        className="icm-fade-in"
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
          className="icm-slide-up"
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
          {/* ═══ AVATAR AVEC HALO + PASTILLE ═══ */}
          <div
            style={{
              position: "relative",
              display: "inline-block",
              marginBottom: 20,
            }}
          >
            <div
              className="icm-halo"
              style={{
                position: "absolute",
                inset: -8,
                borderRadius: "50%",
                background: tokens.avatarBg,
                opacity: 0.4,
                zIndex: 0,
              }}
              aria-hidden="true"
            />

            <div
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
              className="icm-shake"
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
              <PhoneIncoming size={14} />
            </div>
          </div>

          {/* ═══ NOM + STATUT ═══ */}
          <h2
            id="incoming-call-title"
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
            {callerUser ? callerUser.nom : "Appel entrant"}
          </h2>

          <p
            style={{
              fontSize: 13,
              color: tokens.textMuted,
              margin: "0 0 6px",
            }}
          >
            {callerUser ? "Vous appelle…" : "Quelqu'un vous appelle"}
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
              label="Refuser"
              onClick={handleReject}
              variant="reject"
              size={buttonSize}
              tokens={tokens}
            />
            <RoundActionButton
              icon={<Phone size={isMobile ? 26 : 28} />}
              label="Accepter"
              onClick={handleAccept}
              variant="accept"
              size={buttonSize}
              pulse
              tokens={tokens}
            />
          </div>

          {/* ═══ MUTE ═══ */}
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            disabled={audioBlocked}
            aria-label={
              muted ? "Activer la sonnerie" : "Couper la sonnerie"
            }
            style={{
              marginTop: 20,
              padding: "6px 12px",
              background: "transparent",
              border: "none",
              color: audioBlocked
                ? tokens.textDim
                : tokens.textMuted,
              cursor: audioBlocked ? "not-allowed" : "pointer",
              fontSize: 11.5,
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              opacity: audioBlocked ? 0.6 : 1,
            }}
          >
            {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            {audioBlocked
              ? "Sonnerie indisponible"
              : muted
              ? "Réactiver la sonnerie"
              : "Couper la sonnerie"}
          </button>

          {/* ═══ RACCOURCIS CLAVIER (desktop uniquement) ═══ */}
          {!isMobile && (
            <p
              style={{
                fontSize: 10,
                color: tokens.textMuted,
                marginTop: 12,
                marginBottom: 0,
                lineHeight: 1.5,
                opacity: 0.8,
              }}
            >
              <kbd
                style={{
                  background: tokens.kbdBg,
                  color: tokens.kbdText,
                  padding: "1px 5px",
                  borderRadius: 3,
                  fontSize: 9,
                  fontFamily: "ui-monospace, monospace",
                  border: `1px solid ${tokens.kbdBorder}`,
                }}
              >
                Entrée
              </kbd>{" "}
              accepter ·{" "}
              <kbd
                style={{
                  background: tokens.kbdBg,
                  color: tokens.kbdText,
                  padding: "1px 5px",
                  borderRadius: 3,
                  fontSize: 9,
                  fontFamily: "ui-monospace, monospace",
                  border: `1px solid ${tokens.kbdBorder}`,
                }}
              >
                Échap
              </kbd>{" "}
              refuser
            </p>
          )}
        </div>

        {/* Audio */}
        <audio ref={audioRef} src="/ringtone.mp3" preload="auto" />
      </div>
    </>
  );
}