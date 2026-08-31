// src/components/DashboardEnseignant.jsx
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useStyles } from "../styles/theme";
import { useIsMobile } from "../hooks/useIsMobile";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from "recharts";
import {
  BookOpen, AlertTriangle, Users, TrendingUp, Calendar
} from "lucide-react";

const COLORS = ["#ef4444", "#f59e0b", "#10b981", "#6366f1"];

export function DashboardEnseignant({ ecoleId, classe, anneeId, anneeActive, onNavigate }) {
  const { S, dark } = useStyles();
  const isMobile = useIsMobile();

  // Récupérer les élèves de la classe
  const elevesClasse = useQuery(
    api.eleves.listByClasse,
    ecoleId && anneeId && classe ? { ecoleId, anneeId, classe } : "skip"
  ) ?? [];

  // Récupérer les notes de la classe
  const notesClasse = useQuery(
    api.notes.listByClasse,
    ecoleId && anneeId && classe ? { ecoleId, anneeId, classe } : "skip"
  ) ?? [];

  // Récupérer les absences/retards
  const absencesClasse = useQuery(
    api.absences.listByClasse,
    ecoleId && anneeId && classe ? { ecoleId, anneeId, classe } : "skip"
  ) ?? [];

  // Couleurs pour les graphiques
  const axisColor = dark ? "#94a3b8" : "#64748b";
  const gridColor = dark ? "#334155" : "#e2e8f0";
  const tooltipStyle = {
    backgroundColor: dark ? "#1e293b" : "#ffffff",
    border: `1px solid ${dark ? "#334155" : "#e2e8f0"}`,
    borderRadius: 8,
    color: dark ? "#f1f5f9" : "#1e293b",
  };

  // Si chargement
  if (elevesClasse === undefined || notesClasse === undefined || absencesClasse === undefined) {
    return (
      <div style={{ textAlign: "center", padding: 40, color: dark ? "#94a3b8" : "#64748b" }}>
        Chargement...
      </div>
    );
  }

  // Statistiques générales
  const totalEleves = elevesClasse.length;
  const totalNotes = notesClasse.length;
  const totalAbsences = absencesClasse.filter(a => a.type === "absence").length;
  const totalRetards = absencesClasse.filter(a => a.type === "retard").length;

  const moyenneGenerale = totalNotes > 0
    ? (
        notesClasse.reduce((sum, n) => sum + n.note * n.coefficient, 0) /
        notesClasse.reduce((sum, n) => sum + n.coefficient, 0)
      ).toFixed(2)
    : "N/A";

  // Moyennes par matière
  const matieresMap = new Map();
  notesClasse.forEach(n => {
    if (!matieresMap.has(n.matiere)) matieresMap.set(n.matiere, { total: 0, coeff: 0 });
    const entry = matieresMap.get(n.matiere);
    entry.total += n.note * n.coefficient;
    entry.coeff += n.coefficient;
  });
  const dataMatieres = Array.from(matieresMap.entries()).map(([matiere, { total, coeff }]) => ({
    matiere,
    moyenne: +(total / coeff).toFixed(2)
  }));

  // Répartition des notes
  const tranches = { "≥16": 0, "12-15": 0, "8-11": 0, "<8": 0 };
  notesClasse.forEach(n => {
    if (n.note >= 16) tranches["≥16"]++;
    else if (n.note >= 12) tranches["12-15"]++;
    else if (n.note >= 8) tranches["8-11"]++;
    else tranches["<8"]++;
  });
  const dataTranches = Object.entries(tranches).map(([name, value]) => ({ name, value }));

  // Évolution absences par mois
  const absencesParMois = absencesClasse.reduce((acc, a) => {
    const mois = a.date.substring(0, 7);
    if (!acc[mois]) acc[mois] = { absences: 0, retards: 0 };
    if (a.type === "absence") acc[mois].absences++;
    else acc[mois].retards++;
    return acc;
  }, {});
  const dataEvolution = Object.entries(absencesParMois)
    .map(([mois, counts]) => ({ mois, ...counts }))
    .sort((a, b) => a.mois.localeCompare(b.mois));

  // Composant carte de statistique adaptatif
  const StatCard = ({ icon, label, value, color }) => (
    <div style={{
      background: dark ? "#1e293b" : "#ffffff",
      borderRadius: 16,
      padding: isMobile ? 14 : 20,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 8,
      boxShadow: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)",
      border: `1px solid ${dark ? "#334155" : "#e2e8f0"}`,
      textAlign: "center",
      transition: "background-color 0.3s",
    }}>
      <div style={{ color, marginBottom: 4, display: "flex", justifyContent: "center" }}>{icon}</div>
      <div style={{ fontSize: isMobile ? 20 : 24, fontWeight: 800, color: dark ? "#f1f5f9" : "#1e293b" }}>
        {value}
      </div>
      <div style={{ fontSize: isMobile ? 12 : 13, color: dark ? "#94a3b8" : "#64748b" }}>{label}</div>
    </div>
  );

  // Lien rapide adaptatif
  const QuickLink = ({ icon, label, tab }) => (
    <button
      onClick={() => onNavigate && onNavigate(tab)}
      style={{
        flex: 1,
        minWidth: isMobile ? 100 : 120,
        background: dark ? "#1e293b" : "#ffffff",
        borderRadius: 12,
        padding: isMobile ? "12px 8px" : "16px 12px",
        textAlign: "center",
        cursor: "pointer",
        border: `1px solid ${dark ? "#334155" : "#e2e8f0"}`,
        boxShadow: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)",
        transition: "background-color 0.3s, transform 0.1s",
      }}
    >
      <div style={{ color: dark ? "#818cf8" : "#4f46e5", marginBottom: 8, display: "flex", justifyContent: "center" }}>{icon}</div>
      <div style={{ fontWeight: 600, fontSize: isMobile ? 12 : 14, color: dark ? "#f1f5f9" : "#1e293b" }}>{label}</div>
    </button>
  );

  // Styles de grille adaptatifs
  const statGridStyle = {
    display: "grid",
    gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(150px, 1fr))",
    gap: isMobile ? 12 : 16,
    marginBottom: isMobile ? 20 : 24,
  };
  const graphGridStyle = {
    display: "grid",
    gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(400px, 1fr))",
    gap: isMobile ? 16 : 20,
  };
  const graphHeight = isMobile ? 200 : 250;

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: isMobile ? "16px 12px" : "24px 16px" }}>
      <div style={{ marginBottom: isMobile ? 16 : 20 }}>
        <h2 style={{ ...S.h2, color: dark ? "#f1f5f9" : "#1e293b", fontSize: isMobile ? 20 : 24 }}>
          Tableau de bord — Classe {classe}
        </h2>
        <p style={{ ...S.muted, color: dark ? "#94a3b8" : "#64748b", fontSize: isMobile ? 13 : 14 }}>
          {totalEleves} élève(s) · {anneeActive ? anneeActive.nom : "Année active"}
        </p>
      </div>

      {/* Liens rapides */}
      <div style={{ display: "flex", gap: isMobile ? 8 : 16, marginBottom: isMobile ? 16 : 20, flexWrap: "wrap" }}>
        <QuickLink icon={<BookOpen size={isMobile ? 20 : 24} />} label="Notes" tab="cours" />
        <QuickLink icon={<AlertTriangle size={isMobile ? 20 : 24} />} label="Absences" tab="absences" />
        <QuickLink icon={<Calendar size={isMobile ? 20 : 24} />} label="Emploi du temps" tab="emploi" />
      </div>

      {/* Cartes de statistiques */}
      <div style={statGridStyle}>
        <StatCard icon={<Users size={isMobile ? 20 : 24} />} label="Élèves" value={totalEleves} color="#4f46e5" />
        <StatCard icon={<BookOpen size={isMobile ? 20 : 24} />} label="Notes saisies" value={totalNotes} color="#10b981" />
        <StatCard icon={<AlertTriangle size={isMobile ? 20 : 24} />} label="Absences" value={totalAbsences} color="#ef4444" />
        <StatCard icon={<TrendingUp size={isMobile ? 20 : 24} />} label="Moy. générale" value={moyenneGenerale} color="#f59e0b" />
      </div>

      {/* Graphiques */}
      <div style={graphGridStyle}>
        {/* Moyennes par matière */}
        <div style={{ ...S.card, background: dark ? "#1e293b" : "#ffffff" }}>
          <h3 style={{ ...S.h3, color: dark ? "#f1f5f9" : "#1e293b", fontSize: isMobile ? 16 : 18 }}>
            📚 Moyennes par matière
          </h3>
          <ResponsiveContainer width="100%" height={graphHeight}>
            <BarChart data={dataMatieres}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="matiere" tick={{ fill: axisColor, fontSize: 12 }} />
              <YAxis domain={[0, 20]} tick={{ fill: axisColor, fontSize: 12 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="moyenne" fill={dark ? "#818cf8" : "#4f46e5"} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Répartition des notes */}
        <div style={{ ...S.card, background: dark ? "#1e293b" : "#ffffff" }}>
          <h3 style={{ ...S.h3, color: dark ? "#f1f5f9" : "#1e293b", fontSize: isMobile ? 16 : 18 }}>
            📊 Répartition des notes
          </h3>
          <ResponsiveContainer width="100%" height={graphHeight}>
            <PieChart>
              <Pie data={dataTranches} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={isMobile ? 60 : 80} label>
                {dataTranches.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ color: axisColor, fontSize: isMobile ? 12 : 14 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Évolution absences/retards */}
        <div style={{ ...S.card, background: dark ? "#1e293b" : "#ffffff" }}>
          <h3 style={{ ...S.h3, color: dark ? "#f1f5f9" : "#1e293b", fontSize: isMobile ? 16 : 18 }}>
            📈 Évolution absences & retards
          </h3>
          <ResponsiveContainer width="100%" height={graphHeight}>
            <LineChart data={dataEvolution}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="mois" tick={{ fill: axisColor, fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fill: axisColor, fontSize: 12 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ color: axisColor, fontSize: isMobile ? 12 : 14 }} />
              <Line type="monotone" dataKey="absences" stroke="#ef4444" strokeWidth={2} />
              <Line type="monotone" dataKey="retards" stroke="#f59e0b" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}