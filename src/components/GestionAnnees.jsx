import { useState, useMemo, useCallback } from "react";
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
// HELPER ERREUR
// ============================================================
function extractErrMsg(err, fallback = "Erreur inconnue") {
  if (!err) return fallback;
  if (typeof err === "string") return err;
  if (typeof err === "object" && err.message) return err.message;
  return fallback;
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================
export function GestionAnnees({ ecoleId, userId }) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();
  const { confirm, dialogProps } = useConfirm();

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

  // ✅ userId ajouté à la query
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

  // ✅ Keyframes injectés dans les 2 branches (loading + principal)
  const Keyframes = (
    <style>{`
      @keyframes ga-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      .ga-spin { animation: ga-spin 1s linear infinite; }
      @media (prefers-reduced-motion: reduce) {
        .ga-spin { animation: none !important; }
      }
    `}</style>
  );

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
      // ✅ Retourne 0 en cas d'égalité
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
        // ✅ requesterId ajouté (cohérent avec AnneeSelector)
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
  // LOADING — Keyframes injectés ici aussi
  // ============================================================
  if (anneesRaw === undefined) {
    return (
      <>
        {Keyframes}
        <div
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
          <Loader size={24} className="ga-spin" style={{ color: accent }} />
        </div>
      </>
    );
  }

  // Styles
  const inputStyle = {
    width: "100%",
    padding: isMobile ? "12px 14px" : "10px 14px",
    border: `1px solid ${cardBorder}`,
    borderRadius: 10,
    fontSize: isMobile ? 15 : 14,
    outline: "none",
    background: inputBg,
    color: inputText,
    boxSizing: "border-box",
    fontFamily: "inherit",
    appearance: "none",
    WebkitAppearance: "none",
  };

  return (
    <div
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
      {Keyframes}

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
            active
            {stats.active > 1 ? "s" : ""}
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
            <CheckCircle2 size={11} />
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
        <input
          placeholder="Ex : 2025-2026"
          value={nouveauNom}
          onChange={(e) => setNouveauNom(e.target.value)}
          style={{ ...inputStyle, flex: 1 }}
        />
        <button
          type="submit"
          disabled={adding || !nouveauNom.trim()}
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
            color:
              adding || !nouveauNom.trim() ? textSecondary : "#FFFFFF",
            border: "none",
            borderRadius: 10,
            fontWeight: 700,
            cursor:
              adding || !nouveauNom.trim() ? "not-allowed" : "pointer",
            fontSize: 13.5,
            width: isMobile ? "100%" : "auto",
            whiteSpace: "nowrap",
          }}
        >
          {adding ? (
            <Loader size={14} className="ga-spin" />
          ) : (
            <Plus size={14} />
          )}
          {adding ? "Ajout…" : "Ajouter"}
        </button>
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
            placeholder="Rechercher une année…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ ...inputStyle, paddingLeft: 36 }}
          />
        </div>
        <div
          style={{
            display: "flex",
            gap: 6,
            width: isMobile ? "100%" : "auto",
          }}
        >
          <button
            type="button"
            onClick={() => toggleSort("nom")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              padding: "10px 12px",
              background: sortBy === "nom" ? accentBg : "transparent",
              border: `1px solid ${
                sortBy === "nom" ? accent : cardBorder
              }`,
              borderRadius: 10,
              color: sortBy === "nom" ? accent : textSecondary,
              cursor: "pointer",
              fontSize: 12.5,
              fontWeight: 600,
              flex: isMobile ? 1 : "none",
            }}
          >
            Nom
            {sortBy === "nom" &&
              (sortDir === "asc" ? (
                <ChevronUp size={13} />
              ) : (
                <ChevronDown size={13} />
              ))}
          </button>
          <button
            type="button"
            onClick={() => toggleSort("statut")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              padding: "10px 12px",
              background: sortBy === "statut" ? accentBg : "transparent",
              border: `1px solid ${
                sortBy === "statut" ? accent : cardBorder
              }`,
              borderRadius: 10,
              color: sortBy === "statut" ? accent : textSecondary,
              cursor: "pointer",
              fontSize: 12.5,
              fontWeight: 600,
              flex: isMobile ? 1 : "none",
            }}
          >
            Statut
            {sortBy === "statut" &&
              (sortDir === "asc" ? (
                <ChevronUp size={13} />
              ) : (
                <ChevronDown size={13} />
              ))}
          </button>
        </div>
      </div>

      {/* ==================== LISTE ==================== */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {filteredAndSorted.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "24px 16px",
              color: textSecondary,
            }}
          >
            <Calendar size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
            <p style={{ margin: 0, fontSize: 13 }}>
              {searchTerm
                ? "Aucune année ne correspond à la recherche."
                : "Aucune année scolaire enregistrée."}
            </p>
          </div>
        )}

        {filteredAndSorted.map((annee) => {
          const isEditing = editingId === annee._id;
          const isActive = annee.estActive;
          const isActivating = activating === annee._id;
          const isDeleting = deletingId === annee._id;

          return (
            <div
              key={annee._id}
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
                  <input
                    value={editingNom}
                    onChange={(e) => setEditingNom(e.target.value)}
                    autoFocus
                    style={{
                      ...inputStyle,
                      padding: "6px 10px",
                      fontSize: 14,
                      flex: 1,
                      minWidth: 100,
                    }}
                  />
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
                        <Check size={10} />
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
                    <button
                      onClick={() => saveRename(annee._id)}
                      disabled={savingRename}
                      title="Enregistrer"
                      aria-label="Enregistrer"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "6px 10px",
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
                        <Loader size={12} className="ga-spin" />
                      ) : (
                        <Check size={12} />
                      )}
                      Enregistrer
                    </button>
                    <button
                      onClick={cancelRename}
                      title="Annuler"
                      aria-label="Annuler"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "6px 8px",
                        background: "transparent",
                        color: textSecondary,
                        border: `1px solid ${cardBorder}`,
                        borderRadius: 8,
                        cursor: "pointer",
                      }}
                    >
                      <X size={14} />
                    </button>
                  </>
                ) : (
                  <>
                    {!isActive && (
                      <>
                        <button
                          onClick={() => startRename(annee)}
                          title="Renommer"
                          aria-label="Renommer"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "8px 10px",
                            background: "transparent",
                            color: accent,
                            border: `1px solid ${cardBorder}`,
                            borderRadius: 8,
                            cursor: "pointer",
                          }}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleActivate(annee._id, annee.nom)}
                          disabled={isActivating}
                          title="Activer cette année"
                          aria-label="Activer cette année"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 4,
                            padding: isMobile ? "8px 12px" : "8px 14px",
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
                            <Loader size={12} className="ga-spin" />
                          ) : (
                            <Clock size={12} />
                          )}
                          Activer
                        </button>
                        <button
                          onClick={() => handleDelete(annee._id, annee.nom)}
                          disabled={isDeleting}
                          title="Supprimer"
                          aria-label="Supprimer"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "8px 10px",
                            background: "transparent",
                            color: danger,
                            border: `1px solid ${cardBorder}`,
                            borderRadius: 8,
                            cursor: isDeleting ? "not-allowed" : "pointer",
                            opacity: isDeleting ? 0.6 : 1,
                          }}
                        >
                          {isDeleting ? (
                            <Loader size={14} className="ga-spin" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ==================== NOTE ==================== */}
      {stats.active === 0 && stats.total > 0 && (
        <div
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
          <AlertCircle size={14} style={{ flexShrink: 0 }} />
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