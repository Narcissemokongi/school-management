// src/components/GestionClassesAdmin.jsx
import {
  useState, useMemo, useEffect, useRef, useCallback, useId,
} from "react";
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
  SlidersHorizontal, RotateCcw,
} from "lucide-react";
import toast from "react-hot-toast";

// ════════════════════════════════════════════════════════════════════
// CONSTANTES MODULE-LEVEL
// ════════════════════════════════════════════════════════════════════
const TAP_BASE = {
  touchAction: "manipulation",
  WebkitTapHighlightColor: "transparent",
  minHeight: 44,
};

const SCROLL_AREA = {
  overscrollBehavior: "contain",
  WebkitOverflowScrolling: "touch",
};

const SAFE_BOTTOM = {
  paddingBottom: "calc(24px + env(safe-area-inset-bottom, 0px))",
};

const FOCUS_RING = (color) => ({
  outline: `2px solid ${color}`,
  outlineOffset: 2,
});

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

// ════════════════════════════════════════════════════════════════════
// KEYFRAMES MODULE-LEVEL
// ════════════════════════════════════════════════════════════════════
const GcaKeyframes = (
  <style>{`
    @keyframes gca-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    @keyframes gca-fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes gca-slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
    @keyframes gca-slide-up-bar { from { transform: translateY(100%); } to { transform: translateY(0); } }
    .gca-spin { animation: gca-spin 1s linear infinite; }
    .gca-fade-in { animation: gca-fade-in 0.3s ease-out; }
    .gca-slide-up { animation: gca-slide-up 0.25s cubic-bezier(0.22, 1, 0.36, 1); }
    .gca-slide-up-bar { animation: gca-slide-up-bar 0.2s ease-out; }
    @media (prefers-reduced-motion: reduce) {
      .gca-spin, .gca-fade-in, .gca-slide-up, .gca-slide-up-bar {
        animation: none !important;
      }
    }
  `}</style>
);

// ════════════════════════════════════════════════════════════════════
// HELPER batch (rate-limit Convex)
// ════════════════════════════════════════════════════════════════════
const runInBatches = async (items, fn, size = 5) => {
  for (let i = 0; i < items.length; i += size) {
    await Promise.all(items.slice(i, i + size).map(fn));
  }
};

// ════════════════════════════════════════════════════════════════════
// HOOK — Focus trap
// ════════════════════════════════════════════════════════════════════
function useFocusTrap(panelRef, isOpen) {
  useEffect(() => {
    if (!isOpen) return;
    const panel = panelRef.current;
    if (!panel) return;
    const handleTab = (e) => {
      if (e.key !== "Tab") return;
      const focusables = panel.querySelectorAll(FOCUSABLE_SELECTOR);
      if (focusables.length === 0) { e.preventDefault(); return; }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    panel.addEventListener("keydown", handleTab);
    return () => panel.removeEventListener("keydown", handleTab);
  }, [panelRef, isOpen]);
}

// ════════════════════════════════════════════════════════════════════
// PRESSABLE — feedback tap + focus ring
// ════════════════════════════════════════════════════════════════════
function Pressable({
  onClick, style, children, disabled = false, type = "button",
  focusColor, ariaLabel, ariaBusy, ariaPressed, ...rest
}) {
  const [pressed, setPressed] = useState(false);
  const [focused, setFocused] = useState(false);
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-busy={ariaBusy}
      aria-pressed={ariaPressed}
      onPointerDown={() => !disabled && setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        ...TAP_BASE,
        transform: pressed && !disabled ? "scale(0.97)" : "scale(1)",
        transition: "transform 0.12s ease, background-color 0.2s, border-color 0.2s, color 0.2s",
        ...(focused && !disabled && focusColor ? FOCUS_RING(focusColor) : null),
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════
// CARTE STATISTIQUE COMPACTE
// ════════════════════════════════════════════════════════════════════
function StatCard({ icon, label, value, color, dark, isMobile }) {
  const bg = dark ? "#1E293B" : "#FFFFFF";
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const border = dark ? "#334155" : "#E2E8F0";

  return (
    <article
      aria-label={`${label} : ${value}`}
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
        minHeight: 44,
      }}
    >
      <div
        aria-hidden="true"
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
        <div style={{ color: textPrimary, fontSize: 18, fontWeight: 700, lineHeight: 1.1, fontVariantNumeric: "tabular-nums" }}>
          {value}
        </div>
      </div>
    </article>
  );
}

// ════════════════════════════════════════════════════════════════════
// BOTTOM SHEET FILTRES / TRI
// ════════════════════════════════════════════════════════════════════
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
  const titleId = useId();
  const panelRef = useRef(null);
  useFocusTrap(panelRef, open);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const inputBg = dark ? "#0F172A" : "#F8FAFC";
  const accent = dark ? "#818CF8" : "#4F46E5";

  const labelStyle = {
    display: "block", fontSize: 12, fontWeight: 600,
    color: textSecondary,
    marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.3,
  };

  const fieldStyle = {
    ...TAP_BASE,
    width: "100%", padding: "12px 14px", borderRadius: 10,
    border: `1px solid ${cardBorder}`,
    background: inputBg, color: textPrimary,
    fontSize: 16, outline: "none", boxSizing: "border-box",
    appearance: "none", WebkitAppearance: "none",
    fontFamily: "inherit",
  };

  return (
    <>
      {GcaKeyframes}
      <div
        onClick={onClose}
        className="gca-fade-in"
        aria-hidden="true"
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1100,
        }}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="gca-slide-up"
        tabIndex={-1}
        style={{
          position: "fixed", left: 0, right: 0, bottom: 0,
          background: cardBg,
          borderTopLeftRadius: 20, borderTopRightRadius: 20,
          padding: "12px 16px 0",
          ...SAFE_BOTTOM,
          zIndex: 1101, maxHeight: "85vh", overflowY: "auto",
          boxShadow: "0 -8px 30px rgba(0,0,0,0.25)",
          ...SCROLL_AREA, outline: "none",
        }}
      >
        <div aria-hidden="true" style={{ width: 40, height: 4, borderRadius: 2, background: dark ? "#475569" : "#CBD5E1", margin: "0 auto 16px" }} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h3 id={titleId} style={{ margin: 0, fontSize: 17, fontWeight: 700, color: textPrimary }}>
            Filtrer et trier
          </h3>
          <Pressable onClick={onClose} focusColor={accent} ariaLabel="Fermer" style={{ background: "none", border: "none", color: textSecondary, padding: 8, minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={22} aria-hidden="true" />
          </Pressable>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle} htmlFor="gca-filter-search">Recherche</label>
          <div style={{ position: "relative" }}>
            <Search size={16} aria-hidden="true" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: textSecondary, pointerEvents: "none" }} />
            <input
              id="gca-filter-search"
              type="search"
              inputMode="search"
              enterKeyHint="search"
              autoCorrect="off"
              spellCheck="false"
              placeholder="Nom de classe…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ ...fieldStyle, paddingLeft: 36 }}
            />
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Effectif</label>
          <div role="radiogroup" aria-label="Filtrer par effectif" style={{ display: "flex", gap: 8 }}>
            {[
              { v: "all", l: "Toutes" },
              { v: "non-vide", l: "Avec élèves" },
              { v: "vide", l: "Vides" },
            ].map((opt) => (
              <Pressable
                key={opt.v}
                onClick={() => setFilterEffectif(opt.v)}
                focusColor={accent}
                role="radio"
                ariaChecked={filterEffectif === opt.v}
                style={{
                  flex: 1, padding: "12px 8px", borderRadius: 10,
                  border: `1px solid ${filterEffectif === opt.v ? accent : cardBorder}`,
                  background: filterEffectif === opt.v ? (dark ? "#312E81" : "#EEF2FF") : "transparent",
                  color: filterEffectif === opt.v ? (dark ? "#C7D2FE" : "#4F46E5") : (dark ? "#CBD5E1" : "#475569"),
                  fontWeight: 600, fontSize: 13,
                }}
              >
                {opt.l}
              </Pressable>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle} htmlFor="gca-filter-sort">Trier par</label>
          <div style={{ display: "flex", gap: 8 }}>
            <select id="gca-filter-sort" value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ ...fieldStyle, flex: 1 }}>
              <option value="nom">Nom</option>
              <option value="effectif">Effectif</option>
              <option value="enseignants">Enseignants</option>
            </select>
            <Pressable
              onClick={() => setSortOrder((o) => (o === "asc" ? "desc" : "asc"))}
              focusColor={accent}
              ariaLabel={sortOrder === "asc" ? "Tri croissant" : "Tri décroissant"}
              style={{
                padding: "12px 14px", borderRadius: 10,
                border: `1px solid ${cardBorder}`,
                background: inputBg, color: textPrimary,
                display: "flex", alignItems: "center", gap: 6,
                fontWeight: 600, fontSize: 13,
              }}
            >
              {sortOrder === "asc" ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
              {sortOrder === "asc" ? "A→Z" : "Z→A"}
            </Pressable>
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Actions rapides</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Pressable
              onClick={() => { onShowNonAssignes(); onClose(); }}
              focusColor={accent}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "12px 14px", borderRadius: 10,
                border: `1px solid ${cardBorder}`,
                background: inputBg, color: textPrimary,
                fontWeight: 600, fontSize: 14, textAlign: "left",
              }}
            >
              <UserPlus size={18} aria-hidden="true" />
              Voir les élèves non assignés
              <span aria-hidden="true" style={{ marginLeft: "auto", background: dark ? "#78350F" : "#FEF3C7", color: dark ? "#FCD34D" : "#B45309", borderRadius: 10, padding: "2px 8px", fontSize: 11, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                {elevesNonAssignes}
              </span>
            </Pressable>
            <Pressable
              onClick={() => { onImportClick(); onClose(); }}
              disabled={importingClasses}
              focusColor={accent}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "12px 14px", borderRadius: 10,
                border: `1px solid ${cardBorder}`,
                background: inputBg, color: textPrimary,
                fontWeight: 600, fontSize: 14, textAlign: "left",
                opacity: importingClasses ? 0.6 : 1,
              }}
            >
              {importingClasses ? (
                <Loader size={18} className="gca-spin" role="status" aria-label="Import en cours" />
              ) : (
                <Upload size={18} aria-hidden="true" />
              )}
              Importer depuis Excel
            </Pressable>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <Pressable
            onClick={() => { onReset(); onClose(); }}
            focusColor={accent}
            style={{
              flex: 1, padding: "14px 16px", borderRadius: 12,
              border: `1px solid ${cardBorder}`,
              background: "transparent", color: dark ? "#CBD5E1" : "#475569",
              fontWeight: 600, fontSize: 14,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            <RotateCcw size={16} aria-hidden="true" />
            Réinitialiser
          </Pressable>
          <Pressable
            onClick={onClose}
            focusColor={accent}
            style={{
              flex: 2, padding: "14px 16px", borderRadius: 12, border: "none",
              background: accent, color: "#FFFFFF",
              fontWeight: 700, fontSize: 14,
            }}
          >
            Voir les résultats
          </Pressable>
        </div>
      </div>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════
// MODALE : Ajouter une classe
// ════════════════════════════════════════════════════════════════════
function AddClasseModal({ open, onClose, onAdd, adding, dark, isMobile }) {
  const titleId = useId();
  const panelRef = useRef(null);
  const [nom, setNom] = useState("");
  useFocusTrap(panelRef, open);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === "Escape" && !adding) onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, adding, onClose]);

  if (!open) return null;

  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const inputBg = dark ? "#0F172A" : "#F8FAFC";
  const accent = dark ? "#818CF8" : "#4F46E5";

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = nom.trim();
    if (!trimmed) return;
    await onAdd(trimmed);
    setNom("");
  };

  return (
    <>
      {GcaKeyframes}
      <div
        onClick={onClose}
        className="gca-fade-in"
        aria-hidden="true"
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: isMobile ? "flex-end" : "center",
          justifyContent: "center", zIndex: 1000, padding: isMobile ? 0 : 16,
        }}
      >
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onClick={(e) => e.stopPropagation()}
          tabIndex={-1}
          className="gca-slide-up"
          style={{
            background: cardBg,
            borderRadius: isMobile ? "20px 20px 0 0" : 16,
            padding: isMobile ? "12px 16px 0" : 24,
            ...(isMobile ? SAFE_BOTTOM : null),
            width: "100%", maxWidth: isMobile ? "100%" : 480,
            boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
            border: `1px solid ${cardBorder}`, outline: "none",
          }}
        >
          {isMobile && <div aria-hidden="true" style={{ width: 40, height: 4, borderRadius: 2, background: dark ? "#475569" : "#CBD5E1", margin: "0 auto 14px" }} />}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <h3 id={titleId} style={{ margin: 0, fontSize: isMobile ? 17 : 19, fontWeight: 700, color: textPrimary }}>
              Nouvelle classe
            </h3>
            <Pressable onClick={onClose} disabled={adding} focusColor={accent} ariaLabel="Fermer" style={{ background: "none", border: "none", color: dark ? "#94A3B8" : "#64748B", padding: 8, minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <X size={22} aria-hidden="true" />
            </Pressable>
          </div>

          <form onSubmit={handleSubmit}>
            <label htmlFor="gca-add-nom" style={{ position: "absolute", left: -9999 }}>Nom de la classe</label>
            <input
              id="gca-add-nom"
              type="text"
              placeholder="Nom de la classe (ex : 6ème A)"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              autoFocus
              enterKeyHint="done"
              autoCorrect="off"
              spellCheck="false"
              style={{
                ...TAP_BASE,
                width: "100%",
                padding: isMobile ? "14px 16px" : "12px 14px",
                borderRadius: 12,
                border: `1px solid ${cardBorder}`,
                background: inputBg, color: textPrimary,
                fontSize: 16, outline: "none", boxSizing: "border-box",
                fontFamily: "inherit",
              }}
            />

            <div style={{ display: "flex", gap: 10, marginTop: 18, flexDirection: isMobile ? "column-reverse" : "row" }}>
              <Pressable
                onClick={onClose}
                disabled={adding}
                focusColor={accent}
                style={{
                  flex: 1, padding: "14px 16px", borderRadius: 12,
                  border: `1px solid ${cardBorder}`,
                  background: "transparent", color: dark ? "#CBD5E1" : "#475569",
                  fontWeight: 600, fontSize: 14,
                }}
              >
                Annuler
              </Pressable>
              <Pressable
                type="submit"
                disabled={adding || !nom.trim()}
                focusColor={accent}
                ariaBusy={adding}
                style={{
                  flex: isMobile ? "none" : 2, padding: "14px 16px", borderRadius: 12, border: "none",
                  background: adding || !nom.trim() ? "#A5B4FC" : accent,
                  color: "#FFFFFF",
                  fontWeight: 700, fontSize: 14,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}
              >
                {adding ? (
                  <Loader size={16} className="gca-spin" role="status" aria-label="Création" />
                ) : (
                  <Plus size={16} aria-hidden="true" />
                )}
                {adding ? "Création…" : "Créer"}
              </Pressable>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ════════════════════════════════════════════════════════════════════
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

  // ══════════════════ CALCULS MÉMOÏSÉS ══════════════════
  const classesAvecEffectif = useMemo(() => {
    return classes.map((c) => ({
      ...c,
      effectif: eleves.filter((e) => e.classe === c.nom).length,
      nbEnseignants: enseignants.filter((u) => u.classe === c.nom).length,
      enseignantPrincipal: enseignants.find((u) => u.classe === c.nom)?.nom ?? null,
    }));
  }, [classes, eleves, enseignants]);

  useEffect(() => {
    if (!selectedClasse) return;
    const updated = classesAvecEffectif.find((c) => c._id === selectedClasse._id);
    if (updated && updated.nom !== selectedClasse.nom) setSelectedClasse(updated);
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
    const moyenne = totalClasses > 0 ? (totalEleves / totalClasses).toFixed(1) : "0";
    const classesVides = classesAvecEffectif.filter((c) => c.effectif === 0).length;
    const totalEnseignants = enseignants.length;
    return { totalClasses, totalEleves, moyenne, classesVides, totalEnseignants };
  }, [classesAvecEffectif, eleves, enseignants]);

  const statsClasse = useMemo(() => {
    if (!selectedClasse) return null;
    const list = elevesDeLaClasse;
    const garcons = list.filter((e) => e.sexe === "M").length;
    const filles = list.filter((e) => e.sexe === "F").length;
    return { total: list.length, garcons, filles, nbEnseignants: selectedClasse.nbEnseignants };
  }, [selectedClasse, elevesDeLaClasse]);

  const filteredAndSorted = useMemo(() => {
    let result = [...classesAvecEffectif];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((c) => c.nom.toLowerCase().includes(q));
    }
    if (filterEffectif === "vide") result = result.filter((c) => c.effectif === 0);
    else if (filterEffectif === "non-vide") result = result.filter((c) => c.effectif > 0);
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

  // ══════════════════ HANDLERS ══════════════════
  const resetFilters = useCallback(() => {
    setSearchQuery(""); setFilterEffectif("all"); setSortBy("nom"); setSortOrder("asc");
  }, []);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredAndSorted.length) setSelectedIds([]);
    else setSelectedIds(filteredAndSorted.map((c) => c._id));
  };

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const avecEleves = selectedIds.filter((id) => {
      const c = classesAvecEffectif.find((c) => c._id === id);
      return c && c.effectif > 0;
    });
    if (avecEleves.length > 0) {
      toast.error("Certaines classes sélectionnées contiennent encore des élèves.");
      return;
    }
    const ok = await confirm("Supprimer des classes", `Voulez-vous vraiment supprimer ${selectedIds.length} classe(s) ?`);
    if (!ok) return;
    let success = 0, failed = 0;
    await runInBatches(selectedIds, async (id) => {
      try { await removeClasseMutation({ id, userId }); success++; }
      catch (err) { console.error("[GestionClassesAdmin] bulk delete failed for", id, err); failed++; }
    });
    if (success > 0) toast.success(`${success} classe(s) supprimée(s)`);
    if (failed > 0) toast.error(`${failed} échec(s)`);
    setSelectedIds([]);
  };

  const exportExcel = async () => {
    try {
      const XLSX = await import("xlsx");
      const data = filteredAndSorted.map((c) => ({ Classe: c.nom, Effectif: c.effectif, Enseignants: c.nbEnseignants }));
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
        const noms = rows.slice(1).map((row) => row[idxNom]?.toString().trim()).filter(Boolean);
        if (noms.length === 0) return toast.error("Aucun nom de classe trouvé");
        const result = await importClassesMutation({ noms, ecoleId, anneeId: anneeId || undefined, userId });
        toast.success(`${result.inserted} classe(s) importée(s)${result.duplicates.length ? `, ${result.duplicates.length} doublon(s) ignoré(s)` : ""}`);
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

  const handleAdd = async (nomTrimmed) => {
    if (!nomTrimmed) return;
    setAdding(true);
    try {
      await addClasseMutation({ nom: nomTrimmed, ecoleId, userId, anneeId: anneeId || undefined });
      toast.success(`Classe "${nomTrimmed}" créée.`);
      setShowAddModal(false);
    } catch (err) {
      console.error("[GestionClassesAdmin] add failed:", err);
      toast.error("Impossible de créer la classe");
    } finally { setAdding(false); }
  };

  const handleDelete = async (id, nom) => {
    if (eleves.some((e) => e.classe === nom)) {
      toast.error("Impossible, des élèves sont encore affectés à cette classe.");
      return;
    }
    const ok = await confirm("Supprimer la classe", `Voulez-vous vraiment supprimer la classe "${nom}" ?`);
    if (!ok) return;
    setDeleting(id);
    try {
      await removeClasseMutation({ id, userId });
      toast.success(`Classe "${nom}" supprimée.`);
      if (selectedClasse?._id === id) setSelectedClasse(null);
    } catch (err) {
      console.error("[GestionClassesAdmin] delete failed:", err);
      toast.error("Impossible de supprimer la classe");
    } finally { setDeleting(null); }
  };

  const startRename = (classe) => { setEditingClasseId(classe._id); setEditingNom(classe.nom); };
  const cancelRename = () => { setEditingClasseId(null); setEditingNom(""); };

  const saveRename = async (id) => {
    const trimmed = editingNom.trim();
    if (!trimmed || trimmed === classes.find((c) => c._id === id)?.nom) { cancelRename(); return; }
    setSavingRename(true);
    try {
      await renameClasseMutation({ id, nom: trimmed, userId });
      toast.success("Classe renommée.");
      cancelRename();
    } catch (err) {
      console.error("[GestionClassesAdmin] rename failed:", err);
      toast.error("Impossible de renommer la classe");
    } finally { setSavingRename(false); }
  };

  const handleRetirerEleve = async (eleveId) => {
    if (!updateEleveClasse) { toast.error("Fonction de mise à jour non disponible."); return; }
    setUpdatingEleve(eleveId);
    try {
      await updateEleveClasse(eleveId, "");
      toast.success("Élève retiré de la classe.");
    } catch (err) {
      console.error("[GestionClassesAdmin] removeEleve failed:", err);
      toast.error("Impossible de retirer l'élève");
    } finally { setUpdatingEleve(null); }
  };

  const handleAddEleveToClasse = async (e) => {
    e.preventDefault();
    if (!eleveToAdd || !selectedClasse) return;
    if (!updateEleveClasse) { toast.error("Fonction de mise à jour non disponible."); return; }
    setUpdatingEleve(eleveToAdd);
    try {
      await updateEleveClasse(eleveToAdd, selectedClasse.nom);
      toast.success("Élève ajouté à la classe.");
      setEleveToAdd("");
    } catch (err) {
      console.error("[GestionClassesAdmin] addEleve failed:", err);
      toast.error("Impossible d'ajouter l'élève");
    } finally { setUpdatingEleve(null); }
  };

  const handleAssignNonAssigne = async (eleveId, classeNom) => {
    if (!updateEleveClasse) { toast.error("Fonction de mise à jour non disponible."); return; }
    setUpdatingEleve(eleveId);
    try {
      await updateEleveClasse(eleveId, classeNom);
      toast.success("Élève assigné.");
    } catch (err) {
      console.error("[GestionClassesAdmin] assign failed:", err);
      toast.error("Impossible d'assigner l'élève");
    } finally { setUpdatingEleve(null); }
  };

  if (classes === undefined) return <Skeleton height={250} />;

  // ══════════════════ COULEURS ══════════════════
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const inputBg = dark ? "#0F172A" : "#F9FAFB";
  const buttonBg = dark ? "#818CF8" : "#4F46E5";
  const badgeBg = dark ? "#312E81" : "#EEF2FF";
  const badgeText = dark ? "#A5B4FC" : "#4F46E5";
  const dangerText = dark ? "#FCA5A5" : "#B91C1C";
  const accent = dark ? "#818CF8" : "#4F46E5";
  const hoverBg = dark ? "#2D3748" : "#F1F5F9";

  // ══════════════════ TABLEAU DESKTOP ══════════════════
  const renderTable = () => (
    <div style={{ overflowX: "auto", ...SCROLL_AREA }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <caption style={{ position: "absolute", left: -9999, width: 1, height: 1, overflow: "hidden" }}>Liste des classes</caption>
        <thead>
          <tr style={{ borderBottom: `2px solid ${cardBorder}` }}>
            <th scope="col" style={{ padding: "10px 8px", width: 40 }}>
              <Pressable onClick={toggleSelectAll} focusColor={accent} ariaLabel={selectedIds.length === filteredAndSorted.length ? "Tout désélectionner" : "Tout sélectionner"} style={{ background: "none", border: "none", color: textPrimary, padding: 4, minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {selectedIds.length === filteredAndSorted.length && filteredAndSorted.length > 0 ? <CheckSquare size={18} aria-hidden="true" /> : <Square size={18} aria-hidden="true" />}
              </Pressable>
            </th>
            <th scope="col" style={{ padding: "10px 8px", textAlign: "left", cursor: "pointer", color: textSecondary }} onClick={() => { if (sortBy === "nom") setSortOrder((o) => (o === "asc" ? "desc" : "asc")); else { setSortBy("nom"); setSortOrder("asc"); } }}>
              Classe {sortBy === "nom" && (sortOrder === "asc" ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />)}
            </th>
            <th scope="col" style={{ padding: "10px 8px", textAlign: "center", cursor: "pointer", color: textSecondary }} onClick={() => { if (sortBy === "effectif") setSortOrder((o) => (o === "asc" ? "desc" : "asc")); else { setSortBy("effectif"); setSortOrder("asc"); } }}>
              Élèves {sortBy === "effectif" && (sortOrder === "asc" ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />)}
            </th>
            <th scope="col" style={{ padding: "10px 8px", textAlign: "center", cursor: "pointer", color: textSecondary }} onClick={() => { if (sortBy === "enseignants") setSortOrder((o) => (o === "asc" ? "desc" : "asc")); else { setSortBy("enseignants"); setSortOrder("asc"); } }}>
              Ens. {sortBy === "enseignants" && (sortOrder === "asc" ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />)}
            </th>
            <th scope="col" style={{ padding: "10px 8px", textAlign: "center", color: textSecondary }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredAndSorted.map((c) => (
            <tr
              key={c._id}
              style={{
                borderBottom: `1px solid ${cardBorder}`,
                background: selectedIds.includes(c._id) ? (dark ? "#2D3748" : "#F1F5F9") : "transparent",
                cursor: "pointer",
              }}
              onClick={() => { if (selectionMode) toggleSelectOne(c._id); else setSelectedClasse(c); }}
              onMouseEnter={(e) => { if (!selectedIds.includes(c._id)) e.currentTarget.style.background = hoverBg; }}
              onMouseLeave={(e) => { if (!selectedIds.includes(c._id)) e.currentTarget.style.background = "transparent"; }}
            >
              <td style={{ padding: "8px" }} onClick={(e) => e.stopPropagation()}>
                <Pressable onClick={() => toggleSelectOne(c._id)} focusColor={accent} ariaLabel={selectedIds.includes(c._id) ? `Désélectionner ${c.nom}` : `Sélectionner ${c.nom}`} style={{ background: "none", border: "none", color: textPrimary, padding: 4, minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {selectedIds.includes(c._id) ? <CheckSquare size={18} color={accent} aria-hidden="true" /> : <Square size={18} aria-hidden="true" />}
                </Pressable>
              </td>
              <td style={{ padding: "8px", color: textPrimary }} onClick={(e) => e.stopPropagation()}>
                {editingClasseId === c._id ? (
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input value={editingNom} onChange={(e) => setEditingNom(e.target.value)} aria-label={`Renommer la classe ${c.nom}`} enterKeyHint="done" style={{ ...TAP_BASE, padding: "4px 8px", border: `1px solid ${cardBorder}`, borderRadius: 6, background: inputBg, color: textPrimary, fontSize: 16, fontFamily: "inherit", outline: "none" }} />
                    <Pressable onClick={() => saveRename(c._id)} disabled={savingRename} focusColor={accent} ariaLabel="Enregistrer" style={{ background: "none", border: "none", color: "#10B981", padding: 8, minWidth: 36, minHeight: 36, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {savingRename ? <Loader size={14} className="gca-spin" role="status" aria-label="Enregistrement" /> : <Check size={16} aria-hidden="true" />}
                    </Pressable>
                    <Pressable onClick={cancelRename} focusColor={accent} ariaLabel="Annuler" style={{ background: "none", border: "none", color: dangerText, padding: 8, minWidth: 36, minHeight: 36, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <X size={16} aria-hidden="true" />
                    </Pressable>
                  </div>
                ) : (<span style={{ fontWeight: 500 }}>{c.nom}</span>)}
              </td>
              <td style={{ padding: "8px", textAlign: "center" }}>
                <span style={{ background: c.effectif > 0 ? badgeBg : (dark ? "#78350F" : "#FEF3C7"), color: c.effectif > 0 ? badgeText : (dark ? "#FCD34D" : "#B45309"), padding: "2px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                  {c.effectif}
                </span>
              </td>
              <td style={{ padding: "8px", textAlign: "center", color: textSecondary, fontVariantNumeric: "tabular-nums" }}>{c.nbEnseignants}</td>
              <td style={{ padding: "8px", textAlign: "center", whiteSpace: "nowrap" }} onClick={(e) => e.stopPropagation()}>
                <Pressable onClick={() => setSelectedClasse(c)} focusColor={accent} ariaLabel={`Voir la classe ${c.nom}`} style={{ background: "none", border: "none", color: accent, padding: 8, minWidth: 36, minHeight: 36, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                  <Eye size={16} aria-hidden="true" />
                </Pressable>
                <Pressable onClick={() => startRename(c)} focusColor={accent} ariaLabel={`Renommer la classe ${c.nom}`} style={{ background: "none", border: "none", color: "#3B82F6", padding: 8, minWidth: 36, minHeight: 36, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                  <Pencil size={16} aria-hidden="true" />
                </Pressable>
                <Pressable onClick={() => handleDelete(c._id, c.nom)} disabled={deleting === c._id} focusColor={accent} ariaLabel={`Supprimer la classe ${c.nom}`} style={{ background: "none", border: "none", color: "#EF4444", padding: 8, minWidth: 36, minHeight: 36, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                  {deleting === c._id ? <Loader size={16} className="gca-spin" role="status" aria-label="Suppression" /> : <Trash2 size={16} aria-hidden="true" />}
                </Pressable>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // ══════════════════ CARTES ══════════════════
  const renderCards = () => (
    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(320px, 1fr))", gap: isMobile ? 8 : 12, ...SCROLL_AREA }}>
      {filteredAndSorted.map((c) => {
        const isSelected = selectedIds.includes(c._id);
        const isEmpty = c.effectif === 0;
        const handleCardClick = () => { if (selectionMode) toggleSelectOne(c._id); else setSelectedClasse(c); };
        return (
          <ClasseCard key={c._id} classe={c} isSelected={isSelected} isEmpty={isEmpty} dark={dark} isMobile={isMobile} selectionMode={selectionMode} cardBg={cardBg} cardBorder={cardBorder} badgeBg={badgeBg} badgeText={badgeText} textPrimary={textPrimary} textSecondary={textSecondary} accent={accent} onClick={handleCardClick} onToggleSelect={() => toggleSelectOne(c._id)} />
        );
      })}
    </div>
  );

  // ══════════════════ LISTE DES CLASSES ══════════════════
  const renderListeClasses = () => (
    <>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: isMobile ? 12 : 20 }}>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ fontSize: isMobile ? 18 : 24, fontWeight: 700, color: textPrimary, margin: 0, lineHeight: 1.2 }}>Classes</h2>
          <p style={{ color: textSecondary, marginTop: 2, marginBottom: 0, fontSize: isMobile ? 11.5 : 13 }}>
            {filteredAndSorted.length} sur {classes.length}
            {activeFiltersCount > 0 ? ` · ${activeFiltersCount} filtre${activeFiltersCount > 1 ? "s" : ""}` : ""}
          </p>
        </div>
        {!isMobile && (
          <div style={{ display: "flex", gap: 8 }}>
            <Pressable onClick={exportExcel} focusColor={accent} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 14px", borderRadius: 8, border: `1px solid ${cardBorder}`, background: cardBg, color: textPrimary, fontWeight: 500, fontSize: 13 }}>
              <Download size={15} aria-hidden="true" /> Exporter
            </Pressable>
            <Pressable onClick={() => fileInputRef.current?.click()} disabled={importingClasses} focusColor={accent} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 14px", borderRadius: 8, border: `1px solid ${cardBorder}`, background: cardBg, color: textPrimary, fontWeight: 500, fontSize: 13, opacity: importingClasses ? 0.6 : 1 }}>
              {importingClasses ? <Loader size={15} className="gca-spin" role="status" aria-label="Import" /> : <Upload size={15} aria-hidden="true" />}
              Importer
            </Pressable>
            <Pressable onClick={() => setShowAddModal(true)} focusColor={accent} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 14px", borderRadius: 8, background: buttonBg, color: "#FFF", border: "none", fontWeight: 600, fontSize: 13 }}>
              <Plus size={15} aria-hidden="true" /> Ajouter
            </Pressable>
          </div>
        )}
      </div>

      <div style={{ display: isMobile ? "flex" : "grid", gridTemplateColumns: isMobile ? undefined : "repeat(auto-fit, minmax(150px, 1fr))", gap: isMobile ? 8 : 12, marginBottom: isMobile ? 12 : 18, overflowX: isMobile ? "auto" : "visible", paddingBottom: isMobile ? 4 : 0, scrollbarWidth: "none", ...SCROLL_AREA }}>
        <StatCard icon={<BookOpen size={18} color="#4F46E5" />} label="Classes" value={stats.totalClasses} color="#4F46E5" dark={dark} isMobile={isMobile} />
        <StatCard icon={<Users size={18} color="#0EA5E9" />} label="Élèves" value={stats.totalEleves} color="#0EA5E9" dark={dark} isMobile={isMobile} />
        <StatCard icon={<BarChart3 size={18} color="#10B981" />} label="Moy./classe" value={stats.moyenne} color="#10B981" dark={dark} isMobile={isMobile} />
        <StatCard icon={<AlertCircle size={18} color="#F59E0B" />} label="Vides" value={stats.classesVides} color="#F59E0B" dark={dark} isMobile={isMobile} />
        <StatCard icon={<GraduationCap size={18} color="#8B5CF6" />} label="Enseignants" value={stats.totalEnseignants} color="#8B5CF6" dark={dark} isMobile={isMobile} />
      </div>

      {isMobile ? (
        <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "stretch" }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Search size={16} aria-hidden="true" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: textSecondary, pointerEvents: "none" }} />
            <input type="search" inputMode="search" enterKeyHint="search" autoCorrect="off" spellCheck="false" placeholder="Rechercher…" aria-label="Rechercher une classe" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ ...TAP_BASE, width: "100%", padding: "12px 12px 12px 38px", borderRadius: 12, border: `1px solid ${cardBorder}`, background: cardBg, color: textPrimary, fontSize: 16, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
          </div>
          <Pressable onClick={() => setShowFilters(true)} focusColor={accent} ariaLabel={`Filtres${activeFiltersCount > 0 ? ` (${activeFiltersCount} actif${activeFiltersCount > 1 ? "s" : ""})` : ""}`} style={{ padding: "0 14px", borderRadius: 12, border: `1px solid ${activeFiltersCount > 0 ? accent : cardBorder}`, background: activeFiltersCount > 0 ? (dark ? "#312E81" : "#EEF2FF") : cardBg, color: activeFiltersCount > 0 ? (dark ? "#C7D2FE" : "#4F46E5") : textPrimary, display: "flex", alignItems: "center", gap: 6, fontWeight: 600, fontSize: 13 }}>
            <SlidersHorizontal size={16} aria-hidden="true" />
            {activeFiltersCount > 0 && (<span aria-hidden="true" style={{ background: accent, color: "#FFF", borderRadius: 10, padding: "1px 6px", fontSize: 10, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{activeFiltersCount}</span>)}
          </Pressable>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "stretch" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 240 }}>
            <Search size={16} aria-hidden="true" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: textSecondary, pointerEvents: "none" }} />
            <input type="search" inputMode="search" enterKeyHint="search" autoCorrect="off" spellCheck="false" placeholder="Rechercher une classe…" aria-label="Rechercher une classe" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ ...TAP_BASE, width: "100%", padding: "10px 12px 10px 38px", borderRadius: 8, border: `1px solid ${cardBorder}`, background: cardBg, color: textPrimary, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
          </div>
          <select value={filterEffectif} onChange={(e) => setFilterEffectif(e.target.value)} aria-label="Filtrer par effectif" style={{ ...TAP_BASE, padding: "10px 14px", borderRadius: 8, border: `1px solid ${cardBorder}`, background: cardBg, color: textPrimary, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
            <option value="all">Toutes</option>
            <option value="non-vide">Avec élèves</option>
            <option value="vide">Vides</option>
          </select>
          <div role="group" aria-label="Mode d'affichage" style={{ display: "flex", gap: 4, padding: 4, background: cardBg, borderRadius: 8, border: `1px solid ${cardBorder}` }}>
            <Pressable onClick={() => setViewMode("table")} focusColor={accent} ariaLabel="Vue tableau" ariaPressed={viewMode === "table"} style={{ padding: 8, minWidth: 36, minHeight: 36, borderRadius: 6, border: "none", background: viewMode === "table" ? badgeBg : "transparent", color: viewMode === "table" ? badgeText : textSecondary, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <List size={16} aria-hidden="true" />
            </Pressable>
            <Pressable onClick={() => setViewMode("cards")} focusColor={accent} ariaLabel="Vue cartes" ariaPressed={viewMode === "cards"} style={{ padding: 8, minWidth: 36, minHeight: 36, borderRadius: 6, border: "none", background: viewMode === "cards" ? badgeBg : "transparent", color: viewMode === "cards" ? badgeText : textSecondary, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Grid size={16} aria-hidden="true" />
            </Pressable>
          </div>
        </div>
      )}

      {activeFiltersCount > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
          {searchQuery.trim() && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", background: badgeBg, color: badgeText, borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
              « {searchQuery} »{" "}
              <button onClick={() => setSearchQuery("")} aria-label="Retirer le filtre recherche" style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", padding: 4, minWidth: 24, minHeight: 24, display: "inline-flex", alignItems: "center", justifyContent: "center", touchAction: "manipulation" }}>
                <X size={12} aria-hidden="true" />
              </button>
            </span>
          )}
          {filterEffectif !== "all" && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", background: badgeBg, color: badgeText, borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
              {filterEffectif === "vide" ? "Vides" : "Avec élèves"}{" "}
              <button onClick={() => setFilterEffectif("all")} aria-label="Retirer le filtre effectif" style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", padding: 4, minWidth: 24, minHeight: 24, display: "inline-flex", alignItems: "center", justifyContent: "center", touchAction: "manipulation" }}>
                <X size={12} aria-hidden="true" />
              </button>
            </span>
          )}
          <Pressable onClick={resetFilters} focusColor={accent} style={{ padding: "6px 12px", background: "transparent", border: `1px solid ${cardBorder}`, color: textSecondary, borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
            Tout effacer
          </Pressable>
        </div>
      )}

      {showNonAssignes && (
        <div style={{ marginBottom: 16, padding: isMobile ? 12 : 16, background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: textPrimary }}>
              Élèves non assignés ({elevesNonAssignes.length})
            </h3>
            <Pressable onClick={() => setShowNonAssignes(false)} focusColor={accent} ariaLabel="Fermer" style={{ background: "none", border: "none", color: textSecondary, padding: 8, minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <X size={18} aria-hidden="true" />
            </Pressable>
          </div>
          {elevesNonAssignes.length === 0 ? (
            <p role="status" style={{ margin: 0, fontSize: 13, color: textSecondary }}>
              Tous les élèves sont assignés à une classe. 🎉
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 300, overflowY: "auto", ...SCROLL_AREA }}>
              {elevesNonAssignes.map((e) => (
                <div key={e._id} style={{ display: "flex", alignItems: "center", gap: 10, padding: 8, borderRadius: 8, background: dark ? "#0F172A" : "#F8FAFC", border: `1px solid ${cardBorder}` }}>
                  <div aria-hidden="true" style={{ width: 32, height: 32, borderRadius: "50%", background: badgeBg, color: badgeText, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
                    {e.prenom?.[0]}{e.nom?.[0]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.prenom} {e.nom}</div>
                    <div style={{ fontSize: 11, color: textSecondary }}>{e.code || "—"}</div>
                  </div>
                  <select value="" onChange={(ev) => { const val = ev.target.value; if (val) handleAssignNonAssigne(e._id, val); }} disabled={updatingEleve === e._id || !updateEleveClasse} aria-label={`Assigner ${e.prenom} ${e.nom} à une classe`} style={{ ...TAP_BASE, padding: "6px 10px", borderRadius: 8, border: `1px solid ${cardBorder}`, background: cardBg, color: textPrimary, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
                    <option value="">Assigner…</option>
                    {classesAvecEffectif.map((c) => (<option key={c._id} value={c.nom}>{c.nom}</option>))}
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {filteredAndSorted.length === 0 ? (
        <EmptyState title="Aucune classe" message={searchQuery || filterEffectif !== "all" ? "Aucune classe ne correspond aux critères." : "Créez votre première classe."} />
      ) : isMobile || viewMode === "cards" ? renderCards() : renderTable()}

      {isMobile && !selectedClasse && (
        <Pressable onClick={() => setShowAddModal(true)} focusColor={accent} ariaLabel="Nouvelle classe" style={{ position: "fixed", bottom: selectionMode ? "calc(90px + env(safe-area-inset-bottom, 0px))" : "calc(24px + env(safe-area-inset-bottom, 0px))", right: "calc(20px + env(safe-area-inset-right, 0px))", width: 56, height: 56, minHeight: 56, borderRadius: 28, background: buttonBg, color: "#FFFFFF", border: "none", boxShadow: "0 6px 20px rgba(79,70,229,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 900 }}>
          <Plus size={26} aria-hidden="true" />
        </Pressable>
      )}

      {isMobile && selectionMode && (
        <div className="gca-slide-up-bar" style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: cardBg, borderTop: `1px solid ${cardBorder}`, padding: "10px 14px calc(10px + env(safe-area-inset-bottom, 0px))", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, zIndex: 950, boxShadow: "0 -4px 20px rgba(0,0,0,0.15)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div aria-label={`${selectedIds.length} sélectionnée(s)`} style={{ background: badgeBg, color: badgeText, borderRadius: 20, padding: "4px 10px", fontSize: 12, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
              {selectedIds.length}
            </div>
            <Pressable onClick={() => setSelectedIds([])} focusColor={accent} style={{ background: "none", border: "none", color: textSecondary, fontSize: 12, fontWeight: 600 }}>
              Annuler
            </Pressable>
          </div>
          <Pressable onClick={handleBulkDelete} focusColor="#DC2626" style={{ padding: "10px 14px", borderRadius: 10, border: "none", background: "#DC2626", color: "#FFF", display: "flex", alignItems: "center", gap: 6, fontWeight: 600, fontSize: 13 }}>
            <Trash2 size={16} aria-hidden="true" /> Supprimer
          </Pressable>
        </div>
      )}

      {!isMobile && selectionMode && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 12, padding: "10px 16px", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 8px 30px rgba(0,0,0,0.2)", zIndex: 950 }}>
          <span aria-live="polite" style={{ fontSize: 13, fontWeight: 600, color: textPrimary, fontVariantNumeric: "tabular-nums" }}>
            {selectedIds.length} sélectionnée(s)
          </span>
          <Pressable onClick={handleBulkDelete} focusColor="#DC2626" style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 14px", borderRadius: 8, border: "none", background: "#DC2626", color: "#FFF", fontSize: 13, fontWeight: 600 }}>
            <Trash2 size={14} aria-hidden="true" /> Supprimer
          </Pressable>
          <Pressable onClick={() => setSelectedIds([])} focusColor={accent} ariaLabel="Annuler la sélection" style={{ background: "none", border: "none", color: textSecondary, padding: 8, minWidth: 32, minHeight: 32, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={16} aria-hidden="true" />
          </Pressable>
        </div>
      )}
    </>
  );

  // ══════════════════ DÉTAIL CLASSE ══════════════════
  const renderDetailClasse = () => {
    if (!selectedClasse) return null;
    const classe = selectedClasse;

    return (
      <div className="gca-fade-in">
        <Pressable onClick={() => { setSelectedClasse(null); setActiveDetailTab("eleves"); setSearchElevesClasse(""); cancelRename(); }} focusColor={accent} style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", color: textPrimary, marginBottom: isMobile ? 12 : 20, fontSize: 14, padding: 0 }}>
          <ArrowLeft size={20} aria-hidden="true" /> Retour à la liste
        </Pressable>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: isMobile ? 14 : 24, gap: 12, flexDirection: isMobile ? "column" : "row" }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            {editingClasseId === classe._id ? (
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <input value={editingNom} onChange={(e) => setEditingNom(e.target.value)} autoFocus onKeyDown={(e) => { if (e.key === "Enter") saveRename(classe._id); if (e.key === "Escape") cancelRename(); }} aria-label="Nouveau nom de la classe" enterKeyHint="done" style={{ ...TAP_BASE, padding: "8px 12px", borderRadius: 10, border: `1px solid ${accent}`, background: inputBg, color: textPrimary, fontSize: 16, fontWeight: 600, outline: "none", minWidth: 180, flex: isMobile ? 1 : "none", fontFamily: "inherit" }} />
                <Pressable onClick={() => saveRename(classe._id)} disabled={savingRename} focusColor={accent} ariaLabel="Enregistrer" style={{ background: "#10B981", color: "white", border: "none", borderRadius: 10, padding: 10, display: "flex", alignItems: "center", justifyContent: "center", minWidth: 44, minHeight: 44 }}>
                  {savingRename ? <Loader size={16} className="gca-spin" role="status" aria-label="Enregistrement" /> : <Check size={16} aria-hidden="true" />}
                </Pressable>
                <Pressable onClick={cancelRename} focusColor={accent} ariaLabel="Annuler" style={{ background: "transparent", border: `1px solid ${cardBorder}`, color: textSecondary, borderRadius: 10, padding: 10, display: "flex", alignItems: "center", justifyContent: "center", minWidth: 44, minHeight: 44 }}>
                  <X size={16} aria-hidden="true" />
                </Pressable>
              </div>
            ) : (
              <h2 style={{ fontSize: isMobile ? 20 : 26, fontWeight: 700, color: textPrimary, margin: 0, lineHeight: 1.2 }}>{classe.nom}</h2>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
              <span style={{ background: badgeBg, color: badgeText, padding: "4px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                {classe.effectif} élève{classe.effectif > 1 ? "s" : ""}
              </span>
              <span style={{ background: badgeBg, color: badgeText, padding: "4px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                {classe.nbEnseignants} enseignant{classe.nbEnseignants > 1 ? "s" : ""}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, alignSelf: isMobile ? "stretch" : "auto" }}>
            {editingClasseId !== classe._id && (
              <Pressable onClick={() => startRename(classe)} focusColor={accent} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 14px", borderRadius: 10, border: `1px solid ${cardBorder}`, background: cardBg, color: textPrimary, fontWeight: 600, fontSize: 13, flex: isMobile ? 1 : "none" }}>
                <Pencil size={15} aria-hidden="true" /> Renommer
              </Pressable>
            )}
            <Pressable
              onClick={() => handleDelete(classe._id, classe.nom)}
              disabled={classe.effectif > 0 || deleting === classe._id}
              focusColor="#DC2626"
              ariaLabel={classe.effectif > 0 ? "Retirer les élèves d'abord" : "Supprimer la classe"}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                padding: "10px 14px", borderRadius: 10, border: "none",
                background: classe.effectif > 0 ? (dark ? "#334155" : "#E2E8F0") : "#DC2626",
                color: classe.effectif > 0 ? textSecondary : "#FFF",
                fontWeight: 600, fontSize: 13,
                cursor: classe.effectif > 0 ? "not-allowed" : "pointer",
                flex: isMobile ? 1 : "none",
              }}
            >
              {deleting === classe._id ? <Loader size={15} className="gca-spin" role="status" aria-label="Suppression" /> : <Trash2 size={15} aria-hidden="true" />}
              Supprimer
            </Pressable>
          </div>
        </div>

        <div role="tablist" aria-label="Détails de la classe" style={{ display: "flex", borderBottom: `2px solid ${cardBorder}`, marginBottom: 18, overflowX: "auto", whiteSpace: "nowrap", scrollbarWidth: "none", ...SCROLL_AREA }}>
          {[
            { id: "eleves", label: `Élèves (${classe.effectif})`, Icon: Users },
            { id: "enseignants", label: `Enseignants (${classe.nbEnseignants})`, Icon: GraduationCap },
            { id: "stats", label: "Statistiques", Icon: BarChart3 },
          ].map(({ id, label, Icon }) => {
            const isActive = activeDetailTab === id;
            return (
              <Pressable key={id} onClick={() => setActiveDetailTab(id)} focusColor={accent} role="tab" ariaSelected={isActive} style={{ padding: isMobile ? "12px 14px" : "12px 18px", border: "none", background: "transparent", color: isActive ? accent : textSecondary, fontWeight: isActive ? 700 : 500, borderBottom: isActive ? `3px solid ${accent}` : "3px solid transparent", display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, flexShrink: 0, marginBottom: -2 }}>
                <Icon size={16} aria-hidden="true" /> {label}
              </Pressable>
            );
          })}
        </div>

        {activeDetailTab === "eleves" && (
          <div>
            <div style={{ position: "relative", marginBottom: 12 }}>
              <Search size={16} aria-hidden="true" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: textSecondary, pointerEvents: "none" }} />
              <input type="search" inputMode="search" enterKeyHint="search" autoCorrect="off" spellCheck="false" placeholder="Rechercher un élève…" aria-label="Rechercher un élève" value={searchElevesClasse} onChange={(e) => setSearchElevesClasse(e.target.value)} style={{ ...TAP_BASE, width: "100%", padding: "12px 12px 12px 38px", borderRadius: 12, border: `1px solid ${cardBorder}`, background: inputBg, color: textPrimary, fontSize: 16, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
            </div>

            {elevesDeLaClasse.length === 0 ? (
              <EmptyState title="Aucun élève" message={searchElevesClasse ? "Aucun élève ne correspond." : "Cette classe est vide."} />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, ...SCROLL_AREA }}>
                {elevesDeLaClasse.map((eleve) => (
                  <div key={eleve._id} onClick={() => setSelectedEleveDetail(eleve)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedEleveDetail(eleve); } }} aria-label={`Fiche de ${eleve.prenom} ${eleve.nom}`} style={{ ...TAP_BASE, display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 10, cursor: "pointer", transition: "border-color 0.15s", outline: "none" }}>
                    <div aria-hidden="true" style={{ width: 34, height: 34, borderRadius: "50%", background: badgeBg, color: badgeText, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
                      {eleve.prenom?.[0]}{eleve.nom?.[0]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{eleve.prenom} {eleve.nom}</div>
                      <div style={{ fontSize: 11, color: textSecondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {eleve.code || "Pas de matricule"}{eleve.sexe ? ` · ${eleve.sexe === "M" ? "M" : "F"}` : ""}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 4 }} onClick={(e) => e.stopPropagation()}>
                      <Pressable onClick={() => handleRetirerEleve(eleve._id)} disabled={updatingEleve === eleve._id || !updateEleveClasse} focusColor={dangerText} ariaLabel={`Retirer ${eleve.prenom} ${eleve.nom} de la classe`} style={{ background: dark ? "#0F172A" : "#F8FAFC", border: "none", color: dangerText, padding: 8, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", minWidth: 36, minHeight: 36 }}>
                        {updatingEleve === eleve._id ? <Loader size={14} className="gca-spin" role="status" aria-label="Retrait" /> : <UserX size={16} aria-hidden="true" />}
                      </Pressable>
                    </div>
                    <ChevronRight size={16} aria-hidden="true" color={dark ? "#475569" : "#CBD5E1"} style={{ flexShrink: 0 }} />
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: 20 }}>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: textPrimary, marginBottom: 10 }}>
                Ajouter un élève à cette classe
              </h4>
              <form onSubmit={handleAddEleveToClasse} style={{ display: "flex", gap: 10, flexDirection: isMobile ? "column" : "row" }}>
                <label htmlFor="gca-add-eleve" style={{ position: "absolute", left: -9999 }}>Sélectionner un élève</label>
                <select id="gca-add-eleve" value={eleveToAdd} onChange={(e) => setEleveToAdd(e.target.value)} disabled={!updateEleveClasse} aria-label="Sélectionner un élève" style={{ ...TAP_BASE, flex: 1, padding: "12px 14px", borderRadius: 10, border: `1px solid ${cardBorder}`, background: inputBg, color: textPrimary, fontSize: 16, outline: "none", fontFamily: "inherit" }}>
                  <option value="">Sélectionner un élève…</option>
                  {elevesDisponibles.map((eleve) => (
                    <option key={eleve._id} value={eleve._id}>
                      {eleve.prenom} {eleve.nom} {eleve.postnom} ({eleve.classe || "non assigné"})
                    </option>
                  ))}
                </select>
                <Pressable type="submit" disabled={!eleveToAdd || !updateEleveClasse || updatingEleve === eleveToAdd} focusColor={accent} ariaBusy={updatingEleve === eleveToAdd} style={{ padding: "12px 18px", background: buttonBg, color: "white", border: "none", borderRadius: 10, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 14, opacity: !eleveToAdd || !updateEleveClasse ? 0.5 : 1 }}>
                  {updatingEleve === eleveToAdd ? <Loader size={16} className="gca-spin" role="status" aria-label="Ajout" /> : <UserCheck size={16} aria-hidden="true" />}
                  Ajouter
                </Pressable>
              </form>
            </div>
          </div>
        )}

        {activeDetailTab === "enseignants" && (
          <div>
            {enseignantsDeLaClasse.length === 0 ? (
              <EmptyState title="Aucun enseignant" message="Aucun enseignant assigné à cette classe." />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {enseignantsDeLaClasse.map((ens) => (
                  <div key={ens._id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 10 }}>
                    <div aria-hidden="true" style={{ width: 34, height: 34, borderRadius: "50%", background: dark ? "#4C1D95" : "#EDE9FE", color: dark ? "#C4B5FD" : "#7C3AED", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <GraduationCap size={18} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ens.nom} {ens.prenom || ""}</div>
                      <div style={{ fontSize: 11, color: textSecondary }}>{ens.login}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeDetailTab === "stats" && statsClasse && (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(auto-fit, minmax(180px, 1fr))", gap: isMobile ? 8 : 12 }}>
            <StatCard icon={<Users size={18} color="#4F46E5" />} label="Total" value={statsClasse.total} color="#4F46E5" dark={dark} isMobile={isMobile} />
            <StatCard icon={<UserCheck size={18} color="#10B981" />} label="Garçons" value={statsClasse.garcons} color="#10B981" dark={dark} isMobile={isMobile} />
            <StatCard icon={<UserX size={18} color="#EC4899" />} label="Filles" value={statsClasse.filles} color="#EC4899" dark={dark} isMobile={isMobile} />
            <StatCard icon={<GraduationCap size={18} color="#8B5CF6" />} label="Enseignants" value={statsClasse.nbEnseignants} color="#8B5CF6" dark={dark} isMobile={isMobile} />
          </div>
        )}
      </div>
    );
  };

  // ══════════════════ RENDU PRINCIPAL ══════════════════
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: isMobile ? "10px 8px 90px" : "20px 16px", width: "100%", boxSizing: "border-box" }}>
      {GcaKeyframes}

      {selectedClasse ? renderDetailClasse() : renderListeClasses()}

      <AddClasseModal open={showAddModal} onClose={() => setShowAddModal(false)} onAdd={handleAdd} adding={adding} dark={dark} isMobile={isMobile} />

      <FiltersSheet
        open={showFilters}
        onClose={() => setShowFilters(false)}
        dark={dark}
        searchQuery={searchQuery} setSearchQuery={setSearchQuery}
        filterEffectif={filterEffectif} setFilterEffectif={setFilterEffectif}
        sortBy={sortBy} setSortBy={setSortBy}
        sortOrder={sortOrder} setSortOrder={setSortOrder}
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
        aria-label="Importer un fichier Excel"
      />

      {selectedEleveDetail && (
        <EleveDetailModal
          eleve={selectedEleveDetail}
          onClose={() => setSelectedEleveDetail(null)}
          dark={dark}
          isMobile={isMobile}
          cardBg={cardBg}
          cardBorder={cardBorder}
          textPrimary={textPrimary}
          textSecondary={textSecondary}
          accent={accent}
          buttonBg={buttonBg}
        />
      )}

      <ConfirmDialog {...dialogProps} />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// CARTE CLASSE (extraite pour state React)
// ════════════════════════════════════════════════════════════════════
function ClasseCard({
  classe: c, isSelected, isEmpty, dark, isMobile, selectionMode,
  cardBg, cardBorder, badgeBg, badgeText, textPrimary, textSecondary, accent,
  onClick, onToggleSelect,
}) {
  const [pressed, setPressed] = useState(false);
  const [focused, setFocused] = useState(false);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      aria-label={`${c.nom} - ${c.effectif} élève${c.effectif > 1 ? "s" : ""}${isSelected ? " (sélectionné)" : ""}`}
      style={{
        ...TAP_BASE,
        background: cardBg,
        borderRadius: 12,
        padding: isMobile ? "10px 12px" : "10px 14px",
        boxShadow: dark ? "0 1px 2px rgba(0,0,0,0.25)" : "0 1px 2px rgba(0,0,0,0.04)",
        border: `1.5px solid ${isSelected ? accent : isEmpty ? (dark ? "#78350F" : "#FED7AA") : cardBorder}`,
        display: "flex",
        alignItems: "center",
        gap: isMobile ? 10 : 12,
        cursor: "pointer",
        transition: "border-color 0.15s, background-color 0.15s, transform 0.1s",
        userSelect: "none",
        minWidth: 0,
        outline: "none",
        transform: pressed ? "scale(0.99)" : "scale(1)",
        ...(focused ? FOCUS_RING(accent) : null),
      }}
    >
      <Pressable
        onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}
        focusColor={accent}
        ariaLabel={isSelected ? `Désélectionner ${c.nom}` : `Sélectionner ${c.nom}`}
        style={{
          background: "none", border: "none", padding: 8, minWidth: 44, minHeight: 44,
          color: isSelected ? accent : (dark ? "#64748B" : "#94A3B8"),
          flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        {isSelected ? <CheckSquare size={20} aria-hidden="true" /> : <Square size={20} aria-hidden="true" />}
      </Pressable>

      <div
        aria-hidden="true"
        style={{
          width: 36, height: 36, borderRadius: "50%",
          background: isEmpty ? (dark ? "#78350F" : "#FEF3C7") : (dark ? "#312E81" : "#EEF2FF"),
          display: "flex", alignItems: "center", justifyContent: "center",
          color: isEmpty ? (dark ? "#FCD34D" : "#B45309") : (dark ? "#A5B4FC" : "#4F46E5"),
          flexShrink: 0,
        }}
      >
        <BookOpen size={18} />
      </div>

      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
          <span style={{ fontWeight: 600, fontSize: isMobile ? 13.5 : 14, color: textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
            {c.nom}
          </span>
          <span style={{ background: isEmpty ? (dark ? "#78350F" : "#FEF3C7") : badgeBg, color: isEmpty ? (dark ? "#FCD34D" : "#B45309") : badgeText, padding: "1px 7px", borderRadius: 10, fontSize: 10, fontWeight: 700, flexShrink: 0, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
            {c.effectif} élève{c.effectif > 1 ? "s" : ""}
          </span>
        </div>
        <div style={{ fontSize: isMobile ? 11 : 11.5, color: textSecondary, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {c.enseignantPrincipal
            ? `${c.enseignantPrincipal} · ${c.nbEnseignants} enseignant${c.nbEnseignants > 1 ? "s" : ""}`
            : isEmpty ? "Aucun enseignant" : `${c.nbEnseignants} enseignant${c.nbEnseignants > 1 ? "s" : ""}`}
        </div>
      </div>

      {!selectionMode && (
        <ChevronRight size={18} aria-hidden="true" color={dark ? "#475569" : "#CBD5E1"} style={{ flexShrink: 0 }} />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// MODALE FICHE ÉLÈVE
// ════════════════════════════════════════════════════════════════════
function EleveDetailModal({ eleve, onClose, dark, isMobile, cardBg, cardBorder, textPrimary, textSecondary, accent, buttonBg }) {
  const titleId = useId();
  const panelRef = useRef(null);
  useFocusTrap(panelRef, true);

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <>
      {GcaKeyframes}
      <div onClick={onClose} className="gca-fade-in" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: isMobile ? "flex-end" : "center", justifyContent: "center", zIndex: 1100, padding: isMobile ? 0 : 16, ...SCROLL_AREA }}>
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onClick={(e) => e.stopPropagation()}
          tabIndex={-1}
          className="gca-slide-up"
          style={{
            background: cardBg,
            borderRadius: isMobile ? "20px 20px 0 0" : 16,
            padding: isMobile ? "12px 16px 0" : 24,
            ...(isMobile ? SAFE_BOTTOM : null),
            width: "100%",
            maxWidth: isMobile ? "100%" : 700,
            maxHeight: "92vh", overflowY: "auto",
            boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
            border: `1px solid ${cardBorder}`, outline: "none",
            ...SCROLL_AREA,
          }}
        >
          {isMobile && <div aria-hidden="true" style={{ width: 40, height: 4, borderRadius: 2, background: dark ? "#475569" : "#CBD5E1", margin: "0 auto 14px" }} />}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <h3 id={titleId} style={{ margin: 0, fontSize: isMobile ? 17 : 20, fontWeight: 700, color: textPrimary }}>
              Fiche élève
            </h3>
            <Pressable onClick={onClose} focusColor={accent} ariaLabel="Fermer" style={{ background: "none", border: "none", color: textSecondary, padding: 8, minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <X size={22} aria-hidden="true" />
            </Pressable>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
            <section>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <User size={16} color={accent} aria-hidden="true" />
                <span style={{ fontWeight: 600, color: textPrimary, fontSize: 13 }}>Identité</span>
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                <p><strong>Nom :</strong> {eleve.nom} {eleve.postnom} {eleve.prenom}</p>
                <p><strong>Sexe :</strong> {eleve.sexe === "F" ? "Féminin" : eleve.sexe === "M" ? "Masculin" : "—"}</p>
                <p><strong>Matricule :</strong> {eleve.code || "—"}</p>
                <p><strong>Date naissance :</strong> {eleve.dateNaissance || "—"}</p>
              </div>
            </section>

            <section>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <MapPin size={16} color={accent} aria-hidden="true" />
                <span style={{ fontWeight: 600, color: textPrimary, fontSize: 13 }}>Origine</span>
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                <p><strong>Province :</strong> {eleve.province || "—"}</p>
                <p><strong>Territoire :</strong> {eleve.territoire || "—"}</p>
                <p><strong>Adresse :</strong> {eleve.adresse || "—"}</p>
              </div>
            </section>

            <section>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <Phone size={16} color={accent} aria-hidden="true" />
                <span style={{ fontWeight: 600, color: textPrimary, fontSize: 13 }}>Contact</span>
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                <p><strong>Téléphone :</strong> {eleve.telephone || "—"}</p>
              </div>
            </section>

            <section>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <Users size={16} color={accent} aria-hidden="true" />
                <span style={{ fontWeight: 600, color: textPrimary, fontSize: 13 }}>Parents</span>
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                <p><strong>Père :</strong> {eleve.nomPere || "—"}</p>
                <p><strong>Mère :</strong> {eleve.nomMere || "—"}</p>
                <p><strong>Tuteur :</strong> {eleve.tuteurNom || "—"}</p>
              </div>
            </section>
          </div>

          <Pressable onClick={onClose} focusColor={accent} style={{ marginTop: 20, width: "100%", padding: 14, background: buttonBg, color: "white", border: "none", borderRadius: 12, fontWeight: 700, fontSize: 14 }}>
            Fermer
          </Pressable>
        </div>
      </div>
    </>
  );
}