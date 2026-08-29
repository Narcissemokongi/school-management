import { useStyles } from "../../styles/theme";
import { Paperclip, Send, Link as LinkIcon, X, Smile } from "lucide-react";

export function ChatInput({ message, setMessage, onSend, fileInputRef, piecesJointes, setPiecesJointes, handleFileChange, lien, setLien, handleAddLink, placeholder = "Écrivez un message..." }) {
  const { dark } = useStyles();

  const bg = dark ? "#1F2A30" : "#F0F2F5";
  const border = dark ? "#222D34" : "#E9EDEF";
  const inputBg = dark ? "#2A3942" : "#FFFFFF";
  const inputText = dark ? "#E9EDEF" : "#111B21";
  const iconColor = dark ? "#8696A0" : "#54656F";
  const sendButtonBg = dark ? "#00A884" : "#25D366";
  const sendButtonHover = dark ? "#008F72" : "#1EBE5D";

  return (
    <div style={{ padding: "8px 12px", borderTop: `1px solid ${border}`, background: bg, display: "flex", alignItems: "center", gap: 8 }}>
      {/* Bouton emoji (placeholder) */}
      <button style={{ background: "none", border: "none", cursor: "pointer", color: iconColor, padding: 4 }} title="Emoji"><Smile size={24} /></button>

      {/* Pièce jointe */}
      {fileInputRef && (
        <>
          <button onClick={() => fileInputRef.current.click()} style={{ background: "none", border: "none", cursor: "pointer", color: iconColor, padding: 4 }} title="Joindre">
            <Paperclip size={24} />
          </button>
          <input type="file" ref={fileInputRef} style={{ display: "none" }} onChange={handleFileChange} />
        </>
      )}

      {/* Champ de saisie */}
      <div style={{ flex: 1, background: inputBg, borderRadius: 24, padding: "6px 12px" }}>
        {piecesJointes?.length > 0 && (
          <div style={{ display: "flex", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
            {piecesJointes.map((pj, idx) => (
              <span key={idx} style={{ background: dark ? "#3B4A54" : "#DCF8C6", color: inputText, padding: "2px 8px", borderRadius: 12, fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                {pj.nom}
                <button onClick={() => setPiecesJointes(prev => prev.filter((_, i) => i !== idx))} style={{ background: "none", border: "none", cursor: "pointer", color: iconColor }}><X size={12} /></button>
              </span>
            ))}
          </div>
        )}
        <input
          style={{ border: "none", outline: "none", background: "transparent", fontSize: 14, width: "100%", color: inputText }}
          placeholder={placeholder}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }}
        />
      </div>

      {/* Bouton lien */}
      {lien !== undefined && (
        <button onClick={handleAddLink} style={{ background: "none", border: "none", cursor: "pointer", color: iconColor, padding: 4 }} title="Ajouter un lien">
          <LinkIcon size={20} />
        </button>
      )}

      {/* Bouton envoyer */}
      <button
        onClick={onSend}
        disabled={!message.trim() && piecesJointes?.length === 0}
        style={{
          background: sendButtonBg,
          border: "none",
          borderRadius: "50%",
          width: 40,
          height: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: "#fff",
          opacity: !message.trim() && piecesJointes?.length === 0 ? 0.5 : 1,
          transition: "background 0.2s, opacity 0.2s",
        }}
        title="Envoyer"
        onMouseEnter={(e) => (e.currentTarget.style.background = sendButtonHover)}
        onMouseLeave={(e) => (e.currentTarget.style.background = sendButtonBg)}
      >
        <Send size={20} />
      </button>
    </div>
  );
}