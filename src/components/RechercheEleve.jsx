import { useState, useRef, useMemo, useEffect } from "react";
import { useExportPDF } from "../hooks/useExportPDF";
import { useStyles } from "../styles/theme";
import { getFaute } from "../utils";
import {
  Search,
  FileText,
  Download,
  AlertTriangle,
  Filter,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  ArrowLeft,
  School,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

export function RechercheEleve({ punitions, eleves, fautes }) {
  const { dark } = useStyles(); // ✅ mode sombre/clair
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [classeFilter, setClasseFilter] = useState("");
  const [graviteFilter, setGraviteFilter] = useState("toutes");
  const [expandedPunitions, setExpandedPunitions] = useState(false);
  const [copied, setCopied] = useState(false);
  const ficheRef = useRef(null);
  const { exportPDF, isExporting } = useExportPDF();

  // Debounce de la recherche
  const timeoutRef = useRef(null);
  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timeoutRef.current);
  }, [search]);

  // Couleurs adaptatives
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const inputBg = dark ? "#0F172A" : "#F9FAFB";
  const inputText = dark ? "#F1F5F9" : "#1E293B";
  const accent = dark ? "#818CF8" : "#4F46E5";
  const danger = dark ? "#F87171" : "#EF4444";
  const success = dark ? "#34D399" : "#10B981";
  const warning = dark ? "#FBBF24" : "#F59E0B";
  const mutedBg = dark ? "#0F172A" : "#F8FAFC";
  const shadow = dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)";
  const borderLight = dark ? "rgba(255,255,255,0.05)" : "#F1F5F9";
  const buttonSecondaryBg = dark ? "#334155" : "#F1F5F9";
  const buttonSecondaryText = dark ? "#F1F5F9" : "#1E293B";

  const classes = useMemo(() => [...new Set(eleves.map((e) => e.classe))].sort(), [eleves]);

  const filtered = useMemo(() => {
    return eleves.filter((e) => {
      const matchSearch =
        debouncedSearch.trim().length > 1
          ? `${e.nom} ${e.postnom}`.toLowerCase().includes(debouncedSearch.toLowerCase())
          : true;
      const matchClasse = classeFilter ? e.classe === classeFilter : true;
      return matchSearch && matchClasse;
    });
  }, [eleves, debouncedSearch, classeFilter]);

  const eleveP = useMemo(() => {
    if (!selected) return [];
    let list = punitions
      .filter((p) => p.idEleve === selected._id)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    if (graviteFilter !== "toutes") {
      list = list.filter((p) => getFaute(fautes, p.idFaute)?.gravite === graviteFilter);
    }
    return list;
  }, [selected, punitions, fautes, graviteFilter]);

  const hasGrave = eleveP.some(
    (p) => getFaute(fautes, p.idFaute)?.gravite === "Grave"
  );

  const counts = useMemo(() => {
    if (!selected) return { Légère: 0, Moyenne: 0, Grave: 0 };
    const all = punitions.filter(p => p.idEleve === selected._id);
    const c = { Légère: 0, Moyenne: 0, Grave: 0 };
    all.forEach(p => {
      const g = getFaute(fautes, p.idFaute)?.gravite;
      if (g) c[g] = (c[g] || 0) + 1;
    });
    return c;
  }, [selected, punitions, fautes]);

  const handleGeneratePDF = async () => {
    try {
      await exportPDF(ficheRef, `Fiche_Conduite_${selected.nom}_${selected.postnom}.pdf`);
      toast.success("PDF généré avec succès");
    } catch (err) {
      toast.error("Erreur lors de la génération du PDF");
    }
  };

  const handleCopyFiche = async () => {
    if (!selected) return;
    const text = `FICHE DE CONDUITE\n\nÉlève: ${selected.nom} ${selected.postnom}\nClasse: ${selected.classe}\n\nRécapitulatif:\n- Total fautes: ${eleveP.length}\n- Fautes graves: ${eleveP.filter(p => getFaute(fautes, p.idFaute)?.gravite === "Grave").length}\n\nDétails:\n${eleveP.map(p => `${p.date} - ${getFaute(fautes, p.idFaute)?.libelle} (${getFaute(fautes, p.idFaute)?.gravite}) - Sanction: ${p.sanction}`).join("\n")}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Fiche copiée dans le presse-papiers");
    } catch {
      toast.error("Impossible de copier");
    }
  };

  const handleBack = () => {
    setSelected(null);
    setExpandedPunitions(false);
    setGraviteFilter("toutes");
  };

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 16px" }}>
      {/* En-tête */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, color: textPrimary, margin: 0 }}>
          Dossier élève
        </h2>
        <p style={{ color: textSecondary, marginTop: 4, fontSize: 14 }}>
          Recherchez un élève puis exportez sa fiche de conduite.
        </p>
      </div>

      {/* Phase de sélection */}
      {!selected ? (
        <>
          <div style={{
            background: cardBg,
            borderRadius: 16,
            padding: 20,
            boxShadow: shadow,
            marginBottom: 24,
            border: `1px solid ${cardBorder}`,
          }}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              {/* Recherche */}
              <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
                <Search size={18} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: textSecondary }} />
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
                    border: `1px solid ${cardBorder}`,
                    borderRadius: 10,
                    fontSize: 14,
                    outline: "none",
                    background: inputBg,
                    color: inputText,
                  }}
                />
              </div>

              {/* Filtre par classe */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 150 }}>
                <Filter size={16} color={textSecondary} />
                <select
                  value={classeFilter}
                  onChange={(e) => setClasseFilter(e.target.value)}
                  style={{
                    padding: "10px 14px",
                    border: `1px solid ${cardBorder}`,
                    borderRadius: 8,
                    fontSize: 14,
                    outline: "none",
                    background: inputBg,
                    color: inputText,
                    flex: 1,
                  }}
                >
                  <option value="">Toutes les classes</option>
                  {classes.map((c) => <option key={c} value={c} style={{ background: dark ? "#1E293B" : "#FFF" }}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Résultats */}
            {(debouncedSearch.length > 1 || classeFilter) && filtered.length > 0 && (
              <div style={{ marginTop: 12, border: `1px solid ${cardBorder}`, borderRadius: 10, overflow: "hidden" }}>
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
                      borderBottom: `1px solid ${borderLight}`,
                      background: "transparent",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={(ev) => (ev.currentTarget.style.background = dark ? "#26334D" : "#F8FAFC")}
                    onMouseLeave={(ev) => (ev.currentTarget.style.background = "transparent")}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {e.nom} {e.postnom}
                      </div>
                      <div style={{ fontSize: 12, color: textSecondary }}>Classe {e.classe}</div>
                    </div>
                    <span style={{ color: accent, fontSize: 13, fontWeight: 500, marginLeft: 8, whiteSpace: "nowrap" }}>
                      {punitions.filter((p) => p.idEleve === e._id).length} faute(s)
                    </span>
                  </div>
                ))}
              </div>
            )}

            {(debouncedSearch.length > 1 || classeFilter) && filtered.length === 0 && (
              <div style={{ marginTop: 12, color: textSecondary, fontSize: 13, textAlign: "center" }}>
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
              background: cardBg,
              border: `1px solid ${cardBorder}`,
              borderRadius: 8,
              color: accent,
              fontWeight: 500,
              cursor: "pointer",
              marginBottom: 20,
            }}
          >
            <ArrowLeft size={16} /> Retour à la liste
          </button>

          {/* Filtre par gravité */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            {["toutes", "Légère", "Moyenne", "Grave"].map(g => (
              <button
                key={g}
                onClick={() => setGraviteFilter(g)}
                style={{
                  padding: "6px 12px",
                  border: `1px solid ${graviteFilter === g ? accent : cardBorder}`,
                  borderRadius: 20,
                  background: graviteFilter === g ? (dark ? "#312E81" : "#EEF2FF") : "transparent",
                  color: graviteFilter === g ? accent : textSecondary,
                  fontWeight: 500,
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                {g === "toutes" ? "Toutes" : g}
              </button>
            ))}
          </div>

          {/* Fiche de conduite */}
          <div
            ref={ficheRef}
            style={{
              background: cardBg,
              borderRadius: 16,
              padding: 24,
              boxShadow: shadow,
              marginBottom: 24,
              border: `1px solid ${dark ? "#334155" : "#EEF2FF"}`,
              color: textPrimary,
            }}
          >
            <div style={{ textAlign: "center", marginBottom: 20, paddingBottom: 16, borderBottom: `2px solid ${dark ? "#334155" : "#EEF2FF"}` }}>
              <FileText size={28} color={accent} style={{ marginBottom: 8 }} />
              <div style={{ fontSize: 22, fontWeight: 800, color: textPrimary }}>FICHE DE CONDUITE</div>
              <div style={{ fontSize: 12, color: textSecondary }}>Conseil de discipline — {new Date().getFullYear()}</div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: textSecondary, textTransform: "uppercase", fontWeight: 600, marginBottom: 4 }}>Élève</div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{selected.nom} {selected.postnom}</div>
              <div style={{ fontSize: 13, color: textSecondary }}>Classe : {selected.classe}</div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: textSecondary, textTransform: "uppercase", fontWeight: 600, marginBottom: 8 }}>Récapitulatif</div>
              <div style={{ background: mutedBg, borderRadius: 10, padding: "12px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 14, color: textPrimary }}>Total fautes</span>
                  <span style={{ fontWeight: 700, color: textPrimary }}>{eleveP.length}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{ fontSize: 14, color: textPrimary }}>Fautes graves</span>
                  <span style={{ fontWeight: 700, color: danger }}>{eleveP.filter(p => getFaute(fautes, p.idFaute)?.gravite === "Grave").length}</span>
                </div>
                <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                  {Object.entries(counts).map(([gravite, count]) => {
                    if (count === 0) return null;
                    const total = eleveP.length || 1;
                    const width = (count / total) * 100;
                    return (
                      <div key={gravite} style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, color: textSecondary, marginBottom: 4 }}>{gravite}</div>
                        <div style={{ height: 8, background: dark ? "#334155" : "#E2E8F0", borderRadius: 4, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${width}%`, background: gravite === "Grave" ? danger : gravite === "Moyenne" ? warning : success, borderRadius: 4 }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Punitions (limitées dans la fiche exportée) */}
            <div style={{ marginBottom: 16 }}>
              {eleveP.slice(0, 3).map((p, i) => {
                const faute = getFaute(fautes, p.idFaute);
                return (
                  <div key={i} style={{ fontSize: 13, color: textPrimary, padding: "8px 0", borderTop: `1px solid ${borderLight}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>{p.date} — {faute?.libelle} ({faute?.gravite})</span>
                    <span style={{ color: danger, fontWeight: 500, fontSize: 12 }}>{p.sanction}</span>
                  </div>
                );
              })}
              {eleveP.length > 3 && <div style={{ fontSize: 12, color: textSecondary, marginTop: 8 }}>... et {eleveP.length - 3} autre(s) punition(s)</div>}
            </div>

            {hasGrave && (
              <div style={{ background: dark ? "#7F1D1D" : "#FEF2F2", color: dark ? "#F87171" : "#B91C1C", padding: "10px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
                <AlertTriangle size={16} />
                Recommandé pour conseil de discipline
              </div>
            )}
          </div>

          {/* Boutons d'action */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 32 }}>
            <button
              onClick={handleGeneratePDF}
              disabled={isExporting}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "12px 24px",
                background: isExporting ? "#A5B4FC" : accent,
                color: "white",
                border: "none",
                borderRadius: 10,
                fontWeight: 600,
                fontSize: 14,
                cursor: isExporting ? "not-allowed" : "pointer",
                boxShadow: isExporting ? "none" : `0 4px 12px ${dark ? "rgba(129,140,248,0.4)" : "rgba(79,70,229,0.2)"}`,
              }}
            >
              <Download size={18} />
              {isExporting ? "Génération..." : "Exporter la fiche"}
            </button>
            <button
              onClick={handleCopyFiche}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "12px 24px",
                background: buttonSecondaryBg,
                color: buttonSecondaryText,
                border: "none",
                borderRadius: 10,
                fontWeight: 500,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              {copied ? <Check size={18} color={success} /> : <Copy size={18} />}
              {copied ? "Copié !" : "Copier la fiche"}
            </button>
          </div>

          {/* Historique complet (extensible) */}
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: textPrimary }}>
              Historique complet
            </h3>
            <div style={{ display: "grid", gap: 8 }}>
              {eleveP.slice(0, expandedPunitions ? eleveP.length : 5).map((p) => {
                const faute = getFaute(fautes, p.idFaute);
                return (
                  <div key={p._id} style={{ background: cardBg, borderRadius: 12, padding: "12px 16px", boxShadow: shadow, border: `1px solid ${cardBorder}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: textPrimary }}>{faute?.libelle}</div>
                      <span style={{ background: faute?.gravite === "Grave" ? (dark ? "#7F1D1D" : "#FEE2E2") : (dark ? "#78350F" : "#FEF3C7"), color: faute?.gravite === "Grave" ? (dark ? "#F87171" : "#B91C1C") : (dark ? "#FBBF24" : "#92400E"), padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                        {faute?.gravite}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: textSecondary, marginBottom: 4 }}>
                      {p.date} • {p.disciplinaire}
                    </div>
                    <div style={{ fontSize: 13, color: textPrimary }}>Sanction : {p.sanction}</div>
                    {p.commentaire && <div style={{ fontSize: 12, color: textSecondary, marginTop: 4, fontStyle: "italic" }}>"{p.commentaire}"</div>}
                  </div>
                );
              })}
            </div>
            {eleveP.length > 5 && !expandedPunitions && (
              <button
                onClick={() => setExpandedPunitions(true)}
                style={{ background: "none", border: "none", color: accent, cursor: "pointer", padding: 0, marginTop: 12, display: "flex", alignItems: "center", gap: 4, fontSize: 14, fontWeight: 500 }}
              >
                <ChevronDown size={16} />
                Voir les {eleveP.length - 5} autre(s) punition(s)
              </button>
            )}
            {expandedPunitions && eleveP.length > 5 && (
              <button
                onClick={() => setExpandedPunitions(false)}
                style={{ background: "none", border: "none", color: accent, cursor: "pointer", padding: 0, marginTop: 12, display: "flex", alignItems: "center", gap: 4, fontSize: 14, fontWeight: 500 }}
              >
                <ChevronUp size={16} />
                Réduire
              </button>
            )}
            {eleveP.length === 0 && <p style={{ color: textSecondary, fontSize: 14 }}>Aucun antécédent disciplinaire.</p>}
          </div>
        </>
      )}
    </div>
  );
}