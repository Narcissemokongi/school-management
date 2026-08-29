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
  Loader, DollarSign, Upload, Trash2, Edit2, School,
  Download, FileSpreadsheet, CheckCircle, Clock, Search,
  Settings, Users, ChevronDown, ChevronUp, FileWarning, // ✅ Ajoutez FileWarning
} from "lucide-react";
import { trierEleves } from "../utils/tri";

export function GestionFrais({ ecoleId, eleves, anneeId, anneeActive, user }) {
  const { dark } = useStyles();
  const { confirm, dialogProps } = useConfirm();

  const ecole = useQuery(api.ecoles.get, ecoleId ? { ecoleId } : "skip");
  const devise = ecole?.devise || "CDF";
  const deviseSymbol = devise === "USD" ? "$" : "FC";

  // Requêtes pour les frais de classe
  const fraisClasses = useQuery(api.frais.listFraisClasses, ecoleId ? { ecoleId, anneeId } : "skip") ?? [];
  const upsertFraisClasse = useMutation(api.frais.upsertFraisClasse);

  const [mode, setMode] = useState("individuel");
  const [editData, setEditData] = useState(null);
  const [classeActive, setClasseActive] = useState("");
  const [statutFiltre, setStatutFiltre] = useState("tous");
  const [deleting, setDeleting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [showConfig, setShowConfig] = useState(false);
  const [configClasse, setConfigClasse] = useState("");
  const [configMontant, setConfigMontant] = useState("");

  const frais = useQuery(api.frais.listByEcole, anneeId ? { ecoleId, anneeId } : { ecoleId }) ?? [];
  const upsertFrais = useMutation(api.frais.upsert);
  const upsertBulk = useMutation(api.frais.upsertBulk);
  const removeFrais = useMutation(api.frais.remove);
  const fraisFileInputRef = useRef(null);

  // Classes uniques avec montants fixes
  const classesStats = useMemo(() => {
    const map = {};
    eleves.forEach((e) => {
      if (!map[e.classe]) {
        const fraisClasse = fraisClasses.find((fc) => fc.classe === e.classe);
        map[e.classe] = {
          nom: e.classe,
          nbEleves: 0,
          montantTotal: fraisClasse?.montantTotal || 0,
        };
      }
      map[e.classe].nbEleves++;
    });
    return Object.values(map).sort((a, b) =>
      a.nom.localeCompare(b.nom, undefined, { numeric: true, sensitivity: "base" })
    );
  }, [eleves, fraisClasses]);

  const elevesFiltres = useMemo(() => {
    const list = classeActive ? eleves.filter((e) => e.classe === classeActive) : eleves;
    return [...list].sort(trierEleves);
  }, [eleves, classeActive]);

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

  const fraisFinaux = useMemo(() => {
    if (statutFiltre === "tous") return fraisFiltres;
    return fraisFiltres.filter((f) => {
      const reste = f.montantTotal - f.montantPaye;
      if (statutFiltre === "paye") return reste <= 0;
      if (statutFiltre === "en_attente") return reste > 0;
      return true;
    });
  }, [fraisFiltres, statutFiltre]);

  const totalFrais = fraisFinaux.reduce((sum, f) => sum + f.montantTotal, 0);
  const totalPaye = fraisFinaux.reduce((sum, f) => sum + f.montantPaye, 0);
  const resteAPayer = totalFrais - totalPaye;
  const nbFrais = fraisFinaux.length;
  const nbPayes = fraisFinaux.filter((f) => f.montantTotal - f.montantPaye <= 0).length;
  const nbAttente = nbFrais - nbPayes;

  // Suppression
  const handleDelete = async (id) => {
    const ok = await confirm("Supprimer ces frais", "Voulez-vous vraiment supprimer ces frais ?");
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
        if (nomIdx === -1 || postnomIdx === -1 || classeIdx === -1 || totalIdx === -1 || payeIdx === -1) {
          toast.error("Colonnes requises : nom, postnom, classe, montantTotal, montantPaye");
          return;
        }
        let count = 0;
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row[nomIdx] || !row[postnomIdx] || !row[classeIdx] || row[totalIdx] == null || row[payeIdx] == null) continue;
          const nom = row[nomIdx].toString().trim();
          const postnom = row[postnomIdx].toString().trim();
          const classe = row[classeIdx].toString().trim();
          const eleve = eleves.find((e) => e.nom === nom && e.postnom === postnom && e.classe === classe);
          if (!eleve) continue;
          await upsertFrais({
            eleveId: eleve._id,
            ecoleId,
            montantTotal: parseFloat(row[totalIdx]),
            montantPaye: parseFloat(row[payeIdx]),
            commentaire: commentaireIdx !== -1 ? row[commentaireIdx]?.toString().trim() : undefined,
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

  // Export Excel
  const handleExportExcel = () => {
    if (fraisFinaux.length === 0) {
      toast.error("Aucune donnée à exporter.");
      return;
    }
    setExporting(true);
    try {
      const dataExport = fraisFinaux.map((f) => {
        const eleve = eleves.find((e) => e._id === f.eleveId);
        return {
          Nom: eleve?.nom ?? "",
          Postnom: eleve?.postnom ?? "",
          Classe: eleve?.classe ?? "",
          MontantTotal: f.montantTotal,
          MontantPaye: f.montantPaye,
          Reste: f.montantTotal - f.montantPaye,
          Commentaire: f.commentaire ?? "",
        };
      });
      const worksheet = XLSX.utils.json_to_sheet(dataExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Frais");
      XLSX.writeFile(workbook, `frais_${classeActive || "toutes_classes"}.xlsx`);
      toast.success("Export Excel réussi.");
    } catch (err) {
      toast.error("Erreur lors de l'export.");
    } finally {
      setExporting(false);
    }
  };

  // Télécharger modèle
  const handleDownloadTemplate = () => {
    const template = [
      ["nom", "postnom", "classe", "montantTotal", "montantPaye", "commentaire"],
      ["Jean", "Dupont", "6ème A", 50000, 20000, "Frais de scolarité"],
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(template);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Modèle");
    XLSX.writeFile(workbook, "modele_import_frais.xlsx");
  };

  // Enregistrer frais de classe
  const handleSaveFraisClasse = async (e) => {
    e.preventDefault();
    if (!configClasse || !configMontant) {
      toast.error("Veuillez sélectionner une classe et saisir un montant.");
      return;
    }
    try {
      await upsertFraisClasse({
        classe: configClasse,
        montantTotal: parseFloat(configMontant),
        ecoleId,
        anneeId: anneeId || undefined,
      });
      toast.success(`Montant fixé pour la classe ${configClasse}`);
      setShowConfig(false);
      setConfigClasse("");
      setConfigMontant("");
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (!anneeId) {
    return (
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px", textAlign: "center" }}>
        <DollarSign size={48} color="#F59E0B" style={{ marginBottom: 16 }} />
        <h2 style={{ fontSize: 24, fontWeight: 600, color: dark ? "#F1F5F9" : "#1E293B", margin: "0 0 8px" }}>
          Aucune année scolaire active
        </h2>
        <p style={{ color: dark ? "#94A3B8" : "#64748B", fontSize: 14 }}>
          Veuillez activer une année scolaire.
        </p>
      </div>
    );
  }

  const enrichedFrais = fraisFinaux.map((f) => {
    const eleve = eleves.find((e) => e._id === f.eleveId);
    const reste = f.montantTotal - f.montantPaye;
    return {
      ...f,
      eleveNom: eleve?.nom ?? "—",
      elevePostnom: eleve?.postnom ?? "",
      eleveClasse: eleve?.classe ?? "—",
      reste,
      estPaye: reste <= 0,
    };
  });

  // Couleurs adaptatives
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const inputBg = dark ? "#0F172A" : "#F9FAFB";
  const inputText = dark ? "#F1F5F9" : "#1E293B";
  const accent = dark ? "#818CF8" : "#4F46E5";
  const badgePayeBg = dark ? "#064E3B" : "#D1FAE5";
  const badgePayeText = dark ? "#34D399" : "#065F46";
  const badgeAttenteBg = dark ? "#78350F" : "#FEF3C7";
  const badgeAttenteText = dark ? "#FBBF24" : "#92400E";
  const filterActiveBg = dark ? "#312E81" : "#EEF2FF";
  const filterActiveText = dark ? "#A5B4FC" : "#4F46E5";

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 16px" }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .animate-spin { animation: spin 1s linear infinite; }`}</style>

      {/* En-tête */}
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: 28, fontWeight: 700, color: textPrimary, margin: 0 }}>
            Gestion des frais ({deviseSymbol})
          </h2>
          <p style={{ color: textSecondary, marginTop: 4, fontSize: 14 }}>
            {frais.length} élève(s) avec des frais {anneeActive ? `· ${anneeActive.nom}` : ""}
          </p>
        </div>
        <button
          onClick={() => setShowConfig(true)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "10px 16px", background: dark ? "#334155" : "#F1F5F9",
            color: dark ? "#F1F5F9" : "#1E293B", border: "none",
            borderRadius: 12, fontWeight: 500, cursor: "pointer",
          }}
        >
          <Settings size={18} /> Frais par classe
        </button>
      </div>

      {/* Filtres */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 24, alignItems: "center" }}>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", whiteSpace: "nowrap", borderBottom: `2px solid ${cardBorder}`, paddingBottom: 8, flex: 1 }}>
          <button
            onClick={() => setClasseActive("")}
            style={{
              padding: "8px 16px", border: "none", borderRadius: 20,
              background: classeActive === "" ? accent : "transparent",
              color: classeActive === "" ? "#FFFFFF" : textSecondary,
              fontWeight: classeActive === "" ? 600 : 400, fontSize: 13,
              cursor: "pointer", transition: "all 0.2s", whiteSpace: "nowrap",
              display: "flex", alignItems: "center", gap: 6,
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
                padding: "8px 16px", border: "none", borderRadius: 20,
                background: classeActive === c.nom ? accent : "transparent",
                color: classeActive === c.nom ? "#FFFFFF" : textSecondary,
                fontWeight: classeActive === c.nom ? 600 : 400, fontSize: 13,
                cursor: "pointer", transition: "all 0.2s", whiteSpace: "nowrap",
              }}
            >
              {c.nom} ({c.nbEleves})
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          {[
            { id: "tous", label: "Tous" },
            { id: "paye", label: "Payé" },
            { id: "en_attente", label: "En attente" },
          ].map((filtre) => (
            <button
              key={filtre.id}
              onClick={() => setStatutFiltre(filtre.id)}
              style={{
                padding: "6px 14px",
                border: `1px solid ${cardBorder}`,
                borderRadius: 20,
                background: statutFiltre === filtre.id ? filterActiveBg : "transparent",
                color: statutFiltre === filtre.id ? filterActiveText : textSecondary,
                fontWeight: statutFiltre === filtre.id ? 600 : 400,
                fontSize: 13,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {filtre.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cartes statistiques */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 24 }}>
        <StatCard icon={<DollarSign size={20} />} label="Total dû" value={`${totalFrais.toLocaleString()} ${deviseSymbol}`} color="#4F46E5" dark={dark} />
        <StatCard icon={<CheckCircle size={20} />} label="Total payé" value={`${totalPaye.toLocaleString()} ${deviseSymbol}`} color="#10B981" dark={dark} />
        <StatCard icon={<FileWarning size={20} />} label="Reste à payer" value={`${resteAPayer.toLocaleString()} ${deviseSymbol}`} color="#F59E0B" dark={dark} />
        <StatCard icon={<Users size={20} />} label="Élèves payés" value={nbPayes} color="#10B981" dark={dark} />
        <StatCard icon={<Clock size={20} />} label="En attente" value={nbAttente} color="#F59E0B" dark={dark} />
      </div>

      {/* Sous-onglets mode ajout */}
      <div style={{ display: "flex", gap: 0, borderBottom: `2px solid ${cardBorder}`, marginBottom: 24 }}>
        <button
          onClick={() => { setMode("individuel"); setEditData(null); }}
          style={{
            padding: "12px 20px", border: "none", background: "transparent",
            color: mode === "individuel" ? accent : textSecondary,
            fontWeight: mode === "individuel" ? 600 : 400,
            borderBottom: mode === "individuel" ? `3px solid ${accent}` : "3px solid transparent",
            cursor: "pointer", transition: "all 0.2s",
            display: "flex", alignItems: "center", gap: 6,
          }}
        >
          <Users size={18} /> Ajout individuel
        </button>
        <button
          onClick={() => { setMode("groupe"); setEditData(null); }}
          style={{
            padding: "12px 20px", border: "none", background: "transparent",
            color: mode === "groupe" ? accent : textSecondary,
            fontWeight: mode === "groupe" ? 600 : 400,
            borderBottom: mode === "groupe" ? `3px solid ${accent}` : "3px solid transparent",
            cursor: "pointer", transition: "all 0.2s",
            display: "flex", alignItems: "center", gap: 6,
          }}
        >
          <School size={18} /> Ajout groupé
        </button>
      </div>

      {/* Formulaire selon le mode */}
      {mode === "individuel" ? (
        <AddFraisIndividuel
          eleves={elevesFiltres}
          fraisClasses={fraisClasses}
          upsertFrais={upsertFrais}
          ecoleId={ecoleId}
          anneeId={anneeId}
          userId={user._id}
          initialData={editData}
          onSuccess={() => setEditData(null)}
          deviseSymbol={deviseSymbol}
          dark={dark}
        />
      ) : (
        <AddFraisGroupe
          eleves={elevesFiltres}
          fraisClasses={fraisClasses}
          upsertBulk={upsertBulk}
          ecoleId={ecoleId}
          anneeId={anneeId}
          userId={user._id}
          dark={dark}
          deviseSymbol={deviseSymbol}
        />
      )}

      {/* Import Excel */}
      <div style={{ background: cardBg, borderRadius: 16, padding: 24, margin: "24px 0", boxShadow: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)", border: `1px solid ${cardBorder}` }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12, display: "flex", alignItems: "center", gap: 8, color: textPrimary }}>
          <Upload size={20} /> Importer des frais depuis Excel
        </h3>
        <input type="file" accept=".xlsx, .xls" onChange={handleImportFraisExcel} style={{ display: "none" }} ref={fraisFileInputRef} />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => fraisFileInputRef.current.click()} disabled={importing} style={{ background: dark ? "#34D399" : "#10B981", color: "white", border: "none", borderRadius: 10, padding: "10px 20px", fontWeight: 600, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
            {importing ? <Loader size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />}
            {importing ? "Import en cours..." : "Sélectionner un fichier Excel"}
          </button>
          <button onClick={handleDownloadTemplate} style={{ background: dark ? "#334155" : "#F1F5F9", color: textPrimary, border: "none", borderRadius: 10, padding: "10px 20px", fontWeight: 600, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
            <Download size={16} />
            Télécharger le modèle
          </button>
        </div>
        <p style={{ color: textSecondary, fontSize: 13, marginTop: 8 }}>
          Colonnes attendues : <strong>nom, postnom, classe, montantTotal, montantPaye, commentaire</strong>
          <br />
          Les montants doivent être en <strong>{deviseSymbol}</strong>.
        </p>
      </div>

      {/* Tableau des frais */}
      <DataTable
        columns={[
          { header: "Élève", accessor: "eleveNom", sortable: true, render: (f) => <strong>{f.eleveNom} {f.elevePostnom}</strong> },
          { header: "Classe", accessor: "eleveClasse", sortable: true },
          { header: `Total (${deviseSymbol})`, accessor: "montantTotal", sortable: true, render: (f) => f.montantTotal.toLocaleString() },
          { header: `Payé (${deviseSymbol})`, accessor: "montantPaye", sortable: true, render: (f) => f.montantPaye.toLocaleString() },
          { header: `Reste (${deviseSymbol})`, accessor: "reste", sortable: true, render: (f) => <span style={{ color: f.reste > 0 ? (dark ? "#FBBF24" : "#F59E0B") : (dark ? "#34D399" : "#10B981"), fontWeight: 600 }}>{f.reste.toLocaleString()}</span> },
          { header: "Statut", accessor: "estPaye", sortable: true, render: (f) => f.estPaye ? <BadgePaye /> : <BadgeAttente /> },
          { header: "Commentaire", accessor: "commentaire", render: (f) => f.commentaire || "—" },
          {
            header: "Actions", sortable: false, render: (f) => (
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => { setEditData(f); setMode("individuel"); }} style={{ background: accent, color: "white", border: "none", borderRadius: 6, padding: "6px 12px", cursor: "pointer" }}><Edit2 size={16} /></button>
                <button onClick={() => handleDelete(f._id)} style={{ background: "#EF4444", color: "white", border: "none", borderRadius: 6, padding: "6px 12px", cursor: "pointer" }}><Trash2 size={16} /></button>
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

      {/* Bouton Export Excel */}
      <div style={{ marginTop: 16, textAlign: "right" }}>
        <button onClick={handleExportExcel} disabled={exporting} style={{ background: accent, color: "white", border: "none", borderRadius: 10, padding: "10px 20px", fontWeight: 600, cursor: "pointer", fontSize: 14, display: "inline-flex", alignItems: "center", gap: 8 }}>
          {exporting ? <Loader size={16} className="animate-spin" /> : <Download size={16} />}
          {exporting ? "Export en cours..." : "Exporter en Excel"}
        </button>
      </div>

      {/* Modale configuration frais de classe */}
      {showConfig && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setShowConfig(false)}>
          <div style={{ background: dark ? "#1E293B" : "#FFFFFF", borderRadius: 16, padding: 24, maxWidth: 400, width: "90%", boxShadow: dark ? "0 20px 40px rgba(0,0,0,0.5)" : "0 20px 40px rgba(0,0,0,0.2)", border: `1px solid ${dark ? "#334155" : "#E2E8F0"}` }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 20, color: textPrimary }}>Configurer les frais de classe</h3>
            <form onSubmit={handleSaveFraisClasse}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", marginBottom: 4, fontWeight: 500, fontSize: 14, color: textSecondary }}>Classe</label>
                <select value={configClasse} onChange={(e) => setConfigClasse(e.target.value)} style={{ width: "100%", padding: "10px 14px", border: `1px solid ${cardBorder}`, borderRadius: 8, fontSize: 14, background: inputBg, color: inputText }}>
                  <option value="">Sélectionner une classe</option>
                  {classesStats.map((c) => (
                    <option key={c.nom} value={c.nom} style={{ background: dark ? "#1E293B" : "#FFF" }}>{c.nom} (actuel : {c.montantTotal.toLocaleString()} {deviseSymbol})</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", marginBottom: 4, fontWeight: 500, fontSize: 14, color: textSecondary }}>Montant total ({deviseSymbol})</label>
                <input type="number" step="0.01" value={configMontant} onChange={(e) => setConfigMontant(e.target.value)} placeholder="Ex: 50000" style={{ width: "100%", padding: "10px 14px", border: `1px solid ${cardBorder}`, borderRadius: 8, fontSize: 14, background: inputBg, color: inputText }} />
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
                <button type="submit" style={{ background: accent, color: "white", border: "none", borderRadius: 8, padding: "10px 20px", fontWeight: 600, cursor: "pointer" }}>Enregistrer</button>
                <button type="button" onClick={() => setShowConfig(false)} style={{ background: dark ? "#334155" : "#F1F5F9", color: textPrimary, border: "none", borderRadius: 8, padding: "10px 20px", fontWeight: 500, cursor: "pointer" }}>Annuler</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog {...dialogProps} />
    </div>
  );
}

// --- Sous-composants ---

function StatCard({ icon, label, value, color, dark }) {
  return (
    <div style={{ background: dark ? "#1E293B" : "#FFFFFF", borderRadius: 12, padding: 16, display: "flex", alignItems: "center", gap: 12, boxShadow: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)", border: `1px solid ${dark ? "#334155" : "#E2E8F0"}` }}>
      <div style={{ width: 40, height: 40, background: `${color}${dark ? "33" : "15"}`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color }}>{icon}</div>
      <div>
        <div style={{ fontSize: 14, color: dark ? "#94A3B8" : "#64748B" }}>{label}</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: dark ? "#F1F5F9" : "#1E293B" }}>{value}</div>
      </div>
    </div>
  );
}

function AddFraisIndividuel({ eleves, fraisClasses, upsertFrais, ecoleId, anneeId, userId, initialData, onSuccess, deviseSymbol, dark }) {
  const [selectedEleve, setSelectedEleve] = useState(initialData?.eleveId || "");
  const [montantPaye, setMontantPaye] = useState(initialData?.montantPaye?.toString() || "");
  const [commentaire, setCommentaire] = useState(initialData?.commentaire || "");
  const [editId, setEditId] = useState(initialData?._id || null);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [searchEleve, setSearchEleve] = useState("");

  const elevesFiltresRecherche = useMemo(() => {
    if (!searchEleve.trim()) return eleves;
    const q = searchEleve.toLowerCase();
    return eleves.filter((e) => `${e.nom} ${e.postnom} ${e.prenom}`.toLowerCase().includes(q) || e.classe.toLowerCase().includes(q));
  }, [eleves, searchEleve]);

  const montantTotal = useMemo(() => {
    if (!selectedEleve) return "";
    const eleve = eleves.find((e) => e._id === selectedEleve);
    if (!eleve) return "";
    const fraisClasse = fraisClasses.find((fc) => fc.classe === eleve.classe);
    return fraisClasse?.montantTotal?.toString() || "";
  }, [selectedEleve, eleves, fraisClasses]);

  const handleSelectEleve = (id) => {
    setSelectedEleve(id);
    setSearchEleve("");
    setMontantPaye("");
    setErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEleve) {
      setErrors({ selectedEleve: "Veuillez sélectionner un élève." });
      return;
    }
    if (!montantPaye || isNaN(parseFloat(montantPaye))) {
      setErrors({ montantPaye: "Montant invalide." });
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        eleveId: selectedEleve,
        ecoleId,
        montantTotal: parseFloat(montantTotal || "0"),
        montantPaye: parseFloat(montantPaye),
        commentaire: commentaire || undefined,
        anneeId,
        userId,
      };
      if (editId) payload.id = editId;
      await upsertFrais(payload);
      toast.success(editId ? "Frais mis à jour" : "Frais enregistrés");
      setSelectedEleve("");
      setMontantPaye("");
      setCommentaire("");
      setEditId(null);
      setErrors({});
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ background: dark ? "#1E293B" : "#FFFFFF", borderRadius: 16, padding: 24, marginBottom: 24, border: `1px solid ${dark ? "#334155" : "#E2E8F0"}` }}>
      <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20, color: dark ? "#F1F5F9" : "#1E293B" }}>
        {editId ? "Modifier les frais" : "Ajouter des frais"}
      </h3>
      <form onSubmit={handleSubmit}>
        <label style={{ display: "block", marginBottom: 6, fontWeight: 500, color: dark ? "#CBD5E1" : "#374151" }}>Élève</label>
        {!selectedEleve ? (
          <div style={{ marginBottom: 16 }}>
            <div style={{ position: "relative" }}>
              <Search size={18} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: dark ? "#94A3B8" : "#64748B" }} />
              <input
                type="text"
                placeholder="Rechercher par nom ou classe..."
                value={searchEleve}
                onChange={(e) => setSearchEleve(e.target.value)}
                style={{ width: "100%", padding: "10px 14px 10px 34px", border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`, borderRadius: 8, fontSize: 14, background: dark ? "#0F172A" : "#F8FAFC", color: dark ? "#F1F5F9" : "#1E293B" }}
              />
            </div>
            {searchEleve.trim() && (
              <div style={{ maxHeight: 200, overflowY: "auto", marginTop: 8, border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`, borderRadius: 8, background: dark ? "#1E293B" : "#FFFFFF" }}>
                {elevesFiltresRecherche.slice(0, 20).map((e) => (
                  <button
                    key={e._id}
                    type="button"
                    onClick={() => handleSelectEleve(e._id)}
                    style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 12px", border: "none", background: "transparent", color: dark ? "#F1F5F9" : "#1E293B", cursor: "pointer", borderBottom: `1px solid ${dark ? "#334155" : "#E2E8F0"}` }}
                  >
                    {e.nom} {e.postnom} {e.prenom} <span style={{ color: dark ? "#94A3B8" : "#64748B" }}>({e.classe})</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ flex: 1, padding: "10px 14px", border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`, borderRadius: 8, background: dark ? "#0F172A" : "#F8FAFC", color: dark ? "#F1F5F9" : "#1E293B" }}>
              {eleves.find((e) => e._id === selectedEleve)?.nom} {eleves.find((e) => e._id === selectedEleve)?.postnom} {eleves.find((e) => e._id === selectedEleve)?.prenom}
            </div>
            <button type="button" onClick={() => { setSelectedEleve(""); setSearchEleve(""); }} style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer" }}>Changer</button>
          </div>
        )}

        <label style={{ display: "block", marginBottom: 6, fontWeight: 500, color: dark ? "#CBD5E1" : "#374151" }}>Montant total ({deviseSymbol})</label>
        <input type="text" value={montantTotal ? parseFloat(montantTotal).toLocaleString() : "Non défini"} readOnly style={{ width: "100%", padding: "10px 14px", border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`, borderRadius: 8, fontSize: 14, marginBottom: 16, background: dark ? "#0F172A" : "#F8FAFC", color: dark ? "#F1F5F9" : "#1E293B", opacity: 0.7 }} />

        <label style={{ display: "block", marginBottom: 6, fontWeight: 500, color: dark ? "#CBD5E1" : "#374151" }}>Montant payé ({deviseSymbol})</label>
        <input type="number" step="0.01" placeholder="Ex: 20000" value={montantPaye} onChange={(e) => { setMontantPaye(e.target.value); setErrors((prev) => ({ ...prev, montantPaye: undefined })); }} style={{ width: "100%", padding: "10px 14px", border: `1px solid ${errors.montantPaye ? "#EF4444" : dark ? "#334155" : "#E2E8F0"}`, borderRadius: 8, fontSize: 14, marginBottom: 16, background: dark ? "#0F172A" : "#F8FAFC", color: dark ? "#F1F5F9" : "#1E293B" }} />
        {errors.montantPaye && <div style={{ color: "#EF4444", fontSize: 12, marginTop: -12, marginBottom: 12 }}>{errors.montantPaye}</div>}

        <label style={{ display: "block", marginBottom: 6, fontWeight: 500, color: dark ? "#CBD5E1" : "#374151" }}>Commentaire (optionnel)</label>
        <input value={commentaire} onChange={(e) => setCommentaire(e.target.value)} placeholder="Ex: Frais de scolarité" style={{ width: "100%", padding: "10px 14px", border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`, borderRadius: 8, fontSize: 14, marginBottom: 20, background: dark ? "#0F172A" : "#F8FAFC", color: dark ? "#F1F5F9" : "#1E293B" }} />

        <div style={{ display: "flex", gap: 10 }}>
          <button type="submit" disabled={submitting} style={{ background: dark ? "#818CF8" : "#4F46E5", color: "white", border: "none", borderRadius: 10, padding: "10px 20px", fontWeight: 600, cursor: "pointer", flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {submitting ? <Loader size={16} className="animate-spin" /> : null}
            {submitting ? "Enregistrement..." : editId ? "Mettre à jour" : "Ajouter"}
          </button>
          {editId && (
            <button type="button" onClick={() => { setEditId(null); setSelectedEleve(""); setMontantPaye(""); setCommentaire(""); setErrors({}); if (onSuccess) onSuccess(); }} style={{ background: dark ? "#334155" : "#F1F5F9", border: "none", borderRadius: 10, padding: "10px 20px", cursor: "pointer", color: dark ? "#F1F5F9" : "#1E293B" }}>
              Annuler
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

function AddFraisGroupe({ eleves, fraisClasses, upsertBulk, ecoleId, anneeId, userId, dark, deviseSymbol }) {
  const [selectedEleveIds, setSelectedEleveIds] = useState([]);
  const [montantPaye, setMontantPaye] = useState("");
  const [commentaire, setCommentaire] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [searchEleve, setSearchEleve] = useState("");

  const elevesFiltresRecherche = useMemo(() => {
    if (!searchEleve.trim()) return eleves;
    const q = searchEleve.toLowerCase();
    return eleves.filter((e) => `${e.nom} ${e.postnom} ${e.prenom}`.toLowerCase().includes(q) || e.classe.toLowerCase().includes(q));
  }, [eleves, searchEleve]);

  const toggleEleve = (id) => setSelectedEleveIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const selectAll = () => setSelectedEleveIds(elevesFiltresRecherche.map((e) => e._id));
  const deselectAll = () => setSelectedEleveIds([]);

  const montantTotalMoyen = useMemo(() => {
    if (selectedEleveIds.length === 0) return 0;
    const elevesSelectionnes = eleves.filter((e) => selectedEleveIds.includes(e._id));
    const classesUniques = new Set(elevesSelectionnes.map((e) => e.classe));
    if (classesUniques.size !== 1) return null;
    const classe = [...classesUniques][0];
    const fraisClasse = fraisClasses.find((fc) => fc.classe === classe);
    return fraisClasse?.montantTotal || 0;
  }, [selectedEleveIds, eleves, fraisClasses]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedEleveIds.length === 0) {
      setErrors({ selectedEleveIds: "Sélectionnez au moins un élève." });
      return;
    }
    if (!montantPaye || isNaN(parseFloat(montantPaye))) {
      setErrors({ montantPaye: "Montant invalide." });
      return;
    }
    if (montantTotalMoyen === null) {
      toast.error("Les élèves sélectionnés appartiennent à des classes différentes avec des montants différents.");
      return;
    }
    setSubmitting(true);
    try {
      const nb = await upsertBulk({
        eleveIds: selectedEleveIds,
        ecoleId,
        montantTotal: montantTotalMoyen,
        montantPaye: parseFloat(montantPaye),
        commentaire: commentaire || undefined,
        anneeId,
        userId,
      });
      toast.success(`Frais mis à jour pour ${nb} élève(s).`);
      setSelectedEleveIds([]);
      setMontantPaye("");
      setCommentaire("");
      setErrors({});
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ background: dark ? "#1E293B" : "#FFFFFF", borderRadius: 16, padding: 24, marginBottom: 24, border: `1px solid ${dark ? "#334155" : "#E2E8F0"}` }}>
      <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20, color: dark ? "#F1F5F9" : "#1E293B" }}>Ajouter des frais groupés</h3>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontWeight: 500, fontSize: 14, color: dark ? "#CBD5E1" : "#374151" }}>Élèves concernés</span>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={selectAll} style={{ background: "none", border: "none", color: dark ? "#818CF8" : "#4F46E5", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>Tout sélectionner</button>
          <button type="button" onClick={deselectAll} style={{ background: "none", border: "none", color: dark ? "#94A3B8" : "#64748B", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>Désélectionner</button>
        </div>
      </div>

      <div style={{ position: "relative", marginBottom: 8 }}>
        <Search size={18} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: dark ? "#94A3B8" : "#64748B" }} />
        <input
          type="text"
          placeholder="Rechercher un élève..."
          value={searchEleve}
          onChange={(e) => setSearchEleve(e.target.value)}
          style={{ width: "100%", padding: "10px 14px 10px 34px", border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`, borderRadius: 8, fontSize: 14, background: dark ? "#0F172A" : "#F8FAFC", color: dark ? "#F1F5F9" : "#1E293B" }}
        />
      </div>

      <div style={{ maxHeight: 220, overflowY: "auto", border: `1px solid ${errors.selectedEleveIds ? "#EF4444" : dark ? "#334155" : "#E2E8F0"}`, borderRadius: 12, padding: 8, marginBottom: 8, background: dark ? "#0F172A" : "#F8FAFC" }}>
        {elevesFiltresRecherche.map((e) => (
          <label key={e._id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", fontSize: 14, cursor: "pointer", borderRadius: 6, background: selectedEleveIds.includes(e._id) ? (dark ? "#312E81" : "#EEF2FF") : "transparent", color: dark ? "#F1F5F9" : "#1E293B" }}>
            <input type="checkbox" checked={selectedEleveIds.includes(e._id)} onChange={() => toggleEleve(e._id)} style={{ width: 16, height: 16, accentColor: dark ? "#818CF8" : "#4F46E5" }} />
            {e.nom} {e.postnom} {e.prenom} ({e.classe})
          </label>
        ))}
      </div>
      {errors.selectedEleveIds && <div style={{ color: "#EF4444", fontSize: 13, marginBottom: 12 }}>{errors.selectedEleveIds}</div>}
      <div style={{ fontSize: 13, color: dark ? "#94A3B8" : "#64748B", marginBottom: 16 }}>{selectedEleveIds.length} élève(s) sélectionné(s)</div>

      <form onSubmit={handleSubmit}>
        <label style={{ display: "block", marginBottom: 6, fontWeight: 500, color: dark ? "#CBD5E1" : "#374151" }}>Montant total ({deviseSymbol})</label>
        <input type="text" value={montantTotalMoyen !== null && montantTotalMoyen !== 0 ? montantTotalMoyen.toLocaleString() : (selectedEleveIds.length > 0 ? "Classes multiples" : "Sélectionnez des élèves")} readOnly style={{ width: "100%", padding: "10px 14px", border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`, borderRadius: 8, fontSize: 14, marginBottom: 16, background: dark ? "#0F172A" : "#F8FAFC", color: dark ? "#F1F5F9" : "#1E293B", opacity: 0.7 }} />

        <label style={{ display: "block", marginBottom: 6, fontWeight: 500, color: dark ? "#CBD5E1" : "#374151" }}>Montant payé ({deviseSymbol})</label>
        <input type="number" step="0.01" placeholder="Ex: 20000" value={montantPaye} onChange={(e) => { setMontantPaye(e.target.value); setErrors((prev) => ({ ...prev, montantPaye: undefined })); }} style={{ width: "100%", padding: "10px 14px", border: `1px solid ${errors.montantPaye ? "#EF4444" : dark ? "#334155" : "#E2E8F0"}`, borderRadius: 8, fontSize: 14, marginBottom: 16, background: dark ? "#0F172A" : "#F8FAFC", color: dark ? "#F1F5F9" : "#1E293B" }} />
        {errors.montantPaye && <div style={{ color: "#EF4444", fontSize: 13, marginTop: -12, marginBottom: 12 }}>{errors.montantPaye}</div>}

        <label style={{ display: "block", marginBottom: 6, fontWeight: 500, color: dark ? "#CBD5E1" : "#374151" }}>Commentaire (optionnel)</label>
        <input value={commentaire} onChange={(e) => setCommentaire(e.target.value)} placeholder="Ex: Frais de scolarité" style={{ width: "100%", padding: "10px 14px", border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`, borderRadius: 8, fontSize: 14, marginBottom: 20, background: dark ? "#0F172A" : "#F8FAFC", color: dark ? "#F1F5F9" : "#1E293B" }} />

        <button type="submit" disabled={submitting} style={{ width: "100%", background: dark ? "#818CF8" : "#4F46E5", color: "white", border: "none", borderRadius: 10, padding: "12px 0", fontWeight: 600, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          {submitting ? <Loader size={16} className="animate-spin" /> : null}
          {submitting ? "Application en cours..." : `Appliquer à ${selectedEleveIds.length} élève(s)`}
        </button>
      </form>
    </div>
  );
}

function BadgePaye() {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#064E3B", color: "#34D399", padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
      <CheckCircle size={14} /> Payé
    </span>
  );
}
function BadgeAttente() {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#78350F", color: "#FBBF24", padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
      <Clock size={14} /> En attente
    </span>
  );
}