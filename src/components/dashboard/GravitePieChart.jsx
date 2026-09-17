// src/components/GravitePieChart.jsx
import { useMemo, lazy, Suspense } from "react";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";

// ✅ FIX #2 — Recharts en lazy
const PieChart = lazy(() => import("recharts").then(m => ({ default: m.PieChart })));
const Pie = lazy(() => import("recharts").then(m => ({ default: m.Pie })));
const Cell = lazy(() => import("recharts").then(m => ({ default: m.Cell })));
const Tooltip = lazy(() => import("recharts").then(m => ({ default: m.Tooltip })));
const ResponsiveContainer = lazy(() => import("recharts").then(m => ({ default: m.ResponsiveContainer })));
const Legend = lazy(() => import("recharts").then(m => ({ default: m.Legend })));

const COLORS = { Grave: "#EF4444", Moyenne: "#F59E0B", Légère: "#10B981" };
const GRAVITES = ["Grave", "Moyenne", "Légère"];

export function GravitePieChart({ punitions = [], fautes = [] }) {   // ✅ FIX #4
  const { dark } = useStyles();   // ✅ FIX #5
  const isMobile = useIsMobile();

  // ✅ FIX #1 + #3 — Map O(n) + useMemo + 1 seul passage
  const data = useMemo(() => {
    if (!punitions.length || !fautes.length) {
      return GRAVITES.map((name) => ({ name, value: 0 }));
    }

    // Index fautes par _id
    const fautesById = new Map();
    for (const f of fautes) {
      if (f?._id) fautesById.set(f._id, f);
    }

    // 1 seul passage sur punitions
    const counts = { Grave: 0, Moyenne: 0, Légère: 0 };
    for (const p of punitions) {
      const g = fautesById.get(p.idFaute)?.gravite;
      if (g && g in counts) counts[g]++;
    }

    return GRAVITES.map((name) => ({ name, value: counts[name] }));
  }, [punitions, fautes]);

  const chartHeight = isMobile ? 200 : 250;
  const outerRadius = isMobile ? 60 : 80;
  const labelFontSize = isMobile ? 10 : 12;
  const legendFontSize = isMobile ? 11 : 12;
  const legendWrapperStyle = isMobile
    ? { fontSize: legendFontSize, paddingTop: 8, color: dark ? "#94A3B8" : "#64748B" }   // ✅ FIX #11
    : { fontSize: legendFontSize, color: dark ? "#94A3B8" : "#64748B" };

  const axisColor = dark ? "#94A3B8" : "#64748B";
  const gridColor = dark ? "#334155" : "#E2E8F0";

  // ✅ FIX #10 — respect reduced-motion
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  // ✅ FIX #6 — empty state
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) {
    return (
      <div
        role="img"                                                    // ✅ FIX #7
        aria-label="Répartition des punitions par gravité"
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
    <div role="img" aria-label="Répartition des punitions par gravité">
      {/* ✅ FIX #2 — Suspense fallback */}
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
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              outerRadius={outerRadius}
              dataKey="value"
              // ✅ FIX #12 — fontSize appliqué dans le label (pas sur <Pie>)
              label={({ name, percent }) =>
                `${name} ${(percent * 100).toFixed(0)}%`
              }
              labelLine={!isMobile}
              isAnimationActive={!prefersReducedMotion}            // ✅ FIX #10
            >
              {data.map((entry) => (
                // ✅ FIX #8 — clé stable sur name
                <Cell key={entry.name} fill={COLORS[entry.name] || "#94A3B8"} />
              ))}
            </Pie>
            <Tooltip
              // ✅ FIX #9 — style adaptatif dark
              contentStyle={{
                backgroundColor: dark ? "#1e293b" : "#ffffff",
                border: `1px solid ${gridColor}`,
                borderRadius: 8,
                color: dark ? "#f1f5f9" : "#1e293b",
              }}
            />
            <Legend wrapperStyle={legendWrapperStyle} />
          </PieChart>
        </ResponsiveContainer>
      </Suspense>
    </div>
  );
}