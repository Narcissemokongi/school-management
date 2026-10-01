// src/components/OfflineBanner.jsx
import { useState, useEffect, useCallback, useMemo } from "react";
import { WifiOff, Wifi, RefreshCw } from "lucide-react";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useStyles } from "@/styles/theme";
import toast from "react-hot-toast";

// ════════════════════════════════════════════════════════════════════
// CONSTANTES MODULE-LEVEL
// ════════════════════════════════════════════════════════════════════
const TAP_BASE = {
  touchAction: "manipulation",
  WebkitTapHighlightColor: "transparent",
  minHeight: 44,
};

const FOCUS_RING = (color) => ({
  outline: `2px solid ${color}`,
  outlineOffset: 2,
});

// ════════════════════════════════════════════════════════════════════
// KEYFRAMES MODULE-LEVEL (rendus UNE fois)
// ════════════════════════════════════════════════════════════════════
const OfflineBannerKeyframes = (
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
);

// ════════════════════════════════════════════════════════════════════
// HELPER — style de toast centralisé
// ════════════════════════════════════════════════════════════════════
function toastStyle(dark) {
  return {
    background: dark ? "#1E293B" : "#FFFFFF",
    color: dark ? "#F1F5F9" : "#1E293B",
    border: dark ? "1px solid #334155" : "1px solid #E2E8F0",
  };
}

// ════════════════════════════════════════════════════════════════════
// RETRY BUTTON — feedback tap + focus ring via state React
// ════════════════════════════════════════════════════════════════════
function RetryButton({ onClick, retrying, isMobile }) {
  const [pressed, setPressed] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);

  const isActive = (hovered || pressed) && !retrying;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={retrying}
      aria-label="Réessayer la connexion"
      title="Réessayer"
      onPointerDown={() => !retrying && setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => { setPressed(false); setHovered(false); }}
      onPointerCancel={() => setPressed(false)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        ...TAP_BASE,
        background: isActive ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.2)",
        border: "none",
        color: "#FFFFFF",
        borderRadius: 6,
        padding: isMobile ? "8px 12px" : "6px 10px",
        cursor: retrying ? "wait" : "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "background 0.2s, transform 0.12s",
        opacity: retrying ? 0.7 : 1,
        transform: pressed ? "scale(0.94)" : "scale(1)",
        ...(focused ? FOCUS_RING("#FFFFFF") : null),
      }}
    >
      <RefreshCw
        size={isMobile ? 18 : 16}
        aria-hidden="true"
        className={retrying ? "ob-animate-spin" : ""}
      />
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════
// COMPOSANT
// ════════════════════════════════════════════════════════════════════
export function OfflineBanner() {
  const isMobile = useIsMobile();
  const { dark } = useStyles();

  const [offline, setOffline] = useState(() => {
    if (typeof navigator === "undefined") return false;
    return !navigator.onLine;
  });
  const [retrying, setRetrying] = useState(false);

  // ===== Sync état + listeners =====
  useEffect(() => {
    const handleOffline = () => setOffline(true);
    const handleOnline = () => {
      setOffline(false);
      toast.success("Connexion rétablie", {
        icon: <Wifi size={18} aria-hidden="true" />,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== Retry =====
  const retryConnection = useCallback(async () => {
    if (retrying) return;
    setRetrying(true);

    const online = typeof navigator !== "undefined" && navigator.onLine;

    if (!online) {
      toast.error("Toujours hors-ligne", {
        icon: <WifiOff size={18} aria-hidden="true" />,
        duration: 3000,
        style: toastStyle(dark),
      });
      setRetrying(false);
      return;
    }

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
        icon: <Wifi size={18} aria-hidden="true" />,
        duration: 3000,
        style: toastStyle(dark),
      });
    } catch {
      toast.error("Serveur injoignable", {
        icon: <WifiOff size={18} aria-hidden="true" />,
        duration: 3000,
        style: toastStyle(dark),
      });
    } finally {
      setRetrying(false);
    }
  }, [dark, retrying]);

  // ===== Styles dérivés =====
  const bannerStyle = useMemo(
    () => ({
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 900,
      background: dark ? "#7F1D1D" : "#EF4444",
      color: "#FFFFFF",
      paddingTop: isMobile
        ? "calc(8px + env(safe-area-inset-top, 0px))"
        : "calc(10px + env(safe-area-inset-top, 0px))",
      paddingBottom: isMobile ? 8 : 10,
      paddingLeft: isMobile ? 12 : 16,
      paddingRight: isMobile ? 12 : 16,
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

  return (
    <>
      {OfflineBannerKeyframes}
      <div
        className="ob-banner"
        style={bannerStyle}
        role="alert"
        aria-live="assertive"
      >
        <WifiOff size={18} aria-hidden="true" />
        <span style={{ flex: 1, textAlign: "center" }}>
          Mode hors-ligne – Certaines actions sont indisponibles
        </span>
        <RetryButton
          onClick={retryConnection}
          retrying={retrying}
          isMobile={isMobile}
        />
      </div>
    </>
  );
}