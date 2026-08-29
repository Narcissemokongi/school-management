import { useStyles } from "../../styles/theme";
import { Check, CheckCheck, Paperclip } from "lucide-react";

export function MessageBubble({ msg, user, getUserName }) {
  const { dark } = useStyles();
  const isMine = msg.expediteurId === user?._id;

  // Statut de lecture (true si le message a été lu, sinon false)
  const isRead = msg.lu ?? msg.read ?? false; // Adaptez selon votre schéma

  // Couleurs WhatsApp clair/sombre
  const sentBg = dark ? "#005C4B" : "#DCF8C6";
  const receivedBg = dark ? "#1E2A30" : "#FFFFFF";
  const sentText = dark ? "#E9EDEF" : "#111B21";
  const receivedText = dark ? "#E9EDEF" : "#111B21";
  const timeColor = dark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)";
  const senderColor = dark ? "#00A884" : "#075E54";
  const attachmentColor = isMine
    ? dark ? "#A5B4FC" : "#075E54"
    : dark ? "#00A884" : "#075E54";

  // Formater l'heure et la date complète
  const messageDate = new Date(msg.date);
  const timeString = messageDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const fullDateString = messageDate.toLocaleString([], {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div style={{
      display: "flex",
      justifyContent: isMine ? "flex-end" : "flex-start",
      marginBottom: 12,
    }}>
      <div style={{
        maxWidth: "70%",
        padding: "6px 10px 8px 10px",
        borderRadius: isMine ? "12px 12px 0 12px" : "12px 12px 12px 0",
        background: isMine ? sentBg : receivedBg,
        color: isMine ? sentText : receivedText,
        boxShadow: "0 1px 1px rgba(0,0,0,0.15)",
        position: "relative",
        wordBreak: "break-word",
      }}>
        {/* Nom de l'expéditeur (pour les messages reçus dans les groupes) */}
        {getUserName && !isMine && (
          <div style={{
            fontSize: 12,
            fontWeight: 700,
            marginBottom: 2,
            color: senderColor,
          }}>
            {getUserName(msg.expediteurId)}
          </div>
        )}

        {/* Contenu du message */}
        <div style={{
          fontSize: 14,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          lineHeight: 1.4,
        }}>
          {msg.contenu}
        </div>

        {/* Pièces jointes */}
        {msg.piecesJointes?.map((pj, idx) => (
          <a
            key={idx}
            href={pj.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              marginTop: 6,
              color: attachmentColor,
              textDecoration: "underline",
              fontSize: 13,
            }}
          >
            <Paperclip size={14} />
            {pj.nom}
          </a>
        ))}

        {/* Heure et statut */}
        <div style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: 4,
          marginTop: 4,
          fontSize: 11,
          color: timeColor,
        }}>
          <span title={fullDateString}>{timeString}</span>
          {isMine && (isRead ? <CheckCheck size={16} /> : <Check size={16} />)}
        </div>
      </div>
    </div>
  );
}