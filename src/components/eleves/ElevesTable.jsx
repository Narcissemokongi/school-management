// src/components/ElevesTable.jsx
import { useMemo, useCallback } from "react";
import { DataTable } from "../DataTable";
import { Pencil, UserCheck, Trash2, Copy, Eye } from "lucide-react";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import toast from "react-hot-toast";
import { trierClasses } from "@/utils/sort";

// ✅ FIX #3 — statutConfig sorti du composant (constant)
const STATUT_CONFIG = {
  inscrit:    { label: "Inscrit",    lightBg: "#EEF2FF", lightColor: "#4F46E5", darkBg: "#1E293B", darkColor: "#A5B4FC" },
  passant:    { label: "Passant",    lightBg: "#D1FAE5", lightColor: "#065F46", darkBg: "#064E3B", darkColor: "#34D399" },
  redoublant: { label: "Redoublant", lightBg: "#FEF3C7", lightColor: "#92400E", darkBg: "#78350F", darkColor: "#FBBF24" },
  transfere:  { label: "Transféré",  lightBg: "#E2E8F0", lightColor: "#475569", darkBg: "#334155", darkColor: "#CBD5E1" },
  exclu:      { label: "Exclu",      lightBg: "#FEE2E2", lightColor: "#B91C1C", darkBg: "#7F1D1D", darkColor: "#F87171" },
  diplome:    { label: "Diplômé",    lightBg: "#FEF3C7", lightColor: "#92400E", darkBg: "#78350F", darkColor: "#FBBF24" },
};

// ✅ FIX #8 — parse "YYYY-MM-DD" en local (pas UTC)
function parseLocalDate(dateStr) {
  if (!dateStr) return null;
  if (typeof dateStr === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

export function ElevesTable({
  data = [],         // ✅ FIX #2
  onEditParent,
  onEditUser,
  onDelete,
  onViewDetails,
}) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();

  const iconBig = isMobile ? 20 : 18;
  const iconSmall = isMobile ? 18 : 16;
  const iconTiny = isMobile ? 16 : 14;
  const btnPad = isMobile ? "8px 12px" : "6px 10px";
  const btnIconOnlyPad = isMobile ? "8px" : "4px";

  // ✅ FIX #6 — gestion erreur presse-papiers
  const copyMatricule = useCallback(async (code) => {
    if (!code) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        // Fallback vieux navigateur / contexte non-sécurisé
        const ta = document.createElement("textarea");
        ta.value = code;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      toast.success("Matricule copié !");
    } catch {
      toast.error("Impossible de copier");
    }
  }, []);

  // ✅ FIX #1 + #10 — tri mémoïsé + guard classe
  const sortedData = useMemo(() => {
    if (!data.length) return data;
    return [...data].sort((a, b) => {
      const classCompare = trierClasses(a.classe ?? "", b.classe ?? "");
      if (classCompare !== 0) return classCompare;
      const nomA = `${a.nom ?? ""} ${a.postnom ?? ""} ${a.prenom ?? ""}`.toLowerCase().trim();
      const nomB = `${b.nom ?? ""} ${b.postnom ?? ""} ${b.prenom ?? ""}`.toLowerCase().trim();
      return nomA.localeCompare(nomB, "fr", { sensitivity: "base" });
    });
  }, [data]);

  // ✅ FIX #9 — useCallback sur formatters
  const formatDate = useCallback((dateStr) => {
    const d = parseLocalDate(dateStr);
    return d ? d.toLocaleDateString("fr-FR") : "—";
  }, []);

  const renderStatut = useCallback((statut) => {
    const config = STATUT_CONFIG[statut] || STATUT_CONFIG.inscrit;
    return (
      <span style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "4px 10px",
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 600,
        background: dark ? config.darkBg : config.lightBg,
        color: dark ? config.darkColor : config.lightColor,
      }}>
        {config.label}
      </span>
    );
  }, [dark]);

  const renderSexe = useCallback((sexe) => {
    return sexe === "F" ? "Féminin" : sexe === "M" ? "Masculin" : "—";
  }, []);

  // ✅ FIX #4 — useMemo sur les colonnes
  const columns = useMemo(() => {
    const actionButtonStyle = {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      padding: btnPad,
      border: "none",
      borderRadius: 6,
      cursor: "pointer",
      fontSize: isMobile ? 14 : 12,
      whiteSpace: "nowrap",
    };

    return [
      {
        header: "Matricule",
        accessor: "code",
        sortable: true,
        hideOnMobile: false,
        render: (e) => e.code ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            {e.code}
            <button
              type="button"      // ✅ FIX #5
              onClick={(ev) => { ev.stopPropagation(); copyMatricule(e.code); }}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
              title="Copier le matricule"
              aria-label="Copier le matricule"   // ✅ FIX #11
            >
              <Copy size={iconTiny} color={dark ? "#94A3B8" : "#64748B"} />
            </button>
          </span>
        ) : "—",
      },
      {
        header: "Élève",
        accessor: "nom",
        sortable: true,
        hideOnMobile: false,
        render: (e) => (
          <div>
            <strong>{e.nom} {e.postnom} {e.prenom}</strong>
            <div style={{ fontSize: 12, color: dark ? "#94A3B8" : "#64748B" }}>
              {renderSexe(e.sexe)} {e.dateNaissance ? `· ${formatDate(e.dateNaissance)}` : ""}
            </div>
          </div>
        ),
      },
      {
        header: "Classe",
        accessor: "classe",
        sortable: true,
        hideOnMobile: false,
      },
      {
        header: "Province",
        accessor: "province",
        sortable: true,
        hideOnMobile: true,
        render: (e) => e.province || "—",
      },
      {
        header: "Téléphone",
        accessor: "telephone",
        hideOnMobile: true,
        render: (e) => e.telephone || "—",
      },
      {
        header: "Statut",
        accessor: "statut",
        sortable: true,
        hideOnMobile: false,
        render: (e) => renderStatut(e.statut),
      },
      {
        header: "Parent",
        accessor: "parentName",
        hideOnMobile: true,
        render: (e) => e.parentName !== "—" ? `${e.parentName} (@${e.parentLogin})` : "—",
      },
      {
        header: "Compte élève",
        accessor: "eleveUserName",
        hideOnMobile: true,
        render: (e) => e.eleveUserName !== "—" ? `${e.eleveUserName} (@${e.eleveUserLogin})` : "—",
      },
      {
        header: "Actions",
        sortable: false,
        hideOnMobile: false,
        render: (e) => (
          <div style={{ display: "flex", gap: isMobile ? 4 : 6, flexWrap: "wrap", justifyContent: "center" }}>
            <button
              type="button"                          // ✅ FIX #5
              onClick={(ev) => { ev.stopPropagation(); onViewDetails?.(e._id); }}
              style={{
                ...actionButtonStyle,
                background: "transparent",
                color: dark ? "#818CF8" : "#4F46E5",
                padding: btnIconOnlyPad,
              }}
              title="Voir la fiche complète"
              aria-label="Voir la fiche complète"
            >
              <Eye size={iconBig} />
            </button>
            <button
              type="button"
              onClick={(ev) => { ev.stopPropagation(); onEditParent?.(e._id); }}   // ✅ FIX #7
              style={{ ...actionButtonStyle, background: "#4F46E5", color: "white" }}
              title="Modifier le parent"
            >
              <UserCheck size={iconSmall} /> Parent
            </button>
            <button
              type="button"
              onClick={(ev) => { ev.stopPropagation(); onEditUser?.(e._id); }}     // ✅ FIX #7
              style={{ ...actionButtonStyle, background: "#6366F1", color: "white" }}
              title="Modifier le compte élève"
            >
              <Pencil size={iconSmall} /> Compte
            </button>
            <button
              type="button"
              onClick={(ev) => { ev.stopPropagation(); onDelete?.(e._id); }}       // ✅ FIX #7
              style={{
                ...actionButtonStyle,
                background: "none",
                color: "#EF4444",
                padding: btnIconOnlyPad,
              }}
              title="Supprimer"
              aria-label="Supprimer"
            >
              <Trash2 size={iconBig} />
            </button>
          </div>
        ),
      },
    ];
  }, [
    dark, isMobile, iconBig, iconSmall, iconTiny,
    btnPad, btnIconOnlyPad,
    copyMatricule, renderStatut, renderSexe, formatDate,
    onViewDetails, onEditParent, onEditUser, onDelete,
  ]);

  return (
    <DataTable
      columns={columns}
      data={sortedData}
      searchPlaceholder="Rechercher un élève..."
      pageSize={10}
      emptyTitle="Aucun élève"
      emptyMessage="Ajoutez votre premier élève."
    />
  );
}