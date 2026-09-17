// src/components/HistoriqueAppels.jsx
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useMemo, useState, useCallback } from "react";
import toast from "react-hot-toast";
import {
  MessageCircle, PhoneIncoming, PhoneOutgoing, PhoneMissed,
  Phone, Loader, Video, Users, Clock, History,
} from "lucide-react";

// ════════════════════════════════════════════════════════════════════
// KEYFRAMES module-level
// ════════════════════════════════════════════════════════════════════
const HistKeyframes = (
  <style>{`
    @keyframes hist-pulse {
      0%, 100% { opacity: 1; }
      50%      { opacity: 0.4; }
    }
    @keyframes hist-spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
    @keyframes hist-fade-in {
      from { opacity: 0; transform: translateY(6px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .hist-skeleton {
      background: currentColor;
      border-radius: 6px;
      animation: hist-pulse 1.4s ease-in-out infinite;
    }
    .hist-spin { animation: hist-spin 0.9s linear infinite; }
    .hist-fade-in { animation: hist-fade-in 0.3s ease-out; }
    @media (prefers-reduced-motion: reduce) {
      .hist-skeleton, .hist-spin, .hist-fade-in {
        animation: none !important;
      }
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
    // Statuts
    success: dark ? "#34D399" : "#10B981",
    danger: dark ? "#F87171" : "#EF4444",
    dangerSoft: dark ? "#7F1D1D" : "#FEE2E2",
    warning: dark ? "#FBBF24" : "#F59E0B",
  };
}

// ════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════
function getInitials(nom) {
  if (!nom) return "?";
  const parts = String(nom).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (
    parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
  ).toUpperCase();
}

// Palette déterministe par nom
const AVATAR_PALETTE = [
  "#6366F1", "#8B5CF6", "#EC4899", "#F43F5E",
  "#F59E0B", "#10B981", "#14B8A6", "#3B82F6",
];

function getAvatarColor(nom) {
  if (!nom) return AVATAR_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < nom.length; i++) {
    hash = nom.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

function formatDateLabel(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const check = new Date(d);
  check.setHours(0, 0, 0, 0);

  if (check.getTime() === today.getTime()) return "Aujourd'hui";

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (check.getTime() === yesterday.getTime()) return "Hier";

  const diffDays = Math.round((today - check) / (1000 * 60 * 60 * 24));
  if (diffDays > 0 && diffDays < 7) {
    return d.toLocaleDateString("fr-FR", { weekday: "long" });
  }
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
  });
}

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return null;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) {
    return `${mins} min ${String(secs).padStart(2, "0")} s`;
  }
  return `${secs} s`;
}

// ════════════════════════════════════════════════════════════════════
// SOUS-COMPOSANTS
// ════════════════════════════════════════════════════════════════════

/** Avatar circulaire avec initiale */
function Avatar({ nom, size = 44, variant = "primary", tokens }) {
  const bgColor = variant === "missed" ? tokens.dangerSoft : tokens.primarySoft;
  const fgColor = variant === "missed" ? tokens.danger : tokens.primary;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: bgColor,
        color: fgColor,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: size * 0.35,
        flexShrink: 0,
        letterSpacing: "-0.02em",
      }}
      aria-hidden="true"
    >
      {getInitials(nom)}
    </div>
  );
}

/** Badge type d'appel (Groupe/Vidéo/Audio) */
function CallTypeBadge({ call, dark }) {
  const config = call.isGroup
    ? {
        bg: dark ? "#4C1D95" : "#EDE9FE",
        color: dark ? "#C4B5FD" : "#6D28D9",
        icon: <Users size={11} />,
        label: "Groupe",
      }
    : call.type === "video"
    ? {
        bg: dark ? "#1E3A8A" : "#DBEAFE",
        color: dark ? "#60A5FA" : "#1D4ED8",
        icon: <Video size={11} />,
        label: "Vidéo",
      }
    : {
        bg: dark ? "#334155" : "#F1F5F9",
        color: dark ? "#CBD5E1" : "#475569",
        icon: <Phone size={11} />,
        label: "Audio",
      };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        background: config.bg,
        color: config.color,
        padding: "2px 8px",
        borderRadius: 20,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.02em",
        textTransform: "uppercase",
        flexShrink: 0,
      }}
    >
      {config.icon}
      {config.label}
    </span>
  );
}

/** Bouton icône carré arrondi (même style que Appels.jsx) */
function IconButton({ icon, label, onClick, tokens, variant = "ghost", disabled = false }) {
  const [hovered, setHovered] = useState(false);

  const variants = {
    ghost: {
      background: hovered && !disabled ? tokens.ghostHover : "transparent",
      color: tokens.textMuted,
      border: `1px solid ${tokens.border}`,
    },
    primary: {
      background: hovered && !disabled ? tokens.primaryHover : tokens.primary,
      color: "#FFFFFF",
      border: "none",
      boxShadow:
        hovered && !disabled
          ? "0 2px 8px rgba(79,70,229,0.25)"
          : "none",
    },
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={(e) => {
        e.currentTarget.style.outline = `2px solid ${tokens.primary}`;
        e.currentTarget.style.outlineOffset = "2px";
      }}
      onBlur={(e) => {
        e.currentTarget.style.outline = "none";
      }}
      style={{
        width: 34,
        height: 34,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 10,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "background 0.15s ease, transform 0.1s ease",
        padding: 0,
        outline: "none",
        ...variants[variant],
      }}
      aria-label={label}
      title={label}
    >
      {icon}
    </button>
  );
}

/** Skeleton pour une ligne d'appel */
function CallSkeleton({ tokens, isMobile }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: isMobile ? 10 : 12,
        padding: isMobile ? "12px 14px" : "14px 16px",
        background: tokens.surface,
        borderRadius: 12,
        border: `1px solid ${tokens.border}`,
      }}
    >
      <div
        className="hist-skeleton"
        style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          color: tokens.skeleton,
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1 }}>
        <div
          className="hist-skeleton"
          style={{
            width: "45%",
            height: 13,
            color: tokens.skeleton,
            marginBottom: 8,
          }}
        />
        <div
          className="hist-skeleton"
          style={{ width: "65%", height: 10, color: tokens.skeleton }}
        />
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <div
          className="hist-skeleton"
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            color: tokens.skeleton,
          }}
        />
        <div
          className="hist-skeleton"
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            color: tokens.skeleton,
          }}
        />
      </div>
    </div>
  );
}

/** Ligne d'appel dans l'historique */
function CallRow({
  call,
  partnerId,
  partnerName,
  userId,
  tokens,
  dark,
  isMobile,
  onCallBack,
  onNavigateToMessaging,
}) {
  const [hovered, setHovered] = useState(false);
  const [callingBack, setCallingBack] = useState(false);

  const isOutgoing = call.callerId === userId;
  const isMissed = call.status === "missed";
  const isRejected = call.status === "rejected";

  // Icône de statut (petit badge sur l'avatar)
  const statusIcon = isMissed ? (
    <PhoneMissed size={14} color={tokens.danger} strokeWidth={2.5} />
  ) : isRejected ? (
    <PhoneMissed size={14} color={tokens.textMuted} strokeWidth={2.5} />
  ) : isOutgoing ? (
    <PhoneOutgoing size={14} color={tokens.success} strokeWidth={2.5} />
  ) : (
    <PhoneIncoming size={14} color={tokens.primary} strokeWidth={2.5} />
  );

  const statusText = isMissed
    ? "Manqué"
    : isRejected
    ? "Refusé"
    : isOutgoing
    ? "Sortant"
    : "Entrant";

  const statusColor = isMissed
    ? tokens.danger
    : isRejected
    ? tokens.textMuted
    : isOutgoing
    ? tokens.success
    : tokens.primary;

  const duration = formatDuration(call.duration);
  const dateLabel = formatDateLabel(call.createdAt);
  const timeLabel = new Date(call.createdAt).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const handleCallBack = useCallback(async () => {
    if (callingBack || !partnerId) return;
    setCallingBack(true);
    try {
      await onCallBack(partnerId);
    } finally {
      setCallingBack(false);
    }
  }, [callingBack, partnerId, onCallBack]);

  return (
    <div
      className="hist-fade-in"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background:
          hovered && !isMobile ? tokens.surfaceHover : tokens.surface,
        border: `1px solid ${tokens.border}`,
        borderRadius: 12,
        padding: isMobile ? "12px 14px" : "12px 16px",
        display: "flex",
        alignItems: "center",
        gap: isMobile ? 12 : 14,
        minWidth: 0,
        transition: "background 0.15s ease",
      }}
    >
      {/* Avatar + badge statut */}
      <div style={{ position: "relative", flexShrink: 0 }}>
        <Avatar
          nom={partnerName}
          size={isMobile ? 42 : 46}
          variant={isMissed ? "missed" : "primary"}
          tokens={tokens}
        />
        <div
          style={{
            position: "absolute",
            bottom: -2,
            right: -2,
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: tokens.surface,
            border: `2px solid ${tokens.surface}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {statusIcon}
        </div>
      </div>

      {/* Contenu */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 4,
            minWidth: 0,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontWeight: 600,
              fontSize: isMobile ? 14 : 15,
              color: tokens.text,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              minWidth: 0,
              flex: isMobile ? "1 1 auto" : "0 1 auto",
            }}
          >
            {partnerName}
          </span>
          <CallTypeBadge call={call} dark={dark} />
        </div>

        {/* Métadonnées (statut · date · heure · durée) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: isMobile ? 12 : 12.5,
            color: tokens.textMuted,
            flexWrap: "wrap",
          }}
        >
          <span style={{ color: statusColor, fontWeight: 600 }}>
            {statusText}
          </span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span>{dateLabel}</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span>{timeLabel}</span>
          {duration && (
            <>
              <span style={{ opacity: 0.4 }}>·</span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Clock size={11} />
                {duration}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      {partnerId && (
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <IconButton
            icon={<MessageCircle size={16} />}
            label={`Envoyer un message à ${partnerName}`}
            onClick={() =>
              onNavigateToMessaging && onNavigateToMessaging(partnerId)
            }
            tokens={tokens}
            variant="ghost"
          />
          <IconButton
            icon={
              callingBack ? (
                <Loader size={16} className="hist-spin" />
              ) : (
                <Phone size={16} />
              )
            }
            label={`Rappeler ${partnerName}`}
            onClick={handleCallBack}
            tokens={tokens}
            variant="primary"
            disabled={callingBack}
          />
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ════════════════════════════════════════════════════════════════════
export function HistoriqueAppels({
  user,
  ecoleId,
  anneeId,
  onNavigateToMessaging,
}) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();

  const tokens = useMemo(() => buildTokens(dark), [dark]);
  const userId = user?._id;

  // ════════════════════════════════════════════════════════════════════
  // QUERIES (args stables)
  // ════════════════════════════════════════════════════════════════════
  const historyArgs = useMemo(
    () => (userId ? { userId } : "skip"),
    [userId]
  );
  const historyQuery = useQuery(api.appels.listHistory, historyArgs);

  const usersArgs = useMemo(
    () => (ecoleId && userId ? { ecoleId, userId } : "skip"),
    [ecoleId, userId]
  );
  const utilisateursQuery = useQuery(api.users.listByEcole, usersArgs);

  const history = useMemo(() => historyQuery ?? [], [historyQuery]);
  const utilisateurs = useMemo(
    () => utilisateursQuery ?? [],
    [utilisateursQuery]
  );

  const isLoading =
    historyQuery === undefined || utilisateursQuery === undefined;

  const createCall = useMutation(api.appels.createCall);

  // ════════════════════════════════════════════════════════════════════
  // INDEX — O(1) lookups
  // ════════════════════════════════════════════════════════════════════
  const usersMap = useMemo(() => {
    const map = new Map();
    utilisateurs.forEach((u) => map.set(u._id, u));
    return map;
  }, [utilisateurs]);

  const getUserName = useCallback(
    (id) => {
      const u = usersMap.get(id);
      if (!u) return "Utilisateur inconnu";
      return `${u.nom ?? ""} ${u.postnom ?? ""}`.trim() || "Sans nom";
    },
    [usersMap]
  );

  // ════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ════════════════════════════════════════════════════════════════════
  const handleCallBack = useCallback(
    async (contactId) => {
      if (!userId) {
        toast.error("Session invalide.");
        return;
      }
      try {
        await createCall({
          calleeId: contactId,
          ecoleId,
          anneeId,
          userId,
          type: "audio",
        });
        toast.success("Appel lancé…");
      } catch (err) {
        console.error("[HistoriqueAppels] callBack failed:", err);
        if (err?.message?.includes("déjà en cours")) {
          toast.error("Un appel est déjà en cours avec ce contact.");
        } else {
          toast.error(err?.message ?? "Impossible de lancer l'appel");
        }
      }
    },
    [userId, ecoleId, anneeId, createCall]
  );

  // ════════════════════════════════════════════════════════════════════
  // DONNÉES FILTRÉES
  // ════════════════════════════════════════════════════════════════════
  const finishedCalls = useMemo(() => {
    return history
      .filter((call) =>
        ["accepted", "rejected", "ended", "missed"].includes(call.status)
      )
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime()
      );
  }, [history]);

  // ════════════════════════════════════════════════════════════════════
  // LOADING
  // ════════════════════════════════════════════════════════════════════
  if (isLoading) {
    return (
      <>
        {HistKeyframes}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: isMobile ? 8 : 10,
            marginTop: isMobile ? 12 : 16,
          }}
        >
          {[1, 2, 3, 4].map((i) => (
            <CallSkeleton key={i} tokens={tokens} isMobile={isMobile} />
          ))}
        </div>
      </>
    );
  }

  // ════════════════════════════════════════════════════════════════════
  // EMPTY STATE
  // ════════════════════════════════════════════════════════════════════
  if (finishedCalls.length === 0) {
    return (
      <>
        {HistKeyframes}
        <div
          style={{
            background: tokens.surface,
            borderRadius: 16,
            border: `1px solid ${tokens.border}`,
            padding: isMobile ? "40px 20px" : "56px 24px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: tokens.primarySoft,
              color: tokens.primary,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 4,
            }}
          >
            <History size={28} />
          </div>
          <p
            style={{
              margin: 0,
              fontSize: isMobile ? 15 : 16,
              fontWeight: 600,
              color: tokens.text,
            }}
          >
            Aucun appel récent
          </p>
          <p
            style={{
              margin: 0,
              fontSize: isMobile ? 13 : 14,
              color: tokens.textMuted,
              maxWidth: 320,
            }}
          >
            Vos appels entrants, sortants et manqués apparaîtront ici.
          </p>
        </div>
      </>
    );
  }

  // ════════════════════════════════════════════════════════════════════
  // LISTE
  // ════════════════════════════════════════════════════════════════════
  return (
    <>
      {HistKeyframes}
      <div
        style={{
          display: "grid",
          gap: isMobile ? 8 : 10,
          marginTop: isMobile ? 12 : 16,
        }}
      >
        {finishedCalls.map((call) => {
          const partnerId = call.isGroup
            ? null
            : call.callerId === userId
            ? call.calleeId
            : call.callerId;
          const partnerName = partnerId
            ? getUserName(partnerId)
            : "Appel de groupe";

          return (
            <CallRow
              key={call._id}
              call={call}
              partnerId={partnerId}
              partnerName={partnerName}
              userId={userId}
              tokens={tokens}
              dark={dark}
              isMobile={isMobile}
              onCallBack={handleCallBack}
              onNavigateToMessaging={onNavigateToMessaging}
            />
          );
        })}
      </div>
    </>
  );
}