// src/components/SuperAdmin/sections/AnnoncesSection.jsx
import { useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useTokens } from "@/theme/tokens";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useConfirm } from "@/hooks/useConfirm";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button, IconButton } from "@/components/ui";
import {
  Megaphone, Plus, Pencil, Trash2, Eye, EyeOff, Loader,
  Info, AlertTriangle, Wrench, CheckCircle2,
  Pin, Copy,
  BarChart3, File, Rocket, Repeat, Paperclip,
  Lock, // ✨ NOUVEAU — icône cadenas pour boutons désactivés
} from "lucide-react";
import { AnnonceModal } from "../annonces/AnnonceModal";
import { StatsLectureModal } from "../annonces/StatsLectureModal";

// ════════════════════════════════════════════════
// CONFIG
// ════════════════════════════════════════════════
const TYPE_CONFIG = {
  info: { label: "Info", color: "#3B82F6", Icon: Info },
  warning: { label: "Alerte", color: "#F59E0B", Icon: AlertTriangle },
  maintenance: { label: "Maintenance", color: "#EF4444", Icon: Wrench },
  success: { label: "Succès", color: "#10B981", Icon: CheckCircle2 },
};

const RECURRENCE_LABELS = {
  unique: null,
  hebdo: "Hebdo",
  mensuel: "Mensuel",
  trimestriel: "Trimestriel",
};

const formatDate = (ts) =>
  new Date(ts).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

// ════════════════════════════════════════════════
// KPI Card
// ════════════════════════════════════════════════
function KpiCard({ icon: Icon, label, value, color, suffix }) {
  const t = useTokens();
  const c = color ?? t.accent.primary;
  return (
    <div
      style={{
        background: t.surface.elevated,
        border: `1px solid ${t.border.subtle}`,
        borderRadius: t.radius.lg,
        padding: t.space.md,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontSize: t.font.size.sm,
            color: t.text.secondary,
            fontWeight: 500,
          }}
        >
          {label}
        </span>
        {Icon && (
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: t.radius.sm,
              background: `${c}15`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon size={16} color={c} />
          </div>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <div
          style={{
            fontSize: t.font.size["2xl"],
            fontWeight: 700,
            color: t.text.primary,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {value}
        </div>
        {suffix && (
          <div
            style={{
              fontSize: t.font.size.xs,
              color: t.text.muted,
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            {suffix}
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════
// Badge réutilisable
// ════════════════════════════════════════════════
function Chip({ color, Icon, label }) {
  const t = useTokens();
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        fontSize: 10,
        fontWeight: 700,
        color,
        background: `${color}15`,
        padding: "2px 6px",
        borderRadius: t.radius.full,
        textTransform: "uppercase",
        letterSpacing: 0.5,
        whiteSpace: "nowrap",
      }}
    >
      {Icon && <Icon size={10} />}
      {label}
    </span>
  );
}

// ════════════════════════════════════════════════
// Composant principal
// ════════════════════════════════════════════════
export function AnnoncesSection({
  userId,
  canWrite = true,   // ✨ NOUVEAU — défaut true (rétrocompat)
  canDelete = true,  // ✨ NOUVEAU — défaut true (rétrocompat)
}) {
  const t = useTokens();
  const isMobile = useIsMobile();
  const { confirm, dialogProps } = useConfirm();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filtreType, setFiltreType] = useState(null);
  const [filtreBrouillon, setFiltreBrouillon] = useState(false);
  const [statsModal, setStatsModal] = useState(null);

  const listArgs = useMemo(
    () => ({
      userId,
      filtreType: filtreType ?? undefined,
      filtreBrouillon: filtreBrouillon ? true : undefined,
    }),
    [userId, filtreType, filtreBrouillon]
  );

  const annoncesRaw = useQuery(api.annonces.listAll, listArgs);
  const statsRaw = useQuery(api.annonces.stats, { userId });

  const toggleActifM = useMutation(api.annonces.toggleActif);
  const toggleEpingleeM = useMutation(api.annonces.toggleEpinglee);
  const publierBrouillonM = useMutation(api.annonces.publierBrouillon);
  const supprimerM = useMutation(api.annonces.supprimer);

  const annonces = useMemo(() => annoncesRaw ?? [], [annoncesRaw]);
  const stats = statsRaw ?? {
    total: 0,
    actives: 0,
    programmees: 0,
    expirees: 0,
    epinglees: 0,
    brouillons: 0,
  };

  // ─── Handlers ─────────────────────────────────
  const handleToggle = (a) => toggleActifM({ userId, annonceId: a._id });

  const handleToggleEpinglee = (a) =>
    toggleEpingleeM({ userId, annonceId: a._id });

  const handlePublier = async (a) => {
    const ok = await confirm({
      title: "Publier le brouillon ?",
      message: `« ${a.titre} » sera publiée immédiatement et notifiée aux utilisateurs ciblés.`,
      confirmLabel: "Publier",
    });
    if (ok) await publierBrouillonM({ userId, annonceId: a._id });
  };

  const handleDelete = async (a) => {
    const ok = await confirm({
      title: "Supprimer l'annonce ?",
      message: `« ${a.titre} » sera définitivement supprimée.`,
      confirmLabel: "Supprimer",
      danger: true,
    });
    if (ok) await supprimerM({ userId, annonceId: a._id });
  };

  const handleEdit = (a) => {
    setEditing(a);
    setModalOpen(true);
  };

  const handleDuplicate = (a) => {
    setEditing({
      titre: a.titre,
      message: a.message,
      type: a.type,
      cible: a.cible,
      ecoleId: a.ecoleId,
      role: a.role,
      epinglee: false,
      piecesJointes: a.piecesJointes ?? [],
      recurrence: a.recurrence ?? "unique",
      _duplicate: true,
    });
    setModalOpen(true);
  };

  const handleCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const handleOpenStats = (a) => setStatsModal(a);

  // ─── Loading ─────────────────────────────────
  if (annoncesRaw === undefined || statsRaw === undefined) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
        <Loader
          size={40}
          style={{ animation: "spin 1s linear infinite" }}
          color={t.accent.primary}
        />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: t.space.lg }}>
      {/* ═══ Bandeau lecture seule ═══ */}
      {!canWrite && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: t.space.sm,
            padding: t.space.sm,
            background: `${t.text.muted}10`,
            border: `1px solid ${t.text.muted}30`,
            borderRadius: t.radius.md,
            fontSize: t.font.size.sm,
            color: t.text.secondary,
          }}
        >
          <Lock size={14} />
          <span>
            <strong>Mode lecture seule</strong> — vous n'avez pas la permission
            de modifier les annonces.
          </span>
        </div>
      )}

      {/* ═══ Header ═══ */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: t.space.md,
        }}
      >
        <div>
          <h2
            style={{
              fontSize: t.font.size.xl,
              fontWeight: 700,
              color: t.text.primary,
              margin: 0,
            }}
          >
            Annonces globales
          </h2>
          <p
            style={{
              fontSize: t.font.size.sm,
              color: t.text.secondary,
              margin: "4px 0 0",
            }}
          >
            Communiquez avec les admins d'école via des bannières persistantes
          </p>
        </div>
        {canWrite && (
          <Button icon={<Plus size={16} />} onClick={handleCreate}>
            Nouvelle annonce
          </Button>
        )}
      </div>

      {/* ═══ Stats — 5 KPIs ═══ */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile
            ? "1fr 1fr"
            : "repeat(auto-fit, minmax(180px, 1fr))",
          gap: t.space.md,
        }}
      >
        <KpiCard
          icon={Megaphone}
          label="Total"
          value={stats.total}
          suffix={
            stats.epinglees > 0 && (
              <>
                <Pin size={11} color={t.accent.primary} />
                {stats.epinglees}
              </>
            )
          }
        />
        <KpiCard
          icon={Eye}
          label="Actives"
          value={stats.actives}
          color="#10B981"
        />
        <KpiCard
          icon={EyeOff}
          label="Programmées"
          value={stats.programmees}
          color="#F59E0B"
        />
        <KpiCard
          icon={EyeOff}
          label="Expirées"
          value={stats.expirees}
          color="#64748B"
        />
        <KpiCard
          icon={File}
          label="Brouillons"
          value={stats.brouillons ?? 0}
          color="#F59E0B"
        />
      </div>

      {/* ═══ Filtres ═══ */}
      <div style={{ display: "flex", gap: t.space.sm, flexWrap: "wrap" }}>
        {[null, "info", "warning", "maintenance", "success"].map((ty) => (
          <button
            key={ty ?? "all"}
            type="button"
            onClick={() => setFiltreType(ty)}
            style={{
              padding: "6px 12px",
              borderRadius: t.radius.sm,
              border: `1px solid ${
                filtreType === ty ? t.accent.primary : t.border.default
              }`,
              background:
                filtreType === ty ? `${t.accent.primary}15` : "transparent",
              color: filtreType === ty ? t.accent.primary : t.text.secondary,
              cursor: "pointer",
              fontSize: t.font.size.xs,
              fontWeight: 600,
              fontFamily: t.font.family,
            }}
          >
            {ty ? TYPE_CONFIG[ty].label : "Tous"}
          </button>
        ))}

        <button
          type="button"
          onClick={() => setFiltreBrouillon((v) => !v)}
          style={{
            padding: "6px 12px",
            borderRadius: t.radius.sm,
            border: `1px solid ${filtreBrouillon ? "#F59E0B" : t.border.default}`,
            background: filtreBrouillon ? "#F59E0B15" : "transparent",
            color: filtreBrouillon ? "#F59E0B" : t.text.secondary,
            cursor: "pointer",
            fontSize: t.font.size.xs,
            fontWeight: 600,
            fontFamily: t.font.family,
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            marginLeft: isMobile ? 0 : "auto",
          }}
        >
          <File size={12} />
          Brouillons ({stats.brouillons ?? 0})
        </button>
      </div>

      {/* ═══ Liste ═══ */}
      {annonces.length === 0 ? (
        <div
          style={{
            padding: t.space.xl,
            textAlign: "center",
            background: t.surface.elevated,
            border: `1px solid ${t.border.subtle}`,
            borderRadius: t.radius.lg,
          }}
        >
          <Megaphone size={40} color={t.text.muted} style={{ marginBottom: 12 }} />
          <p
            style={{
              fontSize: t.font.size.sm,
              color: t.text.secondary,
              margin: 0,
            }}
          >
            {filtreBrouillon
              ? "Aucun brouillon enregistré."
              : "Aucune annonce. Créez-en une pour communiquer avec les écoles."}
          </p>
        </div>
      ) : (
        <div
          style={{ display: "flex", flexDirection: "column", gap: t.space.sm }}
        >
          {annonces.map((a) => {
            const conf = TYPE_CONFIG[a.type] ?? TYPE_CONFIG.info;
            const Icon = conf.Icon;
            const maintenant = Date.now();
            const programmee = a.dateDebut > maintenant;
            const expiree = a.dateFin < maintenant;
            const isEpinglee = a.epinglee === true;
            const isBrouillon = a.brouillon === true;
            const isRecurrente = a.recurrence && a.recurrence !== "unique";
            const nbPJ = a.piecesJointes?.length ?? 0;

            return (
              <div
                key={a._id}
                style={{
                  padding: t.space.md,
                  background: isBrouillon ? "#FFFBEB" : t.surface.elevated,
                  border: `1px solid ${
                    isEpinglee
                      ? `${t.accent.primary}40`
                      : isBrouillon
                      ? "#F59E0B40"
                      : t.border.subtle
                  }`,
                  borderRadius: t.radius.md,
                  display: "flex",
                  gap: t.space.md,
                  alignItems: "flex-start",
                  opacity: isBrouillon ? 0.95 : a.actif && !expiree ? 1 : 0.55,
                  borderLeft: isEpinglee
                    ? `3px solid ${t.accent.primary}`
                    : isBrouillon
                    ? `3px solid #F59E0B`
                    : `1px solid ${t.border.subtle}`,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: t.radius.sm,
                    background: `${conf.color}15`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon size={18} color={conf.color} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: t.space.sm,
                      flexWrap: "wrap",
                    }}
                  >
                    {isBrouillon && (
                      <Chip color="#F59E0B" Icon={File} label="Brouillon" />
                    )}

                    {isEpinglee && !isBrouillon && (
                      <Chip color={t.accent.primary} Icon={Pin} label="Épinglée" />
                    )}

                    <h3
                      style={{
                        fontSize: t.font.size.md,
                        fontWeight: 600,
                        color: t.text.primary,
                        margin: 0,
                      }}
                    >
                      {a.titre}
                    </h3>

                    <Chip color={conf.color} label={conf.label} />

                    {isRecurrente && (
                      <Chip
                        color="#8B5CF6"
                        Icon={Repeat}
                        label={RECURRENCE_LABELS[a.recurrence]}
                      />
                    )}

                    {nbPJ > 0 && (
                      <Chip
                        color="#06B6D4"
                        Icon={Paperclip}
                        label={`${nbPJ} PJ`}
                      />
                    )}

                    {!isBrouillon && !a.actif && (
                      <Chip color="#64748B" label="Inactif" />
                    )}
                    {!isBrouillon && a.actif && programmee && (
                      <Chip color="#F59E0B" label="Programmée" />
                    )}
                    {!isBrouillon && a.actif && expiree && (
                      <Chip color="#EF4444" label="Expirée" />
                    )}
                  </div>

                  <p
                    style={{
                      fontSize: t.font.size.sm,
                      color: t.text.secondary,
                      margin: "6px 0 0",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {a.message.length > 140
                      ? `${a.message.slice(0, 140)}…`
                      : a.message}
                  </p>

                  <div
                    style={{
                      display: "flex",
                      gap: t.space.md,
                      marginTop: 8,
                      fontSize: t.font.size.xs,
                      color: t.text.muted,
                      flexWrap: "wrap",
                    }}
                  >
                    <span>
                      📅 {formatDate(a.dateDebut)} → {formatDate(a.dateFin)}
                    </span>
                    <span>
                      🎯{" "}
                      {a.cible === "toutes"
                        ? "Toutes les écoles"
                        : a.cible === "ecole"
                        ? "École spécifique"
                        : `Rôle: ${a.role}`}
                    </span>
                    <span>✍️ {a.auteurNom}</span>
                  </div>
                </div>

                {/* ═══ Actions ═══ */}
                <div
                  style={{
                    display: "flex",
                    gap: 4,
                    flexShrink: 0,
                    flexWrap: "wrap",
                  }}
                >
                  {/* ✨ Stats lecture — toujours visible (lecture seule) */}
                  <IconButton
                    icon={<BarChart3 size={16} />}
                    label="Stats de lecture"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenStats(a)}
                  />

                  {/* ✨ V2 — Publier brouillon (canWrite requis) */}
                  {canWrite && isBrouillon && (
                    <IconButton
                      icon={<Rocket size={16} />}
                      label="Publier maintenant"
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePublier(a)}
                    />
                  )}

                  {/* ✨ Épingler (canWrite requis) */}
                  {canWrite && !isBrouillon && (
                    <IconButton
                      icon={
                        <Pin
                          size={16}
                          color={isEpinglee ? t.accent.primary : undefined}
                          fill={isEpinglee ? t.accent.primary : "none"}
                        />
                      }
                      label={isEpinglee ? "Désépingler" : "Épingler"}
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleEpinglee(a)}
                    />
                  )}

                  {/* ✨ Dupliquer (canWrite requis) */}
                  {canWrite && (
                    <IconButton
                      icon={<Copy size={16} />}
                      label="Dupliquer"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDuplicate(a)}
                    />
                  )}

                  {/* Activer / Désactiver (canWrite requis) */}
                  {canWrite && !isBrouillon && (
                    <IconButton
                      icon={a.actif ? <Eye size={16} /> : <EyeOff size={16} />}
                      label={a.actif ? "Désactiver" : "Activer"}
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggle(a)}
                    />
                  )}

                  {/* ✨ Modifier (canWrite requis) */}
                  {canWrite && (
                    <IconButton
                      icon={<Pencil size={16} />}
                      label="Modifier"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(a)}
                    />
                  )}

                  {/* ✨ Supprimer (canDelete requis) */}
                  {canDelete && (
                    <IconButton
                      icon={<Trash2 size={16} />}
                      label="Supprimer"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(a)}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ Modals ═══ */}
      {canWrite && modalOpen && (
        <AnnonceModal
          userId={userId}
          annonce={editing}
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
          }}
        />
      )}

      {statsModal && (
        <StatsLectureModal
          userId={userId}
          annonceId={statsModal._id}
          onClose={() => setStatsModal(null)}
        />
      )}

      <ConfirmDialog {...dialogProps} />
    </div>
  );
}

export default AnnoncesSection;