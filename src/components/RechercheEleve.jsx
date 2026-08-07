import { useState, useRef } from "react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { useStyles } from "../styles/theme";
import { getFaute } from "../utils";

export function RechercheEleve({ punitions, eleves, fautes }) {
  const { S } = useStyles();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const ficheRef = useRef(null);

  const filtered = search.length > 1
    ? eleves.filter((e) => `${e.nom} ${e.postnom}`.toLowerCase().includes(search.toLowerCase()))
    : [];

  const eleveP = selected
    ? punitions.filter((p) => p.idEleve === selected._id)
        .sort((a, b) => new Date(b.date) - new Date(a.date))
    : [];

  const hasGrave = eleveP.some(
    (p) => getFaute(fautes, p.idFaute)?.gravite === "Grave"
  );

  const handleExportPDF = async () => {
    if (!ficheRef.current) return;
    setGeneratingPDF(true);
    try {
      const canvas = await html2canvas(ficheRef.current, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 10;
      pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - 20;
      while (heightLeft > 0) {
        position = 10 - (imgHeight - pageHeight + 10);
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight - 20;
      }
      pdf.save(`Fiche_Conduite_${selected.nom}_${selected.postnom}.pdf`);
    } catch (err) {
      alert("Erreur lors de la génération du PDF : " + err.message);
    } finally {
      setGeneratingPDF(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={S.h2}>Dossier élève</div>
        <div style={S.muted}>Recherchez un élève puis exportez sa fiche de conduite.</div>
      </div>

      <input
        style={S.input}
        placeholder="🔍 Rechercher un élève..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setSelected(null);
        }}
      />

      {filtered.map((e) => (
        <div
          key={e._id}
          onClick={() => { setSelected(e); setSearch(`${e.nom} ${e.postnom}`); }}
          style={{
            ...S.card,
            cursor: "pointer",
            border: `1px solid ${selected?._id === e._id ? "#4f46e5" : S.cardBorder}`,
          }}
        >
          <div style={S.between}>
            <div style={S.h3}>{e.nom} {e.postnom}</div>
            <span style={S.badge("#4f46e5")}>
              {punitions.filter((p) => p.idEleve === e._id).length} faute(s)
            </span>
          </div>
          <div style={S.muted}>Classe {e.classe}</div>
        </div>
      ))}

      {selected && (
        <>
          <div
            ref={ficheRef}
            style={{
              ...S.card,
              marginTop: 16,
              border: `1px solid ${"#4f46e5"}20`,
              background: "#fff",
            }}
          >
            <div style={{ textAlign: "center", marginBottom: 16, paddingBottom: 14, borderBottom: `1px solid ${S.cardBorder}` }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#1e293b" }}>FICHE DE CONDUITE</div>
              <div style={{ fontSize: 12, color: S.textMuted }}>Conseil de discipline — {new Date().getFullYear()}</div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: S.textMuted, textTransform: "uppercase" }}>Élève</div>
              <div style={{ fontWeight: 700 }}>{selected.nom} {selected.postnom}</div>
              <div style={{ fontSize: 13, color: S.textMuted }}>Classe : {selected.classe}</div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: S.textMuted, textTransform: "uppercase", marginBottom: 6 }}>Récapitulatif</div>
              <div style={S.between}><span>Total fautes</span><span style={{ fontWeight: 700 }}>{eleveP.length}</span></div>
              <div style={S.between}><span>Fautes graves</span><span style={{ fontWeight: 700, color: "#ef4444" }}>{eleveP.filter(p => getFaute(fautes, p.idFaute)?.gravite === "Grave").length}</span></div>
            </div>
            {eleveP.slice(0, 3).map((p, i) => {
              const faute = getFaute(fautes, p.idFaute);
              return (
                <div key={i} style={{ fontSize: 12, color: S.textDim, padding: "6px 0", borderTop: `1px solid ${S.cardBorder}` }}>
                  {p.date} — {faute?.libelle} ({faute?.gravite}) → {p.sanction}
                </div>
              );
            })}
            {eleveP.length > 3 && <div style={{ fontSize: 12, color: S.textMuted }}>... et {eleveP.length - 3} autre(s)</div>}
            {hasGrave && (
              <div style={{ ...S.badge("#ef4444"), marginTop: 10 }}>
                ⚠️ Recommandé pour conseil de discipline
              </div>
            )}
          </div>

          <div style={{ marginTop: 16 }}>
            <button
              style={{ ...S.btn("#4f46e5"), marginBottom: 12 }}
              onClick={handleExportPDF}
              disabled={generatingPDF}
            >
              {generatingPDF ? "⏳ Génération..." : "📄 Exporter la fiche de conduite"}
            </button>

            <h3 style={S.h3}>📋 Historique complet</h3>
            {eleveP.map((p) => {
              const faute = getFaute(fautes, p.idFaute);
              return (
                <div key={p._id} style={S.card}>
                  <div style={S.between}>
                    <div style={{ fontWeight: 600 }}>{faute?.libelle}</div>
                    <span style={S.badge(faute?.gravite === "Grave" ? "#ef4444" : "#f59e0b")}>{faute?.gravite}</span>
                  </div>
                  <div style={{ ...S.muted, margin: "4px 0" }}>{p.date} • {p.disciplinaire}</div>
                  <div style={{ fontSize: 13, color: S.textDim }}>⚖️ {p.sanction}</div>
                  {p.commentaire && <div style={{ fontSize: 12, color: S.textMuted, marginTop: 4, fontStyle: "italic" }}>"{p.commentaire}"</div>}
                </div>
              );
            })}
            {eleveP.length === 0 && <p style={S.muted}>Aucun antécédent</p>}
          </div>
        </>
      )}
    </div>
  );
}