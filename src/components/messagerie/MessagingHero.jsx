// src/components/messagerie/MessagingHero.jsx
import { GraduationCap, Users, MessageCircle } from "lucide-react";

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
// HELPERS (couleur déterministe par nom)
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
// SIZES
// ════════════════════════════════════════════════════════════════════
const SIZES = {
  sm: { avatar: 64,  iconSize: 26, fontSize: 15, descSize: 12.5, gap: 8  },
  md: { avatar: 88,  iconSize: 34, fontSize: 17, descSize: 13.5, gap: 12 },
  lg: { avatar: 112, iconSize: 44, fontSize: 19, descSize: 14,   gap: 16 },
};

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
  isMobile,
}) {
  const s = SIZES[size] || SIZES.md;

  const isGroup = avatarVariant === "group" || avatarIcon;

  // Couleur de l'avatar
  const avatarBg = isGroup
    ? tokens.groupBg
    : avatarName
    ? getAvatarColor(avatarName)
    : tokens.primarySoft;

  const avatarFg = isGroup
    ? tokens.groupFg
    : avatarName
    ? "#FFFFFF"
    : tokens.primary;

  // Ombre adaptée au variant
  const avatarShadow = isGroup
    ? "0 8px 24px rgba(124,58,237,0.25)"
    : avatarName
    ? "0 8px 24px rgba(0,0,0,0.15)"
    : "0 8px 24px rgba(79,70,229,0.2)";

  return (
    <>
      {MessagingHeroKeyframes}
      <div
        className="msg-hero-fade-in"
        style={{
          padding: isMobile ? "40px 20px" : "56px 24px",
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
        <div style={{ position: "relative", display: "inline-block" }}>
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
        <div
          style={{
            fontSize: s.fontSize,
            fontWeight: 700,
            color: tokens.text,
            lineHeight: 1.3,
            maxWidth: 320,
          }}
        >
          {title}
        </div>

        {/* Description */}
        {description && (
          <div
            style={{
              fontSize: s.descSize,
              color: tokens.textMuted,
              maxWidth: 300,
              lineHeight: 1.5,
            }}
          >
            {description}
          </div>
        )}

        {/* Action optionnelle (bouton gradient style Hero) */}
        {action?.label && action?.onClick && (
          <button
            type="button"
            onClick={action.onClick}
            style={{
              marginTop: 8,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: isMobile ? "12px 22px" : "11px 24px",
              background: `linear-gradient(135deg, ${tokens.primary}, ${tokens.primaryHover})`,
              color: "#FFFFFF",
              border: "none",
              borderRadius: 12,
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
              boxShadow: "0 6px 18px rgba(79,70,229,0.3)",
              transition: "transform 0.1s ease, box-shadow 0.15s ease",
              minHeight: 44,
              WebkitTapHighlightColor: "transparent",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow =
                "0 8px 22px rgba(79,70,229,0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow =
                "0 6px 18px rgba(79,70,229,0.3)";
            }}
            onFocus={(e) => {
              e.currentTarget.style.outline = `2px solid ${tokens.primary}`;
              e.currentTarget.style.outlineOffset = "2px";
            }}
            onBlur={(e) => {
              e.currentTarget.style.outline = "none";
            }}
          >
            {action.icon && <action.icon size={16} />}
            {action.label}
          </button>
        )}
      </div>
    </>
  );
}