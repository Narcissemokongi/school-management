// src/components/Layout.jsx
import { useEffect, useCallback, useRef, useMemo, useState } from "react";
import { Sidebar } from "./Sidebar";
import { useIsMobile } from "@/hooks/useIsMobile";
import { ScrollToTop } from "./ScrollToTop";
import { Menu } from "lucide-react";
import { OfflineBanner } from "./OfflineBanner";
import { useStyles } from "@/styles/theme";
import { useAppStore } from "@/store/appStore";

// ════════════════════════════════════════════════════════════════════
// SOUS-COMPOSANT — Bouton menu mobile (hover + focus state)
// ════════════════════════════════════════════════════════════════════
function MobileMenuButton({ onClick, dark, variant = "default" }) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  const isMessagerie = variant === "overlay";

  // ✅ Safe-area top + left/right
  const style = isMessagerie
    ? {
        // Mode messagerie : en haut à droite, style overlay
        position: "fixed",
        top: "calc(14px + env(safe-area-inset-top, 0px))",
        right: "calc(14px + env(safe-area-inset-right, 0px))",
        zIndex: 200,
        background: dark
          ? "rgba(30,41,59,0.9)"
          : "rgba(255,255,255,0.9)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        border: `1px solid ${
          dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)"
        }`,
        borderRadius: 10,
        padding: 8,
        boxShadow: dark
          ? "0 2px 8px rgba(0,0,0,0.4)"
          : "0 2px 8px rgba(0,0,0,0.1)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 40,
        height: 40,
        transition: "background 0.15s ease, transform 0.1s ease",
        transform: hovered ? "scale(1.05)" : "scale(1)",
        outline: focused ? "2px solid #818CF8" : "none",
        outlineOffset: 2,
        WebkitTapHighlightColor: "transparent",
      }
    : {
        // Mode normal : en haut à gauche
        position: "fixed",
        top: "calc(16px + env(safe-area-inset-top, 0px))",
        left: "calc(16px + env(safe-area-inset-left, 0px))",
        zIndex: 105,
        background: dark ? "#1E293B" : "#FFFFFF",
        border: `1px solid ${
          dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)"
        }`,
        borderRadius: 10,
        padding: 8,
        boxShadow: dark
          ? "0 2px 8px rgba(0,0,0,0.4)"
          : "0 2px 8px rgba(0,0,0,0.15)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 44,
        height: 44,
        transition: "background 0.15s ease, transform 0.1s ease",
        transform: hovered ? "scale(1.05)" : "scale(1)",
        outline: focused ? "2px solid #818CF8" : "none",
        outlineOffset: 2,
        WebkitTapHighlightColor: "transparent",
      };

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={style}
      aria-label="Ouvrir le menu"
      title="Menu"
    >
      <Menu
        size={isMessagerie ? 18 : 22}
        color={dark ? "#F1F5F9" : "#1E293B"}
      />
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════
// LAYOUT PRINCIPAL
// ════════════════════════════════════════════════════════════════════
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
  const setSidebarCollapsed = useAppStore(
    (state) => state.setSidebarCollapsed
  );
  const mobileSidebarOpen = useAppStore((state) => state.mobileSidebarOpen);
  const setMobileSidebarOpen = useAppStore(
    (state) => state.setMobileSidebarOpen
  );

  const mainRef = useRef(null);
  const prevActiveTabRef = useRef(activeTab);

  // ✅ Détection : la messagerie gère son propre layout plein écran
  const isMessagerie = activeTab === "messagerie";

  // ✅ Ferme la sidebar mobile lors d'un changement d'onglet
  useEffect(() => {
    if (isMobile && prevActiveTabRef.current !== activeTab) {
      setMobileSidebarOpen(false);
    }
    prevActiveTabRef.current = activeTab;
  }, [activeTab, isMobile, setMobileSidebarOpen]);

  // ✅ Ferme la sidebar mobile si on clique en dehors
  const handleMainClick = useCallback(() => {
    if (isMobile && mobileSidebarOpen) {
      setMobileSidebarOpen(false);
    }
  }, [isMobile, mobileSidebarOpen, setMobileSidebarOpen]);

  const handleOpenSidebar = useCallback(
    (e) => {
      e.stopPropagation();
      setMobileSidebarOpen(true);
    },
    [setMobileSidebarOpen]
  );

  const sidebarWidth = isMobile ? 0 : sidebarCollapsed ? 72 : 260;

  // ✅ Détection iOS pour utiliser `dvh` (avec fallback `vh`)
  const [isIOS, setIsIOS] = useState(false);
  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const ua = navigator.userAgent || "";
    setIsIOS(/iPad|iPhone|iPod/.test(ua));
  }, []);

  // ✅ Hauteur : `dvh` sur iOS, `vh` ailleurs (fallback sûr)
  const fullHeight = isIOS ? "100dvh" : "100vh";

  // ✅ Calcul de la réserve d'espace pour le bouton menu mobile normal
  //    (bouton 44px + top 16 + marge 8 = 68px)
  const mobileTopReserve = 68;

  return (
    <div
      style={{
        display: "flex",
        // ✅ FIX #10 — overflow hidden pour éviter le débordement de la sidebar
        overflowX: "hidden",
        // ✅ Fix #3 — `dvh` pour iOS
        minHeight: isMessagerie ? undefined : fullHeight,
        height: isMessagerie ? fullHeight : undefined,
        overflowY: isMessagerie ? "hidden" : "visible",
      }}
    >
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
          // ✅ Messagerie : aucun padding
          padding: isMessagerie
            ? 0
            : isMobile
            ? `calc(${mobileTopReserve}px + env(safe-area-inset-top, 0px)) 16px calc(24px + env(safe-area-inset-bottom, 0px))`
            : "24px 32px 32px",
          backgroundColor: dark ? "#0F172A" : "#F8FAFC",
          color: dark ? "#F1F5F9" : "#1E293B",
          // ✅ Fix #3 — `dvh` pour iOS
          minHeight: isMessagerie ? undefined : fullHeight,
          height: isMessagerie ? fullHeight : undefined,
          overflowY: isMessagerie ? "hidden" : "visible",
          width: "100%",
          boxSizing: "border-box",
          fontFamily: "'Inter', system-ui, sans-serif",
          position: "relative",
          display: isMessagerie ? "flex" : "block",
          flexDirection: isMessagerie ? "column" : undefined,
        }}
      >
        {/* ═══════════ BOUTON MENU MOBILE ═══════════ */}
        {/* ✅ Bouton menu standard (haut gauche) — masqué en messagerie
            car il chevauchait les boutons d'appel du header de chat.
            Le bouton menu en messagerie est maintenant dans le header
            de ConversationList. */}
        {isMobile && !isMessagerie && (
          <MobileMenuButton
            onClick={handleOpenSidebar}
            dark={dark}
            variant="default"
          />
        )}

        {/* ═══════════ CONTENU ═══════════ */}
        <div
          style={{
            maxWidth: isMessagerie ? "none" : 1280,
            margin: isMessagerie ? 0 : "0 auto",
            width: "100%",
            // ✅ FIX #7 — Le padding est géré sur <main>, plus de padding top ici
            paddingTop: 0,
            flex: isMessagerie ? 1 : undefined,
            height: isMessagerie ? "100%" : undefined,
            minHeight: isMessagerie ? 0 : undefined,
            display: isMessagerie ? "flex" : "block",
            flexDirection: isMessagerie ? "column" : undefined,
            overflow: isMessagerie ? "hidden" : undefined,
          }}
        >
          {children}
        </div>

        {/* ✅ ScrollToTop : sauf en messagerie (scroll interne) */}
        {!isMessagerie && <ScrollToTop />}
      </main>
    </div>
  );
}