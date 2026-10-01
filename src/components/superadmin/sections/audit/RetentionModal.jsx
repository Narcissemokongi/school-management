// src/components/SuperAdmin/sections/audit/RetentionModal.jsx
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useTokens } from "@/theme/tokens";
import { Modal, Button } from "@/components/ui";
import toast from "react-hot-toast";
import { Trash2, Clock, Infinity as InfinityIcon, AlertTriangle } from "lucide-react";

const OPTIONS = [
  {
    id: "90j",
    label: "90 jours",
    description: "Recommandé pour la conformité RGPD",
    days: 90,
    Icon: Clock,
  },
  {
    id: "1an",
    label: "1 an",
    description: "Bon compromis rétention / historique",
    days: 365,
    Icon: Clock,
  },
  {
    id: "3ans",
    label: "3 ans",
    description: "Historique étendu",
    days: 1095,
    Icon: Clock,
  },
  {
    id: "illimite",
    label: "Illimité",
    description: "Aucune suppression automatique",
    days: null,
    Icon: InfinityIcon,
  },
];

export function RetentionModal({ userId, currentRetention, onClose }) {
  const t = useTokens();
  const [selected, setSelected] = useState(() => {
    if (currentRetention === null || currentRetention === undefined) {
      return "illimite";
    }
    const found = OPTIONS.find((o) => o.days === currentRetention);
    return found?.id ?? "90j";
  });
  const [saving, setSaving] = useState(false);

  const setRetentionM = useMutation(api.audit.setRetention);

  const handleSave = async () => {
    setSaving(true);
    try {
      const opt = OPTIONS.find((o) => o.id === selected);
      await setRetentionM({
        userId,
        retentionDays: opt.days ?? undefined,
      });
      toast.success(
        opt.days
          ? `Rétention configurée : ${opt.label}`
          : "Rétention illimitée activée"
      );
      onClose();
    } catch (err) {
      toast.error("Erreur : " + (err?.message ?? "inconnue"));
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Configuration de la rétention">
      <div style={{ display: "flex", flexDirection: "column", gap: t.space.md }}>
        {/* Avertissement */}
        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
            padding: t.space.sm,
            background: "#FEF3C7",
            border: "1px solid #FDE68A",
            borderRadius: t.radius.sm,
            fontSize: t.font.size.sm,
            color: "#78350F",
          }}
        >
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            Les entrées d'audit plus anciennes que la durée choisie seront{" "}
            <strong>supprimées automatiquement chaque nuit</strong>.
          </div>
        </div>

        {/* Options */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {OPTIONS.map((opt) => {
            const active = selected === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSelected(opt.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: t.space.sm,
                  padding: t.space.sm,
                  background: active ? `${t.accent.primary}15` : t.surface.elevated,
                  border: `1px solid ${
                    active ? t.accent.primary : t.border.default
                  }`,
                  borderRadius: t.radius.sm,
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: t.font.family,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: t.radius.sm,
                    background: active ? `${t.accent.primary}25` : t.surface.hover,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <opt.Icon
                    size={16}
                    color={active ? t.accent.primary : t.text.muted}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: t.font.size.sm,
                      fontWeight: 700,
                      color: t.text.primary,
                    }}
                  >
                    {opt.label}
                  </div>
                  <div
                    style={{
                      fontSize: t.font.size.xs,
                      color: t.text.secondary,
                    }}
                  >
                    {opt.description}
                  </div>
                </div>
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    border: `2px solid ${
                      active ? t.accent.primary : t.border.default
                    }`,
                    background: active ? t.accent.primary : "transparent",
                    flexShrink: 0,
                  }}
                />
              </button>
            );
          })}
        </div>

        {/* Actions */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: t.space.sm,
          }}
        >
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default RetentionModal;