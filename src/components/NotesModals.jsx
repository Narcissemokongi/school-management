import { useState, useMemo, useEffect, useCallback, useId } from "react";
import {
  X, Search, Loader, Edit2, Trash2, User, BookOpen,
  Calendar, Award, Tag, Users, GraduationCap, Upload,
  ChevronUp, ChevronDown, RotateCcw,
} from "lucide-react";
import toast from "react-hot-toast";
import { trierEleves } from "@/utils/tri";

// ============================================================
// CONSTANTES MODULE-LEVEL (mobile + a11y)
// ============================================================
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

const SAFE_TOP = {
  paddingTop: "calc(12px + env(safe-area-inset-top, 0px))",
};

const FOCUS_RING = (dark) => ({
  outline: `2px solid ${dark ? "#818CF8" : "#4F46E5"}`,
  outlineOffset: 2,
});

const INPUT_MOBILE = { fontSize: 16 }; // évite zoom iOS

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
// KEYFRAMES MODULE-LEVEL (rendus UNE seule fois)
// ============================================================
function NotesKeyframes() {
  return (
    <style>{`
      @keyframes nm-slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
      @keyframes nm-fadeIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes nm-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      .nm-spin { animation: nm-spin 1s linear infinite; }
      @media (prefers-reduced-motion: reduce) {
        .nm-slideUp, .nm-spin, .nm-fadeIn { animation: none !important; }
      }
    `}</style>
  );
}

// ============================================================
// PRESSABLE — feedback tap via state React + focus ring
// ============================================================
function Pressable({
  onClick,
  style,
  children,
  disabled = false,
  type = "button",
  dark = false,
  ariaLabel,
  ...rest
}) {
  const [pressed, setPressed] = useState(false);
  const [focused, setFocused] = useState(false);
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      onPointerDown={() => !disabled && setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        ...TAP_BASE,
        transform: pressed && !disabled ? "scale(0.97)" : "scale(1)",
        transition: "transform 0.12s ease, background-color 0.2s, border-color 0.2s",
        ...(focused && !disabled ? FOCUS_RING(dark) : null),
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

// ============================================================
// BOTTOM SHEET FILTRES / TRI / IMPORT
// ============================================================
export function NotesFiltersSheet({
  open,
  onClose,
  dark,
  searchTerm,
  setSearchTerm,
  categorieFilter,
  setCategorieFilter,
  sortKey,
  setSortKey,
  sortDir,
  setSortDir,
  onReset,
  activeFiltersCount,
  onImportClick,
}) {
  const titleId = useId();

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
    ...INPUT_MOBILE,
    outline: "none",
    boxSizing: "border-box",
    appearance: "none",
    WebkitAppearance: "none",
    ...TAP_BASE,
    minHeight: 44,
  };

  return (
    <>
      <NotesKeyframes />
      <div
        onClick={onClose}
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.45)",
          zIndex: 1100,
          animation: "nm-fadeIn 0.18s ease-out",
        }}
      />
      <div
        className="nm-slideUp"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          background: dark ? "#1E293B" : "#FFFFFF",
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          padding: "12px 16px 0",
          ...SAFE_BOTTOM,
          zIndex: 1101,
          maxHeight: "85vh",
          overflowY: "auto",
          boxShadow: "0 -8px 30px rgba(0,0,0,0.25)",
          animation: "nm-slideUp 0.25s cubic-bezier(0.22, 1, 0.36, 1)",
          ...SCROLL_AREA,
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: 40, height: 4, borderRadius: 2,
            background: dark ? "#475569" : "#CBD5E1",
            margin: "0 auto 16px",
          }}
        />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h3 id={titleId} style={{ margin: 0, fontSize: 17, fontWeight: 700, color: dark ? "#F1F5F9" : "#1E293B" }}>
            Filtrer et trier
          </h3>
          <Pressable
            onClick={onClose}
            dark={dark}
            ariaLabel="Fermer"
            style={{
              background: "none", border: "none",
              color: dark ? "#94A3B8" : "#64748B",
              padding: 8, minHeight: 44, minWidth: 44,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <X size={22} aria-hidden="true" />
          </Pressable>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle} htmlFor="nm-filter-search">Recherche</label>
          <div style={{ position: "relative" }}>
            <Search
              size={16}
              aria-hidden="true"
              style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: dark ? "#94A3B8" : "#64748B" }}
            />
            <input
              id="nm-filter-search"
              type="text"
              inputMode="search"
              enterKeyHint="search"
              autoCorrect="off"
              spellCheck="false"
              placeholder="Élève, matière, période…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ ...fieldStyle, paddingLeft: 36 }}
            />
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle} htmlFor="nm-filter-cat">Catégorie</label>
          <select
            id="nm-filter-cat"
            value={categorieFilter}
            onChange={(e) => setCategorieFilter(e.target.value)}
            style={fieldStyle}
          >
            <option value="toutes">Toutes catégories</option>
            <option value="devoir">Devoir</option>
            <option value="examen">Examen</option>
            <option value="interrogation">Interrogation</option>
            <option value="exercice">Exercice</option>
          </select>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle} htmlFor="nm-filter-sort">Trier par</label>
          <div style={{ display: "flex", gap: 8 }}>
            <select
              id="nm-filter-sort"
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value)}
              style={{ ...fieldStyle, flex: 1 }}
            >
              <option value="eleve">Élève</option>
              <option value="note">Note</option>
              <option value="matiere">Matière</option>
              <option value="periode">Période</option>
            </select>
            <Pressable
              onClick={() => setSortDir((o) => (o === "asc" ? "desc" : "asc"))}
              dark={dark}
              ariaLabel={sortDir === "asc" ? "Tri croissant" : "Tri décroissant"}
              style={{
                padding: "12px 14px",
                borderRadius: 10,
                border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
                background: dark ? "#0F172A" : "#F8FAFC",
                color: dark ? "#F1F5F9" : "#1E293B",
                display: "flex", alignItems: "center", gap: 6,
                fontWeight: 600, fontSize: 13,
              }}
            >
              {sortDir === "asc" ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
              {sortDir === "asc" ? "A→Z" : "Z→A"}
            </Pressable>
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Actions rapides</label>
          <Pressable
            onClick={() => { onImportClick(); onClose(); }}
            dark={dark}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "12px 14px", borderRadius: 10,
              border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
              background: dark ? "#0F172A" : "#F8FAFC",
              color: dark ? "#F1F5F9" : "#1E293B",
              fontWeight: 600, fontSize: 14, textAlign: "left", width: "100%",
            }}
          >
            <Upload size={18} aria-hidden="true" />
            Importer des résultats Excel
          </Pressable>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <Pressable
            onClick={() => { onReset(); onClose(); }}
            dark={dark}
            style={{
              flex: 1, padding: "14px 16px", borderRadius: 12,
              border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
              background: "transparent",
              color: dark ? "#CBD5E1" : "#475569",
              fontWeight: 600, fontSize: 14,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            <RotateCcw size={16} aria-hidden="true" />
            Réinitialiser
          </Pressable>
          <Pressable
            onClick={onClose}
            dark={dark}
            style={{
              flex: 2, padding: "14px 16px", borderRadius: 12, border: "none",
              background: dark ? "#818CF8" : "#4F46E5", color: "#FFFFFF",
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

// ============================================================
// MODALE AJOUT / ÉDITION DE NOTE
// ============================================================
export function AddNoteModal({
  open, onClose, initialMode = "individuel", initialData = null,
  eleves, matiereFixe, matieresUtilisees, upsertNote, upsertBulk,
  ecoleId, anneeId, userId, coursDisponibles, dark, isMobile,
}) {
  const [mode, setMode] = useState(initialMode);
  const titleId = useId();

  useEffect(() => {
    if (open) setMode(initialData ? "individuel" : initialMode);
  }, [open, initialMode, initialData]);

  if (!open) return null;

  const content = (
    <>
      {isMobile && (
        <div
          aria-hidden="true"
          style={{ width: 40, height: 4, borderRadius: 2, background: dark ? "#475569" : "#CBD5E1", margin: "0 auto 14px" }}
        />
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 id={titleId} style={{ margin: 0, fontSize: 17, fontWeight: 700, color: dark ? "#F1F5F9" : "#1E293B" }}>
          {initialData ? "Modifier la note" : "Nouvelle note"}
        </h3>
        <Pressable
          onClick={onClose}
          dark={dark}
          ariaLabel="Fermer"
          style={{
            background: "none", border: "none",
            color: dark ? "#94A3B8" : "#64748B",
            padding: 8, minHeight: 44, minWidth: 44,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <X size={22} aria-hidden="true" />
        </Pressable>
      </div>

      {!initialData && (
        <div
          role="tablist"
          style={{
            display: "flex",
            borderBottom: `2px solid ${dark ? "#334155" : "#E2E8F0"}`,
            marginBottom: 18,
            overflowX: "auto",
            whiteSpace: "nowrap",
            scrollbarWidth: "none",
            ...SCROLL_AREA,
          }}
        >
          {[
            { key: "individuel", label: "Individuel", Icon: Users },
            { key: "groupe", label: "Groupé", Icon: GraduationCap },
          ].map(({ key, label, Icon }) => {
            const active = mode === key;
            return (
              <Pressable
                key={key}
                role="tab"
                aria-selected={active}
                onClick={() => setMode(key)}
                dark={dark}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "10px 14px",
                  border: "none", background: "transparent",
                  color: active ? (dark ? "#818CF8" : "#4F46E5") : (dark ? "#94A3B8" : "#64748B"),
                  fontWeight: active ? 700 : 500,
                  borderBottom: active ? `3px solid ${dark ? "#818CF8" : "#4F46E5"}` : "3px solid transparent",
                  fontSize: 13.5, flexShrink: 0, marginBottom: -2,
                }}
              >
                <Icon size={16} aria-hidden="true" /> {label}
              </Pressable>
            );
          })}
        </div>
      )}

      {mode === "individuel" ? (
        <AddNoteIndividuel
          eleves={eleves} matiereFixe={matiereFixe} matieresUtilisees={matieresUtilisees}
          upsertNote={upsertNote} ecoleId={ecoleId} anneeId={anneeId} userId={userId}
          initialData={initialData} onSuccess={onClose}
          coursDisponibles={coursDisponibles} dark={dark} isMobile={isMobile}
        />
      ) : (
        <AddNoteGroupe
          eleves={eleves} matiereFixe={matiereFixe} matieresUtilisees={matieresUtilisees}
          upsertBulk={upsertBulk} ecoleId={ecoleId} anneeId={anneeId} userId={userId}
          coursDisponibles={coursDisponibles} dark={dark} isMobile={isMobile}
        />
      )}
    </>
  );

  if (isMobile) {
    return (
      <>
        <NotesKeyframes />
        <div
          onClick={onClose}
          aria-hidden="true"
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
            zIndex: 1200, animation: "nm-fadeIn 0.18s ease-out",
          }}
        />
        <div
          className="nm-slideUp"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          style={{
            position: "fixed", left: 0, right: 0, bottom: 0,
            background: dark ? "#1E293B" : "#FFFFFF",
            borderTopLeftRadius: 20, borderTopRightRadius: 20,
            padding: "12px 16px 0",
            ...SAFE_BOTTOM,
            zIndex: 1201, maxHeight: "92vh", overflowY: "auto",
            boxShadow: "0 -8px 30px rgba(0,0,0,0.25)",
            animation: "nm-slideUp 0.25s cubic-bezier(0.22, 1, 0.36, 1)",
            ...SCROLL_AREA,
          }}
        >
          {content}
        </div>
      </>
    );
  }

  return (
    <>
      <NotesKeyframes />
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1200, padding: 16, animation: "nm-fadeIn 0.2s ease-out",
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          style={{
            background: dark ? "#1E293B" : "#FFFFFF",
            borderRadius: 16, padding: 24, width: "100%", maxWidth: 720,
            maxHeight: "90vh", overflowY: "auto",
            border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
            boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
            ...SCROLL_AREA,
          }}
        >
          {content}
        </div>
      </div>
    </>
  );
}

// ============================================================
// MODALE DÉTAIL D'UNE NOTE
// ============================================================
export function DetailNoteModal({ note, eleve, bareme, onClose, onEdit, onDelete, dark, isMobile }) {
  const titleId = useId();
  const pourcentage = bareme > 0 ? (note.note / bareme) * 100 : 0;
  const noteColor = pourcentage >= 70 ? "#10B981" : pourcentage >= 50 ? "#F59E0B" : "#EF4444";

  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const accent = dark ? "#818CF8" : "#4F46E5";

  return (
    <>
      <NotesKeyframes />
      <div
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: isMobile ? "flex-end" : "center",
          justifyContent: "center", zIndex: 1300,
          padding: isMobile ? 0 : 16, animation: "nm-fadeIn 0.2s ease-out",
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          style={{
            background: cardBg,
            borderRadius: isMobile ? "20px 20px 0 0" : 16,
            padding: isMobile ? "12px 16px 0" : 24,
            ...(isMobile ? SAFE_BOTTOM : null),
            width: "100%",
            maxWidth: isMobile ? "100%" : 560,
            maxHeight: "92vh", overflowY: "auto",
            boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
            border: `1px solid ${cardBorder}`,
            ...SCROLL_AREA,
          }}
        >
          {isMobile && (
            <div
              aria-hidden="true"
              style={{ width: 40, height: 4, borderRadius: 2, background: dark ? "#475569" : "#CBD5E1", margin: "0 auto 14px" }}
            />
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <h3 id={titleId} style={{ margin: 0, fontSize: 17, fontWeight: 700, color: textPrimary }}>
              Détail de la note
            </h3>
            <Pressable
              onClick={onClose}
              dark={dark}
              ariaLabel="Fermer"
              style={{
                background: "none", border: "none", color: textSecondary,
                padding: 8, minHeight: 44, minWidth: 44,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <X size={22} aria-hidden="true" />
            </Pressable>
          </div>

          <div
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "16px 0", marginBottom: 18,
              background: dark ? "#0F172A" : "#F8FAFC",
              borderRadius: 12, border: `1px solid ${cardBorder}`,
            }}
          >
            <div style={{ fontSize: 44, fontWeight: 800, color: noteColor, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
              {note.note}
              <span style={{ fontSize: 22, fontWeight: 500, color: textSecondary, marginLeft: 4 }}>
                /{bareme}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <DetailRow icon={<User size={16} color={accent} aria-hidden="true" />} label="Élève"
              value={eleve ? `${eleve.nom} ${eleve.postnom}${eleve.prenom ? ` (${eleve.prenom})` : ""}` : "—"} dark={dark} />
            <DetailRow icon={<BookOpen size={16} color={accent} aria-hidden="true" />} label="Matière" value={note.matiere} dark={dark} />
            <DetailRow icon={<Calendar size={16} color={accent} aria-hidden="true" />} label="Période" value={note.periode} dark={dark} />
            <DetailRow icon={<Award size={16} color={accent} aria-hidden="true" />} label="Coefficient" value={note.coefficient ?? 1} dark={dark} />
            <DetailRow icon={<Tag size={16} color={accent} aria-hidden="true" />} label="Catégorie" value={note.categorie || "—"} dark={dark} />
            {note.appreciation && (
              <DetailRow icon={<Edit2 size={16} color={accent} aria-hidden="true" />} label="Appréciation" value={note.appreciation} dark={dark} />
            )}
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
            <Pressable
              onClick={onEdit}
              dark={dark}
              style={{
                flex: 1, padding: "12px 14px", borderRadius: 12,
                border: `1px solid ${cardBorder}`,
                background: dark ? "#0F172A" : "#F8FAFC",
                color: textPrimary,
                fontWeight: 600, fontSize: 13.5,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}
            >
              <Edit2 size={16} aria-hidden="true" />
              Modifier
            </Pressable>
            <Pressable
              onClick={onDelete}
              dark={dark}
              style={{
                flex: 1, padding: "12px 14px", borderRadius: 12, border: "none",
                background: "#DC2626", color: "#FFFFFF",
                fontWeight: 600, fontSize: 13.5,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}
            >
              <Trash2 size={16} aria-hidden="true" />
              Supprimer
            </Pressable>
          </div>

          <Pressable
            onClick={onClose}
            dark={dark}
            style={{
              marginTop: 10, width: "100%", padding: 12,
              background: "transparent", border: `1px solid ${cardBorder}`,
              borderRadius: 12, color: textSecondary,
              fontWeight: 600, fontSize: 13.5,
            }}
          >
            Fermer
          </Pressable>
        </div>
      </div>
    </>
  );
}

function DetailRow({ icon, label, value, dark }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13.5 }}>
      <div
        aria-hidden="true"
        style={{
          width: 28, height: 28, borderRadius: 8,
          background: dark ? "#0F172A" : "#F8FAFC",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{
          fontSize: 11, fontWeight: 600,
          color: dark ? "#94A3B8" : "#64748B",
          textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 2,
        }}>
          {label}
        </div>
        <div style={{ color: dark ? "#F1F5F9" : "#1E293B", fontWeight: 500, wordBreak: "break-word" }}>
          {value}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SOUS-COMPOSANT : Ajout individuel
// ============================================================
function AddNoteIndividuel({
  eleves, matiereFixe, matieresUtilisees, upsertNote, ecoleId, anneeId, userId,
  initialData, onSuccess, coursDisponibles, dark, isMobile,
}) {
  const [selectedEleve, setSelectedEleve] = useState(initialData?.eleveId || "");
  const [matiere, setMatiere] = useState(initialData?.matiere || matiereFixe || "");
  const [note, setNote] = useState(initialData?.note?.toString() || "");
  const [coefficient, setCoefficient] = useState(initialData?.coefficient?.toString() || "1");
  const [periode, setPeriode] = useState(initialData?.periode || "");
  const [appreciation, setAppreciation] = useState(initialData?.appreciation || "");
  const [categorie, setCategorie] = useState(initialData?.categorie || "devoir");
  const [editId, setEditId] = useState(initialData?._id || null);
  const [submitting, setSubmitting] = useState(false);
  const [searchEleve, setSearchEleve] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const elevesById = useMemo(() => new Map((eleves ?? []).map((e) => [e._id, e])), [eleves]);
  const coursByNom = useMemo(() => new Map((coursDisponibles ?? []).map((c) => [c.nom, c])), [coursDisponibles]);

  const elevesTries = useMemo(() => [...eleves].sort(trierEleves), [eleves]);

  const elevesFiltres = useMemo(() => {
    if (!searchEleve.trim()) return elevesTries;
    const q = searchEleve.toLowerCase();
    return elevesTries.filter(
      (e) =>
        `${e.nom} ${e.postnom} ${e.prenom}`.toLowerCase().includes(q) ||
        e.classe.toLowerCase().includes(q)
    );
  }, [elevesTries, searchEleve]);

  const eleveSelectionne = selectedEleve ? elevesById.get(selectedEleve) : null;
  const cours = coursByNom.get(matiereFixe || matiere);
  const bareme = cours?.bareme ?? 20;

  const noteNum = parseFloat(note);
  const pourcentage =
    note && !isNaN(noteNum) && bareme > 0 ? Math.round((noteNum / bareme) * 100) : null;

  const resetForm = useCallback(() => {
    setSelectedEleve(""); setSearchEleve(""); setShowSuggestions(false);
    setMatiere(matiereFixe || ""); setNote(""); setCoefficient("1");
    setPeriode(""); setAppreciation(""); setCategorie("devoir"); setEditId(null);
    if (onSuccess) onSuccess();
  }, [matiereFixe, onSuccess]);

  const handleSelectEleve = (id) => {
    setSelectedEleve(id); setSearchEleve(""); setShowSuggestions(false);
  };

  const validate = () => {
    if (!selectedEleve) return "Veuillez sélectionner un élève.";
    if (!matiere) return "Veuillez saisir la matière.";
    const n = parseFloat(note);
    if (isNaN(n) || n < 0 || n > bareme) return `La note doit être entre 0 et ${bareme}.`;
    if (!periode) return "Veuillez indiquer la période.";
    const coeff = parseFloat(coefficient);
    if (!coefficient || isNaN(coeff) || coeff <= 0) return "Le coefficient doit être supérieur à 0.";
    if (!userId) return "Session invalide.";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    const error = validate();
    if (error) { toast.error(error); return; }
    setSubmitting(true);
    try {
      const payload = {
        eleveId: selectedEleve, ecoleId, matiere,
        note: parseFloat(note),
        coefficient: parseFloat(coefficient) || 1,
        categorie, periode,
        appreciation: appreciation || undefined,
        anneeId, userId,
      };
      if (editId) payload.id = editId;
      await upsertNote(payload);
      toast.success(editId ? "Note mise à jour" : "Note ajoutée");
      resetForm();
    } catch (err) {
      toast.error(extractErrMsg(err, "Erreur lors de l'enregistrement"));
    } finally { setSubmitting(false); }
  };

  const inputStyle = (hasError = false) => ({
    width: "100%",
    padding: isMobile ? "12px 14px" : "10px 14px",
    border: `1px solid ${hasError ? "#EF4444" : dark ? "#334155" : "#E2E8F0"}`,
    borderRadius: 10,
    ...(isMobile ? INPUT_MOBILE : { fontSize: 14 }),
    outline: "none",
    background: dark ? "#0F172A" : "#F8FAFC",
    color: dark ? "#F1F5F9" : "#1E293B",
    transition: "border-color 0.2s, background-color 0.3s",
    boxSizing: "border-box",
    ...TAP_BASE,
    minHeight: 44,
  });

  const labelStyle = {
    display: "block", marginBottom: 6, fontWeight: 600, fontSize: 12,
    color: dark ? "#CBD5E1" : "#374151",
    textTransform: "uppercase", letterSpacing: 0.3,
  };

  const gridColumns = isMobile ? "1fr" : "1fr 1fr";

  return (
    <form onSubmit={handleSubmit}>
      {/* Élève */}
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>
          Élève <span style={{ color: "#EF4444" }} aria-hidden="true">*</span>
        </label>
        {!selectedEleve ? (
          <>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                inputMode="search"
                enterKeyHint="search"
                autoCorrect="off"
                spellCheck="false"
                placeholder="Rechercher un élève…"
                value={searchEleve}
                onChange={(e) => { setSearchEleve(e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                style={{ ...inputStyle(false), paddingLeft: 34 }}
              />
              <Search
                size={16}
                aria-hidden="true"
                style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: dark ? "#94A3B8" : "#64748B" }}
              />
            </div>
            {showSuggestions && searchEleve.trim() && (
              <div
                role="listbox"
                style={{
                  maxHeight: 200, overflowY: "auto",
                  border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
                  borderRadius: 10, marginTop: 4,
                  background: dark ? "#1E293B" : "#FFFFFF",
                  ...SCROLL_AREA,
                }}
              >
                {elevesFiltres.slice(0, 20).map((e) => (
                  <button
                    key={e._id}
                    type="button"
                    role="option"
                    aria-selected="false"
                    onMouseDown={() => handleSelectEleve(e._id)}
                    style={{
                      display: "block", width: "100%", textAlign: "left",
                      padding: "12px 12px",
                      border: "none",
                      borderBottom: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
                      background: "transparent",
                      color: dark ? "#F1F5F9" : "#1E293B",
                      cursor: "pointer",
                      fontSize: 14,
                      ...TAP_BASE,
                      minHeight: 44,
                    }}
                  >
                    {e.nom} {e.postnom} {e.prenom}{" "}
                    <span style={{ color: dark ? "#94A3B8" : "#64748B" }}>({e.classe})</span>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <div
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 12px",
              border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
              borderRadius: 10,
              background: dark ? "#0F172A" : "#F8FAFC",
              color: dark ? "#F1F5F9" : "#1E293B",
              gap: 8, ...TAP_BASE, minHeight: 44,
            }}
          >
            <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 14 }}>
              {eleveSelectionne?.nom} {eleveSelectionne?.postnom} ({eleveSelectionne?.classe})
            </span>
            <Pressable
              onClick={() => { setSelectedEleve(""); setSearchEleve(""); }}
              dark={dark}
              style={{
                background: dark ? "#1E293B" : "#FFFFFF",
                border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
                borderRadius: 8, padding: "8px 12px",
                color: dark ? "#F1F5F9" : "#1E293B",
                fontSize: 12, fontWeight: 600, flexShrink: 0,
              }}
            >
              Changer
            </Pressable>
          </div>
        )}
      </div>

      {/* Matière */}
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>
          Matière <span style={{ color: "#EF4444" }} aria-hidden="true">*</span>
        </label>
        <input
          value={matiere}
          onChange={(e) => setMatiere(e.target.value)}
          disabled={!!matiereFixe}
          list="matieres-list"
          enterKeyHint="next"
          style={inputStyle(!matiere)}
          placeholder="Ex: Mathématiques"
        />
        <datalist id="matieres-list">
          {matieresUtilisees.map((m) => <option key={m} value={m} />)}
        </datalist>
      </div>

      {/* Note + Coeff */}
      <div style={{ display: "grid", gridTemplateColumns: gridColumns, gap: 12, marginBottom: 14 }}>
        <div>
          <label style={labelStyle}>
            Note (/{bareme}) <span style={{ color: "#EF4444" }} aria-hidden="true">*</span>
          </label>
          <input
            type="number" inputMode="decimal" enterKeyHint="next"
            step="0.01" min="0" max={bareme}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            style={inputStyle(note === "" || isNaN(parseFloat(note)))}
            placeholder="Ex: 15.5"
          />
          {pourcentage !== null && (
            <div style={{ fontSize: 11.5, color: dark ? "#94A3B8" : "#64748B", marginTop: 4, fontVariantNumeric: "tabular-nums" }}>
              {pourcentage}%
            </div>
          )}
        </div>
        <div>
          <label style={labelStyle}>Coefficient</label>
          <input
            type="number" inputMode="decimal" enterKeyHint="next"
            step="0.5" min="0.5"
            value={coefficient}
            onChange={(e) => setCoefficient(e.target.value)}
            style={inputStyle(!coefficient || isNaN(parseFloat(coefficient)) || parseFloat(coefficient) <= 0)}
            placeholder="1"
          />
        </div>
      </div>

      {/* Catégorie + Période */}
      <div style={{ display: "grid", gridTemplateColumns: gridColumns, gap: 12, marginBottom: 14 }}>
        <div>
          <label style={labelStyle}>Catégorie</label>
          <select value={categorie} onChange={(e) => setCategorie(e.target.value)} style={inputStyle(false)}>
            <option value="devoir">Devoir</option>
            <option value="examen">Examen</option>
            <option value="interrogation">Interrogation</option>
            <option value="exercice">Exercice</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>
            Période <span style={{ color: "#EF4444" }} aria-hidden="true">*</span>
          </label>
          <input
            value={periode}
            onChange={(e) => setPeriode(e.target.value)}
            enterKeyHint="next"
            style={inputStyle(!periode)}
            placeholder="1er Trimestre 2026"
          />
        </div>
      </div>

      {/* Appréciation */}
      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>Appréciation (optionnel)</label>
        <input
          value={appreciation}
          onChange={(e) => setAppreciation(e.target.value)}
          enterKeyHint="done"
          style={inputStyle(false)}
          placeholder="Ex: Bon travail"
        />
      </div>

      {/* Boutons */}
      <div style={{ display: "flex", gap: 10, flexDirection: isMobile ? "column" : "row" }}>
        <Pressable
          type="submit"
          disabled={submitting}
          dark={dark}
          aria-busy={submitting}
          style={{
            background: submitting ? "#A5B4FC" : dark ? "#818CF8" : "#4F46E5",
            color: "white", border: "none", borderRadius: 12,
            padding: "14px 18px", fontWeight: 700,
            cursor: submitting ? "not-allowed" : "pointer",
            flex: isMobile ? "none" : 1, fontSize: 14,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          {submitting && <Loader size={16} className="nm-spin" role="status" aria-label="Enregistrement" />}
          {submitting ? "Enregistrement…" : editId ? "Mettre à jour" : "Ajouter la note"}
        </Pressable>
        {editId && (
          <Pressable
            onClick={resetForm}
            dark={dark}
            style={{
              background: dark ? "#334155" : "#F1F5F9",
              border: "none", borderRadius: 12,
              padding: "14px 18px",
              color: dark ? "#F1F5F9" : "#1E293B",
              fontSize: 14, fontWeight: 600,
            }}
          >
            Annuler
          </Pressable>
        )}
      </div>
    </form>
  );
}

// ============================================================
// SOUS-COMPOSANT : Ajout groupé
// ============================================================
function AddNoteGroupe({
  eleves, matiereFixe, matieresUtilisees, upsertBulk, ecoleId, anneeId, userId,
  coursDisponibles, dark, isMobile,
}) {
  const [selectedEleveIds, setSelectedEleveIds] = useState([]);
  const [bulkMatiere, setBulkMatiere] = useState(matiereFixe || "");
  const [bulkNote, setBulkNote] = useState("");
  const [bulkCoefficient, setBulkCoefficient] = useState("1");
  const [bulkPeriode, setBulkPeriode] = useState("");
  const [bulkAppreciation, setBulkAppreciation] = useState("");
  const [bulkCategorie, setBulkCategorie] = useState("devoir");
  const [submitting, setSubmitting] = useState(false);
  const [searchEleve, setSearchEleve] = useState("");
  const [classeFilter, setClasseFilter] = useState("");

  const coursByNom = useMemo(() => new Map((coursDisponibles ?? []).map((c) => [c.nom, c])), [coursDisponibles]);
  const elevesTries = useMemo(() => [...eleves].sort(trierEleves), [eleves]);

  const elevesFiltres = useMemo(() => {
    let result = elevesTries;
    if (classeFilter) result = result.filter((e) => e.classe === classeFilter);
    if (searchEleve.trim()) {
      const q = searchEleve.toLowerCase();
      result = result.filter((e) => `${e.nom} ${e.postnom} ${e.prenom}`.toLowerCase().includes(q));
    }
    return result;
  }, [elevesTries, classeFilter, searchEleve]);

  const classesDisponibles = useMemo(
    () => [...new Set(eleves.map((e) => e.classe))].sort(),
    [eleves]
  );

  const cours = coursByNom.get(matiereFixe || bulkMatiere);
  const bareme = cours?.bareme ?? 20;

  const toggleEleve = (id) =>
    setSelectedEleveIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const selectAll = () => setSelectedEleveIds(elevesFiltres.map((e) => e._id));
  const deselectAll = () => setSelectedEleveIds([]);

  const validate = () => {
    if (selectedEleveIds.length === 0) return "Sélectionnez au moins un élève.";
    if (!bulkMatiere) return "Veuillez saisir la matière.";
    const n = parseFloat(bulkNote);
    if (isNaN(n) || n < 0 || n > bareme) return `La note doit être entre 0 et ${bareme}.`;
    if (!bulkPeriode) return "Veuillez indiquer la période.";
    const coeff = parseFloat(bulkCoefficient);
    if (!bulkCoefficient || isNaN(coeff) || coeff <= 0) return "Le coefficient doit être supérieur à 0.";
    if (!userId) return "Session invalide.";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    const error = validate();
    if (error) { toast.error(error); return; }
    setSubmitting(true);
    try {
      const count = await upsertBulk({
        eleveIds: selectedEleveIds, ecoleId,
        matiere: bulkMatiere,
        note: parseFloat(bulkNote),
        coefficient: parseFloat(bulkCoefficient) || 1,
        periode: bulkPeriode,
        appreciation: bulkAppreciation || undefined,
        anneeId, userId,
        categorie: bulkCategorie,
      });
      toast.success(`${count} notes enregistrées.`);
      setSelectedEleveIds([]); setBulkMatiere(matiereFixe || "");
      setBulkNote(""); setBulkCoefficient("1"); setBulkPeriode("");
      setBulkAppreciation(""); setBulkCategorie("devoir");
      setSearchEleve(""); setClasseFilter("");
    } catch (err) {
      toast.error(extractErrMsg(err, "Erreur lors de l'enregistrement"));
    } finally { setSubmitting(false); }
  };

  const inputStyle = (hasError = false) => ({
    width: "100%",
    padding: isMobile ? "12px 14px" : "10px 14px",
    border: `1px solid ${hasError ? "#EF4444" : dark ? "#334155" : "#E2E8F0"}`,
    borderRadius: 10,
    ...(isMobile ? INPUT_MOBILE : { fontSize: 14 }),
    outline: "none",
    background: dark ? "#0F172A" : "#F8FAFC",
    color: dark ? "#F1F5F9" : "#1E293B",
    boxSizing: "border-box",
    ...TAP_BASE,
    minHeight: 44,
  });

  const labelStyle = {
    display: "block", marginBottom: 6, fontWeight: 600, fontSize: 12,
    color: dark ? "#CBD5E1" : "#374151",
    textTransform: "uppercase", letterSpacing: 0.3,
  };

  const gridColumns = isMobile ? "1fr" : "1fr 1fr";

  return (
    <form onSubmit={handleSubmit}>
      {/* Filtres */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexDirection: isMobile ? "column" : "row" }}>
        <select
          value={classeFilter}
          onChange={(e) => setClasseFilter(e.target.value)}
          aria-label="Filtrer par classe"
          style={{ flex: 1, ...inputStyle(false) }}
        >
          <option value="">Toutes les classes</option>
          {classesDisponibles.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <div style={{ position: "relative", flex: 2 }}>
          <input
            type="text"
            inputMode="search"
            enterKeyHint="search"
            autoCorrect="off"
            spellCheck="false"
            placeholder="Rechercher…"
            value={searchEleve}
            onChange={(e) => setSearchEleve(e.target.value)}
            style={{ ...inputStyle(false), paddingLeft: 34 }}
          />
          <Search
            size={16}
            aria-hidden="true"
            style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: dark ? "#94A3B8" : "#64748B" }}
          />
        </div>
      </div>

      {/* Liste élèves */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
        <span style={{ fontWeight: 600, fontSize: 12, color: dark ? "#CBD5E1" : "#374151", textTransform: "uppercase", letterSpacing: 0.3 }}>
          Élèves concernés · {selectedEleveIds.length} sélectionné{selectedEleveIds.length > 1 ? "s" : ""}
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <Pressable
            onClick={selectAll}
            dark={dark}
            style={{
              background: "none", border: "none",
              color: dark ? "#818CF8" : "#4F46E5",
              fontSize: 12, fontWeight: 600,
              minHeight: 44, padding: "0 8px",
            }}
          >
            Tout
          </Pressable>
          <Pressable
            onClick={deselectAll}
            dark={dark}
            style={{
              background: "none", border: "none",
              color: dark ? "#94A3B8" : "#64748B",
              fontSize: 12, fontWeight: 600,
              minHeight: 44, padding: "0 8px",
            }}
          >
            Aucun
          </Pressable>
        </div>
      </div>

      <div
        style={{
          maxHeight: 200, overflowY: "auto",
          border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
          borderRadius: 10, padding: 6, marginBottom: 14,
          background: dark ? "#0F172A" : "#F8FAFC",
          ...SCROLL_AREA,
        }}
      >
        {elevesFiltres.length === 0 && (
          <p style={{ textAlign: "center", color: dark ? "#94A3B8" : "#64748B", padding: "16px 0", margin: 0, fontSize: 13 }}>
            Aucun élève trouvé
          </p>
        )}
        {elevesFiltres.map((e) => {
          const isSelected = selectedEleveIds.includes(e._id);
          return (
            <label
              key={e._id}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 10px",
                fontSize: 13.5, cursor: "pointer", borderRadius: 8,
                background: isSelected ? (dark ? "#312E81" : "#EEF2FF") : "transparent",
                minHeight: 44,
                ...TAP_BASE,
              }}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleEleve(e._id)}
                style={{ width: 22, height: 22, accentColor: dark ? "#818CF8" : "#4F46E5", flexShrink: 0 }}
              />
              <span style={{ color: dark ? "#F1F5F9" : "#1E293B" }}>
                {e.nom} {e.postnom} {e.prenom}{" "}
                <span style={{ color: dark ? "#94A3B8" : "#64748B" }}>({e.classe})</span>
              </span>
            </label>
          );
        })}
      </div>

      {/* Champs */}
      <div style={{ display: "grid", gridTemplateColumns: gridColumns, gap: 12, marginBottom: 14 }}>
        <div>
          <label style={labelStyle}>Matière</label>
          <input
            value={bulkMatiere}
            onChange={(e) => setBulkMatiere(e.target.value)}
            disabled={!!matiereFixe}
            list="matieres-bulk"
            enterKeyHint="next"
            style={inputStyle(!bulkMatiere)}
            placeholder="Matière"
          />
          <datalist id="matieres-bulk">
            {matieresUtilisees.map((m) => <option key={m} value={m} />)}
          </datalist>
        </div>
        <div>
          <label style={labelStyle}>Note (/{bareme})</label>
          <input
            type="number" inputMode="decimal" enterKeyHint="next"
            step="0.01" min="0" max={bareme}
            value={bulkNote}
            onChange={(e) => setBulkNote(e.target.value)}
            style={inputStyle(bulkNote === "" || isNaN(parseFloat(bulkNote)))}
            placeholder="Ex: 15.5"
          />
        </div>
        <div>
          <label style={labelStyle}>Coefficient</label>
          <input
            type="number" inputMode="decimal" enterKeyHint="next"
            step="0.5" min="0.5"
            value={bulkCoefficient}
            onChange={(e) => setBulkCoefficient(e.target.value)}
            style={inputStyle(!bulkCoefficient || isNaN(parseFloat(bulkCoefficient)) || parseFloat(bulkCoefficient) <= 0)}
            placeholder="1"
          />
        </div>
        <div>
          <label style={labelStyle}>Période</label>
          <input
            value={bulkPeriode}
            onChange={(e) => setBulkPeriode(e.target.value)}
            enterKeyHint="next"
            style={inputStyle(!bulkPeriode)}
            placeholder="1er Trimestre 2026"
          />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: gridColumns, gap: 12, marginBottom: 18 }}>
        <div>
          <label style={labelStyle}>Catégorie</label>
          <select value={bulkCategorie} onChange={(e) => setBulkCategorie(e.target.value)} style={inputStyle(false)}>
            <option value="devoir">Devoir</option>
            <option value="examen">Examen</option>
            <option value="interrogation">Interrogation</option>
            <option value="exercice">Exercice</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Appréciation (optionnel)</label>
          <input
            value={bulkAppreciation}
            onChange={(e) => setBulkAppreciation(e.target.value)}
            enterKeyHint="done"
            style={inputStyle(false)}
            placeholder="Bon travail"
          />
        </div>
      </div>

      <Pressable
        type="submit"
        disabled={submitting || selectedEleveIds.length === 0 || !bulkMatiere || !bulkNote || !bulkPeriode}
        dark={dark}
        aria-busy={submitting}
        style={{
          background: submitting ? "#A5B4FC" : dark ? "#818CF8" : "#4F46E5",
          color: "white", border: "none", borderRadius: 12,
          padding: "14px 18px", fontWeight: 700,
          cursor: submitting ? "not-allowed" : "pointer",
          width: "100%", fontSize: 14,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          opacity: selectedEleveIds.length === 0 || !bulkMatiere || !bulkNote || !bulkPeriode ? 0.5 : 1,
        }}
      >
        {submitting && <Loader size={16} className="nm-spin" role="status" aria-label="Enregistrement" />}
        {submitting ? "Enregistrement…" : `Appliquer à ${selectedEleveIds.length} élève(s)`}
      </Pressable>
    </form>
  );
}