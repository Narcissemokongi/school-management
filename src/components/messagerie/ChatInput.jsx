import { Paperclip, Send, Link as LinkIcon, X } from "lucide-react";

export function ChatInput({
  message, setMessage, onSend,
  fileInputRef, piecesJointes, setPiecesJointes,
  handleFileChange, lien, setLien, handleAddLink,
  placeholder = "Écrivez un message..."
}) {
  return (
    <div style={{ padding: "12px", borderTop: "1px solid #E2E8F0", background: "#FFFFFF" }}>
      {piecesJointes?.length > 0 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
          {piecesJointes.map((pj, idx) => (
            <div key={idx} style={{ display: "flex", alignItems: "center", gap: 4, background: "#EEF2FF", padding: "4px 8px", borderRadius: 8, fontSize: 12 }}>
              <span>{pj.nom}</span>
              <button onClick={() => setPiecesJointes(prev => prev.filter((_, i) => i !== idx))}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444" }}>
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {lien !== undefined && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <input
            style={{ flex: 1, padding: "8px 12px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 14 }}
            placeholder="Ajouter un lien..."
            value={lien}
            onChange={(e) => setLien(e.target.value)}
          />
          <button onClick={handleAddLink}
            style={{ background: "#6366F1", color: "white", border: "none", borderRadius: 8, padding: "8px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
            <LinkIcon size={16} /> Ajouter
          </button>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {fileInputRef && (
          <>
            <button onClick={() => fileInputRef.current.click()}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#64748B" }}
              title="Joindre un fichier">
              <Paperclip size={20} />
            </button>
            <input type="file" ref={fileInputRef} style={{ display: "none" }} onChange={handleFileChange} />
          </>
        )}
        <input
          style={{ flex: 1, padding: "10px 14px", border: "1px solid #E2E8F0", borderRadius: 10, fontSize: 14, outline: "none" }}
          placeholder={placeholder}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }}
        />
        <button onClick={onSend}
          style={{ background: "#4F46E5", border: "none", borderRadius: 10, padding: "10px 14px", cursor: "pointer", color: "white" }}
          title="Envoyer">
          <Send size={20} />
        </button>
      </div>
    </div>
  );
}