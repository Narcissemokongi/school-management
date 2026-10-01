// src/components/StatistiquesClasses.jsx
import { useState, useRef, useMemo, useCallback, useId } from "react";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import { getFaute, getTopDerangeurs, getPunitionsParClasse } from "../utils";
import { BarChart3, TrendingUp, PieChart, Download, Loader } from "lucide-react";
import toast from "react-hot-toast";

// ════════════════════════════════════════════════════════════════════
// LAZY-LOAD jspdf + html2canvas (utilisés uniquement au clic PDF)
// ════════════════════════════════════════════════════════════════════
let _pdfDepsPromise = null;
function loadPdfDeps() {
  if (!_pdfDepsPromise) {
    _pdfDepsPromise = Promise.all([
      import("jspdf"),
      import("html2canvas"),
    ]).then(([jspdfMod, h2cMod]) => ({
      jsPDF: jspdfMod.jsPDF,
      html2canvas: h2cMod.default,
    }));
  }
  return _pdfDepsPromise;
}

// ════════════════════════════════════════════════════════════════════
// CONSTANTES MODULE-LEVEL
// ════════════════════════════════════════════════════════════════════
const TAP_BASE = {
  touchAction: "manipulation",
  WebkitTapHighlightColor: "transparent",
  minHeight: 44,
};

const SCROLL_AREA = {
  overscrollBehavior: "contain",
  WebkitOverflowScrolling: "touch",
};

const FOCUS_RING = (color) => ({
  outline: `2px solid ${color}`,
  outlineOffset: 2,
});

// ════════════════════════════════════════════════════════════════════
// KEYFRAMES MODULE-LEVEL (rendus UNE fois)
// ════════════════════════════════════════════════════════════════════
const StatsClassesKeyframes = (
  <style>{`
    @keyframes stc-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .stc-animate-spin { animation: stc-spin 1s linear infinite; }
    @media (prefers-reduced-motion: reduce) {
      .stc-animate-spin { animation: none !important; }
    }
  `}</style>
);

// ════════════════════════════════════════════════════════════════════
// PRESSABLE — feedback tap + focus ring via state React
// ════════════════════════════════════════════════════════════════════
function Pressable({
  onClick, style, children, disabled = false, type = "button",
  focusColor, ariaLabel, ariaBusy, ...rest
}) {
  const [pressed, setPressed] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-busy={ariaBusy}
      onPointerDown={() => !disabled && setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => { setPressed(false); setHovered(false); }}
      onPointerCancel={() => setPressed(false)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        ...TAP_BASE,
        transform: pressed && !disabled ? "scale(0.97)" : "scale(1)",
        filter: hovered && !disabled ? "brightness(1.06)" : "brightness(1)",
        transition: "transform 0.12s ease, filter 0.15s, background-color 0.2s",
        ...(focused && !disabled && focusColor ? FOCUS_RING(focusColor) : null),
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ════════════════════════════════════════════════════════════════════
export function StatistiquesClasses({ punitions, eleves, classes, fautes }) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();

  const statsRef = useRef(null);
  const [generating, setGenerating] = useState(false);

  // IDs uniques pour aria-labelledby
  const titreClassesId = useId();
  const titreTop5Id = useId();
  const titreGraviteId = useId();

  // ===== TOUS LES HOOKS AVANT TOUT RETURN CONDITIONNEL =====
  const isLoading =
    punitions === undefined ||
    eleves === undefined ||
    classes === undefined ||
    fautes === undefined;

  const parClasse = useMemo(
    () => (!isLoading ? getPunitionsParClasse(punitions, eleves, classes) : {}),
    [punitions, eleves, classes, isLoading]
  );

  const top5 = useMemo(
    () => (!isLoading ? getTopDerangeurs(punitions, eleves, 5) : []),
    [punitions, eleves, isLoading]
  );

  const countsParGravite = useMemo(() => {
    const acc = { Grave: 0, Moyenne: 0, Légère: 0 };
    if (isLoading) return acc;
    for (const p of punitions) {
      const g = getFaute(fautes, p.idFaute)?.gravite;
      if (g && acc[g] !== undefined) acc[g]++;
    }
    return acc;
  }, [punitions, fautes, isLoading]);

  const parClasseSorted = useMemo(
    () => Object.entries(parClasse).sort((a, b) => b[1] - a[1]),
    [parClasse]
  );

  const max = useMemo(
    () =>
      parClasseSorted.length > 0
        ? Math.max(...parClasseSorted.map(([, v]) => v), 1)
        : 1,
    [parClasseSorted]
  );

  // ===== Couleurs adaptatives (mémoïsées) =====
  const colors = useMemo(() => ({
    textPrimary: dark ? "#F1F5F9" : "#1E293B",
    textSecondary: dark ? "#94A3B8" : "#64748B",
    cardBg: dark ? "#1E293B" : "#FFFFFF",
    cardBorder: dark ? "#334155" : "#E2E8F0",
    accent: dark ? "#818CF8" : "#4F46E5",
    danger: dark ? "#F87171" : "#EF4444",
    warning: dark ? "#FBBF24" : "#F59E0B",
    success: dark ? "#34D399" : "#10B981",
    neutralBg: dark ? "#0F172A" : "#F8FAFC",
    neutralText: dark ? "#CBD5E1" : "#1E293B",
    shadow: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)",
  }), [dark]);

  const {
    textPrimary, textSecondary, cardBg, cardBorder,
    accent, danger, warning, success, neutralBg, neutralText, shadow,
  } = colors;

  // ===== Export PDF (avec deps lazy) =====
  const handleExportPDF = useCallback(async () => {
    if (!statsRef.current || generating) return;
    setGenerating(true);
    try {
      const { jsPDF, html2canvas } = await loadPdfDeps();

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
      const usablePageHeight = pageHeight - 20;

      let heightLeft = imgHeight;
      let position = 10;

      pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
      heightLeft -= usablePageHeight;

      while (heightLeft > 0) {
        position = 10 - (imgHeight - heightLeft);
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
        heightLeft -= usablePageHeight;
      }

      pdf.save(
        `Statistiques_Classes_${new Date().toLocaleDateString("fr-FR")}.pdf`
      );
      toast.success("PDF généré");
    } catch (err) {
      toast.error(
        "Erreur PDF : " + (err?.message || "génération impossible")
      );
    } finally {
      setGenerating(false);
    }
  }, [generating]);

  // ===== Loading APRÈS tous les hooks =====
  if (isLoading) {
    return (
      <>
        {StatsClassesKeyframes}
        <div
          role="status"
          aria-busy="true"
          aria-live="polite"
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: 300,
          }}
        >
          <Loader
            size={32}
            className="stc-animate-spin"
            style={{ color: accent }}
            aria-hidden="true"
          />
          <span style={{ position: "absolute", left: -9999 }}>
            Chargement des statistiques
          </span>
        </div>
      </>
    );
  }

  // ===== Styles adaptatifs =====
  const containerPadding = isMobile ? "16px 12px" : "24px 16px";
  const titleSize = isMobile ? 22 : 28;
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
    <>
      {StatsClassesKeyframes}
      <div style={{ maxWidth: 960, margin: "0 auto", padding: containerPadding }}>
        {/* ═══════════════ EN-TÊTE ═══════════════ */}
        <div
          style={{
            display: "flex",
            flexDirection: headerFlexDirection,
            justifyContent: "space-between",
            alignItems: headerAlignItems,
            marginBottom: headerMarginBottom,
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div>
            <h2
              style={{
                fontSize: titleSize,
                fontWeight: 700,
                color: textPrimary,
                margin: 0,
              }}
            >
              Statistiques des classes
            </h2>
            <p style={{ color: textSecondary, marginTop: 4, fontSize: 14 }}>
              Distribution des punitions par salle
            </p>
          </div>
          <Pressable
            onClick={handleExportPDF}
            disabled={generating}
            focusColor={accent}
            ariaLabel="Exporter les statistiques en PDF"
            ariaBusy={generating}
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
              boxShadow: generating
                ? "none"
                : `0 4px 12px ${
                    dark ? "rgba(129,140,248,0.4)" : "rgba(79,70,229,0.2)"
                  }`,
              whiteSpace: "nowrap",
              width: exportButtonWidth,
            }}
          >
            {generating ? (
              <Loader
                size={18}
                className="stc-animate-spin"
                role="status"
                aria-label="Génération du PDF"
              />
            ) : (
              <Download size={18} aria-hidden="true" />
            )}
            {generating ? "Génération..." : "Exporter PDF"}
          </Pressable>
        </div>

        {/* ═══════════════ CONTENEUR PRINCIPAL (capturé pour PDF) ═══════════════ */}
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
          {/* ─────────── Punitions par classe ─────────── */}
          <section
            aria-labelledby={titreClassesId}
            style={{ marginBottom: sectionMarginBottom }}
          >
            <h3
              id={titreClassesId}
              style={{
                fontSize: sectionTitleSize,
                fontWeight: 600,
                color: textPrimary,
                marginBottom: isMobile ? 12 : 20,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <BarChart3 size={isMobile ? 18 : 20} color={accent} aria-hidden="true" />
              Punitions par classe
            </h3>
            {parClasseSorted.length === 0 && (
              <p
                role="status"
                aria-live="polite"
                style={{ color: textSecondary, fontSize: 14 }}
              >
                Aucune donnée disponible.
              </p>
            )}
            {parClasseSorted.map(([classe, count]) => {
              const pct = (count / max) * 100;
              const barColor =
                count === max ? danger : count > max / 2 ? warning : accent;
              return (
                <div key={classe} style={{ marginBottom: isMobile ? 12 : 16 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 4,
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 500,
                        fontSize: barLabelFontSize,
                        color: textPrimary,
                      }}
                    >
                      Classe {classe}
                    </span>
                    <span
                      style={{
                        fontWeight: 700,
                        color: barColor,
                        fontSize: barLabelFontSize,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {count}
                    </span>
                  </div>
                  <div
                    role="progressbar"
                    aria-label={`Classe ${classe} : ${count} punition${count > 1 ? "s" : ""}`}
                    aria-valuenow={count}
                    aria-valuemin={0}
                    aria-valuemax={max}
                    style={{
                      height: 8,
                      background: dark ? "#334155" : "#F1F5F9",
                      borderRadius: 4,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      aria-hidden="true"
                      style={{
                        height: "100%",
                        width: `${pct}%`,
                        background: barColor,
                        borderRadius: 4,
                        transition: "width 0.3s ease",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </section>

          {/* ─────────── Top 5 ─────────── */}
          <section
            aria-labelledby={titreTop5Id}
            style={{ marginBottom: sectionMarginBottom }}
          >
            <h3
              id={titreTop5Id}
              style={{
                fontSize: sectionTitleSize,
                fontWeight: 600,
                color: textPrimary,
                marginBottom: isMobile ? 12 : 20,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <TrendingUp size={isMobile ? 18 : 20} color={danger} aria-hidden="true" />
              Top 5 Cerveaux Moteurs
            </h3>
            {top5.length === 0 && (
              <p
                role="status"
                aria-live="polite"
                style={{ color: textSecondary, fontSize: 14 }}
              >
                Aucun élève répertorié.
              </p>
            )}
            {top5.length > 0 && (
              <ol
                role="list"
                style={{ listStyle: "none", padding: 0, margin: 0, ...SCROLL_AREA }}
              >
                {top5.map((t, i) => {
                  const palette = [danger, warning, accent, "#6366F1", neutralText];
                  const rankColor = palette[i];
                  return (
                    <li
                      key={t.eleve?._id ?? `top5-${i}`}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: top5ItemPadding,
                        borderBottom:
                          i < top5.length - 1 ? `1px solid ${cardBorder}` : "none",
                        flexDirection: isMobile ? "column" : "row",
                        gap: isMobile ? 8 : 0,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: isMobile ? 8 : 12,
                        }}
                      >
                        <div
                          aria-label={`Rang ${i + 1}`}
                          style={{
                            width: top5AvatarSize,
                            height: top5AvatarSize,
                            borderRadius: "50%",
                            background: rankColor,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: top5FontSize,
                            fontWeight: 700,
                            color: "#FFF",
                            fontVariantNumeric: "tabular-nums",
                            flexShrink: 0,
                          }}
                        >
                          <span aria-hidden="true">#{i + 1}</span>
                        </div>
                        <div>
                          <div
                            style={{
                              fontWeight: 600,
                              fontSize: top5FontSize,
                              color: textPrimary,
                            }}
                          >
                            {t.eleve?.nom} {t.eleve?.postnom}
                          </div>
                          <div style={{ fontSize: 12, color: textSecondary }}>
                            Classe {t.eleve?.classe}
                          </div>
                        </div>
                      </div>
                      <span
                        aria-label={`${t.count} punition${t.count > 1 ? "s" : ""}`}
                        style={{
                          background: `${rankColor}${dark ? "33" : "15"}`,
                          color: rankColor,
                          padding: top5BadgePadding,
                          borderRadius: 12,
                          fontSize: top5BadgeFontSize,
                          fontWeight: 600,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        <span aria-hidden="true">{t.count}</span>
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          {/* ─────────── Répartition par gravité ─────────── */}
          <section aria-labelledby={titreGraviteId}>
            <h3
              id={titreGraviteId}
              style={{
                fontSize: sectionTitleSize,
                fontWeight: 600,
                color: textPrimary,
                marginBottom: isMobile ? 12 : 20,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <PieChart size={isMobile ? 18 : 20} color={success} aria-hidden="true" />
              Répartition par gravité
            </h3>
            <div
              style={{
                display: "flex",
                gap: isMobile ? 8 : 16,
                flexWrap: "wrap",
                flexDirection: isMobile ? "column" : "row",
              }}
            >
              {["Grave", "Moyenne", "Légère"].map((g) => {
                const count = countsParGravite[g] ?? 0;
                const bgColor =
                  g === "Grave"
                    ? dark ? "#7F1D1D" : "#FEE2E2"
                    : g === "Moyenne"
                    ? dark ? "#78350F" : "#FEF3C7"
                    : dark ? "#064E3B" : "#D1FAE5";
                const textColor =
                  g === "Grave"
                    ? dark ? "#F87171" : "#B91C1C"
                    : g === "Moyenne"
                    ? dark ? "#FBBF24" : "#92400E"
                    : dark ? "#34D399" : "#065F46";
                return (
                  <article
                    key={g}
                    aria-label={`${g} : ${count} cas`}
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
                    <div
                      style={{
                        display: "inline-block",
                        padding: "4px 10px",
                        borderRadius: 20,
                        fontSize: graviteBadgeFontSize,
                        fontWeight: 600,
                        background: bgColor,
                        color: textColor,
                        marginBottom: 6,
                      }}
                    >
                      {g}
                    </div>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: graviteValueFontSize,
                        color: textPrimary,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {count}
                    </div>
                    <div style={{ fontSize: graviteLabelFontSize, color: textSecondary }}>
                      cas
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}