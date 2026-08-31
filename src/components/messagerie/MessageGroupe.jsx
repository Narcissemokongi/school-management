import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import { Send, ArrowLeft, Users, GraduationCap, BookOpen, Loader } from "lucide-react";
import toast from "react-hot-toast";

// ✅ Rôles autorisés à envoyer un message groupé
const ROLES_AUTORISES_DIFFUSION = ["admin", "directeur", "disciplinaire"];

export function MessageGroupe({ user, ecoleId, onBack }) {
  const { S, dark } = useStyles();
  const isMobile = useIsMobile();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [target, setTarget] = useState("parents");
  const [selectedClasse, setSelectedClasse] = useState("");

  const sendToAllParents = useMutation(api.messages.sendToAllParents);
  const sendToAllEleves = useMutation(api.messages.sendToAllEleves);
  const sendToClasse = useMutation(api.messages.sendToClasse);
  const classes = useQuery(api.classes.list, ecoleId ? { ecoleId } : "skip") ?? [];

  // ❌ Vérification de rôle : si non autorisé, on n'affiche rien
  if (!ROLES_AUTORISES_DIFFUSION.includes(user.role)) {
    return null;
  }

  // Couleurs adaptatives
  const accent = dark ? "#818CF8" : "#4F46E5";
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const inputBg = dark ? "#0F172A" : "#F9FAFB";
  const inputText = dark ? "#F1F5F9" : "#1E293B";
  const buttonSecondaryBg = dark ? "#334155" : "#F1F5F9";
  const buttonSecondaryText = dark ? "#F1F5F9" : "#1E293B";

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error("Veuillez écrire un message.");
      return;
    }
    if (target === "classe" && !selectedClasse) {
      toast.error("Veuillez choisir une classe.");
      return;
    }
    setSending(true);
    try {
      let count = 0;
      switch (target) {
        case "parents":
          count = await sendToAllParents({ ecoleId, expediteurId: user._id, contenu: message.trim() });
          break;
        case "eleves":
          count = await sendToAllEleves({ ecoleId, expediteurId: user._id, contenu: message.trim() });
          break;
        case "classe":
          count = await sendToClasse({ ecoleId, expediteurId: user._id, classe: selectedClasse, contenu: message.trim() });
          break;
      }
      toast.success(`Message envoyé à ${count} personne(s).`);
      onBack();
    } catch (err) {
      toast.error("Erreur : " + err.message);
    } finally {
      setSending(false);
    }
  };

  // Styles adaptatifs
  const cardPadding = isMobile ? 16 : 24;
  const cardMarginBottom = isMobile ? 16 : 24;
  const titleFontSize = isMobile ? 22 : 28;
  const headerMarginBottom = isMobile ? 16 : 20;
  const targetButtonsFlexDirection = isMobile ? "column" : "row";
  const targetButtonPadding = isMobile ? "12px 16px" : "8px 16px";
  const targetButtonFontSize = isMobile ? 16 : 14;
  const targetButtonWidth = isMobile ? "100%" : "auto";
  const selectPadding = isMobile ? "12px 14px" : "10px 14px";
  const selectFontSize = isMobile ? 16 : 14;
  const textareaPadding = isMobile ? "12px 14px" : "10px 14px";
  const textareaFontSize = isMobile ? 16 : 14;
  const textareaMinHeight = isMobile ? 150 : 120;
  const sendButtonPadding = isMobile ? "12px 16px" : "10px 20px";
  const sendButtonFontSize = isMobile ? 16 : 14;
  const sendButtonWidth = isMobile ? "100%" : "auto";

  return (
    <div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .animate-spin { animation: spin 1s linear infinite; }`}</style>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: headerMarginBottom }}>
        {isMobile && (
          <button
            onClick={onBack}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: textPrimary,
              padding: 4,
            }}
            aria-label="Retour"
          >
            <ArrowLeft size={24} />
          </button>
        )}
        <h2 style={{ ...S.h2, color: textPrimary, fontSize: titleFontSize }}>Message groupé</h2>
      </div>

      <div style={{ ...S.card, background: cardBg, border: `1px solid ${cardBorder}`, transition: "background-color 0.3s", padding: cardPadding }}>
        {/* Sélecteurs de cible */}
        <div style={{ display: "flex", gap: isMobile ? 8 : 12, marginBottom: 16, flexWrap: "wrap", flexDirection: targetButtonsFlexDirection }}>
          <button
            onClick={() => setTarget("parents")}
            disabled={sending}
            style={{
              padding: targetButtonPadding,
              borderRadius: 8,
              background: target === "parents" ? accent : buttonSecondaryBg,
              color: target === "parents" ? "#FFFFFF" : buttonSecondaryText,
              border: `1px solid ${cardBorder}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              cursor: sending ? "not-allowed" : "pointer",
              opacity: sending ? 0.7 : 1,
              fontWeight: 500,
              fontSize: targetButtonFontSize,
              width: targetButtonWidth,
            }}
          >
            <Users size={isMobile ? 18 : 16} /> Parents
          </button>
          <button
            onClick={() => setTarget("eleves")}
            disabled={sending}
            style={{
              padding: targetButtonPadding,
              borderRadius: 8,
              background: target === "eleves" ? accent : buttonSecondaryBg,
              color: target === "eleves" ? "#FFFFFF" : buttonSecondaryText,
              border: `1px solid ${cardBorder}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              cursor: sending ? "not-allowed" : "pointer",
              opacity: sending ? 0.7 : 1,
              fontWeight: 500,
              fontSize: targetButtonFontSize,
              width: targetButtonWidth,
            }}
          >
            <GraduationCap size={isMobile ? 18 : 16} /> Tous les élèves
          </button>
          <button
            onClick={() => setTarget("classe")}
            disabled={sending}
            style={{
              padding: targetButtonPadding,
              borderRadius: 8,
              background: target === "classe" ? accent : buttonSecondaryBg,
              color: target === "classe" ? "#FFFFFF" : buttonSecondaryText,
              border: `1px solid ${cardBorder}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              cursor: sending ? "not-allowed" : "pointer",
              opacity: sending ? 0.7 : 1,
              fontWeight: 500,
              fontSize: targetButtonFontSize,
              width: targetButtonWidth,
            }}
          >
            <BookOpen size={isMobile ? 18 : 16} /> Par classe
          </button>
        </div>

        {/* Sélecteur de classe */}
        {target === "classe" && (
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", marginBottom: 6, fontWeight: 500, color: textSecondary, fontSize: isMobile ? 15 : 14 }}>Classe</label>
            <select
              style={{
                width: "100%",
                padding: selectPadding,
                borderRadius: 8,
                border: `1px solid ${cardBorder}`,
                background: inputBg,
                color: inputText,
                fontSize: selectFontSize,
                outline: "none",
              }}
              value={selectedClasse}
              onChange={(e) => setSelectedClasse(e.target.value)}
              disabled={sending}
            >
              <option value="">-- Choisir une classe --</option>
              {classes.map((c) => (
                <option key={c._id} value={c.nom} style={{ background: dark ? "#1E293B" : "#FFF" }}>
                  {c.nom}
                </option>
              ))}
            </select>
          </div>
        )}

        <p style={{ color: textSecondary, fontSize: isMobile ? 14 : 14, marginBottom: 12 }}>
          Ce message sera envoyé à{" "}
          <strong>
            {target === "parents"
              ? "tous les parents"
              : target === "eleves"
                ? "tous les élèves"
                : "tous les élèves de la classe sélectionnée"}
          </strong>.
        </p>

        <textarea
          style={{
            width: "100%",
            padding: textareaPadding,
            borderRadius: 8,
            border: `1px solid ${cardBorder}`,
            background: inputBg,
            color: inputText,
            fontSize: textareaFontSize,
            resize: "vertical",
            minHeight: textareaMinHeight,
            outline: "none",
            boxSizing: "border-box",
          }}
          placeholder="Écrivez votre communiqué..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={sending}
        />

        <button
          onClick={handleSend}
          disabled={sending || !message.trim() || (target === "classe" && !selectedClasse)}
          style={{
            marginTop: 12,
            padding: sendButtonPadding,
            borderRadius: 8,
            background: accent,
            color: "white",
            border: "none",
            fontWeight: 600,
            fontSize: sendButtonFontSize,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            cursor: sending ? "not-allowed" : "pointer",
            opacity: sending || !message.trim() || (target === "classe" && !selectedClasse) ? 0.6 : 1,
            width: sendButtonWidth,
          }}
        >
          {sending ? <Loader size={18} className="animate-spin" /> : <Send size={18} />}
          {sending ? "Envoi..." : "Envoyer"}
        </button>
      </div>
    </div>
  );
}