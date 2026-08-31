import { useEffect, useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  Phone, PhoneOutgoing, MessageCircle, Clock, Video, Users, Search, X,
} from "lucide-react";
import toast from "react-hot-toast";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile"; // <-- Import du hook
import { HistoriqueAppels } from "./HistoriqueAppels";

export function Appels({ user, ecoleId, anneeId, onNavigateToMessaging }) {
  const { dark } = useStyles();
  const isMobile = useIsMobile(); // Détection mobile
  const cleanupCalls = useMutation(api.appels.cleanupExpiredCalls);

  useEffect(() => {
    cleanupCalls();
  }, [cleanupCalls]);

  const [tab, setTab] = useState("contacts");
  const [searchTerm, setSearchTerm] = useState("");
  const [groupCallMode, setGroupCallMode] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [selectedParticipants, setSelectedParticipants] = useState([]);

  const contacts = useQuery(api.appels.listContacts, { ecoleId, userId: user._id }) ?? [];
  const classes = useQuery(api.classes.list, ecoleId ? { ecoleId } : "skip") ?? [];
  const createCall = useMutation(api.appels.createCall);
  const createGroupCall = useMutation(api.appels.createGroupCall);

  // Couleurs adaptatives
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const borderColor = dark ? "#334155" : "#E2E8F0";
  const accent = dark ? "#818CF8" : "#4F46E5";
  const accentHover = dark ? "#6366F1" : "#4338CA";
  const hoverBg = dark ? "#26334D" : "#F1F5F9";
  const shadow = dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)";
  const buttonShadow = dark
    ? "0 2px 6px rgba(129,140,248,0.3)"
    : "0 2px 6px rgba(79,70,229,0.2)";

  // Rôles autorisés à créer un appel de groupe
  const canCreateGroupCall = ["admin", "directeur", "disciplinaire", "enseignant"].includes(user.role);

  // Filtrage des contacts selon le rôle
  const visibleContacts = useMemo(() => {
    let filtered = user.role === "parent" || user.role === "eleve"
      ? contacts.filter((c) =>
          ["admin", "directeur", "disciplinaire", "enseignant", "comptable"].includes(c.role)
        )
      : contacts;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter((c) => c.nom.toLowerCase().includes(q));
    }
    return filtered;
  }, [contacts, user.role, searchTerm]);

  // Groupes disponibles pour appel de groupe (classes)
  const groups = useMemo(() => {
    if (!canCreateGroupCall) return [];
    return classes.map((c) => ({ id: `classe_${c.nom}`, label: `Classe ${c.nom}` }));
  }, [classes, canCreateGroupCall]);

  const handleCall = async (contact, type = "audio") => {
    try {
      await createCall({
        calleeId: contact._id,
        ecoleId,
        anneeId,
        userId: user._id,
        type,
      });
      toast.success(`Appel ${type} lancé...`);
    } catch (err) {
      toast.error(
        err.message.includes("déjà en cours")
          ? "Un appel est déjà en cours avec ce contact."
          : `Erreur : ${err.message}`
      );
    }
  };

  const handleGroupCall = async () => {
    if (!selectedGroupId || selectedParticipants.length === 0) {
      toast.error("Veuillez choisir un groupe et des participants.");
      return;
    }
    try {
      await createGroupCall({
        ecoleId,
        anneeId,
        userId: user._id,
        groupId: selectedGroupId,
        participantIds: selectedParticipants,
        type: "video",
      });
      toast.success("Appel de groupe lancé...");
      setGroupCallMode(false);
      setSelectedParticipants([]);
      setSelectedGroupId("");
    } catch (err) {
      toast.error("Erreur : " + err.message);
    }
  };

  const handleMessage = (contactId) => {
    if (onNavigateToMessaging) onNavigateToMessaging(contactId);
  };

  const toggleParticipant = (id) => {
    setSelectedParticipants((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Styles adaptatifs
  const containerPadding = isMobile ? "16px 12px" : "24px 16px";
  const titleSize = isMobile ? 22 : 28;
  const subtitleSize = isMobile ? 14 : 16;
  const headerMargin = isMobile ? 20 : 32;
  const tabPadding = isMobile ? "10px 12px" : "12px 20px";
  const tabFontSize = isMobile ? 14 : 16;
  const groupButtonPadding = isMobile ? "10px 12px" : "8px 16px";
  const groupButtonFontSize = isMobile ? 14 : 13;
  const cardPadding = isMobile ? "12px 14px" : "14px 18px";
  const contactNameSize = isMobile ? 15 : 15;
  const actionButtonPadding = isMobile ? "6px 8px" : "8px 12px";
  const actionButtonFontSize = isMobile ? 12 : 13;
  const inputPadding = isMobile ? "10px 12px" : "8px 12px";
  const inputFontSize = isMobile ? 16 : 14; // 16px pour éviter le zoom iOS
  const selectPadding = isMobile ? "10px 14px" : "10px 14px";
  const selectFontSize = isMobile ? 16 : 14;

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: containerPadding }}>
      {/* En-tête */}
      <div style={{ marginBottom: headerMargin }}>
        <h2 style={{
          fontSize: titleSize,
          fontWeight: 700,
          color: textPrimary,
          margin: 0,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}>
          <Phone size={isMobile ? 20 : 24} color={accent} /> Appels
        </h2>
        <p style={{ color: textSecondary, marginTop: 4, fontSize: subtitleSize }}>
          Gérez vos appels audio, vidéo et de groupe
        </p>
      </div>

      {/* Onglets */}
      <div style={{ display: "flex", gap: 0, borderBottom: `2px solid ${borderColor}`, marginBottom: isMobile ? 16 : 24 }}>
        {[
          { id: "contacts", label: "Contacts", icon: <Phone size={isMobile ? 16 : 18} /> },
          { id: "historique", label: "Historique", icon: <Clock size={isMobile ? 16 : 18} /> },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: tabPadding,
              border: "none",
              background: "transparent",
              color: tab === t.id ? accent : textSecondary,
              fontWeight: tab === t.id ? 600 : 400,
              borderBottom: tab === t.id ? `3px solid ${accent}` : "3px solid transparent",
              cursor: "pointer",
              transition: "all 0.2s",
              fontSize: tabFontSize,
              whiteSpace: "nowrap",
            }}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
        {canCreateGroupCall && (
          <button
            onClick={() => setGroupCallMode(!groupCallMode)}
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: groupButtonPadding,
              background: groupCallMode ? accent : "transparent",
              color: groupCallMode ? "#FFF" : accent,
              border: `1px solid ${accent}`,
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: 600,
              fontSize: groupButtonFontSize,
              whiteSpace: "nowrap",
            }}
          >
            <Users size={isMobile ? 14 : 16} /> Appel de groupe
          </button>
        )}
      </div>

      {/* Mode appel de groupe */}
      {groupCallMode && (
        <div style={{
          background: cardBg,
          borderRadius: 16,
          padding: isMobile ? 14 : 20,
          marginBottom: isMobile ? 16 : 24,
          boxShadow: shadow,
          border: `1px solid ${borderColor}`,
        }}>
          <h3 style={{ marginTop: 0, color: textPrimary, fontSize: isMobile ? 18 : 20 }}>Nouvel appel de groupe</h3>
          <label style={{ display: "block", marginBottom: 6, color: textSecondary, fontSize: isMobile ? 14 : 16 }}>Groupe</label>
          <select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            style={{
              width: "100%",
              padding: selectPadding,
              borderRadius: 8,
              border: `1px solid ${borderColor}`,
              background: dark ? "#0F172A" : "#F9FAFB",
              color: textPrimary,
              marginBottom: 16,
              fontSize: selectFontSize,
            }}
          >
            <option value="">-- Choisir un groupe --</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.label}</option>
            ))}
          </select>

          <label style={{ display: "block", marginBottom: 6, color: textSecondary, fontSize: isMobile ? 14 : 16 }}>Participants</label>
          <div style={{ maxHeight: 200, overflowY: "auto", marginBottom: 16 }}>
            {visibleContacts.map((c) => (
              <label key={c._id} style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: isMobile ? "8px 6px" : "6px 8px",
                borderRadius: 6,
                cursor: "pointer",
                color: textPrimary,
                fontSize: isMobile ? 14 : 16,
              }}>
                <input
                  type="checkbox"
                  checked={selectedParticipants.includes(c._id)}
                  onChange={() => toggleParticipant(c._id)}
                  style={{ accentColor: accent, width: isMobile ? 18 : 16, height: isMobile ? 18 : 16 }}
                />
                {c.nom} ({c.role})
              </label>
            ))}
          </div>
          <button
            onClick={handleGroupCall}
            disabled={!selectedGroupId || selectedParticipants.length === 0}
            style={{
              width: "100%",
              padding: isMobile ? "12px 20px" : "10px 20px",
              background: accent,
              color: "white",
              border: "none",
              borderRadius: 8,
              fontWeight: 600,
              cursor: "pointer",
              opacity: !selectedGroupId || selectedParticipants.length === 0 ? 0.6 : 1,
              fontSize: isMobile ? 16 : 14,
            }}
          >
            Lancer l'appel de groupe
          </button>
        </div>
      )}

      {/* Contenu principal */}
      {tab === "contacts" ? (
        <div>
          {/* Barre de recherche */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: isMobile ? 12 : 16 }}>
            <Search size={isMobile ? 14 : 16} color={textSecondary} />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher un contact..."
              style={{
                flex: 1,
                padding: inputPadding,
                borderRadius: 8,
                border: `1px solid ${borderColor}`,
                background: dark ? "#0F172A" : "#F9FAFB",
                color: textPrimary,
                fontSize: inputFontSize,
                outline: "none",
              }}
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm("")} style={{ background: "none", border: "none", cursor: "pointer" }}>
                <X size={isMobile ? 14 : 16} color={textSecondary} />
              </button>
            )}
          </div>

          {visibleContacts.length === 0 ? (
            <div style={{
              background: cardBg,
              borderRadius: 16,
              padding: isMobile ? 32 : 48,
              textAlign: "center",
              boxShadow: shadow,
              color: textSecondary,
              border: `1px solid ${borderColor}`,
            }}>
              <Phone size={isMobile ? 28 : 32} style={{ marginBottom: 8 }} />
              <p style={{ fontSize: isMobile ? 14 : 16 }}>Aucun contact disponible</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? 6 : 8 }}>
              {visibleContacts.map((contact) => (
                <div
                  key={contact._id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: cardPadding,
                    background: cardBg,
                    borderRadius: 12,
                    border: `1px solid ${borderColor}`,
                    boxShadow: shadow,
                    transition: "box-shadow 0.15s, background-color 0.3s",
                    flexWrap: isMobile ? "wrap" : "nowrap",
                    gap: isMobile ? 8 : 0,
                  }}
                >
                  <div style={{ flex: 1, minWidth: isMobile ? "100%" : 0 }}>
                    <span style={{ fontWeight: 600, fontSize: contactNameSize, color: textPrimary }}>
                      {contact.nom}
                    </span>
                    <span style={{ color: textSecondary, fontSize: isMobile ? 12 : 13, marginLeft: 8 }}>
                      ({contact.role})
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: isMobile ? 6 : 8 }}>
                    <button
                      onClick={() => handleMessage(contact._id)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: textSecondary,
                        padding: isMobile ? 8 : 8,
                        borderRadius: 8,
                        transition: "background 0.15s",
                      }}
                      title={`Envoyer un message à ${contact.nom}`}
                      onMouseEnter={(e) => (e.currentTarget.style.background = hoverBg)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <MessageCircle size={isMobile ? 18 : 20} />
                    </button>
                    <button
                      onClick={() => handleCall(contact, "audio")}
                      style={{
                        padding: actionButtonPadding,
                        background: accent,
                        color: "#FFFFFF",
                        border: "none",
                        borderRadius: 8,
                        cursor: "pointer",
                        fontWeight: 600,
                        fontSize: actionButtonFontSize,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        boxShadow: buttonShadow,
                        transition: "background 0.2s",
                      }}
                      title="Appel audio"
                    >
                      <PhoneOutgoing size={isMobile ? 16 : 16} />
                    </button>
                    <button
                      onClick={() => handleCall(contact, "video")}
                      style={{
                        padding: actionButtonPadding,
                        background: accent,
                        color: "#FFFFFF",
                        border: "none",
                        borderRadius: 8,
                        cursor: "pointer",
                        fontWeight: 600,
                        fontSize: actionButtonFontSize,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        boxShadow: buttonShadow,
                        transition: "background 0.2s",
                      }}
                      title="Appel vidéo"
                    >
                      <Video size={isMobile ? 16 : 16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
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