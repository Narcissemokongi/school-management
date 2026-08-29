import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useStyles } from "../styles/theme";
import { StatsCards } from "./dashboard/StatsCards";
import { PunitionsChart } from "./dashboard/PunitionsChart";
import { GravitePieChart } from "./dashboard/GravitePieChart";
import { ClasseBarChart } from "./dashboard/ClasseBarChart";
import { RecentActivity } from "./dashboard/RecentActivity";

export function DashboardAdmin({ ecoleId, anneeId, anneeActive }) {
  const { S, dark } = useStyles();

  const punitions = useQuery(api.punitions.list, { ecoleId, anneeId }) ?? [];
  const fautes = useQuery(api.fautes.list, { ecoleId }) ?? [];
  const eleves = useQuery(api.eleves.list, { ecoleId, anneeId }) ?? [];
  const classes = useQuery(api.classes.list, { ecoleId, anneeId }) ?? [];
  const users = useQuery(api.users.listByEcole, { ecoleId }) ?? [];

  // Statistiques globales
  const stats = [
    { label: "Élèves", value: eleves.length, color: "#4F46E5" },
    { label: "Punitions", value: punitions.length, color: "#EF4444" },
    { label: "Classes", value: classes.length, color: "#10B981" },
    { label: "Utilisateurs", value: users.length, color: "#6366F1" },
  ];

  // Tri par date de création
  const dernierEleve = eleves
    .slice()
    .sort((a, b) => (a._creationTime || 0) - (b._creationTime || 0))
    .pop();

  const dernierePunition = punitions
    .slice()
    .sort((a, b) => (a._creationTime || 0) - (b._creationTime || 0))
    .pop();

  // Styles dynamiques pour les cartes
  const cardStyle = {
    background: dark ? "#1E293B" : "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    boxShadow: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)",
    border: `1px solid ${dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}`,
    transition: "background-color 0.3s",
  };

  const headingStyle = {
    fontSize: 18,
    fontWeight: 600,
    marginBottom: 20,
    color: dark ? "#F1F5F9" : "#1E293B",
  };

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px" }}>
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, color: dark ? "#F1F5F9" : "#1E293B", margin: 0 }}>
          Tableau de bord {anneeActive ? `· ${anneeActive.nom}` : ""}
        </h2>
        <p style={{ color: dark ? "#94A3B8" : "#64748B", marginTop: 4, fontSize: 14 }}>
          Vue d'ensemble de votre établissement
        </p>
      </div>

      {/* Cartes statistiques */}
      <StatsCards stats={stats} />

      {/* Section graphiques */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: 24, marginBottom: 24 }}>
        <div style={cardStyle}>
          <h3 style={headingStyle}>📈 Punitions par mois</h3>
          <PunitionsChart punitions={punitions} />
        </div>
        <div style={cardStyle}>
          <h3 style={headingStyle}>⚡ Répartition par gravité</h3>
          <GravitePieChart punitions={punitions} fautes={fautes} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: 24, marginBottom: 24 }}>
        <div style={cardStyle}>
          <h3 style={headingStyle}>🏛️ Punitions par classe</h3>
          <ClasseBarChart punitions={punitions} eleves={eleves} />
        </div>
      </div>

      {/* Activité récente */}
      <RecentActivity
        dernierEleve={dernierEleve}
        dernierePunition={dernierePunition}
        fautes={fautes}
        eleves={eleves}
      />
    </div>
  );
}