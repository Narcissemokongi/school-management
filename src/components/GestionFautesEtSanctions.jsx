import { useState, useMemo } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile"; // <-- Import du hook
import { useConfirm } from "@/hooks/useConfirm";
import { ConfirmDialog } from "./ConfirmDialog";
import toast from "react-hot-toast";
import { Loader, Plus, Trash2, Edit2, Search, X } from "lucide-react";

export function GestionFautesEtSanctions({
  fautes,
  addFaute,
  updateFaute,
  removeFaute,
  ecoleId,
  sanctions,
  userId,
}) {
  const { dark } = useStyles();
  const isMobile = useIsMobile(); // Détection mobile
  const { confirm, dialogProps } = useConfirm();
  const [subTab, setSubTab] = useState("fautes");

  // ----- État pour les fautes -----
  const [editMode, setEditMode] = useState(null);
  const [libelle, setLibelle] = useState("");
  const [gravite, setGravite] = useState("Légère");
  const [addingFaute, setAddingFaute] = useState(false);
  const [searchFaute, setSearchFaute] = useState("");

  // ----- État pour les sanctions -----
  const addSanction = useMutation(api.sanctions.add);
  const updateSanction = useMutation(api.sanctions.update);
  const removeSanction = useMutation(api.sanctions.remove);
  const [editSanctionMode, setEditSanctionMode] = useState(null);
  const [sanctionLibelle, setSanctionLibelle] = useState("");
  const [addingSanction, setAddingSanction] = useState(false);
  const [searchSanction, setSearchSanction] = useState("");

  // Couleurs adaptatives
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const inputBg = dark ? "#0F172A" : "#F8FAFC";
  const inputText = dark ? "#F1F5F9" : "#1E293B";
  const buttonPrimaryBg = dark ? "#818CF8" : "#4F46E5";
  const buttonEditBg = dark ? "#FBBF24" : "#F59E0B";
  const buttonDangerBg = "#EF4444";
  const buttonSecondaryBg = dark ? "#334155" : "#F1F5F9";
  const buttonSecondaryText = dark ? "#F1F5F9" : "#1E293B";

  // Filtrage des fautes
  const filteredFautes = useMemo(() => {
    if (!searchFaute.trim()) return fautes;
    const q = searchFaute.toLowerCase();
    return fautes.filter((f) => f.libelle.toLowerCase().includes(q));
  }, [fautes, searchFaute]);

  // Filtrage des sanctions
  const filteredSanctions = useMemo(() => {
    if (!searchSanction.trim()) return sanctions;
    const q = searchSanction.toLowerCase();
    return sanctions.filter((s) => s.libelle.toLowerCase().includes(q));
  }, [sanctions, searchSanction]);

  const resetForm = () => {
    setLibelle("");
    setGravite("Légère");
    setEditMode(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!libelle.trim()) return;
    setAddingFaute(true);
    try {
      if (editMode) {
        await updateFaute({ id: editMode, libelle: libelle.trim(), gravite, userId });
        toast.success("Faute mise à jour");
      } else {
        await addFaute({ libelle: libelle.trim(), gravite, ecoleId, userId });
        toast.success("Faute ajoutée");
      }
      resetForm();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setAddingFaute(false);
    }
  };

  const startEdit = (f) => {
    setLibelle(f.libelle);
    setGravite(f.gravite);
    setEditMode(f._id);
  };

  const deleteFaute = async (id) => {
    const ok = await confirm("Supprimer la faute", "Voulez-vous vraiment supprimer cette faute ?");
    if (!ok) return;
    try {
      await removeFaute({ id, userId });
      if (editMode === id) resetForm();
      toast.success("Faute supprimée");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const resetSanctionForm = () => {
    setSanctionLibelle("");
    setEditSanctionMode(null);
  };

  const handleSanctionSubmit = async (e) => {
    e.preventDefault();
    if (!sanctionLibelle.trim()) return;
    setAddingSanction(true);
    try {
      if (editSanctionMode) {
        await updateSanction({ id: editSanctionMode, libelle: sanctionLibelle.trim(), userId });
        toast.success("Sanction mise à jour");
      } else {
        await addSanction({ libelle: sanctionLibelle.trim(), ecoleId, userId });
        toast.success("Sanction ajoutée");
      }
      resetSanctionForm();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setAddingSanction(false);
    }
  };

  const startEditSanction = (s) => {
    setSanctionLibelle(s.libelle);
    setEditSanctionMode(s._id);
  };

  const handleDeleteSanction = async (id) => {
    const ok = await confirm("Supprimer la sanction", "Voulez-vous vraiment supprimer cette sanction ?");
    if (!ok) return;
    try {
      await removeSanction({ id, userId });
      toast.success("Sanction supprimée");
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Styles adaptatifs
  const inputStyle = {
    width: "100%",
    padding: isMobile ? "12px 14px" : "10px 14px",
    border: `1px solid ${cardBorder}`,
    borderRadius: 8,
    fontSize: isMobile ? 16 : 14,
    marginBottom: 16,
    outline: "none",
    background: inputBg,
    color: inputText,
    transition: "border-color 0.2s, background-color 0.3s",
    boxSizing: "border-box",
  };

  const searchStyle = {
    display: "flex",
    alignItems: "center",
    background: inputBg,
    border: `1px solid ${cardBorder}`,
    borderRadius: 8,
    padding: isMobile ? "12px 14px" : "8px 12px",
    marginBottom: 16,
    gap: 8,
  };

  const containerPadding = isMobile ? "16px 12px" : "24px 16px";
  const titleSize = isMobile ? 22 : 28;
  const subtitleSize = isMobile ? 14 : 14;
  const headerMarginBottom = isMobile ? 20 : 32;
  const tabPadding = isMobile ? "10px 12px" : "12px 20px";
  const tabFontSize = isMobile ? 14 : 16;
  const formCardPadding = isMobile ? 16 : 24;
  const listCardPadding = isMobile ? "12px 14px" : "16px 20px";
  const listItemFlexDirection = isMobile ? "column" : "row";
  const listItemGap = isMobile ? 8 : 0;
  const listItemAlignItems = isMobile ? "stretch" : "center";
  const actionButtonPadding = isMobile ? "10px 12px" : "6px 12px";
  const actionButtonFontSize = isMobile ? 14 : 14;
  const submitButtonPadding = isMobile ? "12px 16px" : "10px 20px";
  const submitButtonFontSize = isMobile ? 16 : 14;
  const formButtonsFlexDirection = isMobile ? "column" : "row";
  const formButtonsWidth = isMobile ? "100%" : "auto";

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: containerPadding }}>
      {/* En-tête */}
      <div style={{ marginBottom: headerMarginBottom }}>
        <h2 style={{ fontSize: titleSize, fontWeight: 700, color: textPrimary, margin: 0 }}>
          Discipline
        </h2>
        <p style={{ color: textSecondary, marginTop: 4, fontSize: subtitleSize }}>
          Gérez les types de fautes et les sanctions
        </p>
      </div>

      {/* Onglets */}
      <div style={{ display: "flex", gap: 0, borderBottom: `2px solid ${cardBorder}`, marginBottom: isMobile ? 16 : 24, overflowX: "auto", whiteSpace: "nowrap" }}>
        {[
          { id: "fautes", label: "Types de fautes" },
          { id: "sanctions", label: "Sanctions" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: tabPadding,
              border: "none",
              background: "transparent",
              color: subTab === t.id ? (dark ? "#818CF8" : "#4F46E5") : textSecondary,
              fontWeight: subTab === t.id ? 600 : 400,
              borderBottom: subTab === t.id ? `3px solid ${dark ? "#818CF8" : "#4F46E5"}` : "3px solid transparent",
              cursor: "pointer",
              transition: "all 0.2s",
              fontSize: tabFontSize,
              flexShrink: 0,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Contenu fautes */}
      {subTab === "fautes" && (
        <div>
          {/* Formulaire */}
          <div
            style={{
              background: cardBg,
              borderRadius: 16,
              padding: formCardPadding,
              boxShadow: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)",
              border: `1px solid ${cardBorder}`,
              marginBottom: isMobile ? 16 : 24,
              transition: "background-color 0.3s",
            }}
          >
            <h3 style={{ fontSize: isMobile ? 16 : 18, fontWeight: 600, marginBottom: 20, color: textPrimary }}>
              {editMode ? "Modifier la faute" : "Nouvelle faute"}
            </h3>
            <form onSubmit={handleSubmit}>
              <label style={{ display: "block", marginBottom: 6, fontWeight: 500, color: textSecondary, fontSize: isMobile ? 15 : 14 }}>Libellé</label>
              <input
                style={inputStyle}
                placeholder="Ex: Chewing-gum"
                value={libelle}
                onChange={(e) => setLibelle(e.target.value)}
              />
              <label style={{ display: "block", marginBottom: 6, fontWeight: 500, color: textSecondary, fontSize: isMobile ? 15 : 14 }}>Gravité</label>
              <select
                value={gravite}
                onChange={(e) => setGravite(e.target.value)}
                style={{ ...inputStyle, background: inputBg, color: inputText }}
              >
                <option value="Légère">Légère</option>
                <option value="Moyenne">Moyenne</option>
                <option value="Grave">Grave</option>
              </select>
              <div style={{ display: "flex", gap: 10, flexDirection: formButtonsFlexDirection }}>
                <button
                  type="submit"
                  disabled={addingFaute || !libelle.trim()}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    padding: submitButtonPadding,
                    background: addingFaute ? "#A5B4FC" : editMode ? buttonEditBg : buttonPrimaryBg,
                    color: "white",
                    border: "none",
                    borderRadius: 10,
                    fontWeight: 600,
                    cursor: addingFaute ? "not-allowed" : "pointer",
                    fontSize: submitButtonFontSize,
                    width: formButtonsWidth,
                  }}
                >
                  {addingFaute ? (
                    <Loader size={16} className="animate-spin" />
                  ) : editMode ? (
                    "Mettre à jour"
                  ) : (
                    <>
                      <Plus size={18} /> Ajouter
                    </>
                  )}
                </button>
                {editMode && (
                  <button
                    type="button"
                    onClick={resetForm}
                    style={{
                      padding: submitButtonPadding,
                      background: buttonSecondaryBg,
                      border: "none",
                      borderRadius: 10,
                      fontWeight: 500,
                      cursor: "pointer",
                      color: buttonSecondaryText,
                      fontSize: submitButtonFontSize,
                      width: formButtonsWidth,
                    }}
                  >
                    Annuler
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Recherche */}
          <div style={searchStyle}>
            <Search size={16} color={textSecondary} />
            <input
              value={searchFaute}
              onChange={(e) => setSearchFaute(e.target.value)}
              placeholder="Rechercher une faute..."
              style={{ border: "none", outline: "none", background: "transparent", width: "100%", color: inputText, fontSize: isMobile ? 16 : 14 }}
            />
            {searchFaute && (
              <button onClick={() => setSearchFaute("")} style={{ background: "none", border: "none", cursor: "pointer", color: textSecondary }}>
                <X size={16} />
              </button>
            )}
          </div>

          {/* Liste des fautes */}
          <div style={{ display: "grid", gap: isMobile ? 8 : 12 }}>
            {filteredFautes.length === 0 && (
              <div
                style={{
                  background: cardBg,
                  borderRadius: 16,
                  padding: isMobile ? 32 : 48,
                  textAlign: "center",
                  boxShadow: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)",
                  border: `1px solid ${cardBorder}`,
                  color: textSecondary,
                }}
              >
                <p>{searchFaute ? "Aucune faute trouvée." : "Aucun type de faute défini."}</p>
              </div>
            )}
            {filteredFautes.map((f) => (
              <div
                key={f._id}
                style={{
                  background: cardBg,
                  borderRadius: 12,
                  padding: listCardPadding,
                  display: "flex",
                  flexDirection: listItemFlexDirection,
                  justifyContent: "space-between",
                  alignItems: listItemAlignItems,
                  gap: listItemGap,
                  boxShadow: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)",
                  border: `1px solid ${cardBorder}`,
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: isMobile ? 15 : 16, color: textPrimary }}>{f.libelle}</div>
                  <span
                    style={{
                      display: "inline-block",
                      marginTop: 4,
                      padding: "2px 10px",
                      borderRadius: 12,
                      fontSize: 12,
                      fontWeight: 600,
                      background:
                        f.gravite === "Grave"
                          ? dark ? "#7F1D1D" : "#FEE2E2"
                          : f.gravite === "Moyenne"
                          ? dark ? "#78350F" : "#FEF3C7"
                          : dark ? "#064E3B" : "#D1FAE5",
                      color:
                        f.gravite === "Grave"
                          ? dark ? "#F87171" : "#B91C1C"
                          : f.gravite === "Moyenne"
                          ? dark ? "#FBBF24" : "#92400E"
                          : dark ? "#34D399" : "#065F46",
                    }}
                  >
                    {f.gravite}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    onClick={() => startEdit(f)}
                    style={{ background: buttonPrimaryBg, color: "white", border: "none", borderRadius: 6, padding: actionButtonPadding, cursor: "pointer", fontSize: actionButtonFontSize }}
                    title="Modifier"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => deleteFaute(f._id)}
                    style={{ background: buttonDangerBg, color: "white", border: "none", borderRadius: 6, padding: actionButtonPadding, cursor: "pointer", fontSize: actionButtonFontSize }}
                    title="Supprimer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contenu sanctions */}
      {subTab === "sanctions" && (
        <div>
          {/* Formulaire sanction */}
          <div
            style={{
              background: cardBg,
              borderRadius: 16,
              padding: formCardPadding,
              boxShadow: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)",
              border: `1px solid ${cardBorder}`,
              marginBottom: isMobile ? 16 : 24,
            }}
          >
            <h3 style={{ fontSize: isMobile ? 16 : 18, fontWeight: 600, marginBottom: 20, color: textPrimary }}>
              {editSanctionMode ? "Modifier la sanction" : "Nouvelle sanction"}
            </h3>
            <form onSubmit={handleSanctionSubmit}>
              <label style={{ display: "block", marginBottom: 6, fontWeight: 500, color: textSecondary, fontSize: isMobile ? 15 : 14 }}>Libellé</label>
              <input
                style={inputStyle}
                placeholder="Ex: Retenue"
                value={sanctionLibelle}
                onChange={(e) => setSanctionLibelle(e.target.value)}
              />
              <div style={{ display: "flex", gap: 10, flexDirection: formButtonsFlexDirection }}>
                <button
                  type="submit"
                  disabled={addingSanction || !sanctionLibelle.trim()}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    padding: submitButtonPadding,
                    background: addingSanction ? "#A5B4FC" : editSanctionMode ? buttonEditBg : buttonPrimaryBg,
                    color: "white",
                    border: "none",
                    borderRadius: 10,
                    fontWeight: 600,
                    cursor: addingSanction ? "not-allowed" : "pointer",
                    fontSize: submitButtonFontSize,
                    width: formButtonsWidth,
                  }}
                >
                  {addingSanction ? (
                    <Loader size={16} className="animate-spin" />
                  ) : editSanctionMode ? (
                    "Mettre à jour"
                  ) : (
                    <>
                      <Plus size={18} /> Ajouter
                    </>
                  )}
                </button>
                {editSanctionMode && (
                  <button
                    type="button"
                    onClick={resetSanctionForm}
                    style={{
                      padding: submitButtonPadding,
                      background: buttonSecondaryBg,
                      border: "none",
                      borderRadius: 10,
                      fontWeight: 500,
                      cursor: "pointer",
                      color: buttonSecondaryText,
                      fontSize: submitButtonFontSize,
                      width: formButtonsWidth,
                    }}
                  >
                    Annuler
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Recherche */}
          <div style={searchStyle}>
            <Search size={16} color={textSecondary} />
            <input
              value={searchSanction}
              onChange={(e) => setSearchSanction(e.target.value)}
              placeholder="Rechercher une sanction..."
              style={{ border: "none", outline: "none", background: "transparent", width: "100%", color: inputText, fontSize: isMobile ? 16 : 14 }}
            />
            {searchSanction && (
              <button onClick={() => setSearchSanction("")} style={{ background: "none", border: "none", cursor: "pointer", color: textSecondary }}>
                <X size={16} />
              </button>
            )}
          </div>

          {/* Liste des sanctions */}
          <div style={{ display: "grid", gap: isMobile ? 8 : 12 }}>
            {filteredSanctions.length === 0 && (
              <div
                style={{
                  background: cardBg,
                  borderRadius: 16,
                  padding: isMobile ? 32 : 48,
                  textAlign: "center",
                  boxShadow: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)",
                  border: `1px solid ${cardBorder}`,
                  color: textSecondary,
                }}
              >
                <p>{searchSanction ? "Aucune sanction trouvée." : "Aucune sanction définie."}</p>
              </div>
            )}
            {filteredSanctions.map((s) => (
              <div
                key={s._id}
                style={{
                  background: cardBg,
                  borderRadius: 12,
                  padding: listCardPadding,
                  display: "flex",
                  flexDirection: listItemFlexDirection,
                  justifyContent: "space-between",
                  alignItems: listItemAlignItems,
                  gap: listItemGap,
                  boxShadow: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)",
                  border: `1px solid ${cardBorder}`,
                }}
              >
                <div style={{ fontWeight: 600, fontSize: isMobile ? 15 : 16, color: textPrimary }}>{s.libelle}</div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    onClick={() => startEditSanction(s)}
                    style={{ background: buttonPrimaryBg, color: "white", border: "none", borderRadius: 6, padding: actionButtonPadding, cursor: "pointer", fontSize: actionButtonFontSize }}
                    title="Modifier"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteSanction(s._id)}
                    style={{ background: buttonDangerBg, color: "white", border: "none", borderRadius: 6, padding: actionButtonPadding, cursor: "pointer", fontSize: actionButtonFontSize }}
                    title="Supprimer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <ConfirmDialog {...dialogProps} />
    </div>
  );
}