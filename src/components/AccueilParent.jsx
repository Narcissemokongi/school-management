import { useStyles } from "../styles/theme";
import { Users, ClipboardList, ArrowRight, AlertTriangle } from "lucide-react";

export function AccueilParent({ user, eleves, punitions }) {
  const { S, dark } = useStyles(); // ✅ mode sombre/clair

  const totalPunitions = eleves.reduce(
    (acc, e) => acc + punitions.filter((p) => p.idEleve === e._id).length,
    0
  );

  // Couleurs adaptatives
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const accent = dark ? "#818CF8" : "#4F46E5";
  const warning = dark ? "#FBBF24" : "#F59E0B";
  const shadow = dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)";

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "24px 16px" }}>
      {/* En-tête */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, color: textPrimary, margin: 0 }}>
          👋 Bienvenue, {user.nom}
        </h2>
        <p style={{ color: textSecondary, marginTop: 4, fontSize: 14 }}>
          Résumé concernant vos enfants.
        </p>
      </div>

      {/* Cartes statistiques */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
        <div style={{
          background: cardBg,
          borderRadius: 16,
          padding: 20,
          textAlign: "center",
          boxShadow: shadow,
          border: `1px solid ${cardBorder}`,
          transition: "background-color 0.3s",
        }}>
          <Users size={32} color={accent} />
          <div style={{ fontSize: 28, fontWeight: 900, color: accent, marginTop: 8 }}>{eleves.length}</div>
          <div style={{ color: textSecondary, fontSize: 14, marginTop: 4 }}>Enfants suivis</div>
        </div>
        <div style={{
          background: cardBg,
          borderRadius: 16,
          padding: 20,
          textAlign: "center",
          boxShadow: shadow,
          border: `1px solid ${cardBorder}`,
          transition: "background-color 0.3s",
        }}>
          <ClipboardList size={32} color={warning} />
          <div style={{ fontSize: 28, fontWeight: 900, color: warning, marginTop: 8 }}>{totalPunitions}</div>
          <div style={{ color: textSecondary, fontSize: 14, marginTop: 4 }}>Total punitions</div>
        </div>
      </div>

      {/* Liste des enfants */}
      <div>
        <h3 style={{ fontSize: 20, fontWeight: 600, color: textPrimary, marginBottom: 16 }}>
          Mes enfants
        </h3>
        {eleves.length === 0 ? (
          <div style={{
            background: cardBg,
            borderRadius: 16,
            padding: 48,
            textAlign: "center",
            boxShadow: shadow,
            border: `1px solid ${cardBorder}`,
            color: textSecondary,
          }}>
            <Users size={48} color={dark ? "#334155" : "#94A3B8"} style={{ marginBottom: 12 }} />
            <p style={{ margin: 0 }}>Aucun enfant enregistré.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {eleves.map((e) => {
              const nbPunitions = punitions.filter((p) => p.idEleve === e._id).length;
              return (
                <div
                  key={e._id}
                  style={{
                    background: cardBg,
                    borderRadius: 12,
                    padding: "16px 20px",
                    boxShadow: shadow,
                    border: `1px solid ${cardBorder}`,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    transition: "background-color 0.3s",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 16, color: textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {e.nom} {e.postnom} {e.prenom && <span style={{ fontWeight: 400, color: textSecondary }}>{e.prenom}</span>}
                    </div>
                    <div style={{ color: textSecondary, fontSize: 13, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      Classe {e.classe}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginLeft: 8, flexShrink: 0 }}>
                    {nbPunitions > 0 && (
                      <span style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        background: nbPunitions > 0 ? (dark ? "#78350F" : "#FEF3C7") : "transparent",
                        color: nbPunitions > 0 ? (dark ? "#FBBF24" : "#92400E") : textSecondary,
                        padding: "2px 8px",
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: 600,
                      }}>
                        <AlertTriangle size={14} />
                        {nbPunitions} punition{nbPunitions > 1 ? "s" : ""}
                      </span>
                    )}
                    <ArrowRight size={18} color={accent} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}