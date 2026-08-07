import { useState, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import * as XLSX from "xlsx";
import { useStyles } from "../styles/theme";
import { BarChart3, Upload, Trash2, Edit2 } from "lucide-react";
import toast from "react-hot-toast";

export function GestionNotes({
  ecoleId,
  eleves,
  matiereFixe,
  classeFixe,
  anneeId,
  anneeActive,
  user,
  coursDisponibles,   // liste des cours pour connaître le barème
}) {
  const { S } = useStyles();
  const [mode, setMode] = useState("individuel");
  const [editData, setEditData] = useState(null);

  if (!anneeId) {
    return (
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px" }}>
        <div style={{
          background: "#FFF", borderRadius: 16, padding: 48,
          textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
        }}>
          <BarChart3 size={48} color="#F59E0B" style={{ marginBottom: 16 }} />
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

  const notes = useQuery(api.notes.listByEcole, anneeId ? { ecoleId, anneeId } : { ecoleId }) ?? [];
  const upsertNote = useMutation(api.notes.upsert);
  const upsertBulk = useMutation(api.notes.upsertBulk);
  const removeNote = useMutation(api.notes.remove);

  const matieresUtilisees = [...new Set(notes.map((n) => n.matiere))].sort();
  const resultatsFileInputRef = useRef(null);

  const handleImportResultatsExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
        if (rows.length < 2) return;
        const headers = rows[0].map((h) => h.toString().toLowerCase().trim());
        const nomIdx = headers.indexOf("nom"),
          postnomIdx = headers.indexOf("postnom"),
          classeIdx = headers.indexOf("classe"),
          periodeIdx = headers.indexOf("periode"),
          notesIdx = headers.indexOf("notes"),
          appIdx = headers.indexOf("appreciation");
        if (nomIdx === -1 || postnomIdx === -1 || classeIdx === -1 || periodeIdx === -1 || notesIdx === -1) {
          toast.error("Colonnes requises : nom, postnom, classe, periode, notes");
          return;
        }
        let count = 0;
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row[nomIdx] || !row[postnomIdx] || !row[classeIdx] || !row[periodeIdx] || !row[notesIdx]) continue;
          const nom = row[nomIdx].toString().trim();
          const postnom = row[postnomIdx].toString().trim();
          const classe = row[classeIdx].toString().trim();
          const eleve = eleves.find((e) => e.nom === nom && e.postnom === postnom && e.classe === classe);
          if (!eleve) continue;
          await upsertNote({
            eleveId: eleve._id,
            ecoleId,
            matiere: matiereFixe || "Non spécifié",
            note: parseFloat(row[notesIdx]),
            coefficient: 1,
            periode: row[periodeIdx].toString().trim(),
            appreciation: appIdx !== -1 ? row[appIdx]?.toString().trim() : undefined,
            anneeId,
            userId: user?._id,
          });
          count++;
        }
        toast.success(`${count} résultats importés / mis à jour.`);
      } catch (err) {
        toast.error("Erreur lors de la lecture du fichier : " + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 16px" }}>
      {/* En-tête */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, color: "#1E293B", margin: 0 }}>
          Gestion des notes
        </h2>
        <p style={{ color: "#64748B", marginTop: 4, fontSize: 14 }}>
          {notes.length} note(s) {anneeActive ? `· ${anneeActive.nom}` : ""}
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
            onClick={() => { setMode(tab.id); setEditData(null); }}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "12px 20px", border: "none", background: "transparent",
              color: mode === tab.id ? "#4F46E5" : "#64748B",
              fontWeight: mode === tab.id ? 600 : 400,
              borderBottom: mode === tab.id ? "3px solid #4F46E5" : "3px solid transparent",
              cursor: "pointer", transition: "all 0.2s",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Formulaire individuel ou groupé */}
      {mode === "individuel" ? (
        <AddNoteIndividuel
          eleves={eleves}
          matiereFixe={matiereFixe}
          matieresUtilisees={matieresUtilisees}
          upsertNote={upsertNote}
          ecoleId={ecoleId}
          anneeId={anneeId}
          userId={user?._id}
          S={S}
          initialData={editData}
          onSuccess={() => setEditData(null)}
          coursDisponibles={coursDisponibles}
        />
      ) : (
        <AddNoteGroupe
          eleves={eleves}
          matiereFixe={matiereFixe}
          matieresUtilisees={matieresUtilisees}
          upsertBulk={upsertBulk}
          ecoleId={ecoleId}
          anneeId={anneeId}
          userId={user?._id}
          S={S}
          coursDisponibles={coursDisponibles}
        />
      )}

      {/* Import Excel */}
      <div style={{
        background: "#FFF", borderRadius: 16, padding: 24,
        margin: "24px 0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
      }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <Upload size={20} /> Importer des résultats depuis Excel
        </h3>
        <input
          type="file"
          accept=".xlsx, .xls"
          ref={resultatsFileInputRef}
          style={{ display: "none" }}
          onChange={handleImportResultatsExcel}
        />
        <button
          onClick={() => resultatsFileInputRef.current.click()}
          style={{
            background: "#10B981", color: "white", border: "none",
            borderRadius: 10, padding: "10px 20px", fontWeight: 600,
            cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", gap: 8
          }}
        >
          📂 Sélectionner un fichier Excel
        </button>
        <p style={{ color: "#94A3B8", fontSize: 13, marginTop: 8 }}>
          Colonnes : <strong>nom, postnom, classe, periode, notes, appreciation</strong>
        </p>
      </div>

      {/* Liste des notes */}
      <div style={{ display: "grid", gap: 12 }}>
        {notes.length === 0 && (
          <div style={{
            background: "#FFF", borderRadius: 16, padding: 48, textAlign: "center",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)", color: "#64748B",
          }}>
            <BarChart3 size={32} style={{ marginBottom: 8 }} />
            <p>Aucune note enregistrée</p>
          </div>
        )}
        {notes.map((n) => {
          const eleve = eleves.find((e) => e._id === n.eleveId);
          return (
            <div key={n._id} style={{
              background: "#FFF", borderRadius: 12, padding: "16px 20px",
              display: "flex", justifyContent: "space-between", alignItems: "center",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)", transition: "box-shadow 0.15s"
            }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)"}
              onMouseLeave={e => e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.05)"}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 16 }}>
                  {eleve?.nom} {eleve?.postnom}
                </div>
                <div style={{ color: "#64748B", fontSize: 13 }}>
                  {n.matiere} — {n.periode} (coeff. {n.coefficient})
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>
                  {n.note}/20
                </div>
                {n.appreciation && (
                  <div style={{ fontSize: 12, color: "#64748B", fontStyle: "italic" }}>
                    📝 {n.appreciation}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={() => { setEditData(n); setMode("individuel"); }}
                  style={{ background: "#4F46E5", color: "white", border: "none", borderRadius: 8, padding: "8px", cursor: "pointer" }}
                  title="Modifier la note"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={async () => {
                    if (window.confirm("Supprimer cette note ?")) {
                      try {
                        await removeNote({ id: n._id, userId: user?._id });
                        toast.success("Note supprimée");
                      } catch (err) {
                        toast.error(err.message);
                      }
                    }
                  }}
                  style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer", padding: 8, borderRadius: 8 }}
                  title="Supprimer la note"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Composant interne : Ajout individuel (avec correction id:null et barème)
function AddNoteIndividuel({
  eleves,
  matiereFixe,
  matieresUtilisees,
  upsertNote,
  ecoleId,
  anneeId,
  userId,
  S,
  initialData,
  onSuccess,
  coursDisponibles,
}) {
  const [selectedEleve, setSelectedEleve] = useState(initialData?.eleveId || "");
  const [matiere, setMatiere] = useState(initialData?.matiere || matiereFixe || "");
  const [note, setNote] = useState(initialData?.note?.toString() || "");
  const [coefficient, setCoefficient] = useState(initialData?.coefficient?.toString() || "1");
  const [periode, setPeriode] = useState(initialData?.periode || "");
  const [appreciation, setAppreciation] = useState(initialData?.appreciation || "");
  const [editId, setEditId] = useState(initialData?._id || null);
  const [submitting, setSubmitting] = useState(false);

  // Détermination du barème du cours sélectionné
  const cours = coursDisponibles?.find(c => c.nom === (matiereFixe || matiere));
  const bareme = cours?.bareme ?? 20;

  const resetForm = () => {
    setSelectedEleve("");
    setMatiere(matiereFixe || "");
    setNote("");
    setCoefficient("1");
    setPeriode("");
    setAppreciation("");
    setEditId(null);
    if (onSuccess) onSuccess();
  };

  const validate = () => {
    if (!selectedEleve || !matiere || !note || !periode) {
      toast.error("Veuillez remplir tous les champs obligatoires.");
      return false;
    }
    const noteNum = parseFloat(note);
    if (isNaN(noteNum) || noteNum < 0 || noteNum > bareme) {
      toast.error(`La note doit être comprise entre 0 et ${bareme}.`);
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload = {
        eleveId: selectedEleve,
        ecoleId,
        matiere,
        note: parseFloat(note),
        coefficient: parseFloat(coefficient) || 1,
        periode,
        appreciation: appreciation || undefined,
        anneeId,
        userId,
      };
      // N'ajouter id que s'il existe (modification)
      if (editId) {
        payload.id = editId;
      }
      await upsertNote(payload);
      toast.success(editId ? "Note mise à jour" : "Note ajoutée");
      resetForm();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "10px 14px",
    border: "1px solid #E2E8F0",
    borderRadius: 8,
    fontSize: 14,
    marginBottom: 16,
    outline: "none",
    background: "#F8FAFC",
  };

  return (
    <div style={{ background: "#FFF", borderRadius: 16, padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.05)", marginBottom: 24 }}>
      <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>
        {editId ? "Modifier la note" : "Ajouter une note"}
      </h3>
      <form onSubmit={handleSubmit}>
        <label style={{ display: "block", marginBottom: 6, fontWeight: 500 }}>Élève</label>
        <select
          value={selectedEleve}
          onChange={(e) => setSelectedEleve(e.target.value)}
          disabled={!!editId}
          style={inputStyle}
        >
          <option value="">-- Choisir un élève --</option>
          {eleves.map((e) => (
            <option key={e._id} value={e._id}>{e.nom} {e.postnom} ({e.classe})</option>
          ))}
        </select>

        <label style={{ display: "block", marginBottom: 6, fontWeight: 500 }}>Matière</label>
        <input
          value={matiere}
          onChange={(e) => setMatiere(e.target.value)}
          disabled={!!matiereFixe}
          list="matieres-list"
          style={inputStyle}
          placeholder="Ex: Mathématiques"
        />
        <datalist id="matieres-list">
          {matieresUtilisees.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>

        <label style={{ display: "block", marginBottom: 6, fontWeight: 500 }}>
          Note (/{bareme})
        </label>
        <input
          type="number"
          step="0.01"
          min="0"
          max={bareme}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          style={inputStyle}
          placeholder={`Ex: 15.5`}
        />

        <label style={{ display: "block", marginBottom: 6, fontWeight: 500 }}>Coefficient</label>
        <input
          type="number"
          step="0.5"
          min="0"
          value={coefficient}
          onChange={(e) => setCoefficient(e.target.value)}
          style={inputStyle}
          placeholder="1"
        />

        <label style={{ display: "block", marginBottom: 6, fontWeight: 500 }}>Période</label>
        <input
          value={periode}
          onChange={(e) => setPeriode(e.target.value)}
          style={inputStyle}
          placeholder="Ex: 1er Trimestre 2025"
        />

        <label style={{ display: "block", marginBottom: 6, fontWeight: 500 }}>Appréciation (optionnel)</label>
        <input
          value={appreciation}
          onChange={(e) => setAppreciation(e.target.value)}
          style={inputStyle}
          placeholder="Ex: Bon travail"
        />

        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="submit"
            disabled={submitting}
            style={{
              background: submitting ? "#A5B4FC" : "#4F46E5",
              color: "white", border: "none", borderRadius: 10,
              padding: "10px 20px", fontWeight: 600, cursor: "pointer",
              flex: 1, fontSize: 14
            }}
          >
            {submitting ? "Enregistrement..." : editId ? "Mettre à jour" : "Ajouter la note"}
          </button>
          {editId && (
            <button
              type="button"
              onClick={resetForm}
              style={{ background: "#F1F5F9", border: "none", borderRadius: 10, padding: "10px 20px", cursor: "pointer" }}
            >
              Annuler
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

// Composant interne : Ajout groupé
function AddNoteGroupe({
  eleves,
  matiereFixe,
  matieresUtilisees,
  upsertBulk,
  ecoleId,
  anneeId,
  userId,
  S,
  coursDisponibles,
}) {
  const [selectedEleveIds, setSelectedEleveIds] = useState([]);
  const [bulkMatiere, setBulkMatiere] = useState(matiereFixe || "");
  const [bulkNote, setBulkNote] = useState("");
  const [bulkCoefficient, setBulkCoefficient] = useState("1");
  const [bulkPeriode, setBulkPeriode] = useState("");
  const [bulkAppreciation, setBulkAppreciation] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Barème du cours sélectionné
  const cours = coursDisponibles?.find(c => c.nom === (matiereFixe || bulkMatiere));
  const bareme = cours?.bareme ?? 20;

  const toggleEleve = (id) => setSelectedEleveIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const selectAll = () => setSelectedEleveIds(eleves.map(e => e._id));
  const deselectAll = () => setSelectedEleveIds([]);

  const validate = () => {
    if (selectedEleveIds.length === 0 || !bulkMatiere || !bulkNote || !bulkPeriode) {
      toast.error("Veuillez remplir tous les champs obligatoires.");
      return false;
    }
    const noteNum = parseFloat(bulkNote);
    if (isNaN(noteNum) || noteNum < 0 || noteNum > bareme) {
      toast.error(`La note doit être comprise entre 0 et ${bareme}.`);
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const count = await upsertBulk({
        eleveIds: selectedEleveIds,
        ecoleId,
        matiere: bulkMatiere,
        note: parseFloat(bulkNote),
        coefficient: parseFloat(bulkCoefficient) || 1,
        periode: bulkPeriode,
        appreciation: bulkAppreciation || undefined,
        anneeId,
        userId,
      });
      toast.success(`${count} notes enregistrées.`);
      setSelectedEleveIds([]);
      setBulkMatiere(matiereFixe || "");
      setBulkNote("");
      setBulkCoefficient("1");
      setBulkPeriode("");
      setBulkAppreciation("");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "10px 14px",
    border: "1px solid #E2E8F0",
    borderRadius: 8,
    fontSize: 14,
    marginBottom: 16,
    outline: "none",
    background: "#F8FAFC",
  };

  return (
    <div style={{ background: "#FFF", borderRadius: 16, padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.05)", marginBottom: 24 }}>
      <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>Ajouter des notes groupées</h3>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontWeight: 500, fontSize: 14 }}>Élèves concernés</span>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={selectAll} style={{ background: "none", border: "none", color: "#4F46E5", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>Tout sélectionner</button>
          <button type="button" onClick={deselectAll} style={{ background: "none", border: "none", color: "#64748B", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>Désélectionner</button>
        </div>
      </div>
      <div style={{
        maxHeight: 220, overflowY: "auto", border: "1px solid #E2E8F0",
        borderRadius: 12, padding: 8, marginBottom: 16, background: "#F8FAFC"
      }}>
        {eleves.map(e => (
          <label key={e._id} style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "6px 8px", fontSize: 14, cursor: "pointer",
            borderRadius: 6, transition: "background 0.1s",
            background: selectedEleveIds.includes(e._id) ? "#EEF2FF" : "transparent"
          }}>
            <input
              type="checkbox"
              checked={selectedEleveIds.includes(e._id)}
              onChange={() => toggleEleve(e._id)}
              style={{ width: 16, height: 16, accentColor: "#4F46E5" }}
            />
            {e.nom} {e.postnom} ({e.classe})
          </label>
        ))}
      </div>
      <div style={{ fontSize: 13, color: "#64748B", marginBottom: 16 }}>{selectedEleveIds.length} élève(s) sélectionné(s)</div>

      <form onSubmit={handleSubmit}>
        <label style={{ display: "block", marginBottom: 6, fontWeight: 500 }}>Matière</label>
        <input value={bulkMatiere} onChange={e => setBulkMatiere(e.target.value)} disabled={!!matiereFixe} list="matieres-bulk" style={inputStyle} placeholder="Matière" />
        <datalist id="matieres-bulk">{matieresUtilisees.map(m => <option key={m} value={m} />)}</datalist>

        <label style={{ display: "block", marginBottom: 6, fontWeight: 500 }}>
          Note (/{bareme})
        </label>
        <input type="number" step="0.01" min="0" max={bareme} value={bulkNote} onChange={e => setBulkNote(e.target.value)} style={inputStyle} placeholder={`Ex: 15.5`} />

        <label style={{ display: "block", marginBottom: 6, fontWeight: 500 }}>Coefficient</label>
        <input type="number" step="0.5" min="0" value={bulkCoefficient} onChange={e => setBulkCoefficient(e.target.value)} style={inputStyle} placeholder="1" />

        <label style={{ display: "block", marginBottom: 6, fontWeight: 500 }}>Période</label>
        <input value={bulkPeriode} onChange={e => setBulkPeriode(e.target.value)} style={inputStyle} placeholder="1er Trimestre 2025" />

        <label style={{ display: "block", marginBottom: 6, fontWeight: 500 }}>Appréciation (optionnel)</label>
        <input value={bulkAppreciation} onChange={e => setBulkAppreciation(e.target.value)} style={inputStyle} placeholder="Bon travail" />

        <button
          type="submit"
          disabled={submitting || selectedEleveIds.length === 0 || !bulkMatiere || !bulkNote || !bulkPeriode}
          style={{
            background: submitting ? "#A5B4FC" : "#4F46E5",
            color: "white", border: "none", borderRadius: 10, padding: "10px 20px",
            fontWeight: 600, cursor: "pointer", width: "100%", fontSize: 14
          }}
        >
          {submitting ? "Enregistrement..." : `Appliquer à ${selectedEleveIds.length} élève(s)`}
        </button>
      </form>
    </div>
  );
}