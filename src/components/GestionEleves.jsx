import { useState, useRef, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import * as XLSX from "xlsx";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useConfirm } from "@/hooks/useConfirm";
import { ConfirmDialog } from "./ConfirmDialog";
import toast from "react-hot-toast";
import { Skeleton } from "./Skeleton";
import { AddEleveForm } from "./eleves/AddEleveForm";
import { ImportExcel } from "./eleves/ImportExcel";
import { trierClasses } from "@/utils/sort";
import {
  X, User, MapPin, Phone, Users, Calendar, GraduationCap,
  Search, Download, Trash2, CheckSquare, Square, List, Grid,
  ChevronUp, ChevronDown, ChevronRight, UserCheck, UserX, School,
  Filter, Plus, Upload, AlertCircle, Link2, SlidersHorizontal, RotateCcw,
} from "lucide-react";
import { AssociationsEleveModal } from "./eleves/AssociationsEleveModal";

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
          width: 32, height: 32, borderRadius: 8,
          background: `${color}20`,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ color: dark ? "#94A3B8" : "#64748B", fontSize: 10.5, fontWeight: 500, whiteSpace: "nowrap" }}>
          {label}
        </div>
        <div style={{ color: dark ? "#F1F5F9" : "#1E293B", fontSize: 18, fontWeight: 700, lineHeight: 1.1 }}>
          {value}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// BOTTOM SHEET DE FILTRES
// ============================================================
function FiltersSheet({
  open, onClose, dark,
  searchQuery, setSearchQuery,
  classeFiltre, setClasseFiltre,
  filterSexe, setFilterSexe,
  filterStatut, setFilterStatut,
  sortBy, setSortBy,
  sortOrder, setSortOrder,
  classesTriees,
  onReset,
  activeFiltersCount,
}) {
  if (!open) return null;

  const labelStyle = {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: dark ? "#94A3B8" : "#64748B",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  };

  const fieldStyle = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 10,
    border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
    background: dark ? "#0F172A" : "#F8FAFC",
    color: dark ? "#F1F5F9" : "#1E293B",
    fontSize: 15,
    outline: "none",
    boxSizing: "border-box",
    appearance: "none",
    WebkitAppearance: "none",
  };

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.45)",
          zIndex: 1100,
          animation: "fadeIn 0.18s ease-out",
        }}
      />
      <div
        style={{
          position: "fixed",
          left: 0, right: 0, bottom: 0,
          background: dark ? "#1E293B" : "#FFFFFF",
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          padding: "12px 16px 24px",
          zIndex: 1101,
          maxHeight: "85vh",
          overflowY: "auto",
          boxShadow: "0 -8px 30px rgba(0,0,0,0.25)",
          animation: "slideUp 0.25s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <div style={{ width: 40, height: 4, borderRadius: 2, background: dark ? "#475569" : "#CBD5E1", margin: "0 auto 16px" }} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: dark ? "#F1F5F9" : "#1E293B" }}>
            Filtrer et trier
          </h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: dark ? "#94A3B8" : "#64748B", padding: 4 }}>
            <X size={22} />
          </button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Recherche</label>
          <div style={{ position: "relative" }}>
            <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: dark ? "#94A3B8" : "#64748B" }} />
            <input
              type="text"
              placeholder="Nom, prénom, parent…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ ...fieldStyle, paddingLeft: 36 }}
            />
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Classe</label>
          <select value={classeFiltre} onChange={(e) => setClasseFiltre(e.target.value)} style={fieldStyle}>
            <option value="">Toutes les classes</option>
            {classesTriees.map((c) => (
              <option key={c._id} value={c.nom}>{c.nom}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Sexe</label>
          <div style={{ display: "flex", gap: 8 }}>
            {[{ v: "all", l: "Tous" }, { v: "M", l: "Masculin" }, { v: "F", l: "Féminin" }].map((opt) => (
              <button
                key={opt.v}
                onClick={() => setFilterSexe(opt.v)}
                style={{
                  flex: 1,
                  padding: "10px 8px",
                  borderRadius: 10,
                  border: `1px solid ${filterSexe === opt.v ? (dark ? "#818CF8" : "#4F46E5") : (dark ? "#334155" : "#E2E8F0")}`,
                  background: filterSexe === opt.v ? (dark ? "#312E81" : "#EEF2FF") : "transparent",
                  color: filterSexe === opt.v ? (dark ? "#C7D2FE" : "#4F46E5") : (dark ? "#CBD5E1" : "#475569"),
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                {opt.l}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Statut</label>
          <div style={{ display: "flex", gap: 8 }}>
            {[{ v: "all", l: "Tous" }, { v: "assigned", l: "Assignés" }, { v: "unassigned", l: "Non assignés" }].map((opt) => (
              <button
                key={opt.v}
                onClick={() => setFilterStatut(opt.v)}
                style={{
                  flex: 1,
                  padding: "10px 8px",
                  borderRadius: 10,
                  border: `1px solid ${filterStatut === opt.v ? (dark ? "#818CF8" : "#4F46E5") : (dark ? "#334155" : "#E2E8F0")}`,
                  background: filterStatut === opt.v ? (dark ? "#312E81" : "#EEF2FF") : "transparent",
                  color: filterStatut === opt.v ? (dark ? "#C7D2FE" : "#4F46E5") : (dark ? "#CBD5E1" : "#475569"),
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                {opt.l}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Trier par</label>
          <div style={{ display: "flex", gap: 8 }}>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ ...fieldStyle, flex: 1 }}>
              <option value="nom">Nom</option>
              <option value="prenom">Prénom</option>
              <option value="classe">Classe</option>
              <option value="parent">Parent</option>
            </select>
            <button
              onClick={() => setSortOrder((o) => (o === "asc" ? "desc" : "asc"))}
              style={{
                padding: "12px 14px",
                borderRadius: 10,
                border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
                background: dark ? "#0F172A" : "#F8FAFC",
                color: dark ? "#F1F5F9" : "#1E293B",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              {sortOrder === "asc" ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              {sortOrder === "asc" ? "A→Z" : "Z→A"}
            </button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => { onReset(); onClose(); }}
            style={{
              flex: 1,
              padding: "14px 16px",
              borderRadius: 12,
              border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
              background: "transparent",
              color: dark ? "#CBD5E1" : "#475569",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <RotateCcw size={16} />
            Réinitialiser
          </button>
          <button
            onClick={onClose}
            style={{
              flex: 2,
              padding: "14px 16px",
              borderRadius: 12,
              border: "none",
              background: dark ? "#818CF8" : "#4F46E5",
              color: "#FFFFFF",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Voir les résultats
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </>
  );
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================
export function GestionEleves({
  eleves,
  addEleve,
  removeEleve,
  importEleves,
  classes,
  ecoleId,
  user,
  anneeId,
}) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();
  const fileInputRef = useRef(null);
  const [importing, setImporting] = useState(false);
  const [classeFiltre, setClasseFiltre] = useState("");
  const [selectedDetailEleve, setSelectedDetailEleve] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const { confirm, dialogProps } = useConfirm();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterSexe, setFilterSexe] = useState("all");
  const [filterStatut, setFilterStatut] = useState("all");
  const [sortBy, setSortBy] = useState("nom");
  const [sortOrder, setSortOrder] = useState("asc");
  const [selectedIds, setSelectedIds] = useState([]);
  const [viewMode, setViewMode] = useState("cards");

  const parents = useQuery(api.users.listParentsByEcole, ecoleId ? { ecoleId } : "skip") ?? [];
  const elevesUsers = useQuery(api.users.listElevesUsers, ecoleId ? { ecoleId } : "skip") ?? [];
  const [showAssociationsFor, setShowAssociationsFor] = useState(null);

  const classesTriees = useMemo(
    () => [...classes].sort((a, b) => trierClasses(a.nom, b.nom)),
    [classes]
  );

  const enrichedEleves = useMemo(
    () =>
      eleves.map((e) => ({
        ...e,
        parentName: parents.find((p) => p._id === e.parentId)?.nom ?? "—",
        parentLogin: parents.find((p) => p._id === e.parentId)?.login ?? "",
        eleveUserName: elevesUsers.find((u) => u._id === e.userId)?.nom ?? "—",
        eleveUserLogin: elevesUsers.find((u) => u._id === e.userId)?.login ?? "",
      })),
    [eleves, parents, elevesUsers]
  );

  const stats = useMemo(() => {
    const total = enrichedEleves.length;
    const garcons = enrichedEleves.filter((e) => e.sexe === "M" || e.sexe === "masculin").length;
    const filles = total - garcons;
    const assignes = enrichedEleves.filter((e) => e.classeId || e.classe).length;
    const nonAssignes = total - assignes;
    return { total, garcons, filles, assignes, nonAssignes };
  }, [enrichedEleves]);

  const filteredAndSorted = useMemo(() => {
    let result = [...enrichedEleves];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.nom?.toLowerCase().includes(q) ||
          e.prenom?.toLowerCase().includes(q) ||
          e.postnom?.toLowerCase().includes(q) ||
          e.classe?.toLowerCase().includes(q) ||
          e.parentName?.toLowerCase().includes(q)
      );
    }

    if (classeFiltre) result = result.filter((e) => e.classe === classeFiltre);
    if (filterSexe !== "all") {
      result = result.filter(
        (e) =>
          e.sexe === filterSexe ||
          (filterSexe === "M" && e.sexe === "masculin") ||
          (filterSexe === "F" && e.sexe === "feminin")
      );
    }
    if (filterStatut === "assigned") result = result.filter((e) => e.classeId || e.classe);
    else if (filterStatut === "unassigned") result = result.filter((e) => !e.classeId && !e.classe);

    result.sort((a, b) => {
      let valA, valB;
      switch (sortBy) {
        case "nom": valA = a.nom?.toLowerCase() || ""; valB = b.nom?.toLowerCase() || ""; break;
        case "prenom": valA = a.prenom?.toLowerCase() || ""; valB = b.prenom?.toLowerCase() || ""; break;
        case "classe": valA = a.classe?.toLowerCase() || "zzz"; valB = b.classe?.toLowerCase() || "zzz"; break;
        case "parent": valA = a.parentName?.toLowerCase() || "zzz"; valB = b.parentName?.toLowerCase() || "zzz"; break;
        default: valA = a.nom?.toLowerCase() || ""; valB = b.nom?.toLowerCase() || "";
      }
      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [enrichedEleves, searchQuery, classeFiltre, filterSexe, filterStatut, sortBy, sortOrder]);

  const activeFiltersCount = useMemo(() => {
    let n = 0;
    if (searchQuery.trim()) n++;
    if (classeFiltre) n++;
    if (filterSexe !== "all") n++;
    if (filterStatut !== "all") n++;
    return n;
  }, [searchQuery, classeFiltre, filterSexe, filterStatut]);

  const resetFilters = () => {
    setSearchQuery("");
    setClasseFiltre("");
    setFilterSexe("all");
    setFilterStatut("all");
    setSortBy("nom");
    setSortOrder("asc");
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredAndSorted.length) setSelectedIds([]);
    else setSelectedIds(filteredAndSorted.map((e) => e._id));
  };

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const ok = await confirm("Supprimer des élèves", `Voulez-vous vraiment supprimer ${selectedIds.length} élève(s) ?`);
    if (ok) {
      for (const id of selectedIds) await removeEleve({ id, actionUserId: user._id });
      setSelectedIds([]);
      toast.success(`${selectedIds.length} élève(s) supprimé(s)`);
    }
  };

  const exportExcel = (data, filename) => {
    const rows = data.map((e) => ({
      Nom: e.nom || "", Postnom: e.postnom || "", Prénom: e.prenom || "",
      Classe: e.classe || "Non assigné",
      Sexe: e.sexe === "M" || e.sexe === "masculin" ? "M" : e.sexe === "F" || e.sexe === "feminin" ? "F" : "",
      Parent: e.parentName || "", "Login parent": e.parentLogin || "",
    }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Élèves");
    XLSX.writeFile(workbook, filename);
  };

  const handleExportFiltered = () => {
    exportExcel(filteredAndSorted, "eleves_filtres.xlsx");
    toast.success("Export Excel généré");
  };

  const handleExportSelected = () => {
    if (selectedIds.length === 0) return;
    const selected = enrichedEleves.filter((e) => selectedIds.includes(e._id));
    exportExcel(selected, "eleves_selection.xlsx");
  };

  const handleDeleteOne = async (eleve) => {
    const ok = await confirm("Supprimer", `Voulez-vous vraiment supprimer ${eleve.prenom} ${eleve.nom} ?`);
    if (ok) {
      await removeEleve({ id: eleve._id, actionUserId: user._id });
      toast.success("Élève supprimé");
      setSelectedDetailEleve(null);
    }
  };

  if (eleves === undefined) return <Skeleton height={200} />;

  const effectiveViewMode = isMobile ? "cards" : viewMode;
  const selectionMode = selectedIds.length > 0;

  // ============================
  // RENDU TABLEAU (desktop)
  // ============================
  const renderTable = () => (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ borderBottom: `2px solid ${dark ? "#334155" : "#E2E8F0"}` }}>
            <th style={{ padding: "10px 8px", width: 40 }}>
              <button onClick={toggleSelectAll} style={{ background: "none", border: "none", cursor: "pointer", color: dark ? "#F1F5F9" : "#1E293B" }}>
                {selectedIds.length === filteredAndSorted.length && filteredAndSorted.length > 0 ? <CheckSquare size={18} /> : <Square size={18} />}
              </button>
            </th>
            <th style={{ padding: "10px 8px", textAlign: "left", cursor: "pointer", color: dark ? "#94A3B8" : "#64748B" }} onClick={() => { if (sortBy === "nom") setSortOrder((o) => o === "asc" ? "desc" : "asc"); else { setSortBy("nom"); setSortOrder("asc"); } }}>
              Nom {sortBy === "nom" && (sortOrder === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
            </th>
            <th style={{ padding: "10px 8px", textAlign: "left", color: dark ? "#94A3B8" : "#64748B" }}>Prénom</th>
            <th style={{ padding: "10px 8px", textAlign: "left", color: dark ? "#94A3B8" : "#64748B" }}>Classe</th>
            <th style={{ padding: "10px 8px", textAlign: "center", color: dark ? "#94A3B8" : "#64748B" }}>Sexe</th>
            <th style={{ padding: "10px 8px", textAlign: "left", color: dark ? "#94A3B8" : "#64748B" }}>Parent</th>
            <th style={{ padding: "10px 8px", textAlign: "center", color: dark ? "#94A3B8" : "#64748B" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredAndSorted.map((eleve) => (
            <tr
              key={eleve._id}
              style={{
                borderBottom: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
                background: selectedIds.includes(eleve._id) ? (dark ? "#2D3748" : "#F1F5F9") : "transparent",
                cursor: "pointer",
              }}
              onClick={() => {
                if (selectionMode) toggleSelectOne(eleve._id);
                else setSelectedDetailEleve(eleve);
              }}
            >
              <td style={{ padding: "8px" }} onClick={(e) => e.stopPropagation()}>
                <button onClick={() => toggleSelectOne(eleve._id)} style={{ background: "none", border: "none", cursor: "pointer", color: dark ? "#F1F5F9" : "#1E293B" }}>
                  {selectedIds.includes(eleve._id) ? <CheckSquare size={18} color={dark ? "#818CF8" : "#4F46E5"} /> : <Square size={18} />}
                </button>
              </td>
              <td style={{ padding: "8px", fontWeight: 500, color: dark ? "#F1F5F9" : "#1E293B" }}>{eleve.nom} {eleve.postnom}</td>
              <td style={{ padding: "8px", color: dark ? "#F1F5F9" : "#1E293B" }}>{eleve.prenom}</td>
              <td style={{ padding: "8px" }}>
                {eleve.classe ? (
                  <span style={{ background: dark ? "#312E81" : "#EEF2FF", color: dark ? "#A5B4FC" : "#4F46E5", padding: "2px 8px", borderRadius: 12, fontSize: 12, fontWeight: 500 }}>{eleve.classe}</span>
                ) : (
                  <span style={{ color: "#F59E0B", fontSize: 12, fontStyle: "italic" }}>Non assigné</span>
                )}
              </td>
              <td style={{ padding: "8px", textAlign: "center", color: dark ? "#94A3B8" : "#64748B" }}>
                {eleve.sexe === "M" || eleve.sexe === "masculin" ? "M" : eleve.sexe === "F" || eleve.sexe === "feminin" ? "F" : "?"}
              </td>
              <td style={{ padding: "8px", color: dark ? "#94A3B8" : "#64748B" }}>{eleve.parentName}</td>
              <td style={{ padding: "8px", textAlign: "center", whiteSpace: "nowrap" }} onClick={(e) => e.stopPropagation()}>
                <button onClick={() => setShowAssociationsFor(eleve)} title="Associations" style={{ background: "none", border: "none", cursor: "pointer", color: dark ? "#60A5FA" : "#2563EB", marginRight: 4, padding: 4 }}><Link2 size={16} /></button>
                <button onClick={() => setSelectedDetailEleve(eleve)} title="Détails" style={{ background: "none", border: "none", cursor: "pointer", color: dark ? "#F59E0B" : "#D97706", marginRight: 4, padding: 4 }}><Search size={16} /></button>
                <button onClick={() => handleDeleteOne(eleve)} title="Supprimer" style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444", padding: 4 }}><Trash2 size={16} /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // ============================
  // RENDU CARTES COMPACTES (mobile + desktop)
  // ============================
  const renderCards = () => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(300px, 1fr))",
        gap: isMobile ? 8 : 12,
      }}
    >
      {filteredAndSorted.map((eleve) => {
        const isSelected = selectedIds.includes(eleve._id);

        const handleCardClick = () => {
          if (selectionMode) {
            toggleSelectOne(eleve._id);
          } else {
            setSelectedDetailEleve(eleve);
          }
        };

        return (
          <div
            key={eleve._id}
            onClick={handleCardClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleCardClick();
              }
            }}
            style={{
              background: dark ? "#1E293B" : "#FFFFFF",
              borderRadius: 12,
              padding: isMobile ? "10px 12px" : "10px 14px",
              boxShadow: dark ? "0 1px 2px rgba(0,0,0,0.25)" : "0 1px 2px rgba(0,0,0,0.04)",
              border: `1.5px solid ${
                isSelected
                  ? dark ? "#818CF8" : "#4F46E5"
                  : dark ? "#334155" : "#E2E8F0"
              }`,
              display: "flex",
              alignItems: "center",
              gap: isMobile ? 10 : 12,
              cursor: "pointer",
              transition: "border-color 0.15s, background-color 0.15s, transform 0.1s",
              userSelect: "none",
              WebkitTapHighlightColor: "transparent",
              minWidth: 0,
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.99)")}
            onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            {/* Checkbox */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleSelectOne(eleve._id);
              }}
              aria-label={isSelected ? "Désélectionner" : "Sélectionner"}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                color: isSelected
                  ? dark ? "#818CF8" : "#4F46E5"
                  : dark ? "#64748B" : "#94A3B8",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
              }}
            >
              {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
            </button>

            {/* Avatar */}
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
                flexShrink: 0,
              }}
            >
              {eleve.prenom?.[0]}{eleve.nom?.[0]}
            </div>

            {/* Infos : 2 lignes compactes */}
            <div style={{ minWidth: 0, flex: 1 }}>
              {/* Ligne 1 : Prénom Nom · Badge classe */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                <span
                  style={{
                    fontWeight: 600,
                    fontSize: isMobile ? 13.5 : 14,
                    color: dark ? "#F1F5F9" : "#1E293B",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    minWidth: 0,
                  }}
                >
                  {eleve.prenom} {eleve.nom}
                </span>
                {eleve.classe ? (
                  <span
                    style={{
                      background: dark ? "#312E81" : "#EEF2FF",
                      color: dark ? "#A5B4FC" : "#4F46E5",
                      padding: "1px 7px",
                      borderRadius: 10,
                      fontSize: 10,
                      fontWeight: 600,
                      flexShrink: 0,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {eleve.classe}
                  </span>
                ) : (
                  <span
                    style={{
                      color: dark ? "#FCD34D" : "#B45309",
                      fontSize: 10,
                      fontWeight: 600,
                      flexShrink: 0,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Non assigné
                  </span>
                )}
              </div>

              {/* Ligne 2 : Parent · Sexe */}
              <div
                style={{
                  fontSize: isMobile ? 11 : 11.5,
                  color: dark ? "#94A3B8" : "#64748B",
                  marginTop: 2,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {eleve.parentName !== "—" ? eleve.parentName : "Sans parent"}
                {eleve.sexe
                  ? ` · ${eleve.sexe === "M" || eleve.sexe === "masculin" ? "M" : "F"}`
                  : ""}
              </div>
            </div>

            {/* Chevron : visible uniquement hors mode sélection */}
            {!selectionMode && (
              <ChevronRight
                size={18}
                color={dark ? "#475569" : "#CBD5E1"}
                style={{ flexShrink: 0 }}
              />
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: isMobile ? "10px 8px 90px" : "20px 16px", width: "100%", boxSizing: "border-box" }}>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
      `}</style>

      {/* ========== EN-TÊTE ========== */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: isMobile ? 12 : 20 }}>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ fontSize: isMobile ? 18 : 24, fontWeight: 700, color: dark ? "#F1F5F9" : "#1E293B", margin: 0, lineHeight: 1.2 }}>
            Élèves
          </h2>
          <p style={{ color: dark ? "#94A3B8" : "#64748B", marginTop: 2, marginBottom: 0, fontSize: isMobile ? 11.5 : 13 }}>
            {filteredAndSorted.length} sur {eleves.length}
            {activeFiltersCount > 0 ? ` · ${activeFiltersCount} filtre${activeFiltersCount > 1 ? "s" : ""}` : ""}
          </p>
        </div>

        {!isMobile && (
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleExportFiltered} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`, background: dark ? "#1E293B" : "#FFFFFF", color: dark ? "#F1F5F9" : "#1E293B", fontWeight: 500, cursor: "pointer", fontSize: 13 }}>
              <Download size={15} /> Exporter
            </button>
            <button onClick={() => setShowAddForm(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, background: dark ? "#818CF8" : "#4F46E5", color: "#FFF", border: "none", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>
              <Plus size={15} /> Ajouter
            </button>
          </div>
        )}
      </div>

      {/* ========== STATS ========== */}
      <div
        style={{
          display: isMobile ? "flex" : "grid",
          gridTemplateColumns: isMobile ? undefined : "repeat(auto-fit, minmax(150px, 1fr))",
          gap: isMobile ? 8 : 12,
          marginBottom: isMobile ? 12 : 18,
          overflowX: isMobile ? "auto" : "visible",
          paddingBottom: isMobile ? 4 : 0,
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
        }}
      >
        <StatCard icon={<Users size={18} color="#4F46E5" />} label="Total" value={stats.total} color="#4F46E5" dark={dark} isMobile={isMobile} />
        <StatCard icon={<UserCheck size={18} color="#10B981" />} label="Assignés" value={stats.assignes} color="#10B981" dark={dark} isMobile={isMobile} />
        <StatCard icon={<UserX size={18} color="#F59E0B" />} label="Non assignés" value={stats.nonAssignes} color="#F59E0B" dark={dark} isMobile={isMobile} />
        <StatCard icon={<Users size={18} color="#0EA5E9" />} label="Garçons" value={stats.garcons} color="#0EA5E9" dark={dark} isMobile={isMobile} />
        <StatCard icon={<Users size={18} color="#EC4899" />} label="Filles" value={stats.filles} color="#EC4899" dark={dark} isMobile={isMobile} />
      </div>

      {/* ========== BARRE OUTILS ========== */}
      {isMobile ? (
        <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "stretch" }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: dark ? "#94A3B8" : "#64748B" }} />
            <input
              type="text"
              placeholder="Rechercher…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "12px 12px 12px 38px",
                borderRadius: 12,
                border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
                background: dark ? "#1E293B" : "#FFFFFF",
                color: dark ? "#F1F5F9" : "#1E293B",
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
              border: `1px solid ${activeFiltersCount > 0 ? (dark ? "#818CF8" : "#4F46E5") : (dark ? "#334155" : "#E2E8F0")}`,
              background: activeFiltersCount > 0 ? (dark ? "#312E81" : "#EEF2FF") : (dark ? "#1E293B" : "#FFFFFF"),
              color: activeFiltersCount > 0 ? (dark ? "#C7D2FE" : "#4F46E5") : (dark ? "#F1F5F9" : "#1E293B"),
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
              <span style={{ background: dark ? "#818CF8" : "#4F46E5", color: "#FFF", borderRadius: 10, padding: "1px 6px", fontSize: 10, fontWeight: 700 }}>
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "stretch" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 240 }}>
            <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: dark ? "#94A3B8" : "#64748B" }} />
            <input
              type="text"
              placeholder="Rechercher un élève, un parent…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: "100%", padding: "10px 12px 10px 38px", borderRadius: 8, border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`, background: dark ? "#1E293B" : "#FFFFFF", color: dark ? "#F1F5F9" : "#1E293B", fontSize: 14, outline: "none", boxSizing: "border-box" }}
            />
          </div>
          <select value={classeFiltre} onChange={(e) => setClasseFiltre(e.target.value)} style={{ padding: "10px 14px", borderRadius: 8, border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`, background: dark ? "#1E293B" : "#FFF", color: dark ? "#F1F5F9" : "#1E293B", fontSize: 14, cursor: "pointer" }}>
            <option value="">Toutes les classes</option>
            {classesTriees.map((c) => <option key={c._id} value={c.nom}>{c.nom}</option>)}
          </select>
          <select value={filterSexe} onChange={(e) => setFilterSexe(e.target.value)} style={{ padding: "10px 14px", borderRadius: 8, border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`, background: dark ? "#1E293B" : "#FFF", color: dark ? "#F1F5F9" : "#1E293B", fontSize: 14, cursor: "pointer" }}>
            <option value="all">Tous les sexes</option>
            <option value="M">Masculin</option>
            <option value="F">Féminin</option>
          </select>
          <select value={filterStatut} onChange={(e) => setFilterStatut(e.target.value)} style={{ padding: "10px 14px", borderRadius: 8, border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`, background: dark ? "#1E293B" : "#FFF", color: dark ? "#F1F5F9" : "#1E293B", fontSize: 14, cursor: "pointer" }}>
            <option value="all">Tous</option>
            <option value="assigned">Assignés</option>
            <option value="unassigned">Non assignés</option>
          </select>
          <div style={{ display: "flex", gap: 4, padding: 4, background: dark ? "#1E293B" : "#FFFFFF", borderRadius: 8, border: `1px solid ${dark ? "#334155" : "#E2E8F0"}` }}>
            <button onClick={() => setViewMode("table")} style={{ padding: 6, borderRadius: 6, border: "none", background: viewMode === "table" ? (dark ? "#312E81" : "#EEF2FF") : "transparent", color: viewMode === "table" ? (dark ? "#A5B4FC" : "#4F46E5") : (dark ? "#94A3B8" : "#64748B"), cursor: "pointer" }}><List size={16} /></button>
            <button onClick={() => setViewMode("cards")} style={{ padding: 6, borderRadius: 6, border: "none", background: viewMode === "cards" ? (dark ? "#312E81" : "#EEF2FF") : "transparent", color: viewMode === "cards" ? (dark ? "#A5B4FC" : "#4F46E5") : (dark ? "#94A3B8" : "#64748B"), cursor: "pointer" }}><Grid size={16} /></button>
          </div>
        </div>
      )}

      {/* ========== PUCES FILTRES ACTIFS ========== */}
      {activeFiltersCount > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
          {searchQuery.trim() && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", background: dark ? "#312E81" : "#EEF2FF", color: dark ? "#C7D2FE" : "#4F46E5", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
              « {searchQuery} » <X size={12} style={{ cursor: "pointer" }} onClick={() => setSearchQuery("")} />
            </span>
          )}
          {classeFiltre && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", background: dark ? "#312E81" : "#EEF2FF", color: dark ? "#C7D2FE" : "#4F46E5", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
              {classeFiltre} <X size={12} style={{ cursor: "pointer" }} onClick={() => setClasseFiltre("")} />
            </span>
          )}
          {filterSexe !== "all" && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", background: dark ? "#312E81" : "#EEF2FF", color: dark ? "#C7D2FE" : "#4F46E5", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
              {filterSexe === "M" ? "Masculin" : "Féminin"} <X size={12} style={{ cursor: "pointer" }} onClick={() => setFilterSexe("all")} />
            </span>
          )}
          {filterStatut !== "all" && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", background: dark ? "#312E81" : "#EEF2FF", color: dark ? "#C7D2FE" : "#4F46E5", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
              {filterStatut === "assigned" ? "Assignés" : "Non assignés"} <X size={12} style={{ cursor: "pointer" }} onClick={() => setFilterStatut("all")} />
            </span>
          )}
          <button onClick={resetFilters} style={{ padding: "4px 10px", background: "transparent", border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`, color: dark ? "#94A3B8" : "#64748B", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
            Tout effacer
          </button>
        </div>
      )}

      {/* ========== LISTE ========== */}
      {filteredAndSorted.length > 0 ? (
        effectiveViewMode === "table" ? renderTable() : renderCards()
      ) : (
        <div style={{ textAlign: "center", padding: isMobile ? 32 : 60, color: dark ? "#94A3B8" : "#64748B" }}>
          <School size={isMobile ? 40 : 56} style={{ marginBottom: 12, opacity: 0.5 }} />
          <p style={{ margin: 0, fontSize: isMobile ? 13 : 15 }}>Aucun élève ne correspond aux critères.</p>
          {activeFiltersCount > 0 && (
            <button onClick={resetFilters} style={{ marginTop: 12, padding: "8px 16px", borderRadius: 8, border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`, background: "transparent", color: dark ? "#F1F5F9" : "#1E293B", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
              Réinitialiser les filtres
            </button>
          )}
        </div>
      )}

      {/* ========== FAB AJOUTER ========== */}
      {isMobile && (
        <button
          onClick={() => setShowAddForm(true)}
          style={{
            position: "fixed",
            bottom: selectionMode ? 90 : 24,
            right: 20,
            width: 56,
            height: 56,
            borderRadius: 28,
            background: dark ? "#818CF8" : "#4F46E5",
            color: "#FFFFFF",
            border: "none",
            boxShadow: "0 6px 20px rgba(79,70,229,0.4)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 900,
            transition: "bottom 0.2s ease, transform 0.15s ease",
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.94)")}
          onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          title="Ajouter un élève"
        >
          <Plus size={26} />
        </button>
      )}

      {/* ========== BARRE D'ACTIONS GROUPÉES MOBILE ========== */}
      {isMobile && selectionMode && (
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            background: dark ? "#1E293B" : "#FFFFFF",
            borderTop: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
            padding: "10px 14px calc(10px + env(safe-area-inset-bottom))",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            zIndex: 950,
            boxShadow: "0 -4px 20px rgba(0,0,0,0.15)",
            animation: "slideUpBar 0.2s ease-out",
          }}
        >
          <style>{`@keyframes slideUpBar { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ background: dark ? "#312E81" : "#EEF2FF", color: dark ? "#C7D2FE" : "#4F46E5", borderRadius: 20, padding: "4px 10px", fontSize: 12, fontWeight: 700 }}>
              {selectedIds.length}
            </div>
            <button onClick={() => setSelectedIds([])} style={{ background: "none", border: "none", color: dark ? "#94A3B8" : "#64748B", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              Annuler
            </button>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={handleExportSelected} style={{ padding: 10, borderRadius: 10, border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`, background: "transparent", color: dark ? "#F1F5F9" : "#1E293B", cursor: "pointer" }}>
              <Download size={16} />
            </button>
            <button onClick={handleBulkDelete} style={{ padding: 10, borderRadius: 10, border: "none", background: "#DC2626", color: "#FFF", cursor: "pointer" }}>
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ========== ACTIONS GROUPÉES DESKTOP ========== */}
      {!isMobile && selectionMode && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: dark ? "#1E293B" : "#FFFFFF", border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`, borderRadius: 12, padding: "10px 16px", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 8px 30px rgba(0,0,0,0.2)", zIndex: 950 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: dark ? "#F1F5F9" : "#1E293B" }}>{selectedIds.length} sélectionné(s)</span>
          <button onClick={handleExportSelected} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`, background: "transparent", color: dark ? "#F1F5F9" : "#1E293B", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>
            <Download size={14} /> Exporter
          </button>
          <button onClick={handleBulkDelete} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "none", background: "#DC2626", color: "#FFF", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
            <Trash2 size={14} /> Supprimer
          </button>
          <button onClick={() => setSelectedIds([])} style={{ background: "none", border: "none", color: dark ? "#94A3B8" : "#64748B", cursor: "pointer", padding: 4 }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* ========== BOTTOM SHEET FILTRES ========== */}
      <FiltersSheet
        open={showFilters}
        onClose={() => setShowFilters(false)}
        dark={dark}
        searchQuery={searchQuery} setSearchQuery={setSearchQuery}
        classeFiltre={classeFiltre} setClasseFiltre={setClasseFiltre}
        filterSexe={filterSexe} setFilterSexe={setFilterSexe}
        filterStatut={filterStatut} setFilterStatut={setFilterStatut}
        sortBy={sortBy} setSortBy={setSortBy}
        sortOrder={sortOrder} setSortOrder={setSortOrder}
        classesTriees={classesTriees}
        onReset={resetFilters}
        activeFiltersCount={activeFiltersCount}
      />

      {/* ========== MODALE AJOUT ========== */}
      {showAddForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: isMobile ? 12 : 16 }}>
          <div style={{ background: dark ? "#1E293B" : "#FFFFFF", borderRadius: 16, padding: isMobile ? 16 : 24, width: "100%", maxWidth: isMobile ? "100%" : 700, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 10px 30px rgba(0,0,0,0.3)", border: `1px solid ${dark ? "#334155" : "#E2E8F0"}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h3 style={{ margin: 0, fontSize: isMobile ? 17 : 20, fontWeight: 700, color: dark ? "#F1F5F9" : "#1E293B" }}>
                Ajouter un élève
              </h3>
              <button onClick={() => setShowAddForm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: dark ? "#94A3B8" : "#64748B" }}>
                <X size={22} />
              </button>
            </div>
            <AddEleveForm
              classes={classesTriees}
              parents={parents}
              ecoleId={ecoleId}
              userId={user._id}
              anneeId={anneeId}
              addEleve={async (data) => {
                await addEleve(data);
                setShowAddForm(false);
                toast.success("Élève ajouté avec succès");
              }}
            />
          </div>
        </div>
      )}

      <div style={{ marginTop: 24 }}>
        <ImportExcel fileInputRef={fileInputRef} importing={importing} onImport={() => {}} />
      </div>

      {/* Modal associations */}
      {showAssociationsFor && (
        <AssociationsEleveModal
          eleve={showAssociationsFor}
          parents={parents}
          elevesUsers={elevesUsers}
          currentUserId={user._id}
          onClose={() => setShowAssociationsFor(null)}
        />
      )}

      {/* Modal détail élève — avec actions intégrées */}
      {selectedDetailEleve && (
        <EleveDetailModal
          eleve={selectedDetailEleve}
          onClose={() => setSelectedDetailEleve(null)}
          onOpenAssociations={() => {
            setShowAssociationsFor(selectedDetailEleve);
            setSelectedDetailEleve(null);
          }}
          onDelete={() => handleDeleteOne(selectedDetailEleve)}
          dark={dark}
          isMobile={isMobile}
        />
      )}

      <ConfirmDialog {...dialogProps} />
    </div>
  );
}

// ============================================================
// MODALE DÉTAIL ÉLÈVE (avec boutons d'actions intégrés)
// ============================================================
function EleveDetailModal({ eleve, onClose, onOpenAssociations, onDelete, dark, isMobile }) {
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const accent = dark ? "#818CF8" : "#4F46E5";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: isMobile ? "flex-end" : "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: isMobile ? 0 : 16,
      }}
    >
      <div
        style={{
          background: cardBg,
          borderRadius: isMobile ? "20px 20px 0 0" : 16,
          padding: isMobile ? 16 : 24,
          width: "100%",
          maxWidth: isMobile ? "100%" : 700,
          maxHeight: "92vh",
          overflowY: "auto",
          boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
          border: `1px solid ${cardBorder}`,
        }}
      >
        {isMobile && (
          <div style={{ width: 40, height: 4, borderRadius: 2, background: dark ? "#475569" : "#CBD5E1", margin: "0 auto 14px" }} />
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h3 style={{ margin: 0, fontSize: isMobile ? 17 : 20, fontWeight: 700, color: textPrimary }}>
            Fiche élève
          </h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: textSecondary }}>
            <X size={22} />
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          <Section icon={<User size={16} color={accent} />} title="Identité" textPrimary={textPrimary}>
            <p><strong>Nom :</strong> {eleve.nom} {eleve.postnom} {eleve.prenom}</p>
            <p><strong>Sexe :</strong> {eleve.sexe === "F" ? "Féminin" : eleve.sexe === "M" ? "Masculin" : "—"}</p>
            <p><strong>Matricule :</strong> {eleve.code || "—"}</p>
            <p><strong>Date naissance :</strong> {eleve.dateNaissance || "—"}</p>
          </Section>
          <Section icon={<MapPin size={16} color={accent} />} title="Origine" textPrimary={textPrimary}>
            <p><strong>Province :</strong> {eleve.province || "—"}</p>
            <p><strong>Territoire :</strong> {eleve.territoire || "—"}</p>
            <p><strong>Adresse :</strong> {eleve.adresse || "—"}</p>
          </Section>
          <Section icon={<Phone size={16} color={accent} />} title="Contact" textPrimary={textPrimary}>
            <p><strong>Téléphone :</strong> {eleve.telephone || "—"}</p>
          </Section>
          <Section icon={<Users size={16} color={accent} />} title="Parents" textPrimary={textPrimary}>
            <p><strong>Père :</strong> {eleve.nomPere || "—"}</p>
            <p><strong>Mère :</strong> {eleve.nomMere || "—"}</p>
            <p><strong>Tuteur :</strong> {eleve.tuteurNom || "—"}</p>
          </Section>
          <Section icon={<GraduationCap size={16} color={accent} />} title="Scolarité" textPrimary={textPrimary}>
            <p><strong>Classe :</strong> {eleve.classe || "Non assigné"}</p>
          </Section>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          <button
            onClick={onOpenAssociations}
            style={{
              flex: 1,
              padding: "12px 14px",
              borderRadius: 12,
              border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
              background: dark ? "#0F172A" : "#F8FAFC",
              color: dark ? "#F1F5F9" : "#1E293B",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <Link2 size={16} />
            Associations
          </button>
          <button
            onClick={onDelete}
            style={{
              flex: 1,
              padding: "12px 14px",
              borderRadius: 12,
              border: "none",
              background: "#DC2626",
              color: "#FFFFFF",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <Trash2 size={16} />
            Supprimer
          </button>
        </div>

        <button
          onClick={onClose}
          style={{
            marginTop: 10,
            width: "100%",
            padding: 14,
            background: accent,
            color: "white",
            border: "none",
            borderRadius: 12,
            cursor: "pointer",
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          Fermer
        </button>
      </div>
    </div>
  );
}

function Section({ icon, title, textPrimary, children }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        {icon}
        <span style={{ fontWeight: 600, color: textPrimary, fontSize: 13 }}>{title}</span>
      </div>
      <div style={{ fontSize: 13, lineHeight: 1.6 }}>{children}</div>
    </div>
  );
}