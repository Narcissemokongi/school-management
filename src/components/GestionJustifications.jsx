import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import toast from "react-hot-toast";
import { useState } from "react";

export function GestionJustifications({ ecoleId, userId }) {
  const absencesEnAttente = useQuery(api.absences.listEnAttente, { ecoleId }) ?? [];
  const statuer = useMutation(api.absences.statuerJustificatif);
  const [commentaireId, setCommentaireId] = useState(null);
  const [commentaire, setCommentaire] = useState("");

  const handleStatuer = async (absenceId, statut) => {
    try {
      await statuer({ absenceId, statut, commentaire: commentaire || undefined, userId });
      toast.success(statut === "justifiee" ? "Justificatif validé" : "Justificatif rejeté");
      setCommentaireId(null);
      setCommentaire("");
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (absencesEnAttente.length === 0) return <p>Aucune demande en attente.</p>;

  return (
    <div>
      <h3>Justifications en attente ({absencesEnAttente.length})</h3>
      {absencesEnAttente.map((a) => (
        <div key={a._id} style={{ marginBottom: 12, padding: 8, border: "1px solid #ccc" }}>
          <div>Élève : {a.eleveNom}</div>
          <div>{a.date} – {a.type}</div>
          <div>Justificatif : {a.justificatif}</div>
          <div style={{ marginTop: 8 }}>
            <button onClick={() => handleStatuer(a._id, "justifiee")}>✅ Valider</button>
            <button onClick={() => setCommentaireId(a._id)} style={{ marginLeft: 8 }}>❌ Rejeter</button>
          </div>
          {commentaireId === a._id && (
            <div style={{ marginTop: 8 }}>
              <input
                type="text"
                value={commentaire}
                onChange={(e) => setCommentaire(e.target.value)}
                placeholder="Motif du rejet (optionnel)"
              />
              <button onClick={() => handleStatuer(a._id, "rejetee")} style={{ marginLeft: 8 }}>Confirmer le rejet</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}