// src/components/ClasseBarChart.jsx
import { useMemo, lazy, Suspense } from "react";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";

// ✅ FIX #2 — Recharts en lazy
const BarChart = lazy(() => import("recharts").then(m => ({ default: m.BarChart })));
const Bar = lazy(() => import("recharts").then(m => ({ default: m.Bar })));
const XAxis = lazy(() => import("recharts").then(m => ({ default: m.XAxis })));
const YAxis = lazy(() => import("recharts").then(m => ({ default: m.YAxis })));
const CartesianGrid = lazy(() => import("recharts").then(m => ({ default: m.CartesianGrid })));
const Tooltip = lazy(() => import("recharts").then(m => ({ default: m.Tooltip })));
const ResponsiveContainer = lazy(() => import("recharts").then(m => ({ default: m.ResponsiveContainer })));

export function ClasseBarChart({ punitions = [], eleves = [] }) {  // ✅ FIX #4
  const { dark } = useStyles();  // ✅ FIX #5
  const isMobile = useIsMobile();

  // ✅ FIX #1 + #3 — Map O(n) + useMemo
  const data = useMemo(() => {
    if (!punitions.length || !eleves.length) return [];

    // Index des élèves : Map _id → classe
    const elevesById = new Map();
    for (const e of eleves) {
      if (e?._id) elevesById.set(e._id, e.classe);
    }

    const counts = {};
    for (const p of punitions) {
      const classe = elevesById.get(p.idEleve);
      if (classe) counts[classe] = (counts[classe] || 0) + 1;
    }

    return Object.entries(counts)
      .map(([classe, count]) => ({ classe, count }))
      .sort((a, b) => b.count - a.count);
  }, [punitions, eleves]);

  const chartHeight = isMobile ? 200 : 250;
  const yAxisWidth = isMobile ? 60 : 80;
  const fontSize = isMobile ? 11 : 12;

  // ✅ FIX #5 / #8 — couleurs adaptatives
  const gridColor = dark ? "#334155" : "#E2E8F0";
  const axisColor = dark ? "#94A3B8" : "#64748B";
  const barColor = dark ? "#34D399" : "#10B981";

  // ✅ FIX #9 — respecte prefers-reduced-motion
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  // ✅ FIX #6 — empty state
  if (data.length === 0) {
    return (
      <div
        role="img"
        aria-label="Punitions par classe"
        style={{
          height: chartHeight,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: axisColor,
          fontSize: 13,
        }}
      >
        Aucune punition à afficher
      </div>
    );
  }

  return (
    <div role="img" aria-label="Punitions par classe">   {/* ✅ FIX #7 */}
      {/* ✅ FIX #10 — Suspense fallback */}
      <Suspense
        fallback={
          <div style={{
            height: chartHeight,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: axisColor,
            fontSize: 13,
          }}>
            Chargement du graphique...
          </div>
        }
      >
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis
              type="number"
              allowDecimals={false}
              tick={{ fontSize, fill: axisColor }}
            />
            <YAxis
              dataKey="classe"
              type="category"
              width={yAxisWidth}
              tick={{ fontSize, fill: axisColor }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: dark ? "#1e293b" : "#ffffff",
                border: `1px solid ${gridColor}`,
                borderRadius: 8,
                color: dark ? "#f1f5f9" : "#1e293b",
              }}
            />
            <Bar
              dataKey="count"
              fill={barColor}
              radius={[0, 4, 4, 0]}
              isAnimationActive={!prefersReducedMotion}   // ✅ FIX #9
            />
          </BarChart>
        </ResponsiveContainer>
      </Suspense>
    </div>
  );
}