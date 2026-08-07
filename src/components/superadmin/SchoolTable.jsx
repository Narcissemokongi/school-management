import { Copy, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

export function SchoolTable({ ecoles, onSelectEcole, onDelete }) {
  const copyCode = (code) => {
    navigator.clipboard.writeText(code).then(() => toast.success("Code copié !"));
  };

  return (
    <div style={{ background: "#FFF", borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#F8FAFC" }}>
            <th style={{ textAlign: "left", padding: "14px 16px", fontSize: 13, fontWeight: 600, color: "#64748B" }}>École</th>
            <th style={{ textAlign: "left", padding: "14px 16px", fontSize: 13, fontWeight: 600, color: "#64748B" }}>Code</th>
            <th style={{ textAlign: "center", padding: "14px 16px", fontSize: 13, fontWeight: 600, color: "#64748B" }}>Utilisateurs</th>
            <th style={{ textAlign: "center", padding: "14px 16px", fontSize: 13, fontWeight: 600, color: "#64748B" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {ecoles.map(ecole => (
            <tr
              key={ecole._id}
              style={{ borderBottom: "1px solid #F1F5F9", transition: "background 0.15s", cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              onClick={() => onSelectEcole(ecole._id)}
            >
              <td style={{ padding: "14px 16px", fontWeight: 500 }}>{ecole.nom}</td>
              <td style={{ padding: "14px 16px" }}>
                <span style={{ background: "#F1F5F9", padding: "2px 10px", borderRadius: 20, fontFamily: "monospace", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}>
                  {ecole.code || "N/A"}
                  {ecole.code && (
                    <button
                      onClick={e => { e.stopPropagation(); copyCode(ecole.code); }}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                      title="Copier le code"
                    >
                      <Copy size={14} color="#64748B" />
                    </button>
                  )}
                </span>
              </td>
              <td style={{ padding: "14px 16px", textAlign: "center" }}>{ecole.userCount}</td>
              <td style={{ padding: "14px 16px", textAlign: "center" }} onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => onDelete(ecole._id, ecole.nom)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444" }}
                  title="Supprimer"
                >
                  <Trash2 size={18} />
                </button>
              </td>
            </tr>
          ))}
          {ecoles.length === 0 && (
            <tr>
              <td colSpan={4} style={{ textAlign: "center", padding: 40, color: "#94A3B8" }}>
                Aucune école trouvée
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}