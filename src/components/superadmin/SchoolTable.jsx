import { useState, useMemo } from "react";
import {
  Copy, Trash2, ShieldCheck, ShieldOff, Loader, Edit2, Save, X,
  ChevronUp, ChevronDown, ChevronsUpDown, Search, CheckCircle2, XCircle,
  ChevronLeft, ChevronRight, CheckSquare, Square, Download,
} from "lucide-react";
import toast from "react-hot-toast";
import { useStyles } from "../../styles/theme";

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

  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "nom", direction: "asc" });
  const [deletingId, setDeletingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editNom, setEditNom] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Gestion du chargement
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
    setCurrentPage(1); // Réinitialiser la page lors d'un changement de tri
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

  // Export CSV avec option de sélection
  const exportCSV = () => {
    // Si une sélection existe, on n'exporte que la sélection
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
        }
      `}</style>

      {/* Barre supérieure */}
      <div style={{
        padding: "12px 16px",
        borderBottom: `1px solid ${dark ? "rgba(255,255,255,0.05)" : "#F1F5F9"}`,
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
      }}>
        <Search size={16} color={dark ? "#94A3B8" : "#64748B"} />
        <input
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          placeholder="Rechercher dans le tableau..."
          style={{
            border: "none", outline: "none", background: "transparent",
            color: dark ? "#F1F5F9" : "#1E293B", fontSize: 14, flex: 1, minWidth: 150,
          }}
          aria-label="Rechercher une école"
        />
        {searchTerm && (
          <button onClick={() => { setSearchTerm(""); setCurrentPage(1); }} style={{ background: "none", border: "none", cursor: "pointer" }} aria-label="Effacer la recherche">
            <X size={16} color={dark ? "#94A3B8" : "#64748B"} />
          </button>
        )}
        <div style={{ fontSize: 13, color: dark ? "#94A3B8" : "#64748B", whiteSpace: "nowrap" }}>
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
            padding: "6px 10px",
            border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
            borderRadius: 6,
            background: "transparent",
            color: dark ? "#94A3B8" : "#64748B",
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          <Download size={16} /> CSV
        </button>
      </div>

      {/* Tableau */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
          <thead>
            <tr style={{ background: dark ? "#0F172A" : "#F8FAFC" }}>
              {selectable && (
                <th style={{ padding: "14px 12px", width: 40 }}>
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
                    {allVisibleSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                  </button>
                </th>
              )}
              {[
                { key: "nom", label: "École", align: "left" },
                { key: "code", label: "Code", align: "left" },
                { key: "userCount", label: "Utilisateurs", align: "center" },
                { key: "statut", label: "Statut", align: "center" },
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
                    padding: "14px 16px",
                    fontSize: 13,
                    fontWeight: 600,
                    color: dark ? "#94A3B8" : "#64748B",
                    cursor: "pointer",
                    userSelect: "none",
                    whiteSpace: "nowrap",
                    outline: "none",
                  }}
                  aria-sort={sortConfig.key === col.key ? (sortConfig.direction === "asc" ? "ascending" : "descending") : "none"}
                  className={col.className || ""}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    {col.label}
                    <SortIcon column={col.key} />
                  </span>
                </th>
              ))}
              <th style={{ textAlign: "center", padding: "14px 16px", fontSize: 13, fontWeight: 600, color: dark ? "#94A3B8" : "#64748B" }}>Actions</th>
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
                  <td style={{ padding: "14px 12px", width: 40 }} onClick={(e) => e.stopPropagation()}>
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
                      {selectedIds.has(ecole._id) ? <CheckSquare size={18} /> : <Square size={18} />}
                    </button>
                  </td>
                )}

                <td style={{ padding: "14px 16px", fontWeight: 500 }}>
                  {editingId === ecole._id ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <input
                        value={editNom}
                        onChange={(e) => setEditNom(e.target.value)}
                        style={{
                          fontSize: 14, padding: "4px 8px",
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
                        <Save size={16} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); cancelEdit(); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444" }} title="Annuler">
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    ecole.nom
                  )}
                </td>

                <td style={{ padding: "14px 16px" }}>
                  <span style={{
                    background: dark ? "#0F172A" : "#F1F5F9",
                    padding: "2px 10px", borderRadius: 20,
                    fontFamily: "monospace", fontSize: 13,
                    display: "inline-flex", alignItems: "center", gap: 6,
                    color: dark ? "#E2E8F0" : "#1E293B",
                  }}>
                    {ecole.code || "N/A"}
                    {ecole.code && (
                      <button onClick={(e) => { e.stopPropagation(); copyCode(ecole.code); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }} title="Copier le code">
                        <Copy size={14} color={dark ? "#94A3B8" : "#64748B"} />
                      </button>
                    )}
                  </span>
                </td>

                <td style={{ padding: "14px 16px", textAlign: "center" }}>{ecole.userCount ?? 0}</td>

                <td style={{ padding: "14px 16px", textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                  {renderStatusBadge(ecole.statut)}
                </td>

                <td style={{ padding: "14px 16px", textAlign: "center", fontSize: 13, color: dark ? "#94A3B8" : "#64748B" }} className="hide-mobile">
                  {ecole._creationTime ? new Date(ecole._creationTime).toLocaleDateString() : "N/A"}
                </td>

                <td style={{ padding: "14px 16px", textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                  <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                    {editingId !== ecole._id && (
                      <button onClick={() => startEdit(ecole)} style={{ background: "none", border: "none", cursor: "pointer", color: dark ? "#818CF8" : "#4F46E5", padding: 8, borderRadius: 8 }} title="Modifier le nom">
                        <Edit2 size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => handleToggle(ecole)}
                      disabled={togglingId === ecole._id}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        background: ecole.statut === "active" ? "#EF4444" : "#10B981",
                        color: "white", border: "none", borderRadius: 6,
                        padding: "6px 12px", cursor: togglingId === ecole._id ? "not-allowed" : "pointer",
                        fontSize: 13, fontWeight: 500, opacity: togglingId === ecole._id ? 0.7 : 1,
                      }}
                      title={ecole.statut === "active" ? "Suspendre l'école" : "Réactiver l'école"}
                    >
                      {togglingId === ecole._id ? (
                        <Loader size={16} className="animate-spin" />
                      ) : ecole.statut === "active" ? (
                        <ShieldOff size={16} />
                      ) : (
                        <ShieldCheck size={16} />
                      )}
                      {togglingId === ecole._id ? "..." : ecole.statut === "active" ? "Suspendre" : "Réactiver"}
                    </button>
                    <button
                      onClick={() => handleDelete(ecole)}
                      disabled={deletingId === ecole._id}
                      style={{ background: "none", border: "none", cursor: deletingId === ecole._id ? "not-allowed" : "pointer", color: "#EF4444", opacity: deletingId === ecole._id ? 0.7 : 1 }}
                      title="Supprimer"
                    >
                      {deletingId === ecole._id ? <Loader size={18} className="animate-spin" /> : <Trash2 size={18} />}
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
        padding: "12px 16px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderTop: `1px solid ${dark ? "rgba(255,255,255,0.05)" : "#F1F5F9"}`,
        flexWrap: "wrap",
        gap: 8,
      }}>
        <span style={{ fontSize: 13, color: dark ? "#94A3B8" : "#64748B" }}>
          {filteredAndSorted.length > 0
            ? `Affichage ${((safeCurrentPage - 1) * pageSize) + 1}–${Math.min(safeCurrentPage * pageSize, filteredAndSorted.length)} sur ${filteredAndSorted.length}`
            : "Aucune école"
          }
        </span>
        {totalPages > 1 && (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safeCurrentPage === 1}
              style={{ padding: "6px 12px", border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`, borderRadius: 6, background: "transparent", color: dark ? "#F1F5F9" : "#1E293B", cursor: safeCurrentPage === 1 ? "not-allowed" : "pointer", opacity: safeCurrentPage === 1 ? 0.5 : 1 }}
            >
              <ChevronLeft size={16} /> Précédent
            </button>
            <span style={{ fontSize: 13, color: dark ? "#94A3B8" : "#64748B" }}>
              Page {safeCurrentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safeCurrentPage === totalPages}
              style={{ padding: "6px 12px", border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`, borderRadius: 6, background: "transparent", color: dark ? "#F1F5F9" : "#1E293B", cursor: safeCurrentPage === totalPages ? "not-allowed" : "pointer", opacity: safeCurrentPage === totalPages ? 0.5 : 1 }}
            >
              Suivant <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Composant squelette pour le chargement
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