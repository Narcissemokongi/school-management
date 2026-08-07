import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useStyles } from "../../styles/theme";
import { Plus, BarChart3, School, Clock } from "lucide-react";
import { OverviewTab } from "./OverviewTab";
import { SchoolsTab } from "./SchoolsTab";
import { PendingTab } from "./PendingTab";
import toast from "react-hot-toast";

export function SuperAdminDashboard({ onSelectEcole, user }) {
  const { S } = useStyles();
  const [tab, setTab] = useState("overview");
  const [showCreate, setShowCreate] = useState(false);
  const [nouveauNom, setNouveauNom] = useState("");

  // Queries globales (utilisées dans les onglets, mais on peut les remonter ici pour éviter de multiples appels)
  const ecolesAvecUsers = useQuery(api.ecoles.listWithUserCount) ?? [];
  const globalStats = useQuery(api.stats.globalStats) ?? {};
  const pendingUsers = useQuery(api.users.listAllPendingUsers) ?? [];
  const addEcole = useMutation(api.ecoles.add);

  const handleAddEcole = async (e) => {
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

  const tabs = [
    { id: "overview", label: "Vue d'ensemble", icon: <BarChart3 size={18} /> },
    { id: "schools", label: "Écoles", icon: <School size={18} /> },
    { id: "pending", label: `Demandes (${pendingUsers.length})`, icon: <Clock size={18} /> },
  ];

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px" }}>
      {/* En-tête */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#1E293B", margin: 0 }}>Administration Générale</h1>
          <p style={{ color: "#64748B", marginTop: 4, fontSize: 14 }}>Gérez les établissements, utilisateurs et paramètres globaux</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 20px", background: "#4F46E5", color: "white",
            border: "none", borderRadius: 10, fontWeight: 600, fontSize: 14,
            cursor: "pointer", boxShadow: "0 4px 12px rgba(79,70,229,0.2)",
            transition: "background 0.2s"
          }}
        >
          <Plus size={20} /> Nouvelle école
        </button>
      </div>

      {/* Onglets */}
      <div style={{ display: "flex", gap: 0, borderBottom: "2px solid #E2E8F0", marginBottom: 24 }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "12px 20px",
              border: "none", background: "transparent",
              color: tab === t.id ? "#4F46E5" : "#64748B",
              fontWeight: tab === t.id ? 600 : 400,
              borderBottom: tab === t.id ? "3px solid #4F46E5" : "3px solid transparent",
              cursor: "pointer", transition: "all 0.2s"
            }}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Formulaire création (affiché temporairement) */}
      {showCreate && (
        <div style={{ background: "#FFF", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.05)", marginBottom: 24 }}>
          <form onSubmit={handleAddEcole} style={{ display: "flex", gap: 12 }}>
            <input
              placeholder="Nom de la nouvelle école"
              value={nouveauNom}
              onChange={e => setNouveauNom(e.target.value)}
              style={{ flex: 1, padding: "10px 14px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 14, outline: "none" }}
              autoFocus
            />
            <button type="submit" style={{ padding: "10px 20px", background: "#4F46E5", color: "white", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer" }}>
              Créer
            </button>
          </form>
        </div>
      )}

      {/* Contenu */}
      {tab === "overview" && <OverviewTab globalStats={globalStats} ecolesAvecUsers={ecolesAvecUsers} />}
      {tab === "schools" && <SchoolsTab ecoles={ecolesAvecUsers} onSelectEcole={onSelectEcole} user={user} />}
      {tab === "pending" && <PendingTab pendingUsers={pendingUsers} />}
    </div>
  );
}