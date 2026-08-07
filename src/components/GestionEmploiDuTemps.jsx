import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useStyles } from "../styles/theme";
import { useConfirm } from "../hooks/useConfirm";
import { ConfirmDialog } from "./ConfirmDialog";
import {
  Clock,
  Calendar,
  Save,
  Trash2,
  Plus,
  School,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

// Jours de la semaine
const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

// Heures par défaut (modifiables)
const HEURES_DEFAUT = ["07:30", "08:30", "09:30", "10:30", "11:30", "12:30", "13:30", "14:30", "15:30"];

// Composant pour une cellule avec autocomplétion
function CelluleEmploi({ value, onChange, suggestions }) {
  const [inputValue, setInputValue] = useState(value);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filtered, setFiltered] = useState([]);
  const inputRef = useRef(null);

  // Synchroniser si la prop change (chargement d'une autre semaine)
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Filtrer les suggestions
  useEffect(() => {
    if (!inputValue.trim()) {
      setFiltered([]);
      return;
    }
    const filteredList = suggestions
      .filter((m) => m.toLowerCase().includes(inputValue.toLowerCase()))
      .slice(0, 5); // max 5 suggestions
    setFiltered(filteredList);
  }, [inputValue, suggestions]);

  const handleChange = (e) => {
    const val = e.target.value;
    setInputValue(val);
    onChange(val); // met à jour la grille immédiatement (mais on peut aussi ne mettre à jour qu'à la sélection)
    setShowSuggestions(true);
  };

  const handleSelect = (matiere) => {
    setInputValue(matiere);
    onChange(matiere);
    setShowSuggestions(false);
  };

  const handleFocus = () => {
    if (inputValue.trim()) setShowSuggestions(true);
  };

  const handleBlur = () => {
    // Délai pour permettre le clic sur une suggestion
    setTimeout(() => setShowSuggestions(false), 150);
  };

  return (
    <div style={{ position: "relative" }}>
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        style={{
          width: "100%",
          padding: "6px 4px",
          border: "1px solid #E2E8F0",
          borderRadius: 4,
          fontSize: 12,
          textAlign: "center",
          outline: "none",
          background: "#FFF",
        }}
        placeholder="..."
      />
      {showSuggestions && filtered.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            background: "#FFF",
            border: "1px solid #E2E8F0",
            borderRadius: 6,
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
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
                borderBottom: "1px solid #F1F5F9",
                fontSize: 12,
                transition: "background 0.1s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "#F1F5F9")
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

export function GestionEmploiDuTemps({
  ecoleId,
  classes,
  user,
  anneeId,
  anneeActive,
}) {
  const { S } = useStyles();
  const { confirm, dialogProps } = useConfirm();

  const [classeSelectionnee, setClasseSelectionnee] = useState("");
  const [semaine, setSemaine] = useState("");
  const [heures, setHeures] = useState(HEURES_DEFAUT);
  const [grille, setGrille] = useState({});
  const [saving, setSaving] = useState(false);
  const [editingHeure, setEditingHeure] = useState(null);
  const [editHeureValue, setEditHeureValue] = useState("");

  const emplois =
    useQuery(
      api.emploiDuTemps.getByClasse,
      classeSelectionnee
        ? { classe: classeSelectionnee, ecoleId, anneeId }
        : "skip"
    ) ?? [];
  const upsert = useMutation(api.emploiDuTemps.upsert);
  const remove = useMutation(api.emploiDuTemps.remove);

  // Récupérer toutes les matières existantes (pour autocomplétion)
  const tousLesCours =
    useQuery(api.cours.list, { ecoleId, anneeId }) ?? [];
  const matieresSuggestions = useMemo(
    () => [...new Set(tousLesCours.map((c) => c.nom))].sort(),
    [tousLesCours]
  );

  // Initialiser la grille au changement de classe/semaine
  useEffect(() => {
    if (!classeSelectionnee || !semaine) {
      setGrille({});
      setHeures(HEURES_DEFAUT);
      return;
    }
    const emploi = emplois.find((e) => e.semaine === semaine);
    if (emploi?.contenu) {
      try {
        const data = JSON.parse(emploi.contenu);
        setGrille(data.grille || {});
        setHeures(data.heures || HEURES_DEFAUT);
      } catch {
        initGrilleVide();
      }
    } else {
      initGrilleVide();
    }
  }, [classeSelectionnee, semaine]); // eslint-disable-line

  function initGrilleVide() {
    const vide = {};
    JOURS.forEach((jour) => {
      vide[jour] = {};
      HEURES_DEFAUT.forEach((h) => {
        vide[jour][h] = "";
      });
    });
    setGrille(vide);
    setHeures(HEURES_DEFAUT);
  }

  // Dates réelles de la semaine
  const datesSemaine = semaine ? getDatesOfWeek(semaine) : [];
  function getDatesOfWeek(lundiStr) {
    const lundi = new Date(lundiStr + "T00:00:00");
    const dates = [];
    for (let i = 0; i < 6; i++) {
      const jour = new Date(lundi);
      jour.setDate(lundi.getDate() + i);
      dates.push(
        jour.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
      );
    }
    return dates;
  }

  const changeWeek = (delta) => {
    if (!semaine) return;
    const d = new Date(semaine + "T00:00:00");
    d.setDate(d.getDate() + delta * 7);
    setSemaine(d.toISOString().split("T")[0]);
  };

  const updateCell = (jour, heure, valeur) => {
    setGrille((prev) => {
      const newGrille = { ...prev };
      if (!newGrille[jour]) newGrille[jour] = {};
      newGrille[jour][heure] = valeur;
      return newGrille;
    });
  };

  const handleSave = async () => {
    if (!classeSelectionnee || !semaine) {
      toast.error("Veuillez choisir une classe et une semaine.");
      return;
    }
    setSaving(true);
    const contenu = JSON.stringify({ grille, heures });
    try {
      await upsert({
        classe: classeSelectionnee,
        ecoleId,
        semaine,
        contenu,
        anneeId,
        userId: user._id,
      });
      toast.success("Emploi du temps enregistré");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const ok = await confirm(
      "Supprimer l'emploi du temps",
      "Voulez-vous vraiment supprimer cet emploi du temps ?"
    );
    if (!ok) return;
    try {
      await remove({ id, userId: user._id });
      toast.success("Emploi du temps supprimé");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const addHeure = () => {
    const nouvelleHeure = prompt("Nouvelle heure (ex: 10:00) :");
    if (!nouvelleHeure) return;
    setHeures((prev) => [...prev, nouvelleHeure].sort());
    setGrille((prev) => {
      const newGrille = { ...prev };
      JOURS.forEach((jour) => {
        if (!newGrille[jour]) newGrille[jour] = {};
        newGrille[jour][nouvelleHeure] = "";
      });
      return newGrille;
    });
  };

  const removeHeure = (heure) => {
    setHeures((prev) => prev.filter((h) => h !== heure));
    setGrille((prev) => {
      const newGrille = { ...prev };
      JOURS.forEach((jour) => {
        if (newGrille[jour]) delete newGrille[jour][heure];
      });
      return newGrille;
    });
  };

  const startEditHeure = (index, valeur) => {
    setEditingHeure(index);
    setEditHeureValue(valeur);
  };

  const saveEditHeure = (index) => {
    if (!editHeureValue.trim()) return;
    setHeures((prev) => {
      const newHeures = [...prev];
      newHeures[index] = editHeureValue.trim();
      return newHeures.sort();
    });
    setEditingHeure(null);
  };

  const cancelEditHeure = () => {
    setEditingHeure(null);
  };

  if (!anneeId) {
    return (
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px" }}>
        <div
          style={{
            background: "#FFF",
            borderRadius: 16,
            padding: 48,
            textAlign: "center",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <Clock size={48} color="#F59E0B" style={{ marginBottom: 16 }} />
          <h2
            style={{
              fontSize: 24,
              fontWeight: 600,
              color: "#1E293B",
              margin: "0 0 8px",
            }}
          >
            Aucune année scolaire active
          </h2>
          <p style={{ color: "#64748B", fontSize: 14 }}>
            Veuillez créer ou activer une année scolaire dans les paramètres.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 16px" }}>
      <div style={{ marginBottom: 32 }}>
        <h2
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: "#1E293B",
            margin: 0,
          }}
        >
          Emploi du temps
        </h2>
        <p style={{ color: "#64748B", marginTop: 4, fontSize: 14 }}>
          Créez et gérez les horaires hebdomadaires par classe
        </p>
      </div>

      {/* Choix classe + semaine */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 24,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <School size={18} color="#64748B" />
          <select
            value={classeSelectionnee}
            onChange={(e) => setClasseSelectionnee(e.target.value)}
            style={{
              padding: "8px 12px",
              border: "1px solid #E2E8F0",
              borderRadius: 8,
              fontSize: 14,
              outline: "none",
              background: "#F8FAFC",
            }}
          >
            <option value="">-- Classe --</option>
            {classes.map((c) => (
              <option key={c._id} value={c.nom}>
                {c.nom}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Calendar size={18} color="#64748B" />
          <input
            type="date"
            value={semaine}
            onChange={(e) => setSemaine(e.target.value)}
            style={{
              padding: "8px 12px",
              border: "1px solid #E2E8F0",
              borderRadius: 8,
              fontSize: 14,
              outline: "none",
              background: "#F8FAFC",
            }}
          />
          <button
            onClick={() => changeWeek(-1)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#64748B",
            }}
            title="Semaine précédente"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={() => changeWeek(1)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#64748B",
            }}
            title="Semaine suivante"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Tableau */}
      {classeSelectionnee && semaine && (
        <div style={{ overflowX: "auto", marginBottom: 24 }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 13,
              minWidth: 700,
            }}
          >
            <thead>
              <tr style={{ background: "#1E293B", color: "white" }}>
                <th style={{ padding: 10, textAlign: "center" }}>Heures</th>
                {JOURS.map((jour, idx) => (
                  <th key={jour} style={{ padding: 10, textAlign: "center" }}>
                    {jour}
                    <br />
                    <span style={{ fontWeight: 400, fontSize: 11 }}>
                      {datesSemaine[idx]}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {heures.map((heure, idx) => (
                <tr key={heure} style={{ borderBottom: "1px solid #E2E8F0" }}>
                  <td
                    style={{
                      padding: 8,
                      textAlign: "center",
                      fontWeight: 600,
                      background: "#F8FAFC",
                      position: "relative",
                      minWidth: 80,
                    }}
                  >
                    {editingHeure === idx ? (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 4,
                        }}
                      >
                        <input
                          type="text"
                          value={editHeureValue}
                          onChange={(e) => setEditHeureValue(e.target.value)}
                          style={{
                            width: 60,
                            padding: "4px",
                            border: "1px solid #4F46E5",
                            borderRadius: 4,
                            fontSize: 12,
                            textAlign: "center",
                            outline: "none",
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
                            padding: 0,
                          }}
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={cancelEditHeure}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#EF4444",
                            cursor: "pointer",
                            padding: 0,
                          }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span
                          style={{ cursor: "pointer" }}
                          onClick={() => startEditHeure(idx, heure)}
                          title="Modifier l'heure"
                        >
                          {heure}
                        </span>
                        <button
                          onClick={() => removeHeure(heure)}
                          style={{
                            position: "absolute",
                            right: 4,
                            top: "50%",
                            transform: "translateY(-50%)",
                            background: "none",
                            border: "none",
                            color: "#EF4444",
                            cursor: "pointer",
                            fontSize: 12,
                          }}
                          title="Supprimer cette ligne"
                        >
                          ✕
                        </button>
                      </>
                    )}
                  </td>
                  {JOURS.map((jour) => (
                    <td key={jour} style={{ padding: 4, textAlign: "center" }}>
                      <CelluleEmploi
                        value={grille[jour]?.[heure] || ""}
                        onChange={(val) => updateCell(jour, heure, val)}
                        suggestions={matieresSuggestions}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <button
            onClick={addHeure}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginTop: 12,
              padding: "8px 16px",
              background: "#F1F5F9",
              color: "#4F46E5",
              border: "1px dashed #CBD5E1",
              borderRadius: 8,
              fontWeight: 500,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            <Plus size={16} /> Ajouter une ligne horaire
          </button>
        </div>
      )}

      {/* Bouton enregistrer */}
      {classeSelectionnee && semaine && (
        <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 20px",
              background: saving ? "#A5B4FC" : "#4F46E5",
              color: "white",
              border: "none",
              borderRadius: 10,
              fontWeight: 600,
              cursor: saving ? "not-allowed" : "pointer",
              fontSize: 14,
            }}
          >
            <Save size={18} />
            {saving ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      )}

      {/* Liste des emplois existants */}
      {classeSelectionnee && emplois.length > 0 && (
        <div>
          <h3
            style={{
              fontSize: 18,
              fontWeight: 600,
              marginBottom: 16,
              color: "#1E293B",
            }}
          >
            Emplois publiés pour {classeSelectionnee}
          </h3>
          <div style={{ display: "grid", gap: 8 }}>
            {emplois.map((e) => (
              <div
                key={e._id}
                style={{
                  background: "#FFF",
                  borderRadius: 12,
                  padding: "12px 16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Calendar size={16} color="#4F46E5" />
                  <span>Semaine du {formatSemaine(e.semaine)}</span>
                </div>
                <button
                  onClick={() => handleDelete(e._id)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#EF4444",
                    cursor: "pointer",
                  }}
                  title="Supprimer"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <ConfirmDialog {...dialogProps} />
    </div>
  );
}

function formatSemaine(dateStr) {
  if (!dateStr) return "";
  const [annee, mois, jour] = dateStr.split("-");
  return `${jour}/${mois}/${annee}`;
}