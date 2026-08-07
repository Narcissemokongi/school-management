import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useStyles } from "../components/ThemeProvider";
import { useIsMobile } from "../hooks/useIsMobile"; // Hook pour le responsive
import { Layout } from "./Layout";
import { AccueilParent } from "./AccueilParent";
import { MessagerieApp } from "./messagerie/MessagerieApp";
import { Appels } from "./Appels";
import { ConsultationEmploiDuTemps } from "./ConsultationEmploiDuTemps";
import { FraisEnfant } from "./FraisEnfant";
import { BulletinEnfant } from "./BulletinEnfant";
import { AbsencesEnfant } from "./AbsencesEnfant";
import { MentionsLegales } from "./MentionsLegales";
import { Aide } from "./Aide";
import { PolitiqueConfidentialite } from "./PolitiqueConfidentialite";
import { getFaute } from "../utils";
import {
  Users, MessageCircle, Calendar, Phone, HelpCircle,
  FileText, Shield, ArrowLeft, BookOpen, DollarSign,
  AlertTriangle, ClipboardList
} from "lucide-react";

export function ParentApp({
  user,
  ecoleId,
  eleves,
  punitions,
  fautes,
  anneeId,
  anneeActive,
  dark,
  toggle,
  handleLogout,
}) {
  const { S } = useStyles();
  const isMobile = useIsMobile();
  const [tab, setTab] = useState("enfants");
  const [selectedEnfant, setSelectedEnfant] = useState(null);
  const [messagingContactId, setMessagingContactId] = useState(null);

  const handleNavigateToMessaging = (contactId) => {
    setMessagingContactId(contactId);
    setTab("messagerie");
  };

  const menu = [
    { id: "enfants", label: "Mes enfants", icon: <Users size={20} /> },
    { id: "messagerie", label: "Messages", icon: <MessageCircle size={20} /> },
    { id: "emploi", label: "Emploi du temps", icon: <Calendar size={20} /> },
    { id: "appels", label: "Appels", icon: <Phone size={20} /> },
    { id: "aide", label: "Aide", icon: <HelpCircle size={20} /> },
    { id: "mentions", label: "Mentions légales", icon: <FileText size={20} /> },
    { id: "confidentialite", label: "Confidentialité", icon: <Shield size={20} /> },
  ];

  const renderContent = () => {
    switch (tab) {
      case "enfants":
        if (selectedEnfant) {
          const enfantPunitions = punitions
            .filter((p) => p.idEleve === selectedEnfant._id)
            .sort((a, b) => new Date(b.date) - new Date(a.date));
          return (
            <DossierEnfant
              enfant={selectedEnfant}
              punitions={enfantPunitions}
              fautes={fautes}
              ecoleId={ecoleId}
              onBack={() => setSelectedEnfant(null)}
              S={S}
              isMobile={isMobile}
            />
          );
        }
        return (
          <ListeEnfants
            eleves={eleves}
            punitions={punitions}
            user={user}
            onSelectEnfant={setSelectedEnfant}
            S={S}
            isMobile={isMobile}
          />
        );
      case "emploi":
        return (
          <ConsultationEmploiDuTemps
            ecoleId={ecoleId}
            classe={eleves.length > 0 ? eleves[0].classe : null}
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
      {renderContent()}
    </Layout>
  );
}

// ----- Liste des enfants (responsive) -----
function ListeEnfants({ eleves, punitions, user, onSelectEnfant, S, isMobile }) {
  if (eleves.length === 0) {
    return (
      <div style={{ maxWidth: 800, margin: "0 auto", padding: isMobile ? "24px 16px" : "32px 24px", textAlign: "center" }}>
        <Users size={48} color="#94A3B8" style={{ marginBottom: 16 }} />
        <h2 style={{ fontSize: 24, fontWeight: 600, color: "#1E293B", margin: "0 0 8px" }}>
          Aucun enfant enregistré
        </h2>
        <p style={{ color: "#64748B", fontSize: 14 }}>
          Veuillez contacter l'administration de l'école pour lier vos enfants à votre compte.
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: isMobile ? "16px 12px" : "24px 16px" }}>
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: isMobile ? 24 : 28, fontWeight: 700, color: "#1E293B", margin: 0 }}>
          Mes enfants
        </h2>
        <p style={{ color: "#64748B", marginTop: 4, fontSize: isMobile ? 13 : 14 }}>
          Sélectionnez un enfant pour consulter son dossier complet.
        </p>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        {eleves.map((enfant) => {
          const nbPunitions = punitions.filter((p) => p.idEleve === enfant._id).length;
          return (
            <div
              key={enfant._id}
              onClick={() => onSelectEnfant(enfant)}
              style={{
                background: "#FFF",
                borderRadius: 16,
                padding: isMobile ? "16px" : "20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                cursor: "pointer",
                transition: "box-shadow 0.15s, transform 0.1s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.05)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: isMobile ? 15 : 16, color: "#1E293B" }}>
                  {enfant.nom} {enfant.postnom}
                </div>
                <div style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>
                  Classe {enfant.classe} {nbPunitions > 0 && `· ${nbPunitions} punition(s)`}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, color: "#4F46E5" }}>
                <ClipboardList size={20} />
                <span style={{ fontSize: 14, fontWeight: 500 }}>Dossier</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ----- Dossier d'un enfant (avec sous-onglets responsives) -----
function DossierEnfant({ enfant, punitions, fautes, ecoleId, onBack, S, isMobile }) {
  const [subTab, setSubTab] = useState("punitions");

  const sousOnglets = [
    { id: "punitions", label: "Punitions", icon: <AlertTriangle size={16} /> },
    { id: "frais", label: "Frais", icon: <DollarSign size={16} /> },
    { id: "bulletin", label: "Bulletin", icon: <BookOpen size={16} /> },
    { id: "absences", label: "Absences", icon: <Calendar size={16} /> },
    { id: "emploi", label: "Emploi du temps", icon: <Calendar size={16} /> },
  ];

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: isMobile ? "16px 12px" : "24px 16px" }}>
      {/* En-tête avec retour */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <button
          onClick={onBack}
          style={{
            background: "#FFF",
            border: "1px solid #E2E8F0",
            borderRadius: 8,
            padding: isMobile ? "8px 10px" : "8px 12px",
            cursor: "pointer",
            color: "#4F46E5",
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontWeight: 500,
            fontSize: 14,
          }}
        >
          <ArrowLeft size={16} /> {isMobile ? null : "Retour"}
        </button>
        <div>
          <h2 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, color: "#1E293B", margin: 0 }}>
            {enfant.nom} {enfant.postnom}
          </h2>
          <p style={{ color: "#64748B", fontSize: 14 }}>
            Classe {enfant.classe}
          </p>
        </div>
      </div>

      {/* Sous-onglets avec scroll horizontal sur mobile */}
      <div style={{
        display: "flex",
        gap: 0,
        borderBottom: "2px solid #E2E8F0",
        marginBottom: 24,
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
        whiteSpace: "nowrap",
      }}>
        {sousOnglets.map((t) => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: isMobile ? "10px 12px" : "10px 16px",
              border: "none",
              background: "transparent",
              color: subTab === t.id ? "#4F46E5" : "#64748B",
              fontWeight: subTab === t.id ? 600 : 400,
              borderBottom: subTab === t.id ? "3px solid #4F46E5" : "3px solid transparent",
              cursor: "pointer",
              transition: "all 0.2s",
              fontSize: 13,
              flexShrink: 0,
            }}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Contenu du sous-onglet */}
      {subTab === "punitions" && (
        <div>
          {punitions.length === 0 && (
            <div style={{
              background: "#FFF",
              borderRadius: 16,
              padding: 48,
              textAlign: "center",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              color: "#64748B",
            }}>
              <AlertTriangle size={32} style={{ marginBottom: 8 }} />
              <p>Aucune punition enregistrée.</p>
            </div>
          )}
          {punitions.map((p) => {
            const faute = fautes.find((f) => f._id === p.idFaute);
            return (
              <div
                key={p._id}
                style={{
                  background: "#FFF",
                  borderRadius: 12,
                  padding: isMobile ? "12px 14px" : "14px 18px",
                  marginBottom: 8,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 15 }}>
                  {faute?.libelle || "Faute inconnue"}
                </div>
                <div style={{ color: "#64748B", fontSize: 13, marginTop: 4 }}>
                  {p.date} — Sanction : {p.sanction}
                </div>
                {p.commentaire && (
                  <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 4 }}>
                    {p.commentaire}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {subTab === "frais" && <FraisEnfant eleveId={enfant._id} />}
      {subTab === "bulletin" && (
        <BulletinEnfant
          eleveId={enfant._id}
          ecoleId={ecoleId}
          nom={enfant.nom}
          postnom={enfant.postnom}
          classe={enfant.classe}
        />
      )}
      {subTab === "absences" && <AbsencesEnfant eleveId={enfant._id} />}
      {subTab === "emploi" && (
        <ConsultationEmploiDuTemps ecoleId={ecoleId} classe={enfant.classe} />
      )}
    </div>
  );
}