// src/components/SuperAdmin/ecole/tabs/OverviewTab.jsx
import { useTokens } from "@/theme/tokens";
import { useIsMobile } from "@/hooks/useIsMobile";
import { Users, GraduationCap, School, TrendingUp } from "lucide-react";

function StatCard({ icon: Icon, label, value, color }) {
  const t = useTokens();
  const c = color ?? t.accent.primary;
  return (
    <div
      style={{
        padding: t.space.md,
        background: t.surface.elevated,
        border: `1px solid ${t.border.subtle}`,
        borderRadius: t.radius.md,
        display: "flex",
        gap: t.space.sm,
        alignItems: "center",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: t.radius.sm,
          background: `${c}15`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={18} color={c} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: t.font.size.xs, color: t.text.secondary }}>
          {label}
        </div>
        <div
          style={{
            fontSize: t.font.size.lg,
            fontWeight: 700,
            color: t.text.primary,
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  const t = useTokens();
  return (
    <div
      style={{
        padding: t.space.lg,
        background: t.surface.elevated,
        border: `1px solid ${t.border.subtle}`,
        borderRadius: t.radius.lg,
      }}
    >
      <h3
        style={{
          fontSize: t.font.size.md,
          fontWeight: 600,
          color: t.text.primary,
          margin: "0 0 12px",
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

export function OverviewTab({ stats, ecole }) {
  const t = useTokens();
  const isMobile = useIsMobile();

  const roleEntries = Object.entries(stats.usersParRole ?? {}).sort(
    (a, b) => b[1] - a[1]
  );
  const classeEntries = Object.entries(stats.elevesParClasse ?? {}).sort(
    (a, b) => b[1] - a[1]
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: t.space.lg }}>
      {/* KPIs */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)",
          gap: t.space.md,
        }}
      >
        <StatCard icon={Users} label="Utilisateurs" value={stats.nbUsers} />
        <StatCard
          icon={GraduationCap}
          label="Élèves"
          value={stats.nbEleves}
          color="#8B5CF6"
        />
        <StatCard
          icon={School}
          label="Classes"
          value={stats.nbClasses}
          color="#F59E0B"
        />
        <StatCard
          icon={TrendingUp}
          label="Dernière activité"
          value={
            stats.derniereConnexion
              ? new Date(stats.derniereConnexion).toLocaleDateString("fr-FR")
              : "—"
          }
          color="#10B981"
        />
      </div>

      {/* Répartition rôles */}
      <Section title="Répartition par rôle">
        {roleEntries.length === 0 ? (
          <p style={{ fontSize: t.font.size.sm, color: t.text.secondary }}>
            Aucun utilisateur.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {roleEntries.map(([role, count]) => (
              <div
                key={role}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "6px 0",
                  fontSize: t.font.size.sm,
                }}
              >
                <span
                  style={{ color: t.text.primary, textTransform: "capitalize" }}
                >
                  {role}
                </span>
                <span style={{ color: t.text.secondary, fontWeight: 600 }}>
                  {count}
                </span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Répartition élèves par classe */}
      <Section title="Élèves par classe">
        {classeEntries.length === 0 ? (
          <p style={{ fontSize: t.font.size.sm, color: t.text.secondary }}>
            Aucun élève enregistré.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {classeEntries.map(([classe, count]) => (
              <div
                key={classe}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "6px 0",
                  fontSize: t.font.size.sm,
                }}
              >
                <span style={{ color: t.text.primary }}>{classe}</span>
                <span style={{ color: t.text.secondary, fontWeight: 600 }}>
                  {count}
                </span>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}