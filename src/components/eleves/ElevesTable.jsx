import { DataTable } from "../DataTable";
import { Pencil, UserCheck, Trash2, Copy, Eye, Calendar, MapPin, Phone, User } from "lucide-react";
import { useStyles } from "../../styles/theme";
import toast from "react-hot-toast";
import { trierClasses } from "../../utils/sort";

export function ElevesTable({ data, onEditParent, onEditUser, onDelete, onViewDetails }) {
  const { dark } = useStyles();

  const copyMatricule = (code) => {
    navigator.clipboard.writeText(code).then(() => toast.success("Matricule copié !"));
  };

  const sortedData = [...data].sort((a, b) => {
    const classCompare = trierClasses(a.classe, b.classe);
    if (classCompare !== 0) return classCompare;
    const nomA = `${a.nom} ${a.postnom} ${a.prenom || ''}`.toLowerCase().trim();
    const nomB = `${b.nom} ${b.postnom} ${b.prenom || ''}`.toLowerCase().trim();
    return nomA.localeCompare(nomB, 'fr', { sensitivity: 'base' });
  });

  const statutConfig = {
    inscrit: { label: "Inscrit", bg: dark ? "#1E293B" : "#EEF2FF", color: dark ? "#A5B4FC" : "#4F46E5" },
    passant: { label: "Passant", bg: dark ? "#064E3B" : "#D1FAE5", color: dark ? "#34D399" : "#065F46" },
    redoublant: { label: "Redoublant", bg: dark ? "#78350F" : "#FEF3C7", color: dark ? "#FBBF24" : "#92400E" },
    transfere: { label: "Transféré", bg: dark ? "#334155" : "#E2E8F0", color: dark ? "#CBD5E1" : "#475569" },
    exclu: { label: "Exclu", bg: dark ? "#7F1D1D" : "#FEE2E2", color: dark ? "#F87171" : "#B91C1C" },
    diplome: { label: "Diplômé", bg: dark ? "#78350F" : "#FEF3C7", color: dark ? "#FBBF24" : "#92400E" },
  };

  const renderStatut = (statut) => {
    const config = statutConfig[statut] || statutConfig.inscrit;
    return (
      <span style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "4px 10px",
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 600,
        background: config.bg,
        color: config.color,
      }}>
        {config.label}
      </span>
    );
  };

  const renderSexe = (sexe) => {
    return sexe === "F" ? "Féminin" : sexe === "M" ? "Masculin" : "—";
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("fr-FR");
    } catch {
      return dateStr;
    }
  };

  return (
    <DataTable
      columns={[
        {
          header: "Matricule",
          accessor: "code",
          sortable: true,
          render: (e) => e.code ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              {e.code}
              <button
                onClick={(ev) => { ev.stopPropagation(); copyMatricule(e.code); }}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                title="Copier le matricule"
              >
                <Copy size={14} color={dark ? "#94A3B8" : "#64748B"} />
              </button>
            </span>
          ) : "—",
        },
        {
          header: "Élève",
          accessor: "nom",
          sortable: true,
          render: (e) => (
            <div>
              <strong>{e.nom} {e.postnom} {e.prenom}</strong>
              <div style={{ fontSize: 12, color: dark ? "#94A3B8" : "#64748B" }}>
                {renderSexe(e.sexe)} {e.dateNaissance ? `· ${formatDate(e.dateNaissance)}` : ""}
              </div>
            </div>
          ),
        },
        { header: "Classe", accessor: "classe", sortable: true },
        {
          header: "Province",
          accessor: "province",
          sortable: true,
          render: (e) => e.province || "—",
        },
        {
          header: "Téléphone",
          accessor: "telephone",
          render: (e) => e.telephone || "—",
        },
        {
          header: "Statut",
          accessor: "statut",
          sortable: true,
          render: (e) => renderStatut(e.statut),
        },
        { header: "Parent", accessor: "parentName", render: (e) => e.parentName !== "—" ? `${e.parentName} (@${e.parentLogin})` : "—" },
        { header: "Compte élève", accessor: "eleveUserName", render: (e) => e.eleveUserName !== "—" ? `${e.eleveUserName} (@${e.eleveUserLogin})` : "—" },
        {
          header: "Actions",
          sortable: false,
          render: (e) => (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button
                onClick={(ev) => { ev.stopPropagation(); onViewDetails?.(e._id); }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: dark ? "#818CF8" : "#4F46E5",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: 4,
                }}
                title="Voir la fiche complète"
              >
                <Eye size={18} />
              </button>
              <button
                onClick={(ev) => { ev.stopPropagation(); onEditParent(e._id); }}
                style={{ background: "#4F46E5", color: "white", border: "none", borderRadius: 6, padding: "6px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}
                title="Modifier le parent"
              >
                <UserCheck size={16} /> Parent
              </button>
              <button
                onClick={(ev) => { ev.stopPropagation(); onEditUser(e._id); }}
                style={{ background: "#6366F1", color: "white", border: "none", borderRadius: 6, padding: "6px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}
                title="Modifier le compte élève"
              >
                <Pencil size={16} /> Compte
              </button>
              <button
                onClick={(ev) => { ev.stopPropagation(); onDelete(e._id); }}
                style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 4 }}
                title="Supprimer"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ),
        },
      ]}
      data={sortedData}
      searchPlaceholder="Rechercher un élève..."
      pageSize={10}
      emptyTitle="Aucun élève"
      emptyMessage="Ajoutez votre premier élève."
    />
  );
}