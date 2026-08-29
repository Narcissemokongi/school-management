import { Loader, Upload, Download } from "lucide-react";
import { useStyles } from "../../styles/theme";
import * as XLSX from "xlsx";

export function ImportExcel({ fileInputRef, importing, onImport }) {
  const { dark } = useStyles();

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

  return (
    <div style={{
      background: dark ? "#1E293B" : "#FFFFFF",
      borderRadius: 16,
      padding: 24,
      boxShadow: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)",
      marginBottom: 24,
      transition: "background-color 0.3s",
    }}>
      <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12, color: dark ? "#F1F5F9" : "#1E293B" }}>
        Importer depuis Excel
      </h3>
      <input
        type="file"
        accept=".xlsx, .xls"
        ref={fileInputRef}
        onChange={onImport}
        style={{ display: "none" }}
      />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 20px",
            background: importing ? "#A5B4FC" : dark ? "#818CF8" : "#10B981",
            color: "white",
            border: "none",
            borderRadius: 10,
            fontWeight: 600,
            fontSize: 14,
            cursor: importing ? "not-allowed" : "pointer",
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
            gap: 8,
            padding: "10px 20px",
            background: dark ? "#334155" : "#F1F5F9",
            color: dark ? "#F1F5F9" : "#1E293B",
            border: "none",
            borderRadius: 10,
            fontWeight: 600,
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          <Download size={16} />
          Modèle Excel
        </button>
      </div>
      <p style={{ color: dark ? "#94A3B8" : "#64748B", fontSize: 13, marginTop: 8 }}>
        Colonnes : <strong>nom, postnom, prenom, classe, sexe, dateNaissance, lieuNaissance, province, territoire, secteur, village, adresse, telephone, nomPere, nomMere, tuteurNom, tuteurTelephone</strong>
        <br />
        Les colonnes <strong>nom, postnom, classe</strong> sont obligatoires.
      </p>
    </div>
  );
}