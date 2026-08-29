import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useStyles } from "../styles/theme";
import { Calendar, Clock, MapPin, BookOpen, Loader } from "lucide-react";

export function ConsultationExamens({ ecoleId, anneeId, classe }) {
  const { dark } = useStyles();

  const examens = useQuery(
    api.examens.listByClasse,
    classe ? { ecoleId, anneeId, classe } : "skip"
  ) ?? [];

  // Couleurs adaptatives
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const accent = dark ? "#818CF8" : "#4F46E5";
  const shadow = dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)";

  if (!classe) {
    return (
      <div style={{ textAlign: "center", padding: 40, color: textSecondary }}>
        <p>Classe non spécifiée.</p>
      </div>
    );
  }

  // Gestion du chargement
  if (examens === undefined) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
        <Loader size={24} className="animate-spin" />
      </div>
    );
  }

  if (examens.length === 0) {
    return (
      <div style={{
        background: cardBg,
        borderRadius: 16,
        padding: 48,
        textAlign: "center",
        boxShadow: shadow,
        border: `1px solid ${cardBorder}`,
        marginTop: 16,
      }}>
        <Calendar size={48} color={textSecondary} style={{ marginBottom: 12 }} />
        <p style={{ color: textSecondary, fontSize: 16 }}>Aucun examen planifié pour cette classe.</p>
      </div>
    );
  }

  // Grouper par date
  const groupes = examens.reduce((acc, exam) => {
    const jour = exam.date;
    if (!acc[jour]) acc[jour] = [];
    acc[jour].push(exam);
    return acc;
  }, {});

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "16px" }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .animate-spin { animation: spin 1s linear infinite; }`}</style>

      <h2 style={{
        fontSize: 24,
        fontWeight: 700,
        color: textPrimary,
        marginBottom: 24,
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}>
        <Calendar size={24} color={accent} />
        Calendrier des examens
      </h2>

      {Object.entries(groupes)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, liste]) => (
          <div key={date} style={{ marginBottom: 24 }}>
            <h3 style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 16,
              fontWeight: 600,
              color: textPrimary,
              marginBottom: 12,
            }}>
              <Calendar size={18} color={accent} />
              {date}
            </h3>

            <div style={{ display: "grid", gap: 8 }}>
              {liste.map((exam) => (
                <div
                  key={exam._id}
                  style={{
                    padding: "12px 16px",
                    background: cardBg,
                    borderRadius: 12,
                    border: `1px solid ${cardBorder}`,
                    boxShadow: shadow,
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 16,
                    alignItems: "center",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 500, color: textPrimary }}>
                    <BookOpen size={14} color={accent} />
                    {exam.matiere}
                  </span>
                  {exam.heure && (
                    <span style={{ display: "flex", alignItems: "center", gap: 6, color: textSecondary }}>
                      <Clock size={14} />
                      {exam.heure}
                    </span>
                  )}
                  {exam.duree && (
                    <span style={{ color: textSecondary, fontSize: 13 }}>
                      ⏱️ {exam.duree}
                    </span>
                  )}
                  {exam.salle && (
                    <span style={{ display: "flex", alignItems: "center", gap: 6, color: textSecondary }}>
                      <MapPin size={14} />
                      {exam.salle}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}