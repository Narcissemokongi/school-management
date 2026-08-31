import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useStyles } from "../styles/theme";
import { useIsMobile } from "../hooks/useIsMobile"; // <-- Import du hook
import { Calendar, Loader, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";

export function AnneeSelector({ ecoleId, anneeId, onAnneeChange }) {
  const { dark } = useStyles();
  const isMobile = useIsMobile(); // Détection mobile
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

  // Styles adaptatifs
  const containerStyle = {
    display: "flex",
    alignItems: isMobile ? "stretch" : "center",
    gap: 8,
    flexWrap: "wrap",
    flexDirection: isMobile ? "column" : "row",
    width: isMobile ? "100%" : "auto",
  };
  const selectStyle = {
    padding: isMobile ? "12px 14px" : "8px 12px",
    border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
    borderRadius: 8,
    fontSize: isMobile ? 16 : 14, // 16px pour éviter le zoom iOS
    background: dark ? "#1E293B" : "#FFFFFF",
    color: dark ? "#F1F5F9" : "#1E293B",
    outline: "none",
    cursor: "pointer",
    width: isMobile ? "100%" : "auto",
    minWidth: isMobile ? "100%" : 180,
  };
  const activateButtonStyle = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: isMobile ? "12px 16px" : "6px 12px",
    background: dark ? "#34D399" : "#10B981",
    color: "white",
    border: "none",
    borderRadius: 8,
    fontWeight: 500,
    cursor: activating ? "not-allowed" : "pointer",
    opacity: activating ? 0.7 : 1,
    fontSize: isMobile ? 16 : 14,
    width: isMobile ? "100%" : "auto",
  };

  return (
    <div style={containerStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, width: isMobile ? "100%" : "auto" }}>
        <Calendar size={isMobile ? 20 : 18} color={dark ? "#94A3B8" : "#64748B"} />
        {annees === undefined ? (
          <Loader size={16} className="animate-spin" style={{ color: dark ? "#818CF8" : "#4F46E5" }} />
        ) : (
          <select
            value={anneeId || ""}
            onChange={(e) => handleChange(e.target.value)}
            style={selectStyle}
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
        )}
      </div>
      {/* Bouton d'activation visible si l'année sélectionnée n'est pas active et qu'une autre année est active */}
      {anneesTriees.some((a) => a.estActive) &&
        !anneesTriees.find((a) => a._id === anneeId)?.estActive && (
          <button
            onClick={handleActivateCurrent}
            disabled={activating}
            style={activateButtonStyle}
            title="Activer cette année"
          >
            {activating ? <Loader size={16} className="animate-spin" /> : <CheckCircle size={isMobile ? 20 : 16} />}
            Activer
          </button>
        )}
    </div>
  );
}