import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import { Calendar, Loader, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";

// ============================================================
// HELPER ERREUR
// ============================================================
function extractErrMsg(err, fallback = "Erreur inconnue") {
  if (!err) return fallback;
  if (typeof err === "string") return err;
  if (typeof err === "object" && err.message) return err.message;
  return fallback;
}

export function AnneeSelector({ ecoleId, anneeId, onAnneeChange, userId }) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();
  const [activating, setActivating] = useState(false);

  // ✅ userId ajouté à la query + garde stricte
  const annees = useQuery(
    api.anneesScolaires.listByEcole,
    ecoleId && userId ? { ecoleId, userId } : "skip"
  );

  const setActive = useMutation(api.anneesScolaires.setActive);

  // Tri : année la plus récente en premier
  const anneesTriees = useMemo(() => {
    if (!annees) return [];
    return [...annees].sort((a, b) =>
      b.nom.localeCompare(a.nom, undefined, { numeric: true })
    );
  }, [annees]);

  // Année actuellement sélectionnée (lookup une seule fois)
  const anneeSelectionnee = useMemo(
    () => anneesTriees.find((a) => a._id === anneeId) ?? null,
    [anneesTriees, anneeId]
  );

  // Au moins une année active dans la liste
  const aUneAnneeActive = useMemo(
    () => anneesTriees.some((a) => a.estActive),
    [anneesTriees]
  );

  // Affiche le bouton si : une année est active ET la sélectionnée ne l'est pas
  const showActivateButton =
    aUneAnneeActive && anneeSelectionnee && !anneeSelectionnee.estActive;

  // ===== HANDLERS =====
  const handleChange = useCallback(
    (newAnneeId) => {
      if (!newAnneeId || newAnneeId === anneeId) return;
      onAnneeChange(newAnneeId);
    },
    [anneeId, onAnneeChange]
  );

  const handleActivateCurrent = useCallback(async () => {
    if (activating) return;
    if (!anneeId || !userId) return;

    if (anneeSelectionnee?.estActive) {
      toast.success("Cette année est déjà active.");
      return;
    }

    setActivating(true);
    try {
      await setActive({ anneeId, userId });
      toast.success("Année activée avec succès.");
      onAnneeChange(anneeId);
    } catch (err) {
      toast.error(extractErrMsg(err, "Impossible d'activer l'année"));
    } finally {
      setActivating(false);
    }
  }, [
    activating,
    anneeId,
    userId,
    anneeSelectionnee,
    setActive,
    onAnneeChange,
  ]);

  // ===== Styles adaptatifs =====
  const containerStyle = {
    display: "flex",
    alignItems: isMobile ? "stretch" : "center",
    gap: 8,
    flexWrap: "wrap",
    flexDirection: isMobile ? "column" : "row",
    width: isMobile ? "100%" : "auto",
  };

  const innerRowStyle = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    width: isMobile ? "100%" : "auto",
  };

  const selectStyle = {
    padding: isMobile ? "12px 14px" : "8px 12px",
    border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
    borderRadius: 8,
    fontSize: isMobile ? 16 : 14, // 16px évite le zoom iOS
    background: dark ? "#1E293B" : "#FFFFFF",
    color: dark ? "#F1F5F9" : "#1E293B",
    outline: "none",
    cursor: "pointer",
    width: isMobile ? "100%" : "auto",
    minWidth: isMobile ? "100%" : 180,
    flex: isMobile ? 1 : "0 0 auto",
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
    transition: "opacity 0.2s ease",
  };

  // ===== Rendu =====
  return (
    <div style={containerStyle}>
      {/* Keyframes préfixés as-* (Annee Selector) */}
      <style>{`
        @keyframes as-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .as-spin { animation: as-spin 1s linear infinite; }
        @media (prefers-reduced-motion: reduce) {
          .as-spin { animation: none !important; }
        }
      `}</style>

      <div style={innerRowStyle}>
        <Calendar
          size={isMobile ? 20 : 18}
          color={dark ? "#94A3B8" : "#64748B"}
        />

        {annees === undefined ? (
          <Loader
            size={16}
            className="as-spin"
            style={{ color: dark ? "#818CF8" : "#4F46E5" }}
          />
        ) : (
          <select
            value={anneeId || ""}
            onChange={(e) => handleChange(e.target.value)}
            style={selectStyle}
          >
            {anneesTriees.length === 0 && (
              <option value="">Aucune année</option>
            )}
            {anneesTriees.map((annee) => (
              <option
                key={annee._id}
                value={annee._id}
                style={{ background: dark ? "#1E293B" : "#FFF" }}
              >
                {annee.nom} {annee.estActive ? "· Actuelle" : ""}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Bouton d'activation */}
      {showActivateButton && (
        <button
          onClick={handleActivateCurrent}
          disabled={activating}
          style={activateButtonStyle}
          title="Activer cette année"
          aria-label="Activer cette année scolaire"
        >
          {activating ? (
            <Loader size={16} className="as-spin" />
          ) : (
            <CheckCircle size={isMobile ? 20 : 16} />
          )}
          Activer
        </button>
      )}
    </div>
  );
}