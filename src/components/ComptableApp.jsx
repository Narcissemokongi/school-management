import { useState } from "react";
import { useStyles } from "../components/ThemeProvider";
import { Layout } from "./Layout";
import { DashboardComptable } from "./DashboardComptable";   // ← nouveau
import { GestionFrais } from "./GestionFrais";
import { MessagerieApp } from "./messagerie/MessagerieApp";
import { Appels } from "./Appels";
import { ProfilUtilisateur } from "./ProfilUtilisateur";
import { Aide } from "./Aide";
import { MentionsLegales } from "./MentionsLegales";
import { PolitiqueConfidentialite } from "./PolitiqueConfidentialite";
import {
  DollarSign, BarChart3, MessageCircle, Phone, HelpCircle,
  FileText, Shield, User, Calendar,
} from "lucide-react";

export function ComptableApp({
  user,
  ecoleId,
  eleves,
  anneeId,
  anneeActive,
  dark,
  toggle,
  handleLogout,
}) {
  const { S } = useStyles();
  const [tab, setTab] = useState("dashboard");   // onglet par défaut : tableau de bord
  const [messagingContactId, setMessagingContactId] = useState(null);

  const handleNavigateToMessaging = (contactId) => {
    setMessagingContactId(contactId);
    setTab("messagerie");
  };

  const menu = [
    { id: "dashboard", label: "Tableau de bord", icon: <BarChart3 size={20} /> },
    { id: "frais", label: "Frais", icon: <DollarSign size={20} /> },
    { id: "messagerie", label: "Messages", icon: <MessageCircle size={20} /> },
    { id: "appels", label: "Appels", icon: <Phone size={20} /> },
    { id: "profil", label: "Profil", icon: <User size={20} /> },
    { id: "aide", label: "Aide", icon: <HelpCircle size={20} /> },
    { id: "mentions", label: "Mentions légales", icon: <FileText size={20} /> },
    { id: "confidentialite", label: "Confidentialité", icon: <Shield size={20} /> },
  ];

  const renderContent = () => {
    if ((tab === "dashboard" || tab === "frais") && !anneeId) {
      return (
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px", textAlign: "center" }}>
          <Calendar size={48} color="#F59E0B" style={{ marginBottom: 16 }} />
          <h2 style={{ fontSize: 24, fontWeight: 600, color: "#1E293B", margin: "0 0 8px" }}>
            Aucune année scolaire active
          </h2>
          <p style={{ color: "#64748B", fontSize: 14 }}>
            Veuillez demander à l'administrateur d'activer une année scolaire pour accéder aux données financières.
          </p>
        </div>
      );
    }

    switch (tab) {
      case "dashboard":
        return (
          <DashboardComptable
            ecoleId={ecoleId}
            eleves={eleves}
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
      case "messagerie":
        return <MessagerieApp user={user} ecoleId={ecoleId} initialSelectedUserId={messagingContactId} />;
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
      {!anneeId && (
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
          ⚠️ Aucune année scolaire active. Les données financières sont indisponibles.
        </div>
      )}
      {renderContent()}
    </Layout>
  );
}