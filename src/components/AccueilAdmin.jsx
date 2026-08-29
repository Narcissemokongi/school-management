import { useStyles } from "../styles/theme";
import {
  Users, Building, Zap, Scale, Shield, DollarSign,
  GraduationCap, AlertTriangle, BookOpen, Settings,
} from "lucide-react";

export function AccueilAdmin({ eleves, classes, fautes, sanctions, users, frais, onNavigate }) {
  const { S, dark } = useStyles();

  // Couleurs adaptatives
  const textColor = dark ? "#F1F5F9" : "#1E293B";
  const mutedColor = dark ? "#94A3B8" : "#64748B";

  // Cartes de statistiques
  const stats = [
    { label: "Élèves", value: eleves.length, icon: <Users size={32} />, color: "#4f46e5" },
    { label: "Classes", value: classes.length, icon: <Building size={32} />, color: "#10b981" },
    { label: "Types de fautes", value: fautes.length, icon: <Zap size={32} />, color: "#f59e0b" },
    { label: "Sanctions", value: sanctions.length, icon: <Scale size={32} />, color: "#ef4444" },
    { label: "Utilisateurs", value: users.length, icon: <Shield size={32} />, color: "#6366f1" },
    { label: "Élèves avec frais", value: frais.length, icon: <DollarSign size={32} />, color: "#10b981" },
  ];

  // Liens rapides
  const quickLinks = [
    { label: "Gérer les élèves", icon: <GraduationCap size={20} />, color: "#4f46e5", tab: "eleves-classes" },
    { label: "Gérer la discipline", icon: <AlertTriangle size={20} />, color: "#ef4444", tab: "fautes" },
    { label: "Gérer les cours", icon: <BookOpen size={20} />, color: "#10b981", tab: "cours-notes" },
    { label: "Paramètres", icon: <Settings size={20} />, color: "#6366f1", tab: "parametres" },
  ];

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ ...S.h2, color: textColor }}>👋 Bienvenue, Administrateur</h2>
        <p style={{ ...S.muted, color: mutedColor }}>Aperçu de votre école.</p>
      </div>

      {/* Cartes statistiques */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
        {stats.map((stat, idx) => (
          <div
            key={idx}
            style={{
              ...S.card,
              textAlign: "center",
              color: textColor,
              transition: "transform 0.2s, box-shadow 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-4px)";
              e.currentTarget.style.boxShadow = dark ? "0 8px 16px rgba(0,0,0,0.5)" : "0 8px 16px rgba(0,0,0,0.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = S.card.boxShadow;
            }}
          >
            <div style={{ color: stat.color, marginBottom: 8 }}>{stat.icon}</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: stat.color }}>
              {stat.value}
            </div>
            <div style={{ ...S.muted, color: mutedColor }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Liens rapides */}
      <div style={{ marginTop: 32 }}>
        <h3 style={{ ...S.h3, color: textColor, marginBottom: 16 }}>
          Accès rapide
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
          {quickLinks.map((link, idx) => (
            <button
              key={idx}
              onClick={() => onNavigate && onNavigate(link.tab)}
              style={{
                ...S.card,
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "14px 16px",
                background: dark ? "#1E293B" : "#FFFFFF",
                color: textColor,
                border: `1px solid ${dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)"}`,
                borderRadius: 12,
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 500,
                transition: "background 0.2s, transform 0.1s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = dark ? "#26334D" : "#F8FAFC";
                e.currentTarget.style.transform = "scale(1.02)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = dark ? "#1E293B" : "#FFFFFF";
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              <span style={{ color: link.color }}>{link.icon}</span>
              {link.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}