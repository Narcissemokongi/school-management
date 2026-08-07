import { useStyles } from "../components/ThemeProvider";
import { Users, Building, Zap, Scale, Shield, DollarSign } from "lucide-react";


export function AccueilAdmin({ eleves, classes, fautes, sanctions, users, frais }) {
  const { S } = useStyles();
  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={S.h2}>👋 Bienvenue, Administrateur</h2>
        <p style={S.muted}>Aperçu de votre école.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
        <div style={{ ...S.card, textAlign: "center" }}>
          <Users size={32} color="#4f46e5" />
          <div style={{ fontSize: 28, fontWeight: 900, color: "#4f46e5" }}>{eleves.length}</div>
          <div style={S.muted}>Élèves</div>
        </div>
        <div style={{ ...S.card, textAlign: "center" }}>
          <Building size={32} color="#10b981" />
          <div style={{ fontSize: 28, fontWeight: 900, color: "#10b981" }}>{classes.length}</div>
          <div style={S.muted}>Classes</div>
        </div>
        <div style={{ ...S.card, textAlign: "center" }}>
          <Zap size={32} color="#f59e0b" />
          <div style={{ fontSize: 28, fontWeight: 900, color: "#f59e0b" }}>{fautes.length}</div>
          <div style={S.muted}>Types de fautes</div>
        </div>
        <div style={{ ...S.card, textAlign: "center" }}>
          <Scale size={32} color="#ef4444" />
          <div style={{ fontSize: 28, fontWeight: 900, color: "#ef4444" }}>{sanctions.length}</div>
          <div style={S.muted}>Sanctions</div>
        </div>
        <div style={{ ...S.card, textAlign: "center" }}>
          <Shield size={32} color="#6366f1" />
          <div style={{ fontSize: 28, fontWeight: 900, color: "#6366f1" }}>{users.length}</div>
          <div style={S.muted}>Utilisateurs</div>
        </div>
        <div style={{ ...S.card, textAlign: "center" }}>
          <DollarSign size={32} color="#10b981" />
          <div style={{ fontSize: 28, fontWeight: 900, color: "#10b981" }}>{frais.length}</div>
          <div style={S.muted}>Élèves avec frais</div>
        </div>
      </div>
    </div>
  );
}