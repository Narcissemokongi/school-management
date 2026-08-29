import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { GestionEleves } from "./GestionEleves";
import { GestionClassesAdmin } from "./GestionClassesAdmin";
import { Breadcrumb } from "./Breadcrumb";
import { useStyles } from "../styles/theme";
import { Loader, GraduationCap, BookOpen } from "lucide-react";

export function GestionElevesEtClasses({
  ecoleId,
  user,
  anneeId,
  anneeActive,
}) {
  const { dark } = useStyles();
  const [subTab, setSubTab] = useState("eleves");

  // Queries
  const classes = useQuery(api.classes.list, {
    ecoleId,
    anneeId: anneeId || undefined,
  }) ?? [];

  const eleves = useQuery(api.eleves.list, {
    ecoleId,
    anneeId: anneeId || undefined,
  }) ?? [];

  // Nouvelle query pour les enseignants (à adapter selon votre backend)
  const enseignants = useQuery(api.users.listEnseignantsByEcole, 
    ecoleId ? { ecoleId } : "skip"
  ) ?? [];

  // Mutations
  const addEleve = useMutation(api.eleves.add);
  const removeEleve = useMutation(api.eleves.remove);
  const importEleves = useMutation(api.eleves.importEleves);
  const updateEleveClasse = useMutation(api.classes.updateEleveClasse);

  const loading = classes === undefined || eleves === undefined;

  const sortedClasses = useMemo(() => {
    return [...classes].sort((a, b) =>
      a.nom.localeCompare(b.nom, undefined, { numeric: true, sensitivity: "base" })
    );
  }, [classes]);

  // Couleurs adaptatives
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const borderColor = dark ? "#334155" : "#E2E8F0";
  const accentColor = dark ? "#818CF8" : "#4F46E5";
  const badgeBg = dark ? "#312E81" : "#EEF2FF";
  const badgeText = dark ? "#A5B4FC" : "#4F46E5";

  if (!anneeId) {
    return (
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px" }}>
        <Breadcrumb items={["Scolarité"]} />
        <div
          style={{
            background: dark ? "#1E293B" : "#FFFFFF",
            borderRadius: 16,
            padding: 48,
            textAlign: "center",
          }}
        >
          <h2 style={{ color: textPrimary }}>Aucune année scolaire active</h2>
          <p style={{ color: textSecondary }}>
            Veuillez créer ou activer une année scolaire dans les paramètres.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 300 }}>
        <Loader size={32} className="animate-spin" style={{ color: accentColor }} />
      </div>
    );
  }

  const tabs = [
    {
      id: "eleves",
      label: "Élèves",
      icon: <GraduationCap size={18} />,
      badge: eleves.length,
    },
    {
      id: "classes",
      label: "Classes",
      icon: <BookOpen size={18} />,
      badge: sortedClasses.length,
    },
  ];

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px" }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .animate-spin { animation: spin 1s linear infinite; }`}</style>

      <Breadcrumb items={["Scolarité", tabs.find((t) => t.id === subTab)?.label || ""]} />

      {/* Onglets */}
      <div
        style={{
          display: "flex",
          gap: 0,
          borderBottom: `2px solid ${borderColor}`,
          marginBottom: 24,
          marginTop: 24,
          overflowX: "auto",
          whiteSpace: "nowrap",
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            role="tab"
            aria-selected={subTab === t.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "12px 20px",
              border: "none",
              background: "transparent",
              color: subTab === t.id ? accentColor : textSecondary,
              fontWeight: subTab === t.id ? 600 : 400,
              borderBottom: subTab === t.id ? `3px solid ${accentColor}` : "3px solid transparent",
              cursor: "pointer",
              transition: "all 0.2s",
              whiteSpace: "nowrap",
              position: "relative",
              flexShrink: 0,
            }}
          >
            {t.icon}
            <span>{t.label}</span>
            {t.badge !== undefined && t.badge > 0 && (
              <span
                style={{
                  minWidth: 18,
                  height: 18,
                  background: badgeBg,
                  color: badgeText,
                  borderRadius: "50%",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "0 4px",
                }}
              >
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Contenu */}
      {subTab === "eleves" && (
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
      )}

      {subTab === "classes" && (
        <GestionClassesAdmin
          classes={sortedClasses}
          ecoleId={ecoleId}
          userId={user._id}
          eleves={eleves}
          anneeId={anneeId}
          enseignants={enseignants} // ✅ Ajout
          updateEleveClasse={(eleveId, newClasseNom) =>
            updateEleveClasse({
              eleveId,
              newClasseNom,
              anneeId,
              userId: user._id,
            })
          }
        />
      )}
    </div>
  );
}