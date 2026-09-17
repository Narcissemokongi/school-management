// src/components/EmptyState.jsx
import { FileText, Loader } from "lucide-react";
import { useStyles } from "@/styles/theme";
import { useEffect, useState } from "react";
import { useIsMobile } from "@/hooks/useIsMobile";

// ════════════════════════════════════════════════════════════════════
// KEYFRAMES module-level (injectés UNE SEULE FOIS par React)
// ════════════════════════════════════════════════════════════════════
const EmptyStateKeyframes = (
  <style>{`
    @keyframes es-fade-in-up {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes es-spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
    .es-spin { animation: es-spin 1s linear infinite; }
    @media (prefers-reduced-motion: reduce) {
      .es-spin,
      .es-fade-in-up {
        animation: none !important;
      }
    }
  `}</style>
);

export function EmptyState({
  icon: Icon = FileText,
  title = "Aucune donnée",
  message = "Il n'y a rien à afficher pour le moment.",
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  secondaryMessage,
  compact = false,
  illustration,
  loading = false,
  style,
  inline = false,
  fullWidth = false,
  align = "center",
  animated = true,
}) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();

  const effectiveCompact = compact || isMobile;

  const [reduceMotion, setReduceMotion] = useState(false);

  // ✅ FIX #6 — respect prefers-reduced-motion (fallback Safari < 14)
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);

    const handler = (e) => setReduceMotion(e.matches);

    if (mq.addEventListener) {
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    } else if (mq.addListener) {
      mq.addListener(handler);
      return () => mq.removeListener(handler);
    }
  }, []);

  const shouldAnimate = animated && !reduceMotion;

  const iconSize = effectiveCompact ? 28 : 36;
  const circleSize = effectiveCompact ? 60 : 80;

  // ✅ FIX #3 — inline=true → background + border + shadow tous neutralisés
  const backgroundColor = inline
    ? "transparent"
    : dark
    ? "transparent"
    : "#FFFFFF";
  const borderColor = inline
    ? "transparent"
    : dark
    ? "#334155"
    : "transparent";
  const iconBg = dark ? "#1E293B" : "#EEF2FF";
  const iconColor = dark ? "#94A3B8" : "#4F46E5";
  const titleColor = dark ? "#F1F5F9" : "#1E293B";
  const textColor = dark ? "#94A3B8" : "#64748B";
  const secondaryColor = dark ? "#64748B" : "#94A3B8";

  const alignItems =
    align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center";

  const textAlignValue = align;
  const actionsJustify =
    align === "left"
      ? "flex-start"
      : align === "right"
      ? "flex-end"
      : "center";

  return (
    <>
      {EmptyStateKeyframes}
      <div
        // ✅ FIX #5 — `role="region"` au lieu de `status` : plus adapté
        // à un contenu statique. On garde `aria-label` pour le contexte.
        role="region"
        aria-label={typeof title === "string" ? title : "État vide"}
        style={{
          textAlign: textAlignValue,
          padding: effectiveCompact ? "24px 16px" : "40px 24px",
          background: backgroundColor,
          borderRadius: inline ? 0 : 16,
          boxShadow: inline
            ? "none"
            : dark
            ? "none"
            : "0 1px 3px rgba(0,0,0,0.05)",
          // ✅ FIX #3 — pas de border si inline (évite 2px parasites)
          border: inline ? "none" : `1px solid ${borderColor}`,
          transition: "background-color 0.3s, border-color 0.3s",
          animation: shouldAnimate
            ? "es-fade-in-up 0.4s cubic-bezier(0.4,0,0.2,1)"
            : "none",
          width: fullWidth ? "100%" : undefined,
          display: "flex",
          flexDirection: "column",
          alignItems,
          // ✅ FIX #8 — `minWidth: 0` pour permettre la compression enfant
          minWidth: 0,
          maxWidth: "100%",
          boxSizing: "border-box",
          ...style,
        }}
      >
        {/* Illustration ou icône */}
        {illustration ? (
          typeof illustration === "string" ? (
            <img
              src={illustration}
              alt=""
              style={{
                width: effectiveCompact ? 80 : 120,
                height: "auto",
                marginBottom: effectiveCompact ? 16 : 20,
                borderRadius: 12,
                objectFit: "contain",
                maxWidth: "100%",
              }}
            />
          ) : (
            <div style={{ marginBottom: effectiveCompact ? 16 : 20 }}>
              {illustration}
            </div>
          )
        ) : loading ? (
          <div
            style={{
              width: circleSize,
              height: circleSize,
              borderRadius: "50%",
              background: iconBg,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: effectiveCompact ? 16 : 20,
              flexShrink: 0,
            }}
            aria-hidden="true"
          >
            <Loader size={iconSize} color={iconColor} className="es-spin" />
          </div>
        ) : (
          <div
            style={{
              width: circleSize,
              height: circleSize,
              borderRadius: "50%",
              background: iconBg,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: effectiveCompact ? 16 : 20,
              flexShrink: 0,
            }}
            aria-hidden="true"
          >
            <Icon size={iconSize} color={iconColor} strokeWidth={1.5} />
          </div>
        )}

        {/* Titre — ✅ FIX #7 : title natif si long */}
        <h3
          style={{
            fontSize: effectiveCompact ? 16 : 18,
            fontWeight: 600,
            color: titleColor,
            margin: "0 0 8px",
            // ✅ FIX #4 — plus de maxWidth fixe, on respecte le parent
            maxWidth: "100%",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
          title={typeof title === "string" ? title : undefined}
        >
          {title}
        </h3>

        {/* Message — ✅ FIX #4 : maxWidth basé sur conteneur au lieu de 360px fixe */}
        <p
          style={{
            fontSize: effectiveCompact ? 13 : 14,
            color: textColor,
            maxWidth: "min(360px, 100%)",
            margin: 0,
            lineHeight: 1.5,
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
          title={typeof message === "string" ? message : undefined}
        >
          {message}
        </p>

        {secondaryMessage && (
          <p
            style={{
              fontSize: 12,
              color: secondaryColor,
              margin: "8px 0 0",
              maxWidth: "min(280px, 100%)",
              lineHeight: 1.5,
            }}
          >
            {secondaryMessage}
          </p>
        )}

        {/* Actions */}
        {(actionLabel || secondaryActionLabel) && (
          <div
            style={{
              display: "flex",
              gap: 12,
              justifyContent: actionsJustify,
              flexWrap: "wrap",
              marginTop: 20,
              // ✅ FIX #8 — width: 100% uniquement si align != center
              // Sinon, laisse le parent gérer
              width: align === "center" ? "auto" : "100%",
              maxWidth: "100%",
              // ✅ FIX — `minWidth: 0` pour permettre la compression
              minWidth: 0,
            }}
          >
            {actionLabel && onAction && (
              <button
                type="button"
                onClick={onAction}
                style={{
                  padding: effectiveCompact ? "8px 16px" : "10px 20px",
                  background: dark ? "#818CF8" : "#4F46E5",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontWeight: 500,
                  fontSize: effectiveCompact ? 13 : 14,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "background 0.2s, transform 0.1s",
                  outline: "none",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = dark
                    ? "#6366F1"
                    : "#4338CA";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = dark
                    ? "#818CF8"
                    : "#4F46E5";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
                onFocus={(e) => {
                  e.currentTarget.style.outline = `2px solid ${
                    dark ? "#818CF8" : "#4F46E5"
                  }`;
                  e.currentTarget.style.outlineOffset = "2px";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.outline = "none";
                }}
              >
                {actionLabel}
              </button>
            )}
            {secondaryActionLabel && onSecondaryAction && (
              <button
                type="button"
                onClick={onSecondaryAction}
                style={{
                  padding: effectiveCompact ? "8px 16px" : "10px 20px",
                  background: dark ? "#1E293B" : "#FFFFFF",
                  color: dark ? "#F1F5F9" : "#1E293B",
                  border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
                  borderRadius: 8,
                  cursor: "pointer",
                  fontWeight: 500,
                  fontSize: effectiveCompact ? 13 : 14,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "background 0.2s, transform 0.1s",
                  outline: "none",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = dark
                    ? "#263142"
                    : "#F1F5F9";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = dark
                    ? "#1E293B"
                    : "#FFFFFF";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
                onFocus={(e) => {
                  e.currentTarget.style.outline = `2px solid ${
                    dark ? "#818CF8" : "#4F46E5"
                  }`;
                  e.currentTarget.style.outlineOffset = "2px";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.outline = "none";
                }}
              >
                {secondaryActionLabel}
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}