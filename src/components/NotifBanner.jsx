import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { X, AlertTriangle, CheckCircle, Info, Bell } from "lucide-react";
import { useStyles } from "@/styles/theme";

// Génère une clé stable pour une notification
function getNotifKey(notif, index) {
  if (notif?.id) return String(notif.id);
  if (notif?._id) return String(notif._id);
  // Fallback : hash titre+message (stable pour la même notif)
  const raw = `${notif?.type ?? ""}|${notif?.title ?? ""}|${notif?.message ?? ""}`;
  if (raw.trim() !== "||") return raw;
  return `__idx_${index}`;
}

export function NotifBanner({ notifs, onDismiss, autoDismissMs = 0 }) {
  const { dark } = useStyles();
  const [items, setItems] = useState(notifs ?? []);
  const dismissedKeysRef = useRef(new Set());

  // ✅ Re-sync uniquement des NOUVELLES notifs (pas de résurrection)
  useEffect(() => {
    const incoming = notifs ?? [];
    setItems((prev) => {
      const prevKeys = new Set(prev.map((n, i) => getNotifKey(n, i)));
      const filtered = incoming.filter((n, i) => {
        const k = getNotifKey(n, i);
        if (dismissedKeysRef.current.has(k)) return false;
        if (prevKeys.has(k)) return false; // déjà affichée → on garde la version locale
        return true;
      });
      return [...prev, ...filtered];
    });
  }, [notifs]);

  // ===== Auto-dismiss (optionnel) =====
  useEffect(() => {
    if (!autoDismissMs || autoDismissMs <= 0) return;
    const timers = items.map((n, i) => {
      const k = getNotifKey(n, i);
      return setTimeout(() => {
        dismissedKeysRef.current.add(k);
        setItems((prev) =>
          prev.filter((p, pi) => getNotifKey(p, pi) !== k)
        );
        onDismiss?.(k);
      }, autoDismissMs);
    });
    return () => timers.forEach(clearTimeout);
  }, [items, autoDismissMs, onDismiss]);

  // ===== Styles par type (mémoïsés) =====
  const typeStyles = useMemo(() => {
    return {
      success: {
        bg: dark ? "#064E3B" : "#D1FAE5",
        color: dark ? "#34D399" : "#065F46",
        icon: <CheckCircle size={20} />,
      },
      warning: {
        bg: dark ? "#78350F" : "#FEF3C7",
        color: dark ? "#FBBF24" : "#92400E",
        icon: <AlertTriangle size={20} />,
      },
      info: {
        bg: dark ? "#082F49" : "#E0F2FE",
        color: dark ? "#38BDF8" : "#0369A1",
        icon: <Info size={20} />,
      },
      alert: {
        bg: dark ? "#7F1D1D" : "#FEE2E2",
        color: dark ? "#F87171" : "#B91C1C",
        icon: <Bell size={20} />,
      },
    };
  }, [dark]);

  const handleDismiss = useCallback(
    (key) => {
      dismissedKeysRef.current.add(key);
      setItems((prev) => prev.filter((p, pi) => getNotifKey(p, pi) !== key));
      onDismiss?.(key);
    },
    [onDismiss]
  );

  if (!items.length) return null;

  return (
    <div
      role="region"
      aria-label="Notifications"
      aria-live="polite"
      style={{
        position: "fixed",
        top: 16,
        left: "50%",
        transform: "translateX(-50%)",
        width: "calc(100% - 32px)",
        maxWidth: 500,
        zIndex: 900, // ✅ sous les modales critiques (950+)
        pointerEvents: "none",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      {items.map((n, i) => {
        const key = getNotifKey(n, i);
        const style = typeStyles[n.type] ?? typeStyles.alert;
        return (
          <div
            key={key}
            className="nb-item"
            style={{
              background: style.bg,
              color: style.color,
              padding: "14px 20px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              borderRadius: 14,
              boxShadow: dark
                ? "0 4px 12px rgba(0,0,0,0.5)"
                : "0 4px 12px rgba(0,0,0,0.1)",
              border: `1px solid ${style.color}40`,
              animation: "nb-slideDown 0.4s ease",
              pointerEvents: "auto",
              transition: "transform 0.3s ease, opacity 0.3s ease",
              transform: "translateY(0)",
              opacity: 1,
            }}
          >
            <span style={{ flexShrink: 0 }}>{style.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>
                {n.title || "Notification"}
              </div>
              <div
                style={{
                  fontSize: 13,
                  opacity: 0.9,
                  wordBreak: "break-word",
                }}
              >
                {n.message}
              </div>
            </div>
            <button
              onClick={() => handleDismiss(key)}
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
        @keyframes nb-slideDown {
          from { transform: translateY(-20px); opacity: 0; }
          to   { transform: translateY(0);     opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .nb-item {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </div>
  );
}