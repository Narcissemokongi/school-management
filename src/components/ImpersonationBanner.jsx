// src/components/ImpersonationBanner.jsx
import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useTokens } from "@/theme/tokens";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useImpersonationStore } from "@/store/impersonationStore";
import { AlertTriangle, LogOut } from "lucide-react";
import toast from "react-hot-toast";

export function ImpersonationBanner() {
  const t = useTokens();
  const isMobile = useIsMobile();
  const session = useImpersonationStore((s) => s.session);
  const endSession = useImpersonationStore((s) => s.end);

  const endImpersonationM = useMutation(api.impersonation.endImpersonation);

  // Tick pour rafraîchir le compteur
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!session) return;
    const id = setInterval(() => setTick((v) => v + 1), 60_000);
    return () => clearInterval(id);
  }, [session]);

  if (!session) return null;

  const { targetUser, originalUser, startedAt } = session;
  const elapsedMs = Date.now() - startedAt;
  const minutes = Math.floor(elapsedMs / 60_000);
  const durationLabel =
    minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`;

  const handleExit = async () => {
    const ok = window.confirm(
      `Terminer l'impersonation de "${targetUser.nom}" ?`
    );
    if (!ok) return;

    try {
      await endImpersonationM({
        userId: originalUser._id,
        targetUserId: targetUser._id,
      });
    } catch (err) {
      console.error("[impersonation] end audit failed:", err);
    }
    endSession();
    toast.success("Impersonation terminée");
    // Reload pour repartir sur la session owner
    window.location.reload();
  };

  return (
    <div
      role="alert"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: isMobile ? "10px 14px" : "12px 20px",
        background: "linear-gradient(90deg, #F59E0B 0%, #F97316 100%)",
        color: "#FFFFFF",
        flexWrap: "wrap",
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
      }}
    >
      <AlertTriangle size={20} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.5 }}>
          MODE IMPERSONATION · {durationLabel}
        </div>
        <div
          style={{
            fontSize: 12,
            opacity: 0.95,
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          Connecté en tant que <strong>{targetUser.nom}</strong> ({targetUser.role})
        </div>
      </div>
      <button
        type="button"
        onClick={handleExit}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "8px 14px",
          background: "#FFFFFF",
          color: "#92400E",
          border: "none",
          borderRadius: t.radius.sm,
          cursor: "pointer",
          fontWeight: 700,
          fontSize: 12,
          fontFamily: t.font.family,
          whiteSpace: "nowrap",
        }}
      >
        <LogOut size={14} />
        Quitter
      </button>
    </div>
  );
}

export default ImpersonationBanner;