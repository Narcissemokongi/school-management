// src/components/InstallBanner.jsx
import { useState, useEffect, useCallback, useMemo } from "react";
import { X, Share, Plus, MonitorSmartphone } from "lucide-react";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";

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
const InstallBannerKeyframes = (
  <style>{`
    @keyframes edb-slide-up {
      from { transform: translateY(30px); opacity: 0; }
      to   { transform: translateY(0);    opacity: 1; }
    }
    .edb-banner {
      animation: edb-slide-up 0.3s ease;
    }
    @media (prefers-reduced-motion: reduce) {
      .edb-banner { animation: none !important; }
    }
  `}</style>
);

// ════════════════════════════════════════════════════════════════════
// HOOK : invite d'installation PWA (inchangé)
// ════════════════════════════════════════════════════════════════════
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

// ════════════════════════════════════════════════════════════════════
// DÉTECTION PLATEFORME (synchrone, pas de flicker)
// ════════════════════════════════════════════════════════════════════
function detectPlatform() {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent.toLowerCase();
  const isIOS =
    /iphone|ipad|ipod/.test(ua) ||
    (ua.includes("macintosh") && "ontouchend" in document);
  const isAndroid = /android/.test(ua);
  const isSafariMac =
    /safari/.test(ua) && /macintosh/.test(ua) && !/chrome/.test(ua);

  if (isIOS) {
    const isSafariIOS = /safari/.test(ua) && !/crios|fxios|edgios/.test(ua);
    return isSafariIOS ? "ios" : "ios-other-browser";
  }
  if (isAndroid) return "android";
  if (isSafariMac) return "safari-mac";
  return "other";
}

// ════════════════════════════════════════════════════════════════════
// INSTALL BUTTON — feedback tap via state React
// ════════════════════════════════════════════════════════════════════
function InstallButton({ onClick, btnBg, isMobile }) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false); }}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      aria-label="Installer l'application"
      style={{
        ...TAP_BASE,
        background: btnBg,
        border: "none",
        color: "#FFFFFF",
        borderRadius: 8,
        padding: isMobile ? "10px 16px" : "10px 16px",
        fontWeight: 600,
        cursor: "pointer",
        fontSize: 13,
        flexShrink: 0,
        filter: hovered && !pressed ? "brightness(1.1)" : "brightness(1)",
        transform: pressed ? "scale(0.96)" : "scale(1)",
        transition: "filter 0.15s, transform 0.1s",
        fontFamily: "inherit",
        ...(focused ? FOCUS_RING("#FFFFFF") : null),
      }}
    >
      Installer
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════
// CLOSE BUTTON — feedback tap via state React
// ════════════════════════════════════════════════════════════════════
function CloseButton({ onClick }) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Fermer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false); }}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        ...TAP_BASE,
        background: "transparent",
        border: "none",
        color: "rgba(255,255,255,0.8)",
        cursor: "pointer",
        opacity: hovered || pressed ? 1 : 0.8,
        flexShrink: 0,
        minWidth: 44,
        minHeight: 44,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 8,
        transform: pressed ? "scale(0.92)" : "scale(1)",
        transition: "opacity 0.15s, transform 0.1s",
        padding: 0,
        ...(focused ? FOCUS_RING("#FFFFFF") : null),
      }}
    >
      <X size={20} aria-hidden="true" />
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════
// BANNIÈRE D'INSTALLATION
// ════════════════════════════════════════════════════════════════════
export function InstallBanner({ onInstall, onDismiss, installed = false }) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();
  const [platform] = useState(detectPlatform);
  const [visible, setVisible] = useState(true);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    setTimeout(() => onDismiss?.(), 300);
  }, [onDismiss]);

  const handleInstall = useCallback(async () => {
    const outcome = await onInstall?.();
    if (outcome === "accepted" || outcome == null) handleDismiss();
  }, [onInstall, handleDismiss]);

  // ✅ Escape pour fermer
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") handleDismiss();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleDismiss]);

  const bg = dark ? "#0F172A" : "#1E293B";
  const iconColor = dark ? "#A5B4FC" : "#C7D2FE";
  const btnBg = dark ? "#818CF8" : "#4F46E5";

  // ✅ Mémoïsé
  const bannerStyle = useMemo(
    () => ({
      position: "fixed",
      bottom: isMobile
        ? "calc(16px + env(safe-area-inset-bottom, 0px))"
        : 80,
      right: isMobile
        ? "calc(16px + env(safe-area-inset-right, 0px))"
        : 20,
      left: isMobile
        ? "calc(16px + env(safe-area-inset-left, 0px))"
        : "auto",
      zIndex: 9999,
      background: bg,
      color: "#FFFFFF",
      borderRadius: 16,
      padding: isMobile ? "14px 16px" : "12px 20px",
      display: "flex",
      alignItems: "center",
      gap: 12,
      boxShadow: dark
        ? "0 8px 24px rgba(0,0,0,0.5)"
        : "0 4px 20px rgba(0,0,0,0.25)",
      maxWidth: isMobile ? "none" : 420,
      width: isMobile ? "auto" : "calc(100% - 48px)",
      fontSize: isMobile ? 13 : 14,
      fontWeight: 500,
      border: `1px solid ${
        dark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.2)"
      }`,
      overscrollBehavior: "contain",
    }),
    [bg, dark, isMobile]
  );

  if (installed || !visible) return null;
  if (platform === "ios-other-browser") return null;

  return (
    <>
      {InstallBannerKeyframes}
      <div
        className="edb-banner"
        style={bannerStyle}
        role="region"
        aria-label="Installation de l'application"
        aria-live="polite"
      >
        {platform === "ios" && (
          <>
            <Share
              size={20}
              aria-hidden="true"
              style={{ color: iconColor, flexShrink: 0 }}
            />
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
              aria-hidden="true"
              style={{ color: iconColor, flexShrink: 0 }}
            />
            <span style={{ flex: 1 }}>
              Installer l'application sur l'écran d'accueil
            </span>
            <InstallButton
              onClick={handleInstall}
              btnBg={btnBg}
              isMobile={isMobile}
            />
          </>
        )}
        {platform === "safari-mac" && (
          <>
            <Plus
              size={20}
              aria-hidden="true"
              style={{ color: iconColor, flexShrink: 0 }}
            />
            <span>
              Safari : <strong>Fichier → Ajouter au Dock</strong>
            </span>
          </>
        )}
        {platform === "other" && (
          <>
            <MonitorSmartphone
              size={20}
              aria-hidden="true"
              style={{ color: iconColor, flexShrink: 0 }}
            />
            <span style={{ flex: 1 }}>
              Installer l'application sur le bureau
            </span>
            <InstallButton
              onClick={handleInstall}
              btnBg={btnBg}
              isMobile={isMobile}
            />
          </>
        )}
        <CloseButton onClick={handleDismiss} />
      </div>
    </>
  );
}