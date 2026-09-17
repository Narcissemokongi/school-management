// src/components/AdminApp.jsx
import { useMemo, useCallback, useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { useNavigate, useLocation } from "react-router-dom";
import { api } from "@convex/_generated/api";
import { Layout } from "./Layout";
import { DashboardAdmin } from "./DashboardAdmin";
import { GestionElevesEtClasses } from "./GestionElevesEtClasses";
import { GestionFautesEtSanctions } from "./GestionFautesEtSanctions";
import { GestionUtilisateurs } from "./GestionUtilisateurs";
import { GestionEmploiDuTemps } from "./GestionEmploiDuTemps";
import { GestionExamens } from "./GestionExamens";
import { MessagerieApp } from "./messagerie/MessagerieApp";
import { GestionCoursEtNotes } from "./GestionCoursEtNotes";
import { GestionFrais } from "./GestionFrais";
import { GestionAudit } from "./GestionAudit";
import { Appels } from "./Appels";
import { Parametres } from "./Parametres";
import { Aide } from "./Aide";
import { MentionsLegales } from "./MentionsLegales";
import { PolitiqueConfidentialite } from "./PolitiqueConfidentialite";
import { AnneeSelector } from "./AnneeSelector";
import { ParentLinkRequests } from "./ParentLinkRequests";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  Home, Users, AlertTriangle, BookOpen, DollarSign, Shield,
  MessageCircle, Phone, ScrollText, Settings, HelpCircle,
  FileText, ClipboardList, Link2, Calendar, GraduationCap, User,
} from "lucide-react";
import { AccueilAdmin } from "./AccueilAdmin";
import { AssistantPassage } from "./AssistantPassage";

// ════════════════════════════════════════════════════════════════════
// CONSTANTES MODULE-LEVEL
// ════════════════════════════════════════════════════════════════════

// ✅ Extrait en constante module (évite allocation + recalcul à chaque render)
const TABS_WITH_ANNEE_SELECTOR = new Set([
  "accueil",
  "passage",
  "eleves-classes",
  "fautes",
  "cours-notes",
  "emploi-du-temps",
  "examens",
  "frais",
  "comptes",
]);

// ✅ Onglets valides (source de vérité pour la validation URL)
const VALID_ADMIN_TABS = [
  "accueil",
  "passage",
  "eleves-classes",
  "fautes",
  "cours-notes",
  "emploi-du-temps",
  "examens",
  "frais",
  "comptes",
  "liaisons-parents",
  "messagerie",
  "appels",
  "audit",
  "parametres",
  "mentions",
  "confidentialite",
  "aide",
];

const DEFAULT_ADMIN_TAB = "accueil";

// ════════════════════════════════════════════════════════════════════
// COMPOSANT
// ════════════════════════════════════════════════════════════════════

export function AdminApp({
  user,
  ecoleId,
  eleves,
  addEleve,
  removeEleve,
  importEleves,
  classes,
  addClasse,
  removeClasse,
  fautes,
  addFaute,
  updateFaute,
  removeFaute,
  sanctions,
  users,
  frais,
  anneeId,
  anneeActive,
  onAnneeChange,
  dark,
  toggle,
  handleLogout,
}) {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();

  const userId = user?._id;

  // ════════════════════════════════════════════════════════════════════
  // ✅ FIX PERF #1 — Tab lu depuis l'URL (source unique de vérité)
  // ════════════════════════════════════════════════════════════════════
  const tabFromUrl = useMemo(() => {
    const match = location.pathname.match(/^\/admin\/([^\/]+)/);
    const candidate = match ? match[1] : null;
    return candidate && VALID_ADMIN_TABS.includes(candidate) ? candidate : null;
  }, [location.pathname]);

  const tab = tabFromUrl || DEFAULT_ADMIN_TAB;

  // ════════════════════════════════════════════════════════════════════
  // ✅ FIX PERF #2 — navigateRef stable (évite re-création de setTab)
  // ════════════════════════════════════════════════════════════════════
  const navigateRef = useRef(navigate);
  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);

  // ✅ setTab avec référence 100% stable — jamais recréé
  const setTab = useCallback((newTab) => {
    if (VALID_ADMIN_TABS.includes(newTab)) {
      navigateRef.current(`/admin/${newTab}`);
    }
  }, []);

  // ════════════════════════════════════════════════════════════════════
  // ✅ FIX PERF #3 — Redirection UNE SEULE FOIS (guard par ref)
  // Évite la boucle navigate → re-render → navigate → ...
  // ════════════════════════════════════════════════════════════════════
  const hasRedirectedRef = useRef(false);
  useEffect(() => {
    if (!tabFromUrl && !hasRedirectedRef.current) {
      hasRedirectedRef.current = true;
      navigateRef.current(`/admin/${DEFAULT_ADMIN_TAB}`, { replace: true });
    }
  }, [tabFromUrl]);

  // ════════════════════════════════════════════════════════════════════
  // ✅ FIX PERF #4 — Args de query stables (évite re-fetch Convex)
  // ════════════════════════════════════════════════════════════════════
  const pendingUsersArgs = useMemo(
    () => (ecoleId && userId ? { ecoleId, userId } : "skip"),
    [ecoleId, userId]
  );

  const pendingUsersRaw = useQuery(api.users.listPendingUsers, pendingUsersArgs);
  const pendingUsers = useMemo(
    () => pendingUsersRaw ?? [],
    [pendingUsersRaw]
  );

  // ════════════════════════════════════════════════════════════════════
  // ✅ FIX — Navigation messagerie 100% URL
  //
  // AVANT : Zustand `messagingContactId` + setTab("messagerie")
  //         → URL = /admin/messagerie (liste seulement)
  //         → impossible de deep-linker vers une conversation
  //
  // APRÈS : navigation directe vers /admin/messagerie/chat/:userId
  //         → URL change, bouton retour navigateur fonctionne
  //         → MessagerieApp parse l'URL toute seule
  // ════════════════════════════════════════════════════════════════════
  const handleNavigateToMessaging = useCallback(
    (contactId) => {
      if (contactId) {
        navigateRef.current(`/admin/messagerie/chat/${contactId}`);
      } else {
        navigateRef.current("/admin/messagerie");
      }
    },
    []
  );

  // ✅ Menu mémoïsé
  const menu = useMemo(
    () => [
      { id: "accueil", label: "Tableau de bord", icon: <Home size={20} /> },
      { id: "passage", label: "Passage", icon: <ClipboardList size={20} /> },
      { id: "eleves-classes", label: "Scolarité", icon: <Users size={20} /> },
      { id: "fautes", label: "Discipline", icon: <AlertTriangle size={20} /> },
      { id: "cours-notes", label: "Évaluations", icon: <BookOpen size={20} /> },
      {
        id: "emploi-du-temps",
        label: "Emploi du temps",
        icon: <Calendar size={20} />,
      },
      {
        id: "examens",
        label: "Examens",
        icon: <GraduationCap size={20} />,
      },
      { id: "frais", label: "Finance", icon: <DollarSign size={20} /> },
      {
        id: "comptes",
        label: "Utilisateurs",
        icon: <Shield size={20} />,
        badge: pendingUsers.length > 0 ? pendingUsers.length : null,
      },
      {
        id: "liaisons-parents",
        label: "Liaisons parents",
        icon: <Link2 size={20} />,
      },
      { id: "messagerie", label: "Messages", icon: <MessageCircle size={20} /> },
      { id: "appels", label: "Appels", icon: <Phone size={20} /> },
      { id: "audit", label: "Audit", icon: <ScrollText size={20} /> },
      { id: "parametres", label: "Paramètres", icon: <Settings size={20} /> },
      { id: "mentions", label: "Mentions légales", icon: <FileText size={20} /> },
      {
        id: "confidentialite",
        label: "Confidentialité",
        icon: <Shield size={20} />,
      },
      { id: "aide", label: "Aide", icon: <HelpCircle size={20} /> },
    ],
    [pendingUsers.length]
  );

  // ════════════════════════════════════════════════════════════════════
  // GUARD : session invalide
  // ════════════════════════════════════════════════════════════════════
  if (!user || !userId) {
    return (
      <Layout
        menu={menu}
        activeTab={tab}
        onTabChange={setTab}
        user={user}
        dark={dark}
        onToggleTheme={toggle}
        onLogout={handleLogout}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            padding: isMobile ? "24px 16px" : "32px 24px",
            textAlign: "center",
          }}
        >
          <User
            size={isMobile ? 40 : 48}
            color="#F59E0B"
            style={{ marginBottom: 16 }}
          />
          <h2
            style={{
              fontSize: isMobile ? 20 : 24,
              fontWeight: 600,
              color: dark ? "#F1F5F9" : "#1E293B",
              margin: "0 0 8px",
            }}
          >
            Session invalide
          </h2>
          <p
            style={{
              color: dark ? "#94A3B8" : "#64748B",
              fontSize: isMobile ? 13 : 14,
            }}
          >
            Veuillez vous reconnecter.
          </p>
        </div>
      </Layout>
    );
  }

  // ════════════════════════════════════════════════════════════════════
  // RENDU CONTENU
  // ════════════════════════════════════════════════════════════════════
  const renderContent = () => {
    switch (tab) {
      case "accueil":
        return (
          <AccueilAdmin
            eleves={eleves}
            classes={classes}
            fautes={fautes}
            sanctions={sanctions}
            users={users}
            frais={frais}
            user={user}
            onNavigate={setTab}
          />
        );

      case "passage":
        return (
          <AssistantPassage
            ecoleId={ecoleId}
            anneeActiveId={anneeId}
            classes={classes}
            user={user}
          />
        );

      case "eleves-classes":
        return (
          <GestionElevesEtClasses
            eleves={eleves}
            addEleve={addEleve}
            removeEleve={removeEleve}
            importEleves={importEleves}
            classes={classes}
            addClasse={addClasse}
            removeClasse={removeClasse}
            ecoleId={ecoleId}
            user={user}
            anneeId={anneeId}
            anneeActive={anneeActive}
          />
        );

      case "fautes":
        return (
          <GestionFautesEtSanctions
            fautes={fautes}
            addFaute={addFaute}
            updateFaute={updateFaute}
            removeFaute={removeFaute}
            ecoleId={ecoleId}
            sanctions={sanctions}
            userId={userId}
            user={user}
          />
        );

      case "cours-notes":
        return (
          <GestionCoursEtNotes
            ecoleId={ecoleId}
            eleves={eleves}
            classes={classes}
            user={user}
            anneeId={anneeId}
            anneeActive={anneeActive}
          />
        );

      case "emploi-du-temps":
        return (
          <GestionEmploiDuTemps
            ecoleId={ecoleId}
            classes={classes}
            user={user}
            anneeId={anneeId}
            anneeActive={anneeActive}
          />
        );

      case "examens":
        return (
          <GestionExamens
            ecoleId={ecoleId}
            classes={classes}
            eleves={eleves}
            user={user}
            anneeId={anneeId}
            anneeActive={anneeActive}
          />
        );

      case "frais":
        return (
          <GestionFrais
            ecoleId={ecoleId}
            eleves={eleves}
            anneeId={anneeId}
            anneeActive={anneeActive}
            user={user}
          />
        );

      case "comptes":
        return <GestionUtilisateurs ecoleId={ecoleId} userId={userId} />;

      case "liaisons-parents":
        return <ParentLinkRequests user={user} />;

      // ✅ FIX — Plus de prop `initialSelectedUserId`, tout passe par l'URL
      case "messagerie":
        return <MessagerieApp user={user} ecoleId={ecoleId} />;

      case "appels":
        return (
          <Appels
            user={user}
            ecoleId={ecoleId}
            anneeId={anneeId}
            onNavigateToMessaging={handleNavigateToMessaging}
          />
        );

      case "audit":
        return <GestionAudit ecoleId={ecoleId} userId={userId} />;

      case "parametres":
        return <Parametres ecoleId={ecoleId} user={user} />;

      case "mentions":
        return <MentionsLegales />;

      case "confidentialite":
        return <PolitiqueConfidentialite />;

      case "aide":
        return <Aide user={user} />;

      default:
        return (
          <DashboardAdmin
            ecoleId={ecoleId}
            anneeId={anneeId}
            anneeActive={anneeActive}
            user={user}
          />
        );
    }
  };

  // ✅ Évite le `.includes()` sur array recréé
  const showAnneeSelector = TABS_WITH_ANNEE_SELECTOR.has(tab);

  // ════════════════════════════════════════════════════════════════════
  // RENDU PRINCIPAL
  // ════════════════════════════════════════════════════════════════════
  return (
    <Layout
      menu={menu}
      activeTab={tab}
      onTabChange={setTab}
      user={user}
      dark={dark}
      onToggleTheme={toggle}
      onLogout={handleLogout}
    >
      {showAnneeSelector && (
        <div
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            marginBottom: isMobile ? 12 : 16,
            width: "100%",
            display: "flex",
            justifyContent: isMobile ? "stretch" : "flex-end",
            alignItems: "center",
          }}
        >
          <AnneeSelector
            ecoleId={ecoleId}
            anneeId={anneeId}
            onAnneeChange={onAnneeChange}
            userId={userId}
          />
        </div>
      )}
      {renderContent()}
    </Layout>
  );
}