import { useState, useRef, useMemo } from "react";
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

// ============================================================
// LAZY-LOAD XLSX (lib lourde ~500KB, chargée uniquement à l'usage)
// ============================================================
let _xlsxPromise = null;
function loadXLSX() {
  if (!_xlsxPromise) _xlsxPromise = import("xlsx");
  return _xlsxPromise;
}

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
          width: 32,
          height: 32,
          borderRadius: 8,
          background: `${color}20`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          color,
        }}
      >
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            color: dark ? "#94A3B8" : "#64748B",
            fontSize: 10.5,
            fontWeight: 500,
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </div>
        <div
          style={{
            color: dark ? "#F1F5F9" : "#1E293B",
            fontSize: 16,
            fontWeight: 700,
            lineHeight: 1.15,
            whiteSpace: "nowrap",
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// CARTE FRAIS COMPACTE
// ============================================================
function FraisCard({ frais, eleve, deviseSymbol, dark, isMobile, onClick }) {
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

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      style={{
        background: dark ? "#1E293B" : "#FFFFFF",
        borderRadius: 12,
        padding: isMobile ? "10px 12px" : "12px 14px",
        boxShadow: dark ? "0 1px 2px rgba(0,0,0,0.25)" : "0 1px 2px rgba(0,0,0,0.04)",
        border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
        display: "flex",
        alignItems: "center",
        gap: isMobile ? 10 : 12,
        cursor: "pointer",
        transition: "border-color 0.15s, transform 0.1s",
        userSelect: "none",
        WebkitTapHighlightColor: "transparent",
        minWidth: 0,
      }}
      onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.99)")}
      onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
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
          <span style={{ whiteSpace: "nowrap" }}>
            Total {frais.montantTotal.toLocaleString()} {deviseSymbol}
          </span>
          <span style={{ opacity: 0.5 }}>·</span>
          <span style={{ whiteSpace: "nowrap" }}>
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
          }}
        >
          {estPaye ? "Soldé" : `Reste ${frais.reste.toLocaleString()} ${deviseSymbol}`}
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
            {estPaye ? <CheckCircle size={9} /> : <Clock size={9} />}
            {estPaye ? "Payé" : "Attente"}
          </span>
        </div>
      </div>

      {/* Chevron */}
      <ChevronRight
        size={18}
        color={dark ? "#475569" : "#CBD5E1"}
        style={{ flexShrink: 0 }}
      />
    </div>
  );
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================
export function GestionFrais({ ecoleId, eleves, anneeId, anneeActive, user }) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();
  const { confirm, dialogProps } = useConfirm();

  const userId = user?._id;

  // ==================== QUERIES (avec userId requis) ====================
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

  // ==================== MUTATIONS ====================
  const upsertFraisClasse = useMutation(api.frais.upsertFraisClasse);
  const upsertFrais = useMutation(api.frais.upsert);
  const upsertBulk = useMutation(api.frais.upsertBulk);
  const removeFrais = useMutation(api.frais.remove);

  // ==================== ÉTAT LOCAL ====================
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

  // ==================== MAPS MÉMOÏSÉS (perf O(n) au lieu de O(n²)) ====================
  const elevesById = useMemo(
    () => new Map(eleves.map((e) => [e._id, e])),
    [eleves]
  );

  const fraisClassesMap = useMemo(
    () => new Map(fraisClasses.map((fc) => [fc.classe, fc])),
    [fraisClasses]
  );

  // ==================== CALCULS ====================
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
          _raw: f, // référence brute pour AddFraisModal
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

  // ==================== HANDLERS ====================
  const resetFilters = () => {
    setSearchTerm("");
    setClasseActive("");
    setStatutFiltre("tous");
  };

  const handleOpenAdd = (mode = "individuel", initialData = null) => {
    setAddModalMode(mode);
    // Toujours passer la version brute au modal (évite les champs parasites)
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

  // ==================== RENDU PRÉCOCE ====================
  if (!anneeId) {
    return (
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: isMobile ? "20px 12px" : "32px 24px",
          textAlign: "center",
        }}
      >
        <DollarSign
          size={48}
          color="#F59E0B"
          style={{ marginBottom: 16 }}
        />
        <h2
          style={{
            fontSize: isMobile ? 17 : 22,
            fontWeight: 700,
            color: dark ? "#F1F5F9" : "#1E293B",
            margin: "0 0 8px",
          }}
        >
          Aucune année scolaire active
        </h2>
        <p style={{ color: dark ? "#94A3B8" : "#64748B", fontSize: 13.5 }}>
          Veuillez activer une année scolaire.
        </p>
      </div>
    );
  }

  // ==================== COULEURS ====================
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const accent = dark ? "#818CF8" : "#4F46E5";

  // ==================== RENDU PRINCIPAL ====================
  return (
    <div
      style={{
        maxWidth: 1280,
        margin: "0 auto",
        padding: isMobile ? "10px 8px 90px" : "20px 16px",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <style>{`
        @keyframes gf-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .gf-animate-spin { animation: gf-spin 1s linear infinite; }
      `}</style>

      {/* En-tête compact */}
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
            onClick={() => setShowConfig(true)}
            title="Frais par classe"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: isMobile ? "10px" : "8px 12px",
              background: dark ? "#334155" : "#F1F5F9",
              color: dark ? "#F1F5F9" : "#1E293B",
              border: "none",
              borderRadius: 10,
              fontWeight: 600,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            <Settings size={16} />
            {!isMobile && "Frais par classe"}
          </button>

          {!isMobile && (
            <button
              onClick={() => handleOpenAdd("individuel")}
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
              }}
            >
              <Plus size={15} /> Ajouter
            </button>
          )}
        </div>
      </div>

      {/* Stats en scroll horizontal */}
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

      {/* Barre outils */}
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
              }}
            />
            <input
              type="text"
              placeholder="Rechercher un élève…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
            }}
          >
            <SlidersHorizontal size={16} />
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
            />
            <input
              type="text"
              placeholder="Rechercher un élève…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
            value={classeActive}
            onChange={(e) => setClasseActive(e.target.value)}
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              border: `1px solid ${cardBorder}`,
              background: cardBg,
              color: textPrimary,
              fontSize: 14,
              cursor: "pointer",
              minWidth: 180,
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
            <option value="tous">Tous les statuts</option>
            <option value="paye">Payé</option>
            <option value="en_attente">En attente</option>
          </select>
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
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "4px 10px",
                background: dark ? "#312E81" : "#EEF2FF",
                color: dark ? "#C7D2FE" : "#4F46E5",
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              « {searchTerm} »
              <X
                size={12}
                style={{ cursor: "pointer" }}
                onClick={() => setSearchTerm("")}
              />
            </span>
          )}
          {classeActive && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "4px 10px",
                background: dark ? "#312E81" : "#EEF2FF",
                color: dark ? "#C7D2FE" : "#4F46E5",
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              {classeActive}
              <X
                size={12}
                style={{ cursor: "pointer" }}
                onClick={() => setClasseActive("")}
              />
            </span>
          )}
          {statutFiltre !== "tous" && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "4px 10px",
                background: dark ? "#312E81" : "#EEF2FF",
                color: dark ? "#C7D2FE" : "#4F46E5",
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              {statutFiltre === "paye" ? "Payé" : "En attente"}
              <X
                size={12}
                style={{ cursor: "pointer" }}
                onClick={() => setStatutFiltre("tous")}
              />
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

      {/* Liste */}
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
          }}
        >
          <DollarSign
            size={isMobile ? 28 : 32}
            style={{ marginBottom: 8, opacity: 0.5 }}
          />
          <p style={{ margin: 0, fontSize: 13.5 }}>
            {activeFiltersCount > 0
              ? "Aucun frais ne correspond aux filtres."
              : "Aucun frais enregistré."}
          </p>
          {activeFiltersCount > 0 && (
            <button
              onClick={resetFilters}
              style={{
                marginTop: 12,
                padding: "8px 16px",
                borderRadius: 8,
                border: `1px solid ${cardBorder}`,
                background: "transparent",
                color: textPrimary,
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>
      ) : isMobile ? (
        // Liste de cartes sur mobile
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
        // DataTable sur desktop
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
              render: (f) => f.montantTotal.toLocaleString(),
            },
            {
              header: `Payé (${deviseSymbol})`,
              accessor: "montantPaye",
              sortable: true,
              render: (f) => f.montantPaye.toLocaleString(),
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
                    onClick={() => handleOpenAdd("individuel", f)}
                    style={{
                      background: accent,
                      color: "white",
                      border: "none",
                      borderRadius: 6,
                      padding: "6px 10px",
                      cursor: "pointer",
                    }}
                    title="Modifier"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(f)}
                    style={{
                      background: "#EF4444",
                      color: "white",
                      border: "none",
                      borderRadius: 6,
                      padding: "6px 10px",
                      cursor: "pointer",
                    }}
                    title="Supprimer"
                  >
                    <Trash2 size={14} />
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

      {/* Bouton export desktop */}
      {!isMobile && enrichedFrais.length > 0 && (
        <div style={{ marginTop: 16, textAlign: "right" }}>
          <button
            onClick={handleExportExcel}
            disabled={exporting}
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
            }}
          >
            {exporting ? (
              <Loader size={16} className="gf-animate-spin" />
            ) : (
              <Download size={16} />
            )}
            {exporting ? "Export…" : "Exporter en Excel"}
          </button>
        </div>
      )}

      {/* FAB ajouter (mobile) */}
      {isMobile && (
        <button
          onClick={() => handleOpenAdd("individuel")}
          style={{
            position: "fixed",
            bottom: 24,
            right: 20,
            width: 56,
            height: 56,
            borderRadius: 28,
            background: accent,
            color: "#FFFFFF",
            border: "none",
            boxShadow: "0 6px 20px rgba(79,70,229,0.4)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 900,
            transition: "transform 0.15s ease",
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.94)")}
          onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          title="Ajouter des frais"
        >
          <Plus size={26} />
        </button>
      )}

      {/* Input file caché */}
      <input
        type="file"
        accept=".xlsx, .xls"
        onChange={handleImportFraisExcel}
        style={{ display: "none" }}
        ref={fraisFileInputRef}
      />

      {/* Bottom sheet filtres */}
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

      {/* Modale ajout */}
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

      {/* Modale détail */}
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

      {/* Modale config frais par classe */}
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
  );
}

// ============================================================
// BADGE STATUT (desktop DataTable)
// ============================================================
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
      }}
    >
      {estPaye ? <CheckCircle size={12} /> : <Clock size={12} />}
      {estPaye ? "Payé" : "En attente"}
    </span>
  );
}