import { useMutation } from "convex/react";

import { UserCheck, UserX, CheckCircle } from "lucide-react";
import { PendingUserCard } from "./PendingUserCard";
import toast from "react-hot-toast";
import { api } from "../../../convex/_generated/api";
import { useStyles } from "../../styles/theme";

export function PendingTab({ pendingUsers }) {
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
        <CheckCircle size={48} color="#10B981" />
        <p style={{ marginTop: 12, fontSize: 16 }}>Aucune demande en attente</p>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {pendingUsers.map(u => (
        <PendingUserCard
          key={u._id}
          user={u}
          onApprove={() => handleApprove(u._id)}
          onReject={() => handleReject(u._id)}
        />
      ))}
    </div>
  );
}