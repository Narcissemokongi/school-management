import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useStyles } from "../styles/theme";
import { Plus, Trash2, BookOpen, Filter } from "lucide-react";
import toast from "react-hot-toast";

export function GestionCours({ ecoleId, classes, user, anneeId, anneeActive }) {
  const { S } = useStyles();

  // Message si aucune année active
  if (!anneeId) {
    return (
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px" }}>
        <div style={{
          background: "#FFF",
          borderRadius: 16,
          padding: 48,
          textAlign: "center",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
        }}>
          <BookOpen size={48} color="#F59E0B" style={{ marginBottom: 16 }} />
          <h2 style={{ fontSize: 24, fontWeight: 600, color: "#1E293B", margin: "0 0 8px" }}>
            Aucune année scolaire active
          </h2>
          <p style={{ color: "#64748B", fontSize: 14 }}>
            Veuillez créer ou activer une année scolaire dans les paramètres.
          </p>
        </div>
      </div>
    );
  }

  const [mode, setMode] = useState("individuel");
  const [classeFiltre, setClasseFiltre] = useState("");

  const cours = useQuery(
    api.cours.list,
    { ecoleId, classe: classeFiltre || undefined, anneeId }
  ) ?? [];

  const addCours = useMutation(api.cours.add);
  const addBulk = useMutation(api.cours.addBulk);
  const removeCours = useMutation(api.cours.remove);

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 16px" }}>
      {/* En-tête */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, color: "#1E293B", margin: 0 }}>
          Gestion des cours
        </h2>
        <p style={{ color: "#64748B", marginTop: 4, fontSize: 14 }}>
          {cours.length} cours {anneeActive ? `· ${anneeActive.nom}` : ""}
        </p>
      </div>

      {/* Sélecteur de mode d'ajout */}
      <div style={{ display: "flex", gap: 0, borderBottom: "2px solid #E2E8F0", marginBottom: 24 }}>
        {[
          { id: "individuel", label: "Ajout individuel" },
          { id: "groupe", label: "Ajout groupé" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setMode(tab.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "12px 20px",
              border: "none",
              background: "transparent",
              color: mode === tab.id ? "#4F46E5" : "#64748B",
              fontWeight: mode === tab.id ? 600 : 400,
              borderBottom: mode === tab.id ? "3px solid #4F46E5" : "3px solid transparent",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Formulaire d'ajout selon le mode */}
      {mode === "individuel" ? (
        <AddCoursIndividuel
          classes={classes}
          addCours={addCours}
          ecoleId={ecoleId}
          anneeId={anneeId}
          userId={user._id}
          S={S}
        />
      ) : (
        <AddCoursGroupe
          classes={classes}
          addBulk={addBulk}
          ecoleId={ecoleId}
          anneeId={anneeId}
          userId={user._id}
          S={S}
        />
      )}

      {/* Filtrage par classe */}
      <div style={{
        background: "#FFF",
        borderRadius: 16,
        padding: "16px 20px",
        margin: "24px 0",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}>
        <Filter size={18} color="#64748B" />
        <select
          value={classeFiltre}
          onChange={(e) => setClasseFiltre(e.target.value)}
          style={{
            padding: "8px 12px",
            border: "1px solid #E2E8F0",
            borderRadius: 8,
            fontSize: 14,
            minWidth: 200,
            outline: "none",
            background: "#F8FAFC",
          }}
        >
          <option value="">Toutes les classes</option>
          {classes.map((c) => (
            <option key={c._id} value={c.nom}>{c.nom}</option>
          ))}
        </select>
      </div>

      {/* Liste des cours */}
      <div style={{ display: "grid", gap: 12 }}>
        {cours.length === 0 && (
          <div style={{
            background: "#FFF",
            borderRadius: 16,
            padding: 48,
            textAlign: "center",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            color: "#64748B",
          }}>
            <BookOpen size={32} style={{ marginBottom: 8 }} />
            <p>Aucun cours trouvé{classeFiltre ? ` pour la classe ${classeFiltre}` : ""}</p>
          </div>
        )}
        {cours.map((c) => (
          <div
            key={c._id}
            style={{
              background: "#FFF",
              borderRadius: 12,
              padding: "16px 20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              transition: "box-shadow 0.15s",
            }}
            onMouseEnter={(e) => e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)"}
            onMouseLeave={(e) => e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.05)"}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: 16 }}>
                {c.nom}{" "}
                <span style={{ fontWeight: 400, fontSize: 13, color: "#64748B" }}>
                  {c.coefficient ? `coeff. ${c.coefficient}` : ""}
                  {c.bareme ? ` · bar. ${c.bareme}` : ""}
                </span>
              </div>
              <div style={{ color: "#64748B", fontSize: 13 }}>Classe {c.classe}</div>
            </div>
            <button
              onClick={async () => {
                if (window.confirm(`Supprimer le cours "${c.nom}" ?`)) {
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
                color: "#EF4444",
                cursor: "pointer",
                padding: 8,
                borderRadius: 8,
              }}
              title="Supprimer le cours"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// Composant interne : formulaire d'ajout individuel
function AddCoursIndividuel({ classes, addCours, ecoleId, anneeId, userId, S }) {
  const [nom, setNom] = useState("");
  const [classe, setClasse] = useState("");
  const [coefficient, setCoefficient] = useState("1");
  const [bareme, setBareme] = useState("20");
  const [adding, setAdding] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nom.trim() || !classe) return;
    setAdding(true);
    try {
      await addCours({
        nom: nom.trim(),
        classe,
        coefficient: parseFloat(coefficient) || 1,
        bareme: parseFloat(bareme) || 20,
        ecoleId,
        anneeId,
        userId,
      });
      setNom("");
      setClasse("");
      setCoefficient("1");
      setBareme("20");
      toast.success("Cours ajouté");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div style={{ background: "#FFF", borderRadius: 16, padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.05)", marginBottom: 24 }}>
      <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>Ajouter un cours à une classe</h3>
      <form onSubmit={handleSubmit}>
        <label style={{ display: "block", marginBottom: 6, fontWeight: 500 }}>Nom du cours</label>
        <input
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          placeholder="Ex: Mathématiques"
          style={{
            width: "100%",
            padding: "10px 14px",
            border: "1px solid #E2E8F0",
            borderRadius: 8,
            fontSize: 14,
            marginBottom: 16,
            outline: "none",
          }}
        />
        <label style={{ display: "block", marginBottom: 6, fontWeight: 500 }}>Classe</label>
        <select
          value={classe}
          onChange={(e) => setClasse(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 14px",
            border: "1px solid #E2E8F0",
            borderRadius: 8,
            fontSize: 14,
            marginBottom: 16,
            outline: "none",
            background: "#F8FAFC",
          }}
        >
          <option value="">-- Choisir une classe --</option>
          {classes.map((c) => (
            <option key={c._id} value={c.nom}>{c.nom}</option>
          ))}
        </select>
        <label style={{ display: "block", marginBottom: 6, fontWeight: 500 }}>Coefficient</label>
        <input
          type="number"
          step="0.5"
          min="0"
          value={coefficient}
          onChange={(e) => setCoefficient(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 14px",
            border: "1px solid #E2E8F0",
            borderRadius: 8,
            fontSize: 14,
            marginBottom: 16,
            outline: "none",
          }}
        />
        <label style={{ display: "block", marginBottom: 6, fontWeight: 500 }}>Barème (note max)</label>
        <input
          type="number"
          step="1"
          min="1"
          value={bareme}
          onChange={(e) => setBareme(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 14px",
            border: "1px solid #E2E8F0",
            borderRadius: 8,
            fontSize: 14,
            marginBottom: 16,
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={adding || !nom.trim() || !classe}
          style={{
            background: adding ? "#A5B4FC" : "#4F46E5",
            color: "white",
            border: "none",
            borderRadius: 10,
            padding: "10px 20px",
            fontWeight: 600,
            cursor: adding ? "not-allowed" : "pointer",
            width: "100%",
            fontSize: 14,
          }}
        >
          {adding ? "Ajout en cours..." : "Ajouter le cours"}
        </button>
      </form>
    </div>
  );
}

// Composant interne : formulaire d'ajout groupé
function AddCoursGroupe({ classes, addBulk, ecoleId, anneeId, userId, S }) {
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
    setAdding(true);
    try {
      await addBulk({
        nom: bulkNom.trim(),
        coefficient: parseFloat(bulkCoefficient) || 1,
        bareme: parseFloat(bulkBareme) || 20,
        classes: selectedClasses,
        ecoleId,
        anneeId,
        userId,
      });
      setBulkNom("");
      setBulkCoefficient("1");
      setBulkBareme("20");
      setSelectedClasses([]);
      toast.success(`Cours ajouté à ${selectedClasses.length} classe(s)`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div style={{ background: "#FFF", borderRadius: 16, padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.05)", marginBottom: 24 }}>
      <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>Ajouter un cours à plusieurs classes</h3>
      <form onSubmit={handleSubmit}>
        <label style={{ display: "block", marginBottom: 6, fontWeight: 500 }}>Nom du cours</label>
        <input
          value={bulkNom}
          onChange={(e) => setBulkNom(e.target.value)}
          placeholder="Ex: Mathématiques"
          style={{
            width: "100%",
            padding: "10px 14px",
            border: "1px solid #E2E8F0",
            borderRadius: 8,
            fontSize: 14,
            marginBottom: 16,
            outline: "none",
          }}
        />
        <label style={{ display: "block", marginBottom: 6, fontWeight: 500 }}>Coefficient</label>
        <input
          type="number"
          step="0.5"
          min="0"
          value={bulkCoefficient}
          onChange={(e) => setBulkCoefficient(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 14px",
            border: "1px solid #E2E8F0",
            borderRadius: 8,
            fontSize: 14,
            marginBottom: 16,
            outline: "none",
          }}
        />
        <label style={{ display: "block", marginBottom: 6, fontWeight: 500 }}>Barème (note max)</label>
        <input
          type="number"
          step="1"
          min="1"
          value={bulkBareme}
          onChange={(e) => setBulkBareme(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 14px",
            border: "1px solid #E2E8F0",
            borderRadius: 8,
            fontSize: 14,
            marginBottom: 16,
            outline: "none",
          }}
        />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontWeight: 500, fontSize: 14 }}>Classes concernées</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={selectAll} style={{
              background: "none",
              border: "none",
              color: "#4F46E5",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 500,
            }}>
              Tout sélectionner
            </button>
            <button type="button" onClick={deselectAll} style={{
              background: "none",
              border: "none",
              color: "#64748B",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 500,
            }}>
              Désélectionner
            </button>
          </div>
        </div>

        <div style={{
          maxHeight: 220,
          overflowY: "auto",
          border: "1px solid #E2E8F0",
          borderRadius: 12,
          padding: 8,
          marginBottom: 16,
          background: "#F8FAFC",
        }}>
          {classes.map((c) => (
            <label
              key={c._id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 8px",
                fontSize: 14,
                cursor: "pointer",
                borderRadius: 6,
                transition: "background 0.1s",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#EEF2FF"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              <input
                type="checkbox"
                checked={selectedClasses.includes(c.nom)}
                onChange={() => toggleClass(c.nom)}
                style={{ width: 16, height: 16, accentColor: "#4F46E5" }}
              />
              {c.nom}
            </label>
          ))}
        </div>

        <div style={{ fontSize: 13, color: "#64748B", marginBottom: 16 }}>
          {selectedClasses.length} classe(s) sélectionnée(s)
        </div>

        <button
          type="submit"
          disabled={adding || !bulkNom.trim() || selectedClasses.length === 0}
          style={{
            background: adding ? "#A5B4FC" : "#4F46E5",
            color: "white",
            border: "none",
            borderRadius: 10,
            padding: "10px 20px",
            fontWeight: 600,
            cursor: adding ? "not-allowed" : "pointer",
            width: "100%",
            fontSize: 14,
          }}
        >
          {adding ? "Ajout en cours..." : `Ajouter le cours à ${selectedClasses.length} classe(s)`}
        </button>
      </form>
    </div>
  );
}