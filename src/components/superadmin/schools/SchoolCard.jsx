// src/components/SuperAdmin/schools/SchoolCard.jsx
import { useState, useCallback } from "react";
import {
  Building2, Users, CalendarDays, CheckSquare, Square,
  Ban, Power, Trash2, ArrowRight, Edit2, Save, X,
  Eye,
} from "lucide-react";
import { useTokens } from "@/theme/tokens";
import { useIsMobile } from "@/hooks/useIsMobile";
import { Badge } from "@/components/ui";

// ════════════════════════════════════════════════════════════════════
// CONSTANTES MODULE-LEVEL
// ════════════════════════════════════════════════════════════════════
const TAP_BASE = {
  touchAction: "manipulation",
  WebkitTapHighlightColor: "transparent",
  minHeight: 44,
};

const FOCUS_RING = (color) => ({
  outline: `2px solid ${color}`,
  outlineOffset: 2,
});

export function SchoolCard({
  ecole,
  selected = false,
  onToggleSelect,
  onToggleStatus,
  onDelete,
  onOpen,
  onDrilldown,
  onRename,
}) {
  const t = useTokens();
  const isMobile = useIsMobile();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editNom, setEditNom] = useState(ecole.nom);
  const [saving, setSaving] = useState(false);

  const isActive = ecole.statut === "active";
  const canRename = typeof onRename === "function";
  const isClickable = !isEditing && typeof onOpen === "function";

  // ────────────────────────────────────────────────────────────
  // Handlers card (role="button")
  // ────────────────────────────────────────────────────────────
  const handleCardClick = useCallback(() => {
    if (isClickable) onOpen(ecole._id);
  }, [isClickable, onOpen, ecole._id]);

  const handleCardKeyDown = useCallback(
    (e) => {
      if (!isClickable) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleCardClick();
      }
    },
    [isClickable, handleCardClick]
  );

  // ────────────────────────────────────────────────────────────
  // Handlers rename
  // ────────────────────────────────────────────────────────────
  const startEdit = (e) => {
    e?.stopPropagation();
    setEditNom(ecole.nom);
    setIsEditing(true);
  };

  const cancelEdit = (e) => {
    e?.stopPropagation();
    setIsEditing(false);
    setEditNom(ecole.nom);
  };

  const saveEdit = async (e) => {
    e?.stopPropagation();
    const trimmed = editNom.trim();
    if (!trimmed || trimmed === ecole.nom) {
      cancelEdit();
      return;
    }
    setSaving(true);
    try {
      await onRename(ecole._id, trimmed);
      setIsEditing(false);
    } catch {
      // Erreur déjà gérée par le parent (toast)
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") saveEdit();
    if (e.key === "Escape") cancelEdit();
  };

  // ────────────────────────────────────────────────────────────
  // Rendu
  // ────────────────────────────────────────────────────────────
  return (
    <div
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      aria-label={isClickable ? `Ouvrir l'école ${ecole.nom}` : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false); }}
      onPointerDown={() => isClickable && setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      style={{
        ...TAP_BASE,
        background: t.surface.default,
        borderRadius: t.radius.lg,
        padding: isMobile ? 14 : 20,
        boxShadow: hovered ? t.shadow.md : t.shadow.sm,
        border: `1px solid ${
          selected
            ? t.accent.primary
            : focused
            ? t.accent.primary
            : t.border.default
        }`,
        cursor: isEditing ? "default" : isClickable ? "pointer" : "default",
        transition: `transform 0.15s ease, box-shadow 0.2s, border-color 0.15s`,
        transform:
          pressed && !isEditing
            ? "scale(0.99)"
            : hovered && !isEditing
            ? "translateY(-2px)"
            : "translateY(0)",
        display: "flex",
        flexDirection: "column",
        gap: isMobile ? 8 : 12,
        position: "relative",
        outline: "none",
      }}
    >
      {/* Checkbox sélection — masqué en mode édition */}
      {!isEditing && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect?.(ecole._id);
          }}
          aria-label={selected ? "Désélectionner" : "Sélectionner"}
          style={{
            position: "absolute",
            top: 4,
            right: 4,
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 10,
            color: selected ? t.accent.primary : t.text.muted,
            zIndex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            outline: "none",
            minWidth: 44,
            minHeight: 44,
            touchAction: "manipulation",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          {selected ? (
            <CheckSquare size={18} aria-hidden="true" />
          ) : (
            <Square size={18} aria-hidden="true" />
          )}
        </button>
      )}

      {/* ═══════════ MODE ÉDITION ═══════════ */}
      {isEditing ? (
        <>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              paddingRight: 8,
            }}
          >
            <Building2
              size={isMobile ? 20 : 24}
              color={t.accent.primary}
              aria-hidden="true"
            />
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: t.text.muted,
                textTransform: "uppercase",
                letterSpacing: 0.3,
              }}
            >
              Renommer
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              value={editNom}
              onChange={(e) => setEditNom(e.target.value)}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
              autoFocus
              disabled={saving}
              enterKeyHint="done"
              autoCorrect="off"
              spellCheck="false"
              aria-label="Nouveau nom de l'école"
              style={{
                flex: 1,
                padding: "10px 12px",
                borderRadius: t.radius.sm,
                border: `1px solid ${t.accent.primary}`,
                background: t.surface.input,
                color: t.text.primary,
                fontSize: isMobile ? 16 : 14,
                outline: "none",
                fontFamily: t.font.family,
                boxSizing: "border-box",
                minHeight: 44,
              }}
            />
            <button
              type="button"
              onClick={saveEdit}
              disabled={saving || !editNom.trim()}
              aria-label="Enregistrer"
              title="Enregistrer"
              style={{
                padding: 10,
                background: "#10B981",
                color: "#FFFFFF",
                border: "none",
                borderRadius: t.radius.sm,
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.6 : 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: 44,
                minHeight: 44,
                touchAction: "manipulation",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <Save size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              disabled={saving}
              aria-label="Annuler"
              title="Annuler"
              style={{
                padding: 10,
                background: "transparent",
                color: t.text.muted,
                border: `1px solid ${t.border.default}`,
                borderRadius: t.radius.sm,
                cursor: saving ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: 44,
                minHeight: 44,
                touchAction: "manipulation",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        </>
      ) : (
        <>
          {/* ═══════════ MODE NORMAL ═══════════ */}
          {/* Header : icône + badge */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              paddingRight: 28,
              gap: 8,
            }}
          >
            <Building2
              size={isMobile ? 20 : 24}
              color={t.accent.primary}
              aria-hidden="true"
            />
            <Badge variant={isActive ? "success" : "danger"} size="sm">
              {isActive ? "Active" : "Suspendue"}
            </Badge>
          </div>

          {/* Infos */}
          <div>
            <div
              style={{
                fontWeight: 700,
                fontSize: isMobile ? 15 : 18,
                color: t.text.primary,
                lineHeight: 1.2,
              }}
            >
              {ecole.nom}
            </div>

            {ecole.code && (
              <div
                style={{
                  color: t.text.muted,
                  fontSize: 13,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  marginTop: 4,
                }}
              >
                Code :{" "}
                <span
                  style={{
                    fontFamily: t.font.mono,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {ecole.code}
                </span>
              </div>
            )}

            <div
              style={{
                color: t.text.muted,
                fontSize: 13,
                display: "flex",
                alignItems: "center",
                gap: 4,
                marginTop: 4,
              }}
            >
              <CalendarDays size={14} aria-hidden="true" />
              <span>
                Créée le{" "}
                {new Date(ecole._creationTime).toLocaleDateString("fr-FR")}
              </span>
            </div>

            <div
              style={{
                color: t.text.muted,
                fontSize: 13,
                display: "flex",
                alignItems: "center",
                gap: 4,
                marginTop: 2,
              }}
            >
              <Users size={14} aria-hidden="true" />
              <span>{ecole.userCount ?? 0} utilisateur(s)</span>
            </div>
          </div>

          {/* Actions */}
          <div
            style={{
              display: "flex",
              gap: 8,
              marginTop: "auto",
              flexDirection: isMobile ? "column" : "row",
            }}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpen?.(ecole._id);
              }}
              style={{
                flex: 1,
                padding: isMobile ? "10px 12px" : "10px 12px",
                background: t.accent.primary,
                color: "#FFFFFF",
                border: "none",
                borderRadius: t.radius.sm,
                cursor: "pointer",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                fontSize: 14,
                fontFamily: t.font.family,
                minHeight: 44,
                touchAction: "manipulation",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              Ouvrir <ArrowRight size={14} aria-hidden="true" />
            </button>

            <div
              style={{
                display: "flex",
                gap: 6,
                justifyContent: isMobile ? "space-between" : "flex-start",
              }}
            >
              {/* Bouton Détails (drill-down) */}
              {onDrilldown && (
                <SmallIconButton
                  icon={<Eye size={16} aria-hidden="true" />}
                  label="Voir le détail"
                  color={t.accent.primary}
                  t={t}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDrilldown(ecole._id);
                  }}
                />
              )}

              {/* Bouton rename */}
              {canRename && (
                <SmallIconButton
                  icon={<Edit2 size={16} aria-hidden="true" />}
                  label="Renommer"
                  color={t.accent.primary}
                  t={t}
                  onClick={startEdit}
                />
              )}

              <SmallIconButton
                icon={
                  isActive ? (
                    <Ban size={16} aria-hidden="true" />
                  ) : (
                    <Power size={16} aria-hidden="true" />
                  )
                }
                label={isActive ? "Suspendre" : "Réactiver"}
                color={isActive ? "#F59E0B" : "#10B981"}
                t={t}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleStatus?.(ecole);
                }}
              />

              <SmallIconButton
                icon={<Trash2 size={16} aria-hidden="true" />}
                label="Supprimer"
                color="#EF4444"
                t={t}
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete?.(ecole._id, ecole.nom);
                }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Sous-composant
// ────────────────────────────────────────────────────────────
function SmallIconButton({ icon, label, color, t, onClick }) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);

  const isActive = hovered || pressed;

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false); }}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      title={label}
      aria-label={label}
      style={{
        padding: 10,
        background: isActive ? t.surface.hover : "transparent",
        border: `1px solid ${t.border.default}`,
        borderRadius: t.radius.sm,
        color,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        outline: "none",
        minWidth: 44,
        minHeight: 44,
        touchAction: "manipulation",
        WebkitTapHighlightColor: "transparent",
        transform: pressed ? "scale(0.95)" : "scale(1)",
        transition: `background ${t.transition.fast}, transform 0.12s ease`,
        ...(focused ? FOCUS_RING(color) : null),
      }}
    >
      {icon}
    </button>
  );
}