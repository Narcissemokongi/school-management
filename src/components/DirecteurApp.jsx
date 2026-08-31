import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useStyles } from "../styles/theme";
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
import { useAppStore } from "../store/appStore";
import { useIsMobile } from "../hooks/useIsMobile"; // <-- Import du hook
import {
  Home, User, Building, MessageCircle, Phone, HelpCircle,
  FileText, Shield, Calendar, BarChart, ArrowRight,
} from "lucide-react";

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
  const { S } = useStyles();
  const isMobile = useIsMobile(); // Détection mobile

  // Onglet actif depuis le store, avec setter
  const tab = useAppStore((state) => state.directeurTab);
  const setTab = useAppStore((state) => state.setDirecteurTab);

  // Contact de messagerie, également conservé
  const messagingContactId = useAppStore((state) => state.messagingContactId);
  const setMessagingContactId = useAppStore((state) => state.setMessagingContactId);

  // ========== HOOKS TOUJOURS EN PREMIER ==========
  const annees = useQuery(
    api.anneesScolaires.listByEcole,
    user.ecoleId ? { ecoleId: user.ecoleId } : "skip"
  ) ?? [];

  const inscriptions = useQuery(
    api.inscriptions.listByAnnee,
    user.ecoleId && anneeId ? { ecoleId: user.ecoleId, anneeId } : "skip"
  ) ?? [];

  const propositions = useQuery(
    api.propositionsPassage.listPropositions,
    user.ecoleId && anneeId ? { ecoleId: user.ecoleId, anneeId } : "skip"
  ) ?? [];

  const nbElevesSansDecision = useMemo(() => {
    if (!inscriptions || !propositions) return 0;
    const elevesProposes = new Set(propositions.map((p) => p.eleveId));
    return inscriptions.filter((insc) => !elevesProposes.has(insc.eleveId)).length;
  }, [inscriptions, propositions]);

  const handleNavigateToMessaging = (contactId) => {
    setMessagingContactId(contactId);
    setTab("messagerie");
  };

  const menu = [
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
    { id: "messagerie", label: "Messages", icon: <MessageCircle size={20} /> },
    { id: "appels", label: "Appels", icon: <Phone size={20} /> },
    { id: "profil", label: "Profil", icon: <User size={20} /> },
    { id: "aide", label: "Aide", icon: <HelpCircle size={20} /> },
    { id: "mentions", label: "Mentions légales", icon: <FileText size={20} /> },
    { id: "confidentialite", label: "Confidentialité", icon: <Shield size={20} /> },
  ];

  const renderContent = () => {
    if (!anneeId && ["accueil", "eleves", "classes", "statistiques", "passage"].includes(tab)) {
      return (
        <div style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: isMobile ? "24px 16px" : "32px 24px",
          textAlign: "center",
        }}>
          <Calendar size={isMobile ? 40 : 48} color="#F59E0B" style={{ marginBottom: 16 }} />
          <h2 style={{
            fontSize: isMobile ? 20 : 24,
            fontWeight: 600,
            color: dark ? "#F1F5F9" : "#1E293B",
            margin: "0 0 8px",
          }}>
            Aucune année scolaire active
          </h2>
          <p style={{
            color: dark ? "#94A3B8" : "#64748B",
            fontSize: isMobile ? 13 : 14,
          }}>
            Veuillez demander à l'administrateur d'activer une année scolaire pour accéder à cette section.
          </p>
        </div>
      );
    }

    switch (tab) {
      case "accueil":
        return (
          <DashboardDirecteur
            ecoleId={user.ecoleId}
            anneeId={anneeId}
            anneeActive={anneeActive}
            punitions={punitions}
            eleves={eleves}
            classes={classes}
            fautes={fautes}
            notifs={notifs}
          />
        );

      case "passage":
        return (
          <AssistantPassage
            ecoleId={user.ecoleId}
            anneeActiveId={anneeId}
            classes={classes}
            user={user}
            initialInscriptions={inscriptions}
            initialPropositions={propositions}
          />
        );

      case "statistiques":
        return <StatistiquesAvancees ecoleId={user.ecoleId} anneeId={anneeId} classes={classes} annees={annees} />;

      case "eleves":
        return <RechercheEleve punitions={punitions} eleves={eleves} fautes={fautes} />;

      case "classes":
        return <StatistiquesClasses punitions={punitions} eleves={eleves} classes={classes} fautes={fautes} />;

      case "messagerie":
        return <MessagerieApp user={user} ecoleId={user.ecoleId} initialSelectedUserId={messagingContactId} />;

      case "appels":
        return (
          <Appels
            user={user}
            ecoleId={user.ecoleId}
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
        return null;
    }
  };

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
      {!anneeId && !["messagerie", "appels", "profil", "aide", "mentions", "confidentialite"].includes(tab) && (
        <div style={{
          background: dark ? "#78350F" : "#FEF3C7",
          color: dark ? "#FBBF24" : "#92400E",
          padding: isMobile ? "10px 12px" : "10px 20px",
          fontSize: isMobile ? 12 : 13,
          fontWeight: 500,
          textAlign: "center",
          borderRadius: "0 0 12px 12px",
          margin: isMobile ? "0 12px 12px" : "0 24px 16px",
        }}>
          ⚠️ Aucune année scolaire active. Certaines fonctionnalités sont limitées.
        </div>
      )}
      {renderContent()}
    </Layout>
  );
}