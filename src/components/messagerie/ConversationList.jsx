import { useState, useMemo } from "react";
import { Search, Send, GraduationCap, Users } from "lucide-react";
import { VIEW } from "./MessagerieApp"; // Assurez-vous d'exporter VIEW si nécessaire

export function ConversationList({
  user, utilisateurs, conversations, availableGroups,
  messagesEnvoyes, messagesRecus, selectedUserId, activeGroupId,
  navigateTo, getUserName, S, dark, currentView, isMobile, goBack
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const showNewChat = currentView.view === VIEW.NEW_CHAT;

  const filteredUsers = useMemo(() => {
    if (!showNewChat) return [];
    let list = utilisateurs.filter((u) => {
      if (u._id === user._id) return false;
      if (user.role === "parent" && (u.role === "parent" || u.role === "eleve")) return false;
      if (user.role === "eleve" && (u.role === "eleve" || u.role === "parent")) return false;
      return true;
    });
    if (searchTerm.trim()) {
      list = list.filter((u) => u.nom.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    return list;
  }, [showNewChat, utilisateurs, user, searchTerm]);

  return (
    <div style={{
      width: isMobile ? "100%" : 320,
      minWidth: isMobile ? "100%" : 320,
      borderRight: isMobile ? "none" : "1px solid #E2E8F0",
      display: "flex", flexDirection: "column", height: "100%",
      background: "#FFFFFF"
    }}>
      <div style={{
        padding: "16px", borderBottom: "1px solid #E2E8F0",
        display: "flex", justifyContent: "space-between", alignItems: "center"
      }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: "#1E293B", margin: 0 }}>Messages</h2>
        <div style={{ display: "flex", gap: 8 }}>
          {["admin", "directeur", "disciplinaire", "enseignant"].includes(user.role) && (
            <button onClick={() => navigateTo(VIEW.BROADCAST)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#4F46E5" }}
              title="Diffusion"
            >
              <Send size={18} />
            </button>
          )}
          <button
            onClick={() => showNewChat ? navigateTo(VIEW.LIST) : navigateTo(VIEW.NEW_CHAT)}
            style={{
              background: showNewChat ? "transparent" : "#4F46E5",
              color: showNewChat ? "#1E293B" : "#FFFFFF",
              border: showNewChat ? "1px solid #E2E8F0" : "none",
              borderRadius: 8, padding: "6px 12px", fontSize: 13,
              fontWeight: 600, cursor: "pointer"
            }}
          >
            {showNewChat ? "← Retour" : "+ Nouveau"}
          </button>
        </div>
      </div>

      {showNewChat ? (
        <div style={{ flex: 1, overflowY: "auto" }}>
          <div style={{ padding: "8px 16px" }}>
            <div style={{
              display: "flex", alignItems: "center",
              background: "#F1F5F9", borderRadius: 8, padding: "4px 12px"
            }}>
              <Search size={16} color="#94A3B8" />
              <input
                style={{
                  border: "none", outline: "none", background: "transparent",
                  marginLeft: 8, fontSize: 14, width: "100%"
                }}
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          {filteredUsers.map((u) => (
            <div key={u._id} onClick={() => navigateTo(VIEW.CHAT, { userId: u._id })}
              style={{
                padding: "12px 16px", cursor: "pointer",
                borderBottom: "1px solid #F1F5F9",
                transition: "background 0.15s"
              }}
              onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <div style={{ fontWeight: 600, fontSize: 14 }}>{u.nom}</div>
              <div style={{ fontSize: 12, color: "#64748B" }}>{u.role}</div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: "auto" }}>
          {availableGroups.length > 0 && (
            <div style={{ borderBottom: "1px solid #E2E8F0", paddingBottom: 8 }}>
              <div style={{ padding: "12px 16px 4px", fontSize: 12, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase" }}>
                Groupes
              </div>
              {availableGroups.map((group) => (
                <div key={group.id} onClick={() => navigateTo(VIEW.GROUP, { groupId: group.id })}
                  style={{
                    padding: "10px 16px", cursor: "pointer",
                    background: activeGroupId === group.id ? "#EEF2FF" : "transparent",
                    borderBottom: "1px solid #F1F5F9",
                    display: "flex", alignItems: "center", gap: 8,
                    transition: "background 0.15s"
                  }}
                >
                  {group.icon === "GraduationCap" ? <GraduationCap size={18} color="#4F46E5" /> : <Users size={18} color="#4F46E5" />}
                  <span style={{ fontWeight: 500, fontSize: 14 }}>{group.label}</span>
                </div>
              ))}
            </div>
          )}

          {conversations.length === 0 && (
            <div style={{ padding: 24, textAlign: "center", color: "#94A3B8" }}>Aucune conversation</div>
          )}
          {conversations.map((conv) => {
            const lastMsg = [...messagesEnvoyes, ...messagesRecus].find(
              (m) => (m.expediteurId === conv.userId && m.destinataireId === user._id) ||
                     (m.destinataireId === conv.userId && m.expediteurId === user._id)
            );
            return (
              <div key={conv.userId} onClick={() => navigateTo(VIEW.CHAT, { userId: conv.userId })}
                style={{
                  padding: "12px 16px", cursor: "pointer",
                  background: selectedUserId === conv.userId ? "#EEF2FF" : "transparent",
                  borderBottom: "1px solid #F1F5F9",
                  transition: "background 0.15s"
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 14 }}>{getUserName(conv.userId)}</div>
                <div style={{ fontSize: 12, color: "#64748B", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {lastMsg ? lastMsg.contenu.substring(0, 40) + (lastMsg.contenu.length > 40 ? "..." : "") : "Nouvelle conversation"}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}