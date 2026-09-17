// src/components/DashboardEnseignant.jsx
import { useMemo, lazy, Suspense } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  BookOpen, AlertTriangle, Users, TrendingUp, Calendar,
  BarChart3, PieChart as PieIcon, LineChart as LineIcon,
} from "lucide-react";

// ✅ FIX #3 — Recharts en lazy (hors bundle initial)
const BarChart = lazy(() => import("recharts").then(m => ({ default: m.BarChart })));
const Bar = lazy(() => import("recharts").then(m => ({ default: m.Bar })));
const XAxis = lazy(() => import("recharts").then(m => ({ default: m.XAxis })));
const YAxis = lazy(() => import("recharts").then(m => ({ default: m.YAxis })));
const CartesianGrid = lazy(() => import("recharts").then(m => ({ default: m.CartesianGrid })));
const Tooltip = lazy(() => import("recharts").then(m => ({ default: m.Tooltip })));
const ResponsiveContainer = lazy(() => import("recharts").then(m => ({ default: m.ResponsiveContainer })));
const PieChart = lazy(() => import("recharts").then(m => ({ default: m.PieChart })));
const Pie = lazy(() => import("recharts").then(m => ({ default: m.Pie })));
const Cell = lazy(() => import("recharts").then(m => ({ default: m.Cell })));
const Legend = lazy(() => import("recharts").then(m => ({ default: m.Legend })));
const LineChart = lazy(() => import("recharts").then(m => ({ default: m.LineChart })));
const Line = lazy(() => import("recharts").then(m => ({ default: m.Line })));

const COLORS = ["#ef4444", "#f59e0b", "#10b981", "#6366f1"];

// ✅ FIX #6 — normalise une date (string ISO ou timestamp) → "YYYY-MM"
function toYearMonth(date) {
  if (date == null) return null;
  if (typeof date === "number") {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
  if (typeof date === "string") {
    if (date.length >= 7 && date[4] === "-") return date.substring(0, 7);
    const d = new Date(date);
    if (!isNaN(d.getTime())) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    }
  }
  return null;
}

// ✅ FIX #8 — composants extraits hors du composant parent
function StatCard({ icon, label, value, color, isMobile, dark }) {
  return (
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
}

function QuickLink({ icon, label, tab, onNavigate, isMobile, dark }) {
  return (
    <button
      type="button"
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
}

export function DashboardEnseignant({ userId, ecoleId, classe, anneeId, anneeActive, onNavigate }) {
  const { S, dark } = useStyles();
  const isMobile = useIsMobile();

  // ✅ FIX #2 — userId passé aux queries
  const canQuery = !!(userId && ecoleId && anneeId && classe);
  const queryArgs = canQuery ? { userId, ecoleId, anneeId, classe } : "skip";

  const elevesClasse = useQuery(api.eleves.listByClasse, queryArgs);
  const notesClasse = useQuery(api.notes.listByClasse, queryArgs);
  const absencesClasse = useQuery(api.absences.listByClasse, queryArgs);

  const axisColor = dark ? "#94a3b8" : "#64748b";
  const gridColor = dark ? "#334155" : "#e2e8f0";
  const tooltipStyle = useMemo(() => ({
    backgroundColor: dark ? "#1e293b" : "#ffffff",
    border: `1px solid ${dark ? "#334155" : "#e2e8f0"}`,
    borderRadius: 8,
    color: dark ? "#f1f5f9" : "#1e293b",
  }), [dark]);

  // ✅ FIX #7 — tout le calcul dérivé en useMemo
  const stats = useMemo(() => {
    if (!elevesClasse || !notesClasse || !absencesClasse) return null;

    const totalEleves = elevesClasse.length;
    const totalNotes = notesClasse.length;
    const totalAbsences = absencesClasse.filter(a => a.type === "absence").length;
    const totalRetards = absencesClasse.filter(a => a.type === "retard").length;

    // ✅ FIX #4 — guard division par zéro
    const coeffTotal = notesClasse.reduce((sum, n) => sum + (n.coefficient || 0), 0);
    const moyenneGenerale = coeffTotal > 0
      ? (notesClasse.reduce((sum, n) => sum + n.note * (n.coefficient || 0), 0) / coeffTotal).toFixed(2)
      : "N/A";

    // Moyennes par matière — O(n) avec Map
    const matieresMap = new Map();
    notesClasse.forEach(n => {
      if (!matieresMap.has(n.matiere)) matieresMap.set(n.matiere, { total: 0, coeff: 0 });
      const entry = matieresMap.get(n.matiere);
      const coef = n.coefficient || 0;
      entry.total += n.note * coef;
      entry.coeff += coef;
    });
    // ✅ FIX #5 — guard coeff=0 par matière
    const dataMatieres = Array.from(matieresMap.entries())
      .filter(([, { coeff }]) => coeff > 0)
      .map(([matiere, { total, coeff }]) => ({
        matiere,
        moyenne: +(total / coeff).toFixed(2),
      }));

    // Répartition par tranche
    const tranches = { "≥16": 0, "12-15": 0, "8-11": 0, "<8": 0 };
    notesClasse.forEach(n => {
      if (n.note >= 16) tranches["≥16"]++;
      else if (n.note >= 12) tranches["12-15"]++;
      else if (n.note >= 8) tranches["8-11"]++;
      else tranches["<8"]++;
    });
    const dataTranches = Object.entries(tranches).map(([name, value]) => ({ name, value }));

    // ✅ FIX #6 — normalisation date robuste
    const absencesParMois = absencesClasse.reduce((acc, a) => {
      const mois = toYearMonth(a.date);
      if (!mois) return acc;
      if (!acc[mois]) acc[mois] = { absences: 0, retards: 0 };
      if (a.type === "absence") acc[mois].absences++;
      else acc[mois].retards++;
      return acc;
    }, {});
    const dataEvolution = Object.entries(absencesParMois)
      .map(([mois, counts]) => ({ mois, ...counts }))
      .sort((a, b) => a.mois.localeCompare(b.mois));

    return {
      totalEleves, totalNotes, totalAbsences, totalRetards,
      moyenneGenerale, dataMatieres, dataTranches, dataEvolution,
    };
  }, [elevesClasse, notesClasse, absencesClasse]);

  // ✅ FIX #9 — Loader pendant le chargement (hooks ont déjà tous été appelés)
  if (
    elevesClasse === undefined ||
    notesClasse === undefined ||
    absencesClasse === undefined
  ) {
    return (
      <div style={{ textAlign: "center", padding: 40, color: dark ? "#94a3b8" : "#64748b" }}>
        Chargement...
      </div>
    );
  }

  if (!stats) return null;

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
  const iconSz = isMobile ? 18 : 24;

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: isMobile ? "12px 10px" : "24px 16px" }}>
      <div style={{ marginBottom: isMobile ? 12 : 20 }}>
        <h2 style={{ ...S.h2, color: dark ? "#f1f5f9" : "#1e293b", fontSize: isMobile ? 19 : 24 }}>
          Tableau de bord — Classe {classe}
        </h2>
        <p style={{ ...S.muted, color: dark ? "#94a3b8" : "#64748b", fontSize: isMobile ? 12 : 14 }}>
          {stats.totalEleves} élève(s) · {anneeActive ? anneeActive.nom : "Année active"}
        </p>
      </div>

      {/* Liens rapides */}
      <div style={{ display: "flex", gap: isMobile ? 8 : 16, marginBottom: isMobile ? 12 : 20, flexWrap: "wrap" }}>
        <QuickLink icon={<BookOpen size={iconSz} />} label="Notes" tab="cours" onNavigate={onNavigate} isMobile={isMobile} dark={dark} />
        <QuickLink icon={<AlertTriangle size={iconSz} />} label="Absences" tab="absences" onNavigate={onNavigate} isMobile={isMobile} dark={dark} />
        <QuickLink icon={<Calendar size={iconSz} />} label="Emploi du temps" tab="emploi" onNavigate={onNavigate} isMobile={isMobile} dark={dark} />
      </div>

      {/* Cartes de statistiques */}
      <div style={statGridStyle}>
        <StatCard icon={<Users size={iconSz} />} label="Élèves" value={stats.totalEleves} color="#4f46e5" isMobile={isMobile} dark={dark} />
        <StatCard icon={<BookOpen size={iconSz} />} label="Notes saisies" value={stats.totalNotes} color="#10b981" isMobile={isMobile} dark={dark} />
        <StatCard icon={<AlertTriangle size={iconSz} />} label="Absences" value={stats.totalAbsences} color="#ef4444" isMobile={isMobile} dark={dark} />
        <StatCard icon={<TrendingUp size={iconSz} />} label="Moy. générale" value={stats.moyenneGenerale} color="#f59e0b" isMobile={isMobile} dark={dark} />
      </div>

      {/* Graphiques — Suspense pour le lazy Recharts */}
      <Suspense fallback={
        <div style={{ textAlign: "center", padding: 40, color: dark ? "#94a3b8" : "#64748b" }}>
          Chargement des graphiques...
        </div>
      }>
        <div style={graphGridStyle}>
          <div style={{ ...S.card, background: dark ? "#1e293b" : "#ffffff" }}>
            {/* ✅ FIX #1 — emoji remplacé par icône lucide */}
            <h3 style={{
              ...S.h3, color: dark ? "#f1f5f9" : "#1e293b",
              fontSize: isMobile ? 14 : 18, marginBottom: isMobile ? 8 : 12,
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <BarChart3 size={isMobile ? 16 : 20} /> Moyennes par matière
            </h3>
            <ResponsiveContainer width="100%" height={graphHeight}>
              <BarChart data={stats.dataMatieres}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="matiere" tick={{ fill: axisColor, fontSize: 10 }} />
                <YAxis domain={[0, 20]} tick={{ fill: axisColor, fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="moyenne" fill={dark ? "#818cf8" : "#4f46e5"} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ ...S.card, background: dark ? "#1e293b" : "#ffffff" }}>
            <h3 style={{
              ...S.h3, color: dark ? "#f1f5f9" : "#1e293b",
              fontSize: isMobile ? 14 : 18, marginBottom: isMobile ? 8 : 12,
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <PieIcon size={isMobile ? 16 : 20} /> Répartition des notes
            </h3>
            <ResponsiveContainer width="100%" height={graphHeight}>
              <PieChart>
                <Pie data={stats.dataTranches} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={isMobile ? 55 : 80} label>
                  {stats.dataTranches.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ color: axisColor, fontSize: isMobile ? 10 : 14 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div style={{ ...S.card, background: dark ? "#1e293b" : "#ffffff" }}>
            <h3 style={{
              ...S.h3, color: dark ? "#f1f5f9" : "#1e293b",
              fontSize: isMobile ? 14 : 18, marginBottom: isMobile ? 8 : 12,
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <LineIcon size={isMobile ? 16 : 20} /> Évolution absences & retards
            </h3>
            <ResponsiveContainer width="100%" height={graphHeight}>
              <LineChart data={stats.dataEvolution}>
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
      </Suspense>
    </div>
  );
}