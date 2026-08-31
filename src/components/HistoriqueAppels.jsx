import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useStyles } from "../styles/theme";
import { useIsMobile } from "../hooks/useIsMobile"; // <-- Import du hook
import toast from "react-hot-toast";
import {
  MessageCircle,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Phone,
  Loader,
  Video,
  Users,
  Clock,
} from "lucide-react";

export function HistoriqueAppels({ user, ecoleId, anneeId, onNavigateToMessaging }) {
  const { dark } = useStyles();
  const isMobile = useIsMobile(); // Détection mobile

  const historyQuery = useQuery(api.appels.listHistory, { userId: user._id });
  const utilisateursQuery = useQuery(
    api.users.listByEcole,
    ecoleId ? { ecoleId } : "skip"
  );

  const history = historyQuery ?? [];
  const utilisateurs = utilisateursQuery ?? [];
  const createCall = useMutation(api.appels.createCall);

  // Couleurs adaptatives
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#F9FAFB";
  const borderColor = dark ? "#334155" : "transparent";
  const success = dark ? "#34D399" : "#10B981";
  const accent = dark ? "#818CF8" : "#4F46E5";
  const danger = dark ? "#F87171" : "#EF4444";

  const getUserName = (userId) => {
    const u = utilisateurs.find((u) => u._id === userId);
    return u ? `${u.nom} ${u.postnom || ""}` : "Utilisateur inconnu";
  };

  const handleCallBack = async (contactId) => {
    try {
      await createCall({
        calleeId: contactId,
        ecoleId,
        anneeId,
        userId: user._id,
        type: "audio",
      });
      toast.success("Appel lancé...");
    } catch (err) {
      toast.error(
        err.message.includes("déjà en cours")
          ? "Un appel est déjà en cours avec ce contact."
          : `Erreur : ${err.message}`
      );
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds || seconds <= 0) return null;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) return `${mins} min ${secs.toString().padStart(2, "0")} s`;
    return `${secs} s`;
  };

  // Ne garder que les appels terminés
  const finishedCalls = history
    .filter((call) => ["accepted", "rejected", "ended", "missed"].includes(call.status))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const getCallTypeIcon = (call) => {
    if (call.isGroup) {
      return <Users size={isMobile ? 16 : 16} color={accent} />;
    } else if (call.type === "video") {
      return <Video size={isMobile ? 16 : 16} color={accent} />;
    } else {
      return <Phone size={isMobile ? 16 : 16} color={accent} />;
    }
  };

  const getCallStatusIcon = (call) => {
    const isOutgoing = call.callerId === user._id;
    if (call.status === "missed") {
      return <PhoneMissed size={isMobile ? 20 : 18} color={danger} />;
    }
    if (isOutgoing) {
      return <PhoneOutgoing size={isMobile ? 20 : 18} color={success} />;
    }
    return <PhoneIncoming size={isMobile ? 20 : 18} color={accent} />;
  };

  const getCallStatusText = (call) => {
    const isOutgoing = call.callerId === user._id;
    switch (call.status) {
      case "accepted":
        return isOutgoing ? "Sortant" : "Entrant";
      case "ended":
        return isOutgoing ? "Sortant" : "Entrant";
      case "rejected":
        return "Refusé";
      case "missed":
        return "Manqué";
      default:
        return call.status;
    }
  };

  const getCallPartnerId = (call) => {
    if (call.isGroup) return null;
    return call.callerId === user._id ? call.calleeId : call.callerId;
  };

  // État de chargement
  if (historyQuery === undefined || utilisateursQuery === undefined) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
        <Loader size={24} className="animate-spin" style={{ color: textSecondary }} />
      </div>
    );
  }

  if (finishedCalls.length === 0) {
    return (
      <p style={{ color: textSecondary, fontSize: isMobile ? 14 : 14, marginTop: 16 }}>
        Aucun appel récent.
      </p>
    );
  }

  // Styles adaptatifs
  const rowFlexDirection = isMobile ? "column" : "row";
  const rowAlignItems = isMobile ? "stretch" : "center";
  const rowPadding = isMobile ? "10px 12px" : "12px 16px";
  const rowGap = isMobile ? 8 : 12;
  const contactNameSize = isMobile ? 15 : 16;
  const secondaryTextSize = isMobile ? 12 : 13;
  const actionButtonPadding = isMobile ? 6 : 4;
  const actionButtonSize = isMobile ? 20 : 20;
  const metaGap = isMobile ? 4 : 6;
  const metaFlexWrap = isMobile ? "wrap" : "nowrap";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? 6 : 4, marginTop: 16 }}>
      {finishedCalls.map((call) => {
        const partnerId = getCallPartnerId(call);
        const partnerName = partnerId ? getUserName(partnerId) : "Appel de groupe";
        const dateStr = new Date(call.createdAt).toLocaleDateString();
        const timeStr = new Date(call.createdAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
        const duration = call.duration ? formatDuration(call.duration) : null;

        return (
          <div
            key={call._id}
            style={{
              display: "flex",
              flexDirection: rowFlexDirection,
              alignItems: rowAlignItems,
              justifyContent: "space-between",
              padding: rowPadding,
              background: cardBg,
              borderRadius: 8,
              border: dark ? `1px solid ${borderColor}` : "none",
              gap: rowGap,
              transition: "background-color 0.3s, border-color 0.3s",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
              {/* Icône de statut (entrant/sortant/manqué) */}
              {getCallStatusIcon(call)}
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 600, color: textPrimary, fontSize: contactNameSize, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {partnerName}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    {getCallTypeIcon(call)}
                  </span>
                </div>
                <div style={{
                  fontSize: secondaryTextSize,
                  color: textSecondary,
                  display: "flex",
                  alignItems: "center",
                  gap: metaGap,
                  flexWrap: metaFlexWrap,
                }}>
                  <span>{getCallStatusText(call)}</span>
                  <span>·</span>
                  <span>{dateStr}</span>
                  <span>·</span>
                  <span>{timeStr}</span>
                  {duration && (
                    <>
                      <span>·</span>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <Clock size={12} />
                        {duration}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, justifyContent: isMobile ? "flex-end" : "flex-start", flexShrink: 0 }}>
              {partnerId && (
                <button
                  onClick={() => onNavigateToMessaging && onNavigateToMessaging(partnerId)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: textSecondary,
                    padding: actionButtonPadding,
                    display: "flex",
                    alignItems: "center",
                    borderRadius: 6,
                  }}
                  title={`Message à ${partnerName}`}
                >
                  <MessageCircle size={actionButtonSize} />
                </button>
              )}
              {partnerId && (
                <button
                  onClick={() => handleCallBack(partnerId)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: accent,
                    padding: actionButtonPadding,
                    display: "flex",
                    alignItems: "center",
                    borderRadius: 6,
                  }}
                  title={`Rappeler ${partnerName}`}
                >
                  <Phone size={actionButtonSize} />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}