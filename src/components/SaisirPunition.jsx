import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useStyles } from "../styles/theme";
import { getFaute } from "../utils";
import toast from "react-hot-toast";
import { Loader } from "lucide-react";
import { userFriendlyError } from "../utils/errorMessages";

export function SaisirPunition({ user, ecoleId, eleves, fautes, sanctions, addPunition, onNotif, anneeId, anneeActive }) {
  const { S } = useStyles();
  const [search, setSearch] = useState("");
  const [selectedEleve, setSelectedEleve] = useState(null);
  const [idFaute, setIdFaute] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [commentaire, setCommentaire] = useState("");
  const [sanction, setSanction] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const addPunitionMutation = useMutation(api.punitions.add);

  const filtered = search.length > 1
    ? eleves.filter((e) => `${e.nom} ${e.postnom}`.toLowerCase().includes(search.toLowerCase()))
    : [];

  const validate = () => {
    const newErrors = {};
    if (!selectedEleve) newErrors.selectedEleve = "Veuillez sélectionner un élève.";
    if (!idFaute) newErrors.idFaute = "Veuillez choisir un type de faute.";
    if (!date) newErrors.date = "La date est requise.";
    if (!sanction) newErrors.sanction = "Veuillez choisir une sanction.";
    return newErrors;
  };

  const handleBlur = (field) => {
    const currentErrors = { ...errors };
    switch (field) {
      case "selectedEleve":
        if (!selectedEleve) currentErrors.selectedEleve = "Veuillez sélectionner un élève.";
        else delete currentErrors.selectedEleve;
        break;
      case "idFaute":
        if (!idFaute) currentErrors.idFaute = "Veuillez choisir un type de faute.";
        else delete currentErrors.idFaute;
        break;
      case "date":
        if (!date) currentErrors.date = "La date est requise.";
        else delete currentErrors.date;
        break;
      case "sanction":
        if (!sanction) currentErrors.sanction = "Veuillez choisir une sanction.";
        else delete currentErrors.sanction;
        break;
      default:
        break;
    }
    setErrors(currentErrors);
  };

  const handleSubmit = async () => {
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSubmitting(true);
    try {
      const faute = getFaute(fautes, idFaute);
      await addPunitionMutation({
        idEleve: selectedEleve._id,
        idFaute,
        date,
        commentaire: commentaire || undefined,
        sanction,
        disciplinaire: user.nom,
        ecoleId,
        anneeId,
        userId: user._id,
      });
      toast.success("Punition enregistrée");
      if (faute?.gravite === "Grave") {
        onNotif(`${selectedEleve.nom} ${selectedEleve.postnom} (${selectedEleve.classe}) — ${faute.libelle}`);
      }
      // Réinitialisation
      setSelectedEleve(null);
      setSearch("");
      setIdFaute("");
      setDate(new Date().toISOString().split("T")[0]);
      setCommentaire("");
      setSanction("");
      setErrors({});
    } catch (err) {
      toast.error(userFriendlyError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const isFormValid = selectedEleve && idFaute && date && sanction;

  return (
    <div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .animate-spin { animation: spin 1s linear infinite; }`}</style>

      <div style={{ marginBottom: 20 }}>
        <div style={S.h2}>Nouvelle punition</div>
        <div style={S.muted}>Enregistrez une faute disciplinaire {anneeActive && ` · ${anneeActive.nom}`}</div>
      </div>

      <div style={S.card}>
        <label style={S.label}>🔍 Rechercher un élève</label>
        <input
          style={{
            ...S.input,
            borderColor: errors.selectedEleve ? "#ef4444" : S.cardBorder,
          }}
          placeholder="Tapez le nom de l'élève..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setSelectedEleve(null);
            setErrors((prev) => ({ ...prev, selectedEleve: undefined }));
          }}
          onBlur={() => handleBlur("selectedEleve")}
        />
        {errors.selectedEleve && (
          <div style={{ color: "#ef4444", fontSize: 13, marginTop: 4 }}>{errors.selectedEleve}</div>
        )}
        {filtered.map((e) => (
          <div
            key={e._id}
            onClick={() => {
              setSelectedEleve(e);
              setSearch(`${e.nom} ${e.postnom}`);
              setErrors((prev) => ({ ...prev, selectedEleve: undefined }));
            }}
            style={{
              padding: "10px 14px",
              background: "#f9fafb",
              borderRadius: 10,
              marginBottom: 6,
              cursor: "pointer",
              border: `1px solid ${selectedEleve?._id === e._id ? "#4f46e5" : S.cardBorder}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{e.nom} {e.postnom}</div>
              <div style={{ fontSize: 12, color: S.textMuted }}>Classe {e.classe}</div>
            </div>
            {selectedEleve?._id === e._id && <span style={{ color: "#4f46e5" }}>✓</span>}
          </div>
        ))}
        {selectedEleve && (
          <div style={{ ...S.badge("#4f46e5"), marginTop: 4 }}>
            ✓ {selectedEleve.nom} {selectedEleve.postnom} — Classe {selectedEleve.classe}
          </div>
        )}
      </div>

      <div style={S.card}>
        <label style={S.label}>Type de faute</label>
        <select
          style={{
            ...S.select,
            borderColor: errors.idFaute ? "#ef4444" : S.cardBorder,
          }}
          value={idFaute}
          onChange={(e) => {
            setIdFaute(e.target.value);
            setErrors((prev) => ({ ...prev, idFaute: undefined }));
          }}
          onBlur={() => handleBlur("idFaute")}
        >
          <option value="">Sélectionner une faute...</option>
          {fautes.map((f) => (
            <option key={f._id} value={f._id}>
              {f.libelle} ({f.gravite})
            </option>
          ))}
        </select>
        {errors.idFaute && (
          <div style={{ color: "#ef4444", fontSize: 13, marginTop: 4 }}>{errors.idFaute}</div>
        )}
        {idFaute && (
          <div
            style={{
              ...S.badge(getFaute(fautes, idFaute)?.gravite === "Grave" ? "#ef4444" : "#f59e0b"),
              marginBottom: 10,
            }}
          >
            Gravité: {getFaute(fautes, idFaute)?.gravite}
          </div>
        )}

        <label style={S.label}>Date</label>
        <input
          style={{
            ...S.input,
            borderColor: errors.date ? "#ef4444" : S.cardBorder,
          }}
          type="date"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            setErrors((prev) => ({ ...prev, date: undefined }));
          }}
          onBlur={() => handleBlur("date")}
        />
        {errors.date && (
          <div style={{ color: "#ef4444", fontSize: 13, marginTop: 4 }}>{errors.date}</div>
        )}

        <label style={S.label}>Sanction</label>
        <select
          style={{
            ...S.select,
            borderColor: errors.sanction ? "#ef4444" : S.cardBorder,
          }}
          value={sanction}
          onChange={(e) => {
            setSanction(e.target.value);
            setErrors((prev) => ({ ...prev, sanction: undefined }));
          }}
          onBlur={() => handleBlur("sanction")}
        >
          <option value="">Choisir une sanction...</option>
          {sanctions.map((s) => (
            <option key={s._id} value={s.libelle}>{s.libelle}</option>
          ))}
        </select>
        {errors.sanction && (
          <div style={{ color: "#ef4444", fontSize: 13, marginTop: 4 }}>{errors.sanction}</div>
        )}

        <label style={S.label}>Commentaire</label>
        <textarea
          style={{ ...S.input, height: 80, resize: "none" }}
          placeholder="Détails de l'incident..."
          value={commentaire}
          onChange={(e) => setCommentaire(e.target.value)}
        />
      </div>

      <button
        style={{
          ...S.btn("#4f46e5"),
          opacity: isFormValid && !submitting ? 1 : 0.6,
          cursor: isFormValid && !submitting ? "pointer" : "not-allowed",
        }}
        onClick={handleSubmit}
        disabled={!isFormValid || submitting}
      >
        {submitting ? (
          <><Loader size={16} className="animate-spin" /> Enregistrement...</>
        ) : "Enregistrer la punition"}
      </button>
    </div>
  );
}