import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export function ClasseBarChart({ punitions, eleves }) {
  const data = Object.entries(
    punitions.reduce((acc, p) => {
      const eleve = eleves.find(e => e._id === p.idEleve);
      if (eleve) acc[eleve.classe] = (acc[eleve.classe] || 0) + 1;
      return acc;
    }, {})
  )
    .map(([classe, count]) => ({ classe, count }))
    .sort((a, b) => b.count - a.count);

  return (
    <div aria-label="Punitions par classe">
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
          <YAxis dataKey="classe" type="category" width={80} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Bar dataKey="count" fill="#10B981" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}