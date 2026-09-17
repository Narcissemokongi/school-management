import { useState, useMemo } from "react";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import { getEleve, getFaute } from "../utils";
import {
  Search, AlertTriangle, Scale, X, ClipboardList,
} from "lucide-react";

// ============================================================
// FORMATAGE DE DATE
// ============================================================
function formatDateLabel(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const check = new Date(d);
  check.setHours(0, 0, 0, 0);

  if (check.getTime() === today.getTime()) return "Aujourd'hui";

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (check.getTime() === yesterday.getTime()) return "Hier";

  const diffDays = Math.round((today - check) / (1000 * 60 * 60 * 24));
  if (diffDays > 0 && diffDays < 7) {
    return d.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
    });
  }
  if (d.getFullYear() === today.getFullYear()) {
    return d.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
    });
  }
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ============================================================
// BADGE DE GRAVITÉ
// ============================================================
function GraviteBadge({ gravite, dark }) {
  const config =
    gravite === "Grave"
      ? {
          bg: dark ? "#7F1D1D" : "#FEE2E2",
          color: dark ? "#F87171" : "#B91C1C",
          label: "Grave",
        }
      : gravite === "Moyenne"
      ? {
          bg: dark ? "#78350F" : "#FEF3C7",
          color: dark ? "#FBBF24" : "#92400E",
          label: "Moyenne",
        }
      : {
          bg: dark ? "#064E3B" : "#D1FAE5",
          color: dark ? "#34D399" : "#065F46",
          label: "Légère",
        };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        background: config.bg,
        color: config.color,
        padding: "2px 8px",
        borderRadius: 10,
        fontSize: 10,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      <AlertTriangle size={10} />
      {config.label}
    </span>
  );
}

// ============================================================
// CARTE PUNITION
// ============================================================
function PunitionCard({ punition, eleve, faute, dark, isMobile }) {
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const accent = dark ? "#818CF8" : "#4F46E5";
  const accentBg = dark ? "#312E81" : "#EEF2FF";
  const shadow = dark
    ? "0 1px 2px rgba(0,0,0,0.25)"
    : "0 1px 2px rgba(0,0,0,0.04)";

  const initials = eleve
    ? `${eleve.nom?.[0] || ""}${eleve.postnom?.[0] || ""}`.toUpperCase()
    : "?";

  return (
    <div
      style={{
        background: cardBg,
        borderRadius: 12,
        padding: isMobile ? "10px 12px" : "12px 14px",
        boxShadow: shadow,
        border: `1px solid ${cardBorder}`,
      }}
    >
      {/* HEADER */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 10,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: accentBg,
            color: accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: 12,
            flexShrink: 0,
          }}
        >
          {initials}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 2,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontWeight: 600,
                fontSize: isMobile ? 13.5 : 14,
                color: textPrimary,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {eleve
                ? `${eleve.nom} ${eleve.postnom} ${eleve.prenom || ""}`.trim()
                : "Élève inconnu"}
            </span>
            <GraviteBadge gravite={faute?.gravite} dark={dark} />
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              color: textSecondary,
            }}
          >
            <span>{eleve?.classe || "Classe inconnue"}</span>
            <span style={{ opacity: 0.5 }}>·</span>
            <span>{formatDateLabel(punition.date)}</span>
          </div>
        </div>
      </div>

      {/* FAUTE */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: isMobile ? 12.5 : 13,
          color: textPrimary,
          fontWeight: 600,
          marginBottom: 6,
        }}
      >
        <AlertTriangle size={13} color={accent} style={{ flexShrink: 0 }} />
        {faute?.libelle || "Faute inconnue"}
      </div>

      {/* SANCTION */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: isMobile ? 11.5 : 12,
          color: textSecondary,
        }}
      >
        <Scale size={12} style={{ flexShrink: 0 }} />
        Sanction : {punition.sanction}
      </div>

      {/* COMMENTAIRE */}
      {punition.commentaire && (
        <div
          style={{
            marginTop: 8,
            padding: "8px 10px",
            background: dark ? "#0F172A" : "#F8FAFC",
            border: `1px solid ${cardBorder}`,
            borderRadius: 8,
            fontSize: isMobile ? 11.5 : 12,
            color: textSecondary,
            fontStyle: "italic",
            lineHeight: 1.4,
          }}
        >
          « {punition.commentaire} »
        </div>
      )}
    </div>
  );
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================
export function HistoriqueDisciplinaire({ punitions, eleves, fautes, user }) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();

  const [searchTerm, setSearchTerm] = useState("");

  // Couleurs
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const accent = dark ? "#818CF8" : "#4F46E5";
  const accentBg = dark ? "#312E81" : "#EEF2FF";
  const shadow = dark
    ? "0 1px 3px rgba(0,0,0,0.3)"
    : "0 1px 3px rgba(0,0,0,0.05)";

  // ============================================================
  // INDEX (Map) — évite les .find() O(n) répétés
  // ============================================================
  const elevesById = useMemo(
    () => new Map((eleves ?? []).map((e) => [e._id, e])),
    [eleves]
  );
  const fautesById = useMemo(
    () => new Map((fautes ?? []).map((f) => [f._id, f])),
    [fautes]
  );

  // ============================================================
  // PUNITIONS DE L'UTILISATEUR CONNECTÉ (enrichies une seule fois)
  // ============================================================
  const myPunitions = useMemo(() => {
    if (!punitions || !user) return [];

    const all = punitions
      .filter((p) => p.disciplinaire === user.nom)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    // ✅ Enrichissement une seule fois
    const enriched = all.map((p) => ({
      ...p,
      _eleve: elevesById.get(p.idEleve) ?? null,
      _faute: fautesById.get(p.idFaute) ?? null,
    }));

    if (!searchTerm.trim()) return enriched;

    const query = searchTerm.toLowerCase();
    return enriched.filter((p) => {
      const e = p._eleve;
      if (!e) return false;
      const nomComplet =
        `${e.nom} ${e.postnom} ${e.prenom || ""}`.toLowerCase();
      return (
        nomComplet.includes(query) ||
        (e.classe || "").toLowerCase().includes(query)
      );
    });
  }, [punitions, user, searchTerm, elevesById, fautesById]);

  // ============================================================
  // STATS
  // ============================================================
  const stats = useMemo(() => {
    if (!punitions || !user) return { total: 0, graves: 0 };

    let total = 0;
    let graves = 0;
    for (const p of punitions) {
      if (p.disciplinaire !== user.nom) continue;
      total++;
      const faute = fautesById.get(p.idFaute);
      if (faute?.gravite === "Grave") graves++;
    }
    return { total, graves };
  }, [punitions, user, fautesById]);

  // ============================================================
  // LOADING
  // ============================================================
  if (
    punitions === undefined ||
    eleves === undefined ||
    fautes === undefined
  ) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: 40,
          color: textSecondary,
        }}
      >
        Chargement…
      </div>
    );
  }

  // ============================================================
  // RENDU PRINCIPAL
  // ============================================================
  return (
    <div
      style={{
        maxWidth: 800,
        margin: "0 auto",
        padding: isMobile ? "10px 8px 24px" : "20px 16px 32px",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* EN-TÊTE */}
      <div style={{ marginBottom: isMobile ? 12 : 16 }}>
        <h2
          style={{
            fontSize: isMobile ? 17 : 22,
            fontWeight: 700,
            color: textPrimary,
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          Mon historique
        </h2>
        <p
          style={{
            color: textSecondary,
            marginTop: 2,
            marginBottom: 0,
            fontSize: isMobile ? 11.5 : 13,
          }}
        >
          {stats.total} punition{stats.total > 1 ? "s" : ""} enregistrée
          {stats.total > 1 ? "s" : ""}
          {stats.graves > 0
            ? ` · ${stats.graves} grave${stats.graves > 1 ? "s" : ""}`
            : ""}
        </p>
      </div>

      {/* RECHERCHE */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: cardBg,
          border: `1px solid ${cardBorder}`,
          borderRadius: 12,
          padding: "0 12px",
          marginBottom: isMobile ? 12 : 16,
        }}
      >
        <Search size={16} color={textSecondary} />
        <input
          type="text"
          placeholder="Rechercher un élève, une classe…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            border: "none",
            outline: "none",
            background: "transparent",
            width: "100%",
            padding: "12px 0",
            fontSize: isMobile ? 15 : 14,
            color: textPrimary,
            fontFamily: "inherit",
          }}
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm("")}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: textSecondary,
              display: "flex",
              padding: 4,
            }}
            aria-label="Effacer la recherche"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* LISTE */}
      {myPunitions.length === 0 ? (
        <div
          style={{
            background: cardBg,
            borderRadius: 14,
            border: `1px solid ${cardBorder}`,
            boxShadow: shadow,
            padding: isMobile ? 32 : 48,
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: accentBg,
              color: accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 12px",
            }}
          >
            {searchTerm ? <Search size={26} /> : <ClipboardList size={26} />}
          </div>
          <p
            style={{
              margin: 0,
              fontSize: 13.5,
              fontWeight: 600,
              color: textPrimary,
            }}
          >
            {searchTerm ? "Aucun résultat" : "Aucune punition"}
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 12 }}>
            {searchTerm
              ? `Aucune punition ne correspond à « ${searchTerm} »`
              : "Vous n'avez enregistré aucune punition pour le moment"}
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gap: isMobile ? 8 : 10,
          }}
        >
          {myPunitions.map((p) => (
            <PunitionCard
              key={p._id}
              punition={p}
              eleve={p._eleve}
              faute={p._faute}
              dark={dark}
              isMobile={isMobile}
            />
          ))}
        </div>
      )}
    </div>
  );
}