// src/components/ConfirmDialog.jsx
import { useEffect, useRef, useCallback, useState, useId } from "react";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  AlertTriangle, X, Info, CheckCircle2, AlertOctagon,
} from "lucide-react";

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

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

// ════════════════════════════════════════════════════════════════════
// KEYFRAMES MODULE-LEVEL
// ════════════════════════════════════════════════════════════════════
const ConfirmDialogKeyframes = (
  <style>{`
    @keyframes cd-fadeIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    @keyframes cd-slideUp {
      from { transform: translateY(20px) scale(0.96); opacity: 0; }
      to   { transform: translateY(0)    scale(1);    opacity: 1; }
    }
    @keyframes cd-haloPulse {
      0%   { transform: scale(1);    opacity: 0.55; }
      50%  { transform: scale(1.15); opacity: 0.25; }
      100% { transform: scale(1);    opacity: 0.55; }
    }
    .cd-fade-in { animation: cd-fadeIn 0.2s ease; }
    .cd-slide-up { animation: cd-slideUp 0.28s cubic-bezier(0.22, 1, 0.36, 1); }
    .cd-halo { animation: cd-haloPulse 2.2s ease-in-out infinite; }
    @media (prefers-reduced-motion: reduce) {
      .cd-fade-in, .cd-slide-up, .cd-halo { animation: none !important; }
    }
  `}</style>
);

// ════════════════════════════════════════════════════════════════════
// VARIANTES (couleurs selon le type de confirmation)
// ════════════════════════════════════════════════════════════════════
const VARIANTS = {
  danger: {
    icon: AlertOctagon,
    iconColor: "#EF4444",
    iconBgLight: "#FEE2E2",
    iconBgDark: "#7F1D1D",
    confirmBg: "#EF4444",
    confirmBgHover: "#DC2626",
    confirmText: "#FFFFFF",
  },
  warning: {
    icon: AlertTriangle,
    iconColor: "#F59E0B",
    iconBgLight: "#FEF3C7",
    iconBgDark: "#78350F",
    confirmBg: "#F59E0B",
    confirmBgHover: "#D97706",
    confirmText: "#FFFFFF",
  },
  info: {
    icon: Info,
    iconColor: "#4F46E5",
    iconBgLight: "#EEF2FF",
    iconBgDark: "#312E81",
    confirmBg: "#4F46E5",
    confirmBgHover: "#4338CA",
    confirmText: "#FFFFFF",
  },
  success: {
    icon: CheckCircle2,
    iconColor: "#10B981",
    iconBgLight: "#D1FAE5",
    iconBgDark: "#064E3B",
    confirmBg: "#10B981",
    confirmBgHover: "#059669",
    confirmText: "#FFFFFF",
  },
};

// ════════════════════════════════════════════════════════════════════
// HOOK — Focus trap
// ════════════════════════════════════════════════════════════════════
function useFocusTrap(panelRef, isOpen) {
  useEffect(() => {
    if (!isOpen) return;
    const panel = panelRef.current;
    if (!panel) return;

    const handleTab = (e) => {
      if (e.key !== "Tab") return;
      const focusables = panel.querySelectorAll(FOCUSABLE_SELECTOR);
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    panel.addEventListener("keydown", handleTab);
    return () => panel.removeEventListener("keydown", handleTab);
  }, [panelRef, isOpen]);
}

// ════════════════════════════════════════════════════════════════════
// PRESSABLE — bouton avec feedback tap + focus ring
// ════════════════════════════════════════════════════════════════════
function Pressable({
  onClick, style, children, disabled = false, type = "button",
  focusColor, ariaLabel, ...rest
}) {
  const [pressed, setPressed] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      onPointerDown={() => !disabled && setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => { setPressed(false); setHovered(false); }}
      onPointerCancel={() => setPressed(false)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      data-hovered={hovered ? "true" : undefined}
      style={{
        ...TAP_BASE,
        transform: pressed && !disabled ? "scale(0.97)" : "scale(1)",
        transition: "transform 0.1s ease, background 0.15s, border-color 0.15s, box-shadow 0.15s",
        ...(focused && !disabled && focusColor ? FOCUS_RING(focusColor) : null),
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════
// COMPOSANT
// ════════════════════════════════════════════════════════════════════
export function ConfirmDialog({
  open,
  title = "Confirmer",
  message = "",
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  variant = "danger",
  onConfirm,
  onCancel,
}) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();

  const panelRef = useRef(null);
  const confirmBtnRef = useRef(null);
  const previousFocusRef = useRef(null);
  const titleId = useId();
  const messageId = useId();

  // ✅ Focus trap
  useFocusTrap(panelRef, open);

  const handleCancel = useCallback(() => {
    onCancel?.();
  }, [onCancel]);

  const handleConfirm = useCallback(() => {
    onConfirm?.();
  }, [onConfirm]);

  // ===== Fermeture par Échap + focus management =====
  useEffect(() => {
    if (!open) return;

    previousFocusRef.current = document.activeElement;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleCancel();
      }
    };
    document.addEventListener("keydown", handleKeyDown);

    // ✅ Body scroll lock iOS robuste
    const scrollY = window.scrollY;
    const prevOverflow = document.body.style.overflow;
    const prevPosition = document.body.style.position;
    const prevTop = document.body.style.top;
    const prevWidth = document.body.style.width;

    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";

    const focusTimer = setTimeout(() => {
      confirmBtnRef.current?.focus();
    }, 50);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prevOverflow;
      document.body.style.position = prevPosition;
      document.body.style.top = prevTop;
      document.body.style.width = prevWidth;
      window.scrollTo(0, scrollY);
      clearTimeout(focusTimer);
      if (
        previousFocusRef.current &&
        typeof previousFocusRef.current.focus === "function"
      ) {
        previousFocusRef.current.focus();
      }
    };
  }, [open, handleCancel]);

  if (!open) return null;

  const v = VARIANTS[variant] ?? VARIANTS.danger;
  const IconComponent = v.icon;

  const iconSize = isMobile ? 30 : 34;
  const iconContainerSize = isMobile ? 68 : 76;
  const haloSize = iconContainerSize + 24;

  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const cancelHoverBg = dark ? "#0F172A" : "#F8FAFC";

  return (
    <>
      {ConfirmDialogKeyframes}
      <div
        className="cd-fade-in"
        onClick={handleCancel}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(2px)",
          WebkitBackdropFilter: "blur(2px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1500,
          padding: isMobile ? 16 : 20,
          overscrollBehavior: "contain",
        }}
      >
        <div
          ref={panelRef}
          className="cd-slide-up"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={message ? messageId : undefined}
          onClick={(e) => e.stopPropagation()}
          tabIndex={-1}
          style={{
            background: cardBg,
            color: textPrimary,
            borderRadius: 20,
            padding: isMobile ? "28px 20px 20px" : "32px 28px 24px",
            width: "100%",
            maxWidth: 400,
            boxShadow: dark
              ? "0 20px 50px rgba(0,0,0,0.6)"
              : "0 20px 50px rgba(0,0,0,0.25)",
            textAlign: "center",
            border: `1px solid ${cardBorder}`,
            position: "relative",
            outline: "none",
            overscrollBehavior: "contain",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {/* ===== ICÔNE HERO avec halo pulse ===== */}
          <div
            aria-hidden="true"
            style={{
              position: "relative",
              width: iconContainerSize,
              height: iconContainerSize,
              margin: "0 auto 18px",
            }}
          >
            {/* Halo pulse */}
            <div
              className="cd-halo"
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                width: haloSize,
                height: haloSize,
                transform: "translate(-50%, -50%)",
                borderRadius: "50%",
                background: v.iconColor,
                opacity: 0.15,
                pointerEvents: "none",
              }}
            />
            {/* Cercle icône */}
            <div
              style={{
                position: "relative",
                width: "100%",
                height: "100%",
                borderRadius: "50%",
                background: dark ? v.iconBgDark : v.iconBgLight,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: `0 4px 14px ${v.iconColor}30`,
              }}
            >
              <IconComponent size={iconSize} color={v.iconColor} />
            </div>
          </div>

          {/* ===== TITRE ===== */}
          <h3
            id={titleId}
            style={{
              margin: "0 0 8px",
              fontSize: isMobile ? 18 : 19,
              fontWeight: 700,
              color: textPrimary,
              lineHeight: 1.25,
            }}
          >
            {title}
          </h3>

          {/* ===== MESSAGE ===== */}
          {message && (
            <p
              id={messageId}
              style={{
                fontSize: 14,
                color: textSecondary,
                margin: "0 0 24px",
                lineHeight: 1.55,
                padding: "0 4px",
              }}
            >
              {message}
            </p>
          )}

          {/* ===== ACTIONS ===== */}
          <div
            style={{
              display: "flex",
              gap: 10,
              justifyContent: "center",
              flexDirection: isMobile ? "column-reverse" : "row",
            }}
          >
            <CancelButton
              onClick={handleCancel}
              label={cancelLabel}
              cardBorder={cardBorder}
              textSecondary={textSecondary}
              hoverBg={cancelHoverBg}
              isMobile={isMobile}
              focusColor={v.confirmBg}
            />
            <ConfirmButton
              ref={confirmBtnRef}
              onClick={handleConfirm}
              label={confirmLabel}
              v={v}
              isMobile={isMobile}
            />
          </div>
        </div>
      </div>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════
// SOUS-COMPOSANTS (state React pour hover/tap)
// ════════════════════════════════════════════════════════════════════
function CancelButton({
  onClick, label, cardBorder, textSecondary, hoverBg, isMobile, focusColor,
}) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);

  const isActive = hovered || pressed;

  return (
    <button
      type="button"
      onClick={onClick}
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
        flex: isMobile ? "none" : 1,
        padding: isMobile ? "13px 20px" : "13px 20px",
        borderRadius: 12,
        border: `1px solid ${cardBorder}`,
        background: isActive ? hoverBg : "transparent",
        color: textSecondary,
        cursor: "pointer",
        fontWeight: 600,
        fontSize: isMobile ? 15 : 14,
        width: isMobile ? "100%" : "auto",
        fontFamily: "inherit",
        transform: pressed ? "scale(0.97)" : "scale(1)",
        transition: "background 0.15s, border-color 0.15s, transform 0.1s",
        ...(focused ? FOCUS_RING(focusColor) : null),
      }}
    >
      {label}
    </button>
  );
}

function ConfirmButton({ ref, onClick, label, v, isMobile }) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);

  // ✅ Gradient légèrement plus clair au hover via brightness
  const filter = hovered && !pressed ? "brightness(1.08)" : "brightness(1)";

  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
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
        flex: isMobile ? "none" : 1,
        padding: isMobile ? "13px 20px" : "13px 20px",
        borderRadius: 12,
        border: "none",
        background: `linear-gradient(135deg, ${v.confirmBg} 0%, ${v.confirmBgHover} 100%)`,
        color: v.confirmText,
        cursor: "pointer",
        fontWeight: 700,
        fontSize: isMobile ? 15 : 14,
        width: isMobile ? "100%" : "auto",
        fontFamily: "inherit",
        boxShadow: `0 4px 12px ${v.confirmBg}40`,
        outline: "none",
        transform: pressed ? "scale(0.97)" : "scale(1)",
        filter,
        transition: "transform 0.1s, filter 0.15s, box-shadow 0.15s",
        ...(focused ? FOCUS_RING(v.confirmBg) : null),
      }}
    >
      {label}
    </button>
  );
}