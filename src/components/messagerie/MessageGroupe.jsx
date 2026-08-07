import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";           // remonte de 3 niveaux
import { useStyles } from "../../styles/theme";                 // remonte de 2 niveaux
import { useIsMobile } from "../../hooks/useIsMobile";         // ajout du hook manquant
import { Send, ArrowLeft, Users, GraduationCap } from "lucide-react";
import toast from "react-hot-toast";

export function MessageGroupe({ user, ecoleId, onBack }) {
  const { S } = useStyles();
  const isMobile = useIsMobile();   // maintenant défini
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [target, setTarget] = useState("parents");
  const [selectedClasse, setSelectedClasse] = useState("");

  const sendToAllParents = useMutation(api.messages.sendToAllParents);
  const sendToAllEleves = useMutation(api.messages.sendToAllEleves);
  const sendToClasse = useMutation(api.messages.sendToClasse);
  const classes = useQuery(api.classes.list, ecoleId ? { ecoleId } : "skip") ?? [];

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

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        {!isMobile && (
          <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: S.text }}>
            <ArrowLeft size={24} />
          </button>
        )}
        <h2 style={S.h2}>Message groupé</h2>
      </div>

      <div style={S.card}>
        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <button
            onClick={() => setTarget("parents")}
            style={{
              ...S.btnSm(target === "parents" ? "#4f46e5" : S.textMuted),
              background: target === "parents" ? "#4f46e5" : "transparent",
              color: target === "parents" ? "#fff" : S.textMuted,
              border: `1px solid ${S.cardBorder}`,
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            <Users size={16} /> Parents
          </button>
          <button
            onClick={() => setTarget("eleves")}
            style={{
              ...S.btnSm(target === "eleves" ? "#4f46e5" : S.textMuted),
              background: target === "eleves" ? "#4f46e5" : "transparent",
              color: target === "eleves" ? "#fff" : S.textMuted,
              border: `1px solid ${S.cardBorder}`,
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            <GraduationCap size={16} /> Tous les élèves
          </button>
          <button
            onClick={() => setTarget("classe")}
            style={{
              ...S.btnSm(target === "classe" ? "#4f46e5" : S.textMuted),
              background: target === "classe" ? "#4f46e5" : "transparent",
              color: target === "classe" ? "#fff" : S.textMuted,
              border: `1px solid ${S.cardBorder}`,
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            📚 Par classe
          </button>
        </div>

        {target === "classe" && (
          <div style={{ marginBottom: 12 }}>
            <label style={S.label}>Classe</label>
            <select style={S.select} value={selectedClasse} onChange={(e) => setSelectedClasse(e.target.value)}>
              <option value="">-- Choisir une classe --</option>
              {classes.map((c) => (
                <option key={c._id} value={c.nom}>{c.nom}</option>
              ))}
            </select>
          </div>
        )}

        <p style={S.muted}>
          Ce message sera envoyé à <strong>
            {target === "parents" ? "tous les parents" :
             target === "eleves" ? "tous les élèves" :
             "tous les élèves de la classe sélectionnée"}
          </strong>.
        </p>

        <textarea
          style={{ ...S.input, height: 120, resize: "vertical" }}
          placeholder="Écrivez votre communiqué..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />

        <button
          onClick={handleSend}
          disabled={sending || !message.trim() || (target === "classe" && !selectedClasse)}
          style={{
            ...S.btn("#4f46e5"),
            marginTop: 12,
            display: "flex", alignItems: "center", gap: 8,
            opacity: sending || !message.trim() || (target === "classe" && !selectedClasse) ? 0.6 : 1,
          }}
        >
          <Send size={18} /> {sending ? "Envoi..." : "Envoyer"}
        </button>
      </div>
    </div>
  );
}