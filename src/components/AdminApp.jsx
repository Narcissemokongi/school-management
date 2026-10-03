// src/components/AdminApp.jsx
import { useMemo, useCallback, useEffect, useRef, lazy, Suspense } from "react";
import { useQuery } from "convex/react";
import { useNavigate, useLocation } from "react-router-dom";
import { api } from "@convex/_generated/api";
import { Layout } from "./Layout";
// ✨ Écrans lazy-loaded — chaque onglet devient un chunk séparé (gain ~300 KB)
const DashboardAdmin = lazy(() =>
  import("./DashboardAdmin").then((m) => ({ default: m.DashboardAdmin }))
);
const GestionElevesEtClasses = lazy(() =>
  import("./GestionElevesEtClasses").then((m) => ({
    default: m.GestionElevesEtClasses,
  }))
);
const GestionFautesEtSanctions = lazy(() =>
  import("./GestionFautesEtSanctions").then((m) => ({
    default: m.GestionFautesEtSanctions,
  }))
);
const GestionUtilisateurs = lazy(() =>
  import("./GestionUtilisateurs").then((m) => ({
    default: m.GestionUtilisateurs,
  }))
);
const GestionEmploiDuTemps = lazy(() =>
  import("./GestionEmploiDuTemps").then((m) => ({
    default: m.GestionEmploiDuTemps,
  }))
);
const GestionExamens = lazy(() =>
  import("./GestionExamens").then((m) => ({ default: m.GestionExamens }))
);
const MessagerieApp = lazy(() =>
  import("./messagerie/MessagerieApp").then((m) => ({
    default: m.MessagerieApp,
  }))
);
const GestionCoursEtNotes = lazy(() =>
  import("./GestionCoursEtNotes").then((m) => ({
    default: m.GestionCoursEtNotes,
  }))
);
const GestionFrais = lazy(() =>
  import("./GestionFrais").then((m) => ({ default: m.GestionFrais }))
);
const GestionAudit = lazy(() =>
  import("./GestionAudit").then((m) => ({ default: m.GestionAudit }))
);
const Appels = lazy(() =>
  import("./Appels").then((m) => ({ default: m.Appels }))
);
const Parametres = lazy(() =>
  import("./Parametres").then((m) => ({ default: m.Parametres }))
);
const Aide = lazy(() => import("./Aide").then((m) => ({ default: m.Aide })));
const MentionsLegales = lazy(() =>
  import("./MentionsLegales").then((m) => ({ default: m.MentionsLegales }))
);
const PolitiqueConfidentialite = lazy(() =>
  import("./PolitiqueConfidentialite").then((m) => ({
    default: m.PolitiqueConfidentialite,
  }))
);
const ParentLinkRequests = lazy(() =>
  import("./ParentLinkRequests").then((m) => ({
    default: m.ParentLinkRequests,
  }))
);
const AccueilAdmin = lazy(() =>
  import("./AccueilAdmin").then((m) => ({ default: m.AccueilAdmin }))
);
const AssistantPassage = lazy(() =>
  import("./AssistantPassage").then((m) => ({ default: m.AssistantPassage }))
);

import { AnneeSelector } from "./AnneeSelector";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  Home, Users, AlertTriangle, BookOpen, DollarSign, Shield,
  MessageCircle, Phone, ScrollText, Settings, HelpCircle,
  FileText, ClipboardList, Link2, Calendar, GraduationCap, User,
  Loader2,
} from "lucide-react";

// ════════════════════════════════════════════════════════════════════
// LOADER — fallback Suspense pour les onglets lazy-loaded
// ════════════════════════════════════════════════════════════════════
function TabLoader({ dark }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      style={{
        minHeight: 320,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        padding: 40,
      }}
    >
      <Loader2
        size={32}
        className="aa-spin"
        style={{ color: dark ? "#818CF8" : "#4F46E5" }}
        aria-hidden="true"
      />
      <span
        style={{
          color: dark ? "#94A3B8" : "#64748B",
          fontSize: 13,
          fontWeight: 500,
        }}
      >
        Chargement…
      </span>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// CONSTANTES MODULE-LEVEL
// ════════════════════════════════════════════════════════════════════

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

const TABS_FULL_HEIGHT = ["messagerie", "appels"];

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
  // Tab lu depuis l'URL
  // ════════════════════════════════════════════════════════════════════
  const tabFromUrl = useMemo(() => {
    const match = location.pathname.match(/^\/admin\/([^\/]+)/);
    const candidate = match ? match[1] : null;
    return candidate && VALID_ADMIN_TABS.includes(candidate) ? candidate : null;
  }, [location.pathname]);

  const tab = tabFromUrl || DEFAULT_ADMIN_TAB;

  // ════════════════════════════════════════════════════════════════════
  // navigateRef stable
  // ════════════════════════════════════════════════════════════════════
  const navigateRef = useRef(navigate);
  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);

  const setTab = useCallback((newTab) => {
    if (VALID_ADMIN_TABS.includes(newTab)) {
      navigateRef.current(`/admin/${newTab}`);
    }
  }, []);

  // ════════════════════════════════════════════════════════════════════
  // Redirection UNE SEULE FOIS
  // ════════════════════════════════════════════════════════════════════
  const hasRedirectedRef = useRef(false);
  useEffect(() => {
    if (!tabFromUrl && !hasRedirectedRef.current) {
      hasRedirectedRef.current = true;
      navigateRef.current(`/admin/${DEFAULT_ADMIN_TAB}`, { replace: true });
    }
  }, [tabFromUrl]);

  // ════════════════════════════════════════════════════════════════════
  // Args de query stables
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
  // Navigation messagerie 100% URL
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
  // RENDU CONTENU (chaque écran est lazy-loaded)
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

  const showAnneeSelector = TABS_WITH_ANNEE_SELECTOR.has(tab);
  const needsFullHeight = TABS_FULL_HEIGHT.includes(tab);

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
      {/* ✨ Wrapper full-height conditionnel */}
      <div
        style={
          needsFullHeight
            ? {
                display: "flex",
                flexDirection: "column",
                flex: 1,
                minHeight: 0,
                height: "100%",
                width: "100%",
                overflow: "hidden",
              }
            : undefined
        }
      >
        {/* Sélecteur d'année : masqué sur les onglets full-height */}
        {showAnneeSelector && !needsFullHeight && (
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

        {/* ✨ Suspense : chaque écran lazy-loaded avec son propre chunk */}
        <Suspense fallback={<TabLoader dark={dark} />}>
          {renderContent()}
        </Suspense>
      </div>
    </Layout>
  );
}