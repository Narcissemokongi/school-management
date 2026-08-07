import { useState } from "react";
import { useStyles } from "../styles/theme";
import { GestionEleves } from "./GestionEleves";
import { GestionClassesAdmin } from "./GestionClassesAdmin";
import { GestionAnnees } from "./GestionAnnees";
import { GestionEmploiDuTemps } from "./GestionEmploiDuTemps";
import { Breadcrumb } from "./Breadcrumb";
import { GraduationCap, BookOpen, Calendar, Clock } from "lucide-react";

export function GestionElevesEtClasses({
  eleves,
  addEleve,
  removeEleve,
  importEleves,
  classes,
  addClasse,
  removeClasse,
  ecoleId,
  user,
  anneeId,
  anneeActive,
}) {
  const { S } = useStyles();
  const [subTab, setSubTab] = useState("eleves");

  // Si aucune année active, afficher un message
  if (!anneeId) {
    return (
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px" }}>
        <Breadcrumb items={["Scolarité"]} />
        <div
          style={{
            background: "#FFF",
            borderRadius: 16,
            padding: 48,
            textAlign: "center",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <Calendar size={48} color="#F59E0B" style={{ marginBottom: 16 }} />
          <h2
            style={{
              fontSize: 24,
              fontWeight: 600,
              color: "#1E293B",
              margin: "0 0 8px",
            }}
          >
            Aucune année scolaire active
          </h2>
          <p style={{ color: "#64748B", fontSize: 14, margin: 0 }}>
            Veuillez créer ou activer une année scolaire dans l'onglet{" "}
            <strong>Paramètres → Année scolaire</strong>.
          </p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "eleves", label: "Élèves", icon: <GraduationCap size={18} /> },
    { id: "classes", label: "Classes", icon: <BookOpen size={18} /> },
    { id: "emploi", label: "Emploi du temps", icon: <Clock size={18} /> },
    { id: "annees", label: "Années", icon: <Calendar size={18} /> },
  ];

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px" }}>
      <Breadcrumb
        items={["Scolarité", tabs.find((t) => t.id === subTab)?.label || ""]}
      />

      {/* Onglets professionnels */}
      <div
        style={{
          display: "flex",
          gap: 0,
          borderBottom: "2px solid #E2E8F0",
          marginBottom: 24,
          marginTop: 24,
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "12px 20px",
              border: "none",
              background: "transparent",
              color: subTab === t.id ? "#4F46E5" : "#64748B",
              fontWeight: subTab === t.id ? 600 : 400,
              borderBottom:
                subTab === t.id
                  ? "3px solid #4F46E5"
                  : "3px solid transparent",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {t.icon}
            {t.label}
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
          classes={classes}
          ecoleId={ecoleId}
          user={user}
          anneeId={anneeId}
        />
      )}
      {subTab === "classes" && (
        <GestionClassesAdmin
          classes={classes}
          ecoleId={ecoleId}
          userId={user._id}
          eleves={eleves}
          anneeId={anneeId}
        />
      )}
      {subTab === "emploi" && (
        <GestionEmploiDuTemps
          ecoleId={ecoleId}
          classes={classes}
          user={user}
          anneeId={anneeId}
          anneeActive={anneeActive}
        />
      )}
      {subTab === "annees" && <GestionAnnees ecoleId={ecoleId} />}
    </div>
  );
}