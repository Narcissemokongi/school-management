// src/components/StatCard.jsx
import { useState, useMemo, useCallback } from "react";
import {
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Loader,
  AlertCircle,
} from "lucide-react";
import { useTokens } from "@/theme/tokens";
import { useIsMobile } from "@/hooks/useIsMobile";
import { hexToRgba } from "@/utils/colors";

// ════════════════════════════════════════════════════════════════════
// KEYFRAMES
// ════════════════════════════════════════════════════════════════════
const StatCardKeyframes = (
  <style>{`
    @keyframes sc-fade {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes sc-pulse {
      0%, 100% { opacity: 1; }
      50%      { opacity: 0.5; }
    }
    @keyframes sc-spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
    .sc-spin { animation: sc-spin 1s linear infinite; }
    @media (prefers-reduced-motion: reduce) {
      .sc-spin,
      [data-statcard-animated] {
        animation: none !important;
      }
    }
  `}</style>
);

// ════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════
const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const DIMENSIONS = {
  small: {
    padding: 10,
    paddingDesktop: 12,
    fontSize: 16,
    fontSizeDesktop: 18,
    iconBox: 32,
    iconBoxDesktop: 36,
  },
  normal: { padding: 20, fontSize: 24, iconBox: 48 },
  large: { padding: 28, fontSize: 32, iconBox: 64 },
};

// ════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ════════════════════════════════════════════════════════════════════
export function StatCard({
  icon,
  value,
  label,
  color = "#4F46E5",
  onClick,
  onIconClick,
  subValue,
  subValueColor,
  showArrow = false,
  size = "normal",
  iconSize = 24,
  valueSuffix,
  valuePrefix,
  loading = false,
  error = false,
  errorMessage = "Erreur",
  trend,
  variant = "default",
  tooltip,
  active = false,
  disabled = false,
  renderValue,
}) {
  const t = useTokens();
  const isMobile = useIsMobile();

  const [isHovered, setIsHovered] = useState(false);
  const [isCardFocused, setIsCardFocused] = useState(false);
  // ✨ Nouveau : feedback tap
  const [isPressed, setIsPressed] = useState(false);

  const noMotion = useMemo(() => prefersReducedMotion(), []);

  const isClickable = Boolean(onClick) && !disabled;
  const isIconClickable = Boolean(onIconClick) && !disabled;

  const effectiveSize = isMobile && size === "normal" ? "small" : size;
  const baseDim = DIMENSIONS[effectiveSize] || DIMENSIONS.normal;

  const dim = useMemo(
    () => ({
      padding:
        isMobile && baseDim.paddingDesktop
          ? baseDim.padding
          : baseDim.paddingDesktop || baseDim.padding,
      fontSize:
        isMobile && baseDim.fontSizeDesktop
          ? baseDim.fontSize
          : baseDim.fontSizeDesktop || baseDim.fontSize,
      iconBox:
        isMobile && baseDim.iconBoxDesktop
          ? baseDim.iconBox
          : baseDim.iconBoxDesktop || baseDim.iconBox,
    }),
    [isMobile, baseDim]
  );

  const effectiveIconSize =
    isMobile && effectiveSize === "small" ? Math.min(iconSize, 20) : iconSize;

  const iconBg = useMemo(
    () => hexToRgba(color, t.surface.page === "#0F172A" ? 0.2 : 0.08),
    [color, t.surface.page]
  );

  const styleVariant = useMemo(() => {
    const isDark = t.surface.page === "#0F172A";
    const variants = {
      default: {
        background: t.surface.default,
        border: `1px solid ${t.border.subtle}`,
      },
      outlined: {
        background: "transparent",
        border: `1px solid ${hexToRgba(color, isDark ? 0.4 : 0.2)}`,
      },
      filled: {
        background: hexToRgba(color, isDark ? 0.2 : 0.08),
        border: `1px solid ${hexToRgba(color, isDark ? 0.5 : 0.3)}`,
      },
    };
    return variants[variant] || variants.default;
  }, [variant, color, t]);

  const trendColor =
    trend?.direction === "up"
      ? "#10B981"
      : trend?.direction === "down"
      ? "#EF4444"
      : t.text.muted;

  // ────────────────────────────────────────────────────────────
  // Handlers
  // ────────────────────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e) => {
      if (isClickable && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        onClick();
      }
    },
    [isClickable, onClick]
  );

  const handleIconKeyDown = useCallback(
    (e) => {
      if (isIconClickable && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        onIconClick();
      }
    },
    [isIconClickable, onIconClick]
  );

  const handleIconClick = useCallback(
    (e) => {
      e.stopPropagation();
      if (isIconClickable) onIconClick();
    },
    [isIconClickable, onIconClick]
  );

  // ✨ Handlers touch
  const handleTouchStart = useCallback(() => {
    if (isClickable) setIsPressed(true);
  }, [isClickable]);

  const handleTouchEnd = useCallback(() => {
    setIsPressed(false);
  }, []);

  const transform = useMemo(() => {
    if (isPressed) return "scale(0.97)";       // ✨ Feedback tap
    if (active) return "scale(1.02)";
    if (!isMobile && isHovered && isClickable && !noMotion) return "translateY(-2px)";
    return "translateY(0)";
  }, [isPressed, active, isHovered, isClickable, isMobile, noMotion]);

  const boxShadow = useMemo(() => {
    if (isPressed) return t.shadow.sm;         // ✨ Réduit quand tapé
    if (!isMobile && isHovered && isClickable) return t.shadow.md;
    return t.shadow.sm;
  }, [isPressed, isHovered, isClickable, isMobile, t]);

  // ────────────────────────────────────────────────────────────
  // Sous-rendus
  // ────────────────────────────────────────────────────────────
  const renderTrend = useCallback(() => {
    if (loading) {
      return (
        <div
          data-statcard-animated
          style={{
            width: 60,
            height: 12,
            background: t.border.default,
            borderRadius: 4,
            animation: noMotion
              ? "none"
              : "sc-pulse 1.5s ease-in-out infinite",
            marginTop: 4,
          }}
        />
      );
    }
    if (!trend) return null;

    const TrendIcon =
      trend.direction === "up"
        ? TrendingUp
        : trend.direction === "down"
        ? TrendingDown
        : null;

    return (
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          color: trendColor,
          fontSize: 12,
          fontWeight: 600,
          marginTop: 2,
        }}
      >
        {TrendIcon && <TrendIcon size={14} />}
        {trend.value}
      </div>
    );
  }, [loading, trend, trendColor, noMotion, t]);

  const renderValueContent = useCallback(() => {
    if (loading) {
      return (
        <div
          data-statcard-animated
          style={{
            width: 60,
            height: dim.fontSize,
            background: t.border.default,
            borderRadius: 4,
            animation: noMotion
              ? "none"
              : "sc-pulse 1.5s ease-in-out infinite",
          }}
        />
      );
    }
    if (error) {
      return (
        <span
          style={{
            color: "#EF4444",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <AlertCircle size={dim.fontSize * 0.8} />
          {errorMessage}
        </span>
      );
    }
    if (renderValue) return renderValue();

    return (
      <>
        {valuePrefix && (
          <span
            style={{
              fontSize: dim.fontSize * 0.6,
              color: t.text.muted,
            }}
          >
            {valuePrefix}
          </span>
        )}
        {typeof value === "number"
          ? value.toLocaleString("fr-FR")
          : value ?? "—"}
        {valueSuffix && (
          <span
            style={{
              fontSize: dim.fontSize * 0.6,
              color: t.text.muted,
            }}
          >
            {valueSuffix}
          </span>
        )}
      </>
    );
  }, [loading, error, errorMessage, renderValue, value, valuePrefix, valueSuffix, dim, noMotion, t]);

  const renderLabel = useCallback(() => {
    if (loading) {
      return (
        <div
          data-statcard-animated
          style={{
            width: 80,
            height: 14,
            background: t.border.default,
            borderRadius: 4,
            animation: noMotion
              ? "none"
              : "sc-pulse 1.5s ease-in-out infinite",
            marginTop: 4,
          }}
        />
      );
    }
    return label;
  }, [loading, label, noMotion, t]);

  // ────────────────────────────────────────────────────────────
  // Rendu
  // ────────────────────────────────────────────────────────────
  return (
    <>
      {StatCardKeyframes}

      <div
        onClick={isClickable ? onClick : undefined}
        onKeyDown={handleKeyDown}
        role={isClickable ? "button" : undefined}
        tabIndex={isClickable ? 0 : undefined}
        aria-label={isClickable ? `${label} : ${value}` : undefined}
        aria-disabled={disabled || undefined}
        title={tooltip}
        // ✨ Hover désactivé sur mobile
        onMouseEnter={() => !isMobile && isClickable && setIsHovered(true)}
        onMouseLeave={() => !isMobile && setIsHovered(false)}
        onFocus={() => isClickable && setIsCardFocused(true)}
        onBlur={() => setIsCardFocused(false)}
        // ✨ Feedback tap
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        style={{
          ...styleVariant,
          borderRadius: t.radius.lg,
          padding: dim.padding,
          display: "flex",
          alignItems: "center",
          gap: isMobile ? 10 : 16,
          boxShadow,
          transition: noMotion
            ? `background-color ${t.transition.slow}, border-color ${t.transition.slow}`
            : `transform ${t.transition.normal}, box-shadow ${t.transition.normal}, background-color ${t.transition.slow}, border-color ${t.transition.slow}`,
          cursor: isClickable
            ? "pointer"
            : disabled && !loading
            ? "not-allowed"
            : "default",
          animation: noMotion ? "none" : "sc-fade 0.3s ease-out",
          position: "relative",
          outline: isCardFocused ? `2px solid ${color}` : "none",
          outlineOffset: isCardFocused ? 2 : 0,
          opacity: disabled && !loading ? 0.6 : 1,
          border: active ? `2px solid ${color}` : styleVariant.border,
          transform,
          // ✨ Mobile : autorise wrap pour éviter débordement en 2 colonnes
          flexWrap: isMobile ? "wrap" : "nowrap",
          // ✨ Mobile : neutralise tap delay + flash
          WebkitTapHighlightColor: "transparent",
          touchAction: "manipulation",
          minWidth: 0,
          boxSizing: "border-box",
        }}
      >
        {/* ═══ Icône ═══ */}
        <div
          onClick={isIconClickable ? handleIconClick : undefined}
          onKeyDown={handleIconKeyDown}
          role={isIconClickable ? "button" : undefined}
          tabIndex={isIconClickable ? 0 : undefined}
          title={isIconClickable ? "Action sur l'icône" : undefined}
          aria-label={isIconClickable ? `Action sur ${label}` : undefined}
          style={{
            width: dim.iconBox,
            height: dim.iconBox,
            background: iconBg,
            borderRadius: t.radius.md,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: color,
            flexShrink: 0,
            cursor: isIconClickable ? "pointer" : "default",
            outline: "none",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          {loading ? (
            <Loader size={effectiveIconSize} className="sc-spin" />
          ) : error ? (
            <AlertCircle size={effectiveIconSize} color="#EF4444" />
          ) : (
            icon
          )}
        </div>

        {/* ═══ Contenu ═══ */}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontSize: dim.fontSize,
              fontWeight: 700,
              color: t.text.primary,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "flex",
              alignItems: "baseline",
              gap: 4,
            }}
          >
            {renderValueContent()}
          </div>
          <div
            style={{
              fontSize: isMobile ? 11.5 : 14,
              color: t.text.muted,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              lineHeight: 1.3,
            }}
          >
            {renderLabel()}
          </div>
          {subValue && (
            <div
              style={{
                fontSize: isMobile ? 10.5 : 12,
                color: subValueColor || t.accent.primary,
                marginTop: 2,
                fontWeight: 500,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {subValue}
            </div>
          )}
          {renderTrend()}
        </div>

        {isClickable && showArrow && (
          <ChevronRight
            size={isMobile ? 16 : 18}
            style={{ color: t.text.muted, flexShrink: 0, marginLeft: 4 }}
          />
        )}
      </div>
    </>
  );
}