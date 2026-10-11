// src/main.jsx

// ✅ vConsole — debug iOS (à retirer après diagnostic)
import VConsole from "vconsole";
if (import.meta.env.PROD) {
  new VConsole({ theme: "dark" });
}

import React from "react";
import ReactDOM from "react-dom/client";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ThemeProvider } from "./components/ThemeProvider";
import { ErrorBoundary } from "./components/ErrorBoundary";
import App from "./App";
import toast from "react-hot-toast";
import "./fonts.css";
import "./index.css";
import "./App.css";
import "./lib/pdfWorker";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

// ✨ FIX : handler de rejet de promesse — LOG UNIQUEMENT, pas de reload
window.addEventListener("unhandledrejection", (event) => {
  console.error("[Global] Erreur réseau non gérée :", event.reason);

  // Ignore les erreurs transitoires connues (cold start Convex, WS disconnect)
  const msg = String(event.reason?.message || event.reason || "");
  const isTransient =
    msg.includes("WebSocket") ||
    msg.includes("network") ||
    msg.includes("fetch failed") ||
    msg.includes("Convex") ||
    msg.includes("timeout");

  if (!isTransient) {
    toast.error("Une erreur réseau est survenue. Veuillez réessayer.", {
      duration: 5000,
      id: "network-error",
    });
  }

  event.preventDefault();
});

// ✨ FIX : handler d'erreur globale — LOG UNIQUEMENT, PAS de reload auto
window.addEventListener("error", (event) => {
  console.error("[Global] Erreur globale :", event.error);

  // ⚠️ On ne recharge PLUS la page automatiquement.
  // React ErrorBoundary gère déjà les erreurs de rendu.

  toast.error(
    "Une erreur est survenue. Veuillez rafraîchir si le problème persiste.",
    {
      duration: 5000,
      id: "global-error",
    }
  );
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider>
      <ErrorBoundary>
        <ConvexProvider client={convex}>
          <App />
        </ConvexProvider>
      </ErrorBoundary>
    </ThemeProvider>
  </React.StrictMode>
);