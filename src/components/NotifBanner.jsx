// src/components/NotifBanner.jsx
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { X, AlertTriangle, CheckCircle, Info, Bell } from "lucide-react";
import { useStyles } from "@/styles/theme";

// ════════════════════════════════════════════════════════════════════
// CONSTANTES MODULE-LEVEL
// ════════════════════════════════════════════════════════════════════
const TAP_BASE = {
  touchAction: "manipulation",
  WebkitTapHighlightColor: "transparent",
  minHeight: 44,
};

const FOCUS_RING = (color) => ({
  outline: `2px solid ${color}`,
  outlineOffset: 2,
});

// ════════════════════════════════════════════════════════════════════
// KEYFRAMES MODULE-LEVEL (rendus UNE fois)
// ════════════════════════════════════════════════════════════════════
const NotifBannerKeyframes = (
  <style>{`
    @keyframes nb-slideDown {
      from { transform: translateY(-20px); opacity: 0; }
      to   { transform: translateY(0);     opacity: 1; }
    }
    .nb-item {
      animation: nb-slideDown 0.4s ease;
    }
    @media (prefers-reduced-motion: reduce) {
      .nb-item {
        animation: none !important;
        transition: none !important;
      }
    }
  `}</style>
);

// ════════════════════════════════════════════════════════════════════
// HELPER — clé stable pour une notification
// ════════════════════════════════════════════════════════════════════
function getNotifKey(notif, index) {
  if (notif?.id) return String(notif.id);
  if (notif?._id) return String(notif._id);
  const raw = `${notif?.type ?? ""}|${notif?.title ?? ""}|${notif?.message ?? ""}`;
  if (raw.trim() !== "||") return raw;
  return `__idx_${index}`;
}

// ════════════════════════════════════════════════════════════════════
// DISMISS BUTTON — feedback tap + focus ring via state React
// ════════════════════════════════════════════════════════════════════
function DismissButton({ onClick, ariaLabel, color }) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);

  const opacity = hovered || pressed ? 1 : 0.8;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false); }}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        ...TAP_BASE,
        background: "none",
        border: "none",
        color: "inherit",
        cursor: "pointer",
        padding: 8,
        flexShrink: 0,
        opacity,
        minWidth: 44,
        minHeight: 44,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 8,
        transform: pressed ? "scale(0.92)" : "scale(1)",
        transition: "opacity 0.2s, transform 0.12s",
        ...(focused ? FOCUS_RING(color) : null),
      }}
    >
      <X size={18} aria-hidden="true" />
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════
// COMPOSANT
// ════════════════════════════════════════════════════════════════════
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
        setItems((prev) => prev.filter((p, pi) => getNotifKey(p, pi) !== k));
        onDismiss?.(k);
      }, autoDismissMs);
    });
    return () => timers.forEach(clearTimeout);
  }, [items, autoDismissMs, onDismiss]);

  // ===== Styles par type (mémoïsés) =====
  const typeStyles = useMemo(() => ({
    success: {
      bg: dark ? "#064E3B" : "#D1FAE5",
      color: dark ? "#34D399" : "#065F46",
      icon: <CheckCircle size={20} aria-hidden="true" />,
    },
    warning: {
      bg: dark ? "#78350F" : "#FEF3C7",
      color: dark ? "#FBBF24" : "#92400E",
      icon: <AlertTriangle size={20} aria-hidden="true" />,
    },
    info: {
      bg: dark ? "#082F49" : "#E0F2FE",
      color: dark ? "#38BDF8" : "#0369A1",
      icon: <Info size={20} aria-hidden="true" />,
    },
    alert: {
      bg: dark ? "#7F1D1D" : "#FEE2E2",
      color: dark ? "#F87171" : "#B91C1C",
      icon: <Bell size={20} aria-hidden="true" />,
    },
  }), [dark]);

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
    <>
      {NotifBannerKeyframes}
      <div
        role="region"
        aria-label="Notifications"
        aria-live="polite"
        style={{
          position: "fixed",
          top: "calc(16px + env(safe-area-inset-top, 0px))",
          left: "50%",
          transform: "translateX(-50%)",
          width: "calc(100% - 32px)",
          maxWidth: 500,
          zIndex: 900,
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
                padding: "12px 14px 12px 18px",
                display: "flex",
                alignItems: "center",
                gap: 10,
                borderRadius: 14,
                boxShadow: dark
                  ? "0 4px 12px rgba(0,0,0,0.5)"
                  : "0 4px 12px rgba(0,0,0,0.1)",
                border: `1px solid ${style.color}40`,
                pointerEvents: "auto",
                transition: "transform 0.3s ease, opacity 0.3s ease",
                transform: "translateY(0)",
                opacity: 1,
              }}
            >
              <span aria-hidden="true" style={{ flexShrink: 0 }}>
                {style.icon}
              </span>
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
              <DismissButton
                onClick={() => handleDismiss(key)}
                ariaLabel={`Fermer la notification : ${n.title || "Notification"}`}
                color={style.color}
              />
            </div>
          );
        })}
      </div>
    </>
  );
}