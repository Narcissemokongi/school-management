import { useState, useMemo, useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useConfirm } from "@/hooks/useConfirm";
import { ConfirmDialog } from "./ConfirmDialog";
import { Skeleton } from "./Skeleton";
import { EmptyState } from "./EmptyState";
import {
  Loader, Trash2, Search, Download, CheckSquare, Square, List, Grid,
  ChevronUp, ChevronDown, ChevronRight, Users, BookOpen, AlertCircle, Plus,
  X, UserX, UserCheck, ArrowLeft, GraduationCap, Pencil,
  UserPlus, Eye, Check, MapPin, Phone, User, BarChart3, Upload,
  SlidersHorizontal, RotateCcw, MoreVertical,
} from "lucide-react";
import toast from "react-hot-toast";

// 🟢 FIX : XLSX en import dynamique (lazy) — retiré du top-level

// 🟢 FIX : helper batch pour rate-limit Convex
const runInBatches = async (items, fn, size = 5) => {
  for (let i = 0; i < items.length; i += size) {
    await Promise.all(items.slice(i, i + size).map(fn));
  }
};

// ============================================================
// CARTE STATISTIQUE COMPACTE (mobile-first)
// ============================================================
function StatCard({ icon, label, value, color, dark, isMobile }) {
  const bg = dark ? "#1E293B" : "#FFFFFF";
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const border = dark ? "#334155" : "#E2E8F0";

  return (
    <div
      style={{
        background: bg,
        borderRadius: 12,
        padding: isMobile ? "10px 12px" : "14px 16px",
        boxShadow: dark ? "0 1px 2px rgba(0,0,0,0.25)" : "0 1px 2px rgba(0,0,0,0.04)",
        border: `1px solid ${border}`,
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
        <div style={{ color: textSecondary, fontSize: 10.5, fontWeight: 500, whiteSpace: "nowrap" }}>
          {label}
        </div>
        <div style={{ color: textPrimary, fontSize: 18, fontWeight: 700, lineHeight: 1.1 }}>
          {value}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// BOTTOM SHEET DE FILTRES / TRI
// ============================================================
function FiltersSheet({
  open, onClose, dark,
  searchQuery, setSearchQuery,
  filterEffectif, setFilterEffectif,
  sortBy, setSortBy,
  sortOrder, setSortOrder,
  onReset,
  activeFiltersCount,
  elevesNonAssignes,
  onShowNonAssignes,
  onImportClick,
  importingClasses,
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
          animation: "gca-fade-in 0.18s ease-out",
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
          animation: "gca-slide-up 0.25s cubic-bezier(0.22, 1, 0.36, 1)",
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
              placeholder="Nom de classe…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ ...fieldStyle, paddingLeft: 36 }}
            />
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Effectif</label>
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { v: "all", l: "Toutes" },
              { v: "non-vide", l: "Avec élèves" },
              { v: "vide", l: "Vides" },
            ].map((opt) => (
              <button
                key={opt.v}
                onClick={() => setFilterEffectif(opt.v)}
                style={{
                  flex: 1,
                  padding: "10px 8px",
                  borderRadius: 10,
                  border: `1px solid ${filterEffectif === opt.v ? (dark ? "#818CF8" : "#4F46E5") : (dark ? "#334155" : "#E2E8F0")}`,
                  background: filterEffectif === opt.v ? (dark ? "#312E81" : "#EEF2FF") : "transparent",
                  color: filterEffectif === opt.v ? (dark ? "#C7D2FE" : "#4F46E5") : (dark ? "#CBD5E1" : "#475569"),
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
              <option value="effectif">Effectif</option>
              <option value="enseignants">Enseignants</option>
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

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Actions rapides</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button
              onClick={() => { onShowNonAssignes(); onClose(); }}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "12px 14px", borderRadius: 10,
                border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
                background: dark ? "#0F172A" : "#F8FAFC",
                color: dark ? "#F1F5F9" : "#1E293B",
                cursor: "pointer", fontWeight: 600, fontSize: 14,
                textAlign: "left",
              }}
            >
              <UserPlus size={18} />
              Voir les élèves non assignés
              <span style={{ marginLeft: "auto", background: dark ? "#78350F" : "#FEF3C7", color: dark ? "#FCD34D" : "#B45309", borderRadius: 10, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>
                {elevesNonAssignes}
              </span>
            </button>
            <button
              onClick={() => { onImportClick(); onClose(); }}
              disabled={importingClasses}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "12px 14px", borderRadius: 10,
                border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
                background: dark ? "#0F172A" : "#F8FAFC",
                color: dark ? "#F1F5F9" : "#1E293B",
                cursor: importingClasses ? "not-allowed" : "pointer",
                fontWeight: 600, fontSize: 14,
                textAlign: "left",
                opacity: importingClasses ? 0.6 : 1,
              }}
            >
              {importingClasses ? <Loader size={18} className="gca-spin" /> : <Upload size={18} />}
              Importer depuis Excel
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
    </>
  );
}

// ============================================================
// MODALE : Ajouter une classe
// ============================================================
function AddClasseModal({ open, onClose, onAdd, adding, dark, isMobile }) {
  const [nom, setNom] = useState("");

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = nom.trim();
    if (!trimmed) return;
    await onAdd(trimmed);
    setNom("");
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: isMobile ? "flex-end" : "center", justifyContent: "center", zIndex: 1000, padding: isMobile ? 0 : 16 }}>
      <div style={{ background: dark ? "#1E293B" : "#FFFFFF", borderRadius: isMobile ? "20px 20px 0 0" : 16, padding: isMobile ? "16px 16px 24px" : 24, width: "100%", maxWidth: isMobile ? "100%" : 480, boxShadow: "0 10px 30px rgba(0,0,0,0.3)", border: `1px solid ${dark ? "#334155" : "#E2E8F0"}` }}>
        {isMobile && <div style={{ width: 40, height: 4, borderRadius: 2, background: dark ? "#475569" : "#CBD5E1", margin: "0 auto 14px" }} />}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h3 style={{ margin: 0, fontSize: isMobile ? 17 : 19, fontWeight: 700, color: dark ? "#F1F5F9" : "#1E293B" }}>
            Nouvelle classe
          </h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: dark ? "#94A3B8" : "#64748B" }}>
            <X size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Nom de la classe (ex : 6ème A)"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            autoFocus
            style={{
              width: "100%",
              padding: isMobile ? "14px 16px" : "12px 14px",
              borderRadius: 12,
              border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
              background: dark ? "#0F172A" : "#F8FAFC",
              color: dark ? "#F1F5F9" : "#1E293B",
              fontSize: 16,
              outline: "none",
              boxSizing: "border-box",
            }}
          />

          <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
            <button
              type="button"
              onClick={onClose}
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
              }}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={adding || !nom.trim()}
              style={{
                flex: 2,
                padding: "14px 16px",
                borderRadius: 12,
                border: "none",
                background: adding || !nom.trim() ? "#A5B4FC" : (dark ? "#818CF8" : "#4F46E5"),
                color: "#FFFFFF",
                fontWeight: 700,
                fontSize: 14,
                cursor: adding || !nom.trim() ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              {adding ? <Loader size={16} className="gca-spin" /> : <Plus size={16} />}
              {adding ? "Création…" : "Créer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================
export function GestionClassesAdmin({
  classes,
  ecoleId,
  userId,
  eleves,
  anneeId,
  updateEleveClasse,
  enseignants = [],
}) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();
  const { confirm, dialogProps } = useConfirm();

  const [newClasse, setNewClasse] = useState("");
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("nom");
  const [sortOrder, setSortOrder] = useState("asc");
  const [filterEffectif, setFilterEffectif] = useState("all");
  const [selectedIds, setSelectedIds] = useState([]);
  const [viewMode, setViewMode] = useState("cards");
  const [showFilters, setShowFilters] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const [selectedClasse, setSelectedClasse] = useState(null);
  const [activeDetailTab, setActiveDetailTab] = useState("eleves");
  const [searchElevesClasse, setSearchElevesClasse] = useState("");
  const [selectedEleveDetail, setSelectedEleveDetail] = useState(null);
  const [showNonAssignes, setShowNonAssignes] = useState(false);
  const [updatingEleve, setUpdatingEleve] = useState(null);
  const [eleveToAdd, setEleveToAdd] = useState("");

  const [editingClasseId, setEditingClasseId] = useState(null);
  const [editingNom, setEditingNom] = useState("");
  const [savingRename, setSavingRename] = useState(false);

  const fileInputRef = useRef(null);
  const [importingClasses, setImportingClasses] = useState(false);

  const addClasseMutation = useMutation(api.classes.add);
  const removeClasseMutation = useMutation(api.classes.remove);
  const renameClasseMutation = useMutation(api.classes.rename);
  const importClassesMutation = useMutation(api.classes.importClasses);

  // ==================== CALCULS MÉMOÏSÉS ====================
  const classesAvecEffectif = useMemo(() => {
    return classes.map((c) => ({
      ...c,
      effectif: eleves.filter((e) => e.classe === c.nom).length,
      nbEnseignants: enseignants.filter((u) => u.classe === c.nom).length,
      enseignantPrincipal:
        enseignants.find((u) => u.classe === c.nom)?.nom ?? null,
    }));
  }, [classes, eleves, enseignants]);

  // 🟡 FIX : resynchronise selectedClasse quand son nom change
  useEffect(() => {
    if (!selectedClasse) return;
    const updated = classesAvecEffectif.find(
      (c) => c._id === selectedClasse._id
    );
    if (updated && updated.nom !== selectedClasse.nom) {
      setSelectedClasse(updated);
    }
  }, [classesAvecEffectif, selectedClasse]);

  const elevesDeLaClasse = useMemo(() => {
    if (!selectedClasse) return [];
    const q = searchElevesClasse.toLowerCase();
    return eleves.filter((e) => {
      if (e.classe !== selectedClasse.nom) return false;
      if (!q) return true;
      return (
        e.nom?.toLowerCase().includes(q) ||
        e.prenom?.toLowerCase().includes(q) ||
        e.postnom?.toLowerCase().includes(q) ||
        e.code?.toLowerCase().includes(q)
      );
    });
  }, [eleves, selectedClasse, searchElevesClasse]);

  const elevesDisponibles = useMemo(() => {
    if (!selectedClasse) return [];
    return eleves.filter((e) => e.classe !== selectedClasse.nom);
  }, [eleves, selectedClasse]);

  const elevesNonAssignes = useMemo(
    () => eleves.filter((e) => !e.classe || e.classe === ""),
    [eleves]
  );

  const enseignantsDeLaClasse = useMemo(() => {
    if (!selectedClasse) return [];
    return enseignants.filter((u) => u.classe === selectedClasse.nom);
  }, [enseignants, selectedClasse]);

  const stats = useMemo(() => {
    const totalClasses = classesAvecEffectif.length;
    const totalEleves = eleves.length;
    const moyenne =
      totalClasses > 0 ? (totalEleves / totalClasses).toFixed(1) : "0";
    const classesVides = classesAvecEffectif.filter(
      (c) => c.effectif === 0
    ).length;
    const totalEnseignants = enseignants.length;
    return { totalClasses, totalEleves, moyenne, classesVides, totalEnseignants };
  }, [classesAvecEffectif, eleves, enseignants]);

  const statsClasse = useMemo(() => {
    if (!selectedClasse) return null;
    const list = elevesDeLaClasse;
    const garcons = list.filter((e) => e.sexe === "M").length;
    const filles = list.filter((e) => e.sexe === "F").length;
    return {
      total: list.length,
      garcons,
      filles,
      nbEnseignants: selectedClasse.nbEnseignants,
    };
  }, [selectedClasse, elevesDeLaClasse]);

  const filteredAndSorted = useMemo(() => {
    let result = [...classesAvecEffectif];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((c) => c.nom.toLowerCase().includes(q));
    }
    if (filterEffectif === "vide") {
      result = result.filter((c) => c.effectif === 0);
    } else if (filterEffectif === "non-vide") {
      result = result.filter((c) => c.effectif > 0);
    }
    result.sort((a, b) => {
      let valA, valB;
      switch (sortBy) {
        case "effectif": valA = a.effectif; valB = b.effectif; break;
        case "enseignants": valA = a.nbEnseignants; valB = b.nbEnseignants; break;
        default: valA = a.nom.toLowerCase(); valB = b.nom.toLowerCase();
      }
      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
    return result;
  }, [classesAvecEffectif, searchQuery, filterEffectif, sortBy, sortOrder]);

  const activeFiltersCount = useMemo(() => {
    let n = 0;
    if (searchQuery.trim()) n++;
    if (filterEffectif !== "all") n++;
    return n;
  }, [searchQuery, filterEffectif]);

  const selectionMode = selectedIds.length > 0;

  // ==================== HANDLERS ====================
  const resetFilters = () => {
    setSearchQuery("");
    setFilterEffectif("all");
    setSortBy("nom");
    setSortOrder("asc");
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredAndSorted.length) setSelectedIds([]);
    else setSelectedIds(filteredAndSorted.map((c) => c._id));
  };

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // 🟡 FIX : batch + comptage succès/échecs
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const avecEleves = selectedIds.filter((id) => {
      const c = classesAvecEffectif.find((c) => c._id === id);
      return c && c.effectif > 0;
    });
    if (avecEleves.length > 0) {
      toast.error(
        "Certaines classes sélectionnées contiennent encore des élèves."
      );
      return;
    }
    const ok = await confirm(
      "Supprimer des classes",
      `Voulez-vous vraiment supprimer ${selectedIds.length} classe(s) ?`
    );
    if (!ok) return;

    let success = 0;
    let failed = 0;
    await runInBatches(selectedIds, async (id) => {
      try {
        await removeClasseMutation({ id, userId });
        success++;
      } catch (err) {
        console.error("[GestionClassesAdmin] bulk delete failed for", id, err);
        failed++;
      }
    });

    if (success > 0) toast.success(`${success} classe(s) supprimée(s)`);
    if (failed > 0) toast.error(`${failed} échec(s)`);
    setSelectedIds([]);
  };

  // 🟢 FIX : XLSX lazy
  const exportExcel = async () => {
    try {
      const XLSX = await import("xlsx");
      const data = filteredAndSorted.map((c) => ({
        Classe: c.nom,
        Effectif: c.effectif,
        Enseignants: c.nbEnseignants,
      }));
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Classes");
      XLSX.writeFile(workbook, "classes.xlsx");
      toast.success("Export Excel réussi");
    } catch (err) {
      console.error("[GestionClassesAdmin] export failed:", err);
      toast.error("Impossible de générer l'export");
    }
  };

  // 🟢 FIX : XLSX lazy + toast générique
  const handleImportClasses = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImportingClasses(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const XLSX = await import("xlsx");
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
        if (rows.length < 2) return toast.error("Fichier vide");
        const headers = rows[0].map((h) => h.toString().toLowerCase().trim());
        const idxNom = headers.indexOf("nom");
        if (idxNom === -1) return toast.error("Colonne 'nom' introuvable");
        const noms = rows
          .slice(1)
          .map((row) => row[idxNom]?.toString().trim())
          .filter(Boolean);
        if (noms.length === 0) return toast.error("Aucun nom de classe trouvé");
        const result = await importClassesMutation({
          noms,
          ecoleId,
          anneeId: anneeId || undefined,
          userId,
        });
        toast.success(
          `${result.inserted} classe(s) importée(s)${
            result.duplicates.length
              ? `, ${result.duplicates.length} doublon(s) ignoré(s)`
              : ""
          }`
        );
      } catch (err) {
        console.error("[GestionClassesAdmin] import failed:", err);
        toast.error("Impossible de lire le fichier Excel");
      } finally {
        setImportingClasses(false);
        e.target.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // 🟡 FIX : toast générique
  const handleAdd = async (nomTrimmed) => {
    if (!nomTrimmed) return;
    setAdding(true);
    try {
      await addClasseMutation({
        nom: nomTrimmed,
        ecoleId,
        userId,
        anneeId: anneeId || undefined,
      });
      toast.success(`Classe "${nomTrimmed}" créée.`);
      setShowAddModal(false);
    } catch (err) {
      console.error("[GestionClassesAdmin] add failed:", err);
      toast.error("Impossible de créer la classe");
    } finally {
      setAdding(false);
    }
  };

  // 🟡 FIX : toast générique
  const handleDelete = async (id, nom) => {
    if (eleves.some((e) => e.classe === nom)) {
      toast.error(
        "Impossible, des élèves sont encore affectés à cette classe."
      );
      return;
    }
    const ok = await confirm(
      "Supprimer la classe",
      `Voulez-vous vraiment supprimer la classe "${nom}" ?`
    );
    if (!ok) return;
    setDeleting(id);
    try {
      await removeClasseMutation({ id, userId });
      toast.success(`Classe "${nom}" supprimée.`);
      if (selectedClasse?._id === id) setSelectedClasse(null);
    } catch (err) {
      console.error("[GestionClassesAdmin] delete failed:", err);
      toast.error("Impossible de supprimer la classe");
    } finally {
      setDeleting(null);
    }
  };

  const startRename = (classe) => {
    setEditingClasseId(classe._id);
    setEditingNom(classe.nom);
  };
  const cancelRename = () => {
    setEditingClasseId(null);
    setEditingNom("");
  };
  // 🟡 FIX : toast générique
  const saveRename = async (id) => {
    const trimmed = editingNom.trim();
    if (!trimmed || trimmed === classes.find((c) => c._id === id)?.nom) {
      cancelRename();
      return;
    }
    setSavingRename(true);
    try {
      await renameClasseMutation({ id, nom: trimmed, userId });
      toast.success("Classe renommée.");
      cancelRename();
    } catch (err) {
      console.error("[GestionClassesAdmin] rename failed:", err);
      toast.error("Impossible de renommer la classe");
    } finally {
      setSavingRename(false);
    }
  };

  // 🟡 FIX : toast génériques
  const handleRetirerEleve = async (eleveId) => {
    if (!updateEleveClasse) {
      toast.error("Fonction de mise à jour non disponible.");
      return;
    }
    setUpdatingEleve(eleveId);
    try {
      await updateEleveClasse(eleveId, "");
      toast.success("Élève retiré de la classe.");
    } catch (err) {
      console.error("[GestionClassesAdmin] removeEleve failed:", err);
      toast.error("Impossible de retirer l'élève");
    } finally {
      setUpdatingEleve(null);
    }
  };

  const handleAddEleveToClasse = async (e) => {
    e.preventDefault();
    if (!eleveToAdd || !selectedClasse) return;
    if (!updateEleveClasse) {
      toast.error("Fonction de mise à jour non disponible.");
      return;
    }
    setUpdatingEleve(eleveToAdd);
    try {
      await updateEleveClasse(eleveToAdd, selectedClasse.nom);
      toast.success("Élève ajouté à la classe.");
      setEleveToAdd("");
    } catch (err) {
      console.error("[GestionClassesAdmin] addEleve failed:", err);
      toast.error("Impossible d'ajouter l'élève");
    } finally {
      setUpdatingEleve(null);
    }
  };

  const handleReassignerEleve = async (eleveId, newClasse) => {
    if (!updateEleveClasse) {
      toast.error("Fonction de mise à jour non disponible.");
      return;
    }
    setUpdatingEleve(eleveId);
    try {
      await updateEleveClasse(eleveId, newClasse);
      toast.success("Élève réassigné.");
    } catch (err) {
      console.error("[GestionClassesAdmin] reassign failed:", err);
      toast.error("Impossible de réassigner l'élève");
    } finally {
      setUpdatingEleve(null);
    }
  };

  const handleAssignNonAssigne = async (eleveId, classeNom) => {
    if (!updateEleveClasse) {
      toast.error("Fonction de mise à jour non disponible.");
      return;
    }
    setUpdatingEleve(eleveId);
    try {
      await updateEleveClasse(eleveId, classeNom);
      toast.success("Élève assigné.");
    } catch (err) {
      console.error("[GestionClassesAdmin] assign failed:", err);
      toast.error("Impossible d'assigner l'élève");
    } finally {
      setUpdatingEleve(null);
    }
  };

  if (classes === undefined) return <Skeleton height={250} />;

  // ==================== COULEURS ====================
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const inputBg = dark ? "#0F172A" : "#F9FAFB";
  const buttonBg = dark ? "#818CF8" : "#4F46E5";
  const badgeBg = dark ? "#312E81" : "#EEF2FF";
  const badgeText = dark ? "#A5B4FC" : "#4F46E5";
  const dangerBg = dark ? "#7F1D1D" : "#FEE2E2";
  const dangerText = dark ? "#FCA5A5" : "#B91C1C";
  const accent = dark ? "#818CF8" : "#4F46E5";
  const hoverBg = dark ? "#2D3748" : "#F1F5F9";

  // ==================== RENDU TABLEAU (desktop) ====================
  const renderTable = () => (
    <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ borderBottom: `2px solid ${cardBorder}` }}>
            <th style={{ padding: "10px 8px", width: 40 }}>
              <button
                onClick={toggleSelectAll}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: textPrimary,
                }}
              >
                {selectedIds.length === filteredAndSorted.length &&
                filteredAndSorted.length > 0 ? (
                  <CheckSquare size={18} />
                ) : (
                  <Square size={18} />
                )}
              </button>
            </th>
            <th
              style={{
                padding: "10px 8px",
                textAlign: "left",
                cursor: "pointer",
                color: textSecondary,
              }}
              onClick={() => {
                if (sortBy === "nom")
                  setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
                else {
                  setSortBy("nom");
                  setSortOrder("asc");
                }
              }}
            >
              Classe{" "}
              {sortBy === "nom" &&
                (sortOrder === "asc" ? (
                  <ChevronUp size={14} />
                ) : (
                  <ChevronDown size={14} />
                ))}
            </th>
            <th
              style={{
                padding: "10px 8px",
                textAlign: "center",
                cursor: "pointer",
                color: textSecondary,
              }}
              onClick={() => {
                if (sortBy === "effectif")
                  setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
                else {
                  setSortBy("effectif");
                  setSortOrder("asc");
                }
              }}
            >
              Élèves{" "}
              {sortBy === "effectif" &&
                (sortOrder === "asc" ? (
                  <ChevronUp size={14} />
                ) : (
                  <ChevronDown size={14} />
                ))}
            </th>
            <th
              style={{
                padding: "10px 8px",
                textAlign: "center",
                cursor: "pointer",
                color: textSecondary,
              }}
              onClick={() => {
                if (sortBy === "enseignants")
                  setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
                else {
                  setSortBy("enseignants");
                  setSortOrder("asc");
                }
              }}
            >
              Ens.{" "}
              {sortBy === "enseignants" &&
                (sortOrder === "asc" ? (
                  <ChevronUp size={14} />
                ) : (
                  <ChevronDown size={14} />
                ))}
            </th>
            <th style={{ padding: "10px 8px", textAlign: "center", color: textSecondary }}>
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {filteredAndSorted.map((c) => (
            <tr
              key={c._id}
              style={{
                borderBottom: `1px solid ${cardBorder}`,
                background: selectedIds.includes(c._id)
                  ? dark ? "#2D3748" : "#F1F5F9"
                  : "transparent",
                cursor: "pointer",
              }}
              onClick={() => {
                if (selectionMode) toggleSelectOne(c._id);
                else setSelectedClasse(c);
              }}
              onMouseEnter={(e) => {
                if (!selectedIds.includes(c._id))
                  e.currentTarget.style.background = hoverBg;
              }}
              onMouseLeave={(e) => {
                if (!selectedIds.includes(c._id))
                  e.currentTarget.style.background = "transparent";
              }}
            >
              <td style={{ padding: "8px" }} onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => toggleSelectOne(c._id)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: textPrimary,
                  }}
                >
                  {selectedIds.includes(c._id) ? (
                    <CheckSquare size={18} color={accent} />
                  ) : (
                    <Square size={18} />
                  )}
                </button>
              </td>
              <td style={{ padding: "8px", color: textPrimary }} onClick={(e) => e.stopPropagation()}>
                {editingClasseId === c._id ? (
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input
                      value={editingNom}
                      onChange={(e) => setEditingNom(e.target.value)}
                      style={{
                        padding: "4px 8px",
                        border: `1px solid ${cardBorder}`,
                        borderRadius: 6,
                        background: inputBg,
                        color: textPrimary,
                        fontSize: 14,
                      }}
                    />
                    <button
                      onClick={() => saveRename(c._id)}
                      disabled={savingRename}
                      style={{ background: "none", border: "none", color: "#10B981", cursor: "pointer" }}
                    >
                      {savingRename ? (
                        <Loader size={14} className="gca-spin" />
                      ) : (
                        <Check size={16} />
                      )}
                    </button>
                    <button
                      onClick={cancelRename}
                      style={{ background: "none", border: "none", color: dangerText, cursor: "pointer" }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <span style={{ fontWeight: 500 }}>{c.nom}</span>
                )}
              </td>
              <td style={{ padding: "8px", textAlign: "center" }}>
                <span
                  style={{
                    background: c.effectif > 0 ? badgeBg : (dark ? "#78350F" : "#FEF3C7"),
                    color: c.effectif > 0 ? badgeText : (dark ? "#FCD34D" : "#B45309"),
                    padding: "2px 10px",
                    borderRadius: 12,
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {c.effectif}
                </span>
              </td>
              <td style={{ padding: "8px", textAlign: "center", color: textSecondary }}>
                {c.nbEnseignants}
              </td>
              <td
                style={{ padding: "8px", textAlign: "center", whiteSpace: "nowrap" }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setSelectedClasse(c)}
                  title="Voir la classe"
                  style={{
                    background: "none",
                    border: "none",
                    color: accent,
                    cursor: "pointer",
                    padding: 4,
                    marginRight: 4,
                  }}
                >
                  <Eye size={16} />
                </button>
                <button
                  onClick={() => startRename(c)}
                  title="Renommer"
                  style={{
                    background: "none",
                    border: "none",
                    color: "#3B82F6",
                    cursor: "pointer",
                    padding: 4,
                    marginRight: 4,
                  }}
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => handleDelete(c._id, c.nom)}
                  disabled={deleting === c._id}
                  title="Supprimer"
                  style={{
                    background: "none",
                    border: "none",
                    color: "#EF4444",
                    cursor: "pointer",
                    padding: 4,
                  }}
                >
                  {deleting === c._id ? (
                    <Loader size={16} className="gca-spin" />
                  ) : (
                    <Trash2 size={16} />
                  )}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // ==================== RENDU CARTES COMPACTES ====================
  const renderCards = () => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: isMobile
          ? "1fr"
          : "repeat(auto-fill, minmax(320px, 1fr))",
        gap: isMobile ? 8 : 12,
      }}
    >
      {filteredAndSorted.map((c) => {
        const isSelected = selectedIds.includes(c._id);
        const isEmpty = c.effectif === 0;

        const handleCardClick = () => {
          if (selectionMode) {
            toggleSelectOne(c._id);
          } else {
            setSelectedClasse(c);
          }
        };

        return (
          <div
            key={c._id}
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
              background: cardBg,
              borderRadius: 12,
              padding: isMobile ? "10px 12px" : "10px 14px",
              boxShadow: dark
                ? "0 1px 2px rgba(0,0,0,0.25)"
                : "0 1px 2px rgba(0,0,0,0.04)",
              border: `1.5px solid ${
                isSelected
                  ? dark ? "#818CF8" : "#4F46E5"
                  : isEmpty
                  ? dark ? "#78350F" : "#FED7AA"
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
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleSelectOne(c._id);
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

            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: isEmpty
                  ? dark ? "#78350F" : "#FEF3C7"
                  : dark ? "#312E81" : "#EEF2FF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: isEmpty
                  ? dark ? "#FCD34D" : "#B45309"
                  : dark ? "#A5B4FC" : "#4F46E5",
                flexShrink: 0,
              }}
            >
              <BookOpen size={18} />
            </div>

            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                <span
                  style={{
                    fontWeight: 600,
                    fontSize: isMobile ? 13.5 : 14,
                    color: textPrimary,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    minWidth: 0,
                  }}
                >
                  {c.nom}
                </span>
                <span
                  style={{
                    background: isEmpty
                      ? dark ? "#78350F" : "#FEF3C7"
                      : badgeBg,
                    color: isEmpty
                      ? dark ? "#FCD34D" : "#B45309"
                      : badgeText,
                    padding: "1px 7px",
                    borderRadius: 10,
                    fontSize: 10,
                    fontWeight: 700,
                    flexShrink: 0,
                    whiteSpace: "nowrap",
                  }}
                >
                  {c.effectif} élève{c.effectif > 1 ? "s" : ""}
                </span>
              </div>

              <div
                style={{
                  fontSize: isMobile ? 11 : 11.5,
                  color: textSecondary,
                  marginTop: 2,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {c.enseignantPrincipal
                  ? `${c.enseignantPrincipal} · ${c.nbEnseignants} enseignant${c.nbEnseignants > 1 ? "s" : ""}`
                  : isEmpty
                  ? "Aucun enseignant"
                  : `${c.nbEnseignants} enseignant${c.nbEnseignants > 1 ? "s" : ""}`}
              </div>
            </div>

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

  // ==================== LISTE DES CLASSES ====================
  const renderListeClasses = () => (
    <>
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
              fontSize: isMobile ? 18 : 24,
              fontWeight: 700,
              color: textPrimary,
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            Classes
          </h2>
          <p
            style={{
              color: textSecondary,
              marginTop: 2,
              marginBottom: 0,
              fontSize: isMobile ? 11.5 : 13,
            }}
          >
            {filteredAndSorted.length} sur {classes.length}
            {activeFiltersCount > 0
              ? ` · ${activeFiltersCount} filtre${activeFiltersCount > 1 ? "s" : ""}`
              : ""}
          </p>
        </div>

        {!isMobile && (
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={exportExcel}
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
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              <Download size={15} /> Exporter
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importingClasses}
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
                cursor: importingClasses ? "not-allowed" : "pointer",
                fontSize: 13,
                opacity: importingClasses ? 0.6 : 1,
              }}
            >
              {importingClasses ? (
                <Loader size={15} className="gca-spin" />
              ) : (
                <Upload size={15} />
              )}
              Importer
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 8,
                background: buttonBg,
                color: "#FFF",
                border: "none",
                fontWeight: 600,
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              <Plus size={15} /> Ajouter
            </button>
          </div>
        )}
      </div>

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
        <StatCard icon={<BookOpen size={18} color="#4F46E5" />} label="Classes" value={stats.totalClasses} color="#4F46E5" dark={dark} isMobile={isMobile} />
        <StatCard icon={<Users size={18} color="#0EA5E9" />} label="Élèves" value={stats.totalEleves} color="#0EA5E9" dark={dark} isMobile={isMobile} />
        <StatCard icon={<BarChart3 size={18} color="#10B981" />} label="Moy./classe" value={stats.moyenne} color="#10B981" dark={dark} isMobile={isMobile} />
        <StatCard icon={<AlertCircle size={18} color="#F59E0B" />} label="Vides" value={stats.classesVides} color="#F59E0B" dark={dark} isMobile={isMobile} />
        <StatCard icon={<GraduationCap size={18} color="#8B5CF6" />} label="Enseignants" value={stats.totalEnseignants} color="#8B5CF6" dark={dark} isMobile={isMobile} />
      </div>

      {isMobile ? (
        <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "stretch" }}>
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
              type="text"
              placeholder="Rechercher…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
                activeFiltersCount > 0
                  ? dark ? "#818CF8" : "#4F46E5"
                  : cardBorder
              }`,
              background:
                activeFiltersCount > 0
                  ? dark ? "#312E81" : "#EEF2FF"
                  : cardBg,
              color:
                activeFiltersCount > 0
                  ? dark ? "#C7D2FE" : "#4F46E5"
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
                  background: dark ? "#818CF8" : "#4F46E5",
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
        <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "stretch" }}>
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
              type="text"
              placeholder="Rechercher une classe…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
            value={filterEffectif}
            onChange={(e) => setFilterEffectif(e.target.value)}
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              border: `1px solid ${cardBorder}`,
              background: cardBg,
              color: textPrimary,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            <option value="all">Toutes</option>
            <option value="non-vide">Avec élèves</option>
            <option value="vide">Vides</option>
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
                background: viewMode === "table" ? badgeBg : "transparent",
                color: viewMode === "table" ? badgeText : textSecondary,
                cursor: "pointer",
              }}
            >
              <List size={16} />
            </button>
            <button
              onClick={() => setViewMode("cards")}
              style={{
                padding: 6,
                borderRadius: 6,
                border: "none",
                background: viewMode === "cards" ? badgeBg : "transparent",
                color: viewMode === "cards" ? badgeText : textSecondary,
                cursor: "pointer",
              }}
            >
              <Grid size={16} />
            </button>
          </div>
        </div>
      )}

      {activeFiltersCount > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
          {searchQuery.trim() && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "4px 10px",
                background: badgeBg,
                color: badgeText,
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              « {searchQuery} »{" "}
              <X size={12} style={{ cursor: "pointer" }} onClick={() => setSearchQuery("")} />
            </span>
          )}
          {filterEffectif !== "all" && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "4px 10px",
                background: badgeBg,
                color: badgeText,
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              {filterEffectif === "vide" ? "Vides" : "Avec élèves"}{" "}
              <X size={12} style={{ cursor: "pointer" }} onClick={() => setFilterEffectif("all")} />
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

      {showNonAssignes && (
        <div
          style={{
            marginBottom: 16,
            padding: isMobile ? 12 : 16,
            background: cardBg,
            border: `1px solid ${cardBorder}`,
            borderRadius: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: textPrimary }}>
              Élèves non assignés ({elevesNonAssignes.length})
            </h3>
            <button
              onClick={() => setShowNonAssignes(false)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: textSecondary,
              }}
            >
              <X size={18} />
            </button>
          </div>
          {elevesNonAssignes.length === 0 ? (
            <p style={{ margin: 0, fontSize: 13, color: textSecondary }}>
              Tous les élèves sont assignés à une classe. 🎉
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 300, overflowY: "auto" }}>
              {elevesNonAssignes.map((e) => (
                <div
                  key={e._id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: 8,
                    borderRadius: 8,
                    background: dark ? "#0F172A" : "#F8FAFC",
                    border: `1px solid ${cardBorder}`,
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: badgeBg,
                      color: badgeText,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: 12,
                      flexShrink: 0,
                    }}
                  >
                    {e.prenom?.[0]}
                    {e.nom?.[0]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {e.prenom} {e.nom}
                    </div>
                    <div style={{ fontSize: 11, color: textSecondary }}>{e.code || "—"}</div>
                  </div>
                  <select
                    value=""
                    onChange={(ev) => {
                      const val = ev.target.value;
                      if (val) handleAssignNonAssigne(e._id, val);
                    }}
                    disabled={updatingEleve === e._id || !updateEleveClasse}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 8,
                      border: `1px solid ${cardBorder}`,
                      background: cardBg,
                      color: textPrimary,
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    <option value="">Assigner…</option>
                    {classesAvecEffectif.map((c) => (
                      <option key={c._id} value={c.nom}>
                        {c.nom}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {filteredAndSorted.length === 0 ? (
        <EmptyState
          title="Aucune classe"
          message={
            searchQuery || filterEffectif !== "all"
              ? "Aucune classe ne correspond aux critères."
              : "Créez votre première classe."
          }
        />
      ) : isMobile || viewMode === "cards" ? (
        renderCards()
      ) : (
        renderTable()
      )}

      {isMobile && !selectedClasse && (
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            position: "fixed",
            bottom: selectionMode ? 90 : 24,
            right: 20,
            width: 56,
            height: 56,
            borderRadius: 28,
            background: buttonBg,
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
          title="Nouvelle classe"
        >
          <Plus size={26} />
        </button>
      )}

      {isMobile && selectionMode && (
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
            animation: "gca-slide-up-bar 0.2s ease-out",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                background: badgeBg,
                color: badgeText,
                borderRadius: 20,
                padding: "4px 10px",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {selectedIds.length}
            </div>
            <button
              onClick={() => setSelectedIds([])}
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
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={handleBulkDelete}
              style={{
                padding: "10px 14px",
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
        </div>
      )}

      {!isMobile && selectionMode && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background: cardBg,
            border: `1px solid ${cardBorder}`,
            borderRadius: 12,
            padding: "10px 16px",
            display: "flex",
            alignItems: "center",
            gap: 14,
            boxShadow: "0 8px 30px rgba(0,0,0,0.2)",
            zIndex: 950,
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: textPrimary }}>
            {selectedIds.length} sélectionnée(s)
          </span>
          <button
            onClick={handleBulkDelete}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              borderRadius: 8,
              border: "none",
              background: "#DC2626",
              color: "#FFF",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <Trash2 size={14} /> Supprimer
          </button>
          <button
            onClick={() => setSelectedIds([])}
            style={{
              background: "none",
              border: "none",
              color: textSecondary,
              cursor: "pointer",
              padding: 4,
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </>
  );

  // ==================== DÉTAIL CLASSE ====================
  const renderDetailClasse = () => {
    if (!selectedClasse) return null;
    const classe = selectedClasse;

    return (
      <div style={{ animation: "gca-fade-in 0.3s ease-out" }}>
        <button
          onClick={() => {
            setSelectedClasse(null);
            setActiveDetailTab("eleves");
            setSearchElevesClasse("");
            cancelRename();
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "none",
            border: "none",
            color: textPrimary,
            cursor: "pointer",
            marginBottom: isMobile ? 12 : 20,
            fontSize: 14,
            padding: 0,
          }}
        >
          <ArrowLeft size={20} /> Retour à la liste
        </button>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: isMobile ? 14 : 24,
            gap: 12,
            flexDirection: isMobile ? "column" : "row",
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            {/* 🔴 FIX : édition inline du nom dans la vue détail */}
            {editingClasseId === classe._id ? (
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <input
                  value={editingNom}
                  onChange={(e) => setEditingNom(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveRename(classe._id);
                    if (e.key === "Escape") cancelRename();
                  }}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 10,
                    border: `1px solid ${accent}`,
                    background: inputBg,
                    color: textPrimary,
                    fontSize: isMobile ? 16 : 18,
                    fontWeight: 600,
                    outline: "none",
                    minWidth: 180,
                    flex: isMobile ? 1 : "none",
                  }}
                />
                <button
                  onClick={() => saveRename(classe._id)}
                  disabled={savingRename}
                  style={{
                    background: "#10B981",
                    color: "white",
                    border: "none",
                    borderRadius: 10,
                    padding: 10,
                    cursor: savingRename ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: savingRename ? 0.6 : 1,
                  }}
                  title="Enregistrer"
                >
                  {savingRename ? (
                    <Loader size={16} className="gca-spin" />
                  ) : (
                    <Check size={16} />
                  )}
                </button>
                <button
                  onClick={cancelRename}
                  style={{
                    background: "transparent",
                    border: `1px solid ${cardBorder}`,
                    color: textSecondary,
                    borderRadius: 10,
                    padding: 10,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  title="Annuler"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <h2
                style={{
                  fontSize: isMobile ? 20 : 26,
                  fontWeight: 700,
                  color: textPrimary,
                  margin: 0,
                  lineHeight: 1.2,
                }}
              >
                {classe.nom}
              </h2>
            )}
            <div
              style={{
                display: "flex",
                gap: 8,
                marginTop: 8,
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  background: badgeBg,
                  color: badgeText,
                  padding: "4px 10px",
                  borderRadius: 12,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {classe.effectif} élève{classe.effectif > 1 ? "s" : ""}
              </span>
              <span
                style={{
                  background: badgeBg,
                  color: badgeText,
                  padding: "4px 10px",
                  borderRadius: 12,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {classe.nbEnseignants} enseignant{classe.nbEnseignants > 1 ? "s" : ""}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, alignSelf: isMobile ? "stretch" : "auto" }}>
            {editingClasseId !== classe._id && (
              <button
                onClick={() => startRename(classe)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: `1px solid ${cardBorder}`,
                  background: cardBg,
                  color: textPrimary,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                  flex: isMobile ? 1 : "none",
                }}
              >
                <Pencil size={15} /> Renommer
              </button>
            )}
            <button
              onClick={() => handleDelete(classe._id, classe.nom)}
              disabled={classe.effectif > 0 || deleting === classe._id}
              title={
                classe.effectif > 0
                  ? "Retirez les élèves d'abord"
                  : "Supprimer cette classe"
              }
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "10px 14px",
                borderRadius: 10,
                border: "none",
                background:
                  classe.effectif > 0
                    ? dark ? "#334155" : "#E2E8F0"
                    : "#DC2626",
                color:
                  classe.effectif > 0 ? textSecondary : "#FFF",
                fontWeight: 600,
                fontSize: 13,
                cursor: classe.effectif > 0 ? "not-allowed" : "pointer",
                flex: isMobile ? 1 : "none",
              }}
            >
              {deleting === classe._id ? (
                <Loader size={15} className="gca-spin" />
              ) : (
                <Trash2 size={15} />
              )}
              Supprimer
            </button>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            borderBottom: `2px solid ${cardBorder}`,
            marginBottom: 18,
            overflowX: "auto",
            whiteSpace: "nowrap",
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
          }}
        >
          <button
            onClick={() => setActiveDetailTab("eleves")}
            style={{
              padding: isMobile ? "10px 14px" : "10px 18px",
              border: "none",
              background: "transparent",
              color: activeDetailTab === "eleves" ? accent : textSecondary,
              fontWeight: activeDetailTab === "eleves" ? 700 : 500,
              borderBottom:
                activeDetailTab === "eleves"
                  ? `3px solid ${accent}`
                  : "3px solid transparent",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13.5,
              flexShrink: 0,
              marginBottom: -2,
            }}
          >
            <Users size={16} /> Élèves ({classe.effectif})
          </button>
          <button
            onClick={() => setActiveDetailTab("enseignants")}
            style={{
              padding: isMobile ? "10px 14px" : "10px 18px",
              border: "none",
              background: "transparent",
              color: activeDetailTab === "enseignants" ? accent : textSecondary,
              fontWeight: activeDetailTab === "enseignants" ? 700 : 500,
              borderBottom:
                activeDetailTab === "enseignants"
                  ? `3px solid ${accent}`
                  : "3px solid transparent",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13.5,
              flexShrink: 0,
              marginBottom: -2,
            }}
          >
            <GraduationCap size={16} /> Enseignants ({classe.nbEnseignants})
          </button>
          <button
            onClick={() => setActiveDetailTab("stats")}
            style={{
              padding: isMobile ? "10px 14px" : "10px 18px",
              border: "none",
              background: "transparent",
              color: activeDetailTab === "stats" ? accent : textSecondary,
              fontWeight: activeDetailTab === "stats" ? 700 : 500,
              borderBottom:
                activeDetailTab === "stats"
                  ? `3px solid ${accent}`
                  : "3px solid transparent",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13.5,
              flexShrink: 0,
              marginBottom: -2,
            }}
          >
            <BarChart3 size={16} /> Statistiques
          </button>
        </div>

        {activeDetailTab === "eleves" && (
          <div>
            <div style={{ position: "relative", marginBottom: 12 }}>
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
                type="text"
                placeholder="Rechercher un élève…"
                value={searchElevesClasse}
                onChange={(e) => setSearchElevesClasse(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 12px 12px 38px",
                  borderRadius: 12,
                  border: `1px solid ${cardBorder}`,
                  background: inputBg,
                  color: textPrimary,
                  fontSize: 15,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {elevesDeLaClasse.length === 0 ? (
              <EmptyState
                title="Aucun élève"
                message={
                  searchElevesClasse
                    ? "Aucun élève ne correspond."
                    : "Cette classe est vide."
                }
              />
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {elevesDeLaClasse.map((eleve) => (
                  <div
                    key={eleve._id}
                    onClick={() => setSelectedEleveDetail(eleve)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 12px",
                      background: cardBg,
                      border: `1px solid ${cardBorder}`,
                      borderRadius: 10,
                      cursor: "pointer",
                      transition: "border-color 0.15s",
                    }}
                  >
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: "50%",
                        background: badgeBg,
                        color: badgeText,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: 12,
                        flexShrink: 0,
                      }}
                    >
                      {eleve.prenom?.[0]}
                      {eleve.nom?.[0]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13.5,
                          fontWeight: 600,
                          color: textPrimary,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {eleve.prenom} {eleve.nom}
                      </div>
                      <div style={{ fontSize: 11, color: textSecondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {eleve.code || "Pas de matricule"}
                        {eleve.sexe ? ` · ${eleve.sexe === "M" ? "M" : "F"}` : ""}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 4 }} onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleRetirerEleve(eleve._id)}
                        disabled={updatingEleve === eleve._id || !updateEleveClasse}
                        title="Retirer de la classe"
                        style={{
                          background: dark ? "#0F172A" : "#F8FAFC",
                          border: "none",
                          color: dangerText,
                          cursor: "pointer",
                          padding: 8,
                          borderRadius: 8,
                        }}
                      >
                        {updatingEleve === eleve._id ? (
                          <Loader size={14} className="gca-spin" />
                        ) : (
                          <UserX size={16} />
                        )}
                      </button>
                    </div>
                    <ChevronRight size={16} color={dark ? "#475569" : "#CBD5E1"} style={{ flexShrink: 0 }} />
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: 20 }}>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: textPrimary, marginBottom: 10 }}>
                Ajouter un élève à cette classe
              </h4>
              <form
                onSubmit={handleAddEleveToClasse}
                style={{
                  display: "flex",
                  gap: 10,
                  flexDirection: isMobile ? "column" : "row",
                }}
              >
                <select
                  value={eleveToAdd}
                  onChange={(e) => setEleveToAdd(e.target.value)}
                  disabled={!updateEleveClasse}
                  style={{
                    flex: 1,
                    padding: "12px 14px",
                    borderRadius: 10,
                    border: `1px solid ${cardBorder}`,
                    background: inputBg,
                    color: textPrimary,
                    fontSize: 14,
                    outline: "none",
                  }}
                >
                  <option value="">Sélectionner un élève…</option>
                  {elevesDisponibles.map((eleve) => (
                    <option key={eleve._id} value={eleve._id}>
                      {eleve.prenom} {eleve.nom} {eleve.postnom} (
                      {eleve.classe || "non assigné"})
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={!eleveToAdd || !updateEleveClasse || updatingEleve === eleveToAdd}
                  style={{
                    padding: "12px 18px",
                    background: buttonBg,
                    color: "white",
                    border: "none",
                    borderRadius: 10,
                    fontWeight: 600,
                    cursor:
                      !eleveToAdd || !updateEleveClasse
                        ? "not-allowed"
                        : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    fontSize: 14,
                    opacity:
                      !eleveToAdd || !updateEleveClasse ? 0.5 : 1,
                  }}
                >
                  {updatingEleve === eleveToAdd ? (
                    <Loader size={16} className="gca-spin" />
                  ) : (
                    <UserCheck size={16} />
                  )}
                  Ajouter
                </button>
              </form>
            </div>
          </div>
        )}

        {activeDetailTab === "enseignants" && (
          <div>
            {enseignantsDeLaClasse.length === 0 ? (
              <EmptyState
                title="Aucun enseignant"
                message="Aucun enseignant assigné à cette classe."
              />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {enseignantsDeLaClasse.map((ens) => (
                  <div
                    key={ens._id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 12px",
                      background: cardBg,
                      border: `1px solid ${cardBorder}`,
                      borderRadius: 10,
                    }}
                  >
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: "50%",
                        background: dark ? "#4C1D95" : "#EDE9FE",
                        color: dark ? "#C4B5FD" : "#7C3AED",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <GraduationCap size={18} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13.5,
                          fontWeight: 600,
                          color: textPrimary,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {ens.nom} {ens.prenom || ""}
                      </div>
                      <div style={{ fontSize: 11, color: textSecondary }}>
                        {ens.login}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeDetailTab === "stats" && statsClasse && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile
                ? "1fr 1fr"
                : "repeat(auto-fit, minmax(180px, 1fr))",
              gap: isMobile ? 8 : 12,
            }}
          >
            <StatCard
              icon={<Users size={18} color="#4F46E5" />}
              label="Total"
              value={statsClasse.total}
              color="#4F46E5"
              dark={dark}
              isMobile={isMobile}
            />
            <StatCard
              icon={<UserCheck size={18} color="#10B981" />}
              label="Garçons"
              value={statsClasse.garcons}
              color="#10B981"
              dark={dark}
              isMobile={isMobile}
            />
            <StatCard
              icon={<UserX size={18} color="#EC4899" />}
              label="Filles"
              value={statsClasse.filles}
              color="#EC4899"
              dark={dark}
              isMobile={isMobile}
            />
            <StatCard
              icon={<GraduationCap size={18} color="#8B5CF6" />}
              label="Enseignants"
              value={statsClasse.nbEnseignants}
              color="#8B5CF6"
              dark={dark}
              isMobile={isMobile}
            />
          </div>
        )}
      </div>
    );
  };

  // ==================== RENDU PRINCIPAL ====================
  return (
    <div
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: isMobile ? "10px 8px 90px" : "20px 16px",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* 🟢 FIX : keyframes préfixés `gca-*` */}
      <style>{`
        @keyframes gca-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .gca-spin { animation: gca-spin 1s linear infinite; }
        @keyframes gca-fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .gca-fade-in { animation: gca-fade-in 0.3s ease-out; }
        @keyframes gca-slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes gca-slide-up-bar { from { transform: translateY(100%); } to { transform: translateY(0); } }
      `}</style>

      {selectedClasse ? renderDetailClasse() : renderListeClasses()}

      <AddClasseModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAdd}
        adding={adding}
        dark={dark}
        isMobile={isMobile}
      />

      <FiltersSheet
        open={showFilters}
        onClose={() => setShowFilters(false)}
        dark={dark}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filterEffectif={filterEffectif}
        setFilterEffectif={setFilterEffectif}
        sortBy={sortBy}
        setSortBy={setSortBy}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        onReset={resetFilters}
        activeFiltersCount={activeFiltersCount}
        elevesNonAssignes={elevesNonAssignes.length}
        onShowNonAssignes={() => setShowNonAssignes(true)}
        onImportClick={() => fileInputRef.current?.click()}
        importingClasses={importingClasses}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        style={{ display: "none" }}
        onChange={handleImportClasses}
      />

      {selectedEleveDetail && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: isMobile ? "flex-end" : "center",
            justifyContent: "center",
            zIndex: 1100,
            padding: isMobile ? 0 : 16,
            animation: "gca-fade-in 0.2s ease-out",
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
              <div
                style={{
                  width: 40,
                  height: 4,
                  borderRadius: 2,
                  background: dark ? "#475569" : "#CBD5E1",
                  margin: "0 auto 14px",
                }}
              />
            )}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 18,
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: isMobile ? 17 : 20,
                  fontWeight: 700,
                  color: textPrimary,
                }}
              >
                Fiche élève
              </h3>
              <button
                onClick={() => setSelectedEleveDetail(null)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: textSecondary,
                }}
              >
                <X size={22} />
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 16,
              }}
            >
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 10,
                  }}
                >
                  <User size={16} color={accent} />
                  <span style={{ fontWeight: 600, color: textPrimary, fontSize: 13 }}>
                    Identité
                  </span>
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                  <p>
                    <strong>Nom :</strong> {selectedEleveDetail.nom}{" "}
                    {selectedEleveDetail.postnom} {selectedEleveDetail.prenom}
                  </p>
                  <p>
                    <strong>Sexe :</strong>{" "}
                    {selectedEleveDetail.sexe === "F"
                      ? "Féminin"
                      : selectedEleveDetail.sexe === "M"
                      ? "Masculin"
                      : "—"}
                  </p>
                  <p>
                    <strong>Matricule :</strong>{" "}
                    {selectedEleveDetail.code || "—"}
                  </p>
                  <p>
                    <strong>Date naissance :</strong>{" "}
                    {selectedEleveDetail.dateNaissance || "—"}
                  </p>
                </div>
              </div>

              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 10,
                  }}
                >
                  <MapPin size={16} color={accent} />
                  <span style={{ fontWeight: 600, color: textPrimary, fontSize: 13 }}>
                    Origine
                  </span>
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                  <p>
                    <strong>Province :</strong>{" "}
                    {selectedEleveDetail.province || "—"}
                  </p>
                  <p>
                    <strong>Territoire :</strong>{" "}
                    {selectedEleveDetail.territoire || "—"}
                  </p>
                  <p>
                    <strong>Adresse :</strong>{" "}
                    {selectedEleveDetail.adresse || "—"}
                  </p>
                </div>
              </div>

              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 10,
                  }}
                >
                  <Phone size={16} color={accent} />
                  <span style={{ fontWeight: 600, color: textPrimary, fontSize: 13 }}>
                    Contact
                  </span>
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                  <p>
                    <strong>Téléphone :</strong>{" "}
                    {selectedEleveDetail.telephone || "—"}
                  </p>
                </div>
              </div>

              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 10,
                  }}
                >
                  <Users size={16} color={accent} />
                  <span style={{ fontWeight: 600, color: textPrimary, fontSize: 13 }}>
                    Parents
                  </span>
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                  <p>
                    <strong>Père :</strong> {selectedEleveDetail.nomPere || "—"}
                  </p>
                  <p>
                    <strong>Mère :</strong> {selectedEleveDetail.nomMere || "—"}
                  </p>
                  <p>
                    <strong>Tuteur :</strong>{" "}
                    {selectedEleveDetail.tuteurNom || "—"}
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedEleveDetail(null)}
              style={{
                marginTop: 20,
                width: "100%",
                padding: 14,
                background: buttonBg,
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
      )}

      <ConfirmDialog {...dialogProps} />
    </div>
  );
}