import { useState, useMemo, useCallback, useDeferredValue, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile"; // <-- Import du hook
import { useConfirm } from "@/hooks/useConfirm";
import { ConfirmDialog } from "./ConfirmDialog";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import {
  Loader, Plus, Edit2, Trash2, Search, X, Check,
  Users, Building2, ArrowRight, ChevronUp, ChevronDown,
  Power, Ban, CheckCircle2, XCircle, LayoutGrid, List,
  Filter, AlertTriangle, School, Download, CheckSquare, Square,
  ChevronLeft, ChevronRight, UserPlus, UserMinus,
} from "lucide-react";

// ─── Sous-composants existants (StatutBadge, SearchBar, SortButton, EcoleCard modifiée, etc.) ───
const StatutBadge = ({ statut, dark }) => {
  const isActive = statut !== "suspendue";
  const badgeActiveBg = dark ? "#064E3B" : "#D1FAE5";
  const badgeActiveText = dark ? "#34D399" : "#065F46";
  const badgeSuspendedBg = dark ? "#78350F" : "#FEF3C7";
  const badgeSuspendedText = dark ? "#FBBF24" : "#92400E";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600,
      background: isActive ? badgeActiveBg : badgeSuspendedBg,
      color: isActive ? badgeActiveText : badgeSuspendedText,
    }}>
      {isActive ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
      {isActive ? "Active" : "Suspendue"}
    </span>
  );
};

const SearchBar = ({ searchTerm, setSearchTerm, textSecondary, cardBg, cardBorder, textPrimary, isMobile }) => (
  <div style={{
    background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 12,
    padding: isMobile ? "10px 12px" : "8px 12px",
    display: "flex", alignItems: "center", gap: 8,
    flex: 1, minWidth: isMobile ? "100%" : 200,
  }}>
    <Search size={16} color={textSecondary} />
    <input
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      placeholder="Rechercher une école..."
      aria-label="Rechercher une école"
      style={{ border: "none", outline: "none", background: "transparent", color: textPrimary, fontSize: isMobile ? 16 : 14, width: "100%" }}
    />
    {searchTerm && (
      <button onClick={() => setSearchTerm("")} aria-label="Effacer la recherche" style={{ background: "none", border: "none", cursor: "pointer", color: textSecondary }}>
        <X size={16} />
      </button>
    )}
  </div>
);

const SortButton = ({ label, field, currentSort, currentOrder, onClick, activeBg, activeText, textSecondary, cardBg, cardBorder, isMobile }) => {
  const isActive = currentSort === field;
  return (
    <button
      onClick={() => onClick(field)}
      aria-label={`Trier par ${label}`}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
        padding: isMobile ? "8px 10px" : "8px 12px",
        background: isActive ? activeBg : cardBg,
        color: isActive ? activeText : textSecondary,
        border: `1px solid ${cardBorder}`, borderRadius: 8,
        cursor: "pointer", fontSize: isMobile ? 13 : 13, fontWeight: isActive ? 600 : 400,
        flex: isMobile ? 1 : "none",
      }}
    >
      {label}
      {isActive && (currentOrder === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
    </button>
  );
};

const EcoleCard = ({
  ecole, editingId, editNom, setEditNom, startEdit, cancelEdit, handleUpdate,
  handleToggleStatus, handleDelete, onSelectEcole, togglingId, deletingId,
  dark, textPrimary, textSecondary, cardBg, cardBorder, inputBg,
  accentColor, successColor, warningColor, dangerColor, selected, onToggleSelect, isMobile,
}) => {
  const isEditing = editingId === ecole._id;
  return (
    <div
      style={{
        background: cardBg, borderRadius: 16, padding: isMobile ? 14 : 20,
        boxShadow: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)",
        border: `1px solid ${selected ? accentColor : cardBorder}`,
        transition: "box-shadow 0.2s, transform 0.1s, border-color 0.2s",
        display: "flex", flexDirection: "column", gap: 12,
        position: "relative",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = dark ? "0 4px 12px rgba(0,0,0,0.5)" : "0 4px 12px rgba(0,0,0,0.1)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)"; e.currentTarget.style.transform = "translateY(0)"; }}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onToggleSelect(ecole._id); }}
        style={{
          position: "absolute", top: 10, right: 10,
          background: "none", border: "none", cursor: "pointer", padding: 4,
          color: selected ? accentColor : textSecondary,
        }}
        aria-label={selected ? "Désélectionner" : "Sélectionner"}
      >
        {selected ? <CheckSquare size={18} /> : <Square size={18} />}
      </button>

      {isEditing ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            value={editNom}
            onChange={(e) => setEditNom(e.target.value)}
            aria-label="Modifier le nom de l'école"
            style={{
              flex: 1, padding: "8px 12px", borderRadius: 8,
              border: `1px solid ${accentColor}`, background: inputBg,
              color: textPrimary, fontSize: 14, outline: "none",
            }}
            autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") handleUpdate(ecole._id); if (e.key === "Escape") cancelEdit(); }}
          />
          <button onClick={(e) => { e.stopPropagation(); handleUpdate(ecole._id); }} aria-label="Enregistrer" style={{ background: successColor, color: "white", border: "none", borderRadius: 8, padding: 8, cursor: "pointer" }}>
            <Check size={16} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); cancelEdit(); }} aria-label="Annuler" style={{ background: "none", border: "none", color: textSecondary, cursor: "pointer", padding: 8, borderRadius: 8 }}>
            <X size={16} />
          </button>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingRight: isMobile ? 24 : 28, gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
              <Building2 size={20} color={accentColor} />
              <span style={{ fontWeight: 700, fontSize: isMobile ? 15 : 16, color: textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ecole.nom}</span>
            </div>
            <StatutBadge statut={ecole.statut} dark={dark} />
          </div>

          {ecole.code && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: textSecondary }}>
              Code : <span style={{ fontFamily: "monospace" }}>{ecole.code}</span>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 6, color: textSecondary, fontSize: 13 }}>
            <Users size={14} />
            <span>{ecole.userCount ?? 0} utilisateur(s)</span>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: "auto", flexDirection: isMobile ? "column" : "row" }}>
            <button
              onClick={(e) => { e.stopPropagation(); onSelectEcole(ecole._id); }}
              aria-label={`Ouvrir ${ecole.nom}`}
              style={{ flex: 1, padding: isMobile ? "12px 12px" : "8px 12px", background: accentColor, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
            >
              Ouvrir <ArrowRight size={14} />
            </button>
            <div style={{ display: "flex", gap: 8, justifyContent: isMobile ? "space-between" : "flex-start" }}>
              <button onClick={(e) => { e.stopPropagation(); startEdit(ecole); }} aria-label="Modifier" title="Modifier" style={{ background: "transparent", border: "none", color: accentColor, cursor: "pointer", padding: 8, borderRadius: 8 }}>
                <Edit2 size={16} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleToggleStatus(ecole); }}
                disabled={togglingId === ecole._id}
                aria-label={ecole.statut === "suspendue" ? "Activer" : "Suspendre"}
                title={ecole.statut === "suspendue" ? "Activer" : "Suspendre"}
                style={{ background: "transparent", border: "none", color: ecole.statut === "suspendue" ? successColor : warningColor, cursor: togglingId === ecole._id ? "not-allowed" : "pointer", padding: 8, borderRadius: 8, opacity: togglingId === ecole._id ? 0.6 : 1 }}
              >
                {togglingId === ecole._id ? <Loader size={16} className="animate-spin" /> : ecole.statut === "suspendue" ? <Power size={16} /> : <Ban size={16} />}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(ecole); }}
                disabled={deletingId === ecole._id}
                aria-label="Supprimer" title="Supprimer"
                style={{ background: "transparent", border: "none", color: dangerColor, cursor: deletingId === ecole._id ? "not-allowed" : "pointer", padding: 8, borderRadius: 8, opacity: deletingId === ecole._id ? 0.6 : 1 }}
              >
                {deletingId === ecole._id ? <Loader size={16} className="animate-spin" /> : <Trash2 size={16} />}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const EcoleListView = ({
  ecoles, editingId, editNom, setEditNom, startEdit, cancelEdit, handleUpdate,
  handleToggleStatus, handleDelete, onSelectEcole, togglingId, deletingId,
  dark, textPrimary, textSecondary, cardBg, cardBorder, inputBg,
  accentColor, successColor, warningColor, dangerColor,
  selectedIds, onToggleSelect, isMobile,
}) => (
  <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
    {ecoles.map((ecole) => (
      <div
        key={ecole._id}
        style={{
          background: cardBg, border: `1px solid ${selectedIds.has(ecole._id) ? accentColor : cardBorder}`,
          borderRadius: 12, padding: 12,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexWrap: "wrap", gap: 8, width: "100%",
          flexDirection: isMobile ? "column" : "row",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: isMobile ? "100%" : 200 }}>
          <button
            onClick={() => onToggleSelect(ecole._id)}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: selectedIds.has(ecole._id) ? accentColor : textSecondary }}
            aria-label={selectedIds.has(ecole._id) ? "Désélectionner" : "Sélectionner"}
          >
            {selectedIds.has(ecole._id) ? <CheckSquare size={18} /> : <Square size={18} />}
          </button>
          <Building2 size={18} color={accentColor} />
          <span style={{ fontWeight: 600, color: textPrimary, fontSize: isMobile ? 15 : 16 }}>{ecole.nom}</span>
          {ecole.code && <span style={{ fontFamily: "monospace", fontSize: 12, color: textSecondary }}>({ecole.code})</span>}
          <StatutBadge statut={ecole.statut} dark={dark} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: isMobile ? "center" : "flex-start" }}>
          <span style={{ color: textSecondary, fontSize: 13, display: "flex", alignItems: "center", gap: 4 }}>
            <Users size={14} /> {ecole.userCount ?? 0}
          </span>
          <button onClick={() => onSelectEcole(ecole._id)} style={{ background: accentColor, color: "white", border: "none", borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
            Ouvrir
          </button>
          <button onClick={() => startEdit(ecole)} aria-label="Modifier" title="Modifier" style={{ background: "none", border: "none", color: accentColor, cursor: "pointer", padding: 4 }}>
            <Edit2 size={16} />
          </button>
          <button
            onClick={() => handleToggleStatus(ecole)}
            disabled={togglingId === ecole._id}
            aria-label={ecole.statut === "suspendue" ? "Activer" : "Suspendre"}
            title={ecole.statut === "suspendue" ? "Activer" : "Suspendre"}
            style={{ background: "none", border: "none", color: ecole.statut === "suspendue" ? successColor : warningColor, cursor: togglingId === ecole._id ? "not-allowed" : "pointer", padding: 4, opacity: togglingId === ecole._id ? 0.6 : 1 }}
          >
            {togglingId === ecole._id ? <Loader size={16} className="animate-spin" /> : ecole.statut === "suspendue" ? <Power size={16} /> : <Ban size={16} />}
          </button>
          <button
            onClick={() => handleDelete(ecole)}
            disabled={deletingId === ecole._id}
            aria-label="Supprimer" title="Supprimer"
            style={{ background: "none", border: "none", color: dangerColor, cursor: deletingId === ecole._id ? "not-allowed" : "pointer", padding: 4, opacity: deletingId === ecole._id ? 0.6 : 1 }}
          >
            {deletingId === ecole._id ? <Loader size={16} className="animate-spin" /> : <Trash2 size={16} />}
          </button>
        </div>
        {editingId === ecole._id && (
          <div style={{ width: "100%", display: "flex", gap: 8, marginTop: 4 }}>
            <input
              value={editNom}
              onChange={(e) => setEditNom(e.target.value)}
              style={{ flex: 1, padding: 6, borderRadius: 6, border: `1px solid ${accentColor}`, background: inputBg, color: textPrimary }}
              autoFocus
            />
            <button onClick={() => handleUpdate(ecole._id)} style={{ background: successColor, color: "white", border: "none", borderRadius: 6, padding: 6, cursor: "pointer" }}>
              <Check size={14} />
            </button>
            <button onClick={cancelEdit} style={{ background: "none", border: "none", color: textSecondary, cursor: "pointer" }}>
              <X size={14} />
            </button>
          </div>
        )}
      </div>
    ))}
  </div>
);

const PaginationControls = ({ currentPage, totalPages, onPageChange, textPrimary, textSecondary, borderColor, isMobile }) => (
  <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 16, width: "100%" }}>
    <button
      onClick={() => onPageChange(Math.max(1, currentPage - 1))}
      disabled={currentPage === 1}
      aria-label="Page précédente"
      style={{ padding: isMobile ? "8px 12px" : "8px 12px", border: `1px solid ${borderColor}`, borderRadius: 8, background: "transparent", cursor: currentPage === 1 ? "not-allowed" : "pointer", color: textPrimary }}
    >
      <ChevronLeft size={16} />
    </button>
    <span style={{ fontSize: 13, color: textSecondary }}>
      Page {currentPage} / {totalPages}
    </span>
    <button
      onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
      disabled={currentPage === totalPages}
      aria-label="Page suivante"
      style={{ padding: isMobile ? "8px 12px" : "8px 12px", border: `1px solid ${borderColor}`, borderRadius: 8, background: "transparent", cursor: currentPage === totalPages ? "not-allowed" : "pointer", color: textPrimary }}
    >
      <ChevronRight size={16} />
    </button>
  </div>
);

export function GestionEcoles({ onSelectEcole, user }) {
  const { S, dark } = useStyles();
  const isMobile = useIsMobile(); // <-- Hook mobile
  const { confirm, dialogProps } = useConfirm();

  // États existants
  const [nouveauNom, setNouveauNom] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editNom, setEditNom] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [success, setSuccess] = useState(false);
  const [sortBy, setSortBy] = useState("nom");
  const [sortOrder, setSortOrder] = useState("asc");
  const [filterStatut, setFilterStatut] = useState("all");
  const [viewMode, setViewMode] = useState("grid");

  // Nouveaux états
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const pageSize = 10;

  const deferredSearchTerm = useDeferredValue(searchTerm);

  const ecolesQuery = useQuery(api.ecoles.listWithUserCount);
  const ecoles = ecolesQuery ?? [];
  const isLoading = ecolesQuery === undefined;

  const addEcole = useMutation(api.ecoles.add);
  const updateEcole = useMutation(api.ecoles.update);
  const suspendEcole = useMutation(api.ecoles.suspendEcole);
  const reactiverEcole = useMutation(api.ecoles.reactiverEcole);
  const removeEcole = useMutation(api.ecoles.remove);

  // Statistiques
  const stats = useMemo(() => {
    const total = ecoles.length;
    const actives = ecoles.filter((e) => e.statut !== "suspendue").length;
    const suspendues = total - actives;
    return { total, actives, suspendues };
  }, [ecoles]);

  // Filtrage et tri
  const ecolesTriees = useMemo(() => {
    let filtered = ecoles;
    if (filterStatut === "active") filtered = filtered.filter((e) => e.statut !== "suspendue");
    else if (filterStatut === "suspendue") filtered = filtered.filter((e) => e.statut === "suspendue");
    if (deferredSearchTerm.trim()) {
      const term = deferredSearchTerm.toLowerCase();
      filtered = filtered.filter((e) => e.nom.toLowerCase().includes(term));
    }
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === "nom") {
        return sortOrder === "asc" ? a.nom.localeCompare(b.nom, undefined, { sensitivity: "base" }) : b.nom.localeCompare(a.nom, undefined, { sensitivity: "base" });
      } else if (sortBy === "users") {
        const aUsers = a.userCount ?? 0;
        const bUsers = b.userCount ?? 0;
        return sortOrder === "asc" ? aUsers - bUsers : bUsers - aUsers;
      } else if (sortBy === "statut") {
        const aActive = a.statut !== "suspendue" ? 0 : 1;
        const bActive = b.statut !== "suspendue" ? 0 : 1;
        return sortOrder === "asc" ? aActive - bActive : bActive - aActive;
      }
      return 0;
    });
    return sorted;
  }, [ecoles, filterStatut, deferredSearchTerm, sortBy, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(ecolesTriees.length / pageSize);
  const safeCurrentPage = Math.min(currentPage, totalPages || 1);
  const paginatedEcoles = ecolesTriees.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [deferredSearchTerm, filterStatut]);

  const toggleSelectOne = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
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

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const bulkSuspend = async () => {
    if (selectedIds.size === 0) return;
    const ok = await confirm("Suspendre les écoles sélectionnées", `Voulez-vous suspendre ${selectedIds.size} école(s) ?`);
    if (!ok) return;
    setBulkProcessing(true);
    try {
      await Promise.all(Array.from(selectedIds).map((id) => suspendEcole({ ecoleId: id, userId: user._id })));
      toast.success(`${selectedIds.size} école(s) suspendue(s)`);
      clearSelection();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBulkProcessing(false);
    }
  };

  const bulkActivate = async () => {
    if (selectedIds.size === 0) return;
    const ok = await confirm("Activer les écoles sélectionnées", `Voulez-vous activer ${selectedIds.size} école(s) ?`);
    if (!ok) return;
    setBulkProcessing(true);
    try {
      await Promise.all(Array.from(selectedIds).map((id) => reactiverEcole({ ecoleId: id, userId: user._id })));
      toast.success(`${selectedIds.size} école(s) activée(s)`);
      clearSelection();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBulkProcessing(false);
    }
  };

  const bulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const ok = await confirm("Supprimer les écoles sélectionnées", `⚠️ Attention : ${selectedIds.size} école(s) et leurs utilisateurs associés seront supprimés définitivement. Cette action est irréversible.`);
    if (!ok) return;
    setBulkProcessing(true);
    try {
      await Promise.all(Array.from(selectedIds).map((id) => removeEcole({ id, userId: user._id })));
      toast.success(`${selectedIds.size} école(s) supprimée(s)`);
      clearSelection();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBulkProcessing(false);
    }
  };

  const toggleSort = useCallback((field) => {
    setSortBy((prevField) => {
      if (prevField === field) {
        setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortOrder("asc");
      }
      return field;
    });
  }, []);

  const handleAdd = useCallback(async (e) => {
    e.preventDefault();
    if (!nouveauNom.trim()) { toast.error("Veuillez saisir un nom d'école."); return; }
    setAdding(true);
    try {
      await addEcole({ nom: nouveauNom.trim(), userId: user._id });
      setNouveauNom("");
      setSuccess(true);
      toast.success("École créée avec succès");
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      toast.error(err.message || "Erreur lors de la création");
    } finally { setAdding(false); }
  }, [addEcole, nouveauNom, user._id]);

  const startEdit = useCallback((ecole) => { setEditingId(ecole._id); setEditNom(ecole.nom); }, []);
  const cancelEdit = useCallback(() => { setEditingId(null); setEditNom(""); }, []);

  const handleUpdate = useCallback(async (id) => {
    if (!editNom.trim()) { toast.error("Le nom ne peut pas être vide"); return; }
    try {
      await updateEcole({ ecoleId: id, nom: editNom.trim(), userId: user._id });
      toast.success("École mise à jour");
      setEditingId(null); setEditNom("");
    } catch (err) {
      toast.error(err.message || "Erreur lors de la mise à jour");
    }
  }, [editNom, updateEcole, user._id]);

  const handleToggleStatus = useCallback(async (ecole) => {
    const nouveauStatut = ecole.statut === "suspendue" ? "active" : "suspendue";
    const action = nouveauStatut === "suspendue" ? "suspendre" : "activer";
    const ok = await confirm(nouveauStatut === "suspendue" ? "Suspendre l'école" : "Activer l'école", `Voulez-vous vraiment ${action} l'école "${ecole.nom}" ?`);
    if (!ok) return;
    setTogglingId(ecole._id);
    try {
      if (nouveauStatut === "suspendue") await suspendEcole({ ecoleId: ecole._id, userId: user._id });
      else await reactiverEcole({ ecoleId: ecole._id, userId: user._id });
      toast.success(`École ${action}`);
    } catch (err) {
      toast.error(err.message || "Erreur lors du changement de statut");
    } finally { setTogglingId(null); }
  }, [confirm, suspendEcole, reactiverEcole, user._id]);

  const handleDelete = useCallback(async (ecole) => {
    const userCount = ecole.userCount ?? 0;
    const ok = await confirm("Supprimer l'école", `Voulez-vous vraiment supprimer "${ecole.nom}" ?\n${userCount > 0 ? `⚠️ ${userCount} utilisateur(s) associé(s) seront également supprimés.` : "Cette école n'a aucun utilisateur associé."}\nCette action est irréversible.`);
    if (!ok) return;
    setDeletingId(ecole._id);
    try {
      await removeEcole({ id: ecole._id, userId: user._id });
      toast.success("École supprimée");
    } catch (err) {
      toast.error(err.message || "Erreur lors de la suppression");
    } finally { setDeletingId(null); }
  }, [confirm, removeEcole, user._id]);

  const handleExportExcel = useCallback(() => {
    if (ecolesTriees.length === 0) { toast.error("Aucune donnée à exporter"); return; }
    const data = ecolesTriees.map((e) => ({
      "Nom": e.nom,
      "Code": e.code || "N/A",
      "Statut": e.statut === "suspendue" ? "Suspendue" : "Active",
      "Utilisateurs": e.userCount ?? 0,
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Écoles");
    XLSX.writeFile(workbook, "ecoles.xlsx");
    toast.success("Export Excel généré");
  }, [ecolesTriees]);

  // Couleurs
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const inputBg = dark ? "#0F172A" : "#F9FAFB";
  const buttonBg = dark ? "#818CF8" : "#4F46E5";
  const accentColor = dark ? "#818CF8" : "#4F46E5";
  const dangerColor = "#EF4444";
  const successColor = dark ? "#34D399" : "#10B981";
  const warningColor = dark ? "#FBBF24" : "#F59E0B";
  const badgeActiveBg = dark ? "#064E3B" : "#D1FAE5";
  const badgeActiveText = dark ? "#34D399" : "#065F46";

  return (
    <div style={{ width: "100%", maxWidth: "100%", margin: 0, padding: isMobile ? "16px 12px" : 0 }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .animate-spin { animation: spin 1s linear infinite; }`}</style>

      <div style={{ marginBottom: 20 }}>
        <h2 style={{ ...S.h2, color: textPrimary, fontSize: isMobile ? 20 : 24 }}>Gestion des écoles</h2>
        <p style={{ ...S.muted, color: textSecondary, fontSize: isMobile ? 13 : 14 }}>
          {isLoading ? "Chargement..." : `${ecolesTriees.length} école(s) affichée(s) sur ${stats.total} au total`}
        </p>
        <div style={{ display: "flex", gap: 16, marginTop: 8, flexWrap: "wrap" }}>
          <span style={{ color: textSecondary, fontSize: 13 }}><School size={14} style={{ verticalAlign: "middle", marginRight: 4 }} /> Total: {stats.total}</span>
          <span style={{ color: successColor, fontSize: 13 }}><CheckCircle2 size={14} style={{ verticalAlign: "middle", marginRight: 4 }} /> Actives: {stats.actives}</span>
          <span style={{ color: warningColor, fontSize: 13 }}><XCircle size={14} style={{ verticalAlign: "middle", marginRight: 4 }} /> Suspendues: {stats.suspendues}</span>
        </div>
      </div>

      {/* Formulaire de création */}
      <div style={{ ...S.card, background: cardBg, border: `1px solid ${cardBorder}`, transition: "background-color 0.3s", padding: isMobile ? 14 : 20 }}>
        <div style={{ fontWeight: 700, marginBottom: 12, color: accentColor, fontSize: isMobile ? 15 : 16 }}>➕ Créer une nouvelle école</div>
        <form onSubmit={handleAdd} style={{ display: "flex", gap: 10, flexWrap: "wrap", flexDirection: isMobile ? "column" : "row" }}>
          <input
            style={{ ...S.input, marginBottom: 0, flex: 1, minWidth: isMobile ? "100%" : 180, background: inputBg, border: `1px solid ${cardBorder}`, color: textPrimary, padding: isMobile ? "12px 14px" : "10px 14px", fontSize: isMobile ? 16 : 14 }}
            placeholder="Nom de l'école"
            value={nouveauNom}
            onChange={(e) => setNouveauNom(e.target.value)}
            disabled={adding}
            aria-label="Nom de la nouvelle école"
          />
          <button
            type="submit"
            disabled={adding || !nouveauNom.trim()}
            style={{ ...S.btn(buttonBg), width: isMobile ? "100%" : "auto", padding: isMobile ? "12px 20px" : "10px 20px", cursor: adding ? "not-allowed" : "pointer", opacity: adding ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: isMobile ? 16 : 14 }}
          >
            {adding ? <Loader size={16} className="animate-spin" /> : <Plus size={16} />}
            {adding ? "Création..." : success ? "✅ Créée" : "Créer"}
          </button>
        </form>
      </div>

      {/* Barre d'outils */}
      <div style={{ margin: "16px 0", display: "flex", flexWrap: "wrap", gap: 12, alignItems: "stretch", flexDirection: isMobile ? "column" : "row" }}>
        <SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} textSecondary={textSecondary} cardBg={cardBg} cardBorder={cardBorder} textPrimary={textPrimary} isMobile={isMobile} />

        <div style={{ display: "flex", gap: 4, flexDirection: isMobile ? "column" : "row", width: isMobile ? "100%" : "auto" }}>
          {[{ value: "all", label: "Toutes" }, { value: "active", label: "Actives" }, { value: "suspendue", label: "Suspendues" }].map((f) => (
            <button
              key={f.value}
              onClick={() => setFilterStatut(f.value)}
              aria-pressed={filterStatut === f.value}
              style={{ padding: isMobile ? "10px 12px" : "6px 12px", borderRadius: 20, border: `1px solid ${cardBorder}`, background: filterStatut === f.value ? accentColor : cardBg, color: filterStatut === f.value ? "white" : textSecondary, cursor: "pointer", fontSize: isMobile ? 14 : 12, fontWeight: filterStatut === f.value ? 600 : 400, width: isMobile ? "100%" : "auto", textAlign: "center" }}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, flexDirection: isMobile ? "column" : "row", width: isMobile ? "100%" : "auto" }}>
          <SortButton label="Nom" field="nom" currentSort={sortBy} currentOrder={sortOrder} onClick={toggleSort} activeBg={badgeActiveBg} activeText={badgeActiveText} textSecondary={textSecondary} cardBg={cardBg} cardBorder={cardBorder} isMobile={isMobile} />
          <SortButton label="Utilisateurs" field="users" currentSort={sortBy} currentOrder={sortOrder} onClick={toggleSort} activeBg={badgeActiveBg} activeText={badgeActiveText} textSecondary={textSecondary} cardBg={cardBg} cardBorder={cardBorder} isMobile={isMobile} />
          <SortButton label="Statut" field="statut" currentSort={sortBy} currentOrder={sortOrder} onClick={toggleSort} activeBg={badgeActiveBg} activeText={badgeActiveText} textSecondary={textSecondary} cardBg={cardBg} cardBorder={cardBorder} isMobile={isMobile} />
        </div>

        <div style={{ display: "flex", gap: 4, marginLeft: isMobile ? "0" : "auto", justifyContent: isMobile ? "space-between" : "flex-start" }}>
          <button onClick={() => setViewMode("grid")} aria-label="Vue en grille" title="Vue en grille" style={{ padding: 8, background: viewMode === "grid" ? accentColor : cardBg, color: viewMode === "grid" ? "white" : textSecondary, border: `1px solid ${cardBorder}`, borderRadius: 8, cursor: "pointer" }}>
            <LayoutGrid size={16} />
          </button>
          <button onClick={() => setViewMode("list")} aria-label="Vue en liste" title="Vue en liste" style={{ padding: 8, background: viewMode === "list" ? accentColor : cardBg, color: viewMode === "list" ? "white" : textSecondary, border: `1px solid ${cardBorder}`, borderRadius: 8, cursor: "pointer" }}>
            <List size={16} />
          </button>
          <button onClick={handleExportExcel} aria-label="Exporter en Excel" title="Exporter en Excel" style={{ padding: 8, background: cardBg, color: textSecondary, border: `1px solid ${cardBorder}`, borderRadius: 8, cursor: "pointer" }}>
            <Download size={16} />
          </button>
        </div>
      </div>

      {/* Actions groupées */}
      {selectedIds.size > 0 && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 16, flexDirection: isMobile ? "column" : "row", width: "100%" }}>
          <span style={{ fontSize: 13, color: textSecondary }}>{selectedIds.size} sélectionnée(s)</span>
          <button onClick={bulkActivate} disabled={bulkProcessing} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, padding: isMobile ? "10px 12px" : "6px 12px", background: "#10B981", color: "white", border: "none", borderRadius: 6, cursor: bulkProcessing ? "not-allowed" : "pointer", fontSize: 13, width: isMobile ? "100%" : "auto" }}>
            <UserPlus size={14} /> Activer
          </button>
          <button onClick={bulkSuspend} disabled={bulkProcessing} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, padding: isMobile ? "10px 12px" : "6px 12px", background: "#F59E0B", color: "white", border: "none", borderRadius: 6, cursor: bulkProcessing ? "not-allowed" : "pointer", fontSize: 13, width: isMobile ? "100%" : "auto" }}>
            <UserMinus size={14} /> Suspendre
          </button>
          <button onClick={bulkDelete} disabled={bulkProcessing} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, padding: isMobile ? "10px 12px" : "6px 12px", background: "#EF4444", color: "white", border: "none", borderRadius: 6, cursor: bulkProcessing ? "not-allowed" : "pointer", fontSize: 13, width: isMobile ? "100%" : "auto" }}>
            <Trash2 size={14} /> Supprimer
          </button>
          <button onClick={clearSelection} disabled={bulkProcessing} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, padding: isMobile ? "10px 12px" : "6px 12px", background: "transparent", border: `1px solid ${cardBorder}`, borderRadius: 6, cursor: "pointer", fontSize: 13, color: textPrimary, width: isMobile ? "100%" : "auto" }}>
            <X size={14} /> Annuler
          </button>
        </div>
      )}

      {/* Contenu principal */}
      {isLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
          <Loader size={28} className="animate-spin" />
        </div>
      ) : ecolesTriees.length === 0 ? (
        <div style={{ marginTop: 12, background: cardBg, border: `1px solid ${cardBorder}`, textAlign: "center", color: textSecondary, padding: 40, borderRadius: 12 }}>
          {searchTerm || filterStatut !== "all" ? "Aucune école ne correspond à vos critères." : "Aucune école disponible. Créez votre première école ci-dessus."}
        </div>
      ) : viewMode === "grid" ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(280px, 1fr))", gap: 16, marginTop: 12, width: "100%" }}>
            {paginatedEcoles.map((ecole) => (
              <EcoleCard
                key={ecole._id}
                ecole={ecole}
                editingId={editingId}
                editNom={editNom}
                setEditNom={setEditNom}
                startEdit={startEdit}
                cancelEdit={cancelEdit}
                handleUpdate={handleUpdate}
                handleToggleStatus={handleToggleStatus}
                handleDelete={handleDelete}
                onSelectEcole={onSelectEcole}
                togglingId={togglingId}
                deletingId={deletingId}
                dark={dark}
                textPrimary={textPrimary}
                textSecondary={textSecondary}
                cardBg={cardBg}
                cardBorder={cardBorder}
                inputBg={inputBg}
                accentColor={accentColor}
                successColor={successColor}
                warningColor={warningColor}
                dangerColor={dangerColor}
                badgeActiveBg={badgeActiveBg}
                badgeActiveText={badgeActiveText}
                selected={selectedIds.has(ecole._id)}
                onToggleSelect={toggleSelectOne}
                isMobile={isMobile}
              />
            ))}
          </div>
          <PaginationControls currentPage={safeCurrentPage} totalPages={totalPages} onPageChange={setCurrentPage} textPrimary={textPrimary} textSecondary={textSecondary} borderColor={cardBorder} isMobile={isMobile} />
        </>
      ) : (
        <>
          <EcoleListView
            ecoles={paginatedEcoles}
            editingId={editingId}
            editNom={editNom}
            setEditNom={setEditNom}
            startEdit={startEdit}
            cancelEdit={cancelEdit}
            handleUpdate={handleUpdate}
            handleToggleStatus={handleToggleStatus}
            handleDelete={handleDelete}
            onSelectEcole={onSelectEcole}
            togglingId={togglingId}
            deletingId={deletingId}
            dark={dark}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            cardBg={cardBg}
            cardBorder={cardBorder}
            inputBg={inputBg}
            accentColor={accentColor}
            successColor={successColor}
            warningColor={warningColor}
            dangerColor={dangerColor}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelectOne}
            isMobile={isMobile}
          />
          <PaginationControls currentPage={safeCurrentPage} totalPages={totalPages} onPageChange={setCurrentPage} textPrimary={textPrimary} textSecondary={textSecondary} borderColor={cardBorder} isMobile={isMobile} />
        </>
      )}

      <ConfirmDialog {...dialogProps} />
    </div>
  );
}