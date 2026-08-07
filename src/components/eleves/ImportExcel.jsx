import { Loader } from "lucide-react";

export function ImportExcel({ fileInputRef, importing, onImport }) {
  return (
    <div style={{ background: "#FFF", borderRadius: 16, padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.05)", marginBottom: 24 }}>
      <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Importer depuis Excel</h3>
      <input
        type="file"
        accept=".xlsx, .xls"
        ref={fileInputRef}
        onChange={onImport}
        style={{ display: "none" }}
      />
      <button
        onClick={() => fileInputRef.current.click()}
        disabled={importing}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 20px",
          background: importing ? "#A5B4FC" : "#10B981",
          color: "white",
          border: "none",
          borderRadius: 10,
          fontWeight: 600,
          fontSize: 14,
          cursor: importing ? "not-allowed" : "pointer",
        }}
      >
        {importing ? <Loader size={16} className="animate-spin" /> : "📂"}
        {importing ? "Import en cours..." : "Importer depuis Excel"}
      </button>
      <p style={{ color: "#94A3B8", fontSize: 13, marginTop: 8 }}>
        Colonnes : <strong>nom, postnom, classe</strong>
      </p>
    </div>
  );
}