import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { StatCard } from "./StatCard";
import { BarChart } from "./BarChart";
import { School, Users, GraduationCap, BookOpen, AlertTriangle, Clock, CheckCircle } from "lucide-react";

export function OverviewTab({ globalStats, ecolesAvecUsers }) {
  const recentEcoles = useQuery(api.ecoles.listRecent) ?? [];
  const recentUsers = useQuery(api.users.listRecent) ?? [];

  const topEcoles = [...ecolesAvecUsers]
    .sort((a, b) => b.userCount - a.userCount)
    .slice(0, 5);
  const maxUsers = Math.max(...topEcoles.map(e => e.userCount), 1);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
        <StatCard icon={<School />} value={globalStats.totalEcoles ?? 0} label="Écoles" color="#4F46E5" />
        <StatCard icon={<Users />} value={globalStats.totalUsers ?? 0} label="Utilisateurs" color="#10B981" />
        <StatCard icon={<GraduationCap />} value={globalStats.totalEleves ?? 0} label="Élèves" color="#F59E0B" />
        <StatCard icon={<BookOpen />} value={globalStats.totalClasses ?? 0} label="Classes" color="#3B82F6" />
        <StatCard icon={<AlertTriangle />} value={globalStats.totalPunitions ?? 0} label="Punitions" color="#EF4444" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <div style={{ background: "#FFF", borderRadius: 16, padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>Top 5 écoles</h3>
          <BarChart data={topEcoles} maxValue={maxUsers} />
        </div>
        <div style={{ background: "#FFF", borderRadius: 16, padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>Activité récente</h3>
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Clock size={16} color="#64748B" />
              <span style={{ fontSize: 14, fontWeight: 500 }}>Nouvelles écoles</span>
            </div>
            {recentEcoles.map(ecole => (
              <div key={ecole._id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #F1F5F9", fontSize: 14 }}>
                <span>{ecole.nom}</span>
                <span style={{ color: "#64748B" }}>{ecole.code}</span>
              </div>
            ))}
            {recentEcoles.length === 0 && <p style={{ color: "#94A3B8", fontSize: 13 }}>Aucune école récente</p>}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Users size={16} color="#64748B" />
              <span style={{ fontSize: 14, fontWeight: 500 }}>Derniers inscrits</span>
            </div>
            {recentUsers.map(u => (
              <div key={u._id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #F1F5F9", fontSize: 14 }}>
                <span>{u.nom} ({u.role})</span>
                <span>{u.status === "pending" ? <Clock size={14} color="#F59E0B" /> : <CheckCircle size={14} color="#10B981" />}</span>
              </div>
            ))}
            {recentUsers.length === 0 && <p style={{ color: "#94A3B8", fontSize: 13 }}>Aucun utilisateur récent</p>}
          </div>
        </div>
      </div>
    </div>
  );
}