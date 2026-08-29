import { useState, useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useStyles } from "../styles/theme";   // ✅ import du hook
import { PhoneIncoming, CheckCircle, XCircle, Clock } from "lucide-react";
import toast from "react-hot-toast";

const RING_DURATION = 60;

export function IncomingCallModal({ callerId, onAccept, onReject }) {
  const { S, dark } = useStyles();
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
    audio.play().catch(() => {
      // Lecture impossible (autoplay bloqué), on ignore
    });
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

  // Pourcentage restant pour la barre de progression
  const progress = (secondsLeft / RING_DURATION) * 100;

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.6)", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 9999,
      backdropFilter: "blur(4px)",
    }}>
      <div style={{
        background: dark ? "#1E293B" : "#FFFFFF",   // ✅ thème
        borderRadius: 16, padding: 30,
        textAlign: "center", boxShadow: dark ? "0 10px 25px rgba(0,0,0,0.5)" : "0 10px 25px rgba(0,0,0,0.3)",
        minWidth: 300,
        color: dark ? "#F1F5F9" : "#1E293B",
        border: `1px solid ${dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)"}`,
        animation: "slideUp 0.3s ease-out",
      }}>
        {/* Icône avec pulsation */}
        <div style={{
          animation: "pulse 1.5s ease-in-out infinite",
          display: "inline-flex",
        }}>
          <PhoneIncoming size={56} color={dark ? "#818CF8" : "#4F46E5"} />
        </div>
        <h2 style={{ margin: "16px 0 8px", fontWeight: 700, fontSize: 22 }}>
          Appel entrant
        </h2>
        <p style={{ fontSize: 16, marginBottom: 8, color: dark ? "#CBD5E1" : "#64748B" }}>
          {callerUser?.nom ?? "Un utilisateur"} vous appelle
        </p>

        {/* Minuteur avec barre de progression */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: dark ? "#94A3B8" : "#64748B" }}>
            <Clock size={18} />
            <span style={{ fontWeight: 600 }}>{formatTime(secondsLeft)}</span>
          </div>
          <div style={{ width: "80%", height: 6, background: dark ? "#334155" : "#E2E8F0", borderRadius: 3, overflow: "hidden" }}>
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
        <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
          <button
            onClick={onAccept}
            style={{
              padding: "12px 24px", background: "#10B981", color: "white",
              border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 8,
              transition: "transform 0.1s, background 0.2s",
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.05)"}
            onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
          >
            <CheckCircle size={20} /> Accepter
          </button>
          <button
            onClick={onReject}
            style={{
              padding: "12px 24px", background: "#EF4444", color: "white",
              border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 8,
              transition: "transform 0.1s, background 0.2s",
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.05)"}
            onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
          >
            <XCircle size={20} /> Refuser
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
            fontSize: 13,
            fontWeight: 500,
            textDecoration: "underline",
          }}
        >
          {muted ? "🔇 Activer le son" : "🔊 Couper le son"}
        </button>
      </div>
      <audio ref={audioRef} src="/ringtone.mp3" preload="auto" />
    </div>
  );
}