import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile"; // <-- Import du hook
import { useConfirm } from "@/hooks/useConfirm";
import { ConfirmDialog } from "./ConfirmDialog";
import toast from "react-hot-toast";
import {
  Loader, Calendar, CheckCircle2, Plus, Clock,
  Trash2, Edit2, Search, ChevronUp, ChevronDown,
  CalendarDays, Users,
} from "lucide-react";

export function GestionAnnees({ ecoleId }) {
  const { S, dark } = useStyles();
  const isMobile = useIsMobile(); // Détection mobile
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

  const annees = useQuery(api.anneesScolaires.listByEcole, ecoleId ? { ecoleId } : "skip");
  const addAnnee = useMutation(api.anneesScolaires.add);
  const setActive = useMutation(api.anneesScolaires.setActive);
  const removeAnnee = useMutation(api.anneesScolaires.remove);
  const renameAnnee = useMutation(api.anneesScolaires.rename);

  // Couleurs adaptatives
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const inputBg = dark ? "#0F172A" : "#F9FAFB";
  const inputText = dark ? "#F1F5F9" : "#1E293B";
  const buttonAddBg = dark ? "#818CF8" : "#4F46E5";
  const buttonActivateBg = dark ? "#34D399" : "#10B981";
  const activeBadgeBg = dark ? "#064E3B" : "#D1FAE5";
  const activeBadgeText = dark ? "#34D399" : "#065F46";
  const shadow = dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)";

  // Statistiques
  const stats = useMemo(() => {
    const total = annees?.length ?? 0;
    const active = annees?.filter((a) => a.estActive).length ?? 0;
    const inactive = total - active;
    return { total, active, inactive };
  }, [annees]);

  // Filtrage + tri
  const filteredAndSorted = useMemo(() => {
    if (!annees) return [];
    let result = [...annees];
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
      if (sortDir === "asc") return valA < valB ? -1 : 1;
      else return valA > valB ? -1 : 1;
    });
    return result;
  }, [annees, searchTerm, sortBy, sortDir]);

  // Gestion de l'ajout
  const handleAdd = async (e) => {
    e.preventDefault();
    if (!nouveauNom.trim() || !ecoleId) return;
    setAdding(true);
    try {
      await addAnnee({ nom: nouveauNom.trim(), ecoleId, estActive: false });
      setNouveauNom("");
      toast.success("Année scolaire ajoutée");
    } catch (err) {
      toast.error(err.message || "Erreur lors de l'ajout");
    } finally {
      setAdding(false);
    }
  };

  // Activation
  const handleActivate = async (anneeId, nom) => {
    const ok = await confirm(
      "Activer l'année scolaire",
      `Voulez-vous activer l'année scolaire "${nom}" ?`
    );
    if (!ok) return;
    setActivating(anneeId);
    try {
      await setActive({ anneeId });
      toast.success(`Année ${nom} activée`);
    } catch (err) {
      toast.error(err.message || "Erreur lors de l'activation");
    } finally {
      setActivating(null);
    }
  };

  // Suppression
  const handleDelete = async (anneeId, nom) => {
    const ok = await confirm(
      "Supprimer l'année scolaire",
      `Voulez-vous vraiment supprimer l'année "${nom}" ?`
    );
    if (!ok) return;
    setDeletingId(anneeId);
    try {
      await removeAnnee({ id: anneeId });
      toast.success("Année supprimée");
    } catch (err) {
      toast.error(err.message || "Erreur lors de la suppression");
    } finally {
      setDeletingId(null);
    }
  };

  // Renommage
  const startRename = (annee) => {
    setEditingId(annee._id);
    setEditingNom(annee.nom);
  };
  const cancelRename = () => {
    setEditingId(null);
    setEditingNom("");
  };
  const saveRename = async (id) => {
    const trimmed = editingNom.trim();
    if (!trimmed || trimmed === annees.find((a) => a._id === id)?.nom) {
      cancelRename();
      return;
    }
    setSavingRename(true);
    try {
      await renameAnnee({ id, nom: trimmed });
      toast.success("Année renommée");
      cancelRename();
    } catch (err) {
      toast.error(err.message || "Erreur lors du renommage");
    } finally {
      setSavingRename(false);
    }
  };

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir("asc");
    }
  };

  // Gestion du chargement initial
  if (annees === undefined) {
    return (
      <div style={{
        ...S.card,
        background: cardBg,
        border: `1px solid ${cardBorder}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 40,
      }}>
        <Loader size={24} className="animate-spin" />
      </div>
    );
  }

  // Styles adaptatifs
  const containerPadding = isMobile ? 16 : 24;
  const titleSize = isMobile ? 18 : 20;
  const titleIconSize = isMobile ? 18 : 20;
  const formFlexDirection = isMobile ? "column" : "row";
  const inputPadding = isMobile ? "12px 14px" : "10px 14px";
  const inputFontSize = isMobile ? 16 : 14;
  const addButtonPadding = isMobile ? "12px 16px" : "10px 20px";
  const addButtonFontSize = isMobile ? 16 : 14;
  const searchBarFlexDirection = isMobile ? "column" : "row";
  const searchBarGap = isMobile ? 8 : 8;
  const searchButtonPadding = isMobile ? "10px 12px" : "8px 12px";
  const searchButtonFontSize = isMobile ? 14 : 13;
  const listItemPadding = isMobile ? "12px 14px" : "12px 16px";
  const listItemFlexDirection = isMobile ? "column" : "row";
  const listItemAlignItems = isMobile ? "stretch" : "center";
  const listItemGap = isMobile ? 8 : 0;
  const actionButtonPadding = isMobile ? "8px 10px" : "4px";
  const actionButtonFontSize = isMobile ? 14 : 14;

  return (
    <div style={{
      ...S.card,
      background: cardBg,
      border: `1px solid ${cardBorder}`,
      boxShadow: shadow,
      transition: "background-color 0.3s",
      padding: containerPadding,
    }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .animate-spin { animation: spin 1s linear infinite; }`}</style>

      {/* En-tête avec statistiques */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 20, flexDirection: isMobile ? "column" : "row" }}>
        <h3 style={{
          color: textPrimary,
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: titleSize,
          fontWeight: 700,
          margin: 0,
        }}>
          <Calendar size={titleIconSize} color={dark ? "#818CF8" : "#4F46E5"} />
          Années scolaires
        </h3>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: isMobile ? "center" : "flex-start" }}>
          <span style={{ background: activeBadgeBg, color: activeBadgeText, padding: "4px 12px", borderRadius: 20, fontSize: 13, fontWeight: 600 }}>
            {stats.active} active(s)
          </span>
          <span style={{ background: dark ? "#334155" : "#F1F5F9", color: textPrimary, padding: "4px 12px", borderRadius: 20, fontSize: 13, fontWeight: 600 }}>
            {stats.total} totale(s)
          </span>
        </div>
      </div>

      {/* Formulaire d'ajout */}
      <form onSubmit={handleAdd} style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", flexDirection: formFlexDirection }}>
        <input
          placeholder="ex: 2025-2026"
          value={nouveauNom}
          onChange={(e) => setNouveauNom(e.target.value)}
          style={{
            flex: 1,
            minWidth: isMobile ? "100%" : 150,
            padding: inputPadding,
            border: `1px solid ${cardBorder}`,
            borderRadius: 8,
            fontSize: inputFontSize,
            outline: "none",
            background: inputBg,
            color: inputText,
            transition: "border-color 0.2s, background-color 0.3s",
            boxSizing: "border-box",
          }}
        />
        <button
          type="submit"
          disabled={adding || !nouveauNom.trim()}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            padding: addButtonPadding,
            background: buttonAddBg,
            color: "white",
            border: "none",
            borderRadius: 8,
            fontWeight: 600,
            cursor: adding ? "not-allowed" : "pointer",
            opacity: adding ? 0.7 : 1,
            transition: "background 0.2s",
            fontSize: addButtonFontSize,
            width: isMobile ? "100%" : "auto",
          }}
        >
          {adding ? <Loader size={16} className="animate-spin" /> : <Plus size={16} />}
          {adding ? "Ajout..." : "Ajouter"}
        </button>
      </form>

      {/* Barre de recherche et tri */}
      <div style={{ display: "flex", gap: searchBarGap, marginBottom: 16, alignItems: "stretch", flexWrap: "wrap", flexDirection: searchBarFlexDirection }}>
        <div style={{ position: "relative", flex: 1, minWidth: isMobile ? "100%" : 150 }}>
          <Search size={16} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: textSecondary }} />
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: inputPadding,
              border: `1px solid ${cardBorder}`,
              borderRadius: 8,
              fontSize: inputFontSize,
              background: inputBg,
              color: inputText,
              outline: "none",
              paddingLeft: 32,
              boxSizing: "border-box",
            }}
          />
        </div>
        <div style={{ display: "flex", gap: 8, width: isMobile ? "100%" : "auto" }}>
          <button
            onClick={() => toggleSort("nom")}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
              padding: searchButtonPadding,
              background: "transparent",
              border: `1px solid ${cardBorder}`,
              borderRadius: 8,
              color: textPrimary,
              cursor: "pointer",
              fontSize: searchButtonFontSize,
              flex: isMobile ? 1 : "none",
            }}
          >
            Nom {sortBy === "nom" && (sortDir === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
          </button>
          <button
            onClick={() => toggleSort("statut")}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
              padding: searchButtonPadding,
              background: "transparent",
              border: `1px solid ${cardBorder}`,
              borderRadius: 8,
              color: textPrimary,
              cursor: "pointer",
              fontSize: searchButtonFontSize,
              flex: isMobile ? 1 : "none",
            }}
          >
            Statut {sortBy === "statut" && (sortDir === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
          </button>
        </div>
      </div>

      {/* Liste des années */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filteredAndSorted.length === 0 && (
          <p style={{ color: textSecondary, fontSize: 14, textAlign: "center", padding: "16px 0" }}>
            {searchTerm ? "Aucune année ne correspond à la recherche." : "Aucune année scolaire enregistrée."}
          </p>
        )}
        {filteredAndSorted.map((annee) => (
          <div
            key={annee._id}
            style={{
              display: "flex",
              flexDirection: listItemFlexDirection,
              alignItems: listItemAlignItems,
              justifyContent: "space-between",
              padding: listItemPadding,
              borderRadius: 8,
              border: `1px solid ${annee.estActive ? activeBadgeText : cardBorder}`,
              background: annee.estActive ? activeBadgeBg : "transparent",
              transition: "background-color 0.3s, transform 0.1s",
              cursor: "default",
              gap: listItemGap,
            }}
            onMouseEnter={(e) => { if (!annee.estActive) e.currentTarget.style.background = dark ? "#2D3748" : "#F1F5F9"; }}
            onMouseLeave={(e) => { if (!annee.estActive) e.currentTarget.style.background = "transparent"; }}
          >
            {/* Partie gauche : nom et badges */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, flexWrap: "wrap" }}>
              {editingId === annee._id ? (
                <>
                  <input
                    value={editingNom}
                    onChange={(e) => setEditingNom(e.target.value)}
                    autoFocus
                    style={{
                      padding: "6px 10px",
                      border: `1px solid ${cardBorder}`,
                      borderRadius: 6,
                      fontSize: 14,
                      background: inputBg,
                      color: inputText,
                    }}
                  />
                  <button onClick={() => saveRename(annee._id)} disabled={savingRename} style={{ background: "none", border: "none", color: "#10B981", cursor: "pointer" }}>
                    {savingRename ? <Loader size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  </button>
                  <button onClick={cancelRename} style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer" }}>
                    <Trash2 size={16} />
                  </button>
                </>
              ) : (
                <>
                  <span style={{
                    fontWeight: annee.estActive ? 700 : 400,
                    color: annee.estActive ? activeBadgeText : textPrimary,
                    fontSize: isMobile ? 15 : 14,
                  }}>
                    {annee.nom}
                  </span>
                  {annee.estActive && (
                    <span style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "2px 10px",
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 600,
                      background: activeBadgeBg,
                      color: activeBadgeText,
                    }}>
                      <CheckCircle2 size={14} />
                      Active
                    </span>
                  )}
                </>
              )}
            </div>

            {/* Partie droite : actions */}
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", justifyContent: isMobile ? "flex-end" : "flex-start", width: isMobile ? "100%" : "auto" }}>
              {!annee.estActive && (
                <>
                  <button
                    onClick={() => startRename(annee)}
                    title="Renommer"
                    style={{ background: "none", border: "none", color: "#3B82F6", cursor: "pointer", padding: actionButtonPadding }}
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleActivate(annee._id, annee.nom)}
                    disabled={activating === annee._id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 4,
                      padding: isMobile ? "8px 12px" : "6px 12px",
                      background: buttonActivateBg,
                      color: "white",
                      border: "none",
                      borderRadius: 8,
                      fontWeight: 500,
                      cursor: activating === annee._id ? "not-allowed" : "pointer",
                      opacity: activating === annee._id ? 0.7 : 1,
                      fontSize: actionButtonFontSize,
                    }}
                  >
                    {activating === annee._id ? <Loader size={14} className="animate-spin" /> : <Clock size={14} />}
                    Activer
                  </button>
                </>
              )}
              {!annee.estActive && (
                <button
                  onClick={() => handleDelete(annee._id, annee.nom)}
                  disabled={deletingId === annee._id}
                  title="Supprimer"
                  style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer", padding: actionButtonPadding }}
                >
                  {deletingId === annee._id ? <Loader size={16} className="animate-spin" /> : <Trash2 size={16} />}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog {...dialogProps} />
    </div>
  );
}