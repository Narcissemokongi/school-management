// src/components/DirecteurDashboard.jsx
import { useMemo } from "react";
import { useStyles } from "@/styles/theme";
import {
  ClipboardList, AlertTriangle, Users, Building, Flame,
} from "lucide-react";
import { getFaute, getTopDerangeurs, getPunitionsParClasse } from "../utils";

// ✅ FIX #2 — defaults sur les props
export function DirecteurDashboard({
  punitions = [],
  eleves = [],
  classes = [],
  fautes = [],
  notifs = [],
}) {
  const { S, dark } = useStyles();

  // ✅ FIX #4 — useMemo sur tous les calculs dérivés
  const { top, parClasse, graves, elevesConcernes, classesTouchees } = useMemo(() => {
    const top = getTopDerangeurs(punitions, eleves, 3);
    const parClasse = getPunitionsParClasse(punitions, eleves, classes);
    const graves = punitions.filter(
      (p) => getFaute(fautes, p.idFaute)?.gravite === "Grave"
    );
    // ✅ FIX #6 — Set calculé une fois
    const elevesConcernes = new Set(punitions.map((p) => p.idEleve)).size;
    const classesTouchees = Object.values(parClasse).filter((v) => v > 0).length;
    return { top, parClasse, graves, elevesConcernes, classesTouchees };
  }, [punitions, eleves, classes, fautes]);

  const statCards = [
    { label: "Total punitions", val: punitions.length, color: "#4f46e5", Icon: ClipboardList },
    { label: "Fautes graves", val: graves.length, color: "#ef4444", Icon: AlertTriangle },
    { label: "Élèves concernés", val: elevesConcernes, color: "#f59e0b", Icon: Users },
    { label: "Classes touchées", val: classesTouchees, color: "#10b981", Icon: Building },
  ];

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={S.h2}>Vue d'ensemble</div>
        <div style={S.muted}>Situation disciplinaire générale</div>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
        gap: 16,
        marginBottom: 24,
      }}>
        {statCards.map((k) => (
          <div key={k.label} style={{ ...S.card, textAlign: "center", padding: "20px 12px" }}>
            <k.Icon size={28} color={k.color} style={{ marginBottom: 6 }} />
            <div style={{ fontSize: 28, fontWeight: 900, color: k.color }}>{k.val}</div>
            <div style={{ fontSize: 12, color: S.muted?.color ?? S.textMuted?.color ?? "#64748B" }}>
              {k.label}
            </div>
          </div>
        ))}
      </div>

      {notifs.length > 0 && (
        <div style={{ ...S.card, marginBottom: 24 }}>
          {/* ✅ FIX #1 — emoji remplacé */}
          <div style={{
            fontWeight: 700, color: "#ef4444", marginBottom: 10,
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <AlertTriangle size={18} /> Alertes récentes
          </div>
          {notifs.slice(-3).map((n, i) => (
            // ✅ FIX #5 — clé stable (fallback index si n est une string)
            <div
              key={typeof n === "string" ? `${n}-${i}` : (n?.id ?? i)}
              style={{
                padding: "8px 0",
                borderBottom: i < Math.min(3, notifs.length) - 1
                  ? `1px solid ${S.cardBorder ?? (dark ? "#334155" : "#e2e8f0")}`
                  : "none",
              }}
            >
              <div style={{ fontSize: 13, color: S.muted?.color ?? "#64748B" }}>{n}</div>
            </div>
          ))}
        </div>
      )}

      <div style={S.card}>
        {/* ✅ FIX #1 — emoji remplacé */}
        <div style={{
          fontWeight: 700, marginBottom: 12,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <Flame size={18} color="#ef4444" /> Cerveaux moteurs
        </div>
        {top.length === 0 ? (
          <div style={{ ...S.muted, fontSize: 13, textAlign: "center", padding: 12 }}>
            Aucun élève signalé
          </div>
        ) : (
          top.map((t, i) => (
            // ✅ FIX #5 — clé stable sur idEleve si dispo
            <div
              key={t.eleve?._id ?? t.eleve?.id ?? `${t.eleve?.nom}-${i}`}
              style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "10px 0",
                borderBottom: i < top.length - 1
                  ? `1px solid ${S.cardBorder ?? (dark ? "#334155" : "#e2e8f0")}`
                  : "none",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: i === 0 ? "#ef4444" : i === 1 ? "#f59e0b" : "#4f46e5",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, fontWeight: 800, color: "#fff",
                }}>
                  {i + 1}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: dark ? "#f1f5f9" : "#1e293b" }}>
                    {t.eleve?.nom} {t.eleve?.postnom}
                  </div>
                  <div style={{ fontSize: 12, color: S.muted?.color ?? "#64748B" }}>
                    Classe {t.eleve?.classe}
                  </div>
                </div>
              </div>
              <span style={{
                background: i === 0 ? "#ef4444" : "#f59e0b",
                color: "#fff",
                padding: "4px 10px",
                borderRadius: 12,
                fontSize: 12,
                fontWeight: 600,
              }}>
                {t.count} faute(s)
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}