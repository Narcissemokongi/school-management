import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  CheckCircle2, XCircle, Loader, MessageSquare, Calendar,
  User, Clock, AlertTriangle, X, Check, FileText,
} from "lucide-react";
import toast from "react-hot-toast";

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
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ============================================================
// BADGE DE TYPE (absence / retard)
// ============================================================
function TypeBadge({ type, dark }) {
  const isAbsence = type === "absence";
  const config = isAbsence
    ? {
        bg: dark ? "#7F1D1D" : "#FEE2E2",
        color: dark ? "#F87171" : "#B91C1C",
        icon: <XCircle size={10} />,
        label: "Absence",
      }
    : {
        bg: dark ? "#78350F" : "#FEF3C7",
        color: dark ? "#FBBF24" : "#92400E",
        icon: <Clock size={10} />,
        label: "Retard",
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
      {config.icon}
      {config.label}
    </span>
  );
}

// ============================================================
// CARTE JUSTIFICATION
// ============================================================
function JustificationCard({
  absence,
  dark,
  isMobile,
  processing,
  isRejecting,
  commentaire,
  setCommentaire,
  onValidate,
  onReject,
  onCancelReject,
  onStartReject,
}) {
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const inputText = dark ? "#F1F5F9" : "#1E293B";
  const accent = dark ? "#818CF8" : "#4F46E5";
  const accentBg = dark ? "#312E81" : "#EEF2FF";
  const success = dark ? "#34D399" : "#10B981";
  const danger = dark ? "#F87171" : "#EF4444";
  const dangerBg = dark ? "#7F1D1D" : "#FEE2E2";
  const shadow = dark
    ? "0 1px 2px rgba(0,0,0,0.25)"
    : "0 1px 2px rgba(0,0,0,0.04)";

  return (
    <div
      style={{
        background: cardBg,
        borderRadius: 12,
        padding: isMobile ? "12px" : "14px",
        boxShadow: shadow,
        border: `1px solid ${isRejecting ? danger : cardBorder}`,
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
            flexShrink: 0,
          }}
        >
          <User size={16} />
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
                fontWeight: 700,
                fontSize: isMobile ? 13.5 : 14,
                color: textPrimary,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {absence.eleveNom}
            </span>
            <TypeBadge type={absence.type} dark={dark} />
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              color: textSecondary,
              flexWrap: "wrap",
            }}
          >
            <Calendar size={11} />
            <span>{formatDateLabel(absence.date)}</span>
          </div>
        </div>
      </div>

      {/* JUSTIFICATIF */}
      <div
        style={{
          background: dark ? "#0F172A" : "#F8FAFC",
          border: `1px solid ${cardBorder}`,
          borderRadius: 10,
          padding: "10px 12px",
          marginBottom: 12,
          display: "flex",
          alignItems: "flex-start",
          gap: 8,
        }}
      >
        <FileText
          size={13}
          color={textSecondary}
          style={{ marginTop: 1, flexShrink: 0 }}
        />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: textSecondary,
              textTransform: "uppercase",
              letterSpacing: 0.3,
              marginBottom: 3,
            }}
          >
            Motif invoqué
          </div>
          <div
            style={{
              fontSize: isMobile ? 12.5 : 13,
              color: textPrimary,
              lineHeight: 1.4,
            }}
          >
            {absence.justificatif || "Aucun justificatif fourni"}
          </div>
        </div>
      </div>

      {/* ACTIONS */}
      {!isRejecting ? (
        <div
          style={{
            display: "flex",
            gap: 8,
            flexDirection: isMobile ? "column" : "row",
          }}
        >
          <button
            onClick={onValidate}
            disabled={processing}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: isMobile ? "10px 14px" : "9px 14px",
              background: processing ? "#A5B4FC" : success,
              color: "white",
              border: "none",
              borderRadius: 10,
              fontWeight: 700,
              fontSize: isMobile ? 13.5 : 13,
              cursor: processing ? "not-allowed" : "pointer",
            }}
          >
            {processing ? (
              <Loader size={14} className="gj-spin" />
            ) : (
              <Check size={14} />
            )}
            {processing ? "Traitement…" : "Valider"}
          </button>
          <button
            onClick={onStartReject}
            disabled={processing}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: isMobile ? "10px 14px" : "9px 14px",
              background: "transparent",
              color: danger,
              border: `1px solid ${danger}`,
              borderRadius: 10,
              fontWeight: 700,
              fontSize: isMobile ? 13.5 : 13,
              cursor: processing ? "not-allowed" : "pointer",
            }}
          >
            <X size={14} />
            Rejeter
          </button>
        </div>
      ) : (
        <div
          style={{
            background: dangerBg + "40",
            border: `1px solid ${danger}40`,
            borderRadius: 10,
            padding: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              marginBottom: 8,
              color: danger,
              fontSize: 11.5,
              fontWeight: 700,
            }}
          >
            <AlertTriangle size={12} />
            Motif du rejet (obligatoire)
          </div>
          <input
            type="text"
            value={commentaire}
            onChange={(e) => setCommentaire(e.target.value)}
            placeholder="Ex : Justificatif non conforme"
            autoFocus
            disabled={processing}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 8,
              border: `1px solid ${cardBorder}`,
              background: cardBg,
              color: inputText,
              fontSize: isMobile ? 14 : 13.5,
              outline: "none",
              boxSizing: "border-box",
              fontFamily: "inherit",
              marginBottom: 10,
            }}
          />
          <div
            style={{
              display: "flex",
              gap: 8,
              flexDirection: isMobile ? "column" : "row",
            }}
          >
            <button
              onClick={onReject}
              disabled={processing || !commentaire.trim()}
              style={{
                flex: isMobile ? "none" : 1,
                padding: isMobile ? "10px 14px" : "9px 14px",
                background:
                  processing || !commentaire.trim() ? "#A5B4FC" : danger,
                color: "white",
                border: "none",
                borderRadius: 10,
                fontWeight: 700,
                fontSize: isMobile ? 13.5 : 13,
                cursor:
                  processing || !commentaire.trim()
                    ? "not-allowed"
                    : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              {processing ? (
                <Loader size={14} className="gj-spin" />
              ) : (
                <XCircle size={14} />
              )}
              {processing ? "Traitement…" : "Confirmer le rejet"}
            </button>
            <button
              onClick={onCancelReject}
              disabled={processing}
              style={{
                flex: isMobile ? "none" : 1,
                padding: isMobile ? "10px 14px" : "9px 14px",
                background: "transparent",
                color: textSecondary,
                border: `1px solid ${cardBorder}`,
                borderRadius: 10,
                fontWeight: 600,
                fontSize: isMobile ? 13.5 : 13,
                cursor: processing ? "not-allowed" : "pointer",
              }}
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================
export function GestionJustifications({ ecoleId, userId }) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();

  // 🔴 FIX : `userId` envoyé à la query (cloisonnement école)
  const absencesEnAttenteRaw = useQuery(
    api.absences.listEnAttente,
    ecoleId && userId ? { ecoleId, userId } : "skip"
  );
  const statuer = useMutation(api.absences.statuerJustificatif);

  const [rejectingId, setRejectingId] = useState(null);
  const [commentaire, setCommentaire] = useState("");
  const [processingId, setProcessingId] = useState(null);

  const absencesEnAttente = useMemo(
    () => absencesEnAttenteRaw ?? [],
    [absencesEnAttenteRaw]
  );

  // Couleurs
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const accent = dark ? "#818CF8" : "#4F46E5";
  const accentBg = dark ? "#312E81" : "#EEF2FF";
  const success = dark ? "#34D399" : "#10B981";
  const shadow = dark
    ? "0 1px 3px rgba(0,0,0,0.3)"
    : "0 1px 3px rgba(0,0,0,0.05)";

  // 🟡 FIX : toast générique + console.error
  const handleStatuer = async (absenceId, statut) => {
    if (statut === "rejetee" && !commentaire.trim()) {
      toast.error("Veuillez saisir un motif de rejet.");
      return;
    }
    setProcessingId(absenceId);
    try {
      await statuer({
        absenceId,
        statut,
        commentaire: commentaire || undefined,
        userId,
      });
      toast.success(
        statut === "justifiee"
          ? "Justificatif validé"
          : "Justificatif rejeté"
      );
      setRejectingId(null);
      setCommentaire("");
    } catch (err) {
      console.error("[GestionJustifications] statuer failed:", err);
      toast.error(
        statut === "justifiee"
          ? "Impossible de valider le justificatif"
          : "Impossible de rejeter le justificatif"
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleStartReject = (absenceId) => {
    setRejectingId(absenceId);
    setCommentaire("");
  };

  const handleCancelReject = () => {
    setRejectingId(null);
    setCommentaire("");
  };

  // ============================================================
  // LOADING
  // ============================================================
  if (absencesEnAttenteRaw === undefined) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: 60,
        }}
      >
        {/* 🟢 FIX : keyframes préfixés + classe utilitaire */}
        <style>{`
          @keyframes gj-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          .gj-spin { animation: gj-spin 1s linear infinite; }
        `}</style>
        <Loader size={28} className="gj-spin" style={{ color: accent }} />
      </div>
    );
  }

  // ============================================================
  // EMPTY STATE
  // ============================================================
  if (absencesEnAttente.length === 0) {
    return (
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
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: dark ? "#064E3B" : "#D1FAE5",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
          }}
        >
          <CheckCircle2 size={30} color={success} />
        </div>
        <p
          style={{
            margin: 0,
            fontSize: 14,
            fontWeight: 700,
            color: textPrimary,
          }}
        >
          Aucune demande en attente
        </p>
        <p
          style={{
            margin: "4px 0 0",
            fontSize: 12.5,
            color: textSecondary,
            maxWidth: 320,
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          Toutes les justifications ont été traitées
        </p>
      </div>
    );
  }

  // ============================================================
  // RENDU PRINCIPAL
  // ============================================================
  return (
    <div
      style={{
        maxWidth: 700,
        margin: "0 auto",
        padding: isMobile ? "10px 8px 24px" : "20px 16px 32px",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* 🟢 FIX : keyframes préfixés (pour les spinners de la liste) */}
      <style>{`
        @keyframes gj-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .gj-spin { animation: gj-spin 1s linear infinite; }
      `}</style>

      {/* EN-TÊTE */}
      <div style={{ marginBottom: isMobile ? 12 : 16 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 4,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: accentBg,
              color: accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <MessageSquare size={16} />
          </div>
          <div>
            <h2
              style={{
                fontSize: isMobile ? 17 : 20,
                fontWeight: 700,
                color: textPrimary,
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              Justifications
            </h2>
            <p
              style={{
                fontSize: isMobile ? 11.5 : 12.5,
                color: textSecondary,
                margin: 0,
                marginTop: 1,
              }}
            >
              {absencesEnAttente.length} demande
              {absencesEnAttente.length > 1 ? "s" : ""} en attente de
              traitement
            </p>
          </div>
        </div>
      </div>

      {/* LISTE */}
      <div
        style={{
          display: "grid",
          gap: isMobile ? 8 : 10,
        }}
      >
        {absencesEnAttente.map((absence) => (
          <JustificationCard
            key={absence._id}
            absence={absence}
            dark={dark}
            isMobile={isMobile}
            processing={processingId === absence._id}
            isRejecting={rejectingId === absence._id}
            commentaire={commentaire}
            setCommentaire={setCommentaire}
            onValidate={() => handleStatuer(absence._id, "justifiee")}
            onReject={() => handleStatuer(absence._id, "rejetee")}
            onStartReject={() => handleStartReject(absence._id)}
            onCancelReject={handleCancelReject}
          />
        ))}
      </div>
    </div>
  );
}