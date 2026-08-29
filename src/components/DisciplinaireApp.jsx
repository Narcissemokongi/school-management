import { useState, useMemo } from "react";
import { useStyles } from "../styles/theme";
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
import { useAppStore } from "../store/appStore"; // <-- Import du store
import {
  Home, Pen, ClipboardList, AlertTriangle, MessageCircle, Phone, User,
  HelpCircle, FileText, Shield, Calendar, CheckCircle,
} from "lucide-react";

export function DisciplinaireApp({
  user, ecoleId, punitions, addPunition, eleves, classes, fautes, sanctions, onNotif, anneeActive, anneeId,
  dark, toggle, handleLogout,
}) {
  const { S } = useStyles();

  // Onglet actif depuis le store
  const tab = useAppStore((state) => state.disciplinaireTab);
  const setTab = useAppStore((state) => state.setDisciplinaireTab);

  // Contact de messagerie
  const messagingContactId = useAppStore((state) => state.messagingContactId);
  const setMessagingContactId = useAppStore((state) => state.setMessagingContactId);

  const handleNavigateToMessaging = (contactId) => {
    setMessagingContactId(contactId);
    setTab("messagerie");
  };

  const nbPunitions = useMemo(() => (punitions ? punitions.length : 0), [punitions]);

  const loading = punitions === undefined || eleves === undefined || fautes === undefined;

  const menu = [
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
  ];

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
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 16px" }}>
          <Skeleton height={200} />
          <Skeleton height={200} style={{ marginTop: 16 }} />
        </div>
      </Layout>
    );
  }

  const renderContent = () => {
    if (!anneeId && (tab === "saisir" || tab === "absences")) {
      return (
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px", textAlign: "center" }}>
          <Calendar size={48} color="#F59E0B" style={{ marginBottom: 16 }} />
          <h2 style={{ fontSize: 24, fontWeight: 600, color: dark ? "#F1F5F9" : "#1E293B", margin: "0 0 8px" }}>
            Aucune année scolaire active
          </h2>
          <p style={{ color: dark ? "#94A3B8" : "#64748B", fontSize: 14 }}>
            Veuillez demander à l'administrateur d'activer une année scolaire pour pouvoir saisir des punitions ou absences.
          </p>
        </div>
      );
    }

    switch (tab) {
      case "accueil": return <AccueilDisciplinaire user={user} punitions={punitions} eleves={eleves} />;
      case "saisir": return <SaisirPunition user={user} ecoleId={ecoleId} eleves={eleves} fautes={fautes} sanctions={sanctions} addPunition={addPunition} onNotif={onNotif} anneeId={anneeId} anneeActive={anneeActive} />;
      case "historique": return <HistoriqueDisciplinaire punitions={punitions} eleves={eleves} fautes={fautes} user={user} />;
      case "absences": return <SaisirAbsence ecoleId={ecoleId} eleves={eleves} user={user} anneeId={anneeId} anneeActive={anneeActive} />;
      case "messagerie": return <MessagerieApp user={user} ecoleId={ecoleId} initialSelectedUserId={messagingContactId} />;
      case "appels": return (
        <Appels
          user={user}
          ecoleId={ecoleId}
          anneeId={anneeId}
          onNavigateToMessaging={handleNavigateToMessaging}
        />
      );
      case "profil": return <ProfilUtilisateur user={user} />;
      case "mentions": return <MentionsLegales />;
      case "confidentialite": return <PolitiqueConfidentialite />;
      case "aide": return <Aide user={user} />;
      default: return <AccueilDisciplinaire user={user} punitions={punitions} eleves={eleves} />;
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
      {!anneeId && (
        <div style={{
          background: dark ? "#78350F" : "#FEF3C7",
          color: dark ? "#FBBF24" : "#92400E",
          padding: "10px 20px",
          fontSize: 13,
          fontWeight: 500,
          textAlign: "center",
          borderRadius: "0 0 12px 12px",
          margin: "0 24px 16px",
        }}>
          ⚠️ Aucune année scolaire active. Certaines fonctionnalités (saisie de punition, absences) sont désactivées.
        </div>
      )}
      {renderContent()}
    </Layout>
  );
}