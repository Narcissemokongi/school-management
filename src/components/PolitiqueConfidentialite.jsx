// src/components/PolitiqueConfidentialite.jsx
import { useState, useRef, useMemo, useEffect } from "react";
import { useStyles } from "../styles/theme";
import { useIsMobile } from "../hooks/useIsMobile";
import { Shield, Search, ArrowUp, List, X } from "lucide-react";

export function PolitiqueConfidentialite() {
  const { S, dark } = useStyles();
  const isMobile = useIsMobile();
  const [searchTerm, setSearchTerm] = useState("");
  const [showScrollTop, setShowScrollTop] = useState(false);
  const topRef = useRef(null);

  // Sections de la politique
  const sections = [
    { id: "introduction", title: "1. Introduction" },
    { id: "responsable", title: "2. Responsable du traitement" },
    { id: "donnees", title: "3. Données collectées" },
    { id: "finalites", title: "4. Finalités du traitement" },
    { id: "base", title: "5. Base légale du traitement" },
    { id: "destinataires", title: "6. Destinataires des données" },
    { id: "conservation", title: "7. Durée de conservation" },
    { id: "securite", title: "8. Sécurité" },
    { id: "droits", title: "9. Droits des utilisateurs" },
    { id: "cookies", title: "10. Cookies et technologies similaires" },
    { id: "modification", title: "11. Modification de la politique" },
    { id: "contact", title: "12. Contact" },
  ];

  // Filtre des sections selon la recherche (sur les titres uniquement)
  const filteredSections = useMemo(() => {
    if (!searchTerm.trim()) return sections;
    const q = searchTerm.toLowerCase();
    return sections.filter((s) => s.title.toLowerCase().includes(q));
  }, [searchTerm, sections]);

  // Gestion du scroll pour afficher le bouton retour en haut
  const handleScroll = () => {
    if (window.scrollY > 200) setShowScrollTop(true);
    else setShowScrollTop(false);
  };

  useEffect(() => {
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
        <Shield size={isMobile ? 24 : 28} /> Politique de confidentialité
      </h1>

      {/* Barre de recherche */}
      <div style={{ position: "relative", marginBottom: isMobile ? 16 : 24 }}>
        <Search size={18} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: dark ? "#94A3B8" : "#64748B" }} />
        <input
          type="search"
          placeholder="Rechercher dans la politique..."
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
          aria-label="Rechercher dans la politique"
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
            <section id="introduction" style={{ marginBottom: 24 }}>
              <h2 style={{ ...S.h3, fontSize: sectionTitleSize }}>1. Introduction</h2>
              <p style={S.muted}>
                La présente politique de confidentialité a pour but d’informer les utilisateurs de
                l’application <strong>School Management</strong> sur la manière dont leurs données personnelles
                sont collectées, traitées et protégées. Nous nous engageons à respecter la confidentialité
                de vos données et à les traiter conformément à l’<strong>Ordonnance-Loi n°23/010 du
                13 mars 2023 portant Code du numérique</strong> en République Démocratique du Congo.
              </p>
            </section>

            <section id="responsable" style={{ marginBottom: 24 }}>
              <h2 style={{ ...S.h3, fontSize: sectionTitleSize }}>2. Responsable du traitement</h2>
              <p style={S.muted}>
                Le responsable du traitement des données est l’établissement scolaire ou l’organisation
                qui utilise l’application School Management. Le sous-traitant technique (fournisseur de la
                plateforme) agit sur instruction du responsable du traitement.
              </p>
            </section>

            <section id="donnees" style={{ marginBottom: 24 }}>
              <h2 style={{ ...S.h3, fontSize: sectionTitleSize }}>3. Données collectées</h2>
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

            <section id="finalites" style={{ marginBottom: 24 }}>
              <h2 style={{ ...S.h3, fontSize: sectionTitleSize }}>4. Finalités du traitement</h2>
              <p style={S.muted}>Les données collectées sont utilisées pour :</p>
              <ul style={S.muted}>
                <li>La gestion administrative et pédagogique des élèves.</li>
                <li>Le suivi disciplinaire et l’information des parents.</li>
                <li>La communication interne entre les membres de l’établissement.</li>
                <li>La gestion financière des frais de scolarité.</li>
                <li>L’amélioration du service et la maintenance technique.</li>
              </ul>
            </section>

            <section id="base" style={{ marginBottom: 24 }}>
              <h2 style={{ ...S.h3, fontSize: sectionTitleSize }}>5. Base légale du traitement</h2>
              <p style={S.muted}>
                Conformément au Code du numérique, le traitement des données est fondé sur
                l’exécution d’une mission d’intérêt public (éducation) confiée au responsable du
                traitement, ainsi que sur l’intérêt légitime de l’établissement à assurer le suivi
                scolaire et disciplinaire des élèves.
              </p>
            </section>

            <section id="destinataires" style={{ marginBottom: 24 }}>
              <h2 style={{ ...S.h3, fontSize: sectionTitleSize }}>6. Destinataires des données</h2>
              <p style={S.muted}>
                Les données sont accessibles aux personnels habilités de l’établissement (direction,
                enseignants, personnel disciplinaire, comptable) selon leur rôle. Les parents ont accès
                aux données de leurs enfants. Les élèves ont accès à leurs propres données.
                Aucune donnée n’est vendue ou cédée à des tiers à des fins commerciales.
              </p>
            </section>

            <section id="conservation" style={{ marginBottom: 24 }}>
              <h2 style={{ ...S.h3, fontSize: sectionTitleSize }}>7. Durée de conservation</h2>
              <p style={S.muted}>
                Les données sont conservées pendant la durée de scolarité de l’élève dans l’établissement,
                puis archivées pendant une durée conforme aux obligations légales applicables aux
                établissements scolaires (généralement 5 ans après la sortie de l’élève).
                Les données de connexion et logs techniques sont conservés 12 mois.
              </p>
            </section>

            <section id="securite" style={{ marginBottom: 24 }}>
              <h2 style={{ ...S.h3, fontSize: sectionTitleSize }}>8. Sécurité</h2>
              <p style={S.muted}>
                Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour
                protéger les données contre tout accès non autorisé, modification, divulgation ou
                destruction. Les données sont chiffrées en transit (HTTPS) et au repos. L’accès à
                l’application est protégé par un système d’authentification par login/mot de passe.
              </p>
            </section>

            <section id="droits" style={{ marginBottom: 24 }}>
              <h2 style={{ ...S.h3, fontSize: sectionTitleSize }}>9. Droits des utilisateurs</h2>
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

            <section id="cookies" style={{ marginBottom: 24 }}>
              <h2 style={{ ...S.h3, fontSize: sectionTitleSize }}>10. Cookies et technologies similaires</h2>
              <p style={S.muted}>
                L’application utilise des cookies techniques strictement nécessaires à son fonctionnement
                (cookie de session pour l’authentification, stockage local pour le thème sombre/clair).
                Aucun cookie publicitaire ou de tracking n’est utilisé. Les appels vidéo via Agora
                peuvent utiliser des technologies de connexion peer-to-peer qui n’impliquent pas de
                stockage de données personnelles sur les serveurs Agora au-delà de la durée de l’appel.
              </p>
            </section>

            <section id="modification" style={{ marginBottom: 24 }}>
              <h2 style={{ ...S.h3, fontSize: sectionTitleSize }}>11. Modification de la politique</h2>
              <p style={S.muted}>
                Nous nous réservons le droit de modifier la présente politique de confidentialité à tout
                moment. Les utilisateurs seront informés de toute modification substantielle par le biais
                d’une notification dans l’application.
              </p>
            </section>

            <section id="contact">
              <h2 style={{ ...S.h3, fontSize: sectionTitleSize }}>12. Contact</h2>
              <p style={S.muted}>
                Pour toute question relative à cette politique de confidentialité ou pour exercer vos
                droits, vous pouvez contacter l’établissement scolaire responsable du traitement,
                ou le fournisseur technique à l’adresse suivante : <strong>narcissemokongi@gmail.com</strong>.
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