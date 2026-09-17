// src/components/StatCard.jsx
import { useState, useMemo, useCallback } from "react";
import {
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Loader,
  AlertCircle,
} from "lucide-react";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";

// ════════════════════════════════════════════════════════════════════
// KEYFRAMES (JSX module-level — réutilisé tel quel, pas recréé)
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
function hexToRgba(hex, alpha) {
  if (!hex) return `rgba(0, 0, 0, ${alpha})`;
  let clean = hex.replace(/^#/, "");

  // #FFF → #FFFFFF
  if (clean.length === 3) {
    clean = clean
      .split("")
      .map((c) => c + c)
      .join("");
  }

  if (!/^[0-9A-F]{6}$/i.test(clean)) {
    return `rgba(0, 0, 0, ${alpha})`;
  }

  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// Dimensions par taille
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
  const { dark } = useStyles();
  const isMobile = useIsMobile();
  // ✅ FIX — hover via state (pilote transform + boxShadow ensemble)
  const [isHovered, setIsHovered] = useState(false);
  // ✅ FIX — focus via state (pas de mutation DOM)
  const [isCardFocused, setIsCardFocused] = useState(false);
  const [isIconFocused, setIsIconFocused] = useState(false);

  const noMotion = useMemo(() => prefersReducedMotion(), []);

  const isClickable = Boolean(onClick) && !disabled;
  const isIconClickable = Boolean(onIconClick) && !disabled;

  const effectiveSize = isMobile && size === "normal" ? "small" : size;
  const baseDim = DIMENSIONS[effectiveSize] || DIMENSIONS.normal;

  const dim = useMemo(
    () => ({
      padding: isMobile && baseDim.paddingDesktop
        ? baseDim.padding
        : baseDim.paddingDesktop || baseDim.padding,
      fontSize: isMobile && baseDim.fontSizeDesktop
        ? baseDim.fontSize
        : baseDim.fontSizeDesktop || baseDim.fontSize,
      iconBox: isMobile && baseDim.iconBoxDesktop
        ? baseDim.iconBox
        : baseDim.iconBoxDesktop || baseDim.iconBox,
    }),
    [isMobile, baseDim]
  );

  const effectiveIconSize =
    isMobile && effectiveSize === "small" ? Math.min(iconSize, 20) : iconSize;

  // ✅ FIX — hexToRgba mémoïsé
  const iconBg = useMemo(
    () => hexToRgba(color, dark ? 0.2 : 0.08),
    [color, dark]
  );
  const outlineBorder = useMemo(
    () => hexToRgba(color, dark ? 0.4 : 0.2),
    [color, dark]
  );
  const filledBg = useMemo(
    () => hexToRgba(color, dark ? 0.2 : 0.08),
    [color, dark]
  );
  const filledBorder = useMemo(
    () => hexToRgba(color, dark ? 0.5 : 0.3),
    [color, dark]
  );

  const styleVariant = useMemo(() => {
    const variants = {
      default: {
        background: dark ? "#1E293B" : "#FFFFFF",
        border: `1px solid ${
          dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"
        }`,
      },
      outlined: {
        background: "transparent",
        border: `1px solid ${outlineBorder}`,
      },
      filled: {
        background: filledBg,
        border: `1px solid ${filledBorder}`,
      },
    };
    return variants[variant] || variants.default;
  }, [variant, dark, outlineBorder, filledBg, filledBorder]);

  const trendColor =
    trend?.direction === "up"
      ? "#10B981"
      : trend?.direction === "down"
      ? "#EF4444"
      : dark
      ? "#94A3B8"
      : "#64748B";

  // ✅ FIX — handlers stables
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

  // ✅ FIX — transform + boxShadow pilotés par state
  const transform = useMemo(() => {
    if (active) return "scale(1.02)";
    if (isHovered && isClickable && !noMotion) return "translateY(-2px)";
    return "translateY(0)";
  }, [active, isHovered, isClickable, noMotion]);

  const boxShadow = useMemo(() => {
    if (isHovered && isClickable) {
      return dark
        ? "0 4px 12px rgba(0,0,0,0.4)"
        : "0 4px 12px rgba(0,0,0,0.1)";
    }
    return dark
      ? "0 1px 3px rgba(0,0,0,0.3)"
      : "0 1px 3px rgba(0,0,0,0.05)";
  }, [isHovered, isClickable, dark]);

  // ════════════════════════════════════════════════════════════════
  // Sous-rendus
  // ════════════════════════════════════════════════════════════════
  const renderTrend = () => {
    if (loading) {
      return (
        <div
          data-statcard-animated
          style={{
            width: 60,
            height: 12,
            background: dark ? "#334155" : "#E2E8F0",
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
  };

  const renderValueContent = () => {
    if (loading) {
      return (
        <div
          data-statcard-animated
          style={{
            width: 60,
            height: dim.fontSize,
            background: dark ? "#334155" : "#E2E8F0",
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
    if (renderValue) {
      return renderValue();
    }
    return (
      <>
        {valuePrefix && (
          <span
            style={{
              fontSize: dim.fontSize * 0.6,
              color: dark ? "#94A3B8" : "#64748B",
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
              color: dark ? "#94A3B8" : "#64748B",
            }}
          >
            {valueSuffix}
          </span>
        )}
      </>
    );
  };

  const renderLabel = () => {
    if (loading) {
      return (
        <div
          data-statcard-animated
          style={{
            width: 80,
            height: 14,
            background: dark ? "#334155" : "#E2E8F0",
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
  };

  // ════════════════════════════════════════════════════════════════
  // RENDU
  // ════════════════════════════════════════════════════════════════
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
        onMouseEnter={() => isClickable && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocus={() => isClickable && setIsCardFocused(true)}
        onBlur={() => setIsCardFocused(false)}
        style={{
          ...styleVariant,
          borderRadius: 16,
          padding: dim.padding,
          display: "flex",
          alignItems: "center",
          gap: isMobile ? 10 : 16,
          boxShadow,
          transition: noMotion
            ? "background-color 0.3s, border-color 0.3s"
            : "transform 0.2s, box-shadow 0.2s, background-color 0.3s, border-color 0.3s",
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
          flexWrap: "nowrap",
        }}
      >
        {/* Icône avec gestionnaire séparé */}
        <div
          onClick={isIconClickable ? handleIconClick : undefined}
          onKeyDown={handleIconKeyDown}
          role={isIconClickable ? "button" : undefined}
          tabIndex={isIconClickable ? 0 : undefined}
          title={isIconClickable ? "Action sur l'icône" : undefined}
          aria-label={isIconClickable ? `Action sur ${label}` : undefined}
          onFocus={() => isIconClickable && setIsIconFocused(true)}
          onBlur={() => setIsIconFocused(false)}
          style={{
            width: dim.iconBox,
            height: dim.iconBox,
            background: iconBg,
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: color,
            flexShrink: 0,
            cursor: isIconClickable ? "pointer" : "default",
            outline: isIconFocused ? `2px solid ${color}` : "none",
            outlineOffset: isIconFocused ? 2 : 0,
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

        {/* Contenu texte */}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontSize: dim.fontSize,
              fontWeight: 700,
              color: dark ? "#F1F5F9" : "#1E293B",
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
              fontSize: isMobile ? 12 : 14,
              color: dark ? "#94A3B8" : "#64748B",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {renderLabel()}
          </div>
          {subValue && (
            <div
              style={{
                fontSize: isMobile ? 11 : 12,
                color: subValueColor || (dark ? "#A5B4FC" : "#4F46E5"),
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
            style={{
              color: dark ? "#94A3B8" : "#64748B",
              flexShrink: 0,
              marginLeft: 4,
            }}
          />
        )}
      </div>
    </>
  );
}