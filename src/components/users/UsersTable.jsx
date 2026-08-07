import { DataTable } from "../DataTable"; // chemin relatif correct
import { Pencil, Trash2 } from "lucide-react";

export function UsersTable({ users, onEdit, onDelete }) {
  const columns = [
    { header: "Nom", accessor: "nom", sortable: true, render: (u) => <strong>{u.nom}</strong> },
    { header: "Login", accessor: "login", sortable: true },
    { header: "Rôle", accessor: "role", sortable: true },
    { header: "Classe", accessor: "classe", render: (u) => u.classe || "—" },
    {
      header: "Actions",
      sortable: false,
      render: (u) => (
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => onEdit(u)} style={{ background: "#4F46E5", color: "white", border: "none", borderRadius: 6, padding: "6px 12px", cursor: "pointer" }}>
            <Pencil size={16} />
          </button>
          <button onClick={() => onDelete(u._id)} style={{ background: "#EF4444", color: "white", border: "none", borderRadius: 6, padding: "6px 12px", cursor: "pointer" }}>
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
      searchPlaceholder="Rechercher..."
      pageSize={10}
      emptyTitle="Aucun utilisateur"
      emptyMessage="Ajoutez un nouveau compte."
    />
  );
}