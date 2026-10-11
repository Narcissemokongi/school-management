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

// ✅ Gestion des chunks obsolètes (déploiement + PWA)
window.addEventListener('vite:preloadError', (event) => {
  const key = 'app-chunk-reload-at';
  let last = 0;
  try {
    last = Number(sessionStorage.getItem(key) || 0);
  } catch {
    return;
  }
  if (Date.now() - last < 10_000) return;

  try {
    sessionStorage.setItem(key, String(Date.now()));
  } catch {
    /* ignore */
  }

  event.preventDefault();
  window.location.reload();
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("[Global] Erreur réseau non gérée :", event.reason);
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

window.addEventListener("error", (event) => {
  console.error("[Global] Erreur globale :", event.error);
  toast.error(
    "Une erreur est survenue. Veuillez rafraîchir si le problème persiste.",
    { duration: 5000, id: "global-error" }
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