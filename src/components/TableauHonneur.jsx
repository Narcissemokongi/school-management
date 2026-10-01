// src/components/TableauHonneur.jsx
import { useMemo, useState, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import { Trophy, Medal, Star, Loader } from "lucide-react";

// ════════════════════════════════════════════════════════════════════
// SAFE-AREA
// ════════════════════════════════════════════════════════════════════
const SAFE_TOP = "env(safe-area-inset-top, 0px)";
const SAFE_BOTTOM = "env(safe-area-inset-bottom, 0px)";
const SAFE_LEFT = "env(safe-area-inset-left, 0px)";
const SAFE_RIGHT = "env(safe-area-inset-right, 0px)";

// ════════════════════════════════════════════════════════════════════
// KEYFRAMES module-level
// ════════════════════════════════════════════════════════════════════
const TableauHonneurKeyframes = (
  <style>{`
    @keyframes th-spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
    .th-animate-spin { animation: th-spin 1s linear infinite; }
    @media (prefers-reduced-motion: reduce) {
      .th-animate-spin { animation: none !important; }
    }
  `}</style>
);

// ════════════════════════════════════════════════════════════════════
// CARTE TOP 3 — ✨ refactorée avec state React
// ════════════════════════════════════════════════════════════════════
function TopEleveCard({
  eleve,
  idx,
  couleur,
  icone,
  mention,
  isMobile,
  dark,
  textPrimary,
  textSecondary,
  cardBg,
  cardBorder,
  accent,
  shadow,
  top3CardPadding,
  top3IconContainerSize,
  top3NameSize,
  top3SecondarySize,
  top3RankFontSize,
}) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);

  const hoverShadow = dark
    ? "0 4px 12px rgba(0,0,0,0.5)"
    : "0 4px 12px rgba(0,0,0,0.12)";

  const handleTouchStart = () => setPressed(true);
  const handleTouchEnd = () => setPressed(false);
  const handleTouchCancel = () => setPressed(false);

  return (
    <div
      role="button"
      tabIndex={0}
      onMouseEnter={() => !isMobile && setHovered(true)}
      onMouseLeave={() => !isMobile && setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      style={{
        background: cardBg,
        borderRadius: 16,
        padding: top3CardPadding,
        display: "flex",
        alignItems: "center",
        gap: isMobile ? 10 : 16,
        boxShadow: pressed
          ? shadow
          : hovered && !isMobile
          ? hoverShadow
          : shadow,
        border: `1px solid ${focused ? accent : cardBorder}`,
        borderLeft: `6px solid ${couleur}`,
        transition:
          "box-shadow 0.15s ease, transform 0.1s ease, border-color 0.15s ease, background 0.12s ease",
        // ✨ Feedback tap : scale au lieu de translateY
        transform: pressed
          ? "scale(0.985)"
          : hovered && !isMobile
          ? "translateY(-2px)"
          : "translateY(0)",
        outline: focused ? `2px solid ${accent}` : "none",
        outlineOffset: 2,
        // ✨ Neutralise tap delay + flash
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation",
        userSelect: "none",
        minWidth: 0,
        boxSizing: "border-box",
      }}
      aria-label={`${eleve.nom} ${eleve.postnom}, rang ${eleve.rang}, moyenne ${eleve.moyenneGenerale.toFixed(1)}%`}
    >
      {/* Icône (médaillon) */}
      <div
        style={{
          color: couleur,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: top3IconContainerSize,
          height: top3IconContainerSize,
          background: `${couleur}${dark ? "33" : "15"}`,
          borderRadius: 12,
          flexShrink: 0,
        }}
        aria-hidden="true"
      >
        {icone}
      </div>

      {/* Nom + moyenne + mention */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontWeight: 700,
            fontSize: top3NameSize,
            color: textPrimary,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {eleve.nom} {eleve.postnom}
        </div>
        <div
          style={{
            color: textSecondary,
            fontSize: top3SecondarySize,
            marginTop: 2,
          }}
        >
          Moyenne : {eleve.moyenneGenerale.toFixed(1)}%
        </div>
        {mention && (
          <span
            style={{
              display: "inline-block",
              marginTop: 4,
              background: dark ? "#312E81" : "#EEF2FF",
              color: accent,
              padding: "2px 10px",
              borderRadius: 20,
              fontSize: isMobile ? 11 : 12,
              fontWeight: 600,
            }}
          >
            {mention}
          </span>
        )}
      </div>

      {/* Rang */}
      <div
        style={{
          fontSize: top3RankFontSize,
          fontWeight: 800,
          color: couleur,
          fontFamily: "inherit",
          flexShrink: 0,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        #{eleve.rang}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ════════════════════════════════════════════════════════════════════
export function TableauHonneur({ ecoleId, anneeId, classe, user }) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();

  const userId = user?._id;
  const hasAllParams = Boolean(ecoleId && anneeId && classe && userId);

  // ===== Queries =====
  const classementRaw = useQuery(
    api.classement.getClassement,
    hasAllParams ? { ecoleId, anneeId, classe, userId } : "skip"
  );
  const ecoleRaw = useQuery(
    api.ecoles.get,
    ecoleId && userId ? { ecoleId, userId } : "skip"
  );

  const classement = classementRaw ?? [];
  const ecole = ecoleRaw;

  const isLoading =
    (hasAllParams && classementRaw === undefined) ||
    (ecoleId && userId && ecoleRaw === undefined);

  // ===== Couleurs =====
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const accent = dark ? "#818CF8" : "#4F46E5";
  const shadow = dark
    ? "0 2px 8px rgba(0,0,0,0.4)"
    : "0 2px 8px rgba(0,0,0,0.1)";
  const gold = "#FFD700";
  const silver = "#C0C0C0";
  const bronze = "#CD7F32";

  // ===== Données dérivées =====
  const top3 = useMemo(() => classement.slice(0, 3), [classement]);

  const getMention = useMemo(() => {
    return (moy) => {
      if (
        ecole?.seuilFelicitations != null &&
        moy >= ecole.seuilFelicitations
      )
        return "Félicitations";
      if (
        ecole?.seuilEncouragement != null &&
        moy >= ecole.seuilEncouragement
      )
        return "Encouragement";
      return "";
    };
  }, [ecole]);

  const couleurs = useMemo(() => [gold, silver, bronze], []);

  const icones = useMemo(() => {
    const size = isMobile ? 22 : 28;
    return [
      <Trophy key="t" size={size} />,
      <Medal key="m" size={size} />,
      <Star key="s" size={size} />,
    ];
  }, [isMobile]);

  // ===== Styles adaptatifs =====
  // ✨ Safe-area sur le container
  const containerPadding = isMobile
    ? `calc(16px + ${SAFE_TOP}) calc(12px + ${SAFE_LEFT}) calc(16px + ${SAFE_BOTTOM}) calc(12px + ${SAFE_RIGHT})`
    : "24px 16px";
  const titleSize = isMobile ? 20 : 24;
  const iconSize = isMobile ? 22 : 28;
  const top3CardPadding = isMobile ? 14 : 20;
  const top3Gap = isMobile ? 8 : 16;
  const top3IconContainerSize = isMobile ? 40 : 48;
  const top3NameSize = isMobile ? 16 : 18;
  const top3SecondarySize = isMobile ? 13 : 14;
  const top3RankFontSize = isMobile ? 26 : 32;
  const fullListTitleSize = isMobile ? 18 : 20;
  const fullListPadding = isMobile ? 12 : 16;
  const fullListRowPadding = isMobile ? "10px 0" : "10px 0";
  const fullListFontSize = isMobile ? 14 : 16;

  // ===== Loading =====
  if (isLoading) {
    return (
      <>
        {TableauHonneurKeyframes}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: 300,
          }}
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <Loader
            size={32}
            className="th-animate-spin"
            style={{ color: accent }}
          />
        </div>
      </>
    );
  }

  // ===== Pas de classe =====
  if (!classe) {
    return (
      <>
        {TableauHonneurKeyframes}
        <p
          style={{
            color: textSecondary,
            textAlign: "center",
            padding: isMobile ? 32 : 40,
            fontSize: isMobile ? 14 : 15,
          }}
        >
          Veuillez sélectionner une classe.
        </p>
      </>
    );
  }

  // ===== Aucune donnée =====
  if (classement.length === 0) {
    return (
      <>
        {TableauHonneurKeyframes}
        <p
          style={{
            color: textSecondary,
            textAlign: "center",
            padding: isMobile ? 32 : 40,
            fontSize: isMobile ? 14 : 15,
          }}
        >
          Aucun élève dans cette classe.
        </p>
      </>
    );
  }

  // ===== Rendu principal =====
  return (
    <div
      style={{
        maxWidth: 800,
        margin: "0 auto",
        padding: containerPadding,
        boxSizing: "border-box",
      }}
    >
      {TableauHonneurKeyframes}

      <h2
        style={{
          fontSize: titleSize,
          fontWeight: 700,
          marginBottom: isMobile ? 16 : 24,
          display: "flex",
          alignItems: "center",
          gap: 8,
          color: textPrimary,
          flexWrap: "wrap",
        }}
      >
        <Trophy size={iconSize} color={gold} aria-hidden="true" />
        Tableau d'honneur – {classe}
      </h2>

      {/* Top 3 */}
      <div
        style={{
          display: "grid",
          gap: top3Gap,
          marginBottom: isMobile ? 24 : 32,
        }}
      >
        {top3.map((eleve, idx) => {
          const mention = getMention(eleve.moyenneGenerale);
          return (
            <TopEleveCard
              key={eleve._id}
              eleve={eleve}
              idx={idx}
              couleur={couleurs[idx]}
              icone={icones[idx]}
              mention={mention}
              isMobile={isMobile}
              dark={dark}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              cardBg={cardBg}
              cardBorder={cardBorder}
              accent={accent}
              shadow={shadow}
              top3CardPadding={top3CardPadding}
              top3IconContainerSize={top3IconContainerSize}
              top3NameSize={top3NameSize}
              top3SecondarySize={top3SecondarySize}
              top3RankFontSize={top3RankFontSize}
            />
          );
        })}
      </div>

      {/* Classement complet */}
      <h3
        style={{
          fontSize: fullListTitleSize,
          fontWeight: 600,
          marginBottom: isMobile ? 12 : 16,
          color: textPrimary,
        }}
      >
        Classement complet
      </h3>
      <div
        style={{
          background: cardBg,
          borderRadius: 16,
          padding: fullListPadding,
          boxShadow: shadow,
          border: `1px solid ${cardBorder}`,
        }}
      >
        {classement.map((eleve, idx) => (
          <div
            key={eleve._id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: fullListRowPadding,
              borderBottom:
                idx < classement.length - 1
                  ? `1px solid ${cardBorder}`
                  : "none",
              background:
                idx % 2 === 0 ? "transparent" : dark ? "#26334D" : "#F8FAFC",
              borderRadius: 4,
              color: textPrimary,
              gap: 12,
              minWidth: 0,
            }}
          >
            <span
              style={{
                fontWeight: idx < 3 ? 700 : 500,
                fontSize: fullListFontSize,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                minWidth: 0,
                flex: 1,
              }}
            >
              {idx + 1}. {eleve.nom} {eleve.postnom}
            </span>
            <span
              style={{
                fontWeight: 600,
                color: accent,
                fontSize: fullListFontSize,
                fontVariantNumeric: "tabular-nums",
                flexShrink: 0,
              }}
            >
              {eleve.moyenneGenerale.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}