import { useState, useEffect, useCallback } from "react";
import { WifiOff, Wifi, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";

export function OfflineBanner({ dark }) {
  const [offline, setOffline] = useState(() => {
    if (typeof navigator === "undefined") return false;
    return !navigator.onLine;
  });

  // Écoute les changements de connexion
  useEffect(() => {
    const handleOffline = () => setOffline(true);
    const handleOnline = () => {
      setOffline(false);
      toast.success("Connexion rétablie", {
        icon: <Wifi size={18} />,
        duration: 3000,
        style: {
          background: dark ? "#1E293B" : "#FFFFFF",
          color: dark ? "#F1F5F9" : "#1E293B",
          border: dark ? "1px solid #334155" : "1px solid #E2E8F0",
        },
      });
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [dark]);

  // Fonction pour forcer une re-vérification (utile pour recharger la page)
  const retryConnection = useCallback(() => {
    // Force la vérification en re-dispatchant l'événement
    if (navigator.onLine) {
      setOffline(false);
      toast.success("Connexion active", {
        icon: <Wifi size={18} />,
        duration: 3000,
        style: {
          background: dark ? "#1E293B" : "#FFFFFF",
          color: dark ? "#F1F5F9" : "#1E293B",
          border: dark ? "1px solid #334155" : "1px solid #E2E8F0",
        },
      });
    } else {
      toast.error("Toujours hors‑ligne", {
        icon: <WifiOff size={18} />,
        duration: 3000,
        style: {
          background: dark ? "#1E293B" : "#FFFFFF",
          color: dark ? "#F1F5F9" : "#1E293B",
          border: dark ? "1px solid #334155" : "1px solid #E2E8F0",
        },
      });
    }
  }, [dark]);

  if (!offline) return null;

  // Couleurs adaptatives
  const bannerBg = dark ? "#7F1D1D" : "#EF4444";
  const bannerText = "#FFFFFF";
  const bannerShadow = dark
    ? "0 2px 8px rgba(0,0,0,0.5)"
    : "0 2px 8px rgba(0,0,0,0.2)";

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10000,
        background: bannerBg,
        color: bannerText,
        padding: "10px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        fontSize: 14,
        fontWeight: 600,
        boxShadow: bannerShadow,
        animation: "fadeInDown 0.3s ease",
        transition: "transform 0.3s ease, opacity 0.3s ease",
      }}
      role="alert"
      aria-live="assertive"
    >
      <WifiOff size={18} />
      <span style={{ flex: 1, textAlign: "center" }}>
        Mode hors‑ligne – Certaines actions sont indisponibles
      </span>
      <button
        onClick={retryConnection}
        aria-label="Réessayer"
        title="Réessayer"
        style={{
          background: "rgba(255,255,255,0.2)",
          border: "none",
          color: "#FFFFFF",
          borderRadius: 6,
          padding: "4px 8px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "background 0.2s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.3)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.2)")}
      >
        <RefreshCw size={16} />
      </button>
      <style>{`
        @keyframes fadeInDown {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}