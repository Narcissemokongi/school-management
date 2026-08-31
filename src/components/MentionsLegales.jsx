// src/components/MentionsLegales.jsx
import { useState, useRef, useMemo, useEffect } from "react";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import { BookOpen, Search, ArrowUp, List, X } from "lucide-react";

export function MentionsLegales() {
  const { S, dark } = useStyles();
  const isMobile = useIsMobile();
  const [searchTerm, setSearchTerm] = useState("");
  const [showScrollTop, setShowScrollTop] = useState(false);
  const topRef = useRef(null);

  // Sections
  const sections = [
    { id: "editeur", title: "1. Éditeur du service" },
    { id: "hebergement", title: "2. Hébergement" },
    { id: "propriete", title: "3. Propriété intellectuelle" },
    { id: "donnees", title: "4. Protection des données personnelles" },
    { id: "responsabilite", title: "5. Limitations de responsabilité" },
    { id: "loi", title: "6. Loi applicable et juridiction compétente" },
    { id: "contact", title: "7. Contact" },
  ];

  // Filtre des sections selon la recherche
  const filteredSections = useMemo(() => {
    if (!searchTerm.trim()) return sections;
    const q = searchTerm.toLowerCase();
    return sections.filter((s) => s.title.toLowerCase().includes(q));
  }, [searchTerm, sections]);

  // Scroll listener
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 200) setShowScrollTop(true);
      else setShowScrollTop(false);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Styles adaptatifs
  const containerPadding = isMobile ? "16px 12px" : 20;
  const titleSize = isMobile ? 22 : 28;
  const searchPadding = isMobile ? "12px 14px 12px 40px" : "10px 14px 10px 40px";
  const searchFontSize = isMobile ? 16 : 14;
  const tocPadding = isMobile ? 14 : 16;
  const tocTitleSize = isMobile ? 16 : 18;
  const tocLinkFontSize = isMobile ? 15 : 14;
  const contentPadding = isMobile ? 14 : 20;
  const contentFontSize = isMobile ? 14 : 15;
  const sectionTitleSize = isMobile ? 17 : 18;
  const backToTopSize = isMobile ? 44 : 44;
  const backToTopIconSize = isMobile ? 20 : 20;
  const backToTopBottom = isMobile ? 16 : 24;
  const backToTopRight = isMobile ? 16 : 24;

  return (
    <div ref={topRef} style={{ maxWidth: 900, margin: "0 auto", padding: containerPadding }}>
      <h1 style={{ ...S.h2, display: "flex", alignItems: "center", gap: 8, fontSize: titleSize }}>
        <BookOpen size={isMobile ? 24 : 28} /> Mentions légales
      </h1>

      {/* Barre de recherche */}
      <div style={{ position: "relative", marginBottom: isMobile ? 16 : 24 }}>
        <Search size={18} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: dark ? "#94A3B8" : "#64748B" }} />
        <input
          type="search"
          placeholder="Rechercher dans les mentions..."
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
          }}
          aria-label="Rechercher dans les mentions légales"
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

      {/* Table des matières */}
      <div style={{ ...S.card, padding: tocPadding, marginBottom: isMobile ? 16 : 24 }}>
        <h2 style={{ ...S.h3, display: "flex", alignItems: "center", gap: 8, fontSize: tocTitleSize }}>
          <List size={isMobile ? 16 : 18} /> Table des matières
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {filteredSections.map((section) => (
            <button
              key={section.id}
              onClick={() => scrollToSection(section.id)}
              style={{
                background: "none",
                border: "none",
                textAlign: "left",
                cursor: "pointer",
                color: dark ? "#818CF8" : "#4F46E5",
                fontWeight: 500,
                fontSize: tocLinkFontSize,
                padding: isMobile ? "6px 0" : "2px 0",
                transition: "color 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
              onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
            >
              {section.title}
            </button>
          ))}
        </div>
      </div>

      {/* Contenu principal */}
      <div style={{ ...S.card, marginTop: 20, fontSize: contentFontSize, lineHeight: 1.7, padding: contentPadding }}>
        {filteredSections.length === 0 ? (
          <p style={S.muted}>Aucune section trouvée.</p>
        ) : (
          <>
            <section id="editeur" style={{ marginBottom: 24 }}>
              <h2 style={{ ...S.h3, fontSize: sectionTitleSize }}>1. Éditeur du service</h2>
              <p style={S.muted}>
                Le présent site web et l’application associée (« School Management ») sont édités par :
              </p>
              <p>
                <strong>Nom de l’organisme / société</strong> : School Management<br />
                <strong>Forme juridique</strong> : ASBL <br />
                <strong>Adresse</strong> : [Adresse complète en République Démocratique du Congo]<br />
                <strong>Téléphone</strong> : +243 890169098/81 <br />
                <strong>Email</strong> : narcissemokongi@gmail.com<br />
                <strong>Directeur de la publication</strong> : Brillante KAYOWA
              </p>
            </section>

            <section id="hebergement" style={{ marginBottom: 24 }}>
              <h2 style={{ ...S.h3, fontSize: sectionTitleSize }}>2. Hébergement</h2>
              <p style={S.muted}>
                L’application est hébergée par <strong>Vercel Inc.</strong>, dont le siège social est situé
                340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis.
              </p>
              <p style={S.muted}>
                Les données sont stockées et traitées par <strong>Convex</strong>, plateforme de base de données
                temps réel. Les serveurs de Convex sont situés aux États-Unis. Convex met en œuvre des
                mesures techniques et organisationnelles appropriées pour assurer la sécurité des données.
              </p>
              <p style={S.muted}>
                Les appels vidéo sont rendus possibles par <strong>Agora.io</strong>, dont les serveurs sont
                répartis dans le monde entier. Agora fournit des garanties de sécurité conformes aux
                normes internationales.
              </p>
            </section>

            <section id="propriete" style={{ marginBottom: 24 }}>
              <h2 style={{ ...S.h3, fontSize: sectionTitleSize }}>3. Propriété intellectuelle</h2>
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

            <section id="donnees" style={{ marginBottom: 24 }}>
              <h2 style={{ ...S.h3, fontSize: sectionTitleSize }}>4. Protection des données personnelles</h2>
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

            <section id="responsabilite" style={{ marginBottom: 24 }}>
              <h2 style={{ ...S.h3, fontSize: sectionTitleSize }}>5. Limitations de responsabilité</h2>
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

            <section id="loi" style={{ marginBottom: 24 }}>
              <h2 style={{ ...S.h3, fontSize: sectionTitleSize }}>6. Loi applicable et juridiction compétente</h2>
              <p style={S.muted}>
                Les présentes mentions légales sont régies par le droit congolais.
                Tout litige relatif à l’utilisation du service sera soumis à la compétence exclusive
                des tribunaux de la République Démocratique du Congo.
              </p>
            </section>

            <section id="contact" style={{ marginBottom: 24 }}>
              <h2 style={{ ...S.h3, fontSize: sectionTitleSize }}>7. Contact</h2>
              <p style={S.muted}>
                Pour toute question relative aux présentes mentions légales ou au service, vous pouvez
                nous contacter par email à l’adresse suivante : <strong>narcissemokongi@gmail.com</strong>.
              </p>
            </section>
          </>
        )}
      </div>

      {/* Bouton retour en haut */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          style={{
            position: "fixed",
            bottom: backToTopBottom,
            right: backToTopRight,
            zIndex: 1000,
            width: backToTopSize,
            height: backToTopSize,
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
          <ArrowUp size={backToTopIconSize} />
        </button>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}