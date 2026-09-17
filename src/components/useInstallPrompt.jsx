import { useState, useEffect, useCallback, useRef } from "react";
import { X, Share, Plus, MonitorSmartphone } from "lucide-react";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";

// ============================================================
// Hook personnalisé pour gérer l'invite d'installation PWA
// ============================================================
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(() => {
    // Détection dès l'init (évite le flicker au 1er render)
    if (typeof window === "undefined") return false;
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true
    );
  });

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const installedHandler = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

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
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
    return outcome;
  }, [deferredPrompt]);

  const dismissPrompt = useCallback(() => setDeferredPrompt(null), []);

  return { deferredPrompt, isInstalled, promptInstall, dismissPrompt };
}

// ============================================================
// Détection plateforme robuste
// ============================================================
function detectPlatform() {
  if (typeof window === "undefined") return "other";
  const ua = window.navigator.userAgent;
  const lower = ua.toLowerCase();

  // iOS (Safari, Chrome, Firefox iOS utilisent tous WebKit)
  if (/iphone|ipad|ipod/.test(lower)) return "ios";
  // Android
  if (/android/.test(lower)) return "android";
  // Safari Mac : Safari MAIS PAS Chrome/Edge/Firefox Mac
  if (
    /safari/.test(lower) &&
    /macintosh/.test(lower) &&
    !/chrome|chromium|crios|edg|firefox/.test(lower)
  ) {
    return "safari-mac";
  }
  return "other";
}

// ============================================================
// Bannière d'installation adaptée au thème et responsive
// ============================================================
export function InstallBanner({
  onInstall,
  onDismiss,
  isInstalled = false, // ✅ Prop optionnelle pour skip si déjà installé
  visible: visibleProp, // ✅ Contrôle externe optionnel
}) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();

  const [platform, setPlatform] = useState(null);
  const [visible, setVisible] = useState(true);
  const dismissTimeoutRef = useRef(null);

  // Détection plateforme au mount
  useEffect(() => {
    setPlatform(detectPlatform());
  }, []);

  // Cleanup du timeout si démontage pendant l'anim de fermeture
  useEffect(() => {
    return () => {
      if (dismissTimeoutRef.current) clearTimeout(dismissTimeoutRef.current);
    };
  }, []);

  // Fermeture avec animation
  const handleDismiss = useCallback(() => {
    setVisible(false);
    if (dismissTimeoutRef.current) clearTimeout(dismissTimeoutRef.current);
    dismissTimeoutRef.current = setTimeout(() => {
      dismissTimeoutRef.current = null;
      onDismiss?.();
    }, 300);
  }, [onDismiss]);

  const handleInstall = useCallback(() => {
    onInstall?.();
    handleDismiss();
  }, [onInstall, handleDismiss]);

  // ===== Garde-fous =====
  if (isInstalled) return null; // ✅ Pas de flicker sur PWA installée
  if (visibleProp === false) return null;
  if (!platform || !visible) return null;

  // Couleurs adaptatives
  const bannerBackground = dark ? "#0F172A" : "#1E293B";
  const textColor = "#FFFFFF";
  const closeButtonColor = "rgba(255,255,255,0.8)";
  const installButtonBg = dark ? "#818CF8" : "#4F46E5";
  const iconColor = dark ? "#A5B4FC" : "#C7D2FE";

  // Style de base
  const bannerStyle = {
    position: "fixed",
    bottom: isMobile ? 16 : 24,
    right: isMobile ? 16 : 24,
    left: isMobile ? 16 : "auto",
    zIndex: 900, // ⬇️ sous les modales critiques (950+) mais au-dessus du contenu
    background: bannerBackground,
    color: textColor,
    borderRadius: 16,
    padding: isMobile ? "14px 16px" : "16px 20px",
    display: "flex",
    alignItems: "center",
    gap: 12,
    boxShadow: dark
      ? "0 8px 24px rgba(0,0,0,0.5)"
      : "0 8px 24px rgba(0,0,0,0.25)",
    maxWidth: isMobile ? "none" : 420,
    width: isMobile ? "auto" : "calc(100% - 48px)",
    fontSize: 13,
    fontWeight: 500,
    border: `1px solid ${
      dark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.2)"
    }`,
    // Une seule technique d'anim : classe CSS scopée
    transform: visible ? "translateY(0)" : "translateY(120%)",
    opacity: visible ? 1 : 0,
    transition: "transform 0.3s ease, opacity 0.3s ease",
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

  return (
    <div
      className="edb-banner"
      style={bannerStyle}
      role="dialog"
      aria-live="polite"
    >
      {platform === "ios" && (
        <>
          <Share size={20} style={{ color: iconColor, flexShrink: 0 }} />
          <span>
            Appuyez sur <strong>Partager</strong> puis{" "}
            <strong>Sur l'écran d'accueil</strong>
          </span>
        </>
      )}
      {platform === "android" && (
        <>
          <MonitorSmartphone
            size={20}
            style={{ color: iconColor, flexShrink: 0 }}
          />
          <span>Installer l'application sur l'écran d'accueil</span>
        </>
      )}
      {platform === "safari-mac" && (
        <>
          <Plus size={20} style={{ color: iconColor, flexShrink: 0 }} />
          <span>
            Safari : <strong>Fichier → Ajouter au Dock</strong> (ou à l'écran
            d'accueil)
          </span>
        </>
      )}
      {platform === "other" && (
        <>
          <MonitorSmartphone
            size={20}
            style={{ color: iconColor, flexShrink: 0 }}
          />
          <span style={{ flex: 1 }}>
            Installer l'application sur le bureau
          </span>
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
              fontSize: 13,
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
      <button
        onClick={handleDismiss}
        style={closeButtonStyle}
        aria-label="Fermer"
      >
        <X size={20} />
      </button>

      {/* Keyframes préfixés edb-* (EDuBanner) + respect reduced-motion */}
      <style>{`
        @keyframes edb-slideUp {
          from { transform: translateY(30px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .edb-banner {
            transition: none !important;
          }
        }
      `}</style>
    </div>
  );
}