import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useStyles } from "../styles/theme";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line,
} from "recharts";
import { School, TrendingUp, BarChart3, Loader } from "lucide-react";

export function StatistiquesAvancees({ ecoleId, anneeId, classes, annees }) {
  const { dark } = useStyles(); // ✅ récupère le mode sombre/clair

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
  const warning = dark ? "#FBBF24" : "#F59E0B";
  const gridStroke = dark ? "#334155" : "#E2E8F0";
  const axisStroke = dark ? "#94A3B8" : "#64748B";
  const tooltipBg = dark ? "#0F172A" : "white";
  const tooltipBorder = dark ? "#334155" : "#E2E8F0";

  const isLoading =
    (tab === "taux" && selectedClasse && tauxReussite === undefined) ||
    (tab === "evolution" && selectedClasse && evolution === undefined) ||
    (tab === "comparaison" && comparaison === undefined);

  const tabButton = (active) => ({
    padding: "10px 20px",
    border: "none",
    borderRadius: 8,
    background: active ? accent : "transparent",
    color: active ? "#fff" : textSecondary,
    fontWeight: 600,
    cursor: "pointer",
    marginRight: 8,
    display: "inline-flex",
    alignItems: "center",
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
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 16px" }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .animate-spin { animation: spin 1s linear infinite; }`}</style>

      <h2 style={{ fontSize: 28, fontWeight: 700, color: textPrimary, marginBottom: 24 }}>
        Statistiques avancées
      </h2>

      {/* Onglets */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
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
        <div style={{ display: "flex", gap: 12, marginBottom: 24, alignItems: "center", flexWrap: "wrap" }}>
          <select
            value={selectedClasse}
            onChange={(e) => setSelectedClasse(e.target.value)}
            style={{
              padding: "8px 12px",
              border: `1px solid ${cardBorder}`,
              borderRadius: 8,
              fontSize: 14,
              background: inputBg,
              color: inputText,
              outline: "none",
            }}
          >
            <option value="">-- Choisir une classe --</option>
            {classes.map((c) => (
              <option key={c._id} value={c.nom} style={{ background: dark ? "#1E293B" : "#FFF" }}>{c.nom}</option>
            ))}
          </select>
          {tab === "taux" && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: textSecondary }}>Seuil (%) :</span>
              <input
                type="number"
                value={seuil}
                onChange={(e) => setSeuil(Number(e.target.value))}
                min={0}
                max={100}
                style={{
                  width: 70,
                  padding: "8px",
                  border: `1px solid ${cardBorder}`,
                  borderRadius: 8,
                  background: inputBg,
                  color: inputText,
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
          padding: 24,
          boxShadow: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)",
          border: `1px solid ${cardBorder}`,
        }}>
          <h3 style={{ marginBottom: 16, color: textPrimary }}>
            Taux de réussite par matière (≥ {seuil}%) – {selectedClasse}
          </h3>
          {tauxReussite.length === 0 ? (
            <p style={{ color: textSecondary }}>Aucune donnée.</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={tauxReussite}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis dataKey="matiere" stroke={axisStroke} />
                  <YAxis unit="%" domain={[0, 100]} stroke={axisStroke} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="tauxReussite" fill={accent} radius={[4, 4, 0, 0]} name="Taux de réussite" />
                </BarChart>
              </ResponsiveContainer>
              {/* Tableau récapitulatif */}
              <table style={{ width: "100%", marginTop: 20, borderCollapse: "collapse", color: textPrimary }}>
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
            </>
          )}
        </div>
      )}

      {!isLoading && tab === "evolution" && selectedClasse && (
        <div style={{
          background: cardBg,
          borderRadius: 16,
          padding: 24,
          boxShadow: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)",
          border: `1px solid ${cardBorder}`,
        }}>
          <h3 style={{ marginBottom: 16, color: textPrimary }}>
            Évolution de la moyenne générale – {selectedClasse}
          </h3>
          {evolution.length === 0 ? (
            <p style={{ color: textSecondary }}>Pas assez de données.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
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
          padding: 24,
          boxShadow: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)",
          border: `1px solid ${cardBorder}`,
        }}>
          <h3 style={{ marginBottom: 16, color: textPrimary }}>
            Comparaison des classes – {anneeId}
          </h3>
          {comparaison.length === 0 ? (
            <p style={{ color: textSecondary }}>Aucune donnée.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
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