import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useConfirm } from "@/hooks/useConfirm";
import { ConfirmDialog } from "./ConfirmDialog";
import {
  Clock, Save, Trash2, Plus, School, Loader, Check, X,
  CalendarClock, Info, AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";

const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const JOURS_COURT = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const HEURES_DEFAUT = [
  "07:30", "08:30", "09:30", "10:30", "11:30",
  "12:30", "13:30", "14:30", "15:30",
];

function extractErrMsg(err, fallback = "Erreur inconnue") {
  if (!err) return fallback;
  if (typeof err === "string") return err;
  if (typeof err === "object" && err.message) return err.message;
  return fallback;
}

// ============================================================
// CELLULE EMPLOI (input + autocomplétion)
// ============================================================
function CelluleEmploi({ value, onChange, suggestions, dark, isMobile }) {
  const [inputValue, setInputValue] = useState(value);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filtered, setFiltered] = useState([]);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    if (!inputValue.trim()) {
      setFiltered([]);
      return;
    }
    setFiltered(
      suggestions
        .filter((m) => m.toLowerCase().includes(inputValue.toLowerCase()))
        .slice(0, 5)
    );
  }, [inputValue, suggestions]);

  const handleChange = (e) => {
    setInputValue(e.target.value);
    onChange(e.target.value);
    setShowSuggestions(true);
  };

  const handleSelect = (matiere) => {
    setInputValue(matiere);
    onChange(matiere);
    setShowSuggestions(false);
  };

  const hasValue = inputValue.trim().length > 0;

  return (
    <div style={{ position: "relative", minWidth: 0 }}>
      <input
        type="text"
        value={inputValue}
        onChange={handleChange}
        onFocus={() => inputValue.trim() && setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
        style={{
          width: "100%",
          padding: isMobile ? "8px 6px" : "6px 6px",
          border: `1px solid ${
            hasValue
              ? dark
                ? "#4F46E5"
                : "#C7D2FE"
              : dark
              ? "#334155"
              : "#E2E8F0"
          }`,
          borderRadius: 6,
          fontSize: isMobile ? 12 : 11.5,
          textAlign: "center",
          outline: "none",
          background: hasValue
            ? dark
              ? "#312E81"
              : "#EEF2FF"
            : dark
            ? "#0F172A"
            : "#FFFFFF",
          color: hasValue
            ? dark
              ? "#E0E7FF"
              : "#312E81"
            : dark
            ? "#F1F5F9"
            : "#1E293B",
          transition: "all 0.15s",
          boxSizing: "border-box",
          fontWeight: hasValue ? 600 : 400,
          fontFamily: "inherit",
          minWidth: 0,
        }}
        placeholder="—"
      />
      {showSuggestions && filtered.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: 4,
            background: dark ? "#1E293B" : "#FFFFFF",
            border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
            borderRadius: 8,
            boxShadow: dark
              ? "0 8px 20px rgba(0,0,0,0.5)"
              : "0 8px 20px rgba(0,0,0,0.1)",
            zIndex: 20,
            maxHeight: 150,
            overflowY: "auto",
          }}
        >
          {filtered.map((m) => (
            <div
              key={m}
              onMouseDown={() => handleSelect(m)}
              style={{
                padding: "8px 10px",
                cursor: "pointer",
                borderBottom: `1px solid ${
                  dark ? "#334155" : "#F1F5F9"
                }`,
                fontSize: 12,
                color: dark ? "#F1F5F9" : "#1E293B",
                transition: "background 0.1s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = dark
                  ? "#334155"
                  : "#F1F5F9")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              {m}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// BOTTOM SHEET : AJOUTER UNE HEURE
// ============================================================
function AddHeureModal({ open, onClose, onConfirm, dark, isMobile, heuresExistantes }) {
  const [heure, setHeure] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      setHeure("");
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  const handleConfirm = () => {
    if (!heure) {
      setError("Veuillez saisir une heure.");
      return;
    }
    if (heuresExistantes.includes(heure)) {
      setError("Cette heure existe déjà.");
      return;
    }
    onConfirm(heure);
    setHeure("");
  };

  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const inputBg = dark ? "#0F172A" : "#F8FAFC";
  const inputText = dark ? "#F1F5F9" : "#1E293B";
  const accent = dark ? "#818CF8" : "#4F46E5";

  const content = (
    <>
      {isMobile && (
        <div
          style={{
            width: 40,
            height: 4,
            borderRadius: 2,
            background: dark ? "#475569" : "#CBD5E1",
            margin: "0 auto 14px",
          }}
        />
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: dark ? "#312E81" : "#EEF2FF",
              color: accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Clock size={16} />
          </div>
          <h3
            style={{
              margin: 0,
              fontSize: isMobile ? 16 : 17,
              fontWeight: 700,
              color: textPrimary,
            }}
          >
            Ajouter une heure
          </h3>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: textSecondary,
            padding: 4,
          }}
          aria-label="Fermer"
        >
          <X size={22} />
        </button>
      </div>

      <label
        style={{
          display: "block",
          fontSize: 11,
          fontWeight: 700,
          color: dark ? "#CBD5E1" : "#374151",
          marginBottom: 6,
          textTransform: "uppercase",
          letterSpacing: 0.3,
        }}
      >
        Heure
      </label>
      <input
        type="time"
        value={heure}
        onChange={(e) => {
          setHeure(e.target.value);
          if (error) setError(null);
        }}
        autoFocus
        style={{
          width: "100%",
          padding: isMobile ? "12px 14px" : "11px 14px",
          border: `1px solid ${error ? "#EF4444" : cardBorder}`,
          borderRadius: 10,
          fontSize: isMobile ? 16 : 15,
          background: inputBg,
          color: inputText,
          outline: "none",
          boxSizing: "border-box",
          fontFamily: "inherit",
        }}
      />

      {error && (
        <div
          style={{
            color: "#EF4444",
            fontSize: 12,
            marginTop: 8,
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <AlertCircle size={12} />
          {error}
        </div>
      )}

      <p
        style={{
          fontSize: 11,
          color: textSecondary,
          marginTop: 8,
          marginBottom: 16,
          lineHeight: 1.4,
        }}
      >
        La ligne sera ajoutée à toutes les colonnes (jours).
      </p>

      <div
        style={{
          display: "flex",
          gap: 10,
          flexDirection: isMobile ? "column" : "row",
        }}
      >
        <button
          onClick={onClose}
          style={{
            flex: isMobile ? "none" : 1,
            padding: "12px 16px",
            borderRadius: 12,
            border: `1px solid ${cardBorder}`,
            background: "transparent",
            color: dark ? "#CBD5E1" : "#475569",
            fontWeight: 600,
            fontSize: 14,
            cursor: "pointer",
            order: isMobile ? 2 : 1,
          }}
        >
          Annuler
        </button>
        <button
          onClick={handleConfirm}
          disabled={!heure}
          style={{
            flex: isMobile ? "none" : 2,
            padding: "12px 16px",
            borderRadius: 12,
            border: "none",
            background: !heure ? "#A5B4FC" : accent,
            color: "#FFFFFF",
            fontWeight: 700,
            fontSize: 14,
            cursor: !heure ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            order: isMobile ? 1 : 2,
          }}
        >
          <Plus size={14} />
          Ajouter
        </button>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <>
        <div
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 1200,
            animation: "ge-fadeIn 0.18s ease-out",
          }}
        />
        <div
          className="ge-slideUp"
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 0,
            background: cardBg,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: "12px 16px 24px",
            zIndex: 1201,
            maxHeight: "90vh",
            overflowY: "auto",
            boxShadow: "0 -8px 30px rgba(0,0,0,0.25)",
            animation: "ge-slideUp 0.25s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          {content}
        </div>
      </>
    );
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1200,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: cardBg,
          borderRadius: 16,
          padding: 24,
          width: "100%",
          maxWidth: 400,
          boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
          border: `1px solid ${cardBorder}`,
        }}
      >
        {content}
      </div>
    </div>
  );
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================
export function GestionEmploiDuTemps({
  ecoleId,
  classes,
  user,
  anneeId,
  anneeActive,
}) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();
  const { confirm, dialogProps } = useConfirm();

  // ✅ CRITIQUE : les useState DOIVENT être déclarés AVANT toute utilisation
  // de leurs valeurs (sinon → TDZ "Cannot access before initialization")
  const [classeSelectionnee, setClasseSelectionnee] = useState("");
  const [heures, setHeures] = useState(HEURES_DEFAUT);
  const [grille, setGrille] = useState({});
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [editingHeure, setEditingHeure] = useState(null);
  const [editHeureValue, setEditHeureValue] = useState("");
  const [showAddHeure, setShowAddHeure] = useState(false);
  const [loading, setLoading] = useState(false);

  const userId = user?._id;
  // ✅ Maintenant classeSelectionnee est initialisé
  const canQueryCours = Boolean(ecoleId && anneeId && userId);
  const canQueryEdt = Boolean(classeSelectionnee && ecoleId && anneeId && userId);

  // ✅ userId ajouté
  const emploiDuTemps = useQuery(
    api.emploiDuTemps.getByClasse,
    canQueryEdt
      ? { classe: classeSelectionnee, ecoleId, anneeId, userId }
      : "skip"
  );

  const upsert = useMutation(api.emploiDuTemps.upsert);
  const removeByClasse = useMutation(api.emploiDuTemps.removeByClasse);

  // ✅ userId ajouté
  const tousLesCoursRaw = useQuery(
    api.cours.list,
    canQueryCours ? { ecoleId, anneeId, userId } : "skip"
  );
  const tousLesCours = useMemo(() => tousLesCoursRaw ?? [], [tousLesCoursRaw]);

  const matieresSuggestions = useMemo(
    () => [...new Set(tousLesCours.map((c) => c.nom))].sort(),
    [tousLesCours]
  );

  // ============================================================
  // INITIALISATION DE LA GRILLE
  // ============================================================
  const initGrilleVide = useCallback(() => {
    const vide = {};
    JOURS.forEach((jour) => {
      vide[jour] = {};
      HEURES_DEFAUT.forEach((h) => {
        vide[jour][h] = "";
      });
    });
    setGrille(vide);
    setHeures(HEURES_DEFAUT);
  }, []);

  // ============================================================
  // CHARGEMENT DE L'EMPLOI DU TEMPS
  // ============================================================
  useEffect(() => {
    if (!classeSelectionnee) {
      setGrille({});
      setHeures(HEURES_DEFAUT);
      setHasChanges(false);
      return;
    }
    setLoading(true);
    if (emploiDuTemps && emploiDuTemps.contenu) {
      try {
        const data = JSON.parse(emploiDuTemps.contenu);
        setGrille(data.grille || {});
        setHeures(data.heures || HEURES_DEFAUT);
      } catch {
        initGrilleVide();
      }
    } else {
      initGrilleVide();
    }
    setHasChanges(false);
    setLoading(false);
  }, [classeSelectionnee, emploiDuTemps, initGrilleVide]);

  // ============================================================
  // UPDATE CELL — immutable strict
  // ============================================================
  const updateCell = useCallback((jour, heure, valeur) => {
    setGrille((prev) => ({
      ...prev,
      [jour]: {
        ...(prev[jour] || {}),
        [heure]: valeur,
      },
    }));
    setHasChanges(true);
  }, []);

  // ============================================================
  // SAVE
  // ============================================================
  const handleSave = useCallback(async () => {
    if (saving) return;
    if (!classeSelectionnee) {
      toast.error("Veuillez sélectionner une classe.");
      return;
    }
    if (!userId) {
      toast.error("Session invalide.");
      return;
    }

    let filled = false;
    for (const jour of JOURS) {
      for (const h of heures) {
        if (grille[jour]?.[h]?.trim()) {
          filled = true;
          break;
        }
      }
      if (filled) break;
    }
    if (!filled) {
      const ok = await confirm(
        "Enregistrer vide ?",
        "Voulez-vous vraiment enregistrer un emploi du temps vide ?"
      );
      if (!ok) return;
    }

    setSaving(true);
    const contenu = JSON.stringify({ grille, heures });
    try {
      await upsert({
        classe: classeSelectionnee,
        ecoleId,
        contenu,
        anneeId,
        userId,
      });
      toast.success("Emploi du temps enregistré");
      setHasChanges(false);
    } catch (err) {
      toast.error(extractErrMsg(err, "Erreur lors de l'enregistrement"));
    } finally {
      setSaving(false);
    }
  }, [
    saving,
    classeSelectionnee,
    userId,
    heures,
    grille,
    confirm,
    upsert,
    ecoleId,
    anneeId,
  ]);

  // ============================================================
  // DELETE
  // ============================================================
  const handleDelete = useCallback(async () => {
    if (!classeSelectionnee || !userId) return;
    const ok = await confirm(
      "Supprimer l'emploi du temps",
      `Supprimer l'emploi du temps de ${classeSelectionnee} ?`
    );
    if (!ok) return;
    try {
      await removeByClasse({
        classe: classeSelectionnee,
        ecoleId,
        anneeId,
        userId,
      });
      toast.success("Emploi du temps supprimé");
      initGrilleVide();
      setHasChanges(false);
    } catch (err) {
      toast.error(extractErrMsg(err, "Erreur lors de la suppression"));
    }
  }, [
    classeSelectionnee,
    userId,
    confirm,
    removeByClasse,
    ecoleId,
    anneeId,
    initGrilleVide,
  ]);

  // ============================================================
  // ADD HEURE — immutable strict
  // ============================================================
  const addHeure = useCallback((heureStr) => {
    if (!heureStr) return;
    setHeures((prev) => [...prev, heureStr].sort());
    setGrille((prev) => {
      const next = { ...prev };
      JOURS.forEach((jour) => {
        next[jour] = { ...(prev[jour] || {}), [heureStr]: "" };
      });
      return next;
    });
    setShowAddHeure(false);
    setHasChanges(true);
  }, []);

  // ============================================================
  // REMOVE HEURE — immutable strict
  // ============================================================
  const removeHeure = useCallback(
    async (heure) => {
      const ok = await confirm(
        "Supprimer la ligne",
        `Supprimer la ligne ${heure} et tout son contenu ?`
      );
      if (!ok) return;
      setHeures((prev) => prev.filter((h) => h !== heure));
      setGrille((prev) => {
        const next = { ...prev };
        JOURS.forEach((jour) => {
          if (next[jour]) {
            const jourCopy = { ...next[jour] };
            delete jourCopy[heure];
            next[jour] = jourCopy;
          }
        });
        return next;
      });
      setHasChanges(true);
    },
    [confirm]
  );

  // ============================================================
  // EDIT HEURE INLINE
  // ============================================================
  const startEditHeure = (index, valeur) => {
    setEditingHeure(index);
    setEditHeureValue(valeur);
  };

  const saveEditHeure = (index) => {
    const trimmed = editHeureValue.trim();
    if (!trimmed) return;
    if (heures.includes(trimmed) && heures[index] !== trimmed) {
      toast.error("Cette heure existe déjà.");
      return;
    }
    const ancienneHeure = heures[index];
    setHeures((prev) => {
      const newHeures = [...prev];
      newHeures[index] = trimmed;
      return newHeures.sort();
    });
    // ✅ Migration immutable
    setGrille((prev) => {
      const next = { ...prev };
      JOURS.forEach((jour) => {
        if (next[jour] && ancienneHeure in next[jour]) {
          const jourCopy = { ...next[jour] };
          jourCopy[trimmed] = jourCopy[ancienneHeure];
          delete jourCopy[ancienneHeure];
          next[jour] = jourCopy;
        }
      });
      return next;
    });
    setEditingHeure(null);
    setHasChanges(true);
  };

  const cancelEditHeure = () => setEditingHeure(null);

  // ============================================================
  // COMPTE DES CELLULES REMPLIES
  // ============================================================
  const totalCellules = useMemo(() => {
    let count = 0;
    JOURS.forEach((jour) => {
      heures.forEach((h) => {
        if (grille[jour]?.[h]?.trim()) count++;
      });
    });
    return count;
  }, [grille, heures]);

  // ============================================================
  // COULEURS
  // ============================================================
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const inputBg = dark ? "#0F172A" : "#F8FAFC";
  const inputText = dark ? "#F1F5F9" : "#1E293B";
  const accent = dark ? "#818CF8" : "#4F46E5";
  const accentBg = dark ? "#312E81" : "#EEF2FF";
  const warning = "#F59E0B";
  const warningBg = dark ? "#78350F" : "#FEF3C7";
  const shadow = dark
    ? "0 1px 3px rgba(0,0,0,0.3)"
    : "0 1px 3px rgba(0,0,0,0.05)";

  // ============================================================
  // GARDE : session invalide
  // ============================================================
  if (!user || !userId) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          padding: 40,
        }}
      >
        <style>{`
          @keyframes ge-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          .ge-spin { animation: ge-spin 1s linear infinite; }
          @media (prefers-reduced-motion: reduce) {
            .ge-spin { animation: none !important; }
          }
        `}</style>
        <Loader size={28} className="ge-spin" style={{ color: accent }} />
      </div>
    );
  }

  // ============================================================
  // GARDE : pas d'année active
  // ============================================================
  if (!anneeId) {
    return (
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: isMobile ? "10px 8px 24px" : "20px 16px 32px",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            maxWidth: 520,
            margin: "0 auto",
            padding: isMobile ? "40px 16px" : "60px 24px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: warningBg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <CalendarClock size={30} color={warning} />
          </div>
          <h2
            style={{
              fontSize: isMobile ? 17 : 20,
              fontWeight: 700,
              color: textPrimary,
              margin: "0 0 6px",
            }}
          >
            Aucune année scolaire active
          </h2>
          <p
            style={{
              color: textSecondary,
              fontSize: isMobile ? 13 : 14,
              margin: 0,
              maxWidth: 400,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            Veuillez créer ou activer une année scolaire dans les paramètres.
          </p>
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDU PRINCIPAL
  // ============================================================
  return (
    <div
      style={{
        maxWidth: 1280,
        margin: "0 auto",
        padding: isMobile ? "10px 8px 100px" : "20px 16px 40px",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* Keyframes préfixés ge-* */}
      <style>{`
        @keyframes ge-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .ge-spin { animation: ge-spin 1s linear infinite; }
        @keyframes ge-slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes ge-fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes ge-slideUpBar { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @media (prefers-reduced-motion: reduce) {
          .ge-spin, .ge-slideUp { animation: none !important; }
        }
      `}</style>

      {/* ==================== EN-TÊTE ==================== */}
      <div style={{ marginBottom: isMobile ? 12 : 20 }}>
        <h2
          style={{
            fontSize: isMobile ? 17 : 22,
            fontWeight: 700,
            color: textPrimary,
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          Emploi du temps
        </h2>
        <p
          style={{
            color: textSecondary,
            marginTop: 2,
            marginBottom: 0,
            fontSize: isMobile ? 11.5 : 13,
          }}
        >
          {classeSelectionnee
            ? `${classeSelectionnee} · ${totalCellules} cours programmé${
                totalCellules > 1 ? "s" : ""
              }`
            : "Sélectionnez une classe pour commencer"}
          {anneeActive ? ` · ${anneeActive.nom}` : ""}
        </p>
      </div>

      {/* ==================== BARRE OUTILS ==================== */}
      <div
        style={{
          background: cardBg,
          border: `1px solid ${cardBorder}`,
          borderRadius: 14,
          padding: isMobile ? 12 : 14,
          marginBottom: isMobile ? 12 : 16,
          boxShadow: shadow,
          display: "flex",
          gap: 10,
          flexDirection: isMobile ? "column" : "row",
          alignItems: isMobile ? "stretch" : "center",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flex: isMobile ? "none" : 1,
            position: "relative",
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: accentBg,
              color: accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <School size={16} />
          </div>
          <select
            value={classeSelectionnee}
            onChange={(e) => setClasseSelectionnee(e.target.value)}
            style={{
              flex: 1,
              padding: isMobile ? "10px 12px" : "9px 12px",
              border: `1px solid ${cardBorder}`,
              borderRadius: 10,
              fontSize: isMobile ? 15 : 14,
              outline: "none",
              background: inputBg,
              color: inputText,
              cursor: "pointer",
              fontFamily: "inherit",
              appearance: "none",
              WebkitAppearance: "none",
            }}
          >
            <option value="">-- Choisir une classe --</option>
            {classes.map((c) => (
              <option key={c._id} value={c.nom}>
                {c.nom}
              </option>
            ))}
          </select>
        </div>

        {classeSelectionnee && (
          <div
            style={{
              display: "flex",
              gap: 8,
              flexDirection: isMobile ? "column" : "row",
            }}
          >
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: isMobile ? "12px 16px" : "9px 16px",
                background: saving ? "#A5B4FC" : accent,
                color: "white",
                border: "none",
                borderRadius: 10,
                cursor: saving ? "not-allowed" : "pointer",
                fontWeight: 700,
                fontSize: 13.5,
                minWidth: isMobile ? "auto" : 140,
              }}
            >
              {saving ? (
                <Loader size={14} className="ge-spin" />
              ) : (
                <Save size={14} />
              )}
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
            <button
              onClick={handleDelete}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: isMobile ? "12px 16px" : "9px 14px",
                background: "transparent",
                color: "#EF4444",
                border: `1px solid ${cardBorder}`,
                borderRadius: 10,
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 13.5,
              }}
            >
              <Trash2 size={14} />
              {!isMobile && "Supprimer"}
            </button>
          </div>
        )}
      </div>

      {/* ==================== SÉLECTION VIDE ==================== */}
      {!classeSelectionnee && (
        <div
          style={{
            background: cardBg,
            borderRadius: 14,
            border: `1px solid ${cardBorder}`,
            padding: isMobile ? 40 : 60,
            textAlign: "center",
            boxShadow: shadow,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: accentBg,
              color: accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <CalendarClock size={28} />
          </div>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              fontWeight: 600,
              color: textPrimary,
            }}
          >
            Sélectionnez une classe
          </p>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: 12.5,
              color: textSecondary,
              maxWidth: 320,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            Choisissez une classe ci-dessus pour créer ou modifier son emploi du
            temps
          </p>
        </div>
      )}

      {/* ==================== TABLEAU ==================== */}
      {classeSelectionnee && (
        <div
          style={{
            background: cardBg,
            borderRadius: 14,
            border: `1px solid ${cardBorder}`,
            boxShadow: shadow,
            overflow: "hidden",
          }}
        >
          {loading ? (
            <div
              style={{
                textAlign: "center",
                padding: 60,
                color: textSecondary,
              }}
            >
              <Loader
                size={28}
                className="ge-spin"
                style={{ color: accent }}
              />
              <p style={{ marginTop: 12, fontSize: 13 }}>
                Chargement de l'emploi du temps…
              </p>
            </div>
          ) : (
            <div
              style={{
                overflowX: "auto",
                WebkitOverflowScrolling: "touch",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: isMobile ? 11.5 : 12.5,
                  minWidth: isMobile ? 600 : 700,
                }}
              >
                <thead>
                  <tr>
                    <th
                      style={{
                        padding: isMobile ? "10px 6px" : "12px 10px",
                        textAlign: "center",
                        background: dark ? "#0F172A" : "#1E293B",
                        color: "#FFFFFF",
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: 0.3,
                        position: "sticky",
                        top: 0,
                        zIndex: 2,
                        borderRight: `1px solid ${dark ? "#334155" : "#334155"}`,
                        minWidth: 70,
                        whiteSpace: "nowrap",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 4,
                        }}
                      >
                        <Clock size={12} />
                        Heure
                      </div>
                    </th>
                    {JOURS.map((jour, idx) => (
                      <th
                        key={jour}
                        style={{
                          padding: isMobile ? "10px 6px" : "12px 10px",
                          textAlign: "center",
                          background: dark ? "#0F172A" : "#1E293B",
                          color: "#FFFFFF",
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: 0.3,
                          position: "sticky",
                          top: 0,
                          zIndex: 2,
                          whiteSpace: "nowrap",
                          borderRight:
                            idx < JOURS.length - 1
                              ? `1px solid ${dark ? "#1E293B" : "#334155"}`
                              : "none",
                        }}
                      >
                        {isMobile ? JOURS_COURT[idx] : jour}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {heures.map((heure, idx) => (
                    <tr
                      key={heure}
                      style={{
                        borderBottom: `1px solid ${cardBorder}`,
                        background:
                          idx % 2 === 0
                            ? dark
                              ? "#1E293B"
                              : "#FFFFFF"
                            : dark
                            ? "#0F172A"
                            : "#FAFBFC",
                      }}
                    >
                      <td
                        style={{
                          padding: isMobile ? "6px 4px" : "8px 6px",
                          textAlign: "center",
                          fontWeight: 700,
                          background: dark ? "#0F172A" : "#F8FAFC",
                          color: textPrimary,
                          fontSize: isMobile ? 11.5 : 12,
                          position: "relative",
                          minWidth: 70,
                          borderRight: `1px solid ${cardBorder}`,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {editingHeure === idx ? (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 3,
                            }}
                          >
                            <input
                              type="time"
                              value={editHeureValue}
                              onChange={(e) =>
                                setEditHeureValue(e.target.value)
                              }
                              style={{
                                width: 70,
                                padding: "3px 4px",
                                border: `1px solid ${accent}`,
                                borderRadius: 4,
                                fontSize: 11,
                                textAlign: "center",
                                background: inputBg,
                                color: inputText,
                                outline: "none",
                                fontFamily: "inherit",
                              }}
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveEditHeure(idx);
                                if (e.key === "Escape") cancelEditHeure();
                              }}
                            />
                            <button
                              onClick={() => saveEditHeure(idx)}
                              style={{
                                background: "none",
                                border: "none",
                                color: "#10B981",
                                cursor: "pointer",
                                padding: 2,
                              }}
                              aria-label="Valider"
                            >
                              <Check size={12} />
                            </button>
                            <button
                              onClick={cancelEditHeure}
                              style={{
                                background: "none",
                                border: "none",
                                color: "#EF4444",
                                cursor: "pointer",
                                padding: 2,
                              }}
                              aria-label="Annuler"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 2,
                            }}
                          >
                            <button
                              onClick={() => startEditHeure(idx, heure)}
                              style={{
                                background: "none",
                                border: "none",
                                color: textPrimary,
                                fontWeight: 700,
                                cursor: "pointer",
                                padding: 0,
                                fontSize: "inherit",
                                fontFamily: "inherit",
                                flex: 1,
                                textAlign: "center",
                              }}
                              title="Modifier l'heure"
                            >
                              {heure}
                            </button>
                            <button
                              onClick={() => removeHeure(heure)}
                              style={{
                                background: "none",
                                border: "none",
                                color: "#EF4444",
                                cursor: "pointer",
                                padding: 2,
                                opacity: 0.6,
                                display: "flex",
                              }}
                              title="Supprimer la ligne"
                              aria-label="Supprimer la ligne"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        )}
                      </td>

                      {JOURS.map((jour) => (
                        <td
                          key={jour}
                          style={{
                            padding: isMobile ? "4px" : "6px",
                            textAlign: "center",
                            borderRight: `1px solid ${cardBorder}`,
                          }}
                        >
                          <CelluleEmploi
                            value={grille[jour]?.[heure] || ""}
                            onChange={(val) => updateCell(jour, heure, val)}
                            suggestions={matieresSuggestions}
                            dark={dark}
                            isMobile={isMobile}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>

              <div
                style={{
                  padding: isMobile ? 12 : 14,
                  borderTop: `1px solid ${cardBorder}`,
                  background: dark ? "#0F172A" : "#FAFBFC",
                }}
              >
                <button
                  onClick={() => setShowAddHeure(true)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    padding: isMobile ? "10px 16px" : "8px 14px",
                    background: "transparent",
                    color: accent,
                    border: `1px dashed ${accent}`,
                    borderRadius: 10,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontSize: isMobile ? 13 : 12.5,
                    width: isMobile ? "100%" : "auto",
                  }}
                >
                  <Plus size={14} />
                  Ajouter une ligne horaire
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== LÉGENDE ==================== */}
      {classeSelectionnee && !loading && (
        <div
          style={{
            marginTop: 12,
            padding: "8px 12px",
            background: dark ? "#0F172A" : "#F8FAFC",
            border: `1px solid ${cardBorder}`,
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 11,
            color: textSecondary,
            flexWrap: "wrap",
          }}
        >
          <Info size={12} style={{ flexShrink: 0 }} />
          <span>
            Tapez dans une cellule pour saisir un cours. Suggestions
            automatiques depuis vos matières.
          </span>
          {isMobile && (
            <>
              <span style={{ opacity: 0.5 }}>·</span>
              <span>Balayez horizontalement pour voir les autres jours</span>
            </>
          )}
        </div>
      )}

      {/* ==================== BARRE FLOTTANTE ACTIONS (mobile) ==================== */}
      {isMobile && classeSelectionnee && hasChanges && (
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            background: cardBg,
            borderTop: `1px solid ${cardBorder}`,
            padding: "10px 14px calc(10px + env(safe-area-inset-bottom))",
            zIndex: 950,
            boxShadow: "0 -4px 20px rgba(0,0,0,0.15)",
            animation: "ge-slideUpBar 0.2s ease-out",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              flex: 1,
              fontSize: 11.5,
              color: textSecondary,
              minWidth: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                color: warning,
                fontWeight: 700,
              }}
            >
              <AlertCircle size={12} />
              Modifications non enregistrées
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: "10px 18px",
              background: saving ? "#A5B4FC" : accent,
              color: "white",
              border: "none",
              borderRadius: 10,
              fontWeight: 700,
              fontSize: 13.5,
              cursor: saving ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {saving ? (
              <Loader size={14} className="ge-spin" />
            ) : (
              <Save size={14} />
            )}
            Enregistrer
          </button>
        </div>
      )}

      {/* ==================== MODALES ==================== */}
      <AddHeureModal
        open={showAddHeure}
        onClose={() => setShowAddHeure(false)}
        onConfirm={addHeure}
        dark={dark}
        isMobile={isMobile}
        heuresExistantes={heures}
      />

      <ConfirmDialog {...dialogProps} />
    </div>
  );
} 