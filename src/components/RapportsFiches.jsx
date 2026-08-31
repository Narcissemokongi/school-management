import { useState, useRef, useMemo } from "react";
import { useExportPDF } from "@/hooks/useExportPDF";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile"; // <-- Import du hook
import { getFaute } from "../utils";
import {
  Search, FileText, Download, AlertTriangle,
  Filter, ChevronLeft, ChevronDown, ChevronUp, School, ArrowLeft,
  Copy, Check, X, Users, User, ClipboardList, BarChart3,
  ArrowUpDown, FileSpreadsheet, Loader,
} from "lucide-react";
import toast from "react-hot-toast";

export function RapportsFiches({ punitions, eleves, fautes }) {
  const { dark } = useStyles();
  const isMobile = useIsMobile(); // Détection mobile
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [classeFilter, setClasseFilter] = useState("");
  const [graviteFilter, setGraviteFilter] = useState("toutes");
  const [tri, setTri] = useState({ key: "nom", direction: "asc" });
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [expandedPunitions, setExpandedPunitions] = useState(false);
  const [copied, setCopied] = useState(false);
  const ficheRef = useRef(null);
  const { exportPDF, isExporting } = useExportPDF();

  const isLoading = eleves === undefined || punitions === undefined || fautes === undefined;
  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 300 }}>
        <Loader size={40} className="animate-spin" style={{ color: dark ? "#818CF8" : "#4F46E5" }} />
      </div>
    );
  }

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

  const fautesMap = useMemo(() => {
    const map = {};
    fautes.forEach((f) => { map[f._id] = f; });
    return map;
  }, [fautes]);

  const getFauteInfo = (idFaute) => fautesMap[idFaute] || { libelle: "Inconnue", gravite: "Légère" };

  const stats = useMemo(() => {
    const totalEleves = eleves.length;
    const totalPunitions = punitions.length;
    const fautesGraves = punitions.filter(p => getFauteInfo(p.idFaute)?.gravite === "Grave").length;
    const avgPunitions = totalEleves ? (totalPunitions / totalEleves).toFixed(1) : 0;
    const elevesAvecGrave = eleves.filter(e => {
      return punitions.some(p => p.idEleve === e._id && getFauteInfo(p.idFaute)?.gravite === "Grave");
    }).length;
    return { totalEleves, totalPunitions, fautesGraves, avgPunitions, elevesAvecGrave };
  }, [eleves, punitions, fautesMap]);

  const classes = useMemo(() => [...new Set(eleves.map((e) => e.classe))].sort(), [eleves]);

  const filtered = useMemo(() => {
    let list = eleves.filter((e) => {
      const matchSearch =
        search.length > 1
          ? `${e.nom} ${e.postnom}`.toLowerCase().includes(search.toLowerCase())
          : true;
      const matchClasse = classeFilter ? e.classe === classeFilter : true;

      let matchGravite = true;
      if (graviteFilter !== "toutes") {
        matchGravite = punitions.some(
          (p) => p.idEleve === e._id && getFauteInfo(p.idFaute)?.gravite === graviteFilter
        );
      }
      return matchSearch && matchClasse && matchGravite;
    });
    return list;
  }, [eleves, search, classeFilter, graviteFilter, punitions, fautesMap]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      const key = tri.key;
      let valA, valB;
      if (key === "nom") {
        valA = `${a.nom} ${a.postnom}`.toLowerCase();
        valB = `${b.nom} ${b.postnom}`.toLowerCase();
      } else if (key === "classe") {
        valA = a.classe.toLowerCase();
        valB = b.classe.toLowerCase();
      } else if (key === "nbFautes") {
        const nbA = punitions.filter(p => p.idEleve === a._id).length;
        const nbB = punitions.filter(p => p.idEleve === b._id).length;
        valA = nbA; valB = nbB;
      }
      if (valA < valB) return tri.direction === "asc" ? -1 : 1;
      if (valA > valB) return tri.direction === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [filtered, tri, punitions]);

  const totalPages = Math.ceil(sorted.length / pageSize);
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  const eleveP = useMemo(() => {
    if (!selected) return [];
    let list = punitions
      .filter((p) => p.idEleve === selected._id)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    if (graviteFilter !== "toutes") {
      list = list.filter((p) => getFauteInfo(p.idFaute)?.gravite === graviteFilter);
    }
    return list;
  }, [selected, punitions, fautesMap, graviteFilter]);

  const hasGrave = eleveP.some(
    (p) => getFauteInfo(p.idFaute)?.gravite === "Grave"
  );

  const counts = useMemo(() => {
    if (!selected) return { "Légère": 0, "Moyenne": 0, "Grave": 0 };
    const all = punitions.filter(p => p.idEleve === selected._id);
    const c = { "Légère": 0, "Moyenne": 0, "Grave": 0 };
    all.forEach(p => {
      const g = getFauteInfo(p.idFaute)?.gravite;
      if (g) c[g] = (c[g] || 0) + 1;
    });
    return c;
  }, [selected, punitions, fautesMap]);

  const conductScore = useMemo(() => {
    if (!selected) return 100;
    const all = punitions.filter(p => p.idEleve === selected._id);
    let score = 100;
    all.forEach(p => {
      const g = getFauteInfo(p.idFaute)?.gravite;
      if (g === "Légère") score -= 2;
      else if (g === "Moyenne") score -= 5;
      else if (g === "Grave") score -= 10;
    });
    return Math.max(0, Math.min(100, score));
  }, [selected, punitions, fautesMap]);

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
    const text = `FICHE DE CONDUITE\n\nÉlève: ${selected.nom} ${selected.postnom} ${selected.prenom || ''}\nClasse: ${selected.classe}\nMatricule: ${selected.code || 'N/A'}\n\nRécapitulatif:\n- Total fautes: ${eleveP.length}\n- Fautes graves: ${eleveP.filter(p => getFauteInfo(p.idFaute)?.gravite === "Grave").length}\n\nDétails:\n${eleveP.map(p => `${p.date} - ${getFauteInfo(p.idFaute)?.libelle} (${getFauteInfo(p.idFaute)?.gravite}) - Sanction: ${p.sanction}`).join("\n")}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Fiche copiée dans le presse-papiers");
    } catch {
      toast.error("Impossible de copier");
    }
  };

  const handleExportCSV = () => {
    if (sorted.length === 0) {
      toast.error("Aucune donnée à exporter");
      return;
    }
    const header = ["Nom", "Postnom", "Prénom", "Classe", "Matricule", "Nombre de fautes", "Fautes graves"];
    const rows = sorted.map(e => {
      const nb = punitions.filter(p => p.idEleve === e._id).length;
      const grave = punitions.filter(p => p.idEleve === e._id && getFauteInfo(p.idFaute)?.gravite === "Grave").length;
      return [e.nom, e.postnom, e.prenom || "", e.classe, e.code || "", nb, grave];
    });
    const csvContent = [header, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "rapport_eleves.csv";
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success("Export CSV réussi");
  };

  const handleBack = () => {
    setSelected(null);
    setExpandedPunitions(false);
    setGraviteFilter("toutes");
    setPage(1);
  };

  const handleTri = (key) => {
    setTri(prev => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc"
    }));
  };

  const sortIcon = (key) => {
    if (tri.key !== key) return <ArrowUpDown size={14} />;
    return tri.direction === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  };

  // Styles adaptatifs
  const containerPadding = isMobile ? "16px 12px" : "24px 16px";
  const titleSize = isMobile ? 22 : 28;
  const subtitleSize = isMobile ? 13 : 14;
  const headerMarginBottom = isMobile ? 20 : 32;
  const statGridCols = isMobile ? "1fr 1fr" : "repeat(auto-fit, minmax(180px, 1fr))";
  const statGap = isMobile ? 8 : 16;
  const filterContainerPadding = isMobile ? 14 : 20;
  const filterFlexDirection = isMobile ? "column" : "row";
  const filterAlignItems = isMobile ? "stretch" : "center";
  const filterGap = isMobile ? 8 : 12;
  const inputPadding = isMobile ? "12px 14px" : "10px 14px";
  const inputFontSize = isMobile ? 16 : 14;
  const selectPadding = isMobile ? "12px 14px" : "10px 14px";
  const selectFontSize = isMobile ? 16 : 14;
  const tableMinWidth = isMobile ? 500 : 700;
  const tableFontSize = isMobile ? 12 : 14;
  const actionButtonPadding = isMobile ? "12px 16px" : "10px 16px";
  const actionButtonFontSize = isMobile ? 16 : 14;
  const actionButtonsFlexDirection = isMobile ? "column" : "row";
  const actionButtonsGap = isMobile ? 8 : 12;
  const ficheCardPadding = isMobile ? 16 : 24;
  const ficheInfoGridColumns = isMobile ? "1fr" : "repeat(auto-fit, minmax(200px, 1fr))";
  const ficheTitleSize = isMobile ? 20 : 22;
  const ficheTextSize = isMobile ? 13 : 14;
  const paginationButtonPadding = isMobile ? "10px 16px" : "8px 16px";
  const paginationFontSize = isMobile ? 14 : 14;
  const backButtonPadding = isMobile ? "10px 12px" : "8px 16px";
  const backButtonFontSize = isMobile ? 14 : 14;

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: containerPadding }}>
      {/* En-tête */}
      <div style={{ marginBottom: headerMarginBottom }}>
        <h2 style={{ fontSize: titleSize, fontWeight: 700, color: textPrimary, margin: 0 }}>
          Rapports & Fiches
        </h2>
        <p style={{ color: textSecondary, marginTop: 4, fontSize: subtitleSize }}>
          Générer les fiches de conduite des élèves
        </p>
      </div>

      {!selected ? (
        <>
          {/* Cartes statistiques */}
          <div style={{
            display: "grid",
            gridTemplateColumns: statGridCols,
            gap: statGap,
            marginBottom: isMobile ? 16 : 24,
          }}>
            <StatCard icon={<Users size={isMobile ? 20 : 24} />} value={stats.totalEleves} label="Élèves" color={accent} isMobile={isMobile} />
            <StatCard icon={<ClipboardList size={isMobile ? 20 : 24} />} value={stats.totalPunitions} label="Punitions" color={warning} isMobile={isMobile} />
            <StatCard icon={<AlertTriangle size={isMobile ? 20 : 24} />} value={stats.fautesGraves} label="Fautes graves" color={danger} isMobile={isMobile} />
            <StatCard icon={<BarChart3 size={isMobile ? 20 : 24} />} value={stats.avgPunitions} label="Moy. punitions/élève" color={success} isMobile={isMobile} />
          </div>

          {/* Filtres et recherche */}
          <div style={{
            background: cardBg,
            borderRadius: 16,
            padding: filterContainerPadding,
            boxShadow: shadow,
            marginBottom: isMobile ? 16 : 24,
            border: `1px solid ${cardBorder}`,
          }}>
            <div style={{ display: "flex", gap: filterGap, alignItems: filterAlignItems, flexWrap: "wrap", flexDirection: filterFlexDirection }}>
              <div style={{ position: "relative", flex: 1, minWidth: isMobile ? "100%" : 200 }}>
                <Search size={18} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: dark ? "#94A3B8" : "#9CA3AF" }} />
                <input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Rechercher un élève..."
                  style={{
                    width: "100%",
                    padding: inputPadding,
                    border: `1px solid ${cardBorder}`,
                    borderRadius: 10,
                    fontSize: inputFontSize,
                    outline: "none",
                    background: inputBg,
                    color: inputText,
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: isMobile ? "100%" : 150 }}>
                <Filter size={isMobile ? 16 : 16} color={textSecondary} />
                <select
                  value={classeFilter}
                  onChange={(e) => { setClasseFilter(e.target.value); setPage(1); }}
                  style={{
                    padding: selectPadding,
                    border: `1px solid ${cardBorder}`,
                    borderRadius: 8,
                    fontSize: selectFontSize,
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

              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: isMobile ? "100%" : 150 }}>
                <Filter size={isMobile ? 16 : 16} color={textSecondary} />
                <select
                  value={graviteFilter}
                  onChange={(e) => { setGraviteFilter(e.target.value); setPage(1); }}
                  style={{
                    padding: selectPadding,
                    border: `1px solid ${cardBorder}`,
                    borderRadius: 8,
                    fontSize: selectFontSize,
                    outline: "none",
                    background: inputBg,
                    color: inputText,
                    flex: 1,
                  }}
                >
                  <option value="toutes">Toutes gravités</option>
                  <option value="Légère">Légère</option>
                  <option value="Moyenne">Moyenne</option>
                  <option value="Grave">Grave</option>
                </select>
              </div>

              <button
                onClick={handleExportCSV}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  padding: actionButtonPadding,
                  background: dark ? "#334155" : "#F1F5F9",
                  color: textPrimary,
                  border: "none",
                  borderRadius: 10,
                  fontWeight: 500,
                  cursor: "pointer",
                  fontSize: actionButtonFontSize,
                  width: isMobile ? "100%" : "auto",
                }}
              >
                <FileSpreadsheet size={16} />
                CSV
              </button>
            </div>
          </div>

          {/* Tableau des élèves */}
          <div style={{
            background: cardBg,
            borderRadius: 16,
            boxShadow: shadow,
            overflow: "auto",
            border: `1px solid ${cardBorder}`,
          }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: tableMinWidth, fontSize: tableFontSize }}>
              <thead>
                <tr style={{ background: dark ? "#0F172A" : "#F8FAFC" }}>
                  <th
                    onClick={() => handleTri("nom")}
                    style={{ padding: isMobile ? "10px 8px" : "12px 16px", textAlign: "left", cursor: "pointer", color: textSecondary, fontSize: isMobile ? 12 : 13, fontWeight: 600 }}
                  >
                    Élève {sortIcon("nom")}
                  </th>
                  <th
                    onClick={() => handleTri("classe")}
                    style={{ padding: isMobile ? "10px 8px" : "12px 16px", textAlign: "left", cursor: "pointer", color: textSecondary, fontSize: isMobile ? 12 : 13, fontWeight: 600 }}
                    className={isMobile ? "hide-on-mobile" : ""}
                  >
                    Classe {sortIcon("classe")}
                  </th>
                  <th
                    onClick={() => handleTri("nbFautes")}
                    style={{ padding: isMobile ? "10px 8px" : "12px 16px", textAlign: "center", cursor: "pointer", color: textSecondary, fontSize: isMobile ? 12 : 13, fontWeight: 600 }}
                  >
                    Fautes {sortIcon("nbFautes")}
                  </th>
                  <th style={{ padding: isMobile ? "10px 8px" : "12px 16px", textAlign: "center", color: textSecondary, fontSize: isMobile ? 12 : 13, fontWeight: 600 }} className={isMobile ? "hide-on-mobile" : ""}>
                    Gravité
                  </th>
                  <th style={{ padding: isMobile ? "10px 8px" : "12px 16px", textAlign: "center", color: textSecondary, fontSize: isMobile ? 12 : 13, fontWeight: 600 }}>
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((e) => {
                  const nbFautes = punitions.filter(p => p.idEleve === e._id).length;
                  const grave = punitions.some(p => p.idEleve === e._id && getFauteInfo(p.idFaute)?.gravite === "Grave");
                  return (
                    <tr key={e._id} style={{ borderBottom: `1px solid ${borderLight}` }}>
                      <td style={{ padding: isMobile ? "10px 8px" : "12px 16px", fontWeight: 500, color: textPrimary }}>{e.nom} {e.postnom}</td>
                      <td style={{ padding: isMobile ? "10px 8px" : "12px 16px", color: textSecondary }} className={isMobile ? "hide-on-mobile" : ""}>{e.classe}</td>
                      <td style={{ padding: isMobile ? "10px 8px" : "12px 16px", textAlign: "center", color: textPrimary }}>{nbFautes}</td>
                      <td style={{ padding: isMobile ? "10px 8px" : "12px 16px", textAlign: "center" }} className={isMobile ? "hide-on-mobile" : ""}>
                        {grave ? (
                          <span style={{ background: dark ? "#7F1D1D" : "#FEE2E2", color: dark ? "#F87171" : "#B91C1C", padding: "4px 8px", borderRadius: 12, fontSize: 12, fontWeight: 600 }}>Grave</span>
                        ) : (
                          <span style={{ background: dark ? "#064E3B" : "#D1FAE5", color: dark ? "#34D399" : "#065F46", padding: "4px 8px", borderRadius: 12, fontSize: 12, fontWeight: 600 }}>OK</span>
                        )}
                      </td>
                      <td style={{ padding: isMobile ? "10px 8px" : "12px 16px", textAlign: "center" }}>
                        <button
                          onClick={() => { setSelected(e); setPage(1); }}
                          style={{
                            padding: isMobile ? "8px 12px" : "6px 12px",
                            background: accent,
                            color: "white",
                            border: "none",
                            borderRadius: 8,
                            cursor: "pointer",
                            fontWeight: 600,
                            fontSize: isMobile ? 14 : 13,
                          }}
                        >
                          Fiche
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {paginated.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: 40, color: textSecondary }}>
                      Aucun élève trouvé.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 16 }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{
                  padding: paginationButtonPadding,
                  border: `1px solid ${cardBorder}`,
                  borderRadius: 8,
                  background: "transparent",
                  color: textPrimary,
                  cursor: page === 1 ? "not-allowed" : "pointer",
                  opacity: page === 1 ? 0.5 : 1,
                  fontSize: paginationFontSize,
                }}
              >
                Précédent
              </button>
              <span style={{ color: textSecondary, padding: "8px 0", fontSize: paginationFontSize }}>{page} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{
                  padding: paginationButtonPadding,
                  border: `1px solid ${cardBorder}`,
                  borderRadius: 8,
                  background: "transparent",
                  color: textPrimary,
                  cursor: page === totalPages ? "not-allowed" : "pointer",
                  opacity: page === totalPages ? 0.5 : 1,
                  fontSize: paginationFontSize,
                }}
              >
                Suivant
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          <button onClick={handleBack} style={{ marginBottom: 20, display: "inline-flex", alignItems: "center", gap: 6, padding: backButtonPadding, background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 8, color: accent, fontWeight: 500, cursor: "pointer", fontSize: backButtonFontSize }}>
            <ArrowLeft size={16} /> Retour à la liste
          </button>

          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            {["toutes", "Légère", "Moyenne", "Grave"].map(g => (
              <button
                key={g}
                onClick={() => setGraviteFilter(g)}
                style={{
                  padding: isMobile ? "10px 12px" : "6px 12px",
                  border: `1px solid ${graviteFilter === g ? accent : cardBorder}`,
                  borderRadius: 20,
                  background: graviteFilter === g ? (dark ? "#312E81" : "#EEF2FF") : "transparent",
                  color: graviteFilter === g ? accent : textSecondary,
                  fontWeight: 500,
                  cursor: "pointer",
                  fontSize: isMobile ? 14 : 13,
                  flex: isMobile ? 1 : "none",
                  justifyContent: "center",
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
              padding: ficheCardPadding,
              boxShadow: shadow,
              marginBottom: 24,
              border: `1px solid ${dark ? "#334155" : "#EEF2FF"}`,
              color: textPrimary,
            }}
          >
            {/* En-tête */}
            <div style={{ textAlign: "center", marginBottom: 20, paddingBottom: 16, borderBottom: `2px solid ${dark ? "#334155" : "#EEF2FF"}` }}>
              <FileText size={isMobile ? 24 : 28} color={accent} style={{ marginBottom: 8 }} />
              <div style={{ fontSize: ficheTitleSize, fontWeight: 800 }}>FICHE DE CONDUITE</div>
              <div style={{ fontSize: 12, color: textSecondary }}>Conseil de discipline — {new Date().getFullYear()}</div>
            </div>

            {/* Informations personnelles */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: textSecondary, textTransform: "uppercase", fontWeight: 600, marginBottom: 8 }}>
                Informations personnelles
              </div>
              <div style={{ display: "grid", gridTemplateColumns: ficheInfoGridColumns, gap: 12 }}>
                <div>
                  <div style={{ fontSize: 12, color: textSecondary }}>Nom complet</div>
                  <div style={{ fontWeight: 600, color: textPrimary }}>
                    {selected.nom} {selected.postnom} {selected.prenom || ""}
                  </div>
                </div>
                {selected.code && (
                  <div>
                    <div style={{ fontSize: 12, color: textSecondary }}>Matricule</div>
                    <div style={{ fontWeight: 600, color: textPrimary }}>{selected.code}</div>
                  </div>
                )}
                <div>
                  <div style={{ fontSize: 12, color: textSecondary }}>Classe</div>
                  <div style={{ fontWeight: 600, color: textPrimary }}>{selected.classe}</div>
                </div>
              </div>
            </div>

            {/* Score de conduite */}
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 11, color: textSecondary, textTransform: "uppercase", fontWeight: 600, marginBottom: 4 }}>
                  Élève
                </div>
                <div style={{ fontWeight: 700, fontSize: isMobile ? 15 : 16, color: textPrimary }}>
                  {selected.nom} {selected.postnom} {selected.prenom || ""}
                </div>
                <div style={{ fontSize: 13, color: textSecondary }}>
                  Classe : {selected.classe}
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 11, color: textSecondary, textTransform: "uppercase", fontWeight: 600, marginBottom: 4 }}>
                  Score de conduite
                </div>
                <div style={{
                  fontSize: isMobile ? 28 : 32,
                  fontWeight: 800,
                  color: conductScore >= 80 ? success : conductScore >= 50 ? warning : danger,
                }}>
                  {conductScore}
                </div>
                <div style={{ fontSize: 11, color: textSecondary }}>/100</div>
              </div>
            </div>

            {/* Récapitulatif */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: textSecondary, textTransform: "uppercase", fontWeight: 600, marginBottom: 8 }}>
                Récapitulatif
              </div>
              <div style={{ background: mutedBg, borderRadius: 10, padding: isMobile ? "10px 12px" : "12px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: isMobile ? 13 : 14, color: textPrimary }}>Total fautes</span>
                  <span style={{ fontWeight: 700, color: textPrimary }}>{eleveP.length}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{ fontSize: isMobile ? 13 : 14, color: textPrimary }}>Fautes graves</span>
                  <span style={{ fontWeight: 700, color: danger }}>
                    {eleveP.filter((p) => getFauteInfo(p.idFaute)?.gravite === "Grave").length}
                  </span>
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

            {/* Liste des punitions */}
            <div style={{ marginBottom: 16 }}>
              {eleveP.slice(0, expandedPunitions ? eleveP.length : 3).map((p, i) => {
                const faute = getFauteInfo(p.idFaute);
                return (
                  <div
                    key={i}
                    style={{
                      fontSize: isMobile ? 12 : 13,
                      color: textPrimary,
                      padding: "8px 0",
                      borderTop: `1px solid ${borderLight}`,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span>
                      {p.date} — {faute?.libelle} ({faute?.gravite})
                    </span>
                    <span style={{ color: danger, fontWeight: 500, fontSize: 12 }}>
                      {p.sanction}
                    </span>
                  </div>
                );
              })}
              {eleveP.length > 3 && !expandedPunitions && (
                <button
                  onClick={() => setExpandedPunitions(true)}
                  style={{ background: "none", border: "none", color: accent, cursor: "pointer", fontSize: 12, padding: 0, marginTop: 8, display: "flex", alignItems: "center", gap: 4 }}
                >
                  <ChevronDown size={14} />
                  Voir les {eleveP.length - 3} autre(s) punition(s)
                </button>
              )}
              {expandedPunitions && eleveP.length > 3 && (
                <button
                  onClick={() => setExpandedPunitions(false)}
                  style={{ background: "none", border: "none", color: accent, cursor: "pointer", fontSize: 12, padding: 0, marginTop: 8, display: "flex", alignItems: "center", gap: 4 }}
                >
                  <ChevronUp size={14} />
                  Réduire
                </button>
              )}
            </div>

            {/* Recommandation */}
            {hasGrave && (
              <div style={{ background: dark ? "#7F1D1D" : "#FEF2F2", color: dark ? "#F87171" : "#B91C1C", padding: "10px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
                <AlertTriangle size={16} />
                Recommandé pour conseil de discipline
              </div>
            )}
          </div>

          {/* Boutons d'action */}
          <div style={{ display: "flex", gap: actionButtonsGap, flexWrap: "wrap", flexDirection: actionButtonsFlexDirection }}>
            <button
              onClick={handleGeneratePDF}
              disabled={isExporting}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: actionButtonPadding,
                background: isExporting ? (dark ? "#4B5563" : "#A5B4FC") : accent,
                color: "#FFFFFF",
                border: "none",
                borderRadius: 10,
                fontWeight: 600,
                fontSize: actionButtonFontSize,
                cursor: isExporting ? "not-allowed" : "pointer",
                boxShadow: isExporting ? "none" : `0 4px 12px ${dark ? "rgba(129,140,248,0.4)" : "rgba(79,70,229,0.2)"}`,
                transition: "background 0.2s",
                width: isMobile ? "100%" : "auto",
              }}
            >
              <Download size={18} />
              {isExporting ? "Génération..." : "Exporter en PDF"}
            </button>
            <button
              onClick={handleCopyFiche}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: actionButtonPadding,
                background: dark ? "#334155" : "#F1F5F9",
                color: textPrimary,
                border: "none",
                borderRadius: 10,
                fontWeight: 500,
                fontSize: actionButtonFontSize,
                cursor: "pointer",
                width: isMobile ? "100%" : "auto",
              }}
            >
              {copied ? <Check size={18} color={success} /> : <Copy size={18} />}
              {copied ? "Copié !" : "Copier la fiche"}
            </button>
            <button
              onClick={handleExportCSV}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: actionButtonPadding,
                background: dark ? "#334155" : "#F1F5F9",
                color: textPrimary,
                border: "none",
                borderRadius: 10,
                fontWeight: 500,
                fontSize: actionButtonFontSize,
                cursor: "pointer",
                width: isMobile ? "100%" : "auto",
              }}
            >
              <FileSpreadsheet size={18} /> Exporter CSV
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// Composant StatCard local adapté pour mobile
function StatCard({ icon, value, label, color, isMobile }) {
  const { dark } = useStyles();
  return (
    <div style={{
      background: dark ? "#1E293B" : "#FFFFFF",
      borderRadius: 16,
      padding: isMobile ? 12 : 20,
      display: "flex",
      alignItems: "center",
      gap: isMobile ? 10 : 16,
      boxShadow: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)",
      border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
    }}>
      <div style={{
        width: isMobile ? 36 : 48,
        height: isMobile ? 36 : 48,
        background: `${color}${dark ? "33" : "15"}`,
        borderRadius: 12,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: color,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: isMobile ? 18 : 24, fontWeight: 700, color: dark ? "#F1F5F9" : "#1E293B" }}>
          {value}
        </div>
        <div style={{ fontSize: isMobile ? 12 : 14, color: dark ? "#94A3B8" : "#64748B" }}>
          {label}
        </div>
      </div>
    </div>
  );
}