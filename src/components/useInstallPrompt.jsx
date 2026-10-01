// src/components/InstallBanner.jsx
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
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
    @keyframes edb-slideUp {
      from { transform: translateY(30px); opacity: 0; }
      to   { transform: translateY(0);    opacity: 1; }
    }
    .edb-banner {
      animation: edb-slideUp 0.3s ease;
    }
    @media (prefers-reduced-motion: reduce) {
      .edb-banner {
        animation: none !important;
        transition: none !important;
      }
    }
  `}</style>
);

// ════════════════════════════════════════════════════════════════════
// HOOK — invite d'installation PWA
// ════════════════════════════════════════════════════════════════════
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(() => {
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

// ════════════════════════════════════════════════════════════════════
// DÉTECTION PLATEFORME
// ════════════════════════════════════════════════════════════════════
function detectPlatform() {
  if (typeof window === "undefined") return "other";
  const ua = window.navigator.userAgent;
  const lower = ua.toLowerCase();

  if (/iphone|ipad|ipod/.test(lower)) return "ios";
  if (/android/.test(lower)) return "android";
  if (
    /safari/.test(lower) &&
    /macintosh/.test(lower) &&
    !/chrome|chromium|crios|edg|firefox/.test(lower)
  ) {
    return "safari-mac";
  }
  return "other";
}

// ════════════════════════════════════════════════════════════════════
// INSTALL BUTTON — feedback tap + focus ring via state React
// ════════════════════════════════════════════════════════════════════
function InstallButton({ onClick, installButtonBg, hoverBg, isMobile }) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);

  const isActive = hovered && !pressed;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Installer l'application"
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
        background: isActive ? hoverBg : installButtonBg,
        border: "none",
        color: "#FFFFFF",
        borderRadius: 8,
        padding: isMobile ? "10px 16px" : "10px 16px",
        fontWeight: 600,
        cursor: "pointer",
        fontSize: 13,
        flexShrink: 0,
        fontFamily: "inherit",
        transform: pressed
          ? "scale(0.96)"
          : isActive
          ? "scale(1.03)"
          : "scale(1)",
        transition: "background 0.2s, transform 0.12s",
        ...(focused ? FOCUS_RING("#FFFFFF") : null),
      }}
    >
      Installer
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════
// CLOSE BUTTON — feedback tap + focus ring via state React
// ════════════════════════════════════════════════════════════════════
function CloseButton({ onClick, color }) {
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
        color,
        cursor: "pointer",
        padding: 0,
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
export function InstallBanner({
  onInstall,
  onDismiss,
  isInstalled = false,
  visible: visibleProp,
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

  // Cleanup du timeout au démontage
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

  // Couleurs (mémoïsées)
  const colors = useMemo(() => ({
    bannerBackground: dark ? "#0F172A" : "#1E293B",
    textColor: "#FFFFFF",
    closeButtonColor: "rgba(255,255,255,0.8)",
    installButtonBg: dark ? "#818CF8" : "#4F46E5",
    installButtonHoverBg: dark ? "#6366F1" : "#4338CA",
    iconColor: dark ? "#A5B4FC" : "#C7D2FE",
    border: `1px solid ${
      dark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.2)"
    }`,
    boxShadow: dark
      ? "0 8px 24px rgba(0,0,0,0.5)"
      : "0 8px 24px rgba(0,0,0,0.25)",
  }), [dark]);

  // Style de base (mémoïsé)
  const bannerStyle = useMemo(
    () => ({
      position: "fixed",
      bottom: isMobile
        ? "calc(16px + env(safe-area-inset-bottom, 0px))"
        : 24,
      right: isMobile
        ? "calc(16px + env(safe-area-inset-right, 0px))"
        : 24,
      left: isMobile
        ? "calc(16px + env(safe-area-inset-left, 0px))"
        : "auto",
      zIndex: 900,
      background: colors.bannerBackground,
      color: colors.textColor,
      borderRadius: 16,
      padding: isMobile ? "14px 16px" : "16px 20px",
      display: "flex",
      alignItems: "center",
      gap: 12,
      boxShadow: colors.boxShadow,
      maxWidth: isMobile ? "none" : 420,
      width: isMobile ? "auto" : "calc(100% - 48px)",
      fontSize: 13,
      fontWeight: 500,
      border: colors.border,
      transform: visible ? "translateY(0)" : "translateY(120%)",
      opacity: visible ? 1 : 0,
      transition: "transform 0.3s ease, opacity 0.3s ease",
      overscrollBehavior: "contain",
    }),
    [isMobile, colors, visible]
  );

  // Garde-fous
  if (isInstalled) return null;
  if (visibleProp === false) return null;
  if (!platform || !visible) return null;

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
              style={{ color: colors.iconColor, flexShrink: 0 }}
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
              style={{ color: colors.iconColor, flexShrink: 0 }}
            />
            <span>Installer l'application sur l'écran d'accueil</span>
          </>
        )}
        {platform === "safari-mac" && (
          <>
            <Plus
              size={20}
              aria-hidden="true"
              style={{ color: colors.iconColor, flexShrink: 0 }}
            />
            <span>
              Safari : <strong>Fichier → Ajouter au Dock</strong> (ou à
              l'écran d'accueil)
            </span>
          </>
        )}
        {platform === "other" && (
          <>
            <MonitorSmartphone
              size={20}
              aria-hidden="true"
              style={{ color: colors.iconColor, flexShrink: 0 }}
            />
            <span style={{ flex: 1 }}>
              Installer l'application sur le bureau
            </span>
            <InstallButton
              onClick={handleInstall}
              installButtonBg={colors.installButtonBg}
              hoverBg={colors.installButtonHoverBg}
              isMobile={isMobile}
            />
          </>
        )}
        <CloseButton
          onClick={handleDismiss}
          color={colors.closeButtonColor}
        />
      </div>
    </>
  );
}