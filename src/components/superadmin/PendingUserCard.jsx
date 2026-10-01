// src/components/PendingUserCard.jsx
import { useState, useCallback, useMemo } from "react";
import {
  UserCheck, UserX, Loader, CheckSquare, Square,
  Mail, Phone, ChevronDown, ChevronUp, Clock, Info, School,
  Send, X,
} from "lucide-react";
import { useTokens } from "@/theme/tokens";
import { useIsMobile } from "@/hooks/useIsMobile";
import { RoleBadge, Badge, Button, IconButton } from "@/components/ui";

// ════════════════════════════════════════════════════════════════════
// KEYFRAMES
// ════════════════════════════════════════════════════════════════════
const PendingUserCardKeyframes = (
  <style>{`
    @keyframes puc-spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
    .puc-spin { animation: puc-spin 1s linear infinite; }
    @media (prefers-reduced-motion: reduce) {
      .puc-spin { animation: none !important; }
    }
  `}</style>
);

// ════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════
const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function NewBadge({ createdAt }) {
  if (!createdAt) return null;
  const diff = Date.now() - createdAt;
  const isNew = diff < 24 * 60 * 60 * 1000;
  if (!isNew) return null;
  return (
    <Badge variant="success" size="sm">
      Nouveau
    </Badge>
  );
}

// ════════════════════════════════════════════════════════════════════
// CARTE PRINCIPALE
// ════════════════════════════════════════════════════════════════════
export function PendingUserCard({
  user,
  onApprove,
  onReject,
  selected = false,
  onToggleSelect,
  disabled = false,
}) {
  const t = useTokens();
  const isMobile = useIsMobile();

  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [hovered, setHovered] = useState(false);
  // ✨ Nouveau : feedback tap
  const [pressed, setPressed] = useState(false);

  const noMotion = useMemo(() => prefersReducedMotion(), []);

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
      console.error("[PendingUserCard] approve failed:", err);
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
      setShowRejectInput(false);
    } catch (err) {
      console.error("[PendingUserCard] reject failed:", err);
      setLeaving(false);
    } finally {
      setRejecting(false);
    }
  }, [approving, rejecting, disabled, onReject, rejectReason]);

  const cancelReject = useCallback(() => {
    setShowRejectInput(false);
    setRejectReason("");
  }, []);

  // ─── Données dérivées ───
  const displayName = useMemo(() => {
    const fullName = [user?.nom, user?.postnom, user?.prenom]
      .filter(Boolean)
      .join(" ");
    return fullName || user?.nom || "Utilisateur";
  }, [user?.nom, user?.postnom, user?.prenom]);

  const inscriptionDate = useMemo(
    () =>
      user?._creationTime
        ? new Date(user._creationTime).toLocaleDateString("fr-FR")
        : null,
    [user?._creationTime]
  );

  const inscriptionDateTime = useMemo(
    () =>
      user?._creationTime
        ? new Date(user._creationTime).toLocaleString("fr-FR", {
            dateStyle: "short",
            timeStyle: "short",
          })
        : null,
    [user?._creationTime]
  );

  const ecoleName = useMemo(() => {
    if (user?.ecoleNom) return user.ecoleNom;
    if (user?.ecole && typeof user.ecole === "object" && user.ecole.nom) {
      return user.ecole.nom;
    }
    return null;
  }, [user?.ecoleNom, user?.ecole]);

  const isBusy = approving || rejecting || disabled;

  // ✨ Handlers touch
  const handleTouchStart = useCallback(() => {
    if (!disabled) setPressed(true);
  }, [disabled]);

  const handleTouchEnd = useCallback(() => {
    setPressed(false);
  }, []);

  return (
    <>
      {PendingUserCardKeyframes}

      <div
        style={{
          background: t.surface.default,
          borderRadius: t.radius.md,
          padding: isMobile ? 12 : 14,
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          alignItems: isMobile ? "stretch" : "center",
          gap: isMobile ? 8 : 12,
          boxShadow:
            !isMobile && hovered && !noMotion
              ? t.shadow.md
              : t.shadow.sm,
          transition: noMotion
            ? "none"
            : `box-shadow ${t.transition.normal}, background-color ${t.transition.slow}, border-color ${t.transition.slow}, opacity ${t.transition.slow}, transform ${t.transition.slow}`,
          border: `1px solid ${
            selected ? t.accent.primary : t.border.subtle
          }`,
          opacity: leaving ? 0 : 1,
          // ✨ Feedback tap (scale)
          transform: leaving
            ? "translateX(20px)"
            : pressed
            ? "scale(0.99)"
            : "translateX(0)",
          cursor: "pointer",
          flexWrap: "wrap",
          // ✨ Neutralise flash + délai tap
          WebkitTapHighlightColor: "transparent",
          touchAction: "manipulation",
        }}
        onClick={toggleExpanded}
        onMouseEnter={() => !isMobile && !noMotion && setHovered(true)}
        onMouseLeave={() => !isMobile && setHovered(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        {/* ═══ Case à cocher — ✨ Zone tap élargie ═══ */}
        {onToggleSelect && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (!disabled) onToggleSelect();
            }}
            disabled={disabled}
            style={{
              background: "none",
              border: "none",
              cursor: disabled ? "not-allowed" : "pointer",
              // ✨ Zone tap 44x44 minimum
              padding: isMobile ? 10 : 4,
              margin: isMobile ? -10 : -4, // compense le padding visuellement
              flexShrink: 0,
              color: selected ? t.accent.primary : t.text.muted,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: isMobile ? 44 : undefined,
              minHeight: isMobile ? 44 : undefined,
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
              borderRadius: 8,
            }}
            aria-label={selected ? "Désélectionner" : "Sélectionner"}
            title={selected ? "Désélectionner" : "Sélectionner"}
          >
            {selected ? (
              <CheckSquare size={isMobile ? 22 : 20} />
            ) : (
              <Square size={isMobile ? 22 : 20} />
            )}
          </button>
        )}

        {/* ═══ Informations ═══ */}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <div
              title={displayName}
              style={{
                fontWeight: 600,
                fontSize: 15,
                color: t.text.primary,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {displayName}
            </div>
            <RoleBadge role={user?.role} size="sm" />
            <NewBadge createdAt={user?._creationTime} />
          </div>

          <div
            style={{
              fontSize: isMobile ? 12 : 13,
              color: t.text.muted,
              marginTop: 4,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            @{user?.login}
            {inscriptionDate && ` · Inscrit le ${inscriptionDate}`}
          </div>

          {expanded && (
            <div
              style={{
                marginTop: 8,
                display: "flex",
                flexDirection: "column",
                gap: 4,
                fontSize: 13,
                color: t.text.secondary,
              }}
            >
              {ecoleName && (
                <DetailRow icon={<School size={14} />}>
                  École : {ecoleName}
                </DetailRow>
              )}
              {user?.email && (
                <DetailRow icon={<Mail size={14} />}>{user.email}</DetailRow>
              )}
              {user?.telephone && (
                <DetailRow icon={<Phone size={14} />}>
                  {user.telephone}
                </DetailRow>
              )}
              {inscriptionDateTime && (
                <DetailRow icon={<Info size={14} />}>
                  Demande soumise le {inscriptionDateTime}
                </DetailRow>
              )}
            </div>
          )}
        </div>

        {/* ═══ Actions ═══ */}
        <div
          style={{
            display: "flex",
            gap: isMobile ? 6 : 8,
            flexShrink: 0,
            alignItems: "center",
            flexWrap: "wrap",
            marginLeft: isMobile ? 0 : "auto",
            width: isMobile ? "100%" : "auto",
            justifyContent: isMobile ? "flex-end" : "flex-start",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Chevron étendre/réduire */}
          <IconButton
            icon={
              expanded ? (
                <ChevronUp size={isMobile ? 20 : 18} />
              ) : (
                <ChevronDown size={isMobile ? 20 : 18} />
              )
            }
            label={expanded ? "Masquer les détails" : "Afficher les détails"}
            onClick={toggleExpanded}
            disabled={disabled}
            variant="ghost"
          />

          {/* Bouton Approuver */}
          <Button
            variant="success"
            size={isMobile ? "md" : "sm"}
            icon={
              approving ? (
                <Loader size={16} className="puc-spin" />
              ) : (
                <UserCheck size={isMobile ? 18 : 16} />
              )
            }
            onClick={handleApprove}
            disabled={isBusy}
          >
            {approving ? "…" : "Approuver"}
          </Button>

          {/* Zone rejet */}
          {!showRejectInput ? (
            <Button
              variant="danger"
              size={isMobile ? "md" : "sm"}
              icon={
                rejecting ? (
                  <Loader size={16} className="puc-spin" />
                ) : (
                  <UserX size={isMobile ? 18 : 16} />
                )
              }
              onClick={() => setShowRejectInput(true)}
              disabled={isBusy}
            >
              Rejeter
            </Button>
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                width: isMobile ? "100%" : "auto",
                flexWrap: "wrap",
              }}
            >
              <input
                autoFocus
                type="text"
                placeholder="Motif du rejet…"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                disabled={rejecting}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleReject();
                  if (e.key === "Escape") cancelReject();
                }}
                style={{
                  padding: isMobile ? "10px 12px" : "6px 8px",
                  borderRadius: t.radius.sm,
                  border: `1px solid ${t.border.default}`,
                  background: t.surface.input,
                  color: t.text.primary,
                  // ✨ 16px minimum pour éviter le zoom iOS
                  fontSize: 16,
                  fontFamily: t.font.family,
                  outline: "none",
                  width: isMobile ? "100%" : 140,
                  boxSizing: "border-box",
                  // ✨ Neutralise tap delay
                  WebkitTapHighlightColor: "transparent",
                  touchAction: "manipulation",
                  minHeight: isMobile ? 44 : undefined,
                }}
                aria-label="Motif du rejet"
                inputMode="text"
                autoComplete="off"
                autoCorrect="off"
              />
              <IconButton
                icon={
                  rejecting ? (
                    <Loader size={14} className="puc-spin" />
                  ) : (
                    <Send size={isMobile ? 16 : 14} />
                  )
                }
                label="Confirmer le rejet"
                onClick={handleReject}
                disabled={rejecting || !rejectReason.trim()}
                variant="primary"
                size={isMobile ? "md" : "sm"}
              />
              <IconButton
                icon={<X size={isMobile ? 18 : 16} />}
                label="Annuler le rejet"
                onClick={cancelReject}
                disabled={rejecting}
                variant="ghost"
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════
// Sous-composant : ligne de détail
// ════════════════════════════════════════════════════════════════════
function DetailRow({ icon, children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ flexShrink: 0, display: "flex" }} aria-hidden="true">
        {icon}
      </span>
      <span>{children}</span>
    </div>
  );
}