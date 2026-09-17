import { useEffect, useRef, useCallback } from "react";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  AlertTriangle, X, Info, CheckCircle2, AlertOctagon,
} from "lucide-react";

// ============================================================
// KEYFRAMES (module-level, préfixés cd-*)
// ============================================================
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
    .cd-fade-in {
      animation: cd-fadeIn 0.2s ease;
    }
    .cd-slide-up {
      animation: cd-slideUp 0.28s cubic-bezier(0.22, 1, 0.36, 1);
    }
    .cd-halo {
      animation: cd-haloPulse 2.2s ease-in-out infinite;
    }
    @media (prefers-reduced-motion: reduce) {
      .cd-fade-in, .cd-slide-up, .cd-halo {
        animation: none !important;
      }
    }
  `}</style>
);

// ============================================================
// VARIANTS (couleurs selon le type de confirmation)
// ============================================================
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

export function ConfirmDialog({
  open,
  title = "Confirmer",
  message = "",
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  variant = "danger", // ✅ danger | warning | info | success
  onConfirm,
  onCancel,
}) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();

  const confirmBtnRef = useRef(null);
  const previousFocusRef = useRef(null);

  // ✅ Handlers sécurisés (pas de crash si prop manquante)
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

    const focusTimer = setTimeout(() => {
      confirmBtnRef.current?.focus();
    }, 50);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
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

  // ✅ Résolution du variant (fallback sur danger)
  const v = VARIANTS[variant] ?? VARIANTS.danger;
  const IconComponent = v.icon;

  // ===== Tailles adaptatives =====
  const iconSize = isMobile ? 30 : 34;
  const iconContainerSize = isMobile ? 68 : 76;
  const haloSize = iconContainerSize + 24;

  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";

  return (
    <>
      {ConfirmDialogKeyframes}
      <div
        className="cd-fade-in"
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(2px)",
          WebkitBackdropFilter: "blur(2px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          // ✅ CORRIGÉ : 950 → 1500 (au-dessus de toutes les modales 1200–1300)
          zIndex: 1500,
          padding: isMobile ? 16 : 20,
        }}
        onClick={handleCancel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
      >
        <div
          className="cd-slide-up"
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
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ===== ICÔNE HERO avec halo pulse ===== */}
          <div
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
              aria-hidden="true"
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
            id="confirm-dialog-title"
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
              id="confirm-dialog-message"
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
            <button
              type="button"
              onClick={handleCancel}
              style={{
                flex: isMobile ? "none" : 1,
                padding: isMobile ? "13px 20px" : "11px 20px",
                borderRadius: 12,
                border: `1px solid ${cardBorder}`,
                background: "transparent",
                color: textSecondary,
                cursor: "pointer",
                fontWeight: 600,
                fontSize: isMobile ? 15 : 14,
                transition: "background 0.15s, border-color 0.15s",
                width: isMobile ? "100%" : "auto",
                fontFamily: "inherit",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = dark
                  ? "#0F172A"
                  : "#F8FAFC";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              {cancelLabel}
            </button>
            <button
              ref={confirmBtnRef}
              type="button"
              onClick={handleConfirm}
              style={{
                flex: isMobile ? "none" : 1,
                padding: isMobile ? "13px 20px" : "11px 20px",
                borderRadius: 12,
                border: "none",
                background: `linear-gradient(135deg, ${v.confirmBg} 0%, ${v.confirmBgHover} 100%)`,
                color: v.confirmText,
                cursor: "pointer",
                fontWeight: 700,
                fontSize: isMobile ? 15 : 14,
                transition: "transform 0.1s, box-shadow 0.15s",
                width: isMobile ? "100%" : "auto",
                fontFamily: "inherit",
                boxShadow: `0 4px 12px ${v.confirmBg}40`,
                outline: "none",
              }}
              onMouseDown={(e) =>
                (e.currentTarget.style.transform = "scale(0.97)")
              }
              onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
              onMouseLeave={(e) =>
                (e.currentTarget.style.transform = "scale(1)")
              }
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}