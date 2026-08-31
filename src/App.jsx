import { useState, useEffect, useMemo } from "react";
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
import { useTheme } from "../src/components/ThemeProvider"; // ✅ Chemin corrigé

// 🎨 SessionLoader avec animations soignées et responsivité
function SessionLoader({ message = "Vérification de votre session..." }) {
  const { dark } = useTheme();

  const styles = {
    container: {
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: "clamp(16px, 3vw, 24px)", // espacement responsive
      background: dark
        ? "rgba(15, 23, 42, 0.7)"
        : "rgba(248, 250, 252, 0.7)",
      backdropFilter: "blur(10px)",
      WebkitBackdropFilter: "blur(10px)",
      animation: "fadeInZoom 0.7s cubic-bezier(0.4, 0, 0.2, 1)",
      transition: "background-color 0.5s ease",
      borderRadius: "24px",
      padding: "clamp(20px, 5vw, 40px)", // padding responsive
      boxSizing: "border-box",
    },
    logo: {
      width: "clamp(100px, 25vw, 180px)", // logo agrandi et responsive
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
      fontSize: "clamp(14px, 2vw, 18px)", // texte responsive
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
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fadeInZoom {
          0% { opacity: 0; transform: scale(0.92) translateY(20px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes pulse {
          0% { opacity: 0.7; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.08); }
          100% { opacity: 0.7; transform: scale(1); }
        }
        @keyframes fadeInText {
          0% { opacity: 0; }
          100% { opacity: 1; }
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

function AppRoutes() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  const savedUser = localStorage.getItem("eduDiscipline_user");
  const parsedUser = useMemo(
    () => (savedUser ? JSON.parse(savedUser) : null),
    [savedUser]
  );

  const sessionQuery = useQuery(
    api.users.get,
    parsedUser?._id ? { userId: parsedUser._id } : "skip"
  );

  useEffect(() => {
    if (!savedUser) return;
    if (sessionQuery === undefined) return;

    const isValid =
      sessionQuery &&
      (sessionQuery.status === "active" || sessionQuery.status === undefined);
    if (isValid) {
      setUser(parsedUser);
    } else {
      localStorage.removeItem("eduDiscipline_user");
      setUser(null);
    }
  }, [savedUser, sessionQuery?.status, parsedUser]);

  const handleLogin = (userData) => {
    localStorage.setItem("eduDiscipline_user", JSON.stringify(userData));
    setUser(userData);
    navigate("/");
  };

  const handleLogout = () => {
    localStorage.removeItem("eduDiscipline_user");
    setUser(null);
    navigate("/login");
  };

  const ProtectedRoute = ({ children }) => {
    if (user === null) {
      if (savedUser && sessionQuery === undefined) {
        return <SessionLoader />;
      }
      return <Navigate to="/login" replace />;
    }
    return children;
  };

  if (savedUser && sessionQuery === undefined) {
    return <SessionLoader />;
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          user ? (
            <Navigate to="/" replace />
          ) : (
            <LoginScreen
              onLogin={handleLogin}
              onSwitchToRegister={() => navigate("/register")}
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
            <RegisterScreen onSwitchToLogin={() => navigate("/login")} />
          )
        }
      />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
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