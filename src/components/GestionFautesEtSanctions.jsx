import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useStyles } from "../styles/theme";
import { useConfirm } from "../hooks/useConfirm";
import { ConfirmDialog } from "./ConfirmDialog";
import toast from "react-hot-toast";
import { Loader, Plus, Trash2, Edit2 } from "lucide-react";

export function GestionFautesEtSanctions({
  fautes,
  addFaute,
  updateFaute,
  removeFaute,
  ecoleId,
  sanctions,
  userId,
}) {
  const { S } = useStyles();
  const { confirm, dialogProps } = useConfirm();
  const [subTab, setSubTab] = useState("fautes");

  // ----- État pour les fautes -----
  const [editMode, setEditMode] = useState(null);
  const [libelle, setLibelle] = useState("");
  const [gravite, setGravite] = useState("Légère");
  const [addingFaute, setAddingFaute] = useState(false);

  // ----- État pour les sanctions -----
  const addSanction = useMutation(api.sanctions.add);
  const updateSanction = useMutation(api.sanctions.update);
  const removeSanction = useMutation(api.sanctions.remove);
  const [editSanctionMode, setEditSanctionMode] = useState(null);
  const [sanctionLibelle, setSanctionLibelle] = useState("");
  const [addingSanction, setAddingSanction] = useState(false);

  // Réinitialisation du formulaire de faute
  const resetForm = () => {
    setLibelle("");
    setGravite("Légère");
    setEditMode(null);
  };

  // Soumission d'une faute
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

  // Édition d'une faute
  const startEdit = (f) => {
    setLibelle(f.libelle);
    setGravite(f.gravite);
    setEditMode(f._id);
  };

  // Suppression d'une faute
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

  // ----- Sanctions -----
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

  // Styles d'input réutilisables
  const inputStyle = {
    width: "100%",
    padding: "10px 14px",
    border: "1px solid #E2E8F0",
    borderRadius: 8,
    fontSize: 14,
    marginBottom: 16,
    outline: "none",
    background: "#F8FAFC",
  };

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 16px" }}>
      {/* En-tête */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, color: "#1E293B", margin: 0 }}>
          Discipline
        </h2>
        <p style={{ color: "#64748B", marginTop: 4, fontSize: 14 }}>
          Gérez les types de fautes et les sanctions
        </p>
      </div>

      {/* Onglets */}
      <div style={{ display: "flex", gap: 0, borderBottom: "2px solid #E2E8F0", marginBottom: 24 }}>
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
              padding: "12px 20px",
              border: "none",
              background: "transparent",
              color: subTab === t.id ? "#4F46E5" : "#64748B",
              fontWeight: subTab === t.id ? 600 : 400,
              borderBottom: subTab === t.id ? "3px solid #4F46E5" : "3px solid transparent",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Contenu */}
      {subTab === "fautes" && (
        <div>
          {/* Formulaire */}
          <div
            style={{
              background: "#FFF",
              borderRadius: 16,
              padding: 24,
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              marginBottom: 24,
            }}
          >
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>
              {editMode ? "Modifier la faute" : "Nouvelle faute"}
            </h3>
            <form onSubmit={handleSubmit}>
              <label style={{ display: "block", marginBottom: 6, fontWeight: 500 }}>Libellé</label>
              <input
                style={inputStyle}
                placeholder="Ex: Chewing-gum"
                value={libelle}
                onChange={(e) => setLibelle(e.target.value)}
              />
              <label style={{ display: "block", marginBottom: 6, fontWeight: 500 }}>Gravité</label>
              <select
                value={gravite}
                onChange={(e) => setGravite(e.target.value)}
                style={inputStyle}
              >
                <option value="Légère">Légère</option>
                <option value="Moyenne">Moyenne</option>
                <option value="Grave">Grave</option>
              </select>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="submit"
                  disabled={addingFaute || !libelle.trim()}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "10px 20px",
                    background: addingFaute ? "#A5B4FC" : editMode ? "#F59E0B" : "#4F46E5",
                    color: "white",
                    border: "none",
                    borderRadius: 10,
                    fontWeight: 600,
                    cursor: addingFaute ? "not-allowed" : "pointer",
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
                      padding: "10px 20px",
                      background: "#F1F5F9",
                      border: "none",
                      borderRadius: 10,
                      fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    Annuler
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Liste des fautes */}
          <div style={{ display: "grid", gap: 12 }}>
            {fautes.length === 0 && (
              <div
                style={{
                  background: "#FFF",
                  borderRadius: 16,
                  padding: 48,
                  textAlign: "center",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                  color: "#64748B",
                }}
              >
                <p>Aucun type de faute défini.</p>
              </div>
            )}
            {fautes.map((f) => (
              <div
                key={f._id}
                style={{
                  background: "#FFF",
                  borderRadius: 12,
                  padding: "16px 20px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 16 }}>{f.libelle}</div>
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
                          ? "#FEE2E2"
                          : f.gravite === "Moyenne"
                          ? "#FEF3C7"
                          : "#D1FAE5",
                      color:
                        f.gravite === "Grave"
                          ? "#B91C1C"
                          : f.gravite === "Moyenne"
                          ? "#92400E"
                          : "#065F46",
                    }}
                  >
                    {f.gravite}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    onClick={() => startEdit(f)}
                    style={{
                      background: "#4F46E5",
                      color: "white",
                      border: "none",
                      borderRadius: 6,
                      padding: "6px 12px",
                      cursor: "pointer",
                    }}
                    title="Modifier"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => deleteFaute(f._id)}
                    style={{
                      background: "#EF4444",
                      color: "white",
                      border: "none",
                      borderRadius: 6,
                      padding: "6px 12px",
                      cursor: "pointer",
                    }}
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

      {subTab === "sanctions" && (
        <div>
          {/* Formulaire sanction */}
          <div
            style={{
              background: "#FFF",
              borderRadius: 16,
              padding: 24,
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              marginBottom: 24,
            }}
          >
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>
              {editSanctionMode ? "Modifier la sanction" : "Nouvelle sanction"}
            </h3>
            <form onSubmit={handleSanctionSubmit}>
              <label style={{ display: "block", marginBottom: 6, fontWeight: 500 }}>Libellé</label>
              <input
                style={inputStyle}
                placeholder="Ex: Retenue"
                value={sanctionLibelle}
                onChange={(e) => setSanctionLibelle(e.target.value)}
              />
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="submit"
                  disabled={addingSanction || !sanctionLibelle.trim()}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "10px 20px",
                    background: addingSanction ? "#A5B4FC" : editSanctionMode ? "#F59E0B" : "#4F46E5",
                    color: "white",
                    border: "none",
                    borderRadius: 10,
                    fontWeight: 600,
                    cursor: addingSanction ? "not-allowed" : "pointer",
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
                      padding: "10px 20px",
                      background: "#F1F5F9",
                      border: "none",
                      borderRadius: 10,
                      fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    Annuler
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Liste des sanctions */}
          <div style={{ display: "grid", gap: 12 }}>
            {sanctions.length === 0 && (
              <div
                style={{
                  background: "#FFF",
                  borderRadius: 16,
                  padding: 48,
                  textAlign: "center",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                  color: "#64748B",
                }}
              >
                <p>Aucune sanction définie.</p>
              </div>
            )}
            {sanctions.map((s) => (
              <div
                key={s._id}
                style={{
                  background: "#FFF",
                  borderRadius: 12,
                  padding: "16px 20px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 16 }}>{s.libelle}</div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    onClick={() => startEditSanction(s)}
                    style={{
                      background: "#4F46E5",
                      color: "white",
                      border: "none",
                      borderRadius: 6,
                      padding: "6px 12px",
                      cursor: "pointer",
                    }}
                    title="Modifier"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteSanction(s._id)}
                    style={{
                      background: "#EF4444",
                      color: "white",
                      border: "none",
                      borderRadius: 6,
                      padding: "6px 12px",
                      cursor: "pointer",
                    }}
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