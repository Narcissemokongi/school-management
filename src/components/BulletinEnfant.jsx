import { useMemo, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useStyles } from "../styles/theme";
import { useIsMobile } from "../hooks/useIsMobile"; // <-- Import du hook
import { Skeleton } from "./Skeleton";
import {
  Clock, AlertTriangle, Download, Award, CheckCircle,
} from "lucide-react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import toast from "react-hot-toast";

export function BulletinEnfant({ eleveId, ecoleId, nom, postnom, classe }) {
  const { dark } = useStyles();
  const isMobile = useIsMobile(); // Détection mobile

  const bulletinRef = useRef(null);
  const [generating, setGenerating] = useState(false);
  const [forceClair, setForceClair] = useState(false);

  // ========== REQUÊTES ==========
  const ecole = useQuery(api.ecoles.get, ecoleId ? { ecoleId } : "skip");
  const anneeActive = useQuery(api.anneesScolaires.getActive, ecoleId ? { ecoleId } : "skip");
  const anneeId = anneeActive?._id;

  const notes = useQuery(api.notes.listByEleve, eleveId && anneeId ? { eleveId, anneeId } : "skip") ?? [];
  const eleve = useQuery(api.eleves.get, { id: eleveId });
  const absences = useQuery(api.absences.listByEleve, { eleveId }) ?? [];
  const coursDisponibles = useQuery(api.cours.list, classe ? { ecoleId, classe } : "skip") ?? [];

  // ========== COULEURS INTERFACE (dépendent du thème) ==========
  const uiColors = {
    textPrimary: dark ? "#F1F5F9" : "#1E293B",
    textSecondary: dark ? "#94A3B8" : "#64748B",
    accent: dark ? "#818CF8" : "#4F46E5",
  };

  // ========== COULEURS BULLETIN (affichage) ==========
  const displayBulletinColors = {
    textPrimary: dark ? "#F1F5F9" : "#1E293B",
    textSecondary: dark ? "#94A3B8" : "#64748B",
    cardBg: dark ? "#1E293B" : "#FFFFFF",
    tableHeaderBg: dark ? "#0F172A" : "#1E293B",
    tableRowBorder: dark ? "#334155" : "#E2E8F0",
    accent: dark ? "#818CF8" : "#4F46E5",
    success: dark ? "#34D399" : "#10B981",
    danger: dark ? "#F87171" : "#EF4444",
    warning: dark ? "#FBBF24" : "#F59E0B",
    mutedBg: dark ? "#0F172A" : "#F8FAFC",
    decisionBg: dark ? "#78350F" : "#FEF3C7",
    decisionText: dark ? "#FBBF24" : "#92400E",
  };

  // ========== COULEURS BULLETIN (exportation) ==========
  const exportBulletinColors = {
    textPrimary: "#1E293B",
    textSecondary: "#64748B",
    cardBg: "#FFFFFF",
    tableHeaderBg: "#1E293B",
    tableRowBorder: "#E2E8F0",
    accent: "#4F46E5",
    success: "#10B981",
    danger: "#EF4444",
    warning: "#F59E0B",
    mutedBg: "#F8FAFC",
    decisionBg: "#FEF3C7",
    decisionText: "#92400E",
  };

  const bulletinColors = forceClair ? exportBulletinColors : displayBulletinColors;

  // ========== TRAITEMENT DES DONNÉES ==========
  const typePeriode = ecole?.typePeriode || "trimestre";
  const nbrPeriodes = typePeriode === "trimestre" ? 3 : 2;
  const prefixePeriode = typePeriode === "trimestre" ? "Trimestre" : "Semestre";

  const periodes = [...new Set(notes.map((n) => n.periode))].sort().slice(0, nbrPeriodes);
  const matieres = useMemo(() => coursDisponibles.map((c) => c.nom).sort(), [coursDisponibles]);

  const calculerMoyenneBrute = (notesMatiere) => {
    if (!notesMatiere || notesMatiere.length === 0) return "-";
    const sommePonderee = notesMatiere.reduce((sum, n) => sum + n.note * (n.coefficient || 1), 0);
    const totalCoeff = notesMatiere.reduce((sum, n) => sum + (n.coefficient || 1), 0);
    return totalCoeff > 0 ? (sommePonderee / totalCoeff) : "-";
  };

  const statsParMatiere = useMemo(() => {
    return matieres.map((matiere) => {
      const cours = coursDisponibles.find((c) => c.nom === matiere);
      const coeffCours = cours?.coefficient ?? 1;
      const baremeCours = cours?.bareme ?? 20;

      const moyBrutes = periodes.map((periode) => {
        const notesPeriode = notes.filter((n) => n.matiere === matiere && n.periode === periode);
        return calculerMoyenneBrute(notesPeriode);
      });

      const moyAnnuelleBrute = moyBrutes.every((m) => m !== "-")
        ? moyBrutes.reduce((sum, m) => sum + parseFloat(m), 0) / moyBrutes.length
        : null;

      const pourcentage = moyAnnuelleBrute !== null ? (moyAnnuelleBrute / baremeCours) * 100 : null;

      return {
        matiere,
        coeffCours,
        baremeCours,
        moyBrutes,
        moyAnnuelleBrute,
        pourcentage,
        appreciation: notes.filter((n) => n.matiere === matiere).map((n) => n.appreciation).filter(Boolean).join("; "),
      };
    });
  }, [notes, matieres, periodes, coursDisponibles]);

  const moyenneGeneralePourcent = useMemo(() => {
    let sommePonderee = 0;
    let totalCoefficients = 0;
    statsParMatiere.forEach((m) => {
      if (m.pourcentage !== null) {
        sommePonderee += m.pourcentage * m.coeffCours;
        totalCoefficients += m.coeffCours;
      }
    });
    return totalCoefficients > 0 ? (sommePonderee / totalCoefficients).toFixed(1) : "-";
  }, [statsParMatiere]);

  const classement = useQuery(
    api.classement.getClassement,
    (ecoleId && anneeId && classe) ? { ecoleId, anneeId, classe } : "skip"
  ) ?? [];

  const rang = classement.find((e) => e._id === eleveId)?.rang ?? "-";
  const moyenneClasse = useMemo(() => {
    if (classement.length === 0) return null;
    const somme = classement.reduce((s, e) => s + e.moyenneGenerale, 0);
    return (somme / classement.length).toFixed(1);
  }, [classement]);

  const seuils = ecole;
  let mention = "";
  if (moyenneGeneralePourcent !== "-" && seuils) {
    const moy = parseFloat(moyenneGeneralePourcent);
    if (seuils.seuilFelicitations && moy >= seuils.seuilFelicitations) mention = "Félicitations";
    else if (seuils.seuilEncouragement && moy >= seuils.seuilEncouragement) mention = "Encouragement";
    else if (seuils.seuilAvertissement && moy <= seuils.seuilAvertissement) mention = "Avertissement";
  }

  const decision = eleve?.decisionConseil || "En attente";

  const absencesJustifiees = absences.filter((a) => a.type === "absence" && a.statutJustification === "justifiee").length;
  const absencesNonJustifiees = absences.filter((a) => a.type === "absence" && (!a.statutJustification || a.statutJustification === "rejetee")).length;
  const retards = absences.filter((a) => a.type === "retard").length;

  // ========== GESTION DU CHARGEMENT ==========
  if (
    ecole === undefined ||
    anneeActive === undefined ||
    notes === undefined ||
    eleve === undefined ||
    absences === undefined ||
    coursDisponibles === undefined ||
    classement === undefined
  ) {
    return <Skeleton height={400} />;
  }

  const aujourdHui = new Date().toLocaleDateString("fr-FR", {
    day: "numeric", month: "long", year: "numeric",
  });

  // ========== EXPORT PDF ==========
  const handleExportPDF = async () => {
    if (!bulletinRef.current) return;
    setGenerating(true);
    setForceClair(true);
    await new Promise((resolve) => setTimeout(resolve, 50));

    try {
      const canvas = await html2canvas(bulletinRef.current, {
        scale: 4,
        useCORS: true,
        backgroundColor: "#FFFFFF",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 5;

      const pageContentWidth = pageWidth - margin * 2;
      const pageContentHeight = pageHeight - margin * 2;

      const ratio = canvas.width / canvas.height;
      let imgWidth = pageContentWidth;
      let imgHeight = imgWidth / ratio;

      if (imgHeight > pageContentHeight) {
        imgWidth = pageContentHeight * ratio;
        imgHeight = pageContentHeight;
      }

      const xPos = margin + (pageContentWidth - imgWidth) / 2;
      const yPos = margin;

      pdf.addImage(imgData, "PNG", xPos, yPos, imgWidth, imgHeight);

      pdf.save(`Bulletin_${nom}_${postnom}.pdf`);
      toast.success("PDF généré avec succès");
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la génération du PDF");
    } finally {
      setForceClair(false);
      setGenerating(false);
    }
  };

  const top3Colors = ["#FFD700", "#C0C0C0", "#CD7F32"];

  // Styles adaptatifs
  const containerMargin = isMobile ? "16px auto" : "24px auto";
  const containerPadding = isMobile ? "0 8px" : "0 16px";
  const exportButtonPadding = isMobile ? "12px 16px" : "10px 20px";
  const exportButtonFontSize = isMobile ? 16 : 14;
  const exportButtonWidth = isMobile ? "100%" : "auto";
  const bulletinPadding = isMobile ? "8px" : "12px";
  const bulletinFontSize = isMobile ? 10 : 11;
  const headerTitleSize = isMobile ? 14 : 16;
  const sectionTitleSize = isMobile ? 12 : 13;
  const tableFontSize = isMobile ? 9 : 10;

  return (
    <div style={{ maxWidth: 900, margin: containerMargin, padding: containerPadding, fontFamily: "'Segoe UI', Roboto, sans-serif", color: uiColors.textPrimary }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .animate-spin { animation: spin 1s linear infinite; }`}</style>

      {/* Bouton d'export */}
      <div style={{ display: "flex", justifyContent: isMobile ? "center" : "flex-end", marginBottom: 16 }}>
        <button
          onClick={handleExportPDF}
          disabled={generating}
          style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
            padding: exportButtonPadding, background: generating ? "#A5B4FC" : uiColors.accent,
            color: "white", border: "none", borderRadius: 10, fontWeight: 600,
            cursor: generating ? "not-allowed" : "pointer", fontSize: exportButtonFontSize,
            width: exportButtonWidth,
          }}
        >
          <Download size={isMobile ? 20 : 18} />
          {generating ? "Génération..." : "Exporter PDF"}
        </button>
      </div>

      {/* ================== BULLETIN ================== */}
      <div
        ref={bulletinRef}
        style={{
          background: bulletinColors.cardBg,
          padding: bulletinPadding,
          borderRadius: 8,
          color: bulletinColors.textPrimary,
          border: `1px solid ${bulletinColors.tableRowBorder}`,
          fontSize: bulletinFontSize,
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}
      >
        {/* En-tête officiel */}
        <div style={{ textAlign: "center", marginBottom: 12, borderBottom: `1px solid ${bulletinColors.accent}`, paddingBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {ecole.logo && <img src={ecole.logo} alt="Logo" style={{ height: 45 }} />}
            <div>
              <h1 style={{ fontSize: headerTitleSize, fontWeight: 700, color: bulletinColors.textPrimary, margin: 0 }}>{ecole.nom}</h1>
              {ecole.adresse && <p style={{ color: bulletinColors.textSecondary, fontSize: 10, margin: "1px 0 0" }}>{ecole.adresse}</p>}
              <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginTop: 2 }}>
                {ecole.telephone && <span style={{ color: bulletinColors.textSecondary, fontSize: 10 }}>📞 {ecole.telephone}</span>}
                {ecole.email && <span style={{ color: bulletinColors.textSecondary, fontSize: 10 }}>✉️ {ecole.email}</span>}
              </div>
              <p style={{ color: bulletinColors.textSecondary, fontSize: 11, margin: "2px 0 0" }}>
                Enseignement {typePeriode === "trimestre" ? "Trimestriel" : "Semestriel"}
              </p>
            </div>
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: bulletinColors.accent, margin: "6px 0 2px", textTransform: "uppercase" }}>
            Bulletin Scolaire
          </h2>
          <p style={{ fontSize: 11, color: bulletinColors.textSecondary, margin: 0 }}>
            Année scolaire {new Date().getFullYear() - 1}–{new Date().getFullYear()}
          </p>
        </div>

        {/* Identification de l'élève */}
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 10, padding: "8px 10px", background: bulletinColors.mutedBg, borderRadius: 6, gap: 4, fontSize: 11 }}>
          <div><strong>Élève :</strong> {nom} {postnom}</div>
          <div><strong>Classe :</strong> {classe}</div>
          {eleve?.code && <div><strong>Matricule :</strong> {eleve.code}</div>}
          <div><strong>Rang :</strong> {rang} / {classement.length}</div>
          {moyenneClasse && <div><strong>Moy. classe :</strong> {moyenneClasse}%</div>}
          {mention && <div><strong>Mention :</strong> {mention}</div>}
          {rang <= 3 && (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Award size={14} color={top3Colors[rang - 1]} />
              <span style={{ fontWeight: 600, color: top3Colors[rang - 1] }}>Top {rang}</span>
            </div>
          )}
        </div>

        {/* Tableau des notes */}
        <div style={{ overflowX: "auto", marginBottom: 10 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: tableFontSize, color: bulletinColors.textPrimary, minWidth: isMobile ? 500 : "auto" }}>
            <thead>
              <tr style={{ background: bulletinColors.tableHeaderBg, color: "white" }}>
                <th style={{ padding: 4, textAlign: "left" }}>Matière</th>
                <th style={{ padding: 4, textAlign: "center" }}>Coeff</th>
                <th style={{ padding: 4, textAlign: "center" }}>Max</th>
                {periodes.map((periode) => (
                  <th key={periode} style={{ padding: 4, textAlign: "center" }}>
                    {prefixePeriode} {periode.split(" ")[0]}
                  </th>
                ))}
                <th style={{ padding: 4, textAlign: "center" }}>Moy. brute</th>
                <th style={{ padding: 4, textAlign: "center", background: bulletinColors.accent, color: "white" }}>Moy. %</th>
                <th style={{ padding: 4, textAlign: "center" }}>Appréciation</th>
              </tr>
            </thead>
            <tbody>
              {statsParMatiere.map((m) => (
                <tr key={m.matiere} style={{ borderBottom: `1px solid ${bulletinColors.tableRowBorder}` }}>
                  <td style={{ padding: 3 }}>{m.matiere}</td>
                  <td style={{ padding: 3, textAlign: "center" }}>{m.coeffCours}</td>
                  <td style={{ padding: 3, textAlign: "center" }}>/{m.baremeCours}</td>
                  {m.moyBrutes.map((mb, idx) => (
                    <td key={idx} style={{ padding: 3, textAlign: "center", fontWeight: 600, color: mb === "-" ? bulletinColors.textSecondary : bulletinColors.textPrimary }}>
                      {mb === "-" ? "-" : mb}
                    </td>
                  ))}
                  <td style={{ padding: 3, textAlign: "center", fontWeight: 600 }}>
                    {m.moyAnnuelleBrute !== null ? `${m.moyAnnuelleBrute.toFixed(1)}` : "-"}
                  </td>
                  <td style={{ padding: 3, textAlign: "center", fontWeight: 700, color: bulletinColors.accent }}>
                    {m.pourcentage !== null ? `${m.pourcentage.toFixed(1)}%` : "-"}
                  </td>
                  <td style={{ padding: 3, fontSize: 9, color: bulletinColors.textSecondary }}>
                    {m.appreciation || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: bulletinColors.mutedBg, fontWeight: 700 }}>
                <td colSpan={4 + periodes.length} style={{ padding: 4, textAlign: "right" }}>
                  Moyenne générale annuelle
                </td>
                <td style={{ padding: 4, textAlign: "center", fontSize: 14, color: bulletinColors.accent }}>
                  {moyenneGeneralePourcent !== "-" ? `${moyenneGeneralePourcent}%` : "-"}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Absences */}
        <div style={{ marginBottom: 10 }}>
          <h3 style={{ fontSize: sectionTitleSize, fontWeight: 600, marginBottom: 6, display: "flex", alignItems: "center", gap: 6, color: bulletinColors.textPrimary }}>
            <Clock size={16} /> Absences & Retards
          </h3>
          <div style={{ background: bulletinColors.mutedBg, borderRadius: 6, padding: "6px 10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
              <span style={{ color: bulletinColors.textPrimary, fontSize: 10 }}>Absences justifiées</span>
              <span style={{ fontWeight: 600, color: bulletinColors.success, fontSize: 10 }}>{absencesJustifiees}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
              <span style={{ color: bulletinColors.textPrimary, fontSize: 10 }}>Absences non justifiées</span>
              <span style={{ fontWeight: 600, color: bulletinColors.danger, fontSize: 10 }}>{absencesNonJustifiees}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: bulletinColors.textPrimary, fontSize: 10 }}>Retards</span>
              <span style={{ fontWeight: 600, color: bulletinColors.warning, fontSize: 10 }}>{retards}</span>
            </div>
          </div>
        </div>

        {/* Décision du conseil */}
        <div style={{ marginBottom: 8, padding: "6px 10px", background: bulletinColors.decisionBg, borderRadius: 6, display: "flex", alignItems: "center", gap: 6 }}>
          {decision === "En attente" ? (
            <AlertTriangle size={16} color={bulletinColors.decisionText} />
          ) : (
            <CheckCircle size={16} color={bulletinColors.decisionText} />
          )}
          <span style={{ fontWeight: 600, color: bulletinColors.decisionText, fontSize: 10 }}>
            Décision du conseil de classe : {decision}
          </span>
        </div>

        {/* Signatures */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20, fontSize: 10, color: bulletinColors.textSecondary }}>
          <div>
            <div>Le Directeur</div>
            <div style={{ marginTop: 16, borderTop: "1px solid #CBD5E1", width: 100 }} />
          </div>
          <div>
            <div>Le Parent / Tuteur</div>
            <div style={{ marginTop: 16, borderTop: "1px solid #CBD5E1", width: 100 }} />
          </div>
          <div>
            <div>Le Titulaire</div>
            <div style={{ marginTop: 16, borderTop: "1px solid #CBD5E1", width: 100 }} />
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 12, fontSize: 9, color: bulletinColors.textSecondary }}>
          Fait à …………………....., le {aujourdHui}
        </div>
      </div>
    </div>
  );
}