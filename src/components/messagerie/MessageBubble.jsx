// src/components/messagerie/MessageBubble.jsx
import { useMemo, useState } from "react";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useStyles } from "@/styles/theme";
import { Check, CheckCheck, Paperclip } from "lucide-react";

// ════════════════════════════════════════════════════════════════════
// TOKENS
// ════════════════════════════════════════════════════════════════════
function buildTokens(dark) {
  return {
    // Messages envoyés
    sentBg: dark ? "#6366F1" : "#4F46E5",
    sentText: "#FFFFFF",
    sentTimeColor: "rgba(255,255,255,0.75)",

    // Messages reçus
    receivedBg: dark ? "#1E293B" : "#FFFFFF",
    receivedText: dark ? "#F1F5F9" : "#1E293B",
    receivedBorder: dark ? "#334155" : "#E2E8F0",
    receivedTimeColor: dark ? "#94A3B8" : "#64748B",

    // Nom de l'expéditeur (groupes)
    senderColor: dark ? "#A5B4FC" : "#4F46E5",
    senderBg: dark ? "#312E81" : "#EEF2FF",

    // Pièces jointes
    attachmentMineColor: "#FFFFFF",
    attachmentOtherColor: dark ? "#A5B4FC" : "#4F46E5",

    // Ombres
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

// ✅ Rayons selon position dans le groupe
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

function AttachmentLink({ attachment, isMine, tokens, fontSize }) {
  const [hovered, setHovered] = useState(false);

  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        marginTop: 6,
        marginRight: 6,
        padding: "4px 8px",
        borderRadius: 8,
        color: isMine
          ? tokens.attachmentMineColor
          : tokens.attachmentOtherColor,
        background: isMine ? "rgba(255,255,255,0.15)" : tokens.senderBg,
        textDecoration: "none",
        fontSize,
        fontWeight: 500,
        transition: "background 0.15s ease",
        maxWidth: "100%",
        opacity: hovered ? 0.9 : 1,
      }}
      title={`Télécharger ${attachment.nom}`}
    >
      <Paperclip size={13} style={{ flexShrink: 0 }} />
      <span
        style={{
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {attachment.nom}
      </span>
    </a>
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

  // ✅ Détection mode groupe (getUserName fourni)
  const isGroupChat = Boolean(getUserName);

  // ✅ Nom de l'expéditeur (uniquement en mode groupe)
  const senderName = useMemo(() => {
    if (isMine || !getUserName) return null;
    return getUserName(msg.expediteurId);
  }, [isMine, getUserName, msg.expediteurId]);

  // ✅ Timestamps
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

  // ✅ Espacement vertical
  const marginBottom = isLastInGroup ? 12 : 2;
  const paddingTop = isFirstInGroup ? 8 : 4;
  const paddingBottom = isLastInGroup ? 6 : 4;

  // ✅ Dimensions responsive
  const maxWidth = isMobile ? "82%" : "68%";
  const contentFontSize = isMobile ? 14.5 : 14;
  const senderFontSize = 12;
  const timeFontSize = 10.5;
  const attachmentFontSize = 12.5;

  // ✅ Affichage du nom : uniquement en mode groupe, en début de groupe
  const showSenderName = senderName && isFirstInGroup;

  // ✅ FIX #1 — Avatar uniquement en mode groupe + reçu + dernier du groupe
  const showSenderAvatar =
    !isMine && isGroupChat && senderName && isLastInGroup;

  // ✅ FIX #1 — Placeholder uniquement en mode groupe + reçu
  const showAvatarPlaceholder = !isMine && isGroupChat && !showSenderAvatar;

  const avatarSize = isMobile ? 26 : 28;

  return (
    <div
      style={{
        display: "flex",
        justifyContent: isMine ? "flex-end" : "flex-start",
        alignItems: "flex-end",
        gap: 8,
        marginBottom,
      }}
    >
      {/* ✅ FIX #1 — Avatar/placeholder uniquement en mode groupe */}
      {showSenderAvatar ? (
        <SenderAvatar name={senderName} size={avatarSize} />
      ) : showAvatarPlaceholder ? (
        <div
          style={{ width: avatarSize, flexShrink: 0 }}
          aria-hidden="true"
        />
      ) : null}

      {/* Bulle */}
      <div
        style={{
          maxWidth,
          padding: `${paddingTop}px 12px ${paddingBottom}px 12px`,
          borderRadius,
          background: isMine ? tokens.sentBg : tokens.receivedBg,
          color: isMine ? tokens.sentText : tokens.receivedText,
          boxShadow: tokens.shadow,
          border: isMine ? "none" : `1px solid ${tokens.receivedBorder}`,
          position: "relative",
          wordBreak: "break-word",
          minWidth: 60,
        }}
      >
        {/* Nom expéditeur (groupes uniquement) */}
        {showSenderName && (
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

        {/* Contenu texte */}
        {msg.contenu && (
          <div
            style={{
              fontSize: contentFontSize,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              lineHeight: 1.4,
            }}
          >
            {msg.contenu}
          </div>
        )}

        {/* Pièces jointes */}
        {msg.piecesJointes?.length > 0 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              marginTop: msg.contenu ? 0 : 4,
            }}
          >
            {msg.piecesJointes.map((pj, idx) => (
              <AttachmentLink
                key={`${pj.url}-${idx}`}
                attachment={pj}
                isMine={isMine}
                tokens={tokens}
                fontSize={attachmentFontSize}
              />
            ))}
          </div>
        )}

        {/* Heure + statut de lecture (fin de groupe) */}
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
            }}
          >
            <span title={fullDateString}>{timeString}</span>
            {isMine &&
              (isRead ? (
                <CheckCheck size={14} aria-label="Lu" style={{ flexShrink: 0 }} />
              ) : (
                <Check size={14} aria-label="Envoyé" style={{ flexShrink: 0 }} />
              ))}
          </div>
        )}
      </div>
    </div>
  );
}