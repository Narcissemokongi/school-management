import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  Calendar, Clock, MapPin, BookOpen, Loader, GraduationCap,
} from "lucide-react";

// ============================================================
// FORMATAGE DE DATE
// ============================================================
function formatDateLabel(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const d = new Date(date);
  d.setHours(0, 0, 0, 0);

  if (d.getTime() === today.getTime()) return "Aujourd'hui";
  if (d.getTime() === tomorrow.getTime()) return "Demain";

  const diffDays = Math.round((d - today) / (1000 * 60 * 60 * 24));

  if (diffDays > 0 && diffDays < 7) {
    return date.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
    });
  }
  if (diffDays < 0) {
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

function formatDateFull(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

// ============================================================
// CARTE EXAMEN
// ============================================================
function ExamenCard({ exam, dark, isMobile }) {
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const accent = dark ? "#818CF8" : "#4F46E5";
  const accentBg = dark ? "#312E81" : "#EEF2FF";

  // ✅ Détails avec clés stables (au lieu de key={idx})
  const details = [];
  if (exam.duree) details.push({ key: "duree", icon: null, text: exam.duree });
  if (exam.salle)
    details.push({ key: "salle", icon: <MapPin size={13} />, text: exam.salle });

  return (
    <div
      style={{
        background: cardBg,
        borderRadius: 12,
        border: `1px solid ${cardBorder}`,
        padding: isMobile ? "10px 12px" : "12px 14px",
        boxShadow: dark
          ? "0 1px 2px rgba(0,0,0,0.25)"
          : "0 1px 2px rgba(0,0,0,0.04)",
        display: "flex",
        alignItems: "center",
        gap: isMobile ? 10 : 14,
      }}
    >
      {/* Badge horaire */}
      <div
        style={{
          background: exam.heure ? accentBg : dark ? "#334155" : "#F1F5F9",
          color: exam.heure ? accent : textSecondary,
          borderRadius: 10,
          padding: isMobile ? "8px 10px" : "10px 12px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minWidth: isMobile ? 60 : 72,
          flexShrink: 0,
        }}
      >
        {exam.heure ? (
          <>
            <Clock
              size={isMobile ? 12 : 13}
              style={{ marginBottom: 2, opacity: 0.7 }}
            />
            <div
              style={{
                fontSize: isMobile ? 13 : 14,
                fontWeight: 700,
                lineHeight: 1,
                whiteSpace: "nowrap",
              }}
            >
              {exam.heure}
            </div>
          </>
        ) : (
          <>
            <Clock size={isMobile ? 12 : 13} style={{ opacity: 0.5 }} />
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                marginTop: 2,
                opacity: 0.7,
              }}
            >
              —
            </div>
          </>
        )}
      </div>

      {/* Infos */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: isMobile ? 14 : 15,
            fontWeight: 600,
            color: textPrimary,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <BookOpen size={14} color={accent} style={{ flexShrink: 0 }} />
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {exam.matiere}
          </span>
        </div>

        {details.length > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 4,
              flexWrap: "wrap",
              fontSize: isMobile ? 11.5 : 12,
              color: textSecondary,
            }}
          >
            {details.map((d) => (
              <span
                key={d.key}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 3,
                }}
              >
                {d.icon}
                {d.text}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================
export function ConsultationExamens({ ecoleId, anneeId, classe, user }) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();

  const userId = user?._id;
  const hasAllParams = Boolean(ecoleId && anneeId && classe && userId);

  // ===== Query (userId requis) =====
  const examensRaw = useQuery(
    api.examens.listByClasse,
    hasAllParams ? { ecoleId, anneeId, classe, userId } : "skip"
  );

  // ===== Données dérivées mémoïsées =====
  const examens = useMemo(() => examensRaw ?? [], [examensRaw]);

  const groupes = useMemo(() => {
    const acc = {};
    for (const exam of examens) {
      const jour = exam.date;
      if (!acc[jour]) acc[jour] = [];
      acc[jour].push(exam);
    }
    return acc;
  }, [examens]);

  const datesTriees = useMemo(
    () => Object.keys(groupes).sort((a, b) => a.localeCompare(b)),
    [groupes]
  );

  // ===== Couleurs =====
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const accent = dark ? "#818CF8" : "#4F46E5";
  const shadow = dark
    ? "0 1px 3px rgba(0,0,0,0.3)"
    : "0 1px 3px rgba(0,0,0,0.05)";

  // ========== KEYFRAMES (injectés en premier pour le loader) ==========
  const Keyframes = (
    <style>{`
      @keyframes cex-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      .cex-animate-spin { animation: cex-spin 1s linear infinite; }
      @media (prefers-reduced-motion: reduce) {
        .cex-animate-spin { animation: none !important; }
      }
    `}</style>
  );

  // ========== ÉTAT : aucune classe sélectionnée ==========
  if (!classe) {
    return (
      <div
        style={{
          maxWidth: 520,
          margin: "0 auto",
          padding: isMobile ? "10px 8px" : "20px 16px",
        }}
      >
        {Keyframes}
        <div
          style={{
            textAlign: "center",
            padding: isMobile ? 32 : 48,
            color: textSecondary,
            background: cardBg,
            borderRadius: 16,
            border: `1px solid ${cardBorder}`,
            boxShadow: shadow,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: dark ? "#334155" : "#F1F5F9",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 12px",
            }}
          >
            <GraduationCap size={26} />
          </div>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              fontWeight: 600,
              color: textPrimary,
            }}
          >
            Aucune classe sélectionnée
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 12.5 }}>
            Sélectionnez une classe pour voir ses examens
          </p>
        </div>
      </div>
    );
  }

  // ========== ÉTAT : chargement ==========
  if (examensRaw === undefined) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          padding: 40,
        }}
      >
        {Keyframes}
        <Loader size={28} className="cex-animate-spin" style={{ color: accent }} />
      </div>
    );
  }

  // ========== EN-TÊTE COMPACT ==========
  const header = (
    <div style={{ marginBottom: isMobile ? 14 : 20 }}>
      <h2
        style={{
          fontSize: isMobile ? 17 : 22,
          fontWeight: 700,
          color: textPrimary,
          margin: 0,
          lineHeight: 1.2,
        }}
      >
        Calendrier des examens
      </h2>
      <p
        style={{
          color: textSecondary,
          marginTop: 2,
          marginBottom: 0,
          fontSize: isMobile ? 11.5 : 13,
        }}
      >
        Classe {classe}
        {examens.length > 0
          ? ` · ${examens.length} examen${examens.length > 1 ? "s" : ""}`
          : ""}
      </p>
    </div>
  );

  // ========== ÉTAT VIDE ==========
  if (examens.length === 0) {
    return (
      <div
        style={{
          maxWidth: 800,
          margin: "0 auto",
          padding: isMobile ? "10px 8px" : "20px 16px",
        }}
      >
        {Keyframes}
        {header}
        <div
          style={{
            background: cardBg,
            borderRadius: 16,
            padding: isMobile ? 32 : 48,
            textAlign: "center",
            boxShadow: shadow,
            border: `1px solid ${cardBorder}`,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: dark ? "#334155" : "#F1F5F9",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 12px",
            }}
          >
            <Calendar size={26} />
          </div>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              fontWeight: 600,
              color: textPrimary,
            }}
          >
            Aucun examen planifié
          </p>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: 12.5,
              maxWidth: 320,
              marginLeft: "auto",
              marginRight: "auto",
              color: textSecondary,
            }}
          >
            Les examens programmés pour la classe {classe} apparaîtront ici
          </p>
        </div>
      </div>
    );
  }

  // ========== RENDU PRINCIPAL ==========
  return (
    <div
      style={{
        maxWidth: 800,
        margin: "0 auto",
        padding: isMobile ? "10px 8px 24px" : "20px 16px",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {Keyframes}

      {header}

      {datesTriees.map((date) => {
        const liste = groupes[date];
        const label = formatDateLabel(date);

        return (
          <div key={date} style={{ marginBottom: isMobile ? 16 : 22 }}>
            {/* En-tête de date */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: isMobile ? 8 : 10,
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 20,
                  borderRadius: 3,
                  background: accent,
                  flexShrink: 0,
                }}
              />
              <div style={{ minWidth: 0 }}>
                <h3
                  style={{
                    fontSize: isMobile ? 13.5 : 15,
                    fontWeight: 700,
                    color: textPrimary,
                    margin: 0,
                    textTransform: "capitalize",
                  }}
                  title={formatDateFull(date)}
                >
                  {label}
                </h3>
                <div
                  style={{
                    fontSize: 11,
                    color: textSecondary,
                    marginTop: 1,
                    textTransform: "capitalize",
                  }}
                >
                  {liste.length} examen{liste.length > 1 ? "s" : ""}
                </div>
              </div>
            </div>

            {/* Liste examens */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : "repeat(auto-fill, minmax(340px, 1fr))",
                gap: isMobile ? 6 : 8,
              }}
            >
              {liste.map((exam) => (
                <ExamenCard
                  key={exam._id}
                  exam={exam}
                  dark={dark}
                  isMobile={isMobile}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}