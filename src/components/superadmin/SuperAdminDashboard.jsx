import { Button, Badge, Modal, IconButton } from "@/components/ui";
import { Plus, Check, Trash2 } from "lucide-react";

// Dans le JSX :
<Button variant="primary" icon={<Plus size={16} />}>
  Nouvelle école
</Button>

<Button variant="secondary" size="sm">
  Annuler
</Button>

<Button variant="danger" icon={<Trash2 size={14} />}>
  Supprimer
</Button>

<IconButton icon={<Check size={18} />} label="Valider" variant="primary" />

<Badge variant="success">Active</Badge>
<Badge variant="warning">En attente</Badge>
<Badge variant="danger" dot>Suspendue</Badge>