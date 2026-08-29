import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useStyles } from "../styles/theme";
import { useIsMobile } from "../hooks/useIsMobile";
import {
  Menu, X, LogOut, Sun, Moon, ChevronLeft, FileText, Shield,
} from "lucide-react";

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

  const sidebarBg = dark ? "#0F172A" : "#FFFFFF";
  const textColor = dark ? "#E2E8F0" : "#1E293B";
  const mutedText = dark ? "#94A3B8" : "#64748B";
  const hoverBg = dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
  const activeBg = dark ? "rgba(129,140,248,0.15)" : "rgba(79,70,229,0.08)";
  const borderColor = dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";

  return (
    <>
      {/* Overlay mobile avec animation */}
      {isMobile && (
        <div
          onClick={onClose}
          style={{
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.4)",
            backdropFilter: "blur(2px)",
            zIndex: 110,
            animation: "fadeIn 0.25s ease-out",
          }}
        />
      )}

      <div
        style={{
          width: sidebarWidth,
          maxWidth: isMobile ? 320 : undefined,
          height: "100vh",
          background: sidebarBg,
          color: textColor,
          position: "fixed",
          left: 0, top: 0,
          transition: "width 0.3s cubic-bezier(0.4,0,0.2,1), transform 0.3s cubic-bezier(0.4,0,0.2,1), background-color 0.3s",
          display: "flex",
          flexDirection: "column",
          padding: "12px 0",
          zIndex: 120,
          overflowY: "auto",
          boxShadow: isMobile ? "0 0 40px rgba(0,0,0,0.3)" : (dark ? "2px 0 12px rgba(0,0,0,0.5)" : "2px 0 12px rgba(0,0,0,0.05)"),
          transform: isMobile ? (isOpen ? "translateX(0)" : "translateX(-100%)") : "translateX(0)",
        }}
      >
        {/* Bouton de basculement */}
        <button
          onClick={() => {
            if (isMobile) onClose?.();
            else onToggleCollapse?.();
          }}
          aria-label={isMobile ? "Fermer le menu" : collapsed ? "Agrandir" : "Réduire"}
          title={isMobile ? "Fermer" : collapsed ? "Agrandir" : "Réduire"}
          style={{
            background: "none",
            border: "none",
            color: mutedText,
            cursor: "pointer",
            padding: "8px 16px",
            alignSelf: "flex-end",
            fontSize: 20,
            transition: "color 0.2s, transform 0.3s",
            transform: collapsed && !isMobile ? "rotate(180deg)" : "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {isMobile ? <X size={24} /> : collapsed ? <Menu size={22} /> : <ChevronLeft size={22} />}
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
            color: textColor,
            display: "flex",
            alignItems: "center",
            gap: 10,
            transition: "padding 0.3s, font-size 0.3s",
          }}
        >
          {ecole?.logo ? (
            <img
              src={ecole.logo}
              alt="Logo"
              style={{ height: 32, width: 32, borderRadius: 6, objectFit: "contain", background: "rgba(0,0,0,0.05)" }}
            />
          ) : (
            <div style={{ width: 32, height: 32, background: "linear-gradient(135deg, #4F46E5, #7C3AED)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: 14 }}>
              {ecole?.nom?.charAt(0) || "S"}
            </div>
          )}
          {!(collapsed && !isMobile) && (
            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
              {ecole?.nom || "School Management"}
            </span>
          )}
        </div>

        {/* Menu principal */}
        <nav style={{ flex: 1, overflowY: "auto", paddingBottom: 8 }}>
          {menu
            .filter(item => item.id !== "mentions" && item.id !== "confidentialite")
            .map((item) => (
              <button
                key={item.id}
                onClick={() => { onTabChange(item.id); if (isMobile) onClose?.(); }}
                aria-current={activeTab === item.id ? "page" : undefined}
                title={collapsed && !isMobile ? item.label : undefined}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 20px",
                  margin: "0 8px",
                  borderRadius: 10,
                  background: activeTab === item.id ? activeBg : "transparent",
                  border: "none",
                  color: activeTab === item.id ? (dark ? "#FFFFFF" : "#4F46E5") : mutedText,
                  cursor: "pointer",
                  width: "calc(100% - 16px)",
                  textAlign: "left",
                  fontSize: 14,
                  fontWeight: activeTab === item.id ? 600 : 400,
                  transition: "all 0.2s",
                  whiteSpace: "nowrap",
                  position: "relative",
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== item.id) e.currentTarget.style.background = hoverBg;
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== item.id) e.currentTarget.style.background = "transparent";
                }}
              >
                <span style={{ fontSize: 20, width: 24, textAlign: "center", flexShrink: 0 }}>{item.icon}</span>
                {!(collapsed && !isMobile) && <span style={{ flex: 1 }}>{item.label}</span>}
                {item.badge && !(collapsed && !isMobile) && (
                  <span style={{ background: "#EF4444", color: "white", borderRadius: 10, padding: "2px 8px", fontSize: 11, fontWeight: 600, marginLeft: 4 }}>
                    {item.badge}
                  </span>
                )}
                {activeTab === item.id && (
                  <div style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", width: 3, height: 24, background: "#4F46E5", borderRadius: "0 4px 4px 0", transition: "background 0.2s" }} />
                )}
              </button>
            ))}
        </nav>

        {/* Bas de la sidebar */}
        <div style={{ marginTop: "auto", borderTop: `1px solid ${borderColor}`, paddingTop: 8 }}>
          {/* Thème */}
          <button
            onClick={() => { onToggleTheme(); if (isMobile) onClose?.(); }}
            aria-label={dark ? "Mode clair" : "Mode sombre"}
            title={dark ? "Passer en mode clair" : "Passer en mode sombre"}
            style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "10px 20px", margin: "0 8px", borderRadius: 8,
              background: "transparent", border: "none", color: mutedText,
              cursor: "pointer", width: "calc(100% - 16px)", textAlign: "left",
              fontSize: 14, transition: "background 0.2s", whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = hoverBg}
            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
          >
            <span style={{ fontSize: 20, width: 24, textAlign: "center", flexShrink: 0 }}>
              {dark ? <Sun size={20} /> : <Moon size={20} />}
            </span>
            {!(collapsed && !isMobile) && <span>{dark ? "Mode clair" : "Mode sombre"}</span>}
          </button>

          {/* Déconnexion */}
          <button
            onClick={() => { onLogout(); if (isMobile) onClose?.(); }}
            aria-label="Se déconnecter"
            title="Déconnexion"
            style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "10px 20px", margin: "0 8px", borderRadius: 8,
              background: "transparent", border: "none", color: mutedText,
              cursor: "pointer", width: "calc(100% - 16px)", textAlign: "left",
              fontSize: 14, transition: "background 0.2s", whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = hoverBg}
            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
          >
            <LogOut size={20} style={{ width: 24 }} />
            {!(collapsed && !isMobile) && <span>Déconnexion</span>}
          </button>

          {/* Liens légaux */}
          {!(collapsed && !isMobile) ? (
            <div style={{ padding: "8px 20px", fontSize: 12, display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
              <a href="#" onClick={(e) => { e.preventDefault(); onTabChange("mentions"); }} style={{ color: mutedText, textDecoration: "none", transition: "color 0.2s" }}
                onMouseEnter={(e) => e.currentTarget.style.color = textColor}
                onMouseLeave={(e) => e.currentTarget.style.color = mutedText}>
                Mentions légales
              </a>
              <a href="#" onClick={(e) => { e.preventDefault(); onTabChange("confidentialite"); }} style={{ color: mutedText, textDecoration: "none", transition: "color 0.2s" }}
                onMouseEnter={(e) => e.currentTarget.style.color = textColor}
                onMouseLeave={(e) => e.currentTarget.style.color = mutedText}>
                Politique de confidentialité
              </a>
            </div>
          ) : (
            <div style={{ display: "flex", justifyContent: "center", gap: 16, padding: "12px 0" }}>
              <button onClick={() => onTabChange("mentions")} title="Mentions légales" style={{ background: "none", border: "none", color: mutedText, cursor: "pointer", padding: 4 }}>
                <FileText size={18} />
              </button>
              <button onClick={() => onTabChange("confidentialite")} title="Confidentialité" style={{ background: "none", border: "none", color: mutedText, cursor: "pointer", padding: 4 }}>
                <Shield size={18} />
              </button>
            </div>
          )}

          {/* Utilisateur connecté */}
          {user && (
            <div
              style={{
                padding: collapsed && !isMobile ? "12px 0" : "12px 20px",
                fontSize: 12,
                color: mutedText,
                display: "flex",
                alignItems: "center",
                gap: 8,
                borderTop: `1px solid ${borderColor}`,
                marginTop: 8,
                justifyContent: collapsed && !isMobile ? "center" : "flex-start",
                transition: "padding 0.3s",
              }}
            >
              <div style={{ width: 28, height: 28, background: "linear-gradient(135deg, #4F46E5, #7C3AED)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: 12 }}>
                {user.nom.charAt(0).toUpperCase()}
              </div>
              {!(collapsed && !isMobile) && (
                <div style={{ lineHeight: 1.2 }}>
                  <div style={{ color: textColor, fontWeight: 500 }}>{user.nom}</div>
                  <div style={{ color: mutedText, fontSize: 11 }}>{user.role}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </>
  );
}