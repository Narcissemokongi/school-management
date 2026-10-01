// src/components/EnseignantApp.jsx
import { useMemo, useCallback, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
  Clock, ChevronRight, ClipboardList,
} from "lucide-react";
import { ConsultationExamens } from "./ConsultationExamens";

// ════════════════════════════════════════════════════════════════════
// CONSTANTES
// ════════════════════════════════════════════════════════════════════
const VALID_TABS = [
  "dashboard", "passage", "cours", "absences", "emploi", "examens",
  "messagerie", "appels", "profil", "aide", "mentions", "confidentialite",
];

const TABS_REQUIRING_YEAR = ["dashboard", "cours", "absences"];
const TABS_FULL_HEIGHT = ["messagerie", "appels"];

// ════════════════════════════════════════════════════════════════════
// CARTE STATISTIQUE
// ════════════════════════════════════════════════════════════════════
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
        gap: isMobile ? 8 : 10,
        minWidth: 0,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: isMobile ? 28 : 32,
          height: isMobile ? 28 : 32,
          borderRadius: 8,
          background: `${color}20`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          color,
        }}
        aria-hidden="true"
      >
        {icon}
      </div>
      <div style={{ minWidth: 0, overflow: "hidden" }}>
        <div
          style={{
            color: dark ? "#94A3B8" : "#64748B",
            fontSize: isMobile ? 10 : 10.5,
            fontWeight: 500,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {label}
        </div>
        <div
          style={{
            color: dark ? "#F1F5F9" : "#1E293B",
            fontSize: isMobile ? 16 : 18,
            fontWeight: 700,
            lineHeight: 1.1,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// CARTE COURS
// ════════════════════════════════════════════════════════════════════
function CoursCard({ cours, dark, isMobile, onClick, showStats }) {
  const [pressed, setPressed] = useState(false);
  const [focused, setFocused] = useState(false);

  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const accent = dark ? "#818CF8" : "#4F46E5";

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        background: cardBg,
        borderRadius: 12,
        padding: isMobile ? "10px 12px" : "12px 14px",
        boxShadow: dark
          ? "0 1px 2px rgba(0,0,0,0.25)"
          : "0 1px 2px rgba(0,0,0,0.04)",
        border: `1px solid ${focused ? accent : cardBorder}`,
        display: "flex",
        alignItems: "center",
        gap: isMobile ? 10 : 12,
        cursor: "pointer",
        transition:
          "border-color 0.15s ease, transform 0.1s ease, box-shadow 0.15s ease",
        transform: pressed ? "scale(0.98)" : "scale(1)",
        userSelect: "none",
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation",
        outline: focused ? `2px solid ${accent}` : "none",
        outlineOffset: -2,
        minWidth: 0,
        boxSizing: "border-box",
        minHeight: isMobile ? 60 : undefined,
      }}
      aria-label={`Ouvrir le cours ${cours.nom}`}
    >
      <div
        style={{
          width: isMobile ? 34 : 36,
          height: isMobile ? 34 : 36,
          borderRadius: "50%",
          background: dark ? "#312E81" : "#EEF2FF",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: accent,
          flexShrink: 0,
        }}
        aria-hidden="true"
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
        aria-hidden="true"
      />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// BOUTON RETOUR (avec state React, plus de manipulation DOM)
// ════════════════════════════════════════════════════════════════════
function BackButton({ onClick, isMobile, cardBg, cardBorder, textPrimary }) {
  const [pressed, setPressed] = useState(false);
  const [focused, setFocused] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: isMobile ? 44 : 36,
        height: isMobile ? 44 : 36,
        minWidth: 44,
        minHeight: 44,
        borderRadius: 10,
        background: cardBg,
        border: `1px solid ${cardBorder}`,
        cursor: "pointer",
        color: textPrimary,
        flexShrink: 0,
        padding: 0,
        transform: pressed ? "scale(0.92)" : "scale(1)",
        transition: "transform 0.1s ease, border-color 0.15s ease",
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation",
        outline: focused ? `2px solid ${textPrimary}` : "none",
        outlineOffset: 2,
      }}
      aria-label="Retour"
    >
      <ArrowLeft size={isMobile ? 20 : 18} aria-hidden="true" />
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ════════════════════════════════════════════════════════════════════
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

  // ✅ FIX : useLocation au lieu de useParams
  const location = useLocation();
  const navigate = useNavigate();

  // ✅ FIX : extrait le tab depuis le pathname (ex: /enseignant/dashboard → "dashboard")
  const tab = useMemo(() => {
    const parts = location.pathname.split("/").filter(Boolean);
    const candidate = parts[1];
    return VALID_TABS.includes(candidate) ? candidate : "dashboard";
  }, [location.pathname]);

  const setTab = useCallback(
    (newTab) => {
      if (VALID_TABS.includes(newTab)) {
        navigate(`/enseignant/${newTab}`);
      }
    },
    [navigate]
  );

  const selectedCours = useAppStore((state) => state.enseignantSelectedCours);
  const setSelectedCours = useAppStore(
    (state) => state.setEnseignantSelectedCours
  );

  const setMessagingContactId = useAppStore(
    (state) => state.setMessagingContactId
  );

  const handleNavigateToMessaging = useCallback(
    (contactId) => {
      setMessagingContactId(contactId);
      if (contactId) {
        navigate(`/enseignant/messagerie/chat/${contactId}`);
      } else {
        navigate("/enseignant/messagerie");
      }
    },
    [setMessagingContactId, navigate]
  );

  const elevesDeMaClasse = useMemo(
    () => (classe ? (eleves ?? []).filter((e) => e.classe === classe) : []),
    [eleves, classe]
  );

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

  const absencesAujourdhui = useMemo(() => {
    if (!absencesRaw || elevesDeMaClasse.length === 0) return [];
    const ids = new Set(elevesDeMaClasse.map((e) => e._id));
    return absencesRaw.filter(
      (a) => a.date === today && ids.has(a.eleveId)
    );
  }, [absencesRaw, elevesDeMaClasse, today]);

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

  // Couleurs
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const accent = dark ? "#818CF8" : "#4F46E5";
  const warning = "#F59E0B";

  // ─── No année ───
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
        <Calendar size={30} color={warning} aria-hidden="true" />
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

  // ─── Dashboard ───
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

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile
            ? "repeat(2, minmax(0, 1fr))"
            : "repeat(auto-fit, minmax(150px, 1fr))",
          gap: isMobile ? 8 : 12,
          marginBottom: isMobile ? 14 : 20,
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
              fontVariantNumeric: "tabular-nums",
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
            aria-hidden="true"
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

  // ─── Cours selection ───
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
            aria-hidden="true"
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

  // ─── Cours selectionné ───
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
        <BackButton
          onClick={() => setSelectedCours(null)}
          isMobile={isMobile}
          cardBg={cardBg}
          cardBorder={cardBorder}
          textPrimary={textPrimary}
        />
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

  // ─── Rendu principal ───
  const renderContent = () => {
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
        return <MessagerieApp user={user} ecoleId={ecoleId} />;

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

  const needsFullHeight = TABS_FULL_HEIGHT.includes(tab);

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
        style={
          needsFullHeight
            ? {
                display: "flex",
                flexDirection: "column",
                flex: 1,
                minHeight: 0,
                height: "100%",
                width: "100%",
                overflow: "hidden",
              }
            : undefined
        }
      >
        {renderContent()}
      </div>
    </Layout>
  );
}