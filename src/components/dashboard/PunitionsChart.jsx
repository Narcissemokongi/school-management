// src/components/PunitionsChart.jsx
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

// ✅ FIX #1 — normalise date → "YYYY-MM" (string ISO, FR, ou timestamp)
function toYearMonth(date) {
  if (date == null) return null;
  // Timestamp number
  if (typeof date === "number") {
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
  if (typeof date === "string") {
    // ISO "YYYY-MM-DD" ou "YYYY-MM"
    if (/^\d{4}-\d{2}/.test(date)) return date.substring(0, 7);
    // FR "DD/MM/YYYY"
    const fr = date.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (fr) return `${fr[3]}-${fr[2]}`;
    // Fallback : tenter Date.parse
    const d = new Date(date);
    if (!isNaN(d.getTime())) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    }
  }
  return null;
}

export function PunitionsChart({ punitions = [] }) {   // ✅ FIX #4
  const { dark } = useStyles();   // ✅ FIX #11
  const isMobile = useIsMobile();

  // ✅ FIX #3 + #5 — useMemo + normalisation robuste
  const data = useMemo(() => {
    if (!punitions.length) return [];

    const counts = {};
    for (const p of punitions) {
      const mois = toYearMonth(p.date);
      if (!mois) continue;
      counts[mois] = (counts[mois] || 0) + 1;
    }

    return Object.entries(counts)
      .map(([mois, count]) => ({ mois, count }))
      .sort((a, b) => a.mois.localeCompare(b.mois));
  }, [punitions]);

  const chartHeight = isMobile ? 200 : 250;
  const fontSize = isMobile ? 11 : 12;

  // ✅ FIX #10 / #11 — couleurs adaptatives
  const gridColor = dark ? "#334155" : "#E2E8F0";
  const axisColor = dark ? "#94A3B8" : "#64748B";
  const barColor = dark ? "#818CF8" : "#4F46E5";

  // ✅ FIX #12
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  // ✅ FIX #6 — empty state
  if (data.length === 0) {
    return (
      <div
        role="img"                                                    // ✅ FIX #7
        aria-label="Graphique des punitions par mois"
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
    <div role="img" aria-label="Graphique des punitions par mois">
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
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="mois" tick={{ fontSize, fill: axisColor }} />
            <YAxis allowDecimals={false} tick={{ fontSize, fill: axisColor }} />
            <Tooltip
              // ✅ FIX #9 — style adaptatif
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
              radius={[4, 4, 0, 0]}
              isAnimationActive={!prefersReducedMotion}   // ✅ FIX #12
            />
          </BarChart>
        </ResponsiveContainer>
      </Suspense>
    </div>
  );
}