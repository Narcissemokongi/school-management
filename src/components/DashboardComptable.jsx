import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useStyles } from "../styles/theme";
import {
  DollarSign,
  TrendingUp,
  CheckCircle,
  Clock,
  BarChart3,
  School,
} from "lucide-react";

export function DashboardComptable({ ecoleId, eleves, anneeId, anneeActive }) {
  const { S } = useStyles();

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
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px", textAlign: "center" }}>
        <DollarSign size={48} color="#F59E0B" style={{ marginBottom: 16 }} />
        <h2 style={{ fontSize: 24, fontWeight: 600, color: "#1E293B", margin: "0 0 8px" }}>
          Aucune année scolaire active
        </h2>
        <p style={{ color: "#64748B", fontSize: 14 }}>
          Veuillez activer une année scolaire pour voir le tableau de bord.
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 16px" }}>
      {/* En-tête */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, color: "#1E293B", margin: 0 }}>
          Tableau de bord comptable {anneeActive ? `· ${anneeActive.nom}` : ""}
        </h2>
        <p style={{ color: "#64748B", marginTop: 4, fontSize: 14 }}>
          Vue d'ensemble des finances de l'établissement ({deviseSymbol})
        </p>
      </div>

      {/* Cartes statistiques */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16,
          marginBottom: 32,
        }}
      >
        <StatCard
          icon={<DollarSign size={24} />}
          value={`${totalFrais.toLocaleString()} ${deviseSymbol}`}
          label="Total dû"
          color="#4F46E5"
        />
        <StatCard
          icon={<CheckCircle size={24} />}
          value={`${totalPaye.toLocaleString()} ${deviseSymbol}`}
          label="Total payé"
          color="#10B981"
        />
        <StatCard
          icon={<Clock size={24} />}
          value={`${reste.toLocaleString()} ${deviseSymbol}`}
          label="Reste à payer"
          color={reste > 0 ? "#EF4444" : "#10B981"}
        />
        <StatCard
          icon={<TrendingUp size={24} />}
          value={`${tauxPaiement}%`}
          label="Taux de paiement"
          color="#F59E0B"
        />
        <StatCard
          icon={<School size={24} />}
          value={nbElevesAvecFrais}
          label="Élèves avec frais"
          color="#6366F1"
        />
      </div>

      {/* Statistiques par classe */}
      <div
        style={{
          background: "#FFF",
          borderRadius: 16,
          padding: 24,
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}
      >
        <h3
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: "#1E293B",
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <BarChart3 size={20} color="#4F46E5" /> Paiements par classe
        </h3>
        {statsParClasse.length === 0 && (
          <p style={{ color: "#64748B", fontSize: 14 }}>Aucune donnée disponible.</p>
        )}
        {statsParClasse.map((c) => (
          <div key={c.classe} style={{ marginBottom: 20 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <span style={{ fontWeight: 500, fontSize: 14 }}>
                {c.classe} ({c.nbEleves} élève(s))
              </span>
              <span style={{ fontSize: 13, color: "#64748B" }}>
                {c.paye.toLocaleString()} / {c.total.toLocaleString()} {deviseSymbol} — {c.taux}%
              </span>
            </div>
            {/* Barre de progression */}
            <div
              style={{
                height: 8,
                background: "#F1F5F9",
                borderRadius: 4,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${c.taux}%`,
                  height: "100%",
                  background: c.taux >= 80 ? "#10B981" : c.taux >= 50 ? "#F59E0B" : "#EF4444",
                  borderRadius: 4,
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ icon, value, label, color }) {
  return (
    <div
      style={{
        background: "#FFF",
        borderRadius: 16,
        padding: 20,
        display: "flex",
        alignItems: "center",
        gap: 16,
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          background: `${color}15`,
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
        <div style={{ fontSize: 20, fontWeight: 700, color: "#1E293B" }}>
          {value}
        </div>
        <div style={{ fontSize: 14, color: "#64748B" }}>{label}</div>
      </div>
    </div>
  );
}