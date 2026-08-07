import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useStyles } from "../styles/theme";

export function GestionEcoles({ onSelectEcole, user }) {
  const { S } = useStyles();
  const [nouveauNom, setNouveauNom] = useState("");
  const [success, setSuccess] = useState(false);
  const ecoles = useQuery(api.ecoles.list) ?? [];
  const addEcole = useMutation(api.ecoles.add);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!nouveauNom.trim()) return;
    try {
      await addEcole({ nom: nouveauNom.trim(), userId: user._id });
      setNouveauNom("");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      alert(err.message); // gestion basique, vous pouvez remplacer par toast
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={S.h2}>Sélectionnez une école</div>
        <div style={S.muted}>{ecoles.length} école(s) disponible(s)</div>
      </div>

      <div style={S.card}>
        <div style={{ fontWeight: 700, marginBottom: 12, color: "#4f46e5" }}>➕ Créer une nouvelle école</div>
        <form onSubmit={handleAdd} style={{ display: "flex", gap: 10 }}>
          <input
            style={{ ...S.input, marginBottom: 0, flex: 1 }}
            placeholder="Nom de l'école"
            value={nouveauNom}
            onChange={(e) => setNouveauNom(e.target.value)}
          />
          <button type="submit" style={{ ...S.btn("#4f46e5"), width: "auto" }}>
            {success ? "✅ Créée" : "Créer"}
          </button>
        </form>
      </div>

      {ecoles.map((ecole) => (
        <div
          key={ecole._id}
          onClick={() => onSelectEcole(ecole._id)}
          style={{
            ...S.card,
            cursor: "pointer",
            marginTop: 12,
            border: `1px solid #4f46e540`,
          }}
        >
          <div style={S.between}>
            <div style={S.h3}>{ecole.nom}</div>
            <span style={{ color: "#4f46e5", fontSize: 18 }}>→</span>
          </div>
        </div>
      ))}
    </div>
  );
}