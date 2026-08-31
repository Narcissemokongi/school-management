import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import { Calendar, Loader, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";

export function AnneeSelector({ ecoleId, anneeId, onAnneeChange, userId }) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();
  // ✅ Utiliser "list" au lieu de "listByEcole"
  const annees = useQuery(api.anneesScolaires.list, ecoleId ? { ecoleId } : "skip");
  const setActive = useMutation(api.anneesScolaires.setActive);
  const [activating, setActivating] = useState(false);

  const anneesTriees = annees
    ? [...annees].sort((a, b) => b.nom.localeCompare(a.nom, undefined, { numeric: true }))
    : [];

  const handleChange = async (newAnneeId) => {
    if (!newAnneeId || newAnneeId === anneeId) return;
    onAnneeChange(newAnneeId);
  };

  const handleActivateCurrent = async () => {
    if (!anneeId || !userId) return;
    const annee = annees?.find((a) => a._id === anneeId);
    if (annee?.estActive) {
      toast.success("Cette année est déjà active.");
      return;
    }
    setActivating(true);
    try {
      // ✅ Ajouter userId dans l'appel
      await setActive({ anneeId, userId });
      toast.success("Année activée avec succès.");
      onAnneeChange(anneeId);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setActivating(false);
    }
  };

  // ... styles inchangés ...
}