// src/components/messagerie/MessagingHero.jsx
import { useState, useMemo } from "react";
import { GraduationCap, Users, MessageCircle } from "lucide-react";
import { useIsMobile } from "@/hooks/useIsMobile";

// ════════════════════════════════════════════════════════════════════
// SAFE-AREA
// ════════════════════════════════════════════════════════════════════
const SAFE_BOTTOM = "env(safe-area-inset-bottom, 0px)";

// ════════════════════════════════════════════════════════════════════
// KEYFRAMES module-level
// ════════════════════════════════════════════════════════════════════
const MessagingHeroKeyframes = (
  <style>{`
    @keyframes msg-hero-halo {
      0%, 100% { transform: scale(1);    opacity: 0.4; }
      50%      { transform: scale(1.15); opacity: 0.1; }
    }
    @keyframes msg-hero-fade-in {
      from { opacity: 0; transform: translateY(6px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .msg-hero-halo    { animation: msg-hero-halo 2s ease-in-out infinite; }
    .msg-hero-fade-in { animation: msg-hero-fade-in 0.3s ease-out; }
    @media (prefers-reduced-motion: reduce) {
      .msg-hero-halo,
      .msg-hero-fade-in {
        animation: none !important;
      }
    }
  `}</style>
);

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

// ════════════════════════════════════════════════════════════════════
// SIZES — ✨ version desktop
// ════════════════════════════════════════════════════════════════════
const SIZES = {
  sm: { avatar: 64,  iconSize: 26, fontSize: 15, descSize: 12.5, gap: 8  },
  md: { avatar: 88,  iconSize: 34, fontSize: 17, descSize: 13.5, gap: 12 },
  lg: { avatar: 112, iconSize: 44, fontSize: 19, descSize: 14,   gap: 16 },
};

// ✨ Tailles adaptées mobile (un peu plus compactes)
const SIZES_MOBILE = {
  sm: { avatar: 56,  iconSize: 24, fontSize: 14.5, descSize: 12.5, gap: 8  },
  md: { avatar: 76,  iconSize: 30, fontSize: 16,   descSize: 13.5, gap: 10 },
  lg: { avatar: 88,  iconSize: 36, fontSize: 17.5, descSize: 14,   gap: 12 },
};

// ════════════════════════════════════════════════════════════════════
// BOUTON ACTION
// ════════════════════════════════════════════════════════════════════
function ActionButton({ label, onClick, Icon, tokens, isMobile }) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);

  const transform = pressed
    ? "scale(0.97)"
    : hovered && !isMobile
    ? "translateY(-1px)"
    : "translateY(0)";

  const boxShadow = pressed
    ? "0 4px 12px rgba(79,70,229,0.25)"
    : hovered && !isMobile
    ? "0 8px 22px rgba(79,70,229,0.4)"
    : "0 6px 18px rgba(79,70,229,0.3)";

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => !isMobile && setHovered(true)}
      onMouseLeave={() => !isMobile && setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      onTouchCancel={() => setPressed(false)}
      style={{
        marginTop: 8,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: isMobile ? "13px 22px" : "11px 24px",
        background: `linear-gradient(135deg, ${tokens.primary}, ${tokens.primaryHover})`,
        color: "#FFFFFF",
        border: "none",
        borderRadius: 12,
        fontWeight: 600,
        fontSize: isMobile ? 14.5 : 14,
        cursor: "pointer",
        boxShadow,
        transform,
        transition:
          "transform 0.12s ease, box-shadow 0.15s ease, background 0.12s ease",
        minHeight: 48,
        outline: focused ? `2px solid ${tokens.primary}` : "none",
        outlineOffset: 2,
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation",
      }}
    >
      {Icon && <Icon size={isMobile ? 17 : 16} />}
      {label}
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════
// COMPOSANT
// ════════════════════════════════════════════════════════════════════
export function MessagingHero({
  icon: FallbackIcon,
  avatarName,
  avatarIcon,           // "GraduationCap" | "Users"
  avatarVariant = "user", // "user" | "group"
  title,
  description,
  action,               // { label, onClick, icon }
  size = "md",          // "sm" | "md" | "lg"
  pulse = true,
  tokens,
  isMobile: isMobileProp,
}) {
  // ✨ Fallback interne si parent n'a pas passé isMobile
  const hookIsMobile = useIsMobile();
  const isMobile =
    isMobileProp !== undefined ? isMobileProp : hookIsMobile;

  const s = isMobile
    ? SIZES_MOBILE[size] || SIZES_MOBILE.md
    : SIZES[size] || SIZES.md;

  const isGroup = avatarVariant === "group" || avatarIcon;

  // Couleur avatar
  const avatarBg = useMemo(() => {
    if (isGroup) return tokens.groupBg;
    if (avatarName) return getAvatarColor(avatarName);
    return tokens.primarySoft;
  }, [isGroup, avatarName, tokens.groupBg, tokens.primarySoft]);

  const avatarFg = useMemo(() => {
    if (isGroup) return tokens.groupFg;
    if (avatarName) return "#FFFFFF";
    return tokens.primary;
  }, [isGroup, avatarName, tokens.groupFg, tokens.primary]);

  // Ombre adaptée
  const avatarShadow = useMemo(() => {
    if (isGroup) return "0 8px 24px rgba(124,58,237,0.25)";
    if (avatarName) return "0 8px 24px rgba(0,0,0,0.15)";
    return "0 8px 24px rgba(79,70,229,0.2)";
  }, [isGroup, avatarName]);

  return (
    <>
      {MessagingHeroKeyframes}
      <div
        className="msg-hero-fade-in"
        style={{
          padding: isMobile ? "32px 20px" : "56px 24px",
          paddingBottom: isMobile
            ? `calc(32px + ${SAFE_BOTTOM})`
            : "56px",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: s.gap,
          minHeight: "100%",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {/* Avatar avec halo pulse */}
        <div
          style={{
            position: "relative",
            display: "inline-block",
          }}
        >
          {pulse && (
            <div
              className="msg-hero-halo"
              style={{
                position: "absolute",
                inset: -10,
                borderRadius: "50%",
                background: avatarBg,
                opacity: 0.4,
                zIndex: 0,
                pointerEvents: "none",
              }}
              aria-hidden="true"
            />
          )}

          <div
            style={{
              width: s.avatar,
              height: s.avatar,
              borderRadius: "50%",
              background: avatarBg,
              color: avatarFg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: s.avatar * 0.36,
              position: "relative",
              zIndex: 1,
              border: `3px solid ${tokens.surface}`,
              letterSpacing: "-0.02em",
              boxShadow: avatarShadow,
            }}
            aria-hidden="true"
          >
            {avatarIcon === "GraduationCap" ? (
              <GraduationCap size={s.iconSize} />
            ) : avatarIcon === "Users" ? (
              <Users size={s.iconSize} />
            ) : avatarName ? (
              getInitials(avatarName)
            ) : FallbackIcon ? (
              <FallbackIcon size={s.iconSize} />
            ) : (
              <MessageCircle size={s.iconSize} />
            )}
          </div>
        </div>

        {/* Titre */}
        {title && (
          <div
            style={{
              fontSize: s.fontSize,
              fontWeight: 700,
              color: tokens.text,
              lineHeight: 1.3,
              maxWidth: isMobile ? 260 : 320,
              paddingLeft: isMobile ? 8 : 0,
              paddingRight: isMobile ? 8 : 0,
            }}
          >
            {title}
          </div>
        )}

        {/* Description */}
        {description && (
          <div
            style={{
              fontSize: s.descSize,
              color: tokens.textMuted,
              maxWidth: isMobile ? 280 : 300,
              lineHeight: 1.5,
              paddingLeft: isMobile ? 8 : 0,
              paddingRight: isMobile ? 8 : 0,
            }}
          >
            {description}
          </div>
        )}

        {/* Action */}
        {action?.label && action?.onClick && (
          <ActionButton
            label={action.label}
            onClick={action.onClick}
            Icon={action.icon}
            tokens={tokens}
            isMobile={isMobile}
          />
        )}
      </div>
    </>
  );
}