import { useState, useRef, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useConfirm } from "@/hooks/useConfirm";
import { ConfirmDialog } from "./ConfirmDialog";
import {
  BarChart3, Trash2, Search, ChevronRight,
  ClipboardList, Plus, SlidersHorizontal, X,
  BookOpen,
} from "lucide-react";
import toast from "react-hot-toast";
import { trierEleves } from "@/utils/tri";
import {
  AddNoteModal,
  DetailNoteModal,
  NotesFiltersSheet,
} from "./NotesModals";

// ============================================================
// LAZY-LOAD XLSX
// ============================================================
let _xlsxPromise = null;
function loadXLSX() {
  if (!_xlsxPromise) _xlsxPromise = import("xlsx");
  return _xlsxPromise;
}

// ============================================================
// HELPER ERREUR
// ============================================================
function extractErrMsg(err, fallback = "Erreur inconnue") {
  if (!err) return fallback;
  if (typeof err === "string") return err;
  if (typeof err === "object" && err.message) return err.message;
  return fallback;
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
        boxShadow: dark
          ? "0 1px 2px rgba(0,0,0,0.25)"
          : "0 1px 2px rgba(0,0,0,0.04)",
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
            fontSize: 18,
            fontWeight: 700,
            lineHeight: 1.1,
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// CARTE NOTE COMPACTE
// ============================================================
function NoteCard({ note, eleve, bareme, dark, isMobile, onClick }) {
  const pourcentage = bareme > 0 ? (note.note / bareme) * 100 : 0;
  const noteColor =
    pourcentage >= 70 ? "#10B981" : pourcentage >= 50 ? "#F59E0B" : "#EF4444";

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
        boxShadow: dark
          ? "0 1px 2px rgba(0,0,0,0.25)"
          : "0 1px 2px rgba(0,0,0,0.04)",
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

      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontWeight: 600,
            fontSize: isMobile ? 13.5 : 14,
            color: dark ? "#F1F5F9" : "#1E293B",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {eleve?.nom} {eleve?.postnom}{" "}
          <span style={{ fontWeight: 500, color: dark ? "#94A3B8" : "#64748B" }}>
            · {note.matiere}
          </span>
        </div>
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
          {note.periode}
          {note.coefficient ? ` · Coeff. ${note.coefficient}` : ""}
          {note.categorie ? ` · ${note.categorie}` : ""}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            fontSize: isMobile ? 16 : 18,
            fontWeight: 700,
            color: noteColor,
            whiteSpace: "nowrap",
          }}
        >
          {note.note}
          <span
            style={{
              fontSize: isMobile ? 11 : 12,
              fontWeight: 500,
              color: dark ? "#94A3B8" : "#64748B",
              marginLeft: 2,
            }}
          >
            /{bareme}
          </span>
        </div>
        <ChevronRight
          size={16}
          color={dark ? "#475569" : "#CBD5E1"}
          style={{ flexShrink: 0 }}
        />
      </div>
    </div>
  );
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================
export function GestionNotes({
  ecoleId,
  eleves,
  matiereFixe,
  classeFixe,
  anneeId,
  anneeActive,
  user,
  coursDisponibles,
}) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();
  const { confirm, dialogProps } = useConfirm();

  const userId = user?._id;

  // États principaux
  const [searchTerm, setSearchTerm] = useState("");
  const [categorieFilter, setCategorieFilter] = useState("toutes");
  const [sortKey, setSortKey] = useState("eleve");
  const [sortDir, setSortDir] = useState("asc");
  const [showFilters, setShowFilters] = useState(false);

  // Modales
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalInitialMode, setAddModalInitialMode] = useState("individuel");
  const [editingNote, setEditingNote] = useState(null);
  const [detailNote, setDetailNote] = useState(null);

  // Styles
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const inputBg = dark ? "#0F172A" : "#F9FAFB";
  const inputText = dark ? "#F1F5F9" : "#1E293B";
  const accent = dark ? "#818CF8" : "#4F46E5";

  const resultatsFileInputRef = useRef(null);

  // ==================== MAPS MÉMOÏSÉS ====================
  const elevesById = useMemo(
    () => new Map((eleves ?? []).map((e) => [e._id, e])),
    [eleves]
  );

  const coursByNom = useMemo(
    () => new Map((coursDisponibles ?? []).map((c) => [c.nom, c])),
    [coursDisponibles]
  );

  // ==================== QUERIES (userId requis) ====================
  const notesRaw = useQuery(
    api.notes.listByEcole,
    anneeId && ecoleId && userId
      ? { ecoleId, anneeId, userId }
      : "skip"
  );

  const upsertNote = useMutation(api.notes.upsert);
  const upsertBulk = useMutation(api.notes.upsertBulk);
  const removeNote = useMutation(api.notes.remove);

  const notesList = useMemo(() => notesRaw ?? [], [notesRaw]);

  const matieresUtilisees = useMemo(
    () => [...new Set(notesList.map((n) => n.matiere))].sort(),
    [notesList]
  );

  // ==================== CALCULS ====================
  const notesEnrichies = useMemo(() => {
    // 1) Enrichir avec élève + bareme
    const enriched = notesList.map((n) => {
      const eleve = elevesById.get(n.eleveId);
      const cours = coursByNom.get(n.matiere);
      return {
        ...n,
        _eleve: eleve ?? null,
        eleveNom: eleve?.nom || "—",
        elevePostnom: eleve?.postnom || "",
        elevePrenom: eleve?.prenom || "",
        eleveClasse: eleve?.classe || "—",
        bareme: cours?.bareme ?? 20,
      };
    });
    // 2) Trier par élève
    return enriched.sort((a, b) => {
      const eleveA = a._eleve;
      const eleveB = b._eleve;
      if (!eleveA || !eleveB) return 0;
      return trierEleves(eleveA, eleveB);
    });
  }, [notesList, elevesById, coursByNom]);

  const notesFiltrees = useMemo(() => {
    let result = notesEnrichies;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (n) =>
          n.eleveNom?.toLowerCase().includes(q) ||
          n.elevePostnom?.toLowerCase().includes(q) ||
          n.elevePrenom?.toLowerCase().includes(q) ||
          n.eleveClasse?.toLowerCase().includes(q) ||
          n.matiere?.toLowerCase().includes(q) ||
          n.periode?.toLowerCase().includes(q) ||
          n.appreciation?.toLowerCase().includes(q)
      );
    }
    if (categorieFilter !== "toutes") {
      result = result.filter((n) => n.categorie === categorieFilter);
    }
    result = [...result].sort((a, b) => {
      let valA, valB;
      switch (sortKey) {
        case "eleve":
          valA = `${a.eleveNom} ${a.elevePostnom}`.toLowerCase();
          valB = `${b.eleveNom} ${b.elevePostnom}`.toLowerCase();
          break;
        case "note":
          valA = a.note;
          valB = b.note;
          break;
        case "matiere":
          valA = a.matiere.toLowerCase();
          valB = b.matiere.toLowerCase();
          break;
        case "periode":
          valA = a.periode.toLowerCase();
          valB = b.periode.toLowerCase();
          break;
        default:
          valA = a.note;
          valB = b.note;
      }
      if (sortDir === "asc") return valA < valB ? -1 : valA > valB ? 1 : 0;
      return valA > valB ? -1 : valA < valB ? 1 : 0;
    });
    return result;
  }, [notesEnrichies, searchTerm, categorieFilter, sortKey, sortDir]);

  const stats = useMemo(() => {
    const total = notesFiltrees.length;
    const moyenne =
      total > 0
        ? (
            notesFiltrees.reduce((sum, n) => sum + n.note, 0) / total
          ).toFixed(2)
        : "0";
    const parCategorie = {};
    notesFiltrees.forEach((n) => {
      const cat = n.categorie || "autre";
      parCategorie[cat] = (parCategorie[cat] || 0) + 1;
    });
    return { total, moyenne, parCategorie };
  }, [notesFiltrees]);

  const activeFiltersCount = useMemo(() => {
    let n = 0;
    if (searchTerm.trim()) n++;
    if (categorieFilter !== "toutes") n++;
    if (sortKey !== "eleve" || sortDir !== "asc") n++;
    return n;
  }, [searchTerm, categorieFilter, sortKey, sortDir]);

  // ==================== HANDLERS ====================
  const resetFilters = () => {
    setSearchTerm("");
    setCategorieFilter("toutes");
    setSortKey("eleve");
    setSortDir("asc");
  };

  // ==================== IMPORT EXCEL ====================
  const handleImportResultatsExcel = useCallback(
    async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!userId) {
        toast.error("Session invalide.");
        if (resultatsFileInputRef.current) resultatsFileInputRef.current.value = "";
        return;
      }

      try {
        const XLSX = await loadXLSX();
        const data = new Uint8Array(await file.arrayBuffer());
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

        if (rows.length < 2) {
          toast.error("Fichier vide.");
          return;
        }

        const headers = rows[0].map((h) => h.toString().toLowerCase().trim());
        const nomIdx = headers.indexOf("nom");
        const postnomIdx = headers.indexOf("postnom");
        const classeIdx = headers.indexOf("classe");
        const periodeIdx = headers.indexOf("periode");
        const notesIdx = headers.indexOf("notes");
        const appIdx = headers.indexOf("appreciation");

        if (
          nomIdx === -1 ||
          postnomIdx === -1 ||
          classeIdx === -1 ||
          periodeIdx === -1 ||
          notesIdx === -1
        ) {
          toast.error(
            "Colonnes requises : nom, postnom, classe, periode, notes"
          );
          return;
        }

        // ✅ Index élèves par (nom|postnom|classe) pour recherche O(1)
        const eleveKey = (nom, postnom, classe) =>
          `${nom}|${postnom}|${classe}`.toLowerCase();
        const elevesIndex = new Map(
          (eleves ?? []).map((e) => [
            eleveKey(e.nom, e.postnom, e.classe),
            e,
          ])
        );

        let count = 0;
        let skipped = 0;
        let errors = 0;

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (
            !row[nomIdx] ||
            !row[postnomIdx] ||
            !row[classeIdx] ||
            !row[periodeIdx] ||
            row[notesIdx] == null
          ) {
            skipped++;
            continue;
          }

          const nom = row[nomIdx].toString().trim();
          const postnom = row[postnomIdx].toString().trim();
          const classe = row[classeIdx].toString().trim();
          const eleve = elevesIndex.get(eleveKey(nom, postnom, classe));
          if (!eleve) {
            skipped++;
            continue;
          }

          const noteValue = parseFloat(row[notesIdx]);
          if (isNaN(noteValue)) {
            errors++;
            continue;
          }

          try {
            await upsertNote({
              eleveId: eleve._id,
              ecoleId,
              matiere: matiereFixe || "Non spécifié",
              note: noteValue,
              coefficient: 1,
              periode: row[periodeIdx].toString().trim(),
              appreciation:
                appIdx !== -1
                  ? row[appIdx]?.toString().trim() || undefined
                  : undefined,
              anneeId,
              userId,
              categorie: "devoir",
            });
            count++;
          } catch {
            errors++;
          }
        }

        const parts = [`${count} importé${count > 1 ? "s" : ""}`];
        if (skipped) parts.push(`${skipped} ignoré${skipped > 1 ? "s" : ""}`);
        if (errors) parts.push(`${errors} échec${errors > 1 ? "s" : ""}`);
        if (count > 0) toast.success(parts.join(" · "));
        else toast.error(parts.join(" · "));
      } catch (err) {
        toast.error(
          "Erreur lors de la lecture : " + extractErrMsg(err, "fichier invalide")
        );
      } finally {
        if (resultatsFileInputRef.current) {
          resultatsFileInputRef.current.value = "";
        }
      }
    },
    [userId, eleves, ecoleId, matiereFixe, anneeId, upsertNote]
  );

  const handleOpenAdd = (mode = "individuel", initialData = null) => {
    setAddModalInitialMode(mode);
    setEditingNote(initialData);
    setShowAddModal(true);
  };

  const handleCloseAdd = () => {
    setShowAddModal(false);
    setEditingNote(null);
  };

  const handleDeleteNote = useCallback(
    async (note) => {
      if (!userId) {
        toast.error("Session invalide.");
        return;
      }
      const ok = await confirm(
        "Supprimer la note",
        "Voulez-vous vraiment supprimer cette note ?"
      );
      if (!ok) return;
      try {
        await removeNote({ id: note._id, userId });
        toast.success("Note supprimée");
        setDetailNote(null);
      } catch (err) {
        toast.error(extractErrMsg(err, "Impossible de supprimer la note"));
      }
    },
    [userId, confirm, removeNote]
  );

  // ==================== RENDU PRÉCOCE : pas d'année ====================
  if (!anneeId) {
    return (
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: isMobile ? "20px 12px" : "32px 24px",
        }}
      >
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
          }}
        >
          <BarChart3 size={44} color="#F59E0B" style={{ marginBottom: 16 }} />
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
          <p style={{ color: textSecondary, fontSize: 13.5, margin: 0 }}>
            Veuillez créer ou activer une année scolaire dans les paramètres.
          </p>
        </div>
      </div>
    );
  }

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
      {/* Keyframes préfixés gn-* (Gestion Notes) */}
      <style>{`
        @keyframes gn-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .gn-spin { animation: gn-spin 1s linear infinite; }
        @media (prefers-reduced-motion: reduce) {
          .gn-spin { animation: none !important; }
        }
      `}</style>

      {/* EN-TÊTE */}
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
            Gestion des notes
          </h2>
          <p
            style={{
              color: textSecondary,
              marginTop: 2,
              marginBottom: 0,
              fontSize: isMobile ? 11.5 : 13,
            }}
          >
            {notesList.length} note{notesList.length > 1 ? "s" : ""}
            {anneeActive ? ` · ${anneeActive.nom}` : ""}
          </p>
        </div>

        {!isMobile && (
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => handleOpenAdd("individuel")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 8,
                background: accent,
                color: "#FFF",
                border: "none",
                fontWeight: 600,
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              <Plus size={15} /> Ajouter une note
            </button>
          </div>
        )}
      </div>

      {/* STATS */}
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
          icon={<ClipboardList size={16} />}
          label="Notes"
          value={stats.total}
          color="#4F46E5"
          dark={dark}
          isMobile={isMobile}
        />
        <StatCard
          icon={<BarChart3 size={16} />}
          label="Moyenne"
          value={stats.moyenne}
          color="#10B981"
          dark={dark}
          isMobile={isMobile}
        />
        <StatCard
          icon={<BookOpen size={16} />}
          label="Devoirs"
          value={stats.parCategorie["devoir"] || 0}
          color="#F59E0B"
          dark={dark}
          isMobile={isMobile}
        />
        <StatCard
          icon={<BookOpen size={16} />}
          label="Examens"
          value={stats.parCategorie["examen"] || 0}
          color="#EF4444"
          dark={dark}
          isMobile={isMobile}
        />
        <StatCard
          icon={<BookOpen size={16} />}
          label="Interro."
          value={stats.parCategorie["interrogation"] || 0}
          color="#8B5CF6"
          dark={dark}
          isMobile={isMobile}
        />
        <StatCard
          icon={<BookOpen size={16} />}
          label="Exercices"
          value={stats.parCategorie["exercice"] || 0}
          color="#0EA5E9"
          dark={dark}
          isMobile={isMobile}
        />
      </div>

      {/* BARRE OUTILS */}
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
              placeholder="Rechercher…"
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
              placeholder="Rechercher un élève, une matière, une période…"
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
            value={categorieFilter}
            onChange={(e) => setCategorieFilter(e.target.value)}
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
            <option value="toutes">Toutes catégories</option>
            <option value="devoir">Devoir</option>
            <option value="examen">Examen</option>
            <option value="interrogation">Interrogation</option>
            <option value="exercice">Exercice</option>
          </select>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[
              { key: "eleve", label: "Élève" },
              { key: "note", label: "Note" },
              { key: "matiere", label: "Matière" },
              { key: "periode", label: "Période" },
            ].map((btn) => (
              <button
                key={btn.key}
                onClick={() => {
                  if (sortKey === btn.key) {
                    setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
                  } else {
                    setSortKey(btn.key);
                    setSortDir("asc");
                  }
                }}
                style={{
                  padding: "8px 12px",
                  border: `1px solid ${
                    sortKey === btn.key ? accent : cardBorder
                  }`,
                  borderRadius: 8,
                  background:
                    sortKey === btn.key
                      ? dark
                        ? "#312E81"
                        : "#EEF2FF"
                      : "transparent",
                  color:
                    sortKey === btn.key
                      ? dark
                        ? "#C7D2FE"
                        : "#4F46E5"
                      : textPrimary,
                  cursor: "pointer",
                  fontSize: 13,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontWeight: sortKey === btn.key ? 600 : 500,
                }}
              >
                {btn.label}
                {sortKey === btn.key && (sortDir === "asc" ? " ↑" : " ↓")}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* PUCES FILTRES ACTIFS */}
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
          {categorieFilter !== "toutes" && (
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
              {categorieFilter}
              <X
                size={12}
                style={{ cursor: "pointer" }}
                onClick={() => setCategorieFilter("toutes")}
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

      {/* LISTE */}
      {notesRaw === undefined ? (
        <div
          style={{
            padding: 40,
            textAlign: "center",
            color: textSecondary,
          }}
        >
          Chargement…
        </div>
      ) : notesFiltrees.length === 0 ? (
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
          <BarChart3 size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
          <p style={{ margin: 0, fontSize: 13.5 }}>
            {searchTerm || categorieFilter !== "toutes"
              ? "Aucune note ne correspond aux filtres."
              : "Aucune note enregistrée"}
          </p>
          {(searchTerm || categorieFilter !== "toutes") && (
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
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile
              ? "1fr"
              : "repeat(auto-fill, minmax(320px, 1fr))",
            gap: isMobile ? 8 : 12,
          }}
        >
          {notesFiltrees.map((n) => (
            <NoteCard
              key={n._id}
              note={n}
              eleve={n._eleve}
              bareme={n.bareme}
              dark={dark}
              isMobile={isMobile}
              onClick={() => setDetailNote(n)}
            />
          ))}
        </div>
      )}

      {/* FAB AJOUTER */}
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
          title="Ajouter une note"
        >
          <Plus size={26} />
        </button>
      )}

      {/* BOTTOM SHEET FILTRES */}
      <NotesFiltersSheet
        open={showFilters}
        onClose={() => setShowFilters(false)}
        dark={dark}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        categorieFilter={categorieFilter}
        setCategorieFilter={setCategorieFilter}
        sortKey={sortKey}
        setSortKey={setSortKey}
        sortDir={sortDir}
        setSortDir={setSortDir}
        onReset={resetFilters}
        activeFiltersCount={activeFiltersCount}
        onImportClick={() => resultatsFileInputRef.current?.click()}
      />

      {/* Input file caché */}
      <input
        type="file"
        accept=".xlsx, .xls"
        ref={resultatsFileInputRef}
        style={{ display: "none" }}
        onChange={handleImportResultatsExcel}
      />

      {/* MODALE AJOUT / ÉDITION */}
      <AddNoteModal
        open={showAddModal}
        onClose={handleCloseAdd}
        initialMode={addModalInitialMode}
        initialData={editingNote}
        eleves={eleves}
        matiereFixe={matiereFixe}
        matieresUtilisees={matieresUtilisees}
        upsertNote={upsertNote}
        upsertBulk={upsertBulk}
        ecoleId={ecoleId}
        anneeId={anneeId}
        userId={userId}
        coursDisponibles={coursDisponibles}
        dark={dark}
        isMobile={isMobile}
      />

      {/* MODALE DÉTAIL */}
      {detailNote && (
        <DetailNoteModal
          note={detailNote}
          eleve={elevesById.get(detailNote.eleveId)}
          bareme={detailNote.bareme}
          onClose={() => setDetailNote(null)}
          onEdit={() => {
            setDetailNote(null);
            handleOpenAdd("individuel", detailNote);
          }}
          onDelete={() => handleDeleteNote(detailNote)}
          dark={dark}
          isMobile={isMobile}
        />
      )}

      <ConfirmDialog {...dialogProps} />
    </div>
  );
}