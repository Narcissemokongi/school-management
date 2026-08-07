import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { useIsMobile } from "../hooks/useIsMobile";
import { ScrollToTop } from "./ScrollToTop";
import { Menu } from "lucide-react";
import { OfflineBanner } from "./OfflineBanner";

export function Layout({
  children,
  menu,
  activeTab,
  onTabChange,
  user,
  dark,
  onToggleTheme,
  onLogout,
}) {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false); // pour mobile (overlay)
  const [collapsed, setCollapsed] = useState(false);      // pour desktop (réduction)

  // Largeur dynamique de la sidebar sur desktop
  const sidebarWidth = isMobile ? 0 : collapsed ? 72 : 260;

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar
        menu={menu}
        activeTab={activeTab}
        onTabChange={onTabChange}
        user={user}
        dark={dark}
        onToggleTheme={onToggleTheme}
        onLogout={onLogout}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={collapsed}                     // ← nouveau
        onToggleCollapse={() => setCollapsed(!collapsed)} // ← nouveau
      />

      <OfflineBanner dark={dark} />

      <main
        style={{
          flex: 1,
          marginLeft: sidebarWidth,                 // ← dynamique
          transition: "margin-left 0.3s ease",
          padding: isMobile ? "16px" : "24px",
          backgroundColor: dark ? "#1E293B" : "#F8FAFC",
          color: dark ? "#F1F5F9" : "#1E293B",
          minHeight: "100vh",
          width: "100%",
        }}
      >
        {/* Bouton hamburger mobile */}
        {isMobile && (
          <button
            onClick={() => setSidebarOpen(true)}
            style={{
              position: "fixed",
              top: 16,
              left: 16,
              zIndex: 100,
              background: dark ? "#1E293B" : "#FFFFFF",
              border: "none",
              borderRadius: 8,
              padding: 10,
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              cursor: "pointer",
            }}
            aria-label="Ouvrir le menu"
          >
            <Menu size={24} color={dark ? "#F1F5F9" : "#1E293B"} />
          </button>
        )}

        {children}

        <ScrollToTop />
      </main>
    </div>
  );
}