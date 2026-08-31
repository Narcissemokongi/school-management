import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile"; // <-- Import du hook
import { GestionCours } from "./GestionCours";
import { GestionNotes } from "./GestionNotes";
import { BookOpen, BarChart3, Loader } from "lucide-react";

export function GestionCoursEtNotes({
  ecoleId,
  eleves,
  classes,
  user,
  anneeId,
  anneeActive,
}) {
  const { dark } = useStyles();
  const isMobile = useIsMobile(); // Détection mobile
  const [subTab, setSubTab] = useState("cours");

  // ✅ Récupération des cours disponibles pour le barème dans GestionNotes
  const coursDisponibles = useQuery(
    api.cours.list,
    anneeId ? { ecoleId, anneeId } : { ecoleId }
  );

  const nbCours = coursDisponibles?.length ?? 0;

  const tabs = [
    { id: "cours", label: "Cours", icon: <BookOpen size={isMobile ? 16 : 18} />, badge: nbCours },
    { id: "notes", label: "Notes", icon: <BarChart3 size={isMobile ? 16 : 18} /> },
  ];

  // Couleurs adaptatives
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const borderColor = dark ? "#334155" : "#E2E8F0";
  const accentColor = dark ? "#818CF8" : "#4F46E5";
  const inactiveTabColor = dark ? "#94A3B8" : "#64748B";
  const badgeBg = dark ? "#312E81" : "#EEF2FF";
  const badgeText = dark ? "#A5B4FC" : "#4F46E5";

  // Styles adaptatifs
  const containerPadding = isMobile ? "16px 12px" : "24px 16px";
  const titleSize = isMobile ? 22 : 28;
  const subtitleSize = isMobile ? 14 : 16;
  const headerMarginBottom = isMobile ? 20 : 32;
  const tabsMarginBottom = isMobile ? 16 : 24;
  const tabPadding = isMobile ? "10px 12px" : "12px 20px";
  const tabFontSize = isMobile ? 14 : 16;

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: containerPadding }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .animate-spin { animation: spin 1s linear infinite; }`}</style>

      {/* En-tête */}
      <div style={{ marginBottom: headerMarginBottom }}>
        <h2 style={{ fontSize: titleSize, fontWeight: 700, color: textPrimary, margin: 0 }}>
          Évaluations & Cours
        </h2>
        <p style={{ color: textSecondary, marginTop: 4, fontSize: subtitleSize }}>
          Gérez les matières, notes et résultats des élèves
        </p>
      </div>

      {/* Onglets professionnels avec badge */}
      <div style={{
        display: "flex",
        gap: 0,
        borderBottom: `2px solid ${borderColor}`,
        marginBottom: tabsMarginBottom,
        overflowX: "auto",
        whiteSpace: "nowrap",
        WebkitOverflowScrolling: "touch", // Défilement fluide sur mobile
      }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            aria-selected={subTab === t.id}
            role="tab"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: tabPadding,
              border: "none",
              background: "transparent",
              color: subTab === t.id ? accentColor : inactiveTabColor,
              fontWeight: subTab === t.id ? 600 : 400,
              borderBottom: subTab === t.id ? `3px solid ${accentColor}` : "3px solid transparent",
              cursor: "pointer",
              transition: "all 0.2s",
              position: "relative",
              flexShrink: 0,
              fontSize: tabFontSize,
            }}
          >
            {t.icon}
            <span>{t.label}</span>
            {t.badge !== undefined && t.badge > 0 && (
              <span style={{
                minWidth: isMobile ? 16 : 18,
                height: isMobile ? 16 : 18,
                background: badgeBg,
                color: badgeText,
                borderRadius: "50%",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: isMobile ? 10 : 11,
                fontWeight: 700,
                padding: "0 4px",
              }}>
                {t.badge}
              </span>
            )}
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
        coursDisponibles === undefined ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
            <Loader size={24} className="animate-spin" style={{ color: accentColor }} />
          </div>
        ) : (
          <GestionNotes
            ecoleId={ecoleId}
            eleves={eleves}
            anneeId={anneeId}
            anneeActive={anneeActive}
            user={user}
            coursDisponibles={coursDisponibles}
          />
        )
      )}
    </div>
  );
}