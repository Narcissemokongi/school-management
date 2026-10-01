// src/components/messagerie/MessagerieApp.jsx
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { useNavigate, useLocation } from "react-router-dom";
import { api } from "@convex/_generated/api";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import { MessageCircle, Loader } from "lucide-react";
import toast from "react-hot-toast";
import { MessageGroupe } from "./MessageGroupe";
import { ConversationList } from "./ConversationList";
import { PrivateChatView } from "./PrivateChatView";
import { GroupChatView } from "./GroupChatView";
import { MessagingHero } from "./MessagingHero";

// ════════════════════════════════════════════════════════════════════
// CONSTANTES
// ════════════════════════════════════════════════════════════════════
export const VIEW = {
  LIST: "list",
  NEW_CHAT: "newChat",
  CHAT: "chat",
  GROUP: "group",
  BROADCAST: "broadcast",
};

const ROLES_AUTORISES_DIFFUSION = ["admin", "directeur", "disciplinaire"];

// ════════════════════════════════════════════════════════════════════
// ✨ Détection prefers-reduced-motion
// ════════════════════════════════════════════════════════════════════
function getPrefersReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// ════════════════════════════════════════════════════════════════════
// Base URL dynamique selon le rôle
// ════════════════════════════════════════════════════════════════════
function getMessagerieBase(user) {
  const role = user?.role;
  if (!role) return "/admin/messagerie";

  if (role === "superAdmin" || (role === "admin" && !user?.ecoleId)) {
    return "/super-admin/messagerie";
  }

  const map = {
    admin: "/admin/messagerie",
    directeur: "/directeur/messagerie",
    comptable: "/comptable/messagerie",
    enseignant: "/enseignant/messagerie",
    eleve: "/eleve/messagerie",
    parent: "/parent/messagerie",
    disciplinaire: "/disciplinaire/messagerie",
  };

  return map[role] || "/admin/messagerie";
}

// ════════════════════════════════════════════════════════════════════
// Parse URL générique
// ════════════════════════════════════════════════════════════════════
function parseMessagerieUrl(pathname, base) {
  if (!pathname.startsWith(base)) {
    return { view: VIEW.LIST, userId: null, groupId: null };
  }

  const rest = pathname.slice(base.length).replace(/^\/+/, "");

  if (!rest) {
    return { view: VIEW.LIST, userId: null, groupId: null };
  }

  const [segment, ...restParts] = rest.split("/");
  const param = restParts.join("/") || null;

  switch (segment) {
    case "new":
      return { view: VIEW.NEW_CHAT, userId: null, groupId: null };
    case "chat":
      return { view: VIEW.CHAT, userId: param, groupId: null };
    case "group":
      return { view: VIEW.GROUP, userId: null, groupId: param };
    case "broadcast":
      return { view: VIEW.BROADCAST, userId: null, groupId: null };
    default:
      return { view: VIEW.LIST, userId: null, groupId: null };
  }
}

// ════════════════════════════════════════════════════════════════════
// KEYFRAMES module-level
// ════════════════════════════════════════════════════════════════════
const MessagerieKeyframes = (
  <style>{`
    @keyframes msg-spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
    .msg-spin { animation: msg-spin 0.9s linear infinite; }
    @media (prefers-reduced-motion: reduce) {
      .msg-spin { animation: none !important; }
    }
  `}</style>
);

// ════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ════════════════════════════════════════════════════════════════════
export function MessagerieApp({ user, ecoleId }) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();

  const userId = user?._id;

  // Base URL dérivée du rôle
  const MESSAGERIE_BASE = useMemo(() => getMessagerieBase(user), [user]);

  // Parse URL avec la base dynamique
  const parsed = useMemo(
    () => parseMessagerieUrl(location.pathname, MESSAGERIE_BASE),
    [location.pathname, MESSAGERIE_BASE]
  );
  const view = parsed.view;
  const selectedUserId = parsed.userId;
  const activeGroupId = parsed.groupId;

  // ✨ Reduced motion (une seule fois)
  const prefersReducedMotion = useMemo(
    () => getPrefersReducedMotion(),
    []
  );

  // ════════════════════════════════════════════════════════════════════
  // ÉTATS LOCAUX
  // ════════════════════════════════════════════════════════════════════
  const [nouveauMessage, setNouveauMessage] = useState("");
  const [piecesJointes, setPiecesJointes] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const prevMessagesCountRef = useRef(0);
  const uploadAbortRef = useRef(null); // ✨ AbortController pour upload

  // ════════════════════════════════════════════════════════════════════
  // ✨ Cleanup : annuler l'upload en cours au démontage
  // ════════════════════════════════════════════════════════════════════
  useEffect(() => {
    return () => {
      if (uploadAbortRef.current) {
        uploadAbortRef.current.abort();
      }
    };
  }, []);

  // ════════════════════════════════════════════════════════════════════
  // ARGS STABLES
  // ════════════════════════════════════════════════════════════════════
  const utilisateursArgs = useMemo(
    () => (ecoleId && userId ? { ecoleId, userId } : "skip"),
    [ecoleId, userId]
  );

  const messagesEnvoyesArgs = useMemo(
    () => (userId ? { expediteurId: userId, userId } : "skip"),
    [userId]
  );

  const messagesRecusArgs = useMemo(
    () => (userId ? { destinataireId: userId, userId } : "skip"),
    [userId]
  );

  const groupMessagesArgs = useMemo(
    () =>
      activeGroupId && ecoleId && userId
        ? { ecoleId, groupeId: activeGroupId, userId }
        : "skip",
    [activeGroupId, ecoleId, userId]
  );

  // ════════════════════════════════════════════════════════════════════
  // QUERIES
  // ════════════════════════════════════════════════════════════════════
  const utilisateursQuery = useQuery(api.users.listByEcole, utilisateursArgs);
  const messagesEnvoyesQuery = useQuery(
    api.messages.listEnvoyes,
    messagesEnvoyesArgs
  );
  const messagesRecusQuery = useQuery(
    api.messages.listRecus,
    messagesRecusArgs
  );
  const queryGroupMessages = useQuery(
    api.messages.listByGroupe,
    groupMessagesArgs
  );

  const utilisateurs = useMemo(
    () => utilisateursQuery ?? [],
    [utilisateursQuery]
  );
  const messagesEnvoyes = useMemo(
    () => messagesEnvoyesQuery ?? [],
    [messagesEnvoyesQuery]
  );
  const messagesRecus = useMemo(
    () => messagesRecusQuery ?? [],
    [messagesRecusQuery]
  );
  const groupMessages = useMemo(
    () => queryGroupMessages ?? [],
    [queryGroupMessages]
  );

  // ✨ Loading assoupli : on débloque dès que les 2 requêtes messages
  // sont prêtes. Les utilisateurs peuvent charger en arrière-plan (noms
  // affichés progressivement via ConversationList).
  const isLoading =
    messagesEnvoyesQuery === undefined ||
    messagesRecusQuery === undefined;

  // Map pour lookups O(1)
  const usersById = useMemo(() => {
    const m = new Map();
    utilisateurs.forEach((u) => {
      if (u?._id) m.set(u._id, u);
    });
    return m;
  }, [utilisateurs]);

  // ════════════════════════════════════════════════════════════════════
  // CONVERSATIONS
  // ════════════════════════════════════════════════════════════════════
  const conversations = useMemo(() => {
    const map = new Map();

    for (const m of messagesEnvoyes) {
      if (!m.destinataireId) continue;
      const existing = map.get(m.destinataireId);
      if (!existing || new Date(m.date) > new Date(existing.lastDate)) {
        map.set(m.destinataireId, {
          userId: m.destinataireId,
          lastDate: m.date,
          lastMessage: m.contenu || "(pièce jointe)",
          unreadCount: existing?.unreadCount || 0,
        });
      }
    }

    for (const m of messagesRecus) {
      if (!m.expediteurId) continue;
      const existing = map.get(m.expediteurId);
      const isNewer =
        !existing || new Date(m.date) > new Date(existing.lastDate);
      const unreadInc = !m.lu ? 1 : 0;

      map.set(m.expediteurId, {
        userId: m.expediteurId,
        lastDate: isNewer ? m.date : existing.lastDate,
        lastMessage: isNewer
          ? m.contenu || "(pièce jointe)"
          : existing.lastMessage,
        unreadCount: (existing?.unreadCount || 0) + unreadInc,
      });
    }

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.lastDate) - new Date(a.lastDate)
    );
  }, [messagesEnvoyes, messagesRecus]);

  const messagesConversation = useMemo(() => {
    if (!selectedUserId) return [];
    return [
      ...messagesEnvoyes.filter((m) => m.destinataireId === selectedUserId),
      ...messagesRecus.filter((m) => m.expediteurId === selectedUserId),
    ].sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [messagesEnvoyes, messagesRecus, selectedUserId]);

  // ════════════════════════════════════════════════════════════════════
  // MUTATIONS
  // ════════════════════════════════════════════════════════════════════
  const sendMessage = useMutation(api.messages.send);
  const markConversationAsRead = useMutation(
    api.messages.markConversationAsRead
  ); // ✨ NOUVELLE mutation batch
  const uploadFile = useMutation(api.messages.generateUploadUrl);
  const sendGroupMessage = useMutation(api.messages.sendToGroupe);
  const createCall = useMutation(api.appels.createCall);
  const getStorageUrlMutation = useMutation(api.messages.getStorageUrl);

  // ════════════════════════════════════════════════════════════════════
  // ✨ Helper toast (centralisé)
  // ════════════════════════════════════════════════════════════════════
  const toastError = useCallback((prefix, err) => {
    toast.error(`${prefix} : ${err?.message ?? "inconnue"}`);
  }, []);

  // ════════════════════════════════════════════════════════════════════
  // ✨ MARK AS READ — 1 mutation batch au lieu de N
  // ════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!selectedUserId || !userId) return;

    // On lance la mutation uniquement si au moins 1 message est non lu
    const hasUnread = messagesRecus.some(
      (m) => m.expediteurId === selectedUserId && !m.lu
    );
    if (!hasUnread) return;

    markConversationAsRead({ userId, expediteurId: selectedUserId }).catch(
      (err) => {
        // Silencieux : pas grave si le markAsRead échoue, on réessaiera
        console.warn("markConversationAsRead failed:", err);
      }
    );
  }, [
    selectedUserId,
    messagesRecus,
    markConversationAsRead,
    userId,
  ]);

  // ════════════════════════════════════════════════════════════════════
  // ✨ Scroll intelligent — ✨ FIX : utilise .closest() au lieu de 3× parent
  // ════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const currentCount = messagesConversation.length + groupMessages.length;
    const prevCount = prevMessagesCountRef.current;
    const hasNewMessages = currentCount > prevCount;
    prevMessagesCountRef.current = currentCount;

    if (!hasNewMessages) return;

    // ✨ FIX : robuste via classe CSS (au lieu de parentElement × 3)
    const container = messagesEndRef.current?.closest(
      ".pcv-messages, .gcv-messages"
    );

    if (container) {
      const distanceFromBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight;
      // Si l'utilisateur a scrollé vers le haut, on respecte sa position
      if (distanceFromBottom > 150) return;
    }

    const timeoutId = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "end",
      });
    }, 50);
    return () => clearTimeout(timeoutId);
  }, [messagesConversation, groupMessages, prefersReducedMotion]);

  // ════════════════════════════════════════════════════════════════════
  // GROUPES
  // ════════════════════════════════════════════════════════════════════
  const userClasse = user?.classe;
  const availableGroups = useMemo(() => {
    const groups = [];
    if (["eleve", "enseignant"].includes(user?.role) && userClasse) {
      groups.push({
        id: `classe_${userClasse}`,
        label: `Classe ${userClasse}`,
        icon: "GraduationCap",
      });
    }
    if (user?.role !== "parent") {
      groups.push({
        id: "ecole",
        label: "Toute l'école",
        icon: "Users",
      });
    }
    return groups;
  }, [user?.role, userClasse]);

  // ════════════════════════════════════════════════════════════════════
  // getUserName avec Map O(1)
  // ════════════════════════════════════════════════════════════════════
  const getUserName = useCallback(
    (uid) => {
      const u = usersById.get(uid);
      if (!u) return "Utilisateur inconnu";
      return `${u.nom ?? ""} ${u.postnom ?? ""}`.trim() || "Sans nom";
    },
    [usersById]
  );

  // ════════════════════════════════════════════════════════════════════
  // NAVIGATION
  // ════════════════════════════════════════════════════════════════════
  const openList = useCallback(
    () => navigate(MESSAGERIE_BASE),
    [navigate, MESSAGERIE_BASE]
  );
  const openNewChat = useCallback(
    () => navigate(`${MESSAGERIE_BASE}/new`),
    [navigate, MESSAGERIE_BASE]
  );
  const openChat = useCallback(
    (uid) => {
      if (uid) navigate(`${MESSAGERIE_BASE}/chat/${uid}`);
    },
    [navigate, MESSAGERIE_BASE]
  );
  const openGroup = useCallback(
    (gid) => {
      if (gid) navigate(`${MESSAGERIE_BASE}/group/${gid}`);
    },
    [navigate, MESSAGERIE_BASE]
  );
  const openBroadcast = useCallback(() => {
    if (ROLES_AUTORISES_DIFFUSION.includes(user?.role)) {
      navigate(`${MESSAGERIE_BASE}/broadcast`);
    } else {
      toast.error("Accès refusé");
    }
  }, [navigate, user?.role, MESSAGERIE_BASE]);

  const goBack = useCallback(() => {
    navigate(MESSAGERIE_BASE);
  }, [navigate, MESSAGERIE_BASE]);

  // ════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ════════════════════════════════════════════════════════════════════
  const handleSend = useCallback(async () => {
    if (!nouveauMessage.trim() && piecesJointes.length === 0) return;
    if (!selectedUserId) return;
    try {
      await sendMessage({
        ecoleId,
        expediteurId: userId,
        destinataireId: selectedUserId,
        contenu: nouveauMessage.trim() || "",
        piecesJointes: piecesJointes.length > 0 ? piecesJointes : undefined,
      });
      setNouveauMessage("");
      setPiecesJointes([]);
    } catch (err) {
      toastError("Erreur d'envoi", err);
    }
  }, [
    nouveauMessage,
    piecesJointes,
    selectedUserId,
    ecoleId,
    userId,
    sendMessage,
    toastError,
  ]);

  const handleSendGroupMessage = useCallback(
    async (message) => {
      if (!message.trim() || !activeGroupId) return;
      try {
        await sendGroupMessage({
          ecoleId,
          expediteurId: userId,
          contenu: message.trim(),
          groupeId: activeGroupId,
        });
      } catch (err) {
        toastError("Erreur", err);
      }
    },
    [ecoleId, userId, activeGroupId, sendGroupMessage, toastError]
  );

  // ════════════════════════════════════════════════════════════════════
  // ✨ FIX UPLOAD — AbortController + storageId + getStorageUrl
  // ════════════════════════════════════════════════════════════════════
  const handleFileChange = useCallback(
    async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // ✨ Annule l'upload précédent s'il y en a un en cours
      if (uploadAbortRef.current) {
        uploadAbortRef.current.abort();
      }
      uploadAbortRef.current = new AbortController();

      setIsUploading(true);
      try {
        // 1. Obtenir l'URL d'upload signée
        const uploadUrl = await uploadFile({ userId });

        // 2. POST du fichier (avec signal d'annulation)
        const result = await fetch(uploadUrl, {
          method: "POST",
          body: file,
          headers: { "Content-Type": file.type },
          signal: uploadAbortRef.current.signal,
        });
        if (!result.ok) throw new Error("Échec de l'upload");

        // 3. Récupérer le storageId retourné par Convex
        const { storageId } = await result.json();
        if (!storageId) throw new Error("storageId manquant");

        // 4. Convertir storageId → URL réelle
        const { url: realUrl } = await getStorageUrlMutation({
          storageId,
          userId,
        });

        // 5. Stocker
        setPiecesJointes((prev) => [
          ...prev,
          {
            nom: file.name,
            type: file.type,
            url: realUrl,
            storageId,
          },
        ]);
      } catch (err) {
        // ✨ Ignore silencieusement les AbortError
        if (err?.name === "AbortError") return;
        toastError("Erreur upload", err);
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
        uploadAbortRef.current = null;
      }
    },
    [uploadFile, getStorageUrlMutation, userId, toastError]
  );

  const handleCallUser = useCallback(
    async (contactId) => {
      if (!contactId) return;
      try {
        await createCall({
          calleeId: contactId,
          ecoleId,
          userId,
        });
        toast.success("Appel lancé…");
      } catch (err) {
        const msg = err?.message ?? "";
        toast.error(
          msg.includes("déjà en cours")
            ? "Un appel est déjà en cours avec ce contact."
            : `Erreur : ${msg}`
        );
      }
    },
    [ecoleId, userId, createCall]
  );

  // ════════════════════════════════════════════════════════════════════
  // NAVIGATE TO handler pour ConversationList
  // ════════════════════════════════════════════════════════════════════
  const handleNavigateTo = useCallback(
    (v, params) => {
      if (v === VIEW.CHAT) openChat(params?.userId);
      else if (v === VIEW.GROUP) openGroup(params?.groupId);
      else if (v === VIEW.NEW_CHAT) openNewChat();
      else if (v === VIEW.LIST) openList();
      else if (v === VIEW.BROADCAST) openBroadcast();
    },
    [openChat, openGroup, openNewChat, openList, openBroadcast]
  );

  // ════════════════════════════════════════════════════════════════════
  // ✨ Tokens pour MessagingHero (mémoïsé)
  // ════════════════════════════════════════════════════════════════════
  const heroTokens = useMemo(
    () => ({
      text: dark ? "#F1F5F9" : "#1E293B",
      textMuted: dark ? "#94A3B8" : "#64748B",
      surface: dark ? "#1E293B" : "#FFFFFF",
      primary: dark ? "#818CF8" : "#4F46E5",
      primaryHover: dark ? "#6366F1" : "#4338CA",
      primarySoft: dark ? "#312E81" : "#EEF2FF",
      groupBg: dark ? "#4C1D95" : "#EDE9FE",
      groupFg: dark ? "#C4B5FD" : "#6D28D9",
    }),
    [dark]
  );

  // ════════════════════════════════════════════════════════════════════
  // ✨ BROADCAST — redirect si accès refusé (au lieu de return null)
  // ════════════════════════════════════════════════════════════════════
  const broadcastUnauthorized = useMemo(
    () =>
      view === VIEW.BROADCAST &&
      !ROLES_AUTORISES_DIFFUSION.includes(user?.role),
    [view, user?.role]
  );

  useEffect(() => {
    if (broadcastUnauthorized) {
      toast.error("Accès refusé");
      navigate(MESSAGERIE_BASE, { replace: true });
    }
  }, [broadcastUnauthorized, navigate, MESSAGERIE_BASE]);

  if (view === VIEW.BROADCAST) {
    if (broadcastUnauthorized) return null;
    return (
      <>
        {MessagerieKeyframes}
        <MessageGroupe user={user} ecoleId={ecoleId} onBack={goBack} />
      </>
    );
  }

  const showList = !isMobile || view === VIEW.LIST || view === VIEW.NEW_CHAT;
  const showChat = view === VIEW.CHAT || view === VIEW.GROUP;

  // ════════════════════════════════════════════════════════════════════
  // RENDU : LOADING
  // ════════════════════════════════════════════════════════════════════
  if (isLoading) {
    return (
      <>
        {MessagerieKeyframes}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            height: "100%",
            minHeight: 300,
            background: dark ? "#0F172A" : "#F8FAFC",
          }}
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <Loader
            size={32}
            className="msg-spin"
            style={{ color: dark ? "#818CF8" : "#4F46E5" }}
          />
          <p
            style={{
              margin: 0,
              fontSize: 13,
              color: dark ? "#94A3B8" : "#64748B",
            }}
          >
            Chargement des conversations…
          </p>
        </div>
      </>
    );
  }

  // ════════════════════════════════════════════════════════════════════
  // RENDU PRINCIPAL
  // ════════════════════════════════════════════════════════════════════
  return (
    <>
      {MessagerieKeyframes}
      <div
        role="region"
        aria-label="Messagerie"
        style={{
          display: "flex",
          height: "100dvh",
          minHeight: "100dvh",
          flex: 1,
          overflow: "hidden",
          background: dark ? "#0F172A" : "#F8FAFC",
        }}
      >
        {showList && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: isMobile ? "100%" : 340,
              flexShrink: 0,
              minHeight: 0,
              height: "100%",
              borderRight: !isMobile
                ? `1px solid ${dark ? "#334155" : "#E2E8F0"}`
                : "none",
              overflow: "hidden",
            }}
          >
            <ConversationList
              user={user}
              utilisateurs={utilisateurs}
              conversations={conversations}
              availableGroups={availableGroups}
              selectedUserId={selectedUserId}
              activeGroupId={activeGroupId}
              navigateTo={handleNavigateTo}
              getUserName={getUserName}
              currentView={{ view }}
              isMobile={isMobile}
              goBack={goBack}
            />
          </div>
        )}

        {showChat && (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
              minWidth: 0,
              height: "100%",
              overflow: "hidden",
              position: "relative",
              background: dark ? "#0B1220" : "#F1F5F9",
            }}
          >
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
                selectedUserObject={usersById.get(selectedUserId)}
                messagesConversation={messagesConversation}
                user={user}
                nouveauMessage={nouveauMessage}
                setNouveauMessage={setNouveauMessage}
                piecesJointes={piecesJointes}
                setPiecesJointes={setPiecesJointes}
                handleSend={handleSend}
                handleFileChange={handleFileChange}
                fileInputRef={fileInputRef}
                isMobile={isMobile}
                goBack={goBack}
                handleCallUser={handleCallUser}
                selectedUserId={selectedUserId}
                messagesEndRef={messagesEndRef}
                isUploading={isUploading}
              />
            ) : (
              !isMobile && (
                <MessagingHero
                  icon={MessageCircle}
                  title="Sélectionnez une conversation"
                  description="Choisissez un contact ou un groupe dans la liste à gauche pour démarrer."
                  size="lg"
                  pulse
                  tokens={heroTokens}
                  isMobile={isMobile}
                />
              )
            )}
          </div>
        )}
      </div>
    </>
  );
}