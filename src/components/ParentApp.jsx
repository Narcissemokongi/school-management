import { useState, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useStyles } from "../styles/theme";
import { useIsMobile } from "../hooks/useIsMobile";
import { Layout } from "./Layout";
import { MessagerieApp } from "./messagerie/MessagerieApp";
import { Appels } from "./Appels";
import { ConsultationEmploiDuTemps } from "./ConsultationEmploiDuTemps";
import { ConsultationExamens } from "./ConsultationExamens";
import { FraisEnfant } from "./FraisEnfant";
import { BulletinEnfant } from "./BulletinEnfant";
import { AbsencesEnfant } from "./AbsencesEnfant";
import { MentionsLegales } from "./MentionsLegales";
import { Aide } from "./Aide";
import { PolitiqueConfidentialite } from "./PolitiqueConfidentialite";
import {
  Users, MessageCircle, Calendar, Phone, HelpCircle,
  FileText, Shield, ArrowLeft, BookOpen, DollarSign,
  AlertTriangle, ClipboardList, Clock, Search, X,
  User, BarChart3, AlertCircle, UserPlus, CheckCircle2, Loader,
} from "lucide-react";
import toast from "react-hot-toast";

export function ParentApp({
  user,
  ecoleId,
  eleves = [],
  punitions = [],
  fautes = [],
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
  const [searchEnfant, setSearchEnfant] = useState("");
  const [showAddChild, setShowAddChild] = useState(false); // Nouvel état

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
              anneeId={anneeId}
              userId={user._id}
              onBack={() => setSelectedEnfant(null)}
              S={S}
              isMobile={isMobile}
              dark={dark}
            />
          );
        }

        // Afficher soit le formulaire de demande, soit la liste des enfants
        return showAddChild ? (
          <DemandeAssociation
            user={user}
            dark={dark}
            onClose={() => setShowAddChild(false)}
          />
        ) : (
          <ListeEnfants
            eleves={eleves}
            punitions={punitions}
            fautes={fautes}
            user={user}
            onSelectEnfant={setSelectedEnfant}
            S={S}
            isMobile={isMobile}
            dark={dark}
            search={searchEnfant}
            setSearch={setSearchEnfant}
            onAddChild={() => setShowAddChild(true)}
          />
        );
      case "emploi":
        if (!selectedEnfant) {
          return (
            <div style={{ maxWidth: 800, margin: "0 auto", padding: "24px", textAlign: "center" }}>
              <Calendar size={48} color={dark ? "#334155" : "#94A3B8"} style={{ marginBottom: 16 }} />
              <h2 style={{ fontSize: 22, fontWeight: 600, color: dark ? "#F1F5F9" : "#1E293B", marginBottom: 8 }}>
                Emploi du temps
              </h2>
              <p style={{ color: dark ? "#94A3B8" : "#64748B", marginBottom: 24 }}>
                Veuillez d'abord sélectionner un enfant dans la section "Mes enfants".
              </p>
              <button
                onClick={() => setTab("enfants")}
                style={{
                  padding: "10px 20px",
                  background: dark ? "#818CF8" : "#4F46E5",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Choisir un enfant
              </button>
            </div>
          );
        }
        return <ConsultationEmploiDuTemps ecoleId={ecoleId} classe={selectedEnfant.classe} />;
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
        return <Aide user={user} />;
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

// ===== Composant de demande d'association parent-enfant (avec messages interactifs) =====
function DemandeAssociation({ user, dark, onClose }) {
  const [matricule, setMatricule] = useState("");
  const [sending, setSending] = useState(false);
  const [alert, setAlert] = useState(null); // { type: 'error'|'info'|'success', message: string }

  const createRequest = useMutation(api.parentLinks.createParentLinkRequest);
  const cancelRequest = useMutation(api.parentLinks.cancelParentLinkRequest);

  const demandes = useQuery(api.parentLinks.listByParent, { parentId: user._id }) ?? [];

  const getErrorMessage = (err) => {
    if (typeof err === "string") return err;
    if (err?.data?.message) return err.data.message;
    if (err?.message) return err.message;
    return "Une erreur inconnue est survenue.";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAlert(null);

    if (!matricule.trim()) {
      setAlert({ type: "error", message: "Veuillez saisir le matricule de l'enfant." });
      return;
    }

    setSending(true);
    try {
      await createRequest({
        parentId: user._id,
        eleveMatricule: matricule.trim().toUpperCase(),
      });
      setAlert({ type: "success", message: "Demande envoyée. L'administration va la traiter." });
      toast.success("Demande envoyée.");
      setMatricule("");
    } catch (err) {
      const raw = getErrorMessage(err);
      let message = raw;
      let type = "error";

      if (raw.includes("Vous êtes déjà associé")) {
        message = "Cet enfant est déjà associé à votre compte.";
        type = "info";
      } else if (raw.includes("Cet enfant est déjà associé")) {
        message = "Cet enfant est déjà associé à un autre parent. Contactez l'administration si nécessaire.";
      } else if (raw.includes("demande est déjà en attente")) {
        message = "Une demande est déjà en attente pour cet enfant. Vous pouvez la consulter ci-dessous.";
        type = "info";
      } else if (raw.includes("Matricule invalide")) {
        message = "Le matricule saisi n'existe pas. Vérifiez auprès de l'école.";
      } else if (raw.includes("n'appartenez pas à la même école")) {
        message = "Cet enfant n'appartient pas à votre établissement.";
      }

      setAlert({ type, message });
      toast.error(message);
    } finally {
      setSending(false);
    }
  };

  const handleCancel = async (id) => {
    try {
      await cancelRequest({ requestId: id, parentId: user._id });
      toast.success("Demande annulée.");
      setAlert({ type: "success", message: "Demande annulée." });
    } catch (err) {
      const msg = getErrorMessage(err);
      setAlert({ type: "error", message: msg });
      toast.error(msg);
    }
  };

  const alertStyles = {
    error: {
      background: dark ? "#7F1D1D" : "#FEE2E2",
      color: dark ? "#F87171" : "#B91C1C",
      icon: <AlertCircle size={16} />,
    },
    info: {
      background: dark ? "#1E3A8A" : "#DBEAFE",
      color: dark ? "#60A5FA" : "#1D4ED8",
      icon: <Clock size={16} />,
    },
    success: {
      background: dark ? "#064E3B" : "#D1FAE5",
      color: dark ? "#34D399" : "#065F46",
      icon: <CheckCircle2 size={16} />,
    },
  };

  const currentAlert = alert ? alertStyles[alert.type] : null;

  const inputStyle = {
    width: "100%",
    padding: "10px 14px",
    border: `1px solid ${alert?.type === "error" ? "#EF4444" : dark ? "#334155" : "#E2E8F0"}`,
    borderRadius: 8,
    fontSize: 14,
    outline: "none",
    background: dark ? "#0F172A" : "#F9FAFB",
    color: dark ? "#F1F5F9" : "#1E293B",
    marginBottom: 12,
  };

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 16px" }}>
      {onClose && (
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: dark ? "#94A3B8" : "#64748B",
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: 14,
            marginBottom: 16,
          }}
        >
          <ArrowLeft size={16} /> Retour
        </button>
      )}

      <form onSubmit={handleSubmit} style={{ marginBottom: 24 }}>
        <label style={{ display: "block", marginBottom: 6, fontWeight: 500, fontSize: 14, color: dark ? "#CBD5E1" : "#374151" }}>
          Matricule de l'enfant
        </label>
        <input
          type="text"
          placeholder="Ex: A1B2C3"
          value={matricule}
          onChange={(e) => {
            setMatricule(e.target.value);
            if (alert) setAlert(null);
          }}
          style={inputStyle}
          required
        />

        {currentAlert && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: currentAlert.background,
            color: currentAlert.color,
            padding: "10px 14px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 500,
            marginBottom: 12,
          }}>
            {currentAlert.icon}
            <span>{alert.message}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={sending}
          style={{
            width: "100%",
            padding: "10px 16px",
            background: sending ? "#94A3B8" : dark ? "#818CF8" : "#4F46E5",
            color: "white",
            border: "none",
            borderRadius: 8,
            fontWeight: 600,
            cursor: sending ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          {sending ? <Loader size={16} className="animate-spin" /> : <UserPlus size={16} />}
          {sending ? "Envoi..." : "Demander l'association"}
        </button>
      </form>

      {demandes.length > 0 && (
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: dark ? "#F1F5F9" : "#1E293B", marginBottom: 12 }}>
            Mes demandes
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {demandes.map((demande) => (
              <div
                key={demande._id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
                  background: dark ? "#1E293B" : "#FFFFFF",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                  {demande.status === "pending" && <Clock size={16} color="#F59E0B" />}
                  {demande.status === "approved" && <CheckCircle2 size={16} color="#10B981" />}
                  {demande.status === "rejected" && <XCircle size={16} color="#EF4444" />}
                  <span style={{ fontSize: 14, color: dark ? "#F1F5F9" : "#1E293B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {demande.status === "pending" && "En attente"}
                    {demande.status === "approved" && "Approuvée"}
                    {demande.status === "rejected" && "Rejetée"}
                  </span>
                </div>
                {demande.status === "pending" && (
                  <button
                    onClick={() => handleCancel(demande._id)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#EF4444",
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 500,
                      flexShrink: 0,
                    }}
                  >
                    Annuler
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ----- Liste des enfants (avec bouton d'ajout) -----
function ListeEnfants({ eleves, punitions, fautes, user, onSelectEnfant, S, isMobile, dark, search, setSearch, onAddChild }) {
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const accent = dark ? "#818CF8" : "#4F46E5";
  const shadow = dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)";
  const shadowHover = dark ? "0 2px 8px rgba(0,0,0,0.5)" : "0 2px 8px rgba(0,0,0,0.08)";
  const danger = dark ? "#F87171" : "#EF4444";
  const warning = dark ? "#FBBF24" : "#F59E0B";

  const stats = useMemo(() => {
    const totalEnfants = eleves.length;
    const totalPunitions = punitions.length;
    const totalGraves = punitions.filter(p => {
      const faute = fautes.find(f => f._id === p.idFaute);
      return faute?.gravite === "Grave";
    }).length;
    return { totalEnfants, totalPunitions, totalGraves };
  }, [eleves, punitions, fautes]);

  const elevesTries = useMemo(() => {
    return [...eleves]
      .filter((e) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return `${e.nom} ${e.postnom}`.toLowerCase().includes(q);
      })
      .sort((a, b) => {
        const classeCompare = (a.classe || "").localeCompare(b.classe || "", undefined, { numeric: true, sensitivity: "base" });
        if (classeCompare !== 0) return classeCompare;
        return `${a.nom} ${a.postnom}`.localeCompare(`${b.nom} ${b.postnom}`, undefined, { sensitivity: "base" });
      });
  }, [eleves, search]);

  if (eleves.length === 0) {
    return (
      <div style={{ maxWidth: 800, margin: "0 auto", padding: isMobile ? "24px 16px" : "32px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <Users size={48} color={dark ? "#334155" : "#94A3B8"} style={{ marginBottom: 16 }} />
          <h2 style={{ fontSize: 24, fontWeight: 600, color: textPrimary, margin: "0 0 8px" }}>
            Aucun enfant associé
          </h2>
          <p style={{ color: textSecondary, fontSize: 14 }}>
            Vous pouvez demander l'association d'un enfant à votre compte en fournissant son matricule.
          </p>
          <button
            onClick={onAddChild}
            style={{
              marginTop: 16,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 20px",
              background: accent,
              color: "white",
              border: "none",
              borderRadius: 8,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <UserPlus size={18} /> Associer un enfant
          </button>
        </div>
      </div>
    );
  }

  if (elevesTries.length === 0) {
    return (
      <div style={{ maxWidth: 800, margin: "0 auto", padding: isMobile ? "24px 16px" : "32px 24px", textAlign: "center" }}>
        <Users size={48} color={dark ? "#334155" : "#94A3B8"} style={{ marginBottom: 16 }} />
        <h2 style={{ fontSize: 24, fontWeight: 600, color: textPrimary, margin: "0 0 8px" }}>
          Aucun enfant trouvé
        </h2>
        <p style={{ color: textSecondary, fontSize: 14 }}>Essayez un autre nom.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: isMobile ? "16px 12px" : "24px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: isMobile ? 24 : 28, fontWeight: 700, color: textPrimary, margin: 0 }}>
            Mes enfants
          </h2>
          <p style={{ color: textSecondary, marginTop: 4, fontSize: isMobile ? 13 : 14 }}>
            Sélectionnez un enfant pour consulter son dossier complet.
          </p>
        </div>
        <button
          onClick={onAddChild}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 16px",
            background: accent,
            color: "white",
            border: "none",
            borderRadius: 8,
            fontWeight: 600,
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          <UserPlus size={18} /> Ajouter un enfant
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 20 }}>
        <StatCardMini icon={<Users size={18} />} value={stats.totalEnfants} label="Enfants" color={accent} dark={dark} />
        <StatCardMini icon={<ClipboardList size={18} />} value={stats.totalPunitions} label="Punitions" color={warning} dark={dark} />
        <StatCardMini icon={<AlertTriangle size={18} />} value={stats.totalGraves} label="Graves" color={danger} dark={dark} />
      </div>

      <div style={{ display: "flex", alignItems: "center", background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 10, padding: "8px 12px", marginBottom: 20, gap: 8 }}>
        <Search size={16} color={textSecondary} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un enfant..."
          style={{ border: "none", outline: "none", background: "transparent", width: "100%", fontSize: 14, color: textPrimary }}
        />
        {search && (
          <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: textSecondary, padding: 4 }}>
            <X size={16} />
          </button>
        )}
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        {elevesTries.map((enfant) => {
          const nbPunitions = punitions.filter((p) => p.idEleve === enfant._id).length;
          const hasGrave = punitions.some(
            (p) => p.idEleve === enfant._id && fautes.find((f) => f._id === p.idFaute)?.gravite === "Grave"
          );
          return (
            <div
              key={enfant._id}
              onClick={() => onSelectEnfant(enfant)}
              style={{
                background: cardBg,
                borderRadius: 16,
                padding: isMobile ? "16px" : "20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                boxShadow: shadow,
                cursor: "pointer",
                transition: "box-shadow 0.15s, transform 0.1s",
                border: `1px solid ${hasGrave ? danger : cardBorder}`,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = shadowHover; e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = shadow; e.currentTarget.style.transform = "translateY(0)"; }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: isMobile ? 15 : 16, color: textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {enfant.nom} {enfant.postnom} {enfant.prenom && <span style={{ fontWeight: 400, color: textSecondary }}>{enfant.prenom}</span>}
                </div>
                <div style={{ fontSize: 13, color: textSecondary, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  Classe {enfant.classe}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0, marginLeft: 8 }}>
                {nbPunitions > 0 && (
                  <span style={{
                    background: hasGrave ? (dark ? "#7F1D1D" : "#FEE2E2") : (dark ? "#312E81" : "#EEF2FF"),
                    color: hasGrave ? (dark ? "#F87171" : "#B91C1C") : accent,
                    padding: "2px 8px",
                    borderRadius: 12,
                    fontSize: 12,
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}>
                    {nbPunitions} punition{nbPunitions > 1 ? "s" : ""}
                  </span>
                )}
                <span style={{ display: "flex", alignItems: "center", gap: 4, color: accent, fontWeight: 500, fontSize: 14, whiteSpace: "nowrap" }}>
                  <ClipboardList size={20} /> Dossier
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Composant petit stat card
function StatCardMini({ icon, value, label, color, dark }) {
  return (
    <div style={{
      background: dark ? "#1E293B" : "#FFFFFF",
      borderRadius: 12,
      padding: 12,
      textAlign: "center",
      border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
      boxShadow: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)",
    }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 4, color }}>{icon}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: dark ? "#F1F5F9" : "#1E293B" }}>{value}</div>
      <div style={{ fontSize: 12, color: dark ? "#94A3B8" : "#64748B" }}>{label}</div>
    </div>
  );
}

// ----- Dossier d'un enfant (inchangé mais inclus pour compilation) -----
function DossierEnfant({ enfant, punitions, fautes, ecoleId, anneeId, userId, onBack, S, isMobile, dark }) {
  const [subTab, setSubTab] = useState("punitions");

  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const accent = dark ? "#818CF8" : "#4F46E5";
  const shadow = dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)";
  const danger = dark ? "#F87171" : "#EF4444";
  const warning = dark ? "#FBBF24" : "#F59E0B";
  const success = dark ? "#34D399" : "#10B981";

  const scoreConduite = useMemo(() => {
    let score = 100;
    punitions.forEach((p) => {
      const faute = fautes.find((f) => f._id === p.idFaute);
      if (faute?.gravite === "Légère") score -= 2;
      else if (faute?.gravite === "Moyenne") score -= 5;
      else if (faute?.gravite === "Grave") score -= 10;
    });
    return Math.max(0, Math.min(100, score));
  }, [punitions, fautes]);

  const sousOnglets = [
    { id: "punitions", label: "Punitions", icon: <AlertTriangle size={16} /> },
    { id: "frais", label: "Frais", icon: <DollarSign size={16} /> },
    { id: "bulletin", label: "Bulletin", icon: <BookOpen size={16} /> },
    { id: "absences", label: "Absences", icon: <Calendar size={16} /> },
    { id: "emploi", label: "Emploi du temps", icon: <Clock size={16} /> },
    { id: "examens", label: "Examens", icon: <Calendar size={16} /> },
  ];

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: isMobile ? "16px 12px" : "24px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <button
          onClick={onBack}
          style={{
            background: cardBg,
            border: `1px solid ${cardBorder}`,
            borderRadius: 8,
            padding: isMobile ? "8px 10px" : "8px 12px",
            cursor: "pointer",
            color: accent,
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontWeight: 500,
            fontSize: 14,
            flexShrink: 0,
          }}
        >
          <ArrowLeft size={16} /> {isMobile ? null : "Retour"}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, color: textPrimary, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {enfant.nom} {enfant.postnom}
          </h2>
          <p style={{ color: textSecondary, fontSize: 14 }}>
            Classe {enfant.classe}
          </p>
        </div>
        <div style={{ textAlign: "center", flexShrink: 0 }}>
          <div style={{ fontSize: 11, color: textSecondary, textTransform: "uppercase", fontWeight: 600 }}>Score de conduite</div>
          <div style={{
            fontSize: 24,
            fontWeight: 800,
            color: scoreConduite >= 80 ? success : scoreConduite >= 50 ? warning : danger,
          }}>
            {scoreConduite}
          </div>
        </div>
      </div>

      <div style={{
        display: "flex",
        gap: 0,
        borderBottom: `2px solid ${cardBorder}`,
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
              color: subTab === t.id ? accent : textSecondary,
              fontWeight: subTab === t.id ? 600 : 400,
              borderBottom: subTab === t.id ? `3px solid ${accent}` : "3px solid transparent",
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

      {subTab === "punitions" && (
        <div>
          {punitions.length === 0 ? (
            <div style={{
              background: cardBg,
              borderRadius: 16,
              padding: 48,
              textAlign: "center",
              boxShadow: shadow,
              color: textSecondary,
              border: `1px solid ${cardBorder}`,
            }}>
              <AlertTriangle size={32} style={{ marginBottom: 8 }} />
              <p>Aucune punition enregistrée.</p>
            </div>
          ) : (
            punitions.map((p) => {
              const faute = fautes.find((f) => f._id === p.idFaute);
              return (
                <div
                  key={p._id}
                  style={{
                    background: cardBg,
                    borderRadius: 12,
                    padding: isMobile ? "12px 14px" : "14px 18px",
                    marginBottom: 8,
                    boxShadow: shadow,
                    border: `1px solid ${cardBorder}`,
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 15, color: textPrimary }}>
                    {faute?.libelle || "Faute inconnue"}
                  </div>
                  <div style={{ color: textSecondary, fontSize: 13, marginTop: 4 }}>
                    {p.date} — Sanction : {p.sanction}
                  </div>
                  {p.commentaire && (
                    <div style={{ fontSize: 12, color: textSecondary, marginTop: 4 }}>
                      {p.commentaire}
                    </div>
                  )}
                </div>
              );
            })
          )}
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
      {subTab === "absences" && <AbsencesEnfant eleveId={enfant._id} userId={userId} />}
      {subTab === "emploi" && <ConsultationEmploiDuTemps ecoleId={ecoleId} classe={enfant.classe} />}
      {subTab === "examens" && <ConsultationExamens ecoleId={ecoleId} anneeId={anneeId} classe={enfant.classe} />}
    </div>
  );
}