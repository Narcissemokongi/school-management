import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile"; // <-- Import du hook
import { UserCheck, UserX, Loader, X } from "lucide-react";
import toast from "react-hot-toast";

export function PendingUsersList({ pendingUsers, adminId }) {
  const { S, dark } = useStyles();
  const isMobile = useIsMobile(); // Détection mobile
  const approveUser = useMutation(api.users.approveUser);
  const rejectUser = useMutation(api.users.rejectUser);

  const [processing, setProcessing] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [showRejectPrompt, setShowRejectPrompt] = useState(null);
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
      <div style={{ textAlign: "center", padding: isMobile ? 32 : 48, color: dark ? "#94A3B8" : "#64748B" }}>
        <UserCheck size={isMobile ? 40 : 48} color="#10B981" />
        <p style={{ marginTop: 12, fontSize: isMobile ? 15 : 16 }}>Aucune demande en attente.</p>
      </div>
    );
  }

  // Styles adaptatifs
  const cardPadding = isMobile ? "12px 14px" : 16;
  const cardFlexDirection = isMobile ? "column" : "row";
  const cardAlignItems = isMobile ? "stretch" : "center";
  const buttonPadding = isMobile ? "10px 14px" : "6px 12px";
  const buttonFontSize = isMobile ? 14 : 13;
  const actionsGap = isMobile ? 8 : 8;
  const actionsJustify = isMobile ? "flex-end" : "flex-end";
  const modalMaxWidth = isMobile ? "92%" : 400;
  const modalPadding = isMobile ? 18 : 24;
  const textareaFontSize = isMobile ? 16 : 14; // 16px pour éviter le zoom iOS

  return (
    <div style={{ display: "grid", gap: isMobile ? 8 : 12 }}>
      {pendingUsers.map((u) => (
        <div
          key={u._id}
          style={{
            background: dark ? "#1E293B" : "#FFFFFF",
            borderRadius: 12,
            padding: cardPadding,
            display: "flex",
            flexDirection: cardFlexDirection,
            justifyContent: "space-between",
            alignItems: cardAlignItems,
            gap: isMobile ? 8 : 0,
            boxShadow: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)",
            border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
            transition: "background-color 0.3s, border-color 0.3s",
          }}
        >
          <div style={{ flex: isMobile ? "none" : 1, minWidth: isMobile ? "100%" : 0 }}>
            <div style={{ fontWeight: 600, color: dark ? "#F1F5F9" : "#1E293B", fontSize: isMobile ? 16 : 14 }}>
              {u.nom}
            </div>
            <div style={{ fontSize: isMobile ? 13 : 13, color: dark ? "#94A3B8" : "#64748B", marginTop: 2 }}>
              @{u.login} · {u.role}
            </div>
          </div>
          <div style={{ display: "flex", gap: actionsGap, justifyContent: actionsJustify }}>
            <button
              onClick={() => handleApprove(u._id)}
              disabled={processing === u._id || rejecting === u._id}
              style={{
                background: "#10B981",
                color: "white",
                border: "none",
                borderRadius: 8,
                padding: buttonPadding,
                cursor: processing === u._id ? "wait" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                opacity: processing === u._id || rejecting === u._id ? 0.7 : 1,
                fontSize: buttonFontSize,
                flex: isMobile ? 1 : "none",
              }}
            >
              {processing === u._id ? <Loader size={16} className="animate-spin" /> : <UserCheck size={isMobile ? 18 : 16} />}
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
                padding: buttonPadding,
                cursor: processing === u._id || rejecting === u._id ? "wait" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                opacity: processing === u._id || rejecting === u._id ? 0.7 : 1,
                fontSize: buttonFontSize,
                flex: isMobile ? 1 : "none",
              }}
            >
              <UserX size={isMobile ? 18 : 16} />
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
            padding: isMobile ? 12 : 16,
          }}
          onClick={() => setShowRejectPrompt(null)}
        >
          <div
            style={{
              background: dark ? "#1E293B" : "#FFFFFF",
              borderRadius: 16,
              padding: modalPadding,
              maxWidth: modalMaxWidth,
              width: "100%",
              boxShadow: dark ? "0 20px 40px rgba(0,0,0,0.5)" : "0 20px 40px rgba(0,0,0,0.2)",
              border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 16px", fontSize: isMobile ? 18 : 18, fontWeight: 600, color: dark ? "#F1F5F9" : "#1E293B" }}>
              Motif du rejet
            </h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Raison facultative..."
              rows={isMobile ? 4 : 3}
              style={{
                width: "100%",
                padding: "10px 14px",
                border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
                borderRadius: 8,
                background: dark ? "#0F172A" : "#F9FAFB",
                color: dark ? "#F1F5F9" : "#1E293B",
                fontSize: textareaFontSize,
                resize: "vertical",
                outline: "none",
              }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 16, flexDirection: isMobile ? "column" : "row" }}>
              <button
                onClick={() => handleReject(showRejectPrompt)}
                disabled={rejecting === showRejectPrompt}
                style={{
                  flex: isMobile ? "none" : 1,
                  padding: isMobile ? "12px 0" : "10px 0",
                  background: "#EF4444",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: isMobile ? 16 : 14,
                }}
              >
                {rejecting === showRejectPrompt ? <Loader size={16} className="animate-spin" /> : "Confirmer le rejet"}
              </button>
              <button
                onClick={() => setShowRejectPrompt(null)}
                style={{
                  flex: isMobile ? "none" : 1,
                  padding: isMobile ? "12px 0" : "10px 0",
                  background: dark ? "#334155" : "#F1F5F9",
                  color: dark ? "#F1F5F9" : "#1E293B",
                  border: "none",
                  borderRadius: 8,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: isMobile ? 16 : 14,
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