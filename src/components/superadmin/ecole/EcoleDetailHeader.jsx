// src/components/SuperAdmin/ecole/EcoleDetailHeader.jsx
import { useTokens } from "@/theme/tokens";
import { useIsMobile } from "@/hooks/useIsMobile";
import { School, ExternalLink, UserCog } from "lucide-react";

const STATUT_COLORS = {
  active: "#10B981",
  suspendue: "#EF4444",
};

const ABO_COLORS = {
  actif: "#10B981",
  grace: "#F59E0B",
  suspendu: "#EF4444",
  expire: "#64748B",
};

export function EcoleDetailHeader({
  ecole,
  abonnement,
  onSelectEcole,
  onImpersonate, // ✨ NOUVEAU — (ecoleId, ecoleNom) => void
}) {
  const t = useTokens();
  const isMobile = useIsMobile();

  const statutColor = STATUT_COLORS[ecole.statut] ?? "#64748B";
  const aboColor = abonnement
    ? ABO_COLORS[abonnement.statut] ?? "#64748B"
    : "#64748B";

  return (
    <div
      style={{
        padding: t.space.lg,
        background: t.surface.elevated,
        border: `1px solid ${t.border.subtle}`,
        borderRadius: t.radius.lg,
        display: "flex",
        gap: t.space.md,
        alignItems: "flex-start",
        flexWrap: "wrap",
      }}
    >
      {/* Icône école */}
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: t.radius.md,
          background: `${t.accent.primary}15`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <School size={24} color={t.accent.primary} />
      </div>

      {/* Infos */}
      <div style={{ flex: 1, minWidth: 200 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: t.space.sm,
            flexWrap: "wrap",
          }}
        >
          <h1
            style={{
              fontSize: t.font.size.xl,
              fontWeight: 700,
              color: t.text.primary,
              margin: 0,
            }}
          >
            {ecole.nom}
          </h1>

          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: statutColor,
              background: `${statutColor}15`,
              padding: "3px 8px",
              borderRadius: t.radius.full,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            {ecole.statut === "active" ? "Active" : "Suspendue"}
          </span>

          {abonnement && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: aboColor,
                background: `${aboColor}15`,
                padding: "3px 8px",
                borderRadius: t.radius.full,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              Abo : {abonnement.statut}
            </span>
          )}
        </div>

        <div
          style={{
            display: "flex",
            gap: t.space.md,
            marginTop: 6,
            fontSize: t.font.size.sm,
            color: t.text.secondary,
            flexWrap: "wrap",
          }}
        >
          {ecole.code && (
            <span>
              Code : <strong>{ecole.code}</strong>
            </span>
          )}
          <span>
            Devise : <strong>{ecole.devise}</strong>
          </span>
          <span>
            Période : <strong>{ecole.typePeriode}</strong>
          </span>
          <span>
            Créée le{" "}
            <strong>
              {new Date(ecole._creationTime).toLocaleDateString("fr-FR")}
            </strong>
          </span>
        </div>
      </div>

      {/* Actions */}
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          alignItems: "flex-start",
        }}
      >
        {/* ✨ NOUVEAU — Bouton impersonation */}
        {onImpersonate && (
          <button
            type="button"
            onClick={() => onImpersonate(ecole._id, ecole.nom)}
            title="Voir l'application en tant qu'admin de cette école"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              background: "#F59E0B",
              color: "#FFFFFF",
              border: "none",
              borderRadius: t.radius.sm,
              cursor: "pointer",
              fontWeight: 600,
              fontSize: t.font.size.sm,
              fontFamily: t.font.family,
              whiteSpace: "nowrap",
            }}
          >
            <UserCog size={14} />
            {isMobile ? "Impersonner" : "Voir en tant qu'admin"}
          </button>
        )}

        {/* Action "Ouvrir en mode admin" */}
        {onSelectEcole && (
          <button
            type="button"
            onClick={() => onSelectEcole(ecole._id)}
            title="Ouvrir en mode Admin École"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              background: t.accent.primary,
              color: "#FFFFFF",
              border: "none",
              borderRadius: t.radius.sm,
              cursor: "pointer",
              fontWeight: 600,
              fontSize: t.font.size.sm,
              fontFamily: t.font.family,
              whiteSpace: "nowrap",
            }}
          >
            <ExternalLink size={14} />
            {isMobile ? "Ouvrir" : "Ouvrir en mode admin"}
          </button>
        )}
      </div>
    </div>
  );
}

export default EcoleDetailHeader;