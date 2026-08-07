import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useStyles } from "../components/ThemeProvider";
import { StatsCards } from "./dashboard/StatsCards";
import { PunitionsChart } from "./dashboard/PunitionsChart";
import { GravitePieChart } from "./dashboard/GravitePieChart";
import { ClasseBarChart } from "./dashboard/ClasseBarChart";
import { RecentActivity } from "./dashboard/RecentActivity";

export function DashboardAdmin({ ecoleId, anneeId, anneeActive }) {
  const { S } = useStyles();

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

  // Tri par date de création (ou timestamp) pour obtenir les vrais derniers
  const dernierEleve = eleves
    .slice()
    .sort((a, b) => (a._creationTime || 0) - (b._creationTime || 0))
    .pop();

  const dernierePunition = punitions
    .slice()
    .sort((a, b) => (a._creationTime || 0) - (b._creationTime || 0))
    .pop();

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px" }}>
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, color: "#1E293B", margin: 0 }}>
          Tableau de bord {anneeActive ? `· ${anneeActive.nom}` : ""}
        </h2>
        <p style={{ color: "#64748B", marginTop: 4, fontSize: 14 }}>
          Vue d'ensemble de votre établissement
        </p>
      </div>

      {/* Cartes statistiques */}
      <StatsCards stats={stats} />

      {/* Section graphiques */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: 24, marginBottom: 24 }}>
        <div style={{ background: "#FFF", borderRadius: 16, padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>📈 Punitions par mois</h3>
          <PunitionsChart punitions={punitions} />
        </div>
        <div style={{ background: "#FFF", borderRadius: 16, padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>⚡ Répartition par gravité</h3>
          <GravitePieChart punitions={punitions} fautes={fautes} />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: 24, marginBottom: 24 }}>
        <div style={{ background: "#FFF", borderRadius: 16, padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>🏛️ Punitions par classe</h3>
          <ClasseBarChart punitions={punitions} eleves={eleves} />
        </div>
      </div>

      {/* Activité récente */}
      <RecentActivity dernierEleve={dernierEleve} dernierePunition={dernierePunition} fautes={fautes} eleves={eleves} />
    </div>
  );
}