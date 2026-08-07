import { DataTable } from "../DataTable";
import { Pencil, UserCheck } from "lucide-react";

export function ElevesTable({ data, onEditParent, onEditUser, onDelete }) {
  return (
    <DataTable
      columns={[
        { header: "Nom", accessor: "nom", sortable: true, render: (e) => <strong>{e.nom} {e.postnom}</strong> },
        { header: "Classe", accessor: "classe", sortable: true },
        { header: "Parent", accessor: "parentName", render: (e) => e.parentName !== "—" ? `${e.parentName} (@${e.parentLogin})` : "—" },
        { header: "Compte élève", accessor: "eleveUserName", render: (e) => e.eleveUserName !== "—" ? `${e.eleveUserName} (@${e.eleveUserLogin})` : "—" },
        {
          header: "Actions",
          sortable: false,
          render: (e) => (
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={() => onEditParent(e._id)}
                style={{ background: "#4F46E5", color: "white", border: "none", borderRadius: 6, padding: "6px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                title="Modifier le parent"
              >
                <UserCheck size={16} /> Parent
              </button>
              <button
                onClick={() => onEditUser(e._id)}
                style={{ background: "#6366F1", color: "white", border: "none", borderRadius: 6, padding: "6px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                title="Modifier le compte élève"
              >
                <Pencil size={16} /> Compte
              </button>
              <button
                onClick={() => onDelete(e._id)}
                style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer", fontSize: 18 }}
                title="Supprimer"
              >
                🗑️
              </button>
            </div>
          ),
        },
      ]}
      data={data}
      searchPlaceholder="Rechercher un élève..."
      pageSize={10}
      emptyTitle="Aucun élève"
      emptyMessage="Ajoutez votre premier élève."
    />
  );
}