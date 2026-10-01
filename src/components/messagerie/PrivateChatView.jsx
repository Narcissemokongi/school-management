// src/components/messagerie/PrivateChatView.jsx
import { useRef, useState, useMemo, useCallback, useEffect } from "react";
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
    @keyframes mb-fade-in {
      from { opacity: 0; transform: translateY(4px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .pcv-spin { animation: pcv-spin 0.9s linear infinite; }
    .pcv-fade-in { animation: pcv-fade-in 0.25s ease-out; }
    .mb-fade-in { animation: mb-fade-in 0.2s ease-out; }

    .pcv-messages::-webkit-scrollbar { width: 6px; height: 6px; }
    .pcv-messages::-webkit-scrollbar-thumb {
      background: rgba(100,116,139,0.3);
      border-radius: 3px;
    }

    @media (prefers-reduced-motion: reduce) {
      .pcv-spin, .pcv-fade-in, .mb-fade-in { animation: none !important; }
    }
  `}</style>
);

// ════════════════════════════════════════════════════════════════════
// SAFE-AREA
// ════════════════════════════════════════════════════════════════════
const SAFE_TOP = "env(safe-area-inset-top, 0px)";
const SAFE_BOTTOM = "env(safe-area-inset-bottom, 0px)";
const SAFE_RIGHT = "env(safe-area-inset-right, 0px)";

// ════════════════════════════════════════════════════════════════════
// ✨ Détection prefers-reduced-motion (une seule fois)
// ════════════════════════════════════════════════════════════════════
function getPrefersReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

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
    ghostActive: dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
    skeleton: dark ? "#334155" : "#E2E8F0",
    danger: dark ? "#F87171" : "#EF4444",
    success: dark ? "#34D399" : "#10B981",
    groupBg: dark ? "#4C1D95" : "#EDE9FE",
    groupFg: dark ? "#C4B5FD" : "#6D28D9",
    shadowScrollBtn: dark
      ? "0 4px 12px rgba(0,0,0,0.5)"
      : "0 4px 12px rgba(0,0,0,0.12)",
    separatorBg: dark ? "rgba(15,23,42,0.92)" : "rgba(248,250,252,0.92)",
    messagesBgTransparent: dark
      ? "linear-gradient(to bottom, #0B1220 0%, rgba(11,18,32,0.85) 60%, transparent 100%)"
      : "linear-gradient(to bottom, #F1F5F9 0%, rgba(241,245,249,0.85) 60%, transparent 100%)",
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
  const [pressed, setPressed] = useState(false);

  const size = isMobile ? 44 : 36;

  const bg = disabled
    ? "transparent"
    : variant === "primary"
    ? pressed
      ? tokens.primaryHover
      : tokens.primary
    : pressed
    ? tokens.ghostActive
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
      onMouseEnter={() => !isMobile && setHovered(true)}
      onMouseLeave={() => !isMobile && setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      onTouchCancel={() => setPressed(false)}
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
        transition: "background 0.12s ease, transform 0.1s ease",
        transform: pressed ? "scale(0.94)" : "scale(1)",
        outline: focused ? `2px solid ${tokens.primary}` : "none",
        outlineOffset: 2,
        flexShrink: 0,
        opacity: disabled ? 0.5 : 1,
        padding: 0,
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation",
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

function DateSeparator({ label, tokens, isMobile }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        position: "sticky",
        top: 0,
        zIndex: 5,
        padding: isMobile ? "8px 0" : "10px 0",
        pointerEvents: "none",
        background: tokens.messagesBgTransparent,
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
          boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
          pointerEvents: "auto",
        }}
      >
        {label}
      </span>
    </div>
  );
}

// ✨ aria-hidden ajouté
function MessagesLoading({ tokens }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        padding: 40,
      }}
      aria-hidden="true"
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
  const [backPressed, setBackPressed] = useState(false);
  const [scrollBtnPressed, setScrollBtnPressed] = useState(false);

  const scrollRef = useRef(null);

  const tokens = useMemo(() => buildTokens(dark), [dark]);

  // ✨ Détection reduced-motion (une seule fois au mount)
  const prefersReducedMotion = useMemo(
    () => getPrefersReducedMotion(),
    []
  );

  const canCallAudio = Boolean(handleCallUser) && Boolean(selectedUserId);
  const canCallVideo = Boolean(onVideoCall) && Boolean(selectedUserId);

  // ════════════════════════════════════════════════════════════════════
  // ✨ NOUVEAU — SCROLL INITIAL (une seule fois au premier chargement)
  // Résout le bug : ouverture d'une conversation → atterrit en haut
  // ════════════════════════════════════════════════════════════════════
  const hasScrolledInitialRef = useRef(false);

  useEffect(() => {
    if (hasScrolledInitialRef.current) return;
    if (!messagesConversation || messagesConversation.length === 0) return;

    hasScrolledInitialRef.current = true;

    // Double requestAnimationFrame pour garantir que le DOM est peint
    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({
          behavior: "auto", // ✨ instantané au premier scroll
          block: "end",
        });
      });
      return () => cancelAnimationFrame(raf2);
    });

    return () => cancelAnimationFrame(raf1);
  }, [messagesConversation, messagesEndRef]);

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
  // LAYOUT
  // ════════════════════════════════════════════════════════════════════
  const headerPadding = isMobile
    ? `calc(10px + ${SAFE_TOP}) 12px 10px`
    : "12px 16px";

  const avatarSize = isMobile ? 40 : 42;

  // ════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ════════════════════════════════════════════════════════════════════
  const handleScroll = useCallback((e) => {
    const el = e.currentTarget;
    const isNearBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    setShowScrollBtn((prev) =>
      prev === !isNearBottom ? prev : !isNearBottom
    );
  }, []);

  // ✨ prefers-reduced-motion respecté
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "end",
    });
  }, [messagesEndRef, prefersReducedMotion]);

  // ════════════════════════════════════════════════════════════════════
  // CONSTRUCTION LISTE
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
          zIndex: 20,
          position: "relative",
        }}
      >
        {isMobile && (
          <button
            type="button"
            onClick={goBack}
            onTouchStart={() => setBackPressed(true)}
            onTouchEnd={() => setBackPressed(false)}
            onTouchCancel={() => setBackPressed(false)}
            style={{
              background: backPressed ? tokens.ghostActive : "none",
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
              transition: "background 0.12s ease, transform 0.1s ease",
              transform: backPressed ? "scale(0.92)" : "scale(1)",
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
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
        className="pcv-messages"
        // ✨ role="log" : zone de log pour lecteurs d'écran
        // aria-live="polite" : annonce les nouveaux messages sans interrompre
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          padding: isMobile ? "4px 12px 8px" : "8px 16px 12px",
          background: tokens.messagesBg,
          position: "relative",
          overscrollBehavior: "contain",
          WebkitOverflowScrolling: "touch",
          scrollPaddingTop: 8,
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
                    isMobile={isMobile}
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
          onTouchStart={() => setScrollBtnPressed(true)}
          onTouchEnd={() => setScrollBtnPressed(false)}
          onTouchCancel={() => setScrollBtnPressed(false)}
          style={{
            position: "absolute",
            bottom: isMobile
              ? `calc(88px + ${SAFE_BOTTOM})`
              : 72,
            right: isMobile
              ? `calc(16px + ${SAFE_RIGHT})`
              : 16,
            width: isMobile ? 48 : 44,
            height: isMobile ? 48 : 44,
            borderRadius: isMobile ? 24 : 22,
            background: tokens.surface,
            border: `1px solid ${tokens.border}`,
            boxShadow: tokens.shadowScrollBtn,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: tokens.primary,
            zIndex: 15,
            padding: 0,
            transition:
              "transform 0.1s ease, background 0.12s ease, opacity 0.15s ease",
            transform: scrollBtnPressed ? "scale(0.9)" : "scale(1)",
            WebkitTapHighlightColor: "transparent",
            touchAction: "manipulation",
          }}
          title="Descendre"
          aria-label="Descendre en bas de la conversation"
        >
          <ChevronDown size={isMobile ? 22 : 20} />
        </button>
      )}

      {/* ═══════════════════════ INPUT ═══════════════════════ */}
      <div
        style={{
          flexShrink: 0,
          paddingBottom: SAFE_BOTTOM,
          zIndex: 20,
          position: "relative",
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