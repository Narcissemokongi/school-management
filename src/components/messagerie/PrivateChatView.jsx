import { useStyles } from "../../styles/theme";
import { ArrowLeft, Phone, Video, MoreVertical, Loader } from "lucide-react";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";

export function PrivateChatView({
  selectedUser,
  messagesConversation,
  user,
  nouveauMessage,
  setNouveauMessage,
  piecesJointes,
  setPiecesJointes,
  lien,
  setLien,
  handleSend,
  handleFileChange,
  handleAddLink,
  fileInputRef,
  isMobile,
  goBack,
  handleCallUser,
  selectedUserId,
  messagesEndRef,
  isOnline = false, // ✅ nouvelle prop
  onVideoCall, // ✅ nouveau gestionnaire (optionnel)
}) {
  const { dark } = useStyles();

  // Couleurs adaptatives (inspirées de WhatsApp)
  const headerBg = dark ? "#1F2A30" : "#075E54";
  const headerBorder = dark ? "#222D34" : "#075E54";
  const textPrimary = dark ? "#E9EDEF" : "#FFFFFF";
  const textSecondary = dark ? "#8696A0" : "#D9D9D9";
  const accent = dark ? "#00A884" : "#25D366";
  const onlineColor = "#25D366";
  const offlineColor = "#8696A0";
  const messageAreaBg = dark ? "#0B141A" : "#ECE5DD";

  const avatarInitial = selectedUser?.charAt(0).toUpperCase() || "?";

  return (
    <>
      {/* En-tête */}
      <div style={{
        padding: "10px 16px",
        borderBottom: `1px solid ${headerBorder}`,
        display: "flex",
        alignItems: "center",
        gap: 12,
        background: headerBg,
        color: textPrimary,
        transition: "background-color 0.3s",
      }}>
        {isMobile && (
          <button
            onClick={goBack}
            style={{ background: "none", border: "none", cursor: "pointer", color: textPrimary }}
            aria-label="Retour"
          >
            <ArrowLeft size={24} />
          </button>
        )}

        {/* Avatar */}
        <div style={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          background: dark ? "#3B4A54" : "#FFF3E0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          fontSize: 18,
          color: dark ? "#E9EDEF" : "#075E54",
        }}>
          {avatarInitial}
        </div>

        {/* Nom et statut */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 16, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {selectedUser || "Utilisateur inconnu"}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: textSecondary }}>
            <span style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: isOnline ? onlineColor : offlineColor,
              display: "inline-block",
            }} />
            {isOnline ? "En ligne" : "Hors ligne"}
          </div>
        </div>

        {/* Boutons d'action */}
        <div style={{ display: "flex", gap: 4 }}>
          <button
            onClick={() => handleCallUser(selectedUserId)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: textPrimary,
              padding: 8,
              borderRadius: 8,
              transition: "background 0.2s",
            }}
            title="Appel audio"
          >
            <Phone size={20} />
          </button>
          <button
            onClick={onVideoCall}
            disabled={!onVideoCall}
            style={{
              background: "none",
              border: "none",
              cursor: onVideoCall ? "pointer" : "not-allowed",
              color: textPrimary,
              padding: 8,
              borderRadius: 8,
              opacity: onVideoCall ? 1 : 0.5,
              transition: "background 0.2s",
            }}
            title="Appel vidéo"
          >
            <Video size={20} />
          </button>
          <button
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: textPrimary,
              padding: 8,
              borderRadius: 8,
              transition: "background 0.2s",
            }}
            title="Plus d'options"
          >
            <MoreVertical size={20} />
          </button>
        </div>
      </div>

      {/* Zone des messages */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "16px",
        background: messageAreaBg,
        transition: "background-color 0.3s",
      }}>
        {messagesConversation === undefined ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
            <Loader size={28} className="animate-spin" />
          </div>
        ) : messagesConversation.length === 0 ? (
          <div style={{ textAlign: "center", color: dark ? "#8696A0" : "#666", padding: 40 }}>
            Aucun message. Commencez la conversation !
          </div>
        ) : (
          messagesConversation.map((msg) => (
            <MessageBubble
              key={msg._id}
              msg={msg}
              user={user}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Saisie de message */}
      <ChatInput
        message={nouveauMessage}
        setMessage={setNouveauMessage}
        onSend={handleSend}
        fileInputRef={fileInputRef}
        piecesJointes={piecesJointes}
        setPiecesJointes={setPiecesJointes}
        handleFileChange={handleFileChange}
        lien={lien}
        setLien={setLien}
        handleAddLink={handleAddLink}
      />

      {/* Animation pour spinner */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .animate-spin { animation: spin 1s linear infinite; }`}</style>
    </>
  );
}