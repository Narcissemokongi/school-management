// src/components/SuperAdmin/sections/FinancesSection.jsx
import { useState, useEffect, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useTokens } from "@/theme/tokens";
import { useIsMobile } from "@/hooks/useIsMobile";
import { MetricCard } from "@/components/ui/MetricCard";
import {
  DollarSign, TrendingUp, AlertTriangle, Users, Calendar, ChevronRight,
  Loader,
} from "lucide-react";
// ✨ recharts retiré — chargé dynamiquement au 1er affichage du graphique (gain ~400 KB)

// ════════════════════════════════════════════════════════════════════
// LOADER RECHARTS (singleton partagé au niveau module)
// Évite de re-télécharger si plusieurs composants l'utilisent
// ════════════════════════════════════════════════════════════════════
let rechartsPromise = null;

function loadRecharts() {
  if (!rechartsPromise) {
    rechartsPromise = import("recharts");
  }
  return rechartsPromise;
}

const formatEUR = (n) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n || 0);

// ════════════════════════════════════════════════════════════════════
// KEYFRAMES
// ════════════════════════════════════════════════════════════════════
const FinancesSectionKeyframes = (
  <style>{`
    @keyframes fin-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .fin-spin { animation: fin-spin 1s linear infinite; }
    @media (prefers-reduced-motion: reduce) {
      .fin-spin { animation: none !important; }
    }
  `}</style>
);

export function FinancesSection({ userId, onDrilldown }) {
  const t = useTokens();
  const isMobile = useIsMobile();

  const args = useMemo(() => ({ userId, moisRecents: 6 }), [userId]);
  const stats = useQuery(api.abonnements.statsFinancieres, args);

  // ✨ Recharts lazy-loaded
  const [recharts, setRecharts] = useState(null);

  useEffect(() => {
    if (recharts) return;
    let cancelled = false;
    loadRecharts()
      .then((mod) => {
        if (!cancelled) setRecharts(mod);
      })
      .catch((err) => {
        console.error("[FinancesSection] recharts load failed:", err);
      });
    return () => {
      cancelled = true;
    };
  }, [recharts]);

  if (stats === undefined) {
    return (
      <div
        style={{
          padding: t.space.xl,
          color: t.text.secondary,
          fontSize: t.font.size.sm,
        }}
      >
        Chargement…
      </div>
    );
  }

  // ✨ Loader mini pendant le chargement de recharts
  const rechartsReady = !!recharts;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: t.space.lg }}>
      {FinancesSectionKeyframes}

      {/* Header */}
      <div>
        <h2
          style={{
            fontSize: t.font.size.xl,
            fontWeight: 700,
            color: t.text.primary,
            margin: 0,
          }}
        >
          Finances
        </h2>
        <p
          style={{
            fontSize: t.font.size.sm,
            color: t.text.secondary,
            margin: "4px 0 0",
          }}
        >
          Vue agrégée des revenus et de la santé financière
        </p>
      </div>

      {/* KPI Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(4, 1fr)",
          gap: t.space.md,
        }}
      >
        <MetricCard
          icon={DollarSign}
          label="MRR"
          value={formatEUR(stats.mrr)}
          footer={
            <span style={{ fontSize: t.font.size.xs, color: t.text.secondary }}>
              ARR : {formatEUR(stats.arr)}
            </span>
          }
        />
        <MetricCard
          icon={TrendingUp}
          label="Revenus ce mois"
          value={formatEUR(stats.moisActuel)}
          trend={stats.croissance}
          trendLabel="vs mois dernier"
          variant="success"
        />
        <MetricCard
          icon={AlertTriangle}
          label="Impayés"
          value={formatEUR(stats.montantImpayes)}
          variant="warning"
          footer={
            <span style={{ fontSize: t.font.size.xs, color: t.text.secondary }}>
              {stats.nbImpayes} école{stats.nbImpayes > 1 ? "s" : ""} concernée
              {stats.nbImpayes > 1 ? "s" : ""}
            </span>
          }
        />
        <MetricCard
          icon={Users}
          label="Écoles actives"
          value={stats.nbEcolesActives}
          footer={
            <span style={{ fontSize: t.font.size.xs, color: t.text.secondary }}>
              Churn : {stats.tauxChurn.toFixed(1)}% ({stats.nbSuspendusCeMois})
            </span>
          }
        />
      </div>

      {/* Chart revenus 6 mois */}
      <div
        style={{
          background: t.surface.elevated,
          border: `1px solid ${t.border.subtle}`,
          borderRadius: t.radius.lg,
          padding: t.space.lg,
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
          Revenus des 6 derniers mois
        </h3>
        <div style={{ height: 260 }}>
          {!rechartsReady ? (
            // ✨ Loader pendant le chargement de recharts
            <div
              role="status"
              aria-busy="true"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                color: t.text.secondary,
                fontSize: t.font.size.sm,
                gap: 8,
              }}
            >
              <Loader size={18} className="fin-spin" aria-hidden="true" />
              <span>Chargement du graphique…</span>
            </div>
          ) : (
            <recharts.ResponsiveContainer width="100%" height="100%">
              <recharts.AreaChart data={stats.revenusParMois}>
                <defs>
                  <linearGradient id="finGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor={t.accent.primary}
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="100%"
                      stopColor={t.accent.primary}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <recharts.CartesianGrid
                  strokeDasharray="3 3"
                  stroke={t.border.subtle}
                  vertical={false}
                />
                <recharts.XAxis
                  dataKey="label"
                  stroke={t.text.secondary}
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <recharts.YAxis
                  stroke={t.text.secondary}
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatEUR}
                  width={70}
                />
                <recharts.Tooltip
                  contentStyle={{
                    background: t.surface.elevated,
                    border: `1px solid ${t.border.subtle}`,
                    borderRadius: t.radius.sm,
                    fontSize: 12,
                  }}
                  formatter={(v) => [formatEUR(v), "Revenus"]}
                />
                <recharts.Area
                  type="monotone"
                  dataKey="montant"
                  stroke={t.accent.primary}
                  strokeWidth={2}
                  fill="url(#finGrad)"
                />
              </recharts.AreaChart>
            </recharts.ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Deux colonnes */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
          gap: t.space.md,
        }}
      >
        {/* Top 5 écoles */}
        <div
          style={{
            background: t.surface.elevated,
            border: `1px solid ${t.border.subtle}`,
            borderRadius: t.radius.lg,
            padding: t.space.lg,
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
            Top 5 écoles (par revenus)
          </h3>
          {stats.topEcoles.length === 0 ? (
            <p style={{ fontSize: t.font.size.sm, color: t.text.secondary }}>
              Aucun paiement enregistré.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {stats.topEcoles.map((e, i) => {
                const clickable = !!onDrilldown;
                return (
                  <button
                    key={e.ecoleId}
                    type="button"
                    onClick={() => clickable && onDrilldown(e.ecoleId)}
                    disabled={!clickable}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 8px",
                      margin: "0 -8px",
                      borderBottom:
                        i < stats.topEcoles.length - 1
                          ? `1px solid ${t.border.subtle}`
                          : "none",
                      background: "transparent",
                      border: "none",
                      borderRadius: t.radius.sm,
                      cursor: clickable ? "pointer" : "default",
                      textAlign: "left",
                      width: "auto",
                      fontFamily: t.font.family,
                      transition: clickable
                        ? `background ${t.transition.fast}`
                        : undefined,
                    }}
                    onMouseEnter={(ev) => {
                      if (clickable)
                        ev.currentTarget.style.background = t.surface.hover;
                    }}
                    onMouseLeave={(ev) => {
                      if (clickable) ev.currentTarget.style.background = "transparent";
                    }}
                    title={clickable ? "Voir le détail de l'école" : undefined}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: t.space.sm,
                        minWidth: 0,
                        flex: 1,
                      }}
                    >
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: t.radius.sm,
                          background: `${t.accent.primary}15`,
                          color: t.accent.primary,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 11,
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {i + 1}
                      </div>
                      <span
                        style={{
                          fontSize: t.font.size.sm,
                          color: t.text.primary,
                          fontWeight: 500,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {e.nom}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        flexShrink: 0,
                      }}
                    >
                      <span
                        style={{
                          fontSize: t.font.size.sm,
                          fontWeight: 600,
                          color: t.text.primary,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {formatEUR(e.total)}
                      </span>
                      {clickable && (
                        <ChevronRight size={14} color={t.text.muted} />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Prévisions */}
        <div
          style={{
            background: t.surface.elevated,
            border: `1px solid ${t.border.subtle}`,
            borderRadius: t.radius.lg,
            padding: t.space.lg,
            display: "flex",
            flexDirection: "column",
            gap: t.space.md,
          }}
        >
          <h3
            style={{
              fontSize: t.font.size.md,
              fontWeight: 600,
              color: t.text.primary,
              margin: 0,
            }}
          >
            Prévisions
          </h3>

          <div
            style={{
              padding: t.space.md,
              background: `${t.accent.primary}08`,
              borderRadius: t.radius.sm,
              border: `1px solid ${t.accent.primary}20`,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: t.space.sm,
                marginBottom: 6,
              }}
            >
              <Calendar size={14} color={t.accent.primary} />
              <span
                style={{
                  fontSize: t.font.size.xs,
                  color: t.text.secondary,
                  fontWeight: 500,
                }}
              >
                Encaissement sous 30 jours
              </span>
            </div>
            <div
              style={{
                fontSize: t.font.size.xl,
                fontWeight: 700,
                color: t.text.primary,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {formatEUR(stats.previsions30j)}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: t.font.size.sm,
            }}
          >
            <span style={{ color: t.text.secondary }}>Mois précédent</span>
            <span style={{ color: t.text.primary, fontWeight: 600 }}>
              {formatEUR(stats.moisPrecedent)}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: t.font.size.sm,
            }}
          >
            <span style={{ color: t.text.secondary }}>Croissance</span>
            <span
              style={{
                color: stats.croissance >= 0 ? "#10B981" : "#EF4444",
                fontWeight: 600,
              }}
            >
              {stats.croissance >= 0 ? "+" : ""}
              {stats.croissance.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}