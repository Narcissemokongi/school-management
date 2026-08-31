import { useState, useCallback } from "react";
import {
  UserCheck, UserX, Loader, CheckSquare, Square,
  Mail, Phone, ChevronDown, ChevronUp, Clock, Info, School,
  Send, X,
} from "lucide-react";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile"; // <-- Import du hook

const ROLE_LABELS = {
  parent: "Parent",
  enseignant: "Enseignant",
  eleve: "Élève",
  admin: "Admin",
  superAdmin: "Super Admin",
  comptable: "Comptable",
  disciplinaire: "Disciplinaire",
  directeur: "Directeur",
};

// Composant Badge de rôle (adaptatif)
function RoleBadge({ role, dark }) {
  const label = ROLE_LABELS[role] || role;
  const bg = dark ? "#312E81" : "#EEF2FF";
  const color = dark ? "#A5B4FC" : "#4F46E5";
  return (
    <span style={{
      background: bg,
      color: color,
      padding: "2px 10px",
      borderRadius: 20,
      fontSize: 12,
      fontWeight: 600,
      whiteSpace: "nowrap",
    }}>
      {label}
    </span>
  );
}

// Composant Badge "Nouveau" si inscription récente (< 24h)
function NewBadge({ createdAt }) {
  const { dark } = useStyles();
  if (!createdAt) return null;
  const diff = Date.now() - createdAt;
  const isNew = diff < 24 * 60 * 60 * 1000;
  if (!isNew) return null;
  return (
    <span style={{
      background: dark ? "#064E3B" : "#D1FAE5",
      color: dark ? "#34D399" : "#065F46",
      padding: "2px 8px",
      borderRadius: 12,
      fontSize: 11,
      fontWeight: 600,
      whiteSpace: "nowrap",
    }}>
      Nouveau
    </span>
  );
}

export function PendingUserCard({
  user,
  onApprove,
  onReject,
  selected = false,
  onToggleSelect,
  disabled = false,
}) {
  const { dark } = useStyles();
  const isMobile = useIsMobile(); // Détection mobile
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const toggleExpanded = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  const handleApprove = useCallback(async () => {
    if (approving || rejecting || disabled) return;
    setApproving(true);
    setLeaving(true);
    try {
      await onApprove();
    } catch (err) {
      console.error(err);
      setLeaving(false);
    } finally {
      setApproving(false);
    }
  }, [approving, rejecting, disabled, onApprove]);

  const handleReject = useCallback(async () => {
    if (approving || rejecting || disabled || !rejectReason.trim()) return;
    setRejecting(true);
    setLeaving(true);
    try {
      await onReject(rejectReason.trim());
    } catch (err) {
      console.error(err);
      setLeaving(false);
    } finally {
      setRejecting(false);
      setShowRejectInput(false);
    }
  }, [approving, rejecting, disabled, onReject, rejectReason]);

  const fullName = [user.nom, user.postnom, user.prenom]
    .filter(Boolean)
    .join(" ");

  const inscriptionDate = user._creationTime
    ? new Date(user._creationTime).toLocaleDateString()
    : null;
  const inscriptionDateTime = user._creationTime
    ? new Date(user._creationTime).toLocaleString()
    : null;

  const ecoleName = user.ecoleNom || (user.ecole && user.ecole.nom) || user.ecole;

  // Styles adaptatifs
  const cardPadding = isMobile ? "12px 14px" : "14px 16px";
  const cardGap = isMobile ? 8 : 12;
  const cardFlexDirection = isMobile ? "column" : "row";
  const cardAlignItems = isMobile ? "stretch" : "center";
  const checkboxSize = isMobile ? 22 : 20;
  const nameFontSize = isMobile ? 15 : 15;
  const secondaryFontSize = isMobile ? 12 : 13;
  const detailFontSize = isMobile ? 13 : 13;
  const actionButtonPadding = isMobile ? "10px 12px" : "8px 14px";
  const actionButtonFontSize = isMobile ? 14 : 13;
  const actionButtonGap = isMobile ? 6 : 8;
  const expandButtonPadding = isMobile ? 6 : 4;
  const rejectInputWidth = isMobile ? "100%" : 140;
  const rejectInputPadding = isMobile ? "10px 8px" : "6px 8px";
  const rejectInputFontSize = isMobile ? 14 : 13;
  const rejectButtonsPadding = isMobile ? "10px 12px" : "6px 8px";

  const cardStyle = {
    background: dark ? "#1E293B" : "#FFFFFF",
    borderRadius: 12,
    padding: cardPadding,
    display: "flex",
    flexDirection: cardFlexDirection,
    alignItems: cardAlignItems,
    gap: cardGap,
    boxShadow: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)",
    transition: "box-shadow 0.2s, background-color 0.3s, border-color 0.3s, opacity 0.3s, transform 0.3s",
    border: `1px solid ${
      selected
        ? dark ? "#818CF8" : "#4F46E5"
        : dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"
    }`,
    opacity: leaving ? 0 : 1,
    transform: leaving ? "translateX(20px)" : "translateX(0)",
    cursor: "pointer",
    flexWrap: "wrap",
  };

  return (
    <div
      style={cardStyle}
      onClick={toggleExpanded}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = dark ? "0 2px 8px rgba(0,0,0,0.5)" : "0 2px 8px rgba(0,0,0,0.08)")}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)")}
    >
      {/* Case à cocher de sélection */}
      {onToggleSelect && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled) onToggleSelect();
          }}
          disabled={disabled}
          style={{
            background: "none",
            border: "none",
            cursor: disabled ? "not-allowed" : "pointer",
            padding: 0,
            flexShrink: 0,
            color: selected ? (dark ? "#818CF8" : "#4F46E5") : dark ? "#94A3B8" : "#64748B",
          }}
          aria-label={selected ? "Désélectionner" : "Sélectionner"}
          title={selected ? "Désélectionner" : "Sélectionner"}
        >
          {selected ? <CheckSquare size={checkboxSize} /> : <Square size={checkboxSize} />}
        </button>
      )}

      {/* Informations utilisateur */}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div
            title={fullName}
            style={{
              fontWeight: 600,
              fontSize: nameFontSize,
              color: dark ? "#F1F5F9" : "#1E293B",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {fullName || user.nom}
          </div>
          <RoleBadge role={user.role} dark={dark} />
          <NewBadge createdAt={user._creationTime} />
        </div>
        <div style={{
          fontSize: secondaryFontSize,
          color: dark ? "#94A3B8" : "#64748B",
          marginTop: 4,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}>
          @{user.login}
          {inscriptionDate && ` · Inscrit le ${inscriptionDate}`}
        </div>

        {/* Détails supplémentaires si expanded */}
        {expanded && (
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4, fontSize: detailFontSize, color: dark ? "#CBD5E1" : "#475569" }}>
            {ecoleName && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <School size={14} style={{ flexShrink: 0 }} />
                <span>École : {ecoleName}</span>
              </div>
            )}
            {user.email && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Mail size={14} style={{ flexShrink: 0 }} />
                <span>{user.email}</span>
              </div>
            )}
            {user.telephone && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Phone size={14} style={{ flexShrink: 0 }} />
                <span>{user.telephone}</span>
              </div>
            )}
            {inscriptionDateTime && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Info size={14} style={{ flexShrink: 0 }} />
                <span>Demande soumise le {inscriptionDateTime}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Boutons d'action */}
      <div
        style={{
          display: "flex",
          gap: actionButtonGap,
          flexShrink: 0,
          alignItems: "center",
          flexWrap: "wrap",
          marginLeft: isMobile ? "0" : "auto",
          width: isMobile ? "100%" : "auto",
          justifyContent: isMobile ? "flex-end" : "flex-start",
        }}
        onClick={(e) => e.stopPropagation()} // Empêche le toggle des détails
      >
        {/* Bouton pour afficher/masquer les détails */}
        <button
          onClick={toggleExpanded}
          disabled={disabled}
          aria-label={expanded ? "Masquer les détails" : "Afficher les détails"}
          title={expanded ? "Masquer les détails" : "Afficher les détails"}
          style={{
            background: "none",
            border: "none",
            cursor: disabled ? "not-allowed" : "pointer",
            color: dark ? "#94A3B8" : "#64748B",
            padding: expandButtonPadding,
            borderRadius: 4,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {expanded ? <ChevronUp size={isMobile ? 20 : 18} /> : <ChevronDown size={isMobile ? 20 : 18} />}
        </button>

        {/* Bouton Approuver */}
        <button
          onClick={handleApprove}
          disabled={approving || rejecting || disabled}
          title="Approuver la demande"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            padding: actionButtonPadding,
            background: "#10B981",
            color: "white",
            border: "none",
            borderRadius: 8,
            fontWeight: 500,
            fontSize: actionButtonFontSize,
            cursor: (approving || rejecting || disabled) ? "not-allowed" : "pointer",
            opacity: (approving || rejecting || disabled) ? 0.7 : 1,
            transition: "background 0.2s, opacity 0.2s, transform 0.1s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#059669")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#10B981")}
        >
          {approving ? <Loader size={16} className="animate-spin" /> : <UserCheck size={isMobile ? 18 : 16} />}
          {approving ? "..." : "Approuver"}
        </button>

        {/* Zone de rejet : soit bouton, soit champ inline */}
        {!showRejectInput ? (
          <button
            onClick={() => setShowRejectInput(true)}
            disabled={approving || rejecting || disabled}
            title="Rejeter la demande"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: actionButtonPadding,
              background: "#EF4444",
              color: "white",
              border: "none",
              borderRadius: 8,
              fontWeight: 500,
              fontSize: actionButtonFontSize,
              cursor: (approving || rejecting || disabled) ? "not-allowed" : "pointer",
              opacity: (approving || rejecting || disabled) ? 0.7 : 1,
              transition: "background 0.2s, opacity 0.2s, transform 0.1s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#DC2626")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#EF4444")}
          >
            {rejecting ? <Loader size={16} className="animate-spin" /> : <UserX size={isMobile ? 18 : 16} />}
            Rejeter
          </button>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 4, width: isMobile ? "100%" : "auto", flexWrap: "wrap" }}>
            <input
              autoFocus
              type="text"
              placeholder="Motif du rejet..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              disabled={rejecting}
              style={{
                padding: rejectInputPadding,
                borderRadius: 6,
                border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
                background: dark ? "#0F172A" : "#F9FAFB",
                color: dark ? "#F1F5F9" : "#1E293B",
                fontSize: rejectInputFontSize,
                outline: "none",
                width: rejectInputWidth,
              }}
            />
            <button
              onClick={handleReject}
              disabled={rejecting || !rejectReason.trim()}
              title="Confirmer le rejet"
              style={{
                background: "#EF4444",
                color: "white",
                border: "none",
                borderRadius: 6,
                padding: rejectButtonsPadding,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {rejecting ? <Loader size={14} className="animate-spin" /> : <Send size={isMobile ? 16 : 14} />}
            </button>
            <button
              onClick={() => {
                setShowRejectInput(false);
                setRejectReason("");
              }}
              disabled={rejecting}
              title="Annuler"
              style={{
                background: "none",
                border: "none",
                color: dark ? "#94A3B8" : "#64748B",
                cursor: "pointer",
                padding: 4,
              }}
            >
              <X size={isMobile ? 18 : 16} />
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}