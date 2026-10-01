import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  ClipboardList, AlertTriangle, Users, Building, Loader,
  GraduationCap, UserCheck, Activity, Flame,
} from "lucide-react";
import {
  getTopDerangeurs, getPunitionsParClasse,
} from "../utils";

// ============================================================
// CONSTANTES MODULE-LEVEL
// ============================================================
const SCROLL_AREA = {
  overscrollBehavior: "contain",
  WebkitOverflowScrolling: "touch",
};

// ============================================================
// KEYFRAMES (module-level, rendus UNE fois)
// ============================================================
const Keyframes = (
  <style>{`
    @keyframes dd-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .dd-spin { animation: dd-spin 1s linear infinite; }
    @media (prefers-reduced-motion: reduce) {
      .dd-spin { animation: none !important; }
    }
  `}</style>
);

// ============================================================
// CARTE STATISTIQUE COMPACTE
// ============================================================
function StatCard({ icon, label, value, color, dark, isMobile }) {
  return (
    <article
      aria-label={`${label} : ${value}`}
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
        minWidth: isMobile ? 130 : "auto",
        flex: isMobile ? "0 0 auto" : 1,
        minHeight: 44,
      }}
    >
      <div
        aria-hidden="true"
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
            fontSize: 18,
            fontWeight: 700,
            lineHeight: 1.1,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {value}
        </div>
      </div>
    </article>
  );
}

// ============================================================
// BARRE DE RÉPARTITION
// ============================================================
function BarRow({ label, count, max, color, dark, isMobile }) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";

  return (
    <div style={{ marginBottom: 10 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 4,
        }}
      >
        <span
          style={{
            fontSize: isMobile ? 12 : 13,
            color: textPrimary,
            fontWeight: 500,
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontSize: isMobile ? 11 : 12,
            color: textSecondary,
            fontWeight: 600,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {count}
        </span>
      </div>
      {/* ✅ A11y — progressbar pour lecteur d'écran */}
      <div
        role="progressbar"
        aria-label={`${label} : ${count}`}
        aria-valuenow={count}
        aria-valuemin={0}
        aria-valuemax={max}
        style={{
          height: 6,
          background: dark ? "#334155" : "#F1F5F9",
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            height: "100%",
            width: `${pct}%`,
            background: color,
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
export function DashboardDirecteur({
  ecoleId, punitions, eleves, classes, fautes, notifs, user,
}) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();

  const userId = user?._id;

  const enseignantsRaw = useQuery(
    api.users.listEnseignantsByEcole,
    ecoleId && userId ? { ecoleId, userId } : "skip"
  );
  const enseignants = useMemo(
    () => enseignantsRaw ?? [],
    [enseignantsRaw]
  );

  const fautesById = useMemo(
    () => new Map((fautes ?? []).map((f) => [f._id, f])),
    [fautes]
  );

  // ========== Calculs disciplinaires ==========
  const top = useMemo(
    () => getTopDerangeurs(punitions ?? [], eleves ?? [], 3),
    [punitions, eleves]
  );

  const parClasse = useMemo(
    () => getPunitionsParClasse(punitions ?? [], eleves ?? [], classes ?? []),
    [punitions, eleves, classes]
  );

  const graves = useMemo(
    () =>
      (punitions ?? []).filter(
        (p) => fautesById.get(p.idFaute)?.gravite === "Grave"
      ),
    [punitions, fautesById]
  );

  // ========== Statistiques ==========
  const totalEleves = eleves?.length ?? 0;
  const totalClasses = classes?.length ?? 0;
  const totalEnseignants = enseignants.length;
  const totalPunitions = punitions?.length ?? 0;

  const { elevesAvecPunitions, tauxElevesAvecPunitions } = useMemo(() => {
    if (!punitions || punitions.length === 0) {
      return { elevesAvecPunitions: 0, tauxElevesAvecPunitions: "0" };
    }
    const elevesAvecPunitions = new Set(punitions.map((p) => p.idEleve)).size;
    const taux =
      totalEleves > 0
        ? ((elevesAvecPunitions / totalEleves) * 100).toFixed(0)
        : "0";
    return { elevesAvecPunitions, tauxElevesAvecPunitions: taux };
  }, [punitions, totalEleves]);

  const effectifsParClasse = useMemo(() => {
    const map = new Map();
    (eleves ?? []).forEach((e) => {
      map.set(e.classe, (map.get(e.classe) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) =>
      a[0].localeCompare(b[0], "fr", { numeric: true })
    );
  }, [eleves]);

  const fautesParGravite = useMemo(() => {
    const counts = { Légère: 0, Moyenne: 0, Grave: 0 };
    (punitions ?? []).forEach((p) => {
      const faute = fautesById.get(p.idFaute);
      if (faute?.gravite && counts[faute.gravite] !== undefined) {
        counts[faute.gravite]++;
      }
    });
    return counts;
  }, [punitions, fautesById]);

  // ========== Couleurs ==========
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const accent = dark ? "#818CF8" : "#4F46E5";
  const danger = dark ? "#F87171" : "#EF4444";
  const warning = dark ? "#FBBF24" : "#F59E0B";
  const success = dark ? "#34D399" : "#10B981";
  const info = dark ? "#38BDF8" : "#0EA5E9";

  // ✅ useMemo pour éviter la recréation à chaque render
  const cardStyle = useMemo(() => ({
    background: cardBg,
    borderRadius: 14,
    padding: isMobile ? "14px" : "18px",
    boxShadow: dark
      ? "0 1px 3px rgba(0,0,0,0.3)"
      : "0 1px 3px rgba(0,0,0,0.05)",
    border: `1px solid ${cardBorder}`,
  }), [cardBg, cardBorder, dark, isMobile]);

  // ========== Loading ==========
  const isLoading =
    punitions === undefined ||
    eleves === undefined ||
    classes === undefined ||
    fautes === undefined ||
    notifs === undefined;

  if (isLoading) {
    return (
      <>
        {Keyframes}
        <div
          role="status"
          aria-busy="true"
          aria-live="polite"
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: 300,
          }}
        >
          <Loader
            size={32}
            className="dd-spin"
            style={{ color: accent }}
            aria-hidden="true"
          />
          <span style={{ position: "absolute", left: -9999 }}>
            Chargement du tableau de bord
          </span>
        </div>
      </>
    );
  }

  // ✅ useMemo — évite le spread de Math.max à chaque render
  const maxEffectif = useMemo(
    () => Math.max(...effectifsParClasse.map(([, n]) => n), 1),
    [effectifsParClasse]
  );
  const maxFaute = useMemo(
    () => Math.max(...Object.values(fautesParGravite), 1),
    [fautesParGravite]
  );
  const toutesFautesZero = useMemo(
    () => Object.values(fautesParGravite).every((v) => v === 0),
    [fautesParGravite]
  );

  // ✅ useMemo — dérivé de parClasse
  const classesTouchees = useMemo(
    () => Object.values(parClasse).filter((v) => v > 0).length,
    [parClasse]
  );

  return (
    <>
      {Keyframes}
      <div
        style={{
          maxWidth: 1200,
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
            Tableau de bord
          </h2>
          <p
            style={{
              color: textSecondary,
              marginTop: 2,
              marginBottom: 0,
              fontSize: isMobile ? 11.5 : 13,
            }}
          >
            Vue globale de l'établissement
          </p>
        </div>

        {/* ==================== STATS ==================== */}
        <div
          style={{
            display: isMobile ? "flex" : "grid",
            gridTemplateColumns: isMobile
              ? undefined
              : "repeat(auto-fit, minmax(150px, 1fr))",
            gap: isMobile ? 8 : 12,
            marginBottom: isMobile ? 14 : 20,
            overflowX: isMobile ? "auto" : "visible",
            paddingBottom: isMobile ? 4 : 0,
            scrollbarWidth: "none",
            ...SCROLL_AREA,
          }}
        >
          <StatCard icon={<ClipboardList size={16} />} label="Punitions" value={totalPunitions} color={accent} dark={dark} isMobile={isMobile} />
          <StatCard icon={<AlertTriangle size={16} />} label="Fautes graves" value={graves.length} color={danger} dark={dark} isMobile={isMobile} />
          <StatCard icon={<Users size={16} />} label="Élèves concernés" value={elevesAvecPunitions} color={warning} dark={dark} isMobile={isMobile} />
          <StatCard icon={<Building size={16} />} label="Classes touchées" value={classesTouchees} color={success} dark={dark} isMobile={isMobile} />
          <StatCard icon={<GraduationCap size={16} />} label="Élèves" value={totalEleves} color={info} dark={dark} isMobile={isMobile} />
          <StatCard icon={<Building size={16} />} label="Classes" value={totalClasses} color={success} dark={dark} isMobile={isMobile} />
          <StatCard icon={<UserCheck size={16} />} label="Enseignants" value={totalEnseignants} color={accent} dark={dark} isMobile={isMobile} />
          <StatCard icon={<Activity size={16} />} label="% élèves punis" value={`${tauxElevesAvecPunitions}%`} color={warning} dark={dark} isMobile={isMobile} />
        </div>

        {/* ==================== RÉPARTITIONS ==================== */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile
              ? "1fr"
              : "repeat(auto-fit, minmax(300px, 1fr))",
            gap: isMobile ? 10 : 14,
            marginBottom: isMobile ? 14 : 20,
            ...SCROLL_AREA,
          }}
        >
          {/* Effectifs par classe */}
          <div style={cardStyle}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <div
                aria-hidden="true"
                style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: `${info}20`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: info, flexShrink: 0,
                }}
              >
                <Users size={14} />
              </div>
              <h3 style={{ fontSize: isMobile ? 13.5 : 14, fontWeight: 700, color: textPrimary, margin: 0 }}>
                Effectifs par classe
              </h3>
            </div>

            {effectifsParClasse.length === 0 ? (
              <p
                role="status"
                aria-live="polite"
                style={{ color: textSecondary, fontSize: 12.5, margin: 0, textAlign: "center", padding: "16px 0" }}
              >
                Aucune donnée
              </p>
            ) : (
              effectifsParClasse.map(([classe, effectif]) => (
                <BarRow key={classe} label={classe} count={effectif} max={maxEffectif} color={info} dark={dark} isMobile={isMobile} />
              ))
            )}
          </div>

          {/* Fautes par gravité */}
          <div style={cardStyle}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <div
                aria-hidden="true"
                style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: `${warning}20`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: warning, flexShrink: 0,
                }}
              >
                <AlertTriangle size={14} />
              </div>
              <h3 style={{ fontSize: isMobile ? 13.5 : 14, fontWeight: 700, color: textPrimary, margin: 0 }}>
                Fautes par gravité
              </h3>
            </div>

            {toutesFautesZero ? (
              <p
                role="status"
                aria-live="polite"
                style={{ color: textSecondary, fontSize: 12.5, margin: 0, textAlign: "center", padding: "16px 0" }}
              >
                Aucune faute enregistrée
              </p>
            ) : (
              Object.entries(fautesParGravite).map(([gravite, count]) => {
                const color =
                  gravite === "Grave" ? danger
                  : gravite === "Moyenne" ? warning
                  : success;
                return (
                  <BarRow key={gravite} label={gravite} count={count} max={maxFaute} color={color} dark={dark} isMobile={isMobile} />
                );
              })
            )}
          </div>
        </div>

        {/* ==================== ALERTES RÉCENTES ==================== */}
        {notifs.length > 0 && (
          <div style={{ ...cardStyle, marginBottom: isMobile ? 14 : 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div
                aria-hidden="true"
                style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: `${danger}20`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: danger, flexShrink: 0,
                }}
              >
                <AlertTriangle size={14} />
              </div>
              <h3 style={{ fontSize: isMobile ? 13.5 : 14, fontWeight: 700, color: textPrimary, margin: 0 }}>
                Alertes récentes
              </h3>
            </div>
            <ul
              role="list"
              style={{ listStyle: "none", padding: 0, margin: 0 }}
            >
              {notifs.slice(-3).map((n, i, arr) => (
                <li
                  key={`${i}-${typeof n === "string" ? n.slice(0, 20) : i}`}
                  style={{
                    padding: "8px 0",
                    borderBottom: i < arr.length - 1 ? `1px solid ${cardBorder}` : "none",
                    fontSize: isMobile ? 12 : 13,
                    color: textPrimary,
                    lineHeight: 1.4,
                  }}
                >
                  {n}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ==================== TOP 3 ==================== */}
        <div style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div
              aria-hidden="true"
              style={{
                width: 28, height: 28, borderRadius: 8,
                background: `${warning}20`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: warning, flexShrink: 0,
              }}
            >
              <Flame size={14} />
            </div>
            <h3 style={{ fontSize: isMobile ? 13.5 : 14, fontWeight: 700, color: textPrimary, margin: 0 }}>
              Élèves les plus sanctionnés
            </h3>
          </div>

          {top.length === 0 ? (
            <p
              role="status"
              aria-live="polite"
              style={{ color: textSecondary, fontSize: 12.5, margin: 0, textAlign: "center", padding: "16px 0" }}
            >
              Aucun élève sanctionné
            </p>
          ) : (
            <ol
              role="list"
              style={{ listStyle: "none", padding: 0, margin: 0 }}
            >
              {top.map((t, i) => (
                <li
                  key={t.eleve?._id ?? `top-${i}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 0",
                    borderBottom: i < top.length - 1 ? `1px solid ${cardBorder}` : "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                    <div
                      aria-label={`Rang ${i + 1}`}
                      style={{
                        width: isMobile ? 28 : 32,
                        height: isMobile ? 28 : 32,
                        borderRadius: "50%",
                        background: i === 0 ? danger : i === 1 ? warning : accent,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: isMobile ? 12 : 13,
                        fontWeight: 800,
                        color: "#fff",
                        flexShrink: 0,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {i + 1}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: isMobile ? 13 : 14,
                          color: textPrimary,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {t.eleve?.nom} {t.eleve?.postnom}
                      </div>
                      <div style={{ fontSize: isMobile ? 11 : 12, color: textSecondary }}>
                        Classe {t.eleve?.classe}
                      </div>
                    </div>
                  </div>
                  <span
                    style={{
                      background: i === 0 ? danger : warning,
                      color: "#fff",
                      padding: "2px 10px",
                      borderRadius: 20,
                      fontSize: isMobile ? 11 : 12,
                      fontWeight: 600,
                      flexShrink: 0,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {t.count} faute{t.count > 1 ? "s" : ""}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </>
  );
}