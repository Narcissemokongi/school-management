// src/components/ui/Button.jsx
import { useState, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { useTokens } from "@/theme/tokens";
import { useIsMobile } from "@/hooks/useIsMobile";

// ════════════════════════════════════════════════════════════════════
// KEYFRAMES module-level
// ════════════════════════════════════════════════════════════════════
const ButtonKeyframes = (
  <style>{`
    @keyframes ui-spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
    @media (prefers-reduced-motion: reduce) {
      [style*="ui-spin"] {
        animation: none !important;
      }
    }
  `}</style>
);

// ════════════════════════════════════════════════════════════════════
// Taille minimale tap target mobile (WCAG 2.5.5)
// ════════════════════════════════════════════════════════════════════
const MOBILE_MIN_HEIGHT = 44;

// ════════════════════════════════════════════════════════════════════
// BUTTON
// ════════════════════════════════════════════════════════════════════
export function Button({
  children,
  variant = "primary",
  size = "md",
  icon,
  iconRight,
  fullWidth = false,
  loading = false,
  disabled = false,
  onClick,
  type = "button",
  title,
  compact = false,
  style: styleProp,   // ✨ extrait explicitement (fix critique)
  ...rest
}) {
  const t = useTokens();
  const isMobile = useIsMobile();

  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);

  const isDisabled = disabled || loading;

  const styles = useMemo(() => {
    const base = {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      fontWeight: 600,
      borderRadius: t.radius.sm,
      cursor: isDisabled ? "not-allowed" : "pointer",
      opacity: isDisabled ? 0.6 : 1,
      transition: `background ${t.transition.fast}, color ${t.transition.fast}, transform 0.1s ease, box-shadow 0.15s ease`,
      width: fullWidth ? "100%" : "auto",
      fontFamily: t.font.family,
      whiteSpace: "nowrap",
      userSelect: "none",
      border: "none",
      outline: "none",
      textDecoration: "none",
      WebkitTapHighlightColor: "transparent",
      touchAction: "manipulation",
      transform: pressed && !isDisabled ? "scale(0.97)" : "scale(1)",
      boxSizing: "border-box",
      minWidth: 0,
    };

    const sizes = {
      sm: { padding: "6px 12px", fontSize: t.font.size.sm },
      md: { padding: "8px 16px", fontSize: t.font.size.md },
      lg: { padding: "12px 20px", fontSize: t.font.size.lg },
    };

    const mobileOverride =
      isMobile && !compact
        ? {
            minHeight: MOBILE_MIN_HEIGHT,
            padding: size === "sm" ? "10px 16px" : undefined,
          }
        : {};

    const variants = {
      primary: {
        background:
          hovered && !isDisabled && !isMobile
            ? t.accent.primaryHover
            : pressed && !isDisabled
            ? t.accent.primaryHover
            : t.accent.primary,
        color: t.text.onPrimary,
        border: "none",
        boxShadow:
          pressed && !isDisabled
            ? "0 2px 6px rgba(79,70,229,0.2)"
            : "none",
      },
      secondary: {
        background:
          hovered && !isDisabled && !isMobile
            ? t.surface.hover
            : pressed && !isDisabled
            ? t.surface.hover
            : "transparent",
        color: t.text.secondary,
        border: `1px solid ${t.border.default}`,
      },
      ghost: {
        background:
          hovered && !isDisabled && !isMobile
            ? t.surface.hover
            : pressed && !isDisabled
            ? t.surface.hover
            : "transparent",
        color: t.text.muted,
        border: "none",
      },
      danger: {
        background:
          hovered && !isDisabled && !isMobile
            ? "#DC2626"
            : pressed && !isDisabled
            ? "#DC2626"
            : "#EF4444",
        color: "#FFFFFF",
        border: "none",
      },
      success: {
        background:
          hovered && !isDisabled && !isMobile
            ? "#059669"
            : pressed && !isDisabled
            ? "#059669"
            : "#10B981",
        color: "#FFFFFF",
        border: "none",
      },
    };

    return {
      ...base,
      ...sizes[size],
      ...variants[variant],
      ...mobileOverride,
      outline: focused ? `2px solid ${t.accent.primary}` : "none",
      outlineOffset: 2,
    };
  }, [t, variant, size, hovered, focused, pressed, fullWidth, isDisabled, isMobile, compact]);

  const handleTouchStart = () => {
    if (!isDisabled) setPressed(true);
  };
  const handleTouchEnd = () => {
    setPressed(false);
  };

  return (
    <>
      {ButtonKeyframes}
      <button
        type={type}
        onClick={onClick}
        disabled={isDisabled}
        title={title}
        aria-busy={loading}
        onMouseEnter={() => !isMobile && setHovered(true)}
        onMouseLeave={() => !isMobile && setHovered(false)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        // ✨ FIX CRITIQUE : merge au lieu d'écraser
        style={{ ...styles, ...styleProp }}
        {...rest}
      >
        {loading ? (
          <Loader2
            size={16}
            style={{ animation: "ui-spin 0.8s linear infinite" }}
          />
        ) : (
          icon
        )}
        {children}
        {!loading && iconRight}
      </button>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════
// ICON BUTTON
// ════════════════════════════════════════════════════════════════════
export function IconButton({
  icon,
  label,
  onClick,
  variant = "ghost",
  size = "md",
  disabled = false,
  active = false,
  compact = false,
  style: styleProp,   // ✨ extrait explicitement (fix critique)
  ...rest
}) {
  const t = useTokens();
  const isMobile = useIsMobile();

  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);

  const desktopDims = { sm: 30, md: 36, lg: 44 };
  const mobileDims = { sm: 44, md: 44, lg: 48 };

  const dim = useMemo(() => {
    if (isMobile && !compact) {
      return mobileDims[size] ?? mobileDims.md;
    }
    return desktopDims[size] ?? desktopDims.md;
  }, [isMobile, size, compact]);

  const styles = useMemo(() => {
    const variants = {
      ghost: {
        background:
          hovered && !disabled && !isMobile
            ? t.surface.hover
            : pressed && !disabled
            ? t.surface.hover
            : active
            ? t.accent.primarySoft
            : "transparent",
        color: active ? t.accent.primary : t.text.muted,
        border: "none",
      },
      outline: {
        background:
          hovered && !disabled && !isMobile
            ? t.surface.hover
            : pressed && !disabled
            ? t.surface.hover
            : "transparent",
        color: active ? t.accent.primary : t.text.secondary,
        border: `1px solid ${
          active ? t.accent.primary : t.border.default
        }`,
      },
      primary: {
        background:
          hovered && !disabled && !isMobile
            ? t.accent.primaryHover
            : pressed && !disabled
            ? t.accent.primaryHover
            : t.accent.primary,
        color: "#FFFFFF",
        border: "none",
      },
    };

    return {
      width: dim,
      height: dim,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: t.radius.sm,
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1,
      transition: `background ${t.transition.fast}, transform 0.1s ease`,
      flexShrink: 0,
      padding: 0,
      outline: focused ? `2px solid ${t.accent.primary}` : "none",
      outlineOffset: 2,
      fontFamily: t.font.family,
      transform: pressed && !disabled ? "scale(0.92)" : "scale(1)",
      WebkitTapHighlightColor: "transparent",
      touchAction: "manipulation",
      boxSizing: "border-box",
      ...variants[variant],
    };
  }, [t, variant, hovered, pressed, focused, disabled, active, dim, isMobile]);

  const handleTouchStart = () => {
    if (!disabled) setPressed(true);
  };
  const handleTouchEnd = () => {
    setPressed(false);
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      onMouseEnter={() => !isMobile && setHovered(true)}
      onMouseLeave={() => !isMobile && setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      // ✨ FIX CRITIQUE : merge au lieu d'écraser
      style={{ ...styles, ...styleProp }}
      {...rest}
    >
      {icon}
    </button>
  );
}