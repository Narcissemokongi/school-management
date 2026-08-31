import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useStyles } from "../styles/theme";
import { useIsMobile } from "../hooks/useIsMobile";
import {
  DollarSign,
  TrendingUp,
  CheckCircle,
  Clock,
  BarChart3,
  School,
  Loader,
} from "lucide-react";

export function DashboardComptable({ ecoleId, eleves, anneeId, anneeActive }) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();

  // Récupération de la devise
  const ecole = useQuery(
    api.ecoles.get,
    ecoleId ? { ecoleId } : "skip"
  );
  const devise = ecole?.devise || "CDF";
  const deviseSymbol = devise === "USD" ? "$" : "FC";

  // Frais de l'année
  const frais =
    useQuery(
      api.frais.listByEcole,
      anneeId ? { ecoleId, anneeId } : { ecoleId }
    ) ?? [];

  // Couleurs adaptatives
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const accent = dark ? "#818CF8" : "#4F46E5";
  const success = dark ? "#34D399" : "#10B981";
  const warning = dark ? "#FBBF24" : "#F59E0B";
  const danger = dark ? "#F87171" : "#EF4444";
  const mutedBg = dark ? "#0F172A" : "#F8FAFC";
  const shadow = dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)";

  // Gestion du chargement
  const isLoading = ecole === undefined || frais === undefined;

  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 300 }}>
        <Loader size={32} className="animate-spin" style={{ color: accent }} />
      </div>
    );
  }

  // Calculs globaux
  const totalFrais = frais.reduce((sum, f) => sum + f.montantTotal, 0);
  const totalPaye = frais.reduce((sum, f) => sum + f.montantPaye, 0);
  const reste = totalFrais - totalPaye;
  const nbElevesAvecFrais = new Set(frais.map((f) => f.eleveId)).size;
  const tauxPaiement =
    totalFrais > 0 ? ((totalPaye / totalFrais) * 100).toFixed(0) : 0;

  // Par classe
  const statsParClasse = useMemo(() => {
    const map = {};
    frais.forEach((f) => {
      const eleve = eleves.find((e) => e._id === f.eleveId);
      const classe = eleve?.classe || "Inconnue";
      if (!map[classe]) {
        map[classe] = { classe, total: 0, paye: 0, nbEleves: 0, eleveIds: new Set() };
      }
      map[classe].total += f.montantTotal;
      map[classe].paye += f.montantPaye;
      map[classe].eleveIds.add(f.eleveId);
    });
    return Object.values(map)
      .map((c) => ({
        ...c,
        nbEleves: c.eleveIds.size,
        taux: c.total > 0 ? ((c.paye / c.total) * 100).toFixed(0) : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [frais, eleves]);

  const maxTotalClasse = Math.max(...statsParClasse.map((c) => c.total), 1);

  if (!anneeId) {
    return (
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: isMobile ? "32px 16px" : "32px 24px", textAlign: "center" }}>
        <DollarSign size={48} color={warning} style={{ marginBottom: 16 }} />
        <h2 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 600, color: textPrimary, margin: "0 0 8px" }}>
          Aucune année scolaire active
        </h2>
        <p style={{ color: textSecondary, fontSize: isMobile ? 13 : 14 }}>
          Veuillez activer une année scolaire pour voir le tableau de bord.
        </p>
      </div>
    );
  }

  // Styles adaptatifs
  const containerPadding = isMobile ? "16px 12px" : "24px 16px";
  const titleSize = isMobile ? 22 : 28;
  const subtitleSize = isMobile ? 13 : 14;
  const statGridStyle = {
    display: "grid",
    gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(200px, 1fr))",
    gap: isMobile ? 12 : 16,
    marginBottom: isMobile ? 24 : 32,
  };
  const sectionTitleSize = isMobile ? 16 : 18;
  const sectionPadding = isMobile ? 16 : 24;
  const sectionMarginBottom = isMobile ? 16 : 20;

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: containerPadding }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .animate-spin { animation: spin 1s linear infinite; }`}</style>

      {/* En-tête */}
      <div style={{ marginBottom: isMobile ? 20 : 32 }}>
        <h2 style={{ fontSize: titleSize, fontWeight: 700, color: textPrimary, margin: 0 }}>
          Tableau de bord comptable {anneeActive ? `· ${anneeActive.nom}` : ""}
        </h2>
        <p style={{ color: textSecondary, marginTop: 4, fontSize: subtitleSize }}>
          Vue d'ensemble des finances de l'établissement ({deviseSymbol})
        </p>
      </div>

      {/* Cartes statistiques */}
      <div style={statGridStyle}>
        <StatCard
          icon={<DollarSign size={isMobile ? 20 : 24} />}
          value={`${totalFrais.toLocaleString()} ${deviseSymbol}`}
          label="Total dû"
          color={accent}
          dark={dark}
          isMobile={isMobile}
        />
        <StatCard
          icon={<CheckCircle size={isMobile ? 20 : 24} />}
          value={`${totalPaye.toLocaleString()} ${deviseSymbol}`}
          label="Total payé"
          color={success}
          dark={dark}
          isMobile={isMobile}
        />
        <StatCard
          icon={<Clock size={isMobile ? 20 : 24} />}
          value={`${reste.toLocaleString()} ${deviseSymbol}`}
          label="Reste à payer"
          color={reste > 0 ? danger : success}
          dark={dark}
          isMobile={isMobile}
        />
        <StatCard
          icon={<TrendingUp size={isMobile ? 20 : 24} />}
          value={`${tauxPaiement}%`}
          label="Taux de paiement"
          color={warning}
          dark={dark}
          isMobile={isMobile}
        />
        <StatCard
          icon={<School size={isMobile ? 20 : 24} />}
          value={nbElevesAvecFrais}
          label="Élèves avec frais"
          color="#6366F1"
          dark={dark}
          isMobile={isMobile}
        />
      </div>

      {/* Statistiques par classe */}
      <div
        style={{
          background: cardBg,
          borderRadius: 16,
          padding: sectionPadding,
          boxShadow: shadow,
          border: `1px solid ${cardBorder}`,
          transition: "background-color 0.3s",
        }}
      >
        <h3
          style={{
            fontSize: sectionTitleSize,
            fontWeight: 600,
            color: textPrimary,
            marginBottom: isMobile ? 16 : 20,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <BarChart3 size={isMobile ? 18 : 20} color={accent} /> Paiements par classe
        </h3>
        {statsParClasse.length === 0 ? (
          <p style={{ color: textSecondary, fontSize: 14 }}>Aucune donnée disponible.</p>
        ) : (
          statsParClasse.map((c) => (
            <div key={c.classe} style={{ marginBottom: sectionMarginBottom }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                <span style={{ fontWeight: 500, fontSize: isMobile ? 13 : 14, color: textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {c.classe} ({c.nbEleves} élève(s))
                </span>
                <span style={{ fontSize: isMobile ? 12 : 13, color: textSecondary, whiteSpace: "nowrap" }}>
                  {c.paye.toLocaleString()} / {c.total.toLocaleString()} {deviseSymbol} — {c.taux}%
                </span>
              </div>
              <div
                style={{
                  height: 8,
                  background: mutedBg,
                  borderRadius: 4,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${c.taux}%`,
                    height: "100%",
                    background: c.taux >= 80 ? success : c.taux >= 50 ? warning : danger,
                    borderRadius: 4,
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, value, label, color, dark, isMobile }) {
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const shadow = dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)";
  const border = dark ? "#334155" : "#E2E8F0";

  return (
    <div
      style={{
        background: cardBg,
        borderRadius: 16,
        padding: isMobile ? 14 : 20,
        display: "flex",
        alignItems: "center",
        gap: isMobile ? 12 : 16,
        boxShadow: shadow,
        border: `1px solid ${border}`,
      }}
    >
      <div
        style={{
          width: isMobile ? 40 : 48,
          height: isMobile ? 40 : 48,
          background: `${color}${dark ? "33" : "15"}`,
          borderRadius: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: color,
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontSize: isMobile ? 16 : 20, fontWeight: 700, color: textPrimary }}>
          {value}
        </div>
        <div style={{ fontSize: isMobile ? 12 : 14, color: textSecondary }}>{label}</div>
      </div>
    </div>
  );
}