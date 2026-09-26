// src/components/SuperAdmin/sections/RelanceGroupModal.jsx
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useTokens } from "@/theme/tokens";
import { Modal, Button } from "@/components/ui";
import toast from "react-hot-toast";
import { Mail, AlertTriangle, AlertCircle, Loader, Send } from "lucide-react";

const TEMPLATES = [
  {
    id: "amiable",
    label: "Amiable",
    description: "Rappel courtois, ton bienveillant",
    color: "#3B82F6",
    Icon: Mail,
  },
  {
    id: "ferme",
    label: "Ferme",
    description: "Relance appuyée, mention des conséquences",
    color: "#F59E0B",
    Icon: AlertTriangle,
  },
  {
    id: "mise_en_demeure",
    label: "Mise en demeure",
    description: "Préavis formel avant suspension",
    color: "#EF4444",
    Icon: AlertCircle,
  },
];

export function RelanceGroupModal({ userId, abonnementIds, ecoles, onClose }) {
  const t = useTokens();
  const [template, setTemplate] = useState("amiable");
  const [sending, setSending] = useState(false);

  const relancerGroupM = useMutation(api.abonnements.relancerImpayeGroup);

  const handleSend = async () => {
    setSending(true);
    try {
      const res = await relancerGroupM({
        userId,
        abonnementIds,
        template,
      });

      if (res.sent > 0) {
        toast.success(`${res.sent} relance(s) envoyée(s)`);
      }
      if (res.sansContact > 0) {
        toast.error(`${res.sansContact} école(s) sans email de contact`);
      }
      if (res.failed > 0) {
        toast.error(`${res.failed} échec(s)`);
      }

      onClose();
    } catch (err) {
      toast.error("Erreur : " + (err?.message ?? "inconnue"));
      setSending(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Relance groupée">
      <div style={{ display: "flex", flexDirection: "column", gap: t.space.md }}>
        {/* Résumé */}
        <div
          style={{
            padding: t.space.sm,
            background: `${t.accent.primary}08`,
            border: `1px solid ${t.accent.primary}20`,
            borderRadius: t.radius.sm,
            fontSize: t.font.size.sm,
            color: t.text.primary,
          }}
        >
          <strong>{abonnementIds.length}</strong> école(s) sélectionnée(s)
          {ecoles && ecoles.length > 0 && (
            <div
              style={{
                marginTop: 6,
                fontSize: t.font.size.xs,
                color: t.text.secondary,
              }}
            >
              {ecoles.slice(0, 3).join(", ")}
              {ecoles.length > 3 && ` +${ecoles.length - 3} autres`}
            </div>
          )}
        </div>

        {/* Choix template */}
        <div>
          <div
            style={{
              fontSize: t.font.size.sm,
              fontWeight: 600,
              color: t.text.primary,
              marginBottom: 8,
            }}
          >
            Choisir le type de relance
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {TEMPLATES.map((tpl) => {
              const active = template === tpl.id;
              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => setTemplate(tpl.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: t.space.sm,
                    padding: t.space.sm,
                    background: active ? `${tpl.color}15` : t.surface.elevated,
                    border: `1px solid ${active ? tpl.color : t.border.default}`,
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
                      background: `${tpl.color}20`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <tpl.Icon size={16} color={tpl.color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: t.font.size.sm,
                        fontWeight: 700,
                        color: t.text.primary,
                      }}
                    >
                      {tpl.label}
                    </div>
                    <div
                      style={{
                        fontSize: t.font.size.xs,
                        color: t.text.secondary,
                      }}
                    >
                      {tpl.description}
                    </div>
                  </div>
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                      border: `2px solid ${active ? tpl.color : t.border.default}`,
                      background: active ? tpl.color : "transparent",
                      flexShrink: 0,
                    }}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: t.space.sm,
          }}
        >
          <Button variant="ghost" onClick={onClose} disabled={sending}>
            Annuler
          </Button>
          <Button onClick={handleSend} disabled={sending}>
            {sending ? (
              <>
                <Loader size={14} style={{ animation: "spin 1s linear infinite" }} />
                Envoi en cours…
              </>
            ) : (
              <>
                <Send size={14} />
                Envoyer {abonnementIds.length} relance(s)
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default RelanceGroupModal;