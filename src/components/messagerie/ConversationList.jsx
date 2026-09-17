// src/components/messagerie/ConversationList.jsx
import { useState, useMemo, useCallback } from "react";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  MessageSquarePlus,
  Megaphone,
  Search,
  X,
  ArrowLeft,
  Users,
  GraduationCap,
  MessageCircle,
  Menu,
} from "lucide-react";
import { VIEW } from "./MessagerieApp";
import { useAppStore } from "@/store/appStore";
import { MessagingHero } from "./MessagingHero";

// ════════════════════════════════════════════════════════════════════
// KEYFRAMES module-level
// ════════════════════════════════════════════════════════════════════
const ConvListKeyframes = (
  <style>{`
    @keyframes conv-pulse {
      0%, 100% { opacity: 1; }
      50%      { opacity: 0.4; }
    }
    @keyframes conv-fade-in {
      from { opacity: 0; transform: translateY(4px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .conv-skeleton {
      background: currentColor;
      border-radius: 6px;
      animation: conv-pulse 1.4s ease-in-out infinite;
    }
    .conv-fade-in { animation: conv-fade-in 0.25s ease-out; }
    @media (prefers-reduced-motion: reduce) {
      .conv-skeleton, .conv-fade-in { animation: none !important; }
    }
  `}</style>
);

// ════════════════════════════════════════════════════════════════════
// TOKENS
// ════════════════════════════════════════════════════════════════════
function buildTokens(dark) {
  return {
    bg: dark ? "#0F172A" : "#F8FAFC",
    surface: dark ? "#1E293B" : "#FFFFFF",
    surfaceHover: dark ? "#26334D" : "#F8FAFC",
    border: dark ? "#334155" : "#E2E8F0",
    text: dark ? "#F1F5F9" : "#1E293B",
    textMuted: dark ? "#94A3B8" : "#64748B",
    primary: dark ? "#818CF8" : "#4F46E5",
    primaryHover: dark ? "#6366F1" : "#4338CA",
    primarySoft: dark ? "#312E81" : "#EEF2FF",
    ghostHover: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
    skeleton: dark ? "#334155" : "#E2E8F0",
    danger: dark ? "#F87171" : "#EF4444",
    success: dark ? "#34D399" : "#10B981",
    groupBg: dark ? "#4C1D95" : "#EDE9FE",
    groupFg: dark ? "#C4B5FD" : "#6D28D9",
  };
}

// ════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════
const AVATAR_PALETTE = [
  "#6366F1", "#8B5CF6", "#EC4899", "#F43F5E",
  "#F59E0B", "#10B981", "#14B8A6", "#3B82F6",
];

function getInitials(name) {
  if (!name) return "?";
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (
    parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
  ).toUpperCase();
}

function getAvatarColor(name) {
  if (!name) return AVATAR_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";

  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  if (diffDays === 1) return "Hier";
  if (diffDays < 7) {
    return date.toLocaleDateString("fr-FR", { weekday: "short" });
  }
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
  });
}

// ════════════════════════════════════════════════════════════════════
// SOUS-COMPOSANTS
// ════════════════════════════════════════════════════════════════════

function Avatar({ name, icon, variant = "user", size = 46, tokens }) {
  const isGroup = variant === "group" || icon;
  const bg = isGroup ? tokens.groupBg : tokens.primarySoft;
  const fg = isGroup ? tokens.groupFg : tokens.primary;

  const finalBg = !isGroup && name ? getAvatarColor(name) : bg;
  const finalFg = !isGroup && name ? "#FFFFFF" : fg;

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: finalBg,
        color: finalFg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: size * 0.36,
        flexShrink: 0,
        letterSpacing: "-0.02em",
      }}
      aria-hidden="true"
    >
      {icon === "GraduationCap" ? (
        <GraduationCap size={size * 0.5} />
      ) : icon === "Users" ? (
        <Users size={size * 0.5} />
      ) : (
        getInitials(name)
      )}
    </div>
  );
}

function HeaderIconButton({ icon, label, onClick, tokens }) {
  const isMobile = useIsMobile();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const size = isMobile ? 44 : 36;

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        background: hovered ? tokens.ghostHover : "transparent",
        border: "none",
        cursor: "pointer",
        color: tokens.textMuted,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: 12,
        transition: "background 0.15s ease",
        outline: focused ? `2px solid ${tokens.primary}` : "none",
        outlineOffset: 2,
        flexShrink: 0,
      }}
      title={label}
      aria-label={label}
    >
      {icon}
    </button>
  );
}

function ListItem({
  onClick,
  isActive = false,
  avatar,
  title,
  subtitle,
  trailing,
  tokens,
  isMobile,
  ariaLabel,
}) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  const background = isActive
    ? tokens.primarySoft
    : hovered
    ? tokens.surfaceHover
    : "transparent";

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick?.();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        padding: "14px 16px",
        minHeight: 68,
        cursor: "pointer",
        borderRadius: 10,
        background,
        display: "flex",
        alignItems: "center",
        gap: 12,
        transition: "background 0.15s ease",
        outline: focused ? `2px solid ${tokens.primary}` : "none",
        outlineOffset: -2,
        minWidth: 0,
        boxSizing: "border-box",
      }}
      aria-label={ariaLabel}
      aria-current={isActive ? "page" : undefined}
    >
      {avatar}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div
            style={{
              color: tokens.text,
              fontSize: 14.5,
              fontWeight: 600,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              minWidth: 0,
            }}
          >
            {title}
          </div>
          {trailing?.timestamp && (
            <span
              style={{
                color: tokens.textMuted,
                fontSize: 11.5,
                flexShrink: 0,
              }}
            >
              {trailing.timestamp}
            </span>
          )}
        </div>

        {(subtitle || trailing?.badge != null) && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 8,
              marginTop: 4,
            }}
          >
            <span
              style={{
                color: tokens.textMuted,
                fontSize: 12.5,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                minWidth: 0,
              }}
            >
              {subtitle || "—"}
            </span>
            {trailing?.badge != null && trailing.badge > 0 && (
              <span
                style={{
                  background: tokens.danger,
                  color: "#FFFFFF",
                  borderRadius: 10,
                  padding: "2px 8px",
                  fontSize: 11.5,
                  fontWeight: 700,
                  flexShrink: 0,
                  minWidth: 20,
                  textAlign: "center",
                  lineHeight: 1.4,
                }}
              >
                {trailing.badge > 99 ? "99+" : trailing.badge}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ItemSkeleton({ tokens }) {
  return (
    <div
      style={{
        padding: "14px 16px",
        minHeight: 68,
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div
        className="conv-skeleton"
        style={{
          width: 46,
          height: 46,
          borderRadius: "50%",
          color: tokens.skeleton,
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1 }}>
        <div
          className="conv-skeleton"
          style={{
            width: "55%",
            height: 13,
            color: tokens.skeleton,
            marginBottom: 8,
          }}
        />
        <div
          className="conv-skeleton"
          style={{ width: "75%", height: 10, color: tokens.skeleton }}
        />
      </div>
    </div>
  );
}

function SectionHeader({ label, tokens, isMobile }) {
  return (
    <div
      style={{
        padding: isMobile ? "14px 16px 6px" : "18px 18px 6px",
        fontSize: 11,
        fontWeight: 700,
        color: tokens.textMuted,
        textTransform: "uppercase",
        letterSpacing: 0.6,
      }}
    >
      {label}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ════════════════════════════════════════════════════════════════════
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
  isMobile: isMobileProp,
  goBack,
  isLoading = false,
}) {
  const { dark } = useStyles();
  const hookIsMobile = useIsMobile();
  const isMobile = isMobileProp !== undefined ? isMobileProp : hookIsMobile;

  const setMobileSidebarOpen = useAppStore(
    (state) => state.setMobileSidebarOpen
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [mainSearch, setMainSearch] = useState("");

  const tokens = useMemo(() => buildTokens(dark), [dark]);

  const showNewChat = currentView?.view === VIEW.NEW_CHAT;

  // ════════════════════════════════════════════════════════════════════
  // FILTRAGE
  // ════════════════════════════════════════════════════════════════════
  const filteredUsers = useMemo(() => {
    if (!showNewChat) return [];
    let list = utilisateurs.filter((u) => {
      if (u._id === user?._id) return false;
      if (user?.role === "parent" && (u.role === "parent" || u.role === "eleve"))
        return false;
      if (user?.role === "eleve" && (u.role === "eleve" || u.role === "parent"))
        return false;
      if (user?.role === "enseignant" && u.role !== "eleve") return false;
      if (
        user?.role === "enseignant" &&
        u.role === "eleve" &&
        u.classe !== user?.classe
      )
        return false;
      return true;
    });
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter((u) => (u.nom ?? "").toLowerCase().includes(q));
    }
    return list;
  }, [showNewChat, utilisateurs, user, searchTerm]);

  const filteredConversations = useMemo(() => {
    if (!mainSearch.trim()) return conversations;
    const q = mainSearch.toLowerCase();
    return conversations.filter((c) => {
      const name = getUserName(c.userId);
      return (name ?? "").toLowerCase().includes(q);
    });
  }, [conversations, mainSearch, getUserName]);

  const filteredGroups = useMemo(() => {
    if (!mainSearch.trim()) return availableGroups;
    const q = mainSearch.toLowerCase();
    return availableGroups.filter((g) =>
      (g.label ?? "").toLowerCase().includes(q)
    );
  }, [availableGroups, mainSearch]);

  const totalUnread = useMemo(
    () => conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0),
    [conversations]
  );

  // ════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ════════════════════════════════════════════════════════════════════
  const handleToggleNewChat = useCallback(() => {
    if (showNewChat) {
      setSearchTerm("");
      navigateTo(VIEW.LIST);
    } else {
      navigateTo(VIEW.NEW_CHAT);
    }
  }, [showNewChat, navigateTo]);

  const handleOpenUser = useCallback(
    (userId) => {
      setSearchTerm("");
      setMainSearch("");
      navigateTo(VIEW.CHAT, { userId });
    },
    [navigateTo]
  );

  const handleOpenGroup = useCallback(
    (groupId) => {
      setMainSearch("");
      navigateTo(VIEW.GROUP, { groupId });
    },
    [navigateTo]
  );

  const handleOpenBroadcast = useCallback(
    () => navigateTo(VIEW.BROADCAST),
    [navigateTo]
  );

  const handleOpenMenu = useCallback(() => {
    setMobileSidebarOpen(true);
  }, [setMobileSidebarOpen]);

  const canBroadcast = ["admin", "directeur", "disciplinaire"].includes(
    user?.role
  );

  const isSearching = Boolean(mainSearch.trim());
  const groupsEmpty = filteredGroups.length === 0;
  const convsEmpty = filteredConversations.length === 0;
  const nothingFound = isSearching && groupsEmpty && convsEmpty;

  // ════════════════════════════════════════════════════════════════════
  // LAYOUT TOKENS
  // ════════════════════════════════════════════════════════════════════
  const headerPadding = isMobile
    ? "calc(14px + env(safe-area-inset-top, 0px)) 16px 14px"
    : "14px 18px";

  const avatarSize = 46;

  const headerTitle = showNewChat
    ? isMobile
      ? "Nouveau message"
      : "Nouvelle conversation"
    : "Messages";

  // ════════════════════════════════════════════════════════════════════
  // RENDU
  // ════════════════════════════════════════════════════════════════════
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        background: tokens.bg,
        minHeight: 0,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {ConvListKeyframes}

      {/* ═══════════ HEADER ═══════════ */}
      <div
        style={{
          padding: headerPadding,
          borderBottom: `1px solid ${tokens.border}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
          background: tokens.surface,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            minWidth: 0,
            flex: 1,
          }}
        >
          {/* Flèche retour — uniquement en New Chat mobile */}
          {showNewChat && isMobile && (
            <button
              type="button"
              onClick={handleToggleNewChat}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: tokens.text,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 44,
                height: 44,
                padding: 0,
                marginLeft: -8,
                borderRadius: 12,
                flexShrink: 0,
              }}
              aria-label="Retour"
              title="Retour"
            >
              <ArrowLeft size={22} />
            </button>
          )}

          <h2
            style={{
              margin: 0,
              fontSize: isMobile ? 17 : 18,
              fontWeight: 700,
              color: tokens.text,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              display: "flex",
              alignItems: "center",
              gap: 8,
              minWidth: 0,
              flexWrap: "nowrap",
            }}
          >
            {headerTitle}
            {!showNewChat && totalUnread > 0 && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#FFFFFF",
                  background: tokens.danger,
                  borderRadius: 10,
                  padding: "2px 8px",
                  lineHeight: 1.3,
                  flexShrink: 0,
                }}
              >
                {totalUnread > 99 ? "99+" : totalUnread}
              </span>
            )}
          </h2>
        </div>

        {/* Actions header */}
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          {canBroadcast && !showNewChat && (
            <HeaderIconButton
              icon={<Megaphone size={20} />}
              label="Diffusion"
              onClick={handleOpenBroadcast}
              tokens={tokens}
            />
          )}
          {!showNewChat && (
            <HeaderIconButton
              icon={<MessageSquarePlus size={20} />}
              label="Nouvelle conversation"
              onClick={handleToggleNewChat}
              tokens={tokens}
            />
          )}
          {isMobile && !showNewChat && (
            <HeaderIconButton
              icon={<Menu size={20} />}
              label="Ouvrir le menu"
              onClick={handleOpenMenu}
              tokens={tokens}
            />
          )}
        </div>
      </div>

      {/* ═══════════ CONTENU ═══════════ */}
      {showNewChat ? (
        /* ══════════ VUE : NOUVELLE CONVERSATION ══════════ */
        <div style={{ flex: 1, overflowY: "auto", padding: 8, minHeight: 0 }}>
          {/* Recherche */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: tokens.surface,
              border: `1px solid ${tokens.border}`,
              borderRadius: 10,
              padding: isMobile ? "12px 14px" : "9px 12px",
              marginBottom: 8,
              gap: 8,
            }}
          >
            <Search size={16} color={tokens.textMuted} />
            <input
              style={{
                border: "none",
                outline: "none",
                background: "transparent",
                color: tokens.text,
                fontSize: isMobile ? 16 : 14,
                width: "100%",
                padding: 0,
              }}
              placeholder="Rechercher un utilisateur…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Rechercher un utilisateur"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: tokens.textMuted,
                  display: "flex",
                  padding: 4,
                  marginRight: -4,
                }}
                aria-label="Effacer la recherche"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Liste utilisateurs */}
          {filteredUsers.length === 0 ? (
            <MessagingHero
              icon={MessageCircle}
              title={searchTerm ? "Aucun résultat" : "Aucun utilisateur"}
              description={
                searchTerm
                  ? `Aucun utilisateur ne correspond à "${searchTerm}".`
                  : "Aucun utilisateur disponible pour une nouvelle conversation."
              }
              size="md"
              pulse
              tokens={tokens}
              isMobile={isMobile}
            />
          ) : (
            <div
              className="conv-fade-in"
              style={{ display: "flex", flexDirection: "column", gap: 2 }}
            >
              {filteredUsers.map((u) => {
                const fullName = `${u.nom ?? ""} ${u.postnom ?? ""} ${
                  u.prenom ?? ""
                }`
                  .replace(/\s+/g, " ")
                  .trim();
                const subtitle = [u.role, u.classe].filter(Boolean).join(" · ");

                return (
                  <ListItem
                    key={u._id}
                    onClick={() => handleOpenUser(u._id)}
                    avatar={
                      <Avatar name={u.nom} size={avatarSize} tokens={tokens} />
                    }
                    title={fullName || "Sans nom"}
                    subtitle={subtitle}
                    tokens={tokens}
                    isMobile={isMobile}
                    ariaLabel={`Ouvrir une conversation avec ${fullName}`}
                  />
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ══════════ VUE : LISTE CONVERSATIONS ══════════ */
        <>
          {/* Barre de recherche principale */}
          {(conversations.length > 0 || availableGroups.length > 0) && (
            <div
              style={{
                padding: isMobile ? "8px 14px 12px" : "8px 18px 14px",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  background: tokens.surface,
                  border: `1px solid ${tokens.border}`,
                  borderRadius: 10,
                  padding: isMobile ? "12px 14px" : "8px 12px",
                  gap: 8,
                }}
              >
                <Search size={16} color={tokens.textMuted} />
                <input
                  style={{
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    color: tokens.text,
                    fontSize: isMobile ? 16 : 14,
                    width: "100%",
                    padding: 0,
                  }}
                  placeholder="Rechercher une conversation…"
                  value={mainSearch}
                  onChange={(e) => setMainSearch(e.target.value)}
                  aria-label="Rechercher une conversation"
                />
                {mainSearch && (
                  <button
                    type="button"
                    onClick={() => setMainSearch("")}
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      color: tokens.textMuted,
                      display: "flex",
                      padding: 4,
                      marginRight: -4,
                    }}
                    aria-label="Effacer la recherche"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Liste */}
          <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
            {isLoading ? (
              <>
                {[1, 2, 3, 4].map((i) => (
                  <ItemSkeleton key={i} tokens={tokens} />
                ))}
              </>
            ) : nothingFound ? (
              <MessagingHero
                icon={Search}
                title="Aucun résultat"
                description={`Aucune conversation ne correspond à "${mainSearch}".`}
                size="md"
                pulse
                tokens={tokens}
                isMobile={isMobile}
              />
            ) : (
              <>
                {/* ---------- GROUPES ---------- */}
                {!groupsEmpty && (
                  <div className="conv-fade-in">
                    <SectionHeader
                      label="Groupes"
                      tokens={tokens}
                      isMobile={isMobile}
                    />
                    <div style={{ padding: "0 8px" }}>
                      {filteredGroups.map((group) => {
                        const isActive = activeGroupId === group.id;
                        const memberCount = group.memberCount;
                        const subtitle =
                          memberCount != null
                            ? `${memberCount} membre${memberCount > 1 ? "s" : ""}`
                            : "Groupe";

                        return (
                          <ListItem
                            key={group.id}
                            onClick={() => handleOpenGroup(group.id)}
                            isActive={isActive}
                            avatar={
                              <Avatar
                                icon={group.icon}
                                variant="group"
                                size={avatarSize}
                                tokens={tokens}
                              />
                            }
                            title={group.label}
                            subtitle={subtitle}
                            tokens={tokens}
                            isMobile={isMobile}
                            ariaLabel={`Ouvrir le groupe ${group.label}`}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ---------- CONVERSATIONS ---------- */}
                {!convsEmpty && (
                  <div className="conv-fade-in">
                    <SectionHeader
                      label="Conversations"
                      tokens={tokens}
                      isMobile={isMobile}
                    />
                    <div style={{ padding: "0 8px 8px" }}>
                      {filteredConversations.map((conv) => {
                        const isActive = selectedUserId === conv.userId;
                        const name = getUserName(conv.userId);

                        return (
                          <ListItem
                            key={conv.userId}
                            onClick={() => handleOpenUser(conv.userId)}
                            isActive={isActive}
                            avatar={
                              <Avatar
                                name={name}
                                size={avatarSize}
                                tokens={tokens}
                              />
                            }
                            title={name}
                            subtitle={conv.lastMessage || "—"}
                            trailing={{
                              timestamp: conv.lastDate
                                ? formatRelativeTime(conv.lastDate)
                                : null,
                              badge: conv.unreadCount,
                            }}
                            tokens={tokens}
                            isMobile={isMobile}
                            ariaLabel={`Ouvrir la conversation avec ${name}`}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ---------- EMPTY STATE GLOBAL (Hero) ---------- */}
                {convsEmpty && groupsEmpty && !isSearching && (
                  <MessagingHero
                    icon={MessageCircle}
                    title="Aucune conversation"
                    description="Démarrez une nouvelle discussion avec vos contacts."
                    action={{
                      label: isMobile
                        ? "Nouveau message"
                        : "Nouvelle conversation",
                      onClick: handleToggleNewChat,
                      icon: MessageSquarePlus,
                    }}
                    size="lg"
                    pulse
                    tokens={tokens}
                    isMobile={isMobile}
                  />
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}