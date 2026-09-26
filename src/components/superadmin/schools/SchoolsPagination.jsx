// src/components/SuperAdmin/schools/SchoolsPagination.jsx
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTokens } from "@/theme/tokens";
import { useIsMobile } from "@/hooks/useIsMobile";

export function SchoolsPagination({ currentPage, totalPages, onChange }) {
  const t = useTokens();
  const isMobile = useIsMobile();

  if (totalPages <= 1) return null;

  return (
    <div
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
        icon={<ChevronLeft size={16} />}
        label={isMobile ? undefined : "Précédent"}
        ariaLabel="Page précédente"
      />
      <span
        style={{
          padding: "8px 12px",
          color: t.text.muted,
          fontSize: 13,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        Page {currentPage} / {totalPages}
      </span>
      <PageButton
        onClick={() => onChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        iconRight={<ChevronRight size={16} />}
        label={isMobile ? undefined : "Suivant"}
        ariaLabel="Page suivante"
      />
    </div>
  );
}

function PageButton({ onClick, disabled, icon, iconRight, label, ariaLabel }) {
  const t = useTokens();
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 12px",
        border: `1px solid ${t.border.default}`,
        borderRadius: t.radius.sm,
        background: hovered && !disabled ? t.surface.hover : "transparent",
        cursor: disabled ? "not-allowed" : "pointer",
        color: t.text.primary,
        opacity: disabled ? 0.5 : 1,
        fontSize: 13,
        fontFamily: t.font.family,
        outline: "none",
        transition: `background ${t.transition.fast}`,
      }}
    >
      {icon}
      {label}
      {iconRight}
    </button>
  );
}