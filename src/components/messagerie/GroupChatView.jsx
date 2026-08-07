import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { GraduationCap, Users } from "lucide-react";

export function GroupChatView({
  groupId, groupMessages, availableGroups,
  user, goBack, isMobile, onSendMessage,
  getUserName, S, messagesEndRef
}) {
  const [newGroupMessage, setNewGroupMessage] = useState("");
  const group = availableGroups.find(g => g.id === groupId);

  const handleSend = () => {
    if (!newGroupMessage.trim()) return;
    onSendMessage(newGroupMessage);
    setNewGroupMessage("");
  };

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
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
          {group?.icon === "GraduationCap" ? <GraduationCap size={20} color="#4F46E5" /> : <Users size={20} color="#4F46E5" />}
          <span style={{ fontWeight: 600, fontSize: 16 }}>{group?.label}</span>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px", background: "#F8FAFC" }}>
        {groupMessages.map((msg) => (
          <MessageBubble key={msg._id} msg={msg} user={user} getUserName={getUserName} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      <ChatInput
        message={newGroupMessage}
        setMessage={setNewGroupMessage}
        onSend={handleSend}
        placeholder="Message au groupe..."
      />
    </>
  );
}