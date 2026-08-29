import { useState, useMemo } from "react";
import { useStyles } from "../styles/theme";
import { getEleve, getFaute } from "../utils";
import { Search, AlertTriangle, Scale } from "lucide-react";

export function HistoriqueDisciplinaire({ punitions, eleves, fautes, user }) {
  const { S, dark } = useStyles();
  const [searchTerm, setSearchTerm] = useState("");

  // Filtrer les punitions du disciplinaire connecté
  const myPunitions = useMemo(() => {
    if (!punitions || !user) return [];
    let list = punitions
      .filter((p) => p.disciplinaire === user.nom)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      list = list.filter((p) => {
        const eleve = getEleve(eleves, p.idEleve);
        if (!eleve) return false;
        const nomComplet = `${eleve.nom} ${eleve.postnom} ${eleve.prenom || ''}`.toLowerCase();
        return nomComplet.includes(query) || (eleve.classe || '').toLowerCase().includes(query);
      });
    }
    return list;
  }, [punitions, user, searchTerm, eleves]);

  // États de chargement
  if (punitions === undefined || eleves === undefined || fautes === undefined) {
    return (
      <div style={{ textAlign: "center", padding: 40, color: dark ? "#94A3B8" : "#64748B" }}>
        Chargement...
      </div>
    );
  }

  // Couleurs adaptatives
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const cardShadow = dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)";
  const inputBg = dark ? "#0F172A" : "#F9FAFB";
  const inputText = dark ? "#F1F5F9" : "#1E293B";
  const iconColor = dark ? "#94A3B8" : "#64748B";

  // Helper pour le badge de gravité
  const graviteBadge = (gravite) => {
    const styles = {
      "Grave": { bg: dark ? "#7F1D1D" : "#FEE2E2", color: dark ? "#F87171" : "#B91C1C" },
      "Moyenne": { bg: dark ? "#78350F" : "#FEF3C7", color: dark ? "#FBBF24" : "#92400E" },
      "Légère": { bg: dark ? "#064E3B" : "#D1FAE5", color: dark ? "#34D399" : "#065F46" },
    };
    const style = styles[gravite] || { bg: dark ? "#334155" : "#E2E8F0", color: dark ? "#CBD5E1" : "#475569" };
    return (
      <span style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "4px 10px",
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 600,
        background: style.bg,
        color: style.color,
      }}>
        {gravite || "—"}
      </span>
    );
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ ...S.h2, color: textPrimary }}>Mon historique</div>
        <div style={{ ...S.muted, color: textSecondary }}>{myPunitions.length} punition(s) enregistrée(s)</div>
      </div>

      {/* Barre de recherche */}
      <div style={{ marginBottom: 20, display: "flex", alignItems: "center", background: cardBg, borderRadius: 10, padding: "8px 12px", border: `1px solid ${cardBorder}` }}>
        <Search size={18} color={iconColor} />
        <input
          type="text"
          placeholder="Rechercher par nom ou classe..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            border: "none",
            outline: "none",
            marginLeft: 8,
            fontSize: 14,
            width: "100%",
            background: "transparent",
            color: inputText,
          }}
        />
      </div>

      {/* Liste des punitions */}
      {myPunitions.map((p) => {
        const eleve = getEleve(eleves, p.idEleve);
        const faute = getFaute(fautes, p.idFaute);
        return (
          <div
            key={p._id}
            style={{
              background: cardBg,
              borderRadius: 16,
              padding: 20,
              boxShadow: cardShadow,
              border: `1px solid ${cardBorder}`,
              marginBottom: 12,
              transition: "background-color 0.3s",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: textPrimary }}>
                {eleve ? `${eleve.nom} ${eleve.postnom} ${eleve.prenom || ''}` : "Élève inconnu"}
              </div>
              {graviteBadge(faute?.gravite)}
            </div>

            <div style={{ fontSize: 14, color: textSecondary, marginBottom: 6 }}>
              Classe {eleve?.classe || "?"} • {p.date}
            </div>

            <div style={{ fontSize: 14, color: textPrimary, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
              <AlertTriangle size={16} color={dark ? "#818CF8" : "#4F46E5"} />
              {faute?.libelle || "Faute inconnue"}
            </div>

            <div style={{ fontSize: 13, color: textSecondary, display: "flex", alignItems: "center", gap: 6 }}>
              <Scale size={16} color={dark ? "#94A3B8" : "#64748B"} />
              Sanction : {p.sanction}
            </div>

            {p.commentaire && (
              <div style={{ fontSize: 12, color: textSecondary, marginTop: 6, fontStyle: "italic" }}>
                "{p.commentaire}"
              </div>
            )}
          </div>
        );
      })}

      {myPunitions.length === 0 && (
        <div style={{ textAlign: "center", padding: 40, color: textSecondary }}>
          {searchTerm ? "Aucun résultat trouvé." : "Aucune punition enregistrée"}
        </div>
      )}
    </div>
  );
}