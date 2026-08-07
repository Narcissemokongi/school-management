// src/components/Aide.jsx
import { useState } from "react";
import { useStyles } from "../styles/theme";
import {
  HelpCircle, Users, AlertTriangle, MessageCircle, Phone,
  Settings, User, ChevronDown, ChevronRight, BookOpen, DollarSign
} from "lucide-react";

export function Aide() {
  const { S } = useStyles();
  const [openSection, setOpenSection] = useState(null);

  const toggleSection = (id) => {
    setOpenSection(openSection === id ? null : id);
  };

  const sections = [
    {
      id: "roles",
      icon: <Users size={20} />,
      title: "1. Rôles et permissions",
      content: (
        <div>
          <p style={S.muted}>L'application School Management gère 7 rôles distincts :</p>
          <ul style={{ ...S.muted, paddingLeft: 20 }}>
            <li><strong>Super Admin</strong> : crée et gère plusieurs écoles. N'a pas accès aux données des écoles.</li>
            <li><strong>Administrateur</strong> : gère tout dans son école (élèves, classes, fautes, utilisateurs, frais, paramètres).</li>
            <li><strong>Directeur</strong> : consulte les élèves, les classes, les statistiques disciplinaires. Peut envoyer des messages et passer des appels.</li>
            <li><strong>Disciplinaire</strong> : saisit les punitions, suit l'historique, gère les absences/retards.</li>
            <li><strong>Enseignant</strong> : saisit les notes, les absences, consulte son emploi du temps.</li>
            <li><strong>Parent</strong> : voit les informations de ses enfants (notes, absences, punitions, frais).</li>
            <li><strong>Élève</strong> : consulte ses notes, absences, emploi du temps.</li>
            <li><strong>Comptable</strong> : gère les frais de scolarité (paiements, soldes).</li>
          </ul>
        </div>
      ),
    },
    {
      id: "eleves",
      icon: <BookOpen size={20} />,
      title: "2. Gestion des élèves",
      content: (
        <div>
          <p style={S.muted}>Pour ajouter un élève :</p>
          <ol style={{ ...S.muted, paddingLeft: 20 }}>
            <li>Allez dans l'onglet <strong>Scolarité</strong> (admin) ou <strong>Élèves</strong> (directeur).</li>
            <li>Remplissez le nom, le post-nom et choisissez une classe.</li>
            <li>Optionnellement, associez un parent existant ou créez-en un nouveau.</li>
            <li>Cliquez sur <strong>Ajouter l'élève</strong>.</li>
          </ol>
          <p style={S.muted}>Vous pouvez également importer une liste d'élèves depuis un fichier Excel (colonnes : nom, postnom, classe).</p>
        </div>
      ),
    },
    {
      id: "punitions",
      icon: <AlertTriangle size={20} />,
      title: "3. Saisie des punitions",
      content: (
        <div>
          <p style={S.muted}>Pour enregistrer une punition :</p>
          <ol style={{ ...S.muted, paddingLeft: 20 }}>
            <li>Accédez à l'onglet <strong>Saisir une punition</strong> (rôle disciplinaire).</li>
            <li>Recherchez l'élève concerné par son nom.</li>
            <li>Sélectionnez le type de faute (Légère, Moyenne, Grave).</li>
            <li>Choisissez la sanction correspondante.</li>
            <li>Ajoutez éventuellement un commentaire.</li>
            <li>Cliquez sur <strong>Enregistrer la punition</strong>.</li>
          </ol>
          <p style={S.muted}>En cas de faute grave, le parent de l'élève reçoit une notification.</p>
        </div>
      ),
    },
    {
      id: "messages",
      icon: <MessageCircle size={20} />,
      title: "4. Messagerie",
      content: (
        <div>
          <p style={S.muted}>La messagerie fonctionne comme un chat instantané :</p>
          <ol style={{ ...S.muted, paddingLeft: 20 }}>
            <li>Allez dans l'onglet <strong>Messages</strong>.</li>
            <li>À gauche, sélectionnez une conversation existante ou cliquez sur <strong>+ Nouveau</strong> pour démarrer une nouvelle discussion.</li>
            <li>Écrivez votre message dans le champ en bas.</li>
            <li>Vous pouvez joindre un fichier (📎) ou ajouter un lien.</li>
            <li>Appuyez sur <strong>Envoyer</strong> (ou Entrée).</li>
          </ol>
          <p style={S.muted}>Les nouveaux messages déclenchent une notification.</p>
        </div>
      ),
    },
    {
      id: "appels",
      icon: <Phone size={20} />,
      title: "5. Appels vidéo",
      content: (
        <div>
          <p style={S.muted}>Pour passer un appel vidéo :</p>
          <ol style={{ ...S.muted, paddingLeft: 20 }}>
            <li>Allez dans l'onglet <strong>Appels</strong>.</li>
            <li>Cliquez sur <strong>Appeler</strong> à côté du contact souhaité.</li>
            <li>Une fenêtre "Appel en cours" s'affiche avec un compte à rebours de 60 secondes.</li>
            <li>Le destinataire reçoit une notification "Appel entrant".</li>
            <li>Il peut <strong>Accepter</strong> ou <strong>Refuser</strong> l'appel.</li>
            <li>Pendant l'appel, vous pouvez couper le micro, la caméra ou partager votre écran.</li>
            <li>L'appel se termine automatiquement après 60 minutes.</li>
          </ol>
          <p style={S.muted}>Si l'appelé ne répond pas dans les 60 secondes, l'appel est automatiquement annulé.</p>
        </div>
      ),
    },
    {
      id: "frais",
      icon: <DollarSign size={20} />,
      title: "6. Gestion des frais",
      content: (
        <div>
          <p style={S.muted}>Pour gérer les frais de scolarité :</p>
          <ol style={{ ...S.muted, paddingLeft: 20 }}>
            <li>Allez dans l'onglet <strong>Finance</strong> (admin ou comptable).</li>
            <li>Choisissez un élève et saisissez le montant total et le montant payé.</li>
            <li>Le reste à payer est calculé automatiquement.</li>
            <li>Vous pouvez aussi appliquer des frais à un groupe d'élèves (mode <strong>Groupé</strong>).</li>
          </ol>
        </div>
      ),
    },
    {
      id: "compte",
      icon: <User size={20} />,
      title: "7. Profil et mot de passe",
      content: (
        <div>
          <p style={S.muted}>Pour changer votre mot de passe :</p>
          <ol style={{ ...S.muted, paddingLeft: 20 }}>
            <li>Cliquez sur l'onglet <strong>Profil</strong> (ou <strong>Paramètres → Profil</strong> pour l'admin).</li>
            <li>Saisissez votre ancien mot de passe, puis le nouveau (2 fois).</li>
            <li>Cliquez sur <strong>Enregistrer</strong>.</li>
          </ol>
        </div>
      ),
    },
    {
      id: "divers",
      icon: <Settings size={20} />,
      title: "8. Mode sombre et déconnexion",
      content: (
        <div>
          <p style={S.muted}>En bas de la barre latérale :</p>
          <ul style={{ ...S.muted, paddingLeft: 20 }}>
            <li>Cliquez sur <strong>☀️/🌙</strong> pour basculer entre le mode clair et le mode sombre.</li>
            <li>Cliquez sur <strong>Déconnexion</strong> pour quitter votre session.</li>
          </ul>
        </div>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 20 }}>
      <h1 style={{ ...S.h2, display: "flex", alignItems: "center", gap: 8 }}>
        <HelpCircle size={28} /> Aide
      </h1>
      <p style={{ ...S.muted, marginBottom: 24 }}>
        Bienvenue dans l'aide d'EduSphere. Cliquez sur une section pour en savoir plus.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {sections.map((section) => (
          <div key={section.id} style={S.card}>
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
              }}
              aria-expanded={openSection === section.id}
              aria-controls={`section-${section.id}`}
            >
              {section.icon}
              <span style={{ flex: 1 }}>{section.title}</span>
              {openSection === section.id ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            </button>
            {openSection === section.id && (
              <div
                id={`section-${section.id}`}
                style={{ padding: "0 16px 16px 48px", lineHeight: 1.8 }}
              >
                {section.content}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}