import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useStyles } from "../styles/theme";
import { DollarSign, TrendingDown, CheckCircle, Clock } from "lucide-react";
import { Skeleton } from "./Skeleton";

export function FraisEnfant({ eleveId }) {
  const { S } = useStyles();
  const frais = useQuery(api.frais.listByEleve, { eleveId }) ?? [];

  // État de chargement
  if (frais === undefined) {
    return <Skeleton height={200} style={{ marginTop: 16 }} />;
  }

  // Aucun frais
  if (frais.length === 0) {
    return (
      <div style={{
        background: "#FFF",
        borderRadius: 16,
        padding: 24,
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        marginTop: 16,
        textAlign: "center",
      }}>
        <DollarSign size={32} color="#94A3B8" style={{ marginBottom: 8 }} />
        <h3 style={{ fontSize: 16, fontWeight: 600, color: "#1E293B", margin: "0 0 4px" }}>
          Frais scolaires
        </h3>
        <p style={{ color: "#64748B", fontSize: 14, margin: 0 }}>
          Aucune information de frais disponible.
        </p>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
      {frais.map((f) => {
        const reste = f.montantTotal - f.montantPaye;
        const pourcentagePaye = f.montantTotal > 0 ? Math.round((f.montantPaye / f.montantTotal) * 100) : 0;
        const estPaye = reste <= 0;

        return (
          <div
            key={f._id}
            style={{
              background: "#FFF",
              borderRadius: 16,
              padding: 20,
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              transition: "box-shadow 0.15s",
            }}
          >
            {/* En-tête */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}>
              <h3 style={{
                fontSize: 16,
                fontWeight: 600,
                color: "#1E293B",
                margin: 0,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}>
                <DollarSign size={20} color="#4F46E5" />
                Frais scolaires
              </h3>
              {estPaye ? (
                <span style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  background: "#D1FAE5",
                  color: "#065F46",
                  padding: "4px 10px",
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 600,
                }}>
                  <CheckCircle size={14} />
                  Payé
                </span>
              ) : (
                <span style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  background: "#FEF3C7",
                  color: "#92400E",
                  padding: "4px 10px",
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 600,
                }}>
                  <Clock size={14} />
                  En attente
                </span>
              )}
            </div>

            {/* Montants */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ color: "#64748B", fontSize: 14 }}>Montant total</span>
                <span style={{ fontWeight: 600, fontSize: 14, color: "#1E293B" }}>
                  {f.montantTotal.toLocaleString()} FC
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ color: "#64748B", fontSize: 14 }}>Montant payé</span>
                <span style={{ fontWeight: 600, fontSize: 14, color: "#10B981" }}>
                  {f.montantPaye.toLocaleString()} FC
                </span>
              </div>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                paddingTop: 8,
                borderTop: "1px solid #F1F5F9",
              }}>
                <span style={{ fontWeight: 600, fontSize: 14, color: "#1E293B" }}>
                  Reste à payer
                </span>
                <span style={{
                  fontWeight: 700,
                  fontSize: 14,
                  color: reste > 0 ? "#EF4444" : "#10B981",
                }}>
                  {reste.toLocaleString()} FC
                </span>
              </div>
            </div>

            {/* Barre de progression */}
            <div style={{ marginBottom: 8 }}>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 4,
                fontSize: 12,
                color: "#64748B",
              }}>
                <span>Progression</span>
                <span>{pourcentagePaye}%</span>
              </div>
              <div style={{
                width: "100%",
                height: 8,
                background: "#F1F5F9",
                borderRadius: 4,
                overflow: "hidden",
              }}>
                <div style={{
                  width: `${pourcentagePaye}%`,
                  height: "100%",
                  background: estPaye ? "#10B981" : "#4F46E5",
                  borderRadius: 4,
                  transition: "width 0.3s ease",
                }} />
              </div>
            </div>

            {/* Commentaire */}
            {f.commentaire && (
              <div style={{
                fontSize: 13,
                color: "#64748B",
                display: "flex",
                alignItems: "center",
                gap: 4,
                marginTop: 4,
              }}>
                <span>📝</span>
                <span>{f.commentaire}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}