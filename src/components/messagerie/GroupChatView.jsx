// src/components/messagerie/GroupChatView.jsx
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  ArrowLeft,
  GraduationCap,
  Users,
  Loader,
  ChevronDown,
} from "lucide-react";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { useStyles } from "@/styles/theme";
import { MessagingHero } from "./MessagingHero";

// ════════════════════════════════════════════════════════════════════
// SAFE-AREA helpers
// ════════════════════════════════════════════════════════════════════
const SAFE_TOP = "env(safe-area-inset-top, 0px)";
const SAFE_BOTTOM = "env(safe-area-inset-bottom, 0px)";
const SAFE_RIGHT = "env(safe-area-inset-right, 0px)";

// ════════════════════════════════════════════════════════════════════
// KEYFRAMES module-level
// ════════════════════════════════════════════════════════════════════
const GroupChatKeyframes = (
  <style>{`
    @keyframes gcv-spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
    @keyframes gcv-fade-in {
      from { opacity: 0; transform: translateY(4px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .gcv-spin { animation: gcv-spin 0.9s linear infinite; }
    .gcv-fade-in { animation: gcv-fade-in 0.25s ease-out; }

    /* ✨ Scrollbar fine */
    .gcv-messages::-webkit-scrollbar { width: 6px; height: 6px; }
    .gcv-messages::-webkit-scrollbar-thumb {
      background: rgba(100,116,139,0.3);
      border-radius: 3px;
    }

    @media (prefers-reduced-motion: reduce) {
      .gcv-spin, .gcv-fade-in { animation: none !important; }
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
    ghostActive: dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
    skeleton: dark ? "#334155" : "#E2E8F0",
    danger: dark ? "#F87171" : "#EF4444",
    success: dark ? "#34D399" : "#10B981",
    groupBg: dark ? "#4C1D95" : "#EDE9FE",
    groupFg: dark ? "#C4B5FD" : "#6D28D9",
    shadowScrollBtn: dark
      ? "0 4px 12px rgba(0,0,0,0.5)"
      : "0 4px 12px rgba(0,0,0,0.12)",
    messagesBgTransparent: dark
      ? "linear-gradient(to bottom, #0B1220 0%, rgba(11,18,32,0.85) 60%, transparent 100%)"
      : "linear-gradient(to bottom, #F1F5F9 0%, rgba(241,245,249,0.85) 60%, transparent 100%)",
  };
}

// ════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════
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

function GroupAvatar({ icon, size = 42, tokens }) {
  const isGraduation = icon === "GraduationCap";
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: tokens.groupBg,
        color: tokens.groupFg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
      aria-hidden="true"
    >
      {isGraduation ? (
        <GraduationCap size={size * 0.5} />
      ) : (
        <Users size={size * 0.5} />
      )}
    </div>
  );
}

/**
 * ✨ Séparateur de date — sticky en haut du scroll
 */
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
        className="gcv-spin"
        style={{ color: tokens.primary }}
      />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ════════════════════════════════════════════════════════════════════
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
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [backPressed, setBackPressed] = useState(false);
  const [scrollBtnPressed, setScrollBtnPressed] = useState(false);

  const scrollRef = useRef(null);

  const tokens = useMemo(() => buildTokens(dark), [dark]);

  const group = useMemo(
    () => (availableGroups || []).find((g) => g.id === groupId),
    [availableGroups, groupId]
  );

  // ════════════════════════════════════════════════════════════════════
  // HANDLERS — ✨ useCallback
  // ════════════════════════════════════════════════════════════════════
  const handleSend = useCallback(() => {
    const trimmed = newGroupMessage.trim();
    if (!trimmed) return;
    onSendMessage(trimmed);
    setNewGroupMessage("");
  }, [newGroupMessage, onSendMessage]);

  const handleScroll = useCallback((e) => {
    const el = e.currentTarget;
    const isNearBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    setShowScrollBtn((prev) =>
      prev === !isNearBottom ? prev : !isNearBottom
    );
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messagesEndRef]);

  // ✨ Auto-scroll initial quand les messages arrivent pour la 1ère fois
  const hasScrolledInitialRef = useRef(false);
  useEffect(() => {
    if (
      !hasScrolledInitialRef.current &&
      groupMessages &&
      groupMessages.length > 0
    ) {
      hasScrolledInitialRef.current = true;
      // Léger délai pour laisser le DOM se peindre
      const t = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ block: "end" });
      }, 50);
      return () => clearTimeout(t);
    }
  }, [groupMessages]);

  // ════════════════════════════════════════════════════════════════════
  // LAYOUT
  // ════════════════════════════════════════════════════════════════════
  const headerPadding = isMobile
    ? `calc(10px + ${SAFE_TOP}) 12px 10px`
    : "12px 16px";

  const avatarSize = isMobile ? 40 : 42;

  // ✨ Sous-titre : compteur de membres si dispo, sinon "Groupe"
  const groupSubtitle = useMemo(() => {
    if (!group) return "Groupe introuvable";
    const mc = group.memberCount;
    if (mc != null) {
      return `${mc} membre${mc > 1 ? "s" : ""}`;
    }
    return "Groupe";
  }, [group]);

  // ════════════════════════════════════════════════════════════════════
  // CONSTRUCTION DE LA LISTE (mémoïsée)
  // ════════════════════════════════════════════════════════════════════
  const messagesWithSeparators = useMemo(() => {
    const result = [];
    let lastDate = null;

    (groupMessages || []).forEach((msg, idx, arr) => {
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
  }, [groupMessages]);

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
      {GroupChatKeyframes}

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

        <GroupAvatar
          icon={group?.icon}
          size={avatarSize}
          tokens={tokens}
        />

        <div style={{ flex: 1, minWidth: 0, marginLeft: 4 }}>
          <div
            style={{
              fontWeight: 600,
              fontSize: isMobile ? 15 : 15.5,
              color: tokens.text,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              lineHeight: 1.2,
            }}
          >
            {group ? group.label : "Groupe introuvable"}
          </div>
          <div
            style={{
              fontSize: isMobile ? 11.5 : 12,
              color: tokens.textMuted,
              marginTop: 2,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {groupSubtitle}
          </div>
        </div>
      </div>

      {/* ═══════════════════════ ZONE MESSAGES ═══════════════════════ */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="gcv-messages"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          padding: isMobile ? "4px 12px 8px" : "8px 16px 12px",
          background: tokens.messagesBg,
          position: "relative",
          // ✨ Mobile : empêche le pull-to-refresh + momentum iOS
          overscrollBehavior: "contain",
          WebkitOverflowScrolling: "touch",
          scrollPaddingTop: 8,
        }}
      >
        {groupMessages === undefined ? (
          <MessagesLoading tokens={tokens} />
        ) : groupMessages.length === 0 ? (
          <MessagingHero
            avatarIcon={group?.icon}
            avatarVariant="group"
            title="Aucun message"
            description="Soyez le premier à écrire dans ce groupe."
            size="lg"
            pulse
            tokens={tokens}
            isMobile={isMobile}
          />
        ) : (
          <div className="gcv-fade-in">
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
                  getUserName={getUserName}
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
          message={newGroupMessage}
          setMessage={setNewGroupMessage}
          onSend={handleSend}
          placeholder="Message au groupe…"
          isMobile={isMobile}
        />
      </div>
    </div>
  );
}