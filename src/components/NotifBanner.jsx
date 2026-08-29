import { useState, useEffect } from "react";
import { X, AlertTriangle, CheckCircle, Info, Bell } from "lucide-react";
import { useStyles } from "../styles/theme";

export function NotifBanner({ notifs, onDismiss }) {
  const { dark } = useStyles();
  const [items, setItems] = useState([]);

  useEffect(() => {
    setItems(notifs);
  }, [notifs]);

  if (!items.length) return null;

  // Mapping des types et couleurs
  const typeStyles = (type) => {
    switch (type) {
      case "success":
        return {
          bg: dark ? "#064E3B" : "#D1FAE5",
          color: dark ? "#34D399" : "#065F46",
          icon: <CheckCircle size={20} />,
        };
      case "warning":
        return {
          bg: dark ? "#78350F" : "#FEF3C7",
          color: dark ? "#FBBF24" : "#92400E",
          icon: <AlertTriangle size={20} />,
        };
      case "info":
        return {
          bg: dark ? "#082F49" : "#E0F2FE",
          color: dark ? "#38BDF8" : "#0369A1",
          icon: <Info size={20} />,
        };
      case "alert":
      default:
        return {
          bg: dark ? "#7F1D1D" : "#FEE2E2",
          color: dark ? "#F87171" : "#B91C1C",
          icon: <Bell size={20} />,
        };
    }
  };

  const handleDismiss = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
    if (onDismiss) onDismiss(index);
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 16,
        left: "50%",
        transform: "translateX(-50%)",
        width: "calc(100% - 32px)",
        maxWidth: 500,
        zIndex: 9999,
        pointerEvents: "none",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      {items.map((n, i) => {
        const style = typeStyles(n.type || "alert");
        return (
          <div
            key={i}
            style={{
              background: style.bg,
              color: style.color,
              padding: "14px 20px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              borderRadius: 14,
              boxShadow: dark ? "0 4px 12px rgba(0,0,0,0.5)" : "0 4px 12px rgba(0,0,0,0.1)",
              border: `1px solid ${style.color}40`,
              animation: "slideDown 0.4s ease",
              pointerEvents: "auto",
              transition: "transform 0.3s ease, opacity 0.3s ease",
              transform: "translateY(0)",
              opacity: 1,
            }}
          >
            <span style={{ flexShrink: 0 }}>{style.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{n.title || "Notification"}</div>
              <div style={{ fontSize: 13, opacity: 0.9 }}>{n.message}</div>
            </div>
            <button
              onClick={() => handleDismiss(i)}
              aria-label="Fermer la notification"
              style={{
                background: "none",
                border: "none",
                color: "inherit",
                cursor: "pointer",
                padding: 4,
                flexShrink: 0,
                opacity: 0.8,
                transition: "opacity 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = 0.8)}
            >
              <X size={18} />
            </button>
          </div>
        );
      })}
      <style>{`
        @keyframes slideDown {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}