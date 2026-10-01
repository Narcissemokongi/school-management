// src/components/GestionUtilisateurs.jsx
import { useState, useMemo, useDeferredValue, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useConfirm } from "@/hooks/useConfirm";
import { ConfirmDialog } from "./ConfirmDialog";
import {
  Search, Edit2, Trash2, UserCheck, UserX, Loader,
  Users, UserPlus, Clock, CheckCircle, ChevronLeft, ChevronRight,
  Download, LayoutGrid, List as ListIcon,
  SlidersHorizontal, X, Eye,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  AddUserModal,
  DetailUserModal,
  UtilisateursFiltersSheet,
} from "./UtilisateursModals";
import { Fab } from "./ui/Fab";

// ════════════════════════════════════════════════════════════════════
// SAFE-AREA
// ════════════════════════════════════════════════════════════════════
const SAFE_TOP = "env(safe-area-inset-top, 0px)";
const SAFE_BOTTOM = "env(safe-area-inset-bottom, 0px)";
const SAFE_LEFT = "env(safe-area-inset-left, 0px)";
const SAFE_RIGHT = "env(safe-area-inset-right, 0px)";

const MOBILE_TAP = 44;

// ════════════════════════════════════════════════════════════════════
// KEYFRAMES module-level
// ════════════════════════════════════════════════════════════════════
const GestionUtilisateursKeyframes = (
  <style>{`
    @keyframes gu-spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
    @keyframes gu-slide-up-bar {
      from { transform: translateY(100%); }
      to   { transform: translateY(0); }
    }
    .gu-spin { animation: gu-spin 1s linear infinite; }
    .gu-slide-up-bar { animation: gu-slide-up-bar 0.2s ease-out; }
    @media (prefers-reduced-motion: reduce) {
      .gu-spin, .gu-slide-up-bar { animation: none !important; }
    }
  `}</style>
);

// ════════════════════════════════════════════════════════════════════
// BADGE DE RÔLE
// ════════════════════════════════════════════════════════════════════
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
        flexShrink: 0,
      }}
    >
      {role}
    </span>
  );
}

// ════════════════════════════════════════════════════════════════════
// CARTE STATISTIQUE COMPACTE
// ════════════════════════════════════════════════════════════════════
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
        gap: isMobile ? 8 : 10,
        minWidth: 0,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: isMobile ? 28 : 32,
          height: isMobile ? 28 : 32,
          borderRadius: 8,
          background: `${color}20`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          color,
        }}
        aria-hidden="true"
      >
        {icon}
      </div>
      <div style={{ minWidth: 0, overflow: "hidden" }}>
        <div
          style={{
            color: dark ? "#94A3B8" : "#64748B",
            fontSize: isMobile ? 10 : 10.5,
            fontWeight: 500,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            textTransform: "capitalize",
          }}
        >
          {label}
        </div>
        <div
          style={{
            color: dark ? "#F1F5F9" : "#1E293B",
            fontSize: isMobile ? 16 : 18,
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

// ════════════════════════════════════════════════════════════════════
// CARTE UTILISATEUR — ✨ refactorée avec state React
// ════════════════════════════════════════════════════════════════════
function UserCard({ user, dark, isMobile, selected, selectionMode, onToggleSelect, onClick }) {
  const [pressed, setPressed] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);

  const handleClick = () => {
    if (selectionMode) onToggleSelect(user._id);
    else onClick();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  };

  const handleTouchStart = () => setPressed(true);
  const handleTouchEnd = () => setPressed(false);
  const handleTouchCancel = () => setPressed(false);

  return (
    <div
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => !isMobile && setHovered(true)}
      onMouseLeave={() => !isMobile && setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      style={{
        background: dark ? "#1E293B" : "#FFFFFF",
        borderRadius: 12,
        padding: isMobile ? "10px 12px" : "12px 14px",
        boxShadow: dark ? "0 1px 2px rgba(0,0,0,0.25)" : "0 1px 2px rgba(0,0,0,0.04)",
        border: `1.5px solid ${
          selected || focused
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
        transition: "border-color 0.15s ease, transform 0.1s ease",
        userSelect: "none",
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation",
        minWidth: 0,
        boxSizing: "border-box",
        minHeight: isMobile ? 60 : undefined,
        transform: pressed ? "scale(0.985)" : "scale(1)",
        outline: focused
          ? `2px solid ${dark ? "#818CF8" : "#4F46E5"}`
          : "none",
        outlineOffset: -2,
      }}
      aria-label={`Ouvrir la fiche de ${user.nom}`}
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
          aria-hidden="true"
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
              background: selected
                ? dark
                  ? "#818CF8"
                  : "#4F46E5"
                : dark
                ? "#334155"
                : "#FFFFFF",
              border: `2px solid ${dark ? "#1E293B" : "#FFFFFF"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#FFF",
              fontSize: 10,
              fontWeight: 700,
            }}
            aria-hidden="true"
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
            minWidth: 0,
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
        <ChevronRight
          size={18}
          color={dark ? "#475569" : "#CBD5E1"}
          style={{ flexShrink: 0 }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// FILTER CHIP — ✨ zone tap 24px
// ════════════════════════════════════════════════════════════════════
function FilterChip({ label, onClear, dark }) {
  const [pressed, setPressed] = useState(false);

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "4px 4px 4px 10px",
        background: dark ? "#312E81" : "#EEF2FF",
        color: dark ? "#C7D2FE" : "#4F46E5",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 600,
        minHeight: 28,
      }}
    >
      {label}
      <button
        type="button"
        onClick={onClear}
        onTouchStart={() => setPressed(true)}
        onTouchEnd={() => setPressed(false)}
        onTouchCancel={() => setPressed(false)}
        aria-label={`Retirer le filtre ${label}`}
        style={{
          background: pressed ? "rgba(0,0,0,0.15)" : "rgba(0,0,0,0.06)",
          border: "none",
          borderRadius: "50%",
          cursor: "pointer",
          color: "inherit",
          width: 24,
          height: 24,
          padding: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: pressed ? "scale(0.85)" : "scale(1)",
          transition: "transform 0.1s ease, background 0.12s ease",
          WebkitTapHighlightColor: "transparent",
          touchAction: "manipulation",
        }}
      >
        <X size={12} />
      </button>
    </span>
  );
}

// ════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ════════════════════════════════════════════════════════════════════
export function GestionUtilisateurs({ ecoleId, userId }) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();
  const { confirm, dialogProps } = useConfirm();

  const [tab, setTab] = useState("actifs");
  // ✨ Feedback tap
  const [pressedBtn, setPressedBtn] = useState(null);
  const [focusedSearch, setFocusedSearch] = useState(false);

  const pressBtn = useCallback((id) => () => setPressedBtn(id), []);
  const releaseBtn = useCallback(() => setPressedBtn(null), []);

  // Queries
  const users = useQuery(
    api.users.listByEcole,
    ecoleId && userId ? { ecoleId, userId } : "skip"
  );
  const pendingUsers = useQuery(
    api.users.listPendingUsers,
    ecoleId && userId ? { ecoleId, userId } : "skip"
  );
  const classes =
    useQuery(
      api.classes.list,
      ecoleId && userId ? { ecoleId, userId } : "skip"
    ) ?? [];

  // Mutations
  const addUser = useMutation(api.users.add);
  const updateUser = useMutation(api.users.update);
  const removeUser = useMutation(api.users.remove);
  const approveUser = useMutation(api.users.approveUser);
  const rejectUser = useMutation(api.users.rejectUser);

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

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [deferredSearchTerm, roleFilter, classeFilter, sortKey, sortDir]);

  useEffect(() => {
    if (!headerCheckboxRef.current) return;
    const allSelected =
      paginatedUsers.length > 0 &&
      paginatedUsers.every((u) => selectedIds.has(u._id));
    const someSelected = paginatedUsers.some((u) => selectedIds.has(u._id));
    headerCheckboxRef.current.indeterminate = someSelected && !allSelected;
  }, [paginatedUsers, selectedIds]);

  // Handlers
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

  const handleReject = async (id) => {
    const reason = window.prompt("Motif du rejet (optionnel) :");
    if (reason === null) return;

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

  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const accent = dark ? "#818CF8" : "#4F46E5";

  if (users === undefined || pendingUsers === undefined) {
    return (
      <>
        {GestionUtilisateursKeyframes}
        <div
          role="status"
          aria-live="polite"
          aria-busy="true"
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: 300,
          }}
        >
          <Loader size={32} className="gu-spin" style={{ color: accent }} aria-hidden="true" />
        </div>
      </>
    );
  }

  // Padding container avec safe-area
  const containerPadding = isMobile
    ? `calc(10px + ${SAFE_TOP}) calc(8px + ${SAFE_RIGHT}) calc(90px + ${SAFE_BOTTOM}) calc(8px + ${SAFE_LEFT})`
    : "20px 16px";

  // Bouton tableau (Eye/Edit/Trash) helper
  const tableActionBtn = (pressedKey, color, icon, onClick, label) => (
    <button
      type="button"
      onClick={onClick}
      onTouchStart={pressBtn(pressedKey)}
      onTouchEnd={releaseBtn}
      onTouchCancel={releaseBtn}
      aria-label={label}
      title={label}
      style={{
        background: "transparent",
        border: "none",
        cursor: "pointer",
        color,
        padding: 0,
        minWidth: MOBILE_TAP,
        minHeight: MOBILE_TAP,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 8,
        transform: pressedBtn === pressedKey ? "scale(0.9)" : "scale(1)",
        transition: "transform 0.1s ease",
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation",
      }}
    >
      {icon}
    </button>
  );

  return (
    <>
      {GestionUtilisateursKeyframes}
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: containerPadding,
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {/* ═══ EN-TÊTE ═══ */}
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
                type="button"
                onClick={handleExportExcel}
                disabled={exporting}
                onTouchStart={!exporting ? pressBtn("export-header") : undefined}
                onTouchEnd={releaseBtn}
                onTouchCancel={releaseBtn}
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
                  transform: pressedBtn === "export-header" ? "scale(0.97)" : "scale(1)",
                  transition: "transform 0.1s ease",
                  WebkitTapHighlightColor: "transparent",
                  touchAction: "manipulation",
                  fontFamily: "inherit",
                }}
              >
                {exporting ? (
                  <Loader size={15} className="gu-spin" aria-hidden="true" />
                ) : (
                  <Download size={15} aria-hidden="true" />
                )}
                Exporter
              </button>
              <button
                type="button"
                onClick={openCreate}
                onTouchStart={pressBtn("new-header")}
                onTouchEnd={releaseBtn}
                onTouchCancel={releaseBtn}
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
                  transform: pressedBtn === "new-header" ? "scale(0.97)" : "scale(1)",
                  transition: "transform 0.1s ease",
                  WebkitTapHighlightColor: "transparent",
                  touchAction: "manipulation",
                  fontFamily: "inherit",
                }}
              >
                <UserPlus size={15} aria-hidden="true" /> Nouveau
              </button>
            </div>
          )}
        </div>

        {/* ═══ STATS — ✨ grille 2×2 mobile ═══ */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile
              ? "repeat(2, minmax(0, 1fr))"
              : "repeat(auto-fit, minmax(150px, 1fr))",
            gap: isMobile ? 8 : 12,
            marginBottom: isMobile ? 12 : 18,
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
              label={`+${roles.length - 5} autres`}
              value={roles
                .slice(5)
                .reduce((sum, r) => sum + (stats.parRole[r] || 0), 0)}
              color="#8B5CF6"
              dark={dark}
              isMobile={isMobile}
            />
          )}
        </div>

        {/* ═══ ONGLETS ═══ */}
        <div
          role="tablist"
          aria-label="Sections utilisateurs"
          style={{
            display: "flex",
            gap: 4,
            borderBottom: `2px solid ${cardBorder}`,
            marginBottom: isMobile ? 12 : 18,
            overflowX: "auto",
            whiteSpace: "nowrap",
            scrollbarWidth: "none",
            WebkitOverflowScrolling: "touch",
            overscrollBehavior: "contain",
          }}
        >
          <button
            type="button"
            onClick={() => {
              setTab("actifs");
              setCurrentPage(1);
              setSelectedIds(new Set());
            }}
            onTouchStart={pressBtn("tab-actifs")}
            onTouchEnd={releaseBtn}
            onTouchCancel={releaseBtn}
            role="tab"
            aria-selected={tab === "actifs"}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: isMobile ? "12px 14px" : "12px 18px",
              minHeight: isMobile ? MOBILE_TAP : 42,
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
              transform: pressedBtn === "tab-actifs" ? "scale(0.96)" : "scale(1)",
              transition: "transform 0.1s ease, color 0.15s ease",
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
              fontFamily: "inherit",
            }}
          >
            <UserCheck size={16} aria-hidden="true" /> Comptes
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("pending");
              setSelectedIds(new Set());
            }}
            onTouchStart={pressBtn("tab-pending")}
            onTouchEnd={releaseBtn}
            onTouchCancel={releaseBtn}
            role="tab"
            aria-selected={tab === "pending"}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: isMobile ? "12px 14px" : "12px 18px",
              minHeight: isMobile ? MOBILE_TAP : 42,
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
              transform: pressedBtn === "tab-pending" ? "scale(0.96)" : "scale(1)",
              transition: "transform 0.1s ease, color 0.15s ease",
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
              fontFamily: "inherit",
            }}
          >
            <Clock size={16} aria-hidden="true" /> En attente
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

        {/* ═══ CONTENU ═══ */}
        {tab === "actifs" ? (
          <>
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
                      pointerEvents: "none",
                    }}
                    aria-hidden="true"
                  />
                  <input
                    placeholder="Rechercher…"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    onFocus={() => setFocusedSearch(true)}
                    onBlur={() => setFocusedSearch(false)}
                    inputMode="search"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck="false"
                    aria-label="Rechercher un utilisateur"
                    style={{
                      width: "100%",
                      padding: "12px 12px 12px 38px",
                      borderRadius: 12,
                      border: `1px solid ${
                        focusedSearch ? accent : cardBorder
                      }`,
                      background: cardBg,
                      color: textPrimary,
                      fontSize: 16,
                      outline: "none",
                      boxSizing: "border-box",
                      fontFamily: "inherit",
                      minHeight: MOBILE_TAP,
                      transition: "border-color 0.15s ease",
                      WebkitAppearance: "none",
                      WebkitTapHighlightColor: "transparent",
                      touchAction: "manipulation",
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowFilters(true)}
                  onTouchStart={pressBtn("filters")}
                  onTouchEnd={releaseBtn}
                  onTouchCancel={releaseBtn}
                  aria-label="Ouvrir les filtres"
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
                    minHeight: MOBILE_TAP,
                    minWidth: MOBILE_TAP,
                    transform: pressedBtn === "filters" ? "scale(0.97)" : "scale(1)",
                    transition: "transform 0.1s ease",
                    WebkitTapHighlightColor: "transparent",
                    touchAction: "manipulation",
                    fontFamily: "inherit",
                  }}
                >
                  <SlidersHorizontal size={16} aria-hidden="true" />
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
                    aria-hidden="true"
                  />
                  <input
                    placeholder="Rechercher par nom ou login…"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    inputMode="search"
                    autoComplete="off"
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
                      fontFamily: "inherit",
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
                    fontFamily: "inherit",
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
                    fontFamily: "inherit",
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
                    type="button"
                    onClick={() => setViewMode("table")}
                    aria-label="Vue tableau"
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
                      WebkitTapHighlightColor: "transparent",
                      touchAction: "manipulation",
                    }}
                  >
                    <ListIcon size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("cards")}
                    aria-label="Vue cartes"
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
                      WebkitTapHighlightColor: "transparent",
                      touchAction: "manipulation",
                    }}
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
                  <FilterChip
                    label={`« ${searchTerm} »`}
                    onClear={() => setSearchTerm("")}
                    dark={dark}
                  />
                )}
                {roleFilter && (
                  <FilterChip
                    label={roleFilter}
                    onClear={() => setRoleFilter("")}
                    dark={dark}
                  />
                )}
                {classeFilter && (
                  <FilterChip
                    label={classeFilter}
                    onClear={() => setClasseFilter("")}
                    dark={dark}
                  />
                )}
                <button
                  type="button"
                  onClick={resetFilters}
                  style={{
                    padding: "6px 12px",
                    background: "transparent",
                    border: `1px solid ${cardBorder}`,
                    color: textSecondary,
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                    minHeight: 32,
                    WebkitTapHighlightColor: "transparent",
                    touchAction: "manipulation",
                    fontFamily: "inherit",
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
                      <th style={{ padding: "12px 14px", width: 60 }}>
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
                          style={{ accentColor: accent, width: 18, height: 18 }}
                          aria-label="Sélectionner tout"
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
                      <th style={{ padding: "12px 14px", textAlign: "left", color: textSecondary, fontWeight: 600, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.3 }}>
                        Login
                      </th>
                      <th style={{ padding: "12px 14px", textAlign: "left", color: textSecondary, fontWeight: 600, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.3 }}>
                        Rôle
                      </th>
                      <th style={{ padding: "12px 14px", textAlign: "left", color: textSecondary, fontWeight: 600, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.3 }}>
                        Classe
                      </th>
                      <th style={{ padding: "12px 14px", textAlign: "center", color: textSecondary, fontWeight: 600, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.3 }}>
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
                          <td style={{ padding: "12px 14px" }} onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelect(u._id)}
                              style={{ accentColor: accent, width: 18, height: 18 }}
                              aria-label={`Sélectionner ${u.nom}`}
                            />
                          </td>
                          <td style={{ padding: "12px 14px", color: textPrimary, fontWeight: 500 }}>
                            {u.nom}
                          </td>
                          <td style={{ padding: "12px 14px", color: textSecondary }}>
                            @{u.login}
                          </td>
                          <td style={{ padding: "12px 14px" }}>
                            <RoleBadge role={u.role} dark={dark} />
                          </td>
                          <td style={{ padding: "12px 14px", color: textSecondary }}>
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
                            {tableActionBtn("eye-" + u._id, accent, <Eye size={16} />, () => setDetailUser(u), "Voir les détails")}
                            {tableActionBtn("edit-" + u._id, "#3B82F6", <Edit2 size={16} />, () => openEdit(u), "Modifier")}
                            {tableActionBtn("del-" + u._id, "#EF4444", <Trash2 size={16} />, () => handleDelete(u._id), "Supprimer")}
                          </td>
                        </tr>
                      );
                    })}
                    {paginatedUsers.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ padding: 40, textAlign: "center", color: textSecondary }}>
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
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  onTouchStart={safePage !== 1 ? pressBtn("prev") : undefined}
                  onTouchEnd={releaseBtn}
                  onTouchCancel={releaseBtn}
                  aria-label="Page précédente"
                  style={{
                    background: "transparent",
                    border: `1px solid ${cardBorder}`,
                    borderRadius: 8,
                    padding: 0,
                    cursor: safePage === 1 ? "not-allowed" : "pointer",
                    color: safePage === 1 ? "#CBD5E1" : accent,
                    opacity: safePage === 1 ? 0.5 : 1,
                    width: MOBILE_TAP,
                    height: MOBILE_TAP,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transform: pressedBtn === "prev" && safePage !== 1 ? "scale(0.92)" : "scale(1)",
                    transition: "transform 0.1s ease",
                    WebkitTapHighlightColor: "transparent",
                    touchAction: "manipulation",
                  }}
                >
                  <ChevronLeft size={18} />
                </button>
                <span
                  style={{
                    fontSize: 13,
                    color: textSecondary,
                    padding: "0 8px",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  Page {safePage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={safePage === totalPages}
                  onTouchStart={safePage !== totalPages ? pressBtn("next") : undefined}
                  onTouchEnd={releaseBtn}
                  onTouchCancel={releaseBtn}
                  aria-label="Page suivante"
                  style={{
                    background: "transparent",
                    border: `1px solid ${cardBorder}`,
                    borderRadius: 8,
                    padding: 0,
                    cursor: safePage === totalPages ? "not-allowed" : "pointer",
                    color: safePage === totalPages ? "#CBD5E1" : accent,
                    opacity: safePage === totalPages ? 0.5 : 1,
                    width: MOBILE_TAP,
                    height: MOBILE_TAP,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transform: pressedBtn === "next" && safePage !== totalPages ? "scale(0.92)" : "scale(1)",
                    transition: "transform 0.1s ease",
                    WebkitTapHighlightColor: "transparent",
                    touchAction: "manipulation",
                  }}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </>
        ) : (
          /* ═══ ONGLET PENDING ═══ */
          <div>
            {pendingUsers.length === 0 ? (
              <div style={{ textAlign: "center", padding: 48, color: textSecondary }}>
                <CheckCircle size={48} color="#10B981" style={{ marginBottom: 12, opacity: 0.6 }} aria-hidden="true" />
                <p style={{ margin: 0, fontSize: 13.5 }}>Aucune demande en attente.</p>
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
                      boxSizing: "border-box",
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
                        aria-hidden="true"
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
                    <div style={{ display: "flex", gap: 6, marginTop: "auto" }}>
                      <button
                        type="button"
                        onClick={() => handleApprove(u._id)}
                        onTouchStart={pressBtn("approve-" + u._id)}
                        onTouchEnd={releaseBtn}
                        onTouchCancel={releaseBtn}
                        style={{
                          flex: 1,
                          background: pressedBtn === "approve-" + u._id ? "#059669" : "#10B981",
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
                          minHeight: MOBILE_TAP,
                          transform: pressedBtn === "approve-" + u._id ? "scale(0.97)" : "scale(1)",
                          transition: "transform 0.1s ease, background 0.12s ease",
                          WebkitTapHighlightColor: "transparent",
                          touchAction: "manipulation",
                          fontFamily: "inherit",
                        }}
                      >
                        <UserCheck size={15} aria-hidden="true" /> Approuver
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReject(u._id)}
                        onTouchStart={pressBtn("reject-" + u._id)}
                        onTouchEnd={releaseBtn}
                        onTouchCancel={releaseBtn}
                        style={{
                          flex: 1,
                          background: pressedBtn === "reject-" + u._id ? "#DC2626" : "#EF4444",
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
                          minHeight: MOBILE_TAP,
                          transform: pressedBtn === "reject-" + u._id ? "scale(0.97)" : "scale(1)",
                          transition: "transform 0.1s ease, background 0.12s ease",
                          WebkitTapHighlightColor: "transparent",
                          touchAction: "manipulation",
                          fontFamily: "inherit",
                        }}
                      >
                        <UserX size={15} aria-hidden="true" /> Rejeter
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ BARRE ACTIONS GROUPÉES ═══ */}
        {selectionMode && tab === "actifs" && (
          <div
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              background: cardBg,
              borderTop: `1px solid ${cardBorder}`,
              padding: `10px calc(14px + ${SAFE_LEFT}) calc(10px + ${SAFE_BOTTOM}) calc(14px + ${SAFE_RIGHT})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              zIndex: 950,
              boxShadow: "0 -4px 20px rgba(0,0,0,0.15)",
              boxSizing: "border-box",
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
                type="button"
                onClick={() => setSelectedIds(new Set())}
                style={{
                  background: "transparent",
                  border: "none",
                  color: textSecondary,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  minHeight: MOBILE_TAP,
                  padding: "0 8px",
                  WebkitTapHighlightColor: "transparent",
                  touchAction: "manipulation",
                  fontFamily: "inherit",
                }}
              >
                Annuler
              </button>
            </div>
            <button
              type="button"
              onClick={deleteSelected}
              onTouchStart={pressBtn("bulk-del")}
              onTouchEnd={releaseBtn}
              onTouchCancel={releaseBtn}
              style={{
                padding: "10px 16px",
                borderRadius: 10,
                border: "none",
                background: pressedBtn === "bulk-del" ? "#B91C1C" : "#DC2626",
                color: "#FFF",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontWeight: 600,
                fontSize: 13,
                minHeight: MOBILE_TAP,
                transform: pressedBtn === "bulk-del" ? "scale(0.97)" : "scale(1)",
                transition: "transform 0.1s ease, background 0.12s ease",
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation",
                fontFamily: "inherit",
              }}
            >
              <Trash2 size={16} aria-hidden="true" /> Supprimer
            </button>
          </div>
        )}

        {/* ═══ FAB ═══ */}
        {isMobile && tab === "actifs" && !selectionMode && (
          <Fab
            icon={<UserPlus size={24} />}
            onClick={openCreate}
            label="Nouveau compte"
            bottom={24}
          />
        )}

        {/* ═══ BOTTOM SHEET FILTRES ═══ */}
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

        {/* ═══ MODALES ═══ */}
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
    </>
  );
}