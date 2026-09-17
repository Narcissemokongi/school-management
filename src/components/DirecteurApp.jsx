import { useMemo, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Layout } from "./Layout";
import { DashboardDirecteur } from "./DashboardDirecteur";
import { RechercheEleve } from "./RechercheEleve";
import { StatistiquesClasses } from "./StatistiquesClasses";
import { MessagerieApp } from "./messagerie/MessagerieApp";
import { Appels } from "./Appels";
import { ProfilUtilisateur } from "./ProfilUtilisateur";
import { Aide } from "./Aide";
import { MentionsLegales } from "./MentionsLegales";
import { PolitiqueConfidentialite } from "./PolitiqueConfidentialite";
import { StatistiquesAvancees } from "./StatistiquesAvancees";
import { AssistantPassage } from "./AssistantPassage";
import { ConsultationExamens } from "./ConsultationExamens";
import { ConsultationEmploiDuTemps } from "./ConsultationEmploiDuTemps";
import { useAppStore } from "@/store/appStore";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  Home, User, Building, MessageCircle, Phone, HelpCircle,
  FileText, Shield, Calendar, BarChart, ArrowRight, AlertTriangle,
  GraduationCap, School,
} from "lucide-react";

// Onglets qui nécessitent une année active
const TABS_REQUIRING_YEAR = [
  "accueil",
  "eleves",
  "classes",
  "statistiques",
  "passage",
  "examens",
  "emploi-du-temps",
];

// ✅ Onglets valides (source de vérité pour valider le paramètre URL)
const VALID_TABS = [
  "accueil",
  "passage",
  "statistiques",
  "eleves",
  "classes",
  "emploi-du-temps",
  "examens",
  "messagerie",
  "appels",
  "profil",
  "aide",
  "mentions",
  "confidentialite",
];

export function DirecteurApp({
  user,
  punitions,
  eleves,
  classes,
  fautes,
  notifs,
  anneeActive,
  anneeId,
  dark,
  toggle,
  handleLogout,
}) {
  const isMobile = useIsMobile();

  const userId = user?._id;
  const userEcoleId = user?.ecoleId;

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
        navigate(`/directeur/${newTab}`);
      }
    },
    [navigate]
  );

  // ✅ messagingContactId reste en Zustand (cf. rapport §9 basse priorité)
  const messagingContactId = useAppStore((state) => state.messagingContactId);
  const setMessagingContactId = useAppStore(
    (state) => state.setMessagingContactId
  );

  // ── État local pour la classe sélectionnée (consultation)
  const [classeConsultation, setClasseConsultation] = useState("");

  // ========== HOOKS ==========
  // ✅ userId ajouté sur les 2 queries
  const anneesRaw = useQuery(
    api.anneesScolaires.listByEcole,
    userEcoleId && userId ? { ecoleId: userEcoleId, userId } : "skip"
  );
  const annees = useMemo(() => anneesRaw ?? [], [anneesRaw]);

  const inscriptionsRaw = useQuery(
    api.inscriptions.listByAnnee,
    userEcoleId && anneeId && userId
      ? { ecoleId: userEcoleId, anneeId, userId }
      : "skip"
  );
  const inscriptions = useMemo(() => inscriptionsRaw ?? [], [inscriptionsRaw]);

  // ✅ userId déjà requis (patché précédemment)
  const propositionsRaw = useQuery(
    api.propositionsPassage.listPropositions,
    userEcoleId && anneeId && userId
      ? { ecoleId: userEcoleId, anneeId, userId }
      : "skip"
  );
  const propositions = useMemo(() => propositionsRaw ?? [], [propositionsRaw]);

  const nbElevesSansDecision = useMemo(() => {
    const elevesProposes = new Set(propositions.map((p) => p.eleveId));
    return inscriptions.filter((insc) => !elevesProposes.has(insc.eleveId))
      .length;
  }, [inscriptions, propositions]);

  const handleNavigateToMessaging = useCallback(
    (contactId) => {
      setMessagingContactId(contactId);
      setTab("messagerie");
    },
    [setMessagingContactId, setTab]
  );

  // Couleurs
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const accent = dark ? "#818CF8" : "#4F46E5";
  const accentBg = dark ? "#312E81" : "#EEF2FF";
  const warning = "#F59E0B";
  const warningBg = dark ? "#78350F" : "#FEF3C7";
  const warningText = dark ? "#FBBF24" : "#92400E";

  const tabNeedsYear = TABS_REQUIRING_YEAR.includes(tab);
  const showBanner = !anneeId && !tabNeedsYear;

  // ✅ Menu mémoïsé
  const menu = useMemo(
    () => [
      { id: "accueil", label: "Tableau de bord", icon: <Home size={20} /> },
      {
        id: "passage",
        label: "Passage",
        icon: <ArrowRight size={20} />,
        badge: nbElevesSansDecision > 0 ? nbElevesSansDecision : null,
      },
      { id: "statistiques", label: "Statistiques", icon: <BarChart size={20} /> },
      { id: "eleves", label: "Élèves", icon: <User size={20} /> },
      { id: "classes", label: "Classes", icon: <Building size={20} /> },
      {
        id: "emploi-du-temps",
        label: "Emploi du temps",
        icon: <Calendar size={20} />,
      },
      { id: "examens", label: "Examens", icon: <GraduationCap size={20} /> },
      { id: "messagerie", label: "Messages", icon: <MessageCircle size={20} /> },
      { id: "appels", label: "Appels", icon: <Phone size={20} /> },
      { id: "profil", label: "Profil", icon: <User size={20} /> },
      { id: "aide", label: "Aide", icon: <HelpCircle size={20} /> },
      { id: "mentions", label: "Mentions légales", icon: <FileText size={20} /> },
      {
        id: "confidentialite",
        label: "Confidentialité",
        icon: <Shield size={20} />,
      },
    ],
    [nbElevesSansDecision]
  );

  // ✅ Sélecteur de classe — fonction (pas un composant) pour éviter le remontage
  const renderClasseSelector = () => (
    <div
      style={{
        background: cardBg,
        border: `1px solid ${cardBorder}`,
        borderRadius: 14,
        padding: isMobile ? 12 : 14,
        marginBottom: isMobile ? 12 : 16,
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexDirection: isMobile ? "column" : "row",
        boxShadow: dark
          ? "0 1px 3px rgba(0,0,0,0.3)"
          : "0 1px 3px rgba(0,0,0,0.05)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: accentBg,
            color: accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <School size={16} />
        </div>
        <select
          value={classeConsultation}
          onChange={(e) => setClasseConsultation(e.target.value)}
          style={{
            flex: 1,
            padding: isMobile ? "10px 12px" : "9px 12px",
            border: `1px solid ${cardBorder}`,
            borderRadius: 10,
            fontSize: isMobile ? 15 : 14,
            outline: "none",
            background: dark ? "#0F172A" : "#F8FAFC",
            color: textPrimary,
            cursor: "pointer",
            fontFamily: "inherit",
            appearance: "none",
            WebkitAppearance: "none",
          }}
        >
          <option value="">-- Choisir une classe --</option>
          {classes.map((c) => (
            <option key={c._id} value={c.nom}>
              {c.nom}
            </option>
          ))}
        </select>
      </div>
    </div>
  );

  // ✅ Message "aucune année" factorisé
  const renderNoAnneeMessage = () => (
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
        Veuillez demander à l'administrateur d'activer une année scolaire pour
        accéder à cette section.
      </p>
    </div>
  );

  // ==================== GUARD : session invalide ====================
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
              color: textPrimary,
              margin: "0 0 8px",
            }}
          >
            Session invalide
          </h2>
          <p
            style={{
              color: textSecondary,
              fontSize: isMobile ? 13 : 14,
            }}
          >
            Veuillez vous reconnecter.
          </p>
        </div>
      </Layout>
    );
  }

  // ==================== RENDU ====================
  const renderContent = () => {
    if (!anneeId && tabNeedsYear) {
      return renderNoAnneeMessage();
    }

    switch (tab) {
      case "accueil":
        return (
          <DashboardDirecteur
            ecoleId={userEcoleId}
            anneeId={anneeId}
            anneeActive={anneeActive}
            punitions={punitions}
            eleves={eleves}
            classes={classes}
            fautes={fautes}
            notifs={notifs}
            user={user}
          />
        );

      case "passage":
        return (
          <AssistantPassage
            ecoleId={userEcoleId}
            anneeActiveId={anneeId}
            classes={classes}
            user={user}
            initialInscriptions={inscriptions}
            initialPropositions={propositions}
          />
        );

      case "statistiques":
        return (
          <StatistiquesAvancees
            ecoleId={userEcoleId}
            anneeId={anneeId}
            anneeActive={anneeActive}
            classes={classes}
            annees={annees}
            user={user}
          />
        );

      case "eleves":
        return (
          <RechercheEleve
            punitions={punitions}
            eleves={eleves}
            fautes={fautes}
            user={user}
          />
        );

      case "classes":
        return (
          <StatistiquesClasses
            punitions={punitions}
            eleves={eleves}
            classes={classes}
            fautes={fautes}
          />
        );

      case "emploi-du-temps":
        return (
          <div
            style={{
              maxWidth: 1280,
              margin: "0 auto",
              padding: isMobile ? "0 8px" : "0 16px",
            }}
          >
            {renderClasseSelector()}
            {classeConsultation ? (
              <ConsultationEmploiDuTemps
                ecoleId={userEcoleId}
                classe={classeConsultation}
                anneeId={anneeId}
                user={user}
              />
            ) : (
              <div
                style={{
                  background: cardBg,
                  borderRadius: 14,
                  border: `1px solid ${cardBorder}`,
                  padding: isMobile ? 40 : 60,
                  textAlign: "center",
                  color: textSecondary,
                }}
              >
                <p style={{ margin: 0, fontSize: 14 }}>
                  Sélectionnez une classe pour consulter son emploi du temps.
                </p>
              </div>
            )}
          </div>
        );

      case "examens":
        return (
          <div
            style={{
              maxWidth: 1280,
              margin: "0 auto",
              padding: isMobile ? "0 8px" : "0 16px",
            }}
          >
            {renderClasseSelector()}
            {classeConsultation ? (
              <ConsultationExamens
                ecoleId={userEcoleId}
                classe={classeConsultation}
                anneeId={anneeId}
                user={user}
              />
            ) : (
              <div
                style={{
                  background: cardBg,
                  borderRadius: 14,
                  border: `1px solid ${cardBorder}`,
                  padding: isMobile ? 40 : 60,
                  textAlign: "center",
                  color: textSecondary,
                }}
              >
                <p style={{ margin: 0, fontSize: 14 }}>
                  Sélectionnez une classe pour consulter ses examens.
                </p>
              </div>
            )}
          </div>
        );

      case "messagerie":
        return (
          <MessagerieApp
            user={user}
            ecoleId={userEcoleId}
            initialSelectedUserId={messagingContactId}
          />
        );

      case "appels":
        return (
          <Appels
            user={user}
            ecoleId={userEcoleId}
            anneeId={anneeId}
            onNavigateToMessaging={handleNavigateToMessaging}
          />
        );

      case "profil":
        return <ProfilUtilisateur user={user} />;

      case "aide":
        return <Aide user={user} />;

      case "mentions":
        return <MentionsLegales />;

      case "confidentialite":
        return <PolitiqueConfidentialite />;

      default:
        return (
          <DashboardDirecteur
            ecoleId={userEcoleId}
            anneeId={anneeId}
            anneeActive={anneeActive}
            punitions={punitions}
            eleves={eleves}
            classes={classes}
            fautes={fautes}
            notifs={notifs}
            user={user}
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
            Aucune année scolaire active. Certaines fonctionnalités sont
            limitées.
          </span>
        </div>
      )}
      {renderContent()}
    </Layout>
  );
}