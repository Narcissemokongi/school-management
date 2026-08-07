import { Home, Search } from "lucide-react";

export function NotFound() {
  // Récupération du thème (peut être adaptée si vous utilisez un contexte)
  const dark = localStorage.getItem("theme") === "dark";

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 24px",
        textAlign: "center",
        background: dark ? "#0F172A" : "#F8FAFC",
        color: dark ? "#F1F5F9" : "#1E293B",
        transition: "background-color 0.3s, color 0.3s",
      }}
    >
      {/* Icône principale */}
      <div
        style={{
          width: 100,
          height: 100,
          borderRadius: "50%",
          background: dark ? "#1E293B" : "#EEF2FF",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 24,
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        }}
      >
        <Search size={48} color="#4F46E5" />
      </div>

      {/* Titre */}
      <h1
        style={{
          fontSize: 72,
          fontWeight: 900,
          color: "#4F46E5",
          margin: "0 0 8px",
          lineHeight: 1,
        }}
      >
        404
      </h1>

      {/* Sous-titre */}
      <h2
        style={{
          fontSize: 24,
          fontWeight: 600,
          color: dark ? "#CBD5E1" : "#1E293B",
          margin: "0 0 8px",
        }}
      >
        Page introuvable
      </h2>

      {/* Description */}
      <p
        style={{
          fontSize: 14,
          color: dark ? "#94A3B8" : "#64748B",
          marginBottom: 32,
          maxWidth: 360,
        }}
      >
        Désolé, la page que vous recherchez n'existe pas ou a été déplacée.
        Veuillez vérifier l'URL ou retourner à l'accueil.
      </p>

      {/* Bouton de retour */}
      <a
        href="/"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "12px 24px",
          background: "#4F46E5",
          color: "#FFFFFF",
          borderRadius: 12,
          textDecoration: "none",
          fontWeight: 600,
          fontSize: 14,
          boxShadow: "0 4px 12px rgba(79,70,229,0.2)",
          transition: "background 0.2s, transform 0.1s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "#4338CA")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "#4F46E5")}
      >
        <Home size={20} /> Retour à l'accueil
      </a>
    </div>
  );
}