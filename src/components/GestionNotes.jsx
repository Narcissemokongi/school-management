import { useState, useRef, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import * as XLSX from "xlsx";
import { useStyles } from "../styles/theme";
import { useIsMobile } from "../hooks/useIsMobile"; // <-- Import du hook
import { useConfirm } from "../hooks/useConfirm";
import { ConfirmDialog } from "./ConfirmDialog";
import {
  BarChart3, Upload, Trash2, Edit2, Loader, Search,
  Filter, ChevronDown, ChevronUp, Users, BookOpen,
  ClipboardList, PlusCircle, FileSpreadsheet, GraduationCap,
} from "lucide-react";
import toast from "react-hot-toast";
import { trierEleves } from "../utils/tri";

// Carte statistique moderne
function StatCard({ icon, label, value, color, dark, isMobile }) {
  return (
    <div
      style={{
        background: dark ? "#1E293B" : "#FFFFFF",
        borderRadius: 16,
        padding: isMobile ? 14 : 16,
        display: "flex",
        alignItems: "center",
        gap: isMobile ? 10 : 14,
        boxShadow: dark ? "0 4px 8px rgba(0,0,0,0.4)" : "0 2px 6px rgba(0,0,0,0.08)",
        border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
        transition: "transform 0.2s, box-shadow 0.2s",
        cursor: "default",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
    >
      <div
        style={{
          width: isMobile ? 36 : 44,
          height: isMobile ? 36 : 44,
          borderRadius: 12,
          background: `${color}20`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color,
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontSize: isMobile ? 12 : 13, color: dark ? "#94A3B8" : "#64748B" }}>{label}</div>
        <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 700, color: dark ? "#F1F5F9" : "#1E293B" }}>
          {value}
        </div>
      </div>
    </div>
  );
}

export function GestionNotes({
  ecoleId,
  eleves,
  matiereFixe,
  classeFixe,
  anneeId,
  anneeActive,
  user,
  coursDisponibles,
}) {
  const { S, dark } = useStyles();
  const isMobile = useIsMobile(); // Détection mobile
  const { confirm, dialogProps } = useConfirm();
  const [mode, setMode] = useState("individuel");
  const [editData, setEditData] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [categorieFilter, setCategorieFilter] = useState("toutes");
  const [sortKey, setSortKey] = useState("eleve");
  const [sortDir, setSortDir] = useState("asc");

  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const inputBg = dark ? "#0F172A" : "#F9FAFB";
  const inputText = dark ? "#F1F5F9" : "#1E293B";
  const accent = dark ? "#818CF8" : "#4F46E5";
  const danger = "#EF4444";

  if (!anneeId) {
    return (
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: isMobile ? "24px 16px" : "32px 24px" }}>
        <div style={{ background: cardBg, borderRadius: 16, padding: isMobile ? 32 : 48, textAlign: "center", boxShadow: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)", border: `1px solid ${cardBorder}` }}>
          <BarChart3 size={48} color="#F59E0B" style={{ marginBottom: 16 }} />
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

  const notes = useQuery(api.notes.listByEcole, anneeId ? { ecoleId, anneeId } : { ecoleId }) ?? [];
  const upsertNote = useMutation(api.notes.upsert);
  const upsertBulk = useMutation(api.notes.upsertBulk);
  const removeNote = useMutation(api.notes.remove);
  const matieresUtilisees = [...new Set(notes.map((n) => n.matiere))].sort();
  const resultatsFileInputRef = useRef(null);

  const getBareme = (matiere) => {
    const cours = coursDisponibles?.find((c) => c.nom === matiere);
    return cours?.bareme ?? 20;
  };

  const notesTriees = useMemo(() => {
    return [...notes].sort((a, b) => {
      const eleveA = eleves.find((e) => e._id === a.eleveId);
      const eleveB = eleves.find((e) => e._id === b.eleveId);
      if (!eleveA || !eleveB) return 0;
      return trierEleves(eleveA, eleveB);
    });
  }, [notes, eleves]);

  const notesEnrichies = useMemo(() => {
    return notesTriees.map((n) => {
      const eleve = eleves.find((e) => e._id === n.eleveId);
      return {
        ...n,
        eleveNom: eleve?.nom || "—",
        elevePostnom: eleve?.postnom || "",
        elevePrenom: eleve?.prenom || "",
        eleveClasse: eleve?.classe || "—",
        bareme: getBareme(n.matiere),
      };
    });
  }, [notesTriees, eleves, coursDisponibles]);

  const notesFiltrees = useMemo(() => {
    let result = notesEnrichies;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter((n) =>
        n.eleveNom?.toLowerCase().includes(q) ||
        n.elevePostnom?.toLowerCase().includes(q) ||
        n.elevePrenom?.toLowerCase().includes(q) ||
        n.eleveClasse?.toLowerCase().includes(q) ||
        n.matiere?.toLowerCase().includes(q) ||
        n.periode?.toLowerCase().includes(q) ||
        n.appreciation?.toLowerCase().includes(q)
      );
    }
    if (categorieFilter !== "toutes") {
      result = result.filter((n) => n.categorie === categorieFilter);
    }
    result.sort((a, b) => {
      let valA, valB;
      switch (sortKey) {
        case "eleve":
          valA = `${a.eleveNom} ${a.elevePostnom}`.toLowerCase();
          valB = `${b.eleveNom} ${b.elevePostnom}`.toLowerCase();
          break;
        case "note":
          valA = a.note;
          valB = b.note;
          break;
        case "matiere":
          valA = a.matiere.toLowerCase();
          valB = b.matiere.toLowerCase();
          break;
        case "periode":
          valA = a.periode.toLowerCase();
          valB = b.periode.toLowerCase();
          break;
        default:
          valA = a.note;
          valB = b.note;
      }
      if (sortDir === "asc") return valA < valB ? -1 : 1;
      return valA > valB ? -1 : 1;
    });
    return result;
  }, [notesEnrichies, searchTerm, categorieFilter, sortKey, sortDir]);

  const stats = useMemo(() => {
    const total = notesFiltrees.length;
    const moyenne = total > 0 ? (notesFiltrees.reduce((sum, n) => sum + n.note, 0) / total).toFixed(2) : "0";
    const parCategorie = {};
    notesFiltrees.forEach((n) => {
      const cat = n.categorie || "autre";
      parCategorie[cat] = (parCategorie[cat] || 0) + 1;
    });
    return { total, moyenne, parCategorie };
  }, [notesFiltrees]);

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
            categorie: "devoir",
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

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  // Styles adaptatifs
  const containerPadding = isMobile ? "16px 12px" : "24px 16px";
  const titleSize = isMobile ? 22 : 28;
  const subtitleSize = isMobile ? 14 : 14;
  const headerMarginBottom = isMobile ? 20 : 32;
  const toolbarFlexDirection = isMobile ? "column" : "row";
  const toolbarAlignItems = isMobile ? "stretch" : "center";
  const toolbarGap = isMobile ? 8 : 12;
  const searchInputPadding = isMobile ? "12px 12px 12px 34px" : "10px 12px 10px 34px";
  const searchInputFontSize = isMobile ? 16 : 14;
  const selectPadding = isMobile ? "12px 14px" : "10px 14px";
  const selectFontSize = isMobile ? 16 : 14;
  const statGridCols = isMobile ? "1fr" : "repeat(auto-fit, minmax(150px, 1fr))";
  const statGap = isMobile ? 8 : 12;
  const subTabPadding = isMobile ? "10px 12px" : "12px 20px";
  const subTabFontSize = isMobile ? 14 : 16;
  const importCardPadding = isMobile ? 16 : 24;
  const importButtonPadding = isMobile ? "12px 16px" : "10px 20px";
  const importButtonFontSize = isMobile ? 16 : 14;
  const listCardPadding = isMobile ? "12px 14px" : "16px 20px";
  const listCardFlexDirection = isMobile ? "column" : "row";
  const listCardAlignItems = isMobile ? "stretch" : "center";
  const listCardGap = isMobile ? 8 : 0;
  const actionButtonsContainer = isMobile ? "row" : "row";

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: containerPadding }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .animate-spin { animation: spin 1s linear infinite; }`}</style>

      {/* En-tête */}
      <div style={{ marginBottom: headerMarginBottom }}>
        <h2 style={{ fontSize: titleSize, fontWeight: 700, color: textPrimary, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <ClipboardList size={isMobile ? 24 : 28} color={accent} />
          Gestion des notes
        </h2>
        <p style={{ color: textSecondary, marginTop: 4, fontSize: subtitleSize }}>
          {notes.length} note(s) {anneeActive ? `· ${anneeActive.nom}` : ""}
        </p>
      </div>

      {/* Barre d'outils : recherche, filtres, tri */}
      <div style={{ display: "flex", flexDirection: toolbarFlexDirection, flexWrap: "wrap", gap: toolbarGap, marginBottom: headerMarginBottom, alignItems: toolbarAlignItems }}>
        <div style={{ position: "relative", flex: 1, minWidth: isMobile ? "100%" : 200 }}>
          <Search size={18} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: textSecondary }} />
          <input
            type="text"
            placeholder="Rechercher un élève, une matière, une période..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: searchInputPadding,
              borderRadius: 8,
              border: `1px solid ${cardBorder}`,
              background: inputBg,
              color: inputText,
              fontSize: searchInputFontSize,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        <select
          value={categorieFilter}
          onChange={(e) => setCategorieFilter(e.target.value)}
          style={{
            padding: selectPadding,
            borderRadius: 8,
            border: `1px solid ${cardBorder}`,
            background: inputBg,
            color: inputText,
            fontSize: selectFontSize,
            cursor: "pointer",
            width: isMobile ? "100%" : "auto",
          }}
        >
          <option value="toutes">Toutes catégories</option>
          <option value="devoir">Devoir</option>
          <option value="examen">Examen</option>
          <option value="interrogation">Interrogation</option>
          <option value="exercice">Exercice</option>
        </select>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", width: isMobile ? "100%" : "auto" }}>
          {[
            { key: "eleve", label: "Élève" },
            { key: "note", label: "Note" },
            { key: "matiere", label: "Matière" },
            { key: "periode", label: "Période" },
          ].map((btn) => (
            <button
              key={btn.key}
              onClick={() => toggleSort(btn.key)}
              style={{
                padding: isMobile ? "10px 12px" : "8px 12px",
                border: `1px solid ${cardBorder}`,
                borderRadius: 8,
                background: "transparent",
                color: textPrimary,
                cursor: "pointer",
                fontSize: isMobile ? 14 : 13,
                display: "flex",
                alignItems: "center",
                gap: 4,
                flex: isMobile ? 1 : "none",
                justifyContent: "center",
              }}
            >
              {btn.label} {sortKey === btn.key && (sortDir === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
            </button>
          ))}
        </div>
      </div>

      {/* Statistiques rapides */}
      <div style={{ display: "grid", gridTemplateColumns: statGridCols, gap: statGap, marginBottom: headerMarginBottom }}>
        <StatCard icon={<ClipboardList size={20} />} label="Notes" value={stats.total} color="#4F46E5" dark={dark} isMobile={isMobile} />
        <StatCard icon={<BarChart3 size={20} />} label="Moyenne" value={stats.moyenne} color="#10B981" dark={dark} isMobile={isMobile} />
        <StatCard icon={<BookOpen size={20} />} label="Devoirs" value={stats.parCategorie["devoir"] || 0} color="#F59E0B" dark={dark} isMobile={isMobile} />
        <StatCard icon={<BookOpen size={20} />} label="Examens" value={stats.parCategorie["examen"] || 0} color="#EF4444" dark={dark} isMobile={isMobile} />
        <StatCard icon={<BookOpen size={20} />} label="Interrogations" value={stats.parCategorie["interrogation"] || 0} color="#8B5CF6" dark={dark} isMobile={isMobile} />
        <StatCard icon={<BookOpen size={20} />} label="Exercice" value={stats.parCategorie["exercice"] || 0} color="#0f1190" dark={dark} isMobile={isMobile} />
      </div>

      {/* Onglets pour mode d'ajout */}
      <div style={{ display: "flex", gap: 0, borderBottom: `2px solid ${cardBorder}`, marginBottom: headerMarginBottom, overflowX: "auto", whiteSpace: "nowrap" }}>
        <button
          onClick={() => { setMode("individuel"); setEditData(null); }}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: subTabPadding, border: "none", background: "transparent",
            color: mode === "individuel" ? accent : textSecondary,
            fontWeight: mode === "individuel" ? 600 : 400,
            borderBottom: mode === "individuel" ? `3px solid ${accent}` : "3px solid transparent",
            cursor: "pointer", transition: "all 0.2s",
            fontSize: subTabFontSize, flexShrink: 0,
          }}
        >
          <Users size={18} /> Ajout individuel
        </button>
        <button
          onClick={() => { setMode("groupe"); setEditData(null); }}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: subTabPadding, border: "none", background: "transparent",
            color: mode === "groupe" ? accent : textSecondary,
            fontWeight: mode === "groupe" ? 600 : 400,
            borderBottom: mode === "groupe" ? `3px solid ${accent}` : "3px solid transparent",
            cursor: "pointer", transition: "all 0.2s",
            fontSize: subTabFontSize, flexShrink: 0,
          }}
        >
          <GraduationCap size={18} /> Ajout groupé
        </button>
      </div>

      {/* Formulaire */}
      {mode === "individuel" ? (
        <AddNoteIndividuel
          eleves={eleves}
          matiereFixe={matiereFixe}
          matieresUtilisees={matieresUtilisees}
          upsertNote={upsertNote}
          ecoleId={ecoleId}
          anneeId={anneeId}
          userId={user?._id}
          initialData={editData}
          onSuccess={() => setEditData(null)}
          coursDisponibles={coursDisponibles}
          dark={dark}
          isMobile={isMobile}
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
          coursDisponibles={coursDisponibles}
          dark={dark}
          isMobile={isMobile}
        />
      )}

      {/* Import Excel */}
      <div style={{ background: cardBg, borderRadius: 16, padding: importCardPadding, margin: "24px 0", boxShadow: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)", border: `1px solid ${cardBorder}` }}>
        <h3 style={{ fontSize: isMobile ? 16 : 18, fontWeight: 600, marginBottom: 12, display: "flex", alignItems: "center", gap: 8, color: textPrimary }}>
          <FileSpreadsheet size={20} /> Importer des résultats depuis Excel
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
            background: dark ? "#34D399" : "#10B981",
            color: "white",
            border: "none",
            borderRadius: 10,
            padding: importButtonPadding,
            fontWeight: 600,
            cursor: "pointer",
            fontSize: importButtonFontSize,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            width: isMobile ? "100%" : "auto",
          }}
        >
          <Upload size={16} /> Sélectionner un fichier Excel
        </button>
        <p style={{ color: textSecondary, fontSize: 13, marginTop: 8 }}>
          Colonnes : <strong>nom, postnom, classe, periode, notes, appreciation</strong>
        </p>
      </div>

      {/* Liste des notes filtrées et triées */}
      <div style={{ display: "grid", gap: isMobile ? 8 : 12 }}>
        {notesFiltrees.length === 0 && (
          <div style={{ background: cardBg, borderRadius: 16, padding: isMobile ? 32 : 48, textAlign: "center", boxShadow: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)", border: `1px solid ${cardBorder}`, color: textSecondary }}>
            <BarChart3 size={32} style={{ marginBottom: 8 }} />
            <p>{searchTerm || categorieFilter !== "toutes" ? "Aucune note ne correspond aux filtres." : "Aucune note enregistrée"}</p>
          </div>
        )}
        {notesFiltrees.map((n) => {
          const eleve = eleves.find((e) => e._id === n.eleveId);
          const bareme = getBareme(n.matiere);
          return (
            <div
              key={n._id}
              style={{
                background: cardBg,
                borderRadius: 12,
                padding: listCardPadding,
                display: "flex",
                flexDirection: listCardFlexDirection,
                justifyContent: "space-between",
                alignItems: listCardAlignItems,
                gap: listCardGap,
                boxShadow: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)",
                border: `1px solid ${cardBorder}`,
                transition: "box-shadow 0.15s, background-color 0.3s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = dark ? "0 2px 8px rgba(0,0,0,0.5)" : "0 2px 8px rgba(0,0,0,0.08)")}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)")}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: isMobile ? 15 : 16, color: textPrimary }}>
                  {eleve?.nom} {eleve?.postnom} {eleve?.prenom && `(${eleve.prenom})`}
                </div>
                <div style={{ color: textSecondary, fontSize: isMobile ? 13 : 13 }}>
                  {n.matiere} — {n.periode} (coeff. {n.coefficient}) · Catégorie : {n.categorie || "—"}
                </div>
                <div style={{ fontSize: isMobile ? 18 : 20, fontWeight: 700, marginTop: 4, color: textPrimary }}>
                  {n.note}/{bareme}
                </div>
                {n.appreciation && (
                  <div style={{ fontSize: 12, color: textSecondary, fontStyle: "italic" }}>
                    📝 {n.appreciation}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 6, flexDirection: actionButtonsContainer }}>
                <button
                  onClick={() => { setEditData(n); setMode("individuel"); }}
                  style={{ background: accent, color: "white", border: "none", borderRadius: 8, padding: isMobile ? "10px 12px" : "8px", cursor: "pointer" }}
                  title="Modifier la note"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={async () => {
                    const ok = await confirm("Supprimer la note", "Voulez-vous vraiment supprimer cette note ?");
                    if (ok) {
                      try {
                        await removeNote({ id: n._id, userId: user?._id });
                        toast.success("Note supprimée");
                      } catch (err) {
                        toast.error(err.message);
                      }
                    }
                  }}
                  style={{ background: "none", border: "none", color: danger, cursor: "pointer", padding: isMobile ? "10px 12px" : "8px", borderRadius: 8 }}
                  title="Supprimer la note"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmDialog {...dialogProps} />
    </div>
  );
}

// ========== Sous-composant : AddNoteIndividuel (enrichi) ==========
function AddNoteIndividuel({
  eleves,
  matiereFixe,
  matieresUtilisees,
  upsertNote,
  ecoleId,
  anneeId,
  userId,
  initialData,
  onSuccess,
  coursDisponibles,
  dark,
  isMobile,
}) {
  const [selectedEleve, setSelectedEleve] = useState(initialData?.eleveId || "");
  const [matiere, setMatiere] = useState(initialData?.matiere || matiereFixe || "");
  const [note, setNote] = useState(initialData?.note?.toString() || "");
  const [coefficient, setCoefficient] = useState(initialData?.coefficient?.toString() || "1");
  const [periode, setPeriode] = useState(initialData?.periode || "");
  const [appreciation, setAppreciation] = useState(initialData?.appreciation || "");
  const [categorie, setCategorie] = useState(initialData?.categorie || "devoir");
  const [editId, setEditId] = useState(initialData?._id || null);
  const [submitting, setSubmitting] = useState(false);
  const [searchEleve, setSearchEleve] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const elevesTries = useMemo(() => [...eleves].sort(trierEleves), [eleves]);

  const elevesFiltres = useMemo(() => {
    if (!searchEleve.trim()) return elevesTries;
    const q = searchEleve.toLowerCase();
    return elevesTries.filter((e) =>
      `${e.nom} ${e.postnom} ${e.prenom}`.toLowerCase().includes(q) ||
      e.classe.toLowerCase().includes(q)
    );
  }, [elevesTries, searchEleve]);

  const cours = coursDisponibles?.find((c) => c.nom === (matiereFixe || matiere));
  const bareme = cours?.bareme ?? 20;

  const noteNum = parseFloat(note);
  const pourcentage = note && !isNaN(noteNum) && bareme > 0 ? Math.round((noteNum / bareme) * 100) : null;

  const resetForm = () => {
    setSelectedEleve("");
    setSearchEleve("");
    setShowSuggestions(false);
    setMatiere(matiereFixe || "");
    setNote("");
    setCoefficient("1");
    setPeriode("");
    setAppreciation("");
    setCategorie("devoir");
    setEditId(null);
    if (onSuccess) onSuccess();
  };

  const handleSelectEleve = (id) => {
    setSelectedEleve(id);
    setSearchEleve("");
    setShowSuggestions(false);
  };

  const validate = () => {
    if (!selectedEleve) return "Veuillez sélectionner un élève.";
    if (!matiere) return "Veuillez saisir la matière.";
    const noteNum = parseFloat(note);
    if (isNaN(noteNum) || noteNum < 0 || noteNum > bareme) return `La note doit être entre 0 et ${bareme}.`;
    if (!periode) return "Veuillez indiquer la période.";
    if (parseFloat(coefficient) <= 0) return "Le coefficient doit être supérieur à 0.";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        eleveId: selectedEleve,
        ecoleId,
        matiere,
        note: parseFloat(note),
        coefficient: parseFloat(coefficient) || 1,
        categorie,
        periode,
        appreciation: appreciation || undefined,
        anneeId,
        userId,
      };
      if (editId) payload.id = editId;
      await upsertNote(payload);
      toast.success(editId ? "Note mise à jour" : "Note ajoutée");
      resetForm();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = (hasError = false) => ({
    width: "100%",
    padding: isMobile ? "12px 14px" : "10px 14px",
    border: `1px solid ${hasError ? "#EF4444" : dark ? "#334155" : "#E2E8F0"}`,
    borderRadius: 10,
    fontSize: isMobile ? 16 : 14,
    marginBottom: 12,
    outline: "none",
    background: dark ? "#0F172A" : "#F8FAFC",
    color: dark ? "#F1F5F9" : "#1E293B",
    transition: "border-color 0.2s, background-color 0.3s",
    boxSizing: "border-box",
  });

  const cardPadding = isMobile ? 16 : 24;
  const titleSize = isMobile ? 16 : 18;
  const labelSize = isMobile ? 15 : 14;
  const gridColumns = isMobile ? "1fr" : "1fr 1fr";
  const buttonPadding = isMobile ? "12px 16px" : "10px 20px";
  const buttonFontSize = isMobile ? 16 : 14;
  const buttonFlexDirection = isMobile ? "column" : "row";
  const buttonWidth = isMobile ? "100%" : "auto";

  return (
    <div style={{
      background: dark ? "#1E293B" : "#FFFFFF",
      borderRadius: 16,
      padding: cardPadding,
      boxShadow: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)",
      marginBottom: 24,
      border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
    }}>
      <h3 style={{ fontSize: titleSize, fontWeight: 600, marginBottom: 20, color: dark ? "#F1F5F9" : "#1E293B" }}>
        {editId ? "Modifier la note" : "Ajouter une note individuelle"}
      </h3>

      <form onSubmit={handleSubmit}>
        {/* Sélection de l'élève avec recherche */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 6, fontWeight: 500, fontSize: labelSize, color: dark ? "#CBD5E1" : "#374151" }}>
            Élève <span style={{ color: "#EF4444" }}>*</span>
          </label>
          {!selectedEleve ? (
            <>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  placeholder="Rechercher un élève par nom ou classe..."
                  value={searchEleve}
                  onChange={(e) => { setSearchEleve(e.target.value); setShowSuggestions(true); }}
                  onFocus={() => setShowSuggestions(true)}
                  style={{
                    ...inputStyle(!selectedEleve),
                    paddingLeft: 34,
                    marginBottom: 0,
                  }}
                />
                <Search size={18} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: dark ? "#94A3B8" : "#64748B" }} />
              </div>
              {showSuggestions && searchEleve.trim() && (
                <div style={{
                  maxHeight: 200,
                  overflowY: "auto",
                  border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
                  borderRadius: 8,
                  marginTop: 4,
                  background: dark ? "#1E293B" : "#FFFFFF",
                  zIndex: 10,
                }}>
                  {elevesFiltres.slice(0, 20).map((e) => (
                    <button
                      key={e._id}
                      type="button"
                      onClick={() => handleSelectEleve(e._id)}
                      style={{
                        display: "block",
                        width: "100%",
                        textAlign: "left",
                        padding: "8px 12px",
                        border: "none",
                        borderBottom: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
                        background: "transparent",
                        color: dark ? "#F1F5F9" : "#1E293B",
                        cursor: "pointer",
                        fontSize: isMobile ? 14 : 14,
                      }}
                    >
                      {e.nom} {e.postnom} {e.prenom} <span style={{ color: dark ? "#94A3B8" : "#64748B" }}>({e.classe})</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`, borderRadius: 10, background: dark ? "#0F172A" : "#F8FAFC", color: dark ? "#F1F5F9" : "#1E293B" }}>
              <span>{eleves.find((e) => e._id === selectedEleve)?.nom} {eleves.find((e) => e._id === selectedEleve)?.postnom} ({eleves.find((e) => e._id === selectedEleve)?.classe})</span>
              <button type="button" onClick={() => { setSelectedEleve(""); setSearchEleve(""); }} style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer", fontSize: isMobile ? 14 : 14 }}>Changer</button>
            </div>
          )}
        </div>

        {/* Matière */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 6, fontWeight: 500, fontSize: labelSize, color: dark ? "#CBD5E1" : "#374151" }}>
            Matière <span style={{ color: "#EF4444" }}>*</span>
          </label>
          <input
            value={matiere}
            onChange={(e) => setMatiere(e.target.value)}
            disabled={!!matiereFixe}
            list="matieres-list"
            style={inputStyle(!matiere)}
            placeholder="Ex: Mathématiques"
          />
          <datalist id="matieres-list">
            {matieresUtilisees.map((m) => <option key={m} value={m} />)}
          </datalist>
        </div>

        {/* Note et coefficient */}
        <div style={{ display: "grid", gridTemplateColumns: gridColumns, gap: 12 }}>
          <div>
            <label style={{ display: "block", marginBottom: 6, fontWeight: 500, fontSize: labelSize, color: dark ? "#CBD5E1" : "#374151" }}>
              Note (/{bareme}) <span style={{ color: "#EF4444" }}>*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max={bareme}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={inputStyle(note === "" || isNaN(parseFloat(note)))}
              placeholder={`Ex: 15.5`}
            />
            {pourcentage !== null && (
              <div style={{ fontSize: 12, color: dark ? "#94A3B8" : "#64748B", marginTop: -8, marginBottom: 12 }}>
                {pourcentage}%
              </div>
            )}
          </div>
          <div>
            <label style={{ display: "block", marginBottom: 6, fontWeight: 500, fontSize: labelSize, color: dark ? "#CBD5E1" : "#374151" }}>
              Coefficient
            </label>
            <input
              type="number"
              step="0.5"
              min="0.5"
              value={coefficient}
              onChange={(e) => setCoefficient(e.target.value)}
              style={inputStyle(parseFloat(coefficient) <= 0)}
              placeholder="1"
            />
          </div>
        </div>

        {/* Catégorie et période */}
        <div style={{ display: "grid", gridTemplateColumns: gridColumns, gap: 12 }}>
          <div>
            <label style={{ display: "block", marginBottom: 6, fontWeight: 500, fontSize: labelSize, color: dark ? "#CBD5E1" : "#374151" }}>
              Catégorie
            </label>
            <select
              value={categorie}
              onChange={(e) => setCategorie(e.target.value)}
              style={inputStyle(false)}
            >
              <option value="devoir">Devoir</option>
              <option value="examen">Examen</option>
              <option value="interrogation">Interrogation</option>
              <option value="exercice">Exercice</option>
            </select>
          </div>
          <div>
            <label style={{ display: "block", marginBottom: 6, fontWeight: 500, fontSize: labelSize, color: dark ? "#CBD5E1" : "#374151" }}>
              Période <span style={{ color: "#EF4444" }}>*</span>
            </label>
            <input
              value={periode}
              onChange={(e) => setPeriode(e.target.value)}
              style={inputStyle(!periode)}
              placeholder="Ex: 1er Trimestre 2025"
            />
          </div>
        </div>

        {/* Appréciation */}
        <div>
          <label style={{ display: "block", marginBottom: 6, fontWeight: 500, fontSize: labelSize, color: dark ? "#CBD5E1" : "#374151" }}>
            Appréciation (optionnel)
          </label>
          <input
            value={appreciation}
            onChange={(e) => setAppreciation(e.target.value)}
            style={inputStyle(false)}
            placeholder="Ex: Bon travail"
          />
        </div>

        {/* Boutons */}
        <div style={{ display: "flex", gap: 10, marginTop: 20, flexDirection: buttonFlexDirection }}>
          <button
            type="submit"
            disabled={submitting}
            style={{
              background: submitting ? "#A5B4FC" : (dark ? "#818CF8" : "#4F46E5"),
              color: "white", border: "none", borderRadius: 10,
              padding: buttonPadding, fontWeight: 600, cursor: "pointer",
              flex: isMobile ? "none" : 1, fontSize: buttonFontSize,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              width: buttonWidth,
            }}
          >
            {submitting && <Loader size={16} className="animate-spin" />}
            {submitting ? "Enregistrement..." : editId ? "Mettre à jour" : "Ajouter la note"}
          </button>
          {editId && (
            <button
              type="button"
              onClick={resetForm}
              style={{ background: dark ? "#334155" : "#F1F5F9", border: "none", borderRadius: 10, padding: buttonPadding, cursor: "pointer", color: dark ? "#F1F5F9" : "#1E293B", fontSize: buttonFontSize, width: buttonWidth }}
            >
              Annuler
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

// ========== Sous-composant : AddNoteGroupe (enrichi) ==========
function AddNoteGroupe({
  eleves,
  matiereFixe,
  matieresUtilisees,
  upsertBulk,
  ecoleId,
  anneeId,
  userId,
  coursDisponibles,
  dark,
  isMobile,
}) {
  const [selectedEleveIds, setSelectedEleveIds] = useState([]);
  const [bulkMatiere, setBulkMatiere] = useState(matiereFixe || "");
  const [bulkNote, setBulkNote] = useState("");
  const [bulkCoefficient, setBulkCoefficient] = useState("1");
  const [bulkPeriode, setBulkPeriode] = useState("");
  const [bulkAppreciation, setBulkAppreciation] = useState("");
  const [bulkCategorie, setBulkCategorie] = useState("devoir");
  const [submitting, setSubmitting] = useState(false);
  const [searchEleve, setSearchEleve] = useState("");
  const [classeFilter, setClasseFilter] = useState("");

  const elevesTries = useMemo(() => [...eleves].sort(trierEleves), [eleves]);

  const elevesFiltres = useMemo(() => {
    let result = elevesTries;
    if (classeFilter) {
      result = result.filter((e) => e.classe === classeFilter);
    }
    if (searchEleve.trim()) {
      const q = searchEleve.toLowerCase();
      result = result.filter((e) =>
        `${e.nom} ${e.postnom} ${e.prenom}`.toLowerCase().includes(q)
      );
    }
    return result;
  }, [elevesTries, classeFilter, searchEleve]);

  const classesDisponibles = useMemo(() => {
    return [...new Set(eleves.map((e) => e.classe))].sort();
  }, [eleves]);

  const cours = coursDisponibles?.find((c) => c.nom === (matiereFixe || bulkMatiere));
  const bareme = cours?.bareme ?? 20;

  const toggleEleve = (id) =>
    setSelectedEleveIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  const selectAll = () => setSelectedEleveIds(elevesFiltres.map((e) => e._id));
  const deselectAll = () => setSelectedEleveIds([]);

  const validate = () => {
    if (selectedEleveIds.length === 0) return "Sélectionnez au moins un élève.";
    if (!bulkMatiere) return "Veuillez saisir la matière.";
    const noteNum = parseFloat(bulkNote);
    if (isNaN(noteNum) || noteNum < 0 || noteNum > bareme) return `La note doit être entre 0 et ${bareme}.`;
    if (!bulkPeriode) return "Veuillez indiquer la période.";
    if (parseFloat(bulkCoefficient) <= 0) return "Le coefficient doit être supérieur à 0.";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }
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
        categorie: bulkCategorie,
      });
      toast.success(`${count} notes enregistrées.`);
      setSelectedEleveIds([]);
      setBulkMatiere(matiereFixe || "");
      setBulkNote("");
      setBulkCoefficient("1");
      setBulkPeriode("");
      setBulkAppreciation("");
      setBulkCategorie("devoir");
      setSearchEleve("");
      setClasseFilter("");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = (hasError = false) => ({
    width: "100%",
    padding: isMobile ? "12px 14px" : "10px 14px",
    border: `1px solid ${hasError ? "#EF4444" : dark ? "#334155" : "#E2E8F0"}`,
    borderRadius: 10,
    fontSize: isMobile ? 16 : 14,
    marginBottom: 12,
    outline: "none",
    background: dark ? "#0F172A" : "#F8FAFC",
    color: dark ? "#F1F5F9" : "#1E293B",
    transition: "border-color 0.2s, background-color 0.3s",
    boxSizing: "border-box",
  });

  const cardPadding = isMobile ? 16 : 24;
  const titleSize = isMobile ? 16 : 18;
  const labelSize = isMobile ? 15 : 14;
  const filtersFlexDirection = isMobile ? "column" : "row";
  const filtersGap = isMobile ? 8 : 12;
  const checkboxSize = isMobile ? 18 : 16;
  const buttonPadding = isMobile ? "12px 16px" : "10px 20px";
  const buttonFontSize = isMobile ? 16 : 14;
  const gridColumns = isMobile ? "1fr" : "1fr 1fr";

  return (
    <div style={{
      background: dark ? "#1E293B" : "#FFFFFF",
      borderRadius: 16,
      padding: cardPadding,
      boxShadow: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)",
      marginBottom: 24,
      border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
    }}>
      <h3 style={{ fontSize: titleSize, fontWeight: 600, marginBottom: 20, color: dark ? "#F1F5F9" : "#1E293B" }}>
        Ajouter des notes groupées
      </h3>

      {/* Filtre par classe et recherche */}
      <div style={{ display: "flex", gap: filtersGap, marginBottom: 16, flexWrap: "wrap", flexDirection: filtersFlexDirection }}>
        <select
          value={classeFilter}
          onChange={(e) => setClasseFilter(e.target.value)}
          style={{ flex: 1, minWidth: isMobile ? "100%" : 150, padding: isMobile ? "12px 14px" : "10px 14px", border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`, borderRadius: 8, background: dark ? "#0F172A" : "#F8FAFC", color: dark ? "#F1F5F9" : "#1E293B", fontSize: isMobile ? 16 : 14 }}
        >
          <option value="">Toutes les classes</option>
          {classesDisponibles.map((c) => <option key={c} value={c} style={{ background: dark ? "#1E293B" : "#FFF" }}>{c}</option>)}
        </select>
        <div style={{ position: "relative", flex: 2, minWidth: isMobile ? "100%" : 200 }}>
          <input
            type="text"
            placeholder="Rechercher un élève..."
            value={searchEleve}
            onChange={(e) => setSearchEleve(e.target.value)}
            style={{ width: "100%", padding: isMobile ? "12px 14px 12px 34px" : "10px 14px 10px 34px", border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`, borderRadius: 8, background: dark ? "#0F172A" : "#F8FAFC", color: dark ? "#F1F5F9" : "#1E293B", fontSize: isMobile ? 16 : 14 }}
          />
          <Search size={18} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: dark ? "#94A3B8" : "#64748B" }} />
        </div>
      </div>

      {/* Liste des élèves */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexDirection: isMobile ? "column" : "row", gap: 8 }}>
        <span style={{ fontWeight: 500, fontSize: labelSize, color: dark ? "#CBD5E1" : "#374151" }}>
          Élèves concernés
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={selectAll} style={{ background: "none", border: "none", color: dark ? "#818CF8" : "#4F46E5", cursor: "pointer", fontSize: isMobile ? 14 : 13, fontWeight: 500 }}>Tout sélectionner</button>
          <button type="button" onClick={deselectAll} style={{ background: "none", border: "none", color: dark ? "#94A3B8" : "#64748B", cursor: "pointer", fontSize: isMobile ? 14 : 13, fontWeight: 500 }}>Désélectionner</button>
        </div>
      </div>
      <div style={{
        maxHeight: 220,
        overflowY: "auto",
        border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
        borderRadius: 12,
        padding: 8,
        marginBottom: 16,
        background: dark ? "#0F172A" : "#F8FAFC",
      }}>
        {elevesFiltres.length === 0 && (
          <p style={{ textAlign: "center", color: dark ? "#94A3B8" : "#64748B", padding: "16px 0" }}>Aucun élève trouvé</p>
        )}
        {elevesFiltres.map((e) => (
          <label key={e._id} style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "6px 8px", fontSize: isMobile ? 15 : 14, cursor: "pointer",
            borderRadius: 6, transition: "background 0.1s",
            background: selectedEleveIds.includes(e._id) ? (dark ? "#312E81" : "#EEF2FF") : "transparent",
          }}>
            <input
              type="checkbox"
              checked={selectedEleveIds.includes(e._id)}
              onChange={() => toggleEleve(e._id)}
              style={{ width: checkboxSize, height: checkboxSize, accentColor: dark ? "#818CF8" : "#4F46E5" }}
            />
            <span style={{ color: dark ? "#F1F5F9" : "#1E293B" }}>{e.nom} {e.postnom} {e.prenom} ({e.classe})</span>
          </label>
        ))}
      </div>
      <div style={{ fontSize: 13, color: dark ? "#94A3B8" : "#64748B", marginBottom: 16 }}>{selectedEleveIds.length} élève(s) sélectionné(s)</div>

      {/* Formulaire de saisie */}
      <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gridTemplateColumns: gridColumns, gap: 12 }}>
          <div>
            <label style={{ display: "block", marginBottom: 6, fontWeight: 500, fontSize: labelSize, color: dark ? "#CBD5E1" : "#374151" }}>Matière</label>
            <input
              value={bulkMatiere}
              onChange={(e) => setBulkMatiere(e.target.value)}
              disabled={!!matiereFixe}
              list="matieres-bulk"
              style={inputStyle(!bulkMatiere)}
              placeholder="Matière"
            />
            <datalist id="matieres-bulk">{matieresUtilisees.map((m) => <option key={m} value={m} />)}</datalist>
          </div>
          <div>
            <label style={{ display: "block", marginBottom: 6, fontWeight: 500, fontSize: labelSize, color: dark ? "#CBD5E1" : "#374151" }}>
              Note (/{bareme})
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max={bareme}
              value={bulkNote}
              onChange={(e) => setBulkNote(e.target.value)}
              style={inputStyle(bulkNote === "" || isNaN(parseFloat(bulkNote)))}
              placeholder={`Ex: 15.5`}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: 6, fontWeight: 500, fontSize: labelSize, color: dark ? "#CBD5E1" : "#374151" }}>Coefficient</label>
            <input
              type="number"
              step="0.5"
              min="0.5"
              value={bulkCoefficient}
              onChange={(e) => setBulkCoefficient(e.target.value)}
              style={inputStyle(parseFloat(bulkCoefficient) <= 0)}
              placeholder="1"
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: 6, fontWeight: 500, fontSize: labelSize, color: dark ? "#CBD5E1" : "#374151" }}>Période</label>
            <input
              value={bulkPeriode}
              onChange={(e) => setBulkPeriode(e.target.value)}
              style={inputStyle(!bulkPeriode)}
              placeholder="1er Trimestre 2025"
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: gridColumns, gap: 12 }}>
          <div>
            <label style={{ display: "block", marginBottom: 6, fontWeight: 500, fontSize: labelSize, color: dark ? "#CBD5E1" : "#374151" }}>Catégorie</label>
            <select
              value={bulkCategorie}
              onChange={(e) => setBulkCategorie(e.target.value)}
              style={inputStyle(false)}
            >
              <option value="devoir">Devoir</option>
              <option value="examen">Examen</option>
              <option value="interrogation">Interrogation</option>
              <option value="exercice">Exercice</option>
            </select>
          </div>
          <div>
            <label style={{ display: "block", marginBottom: 6, fontWeight: 500, fontSize: labelSize, color: dark ? "#CBD5E1" : "#374151" }}>Appréciation (optionnel)</label>
            <input
              value={bulkAppreciation}
              onChange={(e) => setBulkAppreciation(e.target.value)}
              style={inputStyle(false)}
              placeholder="Bon travail"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting || selectedEleveIds.length === 0 || !bulkMatiere || !bulkNote || !bulkPeriode}
          style={{
            background: submitting ? "#A5B4FC" : (dark ? "#818CF8" : "#4F46E5"),
            color: "white", border: "none", borderRadius: 10, padding: buttonPadding,
            fontWeight: 600, cursor: "pointer", width: "100%", fontSize: buttonFontSize,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8
          }}
        >
          {submitting && <Loader size={16} className="animate-spin" />}
          {submitting ? "Enregistrement..." : `Appliquer à ${selectedEleveIds.length} élève(s)`}
        </button>
      </form>
    </div>
  );
}