// src/components/GestionFrais.jsx
import { useState, useRef, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useConfirm } from "@/hooks/useConfirm";
import { ConfirmDialog } from "./ConfirmDialog";
import toast from "react-hot-toast";
import { DataTable } from "./DataTable";
import {
  Loader, DollarSign, Trash2, Edit2,
  Download, CheckCircle, Clock, Search,
  Settings, Users, ChevronRight, X,
  SlidersHorizontal, Plus, FileWarning,
} from "lucide-react";
import { trierEleves } from "@/utils/tri";
import {
  FraisFiltersSheet,
  AddFraisModal,
  DetailFraisModal,
  ConfigFraisModal,
} from "./FraisModals";
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
const GestionFraisKeyframes = (
  <style>{`
    @keyframes gf-spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
    .gf-spin { animation: gf-spin 1s linear infinite; }
    @media (prefers-reduced-motion: reduce) {
      .gf-spin { animation: none !important; }
    }
  `}</style>
);

// ════════════════════════════════════════════════════════════════════
// LAZY-LOAD XLSX
// ════════════════════════════════════════════════════════════════════
let _xlsxPromise = null;
function loadXLSX() {
  if (!_xlsxPromise) _xlsxPromise = import("xlsx");
  return _xlsxPromise;
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
          }}
        >
          {label}
        </div>
        <div
          style={{
            color: dark ? "#F1F5F9" : "#1E293B",
            fontSize: isMobile ? 14 : 16,
            fontWeight: 700,
            lineHeight: 1.15,
            whiteSpace: "nowrap",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// CARTE FRAIS COMPACTE — ✨ refactorée avec state React
// ════════════════════════════════════════════════════════════════════
function FraisCard({ frais, eleve, deviseSymbol, dark, isMobile, onClick }) {
  const [pressed, setPressed] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);

  const estPaye = frais.reste <= 0;
  const resteColor = estPaye
    ? dark
      ? "#34D399"
      : "#10B981"
    : dark
    ? "#FBBF24"
    : "#F59E0B";

  const badgeStyle = estPaye
    ? {
        background: dark ? "#064E3B" : "#D1FAE5",
        color: dark ? "#34D399" : "#065F46",
      }
    : {
        background: dark ? "#78350F" : "#FEF3C7",
        color: dark ? "#FBBF24" : "#92400E",
      };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  };

  const handleTouchStart = () => setPressed(true);
  const handleTouchEnd = () => setPressed(false);
  const handleTouchCancel = () => setPressed(false);

  return (
    <div
      onClick={onClick}
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
        border: `1px solid ${
          focused ? dark ? "#818CF8" : "#4F46E5" : dark ? "#334155" : "#E2E8F0"
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
        outline: focused ? `2px solid ${dark ? "#818CF8" : "#4F46E5"}` : "none",
        outlineOffset: -2,
      }}
      aria-label={`Frais de ${eleve?.nom} ${eleve?.postnom} — ${
        estPaye ? "soldé" : `reste ${frais.reste.toLocaleString()} ${deviseSymbol}`
      }`}
    >
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
          fontSize: 12,
          flexShrink: 0,
        }}
        aria-hidden="true"
      >
        {eleve?.prenom?.[0]}
        {eleve?.nom?.[0]}
      </div>

      {/* Infos */}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            minWidth: 0,
          }}
        >
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
            {eleve?.nom} {eleve?.postnom}
          </span>
          <span
            style={{
              background: dark ? "#1E293B" : "#F1F5F9",
              color: dark ? "#CBD5E1" : "#475569",
              padding: "1px 7px",
              borderRadius: 10,
              fontSize: 10,
              fontWeight: 600,
              flexShrink: 0,
              border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
            }}
          >
            {eleve?.classe}
          </span>
        </div>
        <div
          style={{
            fontSize: isMobile ? 11 : 11.5,
            color: dark ? "#94A3B8" : "#64748B",
            marginTop: 3,
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexWrap: "wrap",
          }}
        >
          <span style={{ whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
            Total {frais.montantTotal.toLocaleString()} {deviseSymbol}
          </span>
          <span style={{ opacity: 0.5 }}>·</span>
          <span style={{ whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
            Payé {frais.montantPaye.toLocaleString()} {deviseSymbol}
          </span>
        </div>
        <div
          style={{
            fontSize: isMobile ? 11 : 11.5,
            fontWeight: 700,
            color: resteColor,
            marginTop: 2,
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontVariantNumeric: "tabular-nums" }}>
            {estPaye ? "Soldé" : `Reste ${frais.reste.toLocaleString()} ${deviseSymbol}`}
          </span>
          <span
            style={{
              ...badgeStyle,
              padding: "1px 7px",
              borderRadius: 10,
              fontSize: 9.5,
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
            }}
          >
            {estPaye ? (
              <CheckCircle size={9} aria-hidden="true" />
            ) : (
              <Clock size={9} aria-hidden="true" />
            )}
            {estPaye ? "Payé" : "Attente"}
          </span>
        </div>
      </div>

      <ChevronRight
        size={18}
        color={dark ? "#475569" : "#CBD5E1"}
        style={{ flexShrink: 0 }}
        aria-hidden="true"
      />
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
export function GestionFrais({ ecoleId, eleves, anneeId, anneeActive, user }) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();
  const { confirm, dialogProps } = useConfirm();

  const userId = user?._id;

  // ✨ Feedback tap
  const [pressedBtn, setPressedBtn] = useState(null);
  const [focusedSearch, setFocusedSearch] = useState(false);

  const pressBtn = useCallback((id) => () => setPressedBtn(id), []);
  const releaseBtn = useCallback(() => setPressedBtn(null), []);

  // Queries
  const ecole = useQuery(
    api.ecoles.get,
    ecoleId && userId ? { ecoleId, userId } : "skip"
  );
  const devise = ecole?.devise || "CDF";
  const deviseSymbol = devise === "USD" ? "$" : "FC";

  const fraisClasses =
    useQuery(
      api.frais.listFraisClasses,
      ecoleId && userId ? { ecoleId, anneeId, userId } : "skip"
    ) ?? [];

  const frais =
    useQuery(
      api.frais.listByEcole,
      ecoleId && userId
        ? anneeId
          ? { ecoleId, anneeId, userId }
          : { ecoleId, userId }
        : "skip"
    ) ?? [];

  // Mutations
  const upsertFraisClasse = useMutation(api.frais.upsertFraisClasse);
  const upsertFrais = useMutation(api.frais.upsert);
  const upsertBulk = useMutation(api.frais.upsertBulk);
  const removeFrais = useMutation(api.frais.remove);

  const [classeActive, setClasseActive] = useState("");
  const [statutFiltre, setStatutFiltre] = useState("tous");
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalMode, setAddModalMode] = useState("individuel");
  const [editingFrais, setEditingFrais] = useState(null);
  const [detailFrais, setDetailFrais] = useState(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fraisFileInputRef = useRef(null);

  // Maps mémoïsés
  const elevesById = useMemo(
    () => new Map(eleves.map((e) => [e._id, e])),
    [eleves]
  );

  const fraisClassesMap = useMemo(
    () => new Map(fraisClasses.map((fc) => [fc.classe, fc])),
    [fraisClasses]
  );

  // Calculs
  const classesStats = useMemo(() => {
    const map = {};
    for (const e of eleves) {
      if (!e.classe) continue;
      if (!map[e.classe]) {
        const fraisClasse = fraisClassesMap.get(e.classe);
        map[e.classe] = {
          nom: e.classe,
          nbEleves: 0,
          montantTotal: fraisClasse?.montantTotal || 0,
        };
      }
      map[e.classe].nbEleves++;
    }
    return Object.values(map).sort((a, b) =>
      a.nom.localeCompare(b.nom, undefined, {
        numeric: true,
        sensitivity: "base",
      })
    );
  }, [eleves, fraisClassesMap]);

  const elevesFiltres = useMemo(() => {
    const list = classeActive
      ? eleves.filter((e) => e.classe === classeActive)
      : eleves;
    return [...list].sort(trierEleves);
  }, [eleves, classeActive]);

  const fraisFiltres = useMemo(() => {
    if (!classeActive) return frais;
    return frais.filter((f) => {
      const eleve = elevesById.get(f.eleveId);
      return eleve?.classe === classeActive;
    });
  }, [frais, elevesById, classeActive]);

  const fraisFinaux = useMemo(() => {
    let result = fraisFiltres;
    if (statutFiltre !== "tous") {
      result = result.filter((f) => {
        const reste = f.montantTotal - f.montantPaye;
        if (statutFiltre === "paye") return reste <= 0;
        if (statutFiltre === "en_attente") return reste > 0;
        return true;
      });
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter((f) => {
        const eleve = elevesById.get(f.eleveId);
        if (!eleve) return false;
        const hay = `${eleve.nom} ${eleve.postnom} ${eleve.prenom || ""} ${eleve.classe || ""}`.toLowerCase();
        return hay.includes(q);
      });
    }
    return result;
  }, [fraisFiltres, statutFiltre, searchTerm, elevesById]);

  const enrichedFrais = useMemo(
    () =>
      fraisFinaux.map((f) => {
        const eleve = elevesById.get(f.eleveId);
        const reste = f.montantTotal - f.montantPaye;
        return {
          ...f,
          _raw: f,
          eleveNom: eleve?.nom ?? "—",
          elevePostnom: eleve?.postnom ?? "",
          eleveClasse: eleve?.classe ?? "—",
          reste,
          estPaye: reste <= 0,
          _eleve: eleve,
        };
      }),
    [fraisFinaux, elevesById]
  );

  const totalFrais = fraisFinaux.reduce((sum, f) => sum + f.montantTotal, 0);
  const totalPaye = fraisFinaux.reduce((sum, f) => sum + f.montantPaye, 0);
  const resteAPayer = totalFrais - totalPaye;
  const nbFrais = fraisFinaux.length;
  const nbPayes = fraisFinaux.filter(
    (f) => f.montantTotal - f.montantPaye <= 0
  ).length;
  const nbAttente = nbFrais - nbPayes;

  const activeFiltersCount = useMemo(() => {
    let n = 0;
    if (searchTerm.trim()) n++;
    if (classeActive) n++;
    if (statutFiltre !== "tous") n++;
    return n;
  }, [searchTerm, classeActive, statutFiltre]);

  // Handlers
  const resetFilters = () => {
    setSearchTerm("");
    setClasseActive("");
    setStatutFiltre("tous");
  };

  const handleOpenAdd = (mode = "individuel", initialData = null) => {
    setAddModalMode(mode);
    setEditingFrais(initialData?._raw || initialData);
    setShowAddModal(true);
  };

  const handleCloseAdd = () => {
    setShowAddModal(false);
    setEditingFrais(null);
  };

  const handleDelete = async (fraisItem) => {
    const ok = await confirm(
      "Supprimer ces frais",
      "Voulez-vous vraiment supprimer ces frais ?"
    );
    if (!ok) return;
    try {
      await removeFrais({ id: fraisItem._id, userId });
      toast.success("Frais supprimés");
      setDetailFrais(null);
    } catch (err) {
      toast.error(err.message || "Erreur lors de la suppression");
    }
  };

  const handleImportFraisExcel = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const XLSX = await loadXLSX();
      const data = new Uint8Array(await file.arrayBuffer());
      const workbook = XLSX.read(data, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

      if (rows.length < 2) {
        toast.error("Fichier vide");
        return;
      }

      const headers = rows[0].map((h) => h.toString().toLowerCase().trim());
      const nomIdx = headers.indexOf("nom");
      const postnomIdx = headers.indexOf("postnom");
      const classeIdx = headers.indexOf("classe");
      const totalIdx = headers.indexOf("montanttotal");
      const payeIdx = headers.indexOf("montantpaye");
      const commentaireIdx = headers.indexOf("commentaire");

      if (
        nomIdx === -1 ||
        postnomIdx === -1 ||
        classeIdx === -1 ||
        totalIdx === -1 ||
        payeIdx === -1
      ) {
        toast.error(
          "Colonnes requises : nom, postnom, classe, montantTotal, montantPaye"
        );
        return;
      }

      let count = 0;
      let skipped = 0;
      let errors = 0;

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (
          !row[nomIdx] ||
          !row[postnomIdx] ||
          !row[classeIdx] ||
          row[totalIdx] == null ||
          row[payeIdx] == null
        ) {
          skipped++;
          continue;
        }

        const nom = row[nomIdx].toString().trim();
        const postnom = row[postnomIdx].toString().trim();
        const classe = row[classeIdx].toString().trim();

        const eleve = eleves.find(
          (e) =>
            e.nom === nom && e.postnom === postnom && e.classe === classe
        );
        if (!eleve) {
          skipped++;
          continue;
        }

        const montantTotal = parseFloat(row[totalIdx]);
        const montantPaye = parseFloat(row[payeIdx]);
        if (isNaN(montantTotal) || isNaN(montantPaye)) {
          errors++;
          continue;
        }

        try {
          await upsertFrais({
            eleveId: eleve._id,
            ecoleId,
            montantTotal,
            montantPaye,
            commentaire:
              commentaireIdx !== -1
                ? row[commentaireIdx]?.toString().trim() || undefined
                : undefined,
            anneeId,
            userId,
          });
          count++;
        } catch {
          errors++;
        }
      }

      const parts = [`${count} frais importé${count > 1 ? "s" : ""}`];
      if (skipped) parts.push(`${skipped} ignoré${skipped > 1 ? "s" : ""}`);
      if (errors) parts.push(`${errors} échec${errors > 1 ? "s" : ""}`);
      if (count > 0) {
        toast.success(parts.join(" · "));
      } else {
        toast.error(parts.join(" · "));
      }
    } catch (err) {
      toast.error(err.message || "Erreur lors de l'import");
    } finally {
      setImporting(false);
      if (fraisFileInputRef.current) fraisFileInputRef.current.value = "";
    }
  };

  const handleExportExcel = async () => {
    if (fraisFinaux.length === 0) {
      toast.error("Aucune donnée à exporter.");
      return;
    }
    setExporting(true);
    try {
      const XLSX = await loadXLSX();
      const dataExport = fraisFinaux.map((f) => {
        const eleve = elevesById.get(f.eleveId);
        return {
          Nom: eleve?.nom ?? "",
          Postnom: eleve?.postnom ?? "",
          Classe: eleve?.classe ?? "",
          MontantTotal: f.montantTotal,
          MontantPaye: f.montantPaye,
          Reste: f.montantTotal - f.montantPaye,
          Commentaire: f.commentaire ?? "",
        };
      });
      const worksheet = XLSX.utils.json_to_sheet(dataExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Frais");
      XLSX.writeFile(
        workbook,
        `frais_${classeActive || "toutes_classes"}.xlsx`
      );
      toast.success("Export Excel réussi.");
    } catch (err) {
      toast.error(err?.message || "Erreur lors de l'export.");
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const XLSX = await loadXLSX();
      const template = [
        [
          "nom",
          "postnom",
          "classe",
          "montantTotal",
          "montantPaye",
          "commentaire",
        ],
        ["Jean", "Dupont", "6ème A", 50000, 20000, "Frais de scolarité"],
      ];
      const worksheet = XLSX.utils.aoa_to_sheet(template);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Modèle");
      XLSX.writeFile(workbook, "modele_import_frais.xlsx");
    } catch (err) {
      toast.error(err?.message || "Erreur lors du téléchargement du modèle");
    }
  };

  // Couleurs
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const accent = dark ? "#818CF8" : "#4F46E5";

  // Padding container avec safe-area
  const containerPadding = isMobile
    ? `calc(10px + ${SAFE_TOP}) calc(8px + ${SAFE_RIGHT}) calc(90px + ${SAFE_BOTTOM}) calc(8px + ${SAFE_LEFT})`
    : "20px 16px";

  // ════════════════════════════════════════════════════════════════
  // RENDU PRÉCOCE : pas d'année
  // ════════════════════════════════════════════════════════════════
  if (!anneeId) {
    return (
      <>
        {GestionFraisKeyframes}
        <div
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            padding: containerPadding,
            textAlign: "center",
            boxSizing: "border-box",
          }}
        >
          <DollarSign
            size={48}
            color="#F59E0B"
            style={{ marginBottom: 16 }}
            aria-hidden="true"
          />
          <h2
            style={{
              fontSize: isMobile ? 17 : 22,
              fontWeight: 700,
              color: textPrimary,
              margin: "0 0 8px",
            }}
          >
            Aucune année scolaire active
          </h2>
          <p style={{ color: textSecondary, fontSize: 13.5 }}>
            Veuillez activer une année scolaire.
          </p>
        </div>
      </>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // RENDU PRINCIPAL
  // ════════════════════════════════════════════════════════════════
  return (
    <>
      {GestionFraisKeyframes}
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
              Gestion des frais ({deviseSymbol})
            </h2>
            <p
              style={{
                color: textSecondary,
                marginTop: 2,
                marginBottom: 0,
                fontSize: isMobile ? 11.5 : 13,
              }}
            >
              {frais.length} élève{frais.length > 1 ? "s" : ""}
              {anneeActive ? ` · ${anneeActive.nom}` : ""}
            </p>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => setShowConfig(true)}
              onTouchStart={pressBtn("config")}
              onTouchEnd={releaseBtn}
              onTouchCancel={releaseBtn}
              title="Frais par classe"
              aria-label="Configurer les frais par classe"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: isMobile ? 0 : "8px 12px",
                background: dark ? "#334155" : "#F1F5F9",
                color: dark ? "#F1F5F9" : "#1E293B",
                border: "none",
                borderRadius: 10,
                fontWeight: 600,
                cursor: "pointer",
                fontSize: 13,
                minWidth: isMobile ? MOBILE_TAP : undefined,
                minHeight: MOBILE_TAP,
                transform:
                  pressedBtn === "config" ? "scale(0.96)" : "scale(1)",
                transition: "transform 0.1s ease",
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation",
                fontFamily: "inherit",
                boxSizing: "border-box",
              }}
            >
              <Settings size={16} aria-hidden="true" />
              {!isMobile && "Frais par classe"}
            </button>

            {!isMobile && (
              <button
                type="button"
                onClick={() => handleOpenAdd("individuel")}
                onTouchStart={pressBtn("add-header")}
                onTouchEnd={releaseBtn}
                onTouchCancel={releaseBtn}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 14px",
                  borderRadius: 10,
                  background: accent,
                  color: "#FFF",
                  border: "none",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: 13,
                  transform:
                    pressedBtn === "add-header" ? "scale(0.97)" : "scale(1)",
                  transition: "transform 0.1s ease",
                  WebkitTapHighlightColor: "transparent",
                  touchAction: "manipulation",
                  fontFamily: "inherit",
                }}
              >
                <Plus size={15} aria-hidden="true" /> Ajouter
              </button>
            )}
          </div>
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
            icon={<DollarSign size={16} />}
            label="Total dû"
            value={`${totalFrais.toLocaleString()}`}
            color="#4F46E5"
            dark={dark}
            isMobile={isMobile}
          />
          <StatCard
            icon={<CheckCircle size={16} />}
            label="Total payé"
            value={`${totalPaye.toLocaleString()}`}
            color="#10B981"
            dark={dark}
            isMobile={isMobile}
          />
          <StatCard
            icon={<FileWarning size={16} />}
            label="Reste"
            value={`${resteAPayer.toLocaleString()}`}
            color="#F59E0B"
            dark={dark}
            isMobile={isMobile}
          />
          <StatCard
            icon={<Users size={16} />}
            label="Payés"
            value={nbPayes}
            color="#10B981"
            dark={dark}
            isMobile={isMobile}
          />
          <StatCard
            icon={<Clock size={16} />}
            label="En attente"
            value={nbAttente}
            color="#F59E0B"
            dark={dark}
            isMobile={isMobile}
          />
        </div>

        {/* ═══ BARRE OUTILS ═══ */}
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
                type="text"
                placeholder="Rechercher un élève…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setFocusedSearch(true)}
                onBlur={() => setFocusedSearch(false)}
                inputMode="search"
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
                aria-label="Rechercher un élève"
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
                transform:
                  pressedBtn === "filters" ? "scale(0.97)" : "scale(1)",
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
                type="text"
                placeholder="Rechercher un élève…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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
              value={classeActive}
              onChange={(e) => setClasseActive(e.target.value)}
              aria-label="Filtrer par classe"
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                border: `1px solid ${cardBorder}`,
                background: cardBg,
                color: textPrimary,
                fontSize: 14,
                cursor: "pointer",
                minWidth: 180,
                fontFamily: "inherit",
              }}
            >
              <option value="">Toutes les classes</option>
              {classesStats.map((c) => (
                <option key={c.nom} value={c.nom}>
                  {c.nom} ({c.nbEleves})
                </option>
              ))}
            </select>
            <select
              value={statutFiltre}
              onChange={(e) => setStatutFiltre(e.target.value)}
              aria-label="Filtrer par statut"
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                border: `1px solid ${cardBorder}`,
                background: cardBg,
                color: textPrimary,
                fontSize: 14,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <option value="tous">Tous les statuts</option>
              <option value="paye">Payé</option>
              <option value="en_attente">En attente</option>
            </select>
          </div>
        )}

        {/* ═══ PUCES FILTRES ACTIFS ═══ */}
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
            {classeActive && (
              <FilterChip
                label={classeActive}
                onClear={() => setClasseActive("")}
                dark={dark}
              />
            )}
            {statutFiltre !== "tous" && (
              <FilterChip
                label={statutFiltre === "paye" ? "Payé" : "En attente"}
                onClear={() => setStatutFiltre("tous")}
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

        {/* ═══ LISTE ═══ */}
        {enrichedFrais.length === 0 ? (
          <div
            style={{
              background: cardBg,
              borderRadius: 16,
              padding: isMobile ? 32 : 48,
              textAlign: "center",
              boxShadow: dark
                ? "0 1px 3px rgba(0,0,0,0.3)"
                : "0 1px 3px rgba(0,0,0,0.05)",
              border: `1px solid ${cardBorder}`,
              color: textSecondary,
              boxSizing: "border-box",
            }}
          >
            <DollarSign
              size={isMobile ? 28 : 32}
              style={{ marginBottom: 8, opacity: 0.5 }}
              aria-hidden="true"
            />
            <p style={{ margin: 0, fontSize: 13.5 }}>
              {activeFiltersCount > 0
                ? "Aucun frais ne correspond aux filtres."
                : "Aucun frais enregistré."}
            </p>
            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={resetFilters}
                style={{
                  marginTop: 12,
                  padding: "10px 18px",
                  borderRadius: 8,
                  border: `1px solid ${cardBorder}`,
                  background: "transparent",
                  color: textPrimary,
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                  minHeight: MOBILE_TAP,
                  WebkitTapHighlightColor: "transparent",
                  touchAction: "manipulation",
                  fontFamily: "inherit",
                }}
              >
                Réinitialiser les filtres
              </button>
            )}
          </div>
        ) : isMobile ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: 8,
            }}
          >
            {enrichedFrais.map((f) => (
              <FraisCard
                key={f._id}
                frais={f}
                eleve={f._eleve}
                deviseSymbol={deviseSymbol}
                dark={dark}
                isMobile={isMobile}
                onClick={() => setDetailFrais(f)}
              />
            ))}
          </div>
        ) : (
          <DataTable
            columns={[
              {
                header: "Élève",
                accessor: "eleveNom",
                sortable: true,
                render: (f) => (
                  <strong>
                    {f.eleveNom} {f.elevePostnom}
                  </strong>
                ),
              },
              { header: "Classe", accessor: "eleveClasse", sortable: true },
              {
                header: `Total (${deviseSymbol})`,
                accessor: "montantTotal",
                sortable: true,
                render: (f) => (
                  <span style={{ fontVariantNumeric: "tabular-nums" }}>
                    {f.montantTotal.toLocaleString()}
                  </span>
                ),
              },
              {
                header: `Payé (${deviseSymbol})`,
                accessor: "montantPaye",
                sortable: true,
                render: (f) => (
                  <span style={{ fontVariantNumeric: "tabular-nums" }}>
                    {f.montantPaye.toLocaleString()}
                  </span>
                ),
              },
              {
                header: `Reste (${deviseSymbol})`,
                accessor: "reste",
                sortable: true,
                render: (f) => (
                  <span
                    style={{
                      color:
                        f.reste > 0
                          ? dark
                            ? "#FBBF24"
                            : "#F59E0B"
                          : dark
                          ? "#34D399"
                          : "#10B981",
                      fontWeight: 600,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {f.reste.toLocaleString()}
                  </span>
                ),
              },
              {
                header: "Statut",
                accessor: "estPaye",
                sortable: true,
                render: (f) => <BadgeStatut estPaye={f.estPaye} dark={dark} />,
              },
              {
                header: "Commentaire",
                accessor: "commentaire",
                render: (f) => f.commentaire || "—",
              },
              {
                header: "Actions",
                sortable: false,
                render: (f) => (
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => handleOpenAdd("individuel", f)}
                      onTouchStart={pressBtn("edit-" + f._id)}
                      onTouchEnd={releaseBtn}
                      onTouchCancel={releaseBtn}
                      aria-label={`Modifier les frais de ${f.eleveNom}`}
                      title="Modifier"
                      style={{
                        background: accent,
                        color: "white",
                        border: "none",
                        borderRadius: 6,
                        padding: 0,
                        cursor: "pointer",
                        minWidth: MOBILE_TAP,
                        minHeight: MOBILE_TAP,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transform:
                          pressedBtn === "edit-" + f._id ? "scale(0.92)" : "scale(1)",
                        transition: "transform 0.1s ease",
                        WebkitTapHighlightColor: "transparent",
                        touchAction: "manipulation",
                      }}
                    >
                      <Edit2 size={14} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(f)}
                      onTouchStart={pressBtn("del-" + f._id)}
                      onTouchEnd={releaseBtn}
                      onTouchCancel={releaseBtn}
                      aria-label={`Supprimer les frais de ${f.eleveNom}`}
                      title="Supprimer"
                      style={{
                        background: "#EF4444",
                        color: "white",
                        border: "none",
                        borderRadius: 6,
                        padding: 0,
                        cursor: "pointer",
                        minWidth: MOBILE_TAP,
                        minHeight: MOBILE_TAP,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transform:
                          pressedBtn === "del-" + f._id ? "scale(0.92)" : "scale(1)",
                        transition: "transform 0.1s ease",
                        WebkitTapHighlightColor: "transparent",
                        touchAction: "manipulation",
                      }}
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  </div>
                ),
              },
            ]}
            data={enrichedFrais}
            loading={false}
            searchable={false}
            searchPlaceholder="Rechercher…"
            pageSize={8}
            emptyTitle="Aucun frais"
            emptyMessage="Ajoutez des frais pour un élève."
          />
        )}

        {/* ═══ EXPORT DESKTOP ═══ */}
        {!isMobile && enrichedFrais.length > 0 && (
          <div style={{ marginTop: 16, textAlign: "right" }}>
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={exporting}
              onTouchStart={!exporting ? pressBtn("export") : undefined}
              onTouchEnd={releaseBtn}
              onTouchCancel={releaseBtn}
              style={{
                background: accent,
                color: "white",
                border: "none",
                borderRadius: 10,
                padding: "10px 20px",
                fontWeight: 600,
                cursor: exporting ? "wait" : "pointer",
                fontSize: 14,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                opacity: exporting ? 0.7 : 1,
                minHeight: MOBILE_TAP,
                transform:
                  pressedBtn === "export" && !exporting ? "scale(0.97)" : "scale(1)",
                transition: "transform 0.1s ease, opacity 0.15s ease",
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation",
                fontFamily: "inherit",
              }}
            >
              {exporting ? (
                <Loader size={16} className="gf-spin" aria-hidden="true" />
              ) : (
                <Download size={16} aria-hidden="true" />
              )}
              {exporting ? "Export…" : "Exporter en Excel"}
            </button>
          </div>
        )}

        {/* ═══ FAB ajouter — ✨ design system ═══ */}
        {isMobile && (
          <Fab
            icon={<Plus size={24} />}
            onClick={() => handleOpenAdd("individuel")}
            label="Ajouter des frais"
            bottom={24}
          />
        )}

        {/* ═══ INPUT FILE CACHÉ ═══ */}
        <input
          type="file"
          accept=".xlsx, .xls"
          onChange={handleImportFraisExcel}
          style={{ display: "none" }}
          ref={fraisFileInputRef}
          aria-hidden="true"
        />

        {/* ═══ BOTTOM SHEET FILTRES ═══ */}
        <FraisFiltersSheet
          open={showFilters}
          onClose={() => setShowFilters(false)}
          dark={dark}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          classeActive={classeActive}
          setClasseActive={setClasseActive}
          statutFiltre={statutFiltre}
          setStatutFiltre={setStatutFiltre}
          classesStats={classesStats}
          onReset={resetFilters}
          activeFiltersCount={activeFiltersCount}
          onImportClick={() => fraisFileInputRef.current?.click()}
          onDownloadTemplate={handleDownloadTemplate}
          onExportClick={handleExportExcel}
          importing={importing}
          exporting={exporting}
          deviseSymbol={deviseSymbol}
        />

        {/* ═══ MODALES ═══ */}
        <AddFraisModal
          open={showAddModal}
          onClose={handleCloseAdd}
          initialMode={addModalMode}
          initialData={editingFrais}
          eleves={elevesFiltres}
          fraisClasses={fraisClasses}
          upsertFrais={upsertFrais}
          upsertBulk={upsertBulk}
          ecoleId={ecoleId}
          anneeId={anneeId}
          userId={userId}
          deviseSymbol={deviseSymbol}
          dark={dark}
          isMobile={isMobile}
        />

        {detailFrais && (
          <DetailFraisModal
            frais={detailFrais}
            eleve={detailFrais._eleve}
            deviseSymbol={deviseSymbol}
            onClose={() => setDetailFrais(null)}
            onEdit={() => {
              const raw = detailFrais._raw || detailFrais;
              setDetailFrais(null);
              handleOpenAdd("individuel", raw);
            }}
            onDelete={() => handleDelete(detailFrais)}
            dark={dark}
            isMobile={isMobile}
          />
        )}

        <ConfigFraisModal
          open={showConfig}
          onClose={() => setShowConfig(false)}
          classesStats={classesStats}
          upsertFraisClasse={upsertFraisClasse}
          ecoleId={ecoleId}
          anneeId={anneeId}
          userId={userId}
          deviseSymbol={deviseSymbol}
          dark={dark}
          isMobile={isMobile}
        />

        <ConfirmDialog {...dialogProps} />
      </div>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════
// BADGE STATUT (desktop DataTable)
// ════════════════════════════════════════════════════════════════════
function BadgeStatut({ estPaye, dark }) {
  const style = estPaye
    ? {
        background: dark ? "#064E3B" : "#D1FAE5",
        color: dark ? "#34D399" : "#065F46",
      }
    : {
        background: dark ? "#78350F" : "#FEF3C7",
        color: dark ? "#FBBF24" : "#92400E",
      };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        ...style,
        padding: "4px 10px",
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 600,
        flexShrink: 0,
      }}
    >
      {estPaye ? (
        <CheckCircle size={12} aria-hidden="true" />
      ) : (
        <Clock size={12} aria-hidden="true" />
      )}
      {estPaye ? "Payé" : "En attente"}
    </span>
  );
}