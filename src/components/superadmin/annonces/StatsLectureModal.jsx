// src/components/SuperAdmin/annonces/StatsLectureModal.jsx
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useTokens } from "@/theme/tokens";
import { Modal, Button } from "@/components/ui";
import { Loader, User, CheckCircle2, Percent } from "lucide-react";

const ROLE_COLORS = {
  admin: "#EF4444",
  directeur: "#F59E0B",
  enseignant: "#8B5CF6",
  disciplinaire: "#DC2626",
  comptable: "#06B6D4",
  parent: "#3B82F6",
  eleve: "#10B981",
};

export function StatsLectureModal({ userId, annonceId, onClose }) {
  const t = useTokens();
  const data = useQuery(api.annonces.statsLecturesDetail, {
    userId,
    annonceId,
  });

  const isMobile = typeof window !== "undefined" && window.innerWidth < 700;

  return (
    <Modal open onClose={onClose} title="Statistiques de lecture">
      {data === undefined ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
          <Loader
            size={32}
            style={{ animation: "spin 1s linear infinite" }}
            color={t.accent.primary}
          />
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: t.space.md }}>
          {/* Titre annonce */}
          <div
            style={{
              padding: t.space.sm,
              background: `${t.accent.primary}08`,
              border: `1px solid ${t.accent.primary}20`,
              borderRadius: t.radius.sm,
            }}
          >
            <div style={{ fontSize: t.font.size.sm, fontWeight: 700, color: t.text.primary }}>
              {data.annonceTitre}
            </div>
            <div style={{ fontSize: t.font.size.xs, color: t.text.secondary, marginTop: 2 }}>
              Cible :{" "}
              {data.cible === "toutes"
                ? "Toutes les écoles"
                : data.cible === "ecole"
                ? "Une école"
                : "Un rôle"}
            </div>
          </div>

          {/* KPI */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: t.space.sm,
            }}
          >
            <div
              style={{
                padding: t.space.sm,
                background: t.surface.elevated,
                border: `1px solid ${t.border.subtle}`,
                borderRadius: t.radius.sm,
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: t.font.size.xs, color: t.text.muted }}>
                Lectures
              </div>
              <div
                style={{
                  fontSize: t.font.size.xl,
                  fontWeight: 700,
                  color: t.text.primary,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {data.nbLectures}
              </div>
            </div>
            <div
              style={{
                padding: t.space.sm,
                background: t.surface.elevated,
                border: `1px solid ${t.border.subtle}`,
                borderRadius: t.radius.sm,
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: t.font.size.xs, color: t.text.muted }}>
                Cible
              </div>
              <div
                style={{
                  fontSize: t.font.size.xl,
                  fontWeight: 700,
                  color: t.text.primary,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {data.totalCible}
              </div>
            </div>
            <div
              style={{
                padding: t.space.sm,
                background: t.surface.elevated,
                border: `1px solid ${t.border.subtle}`,
                borderRadius: t.radius.sm,
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: t.font.size.xs,
                  color: t.text.muted,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Percent size={10} />
                Taux
              </div>
              <div
                style={{
                  fontSize: t.font.size.xl,
                  fontWeight: 700,
                  color:
                    data.tauxLecture >= 70
                      ? "#10B981"
                      : data.tauxLecture >= 40
                      ? "#F59E0B"
                      : "#EF4444",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {data.tauxLecture.toFixed(0)}%
              </div>
            </div>
          </div>

          {/* Liste lecteurs */}
          <div>
            <div
              style={{
                fontSize: t.font.size.xs,
                fontWeight: 700,
                color: t.text.muted,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                marginBottom: 6,
              }}
            >
              Lecteurs ({data.lecteurs.length})
            </div>

            {data.lecteurs.length === 0 ? (
              <div
                style={{
                  padding: t.space.lg,
                  textAlign: "center",
                  background: t.surface.elevated,
                  border: `1px solid ${t.border.subtle}`,
                  borderRadius: t.radius.sm,
                  color: t.text.secondary,
                  fontSize: t.font.size.sm,
                }}
              >
                Aucune lecture enregistrée.
              </div>
            ) : (
              <div
                style={{
                  maxHeight: isMobile ? 300 : 400,
                  overflowY: "auto",
                  border: `1px solid ${t.border.subtle}`,
                  borderRadius: t.radius.sm,
                  background: t.surface.elevated,
                }}
              >
                {data.lecteurs.map((l, i) => {
                  const roleColor = ROLE_COLORS[l.role] ?? "#64748B";
                  return (
                    <div
                      key={l.userId}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: t.space.sm,
                        padding: `${t.space.sm} ${t.space.md}`,
                        borderTop: i > 0 ? `1px solid ${t.border.subtle}` : "none",
                        fontSize: t.font.size.sm,
                      }}
                    >
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                          background: `${roleColor}15`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <User size={14} color={roleColor} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            color: t.text.primary,
                            fontWeight: 600,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {l.nom}
                        </div>
                        <div
                          style={{
                            fontSize: t.font.size.xs,
                            color: t.text.muted,
                            textTransform: "capitalize",
                          }}
                        >
                          {l.role} · {l.login}
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: t.font.size.xs,
                          color: t.text.muted,
                          textAlign: "right",
                          flexShrink: 0,
                        }}
                      >
                        {l.dateLecture
                          ? new Date(l.dateLecture).toLocaleDateString("fr-FR", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Button onClick={onClose}>Fermer</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export default StatsLectureModal;