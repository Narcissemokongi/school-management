import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useStyles } from "../styles/theme";
import { Calendar, Loader, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";

export function AnneeSelector({ ecoleId, anneeId, onAnneeChange }) {
  const { dark } = useStyles();
  const annees = useQuery(api.anneesScolaires.listByEcole, ecoleId ? { ecoleId } : "skip");
  const setActive = useMutation(api.anneesScolaires.setActive);
  const [activating, setActivating] = useState(false);

  // Tri des années : la plus récente en premier (nom décroissant)
  const anneesTriees = annees
    ? [...annees].sort((a, b) => b.nom.localeCompare(a.nom, undefined, { numeric: true }))
    : [];

  const handleChange = async (newAnneeId) => {
    if (!newAnneeId || newAnneeId === anneeId) return;
    onAnneeChange(newAnneeId);
  };

  // Active l'année sélectionnée
  const handleActivateCurrent = async () => {
    if (!anneeId) return;
    const annee = annees?.find((a) => a._id === anneeId);
    if (annee?.estActive) {
      toast.success("Cette année est déjà active.");
      return;
    }
    setActivating(true);
    try {
      await setActive({ anneeId });
      toast.success("Année activée avec succès.");
      onAnneeChange(anneeId); // Rafraîchir l'affichage
    } catch (err) {
      toast.error(err.message);
    } finally {
      setActivating(false);
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <Calendar size={18} color={dark ? "#94A3B8" : "#64748B"} />
      {annees === undefined ? (
        <Loader size={16} className="animate-spin" style={{ color: dark ? "#818CF8" : "#4F46E5" }} />
      ) : (
        <>
          <select
            value={anneeId || ""}
            onChange={(e) => handleChange(e.target.value)}
            style={{
              padding: "8px 12px",
              border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
              borderRadius: 8,
              fontSize: 14,
              background: dark ? "#1E293B" : "#FFFFFF",
              color: dark ? "#F1F5F9" : "#1E293B",
              outline: "none",
              cursor: "pointer",
              minWidth: 180,
            }}
          >
            {anneesTriees.length === 0 && <option value="">Aucune année</option>}
            {anneesTriees.map((annee) => (
              <option
                key={annee._id}
                value={annee._id}
                style={{ background: dark ? "#1E293B" : "#FFF" }}
              >
                {annee.nom} {annee.estActive ? "✅ Actuelle" : ""}
              </option>
            ))}
          </select>
          {/* Bouton d'activation visible si l'année sélectionnée n'est pas active et qu'une autre année est active */}
          {anneesTriees.some((a) => a.estActive) &&
            !anneesTriees.find((a) => a._id === anneeId)?.estActive && (
              <button
                onClick={handleActivateCurrent}
                disabled={activating}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "6px 12px",
                  background: dark ? "#34D399" : "#10B981",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  fontWeight: 500,
                  cursor: activating ? "not-allowed" : "pointer",
                  opacity: activating ? 0.7 : 1,
                }}
                title="Activer cette année"
              >
                {activating ? <Loader size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                Activer
              </button>
            )}
        </>
      )}
    </div>
  );
}