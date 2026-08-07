import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useStyles } from "../components/ThemeProvider";
import { Layout } from "./Layout";
import { DashboardAdmin } from "./DashboardAdmin";
import { GestionElevesEtClasses } from "./GestionElevesEtClasses";
import { GestionFautesEtSanctions } from "./GestionFautesEtSanctions";
import { GestionUtilisateurs } from "./GestionUtilisateurs";
import { MessagerieApp } from "./messagerie/MessagerieApp";
import { GestionCoursEtNotes } from "./GestionCoursEtNotes";
import { GestionFrais } from "./GestionFrais";
import { GestionAudit } from "./GestionAudit";
import { Appels } from "./Appels";
import { Parametres } from "./Parametres";
import { Aide } from "./Aide";
import { MentionsLegales } from "./MentionsLegales";
import { PolitiqueConfidentialite } from "./PolitiqueConfidentialite";
import { ConfirmDialog } from "./ConfirmDialog";
import {
  Home,
  Users,
  AlertTriangle,
  BookOpen,
  DollarSign,
  Shield,
  MessageCircle,
  Phone,
  ScrollText,
  Settings,
  HelpCircle,
  FileText,
} from "lucide-react";

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
  dark,
  toggle,
  handleLogout,
}) {
  const { S } = useStyles();
  const [tab, setTab] = useState("accueil");
  const [dirty, setDirty] = useState(false);
  const [messagingContactId, setMessagingContactId] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingTab, setPendingTab] = useState(null);

  // Récupérer le nombre de demandes d'inscription en attente pour l'école
  const pendingUsers = useQuery(api.users.listPendingUsers, ecoleId ? { ecoleId } : "skip") ?? [];

  const handleNavigateToMessaging = (contactId) => {
    setMessagingContactId(contactId);
    setTab("messagerie");
  };

  const menu = [
    { id: "accueil", label: "Tableau de bord", icon: <Home size={20} /> },
    { id: "eleves-classes", label: "Scolarité", icon: <Users size={20} /> },
    { id: "fautes", label: "Discipline", icon: <AlertTriangle size={20} /> },
    { id: "cours-notes", label: "Évaluations", icon: <BookOpen size={20} /> },
    { id: "frais", label: "Finance", icon: <DollarSign size={20} /> },
    {
      id: "comptes",
      label: "Utilisateurs",
      icon: <Shield size={20} />,
      badge: pendingUsers.length > 0 ? pendingUsers.length : null,
    },
    { id: "messagerie", label: "Messages", icon: <MessageCircle size={20} /> },
    { id: "appels", label: "Appels", icon: <Phone size={20} /> },
    { id: "audit", label: "Audit", icon: <ScrollText size={20} /> },
    { id: "parametres", label: "Paramètres", icon: <Settings size={20} /> },
    { id: "mentions", label: "Mentions légales", icon: <FileText size={20} /> },
    { id: "confidentialite", label: "Confidentialité", icon: <Shield size={20} /> },
    { id: "aide", label: "Aide", icon: <HelpCircle size={20} /> },
  ];

  const handleTabChange = (newTab) => {
    if (dirty) {
      setPendingTab(newTab);
      setShowConfirm(true);
    } else {
      setTab(newTab);
    }
  };

  const confirmTabChange = () => {
    setDirty(false);
    setShowConfirm(false);
    if (pendingTab) {
      setTab(pendingTab);
      setPendingTab(null);
    }
  };

  const cancelTabChange = () => {
    setShowConfirm(false);
    setPendingTab(null);
  };

  useEffect(() => {
    if (dirty) {
      window.onbeforeunload = () => "Vous avez des modifications non enregistrées.";
    } else {
      window.onbeforeunload = null;
    }
    return () => {
      window.onbeforeunload = null;
    };
  }, [dirty]);

  const renderContent = () => {
    switch (tab) {
      case "accueil":
        return <DashboardAdmin ecoleId={ecoleId} anneeId={anneeId} anneeActive={anneeActive} />;
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
            userId={user._id}
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
        return <GestionUtilisateurs ecoleId={ecoleId} userId={user._id} />;
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
      case "audit":
        return <GestionAudit ecoleId={ecoleId} userId={user._id} />;
      case "parametres":
        return <Parametres ecoleId={ecoleId} user={user} />;
      case "mentions":
        return <MentionsLegales />;
      case "confidentialite":
        return <PolitiqueConfidentialite />;
      case "aide":
        return <Aide />;
      default:
        return <DashboardAdmin ecoleId={ecoleId} anneeId={anneeId} anneeActive={anneeActive} />;
    }
  };

  return (
    <>
      <Layout
        menu={menu}
        activeTab={tab}
        onTabChange={handleTabChange}
        user={user}
        dark={dark}
        onToggleTheme={toggle}
        onLogout={handleLogout}
      >
        {renderContent()}
      </Layout>

      {showConfirm && (
        <ConfirmDialog
          title="Modifications non enregistrées"
          message="Vous avez des modifications non sauvegardées. Voulez-vous vraiment quitter cette page ?"
          onConfirm={confirmTabChange}
          onCancel={cancelTabChange}
        />
      )}
    </>
  );
}