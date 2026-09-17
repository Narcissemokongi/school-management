// src/components/ImportExcel.jsx
import { useCallback } from "react";
import { Loader, Upload, Download } from "lucide-react";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";

export function ImportExcel({ fileInputRef, importing, onImport }) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();

  // ✅ FIX #1 — XLSX lazy : importé uniquement au clic
  const handleDownloadTemplate = useCallback(async () => {
    // ✅ FIX #6 — accept nettoyé aussi (voir plus bas)
    const data = [
      [
        "nom", "postnom", "prenom", "classe", "sexe", "dateNaissance",
        "lieuNaissance", "province", "territoire", "secteur", "village",
        "adresse", "telephone", "nomPere", "nomMere", "tuteurNom", "tuteurTelephone"
      ],
      [
        "MOKONGI", "MIZONGOLA", "Naomie", "6ème A", "F", "2010-05-12",
        "Kinshasa", "Kinshasa", "", "Lemba", "Salongo",
        "12, Av. de la Paix", "+243 812345678", "Jean MOKONGI", "Marie MIZONGOLA",
        "Paul TUTEUR", "+243 998877665"
      ],
      [
        "KAYOWA", "NTUMBA", "Brillante", "5ème B", "F", "2011-03-20",
        "Matadi", "Kongo Central", "Matadi", "Lukula", "Village Kinkanda",
        "45, Rue du Fleuve", "+243 899112233", "Pierre KAYOWA", "Claire NTUMBA",
        "", ""
      ],
    ];

    try {
      // ✅ FIX #1 — chargement à la demande
      const XLSX = await import("xlsx");
      const worksheet = XLSX.utils.aoa_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Modèle");
      XLSX.writeFile(workbook, "modele_import_eleves_complet.xlsx");
    } catch (err) {
      console.error("Erreur génération modèle Excel :", err);
    }
  }, []);

  // ✅ FIX #4 — guard fileInputRef
  const handleFileClick = useCallback(() => {
    fileInputRef?.current?.click();
  }, [fileInputRef]);

  // ✅ FIX #5 — guard onImport
  const handleFileChange = useCallback((e) => {
    if (typeof onImport === "function") onImport(e);
  }, [onImport]);

  const cardPadding = isMobile ? 16 : 24;
  const titleSize = isMobile ? 16 : 18;
  const titleMarginBottom = isMobile ? 8 : 12;
  const buttonsFlexDirection = isMobile ? "column" : "row";
  const buttonPadding = isMobile ? "12px 16px" : "10px 20px";
  const buttonFontSize = isMobile ? 16 : 14;
  const buttonWidth = isMobile ? "100%" : "auto";
  const textFontSize = 13;
  const textMarginTop = isMobile ? 6 : 8;

  return (
    <div style={{
      background: dark ? "#1E293B" : "#FFFFFF",
      borderRadius: 16,
      padding: cardPadding,
      boxShadow: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)",
      marginBottom: 24,
      transition: "background-color 0.3s",
    }}>
      <h3 style={{ fontSize: titleSize, fontWeight: 600, marginBottom: titleMarginBottom, color: dark ? "#F1F5F9" : "#1E293B" }}>
        Importer depuis Excel
      </h3>

      <input
        type="file"
        // ✅ FIX #6 — accept nettoyé
        accept=".xlsx,.xls"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: "none" }}
        aria-label="Fichier Excel à importer"   // ✅ FIX #8
      />

      {/* ✅ FIX #9 — gap: 8 (au lieu de isMobile ? 8 : 8) */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", flexDirection: buttonsFlexDirection }}>
        <button
          type="button"                       // ✅ FIX #3
          onClick={handleFileClick}
          disabled={importing}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: buttonPadding,
            background: importing ? "#A5B4FC" : dark ? "#818CF8" : "#10B981",
            color: "white",
            border: "none",
            borderRadius: 10,
            fontWeight: 600,
            fontSize: buttonFontSize,
            cursor: importing ? "not-allowed" : "pointer",
            width: buttonWidth,
          }}
        >
          {/* ✅ FIX #2 — keyframe ie-spin scopé */}
          {importing
            ? <Loader size={16} style={{ animation: "ie-spin 0.8s linear infinite" }} />
            : <Upload size={16} />}
          {importing ? "Import en cours..." : "Importer depuis Excel"}
        </button>
        <button
          type="button"
          onClick={handleDownloadTemplate}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: buttonPadding,
            background: dark ? "#334155" : "#F1F5F9",
            color: dark ? "#F1F5F9" : "#1E293B",
            border: "none",
            borderRadius: 10,
            fontWeight: 600,
            fontSize: buttonFontSize,
            cursor: "pointer",
            width: buttonWidth,
          }}
        >
          <Download size={16} />
          Modèle Excel
        </button>
      </div>

      <p style={{ color: dark ? "#94A3B8" : "#64748B", fontSize: textFontSize, marginTop: textMarginTop }}>
        Colonnes : <strong>nom, postnom, prenom, classe, sexe, dateNaissance, lieuNaissance, province, territoire, secteur, village, adresse, telephone, nomPere, nomMere, tuteurNom, tuteurTelephone</strong>
        <br />
        Les colonnes <strong>nom, postnom, classe</strong> sont obligatoires.
      </p>

      {/* ✅ FIX #2 + #10 */}
      <style>{`
        @keyframes ie-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          button svg[style*="ie-spin"] { animation: none !important; }
        }
      `}</style>
    </div>
  );
} 