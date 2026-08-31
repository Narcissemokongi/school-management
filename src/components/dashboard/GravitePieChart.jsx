import { useIsMobile } from "../hooks/useIsMobile"; // <-- Import du hook
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const COLORS = { Grave: "#EF4444", Moyenne: "#F59E0B", Légère: "#10B981" };

export function GravitePieChart({ punitions, fautes }) {
  const isMobile = useIsMobile(); // Détection mobile

  const data = ["Grave", "Moyenne", "Légère"].map(gravite => ({
    name: gravite,
    value: punitions.filter(p => fautes.find(f => f._id === p.idFaute)?.gravite === gravite).length
  }));

  // Ajustements adaptatifs
  const chartHeight = isMobile ? 200 : 250;
  const outerRadius = isMobile ? 60 : 80;
  const labelFontSize = isMobile ? 10 : 12;
  const legendFontSize = isMobile ? 11 : 12;
  const legendWrapperStyle = isMobile ? { fontSize: legendFontSize, paddingTop: 8 } : { fontSize: legendFontSize };

  return (
    <div aria-label="Répartition des punitions par gravité">
      <ResponsiveContainer width="100%" height={chartHeight}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={outerRadius}
            dataKey="value"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            labelLine={!isMobile} // Masquer les lignes de label sur mobile pour éviter l'encombrement
            fontSize={labelFontSize}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[entry.name]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend wrapperStyle={legendWrapperStyle} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}