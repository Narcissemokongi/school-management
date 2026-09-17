import { useState, useEffect, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import { Skeleton } from "./Skeleton";
import { Calendar, Clock, School, Info } from "lucide-react";

const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

// Formatage safe de datePublication
function formatDateShort(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("fr-FR");
}

export function ConsultationEmploiDuTemps({ ecoleId, classe, anneeId, user }) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();

  const userId = user?._id;
  const canQueryEmploi = Boolean(classe && ecoleId && userId);
  const canQueryAnnee = Boolean(anneeId && userId);

  // ===== Emploi du temps (userId requis) =====
  const emploi = useQuery(
    api.emploiDuTemps.getByClasse,
    canQueryEmploi
      ? anneeId
        ? { classe, ecoleId, anneeId, userId }
        : { classe, ecoleId, userId }
      : "skip"
  );

  // ===== Nom de l'année scolaire (userId requis) =====
  const anneeObj = useQuery(
    api.anneesScolaires.getById,
    canQueryAnnee ? { anneeId, userId } : "skip"
  );

  const anneeNom = anneeObj?.nom || "";

  // ===== Couleurs adaptatives =====
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const tableHeaderBg = dark ? "#312E81" : "#1E293B";
  const tableHeaderText = "#FFFFFF";
  const rowBorder = dark ? "#334155" : "#F1F5F9";
  const hourBg = dark ? "#0F172A" : "#F8FAFC";
  const hourText = dark ? "#CBD5E1" : "#475569";
  const cellHasContentBg = dark ? "#312E81" : "#EEF2FF";
  const cellHasContentText = dark ? "#E0E7FF" : "#312E81";
  const cellHasContentBorder = dark ? "#4F46E5" : "#C7D2FE";
  const cellEmptyText = dark ? "#475569" : "#CBD5E1";
  const zebraRowBg = dark ? "#1E293B" : "#FFFFFF";
  const zebraRowAltBg = dark ? "#0F172A" : "#FAFBFC";

  // ===== Parse contenu (mémoïsé) =====
  const emploiActif = emploi ?? null;

  const parsed = useMemo(() => {
    if (!emploiActif?.contenu) {
      return { grille: {}, heures: [], datePublication: "" };
    }
    try {
      const data = JSON.parse(emploiActif.contenu);
      return {
        grille: data.grille || {},
        heures: data.heures || [],
        datePublication: data.datePublication || emploiActif.datePublication || "",
      };
    } catch {
      // Parse error silencieux — l'état vide s'affichera
      return { grille: {}, heures: [], datePublication: "" };
    }
  }, [emploiActif]);

  const { grille, heures, datePublication } = parsed;
  const hasContent = Boolean(emploiActif) && heures.length > 0;

  // ===== ÉTAT : aucune classe sélectionnée =====
  if (!classe) {
    return (
      <div
        style={{
          maxWidth: 520,
          margin: "0 auto",
          padding: isMobile ? "10px 8px" : "20px 16px",
        }}
      >
        <div
          style={{
            textAlign: "center",
            padding: isMobile ? 32 : 48,
            color: textSecondary,
            background: cardBg,
            borderRadius: 16,
            border: `1px solid ${cardBorder}`,
            boxShadow: dark
              ? "0 1px 3px rgba(0,0,0,0.3)"
              : "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: dark ? "#334155" : "#F1F5F9",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 12px",
            }}
          >
            <School size={26} />
          </div>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              fontWeight: 600,
              color: textPrimary,
            }}
          >
            Aucune classe sélectionnée
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 12.5 }}>
            Sélectionnez une classe pour consulter son emploi du temps
          </p>
        </div>
      </div>
    );
  }

  // ===== ÉTAT : chargement =====
  if (emploi === undefined) return <Skeleton height={300} />;

  const datePublicationLabel = formatDateShort(datePublication);

  return (
    <div
      style={{
        maxWidth: 1280,
        margin: "0 auto",
        padding: isMobile ? "10px 8px" : "20px 16px",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* ==================== EN-TÊTE COMPACT ==================== */}
      <div style={{ marginBottom: isMobile ? 12 : 20 }}>
        <h2
          style={{
            fontSize: isMobile ? 17 : 22,
            fontWeight: 700,
            color: textPrimary,
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          Emploi du temps
        </h2>
        <p
          style={{
            color: textSecondary,
            marginTop: 2,
            marginBottom: 0,
            fontSize: isMobile ? 11.5 : 13,
          }}
        >
          Classe {classe}
          {anneeNom ? ` · ${anneeNom}` : ""}
          {datePublicationLabel ? ` · Publié le ${datePublicationLabel}` : ""}
        </p>
      </div>

      {/* ==================== ÉTAT VIDE ==================== */}
      {!hasContent ? (
        <div
          style={{
            textAlign: "center",
            padding: isMobile ? 32 : 48,
            color: textSecondary,
            background: cardBg,
            borderRadius: 16,
            boxShadow: dark
              ? "0 1px 3px rgba(0,0,0,0.3)"
              : "0 1px 3px rgba(0,0,0,0.05)",
            border: `1px solid ${cardBorder}`,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: dark ? "#334155" : "#F1F5F9",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 12px",
            }}
          >
            <Calendar size={26} />
          </div>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              fontWeight: 600,
              color: textPrimary,
            }}
          >
            Aucun emploi du temps
          </p>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: 12.5,
              maxWidth: 320,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            {emploiActif
              ? "L'emploi du temps publié est vide ou mal formaté. Contactez l'administration."
              : `Aucun emploi du temps n'a encore été publié pour la classe ${classe}.`}
          </p>
        </div>
      ) : (
        <>
          {/* ==================== TABLEAU ==================== */}
          <div
            style={{
              overflowX: "auto",
              background: cardBg,
              borderRadius: 16,
              boxShadow: dark
                ? "0 1px 3px rgba(0,0,0,0.3)"
                : "0 1px 3px rgba(0,0,0,0.05)",
              border: `1px solid ${cardBorder}`,
              WebkitOverflowScrolling: "touch",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "separate",
                borderSpacing: 0,
                fontSize: isMobile ? 12 : 13,
                minWidth: isMobile ? 640 : 700,
              }}
            >
              <thead>
                <tr>
                  <th
                    style={{
                      position: "sticky",
                      top: 0,
                      padding: isMobile ? 10 : 12,
                      textAlign: "center",
                      background: tableHeaderBg,
                      color: tableHeaderText,
                      fontSize: isMobile ? 11 : 12,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: 0.3,
                      borderTopLeftRadius: 16,
                      zIndex: 3,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 4,
                      }}
                    >
                      <Clock size={13} />
                      Heure
                    </div>
                  </th>
                  {JOURS.map((jour, idx) => (
                    <th
                      key={jour}
                      style={{
                        position: "sticky",
                        top: 0,
                        padding: isMobile ? 10 : 12,
                        textAlign: "center",
                        background: tableHeaderBg,
                        color: tableHeaderText,
                        fontSize: isMobile ? 11 : 12,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: 0.3,
                        borderTopRightRadius:
                          idx === JOURS.length - 1 ? 16 : 0,
                        zIndex: 3,
                      }}
                    >
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
                      background:
                        rowIndex % 2 === 0 ? zebraRowBg : zebraRowAltBg,
                    }}
                  >
                    <td
                      style={{
                        padding: isMobile ? 10 : 12,
                        textAlign: "center",
                        fontWeight: 700,
                        background: hourBg,
                        color: hourText,
                        fontSize: isMobile ? 11.5 : 12,
                        borderBottom: `1px solid ${rowBorder}`,
                        borderRight: `1px solid ${rowBorder}`,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {heure}
                    </td>

                    {JOURS.map((jour) => {
                      const contenu = grille[jour]?.[heure] || "";
                      const isEmpty = contenu.trim() === "";
                      return (
                        <td
                          key={jour}
                          style={{
                            padding: isMobile ? 8 : 10,
                            textAlign: "center",
                            borderBottom: `1px solid ${rowBorder}`,
                            borderRight: `1px solid ${rowBorder}`,
                            minHeight: 44,
                            verticalAlign: "middle",
                            transition: "background 0.15s",
                          }}
                        >
                          {isEmpty ? (
                            <span
                              style={{
                                color: cellEmptyText,
                                fontSize: isMobile ? 12 : 13,
                              }}
                            >
                              —
                            </span>
                          ) : (
                            <div
                              style={{
                                display: "inline-block",
                                padding: "6px 10px",
                                borderRadius: 8,
                                background: cellHasContentBg,
                                color: cellHasContentText,
                                border: `1px solid ${cellHasContentBorder}`,
                                fontWeight: 600,
                                fontSize: isMobile ? 11.5 : 12.5,
                                maxWidth: "100%",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                lineHeight: 1.3,
                              }}
                              title={contenu}
                            >
                              {contenu}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ==================== LÉGENDE ==================== */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 10,
              padding: "0 4px",
              fontSize: 11,
              color: textSecondary,
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <span
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 4,
                  background: cellHasContentBg,
                  border: `1px solid ${cellHasContentBorder}`,
                }}
              />
              Cours programmé
            </div>
            <span style={{ opacity: 0.5 }}>·</span>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <span
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 4,
                  background: "transparent",
                  border: `1px dashed ${cellEmptyText}`,
                }}
              />
              Créneau libre
            </div>
            {isMobile && (
              <>
                <span style={{ opacity: 0.5 }}>·</span>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    color: dark ? "#818CF8" : "#4F46E5",
                  }}
                >
                  <Info size={11} />
                  Balayez pour voir les autres jours
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}