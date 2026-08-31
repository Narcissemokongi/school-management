import { useState, useEffect, useCallback, useRef } from "react";
import { Sidebar } from "./Sidebar";
import { useIsMobile } from "../hooks/useIsMobile";
import { ScrollToTop } from "./ScrollToTop";
import { Menu } from "lucide-react";
import { OfflineBanner } from "./OfflineBanner";
import { useStyles } from "../styles/theme";
import { useAppStore } from "../store/appStore";

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
  const { S } = useStyles();

  const sidebarCollapsed = useAppStore((state) => state.sidebarCollapsed);
  const setSidebarCollapsed = useAppStore((state) => state.setSidebarCollapsed);
  const mobileSidebarOpen = useAppStore((state) => state.mobileSidebarOpen);
  const setMobileSidebarOpen = useAppStore((state) => state.setMobileSidebarOpen);

  const mainRef = useRef(null);
  const prevActiveTabRef = useRef(activeTab);

  // Ferme la sidebar mobile lors d'un changement d'onglet, pas à l'ouverture
  useEffect(() => {
    if (isMobile && prevActiveTabRef.current !== activeTab) {
      setMobileSidebarOpen(false);
    }
    prevActiveTabRef.current = activeTab;
  }, [activeTab, isMobile, setMobileSidebarOpen]);

  // Ferme la sidebar mobile si on clique en dehors
  const handleMainClick = useCallback(() => {
    if (isMobile && mobileSidebarOpen) {
      setMobileSidebarOpen(false);
    }
  }, [isMobile, mobileSidebarOpen, setMobileSidebarOpen]);

  const sidebarWidth = isMobile ? 0 : sidebarCollapsed ? 72 : 260;

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
        isOpen={isMobile ? mobileSidebarOpen : true}
        onClose={() => setMobileSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <OfflineBanner dark={dark} />

      <main
        ref={mainRef}
        onClick={handleMainClick}
        style={{
          flex: 1,
          marginLeft: sidebarWidth,
          transition: "margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          padding: isMobile ? "16px 16px 24px" : "24px 32px 32px",
          backgroundColor: dark ? "#0F172A" : "#F8FAFC",
          color: dark ? "#F1F5F9" : "#1E293B",
          minHeight: "100vh",
          width: "100%",
          boxSizing: "border-box",
          fontFamily: "'Inter', system-ui, sans-serif",
          position: "relative",
        }}
      >
        {isMobile && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMobileSidebarOpen(true);
            }}
            style={{
              position: "fixed",
              top: 16,
              left: 16,
              zIndex: 105,
              background: dark ? "#1E293B" : "#FFFFFF",
              border: `1px solid ${dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)"}`,
              borderRadius: 8,
              padding: 10,
              boxShadow: dark ? "0 2px 8px rgba(0,0,0,0.4)" : "0 2px 8px rgba(0,0,0,0.15)",
              cursor: "pointer",
              transition: "background-color 0.2s, box-shadow 0.2s, transform 0.1s",
            }}
            aria-label="Ouvrir le menu"
            title="Menu"
            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            <Menu size={24} color={dark ? "#F1F5F9" : "#1E293B"} />
          </button>
        )}

        <div style={{ maxWidth: 1280, margin: "0 auto", width: "100%", paddingTop: isMobile ? 60 : 0 }}>
          {children}
        </div>

        <ScrollToTop />
      </main>
    </div>
  );
}