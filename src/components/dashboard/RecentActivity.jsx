import { Clock, AlertTriangle } from "lucide-react";

export function RecentActivity({ dernierEleve, dernierePunition, fautes, eleves }) {
  const fauteDerniere = dernierePunition ? fautes.find(f => f._id === dernierePunition.idFaute) : null;
  const eleveDernierePunition = dernierePunition ? eleves.find(e => e._id === dernierePunition.idEleve) : null;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
      <div style={{ background: "#FFF", borderRadius: 16, padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <Clock size={20} /> Dernier élève ajouté
        </h3>
        {dernierEleve ? (
          <div>
            <strong>{dernierEleve.nom} {dernierEleve.postnom}</strong>
            <div style={{ color: "#64748B", fontSize: 14 }}>Classe {dernierEleve.classe}</div>
          </div>
        ) : (
          <p style={{ color: "#94A3B8" }}>Aucun élève</p>
        )}
      </div>
      <div style={{ background: "#FFF", borderRadius: 16, padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <AlertTriangle size={20} /> Dernière punition
        </h3>
        {dernierePunition ? (
          <div>
            <strong>{eleveDernierePunition?.nom} {eleveDernierePunition?.postnom}</strong>
            <div style={{ fontSize: 14, color: "#64748B" }}>
              {fauteDerniere?.libelle} ({fauteDerniere?.gravite})
            </div>
            <div style={{ fontSize: 13, marginTop: 4 }}>
              Sanction : {dernierePunition.sanction} – {dernierePunition.date}
            </div>
          </div>
        ) : (
          <p style={{ color: "#94A3B8" }}>Aucune punition</p>
        )}
      </div>
    </div>
  );
}