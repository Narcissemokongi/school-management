import { useState, useMemo, useDeferredValue, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useConfirm } from "@/hooks/useConfirm";
import { ConfirmDialog } from "./ConfirmDialog";
import {
  Search, Edit2, Trash2, UserCheck, UserX, Loader,
  Users, UserPlus, Clock, CheckCircle, ChevronLeft, ChevronRight,
  Download, LayoutGrid, List as ListIcon, ChevronRight as ChevronRightIcon,
  SlidersHorizontal, X, Eye,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  AddUserModal,
  DetailUserModal,
  UtilisateursFiltersSheet,
} from "./UtilisateursModals";

// ============================================================
// BADGE DE RÔLE
// ============================================================
export function RoleBadge({ role, dark }) {
  const colors = {
    admin: { bg: dark ? "#7F1D1D" : "#FEE2E2", color: dark ? "#F87171" : "#B91C1C" },
    superAdmin: { bg: dark ? "#7F1D1D" : "#FEE2E2", color: dark ? "#F87171" : "#B91C1C" },
    directeur: { bg: dark ? "#064E3B" : "#D1FAE5", color: dark ? "#34D399" : "#065F46" },
    disciplinaire: { bg: dark ? "#78350F" : "#FEF3C7", color: dark ? "#FBBF24" : "#92400E" },
    enseignant: { bg: dark ? "#312E81" : "#EEF2FF", color: dark ? "#A5B4FC" : "#4F46E5" },
    parent: { bg: dark ? "#082F49" : "#E0F2FE", color: dark ? "#38BDF8" : "#0369A1" },
    comptable: { bg: dark ? "#500724" : "#FCE7F3", color: dark ? "#F472B6" : "#BE185D" },
    eleve: { bg: dark ? "#2E1065" : "#F3E8FF", color: dark ? "#C084FC" : "#6B21A8" },
  };
  const style =
    colors[role] || {
      bg: dark ? "#334155" : "#F1F5F9",
      color: dark ? "#CBD5E1" : "#475569",
    };
  return (
    <span
      style={{
        background: style.bg,
        color: style.color,
        padding: "2px 8px",
        borderRadius: 10,
        fontSize: 11,
        fontWeight: 600,
        textTransform: "capitalize",
      }}
    >
      {role}
    </span>
  );
}

// ============================================================
// CARTE STATISTIQUE COMPACTE
// ============================================================
function StatCard({ icon, label, value, color, dark, isMobile }) {
  return (
    <div
      style={{
        background: dark ? "#1E293B" : "#FFFFFF",
        borderRadius: 12,
        padding: isMobile ? "10px 12px" : "14px 16px",
        boxShadow: dark ? "0 1px 2px rgba(0,0,0,0.25)" : "0 1px 2px rgba(0,0,0,0.04)",
        border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
        display: "flex",
        alignItems: "center",
        gap: 10,
        minWidth: isMobile ? 130 : "auto",
        flex: isMobile ? "0 0 auto" : 1,
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: `${color}20`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          color,
        }}
      >
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            color: dark ? "#94A3B8" : "#64748B",
            fontSize: 10.5,
            fontWeight: 500,
            whiteSpace: "nowrap",
            textTransform: "capitalize",
          }}
        >
          {label}
        </div>
        <div
          style={{
            color: dark ? "#F1F5F9" : "#1E293B",
            fontSize: 18,
            fontWeight: 700,
            lineHeight: 1.1,
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// CARTE UTILISATEUR COMPACTE
// ============================================================
function UserCard({ user, dark, isMobile, selected, selectionMode, onToggleSelect, onClick }) {
  const handleClick = () => {
    if (selectionMode) onToggleSelect(user._id);
    else onClick();
  };

  return (
    <div
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      style={{
        background: dark ? "#1E293B" : "#FFFFFF",
        borderRadius: 12,
        padding: isMobile ? "10px 12px" : "12px 14px",
        boxShadow: dark ? "0 1px 2px rgba(0,0,0,0.25)" : "0 1px 2px rgba(0,0,0,0.04)",
        border: `1.5px solid ${
          selected
            ? dark
              ? "#818CF8"
              : "#4F46E5"
            : dark
            ? "#334155"
            : "#E2E8F0"
        }`,
        display: "flex",
        alignItems: "center",
        gap: isMobile ? 10 : 12,
        cursor: "pointer",
        transition: "border-color 0.15s, transform 0.1s",
        userSelect: "none",
        WebkitTapHighlightColor: "transparent",
        minWidth: 0,
      }}
      onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.99)")}
      onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
    >
      <div style={{ position: "relative", flexShrink: 0 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: dark ? "#312E81" : "#EEF2FF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: dark ? "#A5B4FC" : "#4F46E5",
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          {user.nom?.[0]?.toUpperCase()}
          {user.postnom?.[0]?.toUpperCase() || ""}
        </div>
        {selectionMode && (
          <div
            style={{
              position: "absolute",
              top: -4,
              right: -4,
              width: 18,
              height: 18,
              borderRadius: 9,
              background: selected ? (dark ? "#818CF8" : "#4F46E5") : (dark ? "#334155" : "#FFFFFF"),
              border: `2px solid ${dark ? "#1E293B" : "#FFFFFF"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#FFF",
              fontSize: 10,
              fontWeight: 700,
            }}
          >
            {selected ? "✓" : ""}
          </div>
        )}
      </div>

      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontWeight: 600,
            fontSize: isMobile ? 13.5 : 14,
            color: dark ? "#F1F5F9" : "#1E293B",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {user.nom}
        </div>
        <div
          style={{
            fontSize: isMobile ? 11 : 11.5,
            color: dark ? "#94A3B8" : "#64748B",
            marginTop: 2,
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexWrap: "wrap",
          }}
        >
          <RoleBadge role={user.role} dark={dark} />
          <span style={{ opacity: 0.5 }}>·</span>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            @{user.login}
          </span>
          {user.classe && (
            <>
              <span style={{ opacity: 0.5 }}>·</span>
              <span>{user.classe}</span>
            </>
          )}
        </div>
      </div>

      {!selectionMode && (
        <ChevronRightIcon
          size={18}
          color={dark ? "#475569" : "#CBD5E1"}
          style={{ flexShrink: 0 }}
        />
      )}
    </div>
  );
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================
export function GestionUtilisateurs({ ecoleId, userId }) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();
  const { confirm, dialogProps } = useConfirm();

  const [tab, setTab] = useState("actifs");

  // ===== Queries (userId obligatoire partout) =====
  const users = useQuery(
    api.users.listByEcole,
    ecoleId && userId ? { ecoleId, userId } : "skip"
  );
  const pendingUsers = useQuery(
    api.users.listPendingUsers,
    ecoleId && userId ? { ecoleId, userId } : "skip"
  );
  // 🔴 FIX : userId ajouté sur classes.list
  const classes =
    useQuery(
      api.classes.list,
      ecoleId && userId ? { ecoleId, userId } : "skip"
    ) ?? [];

  // ===== Mutations =====
  const addUser = useMutation(api.users.add);
  const updateUser = useMutation(api.users.update);
  const removeUser = useMutation(api.users.remove);
  const approveUser = useMutation(api.users.approveUser);
  const rejectUser = useMutation(api.users.rejectUser);

  // ===== État local =====
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [detailUser, setDetailUser] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [classeFilter, setClasseFilter] = useState("");
  const [sortKey, setSortKey] = useState("nom");
  const [sortDir, setSortDir] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [viewMode, setViewMode] = useState("cards");
  const [showFilters, setShowFilters] = useState(false);
  const [exporting, setExporting] = useState(false);
  const pageSize = 15;

  const deferredSearchTerm = useDeferredValue(searchTerm);
  const headerCheckboxRef = useRef(null);

  // ===== Données dérivées =====
  const classNames = useMemo(
    () => [...new Set(classes.map((c) => c.nom))].sort(),
    [classes]
  );

  const roles = useMemo(() => {
    if (!users) return [];
    const set = new Set(users.map((u) => u.role));
    return Array.from(set).sort();
  }, [users]);

  const stats = useMemo(() => {
    const total = users?.length ?? 0;
    const parRole = {};
    users?.forEach((u) => {
      parRole[u.role] = (parRole[u.role] || 0) + 1;
    });
    return { total, pending: pendingUsers?.length ?? 0, parRole };
  }, [users, pendingUsers]);

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    let list = users.filter((u) => {
      const matchSearch =
        deferredSearchTerm.length === 0 ||
        u.nom.toLowerCase().includes(deferredSearchTerm.toLowerCase()) ||
        u.login.toLowerCase().includes(deferredSearchTerm.toLowerCase());
      const matchRole = !roleFilter || u.role === roleFilter;
      const matchClasse = !classeFilter || u.classe === classeFilter;
      return matchSearch && matchRole && matchClasse;
    });
    list.sort((a, b) => {
      const aVal = (a[sortKey] ?? "").toString().toLowerCase();
      const bVal = (b[sortKey] ?? "").toString().toLowerCase();
      if (sortDir === "asc") return aVal.localeCompare(bVal);
      return bVal.localeCompare(aVal);
    });
    return list;
  }, [users, deferredSearchTerm, roleFilter, classeFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedUsers = filteredUsers.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  const activeFiltersCount = useMemo(() => {
    let n = 0;
    if (searchTerm.trim()) n++;
    if (roleFilter) n++;
    if (classeFilter) n++;
    return n;
  }, [searchTerm, roleFilter, classeFilter]);

  const selectionMode = selectedIds.size > 0;

  // Reset page + sélection quand filtres/tri changent
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [deferredSearchTerm, roleFilter, classeFilter, sortKey, sortDir]);

  // État indeterminate de la checkbox header
  useEffect(() => {
    if (!headerCheckboxRef.current) return;
    const allSelected =
      paginatedUsers.length > 0 &&
      paginatedUsers.every((u) => selectedIds.has(u._id));
    const someSelected = paginatedUsers.some((u) => selectedIds.has(u._id));
    headerCheckboxRef.current.indeterminate = someSelected && !allSelected;
  }, [paginatedUsers, selectedIds]);

  // ==================== HANDLERS ====================
  const resetFilters = () => {
    setSearchTerm("");
    setRoleFilter("");
    setClasseFilter("");
    setCurrentPage(1);
  };

  const openCreate = () => {
    setEditUser(null);
    setShowForm(true);
  };

  const openEdit = (user) => {
    setEditUser(user);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditUser(null);
  };

  const handleDelete = async (id) => {
    const ok = await confirm("Supprimer", "Supprimer cet utilisateur ?");
    if (!ok) return;
    try {
      await removeUser({ id, adminId: userId });
      toast.success("Utilisateur supprimé");
      setDetailUser(null);
    } catch (err) {
      console.error("[GestionUtilisateurs] delete failed:", err);
      toast.error("Impossible de supprimer l'utilisateur");
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const deleteSelected = async () => {
    const ids = Array.from(selectedIds);
    const ok = await confirm(
      "Supprimer la sélection",
      `Supprimer ${ids.length} utilisateur(s) ?`
    );
    if (!ok) return;

    let success = 0;
    let failed = 0;
    for (const id of ids) {
      try {
        await removeUser({ id, adminId: userId });
        success++;
      } catch (err) {
        console.error("[GestionUtilisateurs] bulk delete failed:", err);
        failed++;
      }
    }

    if (success > 0) toast.success(`${success} utilisateur(s) supprimé(s)`);
    if (failed > 0) toast.error(`${failed} suppression(s) ont échoué`);
    setSelectedIds(new Set());
  };

  const handleApprove = async (id) => {
    try {
      await approveUser({ userId: id, adminId: userId });
      toast.success("Utilisateur approuvé");
    } catch (err) {
      console.error("[GestionUtilisateurs] approve failed:", err);
      toast.error("Impossible d'approuver l'utilisateur");
    }
  };

  // 🟡 FIX : guard sur cancel du prompt
  const handleReject = async (id) => {
    const reason = window.prompt("Motif du rejet (optionnel) :");
    if (reason === null) return; // ✅ l'utilisateur a annulé

    try {
      await rejectUser({
        userId: id,
        reason: reason.trim() || undefined,
        adminId: userId,
      });
      toast.success("Utilisateur rejeté");
    } catch (err) {
      console.error("[GestionUtilisateurs] reject failed:", err);
      toast.error("Impossible de rejeter l'utilisateur");
    }
  };

  const handleExportExcel = async () => {
    // 🟢 FIX : garde si rien à exporter
    if (filteredUsers.length === 0) {
      toast.error("Aucune donnée à exporter.");
      return;
    }
    if (exporting) return;
    setExporting(true);
    try {
      const XLSX = await import("xlsx");
      const data = filteredUsers.map((u) => ({
        Nom: u.nom,
        Login: u.login,
        Rôle: u.role,
        Classe: u.classe || "",
      }));
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Utilisateurs");
      XLSX.writeFile(workbook, "utilisateurs.xlsx");
      toast.success("Export Excel réussi.");
    } catch (err) {
      console.error("[GestionUtilisateurs] export failed:", err);
      toast.error("Impossible de générer l'export");
    } finally {
      setExporting(false);
    }
  };

  // ==================== COULEURS ====================
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const accent = dark ? "#818CF8" : "#4F46E5";

  // ==================== LOADING ====================
  if (users === undefined || pendingUsers === undefined) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: 300,
        }}
      >
        <Loader size={32} className="gu-spin" style={{ color: accent }} />
      </div>
    );
  }

  // ==================== RENDU ====================
  return (
    <div
      style={{
        maxWidth: 1280,
        margin: "0 auto",
        padding: isMobile ? "10px 8px 90px" : "20px 16px",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <style>{`
        @keyframes gu-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .gu-spin { animation: gu-spin 1s linear infinite; }
        @keyframes gu-slide-up-bar { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @media (prefers-reduced-motion: reduce) {
          .gu-spin { animation: none !important; }
        }
      `}</style>

      {/* En-tête compact */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 10,
          marginBottom: isMobile ? 12 : 20,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <h2
            style={{
              fontSize: isMobile ? 17 : 22,
              fontWeight: 700,
              color: textPrimary,
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            Utilisateurs
          </h2>
          <p
            style={{
              color: textSecondary,
              marginTop: 2,
              marginBottom: 0,
              fontSize: isMobile ? 11.5 : 13,
            }}
          >
            {stats.total} compte{stats.total > 1 ? "s" : ""}
            {stats.pending > 0 ? ` · ${stats.pending} en attente` : ""}
          </p>
        </div>

        {!isMobile && (
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleExportExcel}
              disabled={exporting}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 8,
                border: `1px solid ${cardBorder}`,
                background: cardBg,
                color: textPrimary,
                fontWeight: 500,
                cursor: exporting ? "not-allowed" : "pointer",
                fontSize: 13,
              }}
            >
              {exporting ? (
                <Loader size={15} className="gu-spin" />
              ) : (
                <Download size={15} />
              )}
              Exporter
            </button>
            <button
              onClick={openCreate}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 8,
                background: accent,
                color: "#FFF",
                border: "none",
                fontWeight: 600,
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              <UserPlus size={15} /> Nouveau
            </button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div
        style={{
          display: isMobile ? "flex" : "grid",
          gridTemplateColumns: isMobile
            ? undefined
            : "repeat(auto-fit, minmax(150px, 1fr))",
          gap: isMobile ? 8 : 12,
          marginBottom: isMobile ? 12 : 18,
          overflowX: isMobile ? "auto" : "visible",
          paddingBottom: isMobile ? 4 : 0,
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
        }}
      >
        <StatCard
          icon={<Users size={16} />}
          label="Total"
          value={stats.total}
          color="#4F46E5"
          dark={dark}
          isMobile={isMobile}
        />
        <StatCard
          icon={<Clock size={16} />}
          label="En attente"
          value={stats.pending}
          color="#F59E0B"
          dark={dark}
          isMobile={isMobile}
        />
        {roles.slice(0, 5).map((role) => (
          <StatCard
            key={role}
            icon={<Users size={16} />}
            label={role}
            value={stats.parRole[role] || 0}
            color="#10B981"
            dark={dark}
            isMobile={isMobile}
          />
        ))}
        {roles.length > 5 && (
          <StatCard
            icon={<Users size={16} />}
            label={`+${roles.length - 5} autres rôles`}
            value={roles
              .slice(5)
              .reduce((sum, r) => sum + (stats.parRole[r] || 0), 0)}
            color="#8B5CF6"
            dark={dark}
            isMobile={isMobile}
          />
        )}
      </div>

      {/* Onglets */}
      <div
        role="tablist"
        style={{
          display: "flex",
          gap: 4,
          borderBottom: `2px solid ${cardBorder}`,
          marginBottom: isMobile ? 12 : 18,
          overflowX: "auto",
          whiteSpace: "nowrap",
          scrollbarWidth: "none",
        }}
      >
        <button
          onClick={() => {
            setTab("actifs");
            setCurrentPage(1);
            setSelectedIds(new Set());
          }}
          role="tab"
          aria-selected={tab === "actifs"}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: isMobile ? "12px 14px" : "12px 18px",
            minHeight: isMobile ? 44 : 42,
            border: "none",
            background: "transparent",
            color: tab === "actifs" ? accent : textSecondary,
            fontWeight: tab === "actifs" ? 700 : 500,
            borderBottom:
              tab === "actifs"
                ? `3px solid ${accent}`
                : "3px solid transparent",
            cursor: "pointer",
            fontSize: isMobile ? 14 : 15,
            flexShrink: 0,
            marginBottom: -2,
          }}
        >
          <UserCheck size={16} /> Comptes
        </button>
        <button
          onClick={() => {
            setTab("pending");
            setSelectedIds(new Set());
          }}
          role="tab"
          aria-selected={tab === "pending"}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: isMobile ? "12px 14px" : "12px 18px",
            minHeight: isMobile ? 44 : 42,
            border: "none",
            background: "transparent",
            color: tab === "pending" ? accent : textSecondary,
            fontWeight: tab === "pending" ? 700 : 500,
            borderBottom:
              tab === "pending"
                ? `3px solid ${accent}`
                : "3px solid transparent",
            cursor: "pointer",
            fontSize: isMobile ? 14 : 15,
            flexShrink: 0,
            marginBottom: -2,
          }}
        >
          <Clock size={16} /> En attente
          {stats.pending > 0 && (
            <span
              style={{
                minWidth: 18,
                height: 18,
                background: dark ? "#78350F" : "#FEF3C7",
                color: dark ? "#FBBF24" : "#92400E",
                borderRadius: 9,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10,
                fontWeight: 700,
                padding: "0 5px",
              }}
            >
              {stats.pending}
            </span>
          )}
        </button>
      </div>

      {/* Contenu */}
      {tab === "actifs" ? (
        <>
          {/* Barre outils */}
          {isMobile ? (
            <div
              style={{
                display: "flex",
                gap: 8,
                marginBottom: 12,
                alignItems: "stretch",
              }}
            >
              <div style={{ position: "relative", flex: 1 }}>
                <Search
                  size={16}
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: textSecondary,
                  }}
                />
                <input
                  placeholder="Rechercher…"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  style={{
                    width: "100%",
                    padding: "12px 12px 12px 38px",
                    borderRadius: 12,
                    border: `1px solid ${cardBorder}`,
                    background: cardBg,
                    color: textPrimary,
                    fontSize: 16,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <button
                onClick={() => setShowFilters(true)}
                style={{
                  position: "relative",
                  padding: "0 14px",
                  borderRadius: 12,
                  border: `1px solid ${
                    activeFiltersCount > 0 ? accent : cardBorder
                  }`,
                  background:
                    activeFiltersCount > 0
                      ? dark
                        ? "#312E81"
                        : "#EEF2FF"
                      : cardBg,
                  color:
                    activeFiltersCount > 0
                      ? dark
                        ? "#C7D2FE"
                        : "#4F46E5"
                      : textPrimary,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontWeight: 600,
                  fontSize: 13,
                }}
              >
                <SlidersHorizontal size={16} />
                {activeFiltersCount > 0 && (
                  <span
                    style={{
                      background: accent,
                      color: "#FFF",
                      borderRadius: 10,
                      padding: "1px 6px",
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  >
                    {activeFiltersCount}
                  </span>
                )}
              </button>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                gap: 10,
                marginBottom: 16,
                alignItems: "stretch",
                flexWrap: "wrap",
              }}
            >
              <div style={{ position: "relative", flex: 1, minWidth: 240 }}>
                <Search
                  size={16}
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: textSecondary,
                  }}
                />
                <input
                  placeholder="Rechercher par nom ou login…"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  style={{
                    width: "100%",
                    padding: "10px 12px 10px 38px",
                    borderRadius: 8,
                    border: `1px solid ${cardBorder}`,
                    background: cardBg,
                    color: textPrimary,
                    fontSize: 14,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: `1px solid ${cardBorder}`,
                  background: cardBg,
                  color: textPrimary,
                  fontSize: 14,
                  cursor: "pointer",
                  minWidth: 160,
                }}
              >
                <option value="">Tous les rôles</option>
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <select
                value={classeFilter}
                onChange={(e) => {
                  setClasseFilter(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: `1px solid ${cardBorder}`,
                  background: cardBg,
                  color: textPrimary,
                  fontSize: 14,
                  cursor: "pointer",
                  minWidth: 160,
                }}
              >
                <option value="">Toutes les classes</option>
                {classNames.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <div
                style={{
                  display: "flex",
                  gap: 4,
                  padding: 4,
                  background: cardBg,
                  borderRadius: 8,
                  border: `1px solid ${cardBorder}`,
                }}
              >
                <button
                  onClick={() => setViewMode("table")}
                  style={{
                    padding: 6,
                    borderRadius: 6,
                    border: "none",
                    background:
                      viewMode === "table"
                        ? dark
                          ? "#312E81"
                          : "#EEF2FF"
                        : "transparent",
                    color:
                      viewMode === "table"
                        ? dark
                          ? "#A5B4FC"
                          : "#4F46E5"
                        : textSecondary,
                    cursor: "pointer",
                  }}
                  title="Tableau"
                >
                  <ListIcon size={16} />
                </button>
                <button
                  onClick={() => setViewMode("cards")}
                  style={{
                    padding: 6,
                    borderRadius: 6,
                    border: "none",
                    background:
                      viewMode === "cards"
                        ? dark
                          ? "#312E81"
                          : "#EEF2FF"
                        : "transparent",
                    color:
                      viewMode === "cards"
                        ? dark
                          ? "#A5B4FC"
                          : "#4F46E5"
                        : textSecondary,
                    cursor: "pointer",
                  }}
                  title="Cartes"
                >
                  <LayoutGrid size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Puces filtres actifs */}
          {activeFiltersCount > 0 && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
                marginBottom: 12,
              }}
            >
              {searchTerm.trim() && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "4px 10px",
                    background: dark ? "#312E81" : "#EEF2FF",
                    color: dark ? "#C7D2FE" : "#4F46E5",
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  « {searchTerm} »
                  <X
                    size={12}
                    style={{ cursor: "pointer" }}
                    onClick={() => setSearchTerm("")}
                  />
                </span>
              )}
              {roleFilter && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "4px 10px",
                    background: dark ? "#312E81" : "#EEF2FF",
                    color: dark ? "#C7D2FE" : "#4F46E5",
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  {roleFilter}
                  <X
                    size={12}
                    style={{ cursor: "pointer" }}
                    onClick={() => setRoleFilter("")}
                  />
                </span>
              )}
              {classeFilter && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "4px 10px",
                    background: dark ? "#312E81" : "#EEF2FF",
                    color: dark ? "#C7D2FE" : "#4F46E5",
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  {classeFilter}
                  <X
                    size={12}
                    style={{ cursor: "pointer" }}
                    onClick={() => setClasseFilter("")}
                  />
                </span>
              )}
              <button
                onClick={resetFilters}
                style={{
                  padding: "4px 10px",
                  background: "transparent",
                  border: `1px solid ${cardBorder}`,
                  color: textSecondary,
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Tout effacer
              </button>
            </div>
          )}

          {/* Liste : table desktop / cards mobile */}
          {!isMobile && viewMode === "table" ? (
            <div
              style={{
                background: cardBg,
                borderRadius: 12,
                overflow: "hidden",
                boxShadow: dark
                  ? "0 1px 3px rgba(0,0,0,0.3)"
                  : "0 1px 3px rgba(0,0,0,0.05)",
                border: `1px solid ${cardBorder}`,
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 14,
                }}
              >
                <thead>
                  <tr
                    style={{
                      background: dark ? "#0F172A" : "#F8FAFC",
                      borderBottom: `2px solid ${cardBorder}`,
                    }}
                  >
                    <th style={{ padding: "12px 14px", width: 40 }}>
                      <input
                        ref={headerCheckboxRef}
                        type="checkbox"
                        checked={
                          paginatedUsers.length > 0 &&
                          paginatedUsers.every((u) => selectedIds.has(u._id))
                        }
                        onChange={() => {
                          const allSelected = paginatedUsers.every((u) =>
                            selectedIds.has(u._id)
                          );
                          if (allSelected) {
                            setSelectedIds((prev) => {
                              const next = new Set(prev);
                              paginatedUsers.forEach((u) => next.delete(u._id));
                              return next;
                            });
                          } else {
                            setSelectedIds((prev) => {
                              const next = new Set(prev);
                              paginatedUsers.forEach((u) => next.add(u._id));
                              return next;
                            });
                          }
                        }}
                        style={{ accentColor: accent }}
                      />
                    </th>
                    <th
                      style={{
                        padding: "12px 14px",
                        textAlign: "left",
                        color: textSecondary,
                        fontWeight: 600,
                        cursor: "pointer",
                        fontSize: 12,
                        textTransform: "uppercase",
                        letterSpacing: 0.3,
                      }}
                      onClick={() => {
                        if (sortKey === "nom")
                          setSortDir((d) => (d === "asc" ? "desc" : "asc"));
                        else {
                          setSortKey("nom");
                          setSortDir("asc");
                        }
                      }}
                    >
                      Nom
                    </th>
                    <th
                      style={{
                        padding: "12px 14px",
                        textAlign: "left",
                        color: textSecondary,
                        fontWeight: 600,
                        fontSize: 12,
                        textTransform: "uppercase",
                        letterSpacing: 0.3,
                      }}
                    >
                      Login
                    </th>
                    <th
                      style={{
                        padding: "12px 14px",
                        textAlign: "left",
                        color: textSecondary,
                        fontWeight: 600,
                        fontSize: 12,
                        textTransform: "uppercase",
                        letterSpacing: 0.3,
                      }}
                    >
                      Rôle
                    </th>
                    <th
                      style={{
                        padding: "12px 14px",
                        textAlign: "left",
                        color: textSecondary,
                        fontWeight: 600,
                        fontSize: 12,
                        textTransform: "uppercase",
                        letterSpacing: 0.3,
                      }}
                    >
                      Classe
                    </th>
                    <th
                      style={{
                        padding: "12px 14px",
                        textAlign: "center",
                        color: textSecondary,
                        fontWeight: 600,
                        fontSize: 12,
                        textTransform: "uppercase",
                        letterSpacing: 0.3,
                      }}
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedUsers.map((u) => {
                    const isSelected = selectedIds.has(u._id);
                    return (
                      <tr
                        key={u._id}
                        style={{
                          borderBottom: `1px solid ${cardBorder}`,
                          background: isSelected
                            ? dark
                              ? "#2D3748"
                              : "#F1F5F9"
                            : "transparent",
                          cursor: "pointer",
                        }}
                        onClick={() => {
                          if (selectionMode) toggleSelect(u._id);
                          else setDetailUser(u);
                        }}
                      >
                        <td
                          style={{ padding: "12px 14px" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(u._id)}
                            style={{ accentColor: accent }}
                          />
                        </td>
                        <td
                          style={{
                            padding: "12px 14px",
                            color: textPrimary,
                            fontWeight: 500,
                          }}
                        >
                          {u.nom}
                        </td>
                        <td
                          style={{
                            padding: "12px 14px",
                            color: textSecondary,
                          }}
                        >
                          @{u.login}
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <RoleBadge role={u.role} dark={dark} />
                        </td>
                        <td
                          style={{
                            padding: "12px 14px",
                            color: textSecondary,
                          }}
                        >
                          {u.classe || "—"}
                        </td>
                        <td
                          style={{
                            padding: "12px 14px",
                            textAlign: "center",
                            whiteSpace: "nowrap",
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => setDetailUser(u)}
                            title="Détails"
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: accent,
                              padding: 6,
                              marginRight: 4,
                            }}
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => openEdit(u)}
                            title="Modifier"
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: "#3B82F6",
                              padding: 6,
                              marginRight: 4,
                            }}
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(u._id)}
                            title="Supprimer"
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: "#EF4444",
                              padding: 6,
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {paginatedUsers.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        style={{
                          padding: 40,
                          textAlign: "center",
                          color: textSecondary,
                        }}
                      >
                        Aucun utilisateur trouvé.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : "repeat(auto-fill, minmax(300px, 1fr))",
                gap: isMobile ? 8 : 12,
              }}
            >
              {paginatedUsers.map((u) => (
                <UserCard
                  key={u._id}
                  user={u}
                  dark={dark}
                  isMobile={isMobile}
                  selected={selectedIds.has(u._id)}
                  selectionMode={selectionMode}
                  onToggleSelect={toggleSelect}
                  onClick={() => setDetailUser(u)}
                />
              ))}
              {paginatedUsers.length === 0 && (
                <div
                  style={{
                    gridColumn: "1 / -1",
                    textAlign: "center",
                    padding: 40,
                    color: textSecondary,
                  }}
                >
                  Aucun utilisateur trouvé.
                </div>
              )}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: 8,
                marginTop: 16,
                flexWrap: "wrap",
              }}
            >
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                style={{
                  background: "none",
                  border: `1px solid ${cardBorder}`,
                  borderRadius: 8,
                  padding: isMobile ? "10px 12px" : "6px 12px",
                  cursor: safePage === 1 ? "not-allowed" : "pointer",
                  color: safePage === 1 ? "#CBD5E1" : accent,
                  opacity: safePage === 1 ? 0.5 : 1,
                }}
              >
                <ChevronLeft size={18} />
              </button>
              <span
                style={{
                  fontSize: 13,
                  color: textSecondary,
                  padding: "0 8px",
                }}
              >
                Page {safePage} / {totalPages}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={safePage === totalPages}
                style={{
                  background: "none",
                  border: `1px solid ${cardBorder}`,
                  borderRadius: 8,
                  padding: isMobile ? "10px 12px" : "6px 12px",
                  cursor:
                    safePage === totalPages ? "not-allowed" : "pointer",
                  color: safePage === totalPages ? "#CBD5E1" : accent,
                  opacity: safePage === totalPages ? 0.5 : 1,
                }}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </>
      ) : (
        /* ============== ONGLET PENDING ============== */
        <div>
          {pendingUsers.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: 48,
                color: textSecondary,
              }}
            >
              <CheckCircle
                size={48}
                color="#10B981"
                style={{ marginBottom: 12, opacity: 0.6 }}
              />
              <p style={{ margin: 0, fontSize: 13.5 }}>
                Aucune demande en attente.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : "repeat(auto-fill, minmax(320px, 1fr))",
                gap: isMobile ? 8 : 12,
              }}
            >
              {pendingUsers.map((u) => (
                <div
                  key={u._id}
                  style={{
                    background: cardBg,
                    borderRadius: 12,
                    padding: isMobile ? "12px 14px" : "14px 16px",
                    border: `1px solid ${cardBorder}`,
                    boxShadow: dark
                      ? "0 1px 2px rgba(0,0,0,0.25)"
                      : "0 1px 2px rgba(0,0,0,0.04)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: dark ? "#78350F" : "#FEF3C7",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: dark ? "#FBBF24" : "#92400E",
                        fontWeight: 700,
                        fontSize: 13,
                        flexShrink: 0,
                      }}
                    >
                      {u.nom?.[0]?.toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: 13.5,
                          color: textPrimary,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {u.nom}
                      </div>
                      <div
                        style={{
                          fontSize: 11.5,
                          color: textSecondary,
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          marginTop: 2,
                        }}
                      >
                        <RoleBadge role={u.role} dark={dark} />
                        <span>@{u.login}</span>
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      marginTop: "auto",
                    }}
                  >
                    <button
                      onClick={() => handleApprove(u._id)}
                      style={{
                        flex: 1,
                        background: "#10B981",
                        color: "white",
                        border: "none",
                        borderRadius: 10,
                        padding: "10px 12px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      <UserCheck size={15} /> Approuver
                    </button>
                    <button
                      onClick={() => handleReject(u._id)}
                      style={{
                        flex: 1,
                        background: "#EF4444",
                        color: "white",
                        border: "none",
                        borderRadius: 10,
                        padding: "10px 12px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      <UserX size={15} /> Rejeter
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Barre actions groupées */}
      {selectionMode && tab === "actifs" && (
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            background: cardBg,
            borderTop: `1px solid ${cardBorder}`,
            padding: "10px 14px calc(10px + env(safe-area-inset-bottom))",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            zIndex: 950,
            boxShadow: "0 -4px 20px rgba(0,0,0,0.15)",
            animation: "gu-slide-up-bar 0.2s ease-out",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                background: dark ? "#312E81" : "#EEF2FF",
                color: dark ? "#C7D2FE" : "#4F46E5",
                borderRadius: 20,
                padding: "4px 10px",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {selectedIds.size}
            </div>
            <button
              onClick={() => setSelectedIds(new Set())}
              style={{
                background: "none",
                border: "none",
                color: textSecondary,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Annuler
            </button>
          </div>
          <button
            onClick={deleteSelected}
            style={{
              padding: "10px 16px",
              borderRadius: 10,
              border: "none",
              background: "#DC2626",
              color: "#FFF",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            <Trash2 size={16} /> Supprimer
          </button>
        </div>
      )}

      {/* FAB ajouter (mobile) */}
      {isMobile && tab === "actifs" && !selectionMode && (
        <button
          onClick={openCreate}
          style={{
            position: "fixed",
            bottom: 24,
            right: 20,
            width: 56,
            height: 56,
            borderRadius: 28,
            background: accent,
            color: "#FFFFFF",
            border: "none",
            boxShadow: "0 6px 20px rgba(79,70,229,0.4)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 900,
            transition: "transform 0.15s ease",
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.94)")}
          onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          title="Nouveau compte"
        >
          <UserPlus size={24} />
        </button>
      )}

      {/* Bottom sheet filtres */}
      <UtilisateursFiltersSheet
        open={showFilters}
        onClose={() => setShowFilters(false)}
        dark={dark}
        searchTerm={searchTerm}
        setSearchTerm={(v) => {
          setSearchTerm(v);
          setCurrentPage(1);
        }}
        roleFilter={roleFilter}
        setRoleFilter={(v) => {
          setRoleFilter(v);
          setCurrentPage(1);
        }}
        classeFilter={classeFilter}
        setClasseFilter={(v) => {
          setClasseFilter(v);
          setCurrentPage(1);
        }}
        roles={roles}
        classNames={classNames}
        onReset={resetFilters}
        activeFiltersCount={activeFiltersCount}
        onImportExcel={handleExportExcel}
        exporting={exporting}
      />

      {/* Modale ajout / édition */}
      <AddUserModal
        open={showForm}
        onClose={handleCloseForm}
        editUser={editUser}
        addUser={addUser}
        updateUser={updateUser}
        ecoleId={ecoleId}
        userId={userId}
        classNames={classNames}
        dark={dark}
        isMobile={isMobile}
      />

      {/* Modale détail */}
      {detailUser && (
        <DetailUserModal
          user={detailUser}
          onClose={() => setDetailUser(null)}
          onEdit={() => {
            setDetailUser(null);
            openEdit(detailUser);
          }}
          onDelete={() => handleDelete(detailUser._id)}
          dark={dark}
          isMobile={isMobile}
        />
      )}

      <ConfirmDialog {...dialogProps} />
    </div>
  );
}