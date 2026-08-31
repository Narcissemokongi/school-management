import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile"; // <-- Import du hook
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line,
} from "recharts";
import { School, TrendingUp, BarChart3, Loader } from "lucide-react";

export function StatistiquesAvancees({ ecoleId, anneeId, classes, annees }) {
  const { dark } = useStyles();
  const isMobile = useIsMobile(); // Détection mobile

  const [tab, setTab] = useState("taux");
  const [selectedClasse, setSelectedClasse] = useState("");
  const [seuil, setSeuil] = useState(50);

  // Requêtes
  const tauxReussite = useQuery(
    api.statistiques.getTauxReussiteParMatiere,
    selectedClasse ? { ecoleId, anneeId, classe: selectedClasse, seuil } : "skip"
  ) ?? [];

  const evolution = useQuery(
    api.statistiques.getEvolutionResultats,
    selectedClasse && annees.length > 0
      ? { ecoleId, classe: selectedClasse, annees: annees.map((a) => a._id) }
      : "skip"
  ) ?? [];

  const comparaison = useQuery(
    api.statistiques.getComparaisonClasses,
    anneeId ? { ecoleId, anneeId } : "skip"
  ) ?? [];

  // Couleurs adaptatives
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const inputBg = dark ? "#0F172A" : "#F9FAFB";
  const inputText = dark ? "#F1F5F9" : "#1E293B";
  const accent = dark ? "#818CF8" : "#4F46E5";
  const success = dark ? "#34D399" : "#10B981";
  const gridStroke = dark ? "#334155" : "#E2E8F0";
  const axisStroke = dark ? "#94A3B8" : "#64748B";
  const tooltipBg = dark ? "#0F172A" : "white";
  const tooltipBorder = dark ? "#334155" : "#E2E8F0";

  const isLoading =
    (tab === "taux" && selectedClasse && tauxReussite === undefined) ||
    (tab === "evolution" && selectedClasse && evolution === undefined) ||
    (tab === "comparaison" && comparaison === undefined);

  // Styles adaptatifs
  const containerPadding = isMobile ? "16px 12px" : "24px 16px";
  const titleSize = isMobile ? 22 : 28;
  const tabButtonPadding = isMobile ? "8px 12px" : "10px 20px";
  const tabButtonFontSize = isMobile ? 14 : 14;
  const tabButtonMarginRight = isMobile ? 4 : 8;
  const selectPadding = isMobile ? "10px 12px" : "8px 12px";
  const selectFontSize = isMobile ? 16 : 14;
  const graphHeight = isMobile ? 250 : 300;
  const cardPadding = isMobile ? 16 : 24;
  const controlsFlexDirection = isMobile ? "column" : "row";
  const controlsAlignItems = isMobile ? "stretch" : "center";
  const controlsGap = isMobile ? 8 : 12;
  const tabContainerStyle = {
    display: "flex",
    gap: isMobile ? 4 : 8,
    marginBottom: isMobile ? 16 : 24,
    flexWrap: "wrap",
    overflowX: isMobile ? "auto" : "visible",
    whiteSpace: isMobile ? "nowrap" : "normal",
  };

  const tabButton = (active) => ({
    padding: tabButtonPadding,
    border: "none",
    borderRadius: 8,
    background: active ? accent : "transparent",
    color: active ? "#fff" : textSecondary,
    fontWeight: 600,
    cursor: "pointer",
    marginRight: tabButtonMarginRight,
    display: "inline-flex",
    alignItems: "center",
    fontSize: tabButtonFontSize,
    flexShrink: 0,
  });

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{
        background: tooltipBg,
        border: `1px solid ${tooltipBorder}`,
        borderRadius: 8,
        padding: "8px 12px",
        color: textPrimary,
      }}>
        <p style={{ margin: 0, fontWeight: 600 }}>{label}</p>
        {payload.map((p, idx) => (
          <p key={idx} style={{ margin: 0 }}>
            {p.name} : {p.value}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: containerPadding }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .animate-spin { animation: spin 1s linear infinite; }`}</style>

      <h2 style={{ fontSize: titleSize, fontWeight: 700, color: textPrimary, marginBottom: isMobile ? 16 : 24 }}>
        Statistiques avancées
      </h2>

      {/* Onglets */}
      <div style={tabContainerStyle}>
        <button onClick={() => setTab("taux")} style={tabButton(tab === "taux")}>
          <BarChart3 size={18} style={{ marginRight: 6 }} /> Taux de réussite
        </button>
        <button onClick={() => setTab("evolution")} style={tabButton(tab === "evolution")}>
          <TrendingUp size={18} style={{ marginRight: 6 }} /> Évolution
        </button>
        <button onClick={() => setTab("comparaison")} style={tabButton(tab === "comparaison")}>
          <School size={18} style={{ marginRight: 6 }} /> Comparaison classes
        </button>
      </div>

      {/* Sélecteur de classe (sauf comparaison) */}
      {tab !== "comparaison" && (
        <div style={{ display: "flex", gap: controlsGap, marginBottom: isMobile ? 16 : 24, alignItems: controlsAlignItems, flexWrap: "wrap", flexDirection: controlsFlexDirection }}>
          <select
            value={selectedClasse}
            onChange={(e) => setSelectedClasse(e.target.value)}
            style={{
              padding: selectPadding,
              border: `1px solid ${cardBorder}`,
              borderRadius: 8,
              fontSize: selectFontSize,
              background: inputBg,
              color: inputText,
              outline: "none",
              width: isMobile ? "100%" : "auto",
              flex: isMobile ? "none" : 1,
            }}
          >
            <option value="">-- Choisir une classe --</option>
            {classes.map((c) => (
              <option key={c._id} value={c.nom} style={{ background: dark ? "#1E293B" : "#FFF" }}>{c.nom}</option>
            ))}
          </select>
          {tab === "taux" && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, width: isMobile ? "100%" : "auto" }}>
              <span style={{ color: textSecondary, fontSize: isMobile ? 14 : 14 }}>Seuil (%) :</span>
              <input
                type="number"
                value={seuil}
                onChange={(e) => setSeuil(Number(e.target.value))}
                min={0}
                max={100}
                style={{
                  width: isMobile ? "100%" : 70,
                  padding: selectPadding,
                  border: `1px solid ${cardBorder}`,
                  borderRadius: 8,
                  background: inputBg,
                  color: inputText,
                  fontSize: selectFontSize,
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Indicateur de chargement */}
      {isLoading && (
        <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
          <Loader size={32} className="animate-spin" style={{ color: accent }} />
        </div>
      )}

      {/* Contenu des onglets */}
      {!isLoading && tab === "taux" && selectedClasse && (
        <div style={{
          background: cardBg,
          borderRadius: 16,
          padding: cardPadding,
          boxShadow: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)",
          border: `1px solid ${cardBorder}`,
        }}>
          <h3 style={{ marginBottom: 16, color: textPrimary, fontSize: isMobile ? 16 : 18 }}>
            Taux de réussite par matière (≥ {seuil}%) – {selectedClasse}
          </h3>
          {tauxReussite.length === 0 ? (
            <p style={{ color: textSecondary }}>Aucune donnée.</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={graphHeight}>
                <BarChart data={tauxReussite}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis dataKey="matiere" stroke={axisStroke} />
                  <YAxis unit="%" domain={[0, 100]} stroke={axisStroke} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="tauxReussite" fill={accent} radius={[4, 4, 0, 0]} name="Taux de réussite" />
                </BarChart>
              </ResponsiveContainer>
              {/* Tableau récapitulatif */}
              <div style={{ overflowX: "auto", marginTop: 20, WebkitOverflowScrolling: "touch" }}>
                <table style={{ width: "100%", minWidth: isMobile ? 400 : "auto", borderCollapse: "collapse", color: textPrimary }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${cardBorder}` }}>
                      <th style={{ textAlign: "left", padding: 8 }}>Matière</th>
                      <th style={{ textAlign: "center", padding: 8 }}>Taux de réussite</th>
                      <th style={{ textAlign: "center", padding: 8 }}>Nombre d'élèves</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tauxReussite.map((item) => (
                      <tr key={item.matiere} style={{ borderBottom: `1px solid ${cardBorder}` }}>
                        <td style={{ padding: 8 }}>{item.matiere}</td>
                        <td style={{ textAlign: "center", padding: 8 }}>{item.tauxReussite.toFixed(1)}%</td>
                        <td style={{ textAlign: "center", padding: 8 }}>{item.nbEleves}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {!isLoading && tab === "evolution" && selectedClasse && (
        <div style={{
          background: cardBg,
          borderRadius: 16,
          padding: cardPadding,
          boxShadow: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)",
          border: `1px solid ${cardBorder}`,
        }}>
          <h3 style={{ marginBottom: 16, color: textPrimary, fontSize: isMobile ? 16 : 18 }}>
            Évolution de la moyenne générale – {selectedClasse}
          </h3>
          {evolution.length === 0 ? (
            <p style={{ color: textSecondary }}>Pas assez de données.</p>
          ) : (
            <ResponsiveContainer width="100%" height={graphHeight}>
              <LineChart data={evolution}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="anneeNom" stroke={axisStroke} />
                <YAxis domain={[0, 100]} stroke={axisStroke} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line type="monotone" dataKey="moyenne" stroke={accent} strokeWidth={2} name="Moy. générale (%)" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {!isLoading && tab === "comparaison" && (
        <div style={{
          background: cardBg,
          borderRadius: 16,
          padding: cardPadding,
          boxShadow: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)",
          border: `1px solid ${cardBorder}`,
        }}>
          <h3 style={{ marginBottom: 16, color: textPrimary, fontSize: isMobile ? 16 : 18 }}>
            Comparaison des classes – {anneeId}
          </h3>
          {comparaison.length === 0 ? (
            <p style={{ color: textSecondary }}>Aucune donnée.</p>
          ) : (
            <ResponsiveContainer width="100%" height={graphHeight}>
              <BarChart data={comparaison}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="classe" stroke={axisStroke} />
                <YAxis domain={[0, 100]} stroke={axisStroke} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="moyenne" fill={success} radius={[4, 4, 0, 0]} name="Moy. générale (%)" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      )}
    </div>
  );
}