import { useState } from "react";
import {
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Loader,
  AlertCircle,
} from "lucide-react";
import { useStyles } from "../../styles/theme";

function hexToRgba(hex, alpha) {
  if (!/^#([0-9A-F]{6})$/i.test(hex)) return `rgba(0, 0, 0, ${alpha})`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function StatCard({
  icon,
  value,
  label,
  color = "#4F46E5",
  onClick,
  onIconClick, // Nouveau : gestionnaire de clic sur l'icône séparé
  subValue,
  subValueColor,
  showArrow = false,
  size = "normal",
  iconSize = 24,
  valueSuffix,
  valuePrefix,
  loading = false,
  error = false,          // Nouveau : état d'erreur
  errorMessage = "Erreur", // Message d'erreur (affiché dans le tooltip)
  trend,
  variant = "default",
  tooltip,
  active = false,
  disabled = false,
  renderValue, // Nouveau : fonction de rendu personnalisé de la valeur
}) {
  const { dark } = useStyles();
  const [isHovered, setIsHovered] = useState(false);
  const isClickable = Boolean(onClick) && !disabled;
  const isIconClickable = Boolean(onIconClick) && !disabled;

  const handleKeyDown = (e) => {
    if (isClickable && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onClick();
    }
  };

  const handleIconKeyDown = (e) => {
    if (isIconClickable && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onIconClick();
    }
  };

  const dimensions = {
    small: { padding: 12, fontSize: 18, iconBox: 36 },
    normal: { padding: 20, fontSize: 24, iconBox: 48 },
    large: { padding: 28, fontSize: 32, iconBox: 64 },
  };
  const dim = dimensions[size] || dimensions.normal;

  const variantStyles = {
    default: {
      background: dark ? "#1E293B" : "#FFFFFF",
      border: `1px solid ${dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}`,
    },
    outlined: {
      background: "transparent",
      border: `1px solid ${hexToRgba(color, dark ? 0.4 : 0.2)}`,
    },
    filled: {
      background: hexToRgba(color, dark ? 0.2 : 0.08),
      border: `1px solid ${hexToRgba(color, dark ? 0.5 : 0.3)}`,
    },
  };
  const styleVariant = variantStyles[variant] || variantStyles.default;

  const trendColor =
    trend?.direction === "up"
      ? "#10B981"
      : trend?.direction === "down"
      ? "#EF4444"
      : dark ? "#94A3B8" : "#64748B";

  const renderTrend = () => {
    if (loading) {
      return (
        <div
          style={{
            width: 60,
            height: 12,
            background: dark ? "#334155" : "#E2E8F0",
            borderRadius: 4,
            animation: "stat-card-pulse 1.5s ease-in-out infinite",
            marginTop: 4,
          }}
        />
      );
    }
    if (!trend) return null;
    const Icon =
      trend.direction === "up" ? TrendingUp : trend.direction === "down" ? TrendingDown : null;
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
        {Icon && <Icon size={14} />}
        {trend.value}
      </div>
    );
  };

  const renderValueContent = () => {
    if (loading) {
      return (
        <div
          style={{
            width: 60,
            height: dim.fontSize,
            background: dark ? "#334155" : "#E2E8F0",
            borderRadius: 4,
            animation: "stat-card-pulse 1.5s ease-in-out infinite",
          }}
        />
      );
    }
    if (error) {
      return (
        <span style={{ color: "#EF4444", display: "inline-flex", alignItems: "center", gap: 4 }}>
          <AlertCircle size={dim.fontSize * 0.8} />
          Erreur
        </span>
      );
    }
    if (renderValue) {
      return renderValue();
    }
    return (
      <>
        {valuePrefix && <span style={{ fontSize: dim.fontSize * 0.6, color: dark ? "#94A3B8" : "#64748B" }}>{valuePrefix}</span>}
        {typeof value === "number" ? value.toLocaleString() : value ?? "—"}
        {valueSuffix && <span style={{ fontSize: dim.fontSize * 0.6, color: dark ? "#94A3B8" : "#64748B" }}>{valueSuffix}</span>}
      </>
    );
  };

  const renderLabel = () => {
    if (loading) {
      return (
        <div
          style={{
            width: 80,
            height: 14,
            background: dark ? "#334155" : "#E2E8F0",
            borderRadius: 4,
            animation: "stat-card-pulse 1.5s ease-in-out infinite",
            marginTop: 4,
          }}
        />
      );
    }
    return label;
  };

  return (
    <div
      onClick={isClickable ? onClick : undefined}
      onKeyDown={handleKeyDown}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      aria-label={isClickable ? `${label} : ${value}` : undefined}
      title={tooltip}
      style={{
        ...styleVariant,
        borderRadius: 16,
        padding: dim.padding,
        display: "flex",
        alignItems: "center",
        gap: 16,
        boxShadow: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)",
        transition: "transform 0.2s, box-shadow 0.2s, background-color 0.3s, border-color 0.3s",
        cursor: isClickable ? "pointer" : disabled && !loading ? "not-allowed" : "default",
        animation: "stat-card-fade 0.3s ease-out",
        position: "relative",
        outline: "none",
        opacity: disabled && !loading ? 0.6 : 1,
        border: active ? `2px solid ${color}` : styleVariant.border,
        transform: active ? "scale(1.02)" : isHovered && isClickable ? "translateY(-2px)" : "translateY(0)",
      }}
      onMouseEnter={(e) => {
        if (isClickable) {
          setIsHovered(true);
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow = dark
            ? "0 4px 12px rgba(0,0,0,0.4)"
            : "0 4px 12px rgba(0,0,0,0.1)";
        }
      }}
      onMouseLeave={(e) => {
        if (isClickable) {
          setIsHovered(false);
          e.currentTarget.style.transform = active ? "scale(1.02)" : "translateY(0)";
          e.currentTarget.style.boxShadow = dark
            ? "0 1px 3px rgba(0,0,0,0.3)"
            : "0 1px 3px rgba(0,0,0,0.05)";
        }
      }}
      onFocus={(e) => {
        if (isClickable) {
          e.currentTarget.style.outline = `2px solid ${color}`;
          e.currentTarget.style.outlineOffset = "2px";
        }
      }}
      onBlur={(e) => (e.currentTarget.style.outline = "none")}
    >
      <style>{`
        @keyframes stat-card-fade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes stat-card-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>

      {/* Icône avec gestionnaire séparé */}
      <div
        onClick={
          isIconClickable
            ? (e) => {
                e.stopPropagation();
                onIconClick();
              }
            : undefined
        }
        onKeyDown={handleIconKeyDown}
        role={isIconClickable ? "button" : undefined}
        tabIndex={isIconClickable ? 0 : undefined}
        title={isIconClickable ? "Action sur l'icône" : undefined}
        style={{
          width: dim.iconBox,
          height: dim.iconBox,
          background: hexToRgba(color, dark ? 0.2 : 0.08),
          borderRadius: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: color,
          flexShrink: 0,
          cursor: isIconClickable ? "pointer" : "default",
          outline: "none",
        }}
        onFocus={(e) => {
          if (isIconClickable) {
            e.currentTarget.style.outline = `2px solid ${color}`;
            e.currentTarget.style.outlineOffset = "2px";
          }
        }}
        onBlur={(e) => (e.currentTarget.style.outline = "none")}
      >
        {loading ? (
          <Loader size={iconSize} className="animate-spin" />
        ) : error ? (
          <AlertCircle size={iconSize} color="#EF4444" />
        ) : (
          icon
        )}
      </div>

      {/* Contenu texte */}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{
          fontSize: dim.fontSize,
          fontWeight: 700,
          color: dark ? "#F1F5F9" : "#1E293B",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          display: "flex",
          alignItems: "baseline",
          gap: 4,
        }}>
          {renderValueContent()}
        </div>
        <div style={{
          fontSize: 14,
          color: dark ? "#94A3B8" : "#64748B",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}>
          {renderLabel()}
        </div>
        {/* Sous-valeur (affichée même si trend est présent) */}
        {subValue && (
          <div style={{
            fontSize: 12,
            color: subValueColor || (dark ? "#A5B4FC" : "#4F46E5"),
            marginTop: 2,
            fontWeight: 500,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}>
            {subValue}
          </div>
        )}
        {/* Tendance (affichée en plus de subValue si présent) */}
        {renderTrend()}
      </div>

      {/* Flèche */}
      {isClickable && showArrow && (
        <ChevronRight
          size={18}
          style={{ color: dark ? "#94A3B8" : "#64748B", flexShrink: 0, marginLeft: 4 }}
        />
      )}
    </div>
  );
}