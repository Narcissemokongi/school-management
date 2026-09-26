// src/components/ui/Button.jsx
import { useState, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { useTokens } from "@/theme/tokens";

// ✅ KEYFRAMES au module-level (composant JSX)
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
  ...rest
}) {
  const t = useTokens();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
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
      transition: `background ${t.transition.fast}, color ${t.transition.fast}`,
      width: fullWidth ? "100%" : "auto",
      fontFamily: t.font.family,
      whiteSpace: "nowrap",
      userSelect: "none",
      border: "none",
      outline: "none",
      textDecoration: "none",
      WebkitTapHighlightColor: "transparent",
    };

    const sizes = {
      sm: { padding: "6px 12px", fontSize: t.font.size.sm },
      md: { padding: "8px 16px", fontSize: t.font.size.md },
      lg: { padding: "12px 20px", fontSize: t.font.size.lg },
    };

    const variants = {
      primary: {
        background: hovered && !isDisabled ? t.accent.primaryHover : t.accent.primary,
        color: t.text.onPrimary,
        border: "none",
      },
      secondary: {
        background: hovered && !isDisabled ? t.surface.hover : "transparent",
        color: t.text.secondary,
        border: `1px solid ${t.border.default}`,
      },
      ghost: {
        background: hovered && !isDisabled ? t.surface.hover : "transparent",
        color: t.text.muted,
        border: "none",
      },
      danger: {
        background: hovered && !isDisabled ? "#DC2626" : "#EF4444",
        color: "#FFFFFF",
        border: "none",
      },
      success: {
        background: hovered && !isDisabled ? "#059669" : "#10B981",
        color: "#FFFFFF",
        border: "none",
      },
    };

    return {
      ...base,
      ...sizes[size],
      ...variants[variant],
      outline: focused ? `2px solid ${t.accent.primary}` : "none",
      outlineOffset: 2,
    };
  }, [t, variant, size, hovered, focused, fullWidth, isDisabled]);

  return (
    <>
      {ButtonKeyframes}
      <button
        type={type}
        onClick={onClick}
        disabled={isDisabled}
        title={title}
        aria-busy={loading}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={styles}
        {...rest}
      >
        {loading ? (
          <Loader2 size={16} style={{ animation: "ui-spin 0.8s linear infinite" }} />
        ) : (
          icon
        )}
        {children}
        {!loading && iconRight}
      </button>
    </>
  );
}

export function IconButton({
  icon,
  label,
  onClick,
  variant = "ghost",
  size = "md",
  disabled = false,
  active = false,
  ...rest
}) {
  const t = useTokens();
  const [hovered, setHovered] = useState(false);
  const dims = { sm: 30, md: 36, lg: 44 };
  const dim = dims[size] ?? dims.md;

  const styles = useMemo(() => {
    const variants = {
      ghost: {
        background: hovered && !disabled
          ? t.surface.hover
          : active
          ? t.accent.primarySoft
          : "transparent",
        color: active ? t.accent.primary : t.text.muted,
        border: "none",
      },
      outline: {
        background: hovered && !disabled ? t.surface.hover : "transparent",
        color: active ? t.accent.primary : t.text.secondary,
        border: `1px solid ${active ? t.accent.primary : t.border.default}`,
      },
      primary: {
        background: hovered && !disabled ? t.accent.primaryHover : t.accent.primary,
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
      transition: `background ${t.transition.fast}`,
      flexShrink: 0,
      padding: 0,
      outline: "none",
      fontFamily: t.font.family,
      ...variants[variant],
    };
  }, [t, variant, hovered, disabled, active, dim]);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={styles}
      {...rest}
    >
      {icon}
    </button>
  );
}