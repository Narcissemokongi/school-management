// src/components/SuperAdmin/ecole/tabs/AbonnementTab.jsx
import { useTokens } from "@/theme/tokens";
import { AlertTriangle } from "lucide-react";

const formatEUR = (n) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n || 0);

const formatDate = (s) => {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString("fr-FR");
  } catch {
    return s;
  }
};

function Field({ label, value }) {
  const t = useTokens();
  return (
    <div>
      <div
        style={{
          fontSize: t.font.size.xs,
          color: t.text.muted,
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      <div style={{ color: t.text.primary, fontWeight: 500 }}>{value}</div>
    </div>
  );
}

export function AbonnementTab({ abonnement, paiements }) {
  const t = useTokens();

  if (!abonnement) {
    return (
      <div
        style={{
          padding: t.space.xl,
          background: t.surface.elevated,
          border: `1px solid ${t.border.subtle}`,
          borderRadius: t.radius.lg,
          textAlign: "center",
        }}
      >
        <AlertTriangle size={40} color="#F59E0B" style={{ marginBottom: 12 }} />
        <p
          style={{
            fontSize: t.font.size.sm,
            color: t.text.secondary,
            margin: 0,
          }}
        >
          Aucun abonnement configuré pour cette école.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: t.space.lg }}>
      {/* Détails abonnement */}
      <div
        style={{
          padding: t.space.lg,
          background: t.surface.elevated,
          border: `1px solid ${t.border.subtle}`,
          borderRadius: t.radius.lg,
        }}
      >
        <h3
          style={{
            fontSize: t.font.size.md,
            fontWeight: 600,
            color: t.text.primary,
            margin: "0 0 12px",
          }}
        >
          Détails de l'abonnement
        </h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: t.space.md,
            fontSize: t.font.size.sm,
          }}
        >
          <Field label="Formule" value={abonnement.formule} />
          <Field
            label="Montant mensuel"
            value={formatEUR(abonnement.montantMensuel)}
          />
          <Field label="Statut" value={abonnement.statut} />
          <Field
            label="Utilisateurs inclus"
            value={abonnement.nombreUtilisateurs}
          />
          <Field label="Date début" value={formatDate(abonnement.dateDebut)} />
          <Field
            label="Date expiration"
            value={formatDate(abonnement.dateExpiration)}
          />
          <Field
            label="Prochaine échéance"
            value={formatDate(abonnement.prochaineEcheance)}
          />
          <Field
            label="Délai de grâce"
            value={`${abonnement.delaiGraceJours} jours`}
          />
        </div>
        {abonnement.notes && (
          <div style={{ marginTop: t.space.md }}>
            <Field label="Notes" value={abonnement.notes} />
          </div>
        )}
      </div>

      {/* Historique paiements */}
      <div
        style={{
          padding: t.space.lg,
          background: t.surface.elevated,
          border: `1px solid ${t.border.subtle}`,
          borderRadius: t.radius.lg,
        }}
      >
        <h3
          style={{
            fontSize: t.font.size.md,
            fontWeight: 600,
            color: t.text.primary,
            margin: "0 0 12px",
          }}
        >
          Historique des paiements ({paiements.length})
        </h3>
        {paiements.length === 0 ? (
          <p style={{ fontSize: t.font.size.sm, color: t.text.secondary }}>
            Aucun paiement enregistré.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {paiements.map((p, i) => (
              <div
                key={p._id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr 1fr",
                  gap: t.space.sm,
                  padding: "8px 0",
                  borderTop: i > 0 ? `1px solid ${t.border.subtle}` : "none",
                  fontSize: t.font.size.sm,
                  alignItems: "center",
                }}
              >
                <span style={{ color: t.text.primary, fontWeight: 600 }}>
                  {formatEUR(p.montant)} {p.devise}
                </span>
                <span style={{ color: t.text.secondary }}>
                  {formatDate(p.datePaiement)}
                </span>
                <span style={{ color: t.text.secondary }}>
                  {p.methodePaiement || "—"}
                </span>
                <span
                  style={{ color: t.text.muted, fontSize: t.font.size.xs }}
                >
                  {p.reference || ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}