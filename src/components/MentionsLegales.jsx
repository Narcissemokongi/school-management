// src/components/MentionsLegales.jsx
import { useStyles } from "../styles/theme";
import { BookOpen } from "lucide-react";

export function MentionsLegales() {
  const { S, dark } = useStyles();

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 20 }}>
      <h1 style={{ ...S.h2, display: "flex", alignItems: "center", gap: 8 }}>
        <BookOpen size={28} /> Mentions légales
      </h1>
      <div style={{ ...S.card, marginTop: 20, fontSize: 15, lineHeight: 1.7 }}>
        <section style={{ marginBottom: 24 }}>
          <h2 style={S.h3}>1. Éditeur du service</h2>
          <p style={S.muted}>
            Le présent site web et l’application associée (« School Management ») sont édités par :
          </p>
          <p>
            <strong>Nom de l’organisme / société</strong> : School Management<br />
            <strong>Forme juridique</strong> : [Société / Établissement / Association à compléter]<br />
            <strong>Adresse</strong> : [Adresse complète en République Démocratique du Congo]<br />
            <strong>Téléphone</strong> : [Numéro de téléphone]<br />
            <strong>Email</strong> : [Email de contact]<br />
            <strong>Directeur de la publication</strong> : [Nom du responsable]
          </p>
        </section>

        <section style={{ marginBottom: 24 }}>
          <h2 style={S.h3}>2. Hébergement</h2>
          <p>
            L’application est hébergée par <strong>Vercel Inc.</strong>, dont le siège social est situé
            340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis.
          </p>
          <p>
            Les données sont stockées et traitées par <strong>Convex</strong>, plateforme de base de données
            temps réel. Les serveurs de Convex sont situés aux États-Unis. Convex met en œuvre des
            mesures techniques et organisationnelles appropriées pour assurer la sécurité des données.
          </p>
          <p>
            Les appels vidéo sont rendus possibles par <strong>Agora.io</strong>, dont les serveurs sont
            répartis dans le monde entier. Agora fournit des garanties de sécurité conformes aux
            normes internationales.
          </p>
        </section>

        <section style={{ marginBottom: 24 }}>
          <h2 style={S.h3}>3. Propriété intellectuelle</h2>
          <p style={S.muted}>
            L’ensemble des éléments constituant le site et l’application (textes, graphismes, logiciel,
            icônes, logos) est protégé par les lois en vigueur en République Démocratique du Congo
            relatives à la propriété intellectuelle. Toute reproduction, modification, publication,
            adaptation de tout ou partie des éléments du site, quel que soit le moyen ou le procédé
            utilisé, est interdite sans autorisation préalable de l’éditeur.
          </p>
          <p style={S.muted}>
            Les icônes utilisées dans l’application proviennent de la bibliothèque
            <strong> Lucide</strong> (licence MIT).
            Les polices de caractères sont fournies par <strong>Google Fonts</strong> (licence SIL Open Font License).
          </p>
        </section>

        <section style={{ marginBottom: 24 }}>
          <h2 style={S.h3}>4. Protection des données personnelles</h2>
          <p style={S.muted}>
            Conformément à l’<strong>Ordonnance-Loi n°23/010 du 13 mars 2023 portant Code du numérique</strong>
            en République Démocratique du Congo, l’utilisateur est informé que les données collectées
            (noms, prénoms, classes, informations de contact, identifiants de connexion, données
            relatives à la discipline scolaire) font l’objet d’un traitement informatique destiné à la
            gestion des établissements scolaires.
          </p>
          <p style={S.muted}>
            Le responsable du traitement est l’école ou l’établissement utilisateur du service.
            Conformément aux dispositions du Code du numérique, l’utilisateur dispose d’un droit
            d’accès, de rectification, d’opposition et de suppression des données le concernant.
            Ces droits peuvent être exercés en contactant l’établissement scolaire.
          </p>
          <p style={S.muted}>
            Toute réclamation relative à la protection des données peut être adressée à
            l’<strong>Autorité de Régulation de la Poste et des Télécommunications du Congo (ARPTC)</strong>,
            autorité compétente en matière de protection des données personnelles en RDC.
          </p>
        </section>

        <section style={{ marginBottom: 24 }}>
          <h2 style={S.h3}>5. Limitations de responsabilité</h2>
          <p style={S.muted}>
            L’éditeur s’efforce de fournir des informations exactes et mises à jour. Toutefois,
            il ne saurait garantir l’exactitude, la complétude ou l’actualité des informations
            diffusées. En aucun cas, l’éditeur ne pourra être tenu responsable des dommages
            directs ou indirects résultant de l’utilisation du service.
          </p>
          <p style={S.muted}>
            L’éditeur se réserve le droit de modifier à tout moment les présentes mentions légales.
            L’utilisateur est invité à les consulter régulièrement.
          </p>
        </section>

        <section style={{ marginBottom: 24 }}>
          <h2 style={S.h3}>6. Loi applicable et juridiction compétente</h2>
          <p style={S.muted}>
            Les présentes mentions légales sont régies par le droit congolais.
            Tout litige relatif à l’utilisation du service sera soumis à la compétence exclusive
            des tribunaux de la République Démocratique du Congo.
          </p>
        </section>

        <section style={{ marginBottom: 24 }}>
          <h2 style={S.h3}>7. Contact</h2>
          <p style={S.muted}>
            Pour toute question relative aux présentes mentions légales ou au service, vous pouvez
            nous contacter par email à l’adresse suivante : <strong>narcissemokongi@gmail.com</strong>.
          </p>
        </section>
      </div>
    </div>
  );
}