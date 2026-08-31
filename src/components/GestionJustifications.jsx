import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import toast from "react-hot-toast";
import { useState } from "react";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import { CheckCircle2, XCircle, Loader, MessageSquare, Calendar, User } from "lucide-react";

export function GestionJustifications({ ecoleId, userId }) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();

  const absencesEnAttente = useQuery(api.absences.listEnAttente, { ecoleId }) ?? [];
  const statuer = useMutation(api.absences.statuerJustificatif);
  const [commentaireId, setCommentaireId] = useState(null);
  const [commentaire, setCommentaire] = useState("");
  const [processingId, setProcessingId] = useState(null);

  const handleStatuer = async (absenceId, statut) => {
    if (statut === "rejetee" && commentaire.trim() === "") {
      toast.error("Veuillez saisir un motif de rejet.");
      return;
    }
    setProcessingId(absenceId);
    try {
      await statuer({ absenceId, statut, commentaire: commentaire || undefined, userId });
      toast.success(statut === "justifiee" ? "Justificatif validé" : "Justificatif rejeté");
      setCommentaireId(null);
      setCommentaire("");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setProcessingId(null);
    }
  };

  // Couleurs adaptatives
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const inputBg = dark ? "#0F172A" : "#F9FAFB";
  const inputText = dark ? "#F1F5F9" : "#1E293B";
  const accent = dark ? "#818CF8" : "#4F46E5";
  const success = dark ? "#34D399" : "#10B981";
  const danger = dark ? "#F87171" : "#EF4444";
  const shadow = dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)";

  // Styles adaptatifs
  const cardPadding = isMobile ? "12px 14px" : "16px 20px";
  const cardGap = isMobile ? 8 : 12;
  const titleSize = isMobile ? 18 : 20;
  const textSize = isMobile ? 14 : 15;
  const secondaryTextSize = isMobile ? 13 : 14;
  const buttonPadding = isMobile ? "10px 12px" : "8px 14px";
  const buttonFontSize = isMobile ? 14 : 13;
  const inputPadding = isMobile ? "10px 12px" : "8px 12px";
  const inputFontSize = isMobile ? 16 : 14;
  const actionsFlexDirection = isMobile ? "column" : "row";
  const actionsWidth = isMobile ? "100%" : "auto";

  if (absencesEnAttente.length === 0) {
    return (
      <div style={{
        textAlign: "center",
        padding: isMobile ? 32 : 48,
        color: textSecondary,
        background: cardBg,
        borderRadius: 16,
        boxShadow: shadow,
        border: `1px solid ${cardBorder}`,
      }}>
        <CheckCircle2 size={48} color={success} style={{ marginBottom: 12 }} />
        <p style={{ fontSize: isMobile ? 15 : 16, margin: 0 }}>
          Aucune demande de justification en attente.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h3 style={{
        fontSize: titleSize,
        fontWeight: 700,
        color: textPrimary,
        marginBottom: isMobile ? 16 : 20,
      }}>
        Justifications en attente ({absencesEnAttente.length})
      </h3>

      <div style={{ display: "grid", gap: cardGap }}>
        {absencesEnAttente.map((a) => (
          <div
            key={a._id}
            style={{
              marginBottom: 0,
              padding: cardPadding,
              background: cardBg,
              borderRadius: 12,
              boxShadow: shadow,
              border: `1px solid ${cardBorder}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
              <User size={16} color={textSecondary} />
              <span style={{ fontWeight: 600, fontSize: textSize, color: textPrimary }}>
                {a.eleveNom}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
              <Calendar size={14} color={textSecondary} />
              <span style={{ color: textSecondary, fontSize: secondaryTextSize }}>
                {a.date} – {a.type}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 12 }}>
              <MessageSquare size={14} color={textSecondary} style={{ marginTop: 2 }} />
              <span style={{ color: textPrimary, fontSize: secondaryTextSize, flex: 1 }}>
                Justificatif : {a.justificatif}
              </span>
            </div>

            {/* Actions */}
            {commentaireId !== a._id ? (
              <div style={{ display: "flex", gap: 8, flexDirection: actionsFlexDirection, marginTop: 8 }}>
                <button
                  onClick={() => handleStatuer(a._id, "justifiee")}
                  disabled={processingId === a._id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    padding: buttonPadding,
                    background: processingId === a._id ? "#A5B4FC" : success,
                    color: "white",
                    border: "none",
                    borderRadius: 8,
                    fontWeight: 600,
                    fontSize: buttonFontSize,
                    cursor: processingId === a._id ? "not-allowed" : "pointer",
                    opacity: processingId === a._id ? 0.7 : 1,
                    width: actionsWidth,
                  }}
                >
                  {processingId === a._id && <Loader size={16} className="animate-spin" />}
                  ✅ Valider
                </button>
                <button
                  onClick={() => setCommentaireId(a._id)}
                  disabled={processingId === a._id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    padding: buttonPadding,
                    background: danger,
                    color: "white",
                    border: "none",
                    borderRadius: 8,
                    fontWeight: 600,
                    fontSize: buttonFontSize,
                    cursor: processingId === a._id ? "not-allowed" : "pointer",
                    opacity: processingId === a._id ? 0.7 : 1,
                    width: actionsWidth,
                  }}
                >
                  ❌ Rejeter
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                <input
                  type="text"
                  value={commentaire}
                  onChange={(e) => setCommentaire(e.target.value)}
                  placeholder="Motif du rejet (obligatoire)"
                  style={{
                    width: "100%",
                    padding: inputPadding,
                    borderRadius: 8,
                    border: `1px solid ${cardBorder}`,
                    background: inputBg,
                    color: inputText,
                    fontSize: inputFontSize,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                  autoFocus
                />
                <div style={{ display: "flex", gap: 8, flexDirection: actionsFlexDirection }}>
                  <button
                    onClick={() => handleStatuer(a._id, "rejetee")}
                    disabled={processingId === a._id || !commentaire.trim()}
                    style={{
                      padding: buttonPadding,
                      background: danger,
                      color: "white",
                      border: "none",
                      borderRadius: 8,
                      fontWeight: 600,
                      fontSize: buttonFontSize,
                      cursor: processingId === a._id || !commentaire.trim() ? "not-allowed" : "pointer",
                      opacity: processingId === a._id || !commentaire.trim() ? 0.7 : 1,
                      width: actionsWidth,
                    }}
                  >
                    Confirmer le rejet
                  </button>
                  <button
                    onClick={() => {
                      setCommentaireId(null);
                      setCommentaire("");
                    }}
                    disabled={processingId === a._id}
                    style={{
                      padding: buttonPadding,
                      background: dark ? "#334155" : "#F1F5F9",
                      color: dark ? "#F1F5F9" : "#1E293B",
                      border: "none",
                      borderRadius: 8,
                      fontWeight: 500,
                      fontSize: buttonFontSize,
                      cursor: "pointer",
                      width: actionsWidth,
                    }}
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}