import { useState, useEffect, useCallback, useId } from "react";
import {
  X, Loader, Edit2, Trash2, BookOpen, Users, GraduationCap,
} from "lucide-react";
import toast from "react-hot-toast";

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

const INPUT_MOBILE = { fontSize: 16 }; // évite zoom iOS

const FOCUS_RING = (dark) => ({
  outline: `2px solid ${dark ? "#818CF8" : "#4F46E5"}`,
  outlineOffset: 2,
});

function extractErrMsg(err, fallback = "Erreur inconnue") {
  if (!err) return fallback;
  if (typeof err === "string") return err;
  if (typeof err === "object" && err.message) return err.message;
  return fallback;
}

// ============================================================
// KEYFRAMES (module-level, rendus UNE fois)
// ============================================================
const ModalKeyframes = (
  <style>{`
    @keyframes cm-slideUp {
      from { transform: translateY(100%); }
      to   { transform: translateY(0); }
    }
    @keyframes cm-fadeIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    @keyframes cm-spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
    .cm-spin { animation: cm-spin 1s linear infinite; }
    @media (prefers-reduced-motion: reduce) {
      .cm-spin, .cm-slideUp, .cm-fadeIn { animation: none !important; }
    }
  `}</style>
);

// ============================================================
// PRESSABLE — feedback tap + focus ring via state React
// ============================================================
function Pressable({
  onClick, style, children, disabled = false, type = "button",
  dark = false, ariaLabel, ...rest
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
// MODALE AJOUT / ÉDITION DE COURS
// ============================================================
export function AddCoursModal({
  open, onClose, initialMode = "individuel", initialData = null,
  classes, addCours, updateCours, addBulk,
  ecoleId, anneeId, userId, dark, isMobile,
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
          style={{
            width: 40, height: 4, borderRadius: 2,
            background: dark ? "#475569" : "#CBD5E1",
            margin: "0 auto 14px",
          }}
        />
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3
          id={titleId}
          style={{ margin: 0, fontSize: 17, fontWeight: 700, color: dark ? "#F1F5F9" : "#1E293B" }}
        >
          {initialData ? "Modifier le cours" : "Nouveau cours"}
        </h3>
        <Pressable
          onClick={onClose}
          dark={dark}
          ariaLabel="Fermer"
          style={{
            background: "none", border: "none",
            color: dark ? "#94A3B8" : "#64748B",
            padding: 8, minWidth: 44, minHeight: 44,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <X size={22} aria-hidden="true" />
        </Pressable>
      </div>

      {/* Onglets */}
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
                  padding: "12px 14px",
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
        <AddCoursIndividuel
          classes={classes} addCours={addCours} updateCours={updateCours}
          ecoleId={ecoleId} anneeId={anneeId} userId={userId}
          initialData={initialData} onSuccess={onClose}
          dark={dark} isMobile={isMobile}
        />
      ) : (
        <AddCoursGroupe
          classes={classes} addBulk={addBulk}
          ecoleId={ecoleId} anneeId={anneeId} userId={userId}
          onSuccess={onClose} dark={dark} isMobile={isMobile}
        />
      )}
    </>
  );

  if (isMobile) {
    return (
      <>
        {ModalKeyframes}
        <div
          onClick={onClose}
          aria-hidden="true"
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
            zIndex: 1200, animation: "cm-fadeIn 0.18s ease-out",
          }}
        />
        <div
          className="cm-slideUp"
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
            animation: "cm-slideUp 0.25s cubic-bezier(0.22, 1, 0.36, 1)",
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
      {ModalKeyframes}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1200, padding: 16, animation: "cm-fadeIn 0.2s ease-out",
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          style={{
            background: dark ? "#1E293B" : "#FFFFFF",
            borderRadius: 16, padding: 24,
            width: "100%", maxWidth: 640, maxHeight: "90vh", overflowY: "auto",
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
// MODALE DÉTAIL D'UN COURS
// ============================================================
export function DetailCoursModal({ cours, onClose, onEdit, onDelete, dark, isMobile }) {
  const titleId = useId();
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const accent = dark ? "#818CF8" : "#4F46E5";

  return (
    <>
      {/* ✅ FIX — Keyframes injectés ICI aussi (sinon cm-fadeIn ne joue pas) */}
      {ModalKeyframes}
      <div
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: isMobile ? "flex-end" : "center",
          justifyContent: "center", zIndex: 1300,
          padding: isMobile ? 0 : 16, animation: "cm-fadeIn 0.2s ease-out",
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
            width: "100%", maxWidth: isMobile ? "100%" : 480,
            maxHeight: "92vh", overflowY: "auto",
            boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
            border: `1px solid ${cardBorder}`,
            ...SCROLL_AREA,
          }}
        >
          {isMobile && (
            <div
              aria-hidden="true"
              style={{
                width: 40, height: 4, borderRadius: 2,
                background: dark ? "#475569" : "#CBD5E1",
                margin: "0 auto 14px",
              }}
            />
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <h3 id={titleId} style={{ margin: 0, fontSize: 17, fontWeight: 700, color: textPrimary }}>
              Détail du cours
            </h3>
            <Pressable
              onClick={onClose}
              dark={dark}
              ariaLabel="Fermer"
              style={{
                background: "none", border: "none", color: textSecondary,
                padding: 8, minWidth: 44, minHeight: 44,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <X size={22} aria-hidden="true" />
            </Pressable>
          </div>

          {/* Icône + Nom */}
          <div
            style={{
              display: "flex", alignItems: "center", gap: 14,
              padding: 14, marginBottom: 18,
              background: dark ? "#0F172A" : "#F8FAFC",
              borderRadius: 12, border: `1px solid ${cardBorder}`,
            }}
          >
            <div
              aria-hidden="true"
              style={{
                width: 48, height: 48, borderRadius: "50%",
                background: dark ? "#312E81" : "#EEF2FF",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: accent, flexShrink: 0,
              }}
            >
              <BookOpen size={24} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: textPrimary, wordBreak: "break-word" }}>
                {cours.nom}
              </div>
              <div style={{ fontSize: 12.5, color: textSecondary, marginTop: 2 }}>
                Classe {cours.classe}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <DetailRow label="Coefficient" value={cours.coefficient ?? 1} dark={dark} />
            <DetailRow label="Barème" value={cours.bareme ?? 20} dark={dark} />
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
              background: "transparent",
              border: `1px solid ${cardBorder}`,
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

function DetailRow({ label, value, dark }) {
  return (
    <div
      style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "10px 12px", borderRadius: 10,
        background: dark ? "#0F172A" : "#F8FAFC",
        border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
      }}
    >
      <span
        style={{
          fontSize: 12, fontWeight: 600,
          color: dark ? "#94A3B8" : "#64748B",
          textTransform: "uppercase", letterSpacing: 0.3,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 15, fontWeight: 700,
          color: dark ? "#F1F5F9" : "#1E293B",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </span>
    </div>
  );
}

// ============================================================
// SOUS-COMPOSANT : Ajout individuel
// ============================================================
function AddCoursIndividuel({
  classes, addCours, updateCours, ecoleId, anneeId, userId,
  initialData, onSuccess, dark, isMobile,
}) {
  const nomId = useId();
  const classeId = useId();
  const coeffId = useId();
  const baremeId = useId();

  const [nom, setNom] = useState(initialData?.nom || "");
  const [classe, setClasse] = useState(initialData?.classe || "");
  const [coefficient, setCoefficient] = useState(initialData?.coefficient?.toString() || "1");
  const [bareme, setBareme] = useState(initialData?.bareme?.toString() || "20");
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState(initialData?._id || null);

  const resetForm = useCallback(() => {
    setNom(""); setClasse(""); setCoefficient("1"); setBareme("20"); setEditId(null);
    if (onSuccess) onSuccess();
  }, [onSuccess]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (adding) return;
    if (!userId) { toast.error("Session invalide."); return; }
    if (!nom.trim() || !classe) { toast.error("Veuillez remplir tous les champs obligatoires."); return; }
    const coeffNum = parseFloat(coefficient);
    const baremeNum = parseFloat(bareme);
    if (isNaN(coeffNum) || coeffNum <= 0) { toast.error("Coefficient invalide."); return; }
    if (isNaN(baremeNum) || baremeNum <= 0) { toast.error("Barème invalide."); return; }

    setAdding(true);
    try {
      if (editId) {
        await updateCours({ id: editId, nom: nom.trim(), classe, coefficient: coeffNum, bareme: baremeNum, userId });
        toast.success("Cours mis à jour");
      } else {
        await addCours({ nom: nom.trim(), classe, coefficient: coeffNum, bareme: baremeNum, ecoleId, anneeId, userId });
        toast.success("Cours ajouté");
      }
      resetForm();
    } catch (err) {
      toast.error(extractErrMsg(err, "Erreur lors de l'enregistrement"));
    } finally { setAdding(false); }
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
    fontFamily: "inherit",
    appearance: "none",
    WebkitAppearance: "none",
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
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle} htmlFor={nomId}>
          Nom du cours <span style={{ color: "#EF4444" }} aria-hidden="true">*</span>
        </label>
        <input
          id={nomId}
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          placeholder="Ex: Mathématiques"
          enterKeyHint="next"
          autoCorrect="off"
          spellCheck="false"
          style={inputStyle(!nom.trim())}
        />
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle} htmlFor={classeId}>
          Classe <span style={{ color: "#EF4444" }} aria-hidden="true">*</span>
        </label>
        <select
          id={classeId}
          value={classe}
          onChange={(e) => setClasse(e.target.value)}
          style={inputStyle(!classe)}
        >
          <option value="">-- Choisir une classe --</option>
          {classes.map((c) => (
            <option key={c._id} value={c.nom}>{c.nom}</option>
          ))}
        </select>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: gridColumns, gap: 12, marginBottom: 20 }}>
        <div>
          <label style={labelStyle} htmlFor={coeffId}>Coefficient</label>
          <input
            id={coeffId}
            type="number" inputMode="decimal" enterKeyHint="next"
            step="0.5" min="0.5"
            value={coefficient}
            onChange={(e) => setCoefficient(e.target.value)}
            style={inputStyle(!coefficient || isNaN(parseFloat(coefficient)) || parseFloat(coefficient) <= 0)}
          />
        </div>
        <div>
          <label style={labelStyle} htmlFor={baremeId}>Barème (note max)</label>
          <input
            id={baremeId}
            type="number" inputMode="decimal" enterKeyHint="done"
            step="1" min="1"
            value={bareme}
            onChange={(e) => setBareme(e.target.value)}
            style={inputStyle(!bareme || isNaN(parseFloat(bareme)) || parseFloat(bareme) <= 0)}
          />
        </div>
      </div>

      <Pressable
        type="submit"
        disabled={adding || !nom.trim() || !classe}
        dark={dark}
        aria-busy={adding}
        style={{
          background: adding ? "#A5B4FC" : dark ? "#818CF8" : "#4F46E5",
          color: "white", border: "none", borderRadius: 12,
          padding: "14px 18px", fontWeight: 700,
          cursor: adding ? "not-allowed" : "pointer",
          width: "100%", fontSize: 14,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}
      >
        {adding && <Loader size={16} className="cm-spin" role="status" aria-label="Enregistrement" />}
        {adding ? "Enregistrement…" : editId ? "Mettre à jour" : "Ajouter le cours"}
      </Pressable>
      {editId && (
        <Pressable
          onClick={resetForm}
          dark={dark}
          style={{
            background: dark ? "#334155" : "#F1F5F9",
            border: "none", borderRadius: 12,
            padding: "14px 18px", fontWeight: 600,
            width: "100%", marginTop: 8,
            color: dark ? "#F1F5F9" : "#1E293B",
            fontSize: 14,
          }}
        >
          Annuler
        </Pressable>
      )}
    </form>
  );
}

// ============================================================
// SOUS-COMPOSANT : Ajout groupé
// ============================================================
function AddCoursGroupe({
  classes, addBulk, ecoleId, anneeId, userId,
  onSuccess, dark, isMobile,
}) {
  const nomId = useId();
  const coeffId = useId();
  const baremeId = useId();

  const [bulkNom, setBulkNom] = useState("");
  const [bulkCoefficient, setBulkCoefficient] = useState("1");
  const [bulkBareme, setBulkBareme] = useState("20");
  const [selectedClasses, setSelectedClasses] = useState([]);
  const [adding, setAdding] = useState(false);

  const toggleClass = (classe) => {
    setSelectedClasses((prev) =>
      prev.includes(classe) ? prev.filter((c) => c !== classe) : [...prev, classe]
    );
  };
  const selectAll = () => setSelectedClasses(classes.map((c) => c.nom));
  const deselectAll = () => setSelectedClasses([]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (adding) return;
    if (!userId) { toast.error("Session invalide."); return; }
    if (!bulkNom.trim() || selectedClasses.length === 0) return;
    const coeffNum = parseFloat(bulkCoefficient);
    const baremeNum = parseFloat(bulkBareme);
    if (isNaN(coeffNum) || coeffNum <= 0) { toast.error("Coefficient invalide."); return; }
    if (isNaN(baremeNum) || baremeNum <= 0) { toast.error("Barème invalide."); return; }
    setAdding(true);
    try {
      await addBulk({
        nom: bulkNom.trim(), coefficient: coeffNum, bareme: baremeNum,
        classes: selectedClasses, ecoleId, anneeId, userId,
      });
      toast.success(`Cours ajouté à ${selectedClasses.length} classe(s)`);
      setBulkNom(""); setBulkCoefficient("1"); setBulkBareme("20");
      setSelectedClasses([]);
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(extractErrMsg(err, "Erreur lors de l'ajout"));
    } finally { setAdding(false); }
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
    fontFamily: "inherit",
    appearance: "none",
    WebkitAppearance: "none",
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
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle} htmlFor={nomId}>
          Nom du cours <span style={{ color: "#EF4444" }} aria-hidden="true">*</span>
        </label>
        <input
          id={nomId}
          value={bulkNom}
          onChange={(e) => setBulkNom(e.target.value)}
          placeholder="Ex: Mathématiques"
          enterKeyHint="next"
          autoCorrect="off"
          spellCheck="false"
          style={inputStyle(!bulkNom.trim())}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: gridColumns, gap: 12, marginBottom: 14 }}>
        <div>
          <label style={labelStyle} htmlFor={coeffId}>Coefficient</label>
          <input
            id={coeffId}
            type="number" inputMode="decimal" enterKeyHint="next"
            step="0.5" min="0.5"
            value={bulkCoefficient}
            onChange={(e) => setBulkCoefficient(e.target.value)}
            style={inputStyle(!bulkCoefficient || isNaN(parseFloat(bulkCoefficient)) || parseFloat(bulkCoefficient) <= 0)}
          />
        </div>
        <div>
          <label style={labelStyle} htmlFor={baremeId}>Barème (note max)</label>
          <input
            id={baremeId}
            type="number" inputMode="decimal" enterKeyHint="done"
            step="1" min="1"
            value={bulkBareme}
            onChange={(e) => setBulkBareme(e.target.value)}
            style={inputStyle(!bulkBareme || isNaN(parseFloat(bulkBareme)) || parseFloat(bulkBareme) <= 0)}
          />
        </div>
      </div>

      {/* Classes */}
      <div
        style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: 8, flexWrap: "wrap", gap: 8,
        }}
      >
        <span
          style={{
            fontWeight: 600, fontSize: 12,
            color: dark ? "#CBD5E1" : "#374151",
            textTransform: "uppercase", letterSpacing: 0.3,
          }}
        >
          Classes · {selectedClasses.length} sélectionnée{selectedClasses.length > 1 ? "s" : ""}
        </span>
        <div style={{ display: "flex", gap: 4 }}>
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
          borderRadius: 10, padding: 6, marginBottom: 18,
          background: dark ? "#0F172A" : "#F8FAFC",
          ...SCROLL_AREA,
        }}
      >
        {classes.map((c) => {
          const isSelected = selectedClasses.includes(c.nom);
          return (
            <label
              key={c._id}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 10px", fontSize: 13.5,
                cursor: "pointer", borderRadius: 8,
                background: isSelected ? (dark ? "#312E81" : "#EEF2FF") : "transparent",
                minHeight: 44, ...TAP_BASE,
              }}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleClass(c.nom)}
                style={{
                  width: 22, height: 22,
                  accentColor: dark ? "#818CF8" : "#4F46E5",
                  flexShrink: 0,
                }}
              />
              <span style={{ color: dark ? "#F1F5F9" : "#1E293B" }}>{c.nom}</span>
            </label>
          );
        })}
      </div>

      <Pressable
        type="submit"
        disabled={adding || !bulkNom.trim() || selectedClasses.length === 0}
        dark={dark}
        aria-busy={adding}
        style={{
          background: adding ? "#A5B4FC" : dark ? "#818CF8" : "#4F46E5",
          color: "white", border: "none", borderRadius: 12,
          padding: "14px 18px", fontWeight: 700,
          cursor: adding || !bulkNom.trim() || selectedClasses.length === 0 ? "not-allowed" : "pointer",
          width: "100%", fontSize: 14,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          opacity: !bulkNom.trim() || selectedClasses.length === 0 ? 0.5 : 1,
        }}
      >
        {adding && <Loader size={16} className="cm-spin" role="status" aria-label="Ajout en cours" />}
        {adding ? "Ajout en cours…" : `Ajouter à ${selectedClasses.length} classe(s)`}
      </Pressable>
    </form>
  );
}