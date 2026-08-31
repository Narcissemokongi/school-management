import { useState, useMemo } from "react";
import { useStyles } from "../../styles/theme";
import { useIsMobile } from "../../hooks/useIsMobile"; // <-- Import du hook (si non passé en prop)
import { MessageSquarePlus, Megaphone, Search, X, ArrowLeft } from "lucide-react";
import { VIEW } from "./MessagerieApp";

export function ConversationList({
  user,
  utilisateurs = [],
  conversations = [],
  availableGroups = [],
  selectedUserId,
  activeGroupId,
  navigateTo,
  getUserName,
  currentView,
  isMobile: isMobileProp, // prop éventuelle
  goBack,
}) {
  const { dark } = useStyles();
  const hookIsMobile = useIsMobile(); // Détection automatique
  const isMobile = isMobileProp !== undefined ? isMobileProp : hookIsMobile; // Priorité à la prop

  const [searchTerm, setSearchTerm] = useState("");
  const showNewChat = currentView?.view === VIEW.NEW_CHAT;

  // Couleurs adaptatives
  const bg = dark ? "#1E293B" : "#FFFFFF";
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const borderColor = dark ? "#334155" : "#E2E8F0";
  const hoverBg = dark ? "#26334D" : "#F1F5F9";
  const activeBg = dark ? "#312E81" : "#EEF2FF";
  const inputBg = dark ? "#0F172A" : "#F9FAFB";

  const filteredUsers = useMemo(() => {
    if (!showNewChat) return [];
    let list = utilisateurs.filter((u) => {
      if (u._id === user._id) return false;
      // Règles de visibilité selon le rôle
      if (user.role === "parent" && (u.role === "parent" || u.role === "eleve")) return false;
      if (user.role === "eleve" && (u.role === "eleve" || u.role === "parent")) return false;
      if (user.role === "enseignant" && u.role !== "eleve") return false;
      if (user.role === "enseignant" && u.role === "eleve" && u.classe !== user.classe) return false;
      return true;
    });
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter((u) => u.nom.toLowerCase().includes(q));
    }
    return list;
  }, [showNewChat, utilisateurs, user, searchTerm]);

  // Styles adaptatifs
  const headerPadding = isMobile ? 12 : 16;
  const headerTitleSize = isMobile ? 18 : 20;
  const headerButtonSize = isMobile ? 40 : 36;
  const searchInputPadding = isMobile ? "10px 12px" : "8px 12px";
  const searchInputFontSize = isMobile ? 16 : 14;
  const listItemPadding = isMobile ? "12px 14px" : "10px 16px";
  const listItemFontSize = isMobile ? 15 : 14;
  const groupLabelPadding = isMobile ? "10px 14px" : "12px 16px 6px";
  const groupLabelFontSize = isMobile ? 11 : 12;
  const groupItemPadding = isMobile ? "10px 14px" : "10px 16px";

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100%",
      width: "100%",
      background: bg,
      transition: "background-color 0.3s",
    }}>
      {/* En-tête */}
      <div style={{
        padding: headerPadding,
        borderBottom: `1px solid ${borderColor}`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 8,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          {isMobile && goBack && (
            <button
              onClick={goBack}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: textSecondary,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 4,
              }}
              aria-label="Retour"
            >
              <ArrowLeft size={22} />
            </button>
          )}
          <h2 style={{ margin: 0, fontSize: headerTitleSize, fontWeight: 700, color: textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            Messages
          </h2>
        </div>
        <div style={{ display: "flex", gap: isMobile ? 4 : 8, flexShrink: 0 }}>
          {["admin", "directeur", "disciplinaire"].includes(user.role) && (
            <button
              onClick={() => navigateTo(VIEW.BROADCAST)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: textSecondary,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: headerButtonSize,
                height: headerButtonSize,
                borderRadius: 8,
                transition: "background 0.2s",
              }}
              title="Diffusion"
            >
              <Megaphone size={isMobile ? 22 : 20} />
            </button>
          )}
          <button
            onClick={() => (showNewChat ? navigateTo(VIEW.LIST) : navigateTo(VIEW.NEW_CHAT))}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: textSecondary,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: headerButtonSize,
              height: headerButtonSize,
              borderRadius: 8,
              transition: "background 0.2s",
            }}
            title={showNewChat ? "Retour" : "Nouvelle conversation"}
          >
            <MessageSquarePlus size={isMobile ? 22 : 20} />
          </button>
        </div>
      </div>

      {/* Contenu */}
      {showNewChat ? (
        <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? 8 : 8 }}>
          {/* Barre de recherche */}
          <div style={{
            display: "flex",
            alignItems: "center",
            background: inputBg,
            border: `1px solid ${borderColor}`,
            borderRadius: 8,
            padding: searchInputPadding,
            marginBottom: 8,
          }}>
            <Search size={isMobile ? 18 : 16} color={textSecondary} />
            <input
              style={{
                border: "none",
                outline: "none",
                background: "transparent",
                color: textPrimary,
                fontSize: searchInputFontSize,
                width: "100%",
                marginLeft: 8,
              }}
              placeholder="Rechercher un utilisateur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                style={{ background: "none", border: "none", cursor: "pointer", color: textSecondary }}
              >
                <X size={isMobile ? 18 : 16} />
              </button>
            )}
          </div>

          {/* Liste des utilisateurs filtrés */}
          {filteredUsers.length === 0 ? (
            <div style={{ textAlign: "center", padding: 24, color: textSecondary, fontSize: isMobile ? 14 : 14 }}>
              Aucun utilisateur trouvé
            </div>
          ) : (
            filteredUsers.map((u) => (
              <div
                key={u._id}
                onClick={() => navigateTo(VIEW.CHAT, { userId: u._id })}
                style={{
                  padding: listItemPadding,
                  cursor: "pointer",
                  borderRadius: 8,
                  borderBottom: `1px solid ${borderColor}`,
                  color: textPrimary,
                  fontSize: listItemFontSize,
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = hoverBg)}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                {u.nom} {u.postnom ? u.postnom : ""} {u.prenom ? u.prenom : ""}
              </div>
            ))
          )}
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: "auto" }}>
          {/* Groupes */}
          {availableGroups.length > 0 && (
            <div style={{ borderBottom: `1px solid ${borderColor}`, paddingBottom: 8 }}>
              <div style={{
                padding: groupLabelPadding,
                fontSize: groupLabelFontSize,
                fontWeight: 700,
                color: textSecondary,
                textTransform: "uppercase",
              }}>
                Groupes
              </div>
              {availableGroups.map((group) => (
                <div
                  key={group.id}
                  onClick={() => navigateTo(VIEW.GROUP, { groupId: group.id })}
                  style={{
                    padding: groupItemPadding,
                    cursor: "pointer",
                    background: activeGroupId === group.id ? activeBg : "transparent",
                    borderBottom: `1px solid ${borderColor}`,
                    color: textPrimary,
                    fontSize: listItemFontSize,
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    if (activeGroupId !== group.id) e.currentTarget.style.background = hoverBg;
                  }}
                  onMouseLeave={(e) => {
                    if (activeGroupId !== group.id) e.currentTarget.style.background = "transparent";
                  }}
                >
                  {group.label}
                </div>
              ))}
            </div>
          )}

          {/* Conversations privées */}
          {conversations.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: textSecondary, fontSize: isMobile ? 14 : 14 }}>
              Aucune conversation
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.userId}
                onClick={() => navigateTo(VIEW.CHAT, { userId: conv.userId })}
                style={{
                  padding: listItemPadding,
                  cursor: "pointer",
                  background: selectedUserId === conv.userId ? activeBg : "transparent",
                  borderBottom: `1px solid ${borderColor}`,
                  color: textPrimary,
                  fontSize: listItemFontSize,
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => {
                  if (selectedUserId !== conv.userId) e.currentTarget.style.background = hoverBg;
                }}
                onMouseLeave={(e) => {
                  if (selectedUserId !== conv.userId) e.currentTarget.style.background = "transparent";
                }}
              >
                {getUserName(conv.userId)}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}