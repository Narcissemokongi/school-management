import { useMemo, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useStyles } from "../styles/theme";
import { Skeleton } from "./Skeleton";
import { Clock, AlertTriangle, Download } from "lucide-react";
import { useExportPDF } from "../hooks/useExportPDF";
import toast from "react-hot-toast";

export function BulletinEnfant({ eleveId, ecoleId, nom, postnom, classe }) {
  const { S } = useStyles();
  const bulletinRef = useRef(null);       // référence pour le PDF
  const { exportPDF, isExporting } = useExportPDF();

  // Récupération de l'école
  const ecole = useQuery(api.ecoles.get, ecoleId ? { ecoleId } : "skip");
  // Notes de l'élève
  const notes = useQuery(api.notes.listByEleve, { eleveId }) ?? [];
  // Élève complet (pour la décision et matricule)
  const eleve = useQuery(api.eleves.get, { id: eleveId });
  // Absences
  const absences = useQuery(api.absences.listByEleve, { eleveId }) ?? [];
  // Cours de la classe (source officielle des matières)
  const coursDisponibles = useQuery(
    api.cours.list,
    classe ? { ecoleId, classe } : "skip"
  ) ?? [];

  // Type de période
  const typePeriode = ecole?.typePeriode || "trimestre";
  const nbrPeriodes = typePeriode === "trimestre" ? 3 : 2;
  const prefixePeriode = typePeriode === "trimestre" ? "Trimestre" : "Semestre";

  // Périodes disponibles dans les notes (limitées au nombre attendu)
  const periodes = [...new Set(notes.map((n) => n.periode))]
    .sort()
    .slice(0, nbrPeriodes);

  // Les matières viennent de la liste des cours (tri alphabétique)
  const matieres = useMemo(
    () => coursDisponibles.map((c) => c.nom).sort(),
    [coursDisponibles]
  );

  // Calcul de la moyenne brute d'une matière sur une période
  const calculerMoyenneBrute = (notesMatiere) => {
    if (!notesMatiere || notesMatiere.length === 0) return "-";
    const sommePonderee = notesMatiere.reduce((sum, n) => sum + n.note * (n.coefficient || 1), 0);
    const totalCoeff = notesMatiere.reduce((sum, n) => sum + (n.coefficient || 1), 0);
    return totalCoeff > 0 ? (sommePonderee / totalCoeff) : "-";
  };

  // Statistiques par matière
  const statsParMatiere = useMemo(() => {
    return matieres.map((matiere) => {
      const cours = coursDisponibles.find((c) => c.nom === matiere);
      const coeffCours = cours?.coefficient ?? 1;
      const baremeCours = cours?.bareme ?? 20;

      const moyBrutes = periodes.map((periode) => {
        const notesPeriode = notes.filter(
          (n) => n.matiere === matiere && n.periode === periode
        );
        return calculerMoyenneBrute(notesPeriode);
      });

      const moyAnnuelleBrute =
        moyBrutes.every((m) => m !== "-")
          ? moyBrutes.reduce((sum, m) => sum + parseFloat(m), 0) / moyBrutes.length
          : null;

      const pourcentage =
        moyAnnuelleBrute !== null ? (moyAnnuelleBrute / baremeCours) * 100 : null;

      return {
        matiere,
        coeffCours,
        baremeCours,
        moyBrutes,
        moyAnnuelleBrute,
        pourcentage,
        appreciation: notes
          .filter((n) => n.matiere === matiere)
          .map((n) => n.appreciation)
          .filter(Boolean)
          .join("; "),
      };
    });
  }, [notes, matieres, periodes, coursDisponibles]);

  // Moyenne générale en pourcentage
  const moyenneGeneralePourcent = useMemo(() => {
    let sommePonderee = 0;
    let totalCoefficients = 0;
    statsParMatiere.forEach((m) => {
      if (m.pourcentage !== null) {
        sommePonderee += m.pourcentage * m.coeffCours;
        totalCoefficients += m.coeffCours;
      }
    });
    return totalCoefficients > 0
      ? (sommePonderee / totalCoefficients).toFixed(1)
      : "-";
  }, [statsParMatiere]);

  // Décision du conseil
  const decision = eleve?.decisionConseil || "En attente";

  const absencesStats = periodes.map((periode) => ({
    periode,
    absences: 0,
    retards: 0,
  }));

  // Gestion du chargement
  if (
    ecole === undefined ||
    notes === undefined ||
    eleve === undefined ||
    absences === undefined ||
    coursDisponibles === undefined
  ) {
    return <Skeleton height={400} />;
  }

  const aujourdHui = new Date().toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const handleExportPDF = async () => {
    try {
      await exportPDF(bulletinRef, `Bulletin_${nom}_${postnom}.pdf`);
      toast.success("PDF généré avec succès");
    } catch (err) {
      toast.error("Erreur lors de la génération du PDF");
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: "24px auto", padding: "0 16px", fontFamily: "'Segoe UI', Roboto, sans-serif" }}>
      {/* Bouton d'export (hors du conteneur capturé) */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <button
          onClick={handleExportPDF}
          disabled={isExporting}
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "10px 20px", background: isExporting ? "#A5B4FC" : "#4F46E5",
            color: "white", border: "none", borderRadius: 10, fontWeight: 600,
            cursor: isExporting ? "not-allowed" : "pointer", fontSize: 14,
          }}
        >
          <Download size={18} />
          {isExporting ? "Génération..." : "Exporter PDF"}
        </button>
      </div>

      {/* Contenu complet du bulletin, capturé pour le PDF */}
      <div ref={bulletinRef} style={{ background: "#FFF", padding: 20, borderRadius: 12 }}>
        {/* En-tête officiel */}
        <div style={{ textAlign: "center", marginBottom: 24, borderBottom: "2px solid #4F46E5", paddingBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12 }}>
            {ecole.logo && <img src={ecole.logo} alt="Logo" style={{ height: 60 }} />}
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 700, color: "#1E293B", margin: 0 }}>{ecole.nom}</h1>
              <p style={{ color: "#64748B", fontSize: 14, margin: 0 }}>
                Enseignement {typePeriode === "trimestre" ? "Trimestriel" : "Semestriel"}
              </p>
            </div>
          </div>
          <h2 style={{ fontSize: 28, fontWeight: 700, color: "#4F46E5", margin: "12px 0 4px", textTransform: "uppercase" }}>
            Bulletin Scolaire
          </h2>
          <p style={{ fontSize: 14, color: "#64748B" }}>
            Année scolaire {new Date().getFullYear() - 1}–{new Date().getFullYear()}
          </p>
        </div>

        {/* Identification de l'élève */}
        <div style={{
          display: "flex", flexWrap: "wrap", justifyContent: "space-between",
          marginBottom: 24, padding: "12px 16px", background: "#F8FAFC", borderRadius: 8,
        }}>
          <div><strong>Élève :</strong> {nom} {postnom}</div>
          <div><strong>Classe :</strong> {classe}</div>
          {eleve?.matricule && <div><strong>Matricule :</strong> {eleve.matricule}</div>}
        </div>

        {/* Tableau des notes */}
        <div style={{ overflowX: "auto", marginBottom: 24 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#1E293B", color: "white" }}>
                <th style={{ padding: 8, textAlign: "left" }}>Matière</th>
                <th style={{ padding: 8, textAlign: "center" }}>Coeff</th>
                <th style={{ padding: 8, textAlign: "center" }}>Max</th>
                {periodes.map((periode) => (
                  <th key={periode} style={{ padding: 8, textAlign: "center" }}>
                    {prefixePeriode} {periode.split(" ")[0]}
                  </th>
                ))}
                <th style={{ padding: 8, textAlign: "center" }}>Moy. brute</th>
                <th style={{ padding: 8, textAlign: "center", background: "#4F46E5", color: "white" }}>Moy. %</th>
                <th style={{ padding: 8, textAlign: "center" }}>Appréciation</th>
              </tr>
            </thead>
            <tbody>
              {statsParMatiere.map((m) => (
                <tr key={m.matiere} style={{ borderBottom: "1px solid #E2E8F0" }}>
                  <td style={{ padding: 8 }}>{m.matiere}</td>
                  <td style={{ padding: 8, textAlign: "center" }}>{m.coeffCours}</td>
                  <td style={{ padding: 8, textAlign: "center" }}>/{m.baremeCours}</td>
                  {m.moyBrutes.map((mb, idx) => (
                    <td
                      key={idx}
                      style={{
                        padding: 8, textAlign: "center", fontWeight: 600,
                        color: mb === "-" ? "#94A3B8" : "#1E293B",
                      }}
                    >
                      {mb === "-" ? "-" : mb}
                    </td>
                  ))}
                  <td style={{ padding: 8, textAlign: "center", fontWeight: 600 }}>
                    {m.moyAnnuelleBrute !== null ? `${m.moyAnnuelleBrute.toFixed(1)}` : "-"}
                  </td>
                  <td style={{ padding: 8, textAlign: "center", fontWeight: 700, color: "#4F46E5" }}>
                    {m.pourcentage !== null ? `${m.pourcentage.toFixed(1)}%` : "-"}
                  </td>
                  <td style={{ padding: 8, fontSize: 12, color: "#475569" }}>
                    {m.appreciation || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: "#F1F5F9", fontWeight: 700 }}>
                <td colSpan={4 + periodes.length} style={{ padding: 8, textAlign: "right" }}>
                  Moyenne générale annuelle
                </td>
                <td style={{ padding: 8, textAlign: "center", fontSize: 18, color: "#4F46E5" }}>
                  {moyenneGeneralePourcent !== "-" ? `${moyenneGeneralePourcent}%` : "-"}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Absences */}
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <Clock size={20} /> Absences & Retards
          </h3>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#F8FAFC" }}>
                <th style={{ padding: 8, textAlign: "left" }}>Période</th>
                <th style={{ padding: 8, textAlign: "center" }}>Absences</th>
                <th style={{ padding: 8, textAlign: "center" }}>Retards</th>
              </tr>
            </thead>
            <tbody>
              {absencesStats.map((s) => (
                <tr key={s.periode} style={{ borderBottom: "1px solid #E2E8F0" }}>
                  <td style={{ padding: 8 }}>{prefixePeriode} {s.periode.split(" ")[0]}</td>
                  <td style={{ padding: 8, textAlign: "center" }}>{s.absences}</td>
                  <td style={{ padding: 8, textAlign: "center" }}>{s.retards}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Décision du conseil */}
        <div style={{
          marginBottom: 24, padding: "12px 16px", background: "#FEF3C7",
          borderRadius: 8, display: "flex", alignItems: "center", gap: 8,
        }}>
          <AlertTriangle size={20} color="#92400E" />
          <span style={{ fontWeight: 600, color: "#92400E" }}>
            Décision du conseil de classe : {decision}
          </span>
        </div>

        {/* Signatures */}
        <div style={{
          display: "flex", justifyContent: "space-between",
          marginTop: 32, fontSize: 13, color: "#475569",
        }}>
          <div>
            <div>Le Directeur</div>
            <div style={{ marginTop: 24, borderTop: "1px solid #CBD5E1", width: 120 }} />
          </div>
          <div>
            <div>Le Parent / Tuteur</div>
            <div style={{ marginTop: 24, borderTop: "1px solid #CBD5E1", width: 120 }} />
          </div>
          <div>
            <div>Le Titulaire</div>
            <div style={{ marginTop: 24, borderTop: "1px solid #CBD5E1", width: 120 }} />
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 24, fontSize: 12, color: "#64748B" }}>
          Fait à ……………………, le {aujourdHui}
        </div>
      </div>
    </div>
  );
}