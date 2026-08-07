import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useStyles } from "../styles/theme";
import {
  School, Copy, Users, Plus, Search, X, Trash2,
  UserCheck, UserX, GraduationCap, BookOpen, AlertTriangle,
  TrendingUp, Clock, CheckCircle, BarChart3, ListFilter
} from "lucide-react";
import toast from "react-hot-toast";

export function SuperAdminDashboard({ onSelectEcole, user }) {
  const { S } = useStyles();
  const [tab, setTab] = useState("overview"); // overview, schools, pending
  const [nouveauNom, setNouveauNom] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const ecolesAvecUsers = useQuery(api.ecoles.listWithUserCount) ?? [];
  const globalStats = useQuery(api.stats.globalStats) ?? {};
  const pendingUsers = useQuery(api.users.listAllPendingUsers) ?? [];
  const recentUsers = useQuery(api.users.listRecent) ?? [];
  const recentEcoles = useQuery(api.ecoles.listRecent) ?? [];

  const addEcole = useMutation(api.ecoles.add);
  const removeEcole = useMutation(api.ecoles.remove);
  const approveUser = useMutation(api.users.approveUser);
  const rejectUser = useMutation(api.users.rejectUser);

  // Top 5 écoles par nombre d'utilisateurs (pour le graphique)
  const topEcoles = [...ecolesAvecUsers]
    .sort((a, b) => b.userCount - a.userCount)
    .slice(0, 5);
  const maxUsersInTop = Math.max(...topEcoles.map(e => e.userCount), 1);

  const filteredEcoles = ecolesAvecUsers.filter(e =>
    e.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.code && e.code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!nouveauNom.trim()) return;
    try {
      await addEcole({ nom: nouveauNom, userId: user._id });
      setNouveauNom("");
      setShowCreate(false);
      toast.success("École créée avec succès");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteEcole = async (ecoleId, nom) => {
    if (window.confirm(`Supprimer définitivement "${nom}" et toutes ses données ?`)) {
      try {
        await removeEcole({ id: ecoleId, userId: user._id });
        toast.success("École supprimée");
      } catch (err) {
        toast.error(err.message);
      }
    }
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code).then(() => toast.success("Code copié !"));
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 16px" }}>
      {/* En-tête */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#1e293b", margin: 0 }}>Administration Générale</h1>
          <p style={{ color: "#64748b", marginTop: 4 }}>Gestion des établissements et des utilisateurs</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          style={{ ...S.btn("#4f46e5"), display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", fontSize: 15 }}
        >
          <Plus size={20} /> Nouvelle école
        </button>
      </div>

      {/* Onglets */}
      <div style={{ display: "flex", gap: 0, borderBottom: "2px solid #e2e8f0", marginBottom: 24 }}>
        {[
          { id: "overview", label: "Vue d'ensemble", icon: <BarChart3 size={18} /> },
          { id: "schools", label: "Écoles", icon: <School size={18} /> },
          { id: "pending", label: `Demandes (${pendingUsers.length})`, icon: <Clock size={18} /> },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "12px 20px",
              border: "none",
              background: "transparent",
              color: tab === t.id ? "#4f46e5" : "#64748b",
              fontWeight: tab === t.id ? 600 : 400,
              borderBottom: tab === t.id ? "3px solid #4f46e5" : "3px solid transparent",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Formulaire de création (modale simple) */}
      {showCreate && (
        <div style={{ background: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", marginBottom: 24 }}>
          <form onSubmit={handleAdd} style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <input
              placeholder="Nom de l'école"
              value={nouveauNom}
              onChange={(e) => setNouveauNom(e.target.value)}
              style={{ ...S.input, flex: 1, marginBottom: 0 }}
              autoFocus
            />
            <button type="submit" style={S.btn("#4f46e5")}>Créer</button>
          </form>
        </div>
      )}

      {/* Contenu des onglets */}
      {tab === "overview" && (
        <div>
          {/* Cartes statistiques */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 32 }}>
            <StatCard icon={<School />} value={globalStats.totalEcoles ?? 0} label="Écoles" color="#4f46e5" />
            <StatCard icon={<Users />} value={globalStats.totalUsers ?? 0} label="Utilisateurs" color="#10b981" />
            <StatCard icon={<GraduationCap />} value={globalStats.totalEleves ?? 0} label="Élèves" color="#f59e0b" />
            <StatCard icon={<BookOpen />} value={globalStats.totalClasses ?? 0} label="Classes" color="#3b82f6" />
            <StatCard icon={<AlertTriangle />} value={globalStats.totalPunitions ?? 0} label="Punitions" color="#ef4444" />
          </div>

          {/* Graphique à barres simple */}
          <div style={{ ...S.card, marginBottom: 32 }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <TrendingUp size={20} /> Top 5 écoles par utilisateurs
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {topEcoles.map(ecole => (
                <div key={ecole._id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 120, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ecole.nom}</div>
                  <div style={{ flex: 1, background: "#f1f5f9", borderRadius: 8, height: 24, overflow: "hidden" }}>
                    <div style={{
                      width: `${(ecole.userCount / maxUsersInTop) * 100}%`,
                      height: "100%",
                      background: "linear-gradient(90deg, #4f46e5, #7c3aed)",
                      borderRadius: 8,
                      minWidth: 4
                    }} />
                  </div>
                  <div style={{ width: 40, textAlign: "right", fontWeight: 600 }}>{ecole.userCount}</div>
                </div>
              ))}
              {topEcoles.length === 0 && <p style={{ color: "#64748b" }}>Aucune donnée</p>}
            </div>
          </div>

          {/* Activité récente */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
            <div style={S.card}>
              <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                <Clock size={20} /> Dernières écoles créées
              </h3>
              {recentEcoles.map(ecole => (
                <div key={ecole._id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
                  <span>{ecole.nom}</span>
                  <span style={{ color: "#64748b", fontSize: 13 }}>{ecole.code}</span>
                </div>
              ))}
              {recentEcoles.length === 0 && <p style={{ color: "#64748b" }}>Aucune école récente</p>}
            </div>
            <div style={S.card}>
              <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                <Users size={20} /> Derniers utilisateurs inscrits
              </h3>
              {recentUsers.map(u => (
                <div key={u._id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
                  <span>{u.nom} ({u.role})</span>
                  <span style={{ color: "#64748b", fontSize: 13 }}>
                    {u.status === "pending" ? <Clock size={14} /> : <CheckCircle size={14} color="#10b981" />}
                  </span>
                </div>
              ))}
              {recentUsers.length === 0 && <p style={{ color: "#64748b" }}>Aucun utilisateur récent</p>}
            </div>
          </div>
        </div>
      )}

      {tab === "schools" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", background: "#fff", borderRadius: 10, padding: "8px 12px", border: "1px solid #e2e8f0", flex: 1 }}>
              <Search size={18} color="#94a3b8" />
              <input
                placeholder="Rechercher par nom ou code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ border: "none", outline: "none", marginLeft: 8, fontSize: 14, width: "100%" }}
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm("")} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={16} /></button>
              )}
            </div>
            <ListFilter size={20} color="#64748b" />
          </div>
          <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.05)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  <th style={{ textAlign: "left", padding: 14, fontSize: 13, fontWeight: 600, color: "#64748b" }}>Nom de l'école</th>
                  <th style={{ textAlign: "left", padding: 14, fontSize: 13, fontWeight: 600, color: "#64748b" }}>Code</th>
                  <th style={{ textAlign: "center", padding: 14, fontSize: 13, fontWeight: 600, color: "#64748b" }}>Utilisateurs</th>
                  <th style={{ textAlign: "center", padding: 14, fontSize: 13, fontWeight: 600, color: "#64748b" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEcoles.map(ecole => (
                  <tr key={ecole._id} style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    onClick={() => onSelectEcole(ecole._id)}
                    title="Cliquez pour gérer cette école"
                  >
                    <td style={{ padding: 14, fontWeight: 500, cursor: "pointer" }}>{ecole.nom}</td>
                    <td style={{ padding: 14 }}>
                      <span style={{ background: "#f1f5f9", padding: "2px 10px", borderRadius: 20, fontFamily: "monospace", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}>
                        {ecole.code || "N/A"}
                        {ecole.code && (
                          <button onClick={(e) => { e.stopPropagation(); copyCode(ecole.code); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }} title="Copier le code">
                            <Copy size={14} color="#64748b" />
                          </button>
                        )}
                      </span>
                    </td>
                    <td style={{ padding: 14, textAlign: "center" }}>{ecole.userCount}</td>
                    <td style={{ padding: 14, textAlign: "center" }} onClick={e => e.stopPropagation()}>
                      <button onClick={() => handleDeleteEcole(ecole._id, ecole.nom)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444" }} title="Supprimer">
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredEcoles.length === 0 && (
                  <tr><td colSpan={4} style={{ textAlign: "center", padding: 30, color: "#94a3b8" }}>Aucune école trouvée</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "pending" && (
        <div>
          {pendingUsers.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>
              <CheckCircle size={48} color="#10b981" />
              <p style={{ marginTop: 12 }}>Toutes les demandes ont été traitées.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {pendingUsers.map(u => (
                <div key={u._id} style={{ background: "#fff", borderRadius: 12, padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{u.nom}</div>
                    <div style={{ fontSize: 13, color: "#64748b" }}>@{u.login} · {u.role}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => approveUser({ userId: u._id })}
                      style={{ ...S.btnSm("#10b981"), display: "flex", alignItems: "center", gap: 4 }}
                    >
                      <UserCheck size={16} /> Approuver
                    </button>
                    <button
                      onClick={() => {
                        const reason = prompt("Motif du rejet (optionnel) :");
                        rejectUser({ userId: u._id, reason: reason || undefined });
                      }}
                      style={{ ...S.btnSm("#ef4444"), display: "flex", alignItems: "center", gap: 4 }}
                    >
                      <UserX size={16} /> Rejeter
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Composant StatCard interne
function StatCard({ icon, value, label, color }) {
  return (
    <div style={{
      background: "#fff",
      borderRadius: 16,
      padding: 20,
      display: "flex",
      alignItems: "center",
      gap: 16,
      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
      transition: "transform 0.2s, box-shadow 0.2s",
      cursor: "default"
    }}
      onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
      onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
    >
      <div style={{ width: 48, height: 48, background: `${color}15`, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", color: color }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 24, fontWeight: 700, color: "#1e293b" }}>{value ?? "—"}</div>
        <div style={{ fontSize: 14, color: "#64748b" }}>{label}</div>
      </div>
    </div>
  );
}