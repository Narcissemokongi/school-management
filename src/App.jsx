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

// ════════════════════════════════════════════════════════════════════
// CONSTANTES MODULE-LEVEL
// ════════════════════════════════════════════════════════════════════
const STORAGE_KEY = "eduDiscipline_user";

/**
 * ✅ Lit et valide l'utilisateur depuis localStorage.
 * Retourne null si absent/corrompu.
 */
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
// ✅ FIX PERF MAJEUR — ProtectedRoute au MODULE-LEVEL
//
// Avant : défini DANS AppRoutes → nouvelle fonction à chaque render
//         → React voit un "nouveau composant" → démonte/remonte
//         tout l'arbre AuthenticatedApp → tous les useQuery Convex
//         re-fetch → spinner infini → LENTEUR.
//
// Après : composant stable → React réutilise le sous-arbre
//         → queries en cache → navigation instantanée.
// ════════════════════════════════════════════════════════════════════
function ProtectedRoute({ user, sessionChecked, children }) {
  // Session pas encore vérifiée → loader
  if (!sessionChecked) {
    return <SessionLoader />;
  }
  // Session vérifiée et user null → login
  if (user === null) {
    return <Navigate to="/login" replace />;
  }
  // Session OK → contenu
  return children;
}

// ════════════════════════════════════════════════════════════════════
// APP ROUTES
// ════════════════════════════════════════════════════════════════════
function AppRoutes() {
  const navigate = useNavigate();

  // ✅ FIX PERF — `savedUser` lu UNE SEULE FOIS au mount (pas à chaque render)
  // Avant : `localStorage.getItem` sur chaque render + `useMemo` inutile
  //         + `parsedUser` nouvelle référence → boucle infinie dans useEffect
  const [savedUser] = useState(readSavedUser);
  const savedUserId = savedUser?._id ?? null;

  const [user, setUser] = useState(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  // ✅ Query session — args stables
  const sessionArgs = useMemo(
    () => (savedUserId ? { userId: savedUserId } : "skip"),
    [savedUserId]
  );
  const sessionQuery = useQuery(api.users.get, sessionArgs);

  // ✅ FIX PERF — Dépendances stables
  // Avant : dep `parsedUser` (nouvelle ref) + `savedUser` (nouvelle string)
  //         → effect tournait à chaque render → setUser → boucle
  // Après : deps stables → effect tourne 1-2 fois max
  useEffect(() => {
    if (!savedUserId) {
      setSessionChecked(true);
      return;
    }
    if (sessionQuery === undefined) return; // attente Convex

    const isValid =
      sessionQuery &&
      sessionQuery._id &&
      sessionQuery.status === "active";

    if (isValid) {
      setUser(savedUser);
    } else {
      // Session invalide → on nettoie
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
      setUser(null);
    }
    setSessionChecked(true);
  }, [savedUserId, sessionQuery, savedUser]);

  // ════════════════════════════════════════════════════════════════════
  // HANDLERS (stables)
  // ════════════════════════════════════════════════════════════════════
  const handleLogin = useCallback(
    (userData) => {
      if (!userData || !userData._id) return;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
      } catch {}
      setUser(userData);

      // ✅ Redirection selon rôle — une seule navigation
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
    navigate("/login");
  }, [navigate]);

  // ✅ Handlers de navigation stables (évite re-création à chaque render)
  const goToRegister = useCallback(() => navigate("/register"), [navigate]);
  const goToLogin = useCallback(() => navigate("/login"), [navigate]);

  // ════════════════════════════════════════════════════════════════════
  // RENDU
  // ════════════════════════════════════════════════════════════════════
  return (
    <Routes>
      {/* ═══════════ AUTH ═══════════ */}
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

      {/* ═══════════ REDIRECT — /super-admin (sans section) ═══════════ */}
      <Route
        path="/super-admin"
        element={<Navigate to="/super-admin/overview" replace />}
      />

      {/* ═══════════ ROUTE GLOBALE ═══════════ */}
      <Route
        path="/*"
        element={
          <ProtectedRoute user={user} sessionChecked={sessionChecked}>
            <AuthenticatedApp user={user} handleLogout={handleLogout} />
          </ProtectedRoute>
        }
      />

      {/* ═══════════ 404 ═══════════ */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

// ════════════════════════════════════════════════════════════════════
// APP
// ════════════════════════════════════════════════════════════════════
export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}