// src/components/SuperAdmin/ecole/tabs/TimelineTab.jsx
import { useMemo } from "react";
import { useTokens } from "@/theme/tokens";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  CheckCircle2, XCircle, Edit2, Trash2, User, School,
  AlertTriangle, RefreshCw, Ban, Play, Activity,
} from "lucide-react";

const ACTION_ICONS = {
  create_ecole: CheckCircle2,
  delete_ecole: Trash2,
  suspend_ecole: Ban,
  reactivate_ecole: Play,
  create_super_admin: User,
  add_user: User,
  update_user: Edit2,
  delete_user: Trash2,
  approve_user: CheckCircle2,
  reject_user: XCircle,
  update_role: Edit2,
  change_password: AlertTriangle,
  send_to_all_parents: Activity,
  add_ecole_note: Edit2,
  update_ecole_note: Edit2,
  delete_ecole_note: Trash2,
};

const ACTION_LABELS = {
  create_ecole: "École créée",
  delete_ecole: "École supprimée",
  suspend_ecole: "École suspendue",
  reactivate_ecole: "École réactivée",
  create_super_admin: "Super admin créé",
  update_super_admin_permissions: "Permissions super admin modifiées",
  delete_super_admin: "Super admin supprimé",
  add_user: "Utilisateur ajouté",
  update_user: "Utilisateur modifié",
  delete_user: "Utilisateur supprimé",
  approve_user: "Utilisateur approuvé",
  reject_user: "Utilisateur rejeté",
  change_password: "Mot de passe changé",
  update_role: "Rôle modifié",
  send_to_all_parents: "Message à tous les parents",
  add_ecole_note: "Note ajoutée",
  update_ecole_note: "Note modifiée",
  delete_ecole_note: "Note supprimée",
  create_abonnement: "Abonnement créé",
  abonnement_paiement: "Paiement abonnement",
  marquer_paye: "Marqué payé",
  relance_abonnement: "Relance envoyée",
  relance_groupee: "Relance groupée",
  update_audit_retention: "Rétention modifiée",
  purge_audit: "Purge audit",
};

const ACTION_COLORS = {
  create_ecole: "#10B981",
  delete_ecole: "#EF4444",
  suspend_ecole: "#F59E0B",
  reactivate_ecole: "#3B82F6",
  create_super_admin: "#10B981",
  add_user: "#10B981",
  update_user: "#3B82F6",
  delete_user: "#EF4444",
  approve_user: "#10B981",
  reject_user: "#EF4444",
  update_role: "#3B82F6",
  change_password: "#8B5CF6",
  send_to_all_parents: "#06B6D4",
  add_ecole_note: "#8B5CF6",
  update_ecole_note: "#8B5CF6",
  delete_ecole_note: "#EF4444",
  create_abonnement: "#10B981",
  abonnement_paiement: "#10B981",
  marquer_paye: "#10B981",
  relance_abonnement: "#F59E0B",
  relance_groupee: "#F59E0B",
};

function formatMonthYear(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

function formatDayTime(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TimelineTab({ audits }) {
  const t = useTokens();
  const isMobile = useIsMobile();

  // Grouper par mois
  const grouped = useMemo(() => {
    const groups = new Map();
    for (const a of audits) {
      const key = formatMonthYear(a.date);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(a);
    }
    return Array.from(groups.entries());
  }, [audits]);

  if (audits.length === 0) {
    return (
      <div
        style={{
          padding: t.space.xl,
          textAlign: "center",
          background: t.surface.elevated,
          border: `1px solid ${t.border.subtle}`,
          borderRadius: t.radius.lg,
        }}
      >
        <Activity size={40} color={t.text.muted} style={{ marginBottom: 12 }} />
        <p
          style={{
            fontSize: t.font.size.sm,
            color: t.text.secondary,
            margin: 0,
          }}
        >
          Aucun événement enregistré.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: t.space.lg }}>
      {grouped.map(([mois, events]) => (
        <div key={mois}>
          {/* Header mois */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: t.space.sm,
              marginBottom: t.space.md,
            }}
          >
            <div
              style={{
                fontSize: t.font.size.sm,
                fontWeight: 700,
                color: t.text.primary,
                textTransform: "capitalize",
              }}
            >
              {mois}
            </div>
            <div
              style={{
                flex: 1,
                height: 1,
                background: t.border.subtle,
              }}
            />
            <div
              style={{
                fontSize: t.font.size.xs,
                color: t.text.muted,
              }}
            >
              {events.length} événement{events.length > 1 ? "s" : ""}
            </div>
          </div>

          {/* Événements */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 0,
              position: "relative",
              paddingLeft: isMobile ? 24 : 32,
            }}
          >
            {/* Ligne verticale */}
            <div
              style={{
                position: "absolute",
                left: isMobile ? 11 : 15,
                top: 12,
                bottom: 12,
                width: 2,
                background: t.border.subtle,
              }}
            />

            {events.map((event, i) => {
              const Icon = ACTION_ICONS[event.action] ?? Activity;
              const color = ACTION_COLORS[event.action] ?? t.accent.primary;
              const label = ACTION_LABELS[event.action] ?? event.action;

              return (
                <div
                  key={event._id}
                  style={{
                    display: "flex",
                    gap: t.space.sm,
                    paddingBottom: i < events.length - 1 ? t.space.md : 0,
                    alignItems: "flex-start",
                    position: "relative",
                  }}
                >
                  {/* Point */}
                  <div
                    style={{
                      position: "absolute",
                      left: isMobile ? -24 : -32,
                      top: 4,
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: `${color}20`,
                      border: `2px solid ${t.surface.elevated}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      zIndex: 1,
                    }}
                  >
                    <Icon size={12} color={color} />
                  </div>

                  {/* Contenu */}
                  <div
                    style={{
                      flex: 1,
                      minWidth: 0,
                      background: t.surface.elevated,
                      border: `1px solid ${t.border.subtle}`,
                      borderRadius: t.radius.md,
                      padding: t.space.sm,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: t.space.sm,
                        flexWrap: "wrap",
                      }}
                    >
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
                            color: color,
                            background: `${color}15`,
                            padding: "2px 8px",
                            borderRadius: t.radius.full,
                            textTransform: "uppercase",
                            letterSpacing: 0.3,
                          }}
                        >
                          {label}
                        </span>
                        <span
                          style={{
                            fontSize: t.font.size.xs,
                            color: t.text.secondary,
                          }}
                        >
                          par <strong>{event.auteurNom}</strong>
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: t.font.size.xs,
                          color: t.text.muted,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatDayTime(event.date)}
                      </span>
                    </div>
                    {event.details && (
                      <div
                        style={{
                          fontSize: t.font.size.sm,
                          color: t.text.secondary,
                          marginTop: 6,
                          lineHeight: 1.5,
                        }}
                      >
                        {event.details}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default TimelineTab;