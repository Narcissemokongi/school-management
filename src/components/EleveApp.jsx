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
import { BulletinEnfant } from "./BulletinEnfant";
import { FraisEnfant } from "./FraisEnfant";
import { Aide } from "./Aide";
import { MentionsLegales } from "./MentionsLegales";
import { PolitiqueConfidentialite } from "./PolitiqueConfidentialite";
import { ConsultationExamens } from "./ConsultationExamens";
import { useAppStore } from "@/store/appStore";
import {
  Home, BookOpen, AlertTriangle, Calendar, MessageCircle, Phone, User,
  HelpCircle, FileText, Shield, TrendingUp, DollarSign, Clock,
  GraduationCap, Award, Trophy, Medal, Star, ClipboardList,
} from "lucide-react";

// ✅ Onglets valides (source de vérité pour valider le param URL)
const VALID_TABS = [
  "accueil",
  "notes",
  "absences",
  "emploi",
  "examens",
  "bulletin",
  "frais",
  "classement",
  "messagerie",
  "appels",
  "profil",
  "aide",
  "mentions",
  "confidentialite",
];

// ✅ Onglets qui nécessitent une année active
const TABS_REQUIRING_YEAR = ["accueil", "notes", "absences", "emploi"];

// ============================================================
// COMPOSANT : Classement de l'élève
// ============================================================
function ClassementEleve({ ecoleId, anneeId, classe, eleveId, userId }) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();

  // ✅ userId ajouté aux 2 queries + garde stricte
  const classementRaw = useQuery(
    api.classement.getClassement,
    ecoleId && anneeId && classe && userId
      ? { ecoleId, anneeId, classe, userId }
      : "skip"
  );
  const classement = useMemo(() => classementRaw ?? [], [classementRaw]);

  const ecole = useQuery(
    api.ecoles.get,
    ecoleId && userId ? { ecoleId, userId } : "skip"
  );

  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const accent = dark ? "#818CF8" : "#4F46E5";
  const shadow = dark
    ? "0 1px 3px rgba(0,0,0,0.3)"
    : "0 1px 3px rgba(0,0,0,0.05)";

  // ✅ top3 mémoïsé (avant les early returns)
  const top3 = useMemo(() => classement.slice(0, 3), [classement]);

  // ✅ Élève courant mémoïsé
  const eleve = useMemo(
    () => classement.find((e) => e._id === eleveId),
    [classement, eleveId]
  );

  // ✅ Mention mémoïsée
  const mention = useMemo(() => {
    if (!eleve || !ecole) return "";
    const moy = eleve.moyenneGenerale;
    if (ecole.seuilFelicitations && moy >= ecole.seuilFelicitations)
      return "Félicitations";
    if (ecole.seuilEncouragement && moy >= ecole.seuilEncouragement)
      return "Encouragement";
    if (ecole.seuilAvertissement && moy <= ecole.seuilAvertissement)
      return "Avertissement";
    return "";
  }, [eleve, ecole]);

  // ===== EARLY RETURNS (après tous les hooks) =====
  if (!classe) {
    return <p style={{ color: textPrimary }}>Veuillez sélectionner une classe.</p>;
  }
  if (classement.length === 0) {
    return <p style={{ color: textPrimary }}>Aucun classement disponible.</p>;
  }
  if (!eleve) {
    return <p style={{ color: textPrimary }}>Élève introuvable dans ce classement.</p>;
  }

  return (
    <div
      style={{
        maxWidth: 800,
        margin: "0 auto",
        padding: isMobile ? "16px 12px" : "24px 16px",
      }}
    >
      <h2
        style={{
          fontSize: isMobile ? 22 : 28,
          fontWeight: 700,
          color: textPrimary,
          marginBottom: isMobile ? 16 : 24,
        }}
      >
        Mon classement
      </h2>

      {/* Carte personnelle */}
      <div
        style={{
          background: cardBg,
          borderRadius: 16,
          padding: isMobile ? 14 : 20,
          boxShadow: shadow,
          marginBottom: isMobile ? 20 : 32,
          display: "flex",
          alignItems: "center",
          gap: isMobile ? 10 : 16,
          borderLeft: `6px solid ${accent}`,
          border: `1px solid ${cardBorder}`,
        }}
      >
        <Trophy size={isMobile ? 30 : 40} color={accent} />
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontWeight: 700,
              fontSize: isMobile ? 16 : 18,
              color: textPrimary,
            }}
          >
            {eleve.nom} {eleve.postnom}
          </div>
          <div style={{ color: textSecondary, fontSize: isMobile ? 13 : 14 }}>
            Rang : <strong>{eleve.rang}</strong> / {classement.length}
          </div>
          <div
            style={{
              color: accent,
              fontWeight: 600,
              fontSize: isMobile ? 12 : 13,
              marginTop: 4,
            }}
          >
            {mention || "Aucune mention"}
          </div>
        </div>
        <div
          style={{
            fontSize: isMobile ? 20 : 24,
            fontWeight: 800,
            color: accent,
          }}
        >
          {eleve.moyenneGenerale.toFixed(1)}%
        </div>
      </div>

      {/* Top 3 */}
      <h3
        style={{
          fontSize: isMobile ? 18 : 20,
          fontWeight: 600,
          marginBottom: isMobile ? 12 : 16,
          color: textPrimary,
        }}
      >
        Top 3 de la classe
      </h3>
      <div style={{ display: "grid", gap: isMobile ? 8 : 12 }}>
        {top3.map((e, idx) => {
          const couleurs = ["#FFD700", "#C0C0C0", "#CD7F32"];
          const icones = [
            <Trophy size={isMobile ? 20 : 24} key="1" />,
            <Medal size={isMobile ? 20 : 24} key="2" />,
            <Star size={isMobile ? 20 : 24} key="3" />,
          ];
          return (
            <div
              key={e._id}
              style={{
                background: cardBg,
                borderRadius: 12,
                padding: isMobile ? 12 : 16,
                display: "flex",
                alignItems: "center",
                gap: isMobile ? 8 : 12,
                boxShadow: shadow,
                border: `1px solid ${cardBorder}`,
                borderLeft: `6px solid ${couleurs[idx]}`,
              }}
            >
              <div style={{ color: couleurs[idx] }}>{icones[idx]}</div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontWeight: 600,
                    color: textPrimary,
                    fontSize: isMobile ? 14 : 16,
                  }}
                >
                  {e.nom} {e.postnom}
                </div>
                <div
                  style={{
                    fontSize: isMobile ? 12 : 13,
                    color: textSecondary,
                  }}
                >
                  Moyenne : {e.moyenneGenerale.toFixed(1)}%
                </div>
              </div>
              <div
                style={{
                  fontSize: isMobile ? 18 : 24,
                  fontWeight: 800,
                  color: couleurs[idx],
                }}
              >
                #{e.rang}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// COMPOSANT PRINCIPAL : EleveApp
// ============================================================
export function EleveApp({
  user,
  ecoleId,
  anneeId,
  anneeActive,
  dark,
  toggle,
  handleLogout,
}) {
  const isMobile = useIsMobile();

  // ========== URL ROUTING ==========
  // ✅ Source de vérité = URL (React Router), pas Zustand
  const { tab: tabParam } = useParams();
  const navigate = useNavigate();

  const tab = useMemo(
    () => (VALID_TABS.includes(tabParam) ? tabParam : "accueil"),
    [tabParam]
  );

  const setTab = useCallback(
    (newTab) => {
      if (VALID_TABS.includes(newTab)) {
        navigate(`/eleve/${newTab}`);
      }
    },
    [navigate]
  );

  // ✅ messagingContactId reste en Zustand
  const messagingContactId = useAppStore((state) => state.messagingContactId);
  const setMessagingContactId = useAppStore(
    (state) => state.setMessagingContactId
  );

  const userId = user?._id;

  // ✅ Handler mémoïsé
  const handleNavigateToMessaging = useCallback(
    (contactId) => {
      setMessagingContactId(contactId);
      setTab("messagerie");
    },
    [setMessagingContactId, setTab]
  );

  // ===== Queries =====
  const eleve = useQuery(
    api.eleves.getByUserId,
    userId && anneeId ? { userId, anneeId } : "skip"
  );

  const notesRaw = useQuery(
    api.notes.listByEleve,
    eleve && userId ? { eleveId: eleve._id, userId } : "skip"
  );
  const notes = useMemo(() => notesRaw ?? [], [notesRaw]);

  const absencesRaw = useQuery(
    api.absences.listByEleve,
    eleve && userId ? { eleveId: eleve._id, userId } : "skip"
  );
  const absences = useMemo(() => absencesRaw ?? [], [absencesRaw]);

  const coursDisponiblesRaw = useQuery(
    api.cours.list,
    eleve && ecoleId && userId
      ? { ecoleId, classe: eleve.classe, userId, anneeId }
      : "skip"
  );
  const coursDisponibles = useMemo(
    () => coursDisponiblesRaw ?? [],
    [coursDisponiblesRaw]
  );

  // ✅ Menu mémoïsé
  const menu = useMemo(
    () => [
      { id: "accueil", label: "Accueil", icon: <Home size={20} /> },
      { id: "notes", label: "Notes", icon: <BookOpen size={20} /> },
      { id: "absences", label: "Absences", icon: <AlertTriangle size={20} /> },
      { id: "emploi", label: "Emploi du temps", icon: <Calendar size={20} /> },
      { id: "examens", label: "Examens", icon: <ClipboardList size={20} /> },
      { id: "bulletin", label: "Bulletin", icon: <FileText size={20} /> },
      { id: "frais", label: "Frais", icon: <DollarSign size={20} /> },
      { id: "classement", label: "Classement", icon: <Award size={20} /> },
      { id: "messagerie", label: "Messages", icon: <MessageCircle size={20} /> },
      { id: "appels", label: "Appels", icon: <Phone size={20} /> },
      { id: "profil", label: "Profil", icon: <User size={20} /> },
      { id: "aide", label: "Aide", icon: <HelpCircle size={20} /> },
      { id: "mentions", label: "Mentions légales", icon: <FileText size={20} /> },
      { id: "confidentialite", label: "Confidentialité", icon: <Shield size={20} /> },
    ],
    []
  );

  // ✅ Stats mémoïsées
  const stats = useMemo(() => {
    const totalNotes = notes.length;
    const absencesCount = absences.filter((a) => a.type === "absence").length;
    const retardsCount = absences.filter((a) => a.type === "retard").length;
    const matieresAvecNotes = [...new Set(notes.map((n) => n.matiere))].length;

    let moyenneGenerale = "-";
    if (notes.length > 0) {
      const num = notes.reduce(
        (sum, n) => sum + n.note * (n.coefficient || 1),
        0
      );
      const den = notes.reduce((sum, n) => sum + (n.coefficient || 1), 0);
      moyenneGenerale = den > 0 ? (num / den).toFixed(2) : "-";
    }

    return {
      totalNotes,
      absencesCount,
      retardsCount,
      matieresAvecNotes,
      moyenneGenerale,
    };
  }, [notes, absences]);

  // ✅ Notes groupées par période
  const notesParPeriode = useMemo(() => {
    const groupes = new Map();
    for (const n of notes) {
      if (!groupes.has(n.periode)) groupes.set(n.periode, []);
      groupes.get(n.periode).push(n);
    }
    return [...groupes.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([periode, notesPeriode]) => {
        let moyenne = "-";
        if (notesPeriode.length > 0) {
          const num = notesPeriode.reduce(
            (s, n) => s + n.note * (n.coefficient || 1),
            0
          );
          const den = notesPeriode.reduce(
            (s, n) => s + (n.coefficient || 1),
            0
          );
          moyenne = den > 0 ? (num / den).toFixed(2) : "-";
        }
        return { periode, notes: notesPeriode, moyenne };
      });
  }, [notes]);

  // ✅ Absences triées
  const absencesTriees = useMemo(
    () =>
      [...absences].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    [absences]
  );

  // ============================================================
  // ÉTATS DE CHARGEMENT
  // ============================================================
  if (eleve === undefined) {
    return (
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: isMobile ? "24px 16px" : "32px 24px",
          textAlign: "center",
        }}
      >
        <GraduationCap
          size={isMobile ? 40 : 48}
          color="#94A3B8"
          style={{ marginBottom: 16 }}
        />
        <h2
          style={{
            fontSize: isMobile ? 20 : 24,
            fontWeight: 600,
            color: dark ? "#F1F5F9" : "#1E293B",
            margin: "0 0 8px",
          }}
        >
          Chargement de votre profil…
        </h2>
      </div>
    );
  }

  if (eleve === null) {
    return (
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: isMobile ? "24px 16px" : "32px 24px",
          textAlign: "center",
        }}
      >
        <GraduationCap
          size={isMobile ? 40 : 48}
          color="#F59E0B"
          style={{ marginBottom: 16 }}
        />
        <h2
          style={{
            fontSize: isMobile ? 20 : 24,
            fontWeight: 600,
            color: dark ? "#F1F5F9" : "#1E293B",
            margin: "0 0 8px",
          }}
        >
          Aucun élève associé à ce compte
        </h2>
        <p
          style={{
            color: dark ? "#94A3B8" : "#64748B",
            fontSize: isMobile ? 13 : 14,
          }}
        >
          Veuillez contacter l'administration pour associer votre compte à un
          élève.
        </p>
      </div>
    );
  }

  const {
    totalNotes,
    absencesCount,
    retardsCount,
    matieresAvecNotes,
    moyenneGenerale,
  } = stats;

  const renderContent = () => {
    // ✅ Utilisation de la constante TABS_REQUIRING_YEAR
    if (!anneeId && TABS_REQUIRING_YEAR.includes(tab)) {
      return (
        <div
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            padding: isMobile ? "24px 16px" : "32px 24px",
            textAlign: "center",
          }}
        >
          <Calendar
            size={isMobile ? 40 : 48}
            color="#F59E0B"
            style={{ marginBottom: 16 }}
          />
          <h2
            style={{
              fontSize: isMobile ? 20 : 24,
              fontWeight: 600,
              color: dark ? "#F1F5F9" : "#1E293B",
              margin: "0 0 8px",
            }}
          >
            Aucune année scolaire active
          </h2>
          <p
            style={{
              color: dark ? "#94A3B8" : "#64748B",
              fontSize: isMobile ? 13 : 14,
            }}
          >
            Veuillez contacter l'administration pour activer une année scolaire.
          </p>
        </div>
      );
    }

    switch (tab) {
      case "accueil":
        return (
          <div
            style={{
              maxWidth: 1280,
              margin: "0 auto",
              padding: isMobile ? "16px 12px" : "24px 16px",
            }}
          >
            <div style={{ marginBottom: isMobile ? 20 : 32 }}>
              <h2
                style={{
                  fontSize: isMobile ? 22 : 28,
                  fontWeight: 700,
                  color: dark ? "#F1F5F9" : "#1E293B",
                  margin: 0,
                }}
              >
                Bonjour, {eleve.nom}
              </h2>
              <p
                style={{
                  color: dark ? "#94A3B8" : "#64748B",
                  marginTop: 4,
                  fontSize: isMobile ? 13 : 14,
                }}
              >
                Classe {eleve.classe} · {anneeActive?.nom}
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : "repeat(auto-fit, minmax(180px, 1fr))",
                gap: isMobile ? 12 : 16,
                marginBottom: isMobile ? 20 : 32,
              }}
            >
              <StatCard
                icon={<BookOpen size={isMobile ? 20 : 24} />}
                value={totalNotes}
                label="Notes"
                color={dark ? "#818CF8" : "#4F46E5"}
                dark={dark}
              />
              <StatCard
                icon={<Award size={isMobile ? 20 : 24} />}
                value={matieresAvecNotes}
                label="Matières"
                color="#10B981"
                dark={dark}
              />
              <StatCard
                icon={<AlertTriangle size={isMobile ? 20 : 24} />}
                value={absencesCount}
                label="Absences"
                color="#EF4444"
                dark={dark}
              />
              <StatCard
                icon={<Clock size={isMobile ? 20 : 24} />}
                value={retardsCount}
                label="Retards"
                color="#F59E0B"
                dark={dark}
              />
              {moyenneGenerale !== "-" && (
                <StatCard
                  icon={<TrendingUp size={isMobile ? 20 : 24} />}
                  value={`${moyenneGenerale}/20`}
                  label="Moyenne générale"
                  color="#6366F1"
                  dark={dark}
                />
              )}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : "repeat(auto-fit, minmax(200px, 1fr))",
                gap: isMobile ? 12 : 16,
                marginBottom: isMobile ? 20 : 32,
              }}
            >
              <QuickAccessCard
                icon={<BookOpen size={isMobile ? 24 : 28} />}
                title="Notes"
                subtitle="Consulter vos résultats"
                onClick={() => setTab("notes")}
                color={dark ? "#818CF8" : "#4F46E5"}
                dark={dark}
              />
              <QuickAccessCard
                icon={<Calendar size={isMobile ? 24 : 28} />}
                title="Emploi du temps"
                subtitle="Voir les horaires"
                onClick={() => setTab("emploi")}
                color="#10B981"
                dark={dark}
              />
              <QuickAccessCard
                icon={<DollarSign size={isMobile ? 24 : 28} />}
                title="Frais"
                subtitle="Suivre vos paiements"
                onClick={() => setTab("frais")}
                color="#F59E0B"
                dark={dark}
              />
              <QuickAccessCard
                icon={<FileText size={isMobile ? 24 : 28} />}
                title="Bulletin"
                subtitle="Votre bulletin scolaire"
                onClick={() => setTab("bulletin")}
                color="#6366F1"
                dark={dark}
              />
              <QuickAccessCard
                icon={<Award size={isMobile ? 24 : 28} />}
                title="Classement"
                subtitle="Voir votre rang"
                onClick={() => setTab("classement")}
                color={dark ? "#818CF8" : "#4F46E5"}
                dark={dark}
              />
            </div>
          </div>
        );

      case "notes":
        if (notes.length === 0) {
          return (
            <div
              style={{
                maxWidth: 800,
                margin: "0 auto",
                padding: isMobile ? "24px 16px" : "32px 24px",
                textAlign: "center",
              }}
            >
              <BookOpen
                size={isMobile ? 40 : 48}
                color="#94A3B8"
                style={{ marginBottom: 16 }}
              />
              <h2
                style={{
                  fontSize: isMobile ? 20 : 24,
                  fontWeight: 600,
                  color: dark ? "#F1F5F9" : "#1E293B",
                  margin: "0 0 8px",
                }}
              >
                Aucune note disponible
              </h2>
              <p
                style={{
                  color: dark ? "#94A3B8" : "#64748B",
                  fontSize: isMobile ? 13 : 14,
                }}
              >
                Vos notes seront affichées ici dès qu'elles seront saisies par
                vos enseignants.
              </p>
            </div>
          );
        }
        return (
          <div
            style={{
              maxWidth: 900,
              margin: "0 auto",
              padding: isMobile ? "16px 12px" : "24px 16px",
            }}
          >
            <h2
              style={{
                fontSize: isMobile ? 22 : 28,
                fontWeight: 700,
                color: dark ? "#F1F5F9" : "#1E293B",
                marginBottom: isMobile ? 16 : 24,
              }}
            >
              Mes notes
            </h2>
            {notesParPeriode.map(({ periode, notes: notesPeriode, moyenne }) => (
              <div key={periode} style={{ marginBottom: isMobile ? 16 : 24 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: isMobile ? "10px 12px" : "12px 16px",
                    background: dark ? "#0F172A" : "#F8FAFC",
                    borderRadius: 8,
                    marginBottom: isMobile ? 8 : 12,
                  }}
                >
                  <h3
                    style={{
                      fontSize: isMobile ? 16 : 18,
                      fontWeight: 600,
                      color: dark ? "#F1F5F9" : "#1E293B",
                      margin: 0,
                    }}
                  >
                    {periode}
                  </h3>
                  <span
                    style={{
                      fontSize: isMobile ? 14 : 16,
                      fontWeight: 700,
                      color: dark ? "#818CF8" : "#4F46E5",
                    }}
                  >
                    Moyenne {moyenne}/20
                  </span>
                </div>
                <div style={{ display: "grid", gap: isMobile ? 6 : 8 }}>
                  {notesPeriode.map((n) => (
                    <div
                      key={n._id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: isMobile ? "8px 12px" : "10px 14px",
                        background: dark ? "#1E293B" : "#FFFFFF",
                        borderRadius: 8,
                        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                        border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontWeight: 500,
                            fontSize: isMobile ? 14 : 15,
                            color: dark ? "#F1F5F9" : "#1E293B",
                          }}
                        >
                          {n.matiere}
                        </div>
                        <div
                          style={{
                            fontSize: isMobile ? 11 : 12,
                            color: dark ? "#94A3B8" : "#64748B",
                          }}
                        >
                          Coeff. {n.coefficient}
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        {n.appreciation && (
                          <span
                            style={{
                              fontSize: isMobile ? 11 : 12,
                              color: dark ? "#94A3B8" : "#64748B",
                              fontStyle: "italic",
                            }}
                          >
                            {n.appreciation}
                          </span>
                        )}
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: isMobile ? 14 : 16,
                            color: dark ? "#F1F5F9" : "#1E293B",
                          }}
                        >
                          {n.note}/20
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );

      case "absences":
        if (absences.length === 0) {
          return (
            <div
              style={{
                maxWidth: 800,
                margin: "0 auto",
                padding: isMobile ? "24px 16px" : "32px 24px",
                textAlign: "center",
              }}
            >
              <AlertTriangle
                size={isMobile ? 40 : 48}
                color="#10B981"
                style={{ marginBottom: 16 }}
              />
              <h2
                style={{
                  fontSize: isMobile ? 20 : 24,
                  fontWeight: 600,
                  color: dark ? "#F1F5F9" : "#1E293B",
                  margin: "0 0 8px",
                }}
              >
                Aucune absence ou retard
              </h2>
              <p
                style={{
                  color: dark ? "#94A3B8" : "#64748B",
                  fontSize: isMobile ? 13 : 14,
                }}
              >
                Félicitations ! Vous êtes assidu(e).
              </p>
            </div>
          );
        }
        return (
          <div
            style={{
              maxWidth: 900,
              margin: "0 auto",
              padding: isMobile ? "16px 12px" : "24px 16px",
            }}
          >
            <h2
              style={{
                fontSize: isMobile ? 22 : 28,
                fontWeight: 700,
                color: dark ? "#F1F5F9" : "#1E293B",
                marginBottom: isMobile ? 16 : 24,
              }}
            >
              Absences & Retards
            </h2>
            <div style={{ display: "grid", gap: isMobile ? 6 : 8 }}>
              {absencesTriees.map((a) => (
                <div
                  key={a._id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: isMobile ? "8px 12px" : "12px 16px",
                    background: dark ? "#1E293B" : "#FFFFFF",
                    borderRadius: 8,
                    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                    border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <span
                      style={{
                        padding: "4px 10px",
                        borderRadius: 12,
                        fontSize: isMobile ? 11 : 12,
                        fontWeight: 600,
                        background:
                          a.type === "absence"
                            ? dark
                              ? "#7F1D1D"
                              : "#FEE2E2"
                            : dark
                            ? "#78350F"
                            : "#FEF3C7",
                        color:
                          a.type === "absence"
                            ? dark
                              ? "#F87171"
                              : "#B91C1C"
                            : dark
                            ? "#FBBF24"
                            : "#92400E",
                      }}
                    >
                      {a.type === "absence" ? "Absence" : "Retard"}
                    </span>
                    <span
                      style={{
                        fontSize: isMobile ? 13 : 14,
                        fontWeight: 500,
                        color: dark ? "#F1F5F9" : "#1E293B",
                      }}
                    >
                      {a.date}
                    </span>
                  </div>
                  {a.commentaire && (
                    <span
                      style={{
                        fontSize: isMobile ? 12 : 13,
                        color: dark ? "#94A3B8" : "#64748B",
                        fontStyle: "italic",
                      }}
                    >
                      {a.commentaire}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      case "emploi":
        return (
          <ConsultationEmploiDuTemps
            ecoleId={ecoleId}
            classe={eleve.classe}
            anneeId={anneeId}
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

      case "bulletin":
        return (
          <BulletinEnfant
            eleveId={eleve._id}
            ecoleId={ecoleId}
            nom={eleve.nom}
            postnom={eleve.postnom}
            classe={eleve.classe}
            user={user}
          />
        );

      case "frais":
        return <FraisEnfant eleveId={eleve._id} user={user} />;

      case "examens":
        return (
          <ConsultationExamens
            ecoleId={ecoleId}
            anneeId={anneeId}
            classe={eleve.classe}
            user={user}
          />
        );

      case "classement":
        return (
          <ClassementEleve
            ecoleId={ecoleId}
            anneeId={anneeId}
            classe={eleve.classe}
            eleveId={eleve._id}
            userId={userId}
          />
        );

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
      {!anneeId && TABS_REQUIRING_YEAR.includes(tab) && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            background: dark ? "#78350F" : "#FEF3C7",
            color: dark ? "#FBBF24" : "#92400E",
            padding: isMobile ? "10px 12px" : "10px 20px",
            fontSize: isMobile ? 12 : 13,
            fontWeight: 500,
            borderRadius: "0 0 12px 12px",
            margin: isMobile ? "0 12px 12px" : "0 24px 16px",
          }}
        >
          <AlertTriangle size={14} style={{ flexShrink: 0 }} />
          <span>
            Aucune année scolaire active. Certaines données sont indisponibles.
          </span>
        </div>
      )}
      {renderContent()}
    </Layout>
  );
}

// ============================================================
// COMPOSANTS UTILITAIRES
// ============================================================
function StatCard({ icon, value, label, color, dark }) {
  const isMobile = useIsMobile();

  return (
    <div
      style={{
        background: dark ? "#1E293B" : "#FFFFFF",
        borderRadius: 16,
        padding: isMobile ? 14 : 20,
        display: "flex",
        alignItems: "center",
        gap: isMobile ? 12 : 16,
        boxShadow: dark
          ? "0 1px 3px rgba(0,0,0,0.3)"
          : "0 1px 3px rgba(0,0,0,0.05)",
        border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
      }}
    >
      <div
        style={{
          width: isMobile ? 40 : 48,
          height: isMobile ? 40 : 48,
          background: `${color}${dark ? "33" : "15"}`,
          borderRadius: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: color,
        }}
      >
        {icon}
      </div>
      <div>
        <div
          style={{
            fontSize: isMobile ? 18 : 24,
            fontWeight: 700,
            color: dark ? "#F1F5F9" : "#1E293B",
          }}
        >
          {value}
        </div>
        <div
          style={{
            fontSize: isMobile ? 12 : 14,
            color: dark ? "#94A3B8" : "#64748B",
          }}
        >
          {label}
        </div>
      </div>
    </div>
  );
}

function QuickAccessCard({ icon, title, subtitle, onClick, color, dark }) {
  const isMobile = useIsMobile();

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
        background: dark ? "#1E293B" : "#FFFFFF",
        borderRadius: 16,
        padding: isMobile ? 14 : 20,
        textAlign: "center",
        boxShadow: dark
          ? "0 1px 3px rgba(0,0,0,0.3)"
          : "0 1px 3px rgba(0,0,0,0.05)",
        border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
        cursor: "pointer",
        transition: "box-shadow 0.15s, transform 0.1s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = dark
          ? "0 2px 8px rgba(0,0,0,0.5)"
          : "0 2px 8px rgba(0,0,0,0.08)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = dark
          ? "0 1px 3px rgba(0,0,0,0.3)"
          : "0 1px 3px rgba(0,0,0,0.05)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div
        style={{
          width: isMobile ? 48 : 56,
          height: isMobile ? 48 : 56,
          borderRadius: 14,
          background: `${color}${dark ? "33" : "15"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 12px",
          color: color,
        }}
      >
        {icon}
      </div>
      <div
        style={{
          fontWeight: 600,
          fontSize: isMobile ? 14 : 16,
          color: dark ? "#F1F5F9" : "#1E293B",
          marginBottom: 4,
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: isMobile ? 12 : 13,
          color: dark ? "#94A3B8" : "#64748B",
        }}
      >
        {subtitle}
      </div>
    </div>
  );
}