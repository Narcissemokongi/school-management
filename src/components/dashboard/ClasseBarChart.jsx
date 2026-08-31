import { useIsMobile } from "@/hooks/useIsMobile"; // <-- Import du hook
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export function ClasseBarChart({ punitions, eleves }) {
  const isMobile = useIsMobile(); // Détection mobile

  const data = Object.entries(
    punitions.reduce((acc, p) => {
      const eleve = eleves.find(e => e._id === p.idEleve);
      if (eleve) acc[eleve.classe] = (acc[eleve.classe] || 0) + 1;
      return acc;
    }, {})
  )
    .map(([classe, count]) => ({ classe, count }))
    .sort((a, b) => b.count - a.count);

  // Ajustements adaptatifs
  const chartHeight = isMobile ? 200 : 250;
  const yAxisWidth = isMobile ? 60 : 80;
  const fontSize = isMobile ? 11 : 12;

  return (
    <div aria-label="Punitions par classe">
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize }} />
          <YAxis dataKey="classe" type="category" width={yAxisWidth} tick={{ fontSize }} />
          <Tooltip />
          <Bar dataKey="count" fill="#10B981" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}