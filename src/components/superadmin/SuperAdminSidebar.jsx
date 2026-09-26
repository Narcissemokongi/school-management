// src/components/SuperAdmin/SuperAdminSidebar.jsx
import { useEffect, useMemo, useState } from "react";
import { Sun, Moon, LogOut, X } from "lucide-react";
import { useTokens } from "@/theme/tokens";
import { useIsMobile } from "@/hooks/useIsMobile";
import { IconButton } from "@/components/ui";

/**
 * Sidebar du dashboard Super Admin.
 *
 * Props :
 * @param {Array}    sections        - [{ id, label, icon, badge?, badgeColor?, permission?, ownerOnly?, danger? }]
 * @param {string}   activeSection
 * @param {Function} onSelectSection
 * @param {boolean}  mobileOpen
 * @param {Function} onMobileClose
 * @param {object}   user
 * @param {Function} onLogout
 * @param {Function} onToggleTheme
 * @param {"light"|"dark"} theme     - Thème actif (par défaut "light")
 */
export function SuperAdminSidebar({
  sections = [],
  activeSection,
  onSelectSection,
  mobileOpen = false,
  onMobileClose,
  user,
  onLogout,
  onToggleTheme,
  theme = "light",
}) {
  const t = useTokens();
  const isMobile = useIsMobile();

  // ────────────────────────────────────────────────
  // 🛡️ Filtrage défensif : ownerOnly + permission
  // ────────────────────────────────────────────────
  const visibleSections = useMemo(() => {
    // Détection OWNER (alignée sur checkIsOwner du parent SuperAdminDashboardV2)
    const isOwner =
      user?.isOwner === true ||
      (user?.role === "admin" && !user?.ecoleId); // legacy

    return sections.filter((s) => {
      // ✅ FIX CRITIQUE : OWNER voit TOUT, on court-circuite les checks
      if (isOwner) return true;

      // Section réservée OWNER → masquée aux secondaires
      if (s.ownerOnly) return false;

      // Pas de permission requise → visible
      if (!s.permission) return true;

      // Vérifie la permission dans le tableau
      return (user?.permissions ?? []).includes(s.permission);
    });
  }, [sections, user]);

  // Escape pour fermer le drawer mobile
  useEffect(() => {
    if (!isMobile || !mobileOpen) return;
    const handler = (e) => e.key === "Escape" && onMobileClose?.();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isMobile, mobileOpen, onMobileClose]);

  const handleSelect = (id) => {
    onSelectSection?.(id);
    if (isMobile) onMobileClose?.();
  };

  // ────────────────────────────────────────────────
  // Styles
  // ────────────────────────────────────────────────
  const sidebarStyle = {
    width: isMobile ? "80%" : 260,
    maxWidth: isMobile ? 300 : undefined,
    minHeight: isMobile ? "100%" : "100vh",
    background: t.surface.sidebar,
    borderRight: isMobile ? "none" : `1px solid ${t.border.default}`,
    padding: isMobile ? "20px 12px" : "24px 16px",
    display: "flex",
    flexDirection: "column",
    gap: 4,
    position: isMobile ? "fixed" : "sticky",
    top: 0,
    left: 0,
    zIndex: isMobile ? 100 : undefined,
    transform: isMobile
      ? mobileOpen
        ? "translateX(0)"
        : "translateX(-100%)"
      : "translateX(0)",
    transition: isMobile ? "transform 0.3s ease" : undefined,
    paddingTop: isMobile
      ? "calc(20px + env(safe-area-inset-top, 0px))"
      : 24,
    paddingBottom: isMobile
      ? "calc(20px + env(safe-area-inset-bottom, 0px))"
      : 24,
    boxSizing: "border-box",
    overflowY: "auto",
    boxShadow: isMobile && mobileOpen ? "0 0 40px rgba(0,0,0,0.4)" : "none",
  };

  return (
    <>
      {/* Overlay mobile */}
      {isMobile && mobileOpen && (
        <div
          onClick={onMobileClose}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(2px)",
            WebkitBackdropFilter: "blur(2px)",
            zIndex: 99,
            animation: "sa-fade 0.2s ease-out",
          }}
          aria-hidden="true"
        />
      )}

      <aside style={sidebarStyle} className="sad-no-print">
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 24,
            paddingLeft: 8,
            gap: 8,
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <h2
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: t.text.primary,
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              Super Admin
            </h2>
            <p
              style={{
                fontSize: 13,
                color: t.text.muted,
                margin: "2px 0 0",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {user?.nom ?? ""}
            </p>
          </div>

          {/* Bouton fermer (mobile uniquement) */}
          {isMobile && (
            <IconButton
              icon={<X size={20} />}
              label="Fermer le menu"
              onClick={onMobileClose}
              variant="ghost"
              size="sm"
            />
          )}
        </div>

        {/* Navigation */}
        <nav
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            flex: 1,
            minHeight: 0,
          }}
        >
          {visibleSections.map((section) => (
            <SidebarItem
              key={section.id}
              section={section}
              active={activeSection === section.id}
              onClick={() => handleSelect(section.id)}
            />
          ))}
        </nav>

        {/* Bas de sidebar */}
        <div
          style={{
            marginTop: "auto",
            paddingTop: 16,
            borderTop: `1px solid ${t.border.default}`,
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <SidebarItem
            section={{
              id: "_theme",
              label: theme === "dark" ? "Mode clair" : "Mode sombre",
              icon: theme === "dark" ? <Sun size={20} /> : <Moon size={20} />,
            }}
            onClick={onToggleTheme}
          />
          <SidebarItem
            section={{
              id: "_logout",
              label: "Déconnexion",
              icon: <LogOut size={20} />,
              danger: true,
            }}
            onClick={onLogout}
          />
        </div>
      </aside>

      <SidebarKeyframes />
    </>
  );
}

// ────────────────────────────────────────────────
// Item de navigation
// ────────────────────────────────────────────────
function SidebarItem({ section, active, onClick }) {
  const t = useTokens();
  const [hovered, setHovered] = useState(false);

  const isDanger = section.danger;

  const baseColor = isDanger
    ? "#EF4444"
    : active
    ? t.accent.primary
    : t.text.secondary;

  const bg = active
    ? t.surface.hover
    : hovered
    ? t.surface.hover
    : "transparent";

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-current={active ? "page" : undefined}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 12px",
        borderRadius: t.radius.sm,
        border: "none",
        background: bg,
        color: baseColor,
        fontWeight: active ? 600 : 500,
        cursor: "pointer",
        transition: `background ${t.transition.fast}, color ${t.transition.fast}`,
        fontSize: 14,
        textAlign: "left",
        width: "100%",
        fontFamily: t.font.family,
        outline: "none",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {section.icon}
      <span
        style={{
          flex: 1,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {section.label}
      </span>
      {section.badge !== undefined && section.badge > 0 && (
        <span
          style={{
            background: section.badgeColor ?? t.accent.primary,
            color: "#FFFFFF",
            borderRadius: t.radius.full,
            minWidth: 20,
            height: 20,
            padding: "0 6px",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {section.badge}
        </span>
      )}
    </button>
  );
}

// ────────────────────────────────────────────────
// Keyframes (module-level, préfixés)
// ────────────────────────────────────────────────
const SidebarKeyframes = () => (
  <style>{`
    @keyframes sa-fade {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
  `}</style>
);