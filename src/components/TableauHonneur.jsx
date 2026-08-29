import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useStyles } from "../styles/theme";
import { Trophy, Medal, Star, Loader } from "lucide-react";

export function TableauHonneur({ ecoleId, anneeId, classe }) {
  const { dark } = useStyles(); // ✅ seul dark est nécessaire

  const classement = useQuery(
    api.classement.getClassement,
    (ecoleId && anneeId && classe) ? { ecoleId, anneeId, classe } : "skip"
  );
  const ecole = useQuery(api.ecoles.get, ecoleId ? { ecoleId } : "skip");

  // Couleurs adaptatives
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const accent = dark ? "#818CF8" : "#4F46E5";
  const shadow = dark ? "0 2px 8px rgba(0,0,0,0.4)" : "0 2px 8px rgba(0,0,0,0.1)";
  const gold = "#FFD700";
  const silver = "#C0C0C0";
  const bronze = "#CD7F32";

  // Gestion du chargement
  if (classement === undefined || (ecoleId && ecole === undefined)) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 300 }}>
        <Loader size={32} className="animate-spin" style={{ color: accent }} />
      </div>
    );
  }

  if (!classe) {
    return <p style={{ color: textSecondary, textAlign: "center", padding: 40 }}>Veuillez sélectionner une classe.</p>;
  }

  if (classement.length === 0) {
    return <p style={{ color: textSecondary, textAlign: "center", padding: 40 }}>Aucun élève dans cette classe.</p>;
  }

  const top3 = classement.slice(0, 3);

  // Fonction pour déterminer la mention
  const getMention = (moy) => {
    if (ecole?.seuilFelicitations && moy >= ecole.seuilFelicitations) return "Félicitations";
    if (ecole?.seuilEncouragement && moy >= ecole.seuilEncouragement) return "Encouragement";
    return "";
  };

  const couleurs = [gold, silver, bronze];
  const icones = [<Trophy size={28} />, <Medal size={28} />, <Star size={28} />];

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "24px 16px" }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .animate-spin { animation: spin 1s linear infinite; }`}</style>

      <h2 style={{
        fontSize: 24,
        fontWeight: 700,
        marginBottom: 24,
        display: "flex",
        alignItems: "center",
        gap: 8,
        color: textPrimary,
      }}>
        <Trophy size={28} color={gold} /> Tableau d'honneur – {classe}
      </h2>

      {/* Top 3 */}
      <div style={{ display: "grid", gap: 16, marginBottom: 32 }}>
        {top3.map((eleve, idx) => {
          const mention = getMention(eleve.moyenneGenerale);
          return (
            <div
              key={eleve._id}
              style={{
                background: cardBg,
                borderRadius: 16,
                padding: 20,
                display: "flex",
                alignItems: "center",
                gap: 16,
                boxShadow: shadow,
                border: `1px solid ${cardBorder}`,
                borderLeft: `6px solid ${couleurs[idx]}`,
                transition: "background-color 0.3s, transform 0.1s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = dark ? "0 4px 12px rgba(0,0,0,0.5)" : "0 4px 12px rgba(0,0,0,0.12)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = shadow;
              }}
            >
              <div style={{
                color: couleurs[idx],
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 48,
                height: 48,
                background: `${couleurs[idx]}${dark ? "33" : "15"}`,
                borderRadius: 12,
              }}>
                {icones[idx]}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 18, color: textPrimary }}>
                  {eleve.nom} {eleve.postnom}
                </div>
                <div style={{ color: textSecondary, fontSize: 14 }}>
                  Moyenne : {eleve.moyenneGenerale.toFixed(1)}%
                </div>
                {mention && (
                  <span style={{
                    display: "inline-block",
                    marginTop: 4,
                    background: dark ? "#312E81" : "#EEF2FF",
                    color: accent,
                    padding: "2px 10px",
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 600,
                  }}>
                    {mention}
                  </span>
                )}
              </div>
              <div style={{
                fontSize: 32,
                fontWeight: 800,
                color: couleurs[idx],
                fontFamily: "'Inter', sans-serif",
              }}>
                #{eleve.rang}
              </div>
            </div>
          );
        })}
      </div>

      {/* Classement complet */}
      <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16, color: textPrimary }}>
        Classement complet
      </h3>
      <div style={{
        background: cardBg,
        borderRadius: 16,
        padding: 16,
        boxShadow: shadow,
        border: `1px solid ${cardBorder}`,
      }}>
        {classement.map((eleve, idx) => (
          <div
            key={eleve._id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 0",
              borderBottom: idx < classement.length - 1 ? `1px solid ${cardBorder}` : "none",
              background: idx % 2 === 0 ? "transparent" : (dark ? "#26334D" : "#F8FAFC"),
              borderRadius: 4,
              color: textPrimary,
            }}
          >
            <span style={{ fontWeight: idx < 3 ? 700 : 500 }}>
              {idx + 1}. {eleve.nom} {eleve.postnom}
            </span>
            <span style={{ fontWeight: 600, color: accent }}>
              {eleve.moyenneGenerale.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}