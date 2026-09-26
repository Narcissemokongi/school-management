// src/components/SuperAdmin/sections/HistoriqueRelancesModal.jsx
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useTokens } from "@/theme/tokens";
import { Modal, Button } from "@/components/ui";
import { Loader, Mail, AlertTriangle, AlertCircle, Clock } from "lucide-react";

const TEMPLATE_INFO = {
  amiable: { label: "Amiable", color: "#3B82F6", Icon: Mail },
  ferme: { label: "Ferme", color: "#F59E0B", Icon: AlertTriangle },
  mise_en_demeure: {
    label: "Mise en demeure",
    color: "#EF4444",
    Icon: AlertCircle,
  },
};

export function HistoriqueRelancesModal({ userId, row, onClose }) {
  const t = useTokens();
  const relances = useQuery(api.abonnements.getHistoriqueRelances, {
    userId,
    abonnementId: row.abonnementId,
  });

  return (
    <Modal open onClose={onClose} title={`Historique — ${row.ecoleNom}`}>
      <div style={{ display: "flex", flexDirection: "column", gap: t.space.md }}>
        {relances === undefined ? (
          <div
            style={{ display: "flex", justifyContent: "center", padding: 40 }}
          >
            <Loader
              size={32}
              style={{ animation: "spin 1s linear infinite" }}
              color={t.accent.primary}
            />
          </div>
        ) : relances.length === 0 ? (
          <div
            style={{
              padding: t.space.xl,
              textAlign: "center",
              background: t.surface.elevated,
              border: `1px solid ${t.border.subtle}`,
              borderRadius: t.radius.lg,
            }}
          >
            <Clock size={40} color={t.text.muted} style={{ marginBottom: 12 }} />
            <p
              style={{
                fontSize: t.font.size.sm,
                color: t.text.secondary,
                margin: 0,
              }}
            >
              Aucune relance envoyée pour cette école.
            </p>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: t.space.sm,
                padding: t.space.sm,
                background: `${t.accent.primary}08`,
                border: `1px solid ${t.accent.primary}20`,
                borderRadius: t.radius.sm,
              }}
            >
              <div style={{ textAlign: "center", flex: 1 }}>
                <div
                  style={{ fontSize: t.font.size.xs, color: t.text.secondary }}
                >
                  Total
                </div>
                <div
                  style={{
                    fontSize: t.font.size.lg,
                    fontWeight: 700,
                    color: t.text.primary,
                  }}
                >
                  {relances.length}
                </div>
              </div>
              <div style={{ textAlign: "center", flex: 1 }}>
                <div
                  style={{ fontSize: t.font.size.xs, color: t.text.secondary }}
                >
                  Dernière
                </div>
                <div
                  style={{
                    fontSize: t.font.size.sm,
                    fontWeight: 600,
                    color: t.text.primary,
                  }}
                >
                  {new Date(relances[0].dateEnvoi).toLocaleDateString("fr-FR", {
                    day: "2-digit",
                    month: "short",
                  })}
                </div>
              </div>
            </div>

            {/* Liste */}
            <div
              style={{
                maxHeight: 400,
                overflowY: "auto",
                border: `1px solid ${t.border.subtle}`,
                borderRadius: t.radius.md,
                background: t.surface.elevated,
              }}
            >
              {relances.map((r, i) => {
                const info =
                  TEMPLATE_INFO[r.template] ?? TEMPLATE_INFO.amiable;
                return (
                  <div
                    key={r._id}
                    style={{
                      padding: t.space.sm,
                      borderTop: i > 0 ? `1px solid ${t.border.subtle}` : "none",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: t.space.sm,
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: t.radius.sm,
                        background: `${info.color}20`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <info.Icon size={14} color={info.color} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: info.color,
                            background: `${info.color}15`,
                            padding: "2px 6px",
                            borderRadius: t.radius.full,
                            textTransform: "uppercase",
                          }}
                        >
                          {info.label}
                        </span>
                        <span
                          style={{
                            fontSize: t.font.size.xs,
                            color: t.text.muted,
                          }}
                        >
                          {new Date(r.dateEnvoi).toLocaleDateString("fr-FR", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: t.font.size.xs,
                          color: t.text.primary,
                          marginTop: 4,
                          fontWeight: 600,
                        }}
                      >
                        → {r.destinataireNom} ({r.destinataireEmail})
                      </div>
                      <div
                        style={{
                          fontSize: t.font.size.xs,
                          color: t.text.muted,
                          marginTop: 2,
                        }}
                      >
                        Par {r.envoyeParNom} · Retard {r.joursRetardAuMoment}j
                        · {r.montantDuAuMoment} USD
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button onClick={onClose}>Fermer</Button>
        </div>
      </div>
    </Modal>
  );
}

export default HistoriqueRelancesModal;