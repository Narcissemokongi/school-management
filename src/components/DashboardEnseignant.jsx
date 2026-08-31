// src/components/DashboardEnseignant.jsx
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
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

  const elevesClasse = useQuery(
    api.eleves.listByClasse,
    ecoleId && anneeId && classe ? { ecoleId, anneeId, classe } : "skip"
  ) ?? [];

  const notesClasse = useQuery(
    api.notes.listByClasse,
    ecoleId && anneeId && classe ? { ecoleId, anneeId, classe } : "skip"
  ) ?? [];

  const absencesClasse = useQuery(
    api.absences.listByClasse,
    ecoleId && anneeId && classe ? { ecoleId, anneeId, classe } : "skip"
  ) ?? [];

  const axisColor = dark ? "#94a3b8" : "#64748b";
  const gridColor = dark ? "#334155" : "#e2e8f0";
  const tooltipStyle = {
    backgroundColor: dark ? "#1e293b" : "#ffffff",
    border: `1px solid ${dark ? "#334155" : "#e2e8f0"}`,
    borderRadius: 8,
    color: dark ? "#f1f5f9" : "#1e293b",
  };

  if (elevesClasse === undefined || notesClasse === undefined || absencesClasse === undefined) {
    return (
      <div style={{ textAlign: "center", padding: 40, color: dark ? "#94a3b8" : "#64748b" }}>
        Chargement...
      </div>
    );
  }

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

  const tranches = { "≥16": 0, "12-15": 0, "8-11": 0, "<8": 0 };
  notesClasse.forEach(n => {
    if (n.note >= 16) tranches["≥16"]++;
    else if (n.note >= 12) tranches["12-15"]++;
    else if (n.note >= 8) tranches["8-11"]++;
    else tranches["<8"]++;
  });
  const dataTranches = Object.entries(tranches).map(([name, value]) => ({ name, value }));

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

  const StatCard = ({ icon, label, value, color }) => (
    <div style={{
      background: dark ? "#1e293b" : "#ffffff",
      borderRadius: 12,
      padding: isMobile ? 10 : 20,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 4,
      boxShadow: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)",
      border: `1px solid ${dark ? "#334155" : "#e2e8f0"}`,
      textAlign: "center",
    }}>
      <div style={{ color, marginBottom: 4, display: "flex", justifyContent: "center" }}>{icon}</div>
      <div style={{ fontSize: isMobile ? 18 : 24, fontWeight: 800, color: dark ? "#f1f5f9" : "#1e293b" }}>
        {value}
      </div>
      <div style={{ fontSize: isMobile ? 11 : 13, color: dark ? "#94a3b8" : "#64748b" }}>{label}</div>
    </div>
  );

  const QuickLink = ({ icon, label, tab }) => (
    <button
      onClick={() => onNavigate && onNavigate(tab)}
      style={{
        flex: 1,
        minWidth: isMobile ? 90 : 120,
        background: dark ? "#1e293b" : "#ffffff",
        borderRadius: 10,
        padding: isMobile ? 10 : 16,
        textAlign: "center",
        cursor: "pointer",
        border: `1px solid ${dark ? "#334155" : "#e2e8f0"}`,
        boxShadow: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)",
      }}
    >
      <div style={{ color: dark ? "#818cf8" : "#4f46e5", marginBottom: 6, display: "flex", justifyContent: "center" }}>{icon}</div>
      <div style={{ fontWeight: 600, fontSize: isMobile ? 12 : 14, color: dark ? "#f1f5f9" : "#1e293b" }}>{label}</div>
    </button>
  );

  const statGridStyle = {
    display: "grid",
    gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(auto-fit, minmax(150px, 1fr))",
    gap: isMobile ? 10 : 16,
    marginBottom: isMobile ? 16 : 24,
  };
  const graphGridStyle = {
    display: "grid",
    gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(400px, 1fr))",
    gap: isMobile ? 12 : 20,
  };
  const graphHeight = isMobile ? 180 : 250;

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: isMobile ? "12px 10px" : "24px 16px" }}>
      <div style={{ marginBottom: isMobile ? 12 : 20 }}>
        <h2 style={{ ...S.h2, color: dark ? "#f1f5f9" : "#1e293b", fontSize: isMobile ? 19 : 24 }}>
          Tableau de bord — Classe {classe}
        </h2>
        <p style={{ ...S.muted, color: dark ? "#94a3b8" : "#64748b", fontSize: isMobile ? 12 : 14 }}>
          {totalEleves} élève(s) · {anneeActive ? anneeActive.nom : "Année active"}
        </p>
      </div>

      {/* Liens rapides */}
      <div style={{ display: "flex", gap: isMobile ? 8 : 16, marginBottom: isMobile ? 12 : 20, flexWrap: "wrap" }}>
        <QuickLink icon={<BookOpen size={isMobile ? 18 : 24} />} label="Notes" tab="cours" />
        <QuickLink icon={<AlertTriangle size={isMobile ? 18 : 24} />} label="Absences" tab="absences" />
        <QuickLink icon={<Calendar size={isMobile ? 18 : 24} />} label="Emploi du temps" tab="emploi" />
      </div>

      {/* Cartes de statistiques */}
      <div style={statGridStyle}>
        <StatCard icon={<Users size={isMobile ? 18 : 24} />} label="Élèves" value={totalEleves} color="#4f46e5" />
        <StatCard icon={<BookOpen size={isMobile ? 18 : 24} />} label="Notes saisies" value={totalNotes} color="#10b981" />
        <StatCard icon={<AlertTriangle size={isMobile ? 18 : 24} />} label="Absences" value={totalAbsences} color="#ef4444" />
        <StatCard icon={<TrendingUp size={isMobile ? 18 : 24} />} label="Moy. générale" value={moyenneGenerale} color="#f59e0b" />
      </div>

      {/* Graphiques */}
      <div style={graphGridStyle}>
        <div style={{ ...S.card, background: dark ? "#1e293b" : "#ffffff" }}>
          <h3 style={{ ...S.h3, color: dark ? "#f1f5f9" : "#1e293b", fontSize: isMobile ? 14 : 18, marginBottom: isMobile ? 8 : 12 }}>
            📚 Moyennes par matière
          </h3>
          <ResponsiveContainer width="100%" height={graphHeight}>
            <BarChart data={dataMatieres}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="matiere" tick={{ fill: axisColor, fontSize: 10 }} />
              <YAxis domain={[0, 20]} tick={{ fill: axisColor, fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="moyenne" fill={dark ? "#818cf8" : "#4f46e5"} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ ...S.card, background: dark ? "#1e293b" : "#ffffff" }}>
          <h3 style={{ ...S.h3, color: dark ? "#f1f5f9" : "#1e293b", fontSize: isMobile ? 14 : 18, marginBottom: isMobile ? 8 : 12 }}>
            📊 Répartition des notes
          </h3>
          <ResponsiveContainer width="100%" height={graphHeight}>
            <PieChart>
              <Pie data={dataTranches} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={isMobile ? 55 : 80} label>
                {dataTranches.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ color: axisColor, fontSize: isMobile ? 10 : 14 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div style={{ ...S.card, background: dark ? "#1e293b" : "#ffffff" }}>
          <h3 style={{ ...S.h3, color: dark ? "#f1f5f9" : "#1e293b", fontSize: isMobile ? 14 : 18, marginBottom: isMobile ? 8 : 12 }}>
            📈 Évolution absences & retards
          </h3>
          <ResponsiveContainer width="100%" height={graphHeight}>
            <LineChart data={dataEvolution}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="mois" tick={{ fill: axisColor, fontSize: 10 }} />
              <YAxis allowDecimals={false} tick={{ fill: axisColor, fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ color: axisColor, fontSize: isMobile ? 10 : 14 }} />
              <Line type="monotone" dataKey="absences" stroke="#ef4444" strokeWidth={2} />
              <Line type="monotone" dataKey="retards" stroke="#f59e0b" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}