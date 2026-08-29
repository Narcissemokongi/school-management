import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useStyles } from "../../styles/theme";
import { UserCheck, UserX, Loader, X } from "lucide-react";
import toast from "react-hot-toast";

export function PendingUsersList({ pendingUsers, adminId }) {
  const { S, dark } = useStyles();
  const approveUser = useMutation(api.users.approveUser);
  const rejectUser = useMutation(api.users.rejectUser);

  const [processing, setProcessing] = useState(null); // userId en cours de traitement
  const [rejecting, setRejecting] = useState(null); // userId en cours de rejet
  const [showRejectPrompt, setShowRejectPrompt] = useState(null); // userId pour modal de rejet
  const [rejectReason, setRejectReason] = useState("");

  const handleApprove = async (userId) => {
    setProcessing(userId);
    try {
      await approveUser({ userId, adminId });
      toast.success("Utilisateur approuvé");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setProcessing(null);
    }
  };

  const openRejectPrompt = (userId) => {
    setShowRejectPrompt(userId);
    setRejectReason("");
  };

  const handleReject = async (userId) => {
    setRejecting(userId);
    try {
      await rejectUser({ userId, reason: rejectReason || undefined, adminId });
      toast.success("Utilisateur rejeté");
      setShowRejectPrompt(null);
      setRejectReason("");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setRejecting(null);
    }
  };

  if (pendingUsers.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: 48, color: dark ? "#94A3B8" : "#64748B" }}>
        <UserCheck size={48} color="#10B981" />
        <p style={{ marginTop: 12 }}>Aucune demande en attente.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {pendingUsers.map((u) => (
        <div
          key={u._id}
          style={{
            background: dark ? "#1E293B" : "#FFFFFF",
            borderRadius: 12,
            padding: 16,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)",
            border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
            transition: "background-color 0.3s, border-color 0.3s",
          }}
        >
          <div>
            <div style={{ fontWeight: 600, color: dark ? "#F1F5F9" : "#1E293B" }}>
              {u.nom}
            </div>
            <div style={{ fontSize: 13, color: dark ? "#94A3B8" : "#64748B" }}>
              @{u.login} · {u.role}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => handleApprove(u._id)}
              disabled={processing === u._id || rejecting === u._id}
              style={{
                background: "#10B981",
                color: "white",
                border: "none",
                borderRadius: 8,
                padding: "6px 12px",
                cursor: processing === u._id ? "wait" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
                opacity: processing === u._id || rejecting === u._id ? 0.7 : 1,
              }}
            >
              {processing === u._id ? <Loader size={16} className="animate-spin" /> : <UserCheck size={16} />}
              {processing === u._id ? "..." : "Approuver"}
            </button>
            <button
              onClick={() => openRejectPrompt(u._id)}
              disabled={processing === u._id || rejecting === u._id}
              style={{
                background: "#EF4444",
                color: "white",
                border: "none",
                borderRadius: 8,
                padding: "6px 12px",
                cursor: processing === u._id || rejecting === u._id ? "wait" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
                opacity: processing === u._id || rejecting === u._id ? 0.7 : 1,
              }}
            >
              <UserX size={16} />
              Rejeter
            </button>
          </div>
        </div>
      ))}

      {/* Modale de motif de rejet */}
      {showRejectPrompt && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 16,
          }}
          onClick={() => setShowRejectPrompt(null)}
        >
          <div
            style={{
              background: dark ? "#1E293B" : "#FFFFFF",
              borderRadius: 16,
              padding: 24,
              maxWidth: 400,
              width: "100%",
              boxShadow: dark ? "0 20px 40px rgba(0,0,0,0.5)" : "0 20px 40px rgba(0,0,0,0.2)",
              border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 600, color: dark ? "#F1F5F9" : "#1E293B" }}>
              Motif du rejet
            </h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Raison facultative..."
              rows={3}
              style={{
                width: "100%",
                padding: "10px 14px",
                border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
                borderRadius: 8,
                background: dark ? "#0F172A" : "#F9FAFB",
                color: dark ? "#F1F5F9" : "#1E293B",
                fontSize: 14,
                resize: "vertical",
                outline: "none",
              }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button
                onClick={() => handleReject(showRejectPrompt)}
                disabled={rejecting === showRejectPrompt}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  background: "#EF4444",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {rejecting === showRejectPrompt ? <Loader size={16} className="animate-spin" /> : "Confirmer le rejet"}
              </button>
              <button
                onClick={() => setShowRejectPrompt(null)}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  background: dark ? "#334155" : "#F1F5F9",
                  color: dark ? "#F1F5F9" : "#1E293B",
                  border: "none",
                  borderRadius: 8,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .animate-spin { animation: spin 1s linear infinite; }`}</style>
    </div>
  );
}