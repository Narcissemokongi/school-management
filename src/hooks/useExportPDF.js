// src/hooks/useExportPDF.js
import { useState, useCallback } from "react";
// ✨ jspdf + html2canvas retirés — chargés dynamiquement (gain ~550 KB)

// ════════════════════════════════════════════════════════════════════
// ✨ Lazy loader — charge jspdf + html2canvas UNE SEULE FOIS
// puis met en cache les modules pour les appels suivants
// ════════════════════════════════════════════════════════════════════
let pdfLibsPromise = null;

function loadPdfLibs() {
  if (!pdfLibsPromise) {
    // Charge les 2 libs EN PARALLÈLE (pas de waterfall)
    pdfLibsPromise = Promise.all([
      import("jspdf"),
      import("html2canvas"),
    ]).then(([jspdfMod, html2canvasMod]) => ({
      jsPDF: jspdfMod.jsPDF || jspdfMod.default,
      html2canvas: html2canvasMod.default || html2canvasMod,
    }));
  }
  return pdfLibsPromise;
}

export function useExportPDF() {
  const [isExporting, setIsExporting] = useState(false);

  const exportPDF = useCallback(
    async (elementRef, fileName = "document.pdf") => {
      if (!elementRef?.current) return;
      setIsExporting(true);
      try {
        // ✨ Chargement dynamique (instantané si déjà en cache)
        const { jsPDF, html2canvas } = await loadPdfLibs();

        const canvas = await html2canvas(elementRef.current, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#FFFFFF",
        });
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
        pdf.save(fileName);
      } catch (err) {
        console.error("Erreur export PDF :", err);
        throw err;
      } finally {
        setIsExporting(false);
      }
    },
    []
  );

  return { exportPDF, isExporting };
}