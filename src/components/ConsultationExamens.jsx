import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useStyles } from "../styles/theme";
import { useIsMobile } from "../hooks/useIsMobile"; // <-- Import du hook
import { Calendar, Clock, MapPin, BookOpen, Loader } from "lucide-react";

export function ConsultationExamens({ ecoleId, anneeId, classe }) {
  const { dark } = useStyles();
  const isMobile = useIsMobile(); // Détection mobile

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
        padding: isMobile ? 32 : 48,
        textAlign: "center",
        boxShadow: shadow,
        border: `1px solid ${cardBorder}`,
        marginTop: 16,
      }}>
        <Calendar size={isMobile ? 40 : 48} color={textSecondary} style={{ marginBottom: 12 }} />
        <p style={{ color: textSecondary, fontSize: isMobile ? 14 : 16, margin: 0 }}>Aucun examen planifié pour cette classe.</p>
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

  // Styles adaptatifs
  const containerPadding = isMobile ? "12px" : "16px";
  const titleSize = isMobile ? 20 : 24;
  const dateTitleSize = isMobile ? 15 : 16;
  const cardPadding = isMobile ? "10px 12px" : "12px 16px";
  const cardGap = isMobile ? 8 : 16;
  const cardFlexDirection = isMobile ? "column" : "row";
  const cardAlignItems = isMobile ? "stretch" : "center";

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: containerPadding }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .animate-spin { animation: spin 1s linear infinite; }`}</style>

      <h2 style={{
        fontSize: titleSize,
        fontWeight: 700,
        color: textPrimary,
        marginBottom: isMobile ? 16 : 24,
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}>
        <Calendar size={isMobile ? 20 : 24} color={accent} />
        Calendrier des examens
      </h2>

      {Object.entries(groupes)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, liste]) => (
          <div key={date} style={{ marginBottom: isMobile ? 16 : 24 }}>
            <h3 style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: dateTitleSize,
              fontWeight: 600,
              color: textPrimary,
              marginBottom: isMobile ? 8 : 12,
            }}>
              <Calendar size={isMobile ? 16 : 18} color={accent} />
              {date}
            </h3>

            <div style={{ display: "grid", gap: isMobile ? 6 : 8 }}>
              {liste.map((exam) => (
                <div
                  key={exam._id}
                  style={{
                    padding: cardPadding,
                    background: cardBg,
                    borderRadius: 12,
                    border: `1px solid ${cardBorder}`,
                    boxShadow: shadow,
                    display: "flex",
                    flexDirection: cardFlexDirection,
                    flexWrap: "wrap",
                    gap: cardGap,
                    alignItems: cardAlignItems,
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 500, color: textPrimary, fontSize: isMobile ? 14 : 15 }}>
                    <BookOpen size={isMobile ? 14 : 14} color={accent} />
                    {exam.matiere}
                  </span>
                  {exam.heure && (
                    <span style={{ display: "flex", alignItems: "center", gap: 6, color: textSecondary, fontSize: isMobile ? 13 : 14 }}>
                      <Clock size={14} />
                      {exam.heure}
                    </span>
                  )}
                  {exam.duree && (
                    <span style={{ color: textSecondary, fontSize: isMobile ? 12 : 13 }}>
                      ⏱️ {exam.duree}
                    </span>
                  )}
                  {exam.salle && (
                    <span style={{ display: "flex", alignItems: "center", gap: 6, color: textSecondary, fontSize: isMobile ? 13 : 14 }}>
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