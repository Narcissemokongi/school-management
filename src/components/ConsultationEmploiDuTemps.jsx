import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useStyles } from "../styles/theme";
import { useIsMobile } from "../hooks/useIsMobile"; // <-- Import du hook
import { Skeleton } from "./Skeleton";
import { Calendar, Clock, School } from "lucide-react";

const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

export function ConsultationEmploiDuTemps({ ecoleId, classe, anneeId }) {
  const { dark } = useStyles();
  const isMobile = useIsMobile(); // Détection mobile

  // Si anneeId est fourni, on l'utilise ; sinon on ne filtre pas par année (compatibilité)
  const emploi = useQuery(
    api.emploiDuTemps.getByClasse,
    classe ? (anneeId ? { classe, ecoleId, anneeId } : { classe, ecoleId }) : "skip"
  );

  // Couleurs adaptatives
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const tableHeaderBg = dark ? "#0F172A" : "#1E293B";
  const rowBorder = dark ? "#334155" : "#F1F5F9";
  const hourBg = dark ? "#1E293B" : "#F8FAFC";
  const hourText = dark ? "#CBD5E1" : "#475569";
  const cellHasContentBg = dark ? "#312E81" : "#EEF2FF";
  const cellHasContentText = dark ? "#F1F5F9" : "#1E293B";
  const cellEmptyText = dark ? "#64748B" : "#94A3B8";
  const zebraRowBg = dark ? "#1E293B" : "#FFFFFF";
  const zebraRowAltBg = dark ? "#0F172A" : "#F8FAFC";

  if (!classe) {
    return (
      <div style={{ textAlign: "center", padding: 40, color: textSecondary }}>
        <School size={40} style={{ marginBottom: 12 }} />
        <p>Aucune classe sélectionnée.</p>
      </div>
    );
  }

  if (emploi === undefined) return <Skeleton height={300} />;

  const emploiActif = Array.isArray(emploi) ? emploi[0] : emploi;

  let grille = {};
  let heures = [];
  let datePublication = emploiActif?.datePublication ?? "";

  if (emploiActif?.contenu) {
    try {
      const data = JSON.parse(emploiActif.contenu);
      grille = data.grille || {};
      heures = data.heures || [];
      datePublication = data.datePublication || datePublication;
    } catch (error) {
      console.error("Erreur parsing emploi du temps :", error);
      // On continue avec des valeurs vides
    }
  }

  if (!emploiActif || heures.length === 0) {
    return (
      <div style={{
        textAlign: "center",
        padding: isMobile ? 24 : 40,
        color: textSecondary,
        background: cardBg,
        borderRadius: 16,
        boxShadow: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)",
        border: `1px solid ${cardBorder}`,
        marginTop: 20,
      }}>
        <Calendar size={isMobile ? 32 : 40} style={{ marginBottom: 12 }} />
        <p>
          {emploiActif
            ? "L'emploi du temps est vide ou mal formaté."
            : "Aucun emploi du temps publié pour cette classe."}
        </p>
      </div>
    );
  }

  // Styles adaptatifs
  const containerPadding = isMobile ? "12px" : "16px";
  const titleSize = isMobile ? 20 : 24;
  const subtitleSize = isMobile ? 13 : 14;
  const tableFontSize = isMobile ? 12 : 13;
  const cellPadding = isMobile ? 8 : 10;
  const headerPadding = isMobile ? 10 : 12;

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: containerPadding }}>
      {/* En-tête */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: isMobile ? 16 : 20,
        }}
      >
        <div>
          <h2 style={{ fontSize: titleSize, fontWeight: 700, color: textPrimary, margin: 0 }}>
            Emploi du temps
          </h2>
          <p style={{ color: textSecondary, fontSize: subtitleSize, margin: "4px 0 0" }}>
            Classe {classe}
            {anneeId ? ` · Année ${anneeId}` : ""}
            {datePublication ? ` · Publié le ${new Date(datePublication).toLocaleDateString("fr-FR")}` : ""}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <Calendar size={isMobile ? 14 : 16} color={dark ? "#818CF8" : "#4F46E5"} />
          <span style={{ fontWeight: 600, fontSize: isMobile ? 14 : 15, color: textPrimary }}>
            Annuel
          </span>
        </div>
      </div>

      {/* Tableau */}
      <div
        style={{
          overflowX: "auto",
          background: cardBg,
          borderRadius: 16,
          boxShadow: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)",
          border: `1px solid ${cardBorder}`,
          transition: "background-color 0.3s",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: tableFontSize,
            minWidth: isMobile ? 600 : 700,
          }}
        >
          <thead>
            <tr style={{ background: tableHeaderBg, color: "white" }}>
              <th style={{ padding: headerPadding, textAlign: "center" }}>
                <Clock size={16} style={{ marginRight: 4, verticalAlign: "middle" }} />
                Heures
              </th>
              {JOURS.map((jour) => (
                <th key={jour} style={{ padding: headerPadding, textAlign: "center" }}>
                  {jour}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {heures.map((heure, rowIndex) => (
              <tr
                key={heure}
                style={{
                  borderBottom: `1px solid ${rowBorder}`,
                  background: rowIndex % 2 === 0 ? zebraRowBg : zebraRowAltBg,
                }}
              >
                <td
                  style={{
                    padding: cellPadding,
                    textAlign: "center",
                    fontWeight: 600,
                    background: hourBg,
                    color: hourText,
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
                        padding: cellPadding,
                        textAlign: "center",
                        background: hasContent ? cellHasContentBg : "transparent",
                        borderRadius: hasContent ? 6 : 0,
                        minHeight: 40,
                      }}
                    >
                      <span
                        style={{
                          fontWeight: hasContent ? 500 : 400,
                          color: hasContent ? cellHasContentText : cellEmptyText,
                          fontSize: hasContent ? tableFontSize : tableFontSize - 1,
                          display: "block",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
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
    </div>
  );
}