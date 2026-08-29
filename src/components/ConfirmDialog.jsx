import { useEffect } from "react";
import { useStyles } from "../styles/theme";
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
      }}
      onClick={onCancel}   // ✅ clic sur l'overlay annule
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div
        style={{
          background: dark ? "#1E293B" : "#FFFFFF",
          color: dark ? "#F1F5F9" : "#1E293B",
          borderRadius: 16,
          padding: 28,
          width: 420,
          maxWidth: "90%",
          boxShadow: dark ? "0 10px 30px rgba(0,0,0,0.5)" : "0 10px 30px rgba(0,0,0,0.3)",
          textAlign: "center",
          border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
          position: "relative",
          animation: "slideUp 0.25s ease",
        }}
        onClick={(e) => e.stopPropagation()}   // ✅ empêche la fermeture lors du clic interne
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
          <X size={20} />
        </button>

        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: dark ? "#78350F" : "#FEF3C7",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
          }}
        >
          <AlertTriangle size={32} color={dark ? "#FBBF24" : "#F59E0B"} />
        </div>
        <h3
          id="confirm-dialog-title"
          style={{ marginBottom: 8, fontSize: 20, fontWeight: 700 }}
        >
          {title}
        </h3>
        <p style={{ fontSize: 14, color: S.textMuted, marginBottom: 24, lineHeight: 1.5 }}>
          {message}
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button
            onClick={onCancel}
            style={{
              padding: "10px 24px",
              borderRadius: 8,
              border: `1px solid ${S.cardBorder}`,
              background: "transparent",
              color: S.textMuted,
              cursor: "pointer",
              fontWeight: 500,
              transition: "background 0.2s",
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: "10px 24px",
              borderRadius: 8,
              border: "none",
              background: "#EF4444",
              color: "white",
              cursor: "pointer",
              fontWeight: 600,
              transition: "background 0.2s",
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}