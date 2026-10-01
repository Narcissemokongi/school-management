// src/components/ui/MetricCard.jsx
import { TrendingUp, TrendingDown } from "lucide-react";
import { useTokens } from "../../theme/tokens";

// ════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════
function formatTrend(trend) {
  if (trend === undefined || trend === null) return "";
  const sign = trend > 0 ? "+" : "";
  return `${sign}${trend.toFixed(1)}%`;
}

export function MetricCard({
  icon: Icon,
  label,
  value,
  trend,
  trendLabel,
  variant = "default",
  footer,
}) {
  const t = useTokens();

  const variantColor = {
    default: t.accent.primary,
    success: t.status?.success?.fg ?? "#10B981",
    warning: t.status?.warning?.fg ?? "#F59E0B",
    danger: t.status?.danger?.fg ?? "#EF4444",
  }[variant] ?? t.accent.primary;

  const trendColor =
    trend > 0
      ? t.status?.success?.fg ?? "#10B981"
      : trend < 0
      ? t.status?.danger?.fg ?? "#EF4444"
      : t.text.secondary;

  const TrendIcon = trend >= 0 ? TrendingUp : TrendingDown;
  const trendText = formatTrend(trend);

  // ✅ Label accessible : "Label : value, +5.2% vs mois dernier"
  const ariaLabel = [
    `${label} : ${value}`,
    trend !== undefined && trend !== null ? `${trendText}${trendLabel ? ` ${trendLabel}` : ""}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <article
      aria-label={ariaLabel}
      style={{
        background: t.surface.elevated,
        border: `1px solid ${t.border.subtle}`,
        borderRadius: t.radius.lg,
        padding: t.space.lg,
        display: "flex",
        flexDirection: "column",
        gap: t.space.sm,
        transition: t.transition.fast,
        minHeight: 44,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontSize: t.font.size.sm,
            color: t.text.secondary,
            fontWeight: 500,
          }}
        >
          {label}
        </span>
        {Icon && (
          <div
            aria-hidden="true"
            style={{
              width: 32,
              height: 32,
              borderRadius: t.radius.sm,
              background: `${variantColor}15`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon size={16} color={variantColor} />
          </div>
        )}
      </div>

      <div
        style={{
          fontSize: t.font.size["2xl"],
          fontWeight: 700,
          color: t.text.primary,
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>

      {trend !== undefined && trend !== null && (
        <div
          aria-hidden="true"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: t.font.size.xs,
          }}
        >
          <TrendIcon size={12} color={trendColor} />
          <span
            style={{
              fontWeight: 600,
              color: trendColor,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {trendText}
          </span>
          {trendLabel && (
            <span style={{ color: t.text.secondary }}>{trendLabel}</span>
          )}
        </div>
      )}

      {footer && <div style={{ marginTop: t.space.xs }}>{footer}</div>}
    </article>
  );
}