// src/components/UsersTable.jsx
import { useMemo } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { useTokens } from "@/theme/tokens";
import { useIsMobile } from "@/hooks/useIsMobile";
import { RoleBadge, IconButton } from "@/components/ui";
import { DataTable } from "../DataTable";

export function UsersTable({ users = [], onEdit, onDelete }) {
  const t = useTokens();
  const isMobile = useIsMobile();

  // ✅ useMemo pour éviter de recréer les colonnes à chaque render
  const columns = useMemo(
    () => [
      {
        header: "Nom",
        accessor: "nom",
        sortable: true,
        hideOnMobile: false,
        render: (u) => (
          <strong style={{ color: t.text.primary }}>{u.nom}</strong>
        ),
      },
      {
        header: "Login",
        accessor: "login",
        sortable: true,
        hideOnMobile: true,
      },
      {
        header: "Rôle",
        accessor: "role",
        sortable: true,
        hideOnMobile: false,
        // ✅ Utilise le RoleBadge du design system (au lieu de dupliquer)
        render: (u) => <RoleBadge role={u.role} size="sm" />,
      },
      {
        header: "Classe",
        accessor: "classe",
        sortable: true,
        hideOnMobile: true,
        render: (u) => u.classe || "—",
      },
      {
        header: "Actions",
        sortable: false,
        hideOnMobile: false,
        render: (u) => (
          <div
            style={{
              display: "flex",
              gap: isMobile ? 4 : 6,
              justifyContent: "center",
            }}
          >
            <IconButton
              icon={<Pencil size={isMobile ? 18 : 16} />}
              label={`Modifier ${u.nom}`}
              onClick={() => onEdit?.(u)}
              variant="primary"
              size={isMobile ? "md" : "sm"}
            />
            <IconButton
              icon={<Trash2 size={isMobile ? 18 : 16} />}
              label={`Supprimer ${u.nom}`}
              onClick={() => onDelete?.(u._id)}
              variant="outline"
              size={isMobile ? "md" : "sm"}
              style={{
                color: "#EF4444",
                borderColor: t.status.danger.border,
              }}
            />
          </div>
        ),
      },
    ],
    [t, isMobile, onEdit, onDelete]
  );

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