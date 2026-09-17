import { useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
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
import { AssistantPassageEnseignant } from "./AssistantPassageEnseignant";
import { useAppStore } from "@/store/appStore";
import {
  BookOpen, AlertTriangle, Calendar, MessageCircle, Phone, User,
  HelpCircle, FileText, Shield, ArrowLeft, BarChart3, GraduationCap,
  Clock, ChevronRight, ClipboardList, // ✅ AJOUT
} from "lucide-react";
import { ConsultationExamens } from "./ConsultationExamens";

// ✅ Onglets valides (source de vérité pour valider le param URL)
const VALID_TABS = [
  "dashboard",
  "passage",
  "cours",
  "absences",
  "emploi",
  "examens",
  "messagerie",
  "appels",
  "profil",
  "aide",
  "mentions",
  "confidentialite",
];

// ✅ Onglets qui nécessitent une année active
const TABS_REQUIRING_YEAR = ["dashboard", "cours", "absences"];

// ============================================================
// CARTE STATISTIQUE COMPACTE
// ============================================================
function StatCard({ icon, value, label, color, dark, isMobile }) {
  return (
    <div
      style={{
        background: dark ? "#1E293B" : "#FFFFFF",
        borderRadius: 12,
        padding: isMobile ? "10px 12px" : "14px 16px",
        boxShadow: dark
          ? "0 1px 2px rgba(0,0,0,0.25)"
          : "0 1px 2px rgba(0,0,0,0.04)",
        border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
        display: "flex",
        alignItems: "center",
        gap: 10,
        minWidth: isMobile ? 130 : "auto",
        flex: isMobile ? "0 0 auto" : 1,
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: `${color}20`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          color,
        }}
      >
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            color: dark ? "#94A3B8" : "#64748B",
            fontSize: 10.5,
            fontWeight: 500,
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </div>
        <div
          style={{
            color: dark ? "#F1F5F9" : "#1E293B",
            fontSize: 18,
            fontWeight: 700,
            lineHeight: 1.1,
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// CARTE COURS COMPACTE
// ============================================================
function CoursCard({ cours, dark, isMobile, onClick, showStats }) {
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const accent = dark ? "#818CF8" : "#4F46E5";

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      style={{
        background: cardBg,
        borderRadius: 12,
        padding: isMobile ? "10px 12px" : "12px 14px",
        boxShadow: dark
          ? "0 1px 2px rgba(0,0,0,0.25)"
          : "0 1px 2px rgba(0,0,0,0.04)",
        border: `1px solid ${cardBorder}`,
        display: "flex",
        alignItems: "center",
        gap: isMobile ? 10 : 12,
        cursor: "pointer",
        transition: "border-color 0.15s, transform 0.1s",
        userSelect: "none",
        WebkitTapHighlightColor: "transparent",
        minWidth: 0,
      }}
      onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.99)")}
      onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: dark ? "#312E81" : "#EEF2FF",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: accent,
          flexShrink: 0,
        }}
      >
        <BookOpen size={18} />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontWeight: 600,
            fontSize: isMobile ? 13.5 : 14,
            color: textPrimary,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {cours.nom}
        </div>
        <div
          style={{
            fontSize: isMobile ? 11 : 11.5,
            color: textSecondary,
            marginTop: 2,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {showStats
            ? `${cours.nbNotes} note${cours.nbNotes > 1 ? "s" : ""} · Moy. ${cours.moyenne}/20`
            : `Classe ${cours.classe}`}
        </div>
      </div>
      <ChevronRight
        size={18}
        color={dark ? "#475569" : "#CBD5E1"}
        style={{ flexShrink: 0 }}
      />
    </div>
  );
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================
export function EnseignantApp({
  user,
  ecoleId,
  eleves,
  classes,
  anneeId,
  anneeActive,
  dark,
  toggle,
  handleLogout,
}) {
  const isMobile = useIsMobile();

  const userId = user?._id;
  const classe = user?.classe;

  // ========== URL ROUTING ==========
  // ✅ Source de vérité = URL (React Router), pas Zustand
  const { tab: tabParam } = useParams();
  const navigate = useNavigate();

  const tab = useMemo(
    () => (VALID_TABS.includes(tabParam) ? tabParam : "dashboard"),
    [tabParam]
  );

  const setTab = useCallback(
    (newTab) => {
      if (VALID_TABS.includes(newTab)) {
        navigate(`/enseignant/${newTab}`);
      }
    },
    [navigate]
  );

  // ✅ selectedCours reste en Zustand (sub-view, pas navigation)
  const selectedCours = useAppStore((state) => state.enseignantSelectedCours);
  const setSelectedCours = useAppStore(
    (state) => state.setEnseignantSelectedCours
  );

  // ✅ messagingContactId reste en Zustand
  const messagingContactId = useAppStore((state) => state.messagingContactId);
  const setMessagingContactId = useAppStore(
    (state) => state.setMessagingContactId
  );

  const handleNavigateToMessaging = useCallback(
    (contactId) => {
      setMessagingContactId(contactId);
      setTab("messagerie");
    },
    [setMessagingContactId, setTab]
  );

  // ✅ Élèves de ma classe — mémoïsé
  const elevesDeMaClasse = useMemo(
    () => (classe ? (eleves ?? []).filter((e) => e.classe === classe) : []),
    [eleves, classe]
  );

  // ✅ userId ajouté aux queries
  const coursDisponiblesRaw = useQuery(
    api.cours.list,
    classe && ecoleId && userId
      ? { ecoleId, classe, userId, anneeId }
      : "skip"
  );
  const coursDisponibles = useMemo(
    () => coursDisponiblesRaw ?? [],
    [coursDisponiblesRaw]
  );

  const allNotesRaw = useQuery(
    api.notes.listByEcole,
    ecoleId && anneeId && userId ? { ecoleId, anneeId, userId } : "skip"
  );
  const allNotes = useMemo(() => allNotesRaw ?? [], [allNotesRaw]);

  // ✅ coursStats mémoïsé
  const coursStats = useMemo(() => {
    return coursDisponibles.map((cours) => {
      const notesDuCours = allNotes.filter((n) => n.matiere === cours.nom);
      const nbEleves = elevesDeMaClasse.length;
      const nbNotes = notesDuCours.length;
      const moyenne =
        nbNotes > 0
          ? (
              notesDuCours.reduce((sum, n) => sum + n.note, 0) / nbNotes
            ).toFixed(2)
          : "-";
      return { ...cours, nbNotes, nbEleves, moyenne };
    });
  }, [coursDisponibles, allNotes, elevesDeMaClasse]);

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  const absencesRaw = useQuery(
    api.absences.listByEcole,
    ecoleId && anneeId && userId ? { ecoleId, anneeId, userId } : "skip"
  );

  // ✅ absencesAujourdhui mémoïsé
  const absencesAujourdhui = useMemo(() => {
    if (!absencesRaw || elevesDeMaClasse.length === 0) return [];
    const ids = new Set(elevesDeMaClasse.map((e) => e._id));
    return absencesRaw.filter(
      (a) => a.date === today && ids.has(a.eleveId)
    );
  }, [absencesRaw, elevesDeMaClasse, today]);

  // ✅ Menu mémoïsé
  const menu = useMemo(
    () => [
      { id: "dashboard", label: "Tableau de bord", icon: <BarChart3 size={20} /> },
      { id: "passage", label: "Passage", icon: <ClipboardList size={20} /> },
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
    ],
    []
  );

  // ==================== COULEURS ====================
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const accent = dark ? "#818CF8" : "#4F46E5";
  const warning = "#F59E0B";

  // ==================== SOUS-ÉCRANS ====================

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
          background: dark ? "#78350F" : "#FEF3C7",
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
        }}
      >
        Veuillez demander à l'administrateur d'activer une année scolaire.
      </p>
    </div>
  );

  // ---------- DASHBOARD ----------
  const renderDashboard = () => (
    <div
      style={{
        maxWidth: 1280,
        margin: "0 auto",
        padding: isMobile ? "10px 8px 24px" : "20px 16px 32px",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* Header compact */}
      <div style={{ marginBottom: isMobile ? 12 : 20 }}>
        <h2
          style={{
            fontSize: isMobile ? 17 : 22,
            fontWeight: 700,
            color: textPrimary,
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          Tableau de bord
        </h2>
        <p
          style={{
            color: textSecondary,
            marginTop: 2,
            marginBottom: 0,
            fontSize: isMobile ? 11.5 : 13,
          }}
        >
          Classe {classe}
          {anneeActive ? ` · ${anneeActive.nom}` : ""}
        </p>
      </div>

      {/* Stats */}
      <div
        style={{
          display: isMobile ? "flex" : "grid",
          gridTemplateColumns: isMobile
            ? undefined
            : "repeat(auto-fit, minmax(150px, 1fr))",
          gap: isMobile ? 8 : 12,
          marginBottom: isMobile ? 14 : 20,
          overflowX: isMobile ? "auto" : "visible",
          paddingBottom: isMobile ? 4 : 0,
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
        }}
      >
        <StatCard
          icon={<GraduationCap size={16} />}
          value={elevesDeMaClasse.length}
          label="Élèves"
          color="#4F46E5"
          dark={dark}
          isMobile={isMobile}
        />
        <StatCard
          icon={<BookOpen size={16} />}
          value={coursDisponibles.length}
          label="Cours"
          color="#10B981"
          dark={dark}
          isMobile={isMobile}
        />
        <StatCard
          icon={<AlertTriangle size={16} />}
          value={absencesAujourdhui.length}
          label="Absences auj."
          color="#F59E0B"
          dark={dark}
          isMobile={isMobile}
        />
        <StatCard
          icon={<Clock size={16} />}
          value={coursStats.reduce((sum, c) => sum + c.nbNotes, 0)}
          label="Notes saisies"
          color="#6366F1"
          dark={dark}
          isMobile={isMobile}
        />
      </div>

      {/* Mes cours */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: isMobile ? 8 : 12,
        }}
      >
        <h3
          style={{
            fontSize: isMobile ? 14 : 16,
            fontWeight: 700,
            margin: 0,
            color: textPrimary,
          }}
        >
          Mes cours
        </h3>
        {coursStats.length > 0 && (
          <span
            style={{
              background: dark ? "#334155" : "#F1F5F9",
              color: textSecondary,
              padding: "1px 8px",
              borderRadius: 10,
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            {coursStats.length}
          </span>
        )}
      </div>

      {coursStats.length === 0 ? (
        <div
          style={{
            background: cardBg,
            borderRadius: 12,
            border: `1px solid ${cardBorder}`,
            padding: isMobile ? 24 : 32,
            textAlign: "center",
            color: textSecondary,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: dark ? "#334155" : "#F1F5F9",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 12px",
            }}
          >
            <BookOpen size={22} />
          </div>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              fontWeight: 600,
              color: textPrimary,
            }}
          >
            Aucun cours assigné
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 12 }}>
            Votre emploi du temps ne contient pas encore de cours
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile
              ? "1fr"
              : "repeat(auto-fill, minmax(320px, 1fr))",
            gap: isMobile ? 8 : 12,
          }}
        >
          {coursStats.map((cours) => (
            <CoursCard
              key={cours._id}
              cours={cours}
              dark={dark}
              isMobile={isMobile}
              onClick={() => {
                setSelectedCours(cours);
                setTab("cours");
              }}
              showStats
            />
          ))}
        </div>
      )}
    </div>
  );

  // ---------- SÉLECTION DE COURS ----------
  const renderCoursSelection = () => (
    <div
      style={{
        maxWidth: 960,
        margin: "0 auto",
        padding: isMobile ? "10px 8px 24px" : "20px 16px 32px",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <div style={{ marginBottom: isMobile ? 12 : 20 }}>
        <h2
          style={{
            fontSize: isMobile ? 17 : 22,
            fontWeight: 700,
            color: textPrimary,
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          Mes cours
        </h2>
        <p
          style={{
            color: textSecondary,
            marginTop: 2,
            marginBottom: 0,
            fontSize: isMobile ? 11.5 : 13,
          }}
        >
          {coursDisponibles.length} cours · Classe {classe}
        </p>
      </div>

      {coursDisponibles.length === 0 ? (
        <div
          style={{
            background: cardBg,
            borderRadius: 12,
            border: `1px solid ${cardBorder}`,
            padding: isMobile ? 32 : 48,
            textAlign: "center",
            color: textSecondary,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: dark ? "#334155" : "#F1F5F9",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 12px",
            }}
          >
            <BookOpen size={26} />
          </div>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              fontWeight: 600,
              color: textPrimary,
            }}
          >
            Aucun cours disponible
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 12.5 }}>
            Contactez l'administration pour qu'elle vous assigne des cours
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile
              ? "1fr"
              : "repeat(auto-fill, minmax(320px, 1fr))",
            gap: isMobile ? 8 : 12,
          }}
        >
          {coursDisponibles.map((cours) => (
            <CoursCard
              key={cours._id}
              cours={cours}
              dark={dark}
              isMobile={isMobile}
              onClick={() => setSelectedCours(cours)}
              showStats={false}
            />
          ))}
        </div>
      )}
    </div>
  );

  // ---------- COURS SÉLECTIONNÉ ----------
  const renderCoursSelected = () => (
    <div
      style={{
        maxWidth: 1280,
        margin: "0 auto",
        padding: isMobile ? "10px 8px 24px" : "20px 16px 32px",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: isMobile ? 12 : 20,
        }}
      >
        <button
          onClick={() => setSelectedCours(null)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 36,
            height: 36,
            borderRadius: 10,
            background: cardBg,
            border: `1px solid ${cardBorder}`,
            cursor: "pointer",
            color: textPrimary,
            flexShrink: 0,
          }}
          aria-label="Retour"
        >
          <ArrowLeft size={18} />
        </button>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h2
            style={{
              fontSize: isMobile ? 17 : 22,
              fontWeight: 700,
              color: textPrimary,
              margin: 0,
              lineHeight: 1.2,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {selectedCours.nom}
          </h2>
          <p
            style={{
              color: textSecondary,
              marginTop: 2,
              marginBottom: 0,
              fontSize: isMobile ? 11.5 : 13,
            }}
          >
            Classe {classe}
            {anneeActive ? ` · ${anneeActive.nom}` : ""}
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

  // ---------- RENDU PRINCIPAL ----------
  const renderContent = () => {
    // ✅ Utilisation de la constante TABS_REQUIRING_YEAR
    if (!anneeId && TABS_REQUIRING_YEAR.includes(tab)) {
      return renderNoAnneeMessage();
    }

    switch (tab) {
      case "dashboard":
        return renderDashboard();

      case "passage":
        return (
          <AssistantPassageEnseignant
            ecoleId={ecoleId}
            anneeActiveId={anneeId}
            user={user}
          />
        );

      case "cours":
        return selectedCours
          ? renderCoursSelected()
          : renderCoursSelection();

      case "absences":
        return (
          <SaisirAbsence
            ecoleId={ecoleId}
            eleves={elevesDeMaClasse}
            user={user}
            anneeId={anneeId}
            anneeActive={anneeActive}
          />
        );

      case "emploi":
        return (
          <ConsultationEmploiDuTemps
            ecoleId={ecoleId}
            classe={classe}
            anneeId={anneeId}
            user={user}
          />
        );

      case "examens":
        return (
          <ConsultationExamens
            ecoleId={ecoleId}
            anneeId={anneeId}
            classe={classe}
            user={user}
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