// src/components/OutgoingCallModal.jsx
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  PhoneOutgoing, PhoneOff, Mic, MicOff, User, Volume2, VolumeX,
  Video,
} from "lucide-react";
import toast from "react-hot-toast";

const RING_DURATION = 60; // secondes

// ════════════════════════════════════════════════════════════════════
// KEYFRAMES module-level
// ════════════════════════════════════════════════════════════════════
const OutgoingCallModalKeyframes = (
  <style>{`
    /* ─── Général ─── */
    @keyframes ocm-fade-in {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    @keyframes ocm-slide-up {
      from { transform: translateY(24px); opacity: 0; }
      to   { transform: translateY(0); opacity: 1; }
    }

    /* ─── Mobile : anneaux sortants (inverse de cascade) ─── */
    @keyframes ocm-ring-out {
      0%   { transform: scale(1);    opacity: 0.6; }
      100% { transform: scale(2.2);  opacity: 0; }
    }

    /* ─── Desktop : anneau rotatif ─── */
    @keyframes ocm-ring-rotate {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }

    /* ─── Pulse du bouton Annuler ─── */
    @keyframes ocm-pulse-reject {
      0%   { box-shadow: 0 0 0 0 rgba(239,68,68,0.6); }
      70%  { box-shadow: 0 0 0 18px rgba(239,68,68,0); }
      100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
    }

    /* ─── Points animés "Sonnerie…" ─── */
    @keyframes ocm-dot {
      0%, 80%, 100% { opacity: 0.3; transform: scale(0.85); }
      40%           { opacity: 1;   transform: scale(1); }
    }

    /* ─── Flottement avatar mobile ─── */
    @keyframes ocm-float {
      0%, 100% { transform: translateY(0); }
      50%      { transform: translateY(-6px); }
    }

    /* ─── Classes ─── */
    .ocm-fade-in  { animation: ocm-fade-in 0.3s ease; }
    .ocm-slide-up { animation: ocm-slide-up 0.35s cubic-bezier(0.4,0,0.2,1); }
    .ocm-ring     { animation: ocm-ring-out 2s ease-out infinite; }
    .ocm-ring-2   { animation-delay: 0.66s; }
    .ocm-ring-3   { animation-delay: 1.33s; }
    .ocm-ring-rot { animation: ocm-ring-rotate 4s linear infinite; }
    .ocm-pulse-rj { animation: ocm-pulse-reject 1.8s ease-in-out infinite; }
    .ocm-float    { animation: ocm-float 3s ease-in-out infinite; }
    .ocm-dot-1    { animation: ocm-dot 1.4s ease-in-out infinite; }
    .ocm-dot-2    { animation: ocm-dot 1.4s ease-in-out 0.2s infinite; }
    .ocm-dot-3    { animation: ocm-dot 1.4s ease-in-out 0.4s infinite; }

    @media (prefers-reduced-motion: reduce) {
      .ocm-fade-in, .ocm-slide-up, .ocm-ring, .ocm-ring-2, .ocm-ring-3,
      .ocm-ring-rot, .ocm-pulse-rj, .ocm-float,
      .ocm-dot-1, .ocm-dot-2, .ocm-dot-3 {
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
    // Desktop — glass
    modalBg: dark
      ? "rgba(30, 41, 59, 0.55)"
      : "rgba(255, 255, 255, 0.55)",
    modalBorder: dark
      ? "rgba(255, 255, 255, 0.12)"
      : "rgba(255, 255, 255, 0.7)",
    modalHighlight: dark
      ? "rgba(255, 255, 255, 0.08)"
      : "rgba(255, 255, 255, 0.9)",
    modalShadow: dark
      ? "0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05) inset"
      : "0 24px 80px rgba(79,70,229,0.25), 0 0 0 1px rgba(255,255,255,0.5) inset",
    overlay: dark ? "rgba(15, 23, 42, 0.6)" : "rgba(15, 23, 42, 0.4)",

    // Texte
    text: dark ? "#F1F5F9" : "#1E293B",
    textMuted: dark ? "#94A3B8" : "#64748B",
    textDim: dark ? "#CBD5E1" : "#475569",

    // Avatar
    avatarBg: dark ? "#312E81" : "#EEF2FF",
    avatarFg: dark ? "#A5B4FC" : "#4F46E5",
    primaryBorder: dark ? "#1E293B" : "#FFFFFF",

    // Boutons
    rejectGradient: "linear-gradient(135deg, #EF4444, #DC2626)",
    rejectShadow: "0 8px 24px rgba(239,68,68,0.4)",
    muteBg: dark ? "rgba(148, 163, 184, 0.15)" : "rgba(100, 116, 139, 0.08)",
    muteText: dark ? "#CBD5E1" : "#475569",

    // Divers
    track: dark ? "#334155" : "#E2E8F0",
    progress: { safe: "#10B981", warn: "#F59E0B", danger: "#EF4444" },
    kbdBg: dark ? "#0F172A" : "#F1F5F9",
    kbdBorder: dark ? "#334155" : "#E2E8F0",
    kbdText: dark ? "#CBD5E1" : "#475569",
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

function createRingtone(ctx, masterGain) {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.frequency.value = 425;
  oscillator.type = "sine";
  oscillator.connect(gain);
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
// COMPOSANT PRINCIPAL
// ════════════════════════════════════════════════════════════════════
export function OutgoingCallModal({
  callId,
  calleeId,
  callType = "video",
  onCancel,
}) {
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
  const webAudioMasterGainRef = useRef(null);
  const timerRef = useRef(null);

  const hasEndedRef = useRef(false);
  const mutedRef = useRef(muted);
  const onCancelRef = useRef(onCancel);

  // ✅ FIX StrictMode — reset au mount
  useEffect(() => {
    hasEndedRef.current = false;
    return () => {
      hasEndedRef.current = true;
    };
  }, []);

  useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  // ✨ Vibration mobile (appel sortant — plus discret)
  useEffect(() => {
    if (!isMobile) return;
    if (typeof navigator === "undefined" || !navigator.vibrate) return;
    const interval = setInterval(() => {
      try {
        navigator.vibrate(50);
      } catch {}
    }, 3000);
    return () => {
      clearInterval(interval);
      try {
        navigator.vibrate(0);
      } catch {}
    };
  }, [isMobile]);

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
    webAudioMasterGainRef.current = null;
  }, []);

  const handleCancel = useCallback(async () => {
    if (hasEndedRef.current) return;
    hasEndedRef.current = true;
    clearInterval(timerRef.current);
    stopAllAudio();
    try {
      await onCancelRef.current?.();
    } catch (err) {
      console.warn("[OutgoingCallModal] cancel failed:", err);
    }
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

  useEffect(() => {
    if (secondsLeft === 0 && !hasEndedRef.current) {
      toast.error("L'appel a expiré sans réponse.");
      handleCancel();
    }
  }, [secondsLeft, handleCancel]);

  // ════════════════════════════════════════════════════════════════════
  // AUDIO — Démarrage
  // ════════════════════════════════════════════════════════════════════
  useEffect(() => {
    let cancelled = false;

    const startRingtone = async () => {
      const audio = audioRef.current;
      if (audio) {
        audio.loop = true;
        audio.volume = mutedRef.current ? 0 : 1;
        try {
          await audio.play();
          return;
        } catch {
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
  // AUDIO — Volume
  // ════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.volume = muted ? 0 : 1;
    const masterGain = webAudioMasterGainRef.current;
    if (masterGain) {
      try {
        masterGain.gain.value = muted ? 0 : 1;
      } catch (err) {
        console.warn(
          "[OutgoingCallModal] masterGain update failed:",
          err
        );
      }
    }
  }, [muted]);

  // ════════════════════════════════════════════════════════════════════
  // RACCOURCIS CLAVIER
  // ════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") handleCancel();
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

  const isAudio = callType === "audio";
  const callLabel = isAudio ? "Appel audio" : "Appel vidéo";

  // ✨ Dégradé mobile (bleu apaisant pour un appel sortant)
  const mobileGradient = isAudio
    ? "linear-gradient(180deg, #0F172A 0%, #1E3A8A 55%, #4F46E5 100%)"
    : "linear-gradient(180deg, #0F172A 0%, #155E75 55%, #0E7490 100%)";

  const avatarSize = isMobile ? 128 : 112;

  // ════════════════════════════════════════════════════════════════════
  // RENDU — MOBILE (full-screen iOS style)
  // ════════════════════════════════════════════════════════════════════
  if (isMobile) {
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
            background: mobileGradient,
            color: "white",
            display: "flex",
            flexDirection: "column",
            zIndex: 9999,
            overflow: "hidden",
          }}
        >
          {/* ─── Mute (top-right) ─── */}
          <div
            style={{
              position: "absolute",
              top: "calc(16px + env(safe-area-inset-top, 0px))",
              right: 16,
              zIndex: 10,
            }}
          >
            <button
              type="button"
              onClick={() => setMuted((m) => !m)}
              disabled={audioBlocked}
              aria-label={
                muted ? "Activer la sonnerie" : "Couper la sonnerie"
              }
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.12)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: audioBlocked ? "not-allowed" : "pointer",
                opacity: audioBlocked ? 0.5 : 1,
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation",
              }}
            >
              {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
          </div>

          {/* ─── Type d'appel (top-center) ─── */}
          <div
            style={{
              paddingTop: "calc(24px + env(safe-area-inset-top, 0px))",
              textAlign: "center",
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.7)",
            }}
          >
            {isAudio ? "Appel audio sortant" : "Appel vidéo sortant"}
          </div>

          {/* ─── Zone centrale : Avatar + nom ─── */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 24px",
              gap: 24,
            }}
          >
            {/* Avatar + anneaux */}
            <div
              style={{
                position: "relative",
                width: avatarSize,
                height: avatarSize,
              }}
            >
              {/* Anneaux sortants */}
              <div
                className="ocm-ring"
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  border: "2px solid rgba(255,255,255,0.5)",
                }}
                aria-hidden="true"
              />
              <div
                className="ocm-ring ocm-ring-2"
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  border: "2px solid rgba(255,255,255,0.5)",
                }}
                aria-hidden="true"
              />
              <div
                className="ocm-ring ocm-ring-3"
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  border: "2px solid rgba(255,255,255,0.5)",
                }}
                aria-hidden="true"
              />

              {/* Avatar lui-même */}
              <div
                className="ocm-float"
                style={{
                  position: "relative",
                  width: avatarSize,
                  height: avatarSize,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.18)",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  border: "3px solid rgba(255,255,255,0.5)",
                  boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 46,
                  fontWeight: 700,
                  color: "white",
                  letterSpacing: "-0.02em",
                  zIndex: 2,
                }}
                aria-hidden="true"
              >
                {initials || <User size={52} color="white" />}
              </div>
            </div>

            {/* Nom */}
            <h2
              id="outgoing-call-title"
              style={{
                margin: 0,
                fontSize: 32,
                fontWeight: 700,
                textAlign: "center",
                letterSpacing: "-0.02em",
                color: "white",
                textShadow: "0 2px 12px rgba(0,0,0,0.3)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: "100%",
              }}
            >
              {calleeUser ? calleeUser.nom : "Appel en cours"}
            </h2>

            {/* Statut avec points */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontSize: 15,
                fontWeight: 500,
                color: "rgba(255,255,255,0.8)",
              }}
            >
              <span>Appel en cours</span>
              <span className="ocm-dot-1">.</span>
              <span className="ocm-dot-2">.</span>
              <span className="ocm-dot-3">.</span>
            </div>

            {/* Timer discret */}
            <div
              role="timer"
              aria-live="polite"
              style={{
                fontSize: 13,
                fontFamily: "ui-monospace, 'SF Mono', monospace",
                fontWeight: 600,
                color: "rgba(255,255,255,0.5)",
                letterSpacing: 1,
              }}
            >
              {formatTime(secondsLeft)}
            </div>
          </div>

          {/* ─── Bouton Annuler (bottom center) ─── */}
          <div
            style={{
              paddingBottom: "calc(40px + env(safe-area-inset-bottom, 0px))",
              paddingTop: 24,
              display: "flex",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 10,
              }}
            >
              <button
                type="button"
                onClick={handleCancel}
                aria-label="Annuler l'appel"
                className="ocm-pulse-rj"
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  background: tokens.rejectGradient,
                  border: "none",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: tokens.rejectShadow,
                  cursor: "pointer",
                  WebkitTapHighlightColor: "transparent",
                  touchAction: "manipulation",
                  transition: "transform 0.15s ease",
                }}
                onTouchStart={(e) =>
                  (e.currentTarget.style.transform = "scale(0.94)")
                }
                onTouchEnd={(e) =>
                  (e.currentTarget.style.transform = "scale(1)")
                }
              >
                <PhoneOff size={34} />
              </button>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.85)",
                }}
              >
                Annuler
              </span>
            </div>
          </div>

          {/* Audio */}
          <audio ref={audioRef} src="/dialtone.mp3" preload="auto" />
        </div>
      </>
    );
  }

  // ════════════════════════════════════════════════════════════════════
  // RENDU — DESKTOP (glassmorphism premium)
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
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: 24,
        }}
      >
        {/* Halo lumineux coloré */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: isAudio
              ? "radial-gradient(circle, rgba(79,70,229,0.35) 0%, transparent 70%)"
              : "radial-gradient(circle, rgba(14,116,144,0.35) 0%, transparent 70%)",
            filter: "blur(60px)",
            pointerEvents: "none",
          }}
        />

        {/* Modal glass */}
        <div
          className="ocm-slide-up"
          style={{
            position: "relative",
            background: tokens.modalBg,
            backdropFilter: "blur(40px) saturate(180%)",
            WebkitBackdropFilter: "blur(40px) saturate(180%)",
            border: `1px solid ${tokens.modalBorder}`,
            borderTop: `1px solid ${tokens.modalHighlight}`,
            borderRadius: 32,
            padding: "40px 36px 32px",
            textAlign: "center",
            boxShadow: tokens.modalShadow,
            maxWidth: 400,
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          {/* ─── Avatar + anneau rotatif ─── */}
          <div
            style={{
              position: "relative",
              display: "inline-block",
              marginBottom: 24,
            }}
          >
            {/* Anneau rotatif */}
            <div
              className="ocm-ring-rot"
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: -6,
                borderRadius: "50%",
                background: isAudio
                  ? "conic-gradient(from 0deg, transparent, #818CF8, transparent, #6366F1, transparent)"
                  : "conic-gradient(from 0deg, transparent, #22D3EE, transparent, #0E7490, transparent)",
                maskImage:
                  "radial-gradient(circle, transparent 68%, black 70%)",
                WebkitMaskImage:
                  "radial-gradient(circle, transparent 68%, black 70%)",
              }}
            />

            {/* Avatar */}
            <div
              style={{
                position: "relative",
                width: avatarSize,
                height: avatarSize,
                borderRadius: "50%",
                background: tokens.avatarBg,
                color: tokens.avatarFg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 42,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                border: `3px solid ${tokens.primaryBorder}`,
                boxShadow: "0 12px 32px rgba(0,0,0,0.2)",
                zIndex: 2,
              }}
              aria-hidden="true"
            >
              {initials || <User size={48} />}
            </div>

            {/* Pastille icône (PhoneOutgoing) */}
            <div
              style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: isAudio ? "#4F46E5" : "#0E7490",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: `3px solid ${tokens.primaryBorder}`,
                boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
                zIndex: 3,
              }}
              aria-hidden="true"
            >
              <PhoneOutgoing size={16} />
            </div>
          </div>

          {/* ─── Nom + statut ─── */}
          <h2
            id="outgoing-call-title"
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: tokens.text,
              margin: "0 0 6px",
              letterSpacing: "-0.02em",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {calleeUser ? calleeUser.nom : "Appel en cours"}
          </h2>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13.5,
              color: tokens.textMuted,
              marginBottom: 6,
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#10B981",
                boxShadow: "0 0 8px #10B981",
                animation: "ocm-dot-1 1.4s ease-in-out infinite",
              }}
              aria-hidden="true"
            />
            <span>{callLabel} · Sonnerie…</span>
          </div>

          {/* ─── Timer ─── */}
          <div
            role="timer"
            aria-live="polite"
            aria-atomic="true"
            style={{
              fontSize: 14,
              fontFamily: "ui-monospace, 'SF Mono', monospace",
              fontWeight: 700,
              color: tokens.textDim,
              letterSpacing: 1.5,
              marginBottom: 24,
            }}
          >
            {formatTime(secondsLeft)}
          </div>

          {/* ─── Barre de progression ─── */}
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress)}
            aria-label="Progression de l'appel"
            style={{
              width: "100%",
              height: 3,
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
                transition: "width 0.3s ease, background-color 0.3s ease",
              }}
            />
          </div>

          {/* ─── Boutons : Annuler (plein) + Mute (carré) ─── */}
          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "stretch",
            }}
          >
            {/* Bouton Annuler — pill principal */}
            <button
              type="button"
              onClick={handleCancel}
              aria-label="Annuler l'appel"
              className="ocm-pulse-rj"
              style={{
                flex: 1,
                height: 64,
                borderRadius: 32,
                background: tokens.rejectGradient,
                border: "none",
                color: "white",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                fontSize: 15,
                fontWeight: 700,
                fontFamily: "inherit",
                boxShadow: tokens.rejectShadow,
                transition: "filter 0.15s ease",
                WebkitTapHighlightColor: "transparent",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.filter = "brightness(1.1)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.filter = "brightness(1)")
              }
            >
              <PhoneOff size={20} />
              Annuler
            </button>

            {/* Bouton Mute — carré arrondi */}
            <button
              type="button"
              onClick={() => setMuted((m) => !m)}
              disabled={audioBlocked}
              aria-label={
                muted ? "Activer la sonnerie" : "Couper la sonnerie"
              }
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                background: audioBlocked
                  ? "transparent"
                  : muted
                  ? "#EF4444"
                  : tokens.muteBg,
                border: `1px solid ${tokens.modalBorder}`,
                color: audioBlocked
                  ? tokens.textDim
                  : muted
                  ? "white"
                  : tokens.muteText,
                cursor: audioBlocked ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: audioBlocked ? 0.5 : 1,
                transition: "background 0.15s ease, color 0.15s ease",
                WebkitTapHighlightColor: "transparent",
                flexShrink: 0,
              }}
            >
              {muted ? <VolumeX size={22} /> : <Volume2 size={22} />}
            </button>
          </div>

          {/* ─── Message mute ─── */}
          {audioBlocked && (
            <p
              style={{
                fontSize: 11,
                color: tokens.textMuted,
                marginTop: 12,
                marginBottom: 0,
                opacity: 0.8,
              }}
            >
              Sonnerie indisponible
            </p>
          )}

          {/* ─── Raccourcis clavier ─── */}
          <p
            style={{
              fontSize: 10.5,
              color: tokens.textMuted,
              marginTop: audioBlocked ? 8 : 16,
              marginBottom: 0,
              lineHeight: 1.5,
              opacity: 0.7,
            }}
          >
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
        </div>

        {/* Audio */}
        <audio ref={audioRef} src="/dialtone.mp3" preload="auto" />
      </div>
    </>
  );
}

export default OutgoingCallModal;