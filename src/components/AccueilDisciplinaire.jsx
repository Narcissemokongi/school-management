import { useStyles } from "../styles/theme";
import { useIsMobile } from "../hooks/useIsMobile";
import { ClipboardList, Calendar, Users, TrendingUp } from "lucide-react";

export function AccueilDisciplinaire({ user, punitions, eleves }) {
  const { S, dark } = useStyles();
  const isMobile = useIsMobile();

  const myPunitions = punitions.filter((p) => p.disciplinaire === user.nom);
  const today = new Date().toISOString().split("T")[0];
  const todayPunitions = myPunitions.filter((p) => p.date === today);

  // Calcul du nombre total d'élèves ayant au moins une punition enregistrée par ce disciplinaire
  const elevesAvecPunition = new Set(myPunitions.map((p) => p.idEleve)).size;

  const stats = [
    {
      label: "Punitions enregistrées",
      value: myPunitions.length,
      color: dark ? "#818CF8" : "#4F46E5",
      icon: <ClipboardList size={24} />,
    },
    {
      label: "Aujourd'hui",
      value: todayPunitions.length,
      color: dark ? "#34D399" : "#10B981",
      icon: <Calendar size={24} />,
    },
    {
      label: "Élèves suivis",
      value: elevesAvecPunition,
      color: dark ? "#FBBF24" : "#F59E0B",
      icon: <TrendingUp size={24} />,
    },
    {
      label: "Élèves dans l'école",
      value: eleves.length,
      color: dark ? "#A5B4FC" : "#6366F1",
      icon: <Users size={24} />,
    },
  ];

  // Couleurs adaptatives
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const shadow = dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)";

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 16px" }}>
      {/* En-tête */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, color: textPrimary, margin: 0 }}>
          👋 Bienvenue, {user.nom}
        </h2>
        <p style={{ color: textSecondary, marginTop: 4, fontSize: 14 }}>
          Voici un aperçu de votre activité.
        </p>
      </div>

      {/* Cartes statistiques */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16,
        }}
      >
        {stats.map((s) => (
          <div
            key={s.label}   // ✅ clé stable basée sur le libellé
            style={{
              background: cardBg,
              borderRadius: 16,
              padding: 20,
              display: "flex",
              alignItems: "center",
              gap: 16,
              boxShadow: shadow,
              border: `1px solid ${cardBorder}`,
              transition: "transform 0.15s, background-color 0.3s",
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                background: `${s.color}${dark ? "33" : "15"}`,  // opacité adaptée
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: s.color,
              }}
            >
              {s.icon}
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, color: textPrimary }}>
                {s.value}
              </div>
              <div style={{ fontSize: 14, color: textSecondary }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}