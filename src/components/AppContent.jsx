import { useState } from "react";
import { useTheme } from "./ThemeProvider";
import { useInstallPrompt, InstallBanner } from "./InstallBanner";
import { LoginScreen } from "./LoginScreen";
import { RegisterScreen } from "./RegisterScreen";
import { AuthenticatedApp } from "./AuthenticatedApp";
import { Toaster } from "react-hot-toast";
import "../fonts.css";   // ← chemin mis à jour

export function AppContent() {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('eduDiscipline_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [showRegister, setShowRegister] = useState(false);

  const { deferredPrompt, isInstalled, promptInstall, dismissPrompt } = useInstallPrompt();
  const { dark, toggle } = useTheme();

  const handleLogin = (userData) => {
    localStorage.setItem('eduDiscipline_user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('eduDiscipline_user');
    setUser(null);
  };

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