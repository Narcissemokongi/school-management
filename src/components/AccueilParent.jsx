import { useStyles } from "../components/ThemeProvider";
import { Users, ClipboardList } from "lucide-react";

export function AccueilParent({ user, eleves, punitions }) {
  const { S } = useStyles();
  const totalPunitions = eleves.reduce((acc, e) => acc + punitions.filter(p => p.idEleve === e._id).length, 0);
  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={S.h2}>👋 Bienvenue, {user.nom}</h2>
        <p style={S.muted}>Résumé concernant vos enfants.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
        <div style={{ ...S.card, textAlign: "center" }}>
          <Users size={32} color="#4f46e5" />
          <div style={{ fontSize: 28, fontWeight: 900, color: "#4f46e5" }}>{eleves.length}</div>
          <div style={S.muted}>Enfants suivis</div>
        </div>
        <div style={{ ...S.card, textAlign: "center" }}>
          <ClipboardList size={32} color="#f59e0b" />
          <div style={{ fontSize: 28, fontWeight: 900, color: "#f59e0b" }}>{totalPunitions}</div>
          <div style={S.muted}>Total punitions</div>
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <h3 style={S.h3}>Mes enfants</h3>
        {eleves.map(e => (
          <div key={e._id} style={{ ...S.card, marginTop: 8 }}>
            <div style={S.between}>
              <div>
                <div style={{ fontWeight: 600 }}>{e.nom} {e.postnom}</div>
                <div style={S.muted}>Classe {e.classe} · {punitions.filter(p => p.idEleve === e._id).length} punition(s)</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}