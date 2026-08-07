import { useState, useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { PhoneIncoming, CheckCircle, XCircle, Clock } from "lucide-react";
import toast from "react-hot-toast";

const RING_DURATION = 60;

export function IncomingCallModal({ callerId, onAccept, onReject }) {
  const callerUser = useQuery(api.users.get, callerId ? { userId: callerId } : "skip");
  const [secondsLeft, setSecondsLeft] = useState(RING_DURATION);
  const audioRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          toast.error("Appel expiré");
          onReject(); // rejeter automatiquement
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

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
  }, []);

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.6)", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 9999
    }}>
      <div style={{
        background: "white", borderRadius: 16, padding: 30,
        textAlign: "center", boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
        minWidth: 300
      }}>
        <PhoneIncoming size={48} color="#4f46e5" />
        <h2 style={{ margin: "16px 0" }}>Appel entrant</h2>
        <p style={{ fontSize: 18, marginBottom: 8 }}>
          {callerUser?.nom ?? "Un utilisateur"} vous appelle
        </p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 20, color: "#64748b" }}>
          <Clock size={18} /> <span style={{ fontWeight: 600 }}>{formatTime(secondsLeft)}</span>
        </div>
        <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
          <button onClick={onAccept} style={{
            padding: "12px 24px", background: "#10b981", color: "white",
            border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 8
          }}>
            <CheckCircle size={20} /> Accepter
          </button>
          <button onClick={onReject} style={{
            padding: "12px 24px", background: "#ef4444", color: "white",
            border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 8
          }}>
            <XCircle size={20} /> Refuser
          </button>
        </div>
      </div>
      <audio ref={audioRef} src="/ringtone.mp3" preload="auto" />
    </div>
  );
}