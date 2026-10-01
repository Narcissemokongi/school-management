// src/components/GestionNotes.jsx
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
  BookOpen, Loader,
} from "lucide-react";
import toast from "react-hot-toast";
import { trierEleves } from "@/utils/tri";
import {
  AddNoteModal,
  DetailNoteModal,
  NotesFiltersSheet,
} from "./NotesModals";
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
const GestionNotesKeyframes = (
  <style>{`
    @keyframes gn-spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
    .gn-spin { animation: gn-spin 1s linear infinite; }
    @media (prefers-reduced-motion: reduce) {
      .gn-spin { animation: none !important; }
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
// HELPER ERREUR
// ════════════════════════════════════════════════════════════════════
function extractErrMsg(err, fallback = "Erreur inconnue") {
  if (!err) return fallback;
  if (typeof err === "string") return err;
  if (typeof err === "object" && err.message) return err.message;
  return fallback;
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
        boxShadow: dark
          ? "0 1px 2px rgba(0,0,0,0.25)"
          : "0 1px 2px rgba(0,0,0,0.04)",
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
            fontSize: isMobile ? 16 : 18,
            fontWeight: 700,
            lineHeight: 1.1,
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
// CARTE NOTE — ✨ refactorée avec state React
// ════════════════════════════════════════════════════════════════════
function NoteCard({ note, eleve, bareme, dark, isMobile, onClick }) {
  const [pressed, setPressed] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);

  const pourcentage = bareme > 0 ? (note.note / bareme) * 100 : 0;
  const noteColor =
    pourcentage >= 70 ? "#10B981" : pourcentage >= 50 ? "#F59E0B" : "#EF4444";

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
        boxShadow: dark
          ? "0 1px 2px rgba(0,0,0,0.25)"
          : "0 1px 2px rgba(0,0,0,0.04)",
        border: `1px solid ${
          focused
            ? dark
              ? "#818CF8"
              : "#4F46E5"
            : dark
            ? "#334155"
            : "#E2E8F0"
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
        outline: focused
          ? `2px solid ${dark ? "#818CF8" : "#4F46E5"}`
          : "none",
        outlineOffset: -2,
      }}
      aria-label={`Note de ${eleve?.nom || "élève"} en ${note.matiere} : ${note.note}/${bareme}`}
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
        aria-hidden="true"
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
          <span
            style={{ fontWeight: 500, color: dark ? "#94A3B8" : "#64748B" }}
          >
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
            fontVariantNumeric: "tabular-nums",
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
          aria-hidden="true"
        />
      </div>
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

  // ✨ Feedback tap + focus
  const [pressedBtn, setPressedBtn] = useState(null);
  const [focusedSearch, setFocusedSearch] = useState(false);

  const pressBtn = useCallback((id) => () => setPressedBtn(id), []);
  const releaseBtn = useCallback(() => setPressedBtn(null), []);

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

  // Maps mémoïsés
  const elevesById = useMemo(
    () => new Map((eleves ?? []).map((e) => [e._id, e])),
    [eleves]
  );

  const coursByNom = useMemo(
    () => new Map((coursDisponibles ?? []).map((c) => [c.nom, c])),
    [coursDisponibles]
  );

  // Queries
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

  // Calculs
  const notesEnrichies = useMemo(() => {
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

  // Handlers
  const resetFilters = () => {
    setSearchTerm("");
    setCategorieFilter("toutes");
    setSortKey("eleve");
    setSortDir("asc");
  };

  // Import Excel
  const handleImportResultatsExcel = useCallback(
    async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!userId) {
        toast.error("Session invalide.");
        if (resultatsFileInputRef.current)
          resultatsFileInputRef.current.value = "";
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
          "Erreur lors de la lecture : " +
            extractErrMsg(err, "fichier invalide")
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
        {GestionNotesKeyframes}
        <div
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            padding: containerPadding,
            boxSizing: "border-box",
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
              boxSizing: "border-box",
            }}
          >
            <BarChart3
              size={44}
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
            <p style={{ color: textSecondary, fontSize: 13.5, margin: 0 }}>
              Veuillez créer ou activer une année scolaire dans les paramètres.
            </p>
          </div>
        </div>
      </>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // RENDU PRINCIPAL
  // ════════════════════════════════════════════════════════════════
  return (
    <>
      {GestionNotesKeyframes}
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
                  borderRadius: 8,
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
                <Plus size={15} aria-hidden="true" /> Ajouter une note
              </button>
            </div>
          )}
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
                placeholder="Rechercher…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setFocusedSearch(true)}
                onBlur={() => setFocusedSearch(false)}
                inputMode="search"
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
                aria-label="Rechercher une note"
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
                placeholder="Rechercher un élève, une matière, une période…"
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
              value={categorieFilter}
              onChange={(e) => setCategorieFilter(e.target.value)}
              aria-label="Filtrer par catégorie"
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
                  type="button"
                  onClick={() => {
                    if (sortKey === btn.key) {
                      setSortDir((prev) =>
                        prev === "asc" ? "desc" : "asc"
                      );
                    } else {
                      setSortKey(btn.key);
                      setSortDir("asc");
                    }
                  }}
                  onTouchStart={pressBtn(`sort-${btn.key}`)}
                  onTouchEnd={releaseBtn}
                  onTouchCancel={releaseBtn}
                  aria-pressed={sortKey === btn.key}
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
                    transform:
                      pressedBtn === `sort-${btn.key}`
                        ? "scale(0.96)"
                        : "scale(1)",
                    transition: "transform 0.1s ease, background 0.12s ease",
                    WebkitTapHighlightColor: "transparent",
                    touchAction: "manipulation",
                    fontFamily: "inherit",
                  }}
                >
                  {btn.label}
                  {sortKey === btn.key && (sortDir === "asc" ? " ↑" : " ↓")}
                </button>
              ))}
            </div>
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
            {categorieFilter !== "toutes" && (
              <FilterChip
                label={categorieFilter}
                onClear={() => setCategorieFilter("toutes")}
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
        {notesRaw === undefined ? (
          <div
            role="status"
            aria-live="polite"
            aria-busy="true"
            style={{
              padding: 40,
              textAlign: "center",
              color: textSecondary,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
            }}
          >
            <Loader
              size={28}
              className="gn-spin"
              style={{ color: accent }}
              aria-hidden="true"
            />
            <span>Chargement…</span>
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
              boxSizing: "border-box",
            }}
          >
            <BarChart3
              size={32}
              style={{ marginBottom: 8, opacity: 0.5 }}
              aria-hidden="true"
            />
            <p style={{ margin: 0, fontSize: 13.5 }}>
              {searchTerm || categorieFilter !== "toutes"
                ? "Aucune note ne correspond aux filtres."
                : "Aucune note enregistrée"}
            </p>
            {(searchTerm || categorieFilter !== "toutes") && (
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

        {/* ═══ FAB AJOUTER — ✨ design system ═══ */}
        {isMobile && (
          <Fab
            icon={<Plus size={24} />}
            onClick={() => handleOpenAdd("individuel")}
            label="Ajouter une note"
            bottom={24}
          />
        )}

        {/* ═══ BOTTOM SHEET FILTRES ═══ */}
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

        {/* ═══ INPUT FILE CACHÉ ═══ */}
        <input
          type="file"
          accept=".xlsx, .xls"
          ref={resultatsFileInputRef}
          style={{ display: "none" }}
          onChange={handleImportResultatsExcel}
          aria-hidden="true"
        />

        {/* ═══ MODALES ═══ */}
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
    </>
  );
}