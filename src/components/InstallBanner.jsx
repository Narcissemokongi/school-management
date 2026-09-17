import { useState, useEffect, useCallback } from "react";
import { X, Share, Plus, MonitorSmartphone } from "lucide-react";
import { useStyles } from "@/hooks/useStyles"; // ⚠️ à confirmer : hooks vs styles
import { useIsMobile } from "@/hooks/useIsMobile";

// ── Hook : invite d'installation PWA ──────────────────────────────
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(display-mode: standalone)").matches;
  });

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const installedHandler = () => setIsInstalled(true);

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return null;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setIsInstalled(true);
    setDeferredPrompt(null);
    return outcome;
  }, [deferredPrompt]);

  const dismissPrompt = useCallback(() => setDeferredPrompt(null), []);

  return { deferredPrompt, isInstalled, promptInstall, dismissPrompt };
}

// ── Détection plateforme (synchrone, pas de flicker) ──────────────
function detectPlatform() {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(ua) ||
                (ua.includes("macintosh") && "ontouchend" in document);
  const isAndroid = /android/.test(ua);
  const isSafariMac = /safari/.test(ua) && /macintosh/.test(ua) && !/chrome/.test(ua);

  // Navigateurs iOS non-Safari : pas d'installation possible
  if (isIOS) {
    const isSafariIOS = /safari/.test(ua) && !/crios|fxios|edgios/.test(ua);
    return isSafariIOS ? "ios" : "ios-other-browser";
  }
  if (isAndroid) return "android";
  if (isSafariMac) return "safari-mac";
  return "other";
}

// ── Bannière d'installation ───────────────────────────────────────
export function InstallBanner({ onInstall, onDismiss, installed = false }) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();
  const [platform] = useState(detectPlatform); // synchrone → pas de null au 1er render
  const [visible, setVisible] = useState(true);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    setTimeout(() => onDismiss?.(), 300);
  }, [onDismiss]);

  const handleInstall = useCallback(async () => {
    const outcome = await onInstall?.();
    if (outcome === "accepted" || outcome == null) handleDismiss();
  }, [onInstall, handleDismiss]);

  if (installed || !visible) return null;
  // iOS non-Safari : impossible d'installer → on masque
  if (platform === "ios-other-browser") return null;

  const bg = dark ? "#0F172A" : "#1E293B";
  const iconColor = dark ? "#A5B4FC" : "#C7D2FE";
  const btnBg = dark ? "#818CF8" : "#4F46E5";

  const bannerStyle = {
    position: "fixed",
    bottom: isMobile ? 16 : 80,
    right: isMobile ? 16 : 20,
    left: isMobile ? 16 : "auto",
    zIndex: 9999,
    background: bg,
    color: "#FFFFFF",
    borderRadius: 16,
    padding: isMobile ? "14px 16px" : "12px 20px",
    display: "flex",
    alignItems: "center",
    gap: 12,
    boxShadow: dark ? "0 8px 24px rgba(0,0,0,0.5)" : "0 4px 20px rgba(0,0,0,0.25)",
    maxWidth: isMobile ? "none" : 420,
    width: isMobile ? "auto" : "calc(100% - 48px)",
    fontSize: isMobile ? 13 : 14,
    fontWeight: 500,
    border: `1px solid ${dark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.2)"}`,
    // ✅ Une seule animation, pas de transform inline concurrent
    animation: "edb-slide-up 0.3s ease",
  };

  const closeButtonStyle = {
    background: "transparent",
    border: "none",
    color: "rgba(255,255,255,0.8)",
    cursor: "pointer",
    padding: 4,
    opacity: 0.8,
    flexShrink: 0,
  };

  return (
    <div style={bannerStyle} role="dialog" aria-live="polite">
      {platform === "ios" && (
        <>
          <Share size={20} style={{ color: iconColor, flexShrink: 0 }} />
          <span>
            Appuyez sur <strong>Partager</strong> puis{" "}
            <strong>Sur l’écran d’accueil</strong>
          </span>
        </>
      )}
      {platform === "android" && (
        <>
          <MonitorSmartphone size={20} style={{ color: iconColor, flexShrink: 0 }} />
          <span style={{ flex: 1 }}>Installer l’application sur l’écran d’accueil</span>
          <button
            onClick={handleInstall}
            style={{
              background: btnBg,
              border: "none",
              color: "#FFFFFF",
              borderRadius: 8,
              padding: isMobile ? "8px 14px" : "6px 14px",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: 13,
              flexShrink: 0,
            }}
          >
            Installer
          </button>
        </>
      )}
      {platform === "safari-mac" && (
        <>
          <Plus size={20} style={{ color: iconColor, flexShrink: 0 }} />
          <span>
            Safari : <strong>Fichier → Ajouter au Dock</strong>
          </span>
        </>
      )}
      {platform === "other" && (
        <>
          <MonitorSmartphone size={20} style={{ color: iconColor, flexShrink: 0 }} />
          <span style={{ flex: 1 }}>Installer l’application sur le bureau</span>
          <button
            onClick={handleInstall}
            style={{
              background: btnBg,
              border: "none",
              color: "#FFFFFF",
              borderRadius: 8,
              padding: isMobile ? "8px 14px" : "6px 14px",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: 13,
              flexShrink: 0,
            }}
          >
            Installer
          </button>
        </>
      )}
      <button onClick={handleDismiss} style={closeButtonStyle} aria-label="Fermer">
        <X size={20} />
      </button>
      <style>{`
        @keyframes edb-slide-up {
          from { transform: translateY(30px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}