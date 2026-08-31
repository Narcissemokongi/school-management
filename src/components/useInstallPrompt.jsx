import { useState, useEffect, useCallback } from "react";
import { X, Share, Plus, MonitorSmartphone } from "lucide-react";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile"; // <-- Import du hook

// Hook personnalisé pour gérer l'invite d'installation PWA
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handler);

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const dismissPrompt = useCallback(() => setDeferredPrompt(null), []);

  return { deferredPrompt, isInstalled, promptInstall, dismissPrompt };
}

// Bannière d'installation adaptée au thème et responsive
export function InstallBanner({ onInstall, onDismiss }) {
  const { dark } = useStyles();
  const isMobile = useIsMobile(); // Détection mobile
  const [platform, setPlatform] = useState(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const ua = window.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) {
      setPlatform("ios");
    } else if (/android/.test(ua)) {
      setPlatform("android");
    } else if (/safari/.test(ua) && /macintosh/.test(ua)) {
      setPlatform("safari-mac");
    } else {
      setPlatform("other");
    }
  }, []);

  // Fermeture avec animation
  const handleDismiss = () => {
    setVisible(false);
    setTimeout(() => onDismiss?.(), 300);
  };

  const handleInstall = () => {
    onInstall?.();
    handleDismiss();
  };

  if (!platform || !visible) return null;

  // Couleurs adaptatives
  const bannerBackground = dark ? "#0F172A" : "#1E293B";
  const textColor = "#FFFFFF";
  const closeButtonColor = "rgba(255,255,255,0.8)";
  const installButtonBg = dark ? "#818CF8" : "#4F46E5";

  // Style de base
  const bannerStyle = {
    position: "fixed",
    bottom: isMobile ? 16 : 24,
    right: isMobile ? 16 : 24,
    left: isMobile ? 16 : "auto",
    zIndex: 9999,
    background: bannerBackground,
    color: textColor,
    borderRadius: 16,
    padding: isMobile ? "14px 16px" : "16px 20px",
    display: "flex",
    alignItems: "center",
    gap: 12,
    boxShadow: dark ? "0 8px 24px rgba(0,0,0,0.5)" : "0 8px 24px rgba(0,0,0,0.25)",
    maxWidth: isMobile ? "none" : 420,
    width: isMobile ? "auto" : "calc(100% - 48px)",
    fontSize: isMobile ? 13 : 14,
    fontWeight: 500,
    border: `1px solid ${dark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.2)"}`,
    transition: "transform 0.3s ease, opacity 0.3s ease",
    transform: visible ? "translateY(0)" : "translateY(100px)",
    opacity: visible ? 1 : 0,
    animation: visible ? "slideUp 0.3s ease" : "none",
  };

  const closeButtonStyle = {
    background: "transparent",
    border: "none",
    color: closeButtonColor,
    cursor: "pointer",
    padding: 4,
    opacity: 0.8,
    flexShrink: 0,
  };

  const iconColor = dark ? "#A5B4FC" : "#C7D2FE";

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
          <span>Installer l’application sur l’écran d’accueil</span>
        </>
      )}
      {platform === "safari-mac" && (
        <>
          <Plus size={20} style={{ color: iconColor, flexShrink: 0 }} />
          <span>
            Safari : <strong>Fichier → Ajouter au Dock</strong> (ou à l’écran d’accueil)
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
              background: installButtonBg,
              border: "none",
              color: "#FFFFFF",
              borderRadius: 8,
              padding: isMobile ? "8px 14px" : "6px 14px",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: isMobile ? 13 : 13,
              transition: "background 0.2s, transform 0.1s",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = dark ? "#6366F1" : "#4338CA";
              e.currentTarget.style.transform = "scale(1.05)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = installButtonBg;
              e.currentTarget.style.transform = "scale(1)";
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
        @keyframes slideUp {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}