import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useTheme } from "./ThemeProvider";
import { useInstallPrompt, InstallBanner } from "./InstallBanner";
import { LoginScreen } from "./LoginScreen";
import { RegisterScreen } from "./RegisterScreen";
import { AuthenticatedApp } from "./AuthenticatedApp";
import { Toaster } from "react-hot-toast";
import { useIsMobile } from "@/hooks/useIsMobile";
import "../fonts.css";

// ============================================================
// STORAGE HELPERS
// ============================================================
const STORAGE_KEY = "eduDiscipline_user";

function readSavedUser() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Validation minimale : doit avoir un _id
    if (!parsed || typeof parsed !== "object" || !parsed._id) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    // JSON corrompu → on nettoie
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function writeSavedUser(user) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } catch {
    // Silencieux : quota dépassé, mode privé, etc.
  }
}

function clearSavedUser() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Silencieux
  }
}

// ============================================================
// APP CONTENT
// ============================================================
export function AppContent() {
  // ✨ FIX #2 : user initialisé DIRECTEMENT depuis localStorage
  // → app affichée instantanément, plus d'écran de chargement
  const [savedUser] = useState(readSavedUser);
  const [user, setUser] = useState(savedUser);
  const [showRegister, setShowRegister] = useState(false);
  const [loadingSession, setLoadingSession] = useState(!savedUser);

  const { dark } = useTheme();
  const isMobile = useIsMobile();

  const { deferredPrompt, isInstalled, promptInstall, dismissPrompt } =
    useInstallPrompt();

  const savedUserId = savedUser?._id ?? null;

  // ✅ Query session (skip si pas d'user)
  const sessionQuery = useQuery(
    api.users.get,
    savedUserId ? { userId: savedUserId } : "skip"
  );

  // ════════════════════════════════════════════════════════════════════
  // ✨ FIX #1 : Vérification de session ROBUSTE
  //
  // Avant : si Convex retournait `null` au cold start (WS pas encore
  //         connecté), on DÉCONNECTAIT l'utilisateur par erreur.
  //
  // Après : on garde la session optimiste, on ne déconnecte QUE sur
  //         signal explicite (`status: "suspended"`, etc.)
  // ════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!savedUserId) {
      setLoadingSession(false);
      setUser(null);
      return;
    }

    // Pas encore de réponse Convex → on laisse la session optimiste
    if (sessionQuery === undefined) return;

    // 🔴 FIX CRITIQUE : Convex retourne null au cold start ?
    // On NE déconnecte PAS — on attend le prochain passage
    if (sessionQuery === null) {
      console.warn(
        "[AppContent] User introuvable côté Convex (cold start?) — session conservée"
      );
      return;
    }

    // Status explicitement mauvais → déconnexion justifiée
    if (
      sessionQuery.status === "suspended" ||
      sessionQuery.status === "blocked" ||
      sessionQuery.status === "deleted" ||
      sessionQuery.isActive === false
    ) {
      console.warn(
        `[AppContent] Session invalide (status: ${sessionQuery.status}) — déconnexion`
      );
      clearSavedUser();
      setUser(null);
      setLoadingSession(false);
      return;
    }

    // Status OK → on rafraîchit les infos du user
    if (sessionQuery.status === "active") {
      setUser({ ...savedUser, ...sessionQuery });
      // Écriture silencieuse pour la prochaine session
      writeSavedUser({ ...savedUser, ...sessionQuery });
    }

    setLoadingSession(false);
  }, [savedUserId, sessionQuery, savedUser]);

  // ===== Handlers =====
  const handleLogin = useCallback((userData) => {
    if (!userData || !userData._id) {
      // Sécurité : ne jamais stocker un user sans _id
      return;
    }
    writeSavedUser(userData);
    setUser(userData);
  }, []);

  const handleLogout = useCallback(() => {
    clearSavedUser();
    setUser(null);
    setShowRegister(false);
  }, []);

  // ============================================================
  // LOADING SESSION
  // (uniquement pour le tout premier boot sans cache)
  // ============================================================
  if (loadingSession && !user) {
    return (
      <>
        <style>{`
          @keyframes appc-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          .appc-spin { animation: appc-spin 0.8s linear infinite; }
          @media (prefers-reduced-motion: reduce) {
            .appc-spin { animation: none !important; }
          }
        `}</style>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: dark ? "#0F172A" : "#F3F4F6",
            padding: isMobile ? "16px" : "0",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div
              className="appc-spin"
              style={{
                width: 40,
                height: 40,
                border: `3px solid ${
                  dark ? "rgba(129,140,248,0.2)" : "rgba(79,70,229,0.2)"
                }`,
                borderTopColor: dark ? "#818CF8" : "#4F46E5",
                borderRadius: "50%",
                margin: "0 auto 16px",
              }}
            />
            <p
              style={{
                color: dark ? "#CBD5E1" : "#64748B",
                fontSize: isMobile ? 14 : 16,
              }}
            >
              Chargement de la session...
            </p>
          </div>
        </div>
      </>
    );
  }

  // ============================================================
  // RENDU
  // ============================================================
  return (
    <>
      <Toaster
        position={isMobile ? "top-center" : "top-right"}
        toastOptions={{
          style: {
            background: dark ? "#1E293B" : "#FFFFFF",
            color: dark ? "#F1F5F9" : "#1E293B",
            fontSize: isMobile ? 14 : 16,
          },
        }}
      />

      {deferredPrompt && !isInstalled && (
        <InstallBanner
          onInstall={promptInstall}
          onDismiss={dismissPrompt}
        />
      )}

      {/* ✨ FIX #3 : plus de `key={user._id}` — évite les remounts inutiles */}
      {user ? (
        <AuthenticatedApp
          user={user}
          handleLogout={handleLogout}
        />
      ) : showRegister ? (
        <RegisterScreen onSwitchToLogin={() => setShowRegister(false)} />
      ) : (
        <LoginScreen
          onLogin={handleLogin}
          onSwitchToRegister={() => setShowRegister(true)}
        />
      )}
    </>
  );
}