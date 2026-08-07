import React from "react";
import ReactDOM from "react-dom/client";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ThemeProvider } from "./components/ThemeProvider";
import { ErrorBoundary } from "./components/ErrorBoundary";
import App from "./App";   // ← import par défaut corrigé
import toast from "react-hot-toast";
import "./index.css";


const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

// Gestion globale des erreurs réseau non capturées
window.addEventListener("unhandledrejection", (event) => {
  console.error("Erreur réseau non gérée :", event.reason);
  toast.error("Une erreur réseau est survenue. Veuillez réessayer.", { duration: 5000 });
  event.preventDefault();
});

window.addEventListener("error", (event) => {
  console.error("Erreur globale :", event.error);
  toast.error("Une erreur inattendue est survenue. La page va se recharger.", { duration: 5000 });
  setTimeout(() => window.location.reload(), 3000);
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <ConvexProvider client={convex}>
          <App />
        </ConvexProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
);