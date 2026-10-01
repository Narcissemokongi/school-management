// src/components/Sidebar.jsx
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useState, useMemo, useCallback, useId } from "react";
import {
  Menu, X, LogOut, Sun, Moon, ChevronLeft, FileText, Shield,
} from "lucide-react";

// ════════════════════════════════════════════════════════════════════
// KEYFRAMES module-level (injectés UNE SEULE FOIS)
// ════════════════════════════════════════════════════════════════════
const SidebarKeyframes = (
  <style>{`
    @keyframes sidebar-fade-in {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    .sidebar-fade-in {
      animation: sidebar-fade-in 0.25s ease-out;
    }
    @media (prefers-reduced-motion: reduce) {
      .sidebar-fade-in { animation: none !important; }
    }
  `}</style>
);

// ════════════════════════════════════════════════════════════════════
// CONSTANTES MODULE-LEVEL
// ════════════════════════════════════════════════════════════════════
const TAP_BASE = {
  touchAction: "manipulation",
  WebkitTapHighlightColor: "transparent",
};

const FOCUS_RING = (primary) => ({
  outline: `2px solid ${primary}`,
  outlineOffset: -2,
});

// ════════════════════════════════════════════════════════════════════
// SOUS-COMPOSANT — Item de navigation
// ════════════════════════════════════════════════════════════════════
function SidebarNavItem({
  icon,
  label,
  isActive = false,
  onClick,
  badge,
  collapsed,
  isMobile,
  tokens,
  title,
  ariaCurrent,
}) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);

  const background = isActive
    ? tokens.activeBg
    : hovered || pressed
    ? tokens.hoverBg
    : "transparent";

  const color = isActive ? tokens.activeText : tokens.mutedText;

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => { setHovered(false); setPressed(false); }}
      onPointerCancel={() => setPressed(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      aria-current={ariaCurrent}
      title={title}
      style={{
        ...TAP_BASE,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 20px",
        margin: "0 8px",
        borderRadius: 10,
        background,
        border: "none",
        color,
        cursor: "pointer",
        width: "calc(100% - 16px)",
        minHeight: 44,
        textAlign: "left",
        fontSize: 14,
        fontWeight: isActive ? 600 : 400,
        transition: "background 0.2s ease, color 0.2s ease",
        whiteSpace: "nowrap",
        position: "relative",
        ...(focused ? FOCUS_RING(tokens.primary) : null),
        boxSizing: "border-box",
      }}
    >
      <span
        style={{
          width: 24,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
        aria-hidden="true"
      >
        {icon}
      </span>

      {!(collapsed && !isMobile) && (
        <span
          style={{
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {label}
        </span>
      )}

      {badge && !(collapsed && !isMobile) && (
        <span
          style={{
            background: tokens.danger,
            color: "#FFFFFF",
            borderRadius: 10,
            padding: "2px 8px",
            fontSize: 11,
            fontWeight: 600,
            marginLeft: 4,
            flexShrink: 0,
            fontVariantNumeric: "tabular-nums",
          }}
          aria-label={`${badge} notification${badge > 1 ? "s" : ""}`}
        >
          {badge}
        </span>
      )}

      {isActive && (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: "50%",
            transform: "translateY(-50%)",
            width: 3,
            height: 24,
            background: tokens.primary,
            borderRadius: "0 4px 4px 0",
          }}
          aria-hidden="true"
        />
      )}
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════
// SOUS-COMPOSANT — Bouton icône (toggle + légal)
// ════════════════════════════════════════════════════════════════════
function IconButton({ onClick, tokens, ariaLabel, title, children, style }) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => { setHovered(false); setPressed(false); }}
      onPointerCancel={() => setPressed(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      aria-label={ariaLabel}
      title={title}
      style={{
        ...TAP_BASE,
        background: "none",
        border: "none",
        color: hovered || pressed ? tokens.text : tokens.mutedText,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 44,
        minHeight: 44,
        transition: "color 0.2s ease",
        ...(focused ? FOCUS_RING(tokens.primary) : null),
        ...style,
      }}
    >
      {children}
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════
// SOUS-COMPOSANT — Lien légal (texte)
// ════════════════════════════════════════════════════════════════════
function LegalLink({ onClick, tokens, children }) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => { setHovered(false); setPressed(false); }}
      onPointerCancel={() => setPressed(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        ...TAP_BASE,
        background: "none",
        border: "none",
        padding: "10px 0",
        minHeight: 44,
        color: hovered || pressed ? tokens.text : tokens.mutedText,
        cursor: "pointer",
        textDecoration: "none",
        transition: "color 0.2s ease",
        font: "inherit",
        textAlign: "left",
        display: "flex",
        alignItems: "center",
        ...(focused ? FOCUS_RING(tokens.primary) : null),
      }}
    >
      {children}
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ════════════════════════════════════════════════════════════════════
export function Sidebar({
  menu = [],
  activeTab,
  onTabChange,
  user,
  dark,
  onToggleTheme,
  onLogout,
  isOpen = false,
  onClose,
  collapsed = false,
  onToggleCollapse,
}) {
  const isMobile = useIsMobile();
  const navLabelId = useId();

  const ecoleId = user?.ecoleId;

  const ecoleArgs = useMemo(
    () => (ecoleId ? { ecoleId } : "skip"),
    [ecoleId]
  );
  const ecole = useQuery(api.ecoles.get, ecoleArgs);

  const tokens = useMemo(
    () => ({
      bg: dark ? "#0F172A" : "#FFFFFF",
      text: dark ? "#E2E8F0" : "#1E293B",
      mutedText: dark ? "#94A3B8" : "#64748B",
      hoverBg: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
      activeBg: dark ? "rgba(129,140,248,0.15)" : "rgba(79,70,229,0.08)",
      activeText: dark ? "#FFFFFF" : "#4F46E5",
      border: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
      primary: dark ? "#818CF8" : "#4F46E5",
      danger: "#EF4444",
    }),
    [dark]
  );

  const handleTabClick = useCallback(
    (id) => {
      onTabChange?.(id);
      if (isMobile) onClose?.();
    },
    [onTabChange, isMobile, onClose]
  );

  const handleToggleTheme = useCallback(() => {
    onToggleTheme?.();
    if (isMobile) onClose?.();
  }, [onToggleTheme, isMobile, onClose]);

  const handleLogout = useCallback(() => {
    onLogout?.();
    if (isMobile) onClose?.();
  }, [onLogout, isMobile, onClose]);

  const handleCollapseToggle = useCallback(() => {
    if (isMobile) onClose?.();
    else onToggleCollapse?.();
  }, [isMobile, onClose, onToggleCollapse]);

  const handleLegalClick = useCallback(
    (tabId) => (e) => {
      e.preventDefault();
      handleTabClick(tabId);
    },
    [handleTabClick]
  );

  const visibleMenu = useMemo(
    () =>
      menu.filter(
        (item) => item.id !== "mentions" && item.id !== "confidentialite"
      ),
    [menu]
  );

  const visible = isMobile ? isOpen : true;
  if (!visible) return null;

  const isCollapsedDesktop = collapsed && !isMobile;
  const sidebarWidth = isMobile ? "85%" : collapsed ? 72 : 260;

  const toggleLabel = isMobile
    ? "Fermer le menu"
    : collapsed
    ? "Agrandir"
    : "Réduire";

  const userInitial = user?.nom?.charAt(0)?.toUpperCase() || "?";
  const ecoleInitial = ecole?.nom?.charAt(0) || "S";

  return (
    <>
      {SidebarKeyframes}

      {/* ═══════════ Overlay mobile ═══════════ */}
      {isMobile && isOpen && (
        <div
          className="sidebar-fade-in"
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            backdropFilter: "blur(2px)",
            WebkitBackdropFilter: "blur(2px)",
            zIndex: 110,
          }}
          aria-hidden="true"
        />
      )}

      {/* ═══════════ Sidebar ═══════════ */}
      <aside
        role={isMobile ? "dialog" : undefined}
        aria-modal={isMobile && isOpen ? "true" : undefined}
        aria-label={isMobile ? "Menu de navigation" : undefined}
        aria-hidden={isMobile && !isOpen ? "true" : undefined}
        style={{
          width: sidebarWidth,
          maxWidth: isMobile ? 320 : undefined,
          height: "100dvh",
          background: tokens.bg,
          color: tokens.text,
          position: "fixed",
          left: 0,
          top: 0,
          paddingTop: "env(safe-area-inset-top, 0px)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          transition:
            "width 0.3s cubic-bezier(0.4,0,0.2,1), transform 0.3s cubic-bezier(0.4,0,0.2,1), background-color 0.3s",
          display: "flex",
          flexDirection: "column",
          zIndex: 120,
          overflowY: "auto",
          overscrollBehavior: "contain",
          WebkitOverflowScrolling: "touch",
          boxShadow: isMobile
            ? "0 0 40px rgba(0,0,0,0.3)"
            : dark
            ? "2px 0 12px rgba(0,0,0,0.5)"
            : "2px 0 12px rgba(0,0,0,0.05)",
          transform: isMobile
            ? isOpen
              ? "translateX(0)"
              : "translateX(-100%)"
            : "translateX(0)",
          boxSizing: "border-box",
        }}
      >
        {/* Bouton de basculement / fermeture */}
        <IconButton
          onClick={handleCollapseToggle}
          tokens={tokens}
          ariaLabel={toggleLabel}
          title={toggleLabel}
          style={{
            alignSelf: "flex-end",
            padding: "12px 16px",
            marginBottom: 4,
            flexShrink: 0,
          }}
        >
          {isMobile ? (
            <X size={24} aria-hidden="true" />
          ) : collapsed ? (
            <Menu size={22} aria-hidden="true" />
          ) : (
            <ChevronLeft size={22} aria-hidden="true" />
          )}
        </IconButton>

        {/* Titre / Logo */}
        <div
          style={{
            padding: isCollapsedDesktop ? "8px 0" : "8px 20px",
            marginBottom: 28,
            fontWeight: 700,
            fontSize: isCollapsedDesktop ? 16 : 20,
            textAlign: isCollapsedDesktop ? "center" : "left",
            overflow: "hidden",
            whiteSpace: "nowrap",
            letterSpacing: "-0.3px",
            color: tokens.text,
            display: "flex",
            alignItems: "center",
            justifyContent: isCollapsedDesktop ? "center" : "flex-start",
            gap: 10,
            transition: "padding 0.3s, font-size 0.3s",
            flexShrink: 0,
          }}
        >
          {ecole?.logo ? (
            <img
              src={ecole.logo}
              alt=""
              style={{
                height: 32,
                width: 32,
                borderRadius: 6,
                objectFit: "contain",
                background: "rgba(0,0,0,0.05)",
                flexShrink: 0,
              }}
            />
          ) : (
            <div
              aria-hidden="true"
              style={{
                width: 32,
                height: 32,
                background: "linear-gradient(135deg, #4F46E5, #7C3AED)",
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontWeight: 800,
                fontSize: 14,
                flexShrink: 0,
              }}
            >
              {ecoleInitial}
            </div>
          )}
          {!isCollapsedDesktop && (
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {ecole?.nom || "School Management"}
            </span>
          )}
        </div>

        {/* Menu principal */}
        <nav
          aria-label="Menu principal"
          style={{
            flex: 1,
            overflowY: "auto",
            paddingBottom: 8,
            minHeight: 0,
            overscrollBehavior: "contain",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {visibleMenu.map((item) => (
            <SidebarNavItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              isActive={activeTab === item.id}
              onClick={() => handleTabClick(item.id)}
              badge={item.badge}
              collapsed={collapsed}
              isMobile={isMobile}
              tokens={tokens}
              title={isCollapsedDesktop ? item.label : undefined}
              ariaCurrent={activeTab === item.id ? "page" : undefined}
            />
          ))}
        </nav>

        {/* Bas de la sidebar */}
        <div
          style={{
            marginTop: "auto",
            borderTop: `1px solid ${tokens.border}`,
            paddingTop: 8,
            flexShrink: 0,
          }}
        >
          {/* Thème */}
          <SidebarNavItem
            icon={dark ? <Sun size={20} aria-hidden="true" /> : <Moon size={20} aria-hidden="true" />}
            label={dark ? "Mode clair" : "Mode sombre"}
            onClick={handleToggleTheme}
            collapsed={collapsed}
            isMobile={isMobile}
            tokens={tokens}
            title={dark ? "Passer en mode clair" : "Passer en mode sombre"}
          />

          {/* Déconnexion */}
          <SidebarNavItem
            icon={<LogOut size={20} aria-hidden="true" />}
            label="Déconnexion"
            onClick={handleLogout}
            collapsed={collapsed}
            isMobile={isMobile}
            tokens={tokens}
            title="Déconnexion"
          />

          {/* Liens légaux */}
          {!isCollapsedDesktop ? (
            <div
              style={{
                padding: "8px 20px 12px",
                fontSize: 12,
                display: "flex",
                flexDirection: "column",
                gap: 0,
                alignItems: "flex-start",
              }}
            >
              <LegalLink
                onClick={handleLegalClick("mentions")}
                tokens={tokens}
              >
                Mentions légales
              </LegalLink>
              <LegalLink
                onClick={handleLegalClick("confidentialite")}
                tokens={tokens}
              >
                Politique de confidentialité
              </LegalLink>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 8,
                padding: "8px 0",
              }}
            >
              <IconButton
                onClick={() => handleTabClick("mentions")}
                tokens={tokens}
                ariaLabel="Mentions légales"
                title="Mentions légales"
              >
                <FileText size={18} aria-hidden="true" />
              </IconButton>
              <IconButton
                onClick={() => handleTabClick("confidentialite")}
                tokens={tokens}
                ariaLabel="Politique de confidentialité"
                title="Confidentialité"
              >
                <Shield size={18} aria-hidden="true" />
              </IconButton>
            </div>
          )}

          {/* Utilisateur connecté */}
          {user && (
            <div
              style={{
                padding: isCollapsedDesktop ? "12px 0" : "12px 20px",
                fontSize: 12,
                color: tokens.mutedText,
                display: "flex",
                alignItems: "center",
                gap: 8,
                borderTop: `1px solid ${tokens.border}`,
                marginTop: 8,
                justifyContent: isCollapsedDesktop ? "center" : "flex-start",
                transition: "padding 0.3s",
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  background: "linear-gradient(135deg, #4F46E5, #7C3AED)",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontWeight: 700,
                  fontSize: 12,
                  flexShrink: 0,
                }}
                aria-hidden="true"
              >
                {userInitial}
              </div>
              {!isCollapsedDesktop && (
                <div style={{ lineHeight: 1.2, minWidth: 0 }}>
                  <div
                    style={{
                      color: tokens.text,
                      fontWeight: 500,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {user.nom}
                  </div>
                  <div
                    style={{
                      color: tokens.mutedText,
                      fontSize: 11,
                      textTransform: "capitalize",
                    }}
                  >
                    {user.role}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}