// src/components/AnnoncesBanner.jsx
import { useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useTokens } from "@/theme/tokens";
import {
  X, Info, AlertTriangle, Wrench, CheckCircle2,
  Pin, Paperclip, FileText, Image as ImageIcon,
} from "lucide-react";

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

const TYPE_CONFIG = {
  info: { color: "#3B82F6", Icon: Info },
  warning: { color: "#F59E0B", Icon: AlertTriangle },
  maintenance: { color: "#EF4444", Icon: Wrench },
  success: { color: "#10B981", Icon: CheckCircle2 },
};

// ════════════════════════════════════════════════════════════════════
// KEYFRAMES MODULE-LEVEL
// ════════════════════════════════════════════════════════════════════
const AnnoncesBannerKeyframes = (
  <style>{`
    @keyframes ab-slide {
      from { opacity: 0; transform: translateY(-8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .ab-slide { animation: ab-slide 0.3s ease-out; }
    @media (prefers-reduced-motion: reduce) {
      .ab-slide { animation: none !important; }
    }
  `}</style>
);

// ════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════
function formatBytes(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ════════════════════════════════════════════════════════════════════
// PRESSABLE — feedback tap + focus ring via state React
// ════════════════════════════════════════════════════════════════════
function Pressable({
  onClick, style, children, disabled = false, type = "button",
  focusColor, ariaLabel, ...rest
}) {
  const [pressed, setPressed] = useState(false);
  const [focused, setFocused] = useState(false);
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      onPointerDown={() => !disabled && setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        ...TAP_BASE,
        transform: pressed && !disabled ? "scale(0.97)" : "scale(1)",
        transition: "transform 0.12s ease, background-color 0.2s, border-color 0.2s",
        ...(focused && !disabled && focusColor ? FOCUS_RING(focusColor) : null),
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════
// PIÈCE JOINTE (lien) — feedback tap via state React
// ════════════════════════════════════════════════════════════════════
function PieceJointe({ pj, color, t }) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);

  const isImage = pj.type?.startsWith("image/");
  const PJIcon = isImage ? ImageIcon : FileText;
  const isActive = hovered || pressed;

  return (
    <a
      href={pj.url}
      target="_blank"
      rel="noopener noreferrer"
      title={`${pj.nom}${pj.taille ? ` (${formatBytes(pj.taille)})` : ""}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false); }}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 10px",
        background: isActive
          ? (t.surface.hover ?? "#F8FAFC")
          : t.surface.elevated,
        border: `1px solid ${t.border.subtle}`,
        borderRadius: t.radius.sm,
        fontSize: t.font.size.xs,
        fontWeight: 600,
        color,
        textDecoration: "none",
        maxWidth: 220,
        minHeight: 44,
        touchAction: "manipulation",
        WebkitTapHighlightColor: "transparent",
        transform: pressed ? "scale(0.98)" : "scale(1)",
        transition: "background 0.15s, transform 0.12s ease",
        ...(focused ? FOCUS_RING(color) : null),
      }}
    >
      <PJIcon size={13} aria-hidden="true" style={{ flexShrink: 0 }} />
      <span
        style={{
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {pj.nom}
      </span>
    </a>
  );
}

// ════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ════════════════════════════════════════════════════════════════════
export function AnnoncesBanner({ userId }) {
  const t = useTokens();
  const [dismissed, setDismissed] = useState(() => new Set());

  const annonces =
    useQuery(
      api.annonces.listActivesForUser,
      userId ? { userId } : "skip"
    ) ?? [];

  const marquerLue = useMutation(api.annonces.marquerLue);

  const handleDismiss = useCallback(
    async (id) => {
      setDismissed((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
      try {
        await marquerLue({ userId, annonceId: id });
      } catch (e) {
        console.error("Erreur marquerLue:", e);
      }
    },
    [marquerLue, userId]
  );

  const visibles = annonces.filter((a) => !dismissed.has(a._id));

  if (visibles.length === 0) return null;

  return (
    <>
      {AnnoncesBannerKeyframes}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          marginBottom: 16,
        }}
      >
        {visibles.map((a) => {
          const conf = TYPE_CONFIG[a.type] ?? TYPE_CONFIG.info;
          const { Icon } = conf;
          const isEpinglee = a.epinglee === true;
          const pjs = a.piecesJointes ?? [];

          return (
            <div
              key={a._id}
              role="status"
              aria-live="polite"
              className="ab-slide"
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                padding: "12px 16px",
                background: `${conf.color}10`,
                border: `1px solid ${
                  isEpinglee ? t.accent.primary : `${conf.color}40`
                }`,
                borderLeft: isEpinglee
                  ? `4px solid ${t.accent.primary}`
                  : `4px solid ${conf.color}`,
                borderRadius: t.radius.md,
                boxShadow: isEpinglee
                  ? `0 2px 8px ${t.accent.primary}20`
                  : "none",
              }}
            >
              <Icon
                size={20}
                color={conf.color}
                aria-hidden="true"
                style={{ flexShrink: 0, marginTop: 2 }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Titre + Badge épinglée */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: t.font.size.sm,
                    fontWeight: 700,
                    color: t.text.primary,
                    marginBottom: 2,
                    flexWrap: "wrap",
                  }}
                >
                  {isEpinglee && (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 3,
                        fontSize: 9,
                        fontWeight: 700,
                        color: t.accent.primary,
                        background: `${t.accent.primary}20`,
                        padding: "2px 6px",
                        borderRadius: t.radius.full,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      <Pin size={9} aria-hidden="true" />
                      Épinglée
                    </span>
                  )}
                  <span>{a.titre}</span>
                </div>

                {/* Message */}
                <div
                  style={{
                    fontSize: t.font.size.sm,
                    color: t.text.secondary,
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.5,
                  }}
                >
                  {a.message}
                </div>

                {/* Pièces jointes */}
                {pjs.length > 0 && (
                  <div
                    style={{
                      marginTop: 10,
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 6,
                    }}
                  >
                    {pjs.map((pj, i) => (
                      <PieceJointe
                        key={`${pj.url ?? pj.nom}-${i}`}
                        pj={pj}
                        color={conf.color}
                        t={t}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Bouton fermer */}
              <Pressable
                onClick={() => handleDismiss(a._id)}
                focusColor={t.accent.primary}
                ariaLabel={`Fermer l'annonce : ${a.titre}`}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: 8,
                  borderRadius: t.radius.sm,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: t.text.secondary,
                  flexShrink: 0,
                  minWidth: 44,
                  minHeight: 44,
                }}
              >
                <X size={16} aria-hidden="true" />
              </Pressable>
            </div>
          );
        })}
      </div>
    </>
  );
}

export default AnnoncesBanner;