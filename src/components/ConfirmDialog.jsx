import { useEffect } from "react";
import { useStyles } from "../styles/theme";
import { useIsMobile } from "../hooks/useIsMobile"; // <-- Import du hook
import { AlertTriangle, X } from "lucide-react";

export function ConfirmDialog({
  open,
  title = "Confirmer",
  message = "",
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  onConfirm,
  onCancel,
}) {
  const { S, dark } = useStyles();
  const isMobile = useIsMobile(); // Détection mobile

  // Fermeture par Échap
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onCancel?.();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  // Styles adaptatifs
  const dialogPadding = isMobile ? 20 : 28;
  const dialogWidth = isMobile ? "95%" : 420;
  const iconSize = isMobile ? 28 : 32;
  const iconContainerSize = isMobile ? 56 : 64;
  const titleFontSize = isMobile ? 18 : 20;
  const messageFontSize = isMobile ? 14 : 14;
  const buttonPadding = isMobile ? "12px 20px" : "10px 24px";
  const buttonFontSize = isMobile ? 16 : 14;
  const buttonFlexDirection = isMobile ? "column" : "row";
  const buttonWidth = isMobile ? "100%" : "auto";
  const closeButtonSize = isMobile ? 22 : 20;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
        animation: "fadeIn 0.2s ease",
        padding: isMobile ? 12 : 16,
      }}
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div
        style={{
          background: dark ? "#1E293B" : "#FFFFFF",
          color: dark ? "#F1F5F9" : "#1E293B",
          borderRadius: 16,
          padding: dialogPadding,
          width: dialogWidth,
          maxWidth: "95%",
          boxShadow: dark ? "0 10px 30px rgba(0,0,0,0.5)" : "0 10px 30px rgba(0,0,0,0.3)",
          textAlign: "center",
          border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
          position: "relative",
          animation: "slideUp 0.25s ease",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Bouton de fermeture X */}
        <button
          onClick={onCancel}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            background: "transparent",
            border: "none",
            color: dark ? "#94A3B8" : "#64748B",
            cursor: "pointer",
            padding: 4,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          aria-label="Fermer"
        >
          <X size={closeButtonSize} />
        </button>

        <div
          style={{
            width: iconContainerSize,
            height: iconContainerSize,
            borderRadius: "50%",
            background: dark ? "#78350F" : "#FEF3C7",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
          }}
        >
          <AlertTriangle size={iconSize} color={dark ? "#FBBF24" : "#F59E0B"} />
        </div>
        <h3
          id="confirm-dialog-title"
          style={{ marginBottom: 8, fontSize: titleFontSize, fontWeight: 700 }}
        >
          {title}
        </h3>
        <p style={{ fontSize: messageFontSize, color: S.textMuted, marginBottom: isMobile ? 20 : 24, lineHeight: 1.5 }}>
          {message}
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexDirection: buttonFlexDirection }}>
          <button
            onClick={onCancel}
            style={{
              padding: buttonPadding,
              borderRadius: 8,
              border: `1px solid ${S.cardBorder}`,
              background: "transparent",
              color: S.textMuted,
              cursor: "pointer",
              fontWeight: 500,
              fontSize: buttonFontSize,
              transition: "background 0.2s",
              width: buttonWidth,
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: buttonPadding,
              borderRadius: 8,
              border: "none",
              background: "#EF4444",
              color: "white",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: buttonFontSize,
              transition: "background 0.2s",
              width: buttonWidth,
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}