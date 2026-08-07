import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api"; // chemin correct depuis src/components/
import { useStyles } from "../styles/theme";

export function GestionAnnees({ ecoleId }) {
  const { S } = useStyles();
  const [nouveauNom, setNouveauNom] = useState("");
  const annees = useQuery(api.anneesScolaires.listByEcole, ecoleId ? { ecoleId } : "skip") ?? [];
  const addAnnee = useMutation(api.anneesScolaires.add);
  const setActive = useMutation(api.anneesScolaires.setActive);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!nouveauNom.trim() || !ecoleId) return;
    try {
      await addAnnee({ nom: nouveauNom.trim(), ecoleId, estActive: false });
      setNouveauNom("");
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div style={S.card}>
      <h3 style={S.h3}>📅 Années scolaires</h3>
      <form onSubmit={handleAdd} style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input
          placeholder="ex: 2025-2026"
          value={nouveauNom}
          onChange={(e) => setNouveauNom(e.target.value)}
          style={S.input}
        />
        <button type="submit" style={S.btn("#4f46e5")}>Ajouter</button>
      </form>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {annees.map((annee) => (
          <div key={annee._id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontWeight: annee.estActive ? 700 : 400 }}>
              {annee.nom} {annee.estActive && "✅ (active)"}
            </span>
            {!annee.estActive && (
              <button onClick={() => setActive({ anneeId: annee._id })} style={S.btn("#10b981")}>
                Activer
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}