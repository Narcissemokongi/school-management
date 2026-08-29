import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useStyles } from "../../styles/theme";
import {
  Plus, BarChart3, School, Clock, Loader, RefreshCw, ShieldCheck,
  TrendingUp, Search, X, ListFilter, Building2, Users, GraduationCap,
  BookOpen, AlertTriangle, CheckCircle2, XCircle, Copy, Edit2, Trash2,
  Ban, Power, Save, ArrowRight, ChevronUp, ChevronDown, Menu, Bell,
  User as UserIcon, LogOut, Sun, Moon,
} from "lucide-react";
import { OverviewTab } from "./OverviewTab";
import { PendingTab } from "./PendingTab";
import { SchoolTable } from "./SchoolTable";
import { GestionSuperAdmins } from "./GestionSuperAdmins";
import toast from "react-hot-toast";
import {
  BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, LineChart, Line,
} from "recharts";
import { AnimatePresence, motion } from "framer-motion"; // à installer si nécessaire

export function SuperAdminDashboard({ onSelectEcole, user, onLogout }) {
  const { dark, toggle } = useStyles();
  const [tab, setTab] = useState("overview");
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [nouveauNom, setNouveauNom] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false); // pour mobile éventuellement
  const [notifications, setNotifications] = useState([]);

  // Queries
  const ecolesAvecUsersQuery = useQuery(api.ecoles.listWithUserCount);
  const globalStatsQuery = useQuery(api.stats.globalStats);
  const pendingUsersQuery = useQuery(api.users.listAllPendingUsers);
  const tauxMatiere = useQuery(api.stats.tauxReussiteParMatiere) ?? [];
  const tauxClasse = useQuery(api.stats.tauxReussiteParClasse) ?? [];
  const evolution = useQuery(api.stats.evolutionResultats) ?? [];

  const ecolesAvecUsers = ecolesAvecUsersQuery ?? [];
  const globalStats = globalStatsQuery ?? {};
  const pendingUsers = pendingUsersQuery ?? [];

  const isLoading =
    ecolesAvecUsersQuery === undefined ||
    globalStatsQuery === undefined ||
    pendingUsersQuery === undefined;

  // Mutations
  const addEcole = useMutation(api.ecoles.add);
  const removeEcole = useMutation(api.ecoles.remove);
  const suspendEcole = useMutation(api.ecoles.suspendEcole);
  const reactiverEcole = useMutation(api.ecoles.reactiverEcole);
  const updateEcole = useMutation(api.ecoles.update);

  // Handlers
  const refreshQueries = async () => {
    setRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    setRefreshing(false);
    toast.success("Données actualisées");
  };

  const handleAddEcole = async (e) => {
    e.preventDefault();
    if (!nouveauNom.trim()) return;
    try {
      await addEcole({ nom: nouveauNom.trim(), userId: user._id });
      setNouveauNom("");
      setShowCreateModal(false);
      toast.success("École créée avec succès");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteEcole = async (ecoleId, nom) => {
    const ok = window.confirm(`Supprimer définitivement "${nom}" et toutes ses données ?`);
    if (!ok) return;
    try {
      await removeEcole({ id: ecoleId, userId: user._id });
      toast.success("École supprimée");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleToggleStatus = async (ecole) => {
    const action = ecole.statut === "active" ? "suspendre" : "réactiver";
    const ok = window.confirm(`Voulez-vous ${action} l'école "${ecole.nom}" ?`);
    if (!ok) return;
    try {
      if (ecole.statut === "active") {
        await suspendEcole({ ecoleId: ecole._id, userId: user._id });
      } else {
        await reactiverEcole({ ecoleId: ecole._id, userId: user._id });
      }
      toast.success(`École ${action}`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleUpdateNom = async (ecoleId, nom) => {
    try {
      await updateEcole({ ecoleId, nom, userId: user._id });
      toast.success("Nom mis à jour");
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Onglets
  const tabs = [
    { id: "overview", label: "Vue d'ensemble", icon: <BarChart3 size={18} /> },
    { id: "schools", label: "Écoles", icon: <School size={18} />, badge: ecolesAvecUsers.length },
    {
      id: "pending",
      label: "Demandes",
      icon: <Clock size={18} />,
      badge: pendingUsers.length,
      badgeColor: "#F59E0B",
    },
    { id: "superadmins", label: "Super Admins", icon: <ShieldCheck size={18} /> },
    { id: "stats", label: "Statistiques", icon: <TrendingUp size={18} /> },
  ];

  // Filtrage écoles
  const filteredEcoles = useMemo(() => {
    if (!searchTerm.trim()) return ecolesAvecUsers;
    const q = searchTerm.toLowerCase();
    return ecolesAvecUsers.filter(
      (e) =>
        e.nom.toLowerCase().includes(q) ||
        (e.code && e.code.toLowerCase().includes(q))
    );
  }, [ecolesAvecUsers, searchTerm]);

  // Couleurs
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#CBD5E1" : "#64748B";
  const borderColor = dark ? "#334155" : "#E2E8F0";
  const accentColor = dark ? "#818CF8" : "#4F46E5";

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px" }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .animate-spin { animation: spin 1s linear infinite; }`}</style>

      {/* En-tête avec animations */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 32,
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: textPrimary, margin: 0 }}>
            Administration Générale
          </h1>
          <p style={{ color: textSecondary, marginTop: 4, fontSize: 14 }}>
            Gérez les établissements, utilisateurs et paramètres globaux
          </p>
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={refreshQueries}
            disabled={refreshing || isLoading}
            title="Actualiser les données"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 16px",
              background: "transparent",
              color: textSecondary,
              border: `1px solid ${borderColor}`,
              borderRadius: 10,
              cursor: refreshing ? "not-allowed" : "pointer",
              opacity: refreshing || isLoading ? 0.7 : 1,
            }}
          >
            <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 20px",
              background: accentColor,
              color: "white",
              border: "none",
              borderRadius: 10,
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
              boxShadow: dark ? "0 4px 12px rgba(129,140,248,0.4)" : "0 4px 12px rgba(79,70,229,0.2)",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = dark ? "#6366F1" : "#4338CA")}
            onMouseLeave={(e) => (e.currentTarget.style.background = accentColor)}
          >
            <Plus size={20} /> Nouvelle école
          </button>
        </div>
      </motion.div>

      {/* Modale de création d'école */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(4px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
              padding: 16,
            }}
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ duration: 0.2 }}
              style={{
                background: dark ? "#1E293B" : "#FFFFFF",
                borderRadius: 16,
                padding: 24,
                width: "100%",
                maxWidth: 400,
                boxShadow: dark ? "0 20px 40px rgba(0,0,0,0.5)" : "0 20px 40px rgba(0,0,0,0.2)",
                border: `1px solid ${borderColor}`,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: textPrimary }}>
                  Nouvelle école
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: textSecondary }}
                >
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleAddEcole}>
                <input
                  placeholder="Nom de l'école"
                  value={nouveauNom}
                  onChange={(e) => setNouveauNom(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: `1px solid ${borderColor}`,
                    borderRadius: 8,
                    fontSize: 14,
                    outline: "none",
                    background: dark ? "#0F172A" : "#F9FAFB",
                    color: textPrimary,
                    marginBottom: 16,
                  }}
                  autoFocus
                />
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    type="submit"
                    style={{
                      flex: 1,
                      padding: "10px 16px",
                      background: accentColor,
                      color: "white",
                      border: "none",
                      borderRadius: 8,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Créer
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    style={{
                      padding: "10px 16px",
                      background: "transparent",
                      border: `1px solid ${borderColor}`,
                      borderRadius: 8,
                      color: textSecondary,
                      cursor: "pointer",
                    }}
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Onglets */}
      <div style={{
        display: "flex",
        gap: 0,
        borderBottom: `2px solid ${borderColor}`,
        marginBottom: 24,
        overflowX: "auto",
        whiteSpace: "nowrap",
      }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "12px 20px",
              border: "none",
              background: "transparent",
              color: tab === t.id ? accentColor : textSecondary,
              fontWeight: tab === t.id ? 600 : 400,
              borderBottom: tab === t.id ? `3px solid ${accentColor}` : "3px solid transparent",
              cursor: "pointer",
              transition: "all 0.2s",
              position: "relative",
            }}
          >
            {t.icon}
            {t.label}
            {t.badge !== undefined && t.badge > 0 && (
              <span style={{
                marginLeft: 4,
                background: t.badgeColor || "#EF4444",
                color: "white",
                borderRadius: "50%",
                minWidth: 18,
                height: 18,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 700,
                padding: "0 4px",
              }}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Contenu avec animation */}
      <motion.div
        key={tab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {isLoading ? (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 300 }}>
            <Loader size={40} className="animate-spin" style={{ color: accentColor }} />
          </div>
        ) : (
          <>
            {tab === "overview" && (
              <OverviewTab
                globalStats={globalStats}
                ecolesAvecUsers={ecolesAvecUsers}
                onNavigate={setTab}
              />
            )}

            {tab === "schools" && (
              <div>
                {/* Barre de recherche */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    background: dark ? "#1E293B" : "#FFFFFF",
                    borderRadius: 10,
                    padding: "8px 12px",
                    border: `1px solid ${borderColor}`,
                    flex: 1,
                  }}>
                    <Search size={18} color={textSecondary} />
                    <input
                      placeholder="Rechercher par nom ou code..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={{
                        border: "none",
                        outline: "none",
                        marginLeft: 8,
                        fontSize: 14,
                        width: "100%",
                        background: "transparent",
                        color: textPrimary,
                      }}
                    />
                    {searchTerm && (
                      <button onClick={() => setSearchTerm("")} style={{ background: "none", border: "none", cursor: "pointer" }}>
                        <X size={16} color={textSecondary} />
                      </button>
                    )}
                  </div>
                  <ListFilter size={20} color={textSecondary} />
                </div>
                <SchoolTable
                  ecoles={filteredEcoles}
                  onSelectEcole={onSelectEcole}
                  onDelete={handleDeleteEcole}
                  onToggleStatus={handleToggleStatus}
                  onUpdateNom={handleUpdateNom}
                  user={user}
                />
              </div>
            )}

            {tab === "pending" && <PendingTab pendingUsers={pendingUsers} user={user} />}

            {tab === "superadmins" && <GestionSuperAdmins user={user} />}

            {tab === "stats" && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
                <div style={{
                  background: dark ? "#1E293B" : "#FFFFFF",
                  borderRadius: 16,
                  padding: 20,
                  boxShadow: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)",
                  border: `1px solid ${borderColor}`,
                }}>
                  <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: textPrimary }}>
                    Taux de réussite par matière
                  </h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <ReBarChart data={tauxMatiere}>
                      <CartesianGrid strokeDasharray="3 3" stroke={dark ? "#334155" : "#E2E8F0"} />
                      <XAxis dataKey="matiere" stroke={textSecondary} />
                      <YAxis stroke={textSecondary} />
                      <Tooltip contentStyle={{ background: dark ? "#1E293B" : "#FFFFFF", color: textPrimary, border: `1px solid ${borderColor}` }} />
                      <Bar dataKey="taux" fill={accentColor} />
                    </ReBarChart>
                  </ResponsiveContainer>
                </div>

                <div style={{
                  background: dark ? "#1E293B" : "#FFFFFF",
                  borderRadius: 16,
                  padding: 20,
                  boxShadow: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)",
                  border: `1px solid ${borderColor}`,
                }}>
                  <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: textPrimary }}>
                    Taux de réussite par classe
                  </h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <ReBarChart data={tauxClasse}>
                      <CartesianGrid strokeDasharray="3 3" stroke={dark ? "#334155" : "#E2E8F0"} />
                      <XAxis dataKey="classe" stroke={textSecondary} />
                      <YAxis stroke={textSecondary} />
                      <Tooltip contentStyle={{ background: dark ? "#1E293B" : "#FFFFFF", color: textPrimary, border: `1px solid ${borderColor}` }} />
                      <Bar dataKey="taux" fill="#10B981" />
                    </ReBarChart>
                  </ResponsiveContainer>
                </div>

                <div style={{
                  gridColumn: "span 1",
                  background: dark ? "#1E293B" : "#FFFFFF",
                  borderRadius: 16,
                  padding: 20,
                  boxShadow: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)",
                  border: `1px solid ${borderColor}`,
                }}>
                  <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: textPrimary }}>
                    Évolution des résultats
                  </h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={evolution}>
                      <CartesianGrid strokeDasharray="3 3" stroke={dark ? "#334155" : "#E2E8F0"} />
                      <XAxis dataKey="periode" stroke={textSecondary} />
                      <YAxis stroke={textSecondary} />
                      <Tooltip contentStyle={{ background: dark ? "#1E293B" : "#FFFFFF", color: textPrimary, border: `1px solid ${borderColor}` }} />
                      <Legend />
                      <Line type="monotone" dataKey="taux" stroke="#F59E0B" strokeWidth={3} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}