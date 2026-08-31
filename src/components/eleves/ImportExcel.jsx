import { Loader, Upload, Download } from "lucide-react";
import { useStyles } from "../../styles/theme";
import { useIsMobile } from "../../hooks/useIsMobile"; // <-- Import du hook
import * as XLSX from "xlsx";

export function ImportExcel({ fileInputRef, importing, onImport }) {
  const { dark } = useStyles();
  const isMobile = useIsMobile(); // Détection mobile

  const handleDownloadTemplate = () => {
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
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Modèle");
    XLSX.writeFile(workbook, "modele_import_eleves_complet.xlsx");
  };

  // Styles adaptatifs
  const cardPadding = isMobile ? 16 : 24;
  const titleSize = isMobile ? 16 : 18;
  const titleMarginBottom = isMobile ? 8 : 12;
  const buttonsFlexDirection = isMobile ? "column" : "row";
  const buttonPadding = isMobile ? "12px 16px" : "10px 20px";
  const buttonFontSize = isMobile ? 16 : 14;
  const buttonWidth = isMobile ? "100%" : "auto";
  const textFontSize = isMobile ? 13 : 13;
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
        accept=".xlsx, .xls"
        ref={fileInputRef}
        onChange={onImport}
        style={{ display: "none" }}
      />
      <div style={{ display: "flex", gap: isMobile ? 8 : 8, flexWrap: "wrap", flexDirection: buttonsFlexDirection }}>
        <button
          onClick={() => fileInputRef.current?.click()}
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
          {importing ? <Loader size={16} className="animate-spin" /> : <Upload size={16} />}
          {importing ? "Import en cours..." : "Importer depuis Excel"}
        </button>
        <button
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
    </div>
  );
}