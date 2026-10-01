// src/components/SuperAdmin/schools/SchoolsPagination.jsx
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTokens } from "@/theme/tokens";
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

export function SchoolsPagination({ currentPage, totalPages, onChange }) {
  const t = useTokens();
  const isMobile = useIsMobile();

  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label="Pagination des écoles"
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: 8,
        marginTop: 16,
        flexWrap: "wrap",
      }}
    >
      <PageButton
        onClick={() => onChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        icon={<ChevronLeft size={16} aria-hidden="true" />}
        label={isMobile ? undefined : "Précédent"}
        ariaLabel="Page précédente"
        t={t}
      />
      <span
        aria-live="polite"
        style={{
          padding: "8px 12px",
          color: t.text.muted,
          fontSize: 13,
          fontVariantNumeric: "tabular-nums",
          minHeight: 44,
          display: "inline-flex",
          alignItems: "center",
        }}
      >
        Page {currentPage} / {totalPages}
      </span>
      <PageButton
        onClick={() => onChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        iconRight={<ChevronRight size={16} aria-hidden="true" />}
        label={isMobile ? undefined : "Suivant"}
        ariaLabel="Page suivante"
        t={t}
      />
    </nav>
  );
}

function PageButton({ onClick, disabled, icon, iconRight, label, ariaLabel, t }) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);

  const isActive = hovered || pressed;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false); }}
      onPointerDown={() => !disabled && setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        ...TAP_BASE,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        padding: "8px 12px",
        border: `1px solid ${t.border.default}`,
        borderRadius: t.radius.sm,
        background: isActive && !disabled ? t.surface.hover : "transparent",
        cursor: disabled ? "not-allowed" : "pointer",
        color: t.text.primary,
        opacity: disabled ? 0.5 : 1,
        fontSize: 13,
        fontFamily: t.font.family,
        outline: "none",
        transform: pressed && !disabled ? "scale(0.97)" : "scale(1)",
        transition: `background ${t.transition.fast}, transform 0.12s ease`,
        ...(focused && !disabled ? FOCUS_RING(t.primary?.["500"] ?? t.text.primary) : null),
      }}
    >
      {icon}
      {label}
      {iconRight}
    </button>
  );
}