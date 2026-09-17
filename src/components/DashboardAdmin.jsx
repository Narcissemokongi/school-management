import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import { StatsCards } from "./dashboard/StatsCards";
import { PunitionsChart } from "./dashboard/PunitionsChart";
import { GravitePieChart } from "./dashboard/GravitePieChart";
import { ClasseBarChart } from "./dashboard/ClasseBarChart";
import { RecentActivity } from "./dashboard/RecentActivity";
import { TrendingUp, Zap, Landmark } from "lucide-react";

export function DashboardAdmin({ ecoleId, anneeId, anneeActive, user }) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();

  const userId = user?._id;

  // ===== Queries Convex (userId requis + gardes strictes) =====
  const punitionsRaw = useQuery(
    api.punitions.list,
    ecoleId && anneeId && userId
      ? { ecoleId, anneeId, userId }
      : "skip"
  );

  const fautesRaw = useQuery(
    api.fautes.list,
    ecoleId && userId ? { ecoleId, userId } : "skip"
  );

  const elevesRaw = useQuery(
    api.eleves.list,
    ecoleId && anneeId && userId
      ? { ecoleId, anneeId, userId }
      : "skip"
  );

  const classesRaw = useQuery(
    api.classes.list,
    ecoleId && anneeId && userId
      ? { ecoleId, anneeId, userId }
      : "skip"
  );

  const usersRaw = useQuery(
    api.users.listByEcole,
    ecoleId && userId ? { ecoleId, userId } : "skip"
  );

  // ✅ Mémoïsation (refs stables)
  const punitions = useMemo(() => punitionsRaw ?? [], [punitionsRaw]);
  const fautes = useMemo(() => fautesRaw ?? [], [fautesRaw]);
  const eleves = useMemo(() => elevesRaw ?? [], [elevesRaw]);
  const classes = useMemo(() => classesRaw ?? [], [classesRaw]);
  const users = useMemo(() => usersRaw ?? [], [usersRaw]);

  // ===== Statistiques globales =====
  const stats = useMemo(
    () => [
      { label: "Élèves", value: eleves.length, color: "#4F46E5" },
      { label: "Punitions", value: punitions.length, color: "#EF4444" },
      { label: "Classes", value: classes.length, color: "#10B981" },
      { label: "Utilisateurs", value: users.length, color: "#6366F1" },
    ],
    [eleves.length, punitions.length, classes.length, users.length]
  );

  // ===== Derniers éléments créés =====
  const dernierEleve = useMemo(() => {
    if (eleves.length === 0) return undefined;
    return [...eleves].sort(
      (a, b) => (a._creationTime || 0) - (b._creationTime || 0)
    )[eleves.length - 1];
  }, [eleves]);

  const dernierePunition = useMemo(() => {
    if (punitions.length === 0) return undefined;
    return [...punitions].sort(
      (a, b) => (a._creationTime || 0) - (b._creationTime || 0)
    )[punitions.length - 1];
  }, [punitions]);

  // ===== Styles compacts (mémoïsés) =====
  const cardStyle = useMemo(
    () => ({
      background: dark ? "#1E293B" : "#FFFFFF",
      borderRadius: isMobile ? 10 : 14,
      padding: isMobile ? 8 : 18,
      boxShadow: dark
        ? "0 1px 2px rgba(0,0,0,0.25)"
        : "0 1px 2px rgba(0,0,0,0.04)",
      border: `1px solid ${
        dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"
      }`,
      transition: "background-color 0.3s",
      overflow: "hidden",
      minWidth: 0,
    }),
    [dark, isMobile]
  );

  const headingStyle = useMemo(
    () => ({
      fontSize: isMobile ? 12 : 15,
      fontWeight: 600,
      marginBottom: isMobile ? 6 : 12,
      marginTop: 0,
      color: dark ? "#F1F5F9" : "#1E293B",
      lineHeight: 1.25,
      display: "flex",
      alignItems: "center",
      gap: 6,
    }),
    [dark, isMobile]
  );

  const gridStyle = useMemo(
    () => ({
      display: "grid",
      gridTemplateColumns: isMobile
        ? "1fr"
        : "repeat(auto-fit, minmax(360px, 1fr))",
      gap: isMobile ? 8 : 16,
      marginBottom: isMobile ? 8 : 16,
    }),
    [isMobile]
  );

  // ============================================================
  // Rendu
  // ============================================================
  return (
    <div
      style={{
        maxWidth: 1280,
        margin: "0 auto",
        padding: isMobile ? "10px 8px" : "28px 24px",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* En-tête compact */}
      <div style={{ marginBottom: isMobile ? 10 : 24 }}>
        <h2
          style={{
            fontSize: isMobile ? 15 : 24,
            fontWeight: 700,
            color: dark ? "#F1F5F9" : "#1E293B",
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          Tableau de bord
          {anneeActive ? (
            <span
              style={{
                fontSize: isMobile ? 11 : 16,
                fontWeight: 500,
                color: dark ? "#94A3B8" : "#64748B",
                marginLeft: isMobile ? 4 : 8,
              }}
            >
              · {anneeActive.nom}
            </span>
          ) : null}
        </h2>
        <p
          style={{
            color: dark ? "#94A3B8" : "#64748B",
            marginTop: isMobile ? 2 : 4,
            marginBottom: 0,
            fontSize: isMobile ? 10.5 : 13,
          }}
        >
          Vue d'ensemble de votre établissement
        </p>
      </div>

      {/* Cartes statistiques */}
      <StatsCards stats={stats} isMobile={isMobile} />

      {/* Graphiques principaux */}
      <div style={gridStyle}>
        <div style={cardStyle}>
          <h3 style={headingStyle}>
            <TrendingUp size={isMobile ? 14 : 16} />
            <span>Punitions par mois</span>
          </h3>
          <PunitionsChart punitions={punitions} isMobile={isMobile} />
        </div>

        <div style={cardStyle}>
          <h3 style={headingStyle}>
            <Zap size={isMobile ? 14 : 16} />
            <span>Répartition par gravité</span>
          </h3>
          <GravitePieChart
            punitions={punitions}
            fautes={fautes}
            isMobile={isMobile}
          />
        </div>
      </div>

      {/* Graphique secondaire */}
      <div style={gridStyle}>
        <div style={cardStyle}>
          <h3 style={headingStyle}>
            <Landmark size={isMobile ? 14 : 16} />
            <span>Punitions par classe</span>
          </h3>
          <ClasseBarChart
            punitions={punitions}
            eleves={eleves}
            isMobile={isMobile}
          />
        </div>
      </div>

      {/* Activité récente */}
      <RecentActivity
        dernierEleve={dernierEleve}
        dernierePunition={dernierePunition}
        fautes={fautes}
        eleves={eleves}
        isMobile={isMobile}
      />
    </div>
  );
}