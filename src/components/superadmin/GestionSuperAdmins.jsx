// src/components/SuperAdmin/GestionSuperAdmins.jsx
import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useTokens } from "@/theme/tokens";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useConfirm } from "@/hooks/useConfirm";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button, Badge, Modal } from "@/components/ui";
import toast from "react-hot-toast";
import {
  Plus, Trash2, Edit2, Save, ShieldCheck, Loader,
  Crown, UserCheck, UserX, ArrowUpCircle, ArrowDownCircle,
  AlertCircle, Info, Users, Monitor,
} from "lucide-react";
// ✨ NOUVEAU
import { PermissionsEditor } from "./GestionSuperAdmins/PermissionsEditor";
import { SessionsPanel } from "./GestionSuperAdmins/SessionsPanel";
import { CreateSuperAdminModal } from "./GestionSuperAdmins/CreateSuperAdminModal";

// ════════════════════════════════════════════════════════════════════
// ONGLETS
// ════════════════════════════════════════════════════════════════════
const TABS = [
  { id: "users", label: "Super Admins", icon: Users },
  { id: "sessions", label: "Sessions actives", icon: Monitor },
];

export function GestionSuperAdmins({ user }) {
  const t = useTokens();
  const isMobile = useIsMobile();
  const { confirm, dialogProps } = useConfirm();

  const userId = user?._id;

  // Guards
  const isSuperAdmin =
    user?.role === "superAdmin" ||
    (user?.role === "admin" && !user?.ecoleId);

  const isOwner =
    (user?.role === "admin" && !user?.ecoleId) ||
    (user?.role === "superAdmin" && user?.isOwner === true);

  // ✨ Onglet actif
  const [activeTab, setActiveTab] = useState("users");

  // ✨ Catalogue des permissions (chargé depuis le backend)
  const catalogRaw = useQuery(
    api.users.getPermissionsCatalog,
    userId && isOwner ? { userId } : "skip"
  );
  // ✨ Référence stable pour éviter les re-renders inutiles
  const catalog = useMemo(
    () => catalogRaw ?? { modules: {}, presets: {} },
    [catalogRaw]
  );

  // Queries
  const ownersRaw = useQuery(
    api.users.listOwners,
    userId && isSuperAdmin ? { userId } : "skip"
  );
  const adminsRaw = useQuery(
    api.users.listSuperAdmins,
    userId && isSuperAdmin ? { userId } : "skip"
  );

  const owners = useMemo(() => ownersRaw ?? [], [ownersRaw]);
  const admins = useMemo(() => adminsRaw ?? [], [adminsRaw]);

  const isLoading =
    isSuperAdmin &&
    (ownersRaw === undefined ||
      adminsRaw === undefined ||
      (isOwner && catalogRaw === undefined));

  // Mutations (les autres restent — la création est déléguée au modal)
  const updatePermsM = useMutation(api.users.updateSuperAdminPermissions);
  const reactiverM = useMutation(api.users.reactiverSuperAdmin);
  const removeM = useMutation(api.users.removeSuperAdmin);
  const promoteM = useMutation(api.users.promoteToOwner);
  const demoteM = useMutation(api.users.demoteOwner);

  // ✨ État du modal création (juste un booléen — state isolé dans le modal)
  const [showCreateModal, setShowCreateModal] = useState(false);

  // État édition
  const [editingId, setEditingId] = useState(null);
  const [editPerms, setEditPerms] = useState([]);
  const [editMode, setEditMode] = useState(null);
  const [saving, setSaving] = useState(false);

  // État rétrogradation
  const [demoteTarget, setDemoteTarget] = useState(null);
  const [demotePerms, setDemotePerms] = useState([]);

  // Guard
  if (!isSuperAdmin) {
    return (
      <div
        style={{
          padding: 40,
          textAlign: "center",
          color: t.text.muted,
        }}
      >
        Accès réservé aux super administrateurs.
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────
  // HANDLERS
  // ────────────────────────────────────────────────────────────

  const handleSavePermissions = async (adminId) => {
    setSaving(true);
    try {
      if (editMode === "reactivate") {
        await reactiverM({
          userId: adminId,
          permissions: editPerms,
          adminId: userId,
        });
        toast.success("Compte réactivé");
      } else {
        const res = await updatePermsM({
          userId: adminId,
          permissions: editPerms,
          adminId: userId,
        });
        toast.success(
          res.deactivated
            ? "Permissions vidées → compte désactivé"
            : "Permissions mises à jour"
        );
      }
      setEditingId(null);
      setEditPerms([]);
      setEditMode(null);
    } catch (err) {
      toast.error(err?.message ?? "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (admin) => {
    setEditingId(admin._id);
    setEditPerms(admin.permissions ?? []);
    setEditMode("update");
  };

  const startReactivate = (admin) => {
    setEditingId(admin._id);
    setEditPerms(
      admin.permissions?.length
        ? admin.permissions
        : ["ecoles.read", "users.read", "stats.read"]
    );
    setEditMode("reactivate");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditPerms([]);
    setEditMode(null);
  };

  const handleDelete = async (admin) => {
    const ok = await confirm(
      "Supprimer ce super admin",
      `Voulez-vous vraiment supprimer ${admin.nom} ? Cette action est irréversible.`
    );
    if (!ok) return;
    try {
      await removeM({ userId: admin._id, adminId: userId });
      toast.success("Super admin supprimé");
    } catch (err) {
      toast.error(err?.message ?? "Erreur");
    }
  };

  const handlePromote = async (admin) => {
    const ok = await confirm(
      "Promouvoir en propriétaire",
      `${admin.nom} aura les mêmes droits que vous (gestion des super admins, toutes les écoles). Confirmer ?`
    );
    if (!ok) return;
    try {
      await promoteM({ userId: admin._id, adminId: userId });
      toast.success("Promu en propriétaire");
    } catch (err) {
      toast.error(err?.message ?? "Erreur");
    }
  };

  const handleDemoteStart = (owner) => {
    setDemoteTarget(owner);
    setDemotePerms(["ecoles.read", "users.read", "stats.read"]);
  };

  const handleSaveDemote = async () => {
    if (demotePerms.length === 0) {
      toast.error("Au moins une permission requise.");
      return;
    }
    setSaving(true);
    try {
      await demoteM({
        userId: demoteTarget._id,
        permissions: demotePerms,
        adminId: userId,
      });
      toast.success(`${demoteTarget.nom} rétrogradé en super admin`);
      setDemoteTarget(null);
      setDemotePerms([]);
    } catch (err) {
      toast.error(err?.message ?? "Erreur");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
        <Loader
          size={32}
          style={{ animation: "spin 1s linear infinite" }}
          color={t.accent.primary}
        />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      {/* ═══════════ BANDEAU CONTEXTUEL ═══════════ */}
      <ContextBanner isOwner={isOwner} isMobile={isMobile} t={t} />

      {/* ═══════════ EN-TÊTE ═══════════ */}
      <div style={{ marginBottom: 20 }}>
        <h2
          style={{
            margin: 0,
            fontSize: 24,
            fontWeight: 700,
            color: t.text.primary,
          }}
        >
          Super Admins
        </h2>
        <p style={{ margin: "4px 0 0", fontSize: 14, color: t.text.muted }}>
          {owners.length} propriétaire(s) · {admins.length} super admin(s)
          secondaire(s)
        </p>
      </div>

      {/* ═══════════ TABS ═══════════ */}
      <div
        style={{
          display: "flex",
          gap: 4,
          borderBottom: `1px solid ${t.border.subtle}`,
          marginBottom: 20,
          overflowX: "auto",
        }}
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "10px 16px",
                background: "transparent",
                border: "none",
                borderBottom: active
                  ? `2px solid ${t.accent.primary}`
                  : "2px solid transparent",
                color: active ? t.accent.primary : t.text.secondary,
                fontWeight: active ? 600 : 500,
                cursor: "pointer",
                fontSize: t.font.size.sm,
                fontFamily: t.font.family,
                whiteSpace: "nowrap",
                marginBottom: -1,
              }}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ═══════════ ONGLET : SUPER ADMINS ═══════════ */}
      {activeTab === "users" && (
        <>
          {/* SECTION PROPRIÉTAIRES */}
          <Section
            title="Propriétaires"
            subtitle="Accès complet à la plateforme — gestion des super admins"
            icon={<Crown size={20} />}
            color="#F59E0B"
            t={t}
          >
            <div style={{ display: "grid", gap: 10 }}>
              {owners.map((owner) => (
                <OwnerCard
                  key={owner._id}
                  owner={owner}
                  isMe={owner._id === userId}
                  canManage={isOwner && owner._id !== userId}
                  canDemote={
                    isOwner && owners.length > 1 && owner._id !== userId
                  }
                  onDemote={handleDemoteStart}
                  t={t}
                  isMobile={isMobile}
                />
              ))}
            </div>
          </Section>

          {/* SECTION SUPER ADMINS */}
          <Section
            title="Super Admins secondaires"
            subtitle="Permissions limitées — ne peuvent pas gérer les super admins"
            icon={<ShieldCheck size={20} />}
            color={t.accent.primary}
            t={t}
            action={
              isOwner && (
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Plus size={14} />}
                  onClick={() => setShowCreateModal(true)}
                >
                  Nouveau
                </Button>
              )
            }
          >
            {admins.length === 0 ? (
              <EmptyState
                text={
                  isOwner
                    ? "Aucun super admin secondaire. Cliquez sur « Nouveau » pour en créer."
                    : "Aucun super admin secondaire."
                }
                t={t}
              />
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {admins.map((admin) => (
                  <AdminCard
                    key={admin._id}
                    admin={admin}
                    canManage={isOwner}
                    isEditing={editingId === admin._id}
                    editPerms={editPerms}
                    editMode={editMode}
                    saving={saving}
                    catalog={catalog}
                    onStartEdit={() => startEdit(admin)}
                    onCancelEdit={cancelEdit}
                    onEditPermsChange={setEditPerms}
                    onSave={() => handleSavePermissions(admin._id)}
                    onDelete={() => handleDelete(admin)}
                    onPromote={() => handlePromote(admin)}
                    onReactivate={() => startReactivate(admin)}
                    t={t}
                    isMobile={isMobile}
                  />
                ))}
              </div>
            )}
          </Section>
        </>
      )}

      {/* ═══════════ ONGLET : SESSIONS ═══════════ */}
      {activeTab === "sessions" && <SessionsPanel userId={userId} />}

      {/* ═══════════ MODAL CRÉATION (composant isolé) ═══════════ */}
      {showCreateModal && (
        <CreateSuperAdminModal
          userId={userId}
          catalog={catalog}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {/* ═══════════ MODAL RÉTROGRADATION ═══════════ */}
      <Modal
        open={demoteTarget !== null}
        onClose={() => {
          setDemoteTarget(null);
          setDemotePerms([]);
        }}
        title={
          demoteTarget
            ? `Rétrograder ${demoteTarget.nom}`
            : "Rétrograder un propriétaire"
        }
        maxWidth={720}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setDemoteTarget(null);
                setDemotePerms([]);
              }}
              disabled={saving}
            >
              Annuler
            </Button>
            <Button
              variant="danger"
              onClick={handleSaveDemote}
              loading={saving}
            >
              Rétrograder
            </Button>
          </>
        }
      >
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "flex-start",
            marginBottom: 16,
            padding: 12,
            borderRadius: t.radius.sm,
            background: t.status?.warning?.bg ?? "#FEF3C7",
            color: t.status?.warning?.fg ?? "#92400E",
            fontSize: 13,
          }}
        >
          <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            {demoteTarget?.nom} perdra ses droits de propriétaire. Il deviendra
            super admin avec les permissions choisies ci-dessous.
          </div>
        </div>

        <p style={{ color: t.text.muted, fontSize: 14, marginTop: 0 }}>
          Permissions à attribuer :
        </p>
        <PermissionsEditor
          catalog={catalog}
          permissions={demotePerms}
          onChange={setDemotePerms}
        />
      </Modal>

      <ConfirmDialog {...dialogProps} />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// SOUS-COMPOSANTS
// ════════════════════════════════════════════════════════════════════

function ContextBanner({ isOwner, isMobile, t }) {
  const config = isOwner
    ? {
        icon: <Crown size={18} />,
        bg: t.status?.warning?.bg ?? "#FEF3C7",
        fg: t.status?.warning?.fg ?? "#92400E",
        title: "Vous êtes propriétaire de la plateforme",
        text: "Vous pouvez créer, modifier et supprimer les super admins secondaires, et promouvoir d'autres propriétaires.",
      }
    : {
        icon: <Info size={18} />,
        bg: t.status?.info?.bg ?? "#DBEAFE",
        fg: t.status?.info?.fg ?? "#1E40AF",
        title: "Vous êtes super admin secondaire",
        text: "Vous pouvez consulter la liste, mais seuls les propriétaires peuvent créer ou modifier des super admins.",
      };

  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        padding: isMobile ? 12 : 14,
        borderRadius: t.radius.md,
        background: config.bg,
        color: config.fg,
        marginBottom: 24,
        fontSize: 13.5,
        lineHeight: 1.5,
      }}
    >
      <div style={{ flexShrink: 0, marginTop: 1 }}>{config.icon}</div>
      <div>
        <div style={{ fontWeight: 700, marginBottom: 2 }}>{config.title}</div>
        <div style={{ opacity: 0.9 }}>{config.text}</div>
      </div>
    </div>
  );
}

function Section({ title, subtitle, icon, color, action, children, t }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: t.radius.sm,
              background: `${color}20`,
              color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {icon}
          </div>
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 700,
                color: t.text.primary,
              }}
            >
              {title}
            </h3>
            <p
              style={{
                margin: "2px 0 0",
                fontSize: 12.5,
                color: t.text.muted,
              }}
            >
              {subtitle}
            </p>
          </div>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function OwnerCard({
  owner,
  isMe,
  canManage,
  canDemote,
  onDemote,
  t,
  isMobile,
}) {
  return (
    <div
      style={{
        background: t.surface.default,
        border: `1px solid #F59E0B40`,
        borderRadius: t.radius.md,
        padding: 14,
        display: "flex",
        justifyContent: "space-between",
        alignItems: isMobile ? "stretch" : "center",
        flexDirection: isMobile ? "column" : "row",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: "#F59E0B20",
            color: "#F59E0B",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Crown size={20} />
        </div>
        <div>
          <div
            style={{
              fontWeight: 700,
              fontSize: 15,
              color: t.text.primary,
            }}
          >
            {owner.nom}{" "}
            {isMe && (
              <span style={{ color: t.text.muted, fontWeight: 400 }}>
                (vous)
              </span>
            )}
          </div>
          <div style={{ fontSize: 13, color: t.text.muted }}>
            @{owner.login}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <Badge variant="warning" size="sm">
          Propriétaire
        </Badge>
        {canDemote && (
          <Button
            variant="secondary"
            size="sm"
            icon={<ArrowDownCircle size={14} />}
            onClick={() => onDemote(owner)}
          >
            Rétrograder
          </Button>
        )}
        {isMe && !canManage && (
          <span style={{ fontSize: 11, color: t.text.muted }}>
            Dernier propriétaire
          </span>
        )}
      </div>
    </div>
  );
}

function AdminCard({
  admin,
  canManage,
  isEditing,
  editPerms,
  editMode,
  saving,
  catalog,
  onStartEdit,
  onCancelEdit,
  onEditPermsChange,
  onSave,
  onDelete,
  onPromote,
  onReactivate,
  t,
  isMobile,
}) {
  const isInactive = admin.isActive === false;

  return (
    <div
      style={{
        background: t.surface.default,
        border: `1px solid ${isInactive ? "#EF444440" : t.border.default}`,
        borderRadius: t.radius.md,
        padding: 14,
        opacity: isInactive ? 0.85 : 1,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: isMobile ? "stretch" : "flex-start",
          flexDirection: isMobile ? "column" : "row",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: isInactive ? "#EF444420" : t.accent.primarySoft,
              color: isInactive ? "#EF4444" : t.accent.primary,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {isInactive ? <UserX size={20} /> : <UserCheck size={20} />}
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  fontWeight: 700,
                  fontSize: 15,
                  color: t.text.primary,
                }}
              >
                {admin.nom}
              </span>
              {isInactive && (
                <Badge variant="danger" size="sm">
                  Désactivé
                </Badge>
              )}
            </div>
            <div style={{ fontSize: 13, color: t.text.muted }}>
              @{admin.login}
            </div>
            {/* Permissions (affichage compact) */}
            {!isEditing && (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 4,
                  marginTop: 8,
                }}
              >
                {(admin.permissions ?? []).length === 0 && !isInactive && (
                  <span
                    style={{
                      fontSize: 11,
                      color: t.text.muted,
                      fontStyle: "italic",
                    }}
                  >
                    Aucune permission
                  </span>
                )}
                {(admin.permissions ?? []).slice(0, 6).map((perm) => {
                  const [mod, action] = perm.split(".");
                  const moduleLabel = catalog?.modules?.[mod]?.label ?? mod;
                  return (
                    <span
                      key={perm}
                      style={{
                        padding: "2px 8px",
                        borderRadius: t.radius.full,
                        background:
                          action === "delete"
                            ? "#EF444415"
                            : action === "write"
                            ? "#F59E0B15"
                            : t.surface.hover,
                        color:
                          action === "delete"
                            ? "#EF4444"
                            : action === "write"
                            ? "#F59E0B"
                            : t.text.secondary,
                        fontSize: 11,
                        fontWeight: 500,
                      }}
                    >
                      {moduleLabel} · {action}
                    </span>
                  );
                })}
                {(admin.permissions ?? []).length > 6 && (
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: t.radius.full,
                      background: t.surface.hover,
                      color: t.text.muted,
                      fontSize: 11,
                      fontWeight: 500,
                    }}
                  >
                    +{(admin.permissions ?? []).length - 6}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {canManage && !isEditing && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <Button
              variant="secondary"
              size="sm"
              icon={<Edit2 size={14} />}
              onClick={isInactive ? onReactivate : onStartEdit}
            >
              {isInactive ? "Réactiver" : "Permissions"}
            </Button>
            {!isInactive && (
              <Button
                variant="secondary"
                size="sm"
                icon={<ArrowUpCircle size={14} />}
                onClick={onPromote}
              >
                Promouvoir
              </Button>
            )}
            <Button
              variant="danger"
              size="sm"
              icon={<Trash2 size={14} />}
              onClick={onDelete}
            >
              Supprimer
            </Button>
          </div>
        )}
      </div>

      {/* Éditeur de permissions */}
      {isEditing && canManage && (
        <div
          style={{
            marginTop: 14,
            paddingTop: 14,
            borderTop: `1px solid ${t.border.default}`,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: t.text.muted,
              marginBottom: 8,
            }}
          >
            {editMode === "reactivate"
              ? "Permissions à attribuer pour la réactivation"
              : "Modifier les permissions granulaires"}
          </div>

          <PermissionsEditor
            catalog={catalog}
            permissions={editPerms}
            onChange={onEditPermsChange}
          />

          {editPerms.length === 0 && (
            <p
              style={{
                fontSize: 12,
                color: "#EF4444",
                marginTop: 8,
                marginBottom: 0,
              }}
            >
              ⚠️ Aucune permission → le compte sera désactivé automatiquement
            </p>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <Button
              variant="success"
              size="sm"
              icon={<Save size={14} />}
              onClick={onSave}
              loading={saving}
            >
              {editMode === "reactivate" ? "Réactiver" : "Enregistrer"}
            </Button>
            <Button variant="secondary" size="sm" onClick={onCancelEdit}>
              Annuler
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ text, t }) {
  return (
    <div
      style={{
        padding: 32,
        textAlign: "center",
        borderRadius: t.radius.md,
        background: t.surface.default,
        border: `1px dashed ${t.border.default}`,
        color: t.text.muted,
        fontSize: 14,
      }}
    >
      {text}
    </div>
  );
}

export default GestionSuperAdmins;