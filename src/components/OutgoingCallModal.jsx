import { useState, useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { PhoneOutgoing, XCircle, Clock } from "lucide-react";
import toast from "react-hot-toast";

const RING_DURATION = 60; // secondes

export function OutgoingCallModal({ callId, calleeId, onCancel }) {
  const calleeUser = useQuery(
    api.users.get,
    calleeId ? { userId: calleeId } : "skip"
  );
  const [secondsLeft, setSecondsLeft] = useState(RING_DURATION);
  const audioRef = useRef(null);
  const timerRef = useRef(null);

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

    // Lecture de la sonnerie
    if (audioRef.current) {
      audioRef.current.loop = true;
      audioRef.current.play().catch(() => {});
    }

    return () => {
      clearInterval(timerRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCancel = () => {
    clearInterval(timerRef.current);
    onCancel();
  };

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        animation: "fadeIn 0.2s ease",
      }}
    >
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: 24,
          padding: "40px 32px",
          textAlign: "center",
          boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
          maxWidth: 380,
          width: "100%",
          margin: "0 16px",
        }}
      >
        {/* Icône animée */}
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            background: "#FEF3C7",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
            animation: "pulse 1.5s ease infinite",
          }}
        >
          <PhoneOutgoing size={36} color="#F59E0B" />
        </div>

        <h2
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "#1E293B",
            margin: "0 0 8px",
          }}
        >
          Appel en cours
        </h2>

        <p
          style={{
            fontSize: 16,
            color: "#64748B",
            marginBottom: 4,
          }}
        >
          {calleeUser ? calleeUser.nom : "Contact"} est en train de sonner…
        </p>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            marginBottom: 24,
            color: "#64748B",
          }}
        >
          <Clock size={18} />
          <span style={{ fontWeight: 600, fontSize: 16 }}>
            {formatTime(secondsLeft)}
          </span>
        </div>

        <button
          onClick={handleCancel}
          style={{
            padding: "12px 24px",
            background: "#EF4444",
            color: "#FFFFFF",
            border: "none",
            borderRadius: 12,
            fontWeight: 600,
            fontSize: 15,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            transition: "background 0.2s",
            boxShadow: "0 4px 12px rgba(239,68,68,0.3)",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#DC2626")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#EF4444")}
        >
          <XCircle size={20} /> Annuler
        </button>
      </div>

      {/* Audio pour la sonnerie */}
      <audio ref={audioRef} src="/dialtone.mp3" preload="auto" />

      {/* Styles d'animation globaux (injectés une fois) */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes pulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(245,158,11,0.4); }
          70% { transform: scale(1.05); box-shadow: 0 0 0 15px rgba(245,158,11,0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(245,158,11,0); }
        }
      `}</style>
    </div>
  );
}