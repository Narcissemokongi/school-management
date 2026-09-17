// src/components/Breadcrumb.jsx
import { ChevronRight, Home, MoreHorizontal } from "lucide-react";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";

export function Breadcrumb({
  items = [],
  onNavigate,
  onNavigateHome,
  separator = <ChevronRight size={14} />,
  maxItems,
  homeIcon = <Home size={16} />,
}) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();

  const mutedColor = dark ? "#94A3B8" : "#64748B";
  const activeColor = dark ? "#F1F5F9" : "#1E293B";
  const hoverColor = dark ? "#CBD5E1" : "#334155";

  const fontSize = isMobile ? 12 : 14;
  const iconSize = isMobile ? 13 : 14;
  const gap = isMobile ? 4 : 6;

  // ✅ FIX — maxItems adaptatif : 3 sur mobile, 6 par défaut sur desktop
  const effectiveMaxItems = maxItems ?? (isMobile ? 3 : 6);

  // Normaliser les items
  const normalized = items.map((item) =>
    typeof item === "string" ? { label: item } : item
  );

  // Troncature
  const shouldTruncate = normalized.length > effectiveMaxItems;
  let visibleItems = normalized;
  if (shouldTruncate) {
    visibleItems = [
      normalized[0],
      { label: "…", truncateOnly: true },
      ...normalized.slice(-(effectiveMaxItems - 2)),
    ];
  }

  // ✅ FIX — styles partagés pour les items cliquables
  const clickableStyle = {
    background: "none",
    border: "none",
    color: mutedColor,
    cursor: "pointer",
    fontSize,
    fontWeight: 400,
    whiteSpace: "nowrap",
    padding: 0,
    display: "inline-flex",
    alignItems: "center",
    gap: isMobile ? 4 : 6,
    transition: "color 0.2s",
    textDecoration: "none",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: "100%",
  };

  const renderItemContent = (item, isLast) => {
    const clickable = !isLast && (item.onClick || item.href || onNavigate);
    const label = item.label;

    const handleClick = (e) => {
      if (item.onClick) {
        if (e) e.preventDefault();
        item.onClick();
      } else if (onNavigate) {
        onNavigate(item.label);
      }
    };

    const handleMouseEnter = (e) => {
      if (clickable) e.currentTarget.style.color = hoverColor;
    };
    const handleMouseLeave = (e) => {
      if (clickable) e.currentTarget.style.color = mutedColor;
    };

    // Item "…" : non cliquable
    if (item.truncateOnly) {
      return (
        <span
          style={{
            color: mutedColor,
            display: "inline-flex",
            alignItems: "center",
            flexShrink: 0,
          }}
          title="Éléments masqués"
          aria-label="Éléments masqués"
        >
          <MoreHorizontal size={iconSize} />
        </span>
      );
    }

    // Dernier élément (non cliquable) — ✅ FIX troncature
    if (isLast) {
      return (
        <span
          style={{
            color: activeColor,
            fontWeight: 600,
            whiteSpace: "nowrap",
            display: "inline-flex",
            alignItems: "center",
            gap: isMobile ? 4 : 6,
            fontSize,
            // ✅ FIX — peut rétrécir et afficher "…" si trop long
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: "100%",
          }}
          aria-current="page"
          title={typeof label === "string" ? label : undefined}
        >
          {item.icon && (
            <span style={{ display: "inline-flex", flexShrink: 0 }}>
              {item.icon}
            </span>
          )}
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {label}
          </span>
        </span>
      );
    }

    // Item cliquable
    const content = (
      <>
        {item.icon && (
          <span style={{ display: "inline-flex", flexShrink: 0 }}>
            {item.icon}
          </span>
        )}
        {label && (
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {label}
          </span>
        )}
      </>
    );

    if (clickable && item.href) {
      return (
        <a
          href={item.href}
          onClick={handleClick}
          style={clickableStyle}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          title={typeof label === "string" ? label : undefined}
        >
          {content}
        </a>
      );
    }

    if (clickable) {
      return (
        <button
          type="button"
          onClick={handleClick}
          style={clickableStyle}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          aria-label={`Naviguer vers ${label}`}
          title={typeof label === "string" ? label : undefined}
        >
          {content}
        </button>
      );
    }

    // Non cliquable non-last
    return (
      <span
        style={{
          color: mutedColor,
          whiteSpace: "nowrap",
          display: "inline-flex",
          alignItems: "center",
          gap: isMobile ? 4 : 6,
          fontSize,
          overflow: "hidden",
          textOverflow: "ellipsis",
          minWidth: 0,
        }}
      >
        {content}
      </span>
    );
  };

  return (
    <nav
      aria-label="Fil d'ariane"
      style={{
        marginBottom: isMobile ? 12 : 16,
        // ✅ FIX — conteneur contraint : pas de débordement horizontal
        overflow: "hidden",
        maxWidth: "100%",
        minWidth: 0,
      }}
    >
      <ol
        style={{
          display: "flex",
          alignItems: "center",
          gap,
          fontSize,
          color: mutedColor,
          // ✅ FIX PRINCIPAL — plus de flexWrap → tout sur une seule ligne
          flexWrap: "nowrap",
          listStyle: "none",
          padding: 0,
          margin: 0,
          // ✅ FIX — contraint pour permettre la troncature des enfants
          overflow: "hidden",
          minWidth: 0,
          maxWidth: "100%",
        }}
      >
        {/* Accueil — jamais tronqué */}
        <li
          style={{
            display: "flex",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          {onNavigateHome ? (
            <button
              type="button"
              onClick={onNavigateHome}
              style={{
                background: "none",
                border: "none",
                color: mutedColor,
                cursor: "pointer",
                padding: 0,
                display: "inline-flex",
                alignItems: "center",
                transition: "color 0.2s",
                flexShrink: 0,
              }}
              aria-label="Retour à l'accueil"
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = hoverColor)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = mutedColor)
              }
            >
              {homeIcon}
            </button>
          ) : (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                color: mutedColor,
                flexShrink: 0,
              }}
            >
              {homeIcon}
            </span>
          )}
        </li>

        {visibleItems.map((item, idx) => {
          const isLast = idx === visibleItems.length - 1;
          return (
            <li
              key={idx}
              style={{
                display: "flex",
                alignItems: "center",
                gap,
                // ✅ FIX — séparateurs jamais tronqués
                minWidth: 0,
                flexShrink: isLast ? 1 : 0,
                overflow: "hidden",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  fontSize: iconSize,
                  display: "inline-flex",
                  alignItems: "center",
                  flexShrink: 0,
                  color: mutedColor,
                  opacity: 0.6,
                }}
              >
                {separator}
              </span>
              {renderItemContent(item, isLast)}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}