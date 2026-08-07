// src/components/PolitiqueConfidentialite.jsx
import { useStyles } from "../styles/theme";
import { Shield } from "lucide-react";

export function PolitiqueConfidentialite() {
  const { S, dark } = useStyles();

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 20 }}>
      <h1 style={{ ...S.h2, display: "flex", alignItems: "center", gap: 8 }}>
        <Shield size={28} /> Politique de confidentialité
      </h1>
      <div style={{ ...S.card, marginTop: 20, fontSize: 15, lineHeight: 1.7 }}>
        <section style={{ marginBottom: 24 }}>
          <h2 style={S.h3}>1. Introduction</h2>
          <p style={S.muted}>
            La présente politique de confidentialité a pour but d’informer les utilisateurs de
            l’application <strong>School Management</strong> sur la manière dont leurs données personnelles
            sont collectées, traitées et protégées. Nous nous engageons à respecter la confidentialité
            de vos données et à les traiter conformément à l’<strong>Ordonnance-Loi n°23/010 du
            13 mars 2023 portant Code du numérique</strong> en République Démocratique du Congo.
          </p>
        </section>

        <section style={{ marginBottom: 24 }}>
          <h2 style={S.h3}>2. Responsable du traitement</h2>
          <p style={S.muted}>
            Le responsable du traitement des données est l’établissement scolaire ou l’organisation
            qui utilise l’application School Management. Le sous-traitant technique (fournisseur de la
            plateforme) agit sur instruction du responsable du traitement.
          </p>
        </section>

        <section style={{ marginBottom: 24 }}>
          <h2 style={S.h3}>3. Données collectées</h2>
          <p style={S.muted}>Nous collectons les catégories de données suivantes :</p>
          <ul style={S.muted}>
            <li><strong>Données d’identification</strong> : nom, prénom, identifiants de connexion.</li>
            <li><strong>Données scolaires</strong> : classe, notes, absences, retards, emploi du temps.</li>
            <li><strong>Données disciplinaires</strong> : fautes commises, sanctions appliquées.</li>
            <li><strong>Données de communication</strong> : messages internes, journaux d’appels.</li>
            <li><strong>Données financières</strong> : frais de scolarité, montants payés, restes à payer.</li>
            <li><strong>Données techniques</strong> : adresse IP, type de navigateur, logs de connexion.</li>
          </ul>
        </section>

        <section style={{ marginBottom: 24 }}>
          <h2 style={S.h3}>4. Finalités du traitement</h2>
          <p style={S.muted}>Les données collectées sont utilisées pour :</p>
          <ul style={S.muted}>
            <li>La gestion administrative et pédagogique des élèves.</li>
            <li>Le suivi disciplinaire et l’information des parents.</li>
            <li>La communication interne entre les membres de l’établissement.</li>
            <li>La gestion financière des frais de scolarité.</li>
            <li>L’amélioration du service et la maintenance technique.</li>
          </ul>
        </section>

        <section style={{ marginBottom: 24 }}>
          <h2 style={S.h3}>5. Base légale du traitement</h2>
          <p style={S.muted}>
            Conformément au Code du numérique, le traitement des données est fondé sur
            l’exécution d’une mission d’intérêt public (éducation) confiée au responsable du
            traitement, ainsi que sur l’intérêt légitime de l’établissement à assurer le suivi
            scolaire et disciplinaire des élèves.
          </p>
        </section>

        <section style={{ marginBottom: 24 }}>
          <h2 style={S.h3}>6. Destinataires des données</h2>
          <p style={S.muted}>
            Les données sont accessibles aux personnels habilités de l’établissement (direction,
            enseignants, personnel disciplinaire, comptable) selon leur rôle. Les parents ont accès
            aux données de leurs enfants. Les élèves ont accès à leurs propres données.
            Aucune donnée n’est vendue ou cédée à des tiers à des fins commerciales.
          </p>
        </section>

        <section style={{ marginBottom: 24 }}>
          <h2 style={S.h3}>7. Durée de conservation</h2>
          <p style={S.muted}>
            Les données sont conservées pendant la durée de scolarité de l’élève dans l’établissement,
            puis archivées pendant une durée conforme aux obligations légales applicables aux
            établissements scolaires (généralement 5 ans après la sortie de l’élève).
            Les données de connexion et logs techniques sont conservés 12 mois.
          </p>
        </section>

        <section style={{ marginBottom: 24 }}>
          <h2 style={S.h3}>8. Sécurité</h2>
          <p style={S.muted}>
            Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour
            protéger les données contre tout accès non autorisé, modification, divulgation ou
            destruction. Les données sont chiffrées en transit (HTTPS) et au repos. L’accès à
            l’application est protégé par un système d’authentification par login/mot de passe.
          </p>
        </section>

        <section style={{ marginBottom: 24 }}>
          <h2 style={S.h3}>9. Droits des utilisateurs</h2>
          <p style={S.muted}>
            Conformément au Code du numérique de la RDC, vous disposez des droits suivants :
          </p>
          <ul style={S.muted}>
            <li><strong>Droit d’accès</strong> : obtenir la confirmation que vos données sont traitées et en obtenir une copie.</li>
            <li><strong>Droit de rectification</strong> : faire corriger des données inexactes vous concernant.</li>
            <li><strong>Droit à l’effacement</strong> : demander la suppression de vos données dans certaines conditions.</li>
            <li><strong>Droit d’opposition</strong> : vous opposer au traitement de vos données pour des motifs légitimes.</li>
            <li><strong>Droit à la portabilité</strong> : recevoir vos données dans un format structuré et les transmettre à un autre responsable.</li>
          </ul>
          <p style={S.muted}>
            Pour exercer ces droits, veuillez contacter l’établissement scolaire dont vous dépendez.
            Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire une
            réclamation auprès de l’<strong>Autorité de Régulation de la Poste et des Télécommunications
            du Congo (ARPTC)</strong>, autorité compétente en matière de protection des données
            personnelles en RDC.
          </p>
        </section>

        <section style={{ marginBottom: 24 }}>
          <h2 style={S.h3}>10. Cookies et technologies similaires</h2>
          <p style={S.muted}>
            L’application utilise des cookies techniques strictement nécessaires à son fonctionnement
            (cookie de session pour l’authentification, stockage local pour le thème sombre/clair).
            Aucun cookie publicitaire ou de tracking n’est utilisé. Les appels vidéo via Agora
            peuvent utiliser des technologies de connexion peer-to-peer qui n’impliquent pas de
            stockage de données personnelles sur les serveurs Agora au-delà de la durée de l’appel.
          </p>
        </section>

        <section style={{ marginBottom: 24 }}>
          <h2 style={S.h3}>11. Modification de la politique</h2>
          <p style={S.muted}>
            Nous nous réservons le droit de modifier la présente politique de confidentialité à tout
            moment. Les utilisateurs seront informés de toute modification substantielle par le biais
            d’une notification dans l’application.
          </p>
        </section>

        <section>
          <h2 style={S.h3}>12. Contact</h2>
          <p style={S.muted}>
            Pour toute question relative à cette politique de confidentialité ou pour exercer vos
            droits, vous pouvez contacter l’établissement scolaire responsable du traitement,
            ou le fournisseur technique à l’adresse suivante : <strong>narcissemokongi@gmail.com</strong>.
          </p>
        </section>
      </div>
    </div>
  );
}