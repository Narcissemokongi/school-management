import { FileText, Loader } from "lucide-react";
import { useStyles } from "../styles/theme";
import { useEffect, useState } from "react";

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
  illustration,          // URL d'image ou composant personnalisé
  loading = false,        // Affiche un spinner
  style,
  inline = false,         // Variante intégrée, sans fond ni ombre
  fullWidth = false,      // Force la largeur à 100%
  align = "center",       // "left" | "center" | "right"
  animated = true,        // Active l'animation d'entrée
}) {
  const { dark } = useStyles();
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mediaQuery.matches);
    const handler = (e) => setReduceMotion(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  const shouldAnimate = animated && !reduceMotion;

  const iconSize = compact ? 28 : 36;
  const circleSize = compact ? 60 : 80;

  const backgroundColor = inline ? "transparent" : dark ? "transparent" : "#FFFFFF";
  const borderColor = inline ? "transparent" : dark ? "#334155" : "transparent";
  const iconBg = dark ? "#1E293B" : "#EEF2FF";
  const iconColor = dark ? "#94A3B8" : "#4F46E5";
  const titleColor = dark ? "#F1F5F9" : "#1E293B";
  const textColor = dark ? "#94A3B8" : "#64748B";
  const secondaryColor = dark ? "#64748B" : "#94A3B8";

  const alignmentMap = {
    left: "flex-start",
    center: "center",
    right: "flex-end",
  };
  const alignItems = alignmentMap[align] || "center";

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        textAlign: align,
        padding: compact ? "24px 16px" : "48px 24px",
        background: backgroundColor,
        borderRadius: inline ? 0 : 16,
        boxShadow: inline ? "none" : dark ? "none" : "0 1px 3px rgba(0,0,0,0.05)",
        border: `1px solid ${borderColor}`,
        transition: "background-color 0.3s, border-color 0.3s",
        animation: shouldAnimate ? "fadeInUp 0.4s cubic-bezier(0.4,0,0.2,1)" : "none",
        width: fullWidth ? "100%" : undefined,
        display: "flex",
        flexDirection: "column",
        alignItems,
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
              width: compact ? 80 : 120,
              height: "auto",
              marginBottom: compact ? 16 : 20,
              borderRadius: 12,
              objectFit: "contain",
            }}
          />
        ) : (
          <div style={{ marginBottom: compact ? 16 : 20 }}>{illustration}</div>
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
            marginBottom: compact ? 16 : 20,
          }}
        >
          <Loader size={iconSize} color={iconColor} className="animate-spin" />
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
            marginBottom: compact ? 16 : 20,
          }}
        >
          <Icon size={iconSize} color={iconColor} strokeWidth={1.5} />
        </div>
      )}

      <h3
        style={{
          fontSize: compact ? 16 : 18,
          fontWeight: 600,
          color: titleColor,
          margin: "0 0 8px",
        }}
      >
        {title}
      </h3>

      <p
        style={{
          fontSize: compact ? 13 : 14,
          color: textColor,
          maxWidth: 360,
          margin: "0 auto",
          lineHeight: 1.5,
        }}
      >
        {message}
      </p>

      {secondaryMessage && (
        <p
          style={{
            fontSize: 12,
            color: secondaryColor,
            marginTop: 8,
            maxWidth: 280,
            marginLeft: "auto",
            marginRight: "auto",
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
            justifyContent: "center",
            flexWrap: "wrap",
            marginTop: 20,
            width: "100%",
          }}
        >
          {actionLabel && onAction && (
            <button
              onClick={onAction}
              style={{
                padding: "8px 20px",
                background: dark ? "#818CF8" : "#4F46E5",
                color: "white",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                fontWeight: 500,
                fontSize: 14,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                transition: "background 0.2s, transform 0.1s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = dark ? "#6366F1" : "#4338CA";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = dark ? "#818CF8" : "#4F46E5";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              {actionLabel}
            </button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <button
              onClick={onSecondaryAction}
              style={{
                padding: "8px 20px",
                background: dark ? "#1E293B" : "#FFFFFF",
                color: dark ? "#F1F5F9" : "#1E293B",
                border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
                borderRadius: 8,
                cursor: "pointer",
                fontWeight: 500,
                fontSize: 14,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                transition: "background 0.2s, transform 0.1s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = dark ? "#263142" : "#F1F5F9";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = dark ? "#1E293B" : "#FFFFFF";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              {secondaryActionLabel}
            </button>
          )}
        </div>
      )}

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}