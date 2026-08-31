import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useStyles } from "../styles/theme";
import { useIsMobile } from "../hooks/useIsMobile"; // <-- Import du hook
import { useConfirm } from "../hooks/useConfirm";
import { ConfirmDialog } from "./ConfirmDialog";
import {
  Clock, Calendar, Save, Trash2, Plus, School, Loader, Check, X,
} from "lucide-react";
import toast from "react-hot-toast";

const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const HEURES_DEFAUT = ["07:30", "08:30", "09:30", "10:30", "11:30", "12:30", "13:30", "14:30", "15:30"];

// Composant cellule avec autocomplétion et thème
function CelluleEmploi({ value, onChange, suggestions }) {
  const { dark } = useStyles();
  const isMobile = useIsMobile(); // Détection mobile
  const [inputValue, setInputValue] = useState(value);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filtered, setFiltered] = useState([]);

  useEffect(() => { setInputValue(value); }, [value]);

  useEffect(() => {
    if (!inputValue.trim()) { setFiltered([]); return; }
    setFiltered(
      suggestions
        .filter(m => m.toLowerCase().includes(inputValue.toLowerCase()))
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

  return (
    <div style={{ position: "relative" }}>
      <input
        type="text"
        value={inputValue}
        onChange={handleChange}
        onFocus={() => inputValue.trim() && setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
        style={{
          width: "100%",
          padding: isMobile ? "8px 6px" : "6px 4px",
          border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
          borderRadius: 4,
          fontSize: isMobile ? 14 : 12,
          textAlign: "center",
          outline: "none",
          background: dark ? "#0F172A" : "#FFFFFF",
          color: dark ? "#F1F5F9" : "#1E293B",
          transition: "border-color 0.2s, background-color 0.3s, color 0.3s",
          boxSizing: "border-box",
        }}
        placeholder="..."
      />
      {showSuggestions && filtered.length > 0 && (
        <div style={{
          position: "absolute",
          top: "100%",
          left: 0,
          right: 0,
          background: dark ? "#1E293B" : "#FFFFFF",
          border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
          borderRadius: 6,
          boxShadow: dark ? "0 4px 12px rgba(0,0,0,0.5)" : "0 4px 12px rgba(0,0,0,0.1)",
          zIndex: 20,
          maxHeight: 150,
          overflowY: "auto",
        }}>
          {filtered.map(m => (
            <div
              key={m}
              onMouseDown={() => handleSelect(m)}
              style={{
                padding: "8px 10px",
                cursor: "pointer",
                borderBottom: `1px solid ${dark ? "#334155" : "#F1F5F9"}`,
                fontSize: isMobile ? 13 : 12,
                color: dark ? "#F1F5F9" : "#1E293B",
                transition: "background 0.1s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = dark ? "#334155" : "#F1F5F9"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              {m}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Modale d'ajout d'heure avec thème
function AddHeureModal({ open, onClose, onConfirm, isMobile }) {
  const { dark } = useStyles();
  const [heure, setHeure] = useState("");
  if (!open) return null;

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.4)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000,
      padding: isMobile ? 12 : 16,
    }} onClick={onClose}>
      <div style={{
        background: dark ? "#1E293B" : "#FFFFFF",
        borderRadius: 16,
        padding: isMobile ? 20 : 24,
        width: "90%",
        maxWidth: isMobile ? "95%" : 360,
        boxShadow: dark ? "0 20px 40px rgba(0,0,0,0.5)" : "0 20px 40px rgba(0,0,0,0.2)",
        border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
      }} onClick={e => e.stopPropagation()}>
        <h3 style={{ fontSize: isMobile ? 16 : 18, fontWeight: 600, marginBottom: 16, color: dark ? "#F1F5F9" : "#1E293B" }}>
          Ajouter une heure
        </h3>
        <input
          type="time"
          value={heure}
          onChange={e => setHeure(e.target.value)}
          style={{
            width: "100%",
            padding: isMobile ? "12px 14px" : "10px 14px",
            border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
            borderRadius: 8,
            fontSize: isMobile ? 16 : 14,
            marginBottom: 16,
            background: dark ? "#0F172A" : "#F9FAFB",
            color: dark ? "#F1F5F9" : "#1E293B",
            outline: "none",
          }}
          autoFocus
        />
        <div style={{ display: "flex", gap: 8, flexDirection: isMobile ? "column" : "row" }}>
          <button
            onClick={() => { if (heure) { onConfirm(heure); setHeure(""); } }}
            style={{
              background: dark ? "#818CF8" : "#4F46E5",
              color: "white",
              border: "none",
              borderRadius: 8,
              padding: isMobile ? "12px 20px" : "10px 20px",
              fontWeight: 500,
              cursor: "pointer",
              fontSize: isMobile ? 16 : 14,
            }}
          >
            Ajouter
          </button>
          <button
            onClick={onClose}
            style={{
              background: dark ? "#334155" : "#F1F5F9",
              border: "none",
              borderRadius: 8,
              padding: isMobile ? "12px 20px" : "10px 20px",
              fontWeight: 500,
              cursor: "pointer",
              color: dark ? "#F1F5F9" : "#1E293B",
              fontSize: isMobile ? 16 : 14,
            }}
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}

export function GestionEmploiDuTemps({ ecoleId, classes, user, anneeId, anneeActive }) {
  const { S, dark } = useStyles();
  const isMobile = useIsMobile(); // Détection mobile
  const { confirm, dialogProps } = useConfirm();

  const [classeSelectionnee, setClasseSelectionnee] = useState("");
  const [heures, setHeures] = useState(HEURES_DEFAUT);
  const [grille, setGrille] = useState({});
  const [saving, setSaving] = useState(false);
  const [editingHeure, setEditingHeure] = useState(null);
  const [editHeureValue, setEditHeureValue] = useState("");
  const [showAddHeure, setShowAddHeure] = useState(false);
  const [loading, setLoading] = useState(false);

  const emploiDuTemps = useQuery(
    api.emploiDuTemps.getByClasse,
    classeSelectionnee ? { classe: classeSelectionnee, ecoleId, anneeId } : "skip"
  );

  const upsert = useMutation(api.emploiDuTemps.upsert);
  const removeByClasse = useMutation(api.emploiDuTemps.removeByClasse);

  const tousLesCours = useQuery(api.cours.list, ecoleId ? { ecoleId, anneeId } : "skip") ?? [];
  const matieresSuggestions = useMemo(() => [...new Set(tousLesCours.map(c => c.nom))].sort(), [tousLesCours]);

  useEffect(() => {
    if (!classeSelectionnee) {
      setGrille({});
      setHeures(HEURES_DEFAUT);
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
    setLoading(false);
  }, [classeSelectionnee, emploiDuTemps]);

  function initGrilleVide() {
    const vide = {};
    JOURS.forEach(jour => {
      vide[jour] = {};
      HEURES_DEFAUT.forEach(h => { vide[jour][h] = ""; });
    });
    setGrille(vide);
    setHeures(HEURES_DEFAUT);
  }

  const updateCell = (jour, heure, valeur) => {
    setGrille(prev => {
      const newGrille = { ...prev };
      if (!newGrille[jour]) newGrille[jour] = {};
      newGrille[jour][heure] = valeur;
      return newGrille;
    });
  };

  const handleSave = async () => {
    if (!classeSelectionnee) {
      toast.error("Veuillez sélectionner une classe.");
      return;
    }

    let filled = false;
    for (const jour of JOURS) {
      for (const h of heures) {
        if (grille[jour]?.[h]?.trim()) { filled = true; break; }
      }
      if (filled) break;
    }
    if (!filled) {
      const ok = await confirm("Enregistrer vide ?", "Voulez-vous vraiment enregistrer un emploi du temps vide ?");
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
        userId: user._id,
      });
      toast.success("Emploi du temps enregistré");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!classeSelectionnee) return;
    const ok = await confirm("Supprimer l'emploi du temps", `Supprimer l'emploi du temps de ${classeSelectionnee} ?`);
    if (!ok) return;
    try {
      await removeByClasse({ classe: classeSelectionnee, ecoleId, anneeId, userId: user._id });
      toast.success("Emploi du temps supprimé");
      initGrilleVide();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const addHeure = (heureStr) => {
    if (!heureStr) return;
    setHeures(prev => [...prev, heureStr].sort());
    setGrille(prev => {
      const newGrille = { ...prev };
      JOURS.forEach(jour => {
        if (!newGrille[jour]) newGrille[jour] = {};
        newGrille[jour][heureStr] = "";
      });
      return newGrille;
    });
    setShowAddHeure(false);
  };

  const removeHeure = (heure) => {
    setHeures(prev => prev.filter(h => h !== heure));
    setGrille(prev => {
      const newGrille = { ...prev };
      JOURS.forEach(jour => { if (newGrille[jour]) delete newGrille[jour][heure]; });
      return newGrille;
    });
  };

  const startEditHeure = (index, valeur) => {
    setEditingHeure(index);
    setEditHeureValue(valeur);
  };
  const saveEditHeure = (index) => {
    if (!editHeureValue.trim()) return;
    setHeures(prev => {
      const newHeures = [...prev];
      newHeures[index] = editHeureValue.trim();
      return newHeures.sort();
    });
    setEditingHeure(null);
  };
  const cancelEditHeure = () => setEditingHeure(null);

  if (!anneeId) {
    return (
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: isMobile ? "24px 16px" : "32px 24px" }}>
        <div style={{
          background: dark ? "#1E293B" : "#FFFFFF",
          borderRadius: 16,
          padding: isMobile ? 32 : 48,
          textAlign: "center",
          boxShadow: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)",
          border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
        }}>
          <Clock size={isMobile ? 40 : 48} color="#F59E0B" style={{ marginBottom: 16 }} />
          <h2 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 600, color: dark ? "#F1F5F9" : "#1E293B", margin: "0 0 8px" }}>
            Aucune année scolaire active
          </h2>
          <p style={{ color: dark ? "#94A3B8" : "#64748B", fontSize: isMobile ? 14 : 14 }}>
            Veuillez créer ou activer une année scolaire dans les paramètres.
          </p>
        </div>
      </div>
    );
  }

  // Styles adaptatifs
  const containerPadding = isMobile ? "16px 12px" : "24px 16px";
  const titleSize = isMobile ? 22 : 28;
  const subtitleSize = isMobile ? 13 : 14;
  const toolbarFlexDirection = isMobile ? "column" : "row";
  const toolbarAlignItems = isMobile ? "stretch" : "center";
  const selectPadding = isMobile ? "12px 14px" : "8px 12px";
  const selectFontSize = isMobile ? 16 : 14;
  const buttonPadding = isMobile ? "12px 16px" : "8px 14px";
  const buttonFontSize = isMobile ? 16 : 14;
  const tableFontSize = isMobile ? 12 : 13;
  const cellPadding = isMobile ? 6 : 8;
  const headerPadding = isMobile ? 8 : 10;
  const addRowButtonPadding = isMobile ? "12px 16px" : "8px 16px";
  const addRowButtonFontSize = isMobile ? 14 : 13;

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: containerPadding }}>
      <div style={{ marginBottom: isMobile ? 20 : 32 }}>
        <h2 style={{ fontSize: titleSize, fontWeight: 700, color: dark ? "#F1F5F9" : "#1E293B", margin: 0 }}>
          Emploi du temps annuel
        </h2>
        <p style={{ color: dark ? "#94A3B8" : "#64748B", marginTop: 4, fontSize: subtitleSize }}>
          {anneeActive ? `Année : ${anneeActive.nom}` : ""}
        </p>
      </div>

      {/* Choix de la classe */}
      <div style={{ display: "flex", gap: 12, marginBottom: isMobile ? 16 : 24, flexWrap: "wrap", alignItems: toolbarAlignItems, flexDirection: toolbarFlexDirection }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, width: isMobile ? "100%" : "auto" }}>
          <School size={isMobile ? 18 : 18} color={dark ? "#94A3B8" : "#64748B"} />
          <select
            value={classeSelectionnee}
            onChange={(e) => setClasseSelectionnee(e.target.value)}
            style={{
              padding: selectPadding,
              border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
              borderRadius: 8,
              fontSize: selectFontSize,
              outline: "none",
              background: dark ? "#1E293B" : "#F8FAFC",
              color: dark ? "#F1F5F9" : "#1E293B",
              flex: 1,
              width: isMobile ? "100%" : "auto",
            }}
          >
            <option value="">-- Choisir une classe --</option>
            {classes.map(c => <option key={c._id} value={c.nom} style={{ background: dark ? "#1E293B" : "#FFF" }}>{c.nom}</option>)}
          </select>
        </div>
        {classeSelectionnee && (
          <div style={{ display: "flex", gap: 8, flexDirection: isMobile ? "column" : "row", width: isMobile ? "100%" : "auto" }}>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                padding: buttonPadding,
                background: saving ? "#A5B4FC" : dark ? "#818CF8" : "#4F46E5",
                color: "white",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                fontWeight: 500,
                fontSize: buttonFontSize,
                flex: isMobile ? 1 : "none",
              }}
            >
              {saving ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? "Enregistrement..." : "Enregistrer"}
            </button>
            <button
              onClick={handleDelete}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                padding: buttonPadding,
                background: "#EF4444",
                color: "white",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                fontWeight: 500,
                fontSize: buttonFontSize,
                flex: isMobile ? 1 : "none",
              }}
            >
              <Trash2 size={16} /> Supprimer
            </button>
          </div>
        )}
      </div>

      {/* Tableau */}
      {classeSelectionnee && (
        <div style={{ overflowX: "auto", marginBottom: 24, WebkitOverflowScrolling: "touch" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: 40, color: dark ? "#94A3B8" : "#64748B" }}>
              <Loader size={32} className="animate-spin" />
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: tableFontSize, minWidth: isMobile ? 650 : 700 }}>
              <thead>
                <tr style={{ background: dark ? "#0F172A" : "#1E293B", color: "white" }}>
                  <th style={{ padding: headerPadding, textAlign: "center" }}>Heures</th>
                  {JOURS.map(jour => <th key={jour} style={{ padding: headerPadding, textAlign: "center" }}>{jour}</th>)}
                </tr>
              </thead>
              <tbody>
                {heures.map((heure, idx) => (
                  <tr key={heure} style={{ borderBottom: `1px solid ${dark ? "#334155" : "#E2E8F0"}` }}>
                    <td style={{
                      padding: cellPadding,
                      textAlign: "center",
                      fontWeight: 600,
                      background: dark ? "#1E293B" : "#F8FAFC",
                      color: dark ? "#F1F5F9" : "#1E293B",
                      position: "relative",
                      minWidth: 80,
                    }}>
                      {editingHeure === idx ? (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                          <input
                            type="text"
                            value={editHeureValue}
                            onChange={e => setEditHeureValue(e.target.value)}
                            style={{
                              width: 60, padding: "4px",
                              border: `1px solid ${dark ? "#818CF8" : "#4F46E5"}`,
                              borderRadius: 4,
                              fontSize: 12,
                              textAlign: "center",
                              background: dark ? "#0F172A" : "#FFF",
                              color: dark ? "#F1F5F9" : "#1E293B",
                              outline: "none",
                            }}
                            autoFocus
                            onKeyDown={e => { if (e.key === "Enter") saveEditHeure(idx); if (e.key === "Escape") cancelEditHeure(); }}
                          />
                          <button onClick={() => saveEditHeure(idx)} style={{ background: "none", border: "none", color: "#10B981", cursor: "pointer" }}><Check size={14} /></button>
                          <button onClick={cancelEditHeure} style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer" }}><X size={14} /></button>
                        </div>
                      ) : (
                        <>
                          <span style={{ cursor: "pointer" }} onClick={() => startEditHeure(idx, heure)}>{heure}</span>
                          <button
                            onClick={() => removeHeure(heure)}
                            style={{
                              position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)",
                              background: "none", border: "none", color: "#EF4444", cursor: "pointer", fontSize: 12,
                            }}
                          >✕</button>
                        </>
                      )}
                    </td>
                    {JOURS.map(jour => (
                      <td key={jour} style={{ padding: cellPadding, textAlign: "center" }}>
                        <CelluleEmploi
                          value={grille[jour]?.[heure] || ""}
                          onChange={val => updateCell(jour, heure, val)}
                          suggestions={matieresSuggestions}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <button
            onClick={() => setShowAddHeure(true)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              marginTop: 12, padding: addRowButtonPadding,
              background: dark ? "#1E293B" : "#F1F5F9",
              color: dark ? "#818CF8" : "#4F46E5",
              border: `1px dashed ${dark ? "#334155" : "#CBD5E1"}`,
              borderRadius: 8,
              fontWeight: 500,
              cursor: "pointer",
              fontSize: addRowButtonFontSize,
              width: isMobile ? "100%" : "auto",
            }}
          >
            <Plus size={16} /> Ajouter une ligne horaire
          </button>
        </div>
      )}

      <AddHeureModal open={showAddHeure} onClose={() => setShowAddHeure(false)} onConfirm={addHeure} isMobile={isMobile} />
      <ConfirmDialog {...dialogProps} />
    </div>
  );
}