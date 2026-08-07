import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
const COLORS = { Grave: "#EF4444", Moyenne: "#F59E0B", Légère: "#10B981" };

export function GravitePieChart({ punitions, fautes }) {
  const data = ["Grave", "Moyenne", "Légère"].map(gravite => ({
    name: gravite,
    value: punitions.filter(p => fautes.find(f => f._id === p.idFaute)?.gravite === gravite).length
  }));

  return (
    <div aria-label="Répartition des punitions par gravité">
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[entry.name]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}