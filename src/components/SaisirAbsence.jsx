import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useStyles } from "../styles/theme";
import { Search, Calendar, Clock, AlertTriangle, Check } from "lucide-react";
import toast from "react-hot-toast";

export function SaisirAbsence({ ecoleId, eleves, user, anneeId, anneeActive }) {
  const { S } = useStyles();
  const addAbsence = useMutation(api.absences.add);

  const [selectedEleve, setSelectedEleve] = useState(null); // objet élève complet
  const [type, setType] = useState("absence");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [commentaire, setCommentaire] = useState("");
  const [search, setSearch] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Recherche filtrée (minimum 2 caractères)
  const searchActive = search.length >= 2;
  const filtered = searchActive
    ? eleves.filter((e) =>
        `${e.nom} ${e.postnom}`.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  // Sélection d'un élève dans les résultats
  const selectEleve = (eleve) => {
    setSelectedEleve(eleve);
    setSearch(`${eleve.nom} ${eleve.postnom}`);
    setErrors((prev) => ({ ...prev, selectedEleve: undefined }));
  };

  const validate = () => {
    const err = {};
    if (!selectedEleve) err.selectedEleve = "Veuillez sélectionner un élève.";
    if (!date) err.date = "La date est requise.";
    return err;
  };

  const handleSubmit = async () => {
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSubmitting(true);
    try {
      await addAbsence({
        eleveId: selectedEleve._id,
        ecoleId,
        type,
        date,
        commentaire: commentaire || undefined,
        anneeId,
        userId: user._id,
      });
      toast.success(`${type === "absence" ? "Absence" : "Retard"} enregistré(e)`);
      // Réinitialisation
      setSelectedEleve(null);
      setSearch("");
      setType("absence");
      setDate(new Date().toISOString().split("T")[0]);
      setCommentaire("");
      setErrors({});
    } catch (err) {
      toast.error("Erreur : " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = (field) => ({
    width: "100%",
    padding: "10px 14px 10px 42px",
    border: `1.5px solid ${errors[field] ? "#EF4444" : "#E2E8F0"}`,
    borderRadius: 10,
    fontSize: 14,
    outline: "none",
    background: errors[field] ? "#FEF2F2" : "#F9FAFB",
    transition: "border-color 0.2s",
  });

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "24px 16px" }}>
      {/* En-tête */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, color: "#1E293B", margin: 0 }}>
          Saisir une absence ou un retard
        </h2>
        <p style={{ color: "#64748B", marginTop: 4, fontSize: 14 }}>
          {eleves.length} élève(s) {anneeActive ? `· ${anneeActive.nom}` : ""}
        </p>
      </div>

      {/* Carte de recherche */}
      <div style={{
        background: "#FFF",
        borderRadius: 16,
        padding: 24,
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        marginBottom: 24,
      }}>
        <label
          htmlFor="recherche-eleve"
          style={{
            display: "block",
            marginBottom: 6,
            fontWeight: 500,
            fontSize: 14,
            color: "#374151",
          }}
        >
          <Search size={16} style={{ marginRight: 4, verticalAlign: "middle" }} />
          Rechercher un élève
        </label>
        <div style={{ position: "relative" }}>
          <Search
            size={18}
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: "#9CA3AF",
            }}
          />
          <input
            id="recherche-eleve"
            type="text"
            placeholder="Tapez le nom de l'élève..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedEleve(null);
              setErrors((prev) => ({ ...prev, selectedEleve: undefined }));
            }}
            style={inputStyle("selectedEleve")}
          />
        </div>
        {errors.selectedEleve && (
          <div style={{ color: "#EF4444", fontSize: 13, marginTop: 4 }}>
            {errors.selectedEleve}
          </div>
        )}

        {/* Résultats de recherche */}
        {searchActive && filtered.length > 0 && !selectedEleve && (
          <div style={{
            marginTop: 12,
            border: "1px solid #E2E8F0",
            borderRadius: 10,
            overflow: "hidden",
          }}>
            {filtered.map((e) => (
              <div
                key={e._id}
                onClick={() => selectEleve(e)}
                style={{
                  padding: "10px 14px",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderBottom: "1px solid #F1F5F9",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(ev) => ev.currentTarget.style.background = "#F8FAFC"}
                onMouseLeave={(ev) => ev.currentTarget.style.background = "transparent"}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>
                    {e.nom} {e.postnom}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748B" }}>
                    Classe {e.classe}
                  </div>
                </div>
                <Check size={16} color="#4F46E5" style={{ opacity: selectedEleve?._id === e._id ? 1 : 0 }} />
              </div>
            ))}
          </div>
        )}

        {searchActive && filtered.length === 0 && !selectedEleve && (
          <div style={{ marginTop: 12, color: "#64748B", fontSize: 13 }}>
            Aucun élève trouvé pour "{search}".
          </div>
        )}

        {/* Élève sélectionné */}
        {selectedEleve && (
          <div style={{
            marginTop: 12,
            padding: "10px 14px",
            background: "#EEF2FF",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}>
            <Check size={16} color="#4F46E5" />
            <span style={{ fontWeight: 600, fontSize: 14 }}>
              {selectedEleve.nom} {selectedEleve.postnom}
            </span>
            <span style={{ color: "#64748B", fontSize: 13 }}>
              ({selectedEleve.classe})
            </span>
          </div>
        )}
      </div>

      {/* Carte détails */}
      <div style={{
        background: "#FFF",
        borderRadius: 16,
        padding: 24,
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        marginBottom: 24,
      }}>
        <div style={{ marginBottom: 20 }}>
          <label
            htmlFor="type"
            style={{
              display: "block",
              marginBottom: 6,
              fontWeight: 500,
              fontSize: 14,
              color: "#374151",
            }}
          >
            Type
          </label>
          <select
            id="type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 14px",
              border: "1.5px solid #E2E8F0",
              borderRadius: 10,
              fontSize: 14,
              outline: "none",
              background: "#F9FAFB",
              transition: "border-color 0.2s",
            }}
          >
            <option value="absence">Absence</option>
            <option value="retard">Retard</option>
          </select>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label
            htmlFor="date"
            style={{
              display: "block",
              marginBottom: 6,
              fontWeight: 500,
              fontSize: 14,
              color: "#374151",
            }}
          >
            Date
          </label>
          <div style={{ position: "relative" }}>
            <Calendar
              size={18}
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: "#9CA3AF",
              }}
            />
            <input
              id="date"
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setErrors((prev) => ({ ...prev, date: undefined }));
              }}
              style={inputStyle("date")}
            />
          </div>
          {errors.date && (
            <div style={{ color: "#EF4444", fontSize: 13, marginTop: 4 }}>
              {errors.date}
            </div>
          )}
        </div>

        <div style={{ marginBottom: 20 }}>
          <label
            htmlFor="commentaire"
            style={{
              display: "block",
              marginBottom: 6,
              fontWeight: 500,
              fontSize: 14,
              color: "#374151",
            }}
          >
            Commentaire (optionnel)
          </label>
          <textarea
            id="commentaire"
            value={commentaire}
            onChange={(e) => setCommentaire(e.target.value)}
            placeholder="Raison de l'absence ou du retard..."
            style={{
              width: "100%",
              padding: "10px 14px",
              border: "1.5px solid #E2E8F0",
              borderRadius: 10,
              fontSize: 14,
              outline: "none",
              background: "#F9FAFB",
              height: 100,
              resize: "vertical",
              fontFamily: "inherit",
              transition: "border-color 0.2s",
            }}
          />
        </div>
      </div>

      {/* Bouton de soumission */}
      <button
        onClick={handleSubmit}
        disabled={!selectedEleve || !date || submitting}
        style={{
          width: "100%",
          padding: "12px 0",
          background: !selectedEleve || !date || submitting ? "#A5B4FC" : "#4F46E5",
          color: "#FFFFFF",
          border: "none",
          borderRadius: 10,
          fontSize: 16,
          fontWeight: 600,
          cursor: !selectedEleve || !date || submitting ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          transition: "background 0.2s",
          boxShadow: !selectedEleve || !date || submitting ? "none" : "0 4px 12px rgba(79,70,229,0.2)",
        }}
      >
        {submitting ? (
          <>
            <span style={{ display: "inline-block", width: 16, height: 16, border: "2px solid white", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
            Enregistrement...
          </>
        ) : (
          "Enregistrer"
        )}
      </button>
    </div>
  );
}