import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useStyles } from "../styles/theme";
import { Skeleton } from "./Skeleton";

export function GestionAudit({ ecoleId, userId }) {
  const { dark } = useStyles(); // ✅ mode sombre/clair

  const logs = useQuery(api.audit.list, { ecoleId, userId }) ?? [];
  const users = useQuery(api.users.listByEcole, { ecoleId }) ?? [];

  // Couleurs adaptatives
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const shadow = dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)";
  const accent = dark ? "#818CF8" : "#4F46E5";

  // Gestion du chargement
  if (logs === undefined || users === undefined) {
    return <Skeleton height={200} />;
  }

  // Tri décroissant
  const sortedLogs = [...logs].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px" }}>
      {/* En-tête */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, color: textPrimary, margin: 0 }}>
          Journal d’audit
        </h2>
        <p style={{ color: textSecondary, marginTop: 4, fontSize: 14 }}>
          {sortedLogs.length} événement(s)
        </p>
      </div>

      {/* Liste des logs */}
      {sortedLogs.length === 0 ? (
        <div style={{
          background: cardBg,
          borderRadius: 16,
          padding: 48,
          textAlign: "center",
          boxShadow: shadow,
          border: `1px solid ${cardBorder}`,
          color: textSecondary,
        }}>
          <p style={{ fontSize: 16 }}>Aucun événement enregistré.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {sortedLogs.map((log) => {
            const user = users.find((u) => u._id === log.userId);
            return (
              <div
                key={log._id}
                style={{
                  background: cardBg,
                  borderRadius: 12,
                  padding: "16px 20px",
                  boxShadow: shadow,
                  border: `1px solid ${cardBorder}`,
                  transition: "background-color 0.3s",
                }}
              >
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 8,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <strong style={{ color: textPrimary }}>
                      {user?.nom ?? "Inconnu"}
                    </strong>
                    <span style={{
                      background: dark ? "#312E81" : "#EEF2FF",
                      color: accent,
                      padding: "2px 10px",
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 600,
                    }}>
                      {log.action}
                    </span>
                    <span style={{ color: textSecondary, fontSize: 13 }}>
                      · {log.table}
                    </span>
                  </div>
                  <small style={{ color: textSecondary, fontSize: 12 }}>
                    {new Date(log.date).toLocaleString()}
                  </small>
                </div>

                {log.details && (
                  <p style={{
                    marginTop: 8,
                    fontSize: 13,
                    color: textSecondary,
                    lineHeight: 1.4,
                  }}>
                    {log.details}
                  </p>
                )}

                <div style={{ fontSize: 12, color: dark ? "#64748B" : "#94A3B8", marginTop: 4 }}>
                  Document : {log.documentId}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}