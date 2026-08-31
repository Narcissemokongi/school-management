import { useState, useMemo, useCallback, useDeferredValue, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useStyles } from "../../styles/theme";
import { useIsMobile } from "../../hooks/useIsMobile"; // <-- Import du hook
import { useConfirm } from "../../hooks/useConfirm";
import { ConfirmDialog } from "./ConfirmDialog";
import { SchoolTable } from "./SchoolTable";
import {
  Search, X, ListFilter, Building2, Users, ArrowRight,
  Edit2, Trash2, Ban, Power, Loader, CheckCircle2, XCircle,
  ChevronUp, ChevronDown, Save, Copy, LayoutGrid, Table, Download,
  CheckSquare, Square, UserPlus, UserMinus, AlertTriangle,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";

export function SchoolsTab({ ecoles, onSelectEcole, user }) {
  const { dark } = useStyles();
  const isMobile = useIsMobile(); // Détection mobile
  const { confirm, dialogProps } = useConfirm();

  // États existants
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("nom");
  const [sortOrder, setSortOrder] = useState("asc");
  const [deletingId, setDeletingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editNom, setEditNom] = useState("");
  const [viewMode, setViewMode] = useState("cards");
  const [filterStatut, setFilterStatut] = useState("all");

  // Nouveaux états
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [filterUsers, setFilterUsers] = useState("all");
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const pageSize = 10;

  const deferredSearchTerm = useDeferredValue(searchTerm);

  // Mutations
  const removeEcole = useMutation(api.ecoles.remove);
  const suspendEcole = useMutation(api.ecoles.suspendEcole);
  const reactiverEcole = useMutation(api.ecoles.reactiverEcole);
  const updateEcole = useMutation(api.ecoles.update);

  // Statistiques rapides
  const stats = useMemo(() => {
    const total = ecoles?.length ?? 0;
    const actives = ecoles?.filter((e) => e.statut !== "suspendue").length ?? 0;
    const suspendues = ecoles?.filter((e) => e.statut === "suspendue").length ?? 0;
    const withUsers = ecoles?.filter((e) => (e.userCount ?? 0) > 0).length ?? 0;
    return { total, actives, suspendues, withUsers };
  }, [ecoles]);

  // Filtrage + tri
  const filteredAndSorted = useMemo(() => {
    if (!ecoles) return [];
    let filtered = ecoles;

    if (filterStatut === "active") {
      filtered = filtered.filter((e) => e.statut !== "suspendue");
    } else if (filterStatut === "suspendue") {
      filtered = filtered.filter((e) => e.statut === "suspendue");
    }

    if (filterUsers === "withUsers") {
      filtered = filtered.filter((e) => (e.userCount ?? 0) > 0);
    } else if (filterUsers === "noUsers") {
      filtered = filtered.filter((e) => (e.userCount ?? 0) === 0);
    }

    if (deferredSearchTerm.trim()) {
      const q = deferredSearchTerm.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.nom.toLowerCase().includes(q) ||
          (e.code && e.code.toLowerCase().includes(q))
      );
    }

    const sorted = [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case "nom":
          cmp = a.nom.localeCompare(b.nom, undefined, { sensitivity: "base" });
          break;
        case "users":
          cmp = (a.userCount ?? 0) - (b.userCount ?? 0);
          break;
        case "statut":
          cmp = (a.statut === "suspendue" ? 1 : 0) - (b.statut === "suspendue" ? 1 : 0);
          break;
        case "code":
          cmp = (a.code || "").localeCompare(b.code || "");
          break;
        default:
          cmp = 0;
      }
      return sortOrder === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [ecoles, filterStatut, filterUsers, deferredSearchTerm, sortBy, sortOrder]);

  // Pagination pour la vue cartes uniquement
  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedEcoles = filteredAndSorted.slice(
    (safeCurrentPage - 1) * pageSize,
    safeCurrentPage * pageSize
  );

  const resetPage = useCallback(() => setCurrentPage(1), []);
  useEffect(() => {
    resetPage();
  }, [deferredSearchTerm, filterStatut, filterUsers, sortBy, sortOrder, resetPage]);

  // Sélection multiple
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

  // Actions groupées (inchangées)
  const bulkSuspend = async () => { /* ... même logique ... */ };
  const bulkActivate = async () => { /* ... */ };
  const bulkDelete = async () => { /* ... */ };
  const bulkExport = () => { /* ... */ };

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  const startEdit = (ecole) => {
    setEditingId(ecole._id);
    setEditNom(ecole.nom);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditNom("");
  };

  const handleUpdateNom = async (ecoleId) => {
    if (!editNom.trim()) {
      toast.error("Le nom ne peut pas être vide");
      return;
    }
    try {
      await updateEcole({ ecoleId, nom: editNom.trim(), userId: user._id });
      toast.success("Nom mis à jour");
      setEditingId(null);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (ecole) => { /* ... */ };
  const handleToggleStatus = async (ecole) => { /* ... */ };

  const copyCode = (code) => { /* ... */ };

  const renderStatusBadge = (statut) => { /* ... */ };

  if (ecoles === undefined) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 200 }}>
        <Loader size={32} className="animate-spin" style={{ color: dark ? "#818CF8" : "#4F46E5" }} />
      </div>
    );
  }

  // Styles adaptatifs
  const statGridCols = isMobile ? "1fr 1fr" : "repeat(auto-fit, minmax(150px, 1fr))";
  const statGap = isMobile ? 8 : 16;
  const statCardPadding = isMobile ? 12 : 16;
  const toolbarFlexDirection = isMobile ? "column" : "row";
  const toolbarGap = isMobile ? 8 : 12;
  const searchInputPadding = isMobile ? "10px 12px" : "8px 12px";
  const searchInputFontSize = isMobile ? 16 : 14;
  const filterSelectPadding = isMobile ? "10px 12px" : "8px 12px";
  const filterSelectFontSize = isMobile ? 16 : 14;
  const filterButtonsFlexDirection = isMobile ? "column" : "row";
  const filterButtonsGap = isMobile ? 4 : 8;
  const filterButtonPadding = isMobile ? "10px 12px" : "8px 16px";
  const filterButtonFontSize = isMobile ? 14 : 13;
  const sortButtonsFlexDirection = isMobile ? "column" : "row";
  const sortButtonsGap = isMobile ? 4 : 8;
  const sortButtonPadding = isMobile ? "10px 12px" : "8px 12px";
  const sortButtonFontSize = isMobile ? 14 : 13;
  const viewButtonsFlexDirection = isMobile ? "row" : "row";
  const viewButtonPadding = isMobile ? 10 : 8;
  const viewIconSize = isMobile ? 20 : 18;
  const bulkActionsFlexDirection = isMobile ? "column" : "row";
  const bulkActionPadding = isMobile ? "10px 12px" : "6px 12px";
  const bulkActionFontSize = isMobile ? 14 : 13;
  const cardGridCols = isMobile ? "1fr" : "repeat(auto-fill, minmax(280px, 1fr))";
  const cardPadding = isMobile ? 14 : 20;
  const cardGap = isMobile ? 8 : 12;
  const cardNameFontSize = isMobile ? 15 : 16;
  const cardTextFontSize = isMobile ? 13 : 13;
  const cardActionPadding = isMobile ? "10px 12px" : "8px 12px";
  const cardActionFontSize = isMobile ? 14 : 13;
  const paginationButtonPadding = isMobile ? "8px 12px" : "6px 10px";

  return (
    <div>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
      `}</style>

      {/* Statistiques rapides */}
      <div style={{ display: "grid", gridTemplateColumns: statGridCols, gap: statGap, marginBottom: isMobile ? 16 : 24 }}>
        {[
          { label: "Total écoles", value: stats.total, color: dark ? "#F1F5F9" : "#1E293B" },
          { label: "Actives", value: stats.actives, color: "#10B981" },
          { label: "Suspendues", value: stats.suspendues, color: "#F59E0B" },
          { label: "Avec utilisateurs", value: stats.withUsers, color: "#3B82F6" },
        ].map((item) => (
          <div key={item.label} style={{ background: dark ? "#1E293B" : "#FFFFFF", borderRadius: 12, padding: statCardPadding, textAlign: "center", border: `1px solid ${dark ? "#334155" : "#E2E8F0"}` }}>
            <div style={{ fontSize: isMobile ? 18 : 24, fontWeight: 700, color: item.color }}>{item.value}</div>
            <div style={{ fontSize: isMobile ? 11 : 13, color: dark ? "#94A3B8" : "#64748B" }}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* Barre d'outils */}
      <div style={{ display: "flex", flexDirection: toolbarFlexDirection, flexWrap: "wrap", gap: toolbarGap, marginBottom: isMobile ? 16 : 20, alignItems: isMobile ? "stretch" : "center" }}>
        {/* Recherche */}
        <div style={{
          display: "flex",
          alignItems: "center",
          background: dark ? "#1E293B" : "#FFFFFF",
          borderRadius: 10,
          padding: searchInputPadding,
          border: `1px solid ${dark ? "rgba(255,255,255,0.1)" : "#E2E8F0"}`,
          flex: 1,
          minWidth: isMobile ? "100%" : 200,
        }}>
          <Search size={18} color={dark ? "#94A3B8" : "#64748B"} />
          <input
            placeholder="Rechercher une école..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              resetPage();
            }}
            style={{
              border: "none",
              outline: "none",
              marginLeft: 8,
              fontSize: searchInputFontSize,
              width: "100%",
              background: "transparent",
              color: dark ? "#F1F5F9" : "#1E293B",
            }}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm("")} style={{ background: "none", border: "none", cursor: "pointer" }}>
              <X size={16} color={dark ? "#94A3B8" : "#64748B"} />
            </button>
          )}
        </div>

        {/* Filtre statut */}
        <div style={{ display: "flex", gap: filterButtonsGap, flexDirection: isMobile ? "column" : "row", width: isMobile ? "100%" : "auto" }}>
          {[
            { id: "all", label: "Toutes" },
            { id: "active", label: "Actives" },
            { id: "suspendue", label: "Suspendues" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => {
                setFilterStatut(f.id);
                resetPage();
              }}
              style={{
                padding: filterButtonPadding,
                borderRadius: 8,
                border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
                background: filterStatut === f.id ? (dark ? "#818CF8" : "#4F46E5") : "transparent",
                color: filterStatut === f.id ? "white" : dark ? "#94A3B8" : "#64748B",
                fontWeight: filterStatut === f.id ? 600 : 400,
                cursor: "pointer",
                fontSize: filterButtonFontSize,
                width: isMobile ? "100%" : "auto",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Filtre utilisateurs */}
        <div style={{ width: isMobile ? "100%" : "auto" }}>
          <select
            value={filterUsers}
            onChange={(e) => {
              setFilterUsers(e.target.value);
              resetPage();
            }}
            style={{
              width: "100%",
              padding: filterSelectPadding,
              borderRadius: 8,
              border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
              background: dark ? "#1E293B" : "#FFFFFF",
              color: dark ? "#F1F5F9" : "#1E293B",
              fontSize: filterSelectFontSize,
              cursor: "pointer",
            }}
          >
            <option value="all">Tous les utilisateurs</option>
            <option value="withUsers">Avec utilisateurs</option>
            <option value="noUsers">Sans utilisateurs</option>
          </select>
        </div>

        {/* Tri */}
        <div style={{ display: "flex", gap: sortButtonsGap, flexDirection: isMobile ? "column" : "row", width: isMobile ? "100%" : "auto" }}>
          {[
            { field: "nom", label: "Nom" },
            { field: "users", label: "Utilisateurs" },
            { field: "statut", label: "Statut" },
            { field: "code", label: "Code" },
          ].map((btn) => (
            <button
              key={btn.field}
              onClick={() => toggleSort(btn.field)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                padding: sortButtonPadding,
                background: sortBy === btn.field ? (dark ? "#312E81" : "#EEF2FF") : "transparent",
                color: sortBy === btn.field ? (dark ? "#A5B4FC" : "#4F46E5") : dark ? "#94A3B8" : "#64748B",
                border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
                borderRadius: 8, cursor: "pointer", fontSize: sortButtonFontSize,
                width: isMobile ? "100%" : "auto",
              }}
            >
              {btn.label} {sortBy === btn.field && (sortOrder === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
            </button>
          ))}
        </div>

        {/* Bascule vue + Export */}
        <div style={{ display: "flex", gap: 8, justifyContent: isMobile ? "space-between" : "flex-start", width: isMobile ? "100%" : "auto" }}>
          <button
            onClick={() => setViewMode("cards")}
            title="Vue cartes"
            style={{
              padding: viewButtonPadding,
              borderRadius: 8,
              border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
              background: viewMode === "cards" ? (dark ? "#818CF8" : "#4F46E5") : "transparent",
              color: viewMode === "cards" ? "white" : dark ? "#94A3B8" : "#64748B",
              cursor: "pointer",
            }}
          >
            <LayoutGrid size={viewIconSize} />
          </button>
          <button
            onClick={() => setViewMode("table")}
            title="Vue tableau"
            style={{
              padding: viewButtonPadding,
              borderRadius: 8,
              border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
              background: viewMode === "table" ? (dark ? "#818CF8" : "#4F46E5") : "transparent",
              color: viewMode === "table" ? "white" : dark ? "#94A3B8" : "#64748B",
              cursor: "pointer",
            }}
          >
            <Table size={viewIconSize} />
          </button>
          <button
            onClick={bulkExport}
            title={selectedIds.size > 0 ? `Exporter la sélection (${selectedIds.size})` : "Exporter en Excel"}
            style={{
              padding: viewButtonPadding,
              borderRadius: 8,
              border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
              background: "transparent",
              color: dark ? "#94A3B8" : "#64748B",
              cursor: "pointer",
            }}
          >
            <Download size={viewIconSize} />
          </button>
        </div>

        {/* Actions groupées */}
        {selectedIds.size > 0 && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", flexDirection: bulkActionsFlexDirection, width: isMobile ? "100%" : "auto" }}>
            <span style={{ fontSize: 13, color: dark ? "#94A3B8" : "#64748B" }}>
              {selectedIds.size} sélectionnée(s)
            </span>
            <button onClick={bulkActivate} disabled={bulkProcessing} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, padding: bulkActionPadding, background: "#10B981", color: "white", border: "none", borderRadius: 6, cursor: bulkProcessing ? "not-allowed" : "pointer", fontSize: bulkActionFontSize, width: isMobile ? "100%" : "auto" }}>
              <UserPlus size={14} /> Activer
            </button>
            <button onClick={bulkSuspend} disabled={bulkProcessing} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, padding: bulkActionPadding, background: "#F59E0B", color: "white", border: "none", borderRadius: 6, cursor: bulkProcessing ? "not-allowed" : "pointer", fontSize: bulkActionFontSize, width: isMobile ? "100%" : "auto" }}>
              <UserMinus size={14} /> Suspendre
            </button>
            <button onClick={bulkDelete} disabled={bulkProcessing} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, padding: bulkActionPadding, background: "#EF4444", color: "white", border: "none", borderRadius: 6, cursor: bulkProcessing ? "not-allowed" : "pointer", fontSize: bulkActionFontSize, width: isMobile ? "100%" : "auto" }}>
              <Trash2 size={14} /> Supprimer
            </button>
            <button onClick={clearSelection} disabled={bulkProcessing} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, padding: bulkActionPadding, background: "transparent", border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`, borderRadius: 6, cursor: "pointer", fontSize: bulkActionFontSize, color: dark ? "#F1F5F9" : "#1E293B", width: isMobile ? "100%" : "auto" }}>
              <X size={14} /> Annuler
            </button>
          </div>
        )}
      </div>

      {/* Contenu selon la vue */}
      {filteredAndSorted.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, color: dark ? "#94A3B8" : "#64748B" }}>
          <Building2 size={48} color={dark ? "#334155" : "#CBD5E1"} />
          <p style={{ marginTop: 12, fontSize: 16 }}>
            {searchTerm || filterStatut !== "all" || filterUsers !== "all"
              ? "Aucune école trouvée"
              : "Aucune école disponible"}
          </p>
        </div>
      ) : viewMode === "cards" ? (
        <>
          {/* Vue cartes avec pagination */}
          <div style={{
            display: "grid",
            gridTemplateColumns: cardGridCols,
            gap: cardGap,
          }}>
            {paginatedEcoles.map((ecole) => (
              <div
                key={ecole._id}
                style={{
                  background: dark ? "#1E293B" : "#FFFFFF",
                  borderRadius: 16,
                  padding: cardPadding,
                  boxShadow: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)",
                  border: `1px solid ${selectedIds.has(ecole._id) ? (dark ? "#818CF8" : "#4F46E5") : dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}`,
                  transition: "box-shadow 0.2s, transform 0.1s, border-color 0.2s",
                  display: "flex",
                  flexDirection: "column",
                  gap: cardGap,
                  position: "relative",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = dark ? "0 4px 12px rgba(0,0,0,0.5)" : "0 4px 12px rgba(0,0,0,0.1)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                {/* Case à cocher */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelectOne(ecole._id);
                  }}
                  style={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 4,
                    color: selectedIds.has(ecole._id) ? (dark ? "#818CF8" : "#4F46E5") : dark ? "#94A3B8" : "#CBD5E1",
                    zIndex: 1,
                  }}
                  aria-label={selectedIds.has(ecole._id) ? "Désélectionner" : "Sélectionner"}
                >
                  {selectedIds.has(ecole._id) ? <CheckSquare size={18} /> : <Square size={18} />}
                </button>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingRight: 28, gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    <Building2 size={20} color={dark ? "#818CF8" : "#4F46E5"} />
                    {editingId === ecole._id ? (
                      <input
                        value={editNom}
                        onChange={(e) => setEditNom(e.target.value)}
                        style={{
                          fontSize: cardNameFontSize,
                          fontWeight: 600,
                          color: dark ? "#F1F5F9" : "#1E293B",
                          background: dark ? "#0F172A" : "#F9FAFB",
                          border: `1px solid ${dark ? "#818CF8" : "#4F46E5"}`,
                          borderRadius: 6,
                          padding: "4px 8px",
                          outline: "none",
                          width: "100%",
                        }}
                        autoFocus
                      />
                    ) : (
                      <span style={{ fontWeight: 700, fontSize: cardNameFontSize, color: dark ? "#F1F5F9" : "#1E293B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {ecole.nom}
                      </span>
                    )}
                  </div>
                  {renderStatusBadge(ecole.statut)}
                </div>

                {ecole.code && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: cardTextFontSize, color: dark ? "#94A3B8" : "#64748B" }}>
                    Code : <span style={{ fontFamily: "monospace" }}>{ecole.code}</span>
                    <button onClick={() => copyCode(ecole.code)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                      <Copy size={14} color={dark ? "#94A3B8" : "#64748B"} />
                    </button>
                  </div>
                )}

                <div style={{ display: "flex", alignItems: "center", gap: 6, color: dark ? "#94A3B8" : "#64748B", fontSize: cardTextFontSize }}>
                  <Users size={14} />
                  <span>{ecole.userCount ?? 0} utilisateur(s)</span>
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: "auto", flexDirection: isMobile ? "column" : "row" }}>
                  {editingId === ecole._id ? (
                    <>
                      <button onClick={() => handleUpdateNom(ecole._id)} style={{ flex: 1, padding: cardActionPadding, background: "#10B981", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: cardActionFontSize }}>
                        <Save size={14} /> Enregistrer
                      </button>
                      <button onClick={cancelEdit} style={{ padding: cardActionPadding, background: dark ? "#334155" : "#F1F5F9", border: "none", borderRadius: 8, cursor: "pointer", color: dark ? "#F1F5F9" : "#1E293B", fontSize: cardActionFontSize }}>
                        <X size={14} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); onSelectEcole(ecole._id); }}
                        style={{ flex: 1, padding: cardActionPadding, background: dark ? "#818CF8" : "#4F46E5", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: cardActionFontSize }}
                      >
                        Ouvrir <ArrowRight size={14} />
                      </button>
                      <div style={{ display: "flex", gap: 6, justifyContent: "space-between", width: "100%" }}>
                        <button onClick={(e) => { e.stopPropagation(); startEdit(ecole); }} style={{ background: "transparent", border: "none", color: dark ? "#818CF8" : "#4F46E5", cursor: "pointer", padding: 8, borderRadius: 8, fontSize: cardActionFontSize }} title="Modifier le nom">
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleToggleStatus(ecole); }}
                          disabled={togglingId === ecole._id}
                          style={{ background: "transparent", border: "none", color: ecole.statut === "suspendue" ? "#10B981" : "#F59E0B", cursor: togglingId === ecole._id ? "not-allowed" : "pointer", padding: 8, borderRadius: 8, opacity: togglingId === ecole._id ? 0.6 : 1 }}
                          title={ecole.statut === "suspendue" ? "Activer" : "Suspendre"}
                        >
                          {togglingId === ecole._id ? <Loader size={16} className="animate-spin" /> : ecole.statut === "suspendue" ? <Power size={16} /> : <Ban size={16} />}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(ecole); }}
                          disabled={deletingId === ecole._id}
                          style={{ background: "transparent", border: "none", color: "#EF4444", cursor: deletingId === ecole._id ? "not-allowed" : "pointer", padding: 8, borderRadius: 8, opacity: deletingId === ecole._id ? 0.6 : 1 }}
                          title="Supprimer"
                        >
                          {deletingId === ecole._id ? <Loader size={16} className="animate-spin" /> : <Trash2 size={16} />}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination pour les cartes */}
          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 16 }}>
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safeCurrentPage === 1}
                style={{ padding: paginationButtonPadding, border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`, borderRadius: 6, background: "transparent", color: safeCurrentPage === 1 ? "#94A3B8" : dark ? "#F1F5F9" : "#1E293B", cursor: "pointer" }}
              >
                <ChevronLeft size={16} />
              </button>
              <span style={{ fontSize: isMobile ? 14 : 13, color: dark ? "#94A3B8" : "#64748B" }}>
                Page {safeCurrentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage === totalPages}
                style={{ padding: paginationButtonPadding, border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`, borderRadius: 6, background: "transparent", color: safeCurrentPage === totalPages ? "#94A3B8" : dark ? "#F1F5F9" : "#1E293B", cursor: "pointer" }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Vue tableau : on passe toutes les écoles filtrées, SchoolTable gère sa propre pagination */}
          <SchoolTable
            ecoles={filteredAndSorted}
            onSelectEcole={onSelectEcole}
            onDelete={handleDelete}
            onToggleStatus={handleToggleStatus}
            onUpdateNom={handleUpdateNom}
            user={user}
            selectable
            selectedIds={selectedIds}
            onToggleSelect={toggleSelectOne}
            onToggleSelectAll={toggleSelectAll}
          />
        </>
      )}

      <ConfirmDialog {...dialogProps} />
    </div>
  );
}