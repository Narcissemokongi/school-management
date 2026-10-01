// src/components/AccueilParent.jsx
import { useMemo, useCallback, useState } from "react";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  Users,
  ClipboardList,
  ArrowRight,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";

// ============================================================
// CONSTANTES MODULE-LEVEL
// ============================================================
const TAP_BASE = {
  touchAction: "manipulation",
  WebkitTapHighlightColor: "transparent",
  minHeight: 44,
};

// ============================================================
// CARTE ENFANT (extraite pour state React)
// ============================================================
function EnfantCard({ enfant, nbPunitions, isClickable, onSelect, tokens, isMobile, dark }) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);

  const isActive = hovered || pressed;

  const childCardPadding = isMobile ? "12px 14px" : "16px 20px";
  const childNameSize = isMobile ? 15 : 16;
  const childClassSize = isMobile ? 12 : 13;
  const badgeSize = isMobile ? 11 : 12;
  const arrowSize = isMobile ? 16 : 18;

  const handleClick = () => {
    if (isClickable && onSelect) onSelect(enfant);
  };

  const handleKeyDown = (ev) => {
    if (!isClickable) return;
    if (ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={isClickable ? handleClick : undefined}
      onKeyDown={isClickable ? handleKeyDown : undefined}
      onMouseEnter={() => isClickable && setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false); }}
      onPointerDown={() => isClickable && setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      aria-label={
        isClickable
          ? `${enfant.nom} ${enfant.postnom}, classe ${enfant.classe}${
              nbPunitions > 0 ? `, ${nbPunitions} punition${nbPunitions > 1 ? "s" : ""}` : ""
            }`
          : undefined
      }
      style={{
        ...TAP_BASE,
        background: tokens.cardBg,
        borderRadius: 12,
        padding: childCardPadding,
        boxShadow: tokens.shadow,
        border: `1px solid ${
          isActive || focused ? tokens.accent : tokens.cardBorder
        }`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        transition:
          "background-color 0.3s, border-color 0.15s, transform 0.1s",
        flexWrap: isMobile ? "wrap" : "nowrap",
        gap: isMobile ? 8 : 0,
        cursor: isClickable ? "pointer" : "default",
        transform: pressed ? "scale(0.99)" : "scale(1)",
        outline: "none",
        ...(focused ? { outline: `2px solid ${tokens.accent}`, outlineOffset: 2 } : null),
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontWeight: 600,
            fontSize: childNameSize,
            color: tokens.textPrimary,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {enfant.nom} {enfant.postnom}{" "}
          {enfant.prenom && (
            <span style={{ fontWeight: 400, color: tokens.textSecondary }}>
              {enfant.prenom}
            </span>
          )}
        </div>
        <div
          style={{
            color: tokens.textSecondary,
            fontSize: childClassSize,
            marginTop: 2,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          Classe {enfant.classe}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: isMobile ? 8 : 12,
          marginLeft: isMobile ? 0 : 8,
          flexShrink: 0,
        }}
      >
        {nbPunitions > 0 && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              background: dark ? "#78350F" : "#FEF3C7",
              color: dark ? "#FBBF24" : "#92400E",
              padding: "2px 8px",
              borderRadius: 12,
              fontSize: badgeSize,
              fontWeight: 600,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <AlertTriangle size={isMobile ? 12 : 14} aria-hidden="true" />
            {nbPunitions} punition{nbPunitions > 1 ? "s" : ""}
          </span>
        )}
        {isClickable ? (
          <ChevronRight size={arrowSize} color={tokens.accent} aria-hidden="true" />
        ) : (
          <ArrowRight size={arrowSize} color={tokens.accent} aria-hidden="true" />
        )}
      </div>
    </div>
  );
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================
export function AccueilParent({
  user,
  eleves = [],
  punitions = [],
  onSelectEnfant,
}) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();

  // ============================================================
  // Map punitions par élève — O(n)
  // ============================================================
  const punitionsParEleve = useMemo(() => {
    const acc = new Map();
    for (const p of punitions) {
      acc.set(p.idEleve, (acc.get(p.idEleve) ?? 0) + 1);
    }
    return acc;
  }, [punitions]);

  const totalPunitions = useMemo(() => {
    let total = 0;
    for (const e of eleves) {
      total += punitionsParEleve.get(e._id) ?? 0;
    }
    return total;
  }, [eleves, punitionsParEleve]);

  // ============================================================
  // Tokens
  // ============================================================
  const tokens = useMemo(() => ({
    textPrimary: dark ? "#F1F5F9" : "#1E293B",
    textSecondary: dark ? "#94A3B8" : "#64748B",
    cardBg: dark ? "#1E293B" : "#FFFFFF",
    cardBorder: dark ? "#334155" : "#E2E8F0",
    accent: dark ? "#818CF8" : "#4F46E5",
    warning: dark ? "#FBBF24" : "#F59E0B",
    shadow: dark
      ? "0 1px 3px rgba(0,0,0,0.3)"
      : "0 1px 3px rgba(0,0,0,0.05)",
  }), [dark]);

  // Styles adaptatifs
  const containerPadding = isMobile ? "16px 12px" : "24px 16px";
  const titleSize = isMobile ? 22 : 28;
  const subtitleSize = isMobile ? 14 : 16;
  const statGridStyle = {
    display: "grid",
    gridTemplateColumns: isMobile
      ? "1fr"
      : "repeat(auto-fit, minmax(200px, 1fr))",
    gap: isMobile ? 12 : 16,
    marginBottom: isMobile ? 20 : 32,
  };
  const cardPadding = isMobile ? 14 : 20;
  const statIconSize = isMobile ? 28 : 32;
  const statValueSize = isMobile ? 24 : 28;
  const statLabelSize = isMobile ? 13 : 14;

  const handleChildClick = useCallback(
    (enfant) => {
      if (onSelectEnfant) onSelectEnfant(enfant);
    },
    [onSelectEnfant]
  );

  // ============================================================
  // Garde : user non chargé
  // ============================================================
  if (!user) {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-live="polite"
        style={{
          maxWidth: 800,
          margin: "0 auto",
          padding: containerPadding,
          textAlign: "center",
          color: tokens.textSecondary,
        }}
      >
        <span style={{ position: "absolute", left: -9999 }}>
          Chargement de votre session
        </span>
        Chargement...
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: 800,
        margin: "0 auto",
        padding: containerPadding,
      }}
    >
      {/* ==================== EN-TÊTE ==================== */}
      <div style={{ marginBottom: isMobile ? 20 : 32 }}>
        <h2
          style={{
            fontSize: titleSize,
            fontWeight: 700,
            color: tokens.textPrimary,
            margin: 0,
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <Users
            size={isMobile ? 24 : 28}
            color={tokens.accent}
            aria-hidden="true"
          />
          <span>Bienvenue, {user.nom}</span>
        </h2>
        <p
          style={{
            color: tokens.textSecondary,
            marginTop: 4,
            fontSize: subtitleSize,
          }}
        >
          Résumé concernant vos enfants.
        </p>
      </div>

      {/* ==================== STATS ==================== */}
      <div style={statGridStyle}>
        <article
          aria-label={`Enfants suivis : ${eleves.length}`}
          style={{
            background: tokens.cardBg,
            borderRadius: 16,
            padding: cardPadding,
            textAlign: "center",
            boxShadow: tokens.shadow,
            border: `1px solid ${tokens.cardBorder}`,
            transition: "background-color 0.3s",
            minHeight: 44,
          }}
        >
          <Users size={statIconSize} color={tokens.accent} aria-hidden="true" />
          <div
            style={{
              fontSize: statValueSize,
              fontWeight: 900,
              color: tokens.accent,
              marginTop: 8,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {eleves.length.toLocaleString("fr-FR")}
          </div>
          <div
            style={{
              color: tokens.textSecondary,
              fontSize: statLabelSize,
              marginTop: 4,
            }}
          >
            Enfants suivis
          </div>
        </article>

        <article
          aria-label={`Total punitions : ${totalPunitions}`}
          style={{
            background: tokens.cardBg,
            borderRadius: 16,
            padding: cardPadding,
            textAlign: "center",
            boxShadow: tokens.shadow,
            border: `1px solid ${tokens.cardBorder}`,
            transition: "background-color 0.3s",
            minHeight: 44,
          }}
        >
          <ClipboardList
            size={statIconSize}
            color={tokens.warning}
            aria-hidden="true"
          />
          <div
            style={{
              fontSize: statValueSize,
              fontWeight: 900,
              color: tokens.warning,
              marginTop: 8,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {totalPunitions.toLocaleString("fr-FR")}
          </div>
          <div
            style={{
              color: tokens.textSecondary,
              fontSize: statLabelSize,
              marginTop: 4,
            }}
          >
            Total punitions
          </div>
        </article>
      </div>

      {/* ==================== LISTE ENFANTS ==================== */}
      <div>
        <h3
          style={{
            fontSize: isMobile ? 18 : 20,
            fontWeight: 600,
            color: tokens.textPrimary,
            marginBottom: isMobile ? 12 : 16,
          }}
        >
          Mes enfants
        </h3>

        {eleves.length === 0 ? (
          <div
            role="status"
            aria-live="polite"
            style={{
              background: tokens.cardBg,
              borderRadius: 16,
              padding: isMobile ? 32 : 48,
              textAlign: "center",
              boxShadow: tokens.shadow,
              border: `1px solid ${tokens.cardBorder}`,
              color: tokens.textSecondary,
            }}
          >
            <Users
              size={isMobile ? 36 : 48}
              color={dark ? "#334155" : "#94A3B8"}
              style={{ marginBottom: 12 }}
              aria-hidden="true"
            />
            <p style={{ margin: 0, fontSize: subtitleSize }}>
              Aucun enfant enregistré.
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: isMobile ? 8 : 12 }}>
            {eleves.map((e) => {
              const nbPunitions = punitionsParEleve.get(e._id) ?? 0;
              const isClickable = Boolean(onSelectEnfant);

              return (
                <EnfantCard
                  key={e._id}
                  enfant={e}
                  nbPunitions={nbPunitions}
                  isClickable={isClickable}
                  onSelect={handleChildClick}
                  tokens={tokens}
                  isMobile={isMobile}
                  dark={dark}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}