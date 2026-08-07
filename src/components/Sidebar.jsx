import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useStyles } from "./ThemeProvider";
import { useIsMobile } from "../hooks/useIsMobile";
import { Menu, X, LogOut, Sun, Moon } from "lucide-react";

export function Sidebar({
  menu,
  activeTab,
  onTabChange,
  user,
  dark,
  onToggleTheme,
  onLogout,
  isOpen,
  onClose,
  collapsed,
  onToggleCollapse,
}) {
  const { S } = useStyles();
  const isMobile = useIsMobile();

  const ecole = useQuery(
    api.ecoles.get,
    user?.ecoleId ? { ecoleId: user.ecoleId } : "skip"
  );

  const visible = isMobile ? isOpen : true;
  if (!visible) return null;

  const sidebarWidth = isMobile ? "85%" : collapsed ? 72 : 260;

  return (
    <>
      {/* Overlay mobile */}
      {isMobile && (
        <div
          onClick={onClose}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.4)",
            backdropFilter: "blur(2px)",
            zIndex: 110,
            animation: "fadeIn 0.2s",
          }}
        />
      )}

      <div
        style={{
          width: sidebarWidth,
          maxWidth: isMobile ? 320 : undefined,
          height: "100vh",
          background: dark ? "#0F172A" : "#1E293B",
          color: "#E2E8F0",
          position: "fixed",
          left: 0,
          top: 0,
          transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s",
          display: "flex",
          flexDirection: "column",
          padding: "12px 0",
          zIndex: 120,
          overflowY: "auto",
          boxShadow: isMobile ? "0 0 40px rgba(0,0,0,0.3)" : "none",
          transform: isMobile
            ? isOpen
              ? "translateX(0)"
              : "translateX(-100%)"
            : "translateX(0)",
        }}
      >
        {/* Bouton de basculement */}
        <button
          onClick={() => {
            if (isMobile) {
              onClose?.();
            } else {
              onToggleCollapse?.();
            }
          }}
          aria-label={
            isMobile ? "Fermer le menu" : collapsed ? "Agrandir" : "Réduire"
          }
          style={{
            background: "none",
            border: "none",
            color: "#94A3B8",
            cursor: "pointer",
            padding: "8px 16px",
            alignSelf: "flex-end",
            fontSize: 20,
            transition: "color 0.2s",
          }}
        >
          {isMobile ? (
            <X size={24} />
          ) : collapsed ? (
            <Menu size={22} />
          ) : (
            <X size={22} />
          )}
        </button>

        {/* Titre / Logo */}
        <div
          style={{
            padding: collapsed && !isMobile ? "8px 0" : "8px 20px",
            marginBottom: 28,
            fontWeight: 700,
            fontSize: collapsed && !isMobile ? 16 : 20,
            textAlign: collapsed && !isMobile ? "center" : "left",
            overflow: "hidden",
            whiteSpace: "nowrap",
            letterSpacing: "-0.3px",
            color: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          {ecole?.logo ? (
            <img
              src={ecole.logo}
              alt="Logo"
              style={{
                height: 32,
                width: 32,
                borderRadius: 6,
                objectFit: "contain",
                background: "rgba(255,255,255,0.1)",
              }}
            />
          ) : (
            <div
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
              }}
            >
              {ecole?.nom?.charAt(0) || "S"}
            </div>
          )}
          {!(collapsed && !isMobile) && <span>School Management</span>}
        </div>

        {/* Menu principal (sans les liens légaux) */}
        <nav style={{ flex: 1 }}>
          {menu
            .filter(item => item.id !== "mentions" && item.id !== "confidentialite")
            .map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onTabChange(item.id);
                  if (isMobile) onClose?.();
                }}
                aria-current={activeTab === item.id ? "page" : undefined}
                title={collapsed && !isMobile ? item.label : undefined}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 20px",
                  margin: "0 8px",
                  borderRadius: 10,
                  background:
                    activeTab === item.id
                      ? "rgba(255,255,255,0.12)"
                      : "transparent",
                  border: "none",
                  color: activeTab === item.id ? "#FFFFFF" : "#CBD5E1",
                  cursor: "pointer",
                  width: "calc(100% - 16px)",
                  textAlign: "left",
                  fontSize: 14,
                  fontWeight: activeTab === item.id ? 600 : 400,
                  transition: "all 0.2s",
                  whiteSpace: "nowrap",
                  position: "relative",
                  overflow: "hidden",
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== item.id)
                    e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== item.id)
                    e.currentTarget.style.background = "transparent";
                }}
              >
                <span
                  style={{
                    fontSize: 20,
                    width: 24,
                    textAlign: "center",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {item.icon}
                </span>
                {!(collapsed && !isMobile) && (
                  <span style={{ flex: 1 }}>{item.label}</span>
                )}
                {item.badge && !(collapsed && !isMobile) && (
                  <span
                    style={{
                      background: "#EF4444",
                      color: "white",
                      borderRadius: 10,
                      padding: "2px 8px",
                      fontSize: 11,
                      fontWeight: 600,
                      marginLeft: 4,
                    }}
                  >
                    {item.badge}
                  </span>
                )}
                {activeTab === item.id && (
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: "50%",
                      transform: "translateY(-50%)",
                      width: 3,
                      height: 24,
                      background: "#4F46E5",
                      borderRadius: "0 4px 4px 0",
                    }}
                  />
                )}
              </button>
            ))}
        </nav>

        {/* Bas de la sidebar */}
        <div
          style={{
            marginTop: "auto",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            paddingTop: 8,
          }}
        >
          {/* Thème */}
          <button
            onClick={() => {
              onToggleTheme();
              if (isMobile) onClose?.();
            }}
            aria-label={dark ? "Mode clair" : "Mode sombre"}
            title={
              collapsed && !isMobile
                ? dark
                  ? "Mode clair"
                  : "Mode sombre"
                : undefined
            }
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 20px",
              margin: "0 8px",
              borderRadius: 8,
              background: "transparent",
              border: "none",
              color: "#CBD5E1",
              cursor: "pointer",
              width: "calc(100% - 16px)",
              textAlign: "left",
              fontSize: 14,
              transition: "background 0.2s",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "rgba(255,255,255,0.05)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <span
              style={{
                fontSize: 20,
                width: 24,
                textAlign: "center",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {dark ? <Sun size={20} /> : <Moon size={20} />}
            </span>
            {!(collapsed && !isMobile) && (
              <span>{dark ? "Mode clair" : "Mode sombre"}</span>
            )}
          </button>

          {/* Déconnexion */}
          <button
            onClick={() => {
              onLogout();
              if (isMobile) onClose?.();
            }}
            aria-label="Se déconnecter"
            title={collapsed && !isMobile ? "Déconnexion" : undefined}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 20px",
              margin: "0 8px",
              borderRadius: 8,
              background: "transparent",
              border: "none",
              color: "#CBD5E1",
              cursor: "pointer",
              width: "calc(100% - 16px)",
              textAlign: "left",
              fontSize: 14,
              transition: "background 0.2s",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "rgba(255,255,255,0.05)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <span
              style={{
                fontSize: 20,
                width: 24,
                textAlign: "center",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <LogOut size={20} />
            </span>
            {!(collapsed && !isMobile) && <span>Déconnexion</span>}
          </button>

          {/* Liens légaux discrets, alignés à gauche */}
          {!(collapsed && !isMobile) && (
            <div style={{ padding: "8px 20px", fontSize: 12, display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  onTabChange("mentions");
                  if (isMobile) onClose?.();
                }}
                style={{ color: "#94A3B8", textDecoration: "none", textAlign: "left" }}
              >
                Mentions légales
              </a>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  onTabChange("confidentialite");
                  if (isMobile) onClose?.();
                }}
                style={{ color: "#94A3B8", textDecoration: "none", textAlign: "left" }}
              >
                Politique de confidentialité
              </a>
            </div>
          )}

          {/* Utilisateur connecté */}
          {!collapsed && user && (
            <div
              style={{
                padding: "12px 20px",
                fontSize: 12,
                color: "#64748B",
                display: "flex",
                alignItems: "center",
                gap: 8,
                borderTop: "1px solid rgba(255,255,255,0.06)",
                marginTop: 8,
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
                }}
              >
                {user.nom.charAt(0).toUpperCase()}
              </div>
              <span>{user.nom}</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}