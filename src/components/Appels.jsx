import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Phone, PhoneOutgoing, MessageCircle, Clock } from "lucide-react";
import toast from "react-hot-toast";
import { useStyles } from "../styles/theme";
import { HistoriqueAppels } from "./HistoriqueAppels";

export function Appels({ user, ecoleId, anneeId, onNavigateToMessaging }) {
  const { S, dark } = useStyles();
  const cleanupCalls = useMutation(api.appels.cleanupExpiredCalls);

  useEffect(() => {
    cleanupCalls();
  }, [cleanupCalls]);

  const [tab, setTab] = useState("contacts");

  const contacts = useQuery(api.appels.listContacts, { ecoleId, userId: user._id }) ?? [];
  const createCall = useMutation(api.appels.createCall);

  // Filtrage des contacts selon le rôle
  const visibleContacts =
    user.role === "parent" || user.role === "eleve"
      ? contacts.filter((c) =>
          ["admin", "directeur", "disciplinaire", "enseignant", "comptable"].includes(c.role)
        )
      : contacts;

  const handleCall = async (contact) => {
    try {
      await createCall({ calleeId: contact._id, ecoleId, anneeId, userId: user._id });
    } catch (err) {
      toast.error(
        err.message.includes("déjà en cours")
          ? "Un appel est déjà en cours avec ce contact."
          : `Erreur : ${err.message}`
      );
    }
  };

  const handleMessage = (contactId) => {
    if (onNavigateToMessaging) onNavigateToMessaging(contactId);
  };

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 16px" }}>
      {/* En-tête */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, color: "#1E293B", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <Phone size={24} /> Appels
        </h2>
        <p style={{ color: "#64748B", marginTop: 4, fontSize: 14 }}>
          Gérez vos appels et contacts
        </p>
      </div>

      {/* Onglets */}
      <div style={{ display: "flex", gap: 0, borderBottom: "2px solid #E2E8F0", marginBottom: 24 }}>
        {[
          { id: "contacts", label: "Contacts", icon: <Phone size={18} /> },
          { id: "historique", label: "Historique", icon: <Clock size={18} /> },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "12px 20px",
              border: "none",
              background: "transparent",
              color: tab === t.id ? "#4F46E5" : "#64748B",
              fontWeight: tab === t.id ? 600 : 400,
              borderBottom: tab === t.id ? "3px solid #4F46E5" : "3px solid transparent",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Contenu */}
      {tab === "contacts" ? (
        <div>
          <p style={{ color: "#64748B", fontSize: 14, marginBottom: 20 }}>
            Sélectionnez un contact pour lancer un appel audio ou envoyer un message.
          </p>

          {visibleContacts.length === 0 && (
            <div style={{
              background: "#FFF",
              borderRadius: 16,
              padding: 48,
              textAlign: "center",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              color: "#64748B",
            }}>
              <Phone size={32} style={{ marginBottom: 8 }} />
              <p>Aucun contact disponible</p>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {visibleContacts.map((contact) => (
              <div
                key={contact._id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "14px 18px",
                  background: dark ? "#1E293B" : "#FFFFFF",
                  borderRadius: 12,
                  border: "1px solid #E2E8F0",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                  transition: "box-shadow 0.15s",
                }}
              >
                <div>
                  <span style={{ fontWeight: 600, fontSize: 15 }}>
                    {contact.nom}
                  </span>
                  <span style={{ color: "#64748B", fontSize: 13, marginLeft: 8 }}>
                    ({contact.role})
                  </span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => handleMessage(contact._id)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#64748B",
                      padding: 8,
                      borderRadius: 8,
                      transition: "background 0.15s",
                    }}
                    title={`Envoyer un message à ${contact.nom}`}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#F1F5F9")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <MessageCircle size={20} />
                  </button>
                  <button
                    onClick={() => handleCall(contact)}
                    style={{
                      padding: "8px 16px",
                      background: "#4F46E5",
                      color: "#FFFFFF",
                      border: "none",
                      borderRadius: 8,
                      cursor: "pointer",
                      fontWeight: 600,
                      fontSize: 13,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      boxShadow: "0 2px 6px rgba(79,70,229,0.2)",
                      transition: "background 0.2s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#4338CA")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "#4F46E5")}
                  >
                    <PhoneOutgoing size={16} /> Appeler
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <HistoriqueAppels
          user={user}
          ecoleId={ecoleId}
          anneeId={anneeId}
          onNavigateToMessaging={onNavigateToMessaging}
        />
      )}
    </div>
  );
}