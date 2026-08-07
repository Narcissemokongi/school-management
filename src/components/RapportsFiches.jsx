import { useState, useRef } from "react";
import { useExportPDF } from "../hooks/useExportPDF";
import { useStyles } from "../styles/theme";
import { getFaute } from "../utils";
import {
  Search, FileText, Download, AlertTriangle,
  Filter, ChevronLeft, ChevronDown, ChevronUp, School, ArrowLeft
} from "lucide-react";
import toast from "react-hot-toast";

export function RapportsFiches({ punitions, eleves, fautes }) {
  const { S } = useStyles();
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [classeFilter, setClasseFilter] = useState(""); // nouveau filtre par classe
  const [expandedPunitions, setExpandedPunitions] = useState(false); // afficher plus de 3 punitions
  const ficheRef = useRef(null);
  const { exportPDF, isExporting } = useExportPDF();

  // Liste des classes uniques pour le filtre
  const classes = [...new Set(eleves.map((e) => e.classe))].sort();

  // Filtrage combiné : recherche textuelle + classe
  const filtered = eleves.filter((e) => {
    const matchSearch =
      search.length > 1
        ? `${e.nom} ${e.postnom}`.toLowerCase().includes(search.toLowerCase())
        : true;
    const matchClasse = classeFilter ? e.classe === classeFilter : true;
    return matchSearch && matchClasse;
  });

  // Punitions de l'élève sélectionné
  const eleveP = selected
    ? punitions
        .filter((p) => p.idEleve === selected._id)
        .sort((a, b) => new Date(b.date) - new Date(a.date))
    : [];

  const hasGrave = eleveP.some(
    (p) => getFaute(fautes, p.idFaute)?.gravite === "Grave"
  );

  // Export PDF via le hook
  const handleGeneratePDF = async () => {
    try {
      await exportPDF(ficheRef, `Fiche_Conduite_${selected.nom}_${selected.postnom}.pdf`);
      toast.success("PDF généré avec succès");
    } catch (err) {
      toast.error("Erreur lors de la génération du PDF");
    }
  };

  // Réinitialiser la sélection et les filtres
  const handleBack = () => {
    setSelected(null);
    setExpandedPunitions(false);
  };

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 16px" }}>
      {/* En-tête */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, color: "#1E293B", margin: 0 }}>
          Rapports & Fiches
        </h2>
        <p style={{ color: "#64748B", marginTop: 4, fontSize: 14 }}>
          Générer les fiches de conduite des élèves
        </p>
      </div>

      {/* Si aucun élève sélectionné : affichage de la recherche et des filtres */}
      {!selected ? (
        <>
          <div
            style={{
              background: "#FFF",
              borderRadius: 16,
              padding: 20,
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              marginBottom: 24,
            }}
          >
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              {/* Recherche textuelle */}
              <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
                <Search
                  size={18}
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#9CA3AF",
                  }}
                />
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setSelected(null);
                  }}
                  placeholder="Rechercher un élève..."
                  style={{
                    width: "100%",
                    padding: "10px 14px 10px 42px",
                    border: "1px solid #E2E8F0",
                    borderRadius: 10,
                    fontSize: 14,
                    outline: "none",
                    background: "#F9FAFB",
                  }}
                />
              </div>

              {/* Filtre par classe */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 150 }}>
                <Filter size={16} color="#64748B" />
                <select
                  value={classeFilter}
                  onChange={(e) => setClasseFilter(e.target.value)}
                  style={{
                    padding: "10px 14px",
                    border: "1px solid #E2E8F0",
                    borderRadius: 8,
                    fontSize: 14,
                    outline: "none",
                    background: "#F8FAFC",
                    flex: 1,
                  }}
                >
                  <option value="">Toutes les classes</option>
                  {classes.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Résultats de recherche */}
            {(search.length > 1 || classeFilter) && filtered.length > 0 && (
              <div
                style={{
                  marginTop: 12,
                  border: "1px solid #E2E8F0",
                  borderRadius: 10,
                  overflow: "hidden",
                }}
              >
                {filtered.map((e) => (
                  <div
                    key={e._id}
                    onClick={() => {
                      setSelected(e);
                      setSearch(`${e.nom} ${e.postnom}`);
                    }}
                    style={{
                      padding: "12px 14px",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderBottom: "1px solid #F1F5F9",
                      background: "transparent",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={(ev) => (ev.currentTarget.style.background = "#F8FAFC")}
                    onMouseLeave={(ev) => (ev.currentTarget.style.background = "transparent")}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>
                        {e.nom} {e.postnom}
                      </div>
                      <div style={{ fontSize: 12, color: "#64748B" }}>
                        Classe {e.classe}
                      </div>
                    </div>
                    <ChevronLeft size={16} color="#4F46E5" style={{ transform: "rotate(180deg)" }} />
                  </div>
                ))}
              </div>
            )}

            {((search.length > 1 || classeFilter) && filtered.length === 0) && (
              <div style={{ marginTop: 12, color: "#64748B", fontSize: 13, textAlign: "center" }}>
                Aucun élève trouvé.
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Bouton retour */}
          <button
            onClick={handleBack}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              background: "#FFF",
              border: "1px solid #E2E8F0",
              borderRadius: 8,
              color: "#4F46E5",
              fontWeight: 500,
              cursor: "pointer",
              marginBottom: 20,
            }}
          >
            <ArrowLeft size={16} /> Retour à la liste
          </button>

          {/* Fiche de conduite (contenu à exporter) */}
          <div
            ref={ficheRef}
            style={{
              background: "#FFF",
              borderRadius: 16,
              padding: 24,
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              marginBottom: 24,
              border: "1px solid #EEF2FF",
            }}
          >
            {/* En-tête du document */}
            <div
              style={{
                textAlign: "center",
                marginBottom: 20,
                paddingBottom: 16,
                borderBottom: "2px solid #EEF2FF",
              }}
            >
              <FileText size={28} color="#4F46E5" style={{ marginBottom: 8 }} />
              <div style={{ fontSize: 22, fontWeight: 800, color: "#1E293B" }}>
                FICHE DE CONDUITE
              </div>
              <div style={{ fontSize: 12, color: "#64748B" }}>
                Conseil de discipline — {new Date().getFullYear()}
              </div>
            </div>

            {/* Infos élève */}
            <div style={{ marginBottom: 20 }}>
              <div
                style={{
                  fontSize: 11,
                  color: "#94A3B8",
                  textTransform: "uppercase",
                  fontWeight: 600,
                  marginBottom: 4,
                }}
              >
                Élève
              </div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>
                {selected.nom} {selected.postnom}
              </div>
              <div style={{ fontSize: 13, color: "#64748B" }}>
                Classe : {selected.classe}
              </div>
            </div>

            {/* Récapitulatif */}
            <div style={{ marginBottom: 20 }}>
              <div
                style={{
                  fontSize: 11,
                  color: "#94A3B8",
                  textTransform: "uppercase",
                  fontWeight: 600,
                  marginBottom: 8,
                }}
              >
                Récapitulatif
              </div>
              <div
                style={{
                  background: "#F8FAFC",
                  borderRadius: 10,
                  padding: "12px 16px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 6,
                  }}
                >
                  <span style={{ fontSize: 14 }}>Total fautes</span>
                  <span style={{ fontWeight: 700 }}>{eleveP.length}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 14 }}>Fautes graves</span>
                  <span style={{ fontWeight: 700, color: "#EF4444" }}>
                    {eleveP.filter((p) => getFaute(fautes, p.idFaute)?.gravite === "Grave").length}
                  </span>
                </div>
              </div>
            </div>

            {/* Liste des punitions (extensible) */}
            <div style={{ marginBottom: 16 }}>
              {eleveP.slice(0, expandedPunitions ? eleveP.length : 3).map((p, i) => {
                const faute = getFaute(fautes, p.idFaute);
                return (
                  <div
                    key={i}
                    style={{
                      fontSize: 13,
                      color: "#475569",
                      padding: "8px 0",
                      borderTop: "1px solid #F1F5F9",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span>
                      {p.date} — {faute?.libelle} ({faute?.gravite})
                    </span>
                    <span style={{ color: "#EF4444", fontWeight: 500, fontSize: 12 }}>
                      {p.sanction}
                    </span>
                  </div>
                );
              })}
              {eleveP.length > 3 && !expandedPunitions && (
                <button
                  onClick={() => setExpandedPunitions(true)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#4F46E5",
                    cursor: "pointer",
                    fontSize: 12,
                    padding: 0,
                    marginTop: 8,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <ChevronDown size={14} />
                  Voir les {eleveP.length - 3} autre(s) punition(s)
                </button>
              )}
              {expandedPunitions && eleveP.length > 3 && (
                <button
                  onClick={() => setExpandedPunitions(false)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#4F46E5",
                    cursor: "pointer",
                    fontSize: 12,
                    padding: 0,
                    marginTop: 8,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <ChevronUp size={14} />
                  Réduire
                </button>
              )}
            </div>

            {/* Recommandation conseil de discipline */}
            {hasGrave && (
              <div
                style={{
                  background: "#FEF2F2",
                  color: "#B91C1C",
                  padding: "10px 14px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 12,
                }}
              >
                <AlertTriangle size={16} />
                Recommandé pour conseil de discipline
              </div>
            )}
          </div>

          {/* Bouton d'export PDF (utilise le hook) */}
          <button
            onClick={handleGeneratePDF}
            disabled={isExporting}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 24px",
              background: isExporting ? "#A5B4FC" : "#4F46E5",
              color: "#FFFFFF",
              border: "none",
              borderRadius: 10,
              fontWeight: 600,
              fontSize: 14,
              cursor: isExporting ? "not-allowed" : "pointer",
              boxShadow: isExporting ? "none" : "0 4px 12px rgba(79,70,229,0.2)",
              transition: "background 0.2s",
            }}
          >
            <Download size={18} />
            {isExporting ? "Génération du PDF..." : "Exporter en PDF"}
          </button>
        </>
      )}
    </div>
  );
}