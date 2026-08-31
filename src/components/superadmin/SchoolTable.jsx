import { useState, useMemo } from "react";
import {
  Copy, Trash2, ShieldCheck, ShieldOff, Loader, Edit2, Save, X,
  ChevronUp, ChevronDown, ChevronsUpDown, Search, CheckCircle2, XCircle,
  ChevronLeft, ChevronRight, CheckSquare, Square, Download,
} from "lucide-react";
import toast from "react-hot-toast";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile"; // <-- Import du hook

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
  const isMobile = useIsMobile(); // Détection mobile

  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "nom", direction: "asc" });
  const [deletingId, setDeletingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editNom, setEditNom] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  if (ecoles === undefined) {
    return <TableSkeleton dark={dark} />;
  }

  const filteredAndSorted = useMemo(() => {
    let filtered = ecoles;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      filtered = ecoles.filter(
        (e) => e.nom.toLowerCase().includes(q) || (e.code && e.code.toLowerCase().includes(q))
      );
    }

    return [...filtered].sort((a, b) => {
      let aVal, bVal;
      switch (sortConfig.key) {
        case "nom": aVal = a.nom; bVal = b.nom; break;
        case "code": aVal = a.code || ""; bVal = b.code || ""; break;
        case "userCount": aVal = a.userCount || 0; bVal = b.userCount || 0; break;
        case "statut": aVal = a.statut || "active"; bVal = b.statut || "active"; break;
        case "creationTime": aVal = a._creationTime || 0; bVal = b._creationTime || 0; break;
        default: aVal = a.nom; bVal = b.nom;
      }
      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [ecoles, searchTerm, sortConfig]);

  const totalPages = Math.ceil(filteredAndSorted.length / pageSize);
  const safeCurrentPage = Math.min(currentPage, totalPages || 1);
  const paginatedData = filteredAndSorted.slice(
    (safeCurrentPage - 1) * pageSize,
    safeCurrentPage * pageSize
  );

  const allVisibleSelected = paginatedData.length > 0 && paginatedData.every((e) => selectedIds.has(e._id));

  const requestSort = (key) => {
    setCurrentPage(1);
    if (sortConfig.key === key) {
      setSortConfig({ key, direction: sortConfig.direction === "asc" ? "desc" : "asc" });
    } else {
      setSortConfig({ key, direction: "asc" });
    }
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code).then(() => toast.success("Code copié !"));
  };

  const startEdit = (ecole) => {
    setEditingId(ecole._id);
    setEditNom(ecole.nom);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditNom("");
  };

  const handleSaveNom = async (ecoleId) => {
    if (!editNom.trim()) {
      toast.error("Le nom ne peut pas être vide");
      return;
    }
    try {
      await onUpdateNom(ecoleId, editNom.trim(), user._id);
      toast.success("Nom mis à jour");
      setEditingId(null);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (ecole) => {
    setDeletingId(ecole._id);
    try {
      await onDelete(ecole._id, ecole.nom);
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggle = async (ecole) => {
    setTogglingId(ecole._id);
    try {
      await onToggleStatus(ecole);
    } finally {
      setTogglingId(null);
    }
  };

  const exportCSV = () => {
    const dataToExport = selectedIds.size > 0
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
      "Créée le": e._creationTime ? new Date(e._creationTime).toLocaleDateString() : "N/A",
    }));
    const headers = Object.keys(data[0] || {});
    const csv = [headers.join(","), ...data.map((row) => headers.map((h) => `"${row[h] ?? ""}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = selectedIds.size > 0 ? `ecoles_selection_${selectedIds.size}.csv` : "ecoles.csv";
    link.click();
    toast.success(`Export CSV (${dataToExport.length} école(s)) généré`);
  };

  const SortIcon = ({ column }) => {
    if (sortConfig.key !== column) return <ChevronsUpDown size={14} />;
    return sortConfig.direction === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  };

  const renderStatusBadge = (statut) => {
    const isActive = statut !== "suspendue";
    return (
      <span style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "4px 10px",
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 600,
        background: isActive ? (dark ? "#064E3B" : "#D1FAE5") : (dark ? "#7F1D1D" : "#FEE2E2"),
        color: isActive ? (dark ? "#34D399" : "#065F46") : (dark ? "#F87171" : "#B91C1C"),
      }}>
        {isActive ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
        {isActive ? "Active" : "Suspendue"}
      </span>
    );
  };

  // Styles adaptatifs
  const headerPadding = isMobile ? "10px 12px" : "12px 16px";
  const cellPadding = isMobile ? "10px 8px" : "14px 16px";
  const tableMinWidth = isMobile ? 600 : 700;
  const actionButtonPadding = isMobile ? "8px 10px" : "6px 12px";
  const actionIconSize = isMobile ? 18 : 16;
  const paginationButtonPadding = isMobile ? "8px 12px" : "6px 12px";
  const paginationFontSize = isMobile ? 14 : 13;

  return (
    <div style={{
      background: dark ? "#1E293B" : "#FFFFFF",
      borderRadius: 16,
      overflow: "hidden",
      boxShadow: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)",
      border: `1px solid ${dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}`,
      width: "100%",
    }}>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        .skeleton-cell { background: ${dark ? "#334155" : "#E2E8F0"}; border-radius: 4px; animation: pulse 1.5s ease-in-out infinite; }
        @media (max-width: 600px) {
          .hide-mobile { display: none !important; }
          .hide-on-small { display: none !important; }
        }
      `}</style>

      {/* Barre supérieure */}
      <div style={{
        padding: headerPadding,
        borderBottom: `1px solid ${dark ? "rgba(255,255,255,0.05)" : "#F1F5F9"}`,
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
      }}>
        <Search size={isMobile ? 18 : 16} color={dark ? "#94A3B8" : "#64748B"} />
        <input
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          placeholder="Rechercher dans le tableau..."
          style={{
            border: "none", outline: "none", background: "transparent",
            color: dark ? "#F1F5F9" : "#1E293B",
            fontSize: isMobile ? 16 : 14,
            flex: 1, minWidth: 100,
          }}
          aria-label="Rechercher une école"
        />
        {searchTerm && (
          <button onClick={() => { setSearchTerm(""); setCurrentPage(1); }} style={{ background: "none", border: "none", cursor: "pointer" }} aria-label="Effacer la recherche">
            <X size={isMobile ? 18 : 16} color={dark ? "#94A3B8" : "#64748B"} />
          </button>
        )}
        <div style={{ fontSize: isMobile ? 12 : 13, color: dark ? "#94A3B8" : "#64748B", whiteSpace: "nowrap" }}>
          {filteredAndSorted.length} école(s)
          {selectable && selectedIds.size > 0 && (
            <span> · {selectedIds.size} sélectionnée(s)</span>
          )}
        </div>
        <button
          onClick={exportCSV}
          title={selectedIds.size > 0 ? "Exporter la sélection en CSV" : "Exporter en CSV"}
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

      {/* Tableau */}
      <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: tableMinWidth }}>
          <thead>
            <tr style={{ background: dark ? "#0F172A" : "#F8FAFC" }}>
              {selectable && (
                <th style={{ padding: cellPadding, width: 40 }}>
                  <button
                    onClick={() => onToggleSelectAll && onToggleSelectAll(paginatedData.map((e) => e._id))}
                    disabled={!onToggleSelectAll}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: allVisibleSelected ? (dark ? "#818CF8" : "#4F46E5") : dark ? "#94A3B8" : "#64748B",
                      padding: 0,
                      display: "flex",
                      alignItems: "center",
                    }}
                    aria-label={allVisibleSelected ? "Tout désélectionner" : "Tout sélectionner"}
                  >
                    {allVisibleSelected ? <CheckSquare size={isMobile ? 20 : 18} /> : <Square size={isMobile ? 20 : 18} />}
                  </button>
                </th>
              )}
              {[
                { key: "nom", label: "École", align: "left", className: "" },
                { key: "code", label: "Code", align: "left", className: isMobile ? "hide-on-small" : "" },
                { key: "userCount", label: "Utilisateurs", align: "center", className: isMobile ? "hide-on-small" : "" },
                { key: "statut", label: "Statut", align: "center", className: "" },
                { key: "creationTime", label: "Créée le", align: "center", className: "hide-mobile" },
              ].map((col) => (
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
                  role="button"
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
                  aria-sort={sortConfig.key === col.key ? (sortConfig.direction === "asc" ? "ascending" : "descending") : "none"}
                  className={col.className}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    {col.label}
                    <SortIcon column={col.key} />
                  </span>
                </th>
              ))}
              <th style={{ textAlign: "center", padding: cellPadding, fontSize: isMobile ? 12 : 13, fontWeight: 600, color: dark ? "#94A3B8" : "#64748B" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((ecole) => (
              <tr
                key={ecole._id}
                style={{
                  borderBottom: `1px solid ${dark ? "rgba(255,255,255,0.05)" : "#F1F5F9"}`,
                  transition: "background 0.15s",
                  cursor: editingId === ecole._id ? "default" : "pointer",
                  color: dark ? "#F1F5F9" : "#1E293B",
                  background: selectedIds.has(ecole._id) ? (dark ? "#26334D" : "#EEF2FF") : "transparent",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = dark ? "#26334D" : "#F8FAFC")}
                onMouseLeave={(e) => (e.currentTarget.style.background = selectedIds.has(ecole._id) ? (dark ? "#26334D" : "#EEF2FF") : "transparent")}
                onClick={() => { if (editingId !== ecole._id) onSelectEcole(ecole._id); }}
              >
                {selectable && (
                  <td style={{ padding: cellPadding, width: 40 }} onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onToggleSelect && onToggleSelect(ecole._id)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: selectedIds.has(ecole._id) ? (dark ? "#818CF8" : "#4F46E5") : dark ? "#94A3B8" : "#64748B",
                        padding: 0,
                      }}
                      aria-label={selectedIds.has(ecole._id) ? "Désélectionner" : "Sélectionner"}
                    >
                      {selectedIds.has(ecole._id) ? <CheckSquare size={isMobile ? 20 : 18} /> : <Square size={isMobile ? 20 : 18} />}
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
                          fontSize: isMobile ? 14 : 14, padding: "4px 8px",
                          border: `1px solid ${dark ? "#818CF8" : "#4F46E5"}`,
                          borderRadius: 6,
                          background: dark ? "#0F172A" : "#F9FAFB",
                          color: dark ? "#F1F5F9" : "#1E293B",
                          outline: "none", width: "100%",
                        }}
                        autoFocus
                        aria-label="Nouveau nom de l'école"
                      />
                      <button onClick={(e) => { e.stopPropagation(); handleSaveNom(ecole._id); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#10B981" }} title="Enregistrer">
                        <Save size={actionIconSize} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); cancelEdit(); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444" }} title="Annuler">
                        <X size={actionIconSize} />
                      </button>
                    </div>
                  ) : (
                    ecole.nom
                  )}
                </td>

                <td style={{ padding: cellPadding }} className={isMobile ? "hide-on-small" : ""}>
                  <span style={{
                    background: dark ? "#0F172A" : "#F1F5F9",
                    padding: "2px 10px", borderRadius: 20,
                    fontFamily: "monospace", fontSize: isMobile ? 12 : 13,
                    display: "inline-flex", alignItems: "center", gap: 6,
                    color: dark ? "#E2E8F0" : "#1E293B",
                  }}>
                    {ecole.code || "N/A"}
                    {ecole.code && (
                      <button onClick={(e) => { e.stopPropagation(); copyCode(ecole.code); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }} title="Copier le code">
                        <Copy size={isMobile ? 14 : 14} color={dark ? "#94A3B8" : "#64748B"} />
                      </button>
                    )}
                  </span>
                </td>

                <td style={{ padding: cellPadding, textAlign: "center" }} className={isMobile ? "hide-on-small" : ""}>{ecole.userCount ?? 0}</td>

                <td style={{ padding: cellPadding, textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                  {renderStatusBadge(ecole.statut)}
                </td>

                <td style={{ padding: cellPadding, textAlign: "center", fontSize: isMobile ? 12 : 13, color: dark ? "#94A3B8" : "#64748B" }} className="hide-mobile">
                  {ecole._creationTime ? new Date(ecole._creationTime).toLocaleDateString() : "N/A"}
                </td>

                <td style={{ padding: cellPadding, textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                  <div style={{ display: "flex", gap: isMobile ? 4 : 8, justifyContent: "center", flexWrap: "wrap" }}>
                    {editingId !== ecole._id && (
                      <button onClick={() => startEdit(ecole)} style={{ background: "none", border: "none", cursor: "pointer", color: dark ? "#818CF8" : "#4F46E5", padding: 4, borderRadius: 8 }} title="Modifier le nom">
                        <Edit2 size={actionIconSize} />
                      </button>
                    )}
                    <button
                      onClick={() => handleToggle(ecole)}
                      disabled={togglingId === ecole._id}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        background: ecole.statut === "active" ? "#EF4444" : "#10B981",
                        color: "white", border: "none", borderRadius: 6,
                        padding: actionButtonPadding, cursor: togglingId === ecole._id ? "not-allowed" : "pointer",
                        fontSize: isMobile ? 12 : 13, fontWeight: 500, opacity: togglingId === ecole._id ? 0.7 : 1,
                      }}
                      title={ecole.statut === "active" ? "Suspendre l'école" : "Réactiver l'école"}
                    >
                      {togglingId === ecole._id ? (
                        <Loader size={actionIconSize} className="animate-spin" />
                      ) : ecole.statut === "active" ? (
                        <ShieldOff size={actionIconSize} />
                      ) : (
                        <ShieldCheck size={actionIconSize} />
                      )}
                      {togglingId === ecole._id ? "..." : ecole.statut === "active" ? "Suspendre" : "Réactiver"}
                    </button>
                    <button
                      onClick={() => handleDelete(ecole)}
                      disabled={deletingId === ecole._id}
                      style={{ background: "none", border: "none", cursor: deletingId === ecole._id ? "not-allowed" : "pointer", color: "#EF4444", opacity: deletingId === ecole._id ? 0.7 : 1 }}
                      title="Supprimer"
                    >
                      {deletingId === ecole._id ? <Loader size={actionIconSize} className="animate-spin" /> : <Trash2 size={actionIconSize} />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {paginatedData.length === 0 && (
              <tr>
                <td colSpan={selectable ? 6 : 5} style={{ textAlign: "center", padding: 40, color: dark ? "#94A3B8" : "#94A3B8" }}>
                  Aucune école trouvée
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination + infos */}
      <div style={{
        padding: headerPadding,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderTop: `1px solid ${dark ? "rgba(255,255,255,0.05)" : "#F1F5F9"}`,
        flexWrap: "wrap",
        gap: 8,
      }}>
        <span style={{ fontSize: isMobile ? 12 : 13, color: dark ? "#94A3B8" : "#64748B" }}>
          {filteredAndSorted.length > 0
            ? `Affichage ${((safeCurrentPage - 1) * pageSize) + 1}–${Math.min(safeCurrentPage * pageSize, filteredAndSorted.length)} sur ${filteredAndSorted.length}`
            : "Aucune école"
          }
        </span>
        {totalPages > 1 && (
          <div style={{ display: "flex", gap: isMobile ? 4 : 8, alignItems: "center" }}>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safeCurrentPage === 1}
              style={{ padding: paginationButtonPadding, border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`, borderRadius: 6, background: "transparent", color: dark ? "#F1F5F9" : "#1E293B", cursor: safeCurrentPage === 1 ? "not-allowed" : "pointer", opacity: safeCurrentPage === 1 ? 0.5 : 1, fontSize: paginationFontSize }}
            >
              <ChevronLeft size={isMobile ? 18 : 16} /> Précédent
            </button>
            <span style={{ fontSize: paginationFontSize, color: dark ? "#94A3B8" : "#64748B" }}>
              Page {safeCurrentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safeCurrentPage === totalPages}
              style={{ padding: paginationButtonPadding, border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`, borderRadius: 6, background: "transparent", color: dark ? "#F1F5F9" : "#1E293B", cursor: safeCurrentPage === totalPages ? "not-allowed" : "pointer", opacity: safeCurrentPage === totalPages ? 0.5 : 1, fontSize: paginationFontSize }}
            >
              Suivant <ChevronRight size={isMobile ? 18 : 16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Composant squelette pour le chargement (inchangé)
function TableSkeleton({ dark }) {
  const rows = [1, 2, 3, 4, 5];
  return (
    <div style={{
      background: dark ? "#1E293B" : "#FFFFFF",
      borderRadius: 16,
      overflow: "hidden",
      boxShadow: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)",
      border: `1px solid ${dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}`,
      width: "100%",
    }}>
      <div style={{ padding: "12px 16px", borderBottom: `1px solid ${dark ? "rgba(255,255,255,0.05)" : "#F1F5F9"}`, display: "flex", gap: 8 }}>
        <div className="skeleton-cell" style={{ width: 100, height: 20 }} />
        <div className="skeleton-cell" style={{ flex: 1, height: 20 }} />
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {["École", "Code", "Utilisateurs", "Statut", "Créée le", "Actions"].map((col, i) => (
              <th key={i} style={{ padding: "14px 16px", textAlign: "left" }}>
                <div className="skeleton-cell" style={{ width: 80, height: 14 }} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row}>
              {[1, 2, 3, 4, 5, 6].map((cell) => (
                <td key={cell} style={{ padding: "14px 16px" }}>
                  <div className="skeleton-cell" style={{ width: "100%", height: 20 }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}