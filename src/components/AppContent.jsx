import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useTheme } from "./ThemeProvider";
import { useInstallPrompt, InstallBanner } from "./InstallBanner";
import { LoginScreen } from "./LoginScreen";
import { RegisterScreen } from "./RegisterScreen";
import { AuthenticatedApp } from "./AuthenticatedApp";
import { Toaster } from "react-hot-toast";
import "../fonts.css";

export function AppContent() {
  const [user, setUser] = useState(null);
  const [showRegister, setShowRegister] = useState(false);
  const [loadingSession, setLoadingSession] = useState(true);

  const { deferredPrompt, isInstalled, promptInstall, dismissPrompt } = useInstallPrompt();

  // Vérifier la session au chargement
  const savedUser = localStorage.getItem('eduDiscipline_user');
  const parsedUser = savedUser ? JSON.parse(savedUser) : null;
  const sessionQuery = useQuery(
    api.users.get,
    parsedUser?._id ? { userId: parsedUser._id } : "skip"
  );

  useEffect(() => {
    if (savedUser) {
      if (sessionQuery === undefined) {
        // en cours de chargement
        return;
      }
      if (sessionQuery && sessionQuery.status === "active") {
        setUser(parsedUser);
      } else {
        localStorage.removeItem('eduDiscipline_user');
        setUser(null);
      }
    }
    setLoadingSession(false);
  }, [savedUser, sessionQuery]);

  const handleLogin = (userData) => {
    localStorage.setItem('eduDiscipline_user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('eduDiscipline_user');
    setUser(null);
  };

  if (loadingSession) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#F3F4F6",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: 40,
            height: 40,
            border: "3px solid rgba(79,70,229,0.2)",
            borderTopColor: "#4F46E5",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
            margin: "0 auto 16px",
          }} />
          <p style={{ color: "#64748B" }}>Chargement de la session...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-right" />

      {deferredPrompt && !isInstalled && <InstallBanner onInstall={promptInstall} onDismiss={dismissPrompt} />}

      {user ? (
        <AuthenticatedApp key={user._id} user={user} handleLogout={handleLogout} />
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