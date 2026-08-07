import { useState, useCallback } from "react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

export function useExportPDF() {
  const [isExporting, setIsExporting] = useState(false);

  const exportPDF = useCallback(async (elementRef, fileName = "document.pdf") => {
    if (!elementRef?.current) return;
    setIsExporting(true);
    try {
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
  }, []);

  return { exportPDF, isExporting };
}