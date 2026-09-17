// src/components/messagerie/PrivateChatView.jsx
import { useRef, useState, useMemo } from "react";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useStyles } from "@/styles/theme";
import {
  ArrowLeft,
  Phone,
  Video,
  Loader,
  ChevronDown,
} from "lucide-react";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { MessagingHero } from "./MessagingHero";

// ════════════════════════════════════════════════════════════════════
// KEYFRAMES module-level
// ════════════════════════════════════════════════════════════════════
const PrivateChatKeyframes = (
  <style>{`
    @keyframes pcv-spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
    @keyframes pcv-fade-in {
      from { opacity: 0; transform: translateY(4px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    /* ✅ FIX — mb-fade-in pour les bulles MessageBubble */
    @keyframes mb-fade-in {
      from { opacity: 0; transform: translateY(4px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .pcv-spin { animation: pcv-spin 0.9s linear infinite; }
    .pcv-fade-in { animation: pcv-fade-in 0.25s ease-out; }
    .mb-fade-in { animation: mb-fade-in 0.2s ease-out; }
    @media (prefers-reduced-motion: reduce) {
      .pcv-spin, .pcv-fade-in, .mb-fade-in { animation: none !important; }
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
    messagesBg: dark ? "#0B1220" : "#F1F5F9",
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

function isSameDay(d1, d2) {
  const a = new Date(d1);
  const b = new Date(d2);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDateLabel(dateStr) {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (isSameDay(date, today)) return "Aujourd'hui";
  if (isSameDay(date, yesterday)) return "Hier";
  if (date.getFullYear() === today.getFullYear()) {
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
    });
  }
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const GROUP_THRESHOLD_MS = 5 * 60 * 1000;

// ════════════════════════════════════════════════════════════════════
// SOUS-COMPOSANTS
// ════════════════════════════════════════════════════════════════════

function HeaderIconButton({
  icon,
  label,
  onClick,
  tokens,
  disabled = false,
  variant = "ghost",
}) {
  const isMobile = useIsMobile();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  const size = isMobile ? 44 : 36;

  const bg = disabled
    ? "transparent"
    : variant === "primary"
    ? hovered
      ? tokens.primaryHover
      : tokens.primary
    : hovered
    ? tokens.ghostHover
    : "transparent";

  const color = disabled
    ? tokens.textMuted
    : variant === "primary"
    ? "#FFFFFF"
    : tokens.textMuted;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        background: bg,
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        color,
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
        opacity: disabled ? 0.5 : 1,
        padding: 0,
      }}
      title={label}
      aria-label={label}
    >
      {icon}
    </button>
  );
}

function HeaderAvatar({ name, size = 42 }) {
  const bg = getAvatarColor(name);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: bg,
        color: "#FFFFFF",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: size * 0.4,
        flexShrink: 0,
        letterSpacing: "-0.02em",
      }}
      aria-hidden="true"
    >
      {getInitials(name)}
    </div>
  );
}

function DateSeparator({ label, tokens }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        margin: "16px 0 14px",
      }}
    >
      <span
        style={{
          background: tokens.surface,
          color: tokens.textMuted,
          padding: "4px 12px",
          borderRadius: 12,
          fontSize: 11,
          fontWeight: 600,
          border: `1px solid ${tokens.border}`,
        }}
      >
        {label}
      </span>
    </div>
  );
}

function MessagesLoading({ tokens }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        padding: 40,
      }}
    >
      <Loader
        size={28}
        className="pcv-spin"
        style={{ color: tokens.primary }}
      />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ════════════════════════════════════════════════════════════════════
export function PrivateChatView({
  selectedUser,
  selectedUserObject,
  messagesConversation,
  user,
  nouveauMessage,
  setNouveauMessage,
  piecesJointes,
  setPiecesJointes,
  handleSend,
  handleFileChange,
  fileInputRef,
  isMobile,
  goBack,
  handleCallUser,
  selectedUserId,
  messagesEndRef,
  onVideoCall,
  isUploading = false,
}) {
  const { dark } = useStyles();
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const scrollRef = useRef(null);

  const tokens = useMemo(() => buildTokens(dark), [dark]);

  const canCallAudio = Boolean(handleCallUser) && Boolean(selectedUserId);
  const canCallVideo = Boolean(onVideoCall) && Boolean(selectedUserId);

  // ════════════════════════════════════════════════════════════════════
  // SUBTITLE
  // ════════════════════════════════════════════════════════════════════
  const subtitle = useMemo(() => {
    if (!selectedUserObject) return "";
    const parts = [];
    if (selectedUserObject.role) parts.push(selectedUserObject.role);
    if (selectedUserObject.classe) parts.push(selectedUserObject.classe);
    return parts.join(" · ");
  }, [selectedUserObject]);

  // ════════════════════════════════════════════════════════════════════
  // LAYOUT TOKENS
  // ════════════════════════════════════════════════════════════════════
  const headerPadding = isMobile
    ? "calc(10px + env(safe-area-inset-top, 0px)) 12px 10px"
    : "12px 16px";

  const avatarSize = isMobile ? 40 : 42;

  // ════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ════════════════════════════════════════════════════════════════════
  const handleScroll = (e) => {
    const el = e.currentTarget;
    const isNearBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    setShowScrollBtn(!isNearBottom);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // ════════════════════════════════════════════════════════════════════
  // CONSTRUCTION DE LA LISTE (mémoïsée)
  // ════════════════════════════════════════════════════════════════════
  const messagesWithSeparators = useMemo(() => {
    const result = [];
    let lastDate = null;

    (messagesConversation || []).forEach((msg, idx, arr) => {
      const isNewDay = !lastDate || !isSameDay(lastDate, msg.date);
      if (isNewDay) {
        result.push({
          type: "separator",
          label: formatDateLabel(msg.date),
          key: `sep-${msg._id}`,
        });
        lastDate = msg.date;
      }

      const prevMsg = idx > 0 ? arr[idx - 1] : null;
      const nextMsg = idx < arr.length - 1 ? arr[idx + 1] : null;

      const isFirstInGroup =
        !prevMsg ||
        prevMsg.expediteurId !== msg.expediteurId ||
        isNewDay ||
        new Date(msg.date) - new Date(prevMsg.date) > GROUP_THRESHOLD_MS;

      const isLastInGroup =
        !nextMsg ||
        nextMsg.expediteurId !== msg.expediteurId ||
        !isSameDay(msg.date, nextMsg.date) ||
        new Date(nextMsg.date) - new Date(msg.date) > GROUP_THRESHOLD_MS;

      result.push({
        type: "message",
        msg,
        key: msg._id,
        isFirstInGroup,
        isLastInGroup,
      });
    });

    return result;
  }, [messagesConversation]);

  // ════════════════════════════════════════════════════════════════════
  // RENDU
  // ════════════════════════════════════════════════════════════════════
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
        flex: 1,
        overflow: "hidden",
        position: "relative",
        background: tokens.messagesBg,
      }}
    >
      {PrivateChatKeyframes}

      {/* ═══════════════════════ HEADER ═══════════════════════ */}
      <div
        style={{
          padding: headerPadding,
          borderBottom: `1px solid ${tokens.border}`,
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: tokens.surface,
          flexShrink: 0,
        }}
      >
        {isMobile && (
          <button
            type="button"
            onClick={goBack}
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

        <HeaderAvatar name={selectedUser} size={avatarSize} />

        <div style={{ flex: 1, minWidth: 0, marginLeft: 4 }}>
          <div
            style={{
              fontWeight: 600,
              fontSize: isMobile ? 15 : 15.5,
              color: tokens.text,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              lineHeight: 1.2,
            }}
          >
            {selectedUser || "Utilisateur inconnu"}
          </div>
          {subtitle && (
            <div
              style={{
                fontSize: isMobile ? 11.5 : 12,
                color: tokens.textMuted,
                textTransform: "capitalize",
                marginTop: 2,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {subtitle}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
          <HeaderIconButton
            icon={<Phone size={isMobile ? 20 : 19} />}
            label="Appel audio"
            onClick={() => canCallAudio && handleCallUser(selectedUserId)}
            tokens={tokens}
            disabled={!canCallAudio}
          />
          <HeaderIconButton
            icon={<Video size={isMobile ? 20 : 19} />}
            label="Appel vidéo"
            onClick={() => canCallVideo && onVideoCall?.()}
            tokens={tokens}
            disabled={!canCallVideo}
          />
        </div>
      </div>

      {/* ═══════════════════════ ZONE MESSAGES ═══════════════════════ */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          padding: isMobile ? "12px 12px 4px" : "16px 16px 8px",
          background: tokens.messagesBg,
          position: "relative",
        }}
      >
        {messagesConversation === undefined ? (
          <MessagesLoading tokens={tokens} />
        ) : messagesConversation.length === 0 ? (
          <MessagingHero
            avatarName={selectedUser || "Utilisateur"}
            title="Commencez la conversation"
            description={`Envoyez votre premier message à ${
              selectedUser || "cet utilisateur"
            }.`}
            size="lg"
            pulse
            tokens={tokens}
            isMobile={isMobile}
          />
        ) : (
          <div className="pcv-fade-in">
            {messagesWithSeparators.map((item) => {
              if (item.type === "separator") {
                return (
                  <DateSeparator
                    key={item.key}
                    label={item.label}
                    tokens={tokens}
                  />
                );
              }
              return (
                <MessageBubble
                  key={item.key}
                  msg={item.msg}
                  user={user}
                  isFirstInGroup={item.isFirstInGroup}
                  isLastInGroup={item.isLastInGroup}
                />
              );
            })}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ═══════════════════════ SCROLL BUTTON ═══════════════════════ */}
      {showScrollBtn && (
        <button
          type="button"
          onClick={scrollToBottom}
          style={{
            position: "absolute",
            bottom: isMobile ? 76 : 72,
            right: 16,
            width: 44,
            height: 44,
            borderRadius: 22,
            background: tokens.surface,
            border: `1px solid ${tokens.border}`,
            boxShadow: dark
              ? "0 4px 12px rgba(0,0,0,0.4)"
              : "0 4px 12px rgba(0,0,0,0.1)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: tokens.primary,
            zIndex: 10,
            padding: 0,
          }}
          title="Descendre"
          aria-label="Descendre en bas de la conversation"
        >
          <ChevronDown size={20} />
        </button>
      )}

      {/* ═══════════════════════ INPUT ═══════════════════════ */}
      <div
        style={{
          flexShrink: 0,
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <ChatInput
          message={nouveauMessage}
          setMessage={setNouveauMessage}
          onSend={handleSend}
          fileInputRef={fileInputRef}
          piecesJointes={piecesJointes}
          setPiecesJointes={setPiecesJointes}
          handleFileChange={handleFileChange}
          isMobile={isMobile}
          isUploading={isUploading}
        />
      </div>
    </div>
  );
}