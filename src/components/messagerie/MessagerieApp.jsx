import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useStyles } from "../../components/ThemeProvider";
import { useIsMobile } from "../../hooks/useIsMobile";
import { MessageCircle, Send } from "lucide-react";
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

export function MessagerieApp({ user, ecoleId, initialSelectedUserId }) {
  const { S, dark } = useStyles();
  const isMobile = useIsMobile();

  // Pile de navigation
  const [history, setHistory] = useState(() => [
    initialSelectedUserId
      ? { view: VIEW.CHAT, userId: initialSelectedUserId }
      : { view: VIEW.LIST }
  ]);

  const currentView = history[history.length - 1];
  const selectedUserId = currentView?.view === VIEW.CHAT ? currentView.userId : null;
  const activeGroupId = currentView?.view === VIEW.GROUP ? currentView.groupId : null;

  // État local pour les messages de groupe
  const [groupMessages, setGroupMessages] = useState([]);
  const [nouveauMessage, setNouveauMessage] = useState("");
  const [piecesJointes, setPiecesJointes] = useState([]);
  const [lien, setLien] = useState("");
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Données
  const utilisateurs = useQuery(api.users.listByEcole, { ecoleId }) ?? [];
  const messagesEnvoyes = useQuery(api.messages.listEnvoyes, { expediteurId: user._id }) ?? [];
  const messagesRecus = useQuery(api.messages.listRecus, { destinataireId: user._id }) ?? [];

  // Conversations privées
  const conversations = useMemo(() => {
    const convs = [];
    const userIdsSet = new Set();
    for (const m of messagesEnvoyes) {
      if (!userIdsSet.has(m.destinataireId)) {
        userIdsSet.add(m.destinataireId);
        convs.push({ userId: m.destinataireId, lastDate: m.date });
      }
    }
    for (const m of messagesRecus) {
      if (!userIdsSet.has(m.expediteurId)) {
        userIdsSet.add(m.expediteurId);
        convs.push({ userId: m.expediteurId, lastDate: m.date });
      }
    }
    return convs.sort((a, b) => new Date(b.lastDate) - new Date(a.lastDate));
  }, [messagesEnvoyes, messagesRecus]);

  const messagesConversation = useMemo(() =>
    selectedUserId
      ? [
          ...messagesEnvoyes.filter((m) => m.destinataireId === selectedUserId),
          ...messagesRecus.filter((m) => m.expediteurId === selectedUserId),
        ].sort((a, b) => new Date(a.date) - new Date(b.date))
      : [],
    [messagesEnvoyes, messagesRecus, selectedUserId]
  );

  // Mutations
  const sendMessage = useMutation(api.messages.send);
  const markAsRead = useMutation(api.messages.markAsRead);
  const uploadFile = useMutation(api.messages.generateUploadUrl);
  const sendGroupMessage = useMutation(api.messages.sendToGroupe);
  const createCall = useMutation(api.appels.createCall);

  // Messages du groupe actif
  const queryGroupMessages = useQuery(
    api.messages.listByGroupe,
    activeGroupId ? { ecoleId, groupeId: activeGroupId } : "skip"
  );
  useEffect(() => {
    if (queryGroupMessages) setGroupMessages(queryGroupMessages);
  }, [queryGroupMessages]);

  // Marquage comme lu
  useEffect(() => {
    if (selectedUserId) {
      messagesRecus
        .filter((m) => m.expediteurId === selectedUserId && !m.lu)
        .forEach((m) => markAsRead({ messageId: m._id }));
    }
  }, [selectedUserId, messagesRecus]);

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
  const navigateTo = useCallback((view, params = {}) => {
    setHistory((prev) => [...prev, { view, ...params }]);
  }, []);

  const goBack = useCallback(() => {
    setHistory((prev) => {
      if (prev.length <= 1) return prev;
      return prev.slice(0, -1);
    });
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      if (history.length > 1) goBack();
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [history, goBack]);

  useEffect(() => {
    window.history.pushState(null, "", window.location.href);
  }, [history]);

  // Handlers
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
      await createCall({ calleeId: contactId, ecoleId, anneeId: user.anneeId, userId: user._id });
      toast.success("Appel lancé...");
    } catch (err) {
      toast.error(err.message.includes("déjà en cours")
        ? "Un appel est déjà en cours avec ce contact."
        : `Erreur : ${err.message}`);
    }
  };

  const getUserName = (userId) => {
    const u = utilisateurs.find((u) => u._id === userId);
    return u ? u.nom : "Utilisateur inconnu";
  };

  // Rendu conditionnel
  if (currentView.view === VIEW.BROADCAST) {
    return <MessageGroupe user={user} ecoleId={ecoleId} onBack={goBack} />;
  }

  const showChatColumn = currentView.view === VIEW.CHAT || currentView.view === VIEW.GROUP;
  const showListColumn = !isMobile || currentView.view === VIEW.LIST || currentView.view === VIEW.NEW_CHAT;

  return (
    <div style={{ display: "flex", height: "100%", flex: 1, position: "relative" }}>
      {showListColumn && (
        <ConversationList
          user={user}
          utilisateurs={utilisateurs}
          conversations={conversations}
          availableGroups={availableGroups}
          messagesEnvoyes={messagesEnvoyes}
          messagesRecus={messagesRecus}
          selectedUserId={selectedUserId}
          activeGroupId={activeGroupId}
          navigateTo={navigateTo}
          getUserName={getUserName}
          S={S}
          dark={dark}
          currentView={currentView}
          isMobile={isMobile}
          goBack={goBack}
        />
      )}

      {(!isMobile || showChatColumn) && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", minWidth: 0 }}>
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
              S={S}
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
              S={S}
              messagesEndRef={messagesEndRef}
            />
          ) : (
            !isMobile && (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: S.textMuted, fontSize: 16 }}>
                <MessageCircle size={48} style={{ marginBottom: 12 }} />
                <p>Sélectionnez une conversation ou un groupe</p>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}