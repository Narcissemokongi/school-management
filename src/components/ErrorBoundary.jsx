// src/components/ErrorBoundary.jsx
import { Component, useState, useEffect, useCallback } from "react";
import { useTheme } from "./ThemeProvider";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  AlertTriangle, RefreshCw, Home, Copy, Check,
  ChevronDown, ChevronUp,
} from "lucide-react";

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
// KEYFRAMES MODULE-LEVEL
// ════════════════════════════════════════════════════════════════════
const ErrorBoundaryKeyframes = (
  <style>{`
    @keyframes eb-fadeIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    @keyframes eb-pulse {
      0%   { box-shadow: 0 0 0 0 rgba(239,68,68,0.4); }
      70%  { box-shadow: 0 0 0 15px rgba(239,68,68,0); }
      100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
    }
    .eb-fade-in { animation: eb-fadeIn 0.5s ease-out; }
    .eb-pulse { animation: eb-pulse 2s infinite; }
    @media (prefers-reduced-motion: reduce) {
      .eb-fade-in, .eb-pulse { animation: none !important; }
    }
  `}</style>
);

// ════════════════════════════════════════════════════════════════════
// HOOK : prefers-reduced-motion
// ════════════════════════════════════════════════════════════════════
function usePrefersReducedMotion() {
  const [reduceMotion, setReduceMotion] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e) => setReduceMotion(e.matches);

    if (media.addEventListener) {
      media.addEventListener("change", handler);
      return () => media.removeEventListener("change", handler);
    } else if (media.addListener) {
      media.addListener(handler);
      return () => media.removeListener(handler);
    }
  }, []);

  return reduceMotion;
}

// ════════════════════════════════════════════════════════════════════
// PRESSABLE — feedback tap + focus ring via state React
// ════════════════════════════════════════════════════════════════════
function Pressable({
  onClick, style, children, disabled = false, type = "button",
  focusColor, ariaLabel, hoverStyle, ...rest
}) {
  const [pressed, setPressed] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      onPointerDown={() => !disabled && setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => { setPressed(false); setHovered(false); }}
      onPointerCancel={() => setPressed(false)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        ...TAP_BASE,
        transform: pressed
          ? "scale(0.97)"
          : hovered && !disabled
          ? "translateY(-2px)"
          : "translateY(0) scale(1)",
        transition: "transform 0.1s ease, background 0.2s",
        ...(focused && !disabled && focusColor ? FOCUS_RING(focusColor) : null),
        ...(hovered && !disabled && hoverStyle ? hoverStyle : null),
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════
// LIEN ACCUEIL — état React pour hover/focus
// ════════════════════════════════════════════════════════════════════
function HomeLink({ style, hoverStyle, focusColor, children }) {
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  return (
    <a
      href="/"
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => { setPressed(false); setHovered(false); }}
      onPointerCancel={() => setPressed(false)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        ...TAP_BASE,
        transform: pressed
          ? "scale(0.97)"
          : hovered
          ? "translateY(-2px)"
          : "translateY(0) scale(1)",
        transition: "transform 0.1s ease, background 0.2s",
        ...(focused && focusColor ? FOCUS_RING(focusColor) : null),
        ...(hovered && hoverStyle ? hoverStyle : null),
        ...style,
      }}
    >
      {children}
    </a>
  );
}

// ════════════════════════════════════════════════════════════════════
// AFFICHAGE DE L'ERREUR
// ════════════════════════════════════════════════════════════════════
function ErrorDisplay({
  error,
  onRetry,
  onReload,
  showDetailsInProduction = false,
}) {
  const { dark } = useTheme();
  const isMobile = useIsMobile();
  const reduceMotion = usePrefersReducedMotion();

  const [copied, setCopied] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const isDev = import.meta.env.DEV || showDetailsInProduction;

  const handleCopyError = useCallback(async () => {
    if (!error) return;
    try {
      await navigator.clipboard.writeText(error.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Silencieux : la copie peut échouer en contexte non sécurisé
    }
  }, [error]);

  // Styles adaptatifs
  const containerPadding = isMobile ? "24px 16px" : "32px 24px";
  const iconContainerSize = isMobile ? 72 : 88;
  const iconSize = isMobile ? 36 : 44;
  const titleFontSize = isMobile ? 22 : 28;
  const messageFontSize = isMobile ? 14 : 15;
  const errorBoxFontSize = isMobile ? 12 : 12;
  const errorBoxMaxWidth = isMobile ? "95%" : 500;
  const actionButtonPadding = isMobile ? "12px 16px" : "12px 24px";
  const actionButtonFontSize = 15;
  const actionsFlexDirection = isMobile ? "column" : "row";
  const actionsGap = isMobile ? 8 : 12;
  const actionsButtonWidth = isMobile ? "100%" : "auto";

  const primaryBg = dark ? "#818CF8" : "#4F46E5";
  const primaryBgHover = dark ? "#6366F1" : "#4338CA";
  const secondaryBg = dark ? "#1E293B" : "#FFFFFF";
  const secondaryBgHover = dark ? "#263142" : "#F1F5F9";
  const secondaryBorder = dark ? "#334155" : "#E2E8F0";

  return (
    <>
      {ErrorBoundaryKeyframes}
      <div
        role="alert"
        aria-live="assertive"
        className={reduceMotion ? "" : "eb-fade-in"}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          padding: containerPadding,
          textAlign: "center",
          background: dark ? "#0F172A" : "#F8FAFC",
          color: dark ? "#F1F5F9" : "#1E293B",
          transition: "background-color 0.3s, color 0.3s",
        }}
      >
        {/* Icône avec pulse */}
        <div
          aria-hidden="true"
          className={reduceMotion ? "" : "eb-pulse"}
          style={{
            width: iconContainerSize,
            height: iconContainerSize,
            borderRadius: "50%",
            background: dark ? "#1E293B" : "#FEE2E2",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: isMobile ? 16 : 24,
            boxShadow: dark
              ? "0 4px 12px rgba(0,0,0,0.3)"
              : "0 4px 12px rgba(0,0,0,0.1)",
          }}
        >
          <AlertTriangle size={iconSize} color="#EF4444" aria-hidden="true" />
        </div>

        <h1
          style={{
            fontSize: titleFontSize,
            fontWeight: 700,
            margin: "0 0 8px",
            color: dark ? "#F1F5F9" : "#1E293B",
          }}
        >
          Oups, une erreur est survenue
        </h1>
        <p
          style={{
            fontSize: messageFontSize,
            color: dark ? "#94A3B8" : "#64748B",
            marginBottom: isMobile ? 20 : 32,
            maxWidth: 460,
            lineHeight: 1.6,
          }}
        >
          Quelque chose s'est mal passé. Vous pouvez essayer de recharger la page
          ou revenir à l'accueil.
        </p>

        {/* Détails techniques */}
        {isDev && error && (
          <div
            style={{
              background: dark ? "#1E293B" : "#FEF2F2",
              color: dark ? "#FCA5A5" : "#B91C1C",
              padding: isMobile ? "10px 12px" : "12px 16px",
              borderRadius: 8,
              fontSize: errorBoxFontSize,
              fontFamily: "monospace",
              maxWidth: errorBoxMaxWidth,
              marginBottom: isMobile ? 16 : 24,
              textAlign: "left",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              position: "relative",
              border: `1px solid ${dark ? "#334155" : "#FECACA"}`,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span style={{ fontWeight: 600 }}>Détails techniques</span>
              <div style={{ display: "flex", gap: 4 }}>
                <Pressable
                  onClick={() => setShowDetails(!showDetails)}
                  focusColor="#EF4444"
                  ariaLabel={showDetails ? "Masquer les détails" : "Afficher les détails"}
                  aria-expanded={showDetails}
                  aria-controls="error-details"
                  style={{
                    background: "transparent",
                    border: "none",
                    color: dark ? "#94A3B8" : "#6B7280",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 12,
                    padding: "8px 10px",
                    minHeight: 44,
                    minWidth: 44,
                    borderRadius: 6,
                  }}
                >
                  {showDetails ? (
                    <ChevronUp size={14} aria-hidden="true" />
                  ) : (
                    <ChevronDown size={14} aria-hidden="true" />
                  )}
                  {showDetails ? "Masquer" : "Afficher"}
                </Pressable>
                <Pressable
                  onClick={handleCopyError}
                  focusColor="#EF4444"
                  ariaLabel="Copier les détails de l'erreur"
                  style={{
                    background: "transparent",
                    border: "none",
                    color: dark ? "#94A3B8" : "#6B7280",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 12,
                    padding: "8px 10px",
                    minHeight: 44,
                    minWidth: 44,
                    borderRadius: 6,
                  }}
                >
                  {copied ? (
                    <Check size={14} color="#10B981" aria-hidden="true" />
                  ) : (
                    <Copy size={14} aria-hidden="true" />
                  )}
                  {copied ? "Copié" : "Copier"}
                </Pressable>
              </div>
            </div>
            <div
              id="error-details"
              style={{
                marginTop: 8,
                maxHeight: 200,
                overflowY: "auto",
                display: showDetails ? "block" : "none",
                overscrollBehavior: "contain",
                WebkitOverflowScrolling: "touch",
              }}
            >
              {error.toString()}
            </div>
          </div>
        )}

        {/* Boutons d'action */}
        <div
          style={{
            display: "flex",
            flexDirection: actionsFlexDirection,
            gap: actionsGap,
            flexWrap: "wrap",
            justifyContent: "center",
            width: isMobile ? "100%" : "auto",
          }}
        >
          <Pressable
            onClick={onRetry}
            focusColor={primaryBg}
            hoverStyle={{ background: primaryBgHover }}
            ariaLabel="Réessayer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: actionButtonPadding,
              background: primaryBg,
              color: "#FFFFFF",
              border: "none",
              borderRadius: 12,
              fontSize: actionButtonFontSize,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: dark
                ? "0 4px 12px rgba(0,0,0,0.3)"
                : "0 4px 12px rgba(79,70,229,0.2)",
              width: actionsButtonWidth,
            }}
          >
            <RefreshCw size={20} aria-hidden="true" /> Réessayer
          </Pressable>

          <Pressable
            onClick={onReload}
            focusColor={primaryBg}
            hoverStyle={{ background: secondaryBgHover }}
            ariaLabel="Recharger la page"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: actionButtonPadding,
              background: secondaryBg,
              color: dark ? "#F1F5F9" : "#1E293B",
              border: `1px solid ${secondaryBorder}`,
              borderRadius: 12,
              fontSize: actionButtonFontSize,
              fontWeight: 500,
              cursor: "pointer",
              width: actionsButtonWidth,
            }}
          >
            <RefreshCw size={20} aria-hidden="true" /> Recharger
          </Pressable>

          <HomeLink
            focusColor={primaryBg}
            hoverStyle={{ background: secondaryBgHover }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: actionButtonPadding,
              background: secondaryBg,
              color: dark ? "#F1F5F9" : "#1E293B",
              border: `1px solid ${secondaryBorder}`,
              borderRadius: 12,
              fontSize: actionButtonFontSize,
              fontWeight: 500,
              textDecoration: "none",
              cursor: "pointer",
              width: actionsButtonWidth,
            }}
          >
            <Home size={20} aria-hidden="true" /> Accueil
          </HomeLink>
        </div>
      </div>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════
// ERROR BOUNDARY (class component)
// ════════════════════════════════════════════════════════════════════
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    if (import.meta.env.DEV) {
      console.error("[ErrorBoundary] caught:", error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorDisplay
          error={this.state.error}
          onRetry={this.handleRetry}
          onReload={this.handleReload}
          showDetailsInProduction={this.props.showDetailsInProduction}
        />
      );
    }
    return this.props.children;
  }
}