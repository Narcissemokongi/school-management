import { useState, useRef, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import * as XLSX from "xlsx";
import { useStyles } from "../styles/theme";
import { useIsMobile } from "../hooks/useIsMobile"; // <-- Import du hook
import { useConfirm } from "../hooks/useConfirm";
import { ConfirmDialog } from "./ConfirmDialog";
import toast from "react-hot-toast";
import { Skeleton } from "./Skeleton";
import { AddEleveForm } from "./eleves/AddEleveForm";
import { ImportExcel } from "./eleves/ImportExcel";
import { trierClasses } from "../utils/sort";
import {
  X, User, MapPin, Phone, Users, Calendar, GraduationCap,
  Search, Download, Trash2, CheckSquare, Square, List, Grid,
  ChevronUp, ChevronDown, UserCheck, UserX, School, Filter,
  Plus, Upload, AlertCircle, Link2,
} from "lucide-react";
import { AssociationsEleveModal } from "./eleves/AssociationsEleveModal";

// Sous-composant pour une carte statistique
function StatCard({ icon, label, value, sublabel, color, dark, isMobile }) {
  const backgroundColor = dark ? "#1E293B" : "#FFFFFF";
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const borderColor = dark ? "#334155" : "#E2E8F0";
  const cardShadow = dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)";

  return (
    <div
      style={{
        background: backgroundColor,
        borderRadius: 12,
        padding: isMobile ? "12px 14px" : "16px 20px",
        boxShadow: cardShadow,
        border: `1px solid ${borderColor}`,
        display: "flex",
        alignItems: "center",
        gap: isMobile ? 10 : 14,
        transition: "transform 0.2s, box-shadow 0.2s",
        cursor: "default",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
    >
      <div
        style={{
          width: isMobile ? 36 : 44,
          height: isMobile ? 36 : 44,
          borderRadius: 10,
          background: `${color}20`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ color: textSecondary, fontSize: isMobile ? 12 : 13, fontWeight: 500 }}>{label}</div>
        <div style={{ color: textPrimary, fontSize: isMobile ? 20 : 24, fontWeight: 700, lineHeight: 1.2 }}>
          {value}
        </div>
        {sublabel && (
          <div style={{ color: textSecondary, fontSize: isMobile ? 11 : 12, marginTop: 2 }}>{sublabel}</div>
        )}
      </div>
    </div>
  );
}

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
  const isMobile = useIsMobile(); // Détection mobile
  const fileInputRef = useRef(null);
  const [importing, setImporting] = useState(false);
  const [classeFiltre, setClasseFiltre] = useState("");
  const [selectedDetailEleve, setSelectedDetailEleve] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const { confirm, dialogProps } = useConfirm();

  // États existants
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSexe, setFilterSexe] = useState("all");
  const [filterStatut, setFilterStatut] = useState("all");
  const [sortBy, setSortBy] = useState("nom");
  const [sortOrder, setSortOrder] = useState("asc");
  const [selectedIds, setSelectedIds] = useState([]);
  const [viewMode, setViewMode] = useState("table");

  const parents = useQuery(api.users.listParentsByEcole, ecoleId ? { ecoleId } : "skip") ?? [];
  const elevesUsers = useQuery(api.users.listElevesUsers, ecoleId ? { ecoleId } : "skip") ?? [];

  const [showAssociationsFor, setShowAssociationsFor] = useState(null);

  // Classes triées
  const classesTriees = useMemo(() => [...classes].sort((a, b) => trierClasses(a.nom, b.nom)), [classes]);

  // Enrichir les données pour le tableau
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

  // Statistiques
  const stats = useMemo(() => {
    const total = enrichedEleves.length;
    const garcons = enrichedEleves.filter((e) => e.sexe === "M" || e.sexe === "masculin").length;
    const filles = total - garcons;
    const assignes = enrichedEleves.filter((e) => e.classeId || e.classe).length;
    const nonAssignes = total - assignes;
    return { total, garcons, filles, assignes, nonAssignes };
  }, [enrichedEleves]);

  // Filtrage et tri
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

    if (classeFiltre) {
      result = result.filter((e) => e.classe === classeFiltre);
    }

    if (filterSexe !== "all") {
      result = result.filter((e) => e.sexe === filterSexe || (filterSexe === "M" && e.sexe === "masculin") || (filterSexe === "F" && e.sexe === "feminin"));
    }

    if (filterStatut === "assigned") {
      result = result.filter((e) => e.classeId || e.classe);
    } else if (filterStatut === "unassigned") {
      result = result.filter((e) => !e.classeId && !e.classe);
    }

    result.sort((a, b) => {
      let valA, valB;
      switch (sortBy) {
        case "nom":
          valA = a.nom?.toLowerCase() || "";
          valB = b.nom?.toLowerCase() || "";
          break;
        case "prenom":
          valA = a.prenom?.toLowerCase() || "";
          valB = b.prenom?.toLowerCase() || "";
          break;
        case "classe":
          valA = a.classe?.toLowerCase() || "zzz";
          valB = b.classe?.toLowerCase() || "zzz";
          break;
        case "parent":
          valA = a.parentName?.toLowerCase() || "zzz";
          valB = b.parentName?.toLowerCase() || "zzz";
          break;
        default:
          valA = a.nom?.toLowerCase() || "";
          valB = b.nom?.toLowerCase() || "";
      }
      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [enrichedEleves, searchQuery, classeFiltre, filterSexe, filterStatut, sortBy, sortOrder]);

  // Gestion de la sélection
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredAndSorted.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredAndSorted.map((e) => e._id));
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Actions groupées
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const ok = await confirm(
      "Supprimer des élèves",
      `Voulez-vous vraiment supprimer ${selectedIds.length} élève(s) ?`
    );
    if (ok) {
      for (const id of selectedIds) {
        await removeEleve({ id, actionUserId: user._id });
      }
      setSelectedIds([]);
      toast.success(`${selectedIds.length} élève(s) supprimé(s)`);
    }
  };

  // Export Excel
  const exportExcel = (data, filename) => {
    const rows = data.map((e) => ({
      "Nom": e.nom || "",
      "Postnom": e.postnom || "",
      "Prénom": e.prenom || "",
      "Classe": e.classe || "Non assigné",
      "Sexe": e.sexe === "M" || e.sexe === "masculin" ? "M" : e.sexe === "F" || e.sexe === "feminin" ? "F" : "",
      "Parent": e.parentName || "",
      "Login parent": e.parentLogin || "",
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

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  // Import Excel (inchangé)
  const handleImportExcel = (e) => {
    // ... (logique identique)
  };

  if (eleves === undefined) return <Skeleton height={200} />;

  // Styles adaptatifs
  const containerPadding = isMobile ? "16px 12px" : "24px 16px";
  const titleSize = isMobile ? 22 : 28;
  const subtitleSize = isMobile ? 13 : 14;
  const statGridCols = isMobile ? "1fr 1fr" : "repeat(auto-fit, minmax(150px, 1fr))";
  const toolbarFlexDirection = isMobile ? "column" : "row";
  const toolbarGap = isMobile ? 8 : 12;
  const filterSelectPadding = isMobile ? "12px 14px" : "10px 14px";
  const filterSelectFontSize = isMobile ? 16 : 14;
  const viewButtonsFlexDirection = isMobile ? "row" : "row";
  const viewButtonsWidth = isMobile ? "100%" : "auto";
  const actionButtonPadding = isMobile ? "10px 12px" : "8px 16px";
  const actionButtonFontSize = isMobile ? 14 : 14;
  const bulkActionButtonPadding = isMobile ? "10px 16px" : "8px 16px";
  const bulkActionButtonFontSize = isMobile ? 14 : 14;
  const cardGridCols = isMobile ? "1fr" : "repeat(auto-fill, minmax(260px, 1fr))";
  const cardPadding = isMobile ? 14 : 16;
  const modalMaxWidth = isMobile ? "95%" : 700;
  const modalPadding = isMobile ? 16 : 24;

  // Rendu du tableau (avec colonnes masquées sur mobile)
  const renderTable = () => (
    <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: isMobile ? 13 : 14, minWidth: isMobile ? 550 : "auto" }}>
        <thead>
          <tr style={{ borderBottom: `2px solid ${dark ? "#334155" : "#E2E8F0"}` }}>
            <th style={{ padding: "10px 8px", textAlign: "left", width: 40 }}>
              <button onClick={toggleSelectAll} style={{ background: "none", border: "none", cursor: "pointer", color: dark ? "#F1F5F9" : "#1E293B" }}>
                {selectedIds.length === filteredAndSorted.length ? <CheckSquare size={18} /> : <Square size={18} />}
              </button>
            </th>
            <th style={{ padding: "10px 8px", textAlign: "left", cursor: "pointer", color: dark ? "#94A3B8" : "#64748B" }} onClick={() => toggleSort("nom")}>
              Nom {sortBy === "nom" && (sortOrder === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
            </th>
            <th style={{ padding: "10px 8px", textAlign: "left", cursor: "pointer", color: dark ? "#94A3B8" : "#64748B" }} onClick={() => toggleSort("prenom")} className={isMobile ? "hide-on-mobile" : ""}>
              Prénom {sortBy === "prenom" && (sortOrder === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
            </th>
            <th style={{ padding: "10px 8px", textAlign: "left", cursor: "pointer", color: dark ? "#94A3B8" : "#64748B" }} onClick={() => toggleSort("classe")}>
              Classe {sortBy === "classe" && (sortOrder === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
            </th>
            <th style={{ padding: "10px 8px", textAlign: "center", color: dark ? "#94A3B8" : "#64748B" }} className={isMobile ? "hide-on-mobile" : ""}>Sexe</th>
            <th style={{ padding: "10px 8px", textAlign: "left", color: dark ? "#94A3B8" : "#64748B" }} className={isMobile ? "hide-on-mobile" : ""}>Parent</th>
            <th style={{ padding: "10px 8px", textAlign: "center", color: dark ? "#94A3B8" : "#64748B" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredAndSorted.map((eleve) => (
            <tr key={eleve._id} style={{ borderBottom: `1px solid ${dark ? "#334155" : "#E2E8F0"}`, background: selectedIds.includes(eleve._id) ? (dark ? "#2D3748" : "#F1F5F9") : "transparent" }}>
              <td style={{ padding: "8px" }}>
                <button onClick={() => toggleSelectOne(eleve._id)} style={{ background: "none", border: "none", cursor: "pointer", color: dark ? "#F1F5F9" : "#1E293B" }}>
                  {selectedIds.includes(eleve._id) ? <CheckSquare size={18} color={dark ? "#818CF8" : "#4F46E5"} /> : <Square size={18} />}
                </button>
              </td>
              <td style={{ padding: "8px", fontWeight: 500, color: dark ? "#F1F5F9" : "#1E293B" }}>
                {eleve.nom} {eleve.postnom}
              </td>
              <td style={{ padding: "8px", color: dark ? "#F1F5F9" : "#1E293B" }} className={isMobile ? "hide-on-mobile" : ""}>{eleve.prenom}</td>
              <td style={{ padding: "8px" }}>
                {eleve.classe ? (
                  <span style={{ background: dark ? "#312E81" : "#EEF2FF", color: dark ? "#A5B4FC" : "#4F46E5", padding: "2px 8px", borderRadius: 12, fontSize: 12, fontWeight: 500 }}>
                    {eleve.classe}
                  </span>
                ) : (
                  <span style={{ color: "#F59E0B", fontSize: 12, fontStyle: "italic" }}>Non assigné</span>
                )}
              </td>
              <td style={{ padding: "8px", textAlign: "center", color: dark ? "#94A3B8" : "#64748B" }} className={isMobile ? "hide-on-mobile" : ""}>
                {eleve.sexe === "M" || eleve.sexe === "masculin" ? "M" : eleve.sexe === "F" || eleve.sexe === "feminin" ? "F" : "?"}
              </td>
              <td style={{ padding: "8px", color: dark ? "#94A3B8" : "#64748B" }} className={isMobile ? "hide-on-mobile" : ""}>{eleve.parentName}</td>
              <td style={{ padding: "8px", textAlign: "center", whiteSpace: "nowrap" }}>
                <button onClick={() => setShowAssociationsFor(eleve)} title="Gérer les associations" style={{ background: "none", border: "none", cursor: "pointer", color: dark ? "#60A5FA" : "#2563EB", marginRight: 4, padding: isMobile ? 6 : 4 }}>
                  <Link2 size={16} />
                </button>
                <button onClick={() => setSelectedDetailEleve(eleve)} title="Voir détails" style={{ background: "none", border: "none", cursor: "pointer", color: dark ? "#F59E0B" : "#D97706", marginRight: 4, padding: isMobile ? 6 : 4 }}>
                  <Search size={16} />
                </button>
                <button onClick={async () => { const ok = await confirm("Supprimer l'élève", "Voulez-vous vraiment supprimer cet élève ?"); if (ok) { await removeEleve({ id: eleve._id, actionUserId: user._id }); toast.success("Élève supprimé"); } }} title="Supprimer" style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444", padding: isMobile ? 6 : 4 }}>
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // Rendu des cartes
  const renderCards = () => (
    <div style={{ display: "grid", gridTemplateColumns: cardGridCols, gap: 16 }}>
      {filteredAndSorted.map((eleve) => (
        <div key={eleve._id} style={{ background: dark ? "#1E293B" : "#FFFFFF", borderRadius: 12, padding: cardPadding, boxShadow: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)", border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`, display: "flex", flexDirection: "column", gap: 8, position: "relative" }}>
          <div style={{ position: "absolute", top: 10, right: 10 }}>
            <button onClick={() => toggleSelectOne(eleve._id)} style={{ background: "none", border: "none", cursor: "pointer", color: selectedIds.includes(eleve._id) ? (dark ? "#818CF8" : "#4F46E5") : dark ? "#94A3B8" : "#64748B" }}>
              {selectedIds.includes(eleve._id) ? <CheckSquare size={18} /> : <Square size={18} />}
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: dark ? "#312E81" : "#EEF2FF", display: "flex", alignItems: "center", justifyContent: "center", color: dark ? "#A5B4FC" : "#4F46E5", fontWeight: 700, fontSize: 16 }}>
              {eleve.prenom?.[0]}{eleve.nom?.[0]}
            </div>
            <div>
              <div style={{ fontWeight: 600, color: dark ? "#F1F5F9" : "#1E293B" }}>{eleve.prenom} {eleve.nom} {eleve.postnom}</div>
              <div style={{ fontSize: 12, color: dark ? "#94A3B8" : "#64748B" }}>{eleve.sexe === "M" ? "Masculin" : eleve.sexe === "F" ? "Féminin" : "Sexe non précisé"}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {eleve.classe ? (
              <span style={{ background: dark ? "#312E81" : "#EEF2FF", color: dark ? "#A5B4FC" : "#4F46E5", padding: "2px 10px", borderRadius: 12, fontSize: 12 }}>{eleve.classe}</span>
            ) : (
              <span style={{ color: "#F59E0B", fontSize: 12 }}>Non assigné</span>
            )}
          </div>
          <div style={{ fontSize: 12, color: dark ? "#94A3B8" : "#64748B" }}>Parent : {eleve.parentName}</div>
          <div style={{ marginTop: "auto", display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button onClick={() => setShowAssociationsFor(eleve)} title="Gérer les associations" style={{ background: "none", border: "none", cursor: "pointer", color: dark ? "#60A5FA" : "#2563EB" }}><Link2 size={16} /></button>
            <button onClick={() => setSelectedDetailEleve(eleve)} title="Voir détails" style={{ background: "none", border: "none", cursor: "pointer", color: dark ? "#F59E0B" : "#D97706" }}><Search size={16} /></button>
            <button onClick={async () => { const ok = await confirm("Supprimer l'élève", "Voulez-vous vraiment supprimer cet élève ?"); if (ok) { await removeEleve({ id: eleve._id, actionUserId: user._id }); toast.success("Élève supprimé"); } }} title="Supprimer" style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444" }}><Trash2 size={16} /></button>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: containerPadding }}>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
        @media (max-width: 600px) {
          .hide-on-mobile { display: none !important; }
        }
      `}</style>

      {/* En-tête */}
      <div style={{ marginBottom: isMobile ? 16 : 24 }}>
        <h2 style={{ fontSize: titleSize, fontWeight: 700, color: dark ? "#F1F5F9" : "#1E293B", margin: 0 }}>
          Élèves
        </h2>
        <p style={{ color: dark ? "#94A3B8" : "#64748B", marginTop: 4, fontSize: subtitleSize }}>
          {filteredAndSorted.length} élève(s) affiché(s) sur {eleves.length} inscrits
        </p>
      </div>

      {/* Statistiques */}
      <div style={{ display: "grid", gridTemplateColumns: statGridCols, gap: isMobile ? 8 : 12, marginBottom: isMobile ? 16 : 20 }}>
        <StatCard icon={<Users size={20} color="#4F46E5" />} label="Total" value={stats.total} color="#4F46E5" dark={dark} isMobile={isMobile} />
        <StatCard icon={<UserCheck size={20} color="#10B981" />} label="Assignés" value={stats.assignes} color="#10B981" dark={dark} isMobile={isMobile} />
        <StatCard icon={<UserX size={20} color="#F59E0B" />} label="Non assignés" value={stats.nonAssignes} color="#F59E0B" dark={dark} isMobile={isMobile} />
        <StatCard icon={<Users size={20} color="#0EA5E9" />} label="Garçons" value={stats.garcons} color="#0EA5E9" dark={dark} isMobile={isMobile} />
        <StatCard icon={<Users size={20} color="#EC4899" />} label="Filles" value={stats.filles} color="#EC4899" dark={dark} isMobile={isMobile} />
      </div>

      {/* Barre d'outils : recherche, filtres, bascule vue, export, ajout */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: toolbarGap, marginBottom: 16, alignItems: "stretch", flexDirection: toolbarFlexDirection }}>
        <div style={{ position: "relative", flex: 1, minWidth: isMobile ? "100%" : 220 }}>
          <Search size={16} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: dark ? "#94A3B8" : "#64748B" }} />
          <input
            type="text"
            placeholder="Rechercher un élève, un parent..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: isMobile ? "12px 12px 12px 36px" : "10px 12px 10px 34px",
              borderRadius: 8,
              border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
              background: dark ? "#1E293B" : "#FFFFFF",
              color: dark ? "#F1F5F9" : "#1E293B",
              fontSize: isMobile ? 16 : 14,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        <select value={classeFiltre} onChange={(e) => setClasseFiltre(e.target.value)} style={{ padding: filterSelectPadding, borderRadius: 8, border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`, background: dark ? "#1E293B" : "#FFFFFF", color: dark ? "#F1F5F9" : "#1E293B", fontSize: filterSelectFontSize, cursor: "pointer", minWidth: isMobile ? "100%" : 150 }} aria-label="Filtrer par classe">
          <option value="">Toutes les classes</option>
          {classesTriees.map((c) => <option key={c._id} value={c.nom} style={{ background: dark ? "#1E293B" : "#FFF" }}>{c.nom}</option>)}
        </select>

        <select value={filterSexe} onChange={(e) => setFilterSexe(e.target.value)} style={{ padding: filterSelectPadding, borderRadius: 8, border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`, background: dark ? "#1E293B" : "#FFFFFF", color: dark ? "#F1F5F9" : "#1E293B", fontSize: filterSelectFontSize, cursor: "pointer", width: isMobile ? "100%" : "auto" }} aria-label="Filtrer par sexe">
          <option value="all">Tous les sexes</option>
          <option value="M">Masculin</option>
          <option value="F">Féminin</option>
        </select>

        <select value={filterStatut} onChange={(e) => setFilterStatut(e.target.value)} style={{ padding: filterSelectPadding, borderRadius: 8, border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`, background: dark ? "#1E293B" : "#FFFFFF", color: dark ? "#F1F5F9" : "#1E293B", fontSize: filterSelectFontSize, cursor: "pointer", width: isMobile ? "100%" : "auto" }} aria-label="Filtrer par statut">
          <option value="all">Tous les statuts</option>
          <option value="assigned">Assignés</option>
          <option value="unassigned">Non assignés</option>
        </select>

        <div style={{ display: "flex", gap: 8, justifyContent: isMobile ? "space-between" : "flex-start", width: isMobile ? "100%" : "auto" }}>
          <button onClick={() => setViewMode("table")} title="Vue tableau" style={{ padding: isMobile ? 10 : 8, borderRadius: 8, border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`, background: viewMode === "table" ? (dark ? "#312E81" : "#EEF2FF") : (dark ? "#1E293B" : "#FFFFFF"), color: viewMode === "table" ? (dark ? "#A5B4FC" : "#4F46E5") : dark ? "#94A3B8" : "#64748B", cursor: "pointer", flex: isMobile ? 1 : "none" }}>
            <List size={16} />
          </button>
          <button onClick={() => setViewMode("cards")} title="Vue cartes" style={{ padding: isMobile ? 10 : 8, borderRadius: 8, border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`, background: viewMode === "cards" ? (dark ? "#312E81" : "#EEF2FF") : (dark ? "#1E293B" : "#FFFFFF"), color: viewMode === "cards" ? (dark ? "#A5B4FC" : "#4F46E5") : dark ? "#94A3B8" : "#64748B", cursor: "pointer", flex: isMobile ? 1 : "none" }}>
            <Grid size={16} />
          </button>
        </div>

        <button onClick={handleExportFiltered} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: actionButtonPadding, borderRadius: 8, border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`, background: dark ? "#1E293B" : "#FFFFFF", color: dark ? "#F1F5F9" : "#1E293B", fontWeight: 500, cursor: "pointer", width: isMobile ? "100%" : "auto" }} title="Exporter la liste filtrée en Excel">
          <Download size={16} /> Exporter Excel
        </button>

        <button onClick={() => setShowAddForm(true)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: actionButtonPadding, borderRadius: 8, background: dark ? "#818CF8" : "#4F46E5", color: "#FFFFFF", border: "none", fontWeight: 600, cursor: "pointer", width: isMobile ? "100%" : "auto" }}>
          <Plus size={16} /> Ajouter un élève
        </button>
      </div>

      {/* Actions groupées */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 16, flexDirection: isMobile ? "column" : "row" }}>
        <button onClick={handleBulkDelete} disabled={selectedIds.length === 0} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: bulkActionButtonPadding, borderRadius: 8, border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`, background: selectedIds.length === 0 ? "transparent" : dark ? "#7F1D1D" : "#FEE2E2", color: selectedIds.length === 0 ? (dark ? "#64748B" : "#94A3B8") : dark ? "#FCA5A5" : "#B91C1C", cursor: selectedIds.length === 0 ? "not-allowed" : "pointer", fontWeight: 500, width: isMobile ? "100%" : "auto" }}>
          <Trash2 size={16} /> Supprimer ({selectedIds.length})
        </button>
        <button onClick={handleExportSelected} disabled={selectedIds.length === 0} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: bulkActionButtonPadding, borderRadius: 8, border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`, background: dark ? "#1E293B" : "#FFFFFF", color: selectedIds.length === 0 ? (dark ? "#64748B" : "#94A3B8") : dark ? "#818CF8" : "#4F46E5", cursor: selectedIds.length === 0 ? "not-allowed" : "pointer", fontWeight: 500, width: isMobile ? "100%" : "auto" }}>
          <Download size={16} /> Exporter sélection (Excel)
        </button>
      </div>

      {/* Liste des élèves */}
      {filteredAndSorted.length > 0 ? (
        viewMode === "table" ? renderTable() : renderCards()
      ) : (
        <div style={{ textAlign: "center", padding: 40, color: dark ? "#94A3B8" : "#64748B" }}>
          <School size={48} style={{ marginBottom: 16 }} />
          <p>Aucun élève ne correspond aux critères.</p>
        </div>
      )}

      {/* Modale d'ajout d'élève */}
      {showAddForm && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: isMobile ? 12 : 16 }}>
          <div style={{ background: dark ? "#1E293B" : "#FFFFFF", borderRadius: 16, padding: modalPadding, width: "100%", maxWidth: modalMaxWidth, maxHeight: "90vh", overflowY: "auto", boxShadow: dark ? "0 10px 30px rgba(0,0,0,0.5)" : "0 10px 30px rgba(0,0,0,0.1)", border: `1px solid ${dark ? "#334155" : "#E2E8F0"}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: isMobile ? 18 : 20, fontWeight: 700, color: dark ? "#F1F5F9" : "#1E293B" }}>
                Ajouter un élève
              </h3>
              <button onClick={() => setShowAddForm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: dark ? "#94A3B8" : "#64748B" }}>
                <X size={24} />
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

      {/* Import Excel */}
      <div style={{ marginTop: 24 }}>
        <ImportExcel fileInputRef={fileInputRef} importing={importing} onImport={handleImportExcel} />
      </div>

      {/* Modale d'associations */}
      {showAssociationsFor && (
        <AssociationsEleveModal
          eleve={showAssociationsFor}
          parents={parents}
          elevesUsers={elevesUsers}
          currentUserId={user._id}
          onClose={() => setShowAssociationsFor(null)}
        />
      )}

      {/* Modale de détail élève */}
      {selectedDetailEleve && (
        <EleveDetailModal eleve={selectedDetailEleve} onClose={() => setSelectedDetailEleve(null)} dark={dark} isMobile={isMobile} />
      )}

      <ConfirmDialog {...dialogProps} />
    </div>
  );
}

// Modale détaillée adaptée mobile
function EleveDetailModal({ eleve, onClose, dark, isMobile }) {
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const accent = dark ? "#818CF8" : "#4F46E5";

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: isMobile ? 12 : 16 }}>
      <div style={{ background: cardBg, borderRadius: 16, padding: isMobile ? 16 : 24, width: "100%", maxWidth: isMobile ? "95%" : 700, maxHeight: "90vh", overflowY: "auto", boxShadow: dark ? "0 10px 30px rgba(0,0,0,0.5)" : "0 10px 30px rgba(0,0,0,0.1)", border: `1px solid ${cardBorder}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: isMobile ? 18 : 20, fontWeight: 700, color: textPrimary }}>
            Fiche élève
          </h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: textSecondary }}>
            <X size={24} />
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          {/* Identité */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <User size={18} color={accent} />
              <span style={{ fontWeight: 600, color: textPrimary }}>Identité</span>
            </div>
            <p><strong>Nom complet :</strong> {eleve.nom} {eleve.postnom} {eleve.prenom}</p>
            <p><strong>Sexe :</strong> {eleve.sexe === "F" ? "Féminin" : eleve.sexe === "M" ? "Masculin" : "—"}</p>
            <p><strong>Matricule :</strong> {eleve.code || "—"}</p>
            <p><strong>Date de naissance :</strong> {eleve.dateNaissance || "—"}</p>
            <p><strong>Lieu de naissance :</strong> {eleve.lieuNaissance || "—"}</p>
          </div>

          {/* Origine */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <MapPin size={18} color={accent} />
              <span style={{ fontWeight: 600, color: textPrimary }}>Origine géographique</span>
            </div>
            <p><strong>Province :</strong> {eleve.province || "—"}</p>
            <p><strong>Territoire :</strong> {eleve.territoire || "—"}</p>
            <p><strong>Secteur :</strong> {eleve.secteur || "—"}</p>
            <p><strong>Village :</strong> {eleve.village || "—"}</p>
            <p><strong>Adresse :</strong> {eleve.adresse || "—"}</p>
          </div>

          {/* Contact */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Phone size={18} color={accent} />
              <span style={{ fontWeight: 600, color: textPrimary }}>Contact</span>
            </div>
            <p><strong>Téléphone :</strong> {eleve.telephone || "—"}</p>
          </div>

          {/* Parents / Tuteur */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Users size={18} color={accent} />
              <span style={{ fontWeight: 600, color: textPrimary }}>Parents / Tuteur</span>
            </div>
            <p><strong>Nom du père :</strong> {eleve.nomPere || "—"}</p>
            <p><strong>Nom de la mère :</strong> {eleve.nomMere || "—"}</p>
            <p><strong>Tuteur :</strong> {eleve.tuteurNom || "—"}</p>
            <p><strong>Téléphone tuteur :</strong> {eleve.tuteurTelephone || "—"}</p>
          </div>

          {/* Scolarité */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <GraduationCap size={18} color={accent} />
              <span style={{ fontWeight: 600, color: textPrimary }}>Scolarité</span>
            </div>
            <p><strong>Classe :</strong> {eleve.classe || "Non assigné"}</p>
            <p><strong>Statut :</strong> {eleve.statut || "Inscrit"}</p>
          </div>
        </div>

        <button onClick={onClose} style={{ marginTop: 20, width: "100%", padding: isMobile ? "12px 0" : "10px 0", background: accent, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>
          Fermer
        </button>
      </div>
    </div>
  );
}