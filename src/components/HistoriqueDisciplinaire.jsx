import { useStyles } from "../styles/theme";
import { getEleve, getFaute } from "../utils";

export function HistoriqueDisciplinaire({ punitions, eleves, fautes, user }) {
  const { S } = useStyles();
  const myPunitions = punitions.filter((p) => p.disciplinaire === user.nom).sort((a, b) => new Date(b.date) - new Date(a.date));
  return (
    <div>
      <div style={{ marginBottom: 20 }}><div style={S.h2}>Mon historique</div><div style={S.muted}>{myPunitions.length} punition(s) enregistrée(s)</div></div>
      {myPunitions.map((p) => {
        const el = getEleve(eleves, p.idEleve); const faute = getFaute(fautes, p.idFaute);
        return (
          <div key={p._id} style={S.card}>
            <div style={S.between}>
              <div style={S.h3}>{el?.nom} {el?.postnom}</div>
              <span style={S.badge(faute?.gravite === "Grave" ? "#ef4444" : "#f59e0b")}>{faute?.gravite}</span>
            </div>
            <div style={{ ...S.muted, marginBottom: 8 }}>Classe {el?.classe} • {p.date}</div>
            <div style={{ fontSize: 14, color: S.textDim, marginBottom: 6 }}>📌 {faute?.libelle}</div>
            <div style={{ fontSize: 13, color: S.textMuted }}>⚖️ {p.sanction}</div>
            {p.commentaire && <div style={{ fontSize: 12, color: S.textMuted, marginTop: 6, fontStyle: "italic" }}>"{p.commentaire}"</div>}
          </div>
        );
      })}
      {myPunitions.length === 0 && <div style={{ textAlign: "center", padding: 40, color: S.textMuted }}>Aucune punition enregistrée</div>}
    </div>
  );
}