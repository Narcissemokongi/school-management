import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { GestionEleves } from "./GestionEleves";
import { GestionClassesAdmin } from "./GestionClassesAdmin";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import { Loader, GraduationCap, BookOpen, Calendar } from "lucide-react";

export function GestionElevesEtClasses({
  ecoleId,
  user,
  anneeId,
  anneeActive,
}) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();
  const [subTab, setSubTab] = useState("eleves");

  // Couleurs
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const accent = dark ? "#818CF8" : "#4F46E5";
  const accentBg = dark ? "#312E81" : "#EEF2FF";
  const warning = "#F59E0B";
  const warningBg = dark ? "#78350F" : "#FEF3C7";
  const shadow = dark
    ? "0 1px 3px rgba(0,0,0,0.3)"
    : "0 1px 3px rgba(0,0,0,0.05)";

  // ============================================================
  // QUERIES (garder les références brutes pour le loading)
  // ============================================================
  // 🔴 FIX : `userId` envoyé aux queries (cloisonnement école côté backend)
  const classesQuery = useQuery(
    api.classes.list,
    ecoleId ? { ecoleId, anneeId: anneeId || undefined, userId: user?._id } : "skip"
  );
  const elevesQuery = useQuery(
    api.eleves.list,
    ecoleId
      ? { ecoleId, anneeId: anneeId || undefined, userId: user?._id }
      : "skip"
  );
  const enseignants =
    useQuery(
      api.users.listEnseignantsByEcole,
      ecoleId && user?._id ? { ecoleId, userId: user._id } : "skip"
    ) ?? [];

  const classes = classesQuery ?? [];
  const eleves = elevesQuery ?? [];
  const loading = classesQuery === undefined || elevesQuery === undefined;

  // Mutations
  const addEleve = useMutation(api.eleves.add);
  const removeEleve = useMutation(api.eleves.remove);
  const importEleves = useMutation(api.eleves.importEleves);
  const updateEleveClasse = useMutation(api.classes.updateEleveClasse);

  // Tri des classes
  const sortedClasses = useMemo(() => {
    return [...classes].sort((a, b) =>
      a.nom.localeCompare(b.nom, undefined, {
        numeric: true,
        sensitivity: "base",
      })
    );
  }, [classes]);

  // ============================================================
  // ÉTATS PRÉCOCES
  // ============================================================

  // Pas d'année active
  if (!anneeId) {
    return (
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: isMobile ? "10px 8px 24px" : "20px 16px 32px",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            maxWidth: 520,
            margin: "0 auto",
            padding: isMobile ? "40px 16px" : "60px 24px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: warningBg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <Calendar size={30} color={warning} />
          </div>
          <h2
            style={{
              fontSize: isMobile ? 17 : 20,
              fontWeight: 700,
              color: textPrimary,
              margin: "0 0 6px",
            }}
          >
            Aucune année scolaire active
          </h2>
          <p
            style={{
              color: textSecondary,
              fontSize: isMobile ? 13 : 14,
              margin: 0,
              maxWidth: 400,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            Veuillez créer ou activer une année scolaire dans les paramètres.
          </p>
        </div>
      </div>
    );
  }

  // Loading
  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: 300,
        }}
      >
        <Loader size={32} className="gec-spin" style={{ color: accent }} />
      </div>
    );
  }

  // ============================================================
  // TABS
  // ============================================================
  const tabs = [
    {
      id: "eleves",
      label: "Élèves",
      icon: <GraduationCap size={16} />,
      badge: eleves.length,
    },
    {
      id: "classes",
      label: "Classes",
      icon: <BookOpen size={16} />,
      badge: sortedClasses.length,
    },
  ];

  return (
    <div
      style={{
        maxWidth: 1280,
        margin: "0 auto",
        padding: isMobile ? "10px 8px 24px" : "20px 16px 32px",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* 🟢 FIX : keyframes préfixés `gec-*` */}
      <style>{`
        @keyframes gec-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .gec-spin { animation: gec-spin 1s linear infinite; }
      `}</style>

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
          Scolarité
        </h2>
        <p
          style={{
            color: textSecondary,
            marginTop: 2,
            marginBottom: 0,
            fontSize: isMobile ? 11.5 : 13,
          }}
        >
          {eleves.length} élève{eleves.length > 1 ? "s" : ""} ·{" "}
          {sortedClasses.length} classe{sortedClasses.length > 1 ? "s" : ""}
          {anneeActive ? ` · ${anneeActive.nom}` : ""}
        </p>
      </div>

      {/* ==================== TABS ==================== */}
      <div
        role="tablist"
        style={{
          display: "flex",
          gap: 4,
          borderBottom: `2px solid ${cardBorder}`,
          marginBottom: isMobile ? 14 : 20,
          overflowX: "auto",
          whiteSpace: "nowrap",
          scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {tabs.map((t) => {
          const isActive = subTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id)}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${t.id}`}
              id={`tab-${t.id}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: isMobile ? "12px 14px" : "12px 18px",
                minHeight: isMobile ? 44 : 42,
                border: "none",
                background: "transparent",
                color: isActive ? accent : textSecondary,
                fontWeight: isActive ? 700 : 500,
                borderBottom: isActive
                  ? `3px solid ${accent}`
                  : "3px solid transparent",
                cursor: "pointer",
                fontSize: isMobile ? 14 : 15,
                flexShrink: 0,
                marginBottom: -2,
              }}
            >
              {t.icon}
              <span>{t.label}</span>
              {t.badge !== undefined && t.badge > 0 && (
                <span
                  style={{
                    minWidth: 20,
                    height: 18,
                    background: isActive ? accentBg : dark ? "#334155" : "#F1F5F9",
                    color: isActive ? accent : textSecondary,
                    borderRadius: 9,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10.5,
                    fontWeight: 700,
                    padding: "0 6px",
                    marginLeft: 2,
                  }}
                >
                  {t.badge > 999 ? "999+" : t.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ==================== CONTENU ==================== */}
      {subTab === "eleves" && (
        <div role="tabpanel" id="panel-eleves" aria-labelledby="tab-eleves">
          <GestionEleves
            eleves={eleves}
            addEleve={addEleve}
            removeEleve={removeEleve}
            importEleves={importEleves}
            classes={sortedClasses}
            ecoleId={ecoleId}
            user={user}
            anneeId={anneeId}
          />
        </div>
      )}

      {subTab === "classes" && (
        <div role="tabpanel" id="panel-classes" aria-labelledby="tab-classes">
          <GestionClassesAdmin
            classes={sortedClasses}
            ecoleId={ecoleId}
            userId={user._id}
            eleves={eleves}
            anneeId={anneeId}
            enseignants={enseignants}
            updateEleveClasse={(eleveId, newClasseNom) =>
              updateEleveClasse({
                eleveId,
                newClasseNom,
                anneeId,
                userId: user._id,
              })
            }
          />
        </div>
      )}
    </div>
  );
}