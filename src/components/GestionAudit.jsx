import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile"; // <-- Import du hook
import { Skeleton } from "./Skeleton";

export function GestionAudit({ ecoleId, userId }) {
  const { dark } = useStyles();
  const isMobile = useIsMobile(); // Détection mobile

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

  // Styles adaptatifs
  const containerPadding = isMobile ? "16px 12px" : "24px 16px";
  const titleSize = isMobile ? 22 : 28;
  const subtitleSize = isMobile ? 13 : 14;
  const headerMarginBottom = isMobile ? 20 : 32;
  const emptyStatePadding = isMobile ? 32 : 48;
  const emptyStateFontSize = isMobile ? 15 : 16;
  const cardPadding = isMobile ? "12px 14px" : "16px 20px";
  const cardHeaderFlexDirection = isMobile ? "column" : "row";
  const cardHeaderAlignItems = isMobile ? "stretch" : "center";
  const cardGap = isMobile ? 8 : 12;
  const actionBadgeFontSize = isMobile ? 11 : 12;
  const userInfoFontSize = isMobile ? 14 : 14;
  const detailFontSize = isMobile ? 12 : 13;
  const documentFontSize = isMobile ? 11 : 12;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: containerPadding }}>
      {/* En-tête */}
      <div style={{ marginBottom: headerMarginBottom }}>
        <h2 style={{ fontSize: titleSize, fontWeight: 700, color: textPrimary, margin: 0 }}>
          Journal d’audit
        </h2>
        <p style={{ color: textSecondary, marginTop: 4, fontSize: subtitleSize }}>
          {sortedLogs.length} événement(s)
        </p>
      </div>

      {/* Liste des logs */}
      {sortedLogs.length === 0 ? (
        <div style={{
          background: cardBg,
          borderRadius: 16,
          padding: emptyStatePadding,
          textAlign: "center",
          boxShadow: shadow,
          border: `1px solid ${cardBorder}`,
          color: textSecondary,
        }}>
          <p style={{ fontSize: emptyStateFontSize }}>Aucun événement enregistré.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: cardGap }}>
          {sortedLogs.map((log) => {
            const user = users.find((u) => u._id === log.userId);
            return (
              <div
                key={log._id}
                style={{
                  background: cardBg,
                  borderRadius: 12,
                  padding: cardPadding,
                  boxShadow: shadow,
                  border: `1px solid ${cardBorder}`,
                  transition: "background-color 0.3s",
                }}
              >
                <div style={{
                  display: "flex",
                  flexDirection: cardHeaderFlexDirection,
                  justifyContent: "space-between",
                  alignItems: cardHeaderAlignItems,
                  flexWrap: "wrap",
                  gap: cardGap,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <strong style={{ color: textPrimary, fontSize: userInfoFontSize }}>
                      {user?.nom ?? "Inconnu"}
                    </strong>
                    <span style={{
                      background: dark ? "#312E81" : "#EEF2FF",
                      color: accent,
                      padding: "2px 10px",
                      borderRadius: 20,
                      fontSize: actionBadgeFontSize,
                      fontWeight: 600,
                    }}>
                      {log.action}
                    </span>
                    <span style={{ color: textSecondary, fontSize: actionBadgeFontSize }}>
                      · {log.table}
                    </span>
                  </div>
                  <small style={{ color: textSecondary, fontSize: isMobile ? 11 : 12 }}>
                    {new Date(log.date).toLocaleString()}
                  </small>
                </div>

                {log.details && (
                  <p style={{
                    marginTop: 8,
                    fontSize: detailFontSize,
                    color: textSecondary,
                    lineHeight: 1.4,
                  }}>
                    {log.details}
                  </p>
                )}

                <div style={{ fontSize: documentFontSize, color: dark ? "#64748B" : "#94A3B8", marginTop: 4 }}>
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