import { ArrowLeft, Phone } from "lucide-react";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";

export function PrivateChatView({
  selectedUser, messagesConversation, user,
  nouveauMessage, setNouveauMessage,
  piecesJointes, setPiecesJointes,
  lien, setLien,
  handleSend, handleFileChange, handleAddLink,
  fileInputRef, isMobile, goBack, handleCallUser,
  selectedUserId, S, messagesEndRef
}) {
  return (
    <>
      <div style={{
        padding: "16px", borderBottom: "1px solid #E2E8F0",
        display: "flex", alignItems: "center", gap: 12,
        background: "#FFFFFF"
      }}>
        {isMobile && (
          <button onClick={goBack} style={{ background: "none", border: "none", cursor: "pointer" }}>
            <ArrowLeft size={24} />
          </button>
        )}
        <div style={{ fontWeight: 600, fontSize: 16, flex: 1 }}>{selectedUser}</div>
        <button
          onClick={() => handleCallUser(selectedUserId)}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#4F46E5" }}
          title="Appeler"
        >
          <Phone size={20} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px", background: "#F8FAFC" }}>
        {messagesConversation.map((msg) => (
          <MessageBubble key={msg._id} msg={msg} user={user} />
        ))}
        <div ref={messagesEndRef} />
      </div>

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
    </>
  );
}