import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api"; // chemin vers convex depuis src/components/
import { UserCheck, UserX } from "lucide-react";
import toast from "react-hot-toast";

export function PendingUsersList({ pendingUsers }) {
  const approveUser = useMutation(api.users.approveUser);
  const rejectUser = useMutation(api.users.rejectUser);

  const handleApprove = async (userId) => {
    try {
      await approveUser({ userId });
      toast.success("Utilisateur approuvé");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleReject = async (userId) => {
    const reason = prompt("Motif du rejet (optionnel) :");
    try {
      await rejectUser({ userId, reason: reason || undefined });
      toast.success("Utilisateur rejeté");
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (pendingUsers.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: 48, color: "#64748B" }}>
        <UserCheck size={48} color="#10B981" />
        <p style={{ marginTop: 12 }}>Aucune demande en attente.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {pendingUsers.map(u => (
        <div key={u._id} style={{ background: "#FFF", borderRadius: 12, padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div>
            <div style={{ fontWeight: 600 }}>{u.nom}</div>
            <div style={{ fontSize: 13, color: "#64748B" }}>@{u.login} · {u.role}</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => handleApprove(u._id)} style={{ background: "#10B981", color: "white", border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
              <UserCheck size={16} /> Approuver
            </button>
            <button onClick={() => handleReject(u._id)} style={{ background: "#EF4444", color: "white", border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
              <UserX size={16} /> Rejeter
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}