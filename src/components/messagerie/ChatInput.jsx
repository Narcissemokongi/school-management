import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile"; // <-- Import du hook
import { Paperclip, Send, Link as LinkIcon, X, Smile } from "lucide-react";

export function ChatInput({ message, setMessage, onSend, fileInputRef, piecesJointes, setPiecesJointes, handleFileChange, lien, setLien, handleAddLink, placeholder = "Écrivez un message..." }) {
  const { dark } = useStyles();
  const isMobile = useIsMobile(); // Détection mobile

  const bg = dark ? "#1F2A30" : "#F0F2F5";
  const border = dark ? "#222D34" : "#E9EDEF";
  const inputBg = dark ? "#2A3942" : "#FFFFFF";
  const inputText = dark ? "#E9EDEF" : "#111B21";
  const iconColor = dark ? "#8696A0" : "#54656F";
  const sendButtonBg = dark ? "#00A884" : "#25D366";
  const sendButtonHover = dark ? "#008F72" : "#1EBE5D";

  // Ajustements adaptatifs
  const buttonSize = isMobile ? 48 : 40;
  const iconButtonSize = isMobile ? 26 : 24;
  const sendIconSize = isMobile ? 22 : 20;
  const inputFontSize = isMobile ? 16 : 14; // 16px pour éviter le zoom iOS
  const inputPadding = isMobile ? "8px 16px" : "6px 12px";
  const containerPadding = isMobile ? "8px 12px" : "8px 12px";
  const gap = isMobile ? 6 : 8;

  return (
    <div style={{ padding: containerPadding, borderTop: `1px solid ${border}`, background: bg, display: "flex", alignItems: "center", gap: gap }}>
      {/* Bouton emoji (placeholder) */}
      <button style={{ background: "none", border: "none", cursor: "pointer", color: iconColor, padding: isMobile ? 6 : 4, flexShrink: 0 }} title="Emoji">
        <Smile size={iconButtonSize} />
      </button>

      {/* Pièce jointe */}
      {fileInputRef && (
        <>
          <button onClick={() => fileInputRef.current.click()} style={{ background: "none", border: "none", cursor: "pointer", color: iconColor, padding: isMobile ? 6 : 4, flexShrink: 0 }} title="Joindre">
            <Paperclip size={iconButtonSize} />
          </button>
          <input type="file" ref={fileInputRef} style={{ display: "none" }} onChange={handleFileChange} />
        </>
      )}

      {/* Champ de saisie */}
      <div style={{ flex: 1, background: inputBg, borderRadius: 24, padding: inputPadding }}>
        {piecesJointes?.length > 0 && (
          <div style={{ display: "flex", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
            {piecesJointes.map((pj, idx) => (
              <span key={idx} style={{ background: dark ? "#3B4A54" : "#DCF8C6", color: inputText, padding: "2px 8px", borderRadius: 12, fontSize: isMobile ? 13 : 12, display: "flex", alignItems: "center", gap: 4 }}>
                {pj.nom}
                <button onClick={() => setPiecesJointes(prev => prev.filter((_, i) => i !== idx))} style={{ background: "none", border: "none", cursor: "pointer", color: iconColor, padding: 0 }}>
                  <X size={isMobile ? 14 : 12} />
                </button>
              </span>
            ))}
          </div>
        )}
        <input
          style={{ border: "none", outline: "none", background: "transparent", fontSize: inputFontSize, width: "100%", color: inputText }}
          placeholder={placeholder}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }}
        />
      </div>

      {/* Bouton lien */}
      {lien !== undefined && (
        <button onClick={handleAddLink} style={{ background: "none", border: "none", cursor: "pointer", color: iconColor, padding: isMobile ? 6 : 4, flexShrink: 0 }} title="Ajouter un lien">
          <LinkIcon size={iconButtonSize} />
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
          width: buttonSize,
          height: buttonSize,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: "#fff",
          opacity: !message.trim() && piecesJointes?.length === 0 ? 0.5 : 1,
          transition: "background 0.2s, opacity 0.2s",
          flexShrink: 0,
        }}
        title="Envoyer"
        onMouseEnter={(e) => (e.currentTarget.style.background = sendButtonHover)}
        onMouseLeave={(e) => (e.currentTarget.style.background = sendButtonBg)}
      >
        <Send size={sendIconSize} />
      </button>
    </div>
  );
}