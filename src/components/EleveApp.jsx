import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useStyles } from "../components/ThemeProvider";
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
import {
  Home, BookOpen, AlertTriangle, Calendar, MessageCircle, Phone, User,
  HelpCircle, FileText, Shield, TrendingUp, DollarSign, Clock,
  GraduationCap, Award, BarChart3,
} from "lucide-react";

export function EleveApp({
  user,
  ecoleId,
  anneeId,
  anneeActive,
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

  // Récupération de l'élève lié à ce compte (filtré par année scolaire)
  const eleve = useQuery(
    api.eleves.getByUserId,
    anneeId ? { userId: user._id, anneeId } : "skip"
  );
  const notes = useQuery(
    api.notes.listByEleve,
    eleve ? { eleveId: eleve._id } : "skip"
  ) ?? [];
  const absences = useQuery(
    api.absences.listByEleve,
    eleve ? { eleveId: eleve._id } : "skip"
  ) ?? [];

  // Cours de la classe pour les informations du tableau de bord
  const coursDisponibles = useQuery(
    api.cours.list,
    eleve ? { ecoleId, classe: eleve.classe } : "skip"
  ) ?? [];

  const menu = [
    { id: "accueil", label: "Accueil", icon: <Home size={20} /> },
    { id: "notes", label: "Notes", icon: <BookOpen size={20} /> },
    { id: "absences", label: "Absences", icon: <AlertTriangle size={20} /> },
    { id: "emploi", label: "Emploi du temps", icon: <Calendar size={20} /> },
    { id: "messagerie", label: "Messages", icon: <MessageCircle size={20} /> },
    { id: "appels", label: "Appels", icon: <Phone size={20} /> },
    { id: "profil", label: "Profil", icon: <User size={20} /> },
    { id: "aide", label: "Aide", icon: <HelpCircle size={20} /> },
    { id: "mentions", label: "Mentions légales", icon: <FileText size={20} /> },
    { id: "confidentialite", label: "Confidentialité", icon: <Shield size={20} /> },
  ];

  // État de chargement
  if (eleve === undefined) {
    return (
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px", textAlign: "center" }}>
        <GraduationCap size={48} color="#94A3B8" style={{ marginBottom: 16 }} />
        <h2 style={{ fontSize: 24, fontWeight: 600, color: "#1E293B", margin: "0 0 8px" }}>
          Chargement de votre profil…
        </h2>
      </div>
    );
  }

  // Aucun élève associé
  if (eleve === null) {
    return (
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px", textAlign: "center" }}>
        <GraduationCap size={48} color="#F59E0B" style={{ marginBottom: 16 }} />
        <h2 style={{ fontSize: 24, fontWeight: 600, color: "#1E293B", margin: "0 0 8px" }}>
          Aucun élève associé à ce compte
        </h2>
        <p style={{ color: "#64748B", fontSize: 14 }}>
          Veuillez contacter l'administration pour associer votre compte à un élève.
        </p>
      </div>
    );
  }

  // Calculs pour le tableau de bord
  const totalNotes = notes.length;
  const absencesCount = absences.filter((a) => a.type === "absence").length;
  const retardsCount = absences.filter((a) => a.type === "retard").length;
  const matieresAvecNotes = [...new Set(notes.map((n) => n.matiere))].length;

  const moyenneGenerale =
    notes.length > 0
      ? (
          notes.reduce((sum, n) => sum + n.note * (n.coefficient || 1), 0) /
          notes.reduce((sum, n) => sum + (n.coefficient || 1), 0)
        ).toFixed(2)
      : "-";

  const renderContent = () => {
    if (!anneeId && (tab === "accueil" || tab === "notes" || tab === "absences" || tab === "emploi")) {
      return (
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px", textAlign: "center" }}>
          <Calendar size={48} color="#F59E0B" style={{ marginBottom: 16 }} />
          <h2 style={{ fontSize: 24, fontWeight: 600, color: "#1E293B", margin: "0 0 8px" }}>
            Aucune année scolaire active
          </h2>
          <p style={{ color: "#64748B", fontSize: 14 }}>
            Veuillez contacter l'administration pour activer une année scolaire.
          </p>
        </div>
      );
    }

    switch (tab) {
      case "accueil":
        return (
          <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 16px" }}>
            <div style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 28, fontWeight: 700, color: "#1E293B", margin: 0 }}>
                👋 Bonjour, {eleve.nom}
              </h2>
              <p style={{ color: "#64748B", marginTop: 4, fontSize: 14 }}>
                Classe {eleve.classe} · {anneeActive?.nom}
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 32 }}>
              <StatCard icon={<BookOpen size={24} />} value={totalNotes} label="Notes" color="#4F46E5" />
              <StatCard icon={<Award size={24} />} value={matieresAvecNotes} label="Matières" color="#10B981" />
              <StatCard icon={<AlertTriangle size={24} />} value={absencesCount} label="Absences" color="#EF4444" />
              <StatCard icon={<Clock size={24} />} value={retardsCount} label="Retards" color="#F59E0B" />
              {moyenneGenerale !== "-" && (
                <StatCard icon={<TrendingUp size={24} />} value={`${moyenneGenerale}/20`} label="Moyenne générale" color="#6366F1" />
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
              <QuickAccessCard
                icon={<BookOpen size={28} />}
                title="Notes"
                subtitle="Consulter vos résultats"
                onClick={() => setTab("notes")}
                color="#4F46E5"
              />
              <QuickAccessCard
                icon={<Calendar size={28} />}
                title="Emploi du temps"
                subtitle="Voir les horaires"
                onClick={() => setTab("emploi")}
                color="#10B981"
              />
              <QuickAccessCard
                icon={<DollarSign size={28} />}
                title="Frais"
                subtitle="Suivre vos paiements"
                onClick={() => setTab("frais")}
                color="#F59E0B"
              />
              <QuickAccessCard
                icon={<FileText size={28} />}
                title="Bulletin"
                subtitle="Votre bulletin scolaire"
                onClick={() => setTab("bulletin")}
                color="#6366F1"
              />
            </div>
          </div>
        );

      case "notes":
        if (notes.length === 0) {
          return (
            <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 24px", textAlign: "center" }}>
              <BookOpen size={48} color="#94A3B8" style={{ marginBottom: 16 }} />
              <h2 style={{ fontSize: 24, fontWeight: 600, color: "#1E293B", margin: "0 0 8px" }}>
                Aucune note disponible
              </h2>
              <p style={{ color: "#64748B", fontSize: 14 }}>
                Vos notes seront affichées ici dès qu'elles seront saisies par vos enseignants.
              </p>
            </div>
          );
        }
        return (
          <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px" }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, color: "#1E293B", marginBottom: 24 }}>Mes notes</h2>
            {Array.from(new Set(notes.map((n) => n.periode)))
              .sort()
              .map((periode) => {
                const notesPeriode = notes.filter((n) => n.periode === periode);
                const moyennePeriode =
                  notesPeriode.length > 0
                    ? (
                        notesPeriode.reduce((s, n) => s + n.note * n.coefficient, 0) /
                        notesPeriode.reduce((s, n) => s + n.coefficient, 0)
                      ).toFixed(2)
                    : "-";
                return (
                  <div key={periode} style={{ marginBottom: 24 }}>
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "12px 16px",
                      background: "#F8FAFC",
                      borderRadius: 8,
                      marginBottom: 12,
                    }}>
                      <h3 style={{ fontSize: 18, fontWeight: 600, color: "#1E293B", margin: 0 }}>
                        {periode}
                      </h3>
                      <span style={{ fontSize: 16, fontWeight: 700, color: "#4F46E5" }}>
                        Moyenne {moyennePeriode}/20
                      </span>
                    </div>
                    <div style={{ display: "grid", gap: 8 }}>
                      {notesPeriode.map((n) => (
                        <div
                          key={n._id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "10px 14px",
                            background: "#FFF",
                            borderRadius: 8,
                            boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 500, fontSize: 15 }}>{n.matiere}</div>
                            <div style={{ fontSize: 12, color: "#64748B" }}>Coeff. {n.coefficient}</div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            {n.appreciation && (
                              <span style={{ fontSize: 12, color: "#64748B", fontStyle: "italic" }}>{n.appreciation}</span>
                            )}
                            <span style={{ fontWeight: 700, fontSize: 16, color: "#1E293B" }}>{n.note}/20</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        );

      case "absences":
        if (absences.length === 0) {
          return (
            <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 24px", textAlign: "center" }}>
              <AlertTriangle size={48} color="#10B981" style={{ marginBottom: 16 }} />
              <h2 style={{ fontSize: 24, fontWeight: 600, color: "#1E293B", margin: "0 0 8px" }}>
                Aucune absence ou retard
              </h2>
              <p style={{ color: "#64748B", fontSize: 14 }}>
                Félicitations ! Vous êtes assidu(e).
              </p>
            </div>
          );
        }
        return (
          <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px" }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, color: "#1E293B", marginBottom: 24 }}>
              Absences & Retards
            </h2>
            <div style={{ display: "grid", gap: 8 }}>
              {absences
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .map((a) => (
                  <div
                    key={a._id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "12px 16px",
                      background: "#FFF",
                      borderRadius: 8,
                      boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span
                        style={{
                          padding: "4px 10px",
                          borderRadius: 12,
                          fontSize: 12,
                          fontWeight: 600,
                          background: a.type === "absence" ? "#FEE2E2" : "#FEF3C7",
                          color: a.type === "absence" ? "#B91C1C" : "#92400E",
                        }}
                      >
                        {a.type === "absence" ? "Absence" : "Retard"}
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 500 }}>{a.date}</span>
                    </div>
                    {a.commentaire && (
                      <span style={{ fontSize: 13, color: "#64748B", fontStyle: "italic" }}>
                        {a.commentaire}
                      </span>
                    )}
                  </div>
                ))}
            </div>
          </div>
        );

      case "emploi":
        return <ConsultationEmploiDuTemps ecoleId={ecoleId} classe={eleve.classe} />;

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

      case "mentions":
        return <MentionsLegales />;

      case "confidentialite":
        return <PolitiqueConfidentialite />;

      case "aide":
        return <Aide />;

      case "bulletin":
        return (
          <BulletinEnfant
            eleveId={eleve._id}
            ecoleId={ecoleId}
            nom={eleve.nom}
            postnom={eleve.postnom}
            classe={eleve.classe}
          />
        );

      case "frais":
        return <FraisEnfant eleveId={eleve._id} />;

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
      {!anneeId && (tab === "accueil" || tab === "notes" || tab === "absences" || tab === "emploi") && (
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
          ⚠️ Aucune année scolaire active. Certaines données sont indisponibles.
        </div>
      )}
      {renderContent()}
    </Layout>
  );
}

// Petite carte statistique
function StatCard({ icon, value, label, color }) {
  return (
    <div style={{
      background: "#FFF",
      borderRadius: 16,
      padding: 20,
      display: "flex",
      alignItems: "center",
      gap: 16,
      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    }}>
      <div style={{
        width: 48,
        height: 48,
        background: `${color}15`,
        borderRadius: 12,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: color,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 24, fontWeight: 700, color: "#1E293B" }}>{value}</div>
        <div style={{ fontSize: 14, color: "#64748B" }}>{label}</div>
      </div>
    </div>
  );
}

// Carte d'accès rapide
function QuickAccessCard({ icon, title, subtitle, onClick, color }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "#FFF",
        borderRadius: 16,
        padding: 20,
        textAlign: "center",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        cursor: "pointer",
        transition: "box-shadow 0.15s, transform 0.1s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.05)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div style={{
        width: 56,
        height: 56,
        borderRadius: 14,
        background: `${color}15`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        margin: "0 auto 12px",
        color: color,
      }}>
        {icon}
      </div>
      <div style={{ fontWeight: 600, fontSize: 16, color: "#1E293B", marginBottom: 4 }}>
        {title}
      </div>
      <div style={{ fontSize: 13, color: "#64748B" }}>
        {subtitle}
      </div>
    </div>
  );
}