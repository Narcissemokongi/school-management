import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  DollarSign, CheckCircle, Clock, StickyNote, Loader, Wallet,
} from "lucide-react";
import { Skeleton } from "./Skeleton";

// ============================================================
// FORMATAGE DES MONTANTS
// ============================================================
function formatMontant(value, devise) {
  if (value == null) return "—";
  const num = Number(value);
  if (isNaN(num)) return "—";

  const options = {
    minimumFractionDigits: devise === "USD" ? 2 : 0,
    maximumFractionDigits: devise === "USD" ? 2 : 0,
  };
  try {
    return num.toLocaleString("fr-FR", options);
  } catch {
    return num.toString();
  }
}

// ============================================================
// CARTE DE FRAIS INDIVIDUELLE
// ============================================================
function FraisCard({ frais, devise, dark, isMobile, showTitle = true }) {
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const shadow = dark
    ? "0 1px 2px rgba(0,0,0,0.25)"
    : "0 1px 2px rgba(0,0,0,0.04)";
  const accent = dark ? "#818CF8" : "#4F46E5";
  const success = dark ? "#34D399" : "#10B981";
  const danger = dark ? "#F87171" : "#EF4444";
  const badgePayeBg = dark ? "#064E3B" : "#D1FAE5";
  const badgePayeText = dark ? "#34D399" : "#065F46";
  const badgeAttenteBg = dark ? "#78350F" : "#FEF3C7";
  const badgeAttenteText = dark ? "#FBBF24" : "#92400E";
  const progressBg = dark ? "#334155" : "#F1F5F9";
  const divider = dark ? "#334155" : "#F1F5F9";

  const reste = frais.montantTotal - frais.montantPaye;
  const pourcentagePaye =
    frais.montantTotal > 0
      ? Math.round((frais.montantPaye / frais.montantTotal) * 100)
      : 0;
  const estPaye = reste <= 0;

  return (
    <div
      style={{
        background: cardBg,
        borderRadius: 12,
        padding: isMobile ? "12px 14px" : "14px 16px",
        boxShadow: shadow,
        border: `1px solid ${cardBorder}`,
      }}
    >
      {/* En-tête : titre (optionnel) + badge */}
      {(showTitle || estPaye != null) && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
            gap: 8,
          }}
        >
          {showTitle ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: isMobile ? 13.5 : 14,
                fontWeight: 700,
                color: textPrimary,
              }}
            >
              <Wallet size={15} color={accent} />
              Frais scolaires
            </div>
          ) : (
            <div />
          )}
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              background: estPaye ? badgePayeBg : badgeAttenteBg,
              color: estPaye ? badgePayeText : badgeAttenteText,
              padding: "3px 10px",
              borderRadius: 12,
              fontSize: 10.5,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {estPaye ? <CheckCircle size={11} /> : <Clock size={11} />}
            {estPaye ? "Payé" : "En attente"}
          </span>
        </div>
      )}

      {/* Montants */}
      <div style={{ marginBottom: 12 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 6,
          }}
        >
          <span
            style={{
              color: textSecondary,
              fontSize: isMobile ? 12.5 : 13,
            }}
          >
            Montant total
          </span>
          <span
            style={{
              fontWeight: 600,
              fontSize: isMobile ? 13 : 13.5,
              color: textPrimary,
            }}
          >
            {formatMontant(frais.montantTotal, devise)} {devise}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 6,
          }}
        >
          <span
            style={{
              color: textSecondary,
              fontSize: isMobile ? 12.5 : 13,
            }}
          >
            Montant payé
          </span>
          <span
            style={{
              fontWeight: 600,
              fontSize: isMobile ? 13 : 13.5,
              color: success,
            }}
          >
            {formatMontant(frais.montantPaye, devise)} {devise}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            paddingTop: 8,
            borderTop: `1px solid ${divider}`,
          }}
        >
          <span
            style={{
              fontWeight: 600,
              fontSize: isMobile ? 13 : 13.5,
              color: textPrimary,
            }}
          >
            Reste à payer
          </span>
          <span
            style={{
              fontWeight: 700,
              fontSize: isMobile ? 14 : 14.5,
              color: reste > 0 ? danger : success,
            }}
          >
            {formatMontant(reste, devise)} {devise}
          </span>
        </div>
      </div>

      {/* Barre de progression */}
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 5,
            fontSize: 11,
            color: textSecondary,
            fontWeight: 500,
          }}
        >
          <span>Progression</span>
          <span style={{ color: estPaye ? success : accent, fontWeight: 700 }}>
            {pourcentagePaye}%
          </span>
        </div>
        <div
          style={{
            width: "100%",
            height: 6,
            background: progressBg,
            borderRadius: 3,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${pourcentagePaye}%`,
              height: "100%",
              background: estPaye ? success : accent,
              borderRadius: 3,
              transition: "width 0.3s ease",
            }}
          />
        </div>
      </div>

      {/* Commentaire */}
      {frais.commentaire && (
        <div
          style={{
            fontSize: isMobile ? 11.5 : 12,
            color: textSecondary,
            display: "flex",
            alignItems: "flex-start",
            gap: 6,
            marginTop: 10,
            paddingTop: 10,
            borderTop: `1px solid ${divider}`,
            lineHeight: 1.4,
          }}
        >
          <StickyNote size={13} style={{ marginTop: 1, flexShrink: 0 }} />
          <span>{frais.commentaire}</span>
        </div>
      )}
    </div>
  );
}

// ============================================================
// RÉSUMÉ GLOBAL (quand plusieurs frais)
// ============================================================
function FraisResume({ fraisList, devise, dark, isMobile }) {
  const totalDu = fraisList.reduce((s, f) => s + f.montantTotal, 0);
  const totalPaye = fraisList.reduce((s, f) => s + f.montantPaye, 0);
  const reste = totalDu - totalPaye;

  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const success = dark ? "#34D399" : "#10B981";
  const danger = dark ? "#F87171" : "#EF4444";

  return (
    <div
      style={{
        background: cardBg,
        borderRadius: 14,
        border: `1px solid ${cardBorder}`,
        padding: isMobile ? "12px 14px" : "14px 16px",
        boxShadow: dark
          ? "0 1px 3px rgba(0,0,0,0.3)"
          : "0 1px 3px rgba(0,0,0,0.05)",
      }}
    >
      <div
        style={{
          fontSize: 11.5,
          fontWeight: 700,
          color: textSecondary,
          textTransform: "uppercase",
          letterSpacing: 0.3,
          marginBottom: 10,
        }}
      >
        Résumé global
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 8,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 10.5,
              color: textSecondary,
              marginBottom: 2,
            }}
          >
            Total dû
          </div>
          <div
            style={{
              fontSize: isMobile ? 13 : 14,
              fontWeight: 700,
              color: textPrimary,
            }}
          >
            {formatMontant(totalDu, devise)}
          </div>
        </div>
        <div>
          <div
            style={{
              fontSize: 10.5,
              color: textSecondary,
              marginBottom: 2,
            }}
          >
            Payé
          </div>
          <div
            style={{
              fontSize: isMobile ? 13 : 14,
              fontWeight: 700,
              color: success,
            }}
          >
            {formatMontant(totalPaye, devise)}
          </div>
        </div>
        <div>
          <div
            style={{
              fontSize: 10.5,
              color: textSecondary,
              marginBottom: 2,
            }}
          >
            Reste
          </div>
          <div
            style={{
              fontSize: isMobile ? 13 : 14,
              fontWeight: 700,
              color: reste > 0 ? danger : success,
            }}
          >
            {formatMontant(reste, devise)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// KEYFRAMES (injectés dans toutes les branches)
// ============================================================
const Keyframes = (
  <style>{`
    @keyframes fe-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .fe-spin { animation: fe-spin 1s linear infinite; }
    @media (prefers-reduced-motion: reduce) {
      .fe-spin { animation: none !important; }
    }
  `}</style>
);

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================
export function FraisEnfant({ eleveId, user }) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();

  const userId = user?._id;

  // ✅ userId ajouté sur les 3 queries + garde stricte
  const fraisRaw = useQuery(
    api.frais.listByEleve,
    eleveId && userId ? { eleveId, userId } : "skip"
  );

  // ⚠️ Vérifier signature backend : `id` ou `eleveId` ?
  const eleve = useQuery(
    api.eleves.get,
    eleveId && userId ? { id: eleveId, userId } : "skip"
  );

  const ecole = useQuery(
    api.ecoles.get,
    eleve?.ecoleId && userId
      ? { ecoleId: eleve.ecoleId, userId }
      : "skip"
  );

  // Couleurs
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const accent = dark ? "#818CF8" : "#4F46E5";
  const shadow = dark
    ? "0 1px 3px rgba(0,0,0,0.3)"
    : "0 1px 3px rgba(0,0,0,0.05)";

  const fraisList = useMemo(() => fraisRaw ?? [], [fraisRaw]);

  // ==================== CHARGEMENT ====================
  if (eleve === undefined || (eleve && ecole === undefined)) {
    return (
      <>
        {Keyframes}
        <Skeleton height={200} style={{ marginTop: 16 }} />
      </>
    );
  }

  // ==================== ÉLÈVE INTROUVABLE ====================
  if (eleve === null) {
    return (
      <>
        {Keyframes}
        <div
          style={{
            background: cardBg,
            borderRadius: 16,
            padding: isMobile ? 24 : 32,
            boxShadow: shadow,
            marginTop: 16,
            textAlign: "center",
            border: `1px solid ${cardBorder}`,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: dark ? "#334155" : "#F1F5F9",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 12px",
            }}
          >
            <DollarSign size={26} color={textSecondary} />
          </div>
          <p
            style={{
              color: textPrimary,
              fontSize: 14,
              fontWeight: 600,
              margin: 0,
            }}
          >
            Élève introuvable
          </p>
          <p
            style={{
              color: textSecondary,
              fontSize: 12.5,
              margin: "4px 0 0",
            }}
          >
            Impossible de charger les informations de frais
          </p>
        </div>
      </>
    );
  }

  // ==================== CHARGEMENT DES FRAIS ====================
  if (fraisRaw === undefined) {
    return (
      <>
        {Keyframes}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: 40,
          }}
        >
          <Loader
            size={26}
            className="fe-spin"
            style={{ color: accent }}
          />
        </div>
      </>
    );
  }

  // ==================== AUCUN FRAIS ====================
  if (fraisList.length === 0) {
    return (
      <>
        {Keyframes}
        <div
          style={{
            background: cardBg,
            borderRadius: 16,
            padding: isMobile ? 24 : 32,
            boxShadow: shadow,
            marginTop: 16,
            textAlign: "center",
            border: `1px solid ${cardBorder}`,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: dark ? "#334155" : "#F1F5F9",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 12px",
            }}
          >
            <DollarSign size={26} color={textSecondary} />
          </div>
          <p
            style={{
              color: textPrimary,
              fontSize: 14,
              fontWeight: 600,
              margin: 0,
            }}
          >
            Aucune information de frais
          </p>
          <p
            style={{
              color: textSecondary,
              fontSize: 12.5,
              margin: "4px 0 0",
              maxWidth: 320,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            Les frais scolaires de cet élève n'ont pas encore été enregistrés
          </p>
        </div>
      </>
    );
  }

  // ==================== DONNÉES ====================
  const deviseCode = ecole?.devise || "CDF";
  const devise = deviseCode === "USD" ? "$" : "FC";
  const hasMultiple = fraisList.length > 1;

  // ==================== RENDU ====================
  return (
    <>
      {Keyframes}
      <div
        style={{
          marginTop: isMobile ? 12 : 16,
          display: "grid",
          gap: isMobile ? 8 : 12,
        }}
      >
        {hasMultiple && (
          <FraisResume
            fraisList={fraisList}
            devise={devise}
            dark={dark}
            isMobile={isMobile}
          />
        )}

        {fraisList.map((f, idx) => (
          <FraisCard
            key={f._id}
            frais={f}
            devise={devise}
            dark={dark}
            isMobile={isMobile}
            showTitle={!hasMultiple && idx === 0}
          />
        ))}
      </div>
    </>
  );
}