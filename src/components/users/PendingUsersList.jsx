// src/components/PendingUsersList.jsx
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useTokens } from "@/theme/tokens";
import { useIsMobile } from "@/hooks/useIsMobile";
import { UserCheck, UserX, Loader } from "lucide-react";
import toast from "react-hot-toast";
import { Button, Modal } from "@/components/ui";

// ✅ KEYFRAMES module-level, préfixés `pu-*`
const PendingUsersKeyframes = (
  <style>{`
    @keyframes pu-spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
    .pu-spin { animation: pu-spin 1s linear infinite; }
    @media (prefers-reduced-motion: reduce) {
      .pu-spin { animation: none !important; }
    }
  `}</style>
);

// ✅ Helper d'extraction de message d'erreur sécurisé
function getErrorMessage(err, fallback = "Une erreur est survenue") {
  if (!err) return fallback;
  if (typeof err === "string") return err;
  if (typeof err === "object" && err.message) return err.message;
  return fallback;
}

export function PendingUsersList({ pendingUsers = [], adminId }) {
  const t = useTokens();
  const isMobile = useIsMobile();
  const approveUser = useMutation(api.users.approveUser);
  const rejectUser = useMutation(api.users.rejectUser);

  const [processing, setProcessing] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [showRejectPrompt, setShowRejectPrompt] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  // ────────────────────────────────────────────────────────────
  // Handlers
  // ────────────────────────────────────────────────────────────
  const handleApprove = async (userId) => {
    setProcessing(userId);
    try {
      await approveUser({ userId, adminId });
      toast.success("Utilisateur approuvé");
    } catch (err) {
      toast.error(getErrorMessage(err));
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
      await rejectUser({
        userId,
        reason: rejectReason.trim() || undefined,
        adminId,
      });
      toast.success("Utilisateur rejeté");
      setShowRejectPrompt(null);
      setRejectReason("");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setRejecting(null);
    }
  };

  const closeRejectPrompt = () => {
    if (rejecting) return; // ✅ Pas de fermeture pendant l'action
    setShowRejectPrompt(null);
    setRejectReason("");
  };

  // ────────────────────────────────────────────────────────────
  // État vide
  // ────────────────────────────────────────────────────────────
  if (pendingUsers.length === 0) {
    return (
      <>
        {PendingUsersKeyframes}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
            padding: isMobile ? 32 : 48,
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: t.status.success.bg,
              color: t.status.success.fg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <UserCheck size={isMobile ? 28 : 32} />
          </div>
          <p
            style={{
              margin: 0,
              fontSize: isMobile ? 15 : 16,
              color: t.text.muted,
            }}
          >
            Aucune demande en attente.
          </p>
        </div>
      </>
    );
  }

  // ────────────────────────────────────────────────────────────
  // Rendu
  // ────────────────────────────────────────────────────────────
  const isBusy = (id) => processing === id || rejecting === id;

  return (
    <>
      {PendingUsersKeyframes}

      <div style={{ display: "grid", gap: isMobile ? 8 : 12 }}>
        {pendingUsers.map((u) => (
          <div
            key={u._id}
            style={{
              background: t.surface.default,
              borderRadius: t.radius.md,
              padding: isMobile ? 14 : 16,
              display: "flex",
              flexDirection: isMobile ? "column" : "row",
              justifyContent: "space-between",
              alignItems: isMobile ? "stretch" : "center",
              gap: 12,
              boxShadow: t.shadow.sm,
              border: `1px solid ${t.border.default}`,
            }}
          >
            {/* Infos utilisateur */}
            <div style={{ flex: isMobile ? "none" : 1, minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 600,
                  color: t.text.primary,
                  fontSize: isMobile ? 15 : 14,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {u.nom}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: t.text.muted,
                  marginTop: 2,
                  textTransform: "capitalize",
                }}
              >
                @{u.login} · {u.role}
              </div>
            </div>

            {/* Actions */}
            <div
              style={{
                display: "flex",
                gap: 8,
                justifyContent: "flex-end",
                flexDirection: isMobile ? "row" : "row",
              }}
            >
              <Button
                variant="success"
                size={isMobile ? "md" : "sm"}
                icon={
                  processing === u._id ? (
                    <Loader size={14} className="pu-spin" />
                  ) : (
                    <UserCheck size={14} />
                  )
                }
                onClick={() => handleApprove(u._id)}
                disabled={isBusy(u._id)}
                style={{ flex: isMobile ? 1 : "none" }}
              >
                {processing === u._id ? "Traitement…" : "Approuver"}
              </Button>
              <Button
                variant="danger"
                size={isMobile ? "md" : "sm"}
                icon={<UserX size={14} />}
                onClick={() => openRejectPrompt(u._id)}
                disabled={isBusy(u._id)}
                style={{ flex: isMobile ? 1 : "none" }}
              >
                Rejeter
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* ═══════════ MODAL REJET ═══════════ */}
      <Modal
        open={showRejectPrompt !== null}
        onClose={closeRejectPrompt}
        title="Motif du rejet"
        maxWidth={420}
        closeOnOverlay={!rejecting}
        closeOnEscape={!rejecting}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={closeRejectPrompt}
              disabled={!!rejecting}
            >
              Annuler
            </Button>
            <Button
              variant="danger"
              onClick={() => handleReject(showRejectPrompt)}
              loading={!!rejecting}
            >
              Confirmer le rejet
            </Button>
          </>
        }
      >
        <label
          htmlFor="reject-reason"
          style={{
            display: "block",
            fontSize: 12,
            fontWeight: 600,
            color: t.text.muted,
            marginBottom: 6,
            textTransform: "uppercase",
            letterSpacing: 0.3,
          }}
        >
          Raison (facultatif)
        </label>
        <textarea
          id="reject-reason"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Ex : informations incomplètes…"
          rows={isMobile ? 4 : 3}
          disabled={!!rejecting}
          aria-label="Raison du rejet"
          style={{
            width: "100%",
            padding: "10px 14px",
            border: `1px solid ${t.border.default}`,
            borderRadius: t.radius.sm,
            background: t.surface.input,
            color: t.text.primary,
            fontSize: isMobile ? 16 : 14, // 16px pour éviter le zoom iOS
            fontFamily: t.font.family,
            resize: "vertical",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </Modal>
    </>
  );
}