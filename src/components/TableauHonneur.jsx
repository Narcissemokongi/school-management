import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import { Trophy, Medal, Star, Loader } from "lucide-react";

export function TableauHonneur({ ecoleId, anneeId, classe, user }) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();

  const userId = user?._id;
  const hasAllParams = Boolean(ecoleId && anneeId && classe && userId);

  // ===== Queries (userId obligatoire) =====
  const classementRaw = useQuery(
    api.classement.getClassement,
    hasAllParams ? { ecoleId, anneeId, classe, userId } : "skip"
  );
  const ecoleRaw = useQuery(
    api.ecoles.get,
    ecoleId && userId ? { ecoleId, userId } : "skip"
  );

  const classement = classementRaw ?? [];
  const ecole = ecoleRaw;

  // ===== Loading : seulement si les params sont complets et la query en cours =====
  const isLoading =
    (hasAllParams && classementRaw === undefined) ||
    (ecoleId && userId && ecoleRaw === undefined);

  // ===== Couleurs adaptatives =====
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const accent = dark ? "#818CF8" : "#4F46E5";
  const shadow = dark
    ? "0 2px 8px rgba(0,0,0,0.4)"
    : "0 2px 8px rgba(0,0,0,0.1)";
  const gold = "#FFD700";
  const silver = "#C0C0C0";
  const bronze = "#CD7F32";

  // ===== Données dérivées mémoïsées =====
  const top3 = useMemo(() => classement.slice(0, 3), [classement]);

  const getMention = useMemo(() => {
    return (moy) => {
      if (
        ecole?.seuilFelicitations != null &&
        moy >= ecole.seuilFelicitations
      )
        return "Félicitations";
      if (
        ecole?.seuilEncouragement != null &&
        moy >= ecole.seuilEncouragement
      )
        return "Encouragement";
      return "";
    };
  }, [ecole]);

  const couleurs = useMemo(() => [gold, silver, bronze], []);

  const icones = useMemo(() => {
    const size = isMobile ? 22 : 28;
    return [
      <Trophy key="t" size={size} />,
      <Medal key="m" size={size} />,
      <Star key="s" size={size} />,
    ];
  }, [isMobile]);

  // ===== Styles adaptatifs =====
  const containerPadding = isMobile ? "16px 12px" : "24px 16px";
  const titleSize = isMobile ? 20 : 24;
  const iconSize = isMobile ? 22 : 28;
  const top3CardPadding = isMobile ? 14 : 20;
  const top3Gap = isMobile ? 8 : 16;
  const top3IconContainerSize = isMobile ? 40 : 48;
  const top3NameSize = isMobile ? 16 : 18;
  const top3SecondarySize = isMobile ? 13 : 14;
  const top3RankFontSize = isMobile ? 26 : 32;
  const fullListTitleSize = isMobile ? 18 : 20;
  const fullListPadding = isMobile ? 12 : 16;
  const fullListRowPadding = isMobile ? "8px 0" : "10px 0";
  const fullListFontSize = isMobile ? 14 : 16;

  // ===== Rendu : loading =====
  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: 300,
        }}
      >
        <Loader size={32} className="th-animate-spin" style={{ color: accent }} />
      </div>
    );
  }

  // ===== Rendu : pas de classe sélectionnée =====
  if (!classe) {
    return (
      <p
        style={{
          color: textSecondary,
          textAlign: "center",
          padding: 40,
        }}
      >
        Veuillez sélectionner une classe.
      </p>
    );
  }

  // ===== Rendu : aucune donnée =====
  if (classement.length === 0) {
    return (
      <p
        style={{
          color: textSecondary,
          textAlign: "center",
          padding: 40,
        }}
      >
        Aucun élève dans cette classe.
      </p>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: containerPadding }}>
      {/* Keyframes préfixés th-* (Tableau Honneur) */}
      <style>{`
        @keyframes th-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .th-animate-spin { animation: th-spin 1s linear infinite; }
      `}</style>

      <h2
        style={{
          fontSize: titleSize,
          fontWeight: 700,
          marginBottom: isMobile ? 16 : 24,
          display: "flex",
          alignItems: "center",
          gap: 8,
          color: textPrimary,
        }}
      >
        <Trophy size={iconSize} color={gold} /> Tableau d'honneur – {classe}
      </h2>

      {/* Top 3 */}
      <div
        style={{
          display: "grid",
          gap: top3Gap,
          marginBottom: isMobile ? 24 : 32,
        }}
      >
        {top3.map((eleve, idx) => {
          const mention = getMention(eleve.moyenneGenerale);
          return (
            <div
              key={eleve._id}
              style={{
                background: cardBg,
                borderRadius: 16,
                padding: top3CardPadding,
                display: "flex",
                alignItems: "center",
                gap: isMobile ? 10 : 16,
                boxShadow: shadow,
                border: `1px solid ${cardBorder}`,
                borderLeft: `6px solid ${couleurs[idx]}`,
                transition: "background-color 0.3s, transform 0.1s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = dark
                  ? "0 4px 12px rgba(0,0,0,0.5)"
                  : "0 4px 12px rgba(0,0,0,0.12)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = shadow;
              }}
            >
              <div
                style={{
                  color: couleurs[idx],
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: top3IconContainerSize,
                  height: top3IconContainerSize,
                  background: `${couleurs[idx]}${dark ? "33" : "15"}`,
                  borderRadius: 12,
                  flexShrink: 0,
                }}
              >
                {icones[idx]}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: top3NameSize,
                    color: textPrimary,
                  }}
                >
                  {eleve.nom} {eleve.postnom}
                </div>
                <div
                  style={{
                    color: textSecondary,
                    fontSize: top3SecondarySize,
                  }}
                >
                  Moyenne : {eleve.moyenneGenerale.toFixed(1)}%
                </div>
                {mention && (
                  <span
                    style={{
                      display: "inline-block",
                      marginTop: 4,
                      background: dark ? "#312E81" : "#EEF2FF",
                      color: accent,
                      padding: "2px 10px",
                      borderRadius: 20,
                      fontSize: isMobile ? 11 : 12,
                      fontWeight: 600,
                    }}
                  >
                    {mention}
                  </span>
                )}
              </div>
              <div
                style={{
                  fontSize: top3RankFontSize,
                  fontWeight: 800,
                  color: couleurs[idx],
                  fontFamily: "'Inter', sans-serif",
                  flexShrink: 0,
                }}
              >
                #{eleve.rang}
              </div>
            </div>
          );
        })}
      </div>

      {/* Classement complet */}
      <h3
        style={{
          fontSize: fullListTitleSize,
          fontWeight: 600,
          marginBottom: isMobile ? 12 : 16,
          color: textPrimary,
        }}
      >
        Classement complet
      </h3>
      <div
        style={{
          background: cardBg,
          borderRadius: 16,
          padding: fullListPadding,
          boxShadow: shadow,
          border: `1px solid ${cardBorder}`,
        }}
      >
        {classement.map((eleve, idx) => (
          <div
            key={eleve._id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: fullListRowPadding,
              borderBottom:
                idx < classement.length - 1
                  ? `1px solid ${cardBorder}`
                  : "none",
              background:
                idx % 2 === 0 ? "transparent" : dark ? "#26334D" : "#F8FAFC",
              borderRadius: 4,
              color: textPrimary,
            }}
          >
            <span
              style={{
                fontWeight: idx < 3 ? 700 : 500,
                fontSize: fullListFontSize,
              }}
            >
              {idx + 1}. {eleve.nom} {eleve.postnom}
            </span>
            <span
              style={{
                fontWeight: 600,
                color: accent,
                fontSize: fullListFontSize,
              }}
            >
              {eleve.moyenneGenerale.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}