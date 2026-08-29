import { useStyles } from "../styles/theme";
import { ClipboardList, AlertTriangle, Users, Building } from "lucide-react";
import { getFaute, getTopDerangeurs, getPunitionsParClasse } from "../utils";

export function DirecteurDashboard({ punitions, eleves, classes, fautes, notifs }) {
  const { S } = useStyles();
  const top = getTopDerangeurs(punitions, eleves, 3);
  const parClasse = getPunitionsParClasse(punitions, eleves, classes);
  const graves = punitions.filter((p) => getFaute(fautes, p.idFaute)?.gravite === "Grave");
  return (
    <div>
      <div style={{ marginBottom: 20 }}><div style={S.h2}>Vue d'ensemble</div><div style={S.muted}>Situation disciplinaire générale</div></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Total punitions", val: punitions.length, color: "#4f46e5", Icon: ClipboardList },
          { label: "Fautes graves", val: graves.length, color: "#ef4444", Icon: AlertTriangle },
          { label: "Élèves concernés", val: new Set(punitions.map(p => p.idEleve)).size, color: "#f59e0b", Icon: Users },
          { label: "Classes touchées", val: Object.values(parClasse).filter(v => v > 0).length, color: "#10b981", Icon: Building },
        ].map(k => (
          <div key={k.label} style={{ ...S.card, textAlign: "center", padding: "20px 12px" }}>
            <k.Icon size={28} color={k.color} style={{ marginBottom: 6 }} />
            <div style={{ fontSize: 28, fontWeight: 900, color: k.color }}>{k.val}</div>
            <div style={{ fontSize: 12, color: S.textMuted }}>{k.label}</div>
          </div>
        ))}
      </div>
      {notifs.length > 0 && (
        <div style={{ ...S.card, marginBottom: 24 }}>
          <div style={{ fontWeight: 700, color: "#ef4444", marginBottom: 10 }}>🚨 Alertes récentes</div>
          {notifs.slice(-3).map((n, i) => <div key={i} style={{ padding: "8px 0", borderBottom: i < notifs.length - 1 ? `1px solid ${S.cardBorder}` : "none" }}><div style={{ fontSize: 13, color: S.textDim }}>{n}</div></div>)}
        </div>
      )}
      <div style={S.card}>
        <div style={{ fontWeight: 700, marginBottom: 12 }}>🔥 Cerveaux moteurs</div>
        {top.map((t, i) => (
          <div key={i} style={{ ...S.between, padding: "10px 0", borderBottom: i < top.length - 1 ? `1px solid ${S.cardBorder}` : "none" }}>
            <div style={S.row}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: i === 0 ? "#ef4444" : i === 1 ? "#f59e0b" : "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#fff" }}>{i + 1}</div>
              <div><div style={{ fontWeight: 600, fontSize: 14 }}>{t.eleve?.nom} {t.eleve?.postnom}</div><div style={{ fontSize: 12, color: S.textMuted }}>Classe {t.eleve?.classe}</div></div>
            </div>
            <span style={S.badge(i === 0 ? "#ef4444" : "#f59e0b")}>{t.count} faute(s)</span>
          </div>
        ))}
      </div>
    </div>
  );
}