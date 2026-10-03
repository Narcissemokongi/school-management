// src/components/StatistiquesAvancees.jsx
import { useState, useEffect, useMemo, useCallback, useId } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
// ✨ recharts retiré — chargé dynamiquement au 1er graphique (gain ~400 KB)
import { School, TrendingUp, BarChart3, Loader } from "lucide-react";

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
// KEYFRAMES MODULE-LEVEL
// ════════════════════════════════════════════════════════════════════
const StatistiquesAvanceesKeyframes = (
  <style>{`
    @keyframes sxa-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .sxa-animate-spin { animation: sxa-spin 1s linear infinite; }
    @media (prefers-reduced-motion: reduce) {
      .sxa-animate-spin { animation: none !important; }
    }
  `}</style>
);

// ════════════════════════════════════════════════════════════════════
// PRESSABLE
// ════════════════════════════════════════════════════════════════════
function Pressable({
  onClick, style, children, disabled = false, type = "button",
  focusColor, ariaLabel, role, ariaSelected, ...rest
}) {
  const [pressed, setPressed] = useState(false);
  const [focused, setFocused] = useState(false);
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      role={role}
      aria-selected={ariaSelected}
      onPointerDown={() => !disabled && setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        ...TAP_BASE,
        transform: pressed && !disabled ? "scale(0.97)" : "scale(1)",
        transition: "transform 0.12s ease, background-color 0.2s, color 0.2s",
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
// TOOLTIP RECHARTS (custom)
// ════════════════════════════════════════════════════════════════════
function CustomTooltip({ active, payload, label, colors }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: colors.tooltipBg,
        border: `1px solid ${colors.tooltipBorder}`,
        borderRadius: 8,
        padding: "8px 12px",
        color: colors.textPrimary,
      }}
    >
      <p style={{ margin: 0, fontWeight: 600 }}>{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey ?? p.name} style={{ margin: 0, fontVariantNumeric: "tabular-nums" }}>
          {p.name} : {p.value}
        </p>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ════════════════════════════════════════════════════════════════════
export function StatistiquesAvancees({
  ecoleId,
  anneeId,
  anneeActive,
  classes,
  annees,
  user,
}) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();

  const [tab, setTab] = useState("taux");
  const [selectedClasse, setSelectedClasse] = useState("");
  const [seuil, setSeuil] = useState(50);

  // ✨ Recharts lazy-loaded
  const [recharts, setRecharts] = useState(null);

  const tauxPanelId = useId();
  const evolutionPanelId = useId();
  const comparaisonPanelId = useId();
  const titreTauxId = useId();
  const titreEvoId = useId();
  const titreCompId = useId();

  const userId = user?._id;

  // ===== Requêtes =====
  const shouldFetchTaux = Boolean(
    tab === "taux" && selectedClasse && ecoleId && anneeId && userId
  );
  const shouldFetchEvo = Boolean(
    tab === "evolution" && selectedClasse && ecoleId && userId && annees?.length > 0
  );
  const shouldFetchComp = Boolean(
    tab === "comparaison" && ecoleId && anneeId && userId
  );

  const tauxReussiteRaw = useQuery(
    api.statistiques.getTauxReussiteParMatiere,
    shouldFetchTaux
      ? { ecoleId, anneeId, classe: selectedClasse, seuil, userId }
      : "skip"
  );
  const evolutionRaw = useQuery(
    api.statistiques.getEvolutionResultats,
    shouldFetchEvo
      ? {
          ecoleId,
          classe: selectedClasse,
          annees: annees.map((a) => a._id),
          userId,
        }
      : "skip"
  );
  const comparaisonRaw = useQuery(
    api.statistiques.getComparaisonClasses,
    shouldFetchComp ? { ecoleId, anneeId, userId } : "skip"
  );

  const tauxReussite = useMemo(() => tauxReussiteRaw ?? [], [tauxReussiteRaw]);
  const evolution = useMemo(() => evolutionRaw ?? [], [evolutionRaw]);
  const comparaison = useMemo(() => comparaisonRaw ?? [], [comparaisonRaw]);

  const isLoading =
    (shouldFetchTaux && tauxReussiteRaw === undefined) ||
    (shouldFetchEvo && evolutionRaw === undefined) ||
    (shouldFetchComp && comparaisonRaw === undefined);

  // ✨ Chargement de recharts à la demande (dès qu'un graphique doit s'afficher)
  const needsRecharts = useMemo(() => {
    return (
      (tab === "taux" && selectedClasse && tauxReussite.length > 0) ||
      (tab === "evolution" && selectedClasse && evolution.length > 0) ||
      (tab === "comparaison" && comparaison.length > 0)
    );
  }, [tab, selectedClasse, tauxReussite.length, evolution.length, comparaison.length]);

  useEffect(() => {
    if (!needsRecharts || recharts) return;
    let cancelled = false;
    import("recharts")
      .then((mod) => {
        if (!cancelled) setRecharts(mod);
      })
      .catch((err) => {
        console.error("[StatistiquesAvancees] recharts load failed:", err);
      });
    return () => {
      cancelled = true;
    };
  }, [needsRecharts, recharts]);

  // ===== Couleurs =====
  const colors = useMemo(() => ({
    textPrimary: dark ? "#F1F5F9" : "#1E293B",
    textSecondary: dark ? "#94A3B8" : "#64748B",
    cardBg: dark ? "#1E293B" : "#FFFFFF",
    cardBorder: dark ? "#334155" : "#E2E8F0",
    inputBg: dark ? "#0F172A" : "#F9FAFB",
    inputText: dark ? "#F1F5F9" : "#1E293B",
    accent: dark ? "#818CF8" : "#4F46E5",
    success: dark ? "#34D399" : "#10B981",
    gridStroke: dark ? "#334155" : "#E2E8F0",
    axisStroke: dark ? "#94A3B8" : "#64748B",
    tooltipBg: dark ? "#0F172A" : "white",
    tooltipBorder: dark ? "#334155" : "#E2E8F0",
    shadow: dark
      ? "0 1px 3px rgba(0,0,0,0.3)"
      : "0 1px 3px rgba(0,0,0,0.05)",
  }), [dark]);

  const {
    textPrimary, textSecondary, cardBg, cardBorder, inputBg, inputText,
    accent, success, gridStroke, axisStroke, shadow,
  } = colors;

  // ===== Handlers =====
  const handleTabChange = useCallback((newTab) => {
    setTab(newTab);
  }, []);

  const handleClasseChange = useCallback((e) => {
    setSelectedClasse(e.target.value);
  }, []);

  const handleSeuilChange = useCallback((e) => {
    const v = Number(e.target.value);
    if (Number.isNaN(v)) return;
    setSeuil(Math.min(100, Math.max(0, v)));
  }, []);

  // ===== Styles adaptatifs =====
  const containerPadding = isMobile ? "16px 12px" : "24px 16px";
  const titleSize = isMobile ? 22 : 28;
  const tabButtonPadding = isMobile ? "10px 12px" : "10px 20px";
  const selectPadding = isMobile ? "12px 12px" : "10px 12px";
  const selectFontSize = isMobile ? 16 : 14;
  const graphHeight = isMobile ? 250 : 300;
  const cardPadding = isMobile ? 16 : 24;
  const controlsFlexDirection = isMobile ? "column" : "row";
  const controlsAlignItems = isMobile ? "stretch" : "center";
  const controlsGap = isMobile ? 8 : 12;

  const tabContainerStyle = {
    display: "flex",
    gap: isMobile ? 4 : 8,
    marginBottom: isMobile ? 16 : 24,
    flexWrap: isMobile ? "nowrap" : "wrap",
    overflowX: isMobile ? "auto" : "visible",
    whiteSpace: isMobile ? "nowrap" : "normal",
    scrollbarWidth: "none",
    ...SCROLL_AREA,
  };

  const cardStyle = useMemo(() => ({
    background: cardBg,
    borderRadius: 16,
    padding: cardPadding,
    boxShadow: shadow,
    border: `1px solid ${cardBorder}`,
    ...SCROLL_AREA,
  }), [cardBg, cardPadding, cardBorder, shadow]);

  // ===== Panels =====
  const panels = [
    { id: "taux", label: "Taux de réussite", icon: BarChart3, panelId: tauxPanelId },
    { id: "evolution", label: "Évolution", icon: TrendingUp, panelId: evolutionPanelId },
    { id: "comparaison", label: "Comparaison classes", icon: School, panelId: comparaisonPanelId },
  ];

  const anneeLabel = useMemo(
    () =>
      anneeActive?.nom ??
      annees?.find((a) => a._id === anneeId)?.nom ??
      "",
    [anneeActive, annees, anneeId]
  );

  // ✨ Mini-loader pendant le chargement de recharts
  const rechartsLoading = needsRecharts && !recharts;

  return (
    <div
      style={{
        maxWidth: 1280,
        margin: "0 auto",
        padding: containerPadding,
      }}
    >
      {StatistiquesAvanceesKeyframes}

      <h2
        style={{
          fontSize: titleSize,
          fontWeight: 700,
          color: textPrimary,
          marginBottom: isMobile ? 16 : 24,
        }}
      >
        Statistiques avancées
      </h2>

      {/* ═══════════ Onglets ═══════════ */}
      <div
        role="tablist"
        aria-label="Sections de statistiques"
        style={tabContainerStyle}
      >
        {panels.map(({ id, label, icon: Icon, panelId }) => {
          const isActive = tab === id;
          return (
            <Pressable
              key={id}
              role="tab"
              ariaSelected={isActive}
              aria-controls={panelId}
              onClick={() => handleTabChange(id)}
              focusColor={accent}
              style={{
                padding: tabButtonPadding,
                border: "none",
                borderRadius: 8,
                background: isActive ? accent : "transparent",
                color: isActive ? "#FFFFFF" : textSecondary,
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                fontSize: 14,
                flexShrink: 0,
                gap: 6,
              }}
            >
              <Icon size={18} aria-hidden="true" />
              {label}
            </Pressable>
          );
        })}
      </div>

      {/* ═══════════ Filtres ═══════════ */}
      {tab !== "comparaison" && (
        <div
          style={{
            display: "flex",
            gap: controlsGap,
            marginBottom: isMobile ? 16 : 24,
            alignItems: controlsAlignItems,
            flexWrap: "wrap",
            flexDirection: controlsFlexDirection,
          }}
        >
          <label
            htmlFor="sxa-classe"
            style={{ position: "absolute", left: -9999 }}
          >
            Choisir une classe
          </label>
          <select
            id="sxa-classe"
            value={selectedClasse}
            onChange={handleClasseChange}
            aria-label="Choisir une classe"
            style={{
              ...TAP_BASE,
              padding: selectPadding,
              border: `1px solid ${cardBorder}`,
              borderRadius: 8,
              fontSize: selectFontSize,
              background: inputBg,
              color: inputText,
              outline: "none",
              width: isMobile ? "100%" : "auto",
              flex: isMobile ? "none" : 1,
              fontFamily: "inherit",
              appearance: "none",
              WebkitAppearance: "none",
            }}
          >
            <option value="">-- Choisir une classe --</option>
            {classes.map((c) => (
              <option key={c._id} value={c.nom}>
                {c.nom}
              </option>
            ))}
          </select>

          {tab === "taux" && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: isMobile ? "100%" : "auto",
              }}
            >
              <label
                htmlFor="sxa-seuil"
                style={{ color: textSecondary, fontSize: 14, whiteSpace: "nowrap" }}
              >
                Seuil (%)
              </label>
              <input
                id="sxa-seuil"
                type="number"
                inputMode="numeric"
                enterKeyHint="done"
                value={seuil}
                onChange={handleSeuilChange}
                min={0}
                max={100}
                aria-label="Seuil de réussite en pourcentage"
                style={{
                  ...TAP_BASE,
                  width: isMobile ? "100%" : 80,
                  padding: selectPadding,
                  border: `1px solid ${cardBorder}`,
                  borderRadius: 8,
                  background: inputBg,
                  color: inputText,
                  fontSize: selectFontSize,
                  outline: "none",
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                  fontVariantNumeric: "tabular-nums",
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* ═══════════ Loader données ═══════════ */}
      {isLoading && (
        <div
          role="status"
          aria-busy="true"
          aria-live="polite"
          style={{ display: "flex", justifyContent: "center", padding: 40 }}
        >
          <Loader
            size={32}
            className="sxa-animate-spin"
            style={{ color: accent }}
            aria-hidden="true"
          />
          <span style={{ position: "absolute", left: -9999 }}>
            Chargement des statistiques
          </span>
        </div>
      )}

      {/* ═══════════ Loader recharts ═══════════ */}
      {!isLoading && rechartsLoading && (
        <div
          role="status"
          aria-busy="true"
          aria-live="polite"
          style={{
            ...cardStyle,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: 200,
          }}
        >
          <Loader
            size={28}
            className="sxa-animate-spin"
            style={{ color: accent }}
            aria-hidden="true"
          />
          <span style={{ position: "absolute", left: -9999 }}>
            Chargement du graphique
          </span>
        </div>
      )}

      {/* ═══════════ Panel : Taux de réussite ═══════════ */}
      {!isLoading && !rechartsLoading && tab === "taux" && selectedClasse && (
        <section
          id={tauxPanelId}
          role="tabpanel"
          aria-labelledby={titreTauxId}
          style={cardStyle}
        >
          <h3
            id={titreTauxId}
            style={{
              marginBottom: 16,
              color: textPrimary,
              fontSize: isMobile ? 16 : 18,
            }}
          >
            Taux de réussite par matière (≥ {seuil}%) – {selectedClasse}
          </h3>
          {tauxReussite.length === 0 ? (
            <p role="status" aria-live="polite" style={{ color: textSecondary }}>
              Aucune donnée.
            </p>
          ) : (
            <>
              <div
                role="img"
                aria-label={`Graphique en barres : taux de réussite par matière pour la classe ${selectedClasse}`}
              >
                <recharts.ResponsiveContainer width="100%" height={graphHeight}>
                  <recharts.BarChart data={tauxReussite}>
                    <recharts.CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                    <recharts.XAxis dataKey="matiere" stroke={axisStroke} />
                    <recharts.YAxis unit="%" domain={[0, 100]} stroke={axisStroke} />
                    <recharts.Tooltip content={<CustomTooltip colors={colors} />} />
                    <recharts.Bar
                      dataKey="tauxReussite"
                      fill={accent}
                      radius={[4, 4, 0, 0]}
                      name="Taux de réussite"
                    />
                  </recharts.BarChart>
                </recharts.ResponsiveContainer>
              </div>
              <div
                style={{
                  overflowX: "auto",
                  marginTop: 20,
                  ...SCROLL_AREA,
                }}
              >
                <table
                  style={{
                    width: "100%",
                    minWidth: isMobile ? 400 : "auto",
                    borderCollapse: "collapse",
                    color: textPrimary,
                  }}
                >
                  <caption
                    style={{
                      position: "absolute",
                      left: -9999,
                      width: 1,
                      height: 1,
                      overflow: "hidden",
                    }}
                  >
                    Taux de réussite par matière – {selectedClasse}
                  </caption>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${cardBorder}` }}>
                      <th scope="col" style={{ textAlign: "left", padding: 8 }}>
                        Matière
                      </th>
                      <th scope="col" style={{ textAlign: "center", padding: 8 }}>
                        Taux de réussite
                      </th>
                      <th scope="col" style={{ textAlign: "center", padding: 8 }}>
                        Nombre d'élèves
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {tauxReussite.map((item) => (
                      <tr
                        key={item.matiere}
                        style={{ borderBottom: `1px solid ${cardBorder}` }}
                      >
                        <th
                          scope="row"
                          style={{ padding: 8, textAlign: "left", fontWeight: 400 }}
                        >
                          {item.matiere}
                        </th>
                        <td
                          style={{
                            textAlign: "center",
                            padding: 8,
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {item.tauxReussite.toFixed(1)}%
                        </td>
                        <td
                          style={{
                            textAlign: "center",
                            padding: 8,
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {item.nbEleves}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      )}

      {/* ═══════════ Panel : Évolution ═══════════ */}
      {!isLoading && !rechartsLoading && tab === "evolution" && selectedClasse && (
        <section
          id={evolutionPanelId}
          role="tabpanel"
          aria-labelledby={titreEvoId}
          style={cardStyle}
        >
          <h3
            id={titreEvoId}
            style={{
              marginBottom: 16,
              color: textPrimary,
              fontSize: isMobile ? 16 : 18,
            }}
          >
            Évolution de la moyenne générale – {selectedClasse}
          </h3>
          {evolution.length === 0 ? (
            <p role="status" aria-live="polite" style={{ color: textSecondary }}>
              Pas assez de données.
            </p>
          ) : (
            <div
              role="img"
              aria-label={`Graphique linéaire : évolution de la moyenne générale pour la classe ${selectedClasse}`}
            >
              <recharts.ResponsiveContainer width="100%" height={graphHeight}>
                <recharts.LineChart data={evolution}>
                  <recharts.CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <recharts.XAxis dataKey="anneeNom" stroke={axisStroke} />
                  <recharts.YAxis domain={[0, 100]} stroke={axisStroke} />
                  <recharts.Tooltip content={<CustomTooltip colors={colors} />} />
                  <recharts.Legend />
                  <recharts.Line
                    type="monotone"
                    dataKey="moyenne"
                    stroke={accent}
                    strokeWidth={2}
                    name="Moy. générale (%)"
                  />
                </recharts.LineChart>
              </recharts.ResponsiveContainer>
            </div>
          )}
        </section>
      )}

      {/* ═══════════ Panel : Comparaison ═══════════ */}
      {!isLoading && !rechartsLoading && tab === "comparaison" && (
        <section
          id={comparaisonPanelId}
          role="tabpanel"
          aria-labelledby={titreCompId}
          style={cardStyle}
        >
          <h3
            id={titreCompId}
            style={{
              marginBottom: 16,
              color: textPrimary,
              fontSize: isMobile ? 16 : 18,
            }}
          >
            Comparaison des classes{anneeLabel ? ` – ${anneeLabel}` : ""}
          </h3>
          {comparaison.length === 0 ? (
            <p role="status" aria-live="polite" style={{ color: textSecondary }}>
              Aucune donnée.
            </p>
          ) : (
            <div
              role="img"
              aria-label={`Graphique en barres : comparaison des moyennes par classe${anneeLabel ? ` pour l'année ${anneeLabel}` : ""}`}
            >
              <recharts.ResponsiveContainer width="100%" height={graphHeight}>
                <recharts.BarChart data={comparaison}>
                  <recharts.CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <recharts.XAxis dataKey="classe" stroke={axisStroke} />
                  <recharts.YAxis domain={[0, 100]} stroke={axisStroke} />
                  <recharts.Tooltip content={<CustomTooltip colors={colors} />} />
                  <recharts.Bar
                    dataKey="moyenne"
                    fill={success}
                    radius={[4, 4, 0, 0]}
                    name="Moy. générale (%)"
                  />
                </recharts.BarChart>
              </recharts.ResponsiveContainer>
            </div>
          )}
        </section>
      )}
    </div>
  );
}