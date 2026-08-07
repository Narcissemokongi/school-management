import { useStyles } from "../components/ThemeProvider";
import { AlertTriangle, X } from "lucide-react";

export function ConfirmDialog({ open, title, message, onConfirm, onCancel }) {
  const { S, dark } = useStyles();

  if (!open) return null;

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.5)", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 10000
    }}>
      <div style={{
        background: dark ? "#1e293b" : "white",
        color: dark ? "#f1f5f9" : "#1e293b",
        borderRadius: 16, padding: 28, width: 400, maxWidth: "90%",
        boxShadow: "0 10px 30px rgba(0,0,0,0.3)", textAlign: "center"
      }}>
        <AlertTriangle size={44} color="#f59e0b" style={{ marginBottom: 12 }} />
        <h3 style={{ marginBottom: 8 }}>{title || "Confirmer"}</h3>
        <p style={{ fontSize: 14, color: S.textMuted, marginBottom: 24 }}>{message}</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button onClick={onCancel} style={{
            padding: "10px 24px", borderRadius: 8, border: `1px solid ${S.cardBorder}`,
            background: "transparent", color: S.textMuted, cursor: "pointer", fontWeight: 500
          }}>
            Annuler
          </button>
          <button onClick={onConfirm} style={{
            padding: "10px 24px", borderRadius: 8, border: "none",
            background: "#ef4444", color: "white", cursor: "pointer", fontWeight: 600
          }}>
            Confirmer
          </button>
        </div>
      </div>
    </div>
  );
}