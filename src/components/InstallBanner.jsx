import { useState, useEffect } from "react";

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

  const promptInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setIsInstalled(true);
    setDeferredPrompt(null);
  };

  const dismissPrompt = () => setDeferredPrompt(null);

  return { deferredPrompt, isInstalled, promptInstall, dismissPrompt };
}

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

  const bannerStyle = {
    position: "fixed",
    bottom: 80,
    right: 20,
    zIndex: 9999,
    background: "#1E293B",
    color: "#FFFFFF",
    borderRadius: 16,
    padding: "12px 20px",
    display: "flex",
    alignItems: "center",
    gap: 12,
    boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
    maxWidth: 420,
    fontSize: 14,
    fontWeight: 500,
  };

  const closeButtonStyle = {
    background: "transparent",
    border: "none",
    color: "#FFFFFF",
    fontSize: 20,
    cursor: "pointer",
    padding: 0,
    lineHeight: 1,
    opacity: 0.8,
    flexShrink: 0,
  };

  return (
    <>
      {platform === "ios" && (
        <div style={bannerStyle}>
          <span>
            📲 Appuyez sur <strong>Partager</strong> puis{" "}
            <strong>Sur l'écran d'accueil</strong>
          </span>
          <button onClick={onDismiss} style={closeButtonStyle} aria-label="Fermer">
            ✕
          </button>
        </div>
      )}

      {platform === "safari-mac" && (
        <div style={bannerStyle}>
          <span>
            💻 Safari : <strong>Fichier → Ajouter au Dock</strong> (ou à l'écran d'accueil)
          </span>
          <button onClick={onDismiss} style={closeButtonStyle} aria-label="Fermer">
            ✕
          </button>
        </div>
      )}

      {platform !== "ios" && platform !== "safari-mac" && platform !== null && (
        <div style={bannerStyle}>
          <span>📱 Installer l'application sur le bureau</span>
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
            <button onClick={onDismiss} style={closeButtonStyle} aria-label="Fermer">
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}