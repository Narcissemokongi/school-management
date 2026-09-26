// src/components/ui/Badge.jsx
import { useMemo } from "react";
import { useTokens } from "@/theme/tokens";

// ✅ KEYFRAMES au module-level
const StatusDotKeyframes = (
  <style>{`
    @keyframes ui-dot-pulse {
      0%   { box-shadow: 0 0 0 0 currentColor; opacity: 0.6; }
      70%  { box-shadow: 0 0 0 6px transparent; opacity: 0; }
      100% { box-shadow: 0 0 0 0 transparent; opacity: 0; }
    }
    .ui-dot-pulse::after {
      content: "";
      position: absolute;
      inset: 0;
      border-radius: 50%;
      background: currentColor;
      animation: ui-dot-pulse 1.5s ease-out infinite;
    }
    @media (prefers-reduced-motion: reduce) {
      .ui-dot-pulse::after { animation: none !important; }
    }
  `}</style>
);

export function Badge({
  children,
  variant = "neutral",
  size = "md",
  icon,
  dot = false,
  outline = false,
}) {
  const t = useTokens();
  const cfg = t.status[variant] ?? t.status.neutral;

  const style = useMemo(() => {
    const sizes = {
      sm: { padding: "2px 6px", fontSize: 10 },
      md: { padding: "4px 10px", fontSize: 12 },
    };
    const base = {
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      borderRadius: t.radius.full,
      fontWeight: 600,
      textTransform: "uppercase",
      letterSpacing: 0.3,
      whiteSpace: "nowrap",
      ...sizes[size],
    };
    if (outline) {
      return {
        ...base,
        background: "transparent",
        color: cfg.fg,
        border: `1px solid ${cfg.border}`,
      };
    }
    return {
      ...base,
      background: cfg.bg,
      color: cfg.fg,
      border: "none",
    };
    // ✅ `cfg` retiré des deps (dérivé de `variant`)
  }, [t, variant, size, outline]);

  return (
    <span style={style}>
      {dot && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: cfg.fg,
            flexShrink: 0,
          }}
          aria-hidden="true"
        />
      )}
      {!dot && icon}
      {children}
    </span>
  );
}

export function RoleBadge({ role, size = "md" }) {
  const t = useTokens();
  const cfg = t.role[role] ?? t.status.neutral;

  const sizes = {
    sm: { padding: "2px 6px", fontSize: 10 },
    md: { padding: "3px 10px", fontSize: 11 },
  };

  const labels = {
    admin: "Admin",
    superAdmin: "Super Admin",
    directeur: "Directeur",
    enseignant: "Enseignant",
    parent: "Parent",
    eleve: "Élève",
    disciplinaire: "Disciplinaire",
    comptable: "Comptable",
  };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: t.radius.full,
        fontWeight: 700,
        textTransform: "capitalize",
        letterSpacing: 0.2,
        background: cfg.bg,
        color: cfg.fg,
        ...sizes[size],
      }}
    >
      {labels[role] ?? role}
    </span>
  );
}

export function StatusDot({ variant = "success", size = 8, pulse = false }) {
  const t = useTokens();
  const cfg = t.status[variant] ?? t.status.neutral;

  return (
    <>
      {pulse && StatusDotKeyframes}
      <span
        className={pulse ? "ui-dot-pulse" : undefined}
        style={{
          position: "relative",
          display: "inline-block",
          width: size,
          height: size,
          borderRadius: "50%",
          background: cfg.fg,
          color: cfg.fg,
          flexShrink: 0,
        }}
        aria-hidden="true"
      />
    </>
  );
}