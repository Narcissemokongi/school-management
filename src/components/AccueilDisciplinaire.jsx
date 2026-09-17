import { useMemo } from "react";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import { ClipboardList, Calendar, Users, TrendingUp } from "lucide-react";

export function AccueilDisciplinaire({
  user,
  punitions = [],
  eleves = [],
}) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();

  const userName = user?.nom ?? "";

  // ============================================================
  // ✅ Calculs mémoïsés (une seule passe)
  // ============================================================
  const { myPunitions, todayPunitions, elevesAvecPunition } = useMemo(() => {
    if (!userName) {
      return {
        myPunitions: [],
        todayPunitions: [],
        elevesAvecPunition: 0,
      };
    }

    // Une seule boucle pour tout calculer
    const today = new Date().toISOString().split("T")[0];
    const mine = [];
    const todayList = [];
    const eleveIdsSet = new Set();

    for (const p of punitions) {
      // ⚠️ Comparaison par nom (héritage du stockage `disciplinaire: string`)
      if (p.disciplinaire !== userName) continue;
      mine.push(p);
      if (p.date === today) todayList.push(p);
      eleveIdsSet.add(p.idEleve);
    }

    return {
      myPunitions: mine,
      todayPunitions: todayList,
      elevesAvecPunition: eleveIdsSet.size,
    };
  }, [punitions, userName]);

  // ============================================================
  // Tailles adaptatives
  // ============================================================
  const iconSize = isMobile ? 20 : 24;
  const valueSize = isMobile ? 20 : 24;
  const labelSize = isMobile ? 12 : 14;
  const cardPadding = isMobile ? 14 : 20;
  const cardGap = isMobile ? 10 : 16;
  const titleSize = isMobile ? 22 : 28;
  const subtitleSize = isMobile ? 14 : 16;
  const containerPadding = isMobile ? "16px 12px" : "24px 16px";
  const headerMargin = isMobile ? 20 : 32;
  const iconContainerSize = isMobile ? 40 : 48;

  // ============================================================
  // Couleurs adaptatives
  // ============================================================
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const accent = dark ? "#818CF8" : "#4F46E5";
  const shadow = dark
    ? "0 1px 3px rgba(0,0,0,0.3)"
    : "0 1px 3px rgba(0,0,0,0.05)";

  const stats = [
    {
      label: "Punitions enregistrées",
      value: myPunitions.length,
      color: dark ? "#818CF8" : "#4F46E5",
      icon: <ClipboardList size={iconSize} />,
    },
    {
      label: "Aujourd'hui",
      value: todayPunitions.length,
      color: dark ? "#34D399" : "#10B981",
      icon: <Calendar size={iconSize} />,
    },
    {
      label: "Élèves suivis",
      value: elevesAvecPunition,
      color: dark ? "#FBBF24" : "#F59E0B",
      icon: <TrendingUp size={iconSize} />,
    },
    {
      label: "Élèves dans l'école",
      value: eleves.length,
      color: dark ? "#A5B4FC" : "#6366F1",
      icon: <Users size={iconSize} />,
    },
  ];

  // ============================================================
  // Garde : session invalide
  // ============================================================
  if (!user) {
    return (
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: containerPadding,
          textAlign: "center",
          color: textSecondary,
        }}
      >
        Chargement...
      </div>
    );
  }

  // ============================================================
  // RENDU
  // ============================================================
  return (
    <div
      style={{
        maxWidth: 1280,
        margin: "0 auto",
        padding: containerPadding,
      }}
    >
      {/* ==================== EN-TÊTE ==================== */}
      <div style={{ marginBottom: headerMargin }}>
        <h2
          style={{
            fontSize: titleSize,
            fontWeight: 700,
            color: textPrimary,
            margin: 0,
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          {/* ✅ Emoji retiré, icône lucide à la place */}
          <TrendingUp size={isMobile ? 24 : 28} color={accent} />
          <span>Bienvenue, {user.nom}</span>
        </h2>
        <p
          style={{
            color: textSecondary,
            marginTop: 4,
            fontSize: subtitleSize,
          }}
        >
          Voici un aperçu de votre activité.
        </p>
      </div>

      {/* ==================== STATS ==================== */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile
            ? "1fr"
            : "repeat(auto-fit, minmax(200px, 1fr))",
          gap: cardGap,
        }}
      >
        {stats.map((s) => (
          <div
            key={s.label}
            style={{
              background: cardBg,
              borderRadius: 16,
              padding: cardPadding,
              display: "flex",
              alignItems: "center",
              gap: cardGap,
              boxShadow: shadow,
              border: `1px solid ${cardBorder}`,
              transition: "transform 0.15s, background-color 0.3s",
            }}
          >
            <div
              style={{
                width: iconContainerSize,
                height: iconContainerSize,
                background: `${s.color}${dark ? "33" : "15"}`,
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: s.color,
                flexShrink: 0,
              }}
            >
              {s.icon}
            </div>
            <div>
              <div
                style={{
                  fontSize: valueSize,
                  fontWeight: 700,
                  color: textPrimary,
                }}
              >
                {s.value}
              </div>
              <div style={{ fontSize: labelSize, color: textSecondary }}>
                {s.label}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}