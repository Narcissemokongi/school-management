// src/components/ui/Fab.jsx
import { useState } from "react";
import { Plus } from "lucide-react";
import { useTokens } from "@/theme/tokens";

/**
 * Floating Action Button mobile.
 *
 * Props :
 * @param {ReactNode} [icon]         - Icône (défaut : Plus)
 * @param {string}    [label]        - Label accessible
 * @param {Function}  onClick
 * @param {string}    [color]        - Couleur de fond
 * @param {"sm"|"md"|"lg"} [size]    - Taille (défaut : md)
 * @param {Array}     [actions]      - Si fourni → FAB extensible
 * @param {boolean}   [extended]     - Si true, FAB avec label
 * @param {string}    [extendedLabel]
 * @param {number}    [bottom]       - Position depuis le bas (défaut : 24)
 */
export function Fab({
  icon,
  label = "Action principale",
  onClick,
  color,
  size = "md",
  actions,
  extended = false,
  extendedLabel,
  bottom,
}) {
  const t = useTokens();
  const [expanded, setExpanded] = useState(false);
  const [hovered, setHovered] = useState(false);

  const c = color ?? t.accent.primary;

  const sizes = {
    sm: 44,
    md: 56,
    lg: 64,
  };
  const iconSizes = {
    sm: 18,
    md: 22,
    lg: 26,
  };
  const fabSize = sizes[size];
  const iconSize = iconSizes[size];
  const bottomPos = bottom ?? 24;

  const isExpandable = Array.isArray(actions) && actions.length > 0;

  const handleClick = () => {
    if (isExpandable) {
      setExpanded((v) => !v);
    } else {
      onClick?.();
    }
  };

  return (
    <>
      {/* Backdrop si expanded */}
      {expanded && (
        <div
          onClick={() => setExpanded(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.3)",
            zIndex: 3998,
            animation: "fab-fade-in 0.15s ease-out",
          }}
          aria-hidden="true"
        />
      )}

      {/* Actions secondaires */}
      {isExpandable && expanded && (
        <div
          style={{
            position: "fixed",
            bottom: bottomPos + fabSize + 12,
            right: 20,
            display: "flex",
            flexDirection: "column",
            gap: 10,
            alignItems: "flex-end",
            zIndex: 4000,
          }}
        >
          {actions.map((action, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setExpanded(false);
                action.onClick?.();
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 14px",
                background: t.surface.elevated,
                border: `1px solid ${t.border.default}`,
                borderRadius: t.radius.full,
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                cursor: "pointer",
                fontFamily: t.font.family,
                animation: `fab-slide-up 0.2s ease-out ${i * 0.05}s both`,
              }}
            >
              <span
                style={{
                  fontSize: t.font.size.sm,
                  fontWeight: 600,
                  color: t.text.primary,
                  whiteSpace: "nowrap",
                }}
              >
                {action.label}
              </span>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: `${action.color ?? c}15`,
                  color: action.color ?? c,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {action.icon}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* FAB principal */}
      <button
        type="button"
        onClick={handleClick}
        aria-label={label}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: "fixed",
          bottom: bottomPos + (typeof window !== "undefined" ? 0 : 0),
          right: 20,
          bottom: `calc(${bottomPos}px + env(safe-area-inset-bottom, 0px))`,
          height: extended ? fabSize : fabSize,
          minWidth: extended ? "auto" : fabSize,
          padding: extended ? "0 20px" : 0,
          borderRadius: t.radius.full,
          background: c,
          color: "#FFFFFF",
          border: "none",
          boxShadow: hovered
            ? "0 6px 20px rgba(0,0,0,0.25)"
            : "0 4px 12px rgba(0,0,0,0.15)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: extended ? 8 : 0,
          fontSize: t.font.size.sm,
          fontWeight: 600,
          fontFamily: t.font.family,
          transition: "transform 0.2s, box-shadow 0.2s",
          transform: hovered ? "scale(1.05)" : "scale(1)",
          zIndex: 3999,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "transform 0.25s ease-out",
            transform: expanded ? "rotate(45deg)" : "rotate(0deg)",
          }}
        >
          {icon ?? <Plus size={iconSize} />}
        </div>
        {extended && <span>{extendedLabel ?? label}</span>}
      </button>

      {/* Keyframes */}
      <style>{`
        @keyframes fab-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fab-slide-up {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes fab-fade-in { from { opacity: 1; } to { opacity: 1; } }
          @keyframes fab-slide-up { from { transform: translateY(0); } to { transform: translateY(0); } }
        }
      `}</style>
    </>
  );
}

export default Fab;