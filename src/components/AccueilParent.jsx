import { useMemo, useCallback } from "react";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  Users,
  ClipboardList,
  ArrowRight,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";

export function AccueilParent({
  user,
  eleves = [],
  punitions = [],
  onSelectEnfant, // ✅ Nouvelle prop optionnelle
}) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();

  // ============================================================
  // ✅ Map punitions par élève — 1 seule passe O(n)
  // ============================================================
  const punitionsParEleve = useMemo(() => {
    const acc = new Map();
    for (const p of punitions) {
      acc.set(p.idEleve, (acc.get(p.idEleve) ?? 0) + 1);
    }
    return acc;
  }, [punitions]);

  // ✅ Total via la Map — O(n) au lieu de O(n×m)
  const totalPunitions = useMemo(() => {
    let total = 0;
    for (const e of eleves) {
      total += punitionsParEleve.get(e._id) ?? 0;
    }
    return total;
  }, [eleves, punitionsParEleve]);

  // ============================================================
  // Couleurs adaptatives
  // ============================================================
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const accent = dark ? "#818CF8" : "#4F46E5";
  const warning = dark ? "#FBBF24" : "#F59E0B";
  const shadow = dark
    ? "0 1px 3px rgba(0,0,0,0.3)"
    : "0 1px 3px rgba(0,0,0,0.05)";

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
  const childCardPadding = isMobile ? "12px 14px" : "16px 20px";
  const childNameSize = isMobile ? 15 : 16;
  const childClassSize = isMobile ? 12 : 13;
  const badgeSize = isMobile ? 11 : 12;
  const arrowSize = isMobile ? 16 : 18;

  // ============================================================
  // ✅ Handler stable pour clic sur un enfant
  // ============================================================
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
        style={{
          maxWidth: 800,
          margin: "0 auto",
          padding: containerPadding,
          textAlign: "center",
          color: textSecondary,
        }}
      >
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
            color: textPrimary,
            margin: 0,
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          {/* ✅ Emoji retiré, icône lucide à la place */}
          <Users size={isMobile ? 24 : 28} color={accent} />
          <span>Bienvenue, {user.nom}</span>
        </h2>
        <p
          style={{
            color: textSecondary,
            marginTop: 4,
            fontSize: subtitleSize,
          }}
        >
          Résumé concernant vos enfants.
        </p>
      </div>

      {/* ==================== STATS ==================== */}
      <div style={statGridStyle}>
        {/* Carte Enfants */}
        <div
          style={{
            background: cardBg,
            borderRadius: 16,
            padding: cardPadding,
            textAlign: "center",
            boxShadow: shadow,
            border: `1px solid ${cardBorder}`,
            transition: "background-color 0.3s",
          }}
        >
          <Users size={statIconSize} color={accent} />
          <div
            style={{
              fontSize: statValueSize,
              fontWeight: 900,
              color: accent,
              marginTop: 8,
            }}
          >
            {eleves.length}
          </div>
          <div
            style={{
              color: textSecondary,
              fontSize: statLabelSize,
              marginTop: 4,
            }}
          >
            Enfants suivis
          </div>
        </div>

        {/* Carte Punitions */}
        <div
          style={{
            background: cardBg,
            borderRadius: 16,
            padding: cardPadding,
            textAlign: "center",
            boxShadow: shadow,
            border: `1px solid ${cardBorder}`,
            transition: "background-color 0.3s",
          }}
        >
          <ClipboardList size={statIconSize} color={warning} />
          <div
            style={{
              fontSize: statValueSize,
              fontWeight: 900,
              color: warning,
              marginTop: 8,
            }}
          >
            {totalPunitions}
          </div>
          <div
            style={{
              color: textSecondary,
              fontSize: statLabelSize,
              marginTop: 4,
            }}
          >
            Total punitions
          </div>
        </div>
      </div>

      {/* ==================== LISTE ENFANTS ==================== */}
      <div>
        <h3
          style={{
            fontSize: isMobile ? 18 : 20,
            fontWeight: 600,
            color: textPrimary,
            marginBottom: isMobile ? 12 : 16,
          }}
        >
          Mes enfants
        </h3>

        {eleves.length === 0 ? (
          <div
            style={{
              background: cardBg,
              borderRadius: 16,
              padding: isMobile ? 32 : 48,
              textAlign: "center",
              boxShadow: shadow,
              border: `1px solid ${cardBorder}`,
              color: textSecondary,
            }}
          >
            <Users
              size={isMobile ? 36 : 48}
              color={dark ? "#334155" : "#94A3B8"}
              style={{ marginBottom: 12 }}
            />
            <p style={{ margin: 0, fontSize: subtitleSize }}>
              Aucun enfant enregistré.
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: isMobile ? 8 : 12 }}>
            {eleves.map((e) => {
              // ✅ Lookup O(1) au lieu de .filter()
              const nbPunitions = punitionsParEleve.get(e._id) ?? 0;
              const isClickable = Boolean(onSelectEnfant);

              return (
                <div
                  key={e._id}
                  role={isClickable ? "button" : undefined}
                  tabIndex={isClickable ? 0 : undefined}
                  onClick={() => handleChildClick(e)}
                  onKeyDown={
                    isClickable
                      ? (ev) => {
                          if (ev.key === "Enter" || ev.key === " ") {
                            ev.preventDefault();
                            handleChildClick(e);
                          }
                        }
                      : undefined
                  }
                  style={{
                    background: cardBg,
                    borderRadius: 12,
                    padding: childCardPadding,
                    boxShadow: shadow,
                    border: `1px solid ${cardBorder}`,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    transition:
                      "background-color 0.3s, border-color 0.15s, transform 0.1s",
                    flexWrap: isMobile ? "wrap" : "nowrap",
                    gap: isMobile ? 8 : 0,
                    cursor: isClickable ? "pointer" : "default",
                  }}
                  onMouseEnter={(ev) => {
                    if (!isClickable) return;
                    ev.currentTarget.style.borderColor = accent;
                  }}
                  onMouseLeave={(ev) => {
                    if (!isClickable) return;
                    ev.currentTarget.style.borderColor = cardBorder;
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: childNameSize,
                        color: textPrimary,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {e.nom} {e.postnom}{" "}
                      {e.prenom && (
                        <span
                          style={{
                            fontWeight: 400,
                            color: textSecondary,
                          }}
                        >
                          {e.prenom}
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        color: textSecondary,
                        fontSize: childClassSize,
                        marginTop: 2,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Classe {e.classe}
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
                        }}
                      >
                        <AlertTriangle size={isMobile ? 12 : 14} />
                        {nbPunitions} punition{nbPunitions > 1 ? "s" : ""}
                      </span>
                    )}
                    {/* ✅ Chevron uniquement si cliquable */}
                    {isClickable ? (
                      <ChevronRight size={arrowSize} color={accent} />
                    ) : (
                      <ArrowRight size={arrowSize} color={accent} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}