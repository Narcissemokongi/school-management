// src/components/SuperAdmin/sections/AuditSection.jsx
import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useTokens } from "@/theme/tokens";
import { useIsMobile } from "@/hooks/useIsMobile";
import { Button, IconButton } from "@/components/ui";
import toast from "react-hot-toast";
import {
  Activity, Download, Loader, Search, X, Filter, Calendar,
  Shield, User, School, FileText, ChevronDown, ChevronRight,
} from "lucide-react";

// ════════════════════════════════════════════════════════════════
// CONFIG
// ════════════════════════════════════════════════════════════════

const ACTION_COLORS = {
  creation: "#10B981",
  create: "#10B981",
  create_ecole: "#10B981",
  create_super_admin: "#10B981",
  add_user: "#10B981",
  approve_user: "#10B981",

  modification: "#3B82F6",
  update: "#3B82F6",
  update_user: "#3B82F6",
  update_role: "#3B82F6",
  update_super_admin_permissions: "#3B82F6",
  suspend_ecole: "#F59E0B",
  reactivate_ecole: "#3B82F6",

  suppression: "#EF4444",
  delete: "#EF4444",
  delete_ecole: "#EF4444",
  delete_user: "#EF4444",
  delete_super_admin: "#EF4444",
  reject_user: "#EF4444",

  activation: "#10B981",
  desactivation: "#F59E0B",

  change_password: "#8B5CF6",
  send_to_all_parents: "#06B6D4",
};

const getActionColor = (action) =>
  ACTION_COLORS[action] ?? "#64748B";

const getActionLabel = (action) => {
  const labels = {
    create_ecole: "Création école",
    delete_ecole: "Suppression école",
    suspend_ecole: "Suspension école",
    reactivate_ecole: "Réactivation école",
    create_super_admin: "Création super admin",
    update_super_admin_permissions: "MAJ permissions super admin",
    delete_super_admin: "Suppression super admin",
    add_user: "Ajout utilisateur",
    update_user: "MAJ utilisateur",
    delete_user: "Suppression utilisateur",
    approve_user: "Approbation utilisateur",
    reject_user: "Rejet utilisateur",
    change_password: "Changement mot de passe",
    update_role: "Changement de rôle",
    send_to_all_parents: "Message à tous les parents",
    creation: "Création",
    modification: "Modification",
    suppression: "Suppression",
    activation: "Activation",
    desactivation: "Désactivation",
  };
  return labels[action] ?? action;
};

const formatDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDateShort = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

// ════════════════════════════════════════════════════════════════
// KPI Card (inline, pas de dépendance)
// ════════════════════════════════════════════════════════════════
function KpiCard({ icon: Icon, label, value, color, footer }) {
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
      {footer && (
        <div style={{ fontSize: t.font.size.xs, color: t.text.secondary }}>
          {footer}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Composant principal
// ════════════════════════════════════════════════════════════════
export function AuditSection({ userId }) {
  const t = useTokens();
  const isMobile = useIsMobile();

  // Filtres
  const [filtreAction, setFiltreAction] = useState("");
  const [filtreEcole, setFiltreEcole] = useState("");
  const [filtreDateDebut, setFiltreDateDebut] = useState("");
  const [filtreDateFin, setFiltreDateFin] = useState("");
  const [recherche, setRecherche] = useState("");
  const [showFiltres, setShowFiltres] = useState(!isMobile);

  // Détail dépliable
  const [expandedId, setExpandedId] = useState(null);

  // ─── Queries ─────────────────────────────────────
  const listArgs = useMemo(
    () => ({
      userId,
      action: filtreAction || undefined,
      ecoleId: filtreEcole || undefined,
      dateDebut: filtreDateDebut
        ? new Date(filtreDateDebut).getTime()
        : undefined,
      dateFin: filtreDateFin
        ? new Date(filtreDateFin).getTime() + 24 * 60 * 60 * 1000 - 1
        : undefined,
      recherche: recherche || undefined,
      limit: 500,
    }),
    [userId, filtreAction, filtreEcole, filtreDateDebut, filtreDateFin, recherche]
  );

  const logsRaw = useQuery(api.audit.listAll, listArgs);
  const statsRaw = useQuery(api.audit.stats, { userId });
  const actionsRaw = useQuery(api.audit.listActions, { userId });
  const ecolesRaw = useQuery(api.audit.listEcoles, { userId });

  const logs = useMemo(() => logsRaw ?? [], [logsRaw]);
  const stats = statsRaw ?? {
    total: 0,
    dernieres24h: 0,
    derniers7j: 0,
    topActions: [],
  };
  const actions = actionsRaw ?? [];
  const ecoles = ecolesRaw ?? [];

  // ─── Reset filtres ────────────────────────────────
  const resetFiltres = () => {
    setFiltreAction("");
    setFiltreEcole("");
    setFiltreDateDebut("");
    setFiltreDateFin("");
    setRecherche("");
  };

  const hasFilters =
    filtreAction || filtreEcole || filtreDateDebut || filtreDateFin || recherche;

  // ─── Export Excel ─────────────────────────────────
  const handleExport = async () => {
    if (logs.length === 0) {
      toast.error("Aucune donnée à exporter");
      return;
    }

    try {
      const XLSX = await import("xlsx");

      const data = logs.map((l) => ({
        Date: formatDate(l.date),
        Action: getActionLabel(l.action),
        "Code action": l.action,
        Auteur: l.auteurNom,
        Login: l.auteurLogin,
        Rôle: l.auteurRole,
        École: l.ecoleNom ?? "—",
        "Code école": l.ecoleCode ?? "—",
        Table: l.table,
        "ID document": l.documentId,
        Détails: l.details,
      }));

      const ws = XLSX.utils.json_to_sheet(data);

      // Largeurs de colonnes
      ws["!cols"] = [
        { wch: 18 }, // Date
        { wch: 30 }, // Action
        { wch: 25 }, // Code action
        { wch: 20 }, // Auteur
        { wch: 15 }, // Login
        { wch: 14 }, // Rôle
        { wch: 25 }, // École
        { wch: 12 }, // Code école
        { wch: 18 }, // Table
        { wch: 24 }, // ID document
        { wch: 60 }, // Détails
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Audit");

      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10);
      const timeStr = now.toTimeString().slice(0, 5).replace(":", "h");
      XLSX.writeFile(wb, `audit_${dateStr}_${timeStr}.xlsx`);

      toast.success(`Export Excel généré (${logs.length} ligne(s))`);
    } catch (err) {
      console.error("[audit] export error:", err);
      toast.error("Impossible de générer l'export : " + (err?.message ?? "erreur"));
    }
  };

  // ─── Loading ─────────────────────────────────────
  if (logsRaw === undefined || statsRaw === undefined) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
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
            Journal d'audit
          </h2>
          <p
            style={{
              fontSize: t.font.size.sm,
              color: t.text.secondary,
              margin: "4px 0 0",
            }}
          >
            Historique complet des actions sensibles (RGPD)
          </p>
        </div>
        <Button
          icon={<Download size={16} />}
          onClick={handleExport}
          disabled={logs.length === 0}
        >
          Export Excel
        </Button>
      </div>

      {/* ═══ KPI Grid ═══ */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)",
          gap: t.space.md,
        }}
      >
        <KpiCard
          icon={Activity}
          label="Total logs"
          value={stats.total}
        />
        <KpiCard
          icon={Calendar}
          label="Dernières 24h"
          value={stats.dernieres24h}
          color="#10B981"
        />
        <KpiCard
          icon={Calendar}
          label="7 derniers jours"
          value={stats.derniers7j}
          color="#3B82F6"
        />
        <KpiCard
          icon={Filter}
          label="Affichés"
          value={logs.length}
          color="#8B5CF6"
          footer={hasFilters ? "Filtres actifs" : "Aucun filtre"}
        />
      </div>

      {/* ═══ Barre de recherche + toggle filtres ═══ */}
      <div
        style={{
          display: "flex",
          gap: t.space.sm,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            background: t.surface.elevated,
            border: `1px solid ${t.border.default}`,
            borderRadius: t.radius.sm,
            padding: "8px 12px",
            flex: 1,
            minWidth: isMobile ? "100%" : 250,
          }}
        >
          <Search size={16} color={t.text.muted} />
          <input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher dans les détails, actions, IDs..."
            style={{
              border: "none",
              outline: "none",
              background: "transparent",
              color: t.text.primary,
              fontSize: t.font.size.sm,
              fontFamily: t.font.family,
              marginLeft: 8,
              width: "100%",
            }}
          />
          {recherche && (
            <button
              type="button"
              onClick={() => setRecherche("")}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                color: t.text.muted,
                display: "flex",
              }}
              aria-label="Effacer la recherche"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowFiltres((v) => !v)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 14px",
            border: `1px solid ${t.border.default}`,
            borderRadius: t.radius.sm,
            background: showFiltres ? `${t.accent.primary}15` : "transparent",
            color: showFiltres ? t.accent.primary : t.text.secondary,
            cursor: "pointer",
            fontSize: t.font.size.sm,
            fontWeight: 600,
            fontFamily: t.font.family,
          }}
        >
          <Filter size={14} />
          Filtres
          {hasFilters && (
            <span
              style={{
                background: t.accent.primary,
                color: "#FFFFFF",
                borderRadius: t.radius.full,
                minWidth: 18,
                height: 18,
                padding: "0 5px",
                fontSize: 10,
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              !
            </span>
          )}
        </button>

        {hasFilters && (
          <button
            type="button"
            onClick={resetFiltres}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              border: `1px solid ${t.border.default}`,
              borderRadius: t.radius.sm,
              background: "transparent",
              color: "#EF4444",
              cursor: "pointer",
              fontSize: t.font.size.sm,
              fontWeight: 600,
              fontFamily: t.font.family,
            }}
          >
            <X size={14} />
            Réinitialiser
          </button>
        )}
      </div>

      {/* ═══ Panneau filtres ═══ */}
      {showFiltres && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(4, 1fr)",
            gap: t.space.sm,
            padding: t.space.md,
            background: t.surface.elevated,
            border: `1px solid ${t.border.subtle}`,
            borderRadius: t.radius.md,
          }}
        >
          {/* Filtre action */}
          <div>
            <label
              style={{
                fontSize: t.font.size.xs,
                color: t.text.secondary,
                fontWeight: 600,
                display: "block",
                marginBottom: 4,
              }}
            >
              Action
            </label>
            <select
              value={filtreAction}
              onChange={(e) => setFiltreAction(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: t.radius.sm,
                border: `1px solid ${t.border.default}`,
                background: t.surface.input ?? t.surface.default,
                color: t.text.primary,
                fontSize: t.font.size.sm,
                fontFamily: t.font.family,
              }}
            >
              <option value="">Toutes les actions</option>
              {actions.map((a) => (
                <option key={a} value={a}>
                  {getActionLabel(a)}
                </option>
              ))}
            </select>
          </div>

          {/* Filtre école */}
          <div>
            <label
              style={{
                fontSize: t.font.size.xs,
                color: t.text.secondary,
                fontWeight: 600,
                display: "block",
                marginBottom: 4,
              }}
            >
              École
            </label>
            <select
              value={filtreEcole}
              onChange={(e) => setFiltreEcole(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: t.radius.sm,
                border: `1px solid ${t.border.default}`,
                background: t.surface.input ?? t.surface.default,
                color: t.text.primary,
                fontSize: t.font.size.sm,
                fontFamily: t.font.family,
              }}
            >
              <option value="">Toutes les écoles</option>
              {ecoles.map((e) => (
                <option key={e._id} value={e._id}>
                  {e.nom}
                  {e.code ? ` (${e.code})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Date début */}
          <div>
            <label
              style={{
                fontSize: t.font.size.xs,
                color: t.text.secondary,
                fontWeight: 600,
                display: "block",
                marginBottom: 4,
              }}
            >
              Du
            </label>
            <input
              type="date"
              value={filtreDateDebut}
              onChange={(e) => setFiltreDateDebut(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: t.radius.sm,
                border: `1px solid ${t.border.default}`,
                background: t.surface.input ?? t.surface.default,
                color: t.text.primary,
                fontSize: t.font.size.sm,
                fontFamily: t.font.family,
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Date fin */}
          <div>
            <label
              style={{
                fontSize: t.font.size.xs,
                color: t.text.secondary,
                fontWeight: 600,
                display: "block",
                marginBottom: 4,
              }}
            >
              Au
            </label>
            <input
              type="date"
              value={filtreDateFin}
              onChange={(e) => setFiltreDateFin(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: t.radius.sm,
                border: `1px solid ${t.border.default}`,
                background: t.surface.input ?? t.surface.default,
                color: t.text.primary,
                fontSize: t.font.size.sm,
                fontFamily: t.font.family,
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>
      )}

      {/* ═══ Liste / Table ═══ */}
      {logs.length === 0 ? (
        <div
          style={{
            padding: t.space.xl,
            textAlign: "center",
            background: t.surface.elevated,
            border: `1px solid ${t.border.subtle}`,
            borderRadius: t.radius.lg,
          }}
        >
          <Activity size={40} color={t.text.muted} style={{ marginBottom: 12 }} />
          <p
            style={{
              fontSize: t.font.size.sm,
              color: t.text.secondary,
              margin: 0,
            }}
          >
            {hasFilters
              ? "Aucun log ne correspond aux filtres."
              : "Aucun log enregistré."}
          </p>
        </div>
      ) : (
        <div
          style={{
            background: t.surface.elevated,
            border: `1px solid ${t.border.subtle}`,
            borderRadius: t.radius.lg,
            overflow: "hidden",
          }}
        >
          {logs.map((log, i) => {
            const color = getActionColor(log.action);
            const expanded = expandedId === log._id;

            return (
              <div
                key={log._id}
                style={{
                  borderTop: i > 0 ? `1px solid ${t.border.subtle}` : "none",
                }}
              >
                {/* Ligne principale */}
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : log._id)}
                  style={{
                    display: "flex",
                    gap: t.space.sm,
                    padding: `${t.space.sm} ${t.space.md}`,
                    alignItems: "flex-start",
                    width: "100%",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                    fontFamily: t.font.family,
                    color: t.text.primary,
                  }}
                >
                  {/* Chevron */}
                  <div
                    style={{
                      marginTop: 4,
                      color: t.text.muted,
                      flexShrink: 0,
                      display: "flex",
                    }}
                  >
                    {expanded ? (
                      <ChevronDown size={14} />
                    ) : (
                      <ChevronRight size={14} />
                    )}
                  </div>

                  {/* Badge action */}
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: color,
                      background: `${color}15`,
                      padding: "3px 8px",
                      borderRadius: t.radius.full,
                      textTransform: "uppercase",
                      letterSpacing: 0.3,
                      flexShrink: 0,
                      marginTop: 2,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {getActionLabel(log.action)}
                  </span>

                  {/* Contenu principal */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: t.font.size.sm,
                        color: t.text.primary,
                        fontWeight: 500,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: expanded ? "normal" : "nowrap",
                      }}
                    >
                      {log.details || "—"}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: t.space.md,
                        marginTop: 4,
                        fontSize: t.font.size.xs,
                        color: t.text.muted,
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 3,
                        }}
                      >
                        <User size={11} />
                        {log.auteurNom}
                        {log.auteurRole && log.auteurRole !== "—"
                          ? ` (${log.auteurRole})`
                          : ""}
                      </span>
                      {log.ecoleNom && (
                        <span
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 3,
                          }}
                        >
                          <School size={11} />
                          {log.ecoleNom}
                        </span>
                      )}
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 3,
                        }}
                      >
                        <Calendar size={11} />
                        {formatDate(log.date)}
                      </span>
                    </div>
                  </div>
                </button>

                {/* Détail dépliable */}
                {expanded && (
                  <div
                    style={{
                      padding: `${t.space.sm} ${t.space.md} ${t.space.md} 46px`,
                      background: t.surface.hover ?? "#FAFAFA",
                      borderTop: `1px solid ${t.border.subtle}`,
                    }}
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                        gap: t.space.sm,
                        fontSize: t.font.size.xs,
                      }}
                    >
                      <DetailField
                        icon={FileText}
                        label="Table"
                        value={log.table}
                      />
                      <DetailField
                        icon={FileText}
                        label="ID document"
                        value={log.documentId}
                        mono
                      />
                      <DetailField
                        icon={Shield}
                        label="Code action"
                        value={log.action}
                        mono
                      />
                      <DetailField
                        icon={User}
                        label="Login auteur"
                        value={log.auteurLogin}
                        mono
                      />
                      {log.ecoleCode && (
                        <DetailField
                          icon={School}
                          label="Code école"
                          value={log.ecoleCode}
                          mono
                        />
                      )}
                      <DetailField
                        icon={Calendar}
                        label="Date ISO"
                        value={log.date}
                        mono
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// Sous-composant : champ détail
// ════════════════════════════════════════════════════════════════
function DetailField({ icon: Icon, label, value, mono }) {
  const t = useTokens();
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
      <Icon size={12} color={t.text.muted} style={{ marginTop: 2, flexShrink: 0 }} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ color: t.text.muted, fontWeight: 600 }}>{label}</div>
        <div
          style={{
            color: t.text.primary,
            fontFamily: mono ? "monospace" : t.font.family,
            wordBreak: "break-all",
          }}
        >
          {value || "—"}
        </div>
      </div>
    </div>
  );
}

export default AuditSection;