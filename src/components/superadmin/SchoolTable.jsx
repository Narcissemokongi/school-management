// src/components/SchoolTable.jsx
import { useState, useMemo, useCallback, useEffect } from "react";
import {
  Copy, Trash2, ShieldCheck, ShieldOff, Loader, Edit2, Save, X,
  ChevronUp, ChevronDown, ChevronsUpDown, Search, CheckCircle2, XCircle,
  ChevronLeft, ChevronRight, CheckSquare, Square, Download,
} from "lucide-react";
import toast from "react-hot-toast";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";

// ════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════
const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const SKELETON_ROWS = [1, 2, 3, 4, 5];
const SKELETON_COLS = [1, 2, 3, 4, 5, 6];

// ════════════════════════════════════════════════════════════════════
// KEYFRAMES (module-level, injecté UNE SEULE FOIS)
// ════════════════════════════════════════════════════════════════════
const SchoolTableKeyframes = (
  <style>{`
    @keyframes st-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .st-spin { animation: st-spin 1s linear infinite; }
    @keyframes st-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    .st-skeleton-cell {
      border-radius: 4px;
      animation: st-pulse 1.5s ease-in-out infinite;
    }
    @media (max-width: 600px) {
      .hide-mobile { display: none !important; }
      .hide-on-small { display: none !important; }
    }
    @media (prefers-reduced-motion: reduce) {
      .st-spin, .st-skeleton-cell { animation: none !important; }
    }
  `}</style>
);

// ════════════════════════════════════════════════════════════════════
// Sous-composant : badge statut
// ════════════════════════════════════════════════════════════════════
function StatusBadge({ statut, dark }) {
  const isActive = statut !== "suspendue";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "4px 10px",
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 600,
        background: isActive
          ? dark ? "#064E3B" : "#D1FAE5"
          : dark ? "#7F1D1D" : "#FEE2E2",
        color: isActive
          ? dark ? "#34D399" : "#065F46"
          : dark ? "#F87171" : "#B91C1C",
      }}
    >
      {isActive ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
      {isActive ? "Active" : "Suspendue"}
    </span>
  );
}

// ════════════════════════════════════════════════════════════════════
// Sous-composant : icône de tri
// ════════════════════════════════════════════════════════════════════
function SortIcon({ column, sortConfig }) {
  if (sortConfig.key !== column) return <ChevronsUpDown size={14} />;
  return sortConfig.direction === "asc" ? (
    <ChevronUp size={14} />
  ) : (
    <ChevronDown size={14} />
  );
}

// ════════════════════════════════════════════════════════════════════
// Sous-composant : squelette
// ════════════════════════════════════════════════════════════════════
function TableSkeleton({ dark }) {
  const cellBg = dark ? "#334155" : "#E2E8F0";
  return (
    <div
      style={{
        background: dark ? "#1E293B" : "#FFFFFF",
        borderRadius: 16,
        overflow: "hidden",
        boxShadow: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)",
        border: `1px solid ${dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}`,
        width: "100%",
      }}
    >
      {SchoolTableKeyframes}
      <div
        style={{
          padding: "12px 16px",
          borderBottom: `1px solid ${dark ? "rgba(255,255,255,0.05)" : "#F1F5F9"}`,
          display: "flex",
          gap: 8,
        }}
      >
        <div className="st-skeleton-cell" style={{ width: 100, height: 20, background: cellBg }} />
        <div className="st-skeleton-cell" style={{ flex: 1, height: 20, background: cellBg }} />
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {["École", "Code", "Utilisateurs", "Statut", "Créée le", "Actions"].map(
              (col, i) => (
                <th key={i} style={{ padding: "14px 16px", textAlign: "left" }}>
                  <div className="st-skeleton-cell" style={{ width: 80, height: 14, background: cellBg }} />
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody>
          {SKELETON_ROWS.map((row) => (
            <tr key={row}>
              {SKELETON_COLS.map((cell) => (
                <td key={cell} style={{ padding: "14px 16px" }}>
                  <div className="st-skeleton-cell" style={{ width: "100%", height: 20, background: cellBg }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ════════════════════════════════════════════════════════════════════
export function SchoolTable({
  ecoles,
  onSelectEcole,
  onDelete,
  onToggleStatus,
  onUpdateNom,
  user,
  selectable = false,
  selectedIds = new Set(),
  onToggleSelect = null,
  onToggleSelectAll = null,
  pageSize = 10,
}) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();

  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "nom", direction: "asc" });
  const [deletingId, setDeletingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editNom, setEditNom] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  // ✅ FIX — hover via state au lieu de mutation DOM (row hover)
  const [hoveredRowId, setHoveredRowId] = useState(null);

  const noMotion = useMemo(() => prefersReducedMotion(), []);

  const isLoading = ecoles === undefined;

  // ════════════════════════════════════════════════════════════════
  // Filtrage + tri (✅ guards `nom` / `code`)
  // ════════════════════════════════════════════════════════════════
  const filteredAndSorted = useMemo(() => {
    if (!ecoles) return [];
    let filtered = ecoles;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          (e.nom ?? "").toLowerCase().includes(q) ||
          (e.code ?? "").toLowerCase().includes(q)
      );
    }

    return [...filtered].sort((a, b) => {
      // ✅ FIX — comparaison uniforme (string vs number)
      let cmp = 0;
      switch (sortConfig.key) {
        case "nom":
          cmp = (a.nom ?? "").localeCompare(b.nom ?? "", undefined, { sensitivity: "base" });
          break;
        case "code":
          cmp = (a.code ?? "").localeCompare(b.code ?? "", undefined, { sensitivity: "base" });
          break;
        case "userCount":
          cmp = (a.userCount ?? 0) - (b.userCount ?? 0);
          break;
        case "statut":
          cmp = (a.statut ?? "active").localeCompare(b.statut ?? "active");
          break;
        case "creationTime":
          cmp = (a._creationTime ?? 0) - (b._creationTime ?? 0);
          break;
        default:
          cmp = (a.nom ?? "").localeCompare(b.nom ?? "");
      }
      return sortConfig.direction === "asc" ? cmp : -cmp;
    });
  }, [ecoles, searchTerm, sortConfig]);

  const totalPages = Math.ceil(filteredAndSorted.length / pageSize);
  const safeCurrentPage = Math.min(currentPage, totalPages || 1);

  const paginatedData = useMemo(
    () =>
      filteredAndSorted.slice(
        (safeCurrentPage - 1) * pageSize,
        safeCurrentPage * pageSize
      ),
    [filteredAndSorted, safeCurrentPage, pageSize]
  );

  const allVisibleSelected = useMemo(
    () =>
      paginatedData.length > 0 &&
      paginatedData.every((e) => selectedIds.has(e._id)),
    [paginatedData, selectedIds]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // ════════════════════════════════════════════════════════════════
  // Handlers mémoïsés
  // ════════════════════════════════════════════════════════════════
  const requestSort = useCallback((key) => {
    setCurrentPage(1);
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  }, []);

  // ✅ FIX — fallback execCommand pour contexte non-HTTPS
  const copyCode = useCallback(async (code) => {
    if (!code) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        const ta = document.createElement("textarea");
        ta.value = code;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      toast.success("Code copié !");
    } catch {
      toast.error("Impossible de copier le code");
    }
  }, []);

  const startEdit = useCallback((ecole) => {
    setEditingId(ecole._id);
    setEditNom(ecole.nom ?? "");
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditNom("");
  }, []);

  // ✅ FIX — signature alignée sur SchoolsTab : `onUpdateNom(ecoleId, newNom)`
  const handleSaveNom = useCallback(
    async (ecoleId) => {
      const trimmed = editNom.trim();
      if (!trimmed) {
        toast.error("Le nom ne peut pas être vide");
        return;
      }
      try {
        await onUpdateNom(ecoleId, trimmed);
        setEditingId(null);
        setEditNom("");
      } catch {
        // Le parent gère déjà les toasts
      }
    },
    [editNom, onUpdateNom]
  );

  // ✅ FIX — signature alignée sur SchoolsTab : `onDelete(ecole)` (objet complet)
  const handleDelete = useCallback(
    async (ecole) => {
      setDeletingId(ecole._id);
      try {
        await onDelete(ecole);
      } catch {
        // Le parent gère déjà les toasts
      } finally {
        setDeletingId(null);
      }
    },
    [onDelete]
  );

  const handleToggle = useCallback(
    async (ecole) => {
      setTogglingId(ecole._id);
      try {
        await onToggleStatus(ecole);
      } catch {
        // Le parent gère déjà les toasts
      } finally {
        setTogglingId(null);
      }
    },
    [onToggleStatus]
  );

  // ════════════════════════════════════════════════════════════════
  // Export CSV (BOM UTF-8 + escape propre)
  // ════════════════════════════════════════════════════════════════
  const exportCSV = useCallback(() => {
    const dataToExport =
      selectedIds.size > 0
        ? filteredAndSorted.filter((e) => selectedIds.has(e._id))
        : filteredAndSorted;

    if (dataToExport.length === 0) {
      toast.error("Aucune donnée à exporter");
      return;
    }

    const data = dataToExport.map((e) => ({
      Nom: e.nom,
      Code: e.code || "N/A",
      Utilisateurs: e.userCount ?? 0,
      Statut: e.statut === "suspendue" ? "Suspendue" : "Active",
      "Créée le": e._creationTime
        ? new Date(e._creationTime).toLocaleDateString("fr-FR")
        : "N/A",
    }));
    const headers = Object.keys(data[0] || {});
    const csv = [
      headers.join(","),
      ...data.map((row) =>
        headers
          .map((h) => `"${String(row[h] ?? "").replace(/"/g, '""')}"`)
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download =
      selectedIds.size > 0
        ? `ecoles_selection_${selectedIds.size}.csv`
        : "ecoles.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 100);

    toast.success(`Export CSV (${dataToExport.length} école(s)) généré`);
  }, [filteredAndSorted, selectedIds]);

  // ════════════════════════════════════════════════════════════════
  // Loading
  // ════════════════════════════════════════════════════════════════
  if (isLoading) {
    return <TableSkeleton dark={dark} />;
  }

  // ════════════════════════════════════════════════════════════════
  // Styles adaptatifs
  // ════════════════════════════════════════════════════════════════
  const headerPadding = isMobile ? "10px 12px" : "12px 16px";
  const cellPadding = isMobile ? "10px 8px" : "14px 16px";
  const tableMinWidth = isMobile ? 600 : 700;
  const actionButtonPadding = isMobile ? "8px 10px" : "6px 12px";
  const actionIconSize = isMobile ? 18 : 16;
  const paginationButtonPadding = isMobile ? "8px 12px" : "6px 12px";
  const paginationFontSize = isMobile ? 14 : 13;

  const columns = [
    { key: "nom", label: "École", align: "left", className: "" },
    { key: "code", label: "Code", align: "left", className: isMobile ? "hide-on-small" : "" },
    { key: "userCount", label: "Utilisateurs", align: "center", className: isMobile ? "hide-on-small" : "" },
    { key: "statut", label: "Statut", align: "center", className: "" },
    { key: "creationTime", label: "Créée le", align: "center", className: "hide-mobile" },
  ];

  const baseRowBg = dark ? "transparent" : "transparent";
  const selectedRowBg = dark ? "#26334D" : "#EEF2FF";
  const hoverRowBg = dark ? "#26334D" : "#F8FAFC";

  return (
    <div
      style={{
        background: dark ? "#1E293B" : "#FFFFFF",
        borderRadius: 16,
        overflow: "hidden",
        boxShadow: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)",
        border: `1px solid ${dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}`,
        width: "100%",
      }}
    >
      {SchoolTableKeyframes}

      {/* ═══════════════════════ Barre supérieure ═══════════════════════ */}
      <div
        style={{
          padding: headerPadding,
          borderBottom: `1px solid ${dark ? "rgba(255,255,255,0.05)" : "#F1F5F9"}`,
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <Search size={isMobile ? 18 : 16} color={dark ? "#94A3B8" : "#64748B"} />
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Rechercher dans le tableau..."
          style={{
            border: "none",
            outline: "none",
            background: "transparent",
            color: dark ? "#F1F5F9" : "#1E293B",
            fontSize: isMobile ? 16 : 14,
            flex: 1,
            minWidth: 100,
          }}
          aria-label="Rechercher une école"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm("")}
            style={{ background: "none", border: "none", cursor: "pointer" }}
            aria-label="Effacer la recherche"
          >
            <X size={isMobile ? 18 : 16} color={dark ? "#94A3B8" : "#64748B"} />
          </button>
        )}
        <div
          style={{
            fontSize: isMobile ? 12 : 13,
            color: dark ? "#94A3B8" : "#64748B",
            whiteSpace: "nowrap",
          }}
        >
          {filteredAndSorted.length} école(s)
          {selectable && selectedIds.size > 0 && (
            <span> · {selectedIds.size} sélectionnée(s)</span>
          )}
        </div>
        <button
          type="button"
          onClick={exportCSV}
          title={
            selectedIds.size > 0
              ? "Exporter la sélection en CSV"
              : "Exporter en CSV"
          }
          aria-label="Exporter en CSV"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: isMobile ? "8px 10px" : "6px 10px",
            border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
            borderRadius: 6,
            background: "transparent",
            color: dark ? "#94A3B8" : "#64748B",
            cursor: "pointer",
            fontSize: isMobile ? 14 : 13,
          }}
        >
          <Download size={isMobile ? 18 : 16} /> CSV
        </button>
      </div>

      {/* ═══════════════════════ Tableau ═══════════════════════ */}
      <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            minWidth: tableMinWidth,
          }}
        >
          <thead>
            <tr style={{ background: dark ? "#0F172A" : "#F8FAFC" }}>
              {selectable && (
                <th style={{ padding: cellPadding, width: 40 }}>
                  <button
                    type="button"
                    onClick={() =>
                      onToggleSelectAll && onToggleSelectAll(paginatedData.map((e) => e._id))
                    }
                    disabled={!onToggleSelectAll}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: onToggleSelectAll ? "pointer" : "not-allowed",
                      color: allVisibleSelected
                        ? dark ? "#818CF8" : "#4F46E5"
                        : dark ? "#94A3B8" : "#64748B",
                      padding: 0,
                      display: "flex",
                      alignItems: "center",
                    }}
                    aria-label={allVisibleSelected ? "Tout désélectionner" : "Tout sélectionner"}
                  >
                    {allVisibleSelected ? (
                      <CheckSquare size={isMobile ? 20 : 18} />
                    ) : (
                      <Square size={isMobile ? 20 : 18} />
                    )}
                  </button>
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => requestSort(col.key)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      requestSort(col.key);
                    }
                  }}
                  tabIndex={0}
                  style={{
                    textAlign: col.align,
                    padding: cellPadding,
                    fontSize: isMobile ? 12 : 13,
                    fontWeight: 600,
                    color: dark ? "#94A3B8" : "#64748B",
                    cursor: "pointer",
                    userSelect: "none",
                    whiteSpace: "nowrap",
                    outline: "none",
                  }}
                  aria-sort={
                    sortConfig.key === col.key
                      ? sortConfig.direction === "asc"
                        ? "ascending"
                        : "descending"
                      : undefined
                  }
                  className={col.className}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    {col.label}
                    <SortIcon column={col.key} sortConfig={sortConfig} />
                  </span>
                </th>
              ))}
              <th
                style={{
                  textAlign: "center",
                  padding: cellPadding,
                  fontSize: isMobile ? 12 : 13,
                  fontWeight: 600,
                  color: dark ? "#94A3B8" : "#64748B",
                }}
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((ecole) => {
              const isSelected = selectedIds.has(ecole._id);
              const isHovered = hoveredRowId === ecole._id;

              // ✅ FIX — priorité : sélection > hover > normal
              const rowBg = isSelected ? selectedRowBg : isHovered ? hoverRowBg : baseRowBg;

              return (
                <tr
                  key={ecole._id}
                  onMouseEnter={() => !noMotion && setHoveredRowId(ecole._id)}
                  onMouseLeave={() => setHoveredRowId(null)}
                  style={{
                    borderBottom: `1px solid ${dark ? "rgba(255,255,255,0.05)" : "#F1F5F9"}`,
                    transition: noMotion ? "none" : "background 0.15s",
                    cursor: editingId === ecole._id ? "default" : "pointer",
                    color: dark ? "#F1F5F9" : "#1E293B",
                    background: rowBg,
                  }}
                  onClick={() => {
                    if (editingId !== ecole._id) onSelectEcole(ecole._id);
                  }}
                >
                  {selectable && (
                    <td
                      style={{ padding: cellPadding, width: 40 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => onToggleSelect && onToggleSelect(ecole._id)}
                        disabled={!onToggleSelect}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: onToggleSelect ? "pointer" : "not-allowed",
                          color: isSelected
                            ? dark ? "#818CF8" : "#4F46E5"
                            : dark ? "#94A3B8" : "#64748B",
                          padding: 0,
                        }}
                        aria-label={isSelected ? "Désélectionner" : "Sélectionner"}
                      >
                        {isSelected ? (
                          <CheckSquare size={isMobile ? 20 : 18} />
                        ) : (
                          <Square size={isMobile ? 20 : 18} />
                        )}
                      </button>
                    </td>
                  )}

                  <td style={{ padding: cellPadding, fontWeight: 500 }}>
                    {editingId === ecole._id ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input
                          value={editNom}
                          onChange={(e) => setEditNom(e.target.value)}
                          style={{
                            fontSize: 14,
                            padding: "4px 8px",
                            border: `1px solid ${dark ? "#818CF8" : "#4F46E5"}`,
                            borderRadius: 6,
                            background: dark ? "#0F172A" : "#F9FAFB",
                            color: dark ? "#F1F5F9" : "#1E293B",
                            outline: "none",
                            width: "100%",
                          }}
                          autoFocus
                          aria-label="Nouveau nom de l'école"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveNom(ecole._id);
                            if (e.key === "Escape") cancelEdit();
                          }}
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSaveNom(ecole._id);
                          }}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "#10B981",
                          }}
                          title="Enregistrer"
                          aria-label="Enregistrer le nom"
                        >
                          <Save size={actionIconSize} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            cancelEdit();
                          }}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "#EF4444",
                          }}
                          title="Annuler"
                          aria-label="Annuler"
                        >
                          <X size={actionIconSize} />
                        </button>
                      </div>
                    ) : (
                      ecole.nom
                    )}
                  </td>

                  <td
                    style={{ padding: cellPadding }}
                    className={isMobile ? "hide-on-small" : ""}
                  >
                    <span
                      style={{
                        background: dark ? "#0F172A" : "#F1F5F9",
                        padding: "2px 10px",
                        borderRadius: 20,
                        fontFamily: "monospace",
                        fontSize: isMobile ? 12 : 13,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        color: dark ? "#E2E8F0" : "#1E293B",
                      }}
                    >
                      {ecole.code || "N/A"}
                      {ecole.code && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyCode(ecole.code);
                          }}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: 0,
                          }}
                          title="Copier le code"
                          aria-label="Copier le code"
                        >
                          <Copy size={14} color={dark ? "#94A3B8" : "#64748B"} />
                        </button>
                      )}
                    </span>
                  </td>

                  <td
                    style={{ padding: cellPadding, textAlign: "center" }}
                    className={isMobile ? "hide-on-small" : ""}
                  >
                    {ecole.userCount ?? 0}
                  </td>

                  <td
                    style={{ padding: cellPadding, textAlign: "center" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <StatusBadge statut={ecole.statut} dark={dark} />
                  </td>

                  <td
                    style={{
                      padding: cellPadding,
                      textAlign: "center",
                      fontSize: isMobile ? 12 : 13,
                      color: dark ? "#94A3B8" : "#64748B",
                    }}
                    className="hide-mobile"
                  >
                    {ecole._creationTime
                      ? new Date(ecole._creationTime).toLocaleDateString("fr-FR")
                      : "N/A"}
                  </td>

                  <td
                    style={{ padding: cellPadding, textAlign: "center" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: isMobile ? 4 : 8,
                        justifyContent: "center",
                        flexWrap: "wrap",
                      }}
                    >
                      {editingId !== ecole._id && (
                        <button
                          type="button"
                          onClick={() => startEdit(ecole)}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: dark ? "#818CF8" : "#4F46E5",
                            padding: 4,
                            borderRadius: 8,
                          }}
                          title="Modifier le nom"
                          aria-label="Modifier le nom"
                        >
                          <Edit2 size={actionIconSize} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleToggle(ecole)}
                        disabled={togglingId === ecole._id}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          background: ecole.statut === "active" ? "#EF4444" : "#10B981",
                          color: "white",
                          border: "none",
                          borderRadius: 6,
                          padding: actionButtonPadding,
                          cursor: togglingId === ecole._id ? "not-allowed" : "pointer",
                          fontSize: isMobile ? 12 : 13,
                          fontWeight: 500,
                          opacity: togglingId === ecole._id ? 0.7 : 1,
                        }}
                        title={
                          ecole.statut === "active"
                            ? "Suspendre l'école"
                            : "Réactiver l'école"
                        }
                      >
                        {togglingId === ecole._id ? (
                          <Loader size={actionIconSize} className="st-spin" />
                        ) : ecole.statut === "active" ? (
                          <ShieldOff size={actionIconSize} />
                        ) : (
                          <ShieldCheck size={actionIconSize} />
                        )}
                        {togglingId === ecole._id
                          ? "..."
                          : ecole.statut === "active"
                          ? "Suspendre"
                          : "Réactiver"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(ecole)}
                        disabled={deletingId === ecole._id}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: deletingId === ecole._id ? "not-allowed" : "pointer",
                          color: "#EF4444",
                          opacity: deletingId === ecole._id ? 0.7 : 1,
                        }}
                        title="Supprimer"
                        aria-label="Supprimer"
                      >
                        {deletingId === ecole._id ? (
                          <Loader size={actionIconSize} className="st-spin" />
                        ) : (
                          <Trash2 size={actionIconSize} />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {paginatedData.length === 0 && (
              <tr>
                <td
                  colSpan={selectable ? 6 : 5}
                  style={{
                    textAlign: "center",
                    padding: 40,
                    color: "#94A3B8",
                  }}
                >
                  Aucune école trouvée
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ═══════════════════════ Pagination ═══════════════════════ */}
      <div
        style={{
          padding: headerPadding,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderTop: `1px solid ${dark ? "rgba(255,255,255,0.05)" : "#F1F5F9"}`,
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <span
          style={{
            fontSize: isMobile ? 12 : 13,
            color: dark ? "#94A3B8" : "#64748B",
          }}
        >
          {filteredAndSorted.length > 0
            ? `Affichage ${
                (safeCurrentPage - 1) * pageSize + 1
              }–${Math.min(
                safeCurrentPage * pageSize,
                filteredAndSorted.length
              )} sur ${filteredAndSorted.length}`
            : "Aucune école"}
        </span>
        {totalPages > 1 && (
          <div
            style={{
              display: "flex",
              gap: isMobile ? 4 : 8,
              alignItems: "center",
            }}
          >
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safeCurrentPage === 1}
              style={{
                padding: paginationButtonPadding,
                border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
                borderRadius: 6,
                background: "transparent",
                color: dark ? "#F1F5F9" : "#1E293B",
                cursor: safeCurrentPage === 1 ? "not-allowed" : "pointer",
                opacity: safeCurrentPage === 1 ? 0.5 : 1,
                fontSize: paginationFontSize,
              }}
              aria-label="Page précédente"
            >
              <ChevronLeft size={isMobile ? 18 : 16} /> Précédent
            </button>
            <span
              style={{
                fontSize: paginationFontSize,
                color: dark ? "#94A3B8" : "#64748B",
              }}
            >
              Page {safeCurrentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safeCurrentPage === totalPages}
              style={{
                padding: paginationButtonPadding,
                border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
                borderRadius: 6,
                background: "transparent",
                color: dark ? "#F1F5F9" : "#1E293B",
                cursor: safeCurrentPage === totalPages ? "not-allowed" : "pointer",
                opacity: safeCurrentPage === totalPages ? 0.5 : 1,
                fontSize: paginationFontSize,
              }}
              aria-label="Page suivante"
            >
              Suivant <ChevronRight size={isMobile ? 18 : 16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}