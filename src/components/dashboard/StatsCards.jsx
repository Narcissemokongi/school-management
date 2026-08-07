import { Users, GraduationCap, AlertTriangle, BookOpen } from "lucide-react";

const iconMap = {
  "Élèves": <GraduationCap size={24} />,
  "Punitions": <AlertTriangle size={24} />,
  "Classes": <BookOpen size={24} />,
  "Utilisateurs": <Users size={24} />,
};

export function StatsCards({ stats }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 32 }}>
      {stats.map((s, i) => (
        <div key={i} style={{
          background: "#FFF",
          borderRadius: 16,
          padding: 20,
          display: "flex",
          alignItems: "center",
          gap: 16,
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
        }}>
          <div style={{ width: 48, height: 48, background: `${s.color}15`, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", color: s.color }}>
            {iconMap[s.label]}
          </div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#1E293B" }}>{s.value}</div>
            <div style={{ fontSize: 14, color: "#64748B" }}>{s.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}