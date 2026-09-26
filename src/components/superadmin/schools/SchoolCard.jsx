// src/components/SuperAdmin/schools/SchoolCard.jsx
import { useState } from "react";
import {
  Building2, Users, CalendarDays, CheckSquare, Square,
  Ban, Power, Trash2, ArrowRight, Edit2, Save, X,
  Eye, // ✨ NOUVEAU — drill-down
} from "lucide-react";
import { useTokens } from "@/theme/tokens";
import { useIsMobile } from "@/hooks/useIsMobile";
import { Badge } from "@/components/ui";

/**
 * Carte d'une école dans la liste Super Admin.
 *
 * Props :
 * @param {object} ecole
 * @param {boolean} [selected=false]
 * @param {Function} [onToggleSelect]
 * @param {Function} [onToggleStatus]
 * @param {Function} [onDelete]
 * @param {Function} [onOpen]
 * @param {Function} [onDrilldown] — (ecoleId) => void → ouvre la page détail
 * @param {Function} [onRename] — (ecoleId, nouveauNom) => Promise
 */
export function SchoolCard({
  ecole,
  selected = false,
  onToggleSelect,
  onToggleStatus,
  onDelete,
  onOpen,
  onDrilldown,  // ✨ NOUVEAU
  onRename,
}) {
  const t = useTokens();
  const isMobile = useIsMobile();
  const [hovered, setHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editNom, setEditNom] = useState(ecole.nom);
  const [saving, setSaving] = useState(false);

  const isActive = ecole.statut === "active";
  const canRename = typeof onRename === "function";

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
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => !isEditing && onOpen?.(ecole._id)}
      style={{
        background: t.surface.default,
        borderRadius: t.radius.lg,
        padding: isMobile ? 14 : 20,
        boxShadow: hovered ? t.shadow.md : t.shadow.sm,
        border: `1px solid ${
          selected ? t.accent.primary : t.border.default
        }`,
        cursor: isEditing ? "default" : "pointer",
        transition: `transform ${t.transition.normal}, box-shadow ${t.transition.normal}, border-color ${t.transition.fast}`,
        transform: hovered && !isEditing ? "translateY(-2px)" : "translateY(0)",
        display: "flex",
        flexDirection: "column",
        gap: isMobile ? 8 : 12,
        position: "relative",
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
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 4,
            color: selected ? t.accent.primary : t.text.muted,
            zIndex: 1,
            display: "flex",
            outline: "none",
          }}
          aria-label={selected ? "Désélectionner" : "Sélectionner"}
        >
          {selected ? <CheckSquare size={18} /> : <Square size={18} />}
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
            <Building2 size={isMobile ? 20 : 24} color={t.accent.primary} />
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
              autoFocus
              disabled={saving}
              aria-label="Nouveau nom de l'école"
              style={{
                flex: 1,
                padding: "10px 12px",
                borderRadius: t.radius.sm,
                border: `1px solid ${t.accent.primary}`,
                background: t.surface.input,
                color: t.text.primary,
                fontSize: isMobile ? 15 : 14,
                outline: "none",
                fontFamily: t.font.family,
                boxSizing: "border-box",
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
              }}
            >
              <Save size={16} />
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
              }}
            >
              <X size={16} />
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
            <Building2 size={isMobile ? 20 : 24} color={t.accent.primary} />
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
                <span style={{ fontFamily: t.font.mono }}>{ecole.code}</span>
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
              <CalendarDays size={14} />
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
              <Users size={14} />
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
                padding: isMobile ? "10px 12px" : "8px 12px",
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
              }}
            >
              Ouvrir <ArrowRight size={14} />
            </button>

            <div
              style={{
                display: "flex",
                gap: 6,
                justifyContent: isMobile ? "space-between" : "flex-start",
              }}
            >
              {/* ✨ NOUVEAU — Bouton Détails (drill-down) */}
              {onDrilldown && (
                <SmallIconButton
                  icon={<Eye size={16} />}
                  label="Voir le détail"
                  color={t.accent.primary}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDrilldown(ecole._id);
                  }}
                />
              )}

              {/* Bouton rename (si handler fourni) */}
              {canRename && (
                <SmallIconButton
                  icon={<Edit2 size={16} />}
                  label="Renommer"
                  color={t.accent.primary}
                  onClick={startEdit}
                />
              )}

              <SmallIconButton
                icon={isActive ? <Ban size={16} /> : <Power size={16} />}
                label={isActive ? "Suspendre" : "Réactiver"}
                color={isActive ? "#F59E0B" : "#10B981"}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleStatus?.(ecole);
                }}
              />

              <SmallIconButton
                icon={<Trash2 size={16} />}
                label="Supprimer"
                color="#EF4444"
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
function SmallIconButton({ icon, label, color, onClick }) {
  const t = useTokens();
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={label}
      aria-label={label}
      style={{
        padding: 8,
        background: hovered ? t.surface.hover : "transparent",
        border: `1px solid ${t.border.default}`,
        borderRadius: t.radius.sm,
        color,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        outline: "none",
        transition: `background ${t.transition.fast}`,
      }}
    >
      {icon}
    </button>
  );
}