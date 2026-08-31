import { useIsMobile } from "../../hooks/useIsMobile"; // <-- Import du hook
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
  isOnline = false,
  onVideoCall,
  isUploading = false, // ✅ nouvel état d'upload
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

  // Styles adaptatifs
  const headerPadding = isMobile ? "10px 12px" : "10px 16px";
  const headerGap = isMobile ? 8 : 12;
  const avatarSize = isMobile ? 36 : 40;
  const avatarFontSize = isMobile ? 16 : 18;
  const nameFontSize = isMobile ? 15 : 16;
  const statusFontSize = isMobile ? 11 : 12;
  const actionButtonPadding = isMobile ? 6 : 8;
  const actionIconSize = isMobile ? 22 : 20;
  const messageAreaPadding = isMobile ? 12 : 16;
  const emptyStatePadding = isMobile ? 32 : 40;

  return (
    <>
      {/* En-tête */}
      <div style={{
        padding: headerPadding,
        borderBottom: `1px solid ${headerBorder}`,
        display: "flex",
        alignItems: "center",
        gap: headerGap,
        background: headerBg,
        color: textPrimary,
        transition: "background-color 0.3s",
      }}>
        {isMobile && (
          <button
            onClick={goBack}
            style={{ background: "none", border: "none", cursor: "pointer", color: textPrimary, padding: 4, flexShrink: 0 }}
            aria-label="Retour"
          >
            <ArrowLeft size={24} />
          </button>
        )}

        {/* Avatar */}
        <div style={{
          width: avatarSize,
          height: avatarSize,
          borderRadius: "50%",
          background: dark ? "#3B4A54" : "#FFF3E0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          fontSize: avatarFontSize,
          color: dark ? "#E9EDEF" : "#075E54",
          flexShrink: 0,
        }}>
          {avatarInitial}
        </div>

        {/* Nom et statut */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: nameFontSize, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {selectedUser || "Utilisateur inconnu"}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: statusFontSize, color: textSecondary }}>
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
        <div style={{ display: "flex", gap: isMobile ? 2 : 4, flexShrink: 0 }}>
          <button
            onClick={() => handleCallUser(selectedUserId)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: textPrimary,
              padding: actionButtonPadding,
              borderRadius: 8,
              transition: "background 0.2s",
            }}
            title="Appel audio"
          >
            <Phone size={actionIconSize} />
          </button>
          <button
            onClick={onVideoCall}
            disabled={!onVideoCall}
            style={{
              background: "none",
              border: "none",
              cursor: onVideoCall ? "pointer" : "not-allowed",
              color: textPrimary,
              padding: actionButtonPadding,
              borderRadius: 8,
              opacity: onVideoCall ? 1 : 0.5,
              transition: "background 0.2s",
            }}
            title="Appel vidéo"
          >
            <Video size={actionIconSize} />
          </button>
          <button
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: textPrimary,
              padding: actionButtonPadding,
              borderRadius: 8,
              transition: "background 0.2s",
            }}
            title="Plus d'options"
          >
            <MoreVertical size={actionIconSize} />
          </button>
        </div>
      </div>

      {/* Zone des messages */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: messageAreaPadding,
        background: messageAreaBg,
        transition: "background-color 0.3s",
      }}>
        {messagesConversation === undefined ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
            <Loader size={28} className="animate-spin" />
          </div>
        ) : messagesConversation.length === 0 ? (
          <div style={{ textAlign: "center", color: dark ? "#8696A0" : "#666", padding: emptyStatePadding, fontSize: isMobile ? 13 : 14 }}>
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
        isMobile={isMobile} // ✅ transmettre isMobile pour adaptation interne
        isUploading={isUploading} // ✅ transmettre l'état d'upload
      />

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .animate-spin { animation: spin 1s linear infinite; }`}</style>
    </>
  );
}