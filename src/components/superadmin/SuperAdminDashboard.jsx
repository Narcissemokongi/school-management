import { useState, useEffect, useMemo, useCallback, useDeferredValue } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useStyles } from "../../styles/theme";
import { useIsMobile } from "../../hooks/useIsMobile";
import * as XLSX from "xlsx";
import {
  Plus, BarChart3, School, Clock, Loader, RefreshCw, ShieldCheck,
  Search, X, ListFilter, Building2, Users, GraduationCap,
  BookOpen, AlertTriangle, CheckCircle2, XCircle, Copy, Edit2, Trash2,
  Ban, Power, Save, ArrowRight, ChevronUp, ChevronDown, Menu, Bell,
  Sun, Moon, LogOut, User as UserIcon, Settings, LayoutDashboard,
  LayoutGrid, Table, Download, Printer, MoreVertical, CalendarDays,
  TrendingUp, Activity, Globe, Server, Database, Wifi, ShieldAlert,
  CheckSquare, Square, ChevronLeft, ChevronRight, UserPlus, UserMinus,
} from "lucide-react";
import { OverviewTab } from "./OverviewTab";
import { PendingTab } from "./PendingTab";
import { SchoolTable } from "./SchoolTable";
import { GestionSuperAdmins } from "./GestionSuperAdmins";
import { SettingsTab } from "./SettingsTab"; // <-- Nouveau composant
import { ConfirmDialog } from "../ConfirmDialog";
import { useConfirm } from "../../hooks/useConfirm";
import toast from "react-hot-toast";

// Hook pour détecter les breakpoints
function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const handler = (e) => setMatches(e.matches);
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, [query]);
  return matches;
}

// Sous-composant : Badge de statut
const StatusBadge = ({ statut, dark }) => {
  const isActive = statut === "active";
  const bg = isActive
    ? dark ? "#064E3B" : "#D1FAE5"
    : dark ? "#7F1D1D" : "#FEE2E2";
  const color = isActive
    ? dark ? "#34D399" : "#065F46"
    : dark ? "#F87171" : "#B91C1C";
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      padding: "4px 10px",
      borderRadius: 20,
      fontSize: 12,
      fontWeight: 600,
      background: bg,
      color: color,
    }}>
      {isActive ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
      {isActive ? "Active" : "Suspendue"}
    </span>
  );
};

// Sous-composant : Carte école (vue cartes) avec sélection
const SchoolCard = ({
  ecole,
  onSelectEcole,
  onToggleStatus,
  onDelete,
  dark,
  borderColor,
  accentColor,
  textPrimary,
  textSecondary,
  selected,
  onToggleSelect,
}) => (
  <div
    style={{
      background: dark ? "#1E293B" : "#FFFFFF",
      borderRadius: 16,
      padding: 20,
      boxShadow: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)",
      border: `1px solid ${selected ? accentColor : borderColor}`,
      cursor: "pointer",
      transition: "transform 0.2s, box-shadow 0.2s, border-color 0.2s",
      display: "flex",
      flexDirection: "column",
      gap: 12,
      position: "relative",
    }}
    onClick={() => onSelectEcole(ecole._id)}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = "translateY(-2px)";
      e.currentTarget.style.boxShadow = dark ? "0 4px 12px rgba(0,0,0,0.5)" : "0 4px 12px rgba(0,0,0,0.1)";
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = "translateY(0)";
      e.currentTarget.style.boxShadow = dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)";
    }}
  >
    {/* Case à cocher */}
    <button
      onClick={(e) => {
        e.stopPropagation();
        onToggleSelect(ecole._id);
      }}
      style={{
        position: "absolute",
        top: 10,
        right: 10,
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: 4,
        color: selected ? accentColor : textSecondary,
        zIndex: 1,
      }}
      aria-label={selected ? "Désélectionner" : "Sélectionner"}
    >
      {selected ? <CheckSquare size={18} /> : <Square size={18} />}
    </button>

    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingRight: 28 }}>
      <Building2 size={24} color={accentColor} />
      <StatusBadge statut={ecole.statut} dark={dark} />
    </div>
    <div>
      <div style={{ fontWeight: 700, fontSize: 18, color: textPrimary }}>{ecole.nom}</div>
      {ecole.code && (
        <div style={{ color: textSecondary, fontSize: 13, display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
          Code : <span style={{ fontFamily: "monospace" }}>{ecole.code}</span>
        </div>
      )}
      <div style={{ color: textSecondary, fontSize: 13, display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
        <CalendarDays size={14} /> Créée le {new Date(ecole._creationTime).toLocaleDateString()}
      </div>
      <div style={{ color: textSecondary, fontSize: 13, display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
        <Users size={14} /> {ecole.userCount ?? 0} utilisateur(s)
      </div>
    </div>
    <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
      <button
        onClick={(e) => { e.stopPropagation(); onSelectEcole(ecole._id); }}
        style={{
          flex: 1,
          padding: "8px 12px",
          background: accentColor,
          color: "white",
          border: "none",
          borderRadius: 8,
          cursor: "pointer",
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
        }}
      >
        Ouvrir <ArrowRight size={14} />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onToggleStatus(ecole); }}
        title={ecole.statut === "active" ? "Suspendre" : "Réactiver"}
        style={{
          padding: 8,
          background: "transparent",
          border: `1px solid ${borderColor}`,
          borderRadius: 8,
          color: ecole.statut === "active" ? "#F59E0B" : "#10B981",
          cursor: "pointer",
        }}
      >
        {ecole.statut === "active" ? <Ban size={16} /> : <Power size={16} />}
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(ecole._id, ecole.nom); }}
        title="Supprimer"
        style={{
          padding: 8,
          background: "transparent",
          border: `1px solid ${borderColor}`,
          borderRadius: 8,
          color: "#EF4444",
          cursor: "pointer",
        }}
      >
        <Trash2 size={16} />
      </button>
    </div>
  </div>
);

// Sous-composant : Barre d'outils écoles
const SchoolsToolbar = ({
  searchTerm, setSearchTerm,
  schoolFilter, setSchoolFilter,
  schoolView, setSchoolView,
  onExport, onPrint,
  stats,
  dark, borderColor, accentColor, textSecondary,
  selectedCount, onSelectAll, allVisibleSelected,
}) => (
  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
    {/* Recherche */}
    <div style={{
      display: "flex", alignItems: "center",
      background: dark ? "#1E293B" : "#FFFFFF",
      borderRadius: 10, padding: "8px 12px",
      border: `1px solid ${borderColor}`,
      flex: 1, minWidth: 200,
    }}>
      <Search size={18} color={textSecondary} />
      <input
        placeholder="Rechercher une école..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{ border: "none", outline: "none", marginLeft: 8, fontSize: 14, width: "100%", background: "transparent", color: dark ? "#F1F5F9" : "#1E293B" }}
      />
      {searchTerm && <button onClick={() => setSearchTerm("")} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={16} color={textSecondary} /></button>}
    </div>

    {/* Statistiques rapides */}
    <div style={{ display: "flex", gap: 16, fontSize: 13, color: textSecondary }}>
      <span><strong style={{ color: dark ? "#F1F5F9" : "#1E293B" }}>{stats.total}</strong> total</span>
      <span><strong style={{ color: "#10B981" }}>{stats.active}</strong> actives</span>
      <span><strong style={{ color: "#F59E0B" }}>{stats.suspended}</strong> suspendues</span>
    </div>

    {/* Filtres */}
    <div style={{ display: "flex", gap: 4 }}>
      {[
        { id: "all", label: "Toutes" },
        { id: "active", label: "Actives" },
        { id: "suspendue", label: "Suspendues" },
      ].map((filter) => (
        <button
          key={filter.id}
          onClick={() => setSchoolFilter(filter.id)}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            border: `1px solid ${borderColor}`,
            background: schoolFilter === filter.id ? accentColor : "transparent",
            color: schoolFilter === filter.id ? "white" : textSecondary,
            fontWeight: schoolFilter === filter.id ? 600 : 400,
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          {filter.label}
        </button>
      ))}
    </div>

    {/* Bascules vue */}
    <div style={{ display: "flex", gap: 4 }}>
      <button onClick={() => setSchoolView("table")} title="Vue tableau" style={{ padding: 8, borderRadius: 8, border: `1px solid ${borderColor}`, background: schoolView === "table" ? accentColor : "transparent", color: schoolView === "table" ? "white" : textSecondary, cursor: "pointer" }}>
        <Table size={18} />
      </button>
      <button onClick={() => setSchoolView("cards")} title="Vue cartes" style={{ padding: 8, borderRadius: 8, border: `1px solid ${borderColor}`, background: schoolView === "cards" ? accentColor : "transparent", color: schoolView === "cards" ? "white" : textSecondary, cursor: "pointer" }}>
        <LayoutGrid size={18} />
      </button>
    </div>

    {/* Actions supplémentaires */}
    <div style={{ display: "flex", gap: 4 }}>
      <button onClick={onExport} title="Exporter en Excel" style={{ padding: 8, borderRadius: 8, border: `1px solid ${borderColor}`, background: "transparent", color: textSecondary, cursor: "pointer" }}>
        <Download size={18} />
      </button>
      <button onClick={onPrint} title="Imprimer" style={{ padding: 8, borderRadius: 8, border: `1px solid ${borderColor}`, background: "transparent", color: textSecondary, cursor: "pointer" }}>
        <Printer size={18} />
      </button>
    </div>

    {/* Sélection */}
    {selectedCount > 0 && (
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, color: textSecondary }}>{selectedCount} sélectionnée(s)</span>
        <button onClick={onSelectAll} style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 10px", background: "transparent", border: `1px solid ${borderColor}`, borderRadius: 6, cursor: "pointer", fontSize: 13, color: dark ? "#F1F5F9" : "#1E293B" }}>
          {allVisibleSelected ? <CheckSquare size={14} /> : <Square size={14} />} Tout
        </button>
      </div>
    )}
  </div>
);

// Sous-composant : Panneau de notifications
const NotificationsPanel = ({ pendingUsers, dark, borderColor, textPrimary, textSecondary }) => (
  <div className="fade-in" style={{
    position: "absolute", top: 40, right: 0,
    width: 300, background: dark ? "#1E293B" : "#FFFFFF",
    borderRadius: 12, boxShadow: dark ? "0 4px 12px rgba(0,0,0,0.5)" : "0 4px 12px rgba(0,0,0,0.15)",
    border: `1px solid ${borderColor}`, zIndex: 50, maxHeight: 350, overflowY: "auto",
  }}>
    <div style={{ padding: "12px 16px", borderBottom: `1px solid ${borderColor}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <strong style={{ color: textPrimary }}>Notifications</strong>
      {pendingUsers.length > 0 && (
        <span style={{ background: "#EF4444", color: "white", borderRadius: "50%", minWidth: 20, height: 20, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, padding: "0 6px" }}>
          {pendingUsers.length}
        </span>
      )}
    </div>
    {pendingUsers.length > 0 ? (
      pendingUsers.slice(0, 5).map((u) => (
        <div key={u._id} style={{ padding: "10px 16px", borderBottom: `1px solid ${borderColor}` }}>
          <div style={{ color: textPrimary, fontSize: 13 }}>Nouvelle demande de {u.nom}</div>
          <div style={{ color: textSecondary, fontSize: 12 }}>@{u.login} · {u.role}</div>
          <button style={{ marginTop: 4, background: "none", border: "none", color: "#4F46E5", cursor: "pointer", fontSize: 12 }}>Voir</button>
        </div>
      ))
    ) : (
      <div style={{ padding: 16, color: textSecondary, fontSize: 13 }}>Aucune notification</div>
    )}
  </div>
);

export function SuperAdminDashboard({ onSelectEcole, user, onLogout }) {
  const { dark, toggle } = useStyles();
  const { confirm, dialogProps } = useConfirm();
  const isMobile = useIsMobile();
  const isTablet = useMediaQuery("(min-width: 769px) and (max-width: 1024px)");
  const isDesktop = useMediaQuery("(min-width: 1025px)");

  const [activeSection, setActiveSection] = useState("overview");
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [schoolFilter, setSchoolFilter] = useState("all");
  const [schoolView, setSchoolView] = useState("table");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [nouveauNom, setNouveauNom] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [pendingFilterRole, setPendingFilterRole] = useState("all");
  const [pendingSearch, setPendingSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Nouveaux états pour la sélection
  const [selectedSchoolIds, setSelectedSchoolIds] = useState(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // Recherche différée
  const deferredSearchTerm = useDeferredValue(searchTerm);

  // Queries
  const ecolesAvecUsersQuery = useQuery(api.ecoles.listWithUserCount);
  const globalStatsQuery = useQuery(api.stats.globalStats);
  const pendingUsersQuery = useQuery(api.users.listAllPendingUsers);

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

  // Handlers (useCallback pour éviter re-rendus inutiles)
  const refreshQueries = useCallback(async () => {
    setRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    setRefreshing(false);
    toast.success("Données actualisées");
  }, []);

  const handleAddEcole = useCallback(async (e) => {
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
  }, [addEcole, nouveauNom, user._id]);

  const handleDeleteEcole = useCallback(async (ecoleId, nom) => {
    const ok = await confirm(
      "Supprimer l'école",
      `Voulez-vous vraiment supprimer "${nom}" ? Cette action est irréversible.`
    );
    if (!ok) return;
    try {
      await removeEcole({ id: ecoleId, userId: user._id });
      toast.success("École supprimée");
    } catch (err) {
      toast.error(err.message);
    }
  }, [confirm, removeEcole, user._id]);

  const handleToggleStatus = useCallback(async (ecole) => {
    const action = ecole.statut === "active" ? "suspendre" : "réactiver";
    const ok = await confirm(
      action === "suspendre" ? "Suspendre l'école" : "Réactiver l'école",
      `Voulez-vous ${action} l'école "${ecole.nom}" ?`
    );
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
  }, [confirm, suspendEcole, reactiverEcole, user._id]);

  const handleUpdateNom = useCallback(async (ecoleId, nom) => {
    try {
      await updateEcole({ ecoleId, nom, userId: user._id });
      toast.success("Nom mis à jour");
    } catch (err) {
      toast.error(err.message);
    }
  }, [updateEcole, user._id]);

  // Sections de navigation
  const sections = [
    { id: "overview", label: "Vue d'ensemble", icon: <LayoutDashboard size={20} /> },
    { id: "schools", label: "Écoles", icon: <School size={20} />, badge: ecolesAvecUsers.length },
    {
      id: "pending",
      label: "Demandes",
      icon: <Clock size={20} />,
      badge: pendingUsers.length,
      badgeColor: "#F59E0B",
    },
    { id: "superadmins", label: "Super Admins", icon: <ShieldCheck size={20} /> },
    { id: "settings", label: "Paramètres", icon: <Settings size={20} /> },
  ];

  // Filtrage écoles
  const filteredEcoles = useMemo(() => {
    let result = ecolesAvecUsers;
    if (schoolFilter === "active") result = result.filter((e) => e.statut === "active");
    else if (schoolFilter === "suspendue") result = result.filter((e) => e.statut === "suspendue");
    if (deferredSearchTerm.trim()) {
      const q = deferredSearchTerm.toLowerCase();
      result = result.filter(
        (e) => e.nom.toLowerCase().includes(q) || (e.code && e.code.toLowerCase().includes(q))
      );
    }
    return result;
  }, [ecolesAvecUsers, deferredSearchTerm, schoolFilter]);

  // Statistiques écoles
  const schoolStats = useMemo(() => ({
    total: ecolesAvecUsers.length,
    active: ecolesAvecUsers.filter((e) => e.statut === "active").length,
    suspended: ecolesAvecUsers.filter((e) => e.statut === "suspendue").length,
  }), [ecolesAvecUsers]);

  // Pagination
  const totalPages = Math.ceil(filteredEcoles.length / pageSize) || 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedEcoles = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredEcoles.slice(start, start + pageSize);
  }, [filteredEcoles, safeCurrentPage, pageSize]);

  // Reset page quand filtre change
  useEffect(() => {
    setCurrentPage(1);
  }, [schoolFilter, deferredSearchTerm]);

  // Sélection multiple
  const toggleSchoolSelection = useCallback((id) => {
    setSelectedSchoolIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAllVisible = useCallback(() => {
    setSelectedSchoolIds((prev) => {
      const allVisibleIds = paginatedEcoles.map((e) => e._id);
      const allSelected = allVisibleIds.every((id) => prev.has(id));
      const next = new Set(prev);
      if (allSelected) {
        allVisibleIds.forEach((id) => next.delete(id));
      } else {
        allVisibleIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }, [paginatedEcoles]);

  const clearSchoolSelection = useCallback(() => {
    setSelectedSchoolIds(new Set());
  }, []);

  // Actions groupées
  const bulkSuspendSchools = async () => {
    if (selectedSchoolIds.size === 0) return;
    const ok = await confirm("Suspendre les écoles sélectionnées", `Voulez-vous suspendre ${selectedSchoolIds.size} école(s) ?`);
    if (!ok) return;
    setBulkProcessing(true);
    try {
      await Promise.all(Array.from(selectedSchoolIds).map((id) => suspendEcole({ ecoleId: id, userId: user._id })));
      toast.success(`${selectedSchoolIds.size} école(s) suspendue(s)`);
      clearSchoolSelection();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBulkProcessing(false);
    }
  };

  const bulkActivateSchools = async () => {
    if (selectedSchoolIds.size === 0) return;
    const ok = await confirm("Activer les écoles sélectionnées", `Voulez-vous activer ${selectedSchoolIds.size} école(s) ?`);
    if (!ok) return;
    setBulkProcessing(true);
    try {
      await Promise.all(Array.from(selectedSchoolIds).map((id) => reactiverEcole({ ecoleId: id, userId: user._id })));
      toast.success(`${selectedSchoolIds.size} école(s) activée(s)`);
      clearSchoolSelection();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBulkProcessing(false);
    }
  };

  const bulkDeleteSchools = async () => {
    if (selectedSchoolIds.size === 0) return;
    const ok = await confirm("Supprimer les écoles sélectionnées", `⚠️ Attention : ${selectedSchoolIds.size} école(s) et leurs utilisateurs associés seront supprimés définitivement. Cette action est irréversible.`);
    if (!ok) return;
    setBulkProcessing(true);
    try {
      await Promise.all(Array.from(selectedSchoolIds).map((id) => removeEcole({ id, userId: user._id })));
      toast.success(`${selectedSchoolIds.size} école(s) supprimée(s)`);
      clearSchoolSelection();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBulkProcessing(false);
    }
  };

  // Export Excel (après filteredEcoles)
  const handleExportExcel = useCallback(() => {
    if (filteredEcoles.length === 0) {
      toast.error("Aucune donnée à exporter");
      return;
    }
    const data = filteredEcoles.map((e) => ({
      Nom: e.nom,
      Code: e.code || "N/A",
      Statut: e.statut === "active" ? "Active" : "Suspendue",
      Utilisateurs: e.userCount ?? 0,
      "Créée le": new Date(e._creationTime).toLocaleDateString(),
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Écoles");
    XLSX.writeFile(workbook, "ecoles.xlsx");
    toast.success("Export Excel généré");
  }, [filteredEcoles]);

  // Impression
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // Filtrage demandes
  const filteredPending = useMemo(() => {
    let result = pendingUsers;
    if (pendingFilterRole !== "all") result = result.filter((u) => u.role === pendingFilterRole);
    if (pendingSearch.trim()) {
      const q = pendingSearch.toLowerCase();
      result = result.filter(
        (u) => u.nom.toLowerCase().includes(q) || u.login.toLowerCase().includes(q)
      );
    }
    return result;
  }, [pendingUsers, pendingFilterRole, pendingSearch]);

  // Couleurs
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#CBD5E1" : "#64748B";
  const borderColor = dark ? "#334155" : "#E2E8F0";
  const accentColor = dark ? "#818CF8" : "#4F46E5";
  const sidebarBg = dark ? "#0F172A" : "#FFFFFF";
  const sidebarHoverBg = dark ? "#1E293B" : "#F1F5F9";

  const sidebarWidth = isDesktop ? 260 : isTablet ? 220 : 280;

  return (
    <div style={{ display: "flex", minHeight: "100vh", width: "100%", maxWidth: "100%", margin: 0 }}>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .fade-in { animation: fadeIn 0.3s ease; }
        .sidebar-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.4); z-index: 40; }
        .mobile-sidebar { position: fixed; top: 0; left: 0; bottom: 0; z-index: 50; width: 80%; max-width: 300px; transform: translateX(-100%); transition: transform 0.3s ease; }
        .mobile-sidebar.open { transform: translateX(0); }
        .mobile-menu-btn { display: ${isMobile ? "inline-flex" : "none"}; }
        @media (min-width: 769px) {
          .desktop-sidebar { transform: translateX(0) !important; position: sticky; }
        }
        @media print {
          .no-print { display: none !important; }
          .print-area { display: block !important; }
        }
      `}</style>

      {isMobile && mobileNavOpen && (
        <div className="sidebar-overlay" onClick={() => setMobileNavOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`${isMobile ? "mobile-sidebar" : "desktop-sidebar"} ${mobileNavOpen ? "open" : ""} no-print`}
        style={{
          width: isMobile ? "80%" : sidebarWidth,
          maxWidth: isMobile ? 300 : undefined,
          minHeight: isMobile ? "100%" : "100vh",
          background: sidebarBg,
          borderRight: `1px solid ${borderColor}`,
          padding: "24px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          position: isMobile ? "fixed" : "sticky",
          top: 0,
          left: 0,
          zIndex: isMobile ? 50 : undefined,
          transition: "transform 0.3s ease",
        }}
      >
        <div style={{ marginBottom: 24, paddingLeft: 8 }}>
          <h2 style={{ fontSize: isDesktop ? 18 : 16, fontWeight: 700, color: textPrimary }}>Super Admin</h2>
          <p style={{ fontSize: 13, color: textSecondary }}>{user?.nom}</p>
        </div>

        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => {
              setActiveSection(section.id);
              if (isMobile) setMobileNavOpen(false);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 16px",
              borderRadius: 10,
              border: "none",
              background: activeSection === section.id ? (dark ? "#1E293B" : "#EEF2FF") : "transparent",
              color: activeSection === section.id ? accentColor : textSecondary,
              fontWeight: activeSection === section.id ? 600 : 400,
              cursor: "pointer",
              transition: "background 0.2s, color 0.2s",
              fontSize: isDesktop ? 15 : 14,
              textAlign: "left",
              width: "100%",
            }}
          >
            {section.icon}
            <span style={{ flex: 1 }}>{section.label}</span>
            {section.badge !== undefined && section.badge > 0 && (
              <span style={{
                background: section.badgeColor || "#EF4444",
                color: "white",
                borderRadius: "50%",
                minWidth: 20,
                height: 20,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 700,
              }}>
                {section.badge}
              </span>
            )}
          </button>
        ))}

        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            onClick={toggle}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 16px",
              borderRadius: 10,
              border: "none",
              background: "transparent",
              color: textSecondary,
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            {dark ? <Sun size={20} /> : <Moon size={20} />}
            {dark ? "Mode clair" : "Mode sombre"}
          </button>
          <button
            onClick={onLogout}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 16px",
              borderRadius: 10,
              border: "none",
              background: "transparent",
              color: "#EF4444",
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            <LogOut size={20} />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Contenu principal */}
      <main className="print-area" style={{ flex: 1, padding: isMobile ? "16px" : isTablet ? "24px" : "24px 32px", minWidth: 0, width: "100%" }}>
        <div className="no-print" style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
          <button
            onClick={() => setMobileNavOpen(true)}
            className="mobile-menu-btn"
            style={{ background: "none", border: "none", color: textPrimary, cursor: "pointer", padding: 8 }}
            aria-label="Ouvrir le menu"
          >
            <Menu size={24} />
          </button>

          <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, color: textPrimary, flex: 1 }}>
            {sections.find((s) => s.id === activeSection)?.label}
          </h1>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => setShowCreateModal(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                background: accentColor,
                color: "white",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              <Plus size={16} /> Nouvelle école
            </button>

            <button
              onClick={refreshQueries}
              disabled={refreshing || isLoading}
              title="Actualiser"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 12px",
                background: "transparent",
                color: textSecondary,
                border: `1px solid ${borderColor}`,
                borderRadius: 8,
                cursor: "pointer",
                opacity: refreshing ? 0.5 : 1,
              }}
            >
              <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
            </button>

            {/* Notifications */}
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                style={{ display: "flex", padding: 8, background: "transparent", border: "none", color: textSecondary, cursor: "pointer" }}
                title="Notifications"
              >
                <Bell size={20} />
                {pendingUsers.length > 0 && (
                  <span style={{
                    position: "absolute", top: 0, right: 0,
                    background: "#EF4444", color: "white",
                    borderRadius: "50%", minWidth: 16, height: 16,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 700, padding: "0 4px",
                  }}>
                    {pendingUsers.length}
                  </span>
                )}
              </button>
              {showNotifications && (
                <NotificationsPanel
                  pendingUsers={pendingUsers}
                  dark={dark}
                  borderColor={borderColor}
                  textPrimary={textPrimary}
                  textSecondary={textSecondary}
                />
              )}
            </div>

            {/* Profil */}
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "transparent", border: "none", cursor: "pointer", color: textPrimary }}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: accentColor, color: "white",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 700, fontSize: 14,
                }}>
                  {user?.nom?.charAt(0)}
                </div>
                {!isMobile && <span style={{ fontSize: 14, fontWeight: 500 }}>{user?.nom}</span>}
              </button>
              {showUserMenu && (
                <div className="fade-in" style={{
                  position: "absolute", top: 40, right: 0,
                  width: 160, background: dark ? "#1E293B" : "#FFFFFF",
                  borderRadius: 12, boxShadow: dark ? "0 4px 12px rgba(0,0,0,0.5)" : "0 4px 12px rgba(0,0,0,0.15)",
                  border: `1px solid ${borderColor}`, zIndex: 50,
                }}>
                  <button onClick={() => setActiveSection("settings")} style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 16px", background: "none", border: "none", color: textPrimary, cursor: "pointer", fontSize: 14 }}>
                    Paramètres
                  </button>
                  <button onClick={onLogout} style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 16px", background: "none", border: "none", color: "#EF4444", cursor: "pointer", fontSize: 14 }}>
                    Déconnexion
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Contenu actif */}
        <div key={activeSection} className="fade-in">
          {isLoading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
              <Loader size={40} className="animate-spin" style={{ color: accentColor }} />
            </div>
          ) : (
            <>
              {activeSection === "overview" && (
                <OverviewTab
                  globalStats={globalStats}
                  ecolesAvecUsers={ecolesAvecUsers}
                  onNavigate={setActiveSection}
                />
              )}

              {activeSection === "schools" && (
                <div>
                  <SchoolsToolbar
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    schoolFilter={schoolFilter}
                    setSchoolFilter={setSchoolFilter}
                    schoolView={schoolView}
                    setSchoolView={setSchoolView}
                    onExport={handleExportExcel}
                    onPrint={handlePrint}
                    stats={schoolStats}
                    dark={dark}
                    borderColor={borderColor}
                    accentColor={accentColor}
                    textSecondary={textSecondary}
                    selectedCount={selectedSchoolIds.size}
                    onSelectAll={toggleSelectAllVisible}
                    allVisibleSelected={paginatedEcoles.length > 0 && paginatedEcoles.every((e) => selectedSchoolIds.has(e._id))}
                  />

                  {/* Actions groupées */}
                  {selectedSchoolIds.size > 0 && (
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
                      <button
                        onClick={bulkActivateSchools}
                        disabled={bulkProcessing}
                        style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", background: "#10B981", color: "white", border: "none", borderRadius: 6, cursor: bulkProcessing ? "not-allowed" : "pointer", fontSize: 13 }}
                      >
                        <UserPlus size={14} /> Activer
                      </button>
                      <button
                        onClick={bulkSuspendSchools}
                        disabled={bulkProcessing}
                        style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", background: "#F59E0B", color: "white", border: "none", borderRadius: 6, cursor: bulkProcessing ? "not-allowed" : "pointer", fontSize: 13 }}
                      >
                        <UserMinus size={14} /> Suspendre
                      </button>
                      <button
                        onClick={bulkDeleteSchools}
                        disabled={bulkProcessing}
                        style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", background: "#EF4444", color: "white", border: "none", borderRadius: 6, cursor: bulkProcessing ? "not-allowed" : "pointer", fontSize: 13 }}
                      >
                        <Trash2 size={14} /> Supprimer
                      </button>
                      <button
                        onClick={clearSchoolSelection}
                        disabled={bulkProcessing}
                        style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", background: "transparent", border: `1px solid ${borderColor}`, borderRadius: 6, cursor: "pointer", fontSize: 13, color: textPrimary }}
                      >
                        <X size={14} /> Annuler
                      </button>
                    </div>
                  )}

                  {schoolView === "table" ? (
                    <>
                      <SchoolTable
                        ecoles={paginatedEcoles}
                        onSelectEcole={onSelectEcole}
                        onDelete={handleDeleteEcole}
                        onToggleStatus={handleToggleStatus}
                        onUpdateNom={handleUpdateNom}
                        user={user}
                        selectable
                        selectedIds={selectedSchoolIds}
                        onToggleSelect={toggleSchoolSelection}
                        onToggleSelectAll={toggleSelectAllVisible}
                      />
                      {/* Pagination */}
                      {totalPages > 1 && (
                        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 16 }}>
                          <button
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={safeCurrentPage === 1}
                            style={{ padding: "8px 12px", border: `1px solid ${borderColor}`, borderRadius: 8, background: "transparent", cursor: safeCurrentPage === 1 ? "not-allowed" : "pointer", color: textPrimary }}
                          >
                            <ChevronLeft size={16} /> Précédent
                          </button>
                          <span style={{ padding: "8px 12px", color: textSecondary }}>Page {safeCurrentPage} / {totalPages}</span>
                          <button
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={safeCurrentPage === totalPages}
                            style={{ padding: "8px 12px", border: `1px solid ${borderColor}`, borderRadius: 8, background: "transparent", cursor: safeCurrentPage === totalPages ? "not-allowed" : "pointer", color: textPrimary }}
                          >
                            Suivant <ChevronRight size={16} />
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
                        {paginatedEcoles.map((ecole) => (
                          <SchoolCard
                            key={ecole._id}
                            ecole={ecole}
                            onSelectEcole={onSelectEcole}
                            onToggleStatus={handleToggleStatus}
                            onDelete={handleDeleteEcole}
                            dark={dark}
                            borderColor={borderColor}
                            accentColor={accentColor}
                            textPrimary={textPrimary}
                            textSecondary={textSecondary}
                            selected={selectedSchoolIds.has(ecole._id)}
                            onToggleSelect={toggleSchoolSelection}
                          />
                        ))}
                      </div>
                      {/* Pagination */}
                      {totalPages > 1 && (
                        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 16 }}>
                          <button
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={safeCurrentPage === 1}
                            style={{ padding: "8px 12px", border: `1px solid ${borderColor}`, borderRadius: 8, background: "transparent", cursor: safeCurrentPage === 1 ? "not-allowed" : "pointer", color: textPrimary }}
                          >
                            <ChevronLeft size={16} /> Précédent
                          </button>
                          <span style={{ padding: "8px 12px", color: textSecondary }}>Page {safeCurrentPage} / {totalPages}</span>
                          <button
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={safeCurrentPage === totalPages}
                            style={{ padding: "8px 12px", border: `1px solid ${borderColor}`, borderRadius: 8, background: "transparent", cursor: safeCurrentPage === totalPages ? "not-allowed" : "pointer", color: textPrimary }}
                          >
                            Suivant <ChevronRight size={16} />
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {activeSection === "pending" && (
                <PendingTab
                  pendingUsers={filteredPending}
                  user={user}
                  searchTerm={pendingSearch}
                  setSearchTerm={setPendingSearch}
                  filterRole={pendingFilterRole}
                  setFilterRole={setPendingFilterRole}
                />
              )}

              {activeSection === "superadmins" && <GestionSuperAdmins user={user} />}

              {activeSection === "settings" && <SettingsTab user={user} />}
            </>
          )}
        </div>
      </main>

      {/* Modale de création */}
      {showCreateModal && (
        <div className="fade-in" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }} onClick={() => setShowCreateModal(false)}>
          <div style={{ background: dark ? "#1E293B" : "#FFFFFF", borderRadius: 16, padding: 24, width: "100%", maxWidth: 400, boxShadow: dark ? "0 20px 40px rgba(0,0,0,0.5)" : "0 20px 40px rgba(0,0,0,0.2)", border: `1px solid ${borderColor}` }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: textPrimary }}>Nouvelle école</h3>
              <button onClick={() => setShowCreateModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: textSecondary }}><X size={24} /></button>
            </div>
            <form onSubmit={handleAddEcole}>
              <input placeholder="Nom de l'école" value={nouveauNom} onChange={(e) => setNouveauNom(e.target.value)} style={{ width: "100%", padding: "10px 14px", border: `1px solid ${borderColor}`, borderRadius: 8, fontSize: 14, outline: "none", background: dark ? "#0F172A" : "#F9FAFB", color: textPrimary, marginBottom: 16 }} autoFocus />
              <div style={{ display: "flex", gap: 10 }}>
                <button type="submit" style={{ flex: 1, padding: "10px 16px", background: accentColor, color: "white", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer" }}>Créer</button>
                <button type="button" onClick={() => setShowCreateModal(false)} style={{ padding: "10px 16px", background: "transparent", border: `1px solid ${borderColor}`, borderRadius: 8, color: textSecondary, cursor: "pointer" }}>Annuler</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog {...dialogProps} />
    </div>
  );
}