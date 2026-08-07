import { useStyles } from "../components/ThemeProvider";
import { useIsMobile } from "../hooks/useIsMobile";
import { ClipboardList, Calendar, Users } from "lucide-react";

export function AccueilDisciplinaire({ user, punitions, eleves }) {
  const { S, dark } = useStyles();
  const isMobile = useIsMobile();

  const myPunitions = punitions.filter((p) => p.disciplinaire === user.nom);
  const today = new Date().toISOString().split("T")[0];
  const todayPunitions = myPunitions.filter((p) => p.date === today);

  const stats = [
    {
      label: "Punitions enregistrées",
      value: myPunitions.length,
      color: "#4F46E5",
      icon: <ClipboardList size={24} />,
    },
    {
      label: "Aujourd'hui",
      value: todayPunitions.length,
      color: "#10B981",
      icon: <Calendar size={24} />,
    },
    {
      label: "Élèves dans l'école",
      value: eleves.length,
      color: "#F59E0B",
      icon: <Users size={24} />,
    },
  ];

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 16px" }}>
      {/* En-tête */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, color: "#1E293B", margin: 0 }}>
          👋 Bienvenue, {user.nom}
        </h2>
        <p style={{ color: "#64748B", marginTop: 4, fontSize: 14 }}>
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
        {stats.map((s, i) => (
          <div
            key={i}
            style={{
              background: "#FFF",
              borderRadius: 16,
              padding: 20,
              display: "flex",
              alignItems: "center",
              gap: 16,
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              transition: "transform 0.15s",
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                background: `${s.color}15`,
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
              <div style={{ fontSize: 24, fontWeight: 700, color: "#1E293B" }}>
                {s.value}
              </div>
              <div style={{ fontSize: 14, color: "#64748B" }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}