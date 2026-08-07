import { useState, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import * as XLSX from "xlsx";
import { useStyles } from "../styles/theme";
import toast from "react-hot-toast";
import { Skeleton } from "./Skeleton";
import { AddEleveForm } from "./eleves/AddEleveForm";
import { ImportExcel } from "./eleves/ImportExcel";
import { ElevesTable } from "./eleves/ElevesTable";
import { EditParentPanel } from "./eleves/EditParentPanel";
import { EditEleveUserPanel } from "./eleves/EditEleveUserPanel";

export function GestionEleves({
  eleves,
  addEleve,
  removeEleve,
  importEleves,
  classes,
  ecoleId,
  user,
  anneeId,
}) {
  const { S } = useStyles();
  const fileInputRef = useRef(null);
  const [editingParentEleveId, setEditingParentEleveId] = useState(null);
  const [editingUserEleveId, setEditingUserEleveId] = useState(null);
  const [importing, setImporting] = useState(false);

  const parents = useQuery(api.users.listParentsByEcole, ecoleId ? { ecoleId } : "skip") ?? [];
  const elevesUsers = useQuery(api.users.listElevesUsers, ecoleId ? { ecoleId } : "skip") ?? [];

  const remove = useMutation(api.eleves.remove); // si la mutation remove existe

  // Enrichissement pour le tableau
  const enrichedEleves = eleves.map((e) => ({
    ...e,
    parentName: (parents.find((p) => p._id === e.parentId))?.nom ?? "—",
    parentLogin: (parents.find((p) => p._id === e.parentId))?.login ?? "",
    eleveUserName: (elevesUsers.find((u) => u._id === e.userId))?.nom ?? "—",
    eleveUserLogin: (elevesUsers.find((u) => u._id === e.userId))?.login ?? "",
  }));

  const handleImportExcel = (e) => {
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
          classeIdx = headers.indexOf("classe");
        if (nomIdx === -1 || postnomIdx === -1 || classeIdx === -1) {
          toast.error("Colonnes requises : nom, postnom, classe.");
          return;
        }
        const newEleves = [];
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row[nomIdx] || !row[postnomIdx] || !row[classeIdx]) continue;
          newEleves.push({
            nom: row[nomIdx].toString().trim(),
            postnom: row[postnomIdx].toString().trim(),
            classe: row[classeIdx].toString().trim(),
          });
        }
        if (newEleves.length > 0) {
          await importEleves({ eleves: newEleves, ecoleId, anneeId, actionUserId: user._id });
          toast.success(`${newEleves.length} élève(s) importés.`);
        }
      } catch (err) {
        toast.error(err.message);
      } finally {
        setImporting(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  if (eleves === undefined) return <Skeleton height={200} />;

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 16px" }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .animate-spin { animation: spin 1s linear infinite; }`}</style>

      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, color: "#1E293B", margin: 0 }}>Élèves</h2>
        <p style={{ color: "#64748B", marginTop: 4, fontSize: 14 }}>
          {eleves.length} élève(s) inscrits
        </p>
      </div>

      {/* Formulaire d'ajout */}
      <AddEleveForm
        classes={classes}
        parents={parents}
        ecoleId={ecoleId}
        userId={user._id}
        anneeId={anneeId}
        addEleve={addEleve}
      />

      {/* Import Excel */}
      <ImportExcel
        fileInputRef={fileInputRef}
        importing={importing}
        onImport={handleImportExcel}
      />

      {/* Tableau */}
      <ElevesTable
        data={enrichedEleves}
        onEditParent={(id) => setEditingParentEleveId(id)}
        onEditUser={(id) => setEditingUserEleveId(id)}
        onDelete={(id) => {
          if (window.confirm("Supprimer cet élève ?")) remove({ id });
        }}
      />

      {/* Panneaux d'édition (affichés sous le tableau) */}
      {editingParentEleveId && (
        <EditParentPanel
          eleveId={editingParentEleveId}
          initialParentId={eleves.find((e) => e._id === editingParentEleveId)?.parentId}
          parents={parents}
          ecoleId={ecoleId}
          userId={user._id}
          onClose={() => setEditingParentEleveId(null)}
        />
      )}
      {editingUserEleveId && (
        <EditEleveUserPanel
          eleveId={editingUserEleveId}
          initialUserId={eleves.find((e) => e._id === editingUserEleveId)?.userId}
          elevesUsers={elevesUsers}
          ecoleId={ecoleId}
          userId={user._id}
          onClose={() => setEditingUserEleveId(null)}
        />
      )}
    </div>
  );
}