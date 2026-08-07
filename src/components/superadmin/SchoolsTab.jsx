import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Search, X, ListFilter } from "lucide-react";
import { SchoolTable } from "./SchoolTable";
import toast from "react-hot-toast";

export function SchoolsTab({ ecoles, onSelectEcole, user }) {
  const [searchTerm, setSearchTerm] = useState("");
  const removeEcole = useMutation(api.ecoles.remove);

  const filtered = ecoles.filter(e =>
    e.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.code && e.code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleDelete = async (ecoleId, nom) => {
    if (window.confirm(`Supprimer définitivement "${nom}" ?`)) {
      try {
        await removeEcole({ id: ecoleId, userId: user._id });
        toast.success("École supprimée");
      } catch (err) {
        toast.error(err.message);
      }
    }
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", background: "#FFF", borderRadius: 10, padding: "8px 12px", border: "1px solid #E2E8F0", flex: 1 }}>
          <Search size={18} color="#94A3B8" />
          <input
            placeholder="Rechercher une école..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ border: "none", outline: "none", marginLeft: 8, fontSize: 14, width: "100%" }}
          />
          {searchTerm && <button onClick={() => setSearchTerm("")} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={16} /></button>}
        </div>
        <ListFilter size={20} color="#64748B" />
      </div>
      <SchoolTable ecoles={filtered} onSelectEcole={onSelectEcole} onDelete={handleDelete} />
    </div>
  );
}