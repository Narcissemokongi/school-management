import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import toast from "react-hot-toast";
import { useStyles } from "../styles/theme";
import { useIsMobile } from "../hooks/useIsMobile"; // <-- Import du hook
import { Skeleton } from "./Skeleton";
import { Calendar, AlertTriangle, CheckCircle, XCircle, Loader, FileText } from "lucide-react";

export function AbsencesEnfant({ eleveId, userId }) {
  const { dark } = useStyles();
  const isMobile = useIsMobile(); // Détection mobile

  const absences = useQuery(api.absences.listByEleve, { eleveId }) ?? [];
  const soumettreJustificatif = useMutation(api.absences.soumettreJustificatif);
  const [justifAbsenceId, setJustifAbsenceId] = useState(null);
  const [justifTexte, setJustifTexte] = useState("");
  const [sending, setSending] = useState(false);

  // Couleurs adaptatives
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const inputBg = dark ? "#0F172A" : "#F9FAFB";
  const inputText = dark ? "#F1F5F9" : "#1E293B";
  const accent = dark ? "#818CF8" : "#4F46E5";
  const danger = dark ? "#F87171" : "#EF4444";
  const success = dark ? "#34D399" : "#10B981";
  const warning = dark ? "#FBBF24" : "#F59E0B";
  const shadow = dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)";

  const handleJustifier = async () => {
    if (!justifTexte.trim()) {
      toast.error("Veuillez saisir un justificatif.");
      return;
    }
    setSending(true);
    try {
      await soumettreJustificatif({
        absenceId: justifAbsenceId,
        justificatif: justifTexte.trim(),
        userId,
      });
      toast.success("Justificatif envoyé pour validation");
      setJustifAbsenceId(null);
      setJustifTexte("");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  // Gestion du chargement
  if (absences === undefined) {
    return <Skeleton height={200} />;
  }

  if (absences.length === 0) {
    return (
      <div style={{
        background: cardBg,
        borderRadius: 16,
        padding: isMobile ? 32 : 48,
        textAlign: "center",
        boxShadow: shadow,
        border: `1px solid ${cardBorder}`,
        color: textSecondary,
        marginTop: 16,
      }}>
        <CheckCircle size={isMobile ? 40 : 48} color={success} style={{ marginBottom: 16 }} />
        <p style={{ fontSize: isMobile ? 15 : 16, fontWeight: 500, margin: 0 }}>
          Aucune absence enregistrée.
        </p>
      </div>
    );
  }

  // Styles adaptatifs
  const cardPadding = isMobile ? "12px 14px" : "16px 20px";
  const cardGap = isMobile ? 8 : 12;
  const dateFontSize = isMobile ? 14 : 16;
  const badgeFontSize = isMobile ? 11 : 12;
  const buttonPadding = isMobile ? "10px 14px" : "6px 14px";
  const buttonFontSize = isMobile ? 14 : 13;
  const modalMaxWidth = isMobile ? "92%" : 400;
  const textareaFontSize = isMobile ? 16 : 14; // 16px pour éviter le zoom iOS

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: "grid", gap: cardGap }}>
        {absences.map((a) => {
          const estJustifiee = a.statutJustification === "justifiee";
          const estRejetee = a.statutJustification === "rejetee";
          const estEnAttente = a.statutJustification === "en_attente";

          return (
            <div
              key={a._id}
              style={{
                background: cardBg,
                borderRadius: 12,
                padding: cardPadding,
                boxShadow: shadow,
                border: `1px solid ${cardBorder}`,
                transition: "background-color 0.3s",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <Calendar size={isMobile ? 16 : 18} color={textSecondary} />
                  <span style={{ fontWeight: 600, color: textPrimary, fontSize: dateFontSize }}>{a.date}</span>
                  <span style={{
                    padding: "4px 10px",
                    borderRadius: 12,
                    fontSize: badgeFontSize,
                    fontWeight: 600,
                    background: a.type === "absence" ? (dark ? "#7F1D1D" : "#FEE2E2") : (dark ? "#78350F" : "#FEF3C7"),
                    color: a.type === "absence" ? (dark ? "#F87171" : "#B91C1C") : (dark ? "#FBBF24" : "#92400E"),
                  }}>
                    {a.type === "absence" ? "Absence" : "Retard"}
                  </span>
                </div>

                {/* Statut */}
                <span style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "4px 10px",
                  borderRadius: 20,
                  fontSize: badgeFontSize,
                  fontWeight: 600,
                  background: estJustifiee ? (dark ? "#064E3B" : "#D1FAE5") : estRejetee ? (dark ? "#7F1D1D" : "#FEE2E2") : (dark ? "#78350F" : "#FEF3C7"),
                  color: estJustifiee ? (dark ? "#34D399" : "#065F46") : estRejetee ? (dark ? "#F87171" : "#B91C1C") : (dark ? "#FBBF24" : "#92400E"),
                }}>
                  {estJustifiee ? <CheckCircle size={isMobile ? 12 : 14} /> : estRejetee ? <XCircle size={isMobile ? 12 : 14} /> : <AlertTriangle size={isMobile ? 12 : 14} />}
                  {estJustifiee ? "Justifiée" : estRejetee ? "Rejetée" : estEnAttente ? "En attente" : "Non justifiée"}
                </span>
              </div>

              {/* Justificatif */}
              {a.justificatif && (
                <div style={{ marginTop: 8, fontSize: isMobile ? 12 : 13, color: textSecondary, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <FileText size={isMobile ? 12 : 14} />
                  <span>{a.justificatif}</span>
                </div>
              )}

              {/* Bouton justifier */}
              {(!a.statutJustification || a.statutJustification === "rejetee") && (
                <button
                  onClick={() => setJustifAbsenceId(a._id)}
                  style={{
                    marginTop: 12,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: buttonPadding,
                    background: accent,
                    color: "white",
                    border: "none",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontWeight: 500,
                    fontSize: buttonFontSize,
                    width: isMobile ? "100%" : "auto",
                    justifyContent: "center",
                  }}
                >
                  Justifier
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Modale de justificatif */}
      {justifAbsenceId && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: isMobile ? 12 : 16,
        }}>
          <div style={{
            background: cardBg,
            borderRadius: 16,
            padding: isMobile ? 18 : 24,
            width: "100%",
            maxWidth: modalMaxWidth,
            boxShadow: dark ? "0 10px 30px rgba(0,0,0,0.5)" : "0 10px 30px rgba(0,0,0,0.1)",
            border: `1px solid ${cardBorder}`,
          }}>
            <h3 style={{ margin: 0, fontSize: isMobile ? 18 : 18, fontWeight: 600, color: textPrimary }}>
              Justifier l'absence
            </h3>
            <textarea
              value={justifTexte}
              onChange={(e) => setJustifTexte(e.target.value)}
              placeholder="Ex: Certificat médical fourni..."
              rows={isMobile ? 4 : 3}
              style={{
                width: "100%",
                padding: "10px 14px",
                border: `1px solid ${cardBorder}`,
                borderRadius: 8,
                fontSize: textareaFontSize,
                outline: "none",
                background: inputBg,
                color: inputText,
                resize: "vertical",
                marginTop: 12,
              }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 16, flexDirection: isMobile ? "column" : "row" }}>
              <button
                onClick={handleJustifier}
                disabled={sending}
                style={{
                  flex: 1,
                  padding: isMobile ? "12px 16px" : "10px 16px",
                  background: sending ? "#A5B4FC" : accent,
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  cursor: sending ? "not-allowed" : "pointer",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  fontSize: isMobile ? 16 : 14,
                }}
              >
                {sending ? <Loader size={16} className="animate-spin" /> : null}
                {sending ? "Envoi..." : "Envoyer"}
              </button>
              <button
                onClick={() => setJustifAbsenceId(null)}
                style={{
                  padding: isMobile ? "12px 16px" : "10px 16px",
                  background: dark ? "#334155" : "#F1F5F9",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  color: dark ? "#F1F5F9" : "#1E293B",
                  fontWeight: 500,
                  fontSize: isMobile ? 16 : 14,
                }}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}