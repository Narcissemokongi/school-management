import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  DollarSign, TrendingUp, CheckCircle, Clock,
  BarChart3, School, Loader, Users,
} from "lucide-react";

// ============================================================
// KEYFRAMES (injectés dans toutes les branches)
// ============================================================
const Keyframes = (
  <style>{`
    @keyframes dc-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .dc-spin { animation: dc-spin 1s linear infinite; }
    @media (prefers-reduced-motion: reduce) {
      .dc-spin { animation: none !important; }
    }
  `}</style>
);

// ============================================================
// FORMATAGE MONTANT
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
// CARTE STATISTIQUE COMPACTE
// ============================================================
function StatCard({ icon, label, value, color, dark, isMobile }) {
  return (
    <div
      style={{
        background: dark ? "#1E293B" : "#FFFFFF",
        borderRadius: 12,
        padding: isMobile ? "10px 12px" : "14px 16px",
        boxShadow: dark
          ? "0 1px 2px rgba(0,0,0,0.25)"
          : "0 1px 2px rgba(0,0,0,0.04)",
        border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
        display: "flex",
        alignItems: "center",
        gap: 10,
        minWidth: isMobile ? 140 : "auto",
        flex: isMobile ? "0 0 auto" : 1,
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: `${color}20`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          color,
        }}
      >
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            color: dark ? "#94A3B8" : "#64748B",
            fontSize: 10.5,
            fontWeight: 500,
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </div>
        <div
          style={{
            color: dark ? "#F1F5F9" : "#1E293B",
            fontSize: 16,
            fontWeight: 700,
            lineHeight: 1.15,
            whiteSpace: "nowrap",
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// BARRE DE PROGRESSION PAR CLASSE
// ============================================================
function ClasseBarRow({ stat, devise, deviseSymbol, dark, isMobile }) {
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const mutedBg = dark ? "#334155" : "#F1F5F9";
  const success = dark ? "#34D399" : "#10B981";
  const warning = dark ? "#FBBF24" : "#F59E0B";
  const danger = dark ? "#F87171" : "#EF4444";

  const colorBar =
    Number(stat.taux) >= 80
      ? success
      : Number(stat.taux) >= 50
      ? warning
      : danger;

  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 6,
          flexWrap: "wrap",
          gap: 6,
        }}
      >
        <span
          style={{
            fontWeight: 600,
            fontSize: isMobile ? 12.5 : 13.5,
            color: textPrimary,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {stat.classe}
          <span
            style={{
              fontWeight: 500,
              color: textSecondary,
              marginLeft: 6,
              fontSize: isMobile ? 11 : 12,
            }}
          >
            ({stat.nbEleves})
          </span>
        </span>
        <span
          style={{
            fontSize: isMobile ? 11 : 12,
            color: textSecondary,
            whiteSpace: "nowrap",
          }}
        >
          {/* ✅ Utilise `devise` (corrige le bug du "CDF" hardcodé) */}
          {formatMontant(stat.paye, devise)} /{" "}
          {formatMontant(stat.total, devise)} {deviseSymbol}
          <span
            style={{
              marginLeft: 6,
              fontWeight: 700,
              color: colorBar,
            }}
          >
            {stat.taux}%
          </span>
        </span>
      </div>
      <div
        style={{
          height: 6,
          background: mutedBg,
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${stat.taux}%`,
            height: "100%",
            background: colorBar,
            borderRadius: 3,
            transition: "width 0.3s ease",
          }}
        />
      </div>
    </div>
  );
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================
export function DashboardComptable({
  ecoleId,
  eleves,
  anneeId,
  anneeActive,
  user,
}) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();

  const userId = user?._id;

  // ✅ userId ajouté + garde
  const ecole = useQuery(
    api.ecoles.get,
    ecoleId && userId ? { ecoleId, userId } : "skip"
  );
  const devise = ecole?.devise || "CDF";
  const deviseSymbol = devise === "USD" ? "$" : "FC";

  const fraisRaw = useQuery(
    api.frais.listByEcole,
    ecoleId && anneeId && userId
      ? { ecoleId, anneeId, userId }
      : "skip"
  );

  // ✅ Mémoïsation
  const frais = useMemo(() => fraisRaw ?? [], [fraisRaw]);
  const elevesList = useMemo(() => eleves ?? [], [eleves]);

  // ✅ Map pour lookup O(1)
  const elevesById = useMemo(
    () => new Map(elevesList.map((e) => [e._id, e])),
    [elevesList]
  );

  // ========== CALCULS MÉMOÏSÉS ==========
  const totals = useMemo(() => {
    const totalFrais = frais.reduce(
      (sum, f) => sum + (f.montantTotal || 0),
      0
    );
    const totalPaye = frais.reduce(
      (sum, f) => sum + (f.montantPaye || 0),
      0
    );
    const reste = totalFrais - totalPaye;
    const nbElevesAvecFrais = new Set(frais.map((f) => f.eleveId)).size;
    const tauxPaiement =
      totalFrais > 0 ? Math.round((totalPaye / totalFrais) * 100) : 0;
    return { totalFrais, totalPaye, reste, nbElevesAvecFrais, tauxPaiement };
  }, [frais]);

  // ✅ Stats par classe — utilise Map, mémoïsé
  // ✅ Appelé AVANT tout early return (règle des Hooks)
  const statsParClasse = useMemo(() => {
    const map = {};
    frais.forEach((f) => {
      const eleve = elevesById.get(f.eleveId);
      const classe = eleve?.classe || "Inconnue";
      if (!map[classe]) {
        map[classe] = {
          classe,
          total: 0,
          paye: 0,
          eleveIds: new Set(),
        };
      }
      map[classe].total += f.montantTotal || 0;
      map[classe].paye += f.montantPaye || 0;
      map[classe].eleveIds.add(f.eleveId);
    });
    return Object.values(map)
      .map((c) => ({
        classe: c.classe,
        total: c.total,
        paye: c.paye,
        nbEleves: c.eleveIds.size,
        taux: c.total > 0 ? Math.round((c.paye / c.total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [frais, elevesById]);

  // ========== COULEURS ==========
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const accent = dark ? "#818CF8" : "#4F46E5";
  const success = dark ? "#34D399" : "#10B981";
  const warning = dark ? "#FBBF24" : "#F59E0B";
  const danger = dark ? "#F87171" : "#EF4444";
  const shadow = dark
    ? "0 1px 3px rgba(0,0,0,0.3)"
    : "0 1px 3px rgba(0,0,0,0.05)";

  // ========== GUARD : session invalide ==========
  if (!user || !userId) {
    return (
      <>
        {Keyframes}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: 300,
            color: textSecondary,
          }}
        >
          Session invalide. Veuillez vous reconnecter.
        </div>
      </>
    );
  }

  // ========== LOADING ==========
  if (ecole === undefined || fraisRaw === undefined) {
    return (
      <>
        {Keyframes}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: 300,
          }}
        >
          <Loader size={32} className="dc-spin" style={{ color: accent }} />
        </div>
      </>
    );
  }

  const { totalFrais, totalPaye, reste, nbElevesAvecFrais, tauxPaiement } =
    totals;

  // ========== RENDU PRINCIPAL ==========
  return (
    <>
      {Keyframes}
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: isMobile ? "10px 8px 24px" : "20px 16px 32px",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {/* ==================== EN-TÊTE ==================== */}
        <div style={{ marginBottom: isMobile ? 12 : 20 }}>
          <h2
            style={{
              fontSize: isMobile ? 17 : 22,
              fontWeight: 700,
              color: textPrimary,
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            Tableau de bord comptable
          </h2>
          <p
            style={{
              color: textSecondary,
              marginTop: 2,
              marginBottom: 0,
              fontSize: isMobile ? 11.5 : 13,
            }}
          >
            {anneeActive ? `${anneeActive.nom} · ` : ""}
            Vue d'ensemble des finances ({deviseSymbol})
          </p>
        </div>

        {/* ==================== STATS ==================== */}
        <div
          style={{
            display: isMobile ? "flex" : "grid",
            gridTemplateColumns: isMobile
              ? undefined
              : "repeat(auto-fit, minmax(180px, 1fr))",
            gap: isMobile ? 8 : 12,
            marginBottom: isMobile ? 14 : 20,
            overflowX: isMobile ? "auto" : "visible",
            paddingBottom: isMobile ? 4 : 0,
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
          }}
        >
          <StatCard
            icon={<DollarSign size={16} />}
            label="Total dû"
            value={`${formatMontant(totalFrais, devise)} ${deviseSymbol}`}
            color={accent}
            dark={dark}
            isMobile={isMobile}
          />
          <StatCard
            icon={<CheckCircle size={16} />}
            label="Total payé"
            value={`${formatMontant(totalPaye, devise)} ${deviseSymbol}`}
            color={success}
            dark={dark}
            isMobile={isMobile}
          />
          <StatCard
            icon={<Clock size={16} />}
            label="Reste à payer"
            value={`${formatMontant(reste, devise)} ${deviseSymbol}`}
            color={reste > 0 ? danger : success}
            dark={dark}
            isMobile={isMobile}
          />
          <StatCard
            icon={<TrendingUp size={16} />}
            label="Taux de paiement"
            value={`${tauxPaiement}%`}
            color={warning}
            dark={dark}
            isMobile={isMobile}
          />
          <StatCard
            icon={<Users size={16} />}
            label="Élèves avec frais"
            value={nbElevesAvecFrais}
            color="#6366F1"
            dark={dark}
            isMobile={isMobile}
          />
        </div>

        {/* ==================== RÉPARTITION PAR CLASSE ==================== */}
        <div
          style={{
            background: cardBg,
            borderRadius: 14,
            padding: isMobile ? 14 : 18,
            boxShadow: shadow,
            border: `1px solid ${cardBorder}`,
          }}
        >
          {/* Titre de section */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 14,
              paddingBottom: 12,
              borderBottom: `1px solid ${cardBorder}`,
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: `${accent}20`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: accent,
                flexShrink: 0,
              }}
            >
              <BarChart3 size={14} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: isMobile ? 13.5 : 14.5,
                  fontWeight: 700,
                  color: textPrimary,
                  lineHeight: 1.2,
                }}
              >
                Paiements par classe
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: textSecondary,
                  marginTop: 1,
                }}
              >
                {statsParClasse.length} classe
                {statsParClasse.length > 1 ? "s" : ""} · taux de recouvrement
              </div>
            </div>
          </div>

          {/* Liste */}
          {statsParClasse.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: isMobile ? 24 : 40,
                color: textSecondary,
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  background: dark ? "#334155" : "#F1F5F9",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 10px",
                }}
              >
                <School size={22} />
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  fontWeight: 600,
                  color: textPrimary,
                }}
              >
                Aucune donnée disponible
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 11.5 }}>
                Aucun frais enregistré pour cette année
              </p>
            </div>
          ) : (
            statsParClasse.map((c) => (
              <ClasseBarRow
                key={c.classe}
                stat={c}
                devise={devise}
                deviseSymbol={deviseSymbol}
                dark={dark}
                isMobile={isMobile}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
}