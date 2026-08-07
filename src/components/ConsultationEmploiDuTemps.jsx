import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Skeleton } from "./Skeleton";
import { Calendar, Clock, School, ChevronLeft, ChevronRight } from "lucide-react";

const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

export function ConsultationEmploiDuTemps({ ecoleId, classe }) {
  const emplois =
    useQuery(
      api.emploiDuTemps.getByClasse,
      classe ? { classe, ecoleId } : "skip"
    ) ?? [];

  if (!classe) {
    return (
      <div style={{ textAlign: "center", padding: 40, color: "#64748B" }}>
        <School size={40} style={{ marginBottom: 12 }} />
        <p>Aucune classe sélectionnée.</p>
      </div>
    );
  }

  if (emplois === undefined) return <Skeleton height={300} />;

  const semainesDisponibles = emplois
    .map((e) => e.semaine)
    .sort()
    .reverse();

  const [semaineActive, setSemaineActive] = useState(semainesDisponibles[0] || "");
  const emploiActif = emplois.find((e) => e.semaine === semaineActive);

  let grille = {};
  let heures = [];
  let datesSemaine = [];

  if (emploiActif?.contenu) {
    try {
      const data = JSON.parse(emploiActif.contenu);
      grille = data.grille || {};
      heures = data.heures || [];
    } catch {
      // format non JSON, on laisse vide
    }
  }

  if (semaineActive) {
    datesSemaine = getDatesOfWeek(semaineActive);
  }

  function getDatesOfWeek(lundiStr) {
    const lundi = new Date(lundiStr + "T00:00:00");
    const dates = [];
    for (let i = 0; i < 6; i++) {
      const jour = new Date(lundi);
      jour.setDate(lundi.getDate() + i);
      dates.push(jour.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }));
    }
    return dates;
  }

  const currentIndex = semainesDisponibles.indexOf(semaineActive);
  const goToPrevious = () => {
    if (currentIndex < semainesDisponibles.length - 1) {
      setSemaineActive(semainesDisponibles[currentIndex + 1]);
    }
  };
  const goToNext = () => {
    if (currentIndex > 0) {
      setSemaineActive(semainesDisponibles[currentIndex - 1]);
    }
  };

  if (semainesDisponibles.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: 40, color: "#64748B" }}>
        <Calendar size={40} style={{ marginBottom: 12 }} />
        <p>Aucun emploi du temps publié pour cette classe.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto" }}>
      {/* En-tête avec navigation */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: "#1E293B", margin: 0 }}>
            Emploi du temps
          </h2>
          <p style={{ color: "#64748B", fontSize: 14, margin: "4px 0 0" }}>
            Classe {classe}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={goToPrevious}
            disabled={currentIndex >= semainesDisponibles.length - 1}
            style={{
              background: "none",
              border: "1px solid #E2E8F0",
              borderRadius: 8,
              padding: "8px 12px",
              cursor: "pointer",
              color:
                currentIndex >= semainesDisponibles.length - 1
                  ? "#CBD5E1"
                  : "#4F46E5",
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontWeight: 500,
              fontSize: 13,
            }}
          >
            <ChevronLeft size={16} /> Précédent
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Calendar size={16} color="#4F46E5" />
            <span style={{ fontWeight: 600, fontSize: 15, color: "#1E293B" }}>
              Semaine du {formatSemaine(semaineActive)}
            </span>
          </div>
          <button
            onClick={goToNext}
            disabled={currentIndex <= 0}
            style={{
              background: "none",
              border: "1px solid #E2E8F0",
              borderRadius: 8,
              padding: "8px 12px",
              cursor: "pointer",
              color: currentIndex <= 0 ? "#CBD5E1" : "#4F46E5",
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontWeight: 500,
              fontSize: 13,
            }}
          >
            Suivant <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Tableau */}
      {heures.length > 0 ? (
        <div
          style={{
            overflowX: "auto",
            background: "#FFF",
            borderRadius: 16,
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 13,
              minWidth: 700,
            }}
          >
            <thead>
              <tr style={{ background: "#1E293B", color: "white" }}>
                <th style={{ padding: 12, textAlign: "center" }}>
                  <Clock size={16} style={{ marginRight: 4, verticalAlign: "middle" }} />
                  Heures
                </th>
                {JOURS.map((jour, idx) => (
                  <th key={jour} style={{ padding: 12, textAlign: "center" }}>
                    {jour}
                    <br />
                    <span style={{ fontWeight: 400, fontSize: 11, color: "#CBD5E1" }}>
                      {datesSemaine[idx]}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {heures.map((heure) => (
                <tr key={heure} style={{ borderBottom: "1px solid #F1F5F9" }}>
                  <td
                    style={{
                      padding: 10,
                      textAlign: "center",
                      fontWeight: 600,
                      background: "#F8FAFC",
                      color: "#475569",
                    }}
                  >
                    {heure}
                  </td>
                  {JOURS.map((jour) => {
                    const contenu = grille[jour]?.[heure] || "";
                    const hasContent = contenu.trim() !== "";
                    return (
                      <td
                        key={jour}
                        style={{
                          padding: 8,
                          textAlign: "center",
                          background: hasContent ? "#EEF2FF" : "transparent",
                          borderRadius: hasContent ? 6 : 0,
                        }}
                      >
                        <span
                          style={{
                            fontWeight: hasContent ? 500 : 400,
                            color: hasContent ? "#1E293B" : "#94A3B8",
                            fontSize: hasContent ? 13 : 12,
                          }}
                        >
                          {contenu || "—"}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          style={{
            background: "#FFF",
            borderRadius: 16,
            padding: 48,
            textAlign: "center",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <Clock size={32} style={{ marginBottom: 8 }} />
          <p style={{ color: "#64748B", fontSize: 14 }}>
            L'emploi du temps pour cette semaine n'est pas encore formaté.
          </p>
        </div>
      )}
    </div>
  );
}

function formatSemaine(dateStr) {
  if (!dateStr) return "";
  const [annee, mois, jour] = dateStr.split("-");
  return `${jour}/${mois}/${annee}`;
}