import { ChevronRight, Home, MoreHorizontal } from "lucide-react";
import { useStyles } from "../styles/theme";
import { useState, useEffect } from "react";

export function Breadcrumb({
  items = [],
  onNavigate,
  onNavigateHome,
  separator = <ChevronRight size={14} />,
  maxItems = 6,             // nombre max d'items avant troncature
  homeIcon = <Home size={16} />,
}) {
  const { dark } = useStyles();

  const mutedColor = dark ? "#94A3B8" : "#64748B";
  const activeColor = dark ? "#F1F5F9" : "#1E293B";
  const hoverColor = dark ? "#CBD5E1" : "#334155";

  // Normaliser les items : chaîne ou objet
  const normalized = items.map((item) =>
    typeof item === "string"
      ? { label: item }
      : item
  );

  // Troncature
  const shouldTruncate = normalized.length > maxItems;
  let visibleItems = normalized;
  if (shouldTruncate) {
    visibleItems = [
      normalized[0],
      { label: "…", truncateOnly: true },
      ...normalized.slice(-(maxItems - 2)),
    ];
  }

  const renderItemContent = (item, isLast) => {
    const clickable = !isLast && (item.onClick || item.href || onNavigate);
    const label = item.label;

    const baseStyle = {
      background: "none",
      border: "none",
      color: isLast ? activeColor : mutedColor,
      cursor: clickable ? "pointer" : "default",
      fontSize: 14,
      fontWeight: isLast ? 600 : 400,
      whiteSpace: "nowrap",
      padding: 0,
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      transition: "color 0.2s",
      textDecoration: "none",
    };

    const handleMouseEnter = (e) => {
      if (clickable) e.currentTarget.style.color = hoverColor;
    };
    const handleMouseLeave = (e) => {
      if (clickable) e.currentTarget.style.color = isLast ? activeColor : mutedColor;
    };

    if (item.truncateOnly) {
      return (
        <span style={{ color: mutedColor, display: "inline-flex", alignItems: "center" }}>
          <MoreHorizontal size={14} />
        </span>
      );
    }

    if (item.icon) {
      return (
        <>
          <span style={{ display: "inline-flex", alignItems: "center" }}>{item.icon}</span>
          {label && <span>{label}</span>}
        </>
      );
    }

    if (clickable && item.href) {
      return (
        <a
          href={item.href}
          onClick={(e) => {
            if (item.onClick) {
              e.preventDefault();
              item.onClick();
            }
          }}
          style={baseStyle}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {label}
        </a>
      );
    }

    if (clickable) {
      return (
        <button
          onClick={() => {
            if (item.onClick) item.onClick();
            else if (onNavigate) onNavigate(item.label);
          }}
          style={baseStyle}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          aria-label={`Naviguer vers ${label}`}
        >
          {label}
        </button>
      );
    }

    // Dernier élément (non cliquable)
    return (
      <span
        style={{
          color: activeColor,
          fontWeight: 600,
          whiteSpace: "nowrap",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
        }}
        aria-current="page"
      >
        {item.icon && <span style={{ display: "inline-flex" }}>{item.icon}</span>}
        {label}
      </span>
    );
  };

  return (
    <nav aria-label="Fil d'ariane" style={{ marginBottom: 16 }}>
      <ol
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 14,
          color: mutedColor,
          flexWrap: "wrap",
          listStyle: "none",
          padding: 0,
          margin: 0,
        }}
      >
        {/* Accueil */}
        <li style={{ display: "flex", alignItems: "center" }}>
          {onNavigateHome ? (
            <button
              onClick={onNavigateHome}
              style={{
                background: "none",
                border: "none",
                color: mutedColor,
                cursor: "pointer",
                padding: 0,
                display: "inline-flex",
                alignItems: "center",
              }}
              aria-label="Retour à l'accueil"
            >
              {homeIcon}
            </button>
          ) : (
            <span style={{ display: "inline-flex", alignItems: "center", color: mutedColor }}>
              {homeIcon}
            </span>
          )}
        </li>

        {visibleItems.map((item, idx) => {
          const isLast = idx === visibleItems.length - 1;
          return (
            <li key={idx} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span aria-hidden="true">{separator}</span>
              {renderItemContent(item, isLast)}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}