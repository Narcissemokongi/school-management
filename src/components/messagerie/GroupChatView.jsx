import { useState } from "react";
import { ArrowLeft, GraduationCap, Users, Loader } from "lucide-react";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { useStyles } from "../../styles/theme";

export function GroupChatView({
  groupId,
  groupMessages,
  availableGroups,
  user,
  goBack,
  isMobile,
  onSendMessage,
  getUserName,
  messagesEndRef,
}) {
  const { dark } = useStyles();
  const [newGroupMessage, setNewGroupMessage] = useState("");

  const group = availableGroups.find((g) => g.id === groupId);

  const handleSend = () => {
    if (!newGroupMessage.trim()) return;
    onSendMessage(newGroupMessage);
    setNewGroupMessage("");
  };

  // Couleurs adaptatives
  const headerBg = dark ? "#1E293B" : "#FFFFFF";
  const headerBorder = dark ? "#334155" : "#E2E8F0";
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const accentColor = dark ? "#818CF8" : "#4F46E5";
  const messageAreaBg = dark ? "#0F172A" : "#F8FAFC";

  // Styles adaptatifs
  const headerPadding = isMobile ? 12 : 16;
  const headerGap = isMobile ? 8 : 12;
  const groupTitleSize = isMobile ? 15 : 16;
  const groupIconSize = isMobile ? 18 : 20;
  const messageAreaPadding = isMobile ? 12 : 16;
  const emptyStatePadding = isMobile ? 32 : 40;
  const emptyStateFontSize = isMobile ? 13 : 14;

  return (
    <>
      {/* En-tête */}
      <div
        style={{
          padding: headerPadding,
          borderBottom: `1px solid ${headerBorder}`,
          display: "flex",
          alignItems: "center",
          gap: headerGap,
          background: headerBg,
          transition: "background-color 0.3s, border-color 0.3s",
        }}
      >
        {isMobile && (
          <button
            onClick={goBack}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: textPrimary,
              padding: 4,
              flexShrink: 0,
            }}
            aria-label="Retour"
          >
            <ArrowLeft size={24} />
          </button>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
          {group?.icon === "GraduationCap" ? (
            <GraduationCap size={groupIconSize} color={accentColor} />
          ) : (
            <Users size={groupIconSize} color={accentColor} />
          )}
          <span style={{ fontWeight: 600, fontSize: groupTitleSize, color: textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {group ? group.label : "Groupe introuvable"}
          </span>
        </div>
      </div>

      {/* Zone des messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: messageAreaPadding,
          background: messageAreaBg,
          transition: "background-color 0.3s",
        }}
      >
        {groupMessages === undefined ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
            <Loader size={28} className="animate-spin" />
          </div>
        ) : groupMessages.length === 0 ? (
          <div style={{ textAlign: "center", color: textSecondary, padding: emptyStatePadding, fontSize: emptyStateFontSize }}>
            Aucun message dans ce groupe.
          </div>
        ) : (
          groupMessages.map((msg) => (
            <MessageBubble
              key={msg._id}
              msg={msg}
              user={user}
              getUserName={getUserName}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Saisie de message */}
      <ChatInput
        message={newGroupMessage}
        setMessage={setNewGroupMessage}
        onSend={handleSend}
        placeholder="Message au groupe..."
        isMobile={isMobile} // Prop transmise pour adaptation interne
      />

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .animate-spin { animation: spin 1s linear infinite; }`}</style>
    </>
  );
}