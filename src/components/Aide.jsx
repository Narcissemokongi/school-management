import { useState, useMemo, useEffect, useCallback } from "react";
import { useStyles } from "../styles/theme";
import {
  HelpCircle, Users, AlertTriangle, MessageCircle, Phone,
  Settings, User, ChevronDown, ChevronRight, BookOpen, DollarSign,
  Search, X, ArrowUp, Shield, UserCheck, Clock, Download,
  School, Calendar, ClipboardList, ChevronsUp, ChevronsDown, Copy,
} from "lucide-react";
import toast from "react-hot-toast";

export function Aide({ user, role, isSuperAdmin }) {
  const { S, dark } = useStyles();
  const [openSection, setOpenSection] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [allOpen, setAllOpen] = useState(false);

  // Déterminer le rôle effectif
  const roleKey = useMemo(() => {
    if (role) return role;
    if (user) {
      if (isSuperAdmin) return "superAdmin";
      if (user.role === "admin" && !user.ecoleId) return "superAdmin";
      return user.role;
    }
    return "eleve"; // Par défaut, évite le warning si aucun rôle
  }, [user, role, isSuperAdmin]);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 200);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleSection = useCallback((id) => {
    setOpenSection((prev) => (prev === id ? null : id));
  }, []);

  const toggleAllSections = useCallback(() => {
    setAllOpen((prev) => !prev);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const copySectionContent = (text) => {
    navigator.clipboard.writeText(text).then(() => toast.success("Contenu copié !"));
  };

  // ===================== SECTIONS PAR RÔLE =====================
  const sectionsByRole = {
    superAdmin: [
      {
        id: "ecoles",
        icon: <School size={20} />,
        title: "Gérer les écoles",
        keywords: "écoles créer supprimer code",
        content: (
          <div>
            <p style={S.muted}>En tant que super admin, vous pouvez gérer les écoles :</p>
            <ul style={S.muted}>
              <li>Créer une nouvelle école avec un code unique.</li>
              <li>Consulter la liste des écoles et leurs statistiques.</li>
              <li>Suspendre ou réactiver une école.</li>
              <li>Supprimer une école (toutes ses données seront effacées).</li>
            </ul>
          </div>
        ),
      },
      {
        id: "admins",
        icon: <Shield size={20} />,
        title: "Super admins secondaires",
        keywords: "super admin permissions rôles",
        content: (
          <div>
            <p style={S.muted}>Vous pouvez créer d'autres super admins avec des permissions limitées :</p>
            <ul style={S.muted}>
              <li>Allez dans la section <strong>Super Admins</strong>.</li>
              <li>Créez un compte et attribuez des permissions précises.</li>
              <li>Vous pouvez modifier ou supprimer les permissions à tout moment.</li>
            </ul>
          </div>
        ),
      },
      {
        id: "profil",
        icon: <User size={20} />,
        title: "Profil et mot de passe",
        keywords: "mot de passe profil compte",
        content: (
          <div>
            <p style={S.muted}>Pour changer votre mot de passe :</p>
            <ol style={S.muted}>
              <li>Cliquez sur votre profil en bas à gauche.</li>
              <li>Saisissez l'ancien mot de passe, puis le nouveau.</li>
              <li>Cliquez sur <strong>Enregistrer</strong>.</li>
            </ol>
          </div>
        ),
      },
    ],
    admin: [
      {
        id: "eleves",
        icon: <BookOpen size={20} />,
        title: "Gestion des élèves",
        keywords: "élèves ajouter importer excel classe",
        content: (
          <div>
            <p style={S.muted}>Pour ajouter un élève :</p>
            <ol style={S.muted}>
              <li>Allez dans l'onglet <strong>Scolarité → Élèves</strong>.</li>
              <li>Remplissez le nom, le post-nom et choisissez une classe.</li>
              <li>Optionnellement, associez un parent.</li>
              <li>Cliquez sur <strong>Ajouter l'élève</strong>.</li>
            </ol>
            <p style={S.muted}>Vous pouvez importer une liste depuis Excel (colonnes : nom, postnom, classe).</p>
          </div>
        ),
      },
      {
        id: "classes",
        icon: <Users size={20} />,
        title: "Gestion des classes",
        keywords: "classes créer renommer supprimer",
        content: (
          <div>
            <p style={S.muted}>Pour gérer les classes :</p>
            <ul style={S.muted}>
              <li>Dans l'onglet <strong>Classes</strong>, cliquez sur <strong>Nouvelle classe</strong>.</li>
              <li>Vous pouvez renommer, supprimer ou voir les élèves d'une classe.</li>
            </ul>
          </div>
        ),
      },
      {
        id: "utilisateurs",
        icon: <UserCheck size={20} />,
        title: "Gestion des utilisateurs",
        keywords: "utilisateurs créer rôles permissions",
        content: (
          <div>
            <p style={S.muted}>Vous pouvez créer et gérer les comptes utilisateurs :</p>
            <ol style={S.muted}>
              <li>Allez dans <strong>Paramètres → Utilisateurs</strong>.</li>
              <li>Créez un compte avec un rôle (enseignant, parent, élève, etc.).</li>
              <li>Vous pouvez modifier les rôles et supprimer des comptes.</li>
            </ol>
          </div>
        ),
      },
      {
        id: "fautes",
        icon: <AlertTriangle size={20} />,
        title: "Fautes et sanctions",
        keywords: "fautes sanctions disciplinaire",
        content: (
          <div>
            <p style={S.muted}>Gérez les fautes et sanctions :</p>
            <ul style={S.muted}>
              <li>Créez des fautes (Légère, Moyenne, Grave) dans <strong>Paramètres</strong>.</li>
              <li>Les disciplinaire peuvent ensuite les utiliser pour sanctionner.</li>
            </ul>
          </div>
        ),
      },
      {
        id: "frais",
        icon: <DollarSign size={20} />,
        title: "Gestion des frais",
        keywords: "frais scolarité paiement comptable",
        content: (
          <div>
            <p style={S.muted}>Pour gérer les frais de scolarité :</p>
            <ol style={S.muted}>
              <li>Allez dans <strong>Finance</strong>.</li>
              <li>Choisissez un élève et saisissez le montant total et le montant payé.</li>
              <li>Le reste à payer est calculé automatiquement.</li>
            </ol>
          </div>
        ),
      },
      {
        id: "annees",
        icon: <Calendar size={20} />,
        title: "Années scolaires",
        keywords: "année scolaire active",
        content: (
          <div>
            <p style={S.muted}>Gérez les années scolaires :</p>
            <ul style={S.muted}>
              <li>Dans <strong>Paramètres → Année scolaire</strong>, créez des années.</li>
              <li>Activez l'année en cours pour que les données soient associées.</li>
            </ul>
          </div>
        ),
      },
      {
        id: "profil",
        icon: <User size={20} />,
        title: "Profil et mot de passe",
        keywords: "mot de passe profil compte",
        content: (
          <div>
            <p style={S.muted}>Pour changer votre mot de passe :</p>
            <ol style={S.muted}>
              <li>Cliquez sur <strong>Paramètres → Profil</strong>.</li>
              <li>Saisissez l'ancien mot de passe, puis le nouveau (2 fois).</li>
              <li>Cliquez sur <strong>Enregistrer</strong>.</li>
            </ol>
          </div>
        ),
      },
    ],
    directeur: [
      {
        id: "eleves",
        icon: <BookOpen size={20} />,
        title: "Consulter les élèves",
        keywords: "élèves liste classe",
        content: (
          <div>
            <p style={S.muted}>Pour voir les élèves :</p>
            <ol style={S.muted}>
              <li>Allez dans l'onglet <strong>Élèves</strong>.</li>
              <li>Filtrez par classe ou recherchez un élève.</li>
              <li>Cliquez sur un élève pour voir sa fiche complète.</li>
            </ol>
          </div>
        ),
      },
      {
        id: "stats",
        icon: <ClipboardList size={20} />,
        title: "Statistiques disciplinaires",
        keywords: "statistiques punitions",
        content: (
          <div>
            <p style={S.muted}>Visualisez les statistiques :</p>
            <ul style={S.muted}>
              <li>Consultez le nombre de punitions par classe ou par faute.</li>
              <li>Exportez les rapports.</li>
            </ul>
          </div>
        ),
      },
      {
        id: "messages",
        icon: <MessageCircle size={20} />,
        title: "Messagerie",
        keywords: "messages chat notification",
        content: (
          <div>
            <p style={S.muted}>La messagerie fonctionne comme un chat instantané :</p>
            <ol style={S.muted}>
              <li>Allez dans l'onglet <strong>Messages</strong>.</li>
              <li>Choisissez ou créez une conversation.</li>
              <li>Écrivez et envoyez votre message.</li>
            </ol>
          </div>
        ),
      },
      {
        id: "appels",
        icon: <Phone size={20} />,
        title: "Appels vidéo",
        keywords: "appels vidéo audio",
        content: (
          <div>
            <p style={S.muted}>Pour passer un appel vidéo :</p>
            <ol style={S.muted}>
              <li>Allez dans l'onglet <strong>Appels</strong>.</li>
              <li>Cliquez sur <strong>Appeler</strong> à côté du contact.</li>
              <li>Le destinataire reçoit une notification et peut accepter ou refuser.</li>
            </ol>
          </div>
        ),
      },
      {
        id: "profil",
        icon: <User size={20} />,
        title: "Profil et mot de passe",
        keywords: "mot de passe profil compte",
        content: (
          <div>
            <p style={S.muted}>Pour changer votre mot de passe :</p>
            <ol style={S.muted}>
              <li>Cliquez sur <strong>Paramètres → Profil</strong>.</li>
              <li>Saisissez l'ancien mot de passe, puis le nouveau.</li>
              <li>Cliquez sur <strong>Enregistrer</strong>.</li>
            </ol>
          </div>
        ),
      },
    ],
    disciplinaire: [
      {
        id: "punitions",
        icon: <AlertTriangle size={20} />,
        title: "Saisir une punition",
        keywords: "punitions sanctions faute",
        content: (
          <div>
            <p style={S.muted}>Pour enregistrer une punition :</p>
            <ol style={S.muted}>
              <li>Accédez à l'onglet <strong>Saisir une punition</strong>.</li>
              <li>Recherchez l'élève par son nom.</li>
              <li>Sélectionnez la faute (Légère, Moyenne, Grave).</li>
              <li>Choisissez la sanction.</li>
              <li>Ajoutez un commentaire si nécessaire.</li>
              <li>Cliquez sur <strong>Enregistrer</strong>.</li>
            </ol>
            <p style={S.muted}>En cas de faute grave, le parent reçoit une notification.</p>
          </div>
        ),
      },
      {
        id: "historique",
        icon: <ClipboardList size={20} />,
        title: "Historique des punitions",
        keywords: "historique punitions",
        content: (
          <div>
            <p style={S.muted}>Consultez l'historique :</p>
            <ul style={S.muted}>
              <li>Allez dans <strong>Historique</strong>.</li>
              <li>Filtrez par classe ou par date.</li>
            </ul>
          </div>
        ),
      },
      {
        id: "absences",
        icon: <Calendar size={20} />,
        title: "Absences et retards",
        keywords: "absences retards",
        content: (
          <div>
            <p style={S.muted}>Gérez les absences :</p>
            <ol style={S.muted}>
              <li>Dans l'onglet <strong>Absences</strong>, enregistrez une absence ou un retard.</li>
              <li>Un justificatif peut être ajouté.</li>
            </ol>
          </div>
        ),
      },
      {
        id: "profil",
        icon: <User size={20} />,
        title: "Profil et mot de passe",
        keywords: "mot de passe profil compte",
        content: (
          <div>
            <p style={S.muted}>Pour changer votre mot de passe :</p>
            <ol style={S.muted}>
              <li>Cliquez sur votre profil en bas à gauche.</li>
              <li>Saisissez l'ancien mot de passe, puis le nouveau.</li>
              <li>Cliquez sur <strong>Enregistrer</strong>.</li>
            </ol>
          </div>
        ),
      },
    ],
    enseignant: [
      {
        id: "notes",
        icon: <BookOpen size={20} />,
        title: "Saisir les notes",
        keywords: "notes évaluation",
        content: (
          <div>
            <p style={S.muted}>Pour saisir les notes :</p>
            <ol style={S.muted}>
              <li>Allez dans l'onglet <strong>Notes</strong>.</li>
              <li>Choisissez un élève et une matière.</li>
              <li>Saisissez la note (sur 20 ou selon le barème).</li>
              <li>Cliquez sur <strong>Ajouter</strong>.</li>
            </ol>
          </div>
        ),
      },
      {
        id: "absences",
        icon: <Calendar size={20} />,
        title: "Absences et retards",
        keywords: "absences retards",
        content: (
          <div>
            <p style={S.muted}>Enregistrez les absences :</p>
            <ol style={S.muted}>
              <li>Dans <strong>Absences</strong>, sélectionnez un élève et une date.</li>
              <li>Indiquez le type (absence, retard).</li>
            </ol>
          </div>
        ),
      },
      {
        id: "emploi",
        icon: <Clock size={20} />,
        title: "Emploi du temps",
        keywords: "emploi du temps",
        content: (
          <div>
            <p style={S.muted}>Consultez votre emploi du temps :</p>
            <ul style={S.muted}>
              <li>Dans l'onglet <strong>Emploi du temps</strong>, visualisez les cours.</li>
            </ul>
          </div>
        ),
      },
      {
        id: "profil",
        icon: <User size={20} />,
        title: "Profil et mot de passe",
        keywords: "mot de passe profil compte",
        content: (
          <div>
            <p style={S.muted}>Pour changer votre mot de passe :</p>
            <ol style={S.muted}>
              <li>Cliquez sur votre profil en bas à gauche.</li>
              <li>Saisissez l'ancien mot de passe, puis le nouveau.</li>
              <li>Cliquez sur <strong>Enregistrer</strong>.</li>
            </ol>
          </div>
        ),
      },
    ],
    parent: [
      {
        id: "enfants",
        icon: <Users size={20} />,
        title: "Mes enfants",
        keywords: "enfants informations",
        content: (
          <div>
            <p style={S.muted}>Consultez les informations de vos enfants :</p>
            <ul style={S.muted}>
              <li>Accédez à la liste de vos enfants.</li>
              <li>Cliquez sur un enfant pour voir ses notes, absences, punitions et frais.</li>
            </ul>
          </div>
        ),
      },
      {
        id: "notes",
        icon: <BookOpen size={20} />,
        title: "Notes",
        keywords: "notes bulletins",
        content: (
          <div>
            <p style={S.muted}>Visualisez les notes de votre enfant :</p>
            <ol style={S.muted}>
              <li>Sélectionnez votre enfant.</li>
              <li>Accédez à l'onglet <strong>Notes</strong>.</li>
              <li>Consultez les notes par matière et par période.</li>
            </ol>
          </div>
        ),
      },
      {
        id: "absences",
        icon: <Calendar size={20} />,
        title: "Absences et retards",
        keywords: "absences retards",
        content: (
          <div>
            <p style={S.muted}>Suivez les absences de votre enfant :</p>
            <ul style={S.muted}>
              <li>Dans la fiche de votre enfant, consultez l'historique des absences.</li>
              <li>Vous pouvez justifier une absence si nécessaire.</li>
            </ul>
          </div>
        ),
      },
      {
        id: "punitions",
        icon: <AlertTriangle size={20} />,
        title: "Punitions",
        keywords: "punitions discipline",
        content: (
          <div>
            <p style={S.muted}>Soyez informé des punitions :</p>
            <ul style={S.muted}>
              <li>Les punitions graves déclenchent une notification.</li>
              <li>Vous pouvez consulter l'historique disciplinaire de votre enfant.</li>
            </ul>
          </div>
        ),
      },
      {
        id: "frais",
        icon: <DollarSign size={20} />,
        title: "Frais de scolarité",
        keywords: "frais paiement",
        content: (
          <div>
            <p style={S.muted}>Consultez le solde des frais :</p>
            <ul style={S.muted}>
              <li>Dans la fiche de votre enfant, voyez le montant total, payé et reste à payer.</li>
            </ul>
          </div>
        ),
      },
      {
        id: "profil",
        icon: <User size={20} />,
        title: "Profil et mot de passe",
        keywords: "mot de passe profil compte",
        content: (
          <div>
            <p style={S.muted}>Pour changer votre mot de passe :</p>
            <ol style={S.muted}>
              <li>Cliquez sur votre profil en bas à gauche.</li>
              <li>Saisissez l'ancien mot de passe, puis le nouveau.</li>
              <li>Cliquez sur <strong>Enregistrer</strong>.</li>
            </ol>
          </div>
        ),
      },
    ],
    eleve: [
      {
        id: "notes",
        icon: <BookOpen size={20} />,
        title: "Mes notes",
        keywords: "notes bulletins",
        content: (
          <div>
            <p style={S.muted}>Consultez vos notes :</p>
            <ol style={S.muted}>
              <li>Allez dans l'onglet <strong>Notes</strong>.</li>
              <li>Visualisez vos résultats par matière et par période.</li>
            </ol>
          </div>
        ),
      },
      {
        id: "absences",
        icon: <Calendar size={20} />,
        title: "Mes absences",
        keywords: "absences retards",
        content: (
          <div>
            <p style={S.muted}>Vos absences et retards sont répertoriés :</p>
            <ul style={S.muted}>
              <li>Consultez l'historique dans l'onglet <strong>Absences</strong>.</li>
            </ul>
          </div>
        ),
      },
      {
        id: "emploi",
        icon: <Clock size={20} />,
        title: "Emploi du temps",
        keywords: "emploi du temps",
        content: (
          <div>
            <p style={S.muted}>Votre emploi du temps est disponible :</p>
            <ul style={S.muted}>
              <li>Dans l'onglet <strong>Emploi du temps</strong>, consultez les cours.</li>
            </ul>
          </div>
        ),
      },
      {
        id: "profil",
        icon: <User size={20} />,
        title: "Profil et mot de passe",
        keywords: "mot de passe profil compte",
        content: (
          <div>
            <p style={S.muted}>Pour changer votre mot de passe :</p>
            <ol style={S.muted}>
              <li>Cliquez sur votre profil en bas à gauche.</li>
              <li>Saisissez l'ancien mot de passe, puis le nouveau.</li>
              <li>Cliquez sur <strong>Enregistrer</strong>.</li>
            </ol>
          </div>
        ),
      },
    ],
    comptable: [
      {
        id: "frais",
        icon: <DollarSign size={20} />,
        title: "Gestion des frais",
        keywords: "frais paiement soldes",
        content: (
          <div>
            <p style={S.muted}>Gérez les frais de scolarité :</p>
            <ol style={S.muted}>
              <li>Allez dans l'onglet <strong>Finance</strong>.</li>
              <li>Sélectionnez un élève et saisissez les montants.</li>
              <li>Le reste à payer est calculé automatiquement.</li>
            </ol>
          </div>
        ),
      },
      {
        id: "export",
        icon: <Download size={20} />,
        title: "Exporter les données",
        keywords: "export excel",
        content: (
          <div>
            <p style={S.muted}>Exportez les frais au format Excel.</p>
          </div>
        ),
      },
      {
        id: "profil",
        icon: <User size={20} />,
        title: "Profil et mot de passe",
        keywords: "mot de passe profil compte",
        content: (
          <div>
            <p style={S.muted}>Pour changer votre mot de passe :</p>
            <ol style={S.muted}>
              <li>Cliquez sur votre profil en bas à gauche.</li>
              <li>Saisissez l'ancien mot de passe, puis le nouveau.</li>
              <li>Cliquez sur <strong>Enregistrer</strong>.</li>
            </ol>
          </div>
        ),
      },
    ],
  };

  // Sélection des sections en fonction du rôle
  const allSections = sectionsByRole[roleKey] || sectionsByRole.eleve || [];

  const filteredSections = useMemo(() => {
    if (!Array.isArray(allSections)) return [];
    if (!searchTerm.trim()) return allSections;
    const q = searchTerm.toLowerCase();
    return allSections.filter(
      (s) => s.title.toLowerCase().includes(q) || s.keywords.includes(q)
    );
  }, [searchTerm, allSections]);

  // Surligner le texte correspondant à la recherche
  const highlightText = (text) => {
    if (!searchTerm.trim()) return text;
    const q = searchTerm.trim();
    const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} style={{ background: dark ? "#FBBF24" : "#FDE68A", color: "#1E293B", borderRadius: 2, padding: "0 2px" }}>
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  // Questions fréquentes
  const faq = [
    {
      q: "Comment puis-je changer mon mot de passe ?",
      a: "Allez dans votre profil en bas à gauche (ou dans Paramètres selon votre rôle), saisissez l'ancien mot de passe puis le nouveau, et cliquez sur Enregistrer.",
    },
    {
      q: "Que faire si j'ai oublié mon identifiant ?",
      a: "Contactez l'administrateur de votre école ou le super admin pour réinitialiser vos informations de connexion.",
    },
    {
      q: "Comment signaler un problème technique ?",
      a: "Utilisez l'onglet Aide ou contactez le support via l'email indiqué dans les paramètres de l'application.",
    },
    {
      q: "Puis-je utiliser l'application sur mobile ?",
      a: "Oui, l'application est responsive et s'adapte à toutes les tailles d'écran. Certaines fonctionnalités comme les appels vidéo nécessitent une connexion stable.",
    },
    {
      q: "Comment exporter des données ?",
      a: "Selon votre rôle, des boutons d'export Excel/CSV sont disponibles dans les sections concernées (élèves, frais, etc.).",
    },
  ];

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 20, width: "100%" }}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .section-enter {
          animation: fadeIn 0.2s ease;
        }
      `}</style>

      <h1 style={{ ...S.h2, display: "flex", alignItems: "center", gap: 8, justifyContent: "space-between" }}>
        <span><HelpCircle size={28} /> Aide</span>
        <span style={{ fontSize: 14, fontWeight: 400, color: S.textMuted }}>
          {filteredSections.length} rubrique(s)
        </span>
      </h1>
      <p style={{ ...S.muted, marginBottom: 24 }}>
        Rubriques pour : <strong>{roleKey}</strong>
      </p>

      {/* Barre de recherche et contrôles */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
        <div style={{ position: "relative", width: "100%" }}>
          <Search size={18} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: dark ? "#94A3B8" : "#64748B" }} />
          <input
            type="search"
            placeholder="Rechercher une rubrique..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 40px 10px 40px",
              border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
              borderRadius: 8,
              background: dark ? "#0F172A" : "#F9FAFB",
              color: dark ? "#F1F5F9" : "#1E293B",
              fontSize: 14,
              outline: "none",
            }}
            aria-label="Rechercher dans l'aide"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              style={{
                position: "absolute",
                right: 8,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                color: dark ? "#94A3B8" : "#64748B",
                cursor: "pointer",
              }}
              aria-label="Effacer la recherche"
            >
              <X size={18} />
            </button>
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={toggleAllSections}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              background: "transparent",
              border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
              borderRadius: 6,
              color: dark ? "#94A3B8" : "#64748B",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            {allOpen ? <ChevronsUp size={16} /> : <ChevronsDown size={16} />}
            {allOpen ? "Tout replier" : "Tout déplier"}
          </button>
        </div>
      </div>

      {filteredSections.length === 0 && (
        <p style={{ textAlign: "center", color: S.textMuted, padding: 20 }}>
          Aucune rubrique trouvée.
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {filteredSections.map((section) => {
          const isOpen = allOpen ? true : openSection === section.id;
          return (
            <div
              key={section.id}
              className="section-enter"
              style={{
                ...S.card,
                borderRadius: 12,
                overflow: "hidden",
                transition: "box-shadow 0.2s, background-color 0.3s",
                border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
              }}
            >
              <button
                onClick={() => toggleSection(section.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  width: "100%",
                  padding: "16px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: S.text,
                  fontSize: 16,
                  fontWeight: 600,
                  textAlign: "left",
                  outline: "none",
                }}
                aria-expanded={isOpen}
                aria-controls={`section-${section.id}`}
              >
                <span style={{ flexShrink: 0 }}>{section.icon}</span>
                <span style={{ flex: 1 }}>
                  {highlightText(section.title)}
                </span>
                {isOpen ? (
                  <ChevronDown size={20} style={{ flexShrink: 0 }} />
                ) : (
                  <ChevronRight size={20} style={{ flexShrink: 0 }} />
                )}
              </button>
              <div
                id={`section-${section.id}`}
                style={{
                  maxHeight: isOpen ? 500 : 0,
                  overflow: "hidden",
                  transition: "max-height 0.3s ease",
                  padding: isOpen ? "0 16px 16px 48px" : "0 16px 0 48px",
                  lineHeight: 1.8,
                }}
              >
                <div style={{ position: "relative" }}>
                  {section.content}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      copySectionContent(section.title);
                    }}
                    style={{
                      position: "absolute",
                      top: 0,
                      right: 0,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: dark ? "#94A3B8" : "#64748B",
                    }}
                    title="Copier le titre"
                  >
                    <Copy size={14} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Section FAQ */}
      <div style={{ marginTop: 40 }}>
        <h2 style={{ ...S.h3, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <HelpCircle size={20} /> Questions fréquentes
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {faq.map((item, idx) => (
            <div
              key={idx}
              style={{
                background: dark ? "#1E293B" : "#FFFFFF",
                borderRadius: 8,
                padding: "12px 16px",
                border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
              }}
            >
              <div style={{ fontWeight: 600, color: dark ? "#F1F5F9" : "#1E293B", marginBottom: 4 }}>
                {item.q}
              </div>
              <div style={{ color: dark ? "#94A3B8" : "#64748B", fontSize: 14 }}>
                {item.a}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showScrollTop && (
        <button
          onClick={scrollToTop}
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 1000,
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: dark ? "#818CF8" : "#4F46E5",
            color: "white",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: dark ? "0 4px 12px rgba(0,0,0,0.5)" : "0 4px 12px rgba(79,70,229,0.3)",
            animation: "fadeIn 0.3s ease",
          }}
          aria-label="Retour en haut de page"
        >
          <ArrowUp size={20} />
        </button>
      )}
    </div>
  );
}