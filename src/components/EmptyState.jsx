// src/components/EmptyState.jsx
import { FileText, Loader } from "lucide-react";
import { useStyles } from "@/styles/theme";
import { useEffect, useState, useCallback } from "react";
import { useIsMobile } from "@/hooks/useIsMobile";

// ════════════════════════════════════════════════════════════════════
// SAFE-AREA
// ════════════════════════════════════════════════════════════════════
const SAFE_TOP = "env(safe-area-inset-top, 0px)";
const SAFE_BOTTOM = "env(safe-area-inset-bottom, 0px)";
const SAFE_LEFT = "env(safe-area-inset-left, 0px)";
const SAFE_RIGHT = "env(safe-area-inset-right, 0px)";

// ✨ Taille minimale tap target mobile
const MOBILE_TAP = 44;

// ════════════════════════════════════════════════════════════════════
// KEYFRAMES module-level
// ════════════════════════════════════════════════════════════════════
const EmptyStateKeyframes = (
  <style>{`
    @keyframes es-fade-in-up {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes es-spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
    .es-spin { animation: es-spin 1s linear infinite; }
    @media (prefers-reduced-motion: reduce) {
      .es-spin,
      .es-fade-in-up {
        animation: none !important;
      }
    }
  `}</style>
);

// ════════════════════════════════════════════════════════════════════
// ✨ ACTION BUTTON — refactoré avec state React
// ════════════════════════════════════════════════════════════════════
function ActionButton({
  label,
  onClick,
  variant = "primary",
  dark,
  effectiveCompact,
  isMobile,
}) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);

  const isPrimary = variant === "primary";

  // Couleurs
  const bg = isPrimary
    ? pressed
      ? dark
        ? "#6366F1"
        : "#4338CA"
      : hovered && !isMobile
      ? dark
        ? "#6366F1"
        : "#4338CA"
      : dark
      ? "#818CF8"
      : "#4F46E5"
    : pressed || (hovered && !isMobile)
    ? dark
      ? "#263142"
      : "#F1F5F9"
    : dark
    ? "#1E293B"
    : "#FFFFFF";

  const fg = isPrimary ? "white" : dark ? "#F1F5F9" : "#1E293B";
  const border = isPrimary
    ? "none"
    : `1px solid ${dark ? "#334155" : "#E2E8F0"}`;

  const handleTouchStart = () => setPressed(true);
  const handleTouchEnd = () => setPressed(false);
  const handleTouchCancel = () => setPressed(false);

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => !isMobile && setHovered(true)}
      onMouseLeave={() => !isMobile && setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      style={{
        padding: effectiveCompact ? "10px 16px" : "12px 20px",
        background: bg,
        color: fg,
        border,
        borderRadius: 8,
        cursor: "pointer",
        fontWeight: 500,
        fontSize: effectiveCompact ? 13 : 14,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        transition:
          "background 0.12s ease, transform 0.1s ease, border-color 0.15s ease",
        outline: focused
          ? `2px solid ${dark ? "#818CF8" : "#4F46E5"}`
          : "none",
        outlineOffset: 2,
        whiteSpace: "nowrap",
        // ✨ Feedback tap
        transform: pressed
          ? "scale(0.97)"
          : hovered && !isMobile
          ? "translateY(-1px)"
          : "translateY(0)",
        // ✨ Mobile : min height WCAG
        minHeight: isMobile ? MOBILE_TAP : undefined,
        // ✨ Neutralise tap delay + flash
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation",
        fontFamily: "inherit",
        boxSizing: "border-box",
      }}
    >
      {label}
    </button>
  );
}

export function EmptyState({
  icon: Icon = FileText,
  title = "Aucune donnée",
  message = "Il n'y a rien à afficher pour le moment.",
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  secondaryMessage,
  compact = false,
  illustration,
  loading = false,
  style,
  inline = false,
  fullWidth = false,
  align = "center",
  animated = true,
}) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();

  const effectiveCompact = compact || isMobile;

  const [reduceMotion, setReduceMotion] = useState(false);

  // ✅ Respect prefers-reduced-motion (fallback Safari < 14)
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);

    const handler = (e) => setReduceMotion(e.matches);

    if (mq.addEventListener) {
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    } else if (mq.addListener) {
      mq.addListener(handler);
      return () => mq.removeListener(handler);
    }
  }, []);

  const shouldAnimate = animated && !reduceMotion;

  const iconSize = effectiveCompact ? 28 : 36;
  const circleSize = effectiveCompact ? 60 : 80;

  const backgroundColor = inline
    ? "transparent"
    : dark
    ? "transparent"
    : "#FFFFFF";
  const borderColor = inline
    ? "transparent"
    : dark
    ? "#334155"
    : "transparent";
  const iconBg = dark ? "#1E293B" : "#EEF2FF";
  const iconColor = dark ? "#94A3B8" : "#4F46E5";
  const titleColor = dark ? "#F1F5F9" : "#1E293B";
  const textColor = dark ? "#94A3B8" : "#64748B";
  const secondaryColor = dark ? "#64748B" : "#94A3B8";

  const alignItems =
    align === "left"
      ? "flex-start"
      : align === "right"
      ? "flex-end"
      : "center";

  const textAlignValue = align;
  const actionsJustify =
    align === "left"
      ? "flex-start"
      : align === "right"
      ? "flex-end"
      : "center";

  // ✨ Padding avec safe-area
  const basePadding = effectiveCompact
    ? "24px 16px"
    : "40px 24px";
  const padding = isMobile
    ? `calc(24px + ${SAFE_TOP}) calc(16px + ${SAFE_RIGHT}) calc(24px + ${SAFE_BOTTOM}) calc(16px + ${SAFE_LEFT})`
    : basePadding;

  return (
    <>
      {EmptyStateKeyframes}
      <div
        role="region"
        aria-label={typeof title === "string" ? title : "État vide"}
        style={{
          textAlign: textAlignValue,
          padding,
          background: backgroundColor,
          borderRadius: inline ? 0 : 16,
          boxShadow: inline
            ? "none"
            : dark
            ? "none"
            : "0 1px 3px rgba(0,0,0,0.05)",
          border: inline ? "none" : `1px solid ${borderColor}`,
          transition: "background-color 0.3s, border-color 0.3s",
          animation: shouldAnimate
            ? "es-fade-in-up 0.4s cubic-bezier(0.4,0,0.2,1)"
            : "none",
          width: fullWidth ? "100%" : undefined,
          display: "flex",
          flexDirection: "column",
          alignItems,
          minWidth: 0,
          maxWidth: "100%",
          boxSizing: "border-box",
          ...style,
        }}
      >
        {/* Illustration ou icône */}
        {illustration ? (
          typeof illustration === "string" ? (
            <img
              src={illustration}
              alt=""
              style={{
                width: effectiveCompact ? 80 : 120,
                height: "auto",
                marginBottom: effectiveCompact ? 16 : 20,
                borderRadius: 12,
                objectFit: "contain",
                maxWidth: "100%",
              }}
            />
          ) : (
            <div style={{ marginBottom: effectiveCompact ? 16 : 20 }}>
              {illustration}
            </div>
          )
        ) : loading ? (
          <div
            style={{
              width: circleSize,
              height: circleSize,
              borderRadius: "50%",
              background: iconBg,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: effectiveCompact ? 16 : 20,
              flexShrink: 0,
            }}
            aria-hidden="true"
          >
            <Loader size={iconSize} color={iconColor} className="es-spin" />
          </div>
        ) : (
          <div
            style={{
              width: circleSize,
              height: circleSize,
              borderRadius: "50%",
              background: iconBg,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: effectiveCompact ? 16 : 20,
              flexShrink: 0,
            }}
            aria-hidden="true"
          >
            <Icon size={iconSize} color={iconColor} strokeWidth={1.5} />
          </div>
        )}

        {/* Titre */}
        <h3
          style={{
            fontSize: effectiveCompact ? 16 : 18,
            fontWeight: 600,
            color: titleColor,
            margin: "0 0 8px",
            maxWidth: "100%",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
          title={typeof title === "string" ? title : undefined}
        >
          {title}
        </h3>

        {/* Message */}
        <p
          style={{
            fontSize: effectiveCompact ? 13 : 14,
            color: textColor,
            maxWidth: "min(360px, 100%)",
            margin: 0,
            lineHeight: 1.5,
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
          title={typeof message === "string" ? message : undefined}
        >
          {message}
        </p>

        {secondaryMessage && (
          <p
            style={{
              fontSize: 12,
              color: secondaryColor,
              margin: "8px 0 0",
              maxWidth: "min(280px, 100%)",
              lineHeight: 1.5,
            }}
          >
            {secondaryMessage}
          </p>
        )}

        {/* Actions */}
        {(actionLabel || secondaryActionLabel) && (
          <div
            style={{
              display: "flex",
              gap: 12,
              justifyContent: actionsJustify,
              flexWrap: "wrap",
              marginTop: 20,
              width: align === "center" ? "auto" : "100%",
              maxWidth: "100%",
              minWidth: 0,
            }}
          >
            {actionLabel && onAction && (
              <ActionButton
                label={actionLabel}
                onClick={onAction}
                variant="primary"
                dark={dark}
                effectiveCompact={effectiveCompact}
                isMobile={isMobile}
              />
            )}
            {secondaryActionLabel && onSecondaryAction && (
              <ActionButton
                label={secondaryActionLabel}
                onClick={onSecondaryAction}
                variant="secondary"
                dark={dark}
                effectiveCompact={effectiveCompact}
                isMobile={isMobile}
              />
            )}
          </div>
        )}
      </div>
    </>
  );
}