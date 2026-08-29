import { DataTable } from "../DataTable";
import { Pencil, Trash2 } from "lucide-react";
import { useStyles } from "../../styles/theme";

// Badge de rôle avec couleurs
function RoleBadge({ role, dark }) {
  const colors = {
    admin: { bg: dark ? "#7F1D1D" : "#FEE2E2", color: dark ? "#F87171" : "#B91C1C" },
    directeur: { bg: dark ? "#064E3B" : "#D1FAE5", color: dark ? "#34D399" : "#065F46" },
    disciplinaire: { bg: dark ? "#78350F" : "#FEF3C7", color: dark ? "#FBBF24" : "#92400E" },
    enseignant: { bg: dark ? "#312E81" : "#EEF2FF", color: dark ? "#A5B4FC" : "#4F46E5" },
    parent: { bg: dark ? "#082F49" : "#E0F2FE", color: dark ? "#38BDF8" : "#0369A1" },
    comptable: { bg: dark ? "#500724" : "#FCE7F3", color: dark ? "#F472B6" : "#BE185D" },
    eleve: { bg: dark ? "#2E1065" : "#F3E8FF", color: dark ? "#C084FC" : "#6B21A8" },
  };
  const style = colors[role] || { bg: dark ? "#334155" : "#F1F5F9", color: dark ? "#CBD5E1" : "#475569" };

  return (
    <span style={{
      display: "inline-block",
      padding: "2px 10px",
      borderRadius: 20,
      fontSize: 12,
      fontWeight: 600,
      background: style.bg,
      color: style.color,
    }}>
      {role}
    </span>
  );
}

export function UsersTable({ users, onEdit, onDelete }) {
  const { dark } = useStyles();

  const columns = [
    {
      header: "Nom",
      accessor: "nom",
      sortable: true,
      render: (u) => <strong style={{ color: dark ? "#F1F5F9" : "#1E293B" }}>{u.nom}</strong>,
    },
    { header: "Login", accessor: "login", sortable: true },
    {
      header: "Rôle",
      accessor: "role",
      sortable: true,
      render: (u) => <RoleBadge role={u.role} dark={dark} />,
    },
    {
      header: "Classe",
      accessor: "classe",
      sortable: true,
      render: (u) => u.classe || "—",
    },
    {
      header: "Actions",
      sortable: false,
      render: (u) => (
        <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
          <button
            onClick={() => onEdit(u)}
            title="Modifier"
            style={{
              background: dark ? "#818CF8" : "#4F46E5",
              color: "white",
              border: "none",
              borderRadius: 6,
              padding: "6px 10px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
              transition: "background 0.2s, transform 0.1s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = dark ? "#6366F1" : "#4338CA")}
            onMouseLeave={(e) => (e.currentTarget.style.background = dark ? "#818CF8" : "#4F46E5")}
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={() => onDelete(u._id)}
            title="Supprimer"
            style={{
              background: "transparent",
              color: "#EF4444",
              border: `1px solid ${dark ? "#7F1D1D" : "#FECACA"}`,
              borderRadius: 6,
              padding: "6px 10px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
              transition: "background 0.2s, transform 0.1s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = dark ? "#7F1D1D" : "#FEE2E2")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={users}
      searchPlaceholder="Rechercher un utilisateur..."
      pageSize={10}
      emptyTitle="Aucun utilisateur"
      emptyMessage="Ajoutez un nouveau compte."
    />
  );
}