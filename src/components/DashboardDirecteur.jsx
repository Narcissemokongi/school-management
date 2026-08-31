import { useMemo } from "react";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  ClipboardList, AlertTriangle, Users, Building, Loader,
  BarChart3, GraduationCap, UserCheck, Activity,
} from "lucide-react";
import { getFaute, getTopDerangeurs, getPunitionsParClasse } from "../utils";

export function DashboardDirecteur({ punitions, eleves, classes, fautes, notifs }) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();

  // ========== Calculs disciplinaires ==========
  const top = useMemo(() => getTopDerangeurs(punitions, eleves, 3), [punitions, eleves]);
  const parClasse = useMemo(() => getPunitionsParClasse(punitions, eleves, classes), [punitions, eleves, classes]);
  const graves = useMemo(
    () => punitions.filter((p) => getFaute(fautes, p.idFaute)?.gravite === "Grave"),
    [punitions, fautes]
  );

  // ========== Statistiques pédagogiques ==========
  const totalEleves = eleves.length;
  const totalClasses = classes.length;
  const totalEnseignants = 0; // ⚠️ À adapter si les données sont disponibles
  const totalPunitions = punitions.length;
  const elevesAvecPunitions = new Set(punitions.map((p) => p.idEleve)).size;
  const tauxPunitionsParEleve = totalEleves > 0 ? (totalPunitions / totalEleves).toFixed(1) : "0";
  const tauxElevesAvecPunitions = totalEleves > 0 ? ((elevesAvecPunitions / totalEleves) * 100).toFixed(0) : "0";

  // Répartition des élèves par classe (effectifs)
  const effectifsParClasse = useMemo(() => {
    const map = new Map();
    eleves.forEach((e) => {
      map.set(e.classe, (map.get(e.classe) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], 'fr', { numeric: true }));
  }, [eleves]);

  // Répartition des fautes par gravité
  const fautesParGravite = useMemo(() => {
    const counts = { Légère: 0, Moyenne: 0, Grave: 0 };
    punitions.forEach((p) => {
      const faute = getFaute(fautes, p.idFaute);
      if (faute?.gravite) counts[faute.gravite]++;
    });
    return counts;
  }, [punitions, fautes]);

  // ========== Couleurs adaptatives ==========
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const shadow = dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)";
  const accent = dark ? "#818CF8" : "#4F46E5";
  const danger = dark ? "#F87171" : "#EF4444";
  const warning = dark ? "#FBBF24" : "#F59E0B";
  const success = dark ? "#34D399" : "#10B981";
  const info = dark ? "#38BDF8" : "#0EA5E9";

  // ========== Gestion du chargement ==========
  const isLoading =
    punitions === undefined ||
    eleves === undefined ||
    classes === undefined ||
    fautes === undefined ||
    notifs === undefined;

  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 300 }}>
        <Loader size={32} className="animate-spin" style={{ color: accent }} />
      </div>
    );
  }

  // Styles responsives
  const containerPadding = isMobile ? "16px 12px" : "24px 16px";
  const gridStats = {
    display: "grid",
    gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(150px, 1fr))",
    gap: isMobile ? 12 : 16,
    marginBottom: isMobile ? 24 : 32,
  };
  const gridPedago = {
    display: "grid",
    gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(150px, 1fr))",
    gap: isMobile ? 12 : 16,
    marginBottom: isMobile ? 24 : 32,
  };
  const gridRepartition = {
    display: "grid",
    gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(300px, 1fr))",
    gap: isMobile ? 16 : 24,
    marginBottom: isMobile ? 24 : 32,
  };
  const cardPadding = isMobile ? "14px" : "20px";
  const titleSize = isMobile ? 20 : 28;
  const sectionTitleSize = isMobile ? 16 : 18;
  const statValueSize = isMobile ? 24 : 28;

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: containerPadding }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .animate-spin { animation: spin 1s linear infinite; }`}</style>

      {/* En-tête */}
      <div style={{ marginBottom: isMobile ? 20 : 32 }}>
        <h2 style={{ fontSize: titleSize, fontWeight: 700, color: textPrimary, margin: 0 }}>
          Tableau de bord du directeur
        </h2>
        <p style={{ color: textSecondary, marginTop: 4, fontSize: isMobile ? 13 : 14 }}>
          Vue globale de l'établissement – discipline et pédagogie
        </p>
      </div>

      {/* Section 1 : Indicateurs clés disciplinaires */}
      <h3 style={{ fontSize: sectionTitleSize, fontWeight: 600, color: textPrimary, marginBottom: isMobile ? 12 : 16 }}>
        Indicateurs disciplinaires
      </h3>
      <div style={gridStats}>
        {[
          { label: "Total punitions", value: totalPunitions, color: accent, Icon: ClipboardList },
          { label: "Fautes graves", value: graves.length, color: danger, Icon: AlertTriangle },
          { label: "Élèves concernés", value: elevesAvecPunitions, color: warning, Icon: Users },
          { label: "Classes touchées", value: Object.values(parClasse).filter((v) => v > 0).length, color: success, Icon: Building },
        ].map(({ label, value, color, Icon }) => (
          <div
            key={label}
            style={{
              background: cardBg,
              borderRadius: 16,
              padding: cardPadding,
              textAlign: "center",
              boxShadow: shadow,
              border: `1px solid ${cardBorder}`,
              transition: "background-color 0.3s",
            }}
          >
            <Icon size={isMobile ? 24 : 28} color={color} style={{ marginBottom: 6 }} />
            <div style={{ fontSize: statValueSize, fontWeight: 900, color }}>{value}</div>
            <div style={{ fontSize: isMobile ? 11 : 12, color: textSecondary }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Section 2 : Indicateurs pédagogiques */}
      <h3 style={{ fontSize: sectionTitleSize, fontWeight: 600, color: textPrimary, marginBottom: isMobile ? 12 : 16 }}>
        Indicateurs pédagogiques
      </h3>
      <div style={gridPedago}>
        <div style={{ ...cardStyle(cardBg, cardBorder, shadow, cardPadding), textAlign: "center" }}>
          <GraduationCap size={isMobile ? 24 : 28} color={info} style={{ marginBottom: 6 }} />
          <div style={{ fontSize: statValueSize, fontWeight: 900, color: info }}>{totalEleves}</div>
          <div style={{ fontSize: isMobile ? 11 : 12, color: textSecondary }}>Élèves</div>
        </div>
        <div style={{ ...cardStyle(cardBg, cardBorder, shadow, cardPadding), textAlign: "center" }}>
          <Building size={isMobile ? 24 : 28} color={success} style={{ marginBottom: 6 }} />
          <div style={{ fontSize: statValueSize, fontWeight: 900, color: success }}>{totalClasses}</div>
          <div style={{ fontSize: isMobile ? 11 : 12, color: textSecondary }}>Classes</div>
        </div>
        <div style={{ ...cardStyle(cardBg, cardBorder, shadow, cardPadding), textAlign: "center" }}>
          <UserCheck size={isMobile ? 24 : 28} color={accent} style={{ marginBottom: 6 }} />
          <div style={{ fontSize: statValueSize, fontWeight: 900, color: accent }}>{totalEnseignants}</div>
          <div style={{ fontSize: isMobile ? 11 : 12, color: textSecondary }}>Enseignants</div>
        </div>
        <div style={{ ...cardStyle(cardBg, cardBorder, shadow, cardPadding), textAlign: "center" }}>
          <Activity size={isMobile ? 24 : 28} color={warning} style={{ marginBottom: 6 }} />
          <div style={{ fontSize: statValueSize, fontWeight: 900, color: warning }}>{tauxElevesAvecPunitions}%</div>
          <div style={{ fontSize: isMobile ? 11 : 12, color: textSecondary }}>Taux d'élèves punis</div>
        </div>
      </div>

      {/* Section 3 : Répartition des élèves par classe */}
      <div style={gridRepartition}>
        <div style={cardStyle(cardBg, cardBorder, shadow, cardPadding)}>
          <h4 style={{ fontSize: isMobile ? 14 : 16, fontWeight: 600, color: textPrimary, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <Users size={isMobile ? 16 : 18} color={info} />
            Effectifs par classe
          </h4>
          {effectifsParClasse.length === 0 ? (
            <p style={{ color: textSecondary, fontSize: 14 }}>Aucune donnée.</p>
          ) : (
            effectifsParClasse.map(([classe, effectif]) => {
              const max = Math.max(...effectifsParClasse.map(([, n]) => n), 1);
              const pct = (effectif / max) * 100;
              return (
                <div key={classe} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: isMobile ? 12 : 13, color: textPrimary }}>{classe}</span>
                    <span style={{ fontSize: isMobile ? 11 : 12, color: textSecondary }}>{effectif} élève(s)</span>
                  </div>
                  <div style={{ height: 8, background: dark ? "#334155" : "#F1F5F9", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      width: `${pct}%`,
                      background: info,
                      borderRadius: 4,
                      transition: "width 0.3s ease",
                    }} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Section 4 : Répartition des fautes par gravité */}
        <div style={cardStyle(cardBg, cardBorder, shadow, cardPadding)}>
          <h4 style={{ fontSize: isMobile ? 14 : 16, fontWeight: 600, color: textPrimary, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <AlertTriangle size={isMobile ? 16 : 18} color={warning} />
            Fautes par gravité
          </h4>
          {Object.values(fautesParGravite).every((v) => v === 0) ? (
            <p style={{ color: textSecondary, fontSize: 14 }}>Aucune faute enregistrée.</p>
          ) : (
            Object.entries(fautesParGravite).map(([gravite, count]) => {
              const color = gravite === "Grave" ? danger : gravite === "Moyenne" ? warning : success;
              const max = Math.max(...Object.values(fautesParGravite), 1);
              const pct = (count / max) * 100;
              return (
                <div key={gravite} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: isMobile ? 12 : 13, color: textPrimary }}>{gravite}</span>
                    <span style={{ fontSize: isMobile ? 11 : 12, color: textSecondary }}>{count}</span>
                  </div>
                  <div style={{ height: 8, background: dark ? "#334155" : "#F1F5F9", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      width: `${pct}%`,
                      background: color,
                      borderRadius: 4,
                      transition: "width 0.3s ease",
                    }} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Section 5 : Alertes récentes */}
      {notifs.length > 0 && (
        <div style={{ ...cardStyle(cardBg, cardBorder, shadow, cardPadding), marginBottom: 24 }}>
          <div style={{ fontWeight: 700, color: danger, marginBottom: 10, display: "flex", alignItems: "center", gap: 8, fontSize: isMobile ? 14 : 16 }}>
            <AlertTriangle size={isMobile ? 16 : 18} />
            Alertes récentes
          </div>
          {notifs.slice(-3).map((n, i) => (
            <div
              key={i}
              style={{
                padding: "8px 0",
                borderBottom: i < Math.min(notifs.length, 3) - 1 ? `1px solid ${cardBorder}` : "none",
                fontSize: isMobile ? 12 : 13,
                color: textPrimary,
              }}
            >
              {n}
            </div>
          ))}
        </div>
      )}

      {/* Section 6 : Top 3 des élèves les plus sanctionnés */}
      <div style={{ ...cardStyle(cardBg, cardBorder, shadow, cardPadding) }}>
        <div style={{ fontWeight: 700, marginBottom: 12, fontSize: isMobile ? 14 : 16, color: textPrimary }}>
          🔥 Cerveaux moteurs
        </div>
        {top.length === 0 ? (
          <p style={{ color: textSecondary, fontSize: 14 }}>Aucun élève sanctionné.</p>
        ) : (
          top.map((t, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 0",
                borderBottom: i < top.length - 1 ? `1px solid ${cardBorder}` : "none",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: isMobile ? 28 : 32,
                  height: isMobile ? 28 : 32,
                  borderRadius: "50%",
                  background: i === 0 ? danger : i === 1 ? warning : accent,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: isMobile ? 12 : 14,
                  fontWeight: 800,
                  color: "#fff",
                }}>
                  {i + 1}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: isMobile ? 13 : 14, color: textPrimary }}>
                    {t.eleve?.nom} {t.eleve?.postnom}
                  </div>
                  <div style={{ fontSize: isMobile ? 11 : 12, color: textSecondary }}>
                    Classe {t.eleve?.classe}
                  </div>
                </div>
              </div>
              <span style={{
                background: i === 0 ? danger : warning,
                color: "#fff",
                padding: "2px 10px",
                borderRadius: 20,
                fontSize: isMobile ? 11 : 12,
                fontWeight: 600,
              }}>
                {t.count} faute(s)
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Fonction utilitaire pour éviter la répétition des styles de carte
function cardStyle(bg, border, shadow, padding = "20px") {
  return {
    background: bg,
    borderRadius: 16,
    padding: padding,
    boxShadow: shadow,
    border: `1px solid ${border}`,
    transition: "background-color 0.3s",
  };
}