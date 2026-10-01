// src/components/SuperAdmin/ecole/ExportRgpdButton.jsx
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useTokens } from "@/theme/tokens";
import { useIsMobile } from "@/hooks/useIsMobile";
import { Button } from "@/components/ui";
import toast from "react-hot-toast";
import { Download, Loader } from "lucide-react";

export function ExportRgpdButton({ userId, ecoleId, ecoleNom }) {
  const t = useTokens();
  const isMobile = useIsMobile();
  const [exporting, setExporting] = useState(false);

  // Charge les données SEULEMENT quand exporting = true
  const data = useQuery(
    api.ecoles.exportEcoleData,
    exporting ? { userId, ecoleId } : "skip"
  );

  const handleExport = () => {
    setExporting(true);
  };

  // Trigger le download quand data est prête
  if (exporting && data !== undefined) {
    try {
      // Charger JSZip dynamiquement
      import("jszip").then((JSZipModule) => {
        const JSZip = JSZipModule.default;
        const zip = new JSZip();

        // Métadonnées
        zip.file("metadata.json", JSON.stringify(data.metadata, null, 2));
        zip.file("ecole.json", JSON.stringify(data.ecole, null, 2));
        zip.file("README.txt", buildReadme(data));

        // Fichiers de données
        zip.file("users.json", JSON.stringify(data.users, null, 2));
        zip.file("eleves.json", JSON.stringify(data.eleves, null, 2));
        zip.file("classes.json", JSON.stringify(data.classes, null, 2));
        zip.file("anneesScolaires.json", JSON.stringify(data.anneesScolaires, null, 2));
        zip.file("notes.json", JSON.stringify(data.notes, null, 2));
        zip.file("absences.json", JSON.stringify(data.absences, null, 2));
        zip.file("punitions.json", JSON.stringify(data.punitions, null, 2));
        zip.file("fautes.json", JSON.stringify(data.fautes, null, 2));
        zip.file("sanctions.json", JSON.stringify(data.sanctions, null, 2));
        zip.file("frais.json", JSON.stringify(data.frais, null, 2));
        zip.file("fraisClasses.json", JSON.stringify(data.fraisClasses, null, 2));
        zip.file("cours.json", JSON.stringify(data.cours, null, 2));
        zip.file("examens.json", JSON.stringify(data.examens, null, 2));
        zip.file("emploiDuTemps.json", JSON.stringify(data.emploiDuTemps, null, 2));
        zip.file("messages.json", JSON.stringify(data.messages, null, 2));
        zip.file("abonnements.json", JSON.stringify(data.abonnements, null, 2));
        zip.file(
          "paiementsAbonnement.json",
          JSON.stringify(data.paiementsAbonnement, null, 2)
        );
        zip.file("audit.json", JSON.stringify(data.audit, null, 2));
        zip.file("ecoleNotes.json", JSON.stringify(data.ecoleNotes, null, 2));
        zip.file("counts.json", JSON.stringify(data.counts, null, 2));

        // Générer le ZIP
        return zip.generateAsync({ type: "blob" });
      }).then((blob) => {
        const dateStr = new Date().toISOString().slice(0, 10);
        const filename = `rgpd_${slugify(ecoleNom)}_${dateStr}.zip`;

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 100);

        toast.success(`Export RGPD généré (${filename})`);
        setExporting(false);
      });
    } catch (err) {
      console.error("[export rgpd] error:", err);
      toast.error("Erreur lors de la génération du ZIP");
      setExporting(false);
    }
  }

  return (
    <Button
      icon={exporting ? <Loader size={16} className="spin" /> : <Download size={16} />}
      onClick={handleExport}
      disabled={exporting}
      variant="secondary"
    >
      {isMobile ? "RGPD" : exporting ? "Export…" : "Export RGPD"}
    </Button>
  );
}

// ════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════

function slugify(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 40);
}

function buildReadme(data) {
  return `EXPORT RGPD — École "${data.metadata.ecoleName}"
========================================================

Date d'export : ${data.metadata.exportDate}
Code école : ${data.metadata.ecoleCode}
Version : ${data.metadata.version}

📋 Contenu de l'archive
--------------------------------------------------------

Ce fichier ZIP contient l'INTÉGRALITÉ des données
de l'école "${data.metadata.ecoleName}" au format JSON.

Fichiers :
${Object.entries(data.counts)
  .map(([k, v]) => `  - ${k}.json (${v} enregistrement${v > 1 ? "s" : ""})`)
  .join("\n")}

📊 Statistiques
--------------------------------------------------------
${Object.entries(data.counts)
  .map(([k, v]) => `  ${k.padEnd(20)} : ${v}`)
  .join("\n")}

⚖️ Conformité RGPD
--------------------------------------------------------

Cet export respecte le Règlement Général sur la
Protection des Données (RGPD - UE 2016/679).

Les mots de passe et données d'authentification
sont EXCLUS de cet export.

🔒 Confidentialité
--------------------------------------------------------

Ce fichier contient des données personnelles.
Il doit être stocké de manière sécurisée et ne
peut être transmis qu'aux personnes autorisées.

Généré automatiquement par School Management.
`;
}

export default ExportRgpdButton;