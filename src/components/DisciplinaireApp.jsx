// src/components/DisciplinaireApp.jsx
import { useMemo, useCallback, lazy, Suspense } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Layout } from "./Layout";
import { Skeleton } from "./Skeleton";
// ✨ Écrans lazy-loaded — chaque onglet devient un chunk séparé (gain ~25 KB)
const ProfilUtilisateur = lazy(() =>
  import("./ProfilUtilisateur").then((m) => ({
    default: m.ProfilUtilisateur,
  }))
);
const AccueilDisciplinaire = lazy(() =>
  import("./AccueilDisciplinaire").then((m) => ({
    default: m.AccueilDisciplinaire,
  }))
);
const SaisirPunition = lazy(() =>
  import("./SaisirPunition").then((m) => ({ default: m.SaisirPunition }))
);
const HistoriqueDisciplinaire = lazy(() =>
  import("./HistoriqueDisciplinaire").then((m) => ({
    default: m.HistoriqueDisciplinaire,
  }))
);
const SaisirAbsence = lazy(() =>
  import("./SaisirAbsence").then((m) => ({ default: m.SaisirAbsence }))
);
const MessagerieApp = lazy(() =>
  import("./messagerie/MessagerieApp").then((m) => ({
    default: m.MessagerieApp,
  }))
);
const Appels = lazy(() =>
  import("./Appels").then((m) => ({ default: m.Appels }))
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

import { useAppStore } from "@/store/appStore";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  Home, Pen, ClipboardList, AlertTriangle, MessageCircle, Phone, User,
  HelpCircle, FileText, Shield, Calendar, Loader2,
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
        minHeight: 280,
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
        className="da-spin"
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
// KEYFRAMES
// ════════════════════════════════════════════════════════════════════
const DisciplinaireAppKeyframes = (
  <style>{`
    @keyframes da-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .da-spin { animation: da-spin 1s linear infinite; }
    @media (prefers-reduced-motion: reduce) {
      .da-spin { animation: none !important; }
    }
  `}</style>
);

// ════════════════════════════════════════════════════════════════════
// CONSTANTES
// ════════════════════════════════════════════════════════════════════
const TABS_REQUIRING_YEAR = ["saisir", "absences"];

const VALID_TABS = [
  "accueil", "saisir", "historique", "absences", "messagerie",
  "appels", "profil", "aide", "mentions", "confidentialite",
];

const TABS_FULL_HEIGHT = ["messagerie", "appels"];

// ════════════════════════════════════════════════════════════════════
// COMPOSANT
// ════════════════════════════════════════════════════════════════════
export function DisciplinaireApp({
  user,
  ecoleId,
  punitions,
  eleves,
  fautes,
  sanctions,
  onNotif,
  anneeActive,
  anneeId,
  dark,
  toggle,
  handleLogout,
}) {
  const isMobile = useIsMobile();

  const navigate = useNavigate();
  const location = useLocation();

  const tab = useMemo(() => {
    const parts = location.pathname.split("/").filter(Boolean);
    const candidate = parts[1];
    return VALID_TABS.includes(candidate) ? candidate : "accueil";
  }, [location.pathname]);

  const setTab = useCallback(
    (newTab) => {
      if (VALID_TABS.includes(newTab)) {
        navigate(`/disciplinaire/${newTab}`);
      }
    },
    [navigate]
  );

  const setMessagingContactId = useAppStore(
    (state) => state.setMessagingContactId
  );

  const handleNavigateToMessaging = useCallback(
    (contactId) => {
      setMessagingContactId(contactId);
      if (contactId) {
        navigate(`/disciplinaire/messagerie/chat/${contactId}`);
      } else {
        navigate("/disciplinaire/messagerie");
      }
    },
    [setMessagingContactId, navigate]
  );

  const nbPunitions = useMemo(() => punitions?.length ?? 0, [punitions]);

  const loading =
    punitions === undefined || eleves === undefined || fautes === undefined;

  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const warning = "#F59E0B";
  const warningBg = dark ? "#78350F" : "#FEF3C7";
  const warningText = dark ? "#FBBF24" : "#92400E";

  const tabNeedsYear = TABS_REQUIRING_YEAR.includes(tab);
  const showBanner = !anneeId && !tabNeedsYear;

  const menu = useMemo(
    () => [
      { id: "accueil", label: "Tableau de bord", icon: <Home size={20} /> },
      { id: "saisir", label: "Saisir une punition", icon: <Pen size={20} /> },
      {
        id: "historique",
        label: "Historique",
        icon: <ClipboardList size={20} />,
        badge: nbPunitions > 0 ? nbPunitions : null,
      },
      { id: "absences", label: "Absences", icon: <AlertTriangle size={20} /> },
      { id: "messagerie", label: "Messages", icon: <MessageCircle size={20} /> },
      { id: "appels", label: "Appels", icon: <Phone size={20} /> },
      { id: "profil", label: "Profil", icon: <User size={20} /> },
      { id: "aide", label: "Aide", icon: <HelpCircle size={20} /> },
      { id: "mentions", label: "Mentions légales", icon: <FileText size={20} /> },
      { id: "confidentialite", label: "Confidentialité", icon: <Shield size={20} /> },
    ],
    [nbPunitions]
  );

  // ─── GUARD : session invalide ───
  if (!user) {
    return (
      <Layout
        menu={menu}
        activeTab="accueil"
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
            padding: isMobile ? "10px 8px" : "20px 16px",
          }}
        >
          <Skeleton height={200} />
        </div>
      </Layout>
    );
  }

  // ─── LOADING ───
  if (loading) {
    return (
      <Layout
        menu={menu}
        activeTab="accueil"
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
            padding: isMobile ? "10px 8px" : "20px 16px",
          }}
        >
          <Skeleton height={200} />
          <Skeleton height={200} style={{ marginTop: 16 }} />
        </div>
      </Layout>
    );
  }

  // ─── RENDU CONTENU ───
  const renderContent = () => {
    if (!anneeId && tabNeedsYear) {
      return (
        <div
          style={{
            maxWidth: 520,
            margin: "0 auto",
            padding: isMobile ? "40px 16px" : "60px 24px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: warningBg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <Calendar size={30} color={warning} aria-hidden="true" />
          </div>
          <h2
            style={{
              fontSize: isMobile ? 17 : 20,
              fontWeight: 700,
              color: textPrimary,
              margin: "0 0 6px",
            }}
          >
            Aucune année scolaire active
          </h2>
          <p
            style={{
              color: textSecondary,
              fontSize: isMobile ? 13 : 14,
              margin: 0,
              maxWidth: 400,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            Veuillez demander à l'administrateur d'activer une année scolaire
            pour pouvoir saisir des punitions ou absences.
          </p>
        </div>
      );
    }

    switch (tab) {
      case "accueil":
        return (
          <AccueilDisciplinaire
            user={user}
            punitions={punitions}
            eleves={eleves}
          />
        );

      case "saisir":
        return (
          <SaisirPunition
            user={user}
            ecoleId={ecoleId}
            eleves={eleves}
            fautes={fautes}
            sanctions={sanctions}
            onNotif={onNotif}
            anneeId={anneeId}
            anneeActive={anneeActive}
          />
        );

      case "historique":
        return (
          <HistoriqueDisciplinaire
            punitions={punitions}
            eleves={eleves}
            fautes={fautes}
            user={user}
          />
        );

      case "absences":
        return (
          <SaisirAbsence
            ecoleId={ecoleId}
            eleves={eleves}
            user={user}
            anneeId={anneeId}
            anneeActive={anneeActive}
          />
        );

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

      case "profil":
        return <ProfilUtilisateur user={user} />;

      case "mentions":
        return <MentionsLegales />;

      case "confidentialite":
        return <PolitiqueConfidentialite />;

      case "aide":
        return <Aide user={user} />;

      default:
        return (
          <AccueilDisciplinaire
            user={user}
            punitions={punitions}
            eleves={eleves}
          />
        );
    }
  };

  const needsFullHeight = TABS_FULL_HEIGHT.includes(tab);

  // ─── RENDU PRINCIPAL ───
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
      {DisciplinaireAppKeyframes}
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
        {showBanner && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: warningBg,
              color: warningText,
              padding: isMobile ? "10px 12px" : "10px 16px",
              fontSize: isMobile ? 12 : 13,
              fontWeight: 500,
              borderRadius: 10,
              marginBottom: isMobile ? 12 : 16,
              lineHeight: 1.4,
            }}
          >
            <AlertTriangle size={15} style={{ flexShrink: 0 }} aria-hidden="true" />
            <span>
              Aucune année scolaire active. La saisie de punitions et d'absences
              est désactivée.
            </span>
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