import { Component } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Récupération du thème (fallback sur localStorage)
      const dark = localStorage.getItem("theme") === "dark";
      const isDev = import.meta.env.DEV;

      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "32px 24px",
            textAlign: "center",
            background: dark ? "#0F172A" : "#F8FAFC",
            color: dark ? "#F1F5F9" : "#1E293B",
            transition: "background-color 0.3s, color 0.3s",
          }}
        >
          {/* Icône d'erreur */}
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: "50%",
              background: dark ? "#1E293B" : "#FEE2E2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 24,
            }}
          >
            <AlertTriangle size={44} color="#EF4444" />
          </div>

          <h1
            style={{
              fontSize: 28,
              fontWeight: 700,
              margin: "0 0 8px",
              color: dark ? "#F1F5F9" : "#1E293B",
            }}
          >
            Oups, une erreur est survenue
          </h1>
          <p
            style={{
              fontSize: 15,
              color: dark ? "#94A3B8" : "#64748B",
              marginBottom: 32,
              maxWidth: 460,
              lineHeight: 1.6,
            }}
          >
            Quelque chose s'est mal passé. Vous pouvez essayer de recharger la
            page ou revenir à l'accueil.
          </p>

          {/* Détails de l'erreur (mode développement uniquement) */}
          {isDev && this.state.error && (
            <div
              style={{
                background: dark ? "#1E293B" : "#FEF2F2",
                color: dark ? "#FCA5A5" : "#B91C1C",
                padding: "12px 16px",
                borderRadius: 8,
                fontSize: 12,
                fontFamily: "monospace",
                maxWidth: 500,
                marginBottom: 24,
                textAlign: "left",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {this.state.error.toString()}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={this.handleReload}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "12px 24px",
                background: "#4F46E5",
                color: "#FFFFFF",
                border: "none",
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(79,70,229,0.2)",
              }}
            >
              <RefreshCw size={20} /> Recharger la page
            </button>
            <a
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "12px 24px",
                background: dark ? "#1E293B" : "#FFFFFF",
                color: dark ? "#F1F5F9" : "#1E293B",
                border: "1px solid #E2E8F0",
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 500,
                textDecoration: "none",
                cursor: "pointer",
              }}
            >
              <Home size={20} /> Accueil
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}