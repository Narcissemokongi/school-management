import { useState, useRef } from "react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { useStyles } from "../styles/theme";
import { useIsMobile } from "../hooks/useIsMobile"; // <-- Import du hook
import { getFaute, getTopDerangeurs, getPunitionsParClasse } from "../utils";
import { FileDown, BarChart3, TrendingUp, PieChart, Download, Loader } from "lucide-react";

export function StatistiquesClasses({ punitions, eleves, classes, fautes }) {
  const { dark } = useStyles();
  const isMobile = useIsMobile(); // Détection mobile

  const parClasse = getPunitionsParClasse(punitions, eleves, classes);
  const max = Math.max(...Object.values(parClasse), 1);
  const top5 = getTopDerangeurs(punitions, eleves, 5);
  const statsRef = useRef(null);
  const [generating, setGenerating] = useState(false);

  // Couleurs adaptatives
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const accent = dark ? "#818CF8" : "#4F46E5";
  const danger = dark ? "#F87171" : "#EF4444";
  const warning = dark ? "#FBBF24" : "#F59E0B";
  const success = dark ? "#34D399" : "#10B981";
  const neutralBg = dark ? "#0F172A" : "#F8FAFC";
  const neutralText = dark ? "#CBD5E1" : "#1E293B";
  const shadow = dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)";

  // Gestion du chargement
  const isLoading =
    punitions === undefined ||
    eleves === undefined ||
    classes === undefined ||
    fautes === undefined;

  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 300 }}>
        <Loader size={32} className="animate-spin" style={{ color: accent }} />
      </div>
    );
  }

  const handleExportPDF = async () => {
    if (!statsRef.current) return;
    setGenerating(true);
    try {
      const canvas = await html2canvas(statsRef.current, {
        scale: 2,
        useCORS: true,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 10;
      pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - 20;
      while (heightLeft > 0) {
        position = 10 - (imgHeight - pageHeight + 10);
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight - 20;
      }
      pdf.save(`Statistiques_Classes_${new Date().toLocaleDateString()}.pdf`);
    } catch (err) {
      alert("Erreur lors de la génération du PDF : " + err.message);
    } finally {
      setGenerating(false);
    }
  };

  // Styles adaptatifs
  const containerPadding = isMobile ? "16px 12px" : "24px 16px";
  const titleSize = isMobile ? 22 : 28;
  const subtitleSize = isMobile ? 14 : 14;
  const headerMarginBottom = isMobile ? 20 : 32;
  const headerFlexDirection = isMobile ? "column" : "row";
  const headerAlignItems = isMobile ? "stretch" : "center";
  const exportButtonPadding = isMobile ? "12px 16px" : "10px 20px";
  const exportButtonFontSize = isMobile ? 16 : 14;
  const exportButtonWidth = isMobile ? "100%" : "auto";
  const cardPadding = isMobile ? 16 : 24;
  const sectionMarginBottom = isMobile ? 24 : 32;
  const sectionTitleSize = isMobile ? 16 : 18;
  const barLabelFontSize = isMobile ? 13 : 14;
  const top5ItemPadding = isMobile ? "10px 0" : "12px 0";
  const top5AvatarSize = isMobile ? 24 : 28;
  const top5FontSize = isMobile ? 13 : 14;
  const top5BadgePadding = isMobile ? "4px 8px" : "4px 10px";
  const top5BadgeFontSize = isMobile ? 12 : 13;
  const graviteCardPadding = isMobile ? "10px 12px" : "12px 16px";
  const graviteCardMinWidth = isMobile ? 90 : 120;
  const graviteBadgeFontSize = isMobile ? 11 : 13;
  const graviteValueFontSize = isMobile ? 18 : 20;
  const graviteLabelFontSize = isMobile ? 11 : 12;

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: containerPadding }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .animate-spin { animation: spin 1s linear infinite; }`}</style>

      {/* En-tête */}
      <div style={{
        display: "flex",
        flexDirection: headerFlexDirection,
        justifyContent: "space-between",
        alignItems: headerAlignItems,
        marginBottom: headerMarginBottom,
        flexWrap: "wrap",
        gap: 16,
      }}>
        <div>
          <h2 style={{ fontSize: titleSize, fontWeight: 700, color: textPrimary, margin: 0 }}>
            Statistiques des classes
          </h2>
          <p style={{ color: textSecondary, marginTop: 4, fontSize: subtitleSize }}>
            Distribution des punitions par salle
          </p>
        </div>
        <button
          onClick={handleExportPDF}
          disabled={generating}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: exportButtonPadding,
            background: generating ? "#A5B4FC" : accent,
            color: "#FFFFFF",
            border: "none",
            borderRadius: 10,
            fontWeight: 600,
            fontSize: exportButtonFontSize,
            cursor: generating ? "not-allowed" : "pointer",
            boxShadow: generating ? "none" : `0 4px 12px ${dark ? "rgba(129,140,248,0.4)" : "rgba(79,70,229,0.2)"}`,
            transition: "background 0.2s",
            whiteSpace: "nowrap",
            width: exportButtonWidth,
          }}
        >
          {generating ? <Loader size={18} className="animate-spin" /> : <Download size={18} />}
          {generating ? "Génération..." : "Exporter PDF"}
        </button>
      </div>

      {/* Conteneur principal (capturé pour PDF) */}
      <div
        ref={statsRef}
        style={{
          background: cardBg,
          borderRadius: 16,
          padding: cardPadding,
          boxShadow: shadow,
          border: `1px solid ${cardBorder}`,
          color: textPrimary,
          transition: "background-color 0.3s",
        }}
      >
        {/* Punitions par classe */}
        <div style={{ marginBottom: sectionMarginBottom }}>
          <h3 style={{
            fontSize: sectionTitleSize,
            fontWeight: 600,
            color: textPrimary,
            marginBottom: isMobile ? 12 : 20,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}>
            <BarChart3 size={isMobile ? 18 : 20} color={accent} /> Punitions par classe
          </h3>
          {Object.keys(parClasse).length === 0 && (
            <p style={{ color: textSecondary, fontSize: 14 }}>Aucune donnée disponible.</p>
          )}
          {Object.entries(parClasse)
            .sort((a, b) => b[1] - a[1])
            .map(([classe, count]) => {
              const pct = (count / max) * 100;
              const barColor =
                count === max ? danger : count > max / 2 ? warning : accent;
              return (
                <div key={classe} style={{ marginBottom: isMobile ? 12 : 16 }}>
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 4,
                  }}>
                    <span style={{ fontWeight: 500, fontSize: barLabelFontSize, color: textPrimary }}>
                      Classe {classe}
                    </span>
                    <span style={{ fontWeight: 700, color: barColor, fontSize: barLabelFontSize }}>
                      {count}
                    </span>
                  </div>
                  <div style={{
                    height: 8,
                    background: dark ? "#334155" : "#F1F5F9",
                    borderRadius: 4,
                    overflow: "hidden",
                  }}>
                    <div style={{
                      height: "100%",
                      width: `${pct}%`,
                      background: barColor,
                      borderRadius: 4,
                      transition: "width 0.3s ease",
                    }} />
                  </div>
                </div>
              );
            })}
        </div>

        {/* Top 5 */}
        <div style={{ marginBottom: sectionMarginBottom }}>
          <h3 style={{
            fontSize: sectionTitleSize,
            fontWeight: 600,
            color: textPrimary,
            marginBottom: isMobile ? 12 : 20,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}>
            <TrendingUp size={isMobile ? 18 : 20} color={danger} /> Top 5 Cerveaux Moteurs
          </h3>
          {top5.length === 0 && (
            <p style={{ color: textSecondary, fontSize: 14 }}>Aucun élève répertorié.</p>
          )}
          {top5.map((t, i) => {
            const colors = [danger, warning, accent, "#6366F1", neutralText];
            return (
              <div key={i} style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: top5ItemPadding,
                borderBottom: i < top5.length - 1 ? `1px solid ${cardBorder}` : "none",
                flexDirection: isMobile ? "column" : "row",
                gap: isMobile ? 8 : 0,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 12 }}>
                  <div style={{
                    width: top5AvatarSize,
                    height: top5AvatarSize,
                    borderRadius: "50%",
                    background: colors[i],
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: top5FontSize,
                    fontWeight: 700,
                    color: "#FFF",
                  }}>
                    #{i + 1}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: top5FontSize, color: textPrimary }}>
                      {t.eleve?.nom} {t.eleve?.postnom}
                    </div>
                    <div style={{ fontSize: 12, color: textSecondary }}>
                      Classe {t.eleve?.classe}
                    </div>
                  </div>
                </div>
                <span style={{
                  background: `${colors[i]}${dark ? "33" : "15"}`,
                  color: colors[i],
                  padding: top5BadgePadding,
                  borderRadius: 12,
                  fontSize: top5BadgeFontSize,
                  fontWeight: 600,
                }}>
                  {t.count}
                </span>
              </div>
            );
          })}
        </div>

        {/* Répartition par gravité */}
        <div>
          <h3 style={{
            fontSize: sectionTitleSize,
            fontWeight: 600,
            color: textPrimary,
            marginBottom: isMobile ? 12 : 20,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}>
            <PieChart size={isMobile ? 18 : 20} color={success} /> Répartition par gravité
          </h3>
          <div style={{ display: "flex", gap: isMobile ? 8 : 16, flexWrap: "wrap", flexDirection: isMobile ? "column" : "row" }}>
            {["Grave", "Moyenne", "Légère"].map((g) => {
              const count = punitions.filter(
                (p) => getFaute(fautes, p.idFaute)?.gravite === g
              ).length;
              const bgColor =
                g === "Grave" ? (dark ? "#7F1D1D" : "#FEE2E2") :
                g === "Moyenne" ? (dark ? "#78350F" : "#FEF3C7") :
                (dark ? "#064E3B" : "#D1FAE5");
              const textColor =
                g === "Grave" ? (dark ? "#F87171" : "#B91C1C") :
                g === "Moyenne" ? (dark ? "#FBBF24" : "#92400E") :
                (dark ? "#34D399" : "#065F46");
              return (
                <div
                  key={g}
                  style={{
                    flex: isMobile ? "none" : 1,
                    minWidth: isMobile ? "100%" : graviteCardMinWidth,
                    background: neutralBg,
                    borderRadius: 12,
                    padding: graviteCardPadding,
                    textAlign: "center",
                    border: `1px solid ${cardBorder}`,
                  }}
                >
                  <div style={{
                    display: "inline-block",
                    padding: "4px 10px",
                    borderRadius: 20,
                    fontSize: graviteBadgeFontSize,
                    fontWeight: 600,
                    background: bgColor,
                    color: textColor,
                    marginBottom: 6,
                  }}>
                    {g}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: graviteValueFontSize, color: textPrimary }}>
                    {count}
                  </div>
                  <div style={{ fontSize: graviteLabelFontSize, color: textSecondary }}>cas</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}