// src/components/messagerie/MessageBubble.jsx
import { useMemo, useState } from "react";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useStyles } from "@/styles/theme";
import { Check, CheckCheck } from "lucide-react";
import { AttachmentPreview } from "./AttachmentPreview";

// ════════════════════════════════════════════════════════════════════
// SAFE-AREA
// ════════════════════════════════════════════════════════════════════
const SAFE_RIGHT = "env(safe-area-inset-right, 0px)";
const SAFE_LEFT = "env(safe-area-inset-left, 0px)";

// ════════════════════════════════════════════════════════════════════
// TOKENS
// ════════════════════════════════════════════════════════════════════
function buildTokens(dark) {
  return {
    sentBg: dark ? "#6366F1" : "#4F46E5",
    sentText: "#FFFFFF",
    sentTimeColor: "rgba(255,255,255,0.75)",
    receivedBg: dark ? "#1E293B" : "#FFFFFF",
    receivedText: dark ? "#F1F5F9" : "#1E293B",
    receivedBorder: dark ? "#334155" : "#E2E8F0",
    receivedTimeColor: dark ? "#94A3B8" : "#64748B",
    senderColor: dark ? "#A5B4FC" : "#4F46E5",
    senderBg: dark ? "#312E81" : "#EEF2FF",
    attachmentMineColor: "#FFFFFF",
    attachmentOtherColor: dark ? "#A5B4FC" : "#4F46E5",
    attachmentMineActiveBg: "rgba(255,255,255,0.28)",
    attachmentMineBg: "rgba(255,255,255,0.15)",
    attachmentOtherActiveBg: dark ? "#4338CA" : "#C7D2FE",
    brokenBg: dark ? "rgba(239,68,68,0.15)" : "rgba(239,68,68,0.08)",
    brokenColor: dark ? "#FCA5A5" : "#DC2626",
    shadow: dark
      ? "0 1px 2px rgba(0,0,0,0.3)"
      : "0 1px 3px rgba(0,0,0,0.08)",
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

function getBubbleRadius(isMine, isFirst, isLast) {
  if (isFirst && isLast) return "16px";
  if (isMine) {
    if (isFirst) return "16px 16px 4px 16px";
    if (isLast) return "16px 4px 16px 16px";
    return "16px 4px 4px 16px";
  } else {
    if (isFirst) return "16px 16px 16px 4px";
    if (isLast) return "4px 16px 16px 16px";
    return "4px 16px 16px 4px";
  }
}

// ════════════════════════════════════════════════════════════════════
// SOUS-COMPOSANTS
// ════════════════════════════════════════════════════════════════════
function SenderAvatar({ name, size = 28 }) {
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
        fontSize: size * 0.42,
        flexShrink: 0,
        letterSpacing: "-0.02em",
        alignSelf: "flex-end",
        marginBottom: 2,
      }}
      aria-hidden="true"
    >
      {getInitials(name)}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ════════════════════════════════════════════════════════════════════
export function MessageBubble({
  msg,
  user,
  getUserName,
  isFirstInGroup = true,
  isLastInGroup = true,
}) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();

  const tokens = useMemo(() => buildTokens(dark), [dark]);

  const isMine = msg.expediteurId === user?._id;
  const isRead = msg.lu ?? msg.read ?? false;

  const isGroupChat = Boolean(getUserName);

  const senderName = useMemo(() => {
    if (isMine || !getUserName) return null;
    return getUserName(msg.expediteurId);
  }, [isMine, getUserName, msg.expediteurId]);

  const { timeString, fullDateString } = useMemo(() => {
    const d = new Date(msg.date);
    if (isNaN(d.getTime())) {
      return { timeString: "", fullDateString: "" };
    }
    return {
      timeString: d.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      fullDateString: d.toLocaleString("fr-FR", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  }, [msg.date]);

  const borderRadius = getBubbleRadius(
    isMine,
    isFirstInGroup,
    isLastInGroup
  );

  const marginBottom = isLastInGroup ? 12 : 2;
  const paddingTop = isFirstInGroup ? 8 : 4;
  const paddingBottom = isLastInGroup ? 6 : 4;

  const maxWidth = isMobile ? "85%" : "68%";
  const contentFontSize = isMobile ? 14.5 : 14;
  const senderFontSize = 12;
  const timeFontSize = 10.5;

  const showSenderName = senderName && isFirstInGroup;

  const showSenderAvatar =
    !isMine && isGroupChat && senderName && isLastInGroup;

  const showAvatarPlaceholder = !isMine && isGroupChat && !showSenderAvatar;

  const avatarSize = isMobile ? 26 : 28;

  const hasAttachments = msg.piecesJointes?.length > 0;
  const hasText = Boolean(msg.contenu);

  // ✨ Cas spécial : message avec UNIQUEMENT une image → pas de padding
  const isImageOnly =
    hasAttachments &&
    !hasText &&
    msg.piecesJointes.length === 1 &&
    isImageAttachment(msg.piecesJointes[0]);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: isMine ? "flex-end" : "flex-start",
        alignItems: "flex-end",
        gap: 8,
        marginBottom,
        paddingRight: isMine && isMobile ? SAFE_RIGHT : 0,
        paddingLeft: !isMine && isMobile ? SAFE_LEFT : 0,
      }}
    >
      {showSenderAvatar ? (
        <SenderAvatar name={senderName} size={avatarSize} />
      ) : showAvatarPlaceholder ? (
        <div
          style={{ width: avatarSize, flexShrink: 0 }}
          aria-hidden="true"
        />
      ) : null}

      <div
        style={{
          maxWidth,
          padding: isImageOnly
            ? "4px"
            : `${paddingTop}px 12px ${paddingBottom}px 12px`,
          borderRadius,
          background: isMine ? tokens.sentBg : tokens.receivedBg,
          color: isMine ? tokens.sentText : tokens.receivedText,
          boxShadow: tokens.shadow,
          border: isMine
            ? "none"
            : `1px solid ${tokens.receivedBorder}`,
          position: "relative",
          wordBreak: "break-word",
          overflowWrap: "anywhere",
          minWidth: 60,
        }}
      >
        {showSenderName && !isImageOnly && (
          <div
            style={{
              fontSize: senderFontSize,
              fontWeight: 700,
              marginBottom: 3,
              color: tokens.senderColor,
              lineHeight: 1.2,
            }}
          >
            {senderName}
          </div>
        )}

        {msg.contenu && (
          <div
            style={{
              fontSize: contentFontSize,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              overflowWrap: "anywhere",
              lineHeight: 1.4,
            }}
          >
            {msg.contenu}
          </div>
        )}

        {hasAttachments && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              marginTop: hasText ? 0 : isImageOnly ? 0 : 4,
              marginBottom: isMobile ? -3 : 0,
            }}
          >
            {msg.piecesJointes.map((pj, idx) => (
              <AttachmentPreview
                key={pj.storageId || pj.url || `${pj.nom}-${idx}`}
                attachment={pj}
                isMine={isMine}
                tokens={tokens}
                isMobile={isMobile}
              />
            ))}
          </div>
        )}

        {isLastInGroup && (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              gap: 4,
              marginTop: 2,
              fontSize: timeFontSize,
              color: isMine
                ? tokens.sentTimeColor
                : tokens.receivedTimeColor,
              // ✨ Si c'est une image seule, badge flottant
              ...(isImageOnly && {
                position: "absolute",
                bottom: 8,
                right: 8,
                background: "rgba(0,0,0,0.5)",
                backdropFilter: "blur(4px)",
                WebkitBackdropFilter: "blur(4px)",
                padding: "3px 8px",
                borderRadius: 10,
                color: "#FFFFFF",
                marginTop: 0,
              }),
            }}
          >
            <span title={fullDateString}>{timeString}</span>
            {isMine &&
              (isRead ? (
                <CheckCheck
                  size={14}
                  aria-label="Lu"
                  style={{ flexShrink: 0 }}
                />
              ) : (
                <Check
                  size={14}
                  aria-label="Envoyé"
                  style={{ flexShrink: 0 }}
                />
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// HELPER — détecter image (dupliqué depuis AttachmentPreview pour éviter
// un import circulaire ; purement local)
// ════════════════════════════════════════════════════════════════════
function isImageAttachment(pj) {
  if (!pj) return false;
  const t = (pj.type || "").toLowerCase();
  const n = (pj.nom || "").toLowerCase();
  return (
    t.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg|bmp)$/.test(n)
  );
}