import { Fragment } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useTokens } from "@/theme/tokens";
import { Loader, Activity } from "lucide-react";

const JOURS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function getColor(value, max, t) {
  if (value === 0) return t.surface.hover;
  const intensity = Math.min(value / Math.max(max, 1), 1);
  if (intensity < 0.25) return `${t.accent.primary}25`;
  if (intensity < 0.5) return `${t.accent.primary}50`;
  if (intensity < 0.75) return `${t.accent.primary}90`;
  return t.accent.primary;
}

export function HeatmapCard({ userId, joursRecents = 90 }) {
  const t = useTokens();
  const data = useQuery(api.audit.statsHeatmap, { userId, joursRecents });

  if (data === undefined) {
    return (
      <div
        style={{
          padding: t.space.lg,
          background: t.surface.elevated,
          border: `1px solid ${t.border.subtle}`,
          borderRadius: t.radius.lg,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <Loader
          size={24}
          style={{ animation: "spin 1s linear infinite" }}
          color={t.accent.primary}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        padding: t.space.lg,
        background: t.surface.elevated,
        border: `1px solid ${t.border.subtle}`,
        borderRadius: t.radius.lg,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: t.space.md,
          flexWrap: "wrap",
          gap: t.space.sm,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Activity size={16} color={t.accent.primary} />
          <span
            style={{
              fontSize: t.font.size.sm,
              fontWeight: 700,
              color: t.text.primary,
            }}
          >
            Activité par jour / heure
          </span>
        </div>
        <span style={{ fontSize: t.font.size.xs, color: t.text.muted }}>
          {data.total} action(s) sur {data.joursRecents} jours
        </span>
      </div>

      {/* Grid */}
      <div style={{ overflowX: "auto", paddingBottom: 6 }}>
        <div
          style={{
            display: "inline-grid",
            gridTemplateColumns: `36px repeat(24, 20px)`,
            gap: 2,
            minWidth: "100%",
          }}
        >
          {/* Header heures */}
          <div />
          {Array.from({ length: 24 }).map((_, h) => (
            <div
              key={`h-${h}`}
              style={{
                fontSize: 9,
                color: t.text.muted,
                textAlign: "center",
                lineHeight: "14px",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {h % 3 === 0 ? h : ""}
            </div>
          ))}

          {/* Lignes jours */}
          {JOURS.map((jour, j) => (
            <Fragment key={`row-${j}`}>
              <div
                style={{
                  fontSize: t.font.size.xs,
                  color: t.text.secondary,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  paddingRight: 6,
                  fontWeight: 600,
                }}
              >
                {jour}
              </div>
              {Array.from({ length: 24 }).map((_, h) => {
                const value = data.grid[j][h];
                return (
                  <div
                    key={`cell-${j}-${h}`}
                    title={`${jour} ${h}h — ${value} action(s)`}
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 3,
                      background: getColor(value, data.max, t),
                      transition: "background 0.15s",
                    }}
                  />
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>

      {/* Légende */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginTop: t.space.sm,
          fontSize: t.font.size.xs,
          color: t.text.muted,
          justifyContent: "flex-end",
        }}
      >
        <span>Moins</span>
        {[0.1, 0.35, 0.65, 1].map((i) => (
          <div
            key={`legend-${i}`}
            style={{
              width: 12,
              height: 12,
              borderRadius: 2,
              background: getColor(
                Math.max(1, Math.floor(data.max * i)),
                data.max,
                t
              ),
            }}
          />
        ))}
        <span>Plus</span>
      </div>
    </div>
  );
}

export default HeatmapCard;