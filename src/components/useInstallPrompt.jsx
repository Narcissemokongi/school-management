import { useState, useEffect } from "react";
import { X } from "lucide-react";

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

    // Vérifier si l'application est déjà installée
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const promptInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const dismissPrompt = () => setDeferredPrompt(null);

  return { deferredPrompt, isInstalled, promptInstall, dismissPrompt };
}

// Bannière d'installation
export function InstallBanner({ onInstall, onDismiss }) {
  const [platform, setPlatform] = useState(null);

  useEffect(() => {
    const ua = window.navigator.userAgent.toLowerCase();

    if (/iphone|ipad|ipod/.test(ua)) {
      setPlatform("ios");
    } else if (/safari/.test(ua) && /macintosh/.test(ua)) {
      setPlatform("safari-mac");
    } else {
      setPlatform("other");
    }
  }, []);

  if (!platform) return null; // Ne rien afficher tant que la plateforme n'est pas détectée

  const bannerStyle = {
    position: "fixed",
    bottom: 24,
    right: 24,
    zIndex: 9999,
    background: "#1E293B",
    color: "#FFFFFF",
    borderRadius: 16,
    padding: "16px 20px",
    display: "flex",
    alignItems: "center",
    gap: 12,
    boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
    maxWidth: 420,
    fontSize: 14,
    fontWeight: 500,
    animation: "slideUp 0.3s ease",
  };

  const closeButtonStyle = {
    background: "transparent",
    border: "none",
    color: "#FFFFFF",
    cursor: "pointer",
    padding: 4,
    opacity: 0.8,
    flexShrink: 0,
  };

  return (
    <div style={bannerStyle}>
      {platform === "ios" && (
        <span>
          📲 Appuyez sur <strong>Partager</strong> puis{" "}
          <strong>Sur l’écran d’accueil</strong>
        </span>
      )}
      {platform === "safari-mac" && (
        <span>
          💻 Safari : <strong>Fichier → Ajouter au Dock</strong> (ou à l’écran d’accueil)
        </span>
      )}
      {platform === "other" && (
        <>
          <span style={{ flex: 1 }}>📱 Installer l’application sur le bureau</span>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
            <button
              onClick={onInstall}
              style={{
                background: "#4F46E5",
                border: "none",
                color: "#FFFFFF",
                borderRadius: 8,
                padding: "6px 14px",
                fontWeight: 600,
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              Installer
            </button>
          </div>
        </>
      )}
      <button onClick={onDismiss} style={closeButtonStyle} aria-label="Fermer">
        <X size={20} />
      </button>
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}