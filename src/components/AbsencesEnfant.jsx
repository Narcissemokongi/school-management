import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useStyles } from "../styles/theme";

export function AbsencesEnfant({ eleveId }) {
  const { S } = useStyles();
  const absences = useQuery(api.absences.listByEleve, { eleveId }) ?? [];
  if (absences.length === 0) {
    return (
      <div style={{ ...S.card, marginTop: 16 }}>
        <h3 style={S.h3}>🚫 Absences & Retards</h3>
        <p style={S.muted}>Aucune absence ou retard enregistré.</p>
      </div>
    );
  }
  return (
    <div style={{ ...S.card, marginTop: 16 }}>
      <h3 style={S.h3}>🚫 Absences & Retards</h3>
      {absences.sort((a, b) => new Date(b.date) - new Date(a.date)).map((a) => (
        <div key={a._id} style={{ padding: "8px 0", borderBottom: `1px solid ${S.cardBorder}` }}>
          <div style={S.between}>
            <div>
              <span style={{ fontWeight: 600, color: a.type === "absence" ? "#ef4444" : "#f59e0b" }}>
                {a.type === "absence" ? "Absence" : "Retard"}
              </span>
              <span style={{ marginLeft: 8, fontSize: 13, color: S.textMuted }}>{a.date}</span>
            </div>
          </div>
          {a.commentaire && <div style={{ fontSize: 12, color: S.textMuted, marginTop: 4, fontStyle: "italic" }}>📝 {a.commentaire}</div>}
        </div>
      ))}
    </div>
  );
}