import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useStyles } from "../styles/theme";
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
import { AssistantPassageEnseignant } from "./AssistantPassageEnseignant"; // ✅ import ajouté
import {
  BookOpen, AlertTriangle, Calendar, MessageCircle, Phone, User,
  HelpCircle, FileText, Shield, ArrowLeft, BarChart3, GraduationCap,
  Clock, TrendingUp, ClipboardList, // ✅ icône ajoutée
} from "lucide-react";
import { ConsultationExamens } from "./ConsultationExamens";

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

  const coursDisponibles = useQuery(
    api.cours.list,
    classe ? { ecoleId, classe } : "skip"
  ) ?? [];

  const allNotes = useQuery(
    api.notes.listByEcole,
    anneeId ? { ecoleId, anneeId } : "skip"
  ) ?? [];

  const coursStats = useMemo(() => {
    return coursDisponibles.map((cours) => {
      const notesDuCours = allNotes.filter((n) => n.matiere === cours.nom);
      const nbEleves = elevesDeMaClasse.length;
      const nbNotes = notesDuCours.length;
      const moyenne =
        nbNotes > 0
          ? (notesDuCours.reduce((sum, n) => sum + n.note, 0) / nbNotes).toFixed(2)
          : "-";
      return { ...cours, nbNotes, nbEleves, moyenne };
    });
  }, [coursDisponibles, allNotes, elevesDeMaClasse]);

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
    { id: "passage", label: "Passage", icon: <ClipboardList size={20} /> }, // ✅ nouvel onglet
    { id: "cours", label: "Notes", icon: <BookOpen size={20} /> },
    { id: "absences", label: "Absences", icon: <AlertTriangle size={20} /> },
    { id: "emploi", label: "Emploi du temps", icon: <Calendar size={20} /> },
    { id: "examens", label: "Examens", icon: <Calendar size={20} /> },
    { id: "messagerie", label: "Messages", icon: <MessageCircle size={20} /> },
    { id: "appels", label: "Appels", icon: <Phone size={20} /> },
    { id: "profil", label: "Profil", icon: <User size={20} /> },
    { id: "aide", label: "Aide", icon: <HelpCircle size={20} /> },
    { id: "mentions", label: "Mentions légales", icon: <FileText size={20} /> },
    { id: "confidentialite", label: "Confidentialité", icon: <Shield size={20} /> },
  ];

  // Couleurs adaptatives (inchangées)
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const cardShadow = dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)";
  const hoverShadow = dark ? "0 2px 8px rgba(0,0,0,0.4)" : "0 2px 8px rgba(0,0,0,0.08)";
  const iconBg = dark ? "#312E81" : "#EEF2FF";
  const iconColor = dark ? "#A5B4FC" : "#4F46E5";
  const warningBg = dark ? "#78350F" : "#FEF3C7";
  const warningText = dark ? "#FBBF24" : "#92400E";
  const selectBg = dark ? "#0F172A" : "#F9FAFB";

  const renderContent = () => {
    if (!anneeId && (tab === "dashboard" || tab === "cours" || tab === "absences")) {
      return (
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px", textAlign: "center" }}>
          <Calendar size={48} color="#F59E0B" style={{ marginBottom: 16 }} />
          <h2 style={{ fontSize: 24, fontWeight: 600, color: textPrimary, margin: "0 0 8px" }}>
            Aucune année scolaire active
          </h2>
          <p style={{ color: textSecondary, fontSize: 14 }}>
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
              <h2 style={{ fontSize: 28, fontWeight: 700, color: textPrimary, margin: 0 }}>
                Tableau de bord enseignant
              </h2>
              <p style={{ color: textSecondary, marginTop: 4, fontSize: 14 }}>
                Classe {classe} · {anneeActive?.nom}
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
              <StatCard icon={<GraduationCap size={24} />} value={elevesDeMaClasse.length} label="Élèves" color="#4F46E5" dark={dark} />
              <StatCard icon={<BookOpen size={24} />} value={coursDisponibles.length} label="Cours" color="#10B981" dark={dark} />
              <StatCard icon={<AlertTriangle size={24} />} value={absencesAujourdhui.length} label="Absences aujourd'hui" color="#F59E0B" dark={dark} />
              <StatCard icon={<Clock size={24} />} value={coursStats.reduce((sum, c) => sum + c.nbNotes, 0)} label="Notes saisies" color="#6366F1" dark={dark} />
            </div>

            <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16, color: textPrimary }}>Mes cours</h3>
            <div style={{ display: "grid", gap: 12 }}>
              {coursStats.map((cours) => (
                <div
                  key={cours._id}
                  onClick={() => { setSelectedCours(cours); setTab("cours"); }}
                  style={{
                    background: cardBg,
                    borderRadius: 12,
                    padding: "16px 20px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    boxShadow: cardShadow,
                    cursor: "pointer",
                    border: `1px solid ${cardBorder}`,
                    transition: "box-shadow 0.15s, transform 0.1s, background-color 0.3s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.boxShadow = hoverShadow; e.currentTarget.style.transform = "translateY(-1px)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = cardShadow; e.currentTarget.style.transform = "translateY(0)"; }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", color: iconColor }}>
                      <BookOpen size={22} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 16, color: textPrimary }}>{cours.nom}</div>
                      <div style={{ fontSize: 13, color: textSecondary }}>{cours.nbNotes} notes · Moy. {cours.moyenne}/20</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: iconColor }}>
                    <TrendingUp size={18} />
                    <span style={{ fontSize: 14, fontWeight: 500 }}>Notes</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case "passage":
        return (
          <AssistantPassageEnseignant
            ecoleId={ecoleId}
            anneeActiveId={anneeId}
            user={user}
          />
        );

      case "cours":
        if (!selectedCours) {
          return (
            <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 16px" }}>
              <div style={{ marginBottom: 32 }}>
                <h2 style={{ fontSize: 28, fontWeight: 700, color: textPrimary, margin: 0 }}>
                  Sélectionnez un cours
                </h2>
                <p style={{ color: textSecondary, marginTop: 4, fontSize: 14 }}>
                  Choisissez un cours pour saisir ou consulter les notes.
                </p>
              </div>
              <div style={{ display: "grid", gap: 12 }}>
                {coursDisponibles.map((cours) => (
                  <div
                    key={cours._id}
                    onClick={() => setSelectedCours(cours)}
                    style={{
                      background: cardBg,
                      borderRadius: 16,
                      padding: "20px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      boxShadow: cardShadow,
                      cursor: "pointer",
                      border: `1px solid ${cardBorder}`,
                      transition: "box-shadow 0.15s, transform 0.1s, background-color 0.3s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.boxShadow = hoverShadow; e.currentTarget.style.transform = "translateY(-1px)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.boxShadow = cardShadow; e.currentTarget.style.transform = "translateY(0)"; }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", color: iconColor }}>
                        <BookOpen size={22} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 16, color: textPrimary }}>{cours.nom}</div>
                        <div style={{ fontSize: 13, color: textSecondary }}>Classe {cours.classe}</div>
                      </div>
                    </div>
                    <BarChart3 size={20} color={iconColor} />
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
                  background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 8,
                  padding: "8px 16px", cursor: "pointer", color: iconColor, fontWeight: 500,
                }}
              >
                <ArrowLeft size={16} /> Retour aux cours
              </button>
              <div>
                <h2 style={{ fontSize: 24, fontWeight: 700, color: textPrimary, margin: 0 }}>
                  {selectedCours.nom}
                </h2>
                <p style={{ color: textSecondary, fontSize: 14 }}>
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
              coursDisponibles={coursDisponibles}
            />
          </div>
        );

      case "absences":
        return <SaisirAbsence ecoleId={ecoleId} eleves={elevesDeMaClasse} user={user} anneeId={anneeId} anneeActive={anneeActive} />;

      case "emploi":
        return <ConsultationEmploiDuTemps ecoleId={ecoleId} classe={classe} anneeId={anneeId} />; // ✅ anneeId ajouté

      case "examens":
        return <ConsultationExamens ecoleId={ecoleId} anneeId={anneeId} classe={classe} />;

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
        return <Aide user={user} />;

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
          background: warningBg,
          color: warningText,
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

// Carte statistique adaptative
function StatCard({ icon, value, label, color, dark }) {
  return (
    <div style={{
      background: dark ? "#1E293B" : "#FFFFFF",
      borderRadius: 16,
      padding: 20,
      display: "flex",
      alignItems: "center",
      gap: 16,
      boxShadow: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)",
      border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
      transition: "background-color 0.3s",
    }}>
      <div style={{ width: 48, height: 48, background: `${color}${dark ? "33" : "15"}`, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", color }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 24, fontWeight: 700, color: dark ? "#F1F5F9" : "#1E293B" }}>{value}</div>
        <div style={{ fontSize: 14, color: dark ? "#94A3B8" : "#64748B" }}>{label}</div>
      </div>
    </div>
  );
}