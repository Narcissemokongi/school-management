import { useState, useEffect, useCallback, useMemo } from "react";
import { WifiOff, Wifi, RefreshCw } from "lucide-react";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useStyles } from "@/styles/theme";
import toast from "react-hot-toast";

// ============================================================
// STYLE DE TOAST CENTRALISÉ (au lieu de dupliquer 3×)
// ============================================================
function toastStyle(dark) {
  return {
    background: dark ? "#1E293B" : "#FFFFFF",
    color: dark ? "#F1F5F9" : "#1E293B",
    border: dark ? "1px solid #334155" : "1px solid #E2E8F0",
  };
}

// ============================================================
// COMPOSANT
// ============================================================
export function OfflineBanner() {
  const isMobile = useIsMobile();
  const { dark } = useStyles();

  const [offline, setOffline] = useState(() => {
    if (typeof navigator === "undefined") return false;
    return !navigator.onLine;
  });
  const [retrying, setRetrying] = useState(false);

  // ===== Sync état + listeners (sans dépendance sur dark) =====
  useEffect(() => {
    const handleOffline = () => setOffline(true);
    const handleOnline = () => {
      setOffline(false);
      toast.success("Connexion rétablie", {
        icon: <Wifi size={18} />,
        duration: 3000,
        style: toastStyle(dark),
      });
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
    // ✅ dark volontairement NON listé — on ne veut pas re-attacher les listeners
    // au changement de thème. dark est lu au moment de la notif (closure ok).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== Retry : ping léger pour valider la connexion =====
  const retryConnection = useCallback(async () => {
    if (retrying) return;
    setRetrying(true);

    const online = typeof navigator !== "undefined" && navigator.onLine;

    if (!online) {
      toast.error("Toujours hors-ligne", {
        icon: <WifiOff size={18} />,
        duration: 3000,
        style: toastStyle(dark),
      });
      setRetrying(false);
      return;
    }

    // Test réel de connexion (fichier statique 1×1 px, cache-busté)
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      await fetch(`/favicon.ico?cb=${Date.now()}`, {
        method: "HEAD",
        cache: "no-store",
        signal: controller.signal,
      });
      clearTimeout(timeout);

      setOffline(false);
      toast.success("Connexion active", {
        icon: <Wifi size={18} />,
        duration: 3000,
        style: toastStyle(dark),
      });
    } catch {
      toast.error("Serveur injoignable", {
        icon: <WifiOff size={18} />,
        duration: 3000,
        style: toastStyle(dark),
      });
    } finally {
      setRetrying(false);
    }
  }, [dark, retrying]);

  // ===== Styles dérivés (mémoïsés) =====
  const bannerStyle = useMemo(
    () => ({
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 900, // ✅ sous les modales critiques (950+)
      background: dark ? "#7F1D1D" : "#EF4444",
      color: "#FFFFFF",
      padding: isMobile ? "8px 12px" : "10px 16px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      fontSize: isMobile ? 13 : 14,
      fontWeight: 600,
      boxShadow: dark
        ? "0 2px 8px rgba(0,0,0,0.5)"
        : "0 2px 8px rgba(0,0,0,0.2)",
    }),
    [dark, isMobile]
  );

  if (!offline) return null;

  const retryButtonPadding = isMobile ? "6px 10px" : "4px 8px";
  const retryIconSize = isMobile ? 16 : 16;

  return (
    <div
      className="ob-banner"
      style={bannerStyle}
      role="alert"
      aria-live="assertive"
    >
      <WifiOff size={18} />
      <span style={{ flex: 1, textAlign: "center" }}>
        Mode hors-ligne – Certaines actions sont indisponibles
      </span>
      <button
        onClick={retryConnection}
        disabled={retrying}
        aria-label="Réessayer la connexion"
        title="Réessayer"
        style={{
          background: "rgba(255,255,255,0.2)",
          border: "none",
          color: "#FFFFFF",
          borderRadius: 6,
          padding: retryButtonPadding,
          cursor: retrying ? "wait" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "background 0.2s, transform 0.15s",
          opacity: retrying ? 0.7 : 1,
        }}
        onMouseEnter={(e) => {
          if (!retrying)
            e.currentTarget.style.background = "rgba(255,255,255,0.3)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(255,255,255,0.2)";
        }}
      >
        <RefreshCw
          size={retryIconSize}
          className={retrying ? "ob-animate-spin" : ""}
        />
      </button>

      <style>{`
        @keyframes ob-fadeInDown {
          from { transform: translateY(-20px); opacity: 0; }
          to   { transform: translateY(0);     opacity: 1; }
        }
        @keyframes ob-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .ob-banner {
          animation: ob-fadeInDown 0.3s ease;
          transition: transform 0.3s ease, opacity 0.3s ease;
        }
        .ob-animate-spin {
          animation: ob-spin 1s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .ob-banner, .ob-animate-spin {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </div>
  );
}