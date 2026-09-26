// src/components/SuperAdmin/ecole/ImpersonationPickerModal.jsx
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useTokens } from "@/theme/tokens";
import { Modal, Button } from "@/components/ui";
import { useImpersonationStore } from "@/store/impersonationStore";
import { Loader, UserCog, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

export function ImpersonationPickerModal({
  userId,
  ecoleId,
  ecoleNom,
  ownerUser,
  onClose,
}) {
  const t = useTokens();
  const [selectedId, setSelectedId] = useState(null);
  const [starting, setStarting] = useState(false);

  const candidates = useQuery(api.impersonation.getCandidates, {
    userId,
    ecoleId,
  });
  const startImpersonation = useMutation(api.impersonation.startImpersonation);
  const startSession = useImpersonationStore((s) => s.start);

  const handleStart = async () => {
    if (!selectedId) return;
    setStarting(true);
    try {
      const targetUser = await startImpersonation({
        userId,
        targetUserId: selectedId,
      });
      startSession(ownerUser, targetUser);
      toast.success(`Impersonation : ${targetUser.nom}`);
      onClose();
      // Reload pour repartir avec le nouveau user partout
      window.location.reload();
    } catch (err) {
      toast.error("Impossible de démarrer : " + (err?.message ?? "erreur"));
      setStarting(false);
    }
  };

  const list = candidates ?? [];

  return (
    <Modal open onClose={onClose} title="Voir en tant qu'admin">
      <div
        style={{ display: "flex", flexDirection: "column", gap: t.space.md }}
      >
        {/* Avertissement */}
        <div
          style={{
            padding: t.space.sm,
            background: "#FEF3C7",
            border: "1px solid #FDE68A",
            borderRadius: t.radius.sm,
            color: "#78350F",
            fontSize: t.font.size.sm,
            display: "flex",
            gap: 8,
            alignItems: "flex-start",
          }}
        >
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            Vous allez voir l'application comme si vous étiez un utilisateur de{" "}
            <strong>{ecoleNom}</strong>. Toutes vos actions seront auditées.
          </div>
        </div>

        {/* Liste */}
        {candidates === undefined ? (
          <div
            style={{ display: "flex", justifyContent: "center", padding: 40 }}
          >
            <Loader
              size={32}
              style={{ animation: "spin 1s linear infinite" }}
              color={t.accent.primary}
            />
          </div>
        ) : list.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: t.space.lg,
              color: t.text.secondary,
            }}
          >
            <UserCog
              size={32}
              color={t.text.muted}
              style={{ marginBottom: 8 }}
            />
            <div style={{ fontSize: t.font.size.sm }}>
              Aucun admin disponible pour cette école.
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {list.map((u) => {
              const active = selectedId === u._id;
              return (
                <button
                  key={u._id}
                  type="button"
                  onClick={() => setSelectedId(u._id)}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: t.space.sm,
                    padding: t.space.sm,
                    background: active
                      ? `${t.accent.primary}15`
                      : t.surface.elevated,
                    border: `1px solid ${
                      active ? t.accent.primary : t.border.default
                    }`,
                    borderRadius: t.radius.sm,
                    cursor: "pointer",
                    textAlign: "left",
                    fontFamily: t.font.family,
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontWeight: 600,
                        color: t.text.primary,
                        fontSize: t.font.size.sm,
                      }}
                    >
                      {u.nom} {u.prenom} {u.postnom}
                    </div>
                    <div
                      style={{
                        fontSize: t.font.size.xs,
                        color: t.text.secondary,
                      }}
                    >
                      {u.login}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: t.accent.primary,
                      background: `${t.accent.primary}15`,
                      padding: "3px 8px",
                      borderRadius: t.radius.full,
                      textTransform: "uppercase",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {u.role}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Actions */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: t.space.sm,
          }}
        >
          <Button variant="ghost" onClick={onClose} disabled={starting}>
            Annuler
          </Button>
          <Button
            onClick={handleStart}
            disabled={!selectedId || starting}
          >
            {starting ? "Démarrage…" : "Démarrer"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default ImpersonationPickerModal;