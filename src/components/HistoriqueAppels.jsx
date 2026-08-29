import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useStyles } from "../styles/theme";
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
  const warning = dark ? "#FBBF24" : "#F59E0B";

  const getUserName = (userId) => {
    const u = utilisateurs.find((u) => u._id === userId);
    return u ? `${u.nom} ${u.postnom || ""}` : "Utilisateur inconnu";
  };

  const handleCallBack = async (contactId) => {
    try {
      // Si l'utilisateur est participant d'un groupe, on ne peut pas rappeler directement un contact
      // On lance un appel direct audio par défaut
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
      return <Users size={16} color={accent} />;
    } else if (call.type === "video") {
      return <Video size={16} color={accent} />;
    } else {
      return <Phone size={16} color={accent} />;
    }
  };

  const getCallStatusIcon = (call) => {
    const isOutgoing = call.callerId === user._id;
    if (call.status === "missed") {
      return <PhoneMissed size={18} color={danger} />;
    }
    if (isOutgoing) {
      return <PhoneOutgoing size={18} color={success} />;
    }
    return <PhoneIncoming size={18} color={accent} />;
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
      <p style={{ color: textSecondary, fontSize: 14, marginTop: 16 }}>
        Aucun appel récent.
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 16 }}>
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
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              background: cardBg,
              borderRadius: 8,
              border: dark ? `1px solid ${borderColor}` : "none",
              transition: "background-color 0.3s, border-color 0.3s",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {/* Icône de statut (entrant/sortant/manqué) */}
              {getCallStatusIcon(call)}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontWeight: 600, color: textPrimary }}>{partnerName}</span>
                  {/* Icône de type (audio/vidéo/groupe) */}
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    {getCallTypeIcon(call)}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: textSecondary, display: "flex", alignItems: "center", gap: 6 }}>
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
            <div style={{ display: "flex", gap: 8 }}>
              {partnerId && (
                <button
                  onClick={() => onNavigateToMessaging && onNavigateToMessaging(partnerId)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: textSecondary,
                    padding: 4,
                    display: "flex",
                    alignItems: "center",
                    borderRadius: 6,
                  }}
                  title={`Message à ${partnerName}`}
                >
                  <MessageCircle size={20} />
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
                    padding: 4,
                    display: "flex",
                    alignItems: "center",
                    borderRadius: 6,
                  }}
                  title={`Rappeler ${partnerName}`}
                >
                  <Phone size={20} />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}