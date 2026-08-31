import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useStyles } from "../styles/theme";
import { useIsMobile } from "../hooks/useIsMobile"; // <-- Import du hook
import { useConfirm } from "../hooks/useConfirm";
import { ConfirmDialog } from "./ConfirmDialog";
import {
  Plus, Trash2, BookOpen, Filter, Loader, Edit2, Search,
} from "lucide-react";
import toast from "react-hot-toast";

export function GestionCours({ ecoleId, classes, user, anneeId, anneeActive }) {
  const { dark } = useStyles();
  const isMobile = useIsMobile(); // Détection mobile
  const { confirm, dialogProps } = useConfirm();

  // ================= TOUS LES HOOKS EN PREMIER =================
  const [mode, setMode] = useState("individuel");
  const [classeFiltre, setClasseFiltre] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [editData, setEditData] = useState(null);

  const cours = useQuery(
    api.cours.list,
    { ecoleId, classe: classeFiltre || undefined, anneeId }
  ) ?? [];

  const addCours = useMutation(api.cours.add);
  const addBulk = useMutation(api.cours.addBulk);
  const removeCours = useMutation(api.cours.remove);
  const updateCours = useMutation(api.cours.update);

  // ================= COULEURS ADAPTATIVES =================
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const inputBg = dark ? "#0F172A" : "#F8FAFC";
  const inputText = dark ? "#F1F5F9" : "#1E293B";
  const accent = dark ? "#818CF8" : "#4F46E5";
  const danger = "#EF4444";
  const warning = "#F59E0B";

  // ================= TRI DES CLASSES =================
  const sortedClasses = useMemo(() => {
    return [...classes].sort((a, b) =>
      a.nom.localeCompare(b.nom, undefined, { numeric: true, sensitivity: "base" })
    );
  }, [classes]);

  // ================= FILTRAGE PAR RECHERCHE =================
  const filteredCours = useMemo(() => {
    if (!searchTerm.trim()) return cours;
    return cours.filter(c =>
      c.nom.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [cours, searchTerm]);

  // ================= CONDITIONS APRÈS TOUS LES HOOKS =================
  if (!anneeId) {
    return (
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: isMobile ? "24px 16px" : "32px 24px" }}>
        <div style={{
          background: cardBg,
          borderRadius: 16,
          padding: isMobile ? 32 : 48,
          textAlign: "center",
          boxShadow: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)",
          border: `1px solid ${cardBorder}`,
          transition: "background-color 0.3s",
        }}>
          <BookOpen size={isMobile ? 40 : 48} color={warning} style={{ marginBottom: 16 }} />
          <h2 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 600, color: textPrimary, margin: "0 0 8px" }}>
            Aucune année scolaire active
          </h2>
          <p style={{ color: textSecondary, fontSize: isMobile ? 14 : 14 }}>
            Veuillez créer ou activer une année scolaire dans les paramètres.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: isMobile ? "16px 12px" : "24px 16px" }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .animate-spin { animation: spin 1s linear infinite; }`}</style>

      {/* En-tête */}
      <div style={{ marginBottom: isMobile ? 20 : 32 }}>
        <h2 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 700, color: textPrimary, margin: 0 }}>
          Gestion des cours
        </h2>
        <p style={{ color: textSecondary, marginTop: 4, fontSize: isMobile ? 13 : 14 }}>
          {filteredCours.length} cours {anneeActive ? `· ${anneeActive.nom}` : ""}
        </p>
      </div>

      {/* Sélecteur de mode */}
      <div style={{ display: "flex", gap: 0, borderBottom: `2px solid ${cardBorder}`, marginBottom: isMobile ? 16 : 24, overflowX: "auto", whiteSpace: "nowrap", WebkitOverflowScrolling: "touch" }}>
        {[
          { id: "individuel", label: "Ajout individuel" },
          { id: "groupe", label: "Ajout groupé" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setMode(tab.id); setEditData(null); }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: isMobile ? "10px 12px" : "12px 20px",
              border: "none",
              background: "transparent",
              color: mode === tab.id ? accent : textSecondary,
              fontWeight: mode === tab.id ? 600 : 400,
              borderBottom: mode === tab.id ? `3px solid ${accent}` : "3px solid transparent",
              cursor: "pointer",
              transition: "all 0.2s",
              fontSize: isMobile ? 14 : 16,
              flexShrink: 0,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Formulaire */}
      {mode === "individuel" ? (
        <AddCoursIndividuel
          classes={sortedClasses}
          addCours={addCours}
          updateCours={updateCours}
          ecoleId={ecoleId}
          anneeId={anneeId}
          userId={user._id}
          initialData={editData}
          onSuccess={() => setEditData(null)}
          dark={dark}
          isMobile={isMobile}
        />
      ) : (
        <AddCoursGroupe
          classes={sortedClasses}
          addBulk={addBulk}
          ecoleId={ecoleId}
          anneeId={anneeId}
          userId={user._id}
          dark={dark}
          isMobile={isMobile}
        />
      )}

      {/* Filtres */}
      <div style={{
        background: cardBg,
        borderRadius: 16,
        padding: isMobile ? 12 : "16px 20px",
        margin: isMobile ? "16px 0" : "24px 0",
        boxShadow: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)",
        border: `1px solid ${cardBorder}`,
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 12,
        flexDirection: isMobile ? "column" : "row",
      }}>
        <Filter size={isMobile ? 18 : 18} color={textSecondary} />
        <select
          value={classeFiltre}
          onChange={(e) => setClasseFiltre(e.target.value)}
          style={{
            padding: isMobile ? "10px 12px" : "8px 12px",
            border: `1px solid ${cardBorder}`,
            borderRadius: 8,
            fontSize: isMobile ? 16 : 14,
            minWidth: isMobile ? "100%" : 180,
            outline: "none",
            background: inputBg,
            color: inputText,
            width: isMobile ? "100%" : "auto",
          }}
        >
          <option value="">Toutes les classes</option>
          {sortedClasses.map((c) => (
            <option key={c._id} value={c.nom} style={{ background: dark ? "#1E293B" : "#FFF" }}>{c.nom}</option>
          ))}
        </select>

        <div style={{
          display: "flex",
          alignItems: "center",
          background: inputBg,
          borderRadius: 8,
          padding: isMobile ? "10px 12px" : "4px 8px",
          border: `1px solid ${cardBorder}`,
          flex: 1,
          minWidth: isMobile ? "100%" : 200,
        }}>
          <Search size={isMobile ? 16 : 16} color={textSecondary} />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher un cours..."
            style={{
              border: "none",
              outline: "none",
              marginLeft: 6,
              fontSize: isMobile ? 16 : 14,
              width: "100%",
              background: "transparent",
              color: inputText,
            }}
          />
        </div>
      </div>

      {/* Liste des cours */}
      <div style={{ display: "grid", gap: isMobile ? 8 : 12 }}>
        {filteredCours.length === 0 && (
          <div style={{
            background: cardBg,
            borderRadius: 16,
            padding: isMobile ? 32 : 48,
            textAlign: "center",
            boxShadow: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)",
            border: `1px solid ${cardBorder}`,
            color: textSecondary,
          }}>
            <BookOpen size={isMobile ? 28 : 32} style={{ marginBottom: 8 }} />
            <p>
              {searchTerm
                ? `Aucun cours trouvé pour "${searchTerm}"`
                : classeFiltre
                  ? `Aucun cours pour la classe ${classeFiltre}`
                  : "Aucun cours enregistré"}
            </p>
          </div>
        )}
        {filteredCours.map((c) => (
          <div
            key={c._id}
            style={{
              background: cardBg,
              borderRadius: 12,
              padding: isMobile ? "12px 14px" : "16px 20px",
              display: "flex",
              flexDirection: isMobile ? "column" : "row",
              justifyContent: "space-between",
              alignItems: isMobile ? "stretch" : "center",
              gap: isMobile ? 8 : 0,
              boxShadow: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)",
              border: `1px solid ${cardBorder}`,
              transition: "box-shadow 0.15s, background-color 0.3s",
            }}
            onMouseEnter={(e) => e.currentTarget.style.boxShadow = dark ? "0 2px 8px rgba(0,0,0,0.5)" : "0 2px 8px rgba(0,0,0,0.08)"}
            onMouseLeave={(e) => e.currentTarget.style.boxShadow = dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)"}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: isMobile ? 15 : 16, color: textPrimary }}>
                {c.nom}{" "}
                <span style={{ fontWeight: 400, fontSize: isMobile ? 12 : 13, color: textSecondary }}>
                  {c.coefficient ? `coeff. ${c.coefficient}` : ""}
                  {c.bareme ? ` · bar. ${c.bareme}` : ""}
                </span>
              </div>
              <div style={{ color: textSecondary, fontSize: isMobile ? 13 : 13 }}>Classe {c.classe}</div>
            </div>
            <div style={{ display: "flex", gap: 6, justifyContent: isMobile ? "flex-end" : "flex-start" }}>
              <button
                onClick={() => {
                  setEditData(c);
                  setMode("individuel");
                }}
                style={{
                  background: accent,
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  padding: isMobile ? "10px 12px" : 8,
                  cursor: "pointer",
                }}
                title="Modifier le cours"
              >
                <Edit2 size={16} />
              </button>
              <button
                onClick={async () => {
                  const ok = await confirm(
                    "Supprimer le cours",
                    `Voulez-vous vraiment supprimer le cours "${c.nom}" ?`
                  );
                  if (ok) {
                    try {
                      await removeCours({ id: c._id, userId: user._id });
                      toast.success("Cours supprimé");
                    } catch (err) {
                      toast.error(err.message);
                    }
                  }
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: danger,
                  cursor: "pointer",
                  padding: isMobile ? "10px 12px" : 8,
                  borderRadius: 8,
                }}
                title="Supprimer le cours"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog {...dialogProps} />
    </div>
  );
}

// ================= SOUS-COMPOSANTS =================

function AddCoursIndividuel({
  classes,
  addCours,
  updateCours,
  ecoleId,
  anneeId,
  userId,
  initialData,
  onSuccess,
  dark,
  isMobile,
}) {
  const [nom, setNom] = useState(initialData?.nom || "");
  const [classe, setClasse] = useState(initialData?.classe || "");
  const [coefficient, setCoefficient] = useState(initialData?.coefficient?.toString() || "1");
  const [bareme, setBareme] = useState(initialData?.bareme?.toString() || "20");
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState(initialData?._id || null);

  const resetForm = () => {
    setNom("");
    setClasse("");
    setCoefficient("1");
    setBareme("20");
    setEditId(null);
    if (onSuccess) onSuccess();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nom.trim() || !classe) {
      toast.error("Veuillez remplir tous les champs obligatoires.");
      return;
    }
    const coeffNum = parseFloat(coefficient);
    const baremeNum = parseFloat(bareme);
    if (isNaN(coeffNum) || coeffNum <= 0) {
      toast.error("Coefficient invalide.");
      return;
    }
    if (isNaN(baremeNum) || baremeNum <= 0) {
      toast.error("Barème invalide.");
      return;
    }

    setAdding(true);
    try {
      if (editId) {
        await updateCours({
          id: editId,
          nom: nom.trim(),
          classe,
          coefficient: coeffNum,
          bareme: baremeNum,
          userId,
        });
        toast.success("Cours mis à jour");
      } else {
        await addCours({
          nom: nom.trim(),
          classe,
          coefficient: coeffNum,
          bareme: baremeNum,
          ecoleId,
          anneeId,
          userId,
        });
        toast.success("Cours ajouté");
      }
      resetForm();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setAdding(false);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: isMobile ? "12px 14px" : "10px 14px",
    border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
    borderRadius: 8,
    fontSize: isMobile ? 16 : 14,
    marginBottom: 16,
    outline: "none",
    background: dark ? "#0F172A" : "#F8FAFC",
    color: dark ? "#F1F5F9" : "#1E293B",
    boxSizing: "border-box",
  };

  const cardPadding = isMobile ? 16 : 24;
  const titleSize = isMobile ? 16 : 18;
  const labelSize = isMobile ? 15 : 14;
  const buttonPadding = isMobile ? "12px 16px" : "10px 20px";
  const buttonFontSize = isMobile ? 16 : 14;
  const buttonWidth = isMobile ? "100%" : "100%";

  return (
    <div style={{
      background: dark ? "#1E293B" : "#FFFFFF",
      borderRadius: 16,
      padding: cardPadding,
      boxShadow: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)",
      border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
      marginBottom: 24,
    }}>
      <h3 style={{ fontSize: titleSize, fontWeight: 600, marginBottom: 20, color: dark ? "#F1F5F9" : "#1E293B" }}>
        {editId ? "Modifier le cours" : "Ajouter un cours à une classe"}
      </h3>
      <form onSubmit={handleSubmit}>
        <label style={{ display: "block", marginBottom: 6, fontWeight: 500, fontSize: labelSize, color: dark ? "#CBD5E1" : "#374151" }}>Nom du cours</label>
        <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex: Mathématiques" style={inputStyle} />

        <label style={{ display: "block", marginBottom: 6, fontWeight: 500, fontSize: labelSize, color: dark ? "#CBD5E1" : "#374151" }}>Classe</label>
        <select value={classe} onChange={(e) => setClasse(e.target.value)} style={inputStyle}>
          <option value="">-- Choisir une classe --</option>
          {classes.map((c) => (
            <option key={c._id} value={c.nom} style={{ background: dark ? "#1E293B" : "#FFF" }}>{c.nom}</option>
          ))}
        </select>

        <label style={{ display: "block", marginBottom: 6, fontWeight: 500, fontSize: labelSize, color: dark ? "#CBD5E1" : "#374151" }}>Coefficient</label>
        <input type="number" step="0.5" min="0.5" value={coefficient} onChange={(e) => setCoefficient(e.target.value)} style={inputStyle} />

        <label style={{ display: "block", marginBottom: 6, fontWeight: 500, fontSize: labelSize, color: dark ? "#CBD5E1" : "#374151" }}>Barème (note max)</label>
        <input type="number" step="1" min="1" value={bareme} onChange={(e) => setBareme(e.target.value)} style={inputStyle} />

        <button type="submit" disabled={adding || !nom.trim() || !classe} style={{
          background: adding ? "#A5B4FC" : (dark ? "#818CF8" : "#4F46E5"),
          color: "white", border: "none", borderRadius: 10,
          padding: buttonPadding, fontWeight: 600,
          cursor: adding ? "not-allowed" : "pointer", width: buttonWidth,
          fontSize: buttonFontSize, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          {adding ? <Loader size={16} className="animate-spin" /> : null}
          {adding ? "Enregistrement..." : editId ? "Mettre à jour" : "Ajouter le cours"}
        </button>
        {editId && (
          <button type="button" onClick={resetForm} style={{
            background: dark ? "#334155" : "#F1F5F9", border: "none", borderRadius: 10,
            padding: buttonPadding, fontWeight: 500, cursor: "pointer", width: buttonWidth, marginTop: 8,
            color: dark ? "#F1F5F9" : "#1E293B", fontSize: buttonFontSize,
          }}>
            Annuler
          </button>
        )}
      </form>
    </div>
  );
}

function AddCoursGroupe({ classes, addBulk, ecoleId, anneeId, userId, dark, isMobile }) {
  const [bulkNom, setBulkNom] = useState("");
  const [bulkCoefficient, setBulkCoefficient] = useState("1");
  const [bulkBareme, setBulkBareme] = useState("20");
  const [selectedClasses, setSelectedClasses] = useState([]);
  const [adding, setAdding] = useState(false);

  const toggleClass = (classe) => {
    setSelectedClasses((prev) =>
      prev.includes(classe) ? prev.filter((c) => c !== classe) : [...prev, classe]
    );
  };
  const selectAll = () => setSelectedClasses(classes.map((c) => c.nom));
  const deselectAll = () => setSelectedClasses([]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!bulkNom.trim() || selectedClasses.length === 0) return;
    const coeffNum = parseFloat(bulkCoefficient);
    const baremeNum = parseFloat(bulkBareme);
    if (isNaN(coeffNum) || coeffNum <= 0) { toast.error("Coefficient invalide."); return; }
    if (isNaN(baremeNum) || baremeNum <= 0) { toast.error("Barème invalide."); return; }
    setAdding(true);
    try {
      await addBulk({
        nom: bulkNom.trim(), coefficient: coeffNum, bareme: baremeNum,
        classes: selectedClasses, ecoleId, anneeId, userId,
      });
      setBulkNom(""); setBulkCoefficient("1"); setBulkBareme("20"); setSelectedClasses([]);
      toast.success(`Cours ajouté à ${selectedClasses.length} classe(s)`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setAdding(false);
    }
  };

  const inputStyle = {
    width: "100%", padding: isMobile ? "12px 14px" : "10px 14px",
    border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
    borderRadius: 8, fontSize: isMobile ? 16 : 14, marginBottom: 16, outline: "none",
    background: dark ? "#0F172A" : "#F8FAFC", color: dark ? "#F1F5F9" : "#1E293B",
    boxSizing: "border-box",
  };

  const cardPadding = isMobile ? 16 : 24;
  const titleSize = isMobile ? 16 : 18;
  const labelSize = isMobile ? 15 : 14;
  const buttonPadding = isMobile ? "12px 16px" : "10px 20px";
  const buttonFontSize = isMobile ? 16 : 14;
  const checkboxSize = isMobile ? 18 : 16;

  return (
    <div style={{
      background: dark ? "#1E293B" : "#FFFFFF", borderRadius: 16, padding: cardPadding,
      boxShadow: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)",
      border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`, marginBottom: 24,
    }}>
      <h3 style={{ fontSize: titleSize, fontWeight: 600, marginBottom: 20, color: dark ? "#F1F5F9" : "#1E293B" }}>
        Ajouter un cours à plusieurs classes
      </h3>
      <form onSubmit={handleSubmit}>
        <label style={{ display: "block", marginBottom: 6, fontWeight: 500, fontSize: labelSize, color: dark ? "#CBD5E1" : "#374151" }}>Nom du cours</label>
        <input value={bulkNom} onChange={(e) => setBulkNom(e.target.value)} placeholder="Ex: Mathématiques" style={inputStyle} />

        <label style={{ display: "block", marginBottom: 6, fontWeight: 500, fontSize: labelSize, color: dark ? "#CBD5E1" : "#374151" }}>Coefficient</label>
        <input type="number" step="0.5" min="0.5" value={bulkCoefficient} onChange={(e) => setBulkCoefficient(e.target.value)} style={inputStyle} />

        <label style={{ display: "block", marginBottom: 6, fontWeight: 500, fontSize: labelSize, color: dark ? "#CBD5E1" : "#374151" }}>Barème (note max)</label>
        <input type="number" step="1" min="1" value={bulkBareme} onChange={(e) => setBulkBareme(e.target.value)} style={inputStyle} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexDirection: isMobile ? "column" : "row", gap: 8 }}>
          <span style={{ fontWeight: 500, fontSize: labelSize, color: dark ? "#CBD5E1" : "#374151" }}>Classes concernées</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={selectAll} style={{ background: "none", border: "none", color: dark ? "#818CF8" : "#4F46E5", cursor: "pointer", fontSize: isMobile ? 14 : 13, fontWeight: 500 }}>Tout sélectionner</button>
            <button type="button" onClick={deselectAll} style={{ background: "none", border: "none", color: dark ? "#94A3B8" : "#64748B", cursor: "pointer", fontSize: isMobile ? 14 : 13, fontWeight: 500 }}>Désélectionner</button>
          </div>
        </div>

        <div style={{ maxHeight: 220, overflowY: "auto", border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`, borderRadius: 12, padding: 8, marginBottom: 16, background: dark ? "#0F172A" : "#F8FAFC" }}>
          {classes.map((c) => (
            <label key={c._id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", fontSize: isMobile ? 15 : 14, cursor: "pointer", borderRadius: 6, color: dark ? "#F1F5F9" : "#1E293B" }}
              onMouseEnter={(e) => e.currentTarget.style.background = dark ? "#312E81" : "#EEF2FF"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
              <input type="checkbox" checked={selectedClasses.includes(c.nom)} onChange={() => toggleClass(c.nom)} style={{ width: checkboxSize, height: checkboxSize, accentColor: dark ? "#818CF8" : "#4F46E5" }} />
              {c.nom}
            </label>
          ))}
        </div>

        <div style={{ fontSize: 13, color: dark ? "#94A3B8" : "#64748B", marginBottom: 16 }}>
          {selectedClasses.length} classe(s) sélectionnée(s)
        </div>

        <button type="submit" disabled={adding || !bulkNom.trim() || selectedClasses.length === 0} style={{
          background: adding ? "#A5B4FC" : (dark ? "#818CF8" : "#4F46E5"), color: "white",
          border: "none", borderRadius: 10, padding: buttonPadding, fontWeight: 600,
          cursor: adding ? "not-allowed" : "pointer", width: "100%", fontSize: buttonFontSize,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          {adding ? <Loader size={16} className="animate-spin" /> : null}
          {adding ? "Ajout en cours..." : `Ajouter le cours à ${selectedClasses.length} classe(s)`}
        </button>
      </form>
    </div>
  );
}