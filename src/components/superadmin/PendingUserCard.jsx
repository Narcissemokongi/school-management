import { UserCheck, UserX } from "lucide-react";

export function PendingUserCard({ user, onApprove, onReject }) {
  return (
    <div style={{
      background: "#FFF",
      borderRadius: 12,
      padding: "16px 20px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
      transition: "box-shadow 0.2s"
    }}>
      <div>
        <div style={{ fontWeight: 600, fontSize: 15 }}>{user.nom}</div>
        <div style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>
          @{user.login} · {user.role}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={onApprove}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 14px", background: "#10B981", color: "white",
            border: "none", borderRadius: 8, fontWeight: 500, fontSize: 13,
            cursor: "pointer"
          }}
        >
          <UserCheck size={16} /> Approuver
        </button>
        <button
          onClick={onReject}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 14px", background: "#EF4444", color: "white",
            border: "none", borderRadius: 8, fontWeight: 500, fontSize: 13,
            cursor: "pointer"
          }}
        >
          <UserX size={16} /> Rejeter
        </button>
      </div>
    </div>
  );
}