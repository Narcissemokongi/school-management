import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import { MessageCircle, Loader } from "lucide-react";
import toast from "react-hot-toast";
import { MessageGroupe } from "./MessageGroupe";
import { ConversationList } from "./ConversationList";
import { PrivateChatView } from "./PrivateChatView";
import { GroupChatView } from "./GroupChatView";

export const VIEW = {
  LIST: "list",
  NEW_CHAT: "newChat",
  CHAT: "chat",
  GROUP: "group",
  BROADCAST: "broadcast",
};

const ROLES_AUTORISES_DIFFUSION = ["admin", "directeur", "disciplinaire"];

export function MessagerieApp({ user, ecoleId, initialSelectedUserId }) {
  const { S, dark } = useStyles();
  const isMobile = useIsMobile();

  // États
  const [view, setView] = useState(initialSelectedUserId ? VIEW.CHAT : VIEW.LIST);
  const [selectedUserId, setSelectedUserId] = useState(initialSelectedUserId || null);
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [nouveauMessage, setNouveauMessage] = useState("");
  const [piecesJointes, setPiecesJointes] = useState([]);
  const [lien, setLien] = useState("");
  const [groupMessages, setGroupMessages] = useState([]);
  const [isUploading, setIsUploading] = useState(false); // État d'upload

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Données
  const utilisateursQuery = useQuery(api.users.listByEcole, ecoleId ? { ecoleId } : "skip");
  const messagesEnvoyesQuery = useQuery(api.messages.listEnvoyes, { expediteurId: user._id });
  const messagesRecusQuery = useQuery(api.messages.listRecus, { destinataireId: user._id });
  const queryGroupMessages = useQuery(
    api.messages.listByGroupe,
    activeGroupId ? { ecoleId, groupeId: activeGroupId } : "skip"
  );

  const utilisateurs = utilisateursQuery ?? [];
  const messagesEnvoyes = messagesEnvoyesQuery ?? [];
  const messagesRecus = messagesRecusQuery ?? [];
  const isLoading = utilisateursQuery === undefined || messagesEnvoyesQuery === undefined || messagesRecusQuery === undefined;

  // Synchroniser les messages de groupe
  useEffect(() => {
    if (queryGroupMessages) {
      setGroupMessages(queryGroupMessages);
    }
  }, [queryGroupMessages]);

  // Conversations dérivées
  const conversations = useMemo(() => {
    const convs = [];
    const userIdsSet = new Set();
    for (const m of messagesEnvoyes) {
      if (m.destinataireId && !userIdsSet.has(m.destinataireId)) {
        userIdsSet.add(m.destinataireId);
        convs.push({ userId: m.destinataireId, lastDate: m.date });
      }
    }
    for (const m of messagesRecus) {
      if (m.expediteurId && !userIdsSet.has(m.expediteurId)) {
        userIdsSet.add(m.expediteurId);
        convs.push({ userId: m.expediteurId, lastDate: m.date });
      }
    }
    return convs.sort((a, b) => new Date(b.lastDate) - new Date(a.lastDate));
  }, [messagesEnvoyes, messagesRecus]);

  const messagesConversation = useMemo(() => {
    if (!selectedUserId) return [];
    return [
      ...messagesEnvoyes.filter((m) => m.destinataireId === selectedUserId),
      ...messagesRecus.filter((m) => m.expediteurId === selectedUserId),
    ].sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [messagesEnvoyes, messagesRecus, selectedUserId]);

  // Mutations
  const sendMessage = useMutation(api.messages.send);
  const markAsRead = useMutation(api.messages.markAsRead);
  const uploadFile = useMutation(api.messages.generateUploadUrl);
  const sendGroupMessage = useMutation(api.messages.sendToGroupe);
  const createCall = useMutation(api.appels.createCall);

  // Marquage comme lu
  useEffect(() => {
    if (selectedUserId) {
      messagesRecus
        .filter((m) => m.expediteurId === selectedUserId && !m.lu)
        .forEach((m) => markAsRead({ messageId: m._id }));
    }
  }, [selectedUserId, messagesRecus, markAsRead]);

  // Scroll automatique
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesConversation, groupMessages]);

  // Groupes disponibles
  const userClasse = user.classe;
  const availableGroups = useMemo(() => {
    const groups = [];
    if (["eleve", "enseignant"].includes(user.role) && userClasse) {
      groups.push({
        id: `classe_${userClasse}`,
        label: `Classe ${userClasse}`,
        icon: "GraduationCap",
      });
    }
    if (user.role !== "parent") {
      groups.push({
        id: "ecole",
        label: "Toute l'école",
        icon: "Users",
      });
    }
    return groups;
  }, [user.role, userClasse]);

  // Navigation
  const openChat = (userId) => {
    setSelectedUserId(userId);
    setActiveGroupId(null);
    setView(VIEW.CHAT);
  };

  const openGroup = (groupId) => {
    setActiveGroupId(groupId);
    setSelectedUserId(null);
    setView(VIEW.GROUP);
  };

  const openNewChat = () => setView(VIEW.NEW_CHAT);
  const openList = () => setView(VIEW.LIST);
  const openBroadcast = () => {
    if (ROLES_AUTORISES_DIFFUSION.includes(user.role)) {
      setView(VIEW.BROADCAST);
    } else {
      toast.error("Accès refusé");
    }
  };

  const goBack = () => {
    // Fermer le clavier sur mobile
    if (isMobile && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    if (view === VIEW.CHAT) {
      setSelectedUserId(null);
      setView(VIEW.LIST);
    } else if (view === VIEW.GROUP) {
      setActiveGroupId(null);
      setView(VIEW.LIST);
    } else if (view === VIEW.NEW_CHAT) {
      setView(VIEW.LIST);
    } else if (view === VIEW.BROADCAST) {
      setView(VIEW.LIST);
    }
  };

  // Handlers d'envoi
  const handleSend = async () => {
    if (!nouveauMessage.trim() && piecesJointes.length === 0) return;
    if (!selectedUserId) return;
    try {
      await sendMessage({
        ecoleId,
        expediteurId: user._id,
        destinataireId: selectedUserId,
        contenu: nouveauMessage.trim() || "",
        piecesJointes: piecesJointes.length > 0 ? piecesJointes : undefined,
      });
      setNouveauMessage("");
      setPiecesJointes([]);
      setLien("");
    } catch (err) {
      toast.error("Erreur d'envoi : " + err.message);
    }
  };

  const handleSendGroupMessage = async (message) => {
    if (!message.trim() || !activeGroupId) return;
    try {
      await sendGroupMessage({
        ecoleId,
        expediteurId: user._id,
        contenu: message.trim(),
        groupeId: activeGroupId,
      });
    } catch (err) {
      toast.error("Erreur : " + err.message);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const uploadUrl = await uploadFile({});
      const result = await fetch(uploadUrl, {
        method: "POST",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!result.ok) throw new Error("Échec de l'upload");
      const publicUrl = uploadUrl.split("?")[0];
      setPiecesJointes((prev) => [...prev, { nom: file.name, type: file.type, url: publicUrl }]);
    } catch (err) {
      toast.error("Erreur upload : " + err.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleAddLink = () => {
    if (lien.trim()) {
      setNouveauMessage((prev) => prev + " " + lien.trim());
      setLien("");
    }
  };

  const handleCallUser = async (contactId) => {
    try {
      await createCall({
        calleeId: contactId,
        ecoleId,
        anneeId: user.anneeId,
        userId: user._id,
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

  const getUserName = (userId) => {
    const u = utilisateurs.find((u) => u._id === userId);
    return u ? `${u.nom} ${u.postnom || ""}` : "Utilisateur inconnu";
  };

  // Rendu
  if (view === VIEW.BROADCAST) {
    if (!ROLES_AUTORISES_DIFFUSION.includes(user.role)) {
      return null;
    }
    return <MessageGroupe user={user} ecoleId={ecoleId} onBack={goBack} />;
  }

  const showList = !isMobile || view === VIEW.LIST || view === VIEW.NEW_CHAT;
  const showChat = view === VIEW.CHAT || view === VIEW.GROUP;

  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
        <Loader size={32} className="animate-spin" />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "100%", flex: 1, background: dark ? "#0F172A" : "#F8FAFC" }}>
      {showList && (
        <ConversationList
          user={user}
          utilisateurs={utilisateurs}
          conversations={conversations}
          availableGroups={availableGroups}
          selectedUserId={selectedUserId}
          activeGroupId={activeGroupId}
          navigateTo={(view, params) => {
            if (view === VIEW.CHAT) openChat(params.userId);
            else if (view === VIEW.GROUP) openGroup(params.groupId);
            else if (view === VIEW.NEW_CHAT) openNewChat();
            else if (view === VIEW.LIST) openList();
            else if (view === VIEW.BROADCAST) openBroadcast();
          }}
          getUserName={getUserName}
          currentView={{ view }}
          isMobile={isMobile}
          goBack={goBack}
        />
      )}

      {showChat && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          {activeGroupId ? (
            <GroupChatView
              groupId={activeGroupId}
              groupMessages={groupMessages}
              availableGroups={availableGroups}
              user={user}
              goBack={goBack}
              isMobile={isMobile}
              onSendMessage={handleSendGroupMessage}
              getUserName={getUserName}
              messagesEndRef={messagesEndRef}
            />
          ) : selectedUserId ? (
            <PrivateChatView
              selectedUser={getUserName(selectedUserId)}
              messagesConversation={messagesConversation}
              user={user}
              nouveauMessage={nouveauMessage}
              setNouveauMessage={setNouveauMessage}
              piecesJointes={piecesJointes}
              setPiecesJointes={setPiecesJointes}
              lien={lien}
              setLien={setLien}
              handleSend={handleSend}
              handleFileChange={handleFileChange}
              handleAddLink={handleAddLink}
              fileInputRef={fileInputRef}
              isMobile={isMobile}
              goBack={goBack}
              handleCallUser={handleCallUser}
              selectedUserId={selectedUserId}
              messagesEndRef={messagesEndRef}
              isUploading={isUploading} // transmettre l'état d'upload
            />
          ) : (
            !isMobile && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: dark ? "#94A3B8" : "#64748B" }}>
                <MessageCircle size={48} style={{ marginBottom: 12 }} />
                <p>Sélectionnez une conversation</p>
              </div>
            )
          )}
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .animate-spin { animation: spin 1s linear infinite; }`}</style>
    </div>
  );
}