// src/components/AccueilAdmin.jsx
import { useState, useMemo, useCallback } from "react";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  Users, Building, Zap, Scale, Shield, DollarSign,
  GraduationCap, AlertTriangle, BookOpen, Settings,
  ChevronRight, Sparkles,
} from "lucide-react";

// ════════════════════════════════════════════════════════════════════
// CARTE STATISTIQUE
// ════════════════════════════════════════════════════════════════════
function StatCard({ icon, label, value, color }) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();

  return (
    <div
      style={{
        background: dark ? "#1E293B" : "#FFFFFF",
        borderRadius: 12,
        padding: isMobile ? "10px 12px" : "14px 16px",
        boxShadow: dark
          ? "0 1px 2px rgba(0,0,0,0.25)"
          : "0 1px 2px rgba(0,0,0,0.04)",
        border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
        display: "flex",
        alignItems: "center",
        gap: 10,
        minWidth: isMobile ? 130 : "auto",
        flex: isMobile ? "0 0 auto" : 1,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: `${color}20`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          color,
        }}
        aria-hidden="true"
      >
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            color: dark ? "#94A3B8" : "#64748B",
            fontSize: 10.5,
            fontWeight: 500,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {label}
        </div>
        <div
          style={{
            color: dark ? "#F1F5F9" : "#1E293B",
            fontSize: 18,
            fontWeight: 700,
            lineHeight: 1.1,
          }}
        >
          {typeof value === "number" ? value.toLocaleString("fr-FR") : value}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// LIEN RAPIDE
// ════════════════════════════════════════════════════════════════════
function QuickLink({ icon, label, color, onClick }) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();
  const [hover, setHover] = useState(false);
  const [focused, setFocused] = useState(false);

  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const accent = dark ? "#818CF8" : "#4F46E5";

  const background = hover
    ? dark
      ? "#26334D"
      : "#F8FAFC"
    : dark
    ? "#1E293B"
    : "#FFFFFF";

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: isMobile ? "10px 12px" : "12px 14px",
        background,
        border: `1px solid ${
          focused ? accent : dark ? "#334155" : "#E2E8F0"
        }`,
        borderRadius: 12,
        cursor: "pointer",
        transition: "background 0.15s, border-color 0.15s",
        textAlign: "left",
        width: "100%",
        minWidth: 0,
        outline: "none",
        WebkitTapHighlightColor: "transparent",
        boxSizing: "border-box",
      }}
      aria-label={label}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: `${color}20`,
          color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
        aria-hidden="true"
      >
        {icon}
      </div>
      <span
        style={{
          flex: 1,
          fontSize: isMobile ? 13 : 13.5,
          fontWeight: 600,
          color: textPrimary,
          textAlign: "left",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
      <ChevronRight
        size={16}
        color={dark ? "#475569" : "#CBD5E1"}
        style={{ flexShrink: 0 }}
        aria-hidden="true"
      />
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ════════════════════════════════════════════════════════════════════
export function AccueilAdmin({
  eleves = [],
  classes = [],
  fautes = [],
  sanctions = [],
  users = [],
  frais = [],
  onNavigate,
}) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();

  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";

  // ✅ Stats mémoïsées
  const stats = useMemo(
    () => [
      {
        label: "Élèves",
        value: eleves.length,
        icon: <Users size={16} />,
        color: "#4F46E5",
      },
      {
        label: "Classes",
        value: classes.length,
        icon: <Building size={16} />,
        color: "#10B981",
      },
      {
        label: "Types de fautes",
        value: fautes.length,
        icon: <Zap size={16} />,
        color: "#F59E0B",
      },
      {
        label: "Sanctions",
        value: sanctions.length,
        icon: <Scale size={16} />,
        color: "#EF4444",
      },
      {
        label: "Utilisateurs",
        value: users.length,
        icon: <Shield size={16} />,
        color: "#6366F1",
      },
      {
        label: "Élèves avec frais",
        value: frais.length,
        icon: <DollarSign size={16} />,
        color: "#10B981",
      },
    ],
    [eleves.length, classes.length, fautes.length, sanctions.length, users.length, frais.length]
  );

  // ✅ QuickLinks mémoïsés
  const quickLinks = useMemo(
    () => [
      {
        label: "Gérer les élèves",
        icon: <GraduationCap size={16} />,
        color: "#4F46E5",
        tab: "eleves-classes",
      },
      {
        label: "Gérer la discipline",
        icon: <AlertTriangle size={16} />,
        color: "#EF4444",
        tab: "fautes",
      },
      {
        label: "Gérer les cours",
        icon: <BookOpen size={16} />,
        color: "#10B981",
        tab: "cours-notes",
      },
      {
        label: "Paramètres",
        icon: <Settings size={16} />,
        color: "#6366F1",
        tab: "parametres",
      },
    ],
    []
  );

  const handleNavigate = useCallback(
    (tab) => {
      if (onNavigate) onNavigate(tab);
    },
    [onNavigate]
  );

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
      {/* ══════════════════ EN-TÊTE ══════════════════ */}
      <div style={{ marginBottom: isMobile ? 12 : 20 }}>
        <h2
          style={{
            fontSize: isMobile ? 17 : 22,
            fontWeight: 700,
            color: textPrimary,
            margin: 0,
            lineHeight: 1.2,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          Bienvenue
          <Sparkles
            size={isMobile ? 14 : 16}
            color="#F59E0B"
            aria-hidden="true"
          />
        </h2>
        <p
          style={{
            color: textSecondary,
            marginTop: 2,
            marginBottom: 0,
            fontSize: isMobile ? 11.5 : 13,
          }}
        >
          Aperçu de votre établissement
        </p>
      </div>

      {/* ══════════════════ STATS (scroll horizontal mobile) ══════════════════ */}
      <div
        style={{
          display: isMobile ? "flex" : "grid",
          gridTemplateColumns: isMobile
            ? undefined
            : "repeat(auto-fit, minmax(150px, 1fr))",
          gap: isMobile ? 8 : 12,
          marginBottom: isMobile ? 16 : 24,
          overflowX: isMobile ? "auto" : "visible",
          paddingBottom: isMobile ? 4 : 0,
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
        }}
      >
        {stats.map((stat, idx) => (
          <StatCard
            key={idx}
            icon={stat.icon}
            label={stat.label}
            value={stat.value}
            color={stat.color}
          />
        ))}
      </div>

      {/* ══════════════════ ACCÈS RAPIDE ══════════════════ */}
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: isMobile ? 8 : 12,
          }}
        >
          <div
            style={{
              width: 6,
              height: 18,
              borderRadius: 3,
              background: dark ? "#818CF8" : "#4F46E5",
            }}
            aria-hidden="true"
          />
          <h3
            style={{
              fontSize: isMobile ? 14 : 15,
              fontWeight: 700,
              color: textPrimary,
              margin: 0,
              textTransform: "uppercase",
              letterSpacing: 0.3,
            }}
          >
            Accès rapide
          </h3>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile
              ? "1fr"
              : "repeat(auto-fit, minmax(200px, 1fr))",
            gap: isMobile ? 8 : 10,
          }}
        >
          {quickLinks.map((link) => (
            <QuickLink
              key={link.tab}
              icon={link.icon}
              label={link.label}
              color={link.color}
              onClick={() => handleNavigate(link.tab)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}