import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useStyles } from "../components/ThemeProvider";
import { getFaute, getTopDerangeurs } from "../utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { AlertTriangle, TrendingUp, Users, School, Award } from "lucide-react";

const COLORS = ["#EF4444", "#F59E0B", "#10B981"];

export function DashboardDirecteur({ ecoleId, anneeId, anneeActive, punitions, eleves, classes, fautes, notifs }) {
  const { S } = useStyles();

  // Calculs
  const top5 = getTopDerangeurs(punitions, eleves, 5);

  // Punitions par mois
  const punitionsParMois = punitions.reduce((acc, p) => {
    const mois = p.date.substring(0, 7);
    acc[mois] = (acc[mois] || 0) + 1;
    return acc;
  }, {});
  const dataMois = Object.entries(punitionsParMois)
    .map(([mois, count]) => ({ mois, count }))
    .sort((a, b) => a.mois.localeCompare(b.mois));

  // Répartition par gravité
  const dataGravite = ["Grave", "Moyenne", "Légère"].map(gravite => ({
    name: gravite,
    value: punitions.filter(p => {
      const faute = fautes.find(f => f._id === p.idFaute);
      return faute?.gravite === gravite;
    }).length
  }));

  // Punitions par classe
  const punitionsParClasse = punitions.reduce((acc, p) => {
    const eleve = eleves.find(e => e._id === p.idEleve);
    if (eleve) {
      acc[eleve.classe] = (acc[eleve.classe] || 0) + 1;
    }
    return acc;
  }, {});
  const dataClasse = Object.entries(punitionsParClasse)
    .map(([classe, count]) => ({ classe, count }))
    .sort((a, b) => b.count - a.count);

  // Statistiques globales
  const graves = punitions.filter(p => getFaute(fautes, p.idFaute)?.gravite === "Grave");
  const stats = [
    { label: "Total punitions", value: punitions.length, color: "#4F46E5", icon: <TrendingUp size={24} /> },
    { label: "Fautes graves", value: graves.length, color: "#EF4444", icon: <AlertTriangle size={24} /> },
    { label: "Élèves concernés", value: new Set(punitions.map(p => p.idEleve)).size, color: "#F59E0B", icon: <Users size={24} /> },
    { label: "Classes touchées", value: Object.values(punitionsParClasse).filter(v => v > 0).length, color: "#10B981", icon: <School size={24} /> },
  ];

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px" }}>
      {/* En-tête */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, color: "#1E293B", margin: 0 }}>
          Tableau de bord directeur {anneeActive ? `· ${anneeActive.nom}` : ""}
        </h2>
        <p style={{ color: "#64748B", marginTop: 4, fontSize: 14 }}>
          Vue d'ensemble de la discipline dans l'établissement
        </p>
      </div>

      {/* Cartes statistiques */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
        {stats.map((s, i) => (
          <div key={i} style={{
            background: "#FFF",
            borderRadius: 16,
            padding: 20,
            display: "flex",
            alignItems: "center",
            gap: 16,
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            transition: "transform 0.15s",
          }}>
            <div style={{ width: 48, height: 48, background: `${s.color}15`, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", color: s.color }}>
              {s.icon}
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#1E293B" }}>{s.value}</div>
              <div style={{ fontSize: 14, color: "#64748B" }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Alertes récentes */}
      {notifs.length > 0 && (
        <div style={{
          background: "#FFF",
          borderRadius: 16,
          padding: 20,
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          marginBottom: 24,
          borderLeft: "4px solid #EF4444",
        }}>
          <div style={{ fontWeight: 700, color: "#EF4444", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <AlertTriangle size={18} /> Alertes récentes
          </div>
          {notifs.slice(-3).map((n, i) => (
            <div key={i} style={{
              padding: "8px 0",
              borderBottom: i < notifs.length - 1 ? "1px solid #F1F5F9" : "none",
              fontSize: 13,
              color: "#475569",
            }}>
              {n}
            </div>
          ))}
        </div>
      )}

      {/* Graphiques */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: 24 }}>
        {/* Punitions par mois */}
        <div style={{ background: "#FFF", borderRadius: 16, padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>📈 Évolution des punitions</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={dataMois}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="mois" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#4F46E5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Répartition par gravité */}
        <div style={{ background: "#FFF", borderRadius: 16, padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>⚡ Répartition par gravité</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={dataGravite}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {dataGravite.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Top 5 perturbateurs */}
        <div style={{ background: "#FFF", borderRadius: 16, padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>🔥 Top 5 élèves les plus sanctionnés</h3>
          {top5.length === 0 && (
            <p style={{ color: "#64748B", fontSize: 14 }}>Aucune donnée pour le moment.</p>
          )}
          {top5.map((t, i) => {
            const colors = ["#EF4444", "#F59E0B", "#4F46E5", "#6366F1", "#1E293B"];
            return (
              <div key={i} style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 0",
                borderBottom: i < 4 ? "1px solid #F1F5F9" : "none",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: colors[i],
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#FFF",
                  }}>
                    #{i + 1}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{t.eleve?.nom} {t.eleve?.postnom}</div>
                    <div style={{ fontSize: 12, color: "#64748B" }}>Classe {t.eleve?.classe}</div>
                  </div>
                </div>
                <span style={{
                  background: `${colors[i]}15`,
                  color: colors[i],
                  padding: "4px 10px",
                  borderRadius: 12,
                  fontSize: 13,
                  fontWeight: 600,
                }}>
                  {t.count} faute(s)
                </span>
              </div>
            );
          })}
        </div>

        {/* Punitions par classe */}
        <div style={{ background: "#FFF", borderRadius: 16, padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>🏛️ Punitions par classe</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={dataClasse} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
              <YAxis dataKey="classe" type="category" width={80} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#10B981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}