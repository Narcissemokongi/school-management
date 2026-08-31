import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useTheme } from "./ThemeProvider";
import { useInstallPrompt, InstallBanner } from "./InstallBanner";
import { LoginScreen } from "./LoginScreen";
import { RegisterScreen } from "./RegisterScreen";
import { AuthenticatedApp } from "./AuthenticatedApp";
import { Toaster } from "react-hot-toast";
import { useIsMobile } from "../hooks/useIsMobile"; // <-- Import du hook
import "../fonts.css";

export function AppContent() {
  const [user, setUser] = useState(null);
  const [showRegister, setShowRegister] = useState(false);
  const [loadingSession, setLoadingSession] = useState(true);

  const { dark } = useTheme(); // Récupération du mode sombre
  const isMobile = useIsMobile(); // Détection mobile

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
        background: dark ? "#0F172A" : "#F3F4F6",
        padding: isMobile ? "16px" : "0",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: 40,
            height: 40,
            border: `3px solid ${dark ? "rgba(129,140,248,0.2)" : "rgba(79,70,229,0.2)"}`,
            borderTopColor: dark ? "#818CF8" : "#4F46E5",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
            margin: "0 auto 16px",
          }} />
          <p style={{ color: dark ? "#CBD5E1" : "#64748B", fontSize: isMobile ? 14 : 16 }}>
            Chargement de la session...
          </p>
        </div>
      </div>
    );
  }

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