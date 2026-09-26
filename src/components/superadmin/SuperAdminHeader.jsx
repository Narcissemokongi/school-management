// src/components/SuperAdmin/SuperAdminHeader.jsx
import { useState, useRef, useEffect, useMemo } from "react";
import { Menu, Plus, RefreshCw, Bell } from "lucide-react";
import { useTokens } from "@/theme/tokens";
import { useIsMobile } from "@/hooks/useIsMobile";
import { Button, IconButton } from "@/components/ui";

/**
 * Header du dashboard Super Admin.
 *
 * Props :
 * @param {string} title
 * @param {object} user
 * @param {number} pendingCount
 * @param {boolean} refreshing
 * @param {boolean} loading
 * @param {Function} onMobileMenu
 * @param {Function} onRefresh
 * @param {Function} onNewSchool
 * @param {Function} onLogout
 * @param {Function} onSettings
 * @param {React.ReactNode} notifications - Panneau notif (déjà rendu)
 */
export function SuperAdminHeader({
  title,
  user,
  pendingCount = 0,
  canCreateSchool = false,
  refreshing = false,
  loading = false,
  onMobileMenu,
  onRefresh,
  onNewSchool,
  onLogout,
  onSettings,
  notifications,
}) {
  const t = useTokens();
  const isMobile = useIsMobile();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const notificationsRef = useRef(null);
  const userMenuRef = useRef(null);

  // Fermer les menus au clic extérieur
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(e.target)
      ) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fermer les menus au changement de route / déconnexion
  useEffect(() => {
    setShowNotifications(false);
    setShowUserMenu(false);
  }, [user?._id]);

  const initial = useMemo(
    () => user?.nom?.charAt(0)?.toUpperCase() ?? "?",
    [user?.nom]
  );

  return (
    <div
      className="sad-no-print"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginBottom: 24,
        flexWrap: "wrap",
      }}
    >
      {/* Bouton menu mobile */}
      {isMobile && (
        <IconButton
          icon={<Menu size={22} />}
          label="Ouvrir le menu"
          onClick={onMobileMenu}
          variant="ghost"
        />
      )}

      {/* Titre */}
      <h1
        style={{
          fontSize: isMobile ? 20 : 24,
          fontWeight: 700,
          color: t.text.primary,
          margin: 0,
          flex: 1,
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {title}
      </h1>

      {/* Actions */}
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        {/* Nouvelle école */}
        {canCreateSchool && (
          <Button
            variant="primary"
            size={isMobile ? "sm" : "md"}
            icon={<Plus size={16} />}
            onClick={onNewSchool}
          >
            {isMobile ? "Nouvelle" : "Nouvelle école"}
          </Button>
        )}

        {/* Refresh */}
        <IconButton
          icon={
            <RefreshCw
              size={18}
              style={refreshing ? { animation: "spin 0.8s linear infinite" } : undefined}
            />
          }
          label="Actualiser"
          onClick={onRefresh}
          variant="ghost"
          disabled={refreshing || loading}
        />

        {/* Notifications */}
        <div style={{ position: "relative" }} ref={notificationsRef}>
          <div style={{ position: "relative" }}>
            <IconButton
              icon={<Bell size={20} />}
              label="Notifications"
              onClick={() => setShowNotifications((v) => !v)}
              variant={showNotifications ? "primary" : "ghost"}
            />
            {pendingCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: -2,
                  right: -2,
                  background: "#EF4444",
                  color: "#FFFFFF",
                  borderRadius: t.radius.full,
                  minWidth: 16,
                  height: 16,
                  padding: "0 4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  fontWeight: 700,
                  pointerEvents: "none",
                  border: `2px solid ${t.surface.default}`,
                }}
              >
                {pendingCount > 9 ? "9+" : pendingCount}
              </span>
            )}
          </div>
          {showNotifications && notifications}
        </div>

        {/* User menu */}
        <div style={{ position: "relative" }} ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setShowUserMenu((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={showUserMenu}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "4px 8px 4px 4px",
              background: showUserMenu ? t.surface.hover : "transparent",
              border: "none",
              borderRadius: t.radius.sm,
              cursor: "pointer",
              color: t.text.primary,
              fontFamily: t.font.family,
              transition: `background ${t.transition.fast}`,
              outline: "none",
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: t.accent.primary,
                color: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: 14,
                flexShrink: 0,
              }}
              aria-hidden="true"
            >
              {initial}
            </div>
            {!isMobile && (
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  maxWidth: 140,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {user?.nom}
              </span>
            )}
          </button>

          {showUserMenu && (
            <UserMenu
              onSettings={() => {
                onSettings?.();
                setShowUserMenu(false);
              }}
              onLogout={() => {
                onLogout?.();
                setShowUserMenu(false);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────
// Menu utilisateur
// ────────────────────────────────────────────────
function UserMenu({ onSettings, onLogout }) {
  const t = useTokens();

  return (
    <div
      role="menu"
      style={{
        position: "absolute",
        top: 44,
        right: 0,
        minWidth: 180,
        background: t.surface.default,
        borderRadius: t.radius.md,
        boxShadow: t.shadow.md,
        border: `1px solid ${t.border.default}`,
        zIndex: 100,
        overflow: "hidden",
        animation: "sa-fade 0.15s ease-out",
      }}
    >
      <MenuItem label="Paramètres" onClick={onSettings} />
      <div style={{ height: 1, background: t.border.default }} />
      <MenuItem label="Déconnexion" onClick={onLogout} danger />
    </div>
  );
}

function MenuItem({ label, onClick, danger = false }) {
  const t = useTokens();
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "block",
        width: "100%",
        padding: "10px 16px",
        background: hovered ? t.surface.hover : "transparent",
        border: "none",
        color: danger ? "#EF4444" : t.text.primary,
        textAlign: "left",
        cursor: "pointer",
        fontSize: 14,
        fontFamily: t.font.family,
        transition: `background ${t.transition.fast}`,
        outline: "none",
      }}
    >
      {label}
    </button>
  );
}

// ────────────────────────────────────────────────
// Keyframes partagés
// ────────────────────────────────────────────────
// Réutilise les keyframes de la sidebar (déjà injectés)