import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useStyles } from "../components/ThemeProvider";

export function GestionAudit({ ecoleId, userId }) {
  const { S } = useStyles();
  const logs = useQuery(api.audit.list, { ecoleId, userId }) ?? [];
  const users = useQuery(api.users.listByEcole, { ecoleId }) ?? [];

  return (
    <div>
      <div style={{ marginBottom: 20 }}><div style={S.h2}>Journal d’audit</div><div style={S.muted}>{logs.length} événement(s)</div></div>
      {logs.sort((a, b) => new Date(b.date) - new Date(a.date)).map((log) => {
        const user = users.find((u) => u._id === log.userId);
        return (
          <div key={log._id} style={S.card}>
            <div style={S.between}>
              <div><strong>{user?.nom ?? "Inconnu"}</strong> ({log.action}) – {log.table}</div>
              <small style={S.muted}>{new Date(log.date).toLocaleString()}</small>
            </div>
            {log.details && <p style={{ marginTop: 8, fontSize: 13, color: S.textDim }}>{log.details}</p>}
            <div style={{ fontSize: 12, color: S.textMuted }}>Document : {log.documentId}</div>
          </div>
        );
      })}
    </div>
  );
}