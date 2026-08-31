import { useIsMobile } from "../hooks/useIsMobile"; // <-- Import du hook
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export function PunitionsChart({ punitions }) {
  const isMobile = useIsMobile(); // Détection mobile

  const data = Object.entries(
    punitions.reduce((acc, p) => {
      const mois = p.date.substring(0, 7);
      acc[mois] = (acc[mois] || 0) + 1;
      return acc;
    }, {})
  )
    .map(([mois, count]) => ({ mois, count }))
    .sort((a, b) => a.mois.localeCompare(b.mois));

  // Ajustements adaptatifs
  const chartHeight = isMobile ? 200 : 250;
  const fontSize = isMobile ? 11 : 12;

  return (
    <div aria-label="Graphique des punitions par mois">
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
          <XAxis dataKey="mois" tick={{ fontSize }} />
          <YAxis allowDecimals={false} tick={{ fontSize }} />
          <Tooltip />
          <Bar dataKey="count" fill="#4F46E5" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}