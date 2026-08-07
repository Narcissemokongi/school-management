import { useState, useRef, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import * as XLSX from "xlsx";
import { useStyles } from "../styles/theme";
import { useConfirm } from "../hooks/useConfirm";
import { ConfirmDialog } from "./ConfirmDialog";
import toast from "react-hot-toast";
import { DataTable } from "./DataTable";
import {
  Loader,
  DollarSign,
  Upload,
  Trash2,
  Edit2,
  School,
} from "lucide-react";

export function GestionFrais({
  ecoleId,
  eleves,
  anneeId,
  anneeActive,
  user,
}) {
  const { S, dark } = useStyles();
  const { confirm, dialogProps } = useConfirm();

  // Récupération de la devise
  const ecole = useQuery(
    api.ecoles.get,
    ecoleId ? { ecoleId } : "skip"
  );
  const devise = ecole?.devise || "CDF";
  const deviseSymbol = devise === "USD" ? "$" : "FC";

  const [mode, setMode] = useState("individuel");
  const [editData, setEditData] = useState(null);
  const [classeActive, setClasseActive] = useState(""); // "" = toutes les classes
  const [deleting, setDeleting] = useState(false);
  const [importing, setImporting] = useState(false);

  const frais =
    useQuery(
      api.frais.listByEcole,
      anneeId ? { ecoleId, anneeId } : { ecoleId }
    ) ?? [];
  const upsertFrais = useMutation(api.frais.upsert);
  const upsertBulk = useMutation(api.frais.upsertBulk);
  const removeFrais = useMutation(api.frais.remove);
  const fraisFileInputRef = useRef(null);

  // Classes uniques avec leur nombre d'élèves
  const classesStats = useMemo(() => {
    const map = {};
    eleves.forEach((e) => {
      if (!map[e.classe]) {
        map[e.classe] = { nom: e.classe, nbEleves: 0 };
      }
      map[e.classe].nbEleves++;
    });
    return Object.values(map).sort((a, b) => a.nom.localeCompare(b.nom));
  }, [eleves]);

  // Élèves filtrés par la classe active
  const elevesFiltres = useMemo(
    () =>
      classeActive
        ? eleves.filter((e) => e.classe === classeActive)
        : eleves,
    [eleves, classeActive]
  );

  // Frais filtrés par la classe active
  const fraisFiltres = useMemo(
    () =>
      classeActive
        ? frais.filter((f) => {
            const eleve = eleves.find((e) => e._id === f.eleveId);
            return eleve?.classe === classeActive;
          })
        : frais,
    [frais, eleves, classeActive]
  );

  // Statistiques rapides
  const totalFrais = fraisFiltres.reduce((sum, f) => sum + f.montantTotal, 0);
  const totalPaye = fraisFiltres.reduce((sum, f) => sum + f.montantPaye, 0);
  const resteAPayer = totalFrais - totalPaye;

  // Suppression
  const handleDelete = async (id) => {
    const ok = await confirm(
      "Supprimer ces frais",
      "Voulez-vous vraiment supprimer ces frais ?"
    );
    if (!ok) return;
    setDeleting(true);
    try {
      await removeFrais({ id, userId: user._id });
      toast.success("Frais supprimés");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  // Import Excel
  const handleImportFraisExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
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
          totalIdx = headers.indexOf("montanttotal"),
          payeIdx = headers.indexOf("montantpaye"),
          commentaireIdx = headers.indexOf("commentaire");
        if (
          nomIdx === -1 ||
          postnomIdx === -1 ||
          classeIdx === -1 ||
          totalIdx === -1 ||
          payeIdx === -1
        ) {
          toast.error(
            "Colonnes requises : nom, postnom, classe, montantTotal, montantPaye"
          );
          return;
        }
        let count = 0;
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (
            !row[nomIdx] ||
            !row[postnomIdx] ||
            !row[classeIdx] ||
            row[totalIdx] == null ||
            row[payeIdx] == null
          )
            continue;
          const nom = row[nomIdx].toString().trim();
          const postnom = row[postnomIdx].toString().trim();
          const classe = row[classeIdx].toString().trim();
          const eleve = eleves.find(
            (e) => e.nom === nom && e.postnom === postnom && e.classe === classe
          );
          if (!eleve) continue;
          await upsertFrais({
            eleveId: eleve._id,
            ecoleId,
            montantTotal: parseFloat(row[totalIdx]),
            montantPaye: parseFloat(row[payeIdx]),
            commentaire:
              commentaireIdx !== -1
                ? row[commentaireIdx]?.toString().trim()
                : undefined,
            anneeId,
            userId: user._id,
          });
          count++;
        }
        toast.success(`${count} frais importés / mis à jour.`);
      } catch (err) {
        toast.error(err.message);
      } finally {
        setImporting(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  if (!anneeId) {
    return (
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "32px 24px",
          textAlign: "center",
        }}
      >
        <DollarSign size={48} color="#F59E0B" style={{ marginBottom: 16 }} />
        <h2 style={{ fontSize: 24, fontWeight: 600, color: "#1E293B", margin: "0 0 8px" }}>
          Aucune année scolaire active
        </h2>
        <p style={{ color: "#64748B", fontSize: 14 }}>
          Veuillez activer une année scolaire.
        </p>
      </div>
    );
  }

  // Enrichissement pour le tableau
  const enrichedFrais = fraisFiltres.map((f) => {
    const eleve = eleves.find((e) => e._id === f.eleveId);
    const reste = f.montantTotal - f.montantPaye;
    return {
      ...f,
      eleveNom: eleve?.nom ?? "—",
      elevePostnom: eleve?.postnom ?? "",
      eleveClasse: eleve?.classe ?? "—",
      reste,
    };
  });

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 16px" }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .animate-spin { animation: spin 1s linear infinite; }`}</style>

      {/* En-tête */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, color: "#1E293B", margin: 0 }}>
          Gestion des frais ({deviseSymbol})
        </h2>
        <p style={{ color: "#64748B", marginTop: 4, fontSize: 14 }}>
          {frais.length} élève(s) avec des frais {anneeActive ? `· ${anneeActive.nom}` : ""}
        </p>
      </div>

      {/* Onglets des classes */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 24,
          overflowX: "auto",
          whiteSpace: "nowrap",
          borderBottom: "2px solid #E2E8F0",
          paddingBottom: 8,
        }}
      >
        <button
          onClick={() => setClasseActive("")}
          style={{
            padding: "8px 16px",
            border: "none",
            borderRadius: 20,
            background: classeActive === "" ? "#4F46E5" : "transparent",
            color: classeActive === "" ? "#FFF" : "#64748B",
            fontWeight: classeActive === "" ? 600 : 400,
            fontSize: 13,
            cursor: "pointer",
            transition: "all 0.2s",
            whiteSpace: "nowrap",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <School size={16} />
          Toutes ({eleves.length})
        </button>
        {classesStats.map((c) => (
          <button
            key={c.nom}
            onClick={() => setClasseActive(c.nom)}
            style={{
              padding: "8px 16px",
              border: "none",
              borderRadius: 20,
              background: classeActive === c.nom ? "#4F46E5" : "transparent",
              color: classeActive === c.nom ? "#FFF" : "#64748B",
              fontWeight: classeActive === c.nom ? 600 : 400,
              fontSize: 13,
              cursor: "pointer",
              transition: "all 0.2s",
              whiteSpace: "nowrap",
            }}
          >
            {c.nom} ({c.nbEleves})
          </button>
        ))}
      </div>

      {/* Cartes statistiques */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            background: "#FFF",
            borderRadius: 12,
            padding: 16,
            textAlign: "center",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ fontSize: 13, color: "#64748B", marginBottom: 4 }}>
            Total dû
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#1E293B" }}>
            {totalFrais.toLocaleString()} {deviseSymbol}
          </div>
        </div>
        <div
          style={{
            background: "#FFF",
            borderRadius: 12,
            padding: 16,
            textAlign: "center",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ fontSize: 13, color: "#64748B", marginBottom: 4 }}>
            Total payé
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#10B981" }}>
            {totalPaye.toLocaleString()} {deviseSymbol}
          </div>
        </div>
        <div
          style={{
            background: "#FFF",
            borderRadius: 12,
            padding: 16,
            textAlign: "center",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ fontSize: 13, color: "#64748B", marginBottom: 4 }}>
            Reste à payer
          </div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: resteAPayer > 0 ? "#EF4444" : "#10B981",
            }}
          >
            {resteAPayer.toLocaleString()} {deviseSymbol}
          </div>
        </div>
      </div>

      {/* Mode d'ajout */}
      <div
        style={{
          display: "flex",
          gap: 0,
          borderBottom: "2px solid #E2E8F0",
          marginBottom: 24,
        }}
      >
        {[
          { id: "individuel", label: "Ajout individuel" },
          { id: "groupe", label: "Ajout groupé" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setMode(tab.id);
              setEditData(null);
            }}
            style={{
              padding: "12px 20px",
              border: "none",
              background: "transparent",
              color: mode === tab.id ? "#4F46E5" : "#64748B",
              fontWeight: mode === tab.id ? 600 : 400,
              borderBottom:
                mode === tab.id ? "3px solid #4F46E5" : "3px solid transparent",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Formulaire selon le mode */}
      {mode === "individuel" ? (
        <AddFraisIndividuel
          eleves={elevesFiltres}
          upsertFrais={upsertFrais}
          ecoleId={ecoleId}
          anneeId={anneeId}
          userId={user._id}
          initialData={editData}
          onSuccess={() => setEditData(null)}
          deviseSymbol={deviseSymbol}
        />
      ) : (
        <AddFraisGroupe
          eleves={elevesFiltres}
          upsertBulk={upsertBulk}
          ecoleId={ecoleId}
          anneeId={anneeId}
          userId={user._id}
          dark={dark}
          deviseSymbol={deviseSymbol}
        />
      )}

      {/* Import Excel */}
      <div
        style={{
          background: "#FFF",
          borderRadius: 16,
          padding: 24,
          margin: "24px 0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}
      >
        <h3
          style={{
            fontSize: 18,
            fontWeight: 600,
            marginBottom: 12,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Upload size={20} /> Importer des frais depuis Excel
        </h3>
        <input
          type="file"
          accept=".xlsx, .xls"
          onChange={handleImportFraisExcel}
          style={{ display: "none" }}
          ref={fraisFileInputRef}
        />
        <button
          onClick={() => fraisFileInputRef.current.click()}
          disabled={importing}
          style={{
            background: "#10B981",
            color: "white",
            border: "none",
            borderRadius: 10,
            padding: "10px 20px",
            fontWeight: 600,
            cursor: "pointer",
            fontSize: 14,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {importing ? <Loader size={16} className="animate-spin" /> : "📂"}
          {importing ? "Import en cours..." : "Sélectionner un fichier Excel"}
        </button>
        <p style={{ color: "#94A3B8", fontSize: 13, marginTop: 8 }}>
          Colonnes attendues :{" "}
          <strong>
            nom, postnom, classe, montantTotal, montantPaye, commentaire
          </strong>
          <br />
          Les montants doivent être en <strong>{deviseSymbol}</strong>.
        </p>
      </div>

      {/* Tableau des frais */}
      <DataTable
        columns={[
          {
            header: "Élève",
            accessor: "eleveNom",
            sortable: true,
            render: (f) => (
              <strong>
                {f.eleveNom} {f.elevePostnom}
              </strong>
            ),
          },
          { header: "Classe", accessor: "eleveClasse", sortable: true },
          {
            header: `Total (${deviseSymbol})`,
            accessor: "montantTotal",
            sortable: true,
            render: (f) => f.montantTotal.toLocaleString(),
          },
          {
            header: `Payé (${deviseSymbol})`,
            accessor: "montantPaye",
            sortable: true,
            render: (f) => f.montantPaye.toLocaleString(),
          },
          {
            header: `Reste (${deviseSymbol})`,
            accessor: "reste",
            sortable: true,
            render: (f) => (
              <span
                style={{
                  color: f.reste > 0 ? "#F59E0B" : "#10B981",
                  fontWeight: 600,
                }}
              >
                {f.reste.toLocaleString()}
              </span>
            ),
          },
          {
            header: "Commentaire",
            accessor: "commentaire",
            render: (f) => f.commentaire || "—",
          },
          {
            header: "Actions",
            sortable: false,
            render: (f) => (
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={() => {
                    setEditData(f);
                    setMode("individuel");
                  }}
                  style={{
                    background: "#4F46E5",
                    color: "white",
                    border: "none",
                    borderRadius: 6,
                    padding: "6px 12px",
                    cursor: "pointer",
                  }}
                  aria-label="Modifier"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => handleDelete(f._id)}
                  style={{
                    background: "#EF4444",
                    color: "white",
                    border: "none",
                    borderRadius: 6,
                    padding: "6px 12px",
                    cursor: "pointer",
                  }}
                  aria-label="Supprimer"
                  disabled={deleting}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ),
          },
        ]}
        data={enrichedFrais}
        loading={false}
        searchPlaceholder="Rechercher un élève..."
        pageSize={8}
        emptyTitle="Aucun frais"
        emptyMessage="Ajoutez des frais pour un élève."
      />
      <ConfirmDialog {...dialogProps} />
    </div>
  );
}

// --- Sous-composants (identiques aux versions précédentes, avec devise) ---
function AddFraisIndividuel({
  eleves,
  upsertFrais,
  ecoleId,
  anneeId,
  userId,
  initialData,
  onSuccess,
  deviseSymbol,
}) {
  const [selectedEleve, setSelectedEleve] = useState(initialData?.eleveId || "");
  const [montantTotal, setMontantTotal] = useState(initialData?.montantTotal?.toString() || "");
  const [montantPaye, setMontantPaye] = useState(initialData?.montantPaye?.toString() || "");
  const [commentaire, setCommentaire] = useState(initialData?.commentaire || "");
  const [editId, setEditId] = useState(initialData?._id || null);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setSelectedEleve("");
    setMontantTotal("");
    setMontantPaye("");
    setCommentaire("");
    setEditId(null);
    setErrors({});
    if (onSuccess) onSuccess();
  };

  const validate = () => {
    const err = {};
    if (!selectedEleve) err.selectedEleve = "Veuillez sélectionner un élève.";
    if (!montantTotal || isNaN(parseFloat(montantTotal))) err.montantTotal = "Montant invalide.";
    if (!montantPaye || isNaN(parseFloat(montantPaye))) err.montantPaye = "Montant invalide.";
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload = {
        eleveId: selectedEleve,
        ecoleId,
        montantTotal: parseFloat(montantTotal),
        montantPaye: parseFloat(montantPaye),
        commentaire: commentaire || undefined,
        anneeId,
        userId,
      };
      // N'ajouter id que s'il existe (modification)
      if (editId) {
        payload.id = editId;
      }
      await upsertFrais(payload);
      toast.success(editId ? "Frais mis à jour" : "Frais enregistrés");
      resetForm();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = (field) => ({
    width: "100%",
    padding: "10px 14px",
    border: `1px solid ${errors[field] ? "#EF4444" : "#E2E8F0"}`,
    borderRadius: 8,
    fontSize: 14,
    marginBottom: 16,
    outline: "none",
    background: "#F8FAFC",
  });

  return (
    <div style={{ background: "#FFF", borderRadius: 16, padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.05)", marginBottom: 24 }}>
      <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>
        {editId ? "Modifier les frais" : "Ajouter des frais"}
      </h3>
      <form onSubmit={handleSubmit}>
        <label style={{ display: "block", marginBottom: 6, fontWeight: 500 }}>Élève</label>
        <select
          value={selectedEleve}
          onChange={(e) => { setSelectedEleve(e.target.value); setErrors((prev) => ({ ...prev, selectedEleve: undefined })); }}
          disabled={!!editId}
          style={inputStyle("selectedEleve")}
        >
          <option value="">-- Choisir un élève --</option>
          {eleves.map((e) => (
            <option key={e._id} value={e._id}>{e.nom} {e.postnom} ({e.classe})</option>
          ))}
        </select>
        {errors.selectedEleve && <div style={{ color: "#EF4444", fontSize: 13, marginTop: -12, marginBottom: 12 }}>{errors.selectedEleve}</div>}

        <label style={{ display: "block", marginBottom: 6, fontWeight: 500 }}>Montant total ({deviseSymbol})</label>
        <input type="number" step="0.01" placeholder="Ex: 50000" value={montantTotal}
          onChange={(e) => { setMontantTotal(e.target.value); setErrors((prev) => ({ ...prev, montantTotal: undefined })); }}
          style={inputStyle("montantTotal")} />
        {errors.montantTotal && <div style={{ color: "#EF4444", fontSize: 13, marginTop: -12, marginBottom: 12 }}>{errors.montantTotal}</div>}

        <label style={{ display: "block", marginBottom: 6, fontWeight: 500 }}>Montant payé ({deviseSymbol})</label>
        <input type="number" step="0.01" placeholder="Ex: 20000" value={montantPaye}
          onChange={(e) => { setMontantPaye(e.target.value); setErrors((prev) => ({ ...prev, montantPaye: undefined })); }}
          style={inputStyle("montantPaye")} />
        {errors.montantPaye && <div style={{ color: "#EF4444", fontSize: 13, marginTop: -12, marginBottom: 12 }}>{errors.montantPaye}</div>}

        <label style={{ display: "block", marginBottom: 6, fontWeight: 500 }}>Commentaire (optionnel)</label>
        <input value={commentaire} onChange={(e) => setCommentaire(e.target.value)} placeholder="Ex: Frais de scolarité 2025"
          style={{ ...inputStyle(""), marginBottom: 20 }} />

        <div style={{ display: "flex", gap: 10 }}>
          <button type="submit" disabled={submitting} style={{
            background: submitting ? "#A5B4FC" : "#4F46E5", color: "white", border: "none",
            borderRadius: 10, padding: "10px 20px", fontWeight: 600, cursor: "pointer", flex: 1,
          }}>
            {submitting ? <Loader size={16} className="animate-spin" /> : null}
            {submitting ? "Enregistrement..." : editId ? "Mettre à jour" : "Ajouter"}
          </button>
          {editId && (
            <button type="button" onClick={resetForm} style={{ background: "#F1F5F9", border: "none", borderRadius: 10, padding: "10px 20px", cursor: "pointer" }}>
              Annuler
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

function AddFraisGroupe({
  eleves,
  upsertBulk,
  ecoleId,
  anneeId,
  userId,
  dark,
  deviseSymbol,
}) {
  const [selectedEleveIds, setSelectedEleveIds] = useState([]);
  const [bulkMontantTotal, setBulkMontantTotal] = useState("");
  const [bulkMontantPaye, setBulkMontantPaye] = useState("");
  const [bulkCommentaire, setBulkCommentaire] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const toggleEleve = (id) => setSelectedEleveIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const selectAll = () => setSelectedEleveIds(eleves.map((e) => e._id));
  const deselectAll = () => setSelectedEleveIds([]);

  const validate = () => {
    const err = {};
    if (selectedEleveIds.length === 0) err.selectedEleveIds = "Sélectionnez au moins un élève.";
    if (!bulkMontantTotal || isNaN(parseFloat(bulkMontantTotal))) err.bulkMontantTotal = "Montant invalide.";
    if (!bulkMontantPaye || isNaN(parseFloat(bulkMontantPaye))) err.bulkMontantPaye = "Montant invalide.";
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const nb = await upsertBulk({
        eleveIds: selectedEleveIds,
        ecoleId,
        montantTotal: parseFloat(bulkMontantTotal),
        montantPaye: parseFloat(bulkMontantPaye),
        commentaire: bulkCommentaire || undefined,
        anneeId,
        userId,
      });
      toast.success(`Frais mis à jour pour ${nb} élève(s).`);
      setSelectedEleveIds([]); setBulkMontantTotal(""); setBulkMontantPaye(""); setBulkCommentaire("");
      setErrors({});
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = (field) => ({
    width: "100%", padding: "10px 14px",
    border: `1px solid ${errors[field] ? "#EF4444" : "#E2E8F0"}`,
    borderRadius: 8, fontSize: 14, marginBottom: 16, outline: "none", background: "#F8FAFC",
  });

  return (
    <div style={{ background: "#FFF", borderRadius: 16, padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.05)", marginBottom: 24 }}>
      <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>Ajouter des frais groupés</h3>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontWeight: 500, fontSize: 14 }}>Élèves concernés</span>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={selectAll} style={{ background: "none", border: "none", color: "#4F46E5", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>Tout sélectionner</button>
          <button type="button" onClick={deselectAll} style={{ background: "none", border: "none", color: "#64748B", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>Désélectionner</button>
        </div>
      </div>

      <div style={{
        maxHeight: 220, overflowY: "auto", border: `1px solid ${errors.selectedEleveIds ? "#EF4444" : "#E2E8F0"}`,
        borderRadius: 12, padding: 8, marginBottom: 8, background: "#F8FAFC",
      }}>
        {eleves.map((e) => (
          <label key={e._id} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "6px 8px",
            fontSize: 14, cursor: "pointer", borderRadius: 6,
            background: selectedEleveIds.includes(e._id) ? (dark ? "#334155" : "#EEF2FF") : "transparent",
          }}>
            <input type="checkbox" checked={selectedEleveIds.includes(e._id)} onChange={() => toggleEleve(e._id)} style={{ width: 16, height: 16, accentColor: "#4F46E5" }} />
            {e.nom} {e.postnom} ({e.classe})
          </label>
        ))}
      </div>
      {errors.selectedEleveIds && <div style={{ color: "#EF4444", fontSize: 13, marginBottom: 12 }}>{errors.selectedEleveIds}</div>}
      <div style={{ fontSize: 13, color: "#64748B", marginBottom: 16 }}>{selectedEleveIds.length} élève(s) sélectionné(s)</div>

      <form onSubmit={handleSubmit}>
        <label style={{ display: "block", marginBottom: 6, fontWeight: 500 }}>Montant total ({deviseSymbol})</label>
        <input type="number" step="0.01" placeholder="Ex: 50000" value={bulkMontantTotal}
          onChange={(e) => { setBulkMontantTotal(e.target.value); setErrors((prev) => ({ ...prev, bulkMontantTotal: undefined })); }}
          style={inputStyle("bulkMontantTotal")} />
        {errors.bulkMontantTotal && <div style={{ color: "#EF4444", fontSize: 13, marginTop: -12, marginBottom: 12 }}>{errors.bulkMontantTotal}</div>}

        <label style={{ display: "block", marginBottom: 6, fontWeight: 500 }}>Montant payé ({deviseSymbol})</label>
        <input type="number" step="0.01" placeholder="Ex: 20000" value={bulkMontantPaye}
          onChange={(e) => { setBulkMontantPaye(e.target.value); setErrors((prev) => ({ ...prev, bulkMontantPaye: undefined })); }}
          style={inputStyle("bulkMontantPaye")} />
        {errors.bulkMontantPaye && <div style={{ color: "#EF4444", fontSize: 13, marginTop: -12, marginBottom: 12 }}>{errors.bulkMontantPaye}</div>}

        <label style={{ display: "block", marginBottom: 6, fontWeight: 500 }}>Commentaire (optionnel)</label>
        <input value={bulkCommentaire} onChange={(e) => setBulkCommentaire(e.target.value)} placeholder="Ex: Frais de scolarité 2025"
          style={{ ...inputStyle(""), marginBottom: 20 }} />

        <button type="submit" disabled={submitting} style={{
          width: "100%", background: submitting ? "#A5B4FC" : "#4F46E5", color: "white",
          border: "none", borderRadius: 10, padding: "12px 0", fontWeight: 600,
          cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          {submitting ? <Loader size={16} className="animate-spin" /> : null}
          {submitting ? "Application en cours..." : `Appliquer à ${selectedEleveIds.length} élève(s)`}
        </button>
      </form>
    </div>
  );
}