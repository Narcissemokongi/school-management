import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  AlertCircle, CheckCircle2, Clock, UserPlus, XCircle, Loader,
  Link2, X, Info, ArrowLeft,
} from "lucide-react";
import toast from "react-hot-toast";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useStyles } from "@/styles/theme";

// ============================================================
// CARTE DEMANDE
// ============================================================
function DemandeCard({ demande, dark, isMobile, onCancel }) {
  const isPending = demande.status === "pending";
  const isApproved = demande.status === "approved";

  const statusConfig = isPending
    ? {
        bg: dark ? "#78350F" : "#FEF3C7",
        color: dark ? "#FBBF24" : "#92400E",
        icon: <Clock size={14} />,
        label: "En attente",
      }
    : isApproved
    ? {
        bg: dark ? "#064E3B" : "#D1FAE5",
        color: dark ? "#34D399" : "#065F46",
        icon: <CheckCircle2 size={14} />,
        label: "Approuvée",
      }
    : {
        bg: dark ? "#7F1D1D" : "#FEE2E2",
        color: dark ? "#F87171" : "#B91C1C",
        icon: <XCircle size={14} />,
        label: "Rejetée",
      };

  const formattedDate = demande._creationTime
    ? new Date(demande._creationTime).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "";

  return (
    <div
      style={{
        background: dark ? "#1E293B" : "#FFFFFF",
        borderRadius: 12,
        padding: isMobile ? "10px 12px" : "12px 14px",
        border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
        boxShadow: dark
          ? "0 1px 2px rgba(0,0,0,0.25)"
          : "0 1px 2px rgba(0,0,0,0.04)",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      {/* Icône statut */}
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: statusConfig.bg,
          color: statusConfig.color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {statusConfig.icon}
      </div>

      {/* Infos */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 2,
          }}
        >
          <span
            style={{
              fontSize: isMobile ? 13.5 : 14,
              fontWeight: 600,
              color: dark ? "#F1F5F9" : "#1E293B",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {statusConfig.label}
          </span>
        </div>
        <div
          style={{
            fontSize: 11,
            color: dark ? "#94A3B8" : "#64748B",
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexWrap: "wrap",
          }}
        >
          {demande.eleveMatricule && (
            <>
              <span>Matricule : {demande.eleveMatricule}</span>
              {formattedDate && <span style={{ opacity: 0.5 }}>·</span>}
            </>
          )}
          {formattedDate && <span>{formattedDate}</span>}
        </div>
      </div>

      {/* Bouton annuler (uniquement pending) */}
      {isPending && (
        <button
          onClick={() => onCancel(demande._id)}
          title="Annuler la demande"
          style={{
            background: "transparent",
            border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
            borderRadius: 8,
            padding: isMobile ? "8px 10px" : "6px 10px",
            color: "#EF4444",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: 4,
            flexShrink: 0,
          }}
        >
          <X size={14} />
          {!isMobile && "Annuler"}
        </button>
      )}
    </div>
  );
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================
function DemandeAssociation({ user, dark: darkProp, onClose, isMobile: isMobileProp }) {
  // isMobile peut être passé en prop (depuis ParentApp) ou déduit via le hook
  const hookIsMobile = useIsMobile();
  const isMobile = isMobileProp !== undefined ? isMobileProp : hookIsMobile;

  // dark peut être passé en prop ou déduit via useStyles
  const { dark: darkFromHook } = useStyles();
  const dark = darkProp !== undefined ? darkProp : darkFromHook;

  const [matricule, setMatricule] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState("");

  const createRequest = useMutation(api.parentLinks.createParentLinkRequest);
  const cancelRequest = useMutation(api.parentLinks.cancelParentLinkRequest);
  const demandes =
    useQuery(api.parentLinks.listByParent, { parentId: user._id }) ?? [];

  // Couleurs
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const inputBg = dark ? "#0F172A" : "#F8FAFC";
  const inputText = dark ? "#F1F5F9" : "#1E293B";
  const accent = dark ? "#818CF8" : "#4F46E5";

  const getErrorMessage = (err) => {
    if (typeof err === "string") return err;
    if (err?.data?.message) return err.data.message;
    if (err?.message) return err.message;
    return "Une erreur inconnue est survenue.";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess("");

    if (!matricule.trim()) {
      setError({
        type: "error",
        message: "Veuillez saisir le matricule de l'enfant.",
      });
      return;
    }

    setSending(true);
    try {
      await createRequest({
        parentId: user._id,
        eleveMatricule: matricule.trim().toUpperCase(),
      });
      setSuccess("Demande envoyée. L'administration va la traiter.");
      toast.success("Demande envoyée.");
      setMatricule("");
    } catch (err) {
      const raw = getErrorMessage(err);
      let message = raw;
      let type = "error";

      if (raw.includes("Vous êtes déjà associé")) {
        message = "Cet enfant est déjà associé à votre compte.";
        type = "info";
      } else if (raw.includes("Cet enfant est déjà associé")) {
        message =
          "Cet enfant est déjà associé à un autre parent. Contactez l'administration si vous pensez qu'il s'agit d'une erreur.";
      } else if (raw.includes("demande est déjà en attente")) {
        message =
          "Une demande est déjà en attente pour cet enfant. Vous pouvez la consulter ci-dessous.";
        type = "info";
      } else if (raw.includes("Matricule invalide")) {
        message = "Le matricule saisi n'existe pas. Vérifiez auprès de l'école.";
      } else if (raw.includes("n'appartenez pas à la même école")) {
        message = "Cet enfant n'appartient pas à votre établissement.";
      }

      setError({ type, message });
      toast.error(message);
    } finally {
      setSending(false);
    }
  };

  const handleCancel = async (id) => {
    try {
      await cancelRequest({ requestId: id, parentId: user._id });
      toast.success("Demande annulée.");
    } catch (err) {
      const msg = getErrorMessage(err);
      setError({ type: "error", message: msg });
      toast.error(msg);
    }
  };

  const alertConfig = error
    ? {
        error: {
          bg: dark ? "#7F1D1D" : "#FEE2E2",
          color: dark ? "#F87171" : "#B91C1C",
          border: dark ? "#991B1B" : "#FECACA",
          icon: <AlertCircle size={14} />,
        },
        info: {
          bg: dark ? "#1E3A8A" : "#DBEAFE",
          color: dark ? "#60A5FA" : "#1D4ED8",
          border: dark ? "#1E40AF" : "#BFDBFE",
          icon: <Info size={14} />,
        },
      }[error.type]
    : success
    ? {
        bg: dark ? "#064E3B" : "#D1FAE5",
        color: dark ? "#34D399" : "#065F46",
        border: dark ? "#065F46" : "#A7F3D0",
        icon: <CheckCircle2 size={14} />,
      }
    : null;

  const alertMessage = error ? error.message : success;

  return (
    <div
      style={{
        maxWidth: 520,
        margin: "0 auto",
        padding: isMobile ? "10px 8px 24px" : "20px 16px",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
      `}</style>

      {/* ==================== EN-TÊTE ==================== */}
      <div style={{ marginBottom: isMobile ? 14 : 20 }}>
        {/* Bouton retour (si onClose fourni) */}
        {onClose && (
          <button
            onClick={onClose}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "transparent",
              border: `1px solid ${cardBorder}`,
              borderRadius: 10,
              padding: "8px 12px",
              cursor: "pointer",
              color: textPrimary,
              fontSize: 12.5,
              fontWeight: 600,
              marginBottom: 12,
            }}
          >
            <ArrowLeft size={14} /> Retour
          </button>
        )}

        <h2
          style={{
            fontSize: isMobile ? 17 : 22,
            fontWeight: 700,
            color: textPrimary,
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          Associer un enfant
        </h2>
        <p
          style={{
            color: textSecondary,
            marginTop: 2,
            marginBottom: 0,
            fontSize: isMobile ? 11.5 : 13,
          }}
        >
          Demandez la liaison avec votre enfant via son matricule
        </p>
      </div>

      {/* ==================== FORMULAIRE ==================== */}
      <form
        onSubmit={handleSubmit}
        style={{
          background: cardBg,
          borderRadius: 16,
          border: `1px solid ${cardBorder}`,
          padding: isMobile ? 14 : 18,
          boxShadow: dark
            ? "0 1px 3px rgba(0,0,0,0.3)"
            : "0 1px 3px rgba(0,0,0,0.05)",
          marginBottom: isMobile ? 16 : 24,
        }}
      >
        {/* Icône + explication */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 14,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: dark ? "#312E81" : "#EEF2FF",
              color: accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Link2 size={18} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 13.5,
                fontWeight: 700,
                color: textPrimary,
              }}
            >
              Demander une association
            </div>
            <div
              style={{
                fontSize: 11.5,
                color: textSecondary,
                marginTop: 2,
              }}
            >
              Saisissez le matricule figurant sur le bulletin de votre enfant
            </div>
          </div>
        </div>

        <label
          style={{
            display: "block",
            marginBottom: 6,
            fontWeight: 600,
            fontSize: 12,
            color: dark ? "#CBD5E1" : "#374151",
            textTransform: "uppercase",
            letterSpacing: 0.3,
          }}
        >
          Matricule de l'enfant
        </label>
        <input
          type="text"
          placeholder="Ex : A1B2C3"
          value={matricule}
          onChange={(e) => {
            setMatricule(e.target.value.toUpperCase());
            if (error) setError(null);
            if (success) setSuccess("");
          }}
          style={{
            width: "100%",
            padding: isMobile ? "12px 14px" : "11px 14px",
            border: `1px solid ${error ? "#EF4444" : cardBorder}`,
            borderRadius: 10,
            fontSize: isMobile ? 16 : 14,
            outline: "none",
            background: inputBg,
            color: inputText,
            marginBottom: 12,
            boxSizing: "border-box",
            fontFamily: "inherit",
            letterSpacing: 1,
            fontWeight: 500,
          }}
          required
        />

        {/* Alerte */}
        {alertConfig && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: alertConfig.bg,
              color: alertConfig.color,
              border: `1px solid ${alertConfig.border}`,
              padding: isMobile ? "10px 12px" : "10px 14px",
              borderRadius: 10,
              fontSize: isMobile ? 13 : 12.5,
              fontWeight: 500,
              marginBottom: 12,
              lineHeight: 1.4,
            }}
          >
            <div style={{ flexShrink: 0 }}>{alertConfig.icon}</div>
            <span>{alertMessage}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={sending || !matricule.trim()}
          style={{
            width: "100%",
            padding: isMobile ? "12px 16px" : "11px 16px",
            background:
              sending || !matricule.trim()
                ? dark
                  ? "#334155"
                  : "#CBD5E1"
                : accent,
            color:
              sending || !matricule.trim()
                ? dark
                  ? "#64748B"
                  : "#94A3B8"
                : "#FFFFFF",
            border: "none",
            borderRadius: 10,
            fontWeight: 700,
            cursor:
              sending || !matricule.trim() ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            fontSize: 13.5,
          }}
        >
          {sending ? (
            <Loader size={16} className="animate-spin" />
          ) : (
            <UserPlus size={16} />
          )}
          {sending ? "Envoi…" : "Demander l'association"}
        </button>
      </form>

      {/* ==================== MES DEMANDES ==================== */}
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <h3
            style={{
              fontSize: isMobile ? 14 : 15,
              fontWeight: 700,
              color: textPrimary,
              margin: 0,
            }}
          >
            Mes demandes
          </h3>
          {demandes.length > 0 && (
            <span
              style={{
                background: dark ? "#334155" : "#F1F5F9",
                color: textSecondary,
                padding: "1px 8px",
                borderRadius: 10,
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {demandes.length}
            </span>
          )}
        </div>

        {demandes.length === 0 ? (
          <div
            style={{
              background: cardBg,
              borderRadius: 12,
              border: `1px solid ${cardBorder}`,
              padding: isMobile ? 24 : 32,
              textAlign: "center",
              color: textSecondary,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: dark ? "#334155" : "#F1F5F9",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 12px",
              }}
            >
              <Link2 size={22} />
            </div>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                fontWeight: 600,
                color: textPrimary,
              }}
            >
              Aucune demande
            </p>
            <p style={{ margin: "4px 0 0", fontSize: 12 }}>
              Vos demandes d'association apparaîtront ici
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {demandes.map((demande) => (
              <DemandeCard
                key={demande._id}
                demande={demande}
                dark={dark}
                isMobile={isMobile}
                onCancel={handleCancel}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default DemandeAssociation;