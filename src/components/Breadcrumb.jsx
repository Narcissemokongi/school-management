// src/components/Breadcrumb.jsx
import { useState } from "react";
import { ChevronRight, Home, MoreHorizontal } from "lucide-react";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";

// ════════════════════════════════════════════════════════════════════
// CONSTANTES MODULE-LEVEL
// ════════════════════════════════════════════════════════════════════
const TAP_BASE = {
  touchAction: "manipulation",
  WebkitTapHighlightColor: "transparent",
  minHeight: 44,
};

const FOCUS_RING = (color) => ({
  outline: `2px solid ${color}`,
  outlineOffset: 2,
});

// ════════════════════════════════════════════════════════════════════
// COMPOSANT INTERACTIF — hover/focus/pressed via state React
// ════════════════════════════════════════════════════════════════════
function BreadcrumbLink({
  href,
  onClick,
  label,
  icon,
  isMobile,
  fontSize,
  mutedColor,
  hoverColor,
  focusColor,
  children,
  as = "button",
}) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);

  const color = hovered || pressed ? hoverColor : mutedColor;

  const baseStyle = {
    ...TAP_BASE,
    background: "none",
    border: "none",
    color,
    cursor: "pointer",
    fontSize,
    fontWeight: 400,
    whiteSpace: "nowrap",
    padding: 0,
    display: "inline-flex",
    alignItems: "center",
    gap: isMobile ? 4 : 6,
    transition: "color 0.15s, transform 0.1s",
    textDecoration: "none",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: "100%",
    fontFamily: "inherit",
    transform: pressed ? "scale(0.97)" : "scale(1)",
    ...(focused ? FOCUS_RING(focusColor) : null),
  };

  const handlers = {
    onPointerDown: () => setPressed(true),
    onPointerUp: () => setPressed(false),
    onPointerLeave: () => {
      setPressed(false);
      setHovered(false);
    },
    onPointerCancel: () => setPressed(false),
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
  };

  if (as === "a" && href) {
    return (
      <a
        href={href}
        onClick={onClick}
        style={baseStyle}
        aria-label={`Naviguer vers ${label}`}
        title={typeof label === "string" ? label : undefined}
        {...handlers}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      style={baseStyle}
      aria-label={`Naviguer vers ${label}`}
      title={typeof label === "string" ? label : undefined}
      {...handlers}
    >
      {children}
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════
// BOUTON HOME — state React
// ════════════════════════════════════════════════════════════════════
function HomeButton({ onClick, mutedColor, hoverColor, focusColor, icon }) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => {
        setPressed(false);
        setHovered(false);
      }}
      onPointerCancel={() => setPressed(false)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        ...TAP_BASE,
        background: "none",
        border: "none",
        color: hovered || pressed ? hoverColor : mutedColor,
        cursor: "pointer",
        padding: 0,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "color 0.15s, transform 0.1s",
        flexShrink: 0,
        transform: pressed ? "scale(0.94)" : "scale(1)",
        ...(focused ? FOCUS_RING(focusColor) : null),
      }}
      aria-label="Retour à l'accueil"
    >
      {icon}
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ════════════════════════════════════════════════════════════════════
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
  const focusColor = dark ? "#818CF8" : "#4F46E5";

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
          <MoreHorizontal size={iconSize} aria-hidden="true" />
        </span>
      );
    }

    // Dernier élément (non cliquable) — avec troncature
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
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: "100%",
          }}
          aria-current="page"
          title={typeof label === "string" ? label : undefined}
        >
          {item.icon && (
            <span
              aria-hidden="true"
              style={{ display: "inline-flex", flexShrink: 0 }}
            >
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
          <span
            aria-hidden="true"
            style={{ display: "inline-flex", flexShrink: 0 }}
          >
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

    if (clickable) {
      return (
        <BreadcrumbLink
          href={item.href}
          onClick={handleClick}
          label={label}
          icon={item.icon}
          isMobile={isMobile}
          fontSize={fontSize}
          mutedColor={mutedColor}
          hoverColor={hoverColor}
          focusColor={focusColor}
          as={item.href ? "a" : "button"}
        >
          {content}
        </BreadcrumbLink>
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
          flexWrap: "nowrap",
          listStyle: "none",
          padding: 0,
          margin: 0,
          overflow: "hidden",
          minWidth: 0,
          maxWidth: "100%",
        }}
      >
        {/* Accueil — jamais tronqué */}
        <li style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
          {onNavigateHome ? (
            <HomeButton
              onClick={onNavigateHome}
              mutedColor={mutedColor}
              hoverColor={hoverColor}
              focusColor={focusColor}
              icon={homeIcon}
            />
          ) : (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                color: mutedColor,
                flexShrink: 0,
              }}
              aria-hidden="true"
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