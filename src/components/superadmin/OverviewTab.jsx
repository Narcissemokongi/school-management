// src/components/OverviewTab.jsx
import { useState, useMemo, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import { StatCard } from "./StatCard";
import { BarChart } from "./BarChart";
import { Skeleton } from "../Skeleton";
import {
  School, Users, GraduationCap, BookOpen, AlertTriangle, Clock, CheckCircle,
  ArrowRight, Calendar, Activity, UserCheck, XCircle, Bell, RefreshCw,
  ArrowUpRight, ArrowDownRight, Target, Percent,
} from "lucide-react";

// ════════════════════════════════════════════════════════════════════
// CONSTANTES MODULE-LEVEL (ne dépendent de rien)
// ════════════════════════════════════════════════════════════════════

// ✅ FIX — trend neutre en constante, plus de useMemo inutile
const TREND_NEUTRAL = {
  totalEcoles: { value: 0, direction: "up" },
  totalUsers: { value: 0, direction: "up" },
  totalEleves: { value: 0, direction: "up" },
  totalClasses: { value: 0, direction: "up" },
  totalPunitions: { value: 0, direction: "up" },
};

// ✅ FIX — keyframes injectés UNE SEULE FOIS via constant module-level
const OT_KEYFRAMES = (
  <style>{`
    @keyframes ot-fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes ot-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
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
  // ✅ FIX — si valeur neutre (0 ou undefined), on n'affiche rien
  // plutôt qu'un faux "+0% ce mois" en vert.
  if (!value || value === 0) {
    return (
      <span style={{ color: "#94A3B8", fontSize: 12 }}>—</span>
    );
  }

  const isUp = direction === "up";
  const color = isUp ? "#10B981" : "#EF4444";
  const Icon = isUp ? ArrowUpRight : ArrowDownRight;

  return (
    <span
      style={{
        display: "flex",
        alignItems: "center",
        gap: 2,
        color,
        fontSize: 12,
      }}
    >
      <Icon size={12} />
      {Math.abs(value)}% ce mois
    </span>
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
  const { dark } = useStyles();
  const isMobile = useIsMobile();

  const userId = user?._id;

  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // ✅ userId ajouté sur listRecent
  const recentEcolesRaw = useQuery(
    api.ecoles.listRecent,
    userId ? { userId } : "skip"
  );
  const recentUsersRaw = useQuery(
    api.users.listRecent,
    userId ? { userId } : "skip"
  );

  // ✅ Refs stables
  const recentEcoles = useMemo(
    () => recentEcolesRaw ?? [],
    [recentEcolesRaw]
  );
  const recentUsers = useMemo(
    () => recentUsersRaw ?? [],
    [recentUsersRaw]
  );

  // ✅ isLoading complet
  const isLoading =
    globalStats === undefined ||
    ecolesAvecUsers === undefined ||
    recentEcolesRaw === undefined ||
    (userId && recentUsersRaw === undefined);

  // ✅ Tous les useMemo AVANT le early return (règle des Hooks)
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

  // ✅ useCallback
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

  // ============================================================
  // Loading
  // ============================================================
  if (isLoading) {
    return (
      <>
        {OT_KEYFRAMES}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: isMobile ? 8 : 16,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile
                ? "1fr"
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

  // ============================================================
  // Calculs visuels (après loading)
  // ============================================================
  const donutTotal = activeEcoles + suspendedEcoles;
  const donutRadius = 40;
  const donutCircumference = 2 * Math.PI * donutRadius;
  const activeStrokeDasharray =
    donutTotal > 0
      ? `${
          (activeEcoles / donutTotal) * donutCircumference
        } ${donutCircumference}`
      : "0 0";

  const containerPadding = isMobile ? "16px 12px" : "16px 0";
  const headerMargin = isMobile ? 20 : 32;
  const headerFlexDirection = isMobile ? "column" : "row";
  const headerAlign = isMobile ? "stretch" : "center";
  const buttonPadding = isMobile ? "10px 12px" : "8px 16px";
  const buttonFontSize = 14;
  const gridMainColumns = isMobile
    ? "1fr"
    : "repeat(auto-fit, minmax(180px, 1fr))";
  const gridMainGap = isMobile ? 8 : 16;
  const twoColumns = isMobile
    ? "1fr"
    : "repeat(auto-fit, minmax(320px, 1fr))";
  const twoColumnsGap = isMobile ? 12 : 24;
  const donutColumns = isMobile
    ? "1fr"
    : "repeat(auto-fit, minmax(280px, 1fr))";
  const donutGap = isMobile ? 12 : 24;
  const sectionPadding = isMobile ? 16 : 24;
  const smallText = isMobile ? 12 : 13;
  const titleSize = isMobile ? 20 : 24;
  const subtitleSize = isMobile ? 13 : 14;

  return (
    <div className="ot-fade-in" style={{ padding: containerPadding }}>
      {OT_KEYFRAMES}

      {/* En-tête */}
      <div
        style={{
          display: "flex",
          flexDirection: headerFlexDirection,
          alignItems: headerAlign,
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
              color: dark ? "#F1F5F9" : "#1E293B",
              margin: 0,
            }}
          >
            Vue d'ensemble
          </h2>
          <p
            style={{
              color: dark ? "#94A3B8" : "#64748B",
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
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            title="Actualiser les données"
            aria-label="Actualiser les données"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: buttonPadding,
              background: "transparent",
              color: dark ? "#94A3B8" : "#64748B",
              border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
              borderRadius: 8,
              cursor: refreshing ? "not-allowed" : "pointer",
              fontSize: buttonFontSize,
              transition: "background 0.2s",
              width: isMobile ? "100%" : "auto",
              opacity: refreshing ? 0.7 : 1,
            }}
          >
            <RefreshCw
              size={16}
              className={refreshing ? "ot-spin" : ""}
            />
            {refreshing ? "Actualisation..." : "Actualiser"}
          </button>
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate("schools")}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: buttonPadding,
                background: dark ? "#818CF8" : "#4F46E5",
                color: "white",
                border: "none",
                borderRadius: 8,
                fontWeight: 600,
                cursor: "pointer",
                fontSize: buttonFontSize,
                transition: "background 0.2s",
                width: isMobile ? "100%" : "auto",
              }}
            >
              Gérer les écoles <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Cartes statistiques principales */}
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

      {/* Deux colonnes principales */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: twoColumns,
          gap: twoColumnsGap,
          marginBottom: isMobile ? 16 : 24,
        }}
      >
        {/* Top 5 écoles */}
        <div
          style={{
            background: dark ? "#1E293B" : "#FFFFFF",
            borderRadius: 16,
            padding: sectionPadding,
            boxShadow: dark
              ? "0 1px 3px rgba(0,0,0,0.3)"
              : "0 1px 3px rgba(0,0,0,0.05)",
            border: `1px solid ${
              dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"
            }`,
          }}
        >
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
                color: dark ? "#F1F5F9" : "#1E293B",
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
                  color: dark ? "#818CF8" : "#4F46E5",
                  cursor: "pointer",
                  fontSize: smallText,
                  fontWeight: 500,
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
            <p
              style={{
                color: dark ? "#94A3B8" : "#64748B",
                fontSize: smallText,
              }}
            >
              Aucune école disponible
            </p>
          )}
        </div>

        {/* Activité récente */}
        <div
          style={{
            background: dark ? "#1E293B" : "#FFFFFF",
            borderRadius: 16,
            padding: sectionPadding,
            boxShadow: dark
              ? "0 1px 3px rgba(0,0,0,0.3)"
              : "0 1px 3px rgba(0,0,0,0.05)",
            border: `1px solid ${
              dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"
            }`,
          }}
        >
          <h3
            style={{
              fontSize: isMobile ? 16 : 18,
              fontWeight: 600,
              marginBottom: isMobile ? 12 : 20,
              color: dark ? "#F1F5F9" : "#1E293B",
            }}
          >
            Activité récente
          </h3>

          <div style={{ marginBottom: isMobile ? 16 : 24 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: isMobile ? 8 : 12,
              }}
            >
              <Activity size={16} color={dark ? "#94A3B8" : "#64748B"} />
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: dark ? "#E2E8F0" : "#1E293B",
                }}
              >
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
                    borderBottom: `1px solid ${
                      dark ? "rgba(255,255,255,0.05)" : "#F1F5F9"
                    }`,
                    fontSize: isMobile ? 13 : 14,
                    color: dark ? "#F1F5F9" : "#1E293B",
                    animationDelay: `${idx * 0.05}s`,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 6,
                        background: dark ? "#312E81" : "#EEF2FF",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: dark ? "#A5B4FC" : "#4F46E5",
                      }}
                    >
                      <School size={12} />
                    </div>
                    <span>{ecole.nom}</span>
                  </div>
                  <span
                    style={{
                      color: dark ? "#94A3B8" : "#64748B",
                      fontSize: isMobile ? 12 : 13,
                    }}
                  >
                    {ecole.code || "—"}
                  </span>
                </div>
              ))
            ) : (
              <p
                style={{
                  color: dark ? "#94A3B8" : "#64748B",
                  fontSize: smallText,
                }}
              >
                Aucune école récente
              </p>
            )}
          </div>

          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: isMobile ? 8 : 12,
              }}
            >
              <Users size={16} color={dark ? "#94A3B8" : "#64748B"} />
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: dark ? "#E2E8F0" : "#1E293B",
                }}
              >
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
                      borderBottom: `1px solid ${
                        dark ? "rgba(255,255,255,0.05)" : "#F1F5F9"
                      }`,
                      fontSize: isMobile ? 13 : 14,
                      color: dark ? "#F1F5F9" : "#1E293B",
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
                          background: dark ? "#1E293B" : "#F1F5F9",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: dark ? "#94A3B8" : "#64748B",
                        }}
                      >
                        <UserCheck size={12} />
                      </div>
                      <span>
                        {u.nom}{" "}
                        <span style={{ color: dark ? "#94A3B8" : "#64748B" }}>
                          ({u.role})
                        </span>
                      </span>
                    </div>
                    <span>
                      {status === "pending" ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            color: "#F59E0B",
                            fontSize: 12,
                          }}
                        >
                          <Clock size={14} /> En attente
                        </span>
                      ) : status === "active" ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            color: "#10B981",
                            fontSize: 12,
                          }}
                        >
                          <CheckCircle size={14} /> Actif
                        </span>
                      ) : (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            color: "#EF4444",
                            fontSize: 12,
                          }}
                        >
                          <XCircle size={14} /> Rejeté
                        </span>
                      )}
                    </span>
                  </div>
                );
              })
            ) : (
              <p
                style={{
                  color: dark ? "#94A3B8" : "#64748B",
                  fontSize: smallText,
                }}
              >
                Aucun utilisateur récent
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Donut + Indicateurs clés */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: donutColumns,
          gap: donutGap,
          marginBottom: isMobile ? 16 : 24,
        }}
      >
        <div
          style={{
            background: dark ? "#1E293B" : "#FFFFFF",
            borderRadius: 16,
            padding: sectionPadding,
            boxShadow: dark
              ? "0 1px 3px rgba(0,0,0,0.3)"
              : "0 1px 3px rgba(0,0,0,0.05)",
            border: `1px solid ${
              dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"
            }`,
          }}
        >
          <h3
            style={{
              fontSize: isMobile ? 16 : 18,
              fontWeight: 600,
              marginBottom: isMobile ? 12 : 20,
              color: dark ? "#F1F5F9" : "#1E293B",
            }}
          >
            Répartition des écoles
          </h3>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: isMobile ? 16 : 24,
              flexDirection: isMobile ? "column" : "row",
            }}
          >
            <svg
              width="120"
              height="120"
              viewBox="0 0 100 100"
              role="img"
              aria-label={`${activeEcoles} écoles actives, ${suspendedEcoles} suspendues`}
            >
              <circle
                cx="50"
                cy="50"
                r={donutRadius}
                fill="none"
                stroke={dark ? "#334155" : "#E2E8F0"}
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
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    width: 12,
                    height: 12,
                    background: "#10B981",
                    borderRadius: 3,
                  }}
                />
                <span
                  style={{
                    color: dark ? "#E2E8F0" : "#1E293B",
                    fontSize: 14,
                  }}
                >
                  Actives : {activeEcoles}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    width: 12,
                    height: 12,
                    background: "#F59E0B",
                    borderRadius: 3,
                  }}
                />
                <span
                  style={{
                    color: dark ? "#E2E8F0" : "#1E293B",
                    fontSize: 14,
                  }}
                >
                  Suspendues : {suspendedEcoles}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            background: dark ? "#1E293B" : "#FFFFFF",
            borderRadius: 16,
            padding: sectionPadding,
            boxShadow: dark
              ? "0 1px 3px rgba(0,0,0,0.3)"
              : "0 1px 3px rgba(0,0,0,0.05)",
            border: `1px solid ${
              dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"
            }`,
          }}
        >
          <h3
            style={{
              fontSize: isMobile ? 16 : 18,
              fontWeight: 600,
              marginBottom: isMobile ? 12 : 20,
              color: dark ? "#F1F5F9" : "#1E293B",
            }}
          >
            Indicateurs clés
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile
                ? "1fr 1fr"
                : "repeat(auto-fit, minmax(120px, 1fr))",
              gap: isMobile ? 12 : 16,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Target size={24} color="#4F46E5" />
              <span
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: dark ? "#F1F5F9" : "#1E293B",
                }}
              >
                {avgElevesPerEcole}
              </span>
              <span
                style={{
                  fontSize: 13,
                  color: dark ? "#94A3B8" : "#64748B",
                }}
              >
                Élèves / école
              </span>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
              }}
            >
              <BookOpen size={24} color="#3B82F6" />
              <span
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: dark ? "#F1F5F9" : "#1E293B",
                }}
              >
                {avgClassesPerEcole}
              </span>
              <span
                style={{
                  fontSize: 13,
                  color: dark ? "#94A3B8" : "#64748B",
                }}
              >
                Classes / école
              </span>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Percent size={24} color="#F59E0B" />
              <span
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: dark ? "#F1F5F9" : "#1E293B",
                }}
              >
                {suspensionRate}%
              </span>
              <span
                style={{
                  fontSize: 13,
                  color: dark ? "#94A3B8" : "#64748B",
                }}
              >
                Taux de suspension
              </span>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Bell size={24} color="#EF4444" />
              <span
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: dark ? "#F1F5F9" : "#1E293B",
                }}
              >
                {pendingRate}%
              </span>
              <span
                style={{
                  fontSize: 13,
                  color: dark ? "#94A3B8" : "#64748B",
                }}
              >
                Demandes en attente
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bannière demandes en attente */}
      {pendingUsersCount > 0 && (
        <div
          className="ot-fade-in-sm"
          style={{
            background: dark ? "#1E293B" : "#FFFFFF",
            borderRadius: 16,
            padding: isMobile ? 14 : 20,
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            justifyContent: "space-between",
            alignItems: isMobile ? "stretch" : "center",
            border: `1px solid ${
              dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"
            }`,
            boxShadow: dark
              ? "0 1px 3px rgba(0,0,0,0.3)"
              : "0 1px 3px rgba(0,0,0,0.05)",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: dark ? "#78350F" : "#FEF3C7",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#F59E0B",
                flexShrink: 0,
              }}
            >
              <Bell size={20} />
            </div>
            <div>
              <div
                style={{
                  color: dark ? "#F1F5F9" : "#1E293B",
                  fontWeight: 600,
                  fontSize: isMobile ? 15 : 16,
                }}
              >
                {pendingUsersCount} demande(s) d'inscription en attente
              </div>
              <div
                style={{
                  color: dark ? "#94A3B8" : "#64748B",
                  fontSize: 13,
                }}
              >
                Ces demandes nécessitent votre approbation ou rejet.
              </div>
            </div>
          </div>
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate("pending")}
              style={{
                padding: isMobile ? "12px 16px" : "8px 16px",
                background: dark ? "#818CF8" : "#4F46E5",
                color: "white",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                whiteSpace: "nowrap",
                width: isMobile ? "100%" : "auto",
                fontSize: isMobile ? 16 : 14,
              }}
            >
              Gérer <ArrowRight size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}