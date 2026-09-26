import { TrendingUp, TrendingDown } from "lucide-react";
import { useTokens } from "../../theme/tokens";

export function MetricCard({
  icon: Icon,
  label,
  value,
  trend,        // number (%) optionnel
  trendLabel,   // ex: "vs mois dernier"
  variant = "default", // "default" | "success" | "warning" | "danger"
  footer,       // ReactNode optionnel
}) {
  const t = useTokens();

  const variantColor = {
    default: t.accent.primary,
    success: "#10B981",
    warning: "#F59E0B",
    danger: "#EF4444",
  }[variant];

  const trendColor = trend > 0 ? "#10B981" : trend < 0 ? "#EF4444" : t.text.secondary;
  const TrendIcon = trend >= 0 ? TrendingUp : TrendingDown;

  return (
    <div style={{
      background: t.surface.elevated,
      border: `1px solid ${t.border.subtle}`,
      borderRadius: t.radius.lg,
      padding: t.space.lg,
      display: "flex",
      flexDirection: "column",
      gap: t.space.sm,
      transition: t.transition.fast,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: t.font.size.sm, color: t.text.secondary, fontWeight: 500 }}>
          {label}
        </span>
        {Icon && (
          <div style={{
            width: 32, height: 32,
            borderRadius: t.radius.sm,
            background: `${variantColor}15`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Icon size={16} color={variantColor} />
          </div>
        )}
      </div>

      <div style={{
        fontSize: t.font.size["2xl"],
        fontWeight: 700,
        color: t.text.primary,
        fontVariantNumeric: "tabular-nums",
        lineHeight: 1.1,
      }}>
        {value}
      </div>

      {trend !== undefined && (
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: t.font.size.xs }}>
          <TrendIcon size={12} color={trendColor} />
          <span style={{ fontWeight: 600, color: trendColor }}>
            {trend > 0 ? "+" : ""}{trend.toFixed(1)}%
          </span>
          {trendLabel && (
            <span style={{ color: t.text.secondary }}>{trendLabel}</span>
          )}
        </div>
      )}

      {footer && <div style={{ marginTop: t.space.xs }}>{footer}</div>}
    </div>
  );
}