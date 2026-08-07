import { useState } from "react";
import { useStyles } from "../styles/theme";
import { GestionCours } from "./GestionCours";
import { GestionNotes } from "./GestionNotes";
import { BookOpen, BarChart3 } from "lucide-react";

export function GestionCoursEtNotes({ ecoleId, eleves, classes, user, anneeId, anneeActive }) {
  const { S } = useStyles();
  const [subTab, setSubTab] = useState("cours");

  const tabs = [
    { id: "cours", label: "Cours", icon: <BookOpen size={18} /> },
    { id: "notes", label: "Notes", icon: <BarChart3 size={18} /> },
  ];

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 16px" }}>
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, color: "#1E293B", margin: 0 }}>
          Évaluations & Cours
        </h2>
        <p style={{ color: "#64748B", marginTop: 4, fontSize: 14 }}>
          Gérez les matières, notes et résultats des élèves
        </p>
      </div>

      {/* Onglets professionnels */}
      <div style={{ display: "flex", gap: 0, borderBottom: "2px solid #E2E8F0", marginBottom: 24 }}>
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
              borderBottom: subTab === t.id ? "3px solid #4F46E5" : "3px solid transparent",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            aria-selected={subTab === t.id}
            role="tab"
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Contenu des onglets */}
      {subTab === "cours" && (
        <GestionCours
          ecoleId={ecoleId}
          classes={classes}
          user={user}
          anneeId={anneeId}
          anneeActive={anneeActive}
        />
      )}
      {subTab === "notes" && (
        <GestionNotes
          ecoleId={ecoleId}
          eleves={eleves}
          anneeId={anneeId}
          anneeActive={anneeActive}
          user={user}
        />
      )}
    </div>
  );
}