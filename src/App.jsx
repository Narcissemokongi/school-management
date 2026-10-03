// src/App.jsx
import { useState, useEffect, useMemo, useCallback } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { LoginScreen } from "./components/LoginScreen";
import { RegisterScreen } from "./components/RegisterScreen";
import { AuthenticatedApp } from "./components/AuthenticatedApp";
import { NotFound } from "./components/NotFound";
import { Loader } from "lucide-react";
import logo from "../resources/icon.png";
import { useTheme } from "../src/components/ThemeProvider";

// ⚠️ IMPORT TEMPORAIRE — À RETIRER après validation du design system
import { UIShowcase } from "./components/UIShowcase";

// ════════════════════════════════════════════════════════════════════
// CONSTANTES MODULE-LEVEL
// ════════════════════════════════════════════════════════════════════
const STORAGE_KEY = "eduDiscipline_user";

// ✅ FIX SÉCURITÉ : durée de session maximale (8h)
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

function readSavedUser() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !parsed._id) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    if (parsed._sessionExpires && Date.now() > parsed._sessionExpires) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

// ════════════════════════════════════════════════════════════════════
// SESSION LOADER
// ════════════════════════════════════════════════════════════════════
function SessionLoader({ message = "Vérification de votre session..." }) {
  const { dark } = useTheme();

  const styles = {
    container: {
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: "clamp(16px, 3vw, 24px)",
      background: dark
        ? "rgba(15, 23, 42, 0.7)"
        : "rgba(248, 250, 252, 0.7)",
      backdropFilter: "blur(10px)",
      WebkitBackdropFilter: "blur(10px)",
      animation: "fadeInZoom 0.7s cubic-bezier(0.4, 0, 0.2, 1)",
      transition: "background-color 0.5s ease",
      borderRadius: "24px",
      padding: "clamp(20px, 5vw, 40px)",
      boxSizing: "border-box",
    },
    logo: {
      width: "clamp(100px, 25vw, 180px)",
      height: "auto",
      animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      filter: dark
        ? "drop-shadow(0 0 20px rgba(129, 140, 248, 0.5))"
        : "drop-shadow(0 0 20px rgba(79, 70, 229, 0.3))",
      borderRadius: "50%",
    },
    spinnerWrapper: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    spinner: {
      color: dark ? "#818cf8" : "#4f46e5",
      animation: "spin 1.2s linear infinite",
    },
    message: {
      fontSize: "clamp(14px, 2vw, 18px)",
      color: dark ? "#e2e8f0" : "#64748b",
      transition: "color 0.5s ease",
      animation: "fadeInText 1s ease-out 0.3s both",
      letterSpacing: "0.5px",
      fontWeight: 500,
      textAlign: "center",
    },
  };

  return (
    <div style={styles.container}>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeInZoom { 0% { opacity: 0; transform: scale(0.92) translateY(20px); } 100% { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes pulse { 0% { opacity: 0.7; transform: scale(1); } 50% { opacity: 1; transform: scale(1.08); } 100% { opacity: 0.7; transform: scale(1); } }
        @keyframes fadeInText { 0% { opacity: 0; } 100% { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) {
          .appc-spin, [style*="animation"] { animation: none !important; }
        }
      `}</style>
      <img src={logo} alt="Logo" style={styles.logo} />
      <div style={styles.spinnerWrapper}>
        <Loader size={36} style={styles.spinner} />
      </div>
      <p style={styles.message}>{message}</p>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// PROTECTED ROUTE
// ════════════════════════════════════════════════════════════════════
function ProtectedRoute({ user, sessionChecked, children }) {
  if (!sessionChecked) {
    return <SessionLoader />;
  }
  if (user === null) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

// ════════════════════════════════════════════════════════════════════
// APP ROUTES
// ════════════════════════════════════════════════════════════════════
function AppRoutes() {
  const navigate = useNavigate();

  // ✨ FIX #1 : user initialisé DIRECTEMENT depuis localStorage
  // → app affichée instantanément, plus d'écran de chargement
  const [savedUser] = useState(readSavedUser);
  const [user, setUser] = useState(savedUser);
  const [sessionChecked, setSessionChecked] = useState(!savedUser);

  const savedUserId = savedUser?._id ?? null;

  const sessionArgs = useMemo(
    () => (savedUserId ? { userId: savedUserId } : "skip"),
    [savedUserId]
  );
  const sessionQuery = useQuery(api.users.get, sessionArgs);

  // ✨ FIX #2 : ne JAMAIS déconnecter sur cold start Convex
  useEffect(() => {
    if (!savedUserId) {
      setSessionChecked(true);
      return;
    }

    // Pas encore de réponse Convex → on garde la session optimiste
    if (sessionQuery === undefined) return;

    // 🔴 FIX CRITIQUE : Convex retourne null au cold start ?
    // On NE déconnecte PAS — session conservée
    if (sessionQuery === null) {
      console.warn(
        "[App] User introuvable côté Convex (cold start?) — session conservée"
      );
      setSessionChecked(true);
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
        `[App] Session invalide (status: ${sessionQuery.status}) — déconnexion`
      );
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
      setUser(null);
      setSessionChecked(true);
      return;
    }

    // Status OK → on rafraîchit les infos du user
    if (sessionQuery.status === "active") {
      const merged = { ...savedUser, ...sessionQuery };
      setUser(merged);
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            ...merged,
            _sessionExpires:
              savedUser._sessionExpires || Date.now() + SESSION_TTL_MS,
          })
        );
      } catch {}
    }

    setSessionChecked(true);
  }, [savedUserId, sessionQuery, savedUser]);

  const handleLogin = useCallback(
    (userData) => {
      if (!userData || !userData._id) return;
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            ...userData,
            _sessionExpires: Date.now() + SESSION_TTL_MS,
          })
        );
      } catch {}
      setUser(userData);
      setSessionChecked(true);

      const role = userData?.role;
      if (role === "superAdmin" || (role === "admin" && !userData.ecoleId)) {
        navigate("/super-admin/overview");
      } else {
        navigate("/");
      }
    },
    [navigate]
  );

  const handleLogout = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    setUser(null);
    setSessionChecked(true);
    navigate("/login");
  }, [navigate]);

  const goToRegister = useCallback(() => navigate("/register"), [navigate]);
  const goToLogin = useCallback(() => navigate("/login"), [navigate]);

  return (
    <Routes>
      {import.meta.env.DEV && (
        <Route path="/ui-showcase" element={<UIShowcase />} />
      )}

      <Route
        path="/login"
        element={
          user ? (
            <Navigate to="/" replace />
          ) : (
            <LoginScreen
              onLogin={handleLogin}
              onSwitchToRegister={goToRegister}
            />
          )
        }
      />
      <Route
        path="/register"
        element={
          user ? (
            <Navigate to="/" replace />
          ) : (
            <RegisterScreen onSwitchToLogin={goToLogin} />
          )
        }
      />

      <Route
        path="/super-admin"
        element={<Navigate to="/super-admin/overview" replace />}
      />

      <Route
        path="/*"
        element={
          <ProtectedRoute user={user} sessionChecked={sessionChecked}>
            <AuthenticatedApp user={user} handleLogout={handleLogout} />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}