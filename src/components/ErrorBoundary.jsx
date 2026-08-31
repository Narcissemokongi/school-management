import { Component, useState } from "react";
import { useTheme } from "./ThemeProvider";
import { useIsMobile } from "../hooks/useIsMobile"; // <-- Import du hook
import { AlertTriangle, RefreshCw, Home, Copy, Check, ChevronDown, ChevronUp } from "lucide-react";

// Composant d'affichage avec thème et animations
function ErrorDisplay({ error, onRetry, onReload, showDetailsInProduction = false }) {
  const { dark } = useTheme();
  const isMobile = useIsMobile(); // Détection mobile
  const [copied, setCopied] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const isDev = import.meta.env.DEV || showDetailsInProduction;
  const [reduceMotion, setReduceMotion] = useState(false);

  // Détecter la préférence de mouvement
  useState(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(media.matches);
    const handler = (e) => setReduceMotion(e.matches);
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  });

  const handleCopyError = async () => {
    if (!error) return;
    try {
      await navigator.clipboard.writeText(error.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignorer
    }
  };

  // Styles adaptatifs
  const containerPadding = isMobile ? "24px 16px" : "32px 24px";
  const iconContainerSize = isMobile ? 72 : 88;
  const iconSize = isMobile ? 36 : 44;
  const titleFontSize = isMobile ? 22 : 28;
  const messageFontSize = isMobile ? 14 : 15;
  const errorBoxFontSize = isMobile ? 11 : 12;
  const errorBoxMaxWidth = isMobile ? "95%" : 500;
  const actionButtonPadding = isMobile ? "12px 16px" : "12px 24px";
  const actionButtonFontSize = isMobile ? 15 : 15;
  const actionsFlexDirection = isMobile ? "column" : "row";
  const actionsGap = isMobile ? 8 : 12;
  const actionsButtonWidth = isMobile ? "100%" : "auto";

  return (
    <div
      role="alert"
      aria-live="assertive"
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
        animation: reduceMotion ? "none" : "fadeIn 0.5s ease-out",
      }}
    >
      <div
        style={{
          width: iconContainerSize,
          height: iconContainerSize,
          borderRadius: "50%",
          background: dark ? "#1E293B" : "#FEE2E2",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: isMobile ? 16 : 24,
          boxShadow: dark ? "0 4px 12px rgba(0,0,0,0.3)" : "0 4px 12px rgba(0,0,0,0.1)",
          animation: reduceMotion ? "none" : "pulse 2s infinite",
        }}
      >
        <AlertTriangle size={iconSize} color="#EF4444" />
      </div>

      <h1 style={{ fontSize: titleFontSize, fontWeight: 700, margin: "0 0 8px", color: dark ? "#F1F5F9" : "#1E293B" }}>
        Oups, une erreur est survenue
      </h1>
      <p style={{ fontSize: messageFontSize, color: dark ? "#94A3B8" : "#64748B", marginBottom: isMobile ? 20 : 32, maxWidth: 460, lineHeight: 1.6 }}>
        Quelque chose s'est mal passé. Vous pouvez essayer de recharger la page ou revenir à l'accueil.
      </p>

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
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 600 }}>Détails techniques</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setShowDetails(!showDetails)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: dark ? "#94A3B8" : "#6B7280",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 11,
                }}
                aria-expanded={showDetails}
                aria-controls="error-details"
              >
                {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {showDetails ? "Masquer" : "Afficher"}
              </button>
              <button
                onClick={handleCopyError}
                style={{
                  background: "transparent",
                  border: "none",
                  color: dark ? "#94A3B8" : "#6B7280",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 11,
                }}
                aria-label="Copier les détails de l'erreur"
              >
                {copied ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
                {copied ? "Copié" : "Copier"}
              </button>
            </div>
          </div>
          <div id="error-details" style={{ marginTop: 8, maxHeight: 200, overflowY: "auto", display: showDetails ? "block" : "none" }}>
            {error.toString()}
          </div>
        </div>
      )}

      <div style={{
        display: "flex",
        flexDirection: actionsFlexDirection,
        gap: actionsGap,
        flexWrap: "wrap",
        justifyContent: "center",
        width: isMobile ? "100%" : "auto",
      }}>
        <button
          onClick={onRetry}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: actionButtonPadding,
            background: dark ? "#818CF8" : "#4F46E5",
            color: "#FFFFFF",
            border: "none",
            borderRadius: 12,
            fontSize: actionButtonFontSize,
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: dark ? "0 4px 12px rgba(0,0,0,0.3)" : "0 4px 12px rgba(79,70,229,0.2)",
            transition: "background 0.2s, transform 0.1s",
            width: actionsButtonWidth,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = dark ? "#6366F1" : "#4338CA";
            e.currentTarget.style.transform = "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = dark ? "#818CF8" : "#4F46E5";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          <RefreshCw size={20} /> Réessayer
        </button>
        <button
          onClick={onReload}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: actionButtonPadding,
            background: dark ? "#1E293B" : "#FFFFFF",
            color: dark ? "#F1F5F9" : "#1E293B",
            border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
            borderRadius: 12,
            fontSize: actionButtonFontSize,
            fontWeight: 500,
            textDecoration: "none",
            cursor: "pointer",
            transition: "background 0.2s, transform 0.1s",
            width: actionsButtonWidth,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = dark ? "#263142" : "#F1F5F9";
            e.currentTarget.style.transform = "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = dark ? "#1E293B" : "#FFFFFF";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          <RefreshCw size={20} /> Recharger
        </button>
        <a
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: actionButtonPadding,
            background: dark ? "#1E293B" : "#FFFFFF",
            color: dark ? "#F1F5F9" : "#1E293B",
            border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
            borderRadius: 12,
            fontSize: actionButtonFontSize,
            fontWeight: 500,
            textDecoration: "none",
            cursor: "pointer",
            transition: "background 0.2s, transform 0.1s",
            width: actionsButtonWidth,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = dark ? "#263142" : "#F1F5F9";
            e.currentTarget.style.transform = "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = dark ? "#1E293B" : "#FFFFFF";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          <Home size={20} /> Accueil
        </a>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(239,68,68,0.4); }
          70% { box-shadow: 0 0 0 15px rgba(239,68,68,0); }
          100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
        }
      `}</style>
    </div>
  );
}

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
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