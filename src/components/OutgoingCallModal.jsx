import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useStyles } from "../styles/theme";
import { useIsMobile } from "../hooks/useIsMobile"; // <-- Import du hook
import { PhoneOutgoing, XCircle, Clock, Volume2, VolumeX, User } from "lucide-react";
import toast from "react-hot-toast";

const RING_DURATION = 60; // secondes

export function OutgoingCallModal({ callId, calleeId, onCancel }) {
  const { dark } = useStyles();
  const isMobile = useIsMobile(); // Détection mobile

  const calleeUser = useQuery(
    api.users.get,
    calleeId ? { userId: calleeId } : "skip"
  );
  const [secondsLeft, setSecondsLeft] = useState(RING_DURATION);
  const [muted, setMuted] = useState(false);
  const audioRef = useRef(null);
  const timerRef = useRef(null);

  const handleCancel = useCallback(() => {
    clearInterval(timerRef.current);
    onCancel();
  }, [onCancel]);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          toast.error("L'appel a expiré sans réponse.");
          onCancel();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [onCancel]);

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
  const cardPadding = isMobile ? "20px" : "32px";
  const cardMaxWidth = isMobile ? "90%" : 400;
  const avatarSize = isMobile ? 80 : 96;
  const avatarFontSize = isMobile ? 28 : 36;
  const titleFontSize = isMobile ? 18 : 22;
  const subtitleFontSize = isMobile ? 14 : 16;
  const timerFontSize = isMobile ? 16 : 18;
  const cancelButtonPadding = isMobile ? "14px 20px" : "12px 28px";
  const cancelButtonFontSize = isMobile ? 16 : 16;
  const muteButtonFontSize = isMobile ? 14 : 14;
  const progressWidth = isMobile ? "80%" : "70%";

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(15, 23, 42, 0.8)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        animation: "fadeIn 0.25s ease",
        padding: isMobile ? 12 : 0,
      }}
    >
      <div
        style={{
          background: dark ? "#1E293B" : "#FFFFFF",
          borderRadius: 28,
          padding: cardPadding,
          textAlign: "center",
          boxShadow: dark ? "0 25px 50px rgba(0,0,0,0.6)" : "0 25px 50px rgba(0,0,0,0.2)",
          maxWidth: cardMaxWidth,
          width: "100%",
          border: `1px solid ${dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)"}`,
          animation: "slideUp 0.35s cubic-bezier(0.4,0,0.2,1)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Avatar avec initiale */}
        <div
          style={{
            width: avatarSize,
            height: avatarSize,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #F59E0B, #F97316)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
            animation: "pulse 1.5s ease infinite",
            color: "white",
            fontSize: avatarFontSize,
            fontWeight: 700,
            boxShadow: "0 8px 20px rgba(245,158,11,0.4)",
          }}
        >
          {calleeUser?.nom?.charAt(0).toUpperCase() || <User size={avatarFontSize} />}
        </div>

        <h2
          style={{
            fontSize: titleFontSize,
            fontWeight: 700,
            color: dark ? "#F1F5F9" : "#1E293B",
            margin: "0 0 4px",
          }}
        >
          Appel en cours
        </h2>

        <p
          style={{
            fontSize: subtitleFontSize,
            color: dark ? "#CBD5E1" : "#64748B",
            marginBottom: 16,
          }}
        >
          {calleeUser ? calleeUser.nom : "Contact"} est en train de sonner…
        </p>

        {/* Minuteur et progression circulaire */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: dark ? "#94A3B8" : "#64748B", fontWeight: 600 }}>
            <Clock size={isMobile ? 16 : 18} />
            <span style={{ fontSize: timerFontSize }}>{formatTime(secondsLeft)}</span>
          </div>
          <div style={{ width: progressWidth, height: 6, background: dark ? "#334155" : "#E2E8F0", borderRadius: 3, overflow: "hidden" }}>
            <div
              style={{
                width: `${progress}%`,
                height: "100%",
                background: progress > 30 ? "#10B981" : "#EF4444",
                borderRadius: 3,
                transition: "width 1s linear",
              }}
            />
          </div>
        </div>

        {/* Boutons d'action */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
          <button
            onClick={handleCancel}
            style={{
              padding: cancelButtonPadding,
              background: "linear-gradient(135deg, #EF4444, #DC2626)",
              color: "#FFFFFF",
              border: "none",
              borderRadius: 14,
              fontWeight: 600,
              fontSize: cancelButtonFontSize,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "transform 0.2s, box-shadow 0.2s",
              boxShadow: "0 6px 16px rgba(239,68,68,0.4)",
              width: isMobile ? "100%" : "auto",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.05)";
              e.currentTarget.style.boxShadow = "0 8px 20px rgba(239,68,68,0.6)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = "0 6px 16px rgba(239,68,68,0.4)";
            }}
          >
            <XCircle size={20} /> Annuler
          </button>

          <button
            onClick={() => setMuted(!muted)}
            style={{
              background: "none",
              border: "none",
              color: dark ? "#94A3B8" : "#64748B",
              cursor: "pointer",
              fontSize: muteButtonFontSize,
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: 6,
              textDecoration: "underline",
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = dark ? "#E2E8F0" : "#1E293B")}
            onMouseLeave={(e) => (e.currentTarget.style.color = dark ? "#94A3B8" : "#64748B")}
          >
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            {muted ? "Activer le son" : "Couper le son"}
          </button>
        </div>
      </div>

      {/* Audio pour la sonnerie */}
      <audio ref={audioRef} src="/dialtone.mp3" preload="auto" />

      {/* Styles d'animation globaux */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes pulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(245,158,11,0.5); }
          70% { transform: scale(1.05); box-shadow: 0 0 0 20px rgba(245,158,11,0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(245,158,11,0); }
        }
        @keyframes slideUp {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}