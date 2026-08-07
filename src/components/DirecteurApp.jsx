import { useState } from "react";
import { useStyles } from "../components/ThemeProvider";
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
import {
  Home,
  User,
  Building,
  MessageCircle,
  Phone,
  HelpCircle,
  FileText,
  Shield,
  Calendar,
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
  const [tab, setTab] = useState("accueil");
  const [messagingContactId, setMessagingContactId] = useState(null);

  const handleNavigateToMessaging = (contactId) => {
    setMessagingContactId(contactId);
    setTab("messagerie");
  };

  const menu = [
    { id: "accueil", label: "Tableau de bord", icon: <Home size={20} /> },
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
    // Si aucune année scolaire active et que l'onglet nécessite des données (accueil, élèves, classes), afficher un message
    if (!anneeId && ["accueil", "eleves", "classes"].includes(tab)) {
      return (
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px", textAlign: "center" }}>
          <Calendar size={48} color="#F59E0B" style={{ marginBottom: 16 }} />
          <h2 style={{ fontSize: 24, fontWeight: 600, color: "#1E293B", margin: "0 0 8px" }}>
            Aucune année scolaire active
          </h2>
          <p style={{ color: "#64748B", fontSize: 14 }}>
            Veuillez demander à l'administrateur d'activer une année scolaire pour accéder aux données de l'établissement.
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
        return <Aide />;
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
      {/* Bannière d'avertissement si année inactive (mais pas pour les onglets hors données) */}
      {!anneeId && !["messagerie", "appels", "profil", "aide", "mentions", "confidentialite"].includes(tab) && (
        <div style={{
          background: "#FEF3C7",
          color: "#92400E",
          padding: "10px 20px",
          fontSize: 13,
          fontWeight: 500,
          textAlign: "center",
          borderRadius: "0 0 12px 12px",
          margin: "0 24px 16px",
        }}>
          ⚠️ Aucune année scolaire active. Certaines fonctionnalités sont limitées.
        </div>
      )}
      {renderContent()}
    </Layout>
  );
}