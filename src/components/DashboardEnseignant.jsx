// src/components/DashboardEnseignant.jsx
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useStyles } from "../components/ThemeProvider";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from "recharts";
import { BookOpen, AlertTriangle, Users, TrendingUp } from "lucide-react";

const COLORS = ["#ef4444", "#f59e0b", "#10b981", "#6366f1"];

export function DashboardEnseignant({ ecoleId, classe, anneeId, user }) {
  const { S } = useStyles();

  // Récupérer tous les élèves de la classe
  const elevesClasse = useQuery(api.eleves.listByClasse, ecoleId && anneeId && classe ? { ecoleId, anneeId, classe } : "skip") ?? [];
  
  // Récupérer les notes de tous les élèves de la classe
  const notesClasse = useQuery(api.notes.listByClasse, ecoleId && anneeId && classe ? { ecoleId, anneeId, classe } : "skip") ?? [];
  
  // Récupérer les absences/retards de la classe
  const absencesClasse = useQuery(api.absences.listByClasse, ecoleId && anneeId && classe ? { ecoleId, anneeId, classe } : "skip") ?? [];

  // Si les données ne sont pas encore chargées
  if (elevesClasse === undefined || notesClasse === undefined || absencesClasse === undefined) {
    return <div style={{ textAlign: "center", padding: 40, color: S.textMuted }}>Chargement...</div>;
  }

  // ---- Statistiques générales ----
  const totalEleves = elevesClasse.length;
  const totalNotes = notesClasse.length;
  const totalAbsences = absencesClasse.filter(a => a.type === "absence").length;
  const totalRetards = absencesClasse.filter(a => a.type === "retard").length;

  // Moyenne générale de la classe (toutes périodes confondues)
  const moyenneGenerale = totalNotes > 0
    ? (notesClasse.reduce((sum, n) => sum + n.note * n.coefficient, 0) / notesClasse.reduce((sum, n) => sum + n.coefficient, 0)).toFixed(2)
    : "N/A";

  // ---- Données pour graphiques ----

  // 1. Répartition des notes par matière (moyenne par matière)
  const matieresMap = new Map();
  notesClasse.forEach(n => {
    if (!matieresMap.has(n.matiere)) {
      matieresMap.set(n.matiere, { total: 0, coeff: 0 });
    }
    const entry = matieresMap.get(n.matiere);
    entry.total += n.note * n.coefficient;
    entry.coeff += n.coefficient;
  });
  const dataMatieres = Array.from(matieresMap.entries()).map(([matiere, { total, coeff }]) => ({
    matiere,
    moyenne: +(total / coeff).toFixed(2)
  }));

  // 2. Répartition des notes par tranches (excellent, bien, moyen, insuffisant)
  const tranches = { "≥16": 0, "12-15": 0, "8-11": 0, "<8": 0 };
  notesClasse.forEach(n => {
    if (n.note >= 16) tranches["≥16"]++;
    else if (n.note >= 12) tranches["12-15"]++;
    else if (n.note >= 8) tranches["8-11"]++;
    else tranches["<8"]++;
  });
  const dataTranches = Object.entries(tranches).map(([name, value]) => ({ name, value }));

  // 3. Évolution des absences par mois
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
  function QuickLink({ icon, label, onClick }) {
    return (
      <div onClick={onClick} style={{ flex: 1, background: "#fff", borderRadius: 12, padding: 20, textAlign: "center", cursor: "pointer", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
        <div style={{ color: "#4f46e5", marginBottom: 8 }}>{icon}</div>
        <div style={{ fontWeight: 600, fontSize: 16 }}>{label}</div>
      </div>
    );
}

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={S.h2}>Tableau de bord — Classe {classe}</h2>
        <p style={S.muted}>{totalEleves} élève(s) · Année active</p>
      </div>

      {/* Cartes de statistiques */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16, marginBottom: 24 }}>
        <StatCard icon={<Users size={24} />} label="Élèves" value={totalEleves} color="#4f46e5" />
        <StatCard icon={<BookOpen size={24} />} label="Notes saisies" value={totalNotes} color="#10b981" />
        <StatCard icon={<AlertTriangle size={24} />} label="Absences" value={totalAbsences} color="#ef4444" />
        <StatCard icon={<TrendingUp size={24} />} label="Moy. générale" value={moyenneGenerale} color="#f59e0b" />
      </div>

      {/* Graphiques */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: 20 }}>
        {/* Moyennes par matière */}
        <div style={S.card}>
          <h3 style={S.h3}>📚 Moyennes par matière</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={dataMatieres}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="matiere" />
              <YAxis domain={[0, 20]} />
              <Tooltip />
              <Bar dataKey="moyenne" fill="#4f46e5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Répartition des notes */}
        <div style={S.card}>
          <h3 style={S.h3}>📊 Répartition des notes</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={dataTranches} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {dataTranches.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Évolution absences/retards */}
        <div style={S.card}>
          <h3 style={S.h3}>📈 Évolution absences & retards</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={dataEvolution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mois" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="absences" stroke="#ef4444" strokeWidth={2} />
              <Line type="monotone" dataKey="retards" stroke="#f59e0b" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div role="img" aria-label="Punitions par mois : janvier 12, février 8, mars 15">
          <BarChart data={dataMois}>
            ...
          </BarChart>
        </div>
        // Dans DashboardEnseignant, après le titre :
        <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
          <QuickLink icon={<BookOpen size={24} />} label="Notes" onClick={() => setTab("cours")} />
          <QuickLink icon={<AlertTriangle size={24} />} label="Absences" onClick={() => setTab("absences")} />
          <QuickLink icon={<Calendar size={24} />} label="Emploi du temps" onClick={() => setTab("emploi")} />
        </div>


      </div>
    </div>
  );
}

// Petite carte statistique
function StatCard({ icon, label, value, color }) {
  return (
    <div style={{ background: dark ? "#1e293b" : "#fff", borderRadius: 12, padding: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", textAlign: "center" }}>
      <div style={{ color, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 12, color: "#94a3b8" }}>{label}</div>
    </div>
  );
}