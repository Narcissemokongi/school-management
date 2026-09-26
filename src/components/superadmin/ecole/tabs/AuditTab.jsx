// src/components/SuperAdmin/ecole/tabs/AuditTab.jsx
import { useTokens } from "@/theme/tokens";
import { Activity } from "lucide-react";

const formatDate = (s) => {
  if (!s) return "—";
  try {
    const d = new Date(s);
    return d.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return s;
  }
};

const ACTION_COLORS = {
  creation: "#10B981",
  modification: "#3B82F6",
  suppression: "#EF4444",
  activation: "#10B981",
  desactivation: "#F59E0B",
};

export function AuditTab({ audits }) {
  const t = useTokens();

  if (audits.length === 0) {
    return (
      <div
        style={{
          padding: t.space.xl,
          background: t.surface.elevated,
          border: `1px solid ${t.border.subtle}`,
          borderRadius: t.radius.lg,
          textAlign: "center",
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
          Aucune activité enregistrée pour cette école.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        background: t.surface.elevated,
        border: `1px solid ${t.border.subtle}`,
        borderRadius: t.radius.lg,
        overflow: "hidden",
      }}
    >
      {audits.map((a, i) => {
        const color = ACTION_COLORS[a.action] ?? "#64748B";
        return (
          <div
            key={a._id}
            style={{
              display: "flex",
              gap: t.space.md,
              padding: t.space.md,
              borderTop: i > 0 ? `1px solid ${t.border.subtle}` : "none",
              alignItems: "flex-start",
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: color,
                marginTop: 6,
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  gap: t.space.sm,
                  alignItems: "center",
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
                    letterSpacing: 0.5,
                  }}
                >
                  {a.action}
                </span>
                <span
                  style={{
                    fontSize: t.font.size.sm,
                    color: t.text.secondary,
                  }}
                >
                  par{" "}
                  <strong style={{ color: t.text.primary }}>
                    {a.auteurNom}
                  </strong>
                </span>
                <span
                  style={{
                    fontSize: t.font.size.xs,
                    color: t.text.muted,
                    marginLeft: "auto",
                  }}
                >
                  {formatDate(a.date)}
                </span>
              </div>
              <div
                style={{
                  fontSize: t.font.size.sm,
                  color: t.text.secondary,
                  marginTop: 4,
                }}
              >
                {a.details}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}