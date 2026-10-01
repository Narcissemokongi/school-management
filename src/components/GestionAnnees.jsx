import { useState, useMemo, useCallback, useId } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useConfirm } from "@/hooks/useConfirm";
import { ConfirmDialog } from "./ConfirmDialog";
import toast from "react-hot-toast";
import {
  Loader, Calendar, CheckCircle2, Plus, Clock,
  Trash2, Edit2, Search, ChevronUp, ChevronDown,
  CalendarDays, Check, X, AlertCircle,
} from "lucide-react";

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

const INPUT_MOBILE = { fontSize: 16 }; // évite zoom iOS

const FOCUS_RING = (dark) => ({
  outline: `2px solid ${dark ? "#818CF8" : "#4F46E5"}`,
  outlineOffset: 2,
});

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
// KEYFRAMES MODULE-LEVEL
// ============================================================
function GaKeyframes() {
  return (
    <style>{`
      @keyframes ga-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      .ga-spin { animation: ga-spin 1s linear infinite; }
      @media (prefers-reduced-motion: reduce) {
        .ga-spin { animation: none !important; }
      }
    `}</style>
  );
}

// ============================================================
// PRESSABLE — feedback tap + focus ring via state React
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
// COMPOSANT PRINCIPAL
// ============================================================
export function GestionAnnees({ ecoleId, userId }) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();
  const { confirm, dialogProps } = useConfirm();

  const regionId = useId();
  const searchId = useId();
  const newNameId = useId();

  // États
  const [nouveauNom, setNouveauNom] = useState("");
  const [adding, setAdding] = useState(false);
  const [activating, setActivating] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("nom");
  const [sortDir, setSortDir] = useState("asc");
  const [editingId, setEditingId] = useState(null);
  const [editingNom, setEditingNom] = useState("");
  const [savingRename, setSavingRename] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const anneesRaw = useQuery(
    api.anneesScolaires.listByEcole,
    ecoleId && userId ? { ecoleId, userId } : "skip"
  );

  const addAnnee = useMutation(api.anneesScolaires.add);
  const setActive = useMutation(api.anneesScolaires.setActive);
  const removeAnnee = useMutation(api.anneesScolaires.remove);
  const renameAnnee = useMutation(api.anneesScolaires.rename);

  // Couleurs
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const inputBg = dark ? "#0F172A" : "#F8FAFC";
  const inputText = dark ? "#F1F5F9" : "#1E293B";
  const accent = dark ? "#818CF8" : "#4F46E5";
  const accentBg = dark ? "#312E81" : "#EEF2FF";
  const success = dark ? "#34D399" : "#10B981";
  const successBg = dark ? "#064E3B" : "#D1FAE5";
  const successText = dark ? "#34D399" : "#065F46";
  const danger = dark ? "#F87171" : "#EF4444";
  const shadow = dark
    ? "0 1px 3px rgba(0,0,0,0.3)"
    : "0 1px 3px rgba(0,0,0,0.05)";

  // Stats
  const stats = useMemo(() => {
    const list = anneesRaw ?? [];
    const total = list.length;
    const active = list.filter((a) => a.estActive).length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [anneesRaw]);

  // Tri + filtrage
  const filteredAndSorted = useMemo(() => {
    if (!anneesRaw) return [];
    let result = [...anneesRaw];
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter((a) => a.nom.toLowerCase().includes(q));
    }
    result.sort((a, b) => {
      let valA, valB;
      if (sortBy === "nom") {
        valA = a.nom.toLowerCase();
        valB = b.nom.toLowerCase();
      } else {
        valA = a.estActive ? 1 : 0;
        valB = b.estActive ? 1 : 0;
      }
      if (valA === valB) return 0;
      if (sortDir === "asc") return valA < valB ? -1 : 1;
      return valA > valB ? -1 : 1;
    });
    return result;
  }, [anneesRaw, searchTerm, sortBy, sortDir]);

  // ============================================================
  // HANDLERS
  // ============================================================
  const handleAdd = useCallback(
    async (e) => {
      e.preventDefault();
      if (adding) return;
      if (!nouveauNom.trim() || !ecoleId) return;
      if (!userId) {
        toast.error("Session expirée, veuillez vous reconnecter.");
        return;
      }
      setAdding(true);
      try {
        await addAnnee({
          nom: nouveauNom.trim(),
          ecoleId,
          estActive: false,
          userId,
        });
        setNouveauNom("");
        toast.success("Année scolaire ajoutée");
      } catch (err) {
        toast.error(extractErrMsg(err, "Erreur lors de l'ajout"));
      } finally {
        setAdding(false);
      }
    },
    [adding, nouveauNom, ecoleId, userId, addAnnee]
  );

  const handleActivate = useCallback(
    async (anneeId, nom) => {
      if (!userId) {
        toast.error("Session expirée, veuillez vous reconnecter.");
        return;
      }
      const ok = await confirm(
        "Activer l'année scolaire",
        `Voulez-vous activer l'année scolaire "${nom}" ? Les autres années seront désactivées.`
      );
      if (!ok) return;
      setActivating(anneeId);
      try {
        await setActive({ anneeId, userId });
        toast.success(`Année ${nom} activée`);
      } catch (err) {
        toast.error(extractErrMsg(err, "Erreur lors de l'activation"));
      } finally {
        setActivating(null);
      }
    },
    [userId, confirm, setActive]
  );

  const handleDelete = useCallback(
    async (anneeId, nom) => {
      if (!userId) {
        toast.error("Session expirée, veuillez vous reconnecter.");
        return;
      }
      const ok = await confirm(
        "Supprimer l'année scolaire",
        `Voulez-vous vraiment supprimer l'année "${nom}" ? Cette action est irréversible.`
      );
      if (!ok) return;
      setDeletingId(anneeId);
      try {
        await removeAnnee({ id: anneeId, userId });
        toast.success("Année supprimée");
      } catch (err) {
        toast.error(extractErrMsg(err, "Erreur lors de la suppression"));
      } finally {
        setDeletingId(null);
      }
    },
    [userId, confirm, removeAnnee]
  );

  const startRename = (annee) => {
    setEditingId(annee._id);
    setEditingNom(annee.nom);
  };

  const cancelRename = useCallback(() => {
    setEditingId(null);
    setEditingNom("");
  }, []);

  const saveRename = useCallback(
    async (id) => {
      if (!userId) {
        toast.error("Session expirée, veuillez vous reconnecter.");
        return;
      }
      const trimmed = editingNom.trim();
      const annee = anneesRaw?.find((a) => a._id === id);
      if (!trimmed || trimmed === annee?.nom) {
        cancelRename();
        return;
      }
      setSavingRename(true);
      try {
        await renameAnnee({ id, nom: trimmed, userId });
        toast.success("Année renommée");
        cancelRename();
      } catch (err) {
        toast.error(extractErrMsg(err, "Erreur lors du renommage"));
      } finally {
        setSavingRename(false);
      }
    },
    [userId, editingNom, anneesRaw, cancelRename, renameAnnee]
  );

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir("asc");
    }
  };

  // ============================================================
  // LOADING
  // ============================================================
  if (anneesRaw === undefined) {
    return (
      <>
        <GaKeyframes />
        <div
          role="status"
          aria-busy="true"
          aria-live="polite"
          style={{
            background: cardBg,
            border: `1px solid ${cardBorder}`,
            borderRadius: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 40,
          }}
        >
          <Loader
            size={24}
            className="ga-spin"
            style={{ color: accent }}
            aria-hidden="true"
          />
          <span style={{ position: "absolute", left: -9999 }}>
            Chargement des années scolaires
          </span>
        </div>
      </>
    );
  }

  // Styles
  const inputStyle = (hasError = false) => ({
    width: "100%",
    padding: isMobile ? "12px 14px" : "10px 14px",
    border: `1px solid ${hasError ? danger : cardBorder}`,
    borderRadius: 10,
    ...(isMobile ? INPUT_MOBILE : { fontSize: 14 }),
    outline: "none",
    background: inputBg,
    color: inputText,
    boxSizing: "border-box",
    fontFamily: "inherit",
    appearance: "none",
    WebkitAppearance: "none",
    ...TAP_BASE,
    minHeight: 44,
  });

  const btnSecondary = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: "10px 12px",
    border: `1px solid ${cardBorder}`,
    borderRadius: 10,
    background: "transparent",
    color: textPrimary,
    fontWeight: 600,
    fontSize: 13,
    ...TAP_BASE,
    minHeight: 44,
  };

  return (
    <div
      role="region"
      aria-labelledby={regionId}
      style={{
        background: cardBg,
        border: `1px solid ${cardBorder}`,
        boxShadow: shadow,
        borderRadius: 14,
        padding: isMobile ? 14 : 18,
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <GaKeyframes />

      {/* ==================== EN-TÊTE ==================== */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 14,
          paddingBottom: 12,
          borderBottom: `1px solid ${cardBorder}`,
          flexWrap: "wrap",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: accentBg,
            color: accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <CalendarDays size={16} />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            id={regionId}
            style={{
              fontSize: isMobile ? 14 : 15,
              fontWeight: 700,
              color: textPrimary,
              lineHeight: 1.2,
            }}
          >
            Années scolaires
          </div>
          <div
            style={{
              fontSize: 11,
              color: textSecondary,
              marginTop: 1,
            }}
          >
            {stats.total} année{stats.total > 1 ? "s" : ""} · {stats.active}{" "}
            active{stats.active > 1 ? "s" : ""}
          </div>
        </div>
        {stats.active > 0 && (
          <span
            style={{
              background: successBg,
              color: successText,
              padding: "3px 10px",
              borderRadius: 12,
              fontSize: 11,
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <CheckCircle2 size={11} aria-hidden="true" />
            {stats.active} active{stats.active > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* ==================== FORMULAIRE AJOUT ==================== */}
      <form
        onSubmit={handleAdd}
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 12,
          flexDirection: isMobile ? "column" : "row",
        }}
      >
        <label htmlFor={newNameId} style={{ position: "absolute", left: -9999 }}>
          Nom de la nouvelle année scolaire
        </label>
        <input
          id={newNameId}
          placeholder="Ex : 2025-2026"
          aria-label="Nom de la nouvelle année scolaire"
          value={nouveauNom}
          onChange={(e) => setNouveauNom(e.target.value)}
          enterKeyHint="done"
          autoCorrect="off"
          spellCheck="false"
          style={{ ...inputStyle(false), flex: 1 }}
        />
        <Pressable
          type="submit"
          disabled={adding || !nouveauNom.trim()}
          dark={dark}
          aria-busy={adding}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            padding: isMobile ? "12px 16px" : "10px 18px",
            background:
              adding || !nouveauNom.trim()
                ? dark
                  ? "#334155"
                  : "#CBD5E1"
                : accent,
            color: adding || !nouveauNom.trim() ? textSecondary : "#FFFFFF",
            border: "none",
            borderRadius: 10,
            fontWeight: 700,
            cursor: adding || !nouveauNom.trim() ? "not-allowed" : "pointer",
            fontSize: 13.5,
            width: isMobile ? "100%" : "auto",
            whiteSpace: "nowrap",
          }}
        >
          {adding ? (
            <Loader size={14} className="ga-spin" role="status" aria-label="Ajout en cours" />
          ) : (
            <Plus size={14} aria-hidden="true" />
          )}
          {adding ? "Ajout…" : "Ajouter"}
        </Pressable>
      </form>

      {/* ==================== RECHERCHE + TRI ==================== */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 12,
          flexDirection: isMobile ? "column" : "row",
          alignItems: isMobile ? "stretch" : "center",
        }}
      >
        <div style={{ position: "relative", flex: 1 }}>
          <label htmlFor={searchId} style={{ position: "absolute", left: -9999 }}>
            Rechercher une année scolaire
          </label>
          <Search
            size={16}
            aria-hidden="true"
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: textSecondary,
              pointerEvents: "none",
            }}
          />
          <input
            id={searchId}
            type="search"
            inputMode="search"
            enterKeyHint="search"
            autoCorrect="off"
            spellCheck="false"
            placeholder="Rechercher une année…"
            aria-label="Rechercher une année scolaire"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ ...inputStyle(false), paddingLeft: 36 }}
          />
        </div>
        <div
          style={{
            display: "flex",
            gap: 6,
            width: isMobile ? "100%" : "auto",
          }}
        >
          <Pressable
            onClick={() => toggleSort("nom")}
            dark={dark}
            ariaLabel={`Trier par nom ${sortBy === "nom" ? (sortDir === "asc" ? "croissant" : "décroissant") : ""}`}
            aria-pressed={sortBy === "nom"}
            style={{
              ...btnSecondary,
              background: sortBy === "nom" ? accentBg : "transparent",
              border: `1px solid ${sortBy === "nom" ? accent : cardBorder}`,
              color: sortBy === "nom" ? accent : textSecondary,
              fontSize: 12.5,
              flex: isMobile ? 1 : "none",
            }}
          >
            Nom
            {sortBy === "nom" &&
              (sortDir === "asc" ? (
                <ChevronUp size={13} aria-hidden="true" />
              ) : (
                <ChevronDown size={13} aria-hidden="true" />
              ))}
          </Pressable>
          <Pressable
            onClick={() => toggleSort("statut")}
            dark={dark}
            ariaLabel={`Trier par statut ${sortBy === "statut" ? (sortDir === "asc" ? "croissant" : "décroissant") : ""}`}
            aria-pressed={sortBy === "statut"}
            style={{
              ...btnSecondary,
              background: sortBy === "statut" ? accentBg : "transparent",
              border: `1px solid ${sortBy === "statut" ? accent : cardBorder}`,
              color: sortBy === "statut" ? accent : textSecondary,
              fontSize: 12.5,
              flex: isMobile ? 1 : "none",
            }}
          >
            Statut
            {sortBy === "statut" &&
              (sortDir === "asc" ? (
                <ChevronUp size={13} aria-hidden="true" />
              ) : (
                <ChevronDown size={13} aria-hidden="true" />
              ))}
          </Pressable>
        </div>
      </div>

      {/* ==================== LISTE ==================== */}
      <ul
        role="list"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          listStyle: "none",
          padding: 0,
          margin: 0,
          ...SCROLL_AREA,
        }}
      >
        {filteredAndSorted.length === 0 && (
          <li
            role="status"
            aria-live="polite"
            style={{
              textAlign: "center",
              padding: "24px 16px",
              color: textSecondary,
            }}
          >
            <Calendar
              size={32}
              aria-hidden="true"
              style={{ marginBottom: 8, opacity: 0.5 }}
            />
            <p style={{ margin: 0, fontSize: 13 }}>
              {searchTerm
                ? "Aucune année ne correspond à la recherche."
                : "Aucune année scolaire enregistrée."}
            </p>
          </li>
        )}

        {filteredAndSorted.map((annee) => {
          const isEditing = editingId === annee._id;
          const isActive = annee.estActive;
          const isActivating = activating === annee._id;
          const isDeleting = deletingId === annee._id;

          return (
            <li key={annee._id}>
              <article
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: isMobile ? "10px 12px" : "10px 14px",
                  borderRadius: 10,
                  border: `1px solid ${isActive ? success : cardBorder}`,
                  background: isActive
                    ? successBg
                    : dark
                    ? "transparent"
                    : "#FFFFFF",
                  flexWrap: isMobile ? "wrap" : "nowrap",
                  minHeight: 44,
                }}
              >
                {/* Nom ou édition */}
                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  {isEditing ? (
                    <>
                      <label
                        htmlFor={`edit-${annee._id}`}
                        style={{ position: "absolute", left: -9999 }}
                      >
                        Renommer l'année {annee.nom}
                      </label>
                      <input
                        id={`edit-${annee._id}`}
                        value={editingNom}
                        onChange={(e) => setEditingNom(e.target.value)}
                        autoFocus
                        enterKeyHint="done"
                        aria-label={`Renommer l'année ${annee.nom}`}
                        style={{
                          ...inputStyle(false),
                          padding: "6px 10px",
                          fontSize: isMobile ? 16 : 14,
                          flex: 1,
                          minWidth: 100,
                        }}
                      />
                    </>
                  ) : (
                    <>
                      <span
                        style={{
                          fontWeight: isActive ? 700 : 500,
                          color: isActive ? successText : textPrimary,
                          fontSize: isMobile ? 14 : 14.5,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {annee.nom}
                      </span>
                      {isActive && (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 3,
                            padding: "2px 8px",
                            borderRadius: 10,
                            fontSize: 10,
                            fontWeight: 700,
                            background: successBg,
                            color: successText,
                            border: `1px solid ${success}`,
                            flexShrink: 0,
                          }}
                        >
                          <Check size={10} aria-hidden="true" />
                          Active
                        </span>
                      )}
                    </>
                  )}
                </div>

                {/* Actions */}
                <div
                  style={{
                    display: "flex",
                    gap: 4,
                    alignItems: "center",
                    justifyContent: isMobile ? "flex-end" : "flex-start",
                    width: isMobile ? "100%" : "auto",
                    flexShrink: 0,
                  }}
                >
                  {isEditing ? (
                    <>
                      <Pressable
                        onClick={() => saveRename(annee._id)}
                        disabled={savingRename}
                        dark={dark}
                        ariaLabel={`Enregistrer le nouveau nom de ${annee.nom}`}
                        aria-busy={savingRename}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: "10px 12px",
                          background: success,
                          color: "#FFFFFF",
                          border: "none",
                          borderRadius: 8,
                          cursor: savingRename ? "not-allowed" : "pointer",
                          fontSize: 12,
                          fontWeight: 600,
                          gap: 4,
                        }}
                      >
                        {savingRename ? (
                          <Loader size={12} className="ga-spin" role="status" aria-label="Enregistrement" />
                        ) : (
                          <Check size={12} aria-hidden="true" />
                        )}
                        Enregistrer
                      </Pressable>
                      <Pressable
                        onClick={cancelRename}
                        dark={dark}
                        ariaLabel="Annuler le renommage"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: "10px 12px",
                          background: "transparent",
                          color: textSecondary,
                          border: `1px solid ${cardBorder}`,
                          borderRadius: 8,
                        }}
                      >
                        <X size={14} aria-hidden="true" />
                      </Pressable>
                    </>
                  ) : (
                    <>
                      {!isActive && (
                        <>
                          <Pressable
                            onClick={() => startRename(annee)}
                            dark={dark}
                            ariaLabel={`Renommer l'année ${annee.nom}`}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              padding: "10px 12px",
                              background: "transparent",
                              color: accent,
                              border: `1px solid ${cardBorder}`,
                              borderRadius: 8,
                            }}
                          >
                            <Edit2 size={14} aria-hidden="true" />
                          </Pressable>
                          <Pressable
                            onClick={() => handleActivate(annee._id, annee.nom)}
                            disabled={isActivating}
                            dark={dark}
                            ariaLabel={`Activer l'année ${annee.nom}`}
                            aria-busy={isActivating}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 4,
                              padding: isMobile ? "10px 14px" : "10px 16px",
                              background: success,
                              color: "#FFFFFF",
                              border: "none",
                              borderRadius: 8,
                              fontWeight: 700,
                              cursor: isActivating ? "not-allowed" : "pointer",
                              fontSize: 12.5,
                              opacity: isActivating ? 0.7 : 1,
                            }}
                          >
                            {isActivating ? (
                              <Loader size={12} className="ga-spin" role="status" aria-label="Activation" />
                            ) : (
                              <Clock size={12} aria-hidden="true" />
                            )}
                            Activer
                          </Pressable>
                          <Pressable
                            onClick={() => handleDelete(annee._id, annee.nom)}
                            disabled={isDeleting}
                            dark={dark}
                            ariaLabel={`Supprimer l'année ${annee.nom}`}
                            aria-busy={isDeleting}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              padding: "10px 12px",
                              background: "transparent",
                              color: danger,
                              border: `1px solid ${cardBorder}`,
                              borderRadius: 8,
                              cursor: isDeleting ? "not-allowed" : "pointer",
                              opacity: isDeleting ? 0.6 : 1,
                            }}
                          >
                            {isDeleting ? (
                              <Loader size={14} className="ga-spin" role="status" aria-label="Suppression" />
                            ) : (
                              <Trash2 size={14} aria-hidden="true" />
                            )}
                          </Pressable>
                        </>
                      )}
                    </>
                  )}
                </div>
              </article>
            </li>
          );
        })}
      </ul>

      {/* ==================== NOTE ==================== */}
      {stats.active === 0 && stats.total > 0 && (
        <div
          role="alert"
          style={{
            marginTop: 12,
            padding: "10px 12px",
            background: dark ? "#78350F40" : "#FEF3C7",
            border: `1px solid ${dark ? "#78350F" : "#FDE68A"}`,
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12,
            color: dark ? "#FBBF24" : "#92400E",
            lineHeight: 1.4,
          }}
        >
          <AlertCircle size={14} aria-hidden="true" style={{ flexShrink: 0 }} />
          <span>
            Aucune année n'est active. Activez-en une pour permettre la saisie
            des données.
          </span>
        </div>
      )}

      <ConfirmDialog {...dialogProps} />
    </div>
  );
}