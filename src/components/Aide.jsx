// src/components/Aide.jsx
import { useState, useMemo, useEffect, useCallback } from "react";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  HelpCircle, Users, AlertTriangle, MessageCircle, Phone,
  User, ChevronDown, ChevronRight, BookOpen, DollarSign,
  Search, X, ArrowUp, Shield, UserCheck, Clock, Download,
  School, Calendar, ClipboardList, ChevronsUp, ChevronsDown, Copy,
} from "lucide-react";
import toast from "react-hot-toast";

// ════════════════════════════════════════════════════════════════════
// KEYFRAMES MODULE-LEVEL (injectés UNE SEULE FOIS)
// ════════════════════════════════════════════════════════════════════
const AideKeyframes = (
  <style>{`
    @keyframes aide-fade-in {
      from { opacity: 0; transform: translateY(10px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .aide-section-enter {
      animation: aide-fade-in 0.2s ease;
    }
    @media (prefers-reduced-motion: reduce) {
      .aide-section-enter { animation: none !important; }
    }
  `}</style>
);

// ════════════════════════════════════════════════════════════════════
// CONSTANTES MODULE-LEVEL
// ════════════════════════════════════════════════════════════════════
const TAP_BASE = {
  touchAction: "manipulation",
  WebkitTapHighlightColor: "transparent",
  minHeight: 44,
};

const FOCUS_RING = (color) => ({
  outline: `2px solid ${color}`,
  outlineOffset: 2,
});

// ════════════════════════════════════════════════════════════════════
// FAQ MODULE-LEVEL (jamais recréé)
// ════════════════════════════════════════════════════════════════════
const FAQ_ITEMS = [
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

// ════════════════════════════════════════════════════════════════════
// HELPER — highlight texte (module-level)
// ════════════════════════════════════════════════════════════════════
function highlightText(text, searchTerm, dark) {
  if (!searchTerm.trim()) return text;
  const q = searchTerm.trim();
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const splitRegex = new RegExp(`(${escaped})`, "gi");
  const testRegex = new RegExp(`^${escaped}$`, "i");
  const parts = text.split(splitRegex);
  return parts.map((part, i) =>
    testRegex.test(part) ? (
      <mark
        key={i}
        style={{
          background: dark ? "#FBBF24" : "#FDE68A",
          color: "#1E293B",
          borderRadius: 2,
          padding: "0 2px",
        }}
      >
        {part}
      </mark>
    ) : (
      part
    )
  );
}

// ════════════════════════════════════════════════════════════════════
// PRESSABLE — feedback tap + focus ring via state React
// ════════════════════════════════════════════════════════════════════
function Pressable({
  onClick,
  style,
  children,
  disabled = false,
  type = "button",
  focusColor,
  ariaLabel,
  ariaBusy,
  ...rest
}) {
  const [pressed, setPressed] = useState(false);
  const [focused, setFocused] = useState(false);
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-busy={ariaBusy}
      onPointerDown={() => !disabled && setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        ...TAP_BASE,
        transform: pressed && !disabled ? "scale(0.97)" : "scale(1)",
        transition: "transform 0.12s ease, background-color 0.2s, border-color 0.2s",
        ...(focused && !disabled && focusColor ? FOCUS_RING(focusColor) : null),
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ════════════════════════════════════════════════════════════════════
export function Aide({ user, role, isSuperAdmin }) {
  const { S, dark } = useStyles();
  const isMobile = useIsMobile();
  const [openSection, setOpenSection] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [allOpen, setAllOpen] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // ─── prefers-reduced-motion (fallback Safari < 14) ───────────────
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const handler = (e) => setPrefersReducedMotion(e.matches);
    if (mq.addEventListener) {
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    } else if (mq.addListener) {
      mq.addListener(handler);
      return () => mq.removeListener(handler);
    }
  }, []);

  // ─── Rôle effectif ───────────────────────────────────────────────
  const roleKey = useMemo(() => {
    if (role) return role;
    if (user) {
      if (isSuperAdmin) return "superAdmin";
      if (user.role === "admin" && !user.ecoleId) return "superAdmin";
      return user.role;
    }
    return "eleve";
  }, [user, role, isSuperAdmin]);

  // ─── Scroll listener (passive) ───────────────────────────────────
  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 200);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ─── Toggle section ──────────────────────────────────────────────
  const toggleSection = useCallback((id) => {
    setAllOpen(false);
    setOpenSection((prev) => (prev === id ? null : id));
  }, []);

  const toggleAllSections = useCallback(() => {
    setAllOpen((prev) => !prev);
  }, []);

  const scrollToTop = useCallback(() => {
    if (prefersReducedMotion) {
      window.scrollTo({ top: 0 });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [prefersReducedMotion]);

  // ─── Copie de contenu ────────────────────────────────────────────
  const copySectionContent = useCallback(async (section) => {
    try {
      let rawText = "";
      if (typeof section.content === "string") {
        const tmp = document.createElement("div");
        tmp.innerHTML = section.content;
        rawText = tmp.textContent || tmp.innerText || "";
      }
      const fullText = rawText.trim()
        ? `${section.title}\n\n${rawText.trim()}`
        : section.title;
      await navigator.clipboard.writeText(fullText);
      toast.success("Contenu copié !");
    } catch (err) {
      console.error("[Aide] copy failed:", err);
      toast.error("Impossible de copier");
    }
  }, []);

  // ════════════════════════════════════════════════════════════════════
  // ✅ FIX CRITIQUE — sectionsByRole mémoïsé (évite la recréation de ~40 sections × JSX à chaque keystroke)
  // ════════════════════════════════════════════════════════════════════
  const sectionsByRole = useMemo(
    () => ({
      superAdmin: [
        {
          id: "ecoles",
          icon: <School size={isMobile ? 18 : 20} aria-hidden="true" />,
          title: "Gérer les écoles",
          keywords: "écoles créer supprimer code",
          content: (
            <div>
              <p style={S.muted}>
                En tant que super admin, vous pouvez gérer les écoles :
              </p>
              <ul style={S.muted}>
                <li>Créer une nouvelle école avec un code unique.</li>
                <li>Consulter la liste des écoles et leurs statistiques.</li>
                <li>Suspendre ou réactiver une école.</li>
                <li>
                  Supprimer une école (toutes ses données seront effacées).
                </li>
              </ul>
            </div>
          ),
        },
        {
          id: "admins",
          icon: <Shield size={isMobile ? 18 : 20} aria-hidden="true" />,
          title: "Super admins secondaires",
          keywords: "super admin permissions rôles",
          content: (
            <div>
              <p style={S.muted}>
                Vous pouvez créer d'autres super admins avec des permissions
                limitées :
              </p>
              <ul style={S.muted}>
                <li>
                  Allez dans la section <strong>Super Admins</strong>.
                </li>
                <li>
                  Créez un compte et attribuez des permissions précises.
                </li>
                <li>
                  Vous pouvez modifier ou supprimer les permissions à tout
                  moment.
                </li>
              </ul>
            </div>
          ),
        },
        {
          id: "profil",
          icon: <User size={isMobile ? 18 : 20} aria-hidden="true" />,
          title: "Profil et mot de passe",
          keywords: "mot de passe profil compte",
          content: (
            <div>
              <p style={S.muted}>Pour changer votre mot de passe :</p>
              <ol style={S.muted}>
                <li>Cliquez sur votre profil en bas à gauche.</li>
                <li>Saisissez l'ancien mot de passe, puis le nouveau.</li>
                <li>
                  Cliquez sur <strong>Enregistrer</strong>.
                </li>
              </ol>
            </div>
          ),
        },
      ],
      admin: [
        {
          id: "eleves",
          icon: <BookOpen size={isMobile ? 18 : 20} aria-hidden="true" />,
          title: "Gestion des élèves",
          keywords: "élèves ajouter importer excel classe",
          content: (
            <div>
              <p style={S.muted}>Pour ajouter un élève :</p>
              <ol style={S.muted}>
                <li>
                  Allez dans l'onglet <strong>Scolarité → Élèves</strong>.
                </li>
                <li>
                  Remplissez le nom, le post-nom et choisissez une classe.
                </li>
                <li>Optionnellement, associez un parent.</li>
                <li>
                  Cliquez sur <strong>Ajouter l'élève</strong>.
                </li>
              </ol>
              <p style={S.muted}>
                Vous pouvez importer une liste depuis Excel (colonnes : nom,
                postnom, classe).
              </p>
            </div>
          ),
        },
        {
          id: "classes",
          icon: <Users size={isMobile ? 18 : 20} aria-hidden="true" />,
          title: "Gestion des classes",
          keywords: "classes créer renommer supprimer",
          content: (
            <div>
              <p style={S.muted}>Pour gérer les classes :</p>
              <ul style={S.muted}>
                <li>
                  Dans l'onglet <strong>Classes</strong>, cliquez sur{" "}
                  <strong>Nouvelle classe</strong>.
                </li>
                <li>
                  Vous pouvez renommer, supprimer ou voir les élèves d'une
                  classe.
                </li>
              </ul>
            </div>
          ),
        },
        {
          id: "utilisateurs",
          icon: <UserCheck size={isMobile ? 18 : 20} aria-hidden="true" />,
          title: "Gestion des utilisateurs",
          keywords: "utilisateurs créer rôles permissions",
          content: (
            <div>
              <p style={S.muted}>
                Vous pouvez créer et gérer les comptes utilisateurs :
              </p>
              <ol style={S.muted}>
                <li>
                  Allez dans <strong>Paramètres → Utilisateurs</strong>.
                </li>
                <li>
                  Créez un compte avec un rôle (enseignant, parent, élève,
                  etc.).
                </li>
                <li>
                  Vous pouvez modifier les rôles et supprimer des comptes.
                </li>
              </ol>
            </div>
          ),
        },
        {
          id: "fautes",
          icon: (
            <AlertTriangle size={isMobile ? 18 : 20} aria-hidden="true" />
          ),
          title: "Fautes et sanctions",
          keywords: "fautes sanctions disciplinaire",
          content: (
            <div>
              <p style={S.muted}>Gérez les fautes et sanctions :</p>
              <ul style={S.muted}>
                <li>
                  Créez des fautes (Légère, Moyenne, Grave) dans{" "}
                  <strong>Paramètres</strong>.
                </li>
                <li>
                  Les disciplinaire peuvent ensuite les utiliser pour
                  sanctionner.
                </li>
              </ul>
            </div>
          ),
        },
        {
          id: "frais",
          icon: (
            <DollarSign size={isMobile ? 18 : 20} aria-hidden="true" />
          ),
          title: "Gestion des frais",
          keywords: "frais scolarité paiement comptable",
          content: (
            <div>
              <p style={S.muted}>Pour gérer les frais de scolarité :</p>
              <ol style={S.muted}>
                <li>
                  Allez dans <strong>Finance</strong>.
                </li>
                <li>
                  Choisissez un élève et saisissez le montant total et le
                  montant payé.
                </li>
                <li>Le reste à payer est calculé automatiquement.</li>
              </ol>
            </div>
          ),
        },
        {
          id: "annees",
          icon: <Calendar size={isMobile ? 18 : 20} aria-hidden="true" />,
          title: "Années scolaires",
          keywords: "année scolaire active",
          content: (
            <div>
              <p style={S.muted}>Gérez les années scolaires :</p>
              <ul style={S.muted}>
                <li>
                  Dans <strong>Paramètres → Année scolaire</strong>, créez
                  des années.
                </li>
                <li>
                  Activez l'année en cours pour que les données soient
                  associées.
                </li>
              </ul>
            </div>
          ),
        },
        {
          id: "profil",
          icon: <User size={isMobile ? 18 : 20} aria-hidden="true" />,
          title: "Profil et mot de passe",
          keywords: "mot de passe profil compte",
          content: (
            <div>
              <p style={S.muted}>Pour changer votre mot de passe :</p>
              <ol style={S.muted}>
                <li>
                  Cliquez sur <strong>Paramètres → Profil</strong>.
                </li>
                <li>
                  Saisissez l'ancien mot de passe, puis le nouveau (2 fois).
                </li>
                <li>
                  Cliquez sur <strong>Enregistrer</strong>.
                </li>
              </ol>
            </div>
          ),
        },
      ],
      directeur: [
        {
          id: "eleves",
          icon: <BookOpen size={isMobile ? 18 : 20} aria-hidden="true" />,
          title: "Consulter les élèves",
          keywords: "élèves liste classe",
          content: (
            <div>
              <p style={S.muted}>Pour voir les élèves :</p>
              <ol style={S.muted}>
                <li>
                  Allez dans l'onglet <strong>Élèves</strong>.
                </li>
                <li>Filtrez par classe ou recherchez un élève.</li>
                <li>Cliquez sur un élève pour voir sa fiche complète.</li>
              </ol>
            </div>
          ),
        },
        {
          id: "stats",
          icon: (
            <ClipboardList size={isMobile ? 18 : 20} aria-hidden="true" />
          ),
          title: "Statistiques disciplinaires",
          keywords: "statistiques punitions",
          content: (
            <div>
              <p style={S.muted}>Visualisez les statistiques :</p>
              <ul style={S.muted}>
                <li>
                  Consultez le nombre de punitions par classe ou par faute.
                </li>
                <li>Exportez les rapports.</li>
              </ul>
            </div>
          ),
        },
        {
          id: "messages",
          icon: (
            <MessageCircle size={isMobile ? 18 : 20} aria-hidden="true" />
          ),
          title: "Messagerie",
          keywords: "messages chat notification",
          content: (
            <div>
              <p style={S.muted}>
                La messagerie fonctionne comme un chat instantané :
              </p>
              <ol style={S.muted}>
                <li>
                  Allez dans l'onglet <strong>Messages</strong>.
                </li>
                <li>Choisissez ou créez une conversation.</li>
                <li>Écrivez et envoyez votre message.</li>
              </ol>
            </div>
          ),
        },
        {
          id: "appels",
          icon: <Phone size={isMobile ? 18 : 20} aria-hidden="true" />,
          title: "Appels vidéo",
          keywords: "appels vidéo audio",
          content: (
            <div>
              <p style={S.muted}>Pour passer un appel vidéo :</p>
              <ol style={S.muted}>
                <li>
                  Allez dans l'onglet <strong>Appels</strong>.
                </li>
                <li>
                  Cliquez sur <strong>Appeler</strong> à côté du contact.
                </li>
                <li>
                  Le destinataire reçoit une notification et peut accepter ou
                  refuser.
                </li>
              </ol>
            </div>
          ),
        },
        {
          id: "profil",
          icon: <User size={isMobile ? 18 : 20} aria-hidden="true" />,
          title: "Profil et mot de passe",
          keywords: "mot de passe profil compte",
          content: (
            <div>
              <p style={S.muted}>Pour changer votre mot de passe :</p>
              <ol style={S.muted}>
                <li>
                  Cliquez sur <strong>Paramètres → Profil</strong>.
                </li>
                <li>Saisissez l'ancien mot de passe, puis le nouveau.</li>
                <li>
                  Cliquez sur <strong>Enregistrer</strong>.
                </li>
              </ol>
            </div>
          ),
        },
      ],
      disciplinaire: [
        {
          id: "punitions",
          icon: (
            <AlertTriangle size={isMobile ? 18 : 20} aria-hidden="true" />
          ),
          title: "Saisir une punition",
          keywords: "punitions sanctions faute",
          content: (
            <div>
              <p style={S.muted}>Pour enregistrer une punition :</p>
              <ol style={S.muted}>
                <li>
                  Accédez à l'onglet <strong>Saisir une punition</strong>.
                </li>
                <li>Recherchez l'élève par son nom.</li>
                <li>Sélectionnez la faute (Légère, Moyenne, Grave).</li>
                <li>Choisissez la sanction.</li>
                <li>Ajoutez un commentaire si nécessaire.</li>
                <li>
                  Cliquez sur <strong>Enregistrer</strong>.
                </li>
              </ol>
              <p style={S.muted}>
                En cas de faute grave, le parent reçoit une notification.
              </p>
            </div>
          ),
        },
        {
          id: "historique",
          icon: (
            <ClipboardList size={isMobile ? 18 : 20} aria-hidden="true" />
          ),
          title: "Historique des punitions",
          keywords: "historique punitions",
          content: (
            <div>
              <p style={S.muted}>Consultez l'historique :</p>
              <ul style={S.muted}>
                <li>
                  Allez dans <strong>Historique</strong>.
                </li>
                <li>Filtrez par classe ou par date.</li>
              </ul>
            </div>
          ),
        },
        {
          id: "absences",
          icon: <Calendar size={isMobile ? 18 : 20} aria-hidden="true" />,
          title: "Absences et retards",
          keywords: "absences retards",
          content: (
            <div>
              <p style={S.muted}>Gérez les absences :</p>
              <ol style={S.muted}>
                <li>
                  Dans l'onglet <strong>Absences</strong>, enregistrez une
                  absence ou un retard.
                </li>
                <li>Un justificatif peut être ajouté.</li>
              </ol>
            </div>
          ),
        },
        {
          id: "profil",
          icon: <User size={isMobile ? 18 : 20} aria-hidden="true" />,
          title: "Profil et mot de passe",
          keywords: "mot de passe profil compte",
          content: (
            <div>
              <p style={S.muted}>Pour changer votre mot de passe :</p>
              <ol style={S.muted}>
                <li>Cliquez sur votre profil en bas à gauche.</li>
                <li>Saisissez l'ancien mot de passe, puis le nouveau.</li>
                <li>
                  Cliquez sur <strong>Enregistrer</strong>.
                </li>
              </ol>
            </div>
          ),
        },
      ],
      enseignant: [
        {
          id: "notes",
          icon: <BookOpen size={isMobile ? 18 : 20} aria-hidden="true" />,
          title: "Saisir les notes",
          keywords: "notes évaluation",
          content: (
            <div>
              <p style={S.muted}>Pour saisir les notes :</p>
              <ol style={S.muted}>
                <li>
                  Allez dans l'onglet <strong>Notes</strong>.
                </li>
                <li>Choisissez un élève et une matière.</li>
                <li>Saisissez la note (sur 20 ou selon le barème).</li>
                <li>
                  Cliquez sur <strong>Ajouter</strong>.
                </li>
              </ol>
            </div>
          ),
        },
        {
          id: "absences",
          icon: <Calendar size={isMobile ? 18 : 20} aria-hidden="true" />,
          title: "Absences et retards",
          keywords: "absences retards",
          content: (
            <div>
              <p style={S.muted}>Enregistrez les absences :</p>
              <ol style={S.muted}>
                <li>
                  Dans <strong>Absences</strong>, sélectionnez un élève et
                  une date.
                </li>
                <li>Indiquez le type (absence, retard).</li>
              </ol>
            </div>
          ),
        },
        {
          id: "emploi",
          icon: <Clock size={isMobile ? 18 : 20} aria-hidden="true" />,
          title: "Emploi du temps",
          keywords: "emploi du temps",
          content: (
            <div>
              <p style={S.muted}>Consultez votre emploi du temps :</p>
              <ul style={S.muted}>
                <li>
                  Dans l'onglet <strong>Emploi du temps</strong>, visualisez
                  les cours.
                </li>
              </ul>
            </div>
          ),
        },
        {
          id: "profil",
          icon: <User size={isMobile ? 18 : 20} aria-hidden="true" />,
          title: "Profil et mot de passe",
          keywords: "mot de passe profil compte",
          content: (
            <div>
              <p style={S.muted}>Pour changer votre mot de passe :</p>
              <ol style={S.muted}>
                <li>Cliquez sur votre profil en bas à gauche.</li>
                <li>Saisissez l'ancien mot de passe, puis le nouveau.</li>
                <li>
                  Cliquez sur <strong>Enregistrer</strong>.
                </li>
              </ol>
            </div>
          ),
        },
      ],
      parent: [
        {
          id: "enfants",
          icon: <Users size={isMobile ? 18 : 20} aria-hidden="true" />,
          title: "Mes enfants",
          keywords: "enfants informations",
          content: (
            <div>
              <p style={S.muted}>
                Consultez les informations de vos enfants :
              </p>
              <ul style={S.muted}>
                <li>Accédez à la liste de vos enfants.</li>
                <li>
                  Cliquez sur un enfant pour voir ses notes, absences,
                  punitions et frais.
                </li>
              </ul>
            </div>
          ),
        },
        {
          id: "notes",
          icon: <BookOpen size={isMobile ? 18 : 20} aria-hidden="true" />,
          title: "Notes",
          keywords: "notes bulletins",
          content: (
            <div>
              <p style={S.muted}>Visualisez les notes de votre enfant :</p>
              <ol style={S.muted}>
                <li>Sélectionnez votre enfant.</li>
                <li>
                  Accédez à l'onglet <strong>Notes</strong>.
                </li>
                <li>Consultez les notes par matière et par période.</li>
              </ol>
            </div>
          ),
        },
        {
          id: "absences",
          icon: <Calendar size={isMobile ? 18 : 20} aria-hidden="true" />,
          title: "Absences et retards",
          keywords: "absences retards",
          content: (
            <div>
              <p style={S.muted}>
                Suivez les absences de votre enfant :
              </p>
              <ul style={S.muted}>
                <li>
                  Dans la fiche de votre enfant, consultez l'historique des
                  absences.
                </li>
                <li>Vous pouvez justifier une absence si nécessaire.</li>
              </ul>
            </div>
          ),
        },
        {
          id: "punitions",
          icon: (
            <AlertTriangle size={isMobile ? 18 : 20} aria-hidden="true" />
          ),
          title: "Punitions",
          keywords: "punitions discipline",
          content: (
            <div>
              <p style={S.muted}>Soyez informé des punitions :</p>
              <ul style={S.muted}>
                <li>
                  Les punitions graves déclenchent une notification.
                </li>
                <li>
                  Vous pouvez consulter l'historique disciplinaire de votre
                  enfant.
                </li>
              </ul>
            </div>
          ),
        },
        {
          id: "frais",
          icon: (
            <DollarSign size={isMobile ? 18 : 20} aria-hidden="true" />
          ),
          title: "Frais de scolarité",
          keywords: "frais paiement",
          content: (
            <div>
              <p style={S.muted}>Consultez le solde des frais :</p>
              <ul style={S.muted}>
                <li>
                  Dans la fiche de votre enfant, voyez le montant total, payé
                  et reste à payer.
                </li>
              </ul>
            </div>
          ),
        },
        {
          id: "profil",
          icon: <User size={isMobile ? 18 : 20} aria-hidden="true" />,
          title: "Profil et mot de passe",
          keywords: "mot de passe profil compte",
          content: (
            <div>
              <p style={S.muted}>Pour changer votre mot de passe :</p>
              <ol style={S.muted}>
                <li>Cliquez sur votre profil en bas à gauche.</li>
                <li>Saisissez l'ancien mot de passe, puis le nouveau.</li>
                <li>
                  Cliquez sur <strong>Enregistrer</strong>.
                </li>
              </ol>
            </div>
          ),
        },
      ],
      eleve: [
        {
          id: "notes",
          icon: <BookOpen size={isMobile ? 18 : 20} aria-hidden="true" />,
          title: "Mes notes",
          keywords: "notes bulletins",
          content: (
            <div>
              <p style={S.muted}>Consultez vos notes :</p>
              <ol style={S.muted}>
                <li>
                  Allez dans l'onglet <strong>Notes</strong>.
                </li>
                <li>
                  Visualisez vos résultats par matière et par période.
                </li>
              </ol>
            </div>
          ),
        },
        {
          id: "absences",
          icon: <Calendar size={isMobile ? 18 : 20} aria-hidden="true" />,
          title: "Mes absences",
          keywords: "absences retards",
          content: (
            <div>
              <p style={S.muted}>
                Vos absences et retards sont répertoriés :
              </p>
              <ul style={S.muted}>
                <li>
                  Consultez l'historique dans l'onglet{" "}
                  <strong>Absences</strong>.
                </li>
              </ul>
            </div>
          ),
        },
        {
          id: "emploi",
          icon: <Clock size={isMobile ? 18 : 20} aria-hidden="true" />,
          title: "Emploi du temps",
          keywords: "emploi du temps",
          content: (
            <div>
              <p style={S.muted}>
                Votre emploi du temps est disponible :
              </p>
              <ul style={S.muted}>
                <li>
                  Dans l'onglet <strong>Emploi du temps</strong>, consultez
                  les cours.
                </li>
              </ul>
            </div>
          ),
        },
        {
          id: "profil",
          icon: <User size={isMobile ? 18 : 20} aria-hidden="true" />,
          title: "Profil et mot de passe",
          keywords: "mot de passe profil compte",
          content: (
            <div>
              <p style={S.muted}>Pour changer votre mot de passe :</p>
              <ol style={S.muted}>
                <li>Cliquez sur votre profil en bas à gauche.</li>
                <li>Saisissez l'ancien mot de passe, puis le nouveau.</li>
                <li>
                  Cliquez sur <strong>Enregistrer</strong>.
                </li>
              </ol>
            </div>
          ),
        },
      ],
      comptable: [
        {
          id: "frais",
          icon: (
            <DollarSign size={isMobile ? 18 : 20} aria-hidden="true" />
          ),
          title: "Gestion des frais",
          keywords: "frais paiement soldes",
          content: (
            <div>
              <p style={S.muted}>Gérez les frais de scolarité :</p>
              <ol style={S.muted}>
                <li>
                  Allez dans l'onglet <strong>Finance</strong>.
                </li>
                <li>
                  Sélectionnez un élève et saisissez les montants.
                </li>
                <li>Le reste à payer est calculé automatiquement.</li>
              </ol>
            </div>
          ),
        },
        {
          id: "export",
          icon: (
            <Download size={isMobile ? 18 : 20} aria-hidden="true" />
          ),
          title: "Exporter les données",
          keywords: "export excel",
          content: (
            <div>
              <p style={S.muted}>
                Exportez les frais au format Excel.
              </p>
            </div>
          ),
        },
        {
          id: "profil",
          icon: <User size={isMobile ? 18 : 20} aria-hidden="true" />,
          title: "Profil et mot de passe",
          keywords: "mot de passe profil compte",
          content: (
            <div>
              <p style={S.muted}>Pour changer votre mot de passe :</p>
              <ol style={S.muted}>
                <li>Cliquez sur votre profil en bas à gauche.</li>
                <li>Saisissez l'ancien mot de passe, puis le nouveau.</li>
                <li>
                  Cliquez sur <strong>Enregistrer</strong>.
                </li>
              </ol>
            </div>
          ),
        },
      ],
    }),
    [isMobile, S, dark]
  );

  // ─── Sections filtrées par rôle ──────────────────────────────────
  const allSections = useMemo(
    () => sectionsByRole[roleKey] || sectionsByRole.eleve || [],
    [sectionsByRole, roleKey]
  );

  const filteredSections = useMemo(() => {
    if (!Array.isArray(allSections)) return [];
    if (!searchTerm.trim()) return allSections;
    const q = searchTerm.toLowerCase();
    return allSections.filter(
      (s) =>
        s.title.toLowerCase().includes(q) || s.keywords.includes(q)
    );
  }, [searchTerm, allSections]);

  // ─── Styles adaptatifs ────────────────────────────────────────────
  const containerPadding = isMobile ? "16px 12px" : 20;
  const titleSize = isMobile ? 22 : 28;
  const subtitleSize = isMobile ? 13 : 14;
  const searchPadding = isMobile
    ? "12px 40px 12px 40px"
    : "10px 40px 10px 40px";
  const searchFontSize = isMobile ? 16 : 14;
  const searchIconLeft = 12;
  const searchClearRight = 8;
  const toggleAllButtonPadding = isMobile ? "10px 12px" : "10px 12px";
  const toggleAllButtonFontSize = isMobile ? 14 : 13;
  const sectionCardPadding = isMobile ? "14px" : "16px";
  const sectionTitleFontSize = isMobile ? 15 : 16;
  const sectionContentPaddingLeft = isMobile ? "14px" : "48px";
  const sectionContentFontSize = isMobile ? 14 : 15;
  const faqCardPadding = isMobile ? "10px 14px" : "12px 16px";
  const faqQuestionSize = isMobile ? 15 : 16;
  const faqAnswerSize = isMobile ? 13 : 14;

  // ════════════════════════════════════════════════════════════════════
  // RENDU
  // ════════════════════════════════════════════════════════════════════
  return (
    <div
      style={{
        maxWidth: 900,
        margin: "0 auto",
        padding: containerPadding,
        width: "100%",
      }}
    >
      {AideKeyframes}

      {/* ═══════════ EN-TÊTE ═══════════ */}
      <h1
        style={{
          ...S.h2,
          display: "flex",
          alignItems: "center",
          gap: 8,
          justifyContent: "space-between",
          fontSize: titleSize,
        }}
      >
        <span
          style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
        >
          <HelpCircle
            size={isMobile ? 24 : 28}
            aria-hidden="true"
          />
          Aide
        </span>
        <span
          style={{
            fontSize: isMobile ? 13 : 14,
            fontWeight: 400,
            color: S.textMuted,
          }}
        >
          {filteredSections.length} rubrique(s)
        </span>
      </h1>
      <p
        style={{
          ...S.muted,
          marginBottom: isMobile ? 16 : 24,
          fontSize: subtitleSize,
        }}
      >
        Rubriques pour : <strong>{roleKey}</strong>
      </p>

      {/* ═══════════ BARRE DE RECHERCHE + CONTRÔLES ═══════════ */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          marginBottom: isMobile ? 16 : 24,
        }}
      >
        <div style={{ position: "relative", width: "100%" }}>
          <Search
            size={18}
            aria-hidden="true"
            style={{
              position: "absolute",
              left: searchIconLeft,
              top: "50%",
              transform: "translateY(-50%)",
              color: dark ? "#94A3B8" : "#64748B",
              pointerEvents: "none",
            }}
          />
          <input
            type="search"
            inputMode="search"
            enterKeyHint="search"
            autoCorrect="off"
            spellCheck="false"
            placeholder="Rechercher une rubrique..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: searchPadding,
              border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
              borderRadius: 8,
              background: dark ? "#0F172A" : "#F9FAFB",
              color: dark ? "#F1F5F9" : "#1E293B",
              fontSize: searchFontSize,
              outline: "none",
              boxSizing: "border-box",
              minHeight: 44,
              ...TAP_BASE,
            }}
            aria-label="Rechercher dans l'aide"
          />
          {searchTerm && (
            <Pressable
              onClick={() => setSearchTerm("")}
              focusColor={dark ? "#818CF8" : "#4F46E5"}
              ariaLabel="Effacer la recherche"
              style={{
                position: "absolute",
                right: searchClearRight,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                color: dark ? "#94A3B8" : "#64748B",
                minWidth: 44,
                minHeight: 44,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={18} aria-hidden="true" />
            </Pressable>
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Pressable
            onClick={toggleAllSections}
            focusColor={dark ? "#818CF8" : "#4F46E5"}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: toggleAllButtonPadding,
              background: "transparent",
              border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
              borderRadius: 6,
              color: dark ? "#94A3B8" : "#64748B",
              fontSize: toggleAllButtonFontSize,
              minHeight: 44,
            }}
          >
            {allOpen ? (
              <ChevronsUp size={16} aria-hidden="true" />
            ) : (
              <ChevronsDown size={16} aria-hidden="true" />
            )}
            {allOpen ? "Tout replier" : "Tout déplier"}
          </Pressable>
        </div>
      </div>

      {/* ═══════════ EMPTY STATE ═══════════ */}
      {filteredSections.length === 0 && (
        <p
          role="status"
          aria-live="polite"
          style={{
            textAlign: "center",
            color: S.textMuted,
            padding: 20,
          }}
        >
          Aucune rubrique trouvée.
        </p>
      )}

      {/* ═══════════ LISTE DES SECTIONS ═══════════ */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: isMobile ? 8 : 12,
        }}
      >
        {filteredSections.map((section) => {
          const isOpen = allOpen || openSection === section.id;
          return (
            <div
              key={section.id}
              className="aide-section-enter"
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
                  ...TAP_BASE,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  width: "100%",
                  padding: sectionCardPadding,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: S.text,
                  fontSize: sectionTitleFontSize,
                  fontWeight: 600,
                  textAlign: "left",
                  outline: "none",
                }}
                aria-expanded={isOpen}
                aria-controls={`section-${section.id}`}
              >
                <span style={{ flexShrink: 0 }} aria-hidden="true">
                  {section.icon}
                </span>
                <span style={{ flex: 1 }}>
                  {highlightText(section.title, searchTerm, dark)}
                </span>
                {isOpen ? (
                  <ChevronDown
                    size={isMobile ? 18 : 20}
                    aria-hidden="true"
                    style={{ flexShrink: 0 }}
                  />
                ) : (
                  <ChevronRight
                    size={isMobile ? 18 : 20}
                    aria-hidden="true"
                    style={{ flexShrink: 0 }}
                  />
                )}
              </button>
              <div
                id={`section-${section.id}`}
                role="region"
                aria-labelledby={`section-title-${section.id}`}
                style={{
                  maxHeight: isOpen ? "none" : 0,
                  overflow: "hidden",
                  transition: prefersReducedMotion
                    ? "none"
                    : "max-height 0.3s ease",
                  padding: isOpen
                    ? `0 ${sectionCardPadding} ${sectionCardPadding} ${sectionContentPaddingLeft}`
                    : `0 ${sectionCardPadding} 0 ${sectionContentPaddingLeft}`,
                  lineHeight: 1.8,
                }}
              >
                <div
                  style={{
                    position: "relative",
                    fontSize: sectionContentFontSize,
                  }}
                >
                  {section.content}
                  <Pressable
                    onClick={(e) => {
                      e.stopPropagation();
                      copySectionContent(section);
                    }}
                    focusColor={dark ? "#818CF8" : "#4F46E5"}
                    ariaLabel="Copier le contenu de la rubrique"
                    style={{
                      position: "absolute",
                      top: 0,
                      right: 0,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: dark ? "#94A3B8" : "#64748B",
                      padding: 8,
                      minWidth: 44,
                      minHeight: 44,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Copy size={14} aria-hidden="true" />
                  </Pressable>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ═══════════ SECTION FAQ ═══════════ */}
      <section
        aria-labelledby="faq-title"
        style={{ marginTop: isMobile ? 24 : 40 }}
      >
        <h2
          id="faq-title"
          style={{
            ...S.h3,
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: isMobile ? 18 : 20,
          }}
        >
          <HelpCircle
            size={isMobile ? 18 : 20}
            aria-hidden="true"
          />
          Questions fréquentes
        </h2>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: isMobile ? 6 : 8,
          }}
        >
          {FAQ_ITEMS.map((item, idx) => (
            <div
              key={idx}
              style={{
                background: dark ? "#1E293B" : "#FFFFFF",
                borderRadius: 8,
                padding: faqCardPadding,
                border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
              }}
            >
              <div
                style={{
                  fontWeight: 600,
                  color: dark ? "#F1F5F9" : "#1E293B",
                  marginBottom: 4,
                  fontSize: faqQuestionSize,
                }}
              >
                {item.q}
              </div>
              <div
                style={{
                  color: dark ? "#94A3B8" : "#64748B",
                  fontSize: faqAnswerSize,
                }}
              >
                {item.a}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════ SCROLL TO TOP ═══════════ */}
      {showScrollTop && (
        <Pressable
          onClick={scrollToTop}
          focusColor={dark ? "#818CF8" : "#4F46E5"}
          ariaLabel="Retour en haut de page"
          style={{
            position: "fixed",
            bottom: isMobile
              ? "calc(16px + env(safe-area-inset-bottom, 0px))"
              : 24,
            right: isMobile
              ? "calc(16px + env(safe-area-inset-right, 0px))"
              : 24,
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
            boxShadow: dark
              ? "0 4px 12px rgba(0,0,0,0.5)"
              : "0 4px 12px rgba(79,70,229,0.3)",
            animation: prefersReducedMotion
              ? "none"
              : "aide-fade-in 0.3s ease",
          }}
        >
          <ArrowUp size={20} aria-hidden="true" />
        </Pressable>
      )}
    </div>
  );
}