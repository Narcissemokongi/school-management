import { useState, useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useStyles } from "../styles/theme";
import { useIsMobile } from "../hooks/useIsMobile";
import { PhoneIncoming, CheckCircle, XCircle, Clock, Volume2, VolumeX } from "lucide-react";
import toast from "react-hot-toast";

const RING_DURATION = 60;

export function IncomingCallModal({ callerId, onAccept, onReject }) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();
  const callerUser = useQuery(api.users.get, callerId ? { userId: callerId } : "skip");
  const [secondsLeft, setSecondsLeft] = useState(RING_DURATION);
  const [muted, setMuted] = useState(false);
  const audioRef = useRef(null);
  const timerRef = useRef(null);

  // Minuteur
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          toast.error("Appel expiré");
          onReject();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [onReject]);

  // Gestion audio
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.loop = true;
    audio.volume = muted ? 0 : 1;
    audio.play().catch(() => {});
    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, [muted]);

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const progress = (secondsLeft / RING_DURATION) * 100;

  // Styles adaptatifs
  const cardPadding = isMobile ? "20px" : 30;
  const cardMinWidth = isMobile ? "90%" : 300;
  const iconSize = isMobile ? 48 : 56;
  const titleSize = isMobile ? 20 : 22;
  const subtitleSize = isMobile ? 15 : 16;
  const timerSize = isMobile ? 16 : 18;
  const buttonPadding = isMobile ? "14px 20px" : "12px 24px";
  const buttonFontSize = isMobile ? 16 : 14;
  const actionButtonsFlexDirection = isMobile ? "column" : "row";
  const actionButtonsGap = isMobile ? 10 : 16;
  const actionButtonWidth = isMobile ? "100%" : "auto";
  const muteButtonFontSize = isMobile ? 14 : 13;

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0,0,0,0.6)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999,
      backdropFilter: "blur(4px)",
      padding: isMobile ? 12 : 16,
    }}>
      <div style={{
        background: dark ? "#1E293B" : "#FFFFFF",
        borderRadius: 16,
        padding: cardPadding,
        textAlign: "center",
        boxShadow: dark ? "0 10px 25px rgba(0,0,0,0.5)" : "0 10px 25px rgba(0,0,0,0.3)",
        minWidth: cardMinWidth,
        maxWidth: isMobile ? "95%" : "auto",
        width: isMobile ? "100%" : "auto",
        color: dark ? "#F1F5F9" : "#1E293B",
        border: `1px solid ${dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)"}`,
        animation: "slideUp 0.3s ease-out",
      }}>
        {/* Icône avec pulsation */}
        <div style={{
          animation: "pulse 1.5s ease-in-out infinite",
          display: "inline-flex",
        }}>
          <PhoneIncoming size={iconSize} color={dark ? "#818CF8" : "#4F46E5"} />
        </div>
        <h2 style={{ margin: isMobile ? "12px 0 6px" : "16px 0 8px", fontWeight: 700, fontSize: titleSize }}>
          Appel entrant
        </h2>
        <p style={{ fontSize: subtitleSize, marginBottom: 8, color: dark ? "#CBD5E1" : "#64748B" }}>
          {callerUser?.nom ?? "Un utilisateur"} vous appelle
        </p>

        {/* Minuteur avec barre de progression */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, marginBottom: isMobile ? 16 : 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: dark ? "#94A3B8" : "#64748B" }}>
            <Clock size={isMobile ? 16 : 18} />
            <span style={{ fontWeight: 600, fontSize: timerSize }}>{formatTime(secondsLeft)}</span>
          </div>
          <div style={{ width: isMobile ? "90%" : "80%", height: 6, background: dark ? "#334155" : "#E2E8F0", borderRadius: 3, overflow: "hidden" }}>
            <div style={{
              width: `${progress}%`,
              height: "100%",
              background: progress > 30 ? "#10B981" : "#EF4444",
              borderRadius: 3,
              transition: "width 1s linear",
            }} />
          </div>
        </div>

        {/* Boutons d'action */}
        <div style={{ display: "flex", gap: actionButtonsGap, justifyContent: "center", flexDirection: actionButtonsFlexDirection }}>
          <button
            onClick={onAccept}
            style={{
              padding: buttonPadding,
              background: "#10B981",
              color: "white",
              border: "none",
              borderRadius: 8,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              fontSize: buttonFontSize,
              transition: "transform 0.1s, background 0.2s",
              width: actionButtonWidth,
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.05)"}
            onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
          >
            <CheckCircle size={isMobile ? 20 : 20} /> Accepter
          </button>
          <button
            onClick={onReject}
            style={{
              padding: buttonPadding,
              background: "#EF4444",
              color: "white",
              border: "none",
              borderRadius: 8,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              fontSize: buttonFontSize,
              transition: "transform 0.1s, background 0.2s",
              width: actionButtonWidth,
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.05)"}
            onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
          >
            <XCircle size={isMobile ? 20 : 20} /> Refuser
          </button>
        </div>

        {/* Bouton muet */}
        <button
          onClick={() => setMuted(!muted)}
          style={{
            marginTop: 16,
            background: "none",
            border: "none",
            color: dark ? "#94A3B8" : "#64748B",
            cursor: "pointer",
            fontSize: muteButtonFontSize,
            fontWeight: 500,
            textDecoration: "underline",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          {muted ? "Activer le son" : "Couper le son"}
        </button>
      </div>
      <audio ref={audioRef} src="/ringtone.mp3" preload="auto" />
    </div>
  );
}