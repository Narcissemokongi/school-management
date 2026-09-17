import { useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "./Layout";
import { ProfilUtilisateur } from "./ProfilUtilisateur";
import { AccueilDisciplinaire } from "./AccueilDisciplinaire";
import { SaisirPunition } from "./SaisirPunition";
import { HistoriqueDisciplinaire } from "./HistoriqueDisciplinaire";
import { SaisirAbsence } from "./SaisirAbsence";
import { MessagerieApp } from "./messagerie/MessagerieApp";
import { Appels } from "./Appels";
import { Aide } from "./Aide";
import { MentionsLegales } from "./MentionsLegales";
import { PolitiqueConfidentialite } from "./PolitiqueConfidentialite";
import { Skeleton } from "./Skeleton";
import { useAppStore } from "@/store/appStore";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  Home, Pen, ClipboardList, AlertTriangle, MessageCircle, Phone, User,
  HelpCircle, FileText, Shield, Calendar,
} from "lucide-react";

// Onglets qui nécessitent une année active
const TABS_REQUIRING_YEAR = ["saisir", "absences"];

// ✅ Onglets valides (source de vérité pour valider le param URL)
const VALID_TABS = [
  "accueil",
  "saisir",
  "historique",
  "absences",
  "messagerie",
  "appels",
  "profil",
  "aide",
  "mentions",
  "confidentialite",
];

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

  // ========== URL ROUTING ==========
  // ✅ Source de vérité = URL (React Router), pas Zustand
  const { tab: tabParam } = useParams();
  const navigate = useNavigate();

  const tab = useMemo(
    () => (VALID_TABS.includes(tabParam) ? tabParam : "accueil"),
    [tabParam]
  );

  const setTab = useCallback(
    (newTab) => {
      if (VALID_TABS.includes(newTab)) {
        navigate(`/disciplinaire/${newTab}`);
      }
    },
    [navigate]
  );

  // ✅ messagingContactId reste en Zustand
  const messagingContactId = useAppStore((state) => state.messagingContactId);
  const setMessagingContactId = useAppStore(
    (state) => state.setMessagingContactId
  );

  // ✅ Handler mémoïsé
  const handleNavigateToMessaging = useCallback(
    (contactId) => {
      setMessagingContactId(contactId);
      setTab("messagerie");
    },
    [setMessagingContactId, setTab]
  );

  // ✅ Simplifié
  const nbPunitions = useMemo(() => punitions?.length ?? 0, [punitions]);

  const loading =
    punitions === undefined || eleves === undefined || fautes === undefined;

  // Couleurs
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const warning = "#F59E0B";
  const warningBg = dark ? "#78350F" : "#FEF3C7";
  const warningText = dark ? "#FBBF24" : "#92400E";

  const tabNeedsYear = TABS_REQUIRING_YEAR.includes(tab);
  const showBanner = !anneeId && !tabNeedsYear;

  // ✅ Menu mémoïsé
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

  // ==================== GUARD : session invalide ====================
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

  // ==================== LOADING ====================
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

  // ==================== RENDU CONTENU ====================
  const renderContent = () => {
    // Message complet pour les onglets qui nécessitent une année
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
            <Calendar size={30} color={warning} />
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
        return (
          <MessagerieApp
            user={user}
            ecoleId={ecoleId}
            initialSelectedUserId={messagingContactId}
          />
        );

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
        // Fallback : onglet inconnu → accueil
        return (
          <AccueilDisciplinaire
            user={user}
            punitions={punitions}
            eleves={eleves}
          />
        );
    }
  };

  // ==================== RENDU PRINCIPAL ====================
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
          <AlertTriangle size={15} style={{ flexShrink: 0 }} />
          <span>
            Aucune année scolaire active. La saisie de punitions et d'absences
            est désactivée.
          </span>
        </div>
      )}
      {renderContent()}
    </Layout>
  );
}