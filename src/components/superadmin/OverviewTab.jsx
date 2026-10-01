// src/components/OverviewTab.jsx
import { useState, useMemo, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useTokens } from "@/theme/tokens";
import { useIsMobile } from "@/hooks/useIsMobile";
import { StatCard } from "./StatCard";
import { BarChart } from "./BarChart";
import { Skeleton } from "../Skeleton";
import { Button, Badge } from "@/components/ui";
import {
  School, Users, GraduationCap, BookOpen, AlertTriangle, Clock, CheckCircle,
  ArrowRight, Calendar, Activity, UserCheck, XCircle, Bell, RefreshCw,
  ArrowUpRight, ArrowDownRight, Target, Percent,
} from "lucide-react";

// ════════════════════════════════════════════════════════════════════
// CONSTANTES MODULE-LEVEL
// ════════════════════════════════════════════════════════════════════
const TREND_NEUTRAL = {
  totalEcoles: { value: 0, direction: "up" },
  totalUsers: { value: 0, direction: "up" },
  totalEleves: { value: 0, direction: "up" },
  totalClasses: { value: 0, direction: "up" },
  totalPunitions: { value: 0, direction: "up" },
};

const OT_KEYFRAMES = (
  <style>{`
    @keyframes ot-fade-in {
      from { opacity: 0; transform: translateY(10px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes ot-spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
    .ot-spin { animation: ot-spin 1s linear infinite; }
    .ot-fade-in { animation: ot-fade-in 0.4s ease; }
    .ot-fade-in-sm { animation: ot-fade-in 0.3s ease both; }
    @media (prefers-reduced-motion: reduce) {
      .ot-spin, .ot-fade-in, .ot-fade-in-sm {
        animation: none !important;
      }
    }
  `}</style>
);

// ════════════════════════════════════════════════════════════════════
// SOUS-COMPOSANTS
// ════════════════════════════════════════════════════════════════════

function TrendIndicator({ value, direction }) {
  const t = useTokens();

  if (!value || value === 0) {
    return <span style={{ color: t.text.muted, fontSize: 12 }}>—</span>;
  }

  const isUp = direction === "up";
  const color = isUp ? "#10B981" : "#EF4444";
  const Icon = isUp ? ArrowUpRight : ArrowDownRight;

  return (
    <span style={{ display: "flex", alignItems: "center", gap: 2, color, fontSize: 12 }}>
      <Icon size={12} />
      {Math.abs(value)}% ce mois
    </span>
  );
}

function SectionCard({ children, t, padding }) {
  return (
    <div
      style={{
        background: t.surface.default,
        borderRadius: t.radius.lg,
        padding,
        boxShadow: t.shadow.sm,
        border: `1px solid ${t.border.subtle}`,
      }}
    >
      {children}
    </div>
  );
}

function SectionTitle({ children, t, isMobile }) {
  return (
    <h3
      style={{
        fontSize: isMobile ? 16 : 18,
        fontWeight: 600,
        color: t.text.primary,
        margin: 0,
        marginBottom: isMobile ? 12 : 20,
      }}
    >
      {children}
    </h3>
  );
}

// ════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ════════════════════════════════════════════════════════════════════
export function OverviewTab({
  globalStats,
  ecolesAvecUsers,
  onNavigate,
  onRefresh,
  user,
}) {
  const t = useTokens();
  const isMobile = useIsMobile();

  const userId = user?._id;

  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const recentEcolesRaw = useQuery(
    api.ecoles.listRecent,
    userId ? { userId } : "skip"
  );
  const recentUsersRaw = useQuery(
    api.users.listRecent,
    userId ? { userId } : "skip"
  );

  const recentEcoles = useMemo(() => recentEcolesRaw ?? [], [recentEcolesRaw]);
  const recentUsers = useMemo(() => recentUsersRaw ?? [], [recentUsersRaw]);

  const isLoading =
    globalStats === undefined ||
    ecolesAvecUsers === undefined ||
    recentEcolesRaw === undefined ||
    (userId && recentUsersRaw === undefined);

  const topEcoles = useMemo(() => {
    return [...(ecolesAvecUsers ?? [])]
      .sort((a, b) => (b.userCount || 0) - (a.userCount || 0))
      .slice(0, 5);
  }, [ecolesAvecUsers]);

  const maxUsers = useMemo(() => {
    return Math.max(...topEcoles.map((e) => e.userCount || 0), 1);
  }, [topEcoles]);

  const pendingUsersCount = globalStats?.pendingUsers ?? 0;
  const suspendedEcoles = (ecolesAvecUsers ?? []).filter(
    (e) => e.statut === "suspendue"
  ).length;
  const activeEcoles = (ecolesAvecUsers?.length ?? 0) - suspendedEcoles;

  const today = useMemo(
    () =>
      new Date().toLocaleDateString("fr-FR", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    []
  );

  const totalEleves = globalStats?.totalEleves ?? 0;
  const totalClasses = globalStats?.totalClasses ?? 0;
  const totalUsers = globalStats?.totalUsers ?? 0;
  const totalEcoles = globalStats?.totalEcoles ?? 0;

  const avgElevesPerEcole = useMemo(
    () => (totalEcoles > 0 ? (totalEleves / totalEcoles).toFixed(1) : 0),
    [totalEleves, totalEcoles]
  );
  const avgClassesPerEcole = useMemo(
    () => (totalEcoles > 0 ? (totalClasses / totalEcoles).toFixed(1) : 0),
    [totalClasses, totalEcoles]
  );
  const suspensionRate = useMemo(
    () =>
      totalEcoles > 0
        ? ((suspendedEcoles / totalEcoles) * 100).toFixed(1)
        : 0,
    [suspendedEcoles, totalEcoles]
  );
  const pendingRate = useMemo(
    () =>
      totalUsers > 0
        ? ((pendingUsersCount / totalUsers) * 100).toFixed(1)
        : 0,
    [pendingUsersCount, totalUsers]
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      if (onRefresh) {
        await onRefresh();
      } else {
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
    } catch (err) {
      console.error("[OverviewTab] refresh failed:", err);
      setError("Erreur lors de l'actualisation");
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  // ════════════════════════════════════════════════════════════════
  // Loading
  // ════════════════════════════════════════════════════════════════
  if (isLoading) {
    return (
      <>
        {OT_KEYFRAMES}
        <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? 8 : 16 }}>
          <div
            style={{
              display: "grid",
              // ✨ FIX — 2 colonnes mobile
              gridTemplateColumns: isMobile
                ? "repeat(2, minmax(0, 1fr))"
                : "repeat(auto-fit, minmax(200px, 1fr))",
              gap: isMobile ? 8 : 16,
            }}
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} height={80} variant="card" />
            ))}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile
                ? "1fr"
                : "repeat(auto-fit, minmax(300px, 1fr))",
              gap: isMobile ? 12 : 24,
            }}
          >
            <Skeleton height={250} variant="card" />
            <Skeleton height={250} variant="card" />
          </div>
          <Skeleton height={150} variant="card" />
        </div>
      </>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // Calculs visuels
  // ════════════════════════════════════════════════════════════════
  const donutTotal = activeEcoles + suspendedEcoles;
  const donutRadius = 40;
  const donutCircumference = 2 * Math.PI * donutRadius;
  const activeStrokeDasharray =
    donutTotal > 0
      ? `${(activeEcoles / donutTotal) * donutCircumference} ${donutCircumference}`
      : "0 0";

  // ✨ FIX — padding racine à 0 sur mobile (parent a déjà le sien)
  const containerPadding = isMobile ? "0" : "16px 0";
  const headerMargin = isMobile ? 20 : 32;
  const sectionPadding = isMobile ? 16 : 24;
  const smallText = isMobile ? 12 : 13;
  const titleSize = isMobile ? 20 : 24;
  const subtitleSize = isMobile ? 13 : 14;

  // ✨ FIX — 2 colonnes de StatCards sur mobile
  const gridMainColumns = isMobile
    ? "repeat(2, minmax(0, 1fr))"
    : "repeat(auto-fit, minmax(180px, 1fr))";
  const gridMainGap = isMobile ? 8 : 16;

  const twoColumns = isMobile
    ? "1fr"
    : "repeat(auto-fit, minmax(320px, 1fr))";
  const twoColumnsGap = isMobile ? 12 : 24;
  const donutColumns = isMobile
    ? "1fr"
    : "repeat(auto-fit, minmax(280px, 1fr))";

  return (
    <div className="ot-fade-in" style={{ padding: containerPadding }}>
      {OT_KEYFRAMES}

      {/* ═══════════ En-tête ═══════════ */}
      <div
        style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          alignItems: isMobile ? "stretch" : "center",
          justifyContent: "space-between",
          marginBottom: headerMargin,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h2
            style={{
              fontSize: titleSize,
              fontWeight: 700,
              color: t.text.primary,
              margin: 0,
            }}
          >
            Vue d'ensemble
          </h2>
          <p
            style={{
              color: t.text.muted,
              fontSize: subtitleSize,
              marginTop: 4,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Calendar size={isMobile ? 12 : 14} />
            {today}
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            flexDirection: isMobile ? "column" : "row",
            width: isMobile ? "100%" : "auto",
          }}
        >
          {error && (
            <span
              style={{
                color: "#EF4444",
                fontSize: 13,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <AlertTriangle size={14} /> {error}
            </span>
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            icon={<RefreshCw size={16} className={refreshing ? "ot-spin" : ""} />}
            fullWidth={isMobile}
          >
            {refreshing ? "Actualisation…" : "Actualiser"}
          </Button>

          {onNavigate && (
            <Button
              variant="primary"
              size="sm"
              iconRight={<ArrowRight size={16} />}
              onClick={() => onNavigate("schools")}
              fullWidth={isMobile}
            >
              Gérer les écoles
            </Button>
          )}
        </div>
      </div>

      {/* ═══════════ Cartes statistiques ═══════════ */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: gridMainColumns,
          gap: gridMainGap,
          marginBottom: headerMargin,
        }}
      >
        <StatCard
          icon={<School size={isMobile ? 20 : 24} />}
          value={totalEcoles}
          label="Écoles"
          color="#4F46E5"
          onClick={() => onNavigate?.("schools")}
          showArrow
          subValue={
            <TrendIndicator
              value={TREND_NEUTRAL.totalEcoles.value}
              direction={TREND_NEUTRAL.totalEcoles.direction}
            />
          }
        />
        <StatCard
          icon={<Users size={isMobile ? 20 : 24} />}
          value={totalUsers}
          label="Utilisateurs"
          color="#10B981"
          onClick={() => onNavigate?.("users")}
          showArrow
          subValue={
            <TrendIndicator
              value={TREND_NEUTRAL.totalUsers.value}
              direction={TREND_NEUTRAL.totalUsers.direction}
            />
          }
        />
        <StatCard
          icon={<GraduationCap size={isMobile ? 20 : 24} />}
          value={totalEleves}
          label="Élèves"
          color="#F59E0B"
          subValue={
            <TrendIndicator
              value={TREND_NEUTRAL.totalEleves.value}
              direction={TREND_NEUTRAL.totalEleves.direction}
            />
          }
        />
        <StatCard
          icon={<BookOpen size={isMobile ? 20 : 24} />}
          value={totalClasses}
          label="Classes"
          color="#3B82F6"
          subValue={
            <TrendIndicator
              value={TREND_NEUTRAL.totalClasses.value}
              direction={TREND_NEUTRAL.totalClasses.direction}
            />
          }
        />
        <StatCard
          icon={<AlertTriangle size={isMobile ? 20 : 24} />}
          value={globalStats?.totalPunitions ?? 0}
          label="Punitions"
          color="#EF4444"
          subValue={
            <TrendIndicator
              value={TREND_NEUTRAL.totalPunitions.value}
              direction={TREND_NEUTRAL.totalPunitions.direction}
            />
          }
        />
        <StatCard
          icon={<School size={isMobile ? 20 : 24} />}
          value={suspendedEcoles}
          label="Écoles suspendues"
          color="#F59E0B"
          subValue={suspendedEcoles > 0 ? "À surveiller" : "Aucune"}
        />
      </div>

      {/* ═══════════ Top 5 écoles + Activité ═══════════ */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: twoColumns,
          gap: twoColumnsGap,
          marginBottom: isMobile ? 16 : 24,
        }}
      >
        {/* Top 5 écoles */}
        <SectionCard t={t} padding={sectionPadding}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: isMobile ? 12 : 20,
              flexDirection: isMobile ? "column" : "row",
              gap: 8,
            }}
          >
            <h3
              style={{
                fontSize: isMobile ? 16 : 18,
                fontWeight: 600,
                color: t.text.primary,
                margin: 0,
              }}
            >
              Top 5 écoles
            </h3>
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate("schools")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  background: "none",
                  border: "none",
                  color: t.accent.primary,
                  cursor: "pointer",
                  fontSize: smallText,
                  fontWeight: 500,
                  fontFamily: t.font.family,
                  padding: 0,
                }}
                aria-label="Voir toutes les écoles"
              >
                Voir tout <ArrowRight size={14} />
              </button>
            )}
          </div>
          {topEcoles.length > 0 ? (
            <BarChart data={topEcoles} maxValue={maxUsers} />
          ) : (
            <p style={{ color: t.text.muted, fontSize: smallText, margin: 0 }}>
              Aucune école disponible
            </p>
          )}
        </SectionCard>

        {/* Activité récente */}
        <SectionCard t={t} padding={sectionPadding}>
          <SectionTitle t={t} isMobile={isMobile}>Activité récente</SectionTitle>

          {/* Nouvelles écoles */}
          <div style={{ marginBottom: isMobile ? 16 : 24 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: isMobile ? 8 : 12,
              }}
            >
              <Activity size={16} color={t.text.muted} />
              <span style={{ fontSize: 14, fontWeight: 500, color: t.text.primary }}>
                Nouvelles écoles
              </span>
            </div>
            {recentEcoles.length > 0 ? (
              recentEcoles.map((ecole, idx) => (
                <div
                  key={ecole._id}
                  className="ot-fade-in-sm"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "8px 0",
                    borderBottom: `1px solid ${t.border.subtle}`,
                    fontSize: isMobile ? 13 : 14,
                    color: t.text.primary,
                    animationDelay: `${idx * 0.05}s`,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: t.radius.sm,
                        background: t.accent.primarySoft,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: t.accent.primary,
                      }}
                    >
                      <School size={12} />
                    </div>
                    <span>{ecole.nom}</span>
                  </div>
                  <span style={{ color: t.text.muted, fontSize: isMobile ? 12 : 13 }}>
                    {ecole.code || "—"}
                  </span>
                </div>
              ))
            ) : (
              <p style={{ color: t.text.muted, fontSize: smallText, margin: 0 }}>
                Aucune école récente
              </p>
            )}
          </div>

          {/* Derniers inscrits */}
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: isMobile ? 8 : 12,
              }}
            >
              <Users size={16} color={t.text.muted} />
              <span style={{ fontSize: 14, fontWeight: 500, color: t.text.primary }}>
                Derniers inscrits
              </span>
            </div>
            {recentUsers.length > 0 ? (
              recentUsers.map((u, idx) => {
                const status = u.status || "active";
                return (
                  <div
                    key={u._id}
                    className="ot-fade-in-sm"
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 0",
                      borderBottom: `1px solid ${t.border.subtle}`,
                      fontSize: isMobile ? 13 : 14,
                      color: t.text.primary,
                      animationDelay: `${idx * 0.05}s`,
                      flexWrap: isMobile ? "wrap" : "nowrap",
                      gap: 4,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: "50%",
                          background: t.surface.hover,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: t.text.muted,
                        }}
                      >
                        <UserCheck size={12} />
                      </div>
                      <span>
                        {u.nom}{" "}
                        <span style={{ color: t.text.muted }}>({u.role})</span>
                      </span>
                    </div>
                    <Badge
                      variant={
                        status === "pending"
                          ? "warning"
                          : status === "active"
                          ? "success"
                          : "danger"
                      }
                      size="sm"
                      icon={
                        status === "pending" ? (
                          <Clock size={12} />
                        ) : status === "active" ? (
                          <CheckCircle size={12} />
                        ) : (
                          <XCircle size={12} />
                        )
                      }
                    >
                      {status === "pending"
                        ? "En attente"
                        : status === "active"
                        ? "Actif"
                        : "Rejeté"}
                    </Badge>
                  </div>
                );
              })
            ) : (
              <p style={{ color: t.text.muted, fontSize: smallText, margin: 0 }}>
                Aucun utilisateur récent
              </p>
            )}
          </div>
        </SectionCard>
      </div>

      {/* ═══════════ Donut + Indicateurs ═══════════ */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: donutColumns,
          gap: isMobile ? 12 : 24,
          marginBottom: isMobile ? 16 : 24,
        }}
      >
        {/* Donut */}
        <SectionCard t={t} padding={sectionPadding}>
          <SectionTitle t={t} isMobile={isMobile}>
            Répartition des écoles
          </SectionTitle>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: isMobile ? 16 : 24,
              flexDirection: isMobile ? "column" : "row",
            }}
          >
            {/* ✨ FIX — Donut plus grand sur mobile */}
            <svg
              width={isMobile ? 140 : 120}
              height={isMobile ? 140 : 120}
              viewBox="0 0 100 100"
              role="img"
              aria-label={`${activeEcoles} écoles actives, ${suspendedEcoles} suspendues`}
            >
              <circle
                cx="50"
                cy="50"
                r={donutRadius}
                fill="none"
                stroke={t.border.default}
                strokeWidth="15"
              />
              <circle
                cx="50"
                cy="50"
                r={donutRadius}
                fill="none"
                stroke="#10B981"
                strokeWidth="15"
                strokeDasharray={activeStrokeDasharray}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
              />
            </svg>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <LegendItem color="#10B981" label={`Actives : ${activeEcoles}`} t={t} />
              <LegendItem color="#F59E0B" label={`Suspendues : ${suspendedEcoles}`} t={t} />
            </div>
          </div>
        </SectionCard>

        {/* Indicateurs clés */}
        <SectionCard t={t} padding={sectionPadding}>
          <SectionTitle t={t} isMobile={isMobile}>
            Indicateurs clés
          </SectionTitle>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile
                ? "1fr 1fr"
                : "repeat(auto-fit, minmax(120px, 1fr))",
              gap: isMobile ? 12 : 16,
            }}
          >
            <KpiItem icon={<Target size={24} />} color="#4F46E5" value={avgElevesPerEcole} label="Élèves / école" t={t} />
            <KpiItem icon={<BookOpen size={24} />} color="#3B82F6" value={avgClassesPerEcole} label="Classes / école" t={t} />
            <KpiItem icon={<Percent size={24} />} color="#F59E0B" value={`${suspensionRate}%`} label="Taux de suspension" t={t} />
            <KpiItem icon={<Bell size={24} />} color="#EF4444" value={`${pendingRate}%`} label="Demandes en attente" t={t} />
          </div>
        </SectionCard>
      </div>

      {/* ═══════════ Bannière demandes en attente ═══════════ */}
      {pendingUsersCount > 0 && (
        <div
          className="ot-fade-in-sm"
          style={{
            background: t.surface.default,
            borderRadius: t.radius.lg,
            padding: isMobile ? 14 : 20,
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            justifyContent: "space-between",
            alignItems: isMobile ? "stretch" : "center",
            border: `1px solid ${t.border.subtle}`,
            boxShadow: t.shadow.sm,
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: t.status.warning.bg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: t.status.warning.fg,
                flexShrink: 0,
              }}
            >
              <Bell size={20} />
            </div>
            <div>
              <div
                style={{
                  color: t.text.primary,
                  fontWeight: 600,
                  fontSize: isMobile ? 15 : 16,
                }}
              >
                {pendingUsersCount} demande(s) d'inscription en attente
              </div>
              <div style={{ color: t.text.muted, fontSize: 13 }}>
                Ces demandes nécessitent votre approbation ou rejet.
              </div>
            </div>
          </div>
          {onNavigate && (
            <Button
              variant="primary"
              size="md"
              iconRight={<ArrowRight size={14} />}
              onClick={() => onNavigate("pending")}
              fullWidth={isMobile}
            >
              Gérer
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// SOUS-COMPOSANTS D'AFFICHAGE
// ════════════════════════════════════════════════════════════════════

function LegendItem({ color, label, t }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span
        style={{
          width: 12,
          height: 12,
          background: color,
          borderRadius: 3,
        }}
      />
      <span style={{ color: t.text.primary, fontSize: 14 }}>{label}</span>
    </div>
  );
}

function KpiItem({ icon, color, value, label, t }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
      }}
    >
      <span style={{ color }}>{icon}</span>
      <span
        style={{
          fontSize: 20,
          fontWeight: 700,
          color: t.text.primary,
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontSize: 13,
          color: t.text.muted,
          textAlign: "center",
        }}
      >
        {label}
      </span>
    </div>
  );
}