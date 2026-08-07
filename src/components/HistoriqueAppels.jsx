// src/components/HistoriqueAppels.jsx
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useStyles } from "../styles/theme";
import toast from "react-hot-toast";
import { MessageCircle, PhoneIncoming, PhoneOutgoing, PhoneMissed, Phone } from "lucide-react";

export function HistoriqueAppels({ user, ecoleId, anneeId, onNavigateToMessaging }) {
  const { S, dark } = useStyles();
  const history = useQuery(api.appels.listHistory, { userId: user._id }) ?? [];
  const utilisateurs = useQuery(api.users.listByEcole, { ecoleId }) ?? [];
  const createCall = useMutation(api.appels.createCall);

  const getUserName = (userId) => {
    const u = utilisateurs.find((u) => u._id === userId);
    return u ? u.nom : "Utilisateur inconnu";
  };

  const handleCallBack = async (contactId) => {
    try {
      await createCall({ calleeId: contactId, ecoleId, anneeId, userId: user._id });
      toast.success("Appel lancé...");
    } catch (err) {
      toast.error(err.message.includes("déjà en cours")
        ? "Un appel est déjà en cours avec ce contact."
        : `Erreur : ${err.message}`);
    }
  };

  // Ne garder que les appels terminés (accepted, rejected, missed, ended)
  const finishedCalls = history.filter((call) =>
    ["accepted", "rejected", "ended", "missed"].includes(call.status)
  );

  const getCallIcon = (call) => {
    const isOutgoing = call.callerId === user._id;
    if (call.status === "missed") {
      return <PhoneMissed size={18} color="#ef4444" />;
    }
    if (isOutgoing) {
      return <PhoneOutgoing size={18} color="#10b981" />;
    }
    return <PhoneIncoming size={18} color="#4f46e5" />;
  };

  const getCallStatusText = (call) => {
    const isOutgoing = call.callerId === user._id;
    switch (call.status) {
      case "accepted":
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
    return call.callerId === user._id ? call.calleeId : call.callerId;
  };

  if (finishedCalls.length === 0) {
    return <p style={S.muted}>Aucun appel récent.</p>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 16 }}>
      {finishedCalls.map((call) => {
        const partnerId = getCallPartnerId(call);
        const partnerName = getUserName(partnerId);
        return (
          <div
            key={call._id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              background: dark ? "#1e293b" : "#f9fafb",
              borderRadius: 8,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {getCallIcon(call)}
              <div>
                <div style={{ fontWeight: 600 }}>{partnerName}</div>
                <div style={{ fontSize: 13, color: S.textMuted }}>
                  {getCallStatusText(call)} · {new Date(call.createdAt).toLocaleDateString()} · {new Date(call.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => onNavigateToMessaging && onNavigateToMessaging(partnerId)}
                style={{ background: "none", border: "none", cursor: "pointer", color: S.textMuted }}
                title={`Message à ${partnerName}`}
              >
                <MessageCircle size={20} />
              </button>
              <button onClick={() => handleCallBack(partnerId)} style={{ background: "none", border: "none", cursor: "pointer", color: "#4f46e5" }} title={`Rappeler ${partnerName}`}>
                <Phone size={20} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}