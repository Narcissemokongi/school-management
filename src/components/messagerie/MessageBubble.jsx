export function MessageBubble({ msg, user, getUserName }) {
  const isMine = msg.expediteurId === user?._id;
  return (
    <div style={{ display: "flex", justifyContent: isMine ? "flex-end" : "flex-start", marginBottom: 12 }}>
      <div style={{
        maxWidth: "70%",
        padding: "10px 14px",
        borderRadius: 16,
        background: isMine ? "#4F46E5" : "#FFFFFF",
        color: isMine ? "#FFFFFF" : "#1E293B",
        boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
      }}>
        {getUserName && !isMine && (
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, color: "#4F46E5" }}>
            {getUserName(msg.expediteurId)}
          </div>
        )}
        <div style={{ fontSize: 14, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
          {msg.contenu}
        </div>
        {msg.piecesJointes?.map((pj, idx) => (
          <a key={idx} href={pj.url} target="_blank" rel="noopener noreferrer"
            style={{ display: "block", marginTop: 8, color: isMine ? "#C7D2FE" : "#4F46E5", textDecoration: "underline", fontSize: 13 }}
          >
            📎 {pj.nom}
          </a>
        ))}
        <div style={{ fontSize: 10, textAlign: "right", marginTop: 4, opacity: 0.6 }}>
          {new Date(msg.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
    </div>
  );
}