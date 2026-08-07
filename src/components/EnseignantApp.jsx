import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useStyles } from "../components/ThemeProvider";
import { Layout } from "./Layout";
import { ProfilUtilisateur } from "./ProfilUtilisateur";
import { MessagerieApp } from "./messagerie/MessagerieApp";
import { Appels } from "./Appels";
import { ConsultationEmploiDuTemps } from "./ConsultationEmploiDuTemps";
import { SaisirAbsence } from "./SaisirAbsence";
import { GestionNotes } from "./GestionNotes";
import { Aide } from "./Aide";
import { MentionsLegales } from "./MentionsLegales";
import { PolitiqueConfidentialite } from "./PolitiqueConfidentialite";
import {
  BookOpen, AlertTriangle, Calendar, MessageCircle, Phone, User,
  HelpCircle, FileText, Shield, ArrowLeft, BarChart3, GraduationCap,
  Clock, TrendingUp,
} from "lucide-react";

export function EnseignantApp({
  user, ecoleId, eleves, classes, anneeId, anneeActive,
  dark, toggle, handleLogout,
}) {
  const { S } = useStyles();
  const classe = user.classe;
  const elevesDeMaClasse = eleves.filter((e) => e.classe === classe);
  const [tab, setTab] = useState("dashboard");
  const [selectedCours, setSelectedCours] = useState(null);
  const [messagingContactId, setMessagingContactId] = useState(null);

  const handleNavigateToMessaging = (contactId) => {
    setMessagingContactId(contactId);
    setTab("messagerie");
  };

  // Récupération de tous les cours de la classe
  const coursDisponibles = useQuery(
    api.cours.list,
    classe ? { ecoleId, classe } : "skip"
  ) ?? [];

  // Récupération des notes pour les calculs du tableau de bord
  const allNotes = useQuery(
    api.notes.listByEcole,
    anneeId ? { ecoleId, anneeId } : "skip"
  ) ?? [];

  // Calculs pour le tableau de bord par cours
  const coursStats = useMemo(() => {
    return coursDisponibles.map((cours) => {
      const notesDuCours = allNotes.filter(
        (n) => n.matiere === cours.nom
      );
      const nbEleves = elevesDeMaClasse.length;
      const nbNotes = notesDuCours.length;
      const moyenne =
        nbNotes > 0
          ? (
              notesDuCours.reduce((sum, n) => sum + n.note, 0) / nbNotes
            ).toFixed(2)
          : "-";
      return {
        ...cours,
        nbNotes,
        nbEleves,
        moyenne,
      };
    });
  }, [coursDisponibles, allNotes, elevesDeMaClasse]);

  // Absences du jour pour le tableau de bord
  const today = new Date().toISOString().split("T")[0];
  const absencesAujourdhui = useQuery(
    api.absences.listByEcole,
    anneeId ? { ecoleId, anneeId } : "skip"
  )?.filter(
    (a) =>
      a.date === today &&
      elevesDeMaClasse.some((e) => e._id === a.eleveId)
  ) ?? [];

  const menu = [
    { id: "dashboard", label: "Tableau de bord", icon: <BarChart3 size={20} /> },
    { id: "cours", label: "Notes", icon: <BookOpen size={20} /> },
    { id: "absences", label: "Absences", icon: <AlertTriangle size={20} /> },
    { id: "emploi", label: "Emploi du temps", icon: <Calendar size={20} /> },
    { id: "messagerie", label: "Messages", icon: <MessageCircle size={20} /> },
    { id: "appels", label: "Appels", icon: <Phone size={20} /> },
    { id: "profil", label: "Profil", icon: <User size={20} /> },
    { id: "aide", label: "Aide", icon: <HelpCircle size={20} /> },
    { id: "mentions", label: "Mentions légales", icon: <FileText size={20} /> },
    { id: "confidentialite", label: "Confidentialité", icon: <Shield size={20} /> },
  ];

  const renderContent = () => {
    if (!anneeId && (tab === "dashboard" || tab === "cours" || tab === "absences")) {
      return (
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px", textAlign: "center" }}>
          <Calendar size={48} color="#F59E0B" style={{ marginBottom: 16 }} />
          <h2 style={{ fontSize: 24, fontWeight: 600, color: "#1E293B", margin: "0 0 8px" }}>
            Aucune année scolaire active
          </h2>
          <p style={{ color: "#64748B", fontSize: 14 }}>
            Veuillez demander à l'administrateur d'activer une année scolaire.
          </p>
        </div>
      );
    }

    switch (tab) {
      case "dashboard":
        return (
          <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 16px" }}>
            <div style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 28, fontWeight: 700, color: "#1E293B", margin: 0 }}>
                Tableau de bord enseignant
              </h2>
              <p style={{ color: "#64748B", marginTop: 4, fontSize: 14 }}>
                Classe {classe} · {anneeActive?.nom}
              </p>
            </div>
            {/* Cartes statistiques */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
              <StatCard icon={<GraduationCap size={24} />} value={elevesDeMaClasse.length} label="Élèves" color="#4F46E5" />
              <StatCard icon={<BookOpen size={24} />} value={coursDisponibles.length} label="Cours" color="#10B981" />
              <StatCard icon={<AlertTriangle size={24} />} value={absencesAujourdhui.length} label="Absences aujourd'hui" color="#F59E0B" />
              <StatCard icon={<Clock size={24} />} value={coursStats.reduce((sum, c) => sum + c.nbNotes, 0)} label="Notes saisies" color="#6366F1" />
            </div>
            {/* Liste des cours avec stats rapides */}
            <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16, color: "#1E293B" }}>Mes cours</h3>
            <div style={{ display: "grid", gap: 12 }}>
              {coursStats.map((cours) => (
                <div
                  key={cours._id}
                  onClick={() => { setSelectedCours(cours); setTab("cours"); }}
                  style={{
                    background: "#FFF", borderRadius: 12, padding: "16px 20px",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)", cursor: "pointer",
                    transition: "box-shadow 0.15s, transform 0.1s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.05)"; e.currentTarget.style.transform = "translateY(0)"; }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: "#EEF2FF", display: "flex", alignItems: "center", justifyContent: "center", color: "#4F46E5" }}>
                      <BookOpen size={22} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 16 }}>{cours.nom}</div>
                      <div style={{ fontSize: 13, color: "#64748B" }}>{cours.nbNotes} notes · Moy. {cours.moyenne}/20</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#4F46E5" }}>
                    <TrendingUp size={18} />
                    <span style={{ fontSize: 14, fontWeight: 500 }}>Notes</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case "cours":
        if (!selectedCours) {
          return (
            <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 16px" }}>
              <div style={{ marginBottom: 32 }}>
                <h2 style={{ fontSize: 28, fontWeight: 700, color: "#1E293B", margin: 0 }}>
                  Sélectionnez un cours
                </h2>
                <p style={{ color: "#64748B", marginTop: 4, fontSize: 14 }}>
                  Choisissez un cours pour saisir ou consulter les notes.
                </p>
              </div>
              <div style={{ display: "grid", gap: 12 }}>
                {coursDisponibles.map((cours) => (
                  <div
                    key={cours._id}
                    onClick={() => setSelectedCours(cours)}
                    style={{
                      background: "#FFF", borderRadius: 16, padding: "20px",
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.05)", cursor: "pointer",
                      transition: "box-shadow 0.15s, transform 0.1s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.05)"; e.currentTarget.style.transform = "translateY(0)"; }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: "#EEF2FF", display: "flex", alignItems: "center", justifyContent: "center", color: "#4F46E5" }}>
                        <BookOpen size={22} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 16 }}>{cours.nom}</div>
                        <div style={{ fontSize: 13, color: "#64748B" }}>Classe {cours.classe}</div>
                      </div>
                    </div>
                    <BarChart3 size={20} color="#4F46E5" />
                  </div>
                ))}
              </div>
            </div>
          );
        }
        return (
          <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
              <button
                onClick={() => setSelectedCours(null)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 8,
                  padding: "8px 16px", cursor: "pointer", color: "#4F46E5", fontWeight: 500,
                }}
              >
                <ArrowLeft size={16} /> Retour aux cours
              </button>
              <div>
                <h2 style={{ fontSize: 24, fontWeight: 700, color: "#1E293B", margin: 0 }}>
                  {selectedCours.nom}
                </h2>
                <p style={{ color: "#64748B", fontSize: 14 }}>
                  Classe {classe} · {anneeActive?.nom}
                </p>
              </div>
            </div>
            <GestionNotes
              ecoleId={ecoleId}
              eleves={elevesDeMaClasse}
              matiereFixe={selectedCours.nom}
              classeFixe={classe}
              anneeId={anneeId}
              anneeActive={anneeActive}
              user={user}
              coursDisponibles={coursDisponibles}   // ← passage de la liste
            />
          </div>
        );

      case "absences":
        return <SaisirAbsence ecoleId={ecoleId} eleves={elevesDeMaClasse} user={user} anneeId={anneeId} anneeActive={anneeActive} />;

      case "emploi":
        return <ConsultationEmploiDuTemps ecoleId={ecoleId} classe={classe} />;

      case "messagerie":
        return <MessagerieApp user={user} ecoleId={ecoleId} initialSelectedUserId={messagingContactId} />;

      case "appels":
        return <Appels user={user} ecoleId={ecoleId} anneeId={anneeId} onNavigateToMessaging={handleNavigateToMessaging} />;

      case "profil":
        return <ProfilUtilisateur user={user} />;

      case "mentions":
        return <MentionsLegales />;

      case "confidentialite":
        return <PolitiqueConfidentialite />;

      case "aide":
        return <Aide />;

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
      {!anneeId && (tab === "dashboard" || tab === "cours" || tab === "absences") && (
        <div style={{
          background: "#FEF3C7", color: "#92400E", padding: "10px 20px",
          fontSize: 13, fontWeight: 500, textAlign: "center",
          borderRadius: "0 0 12px 12px", margin: "0 24px 16px",
        }}>
          ⚠️ Aucune année scolaire active. Certaines fonctionnalités sont limitées.
        </div>
      )}
      {renderContent()}
    </Layout>
  );
}

// Petite carte statistique réutilisable
function StatCard({ icon, value, label, color }) {
  return (
    <div style={{
      background: "#FFF", borderRadius: 16, padding: 20,
      display: "flex", alignItems: "center", gap: 16,
      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    }}>
      <div style={{ width: 48, height: 48, background: `${color}15`, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", color: color }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 24, fontWeight: 700, color: "#1E293B" }}>{value}</div>
        <div style={{ fontSize: 14, color: "#64748B" }}>{label}</div>
      </div>
    </div>
  );
}