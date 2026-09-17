import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import { Skeleton } from "./Skeleton";
import {
  Search, X, Filter, Download, Shield, User, Calendar,
  ChevronDown, ChevronUp, AlertCircle, CheckCircle2, XCircle,
  Edit3, Bell, Link2, Trash2, Flag, ChevronLeft, ChevronRight,
  FileDown,
} from "lucide-react";

// ── Traduction FR des actions + catégorie couleur ────────────────
const ACTION_META = {
  // Validations / créations → vert
  validate_proposition:      { label: "Validation proposition",   color: "green",  icon: CheckCircle2 },
  bulk_validate_propositions:{ label: "Validation groupée",       color: "green",  icon: CheckCircle2 },
  approve_parent_link:       { label: "Approbation demande",      color: "green",  icon: CheckCircle2 },
  link_enfants_to_parent:    { label: "Association parent-enfant",color: "green",  icon: Link2 },
  // Modifications → bleu
  modify_proposition:        { label: "Modification proposition", color: "blue",   icon: Edit3 },
  rewrite_proposition:       { label: "Réécriture décision",      color: "blue",   icon: Edit3 },
  // Rejets / suppressions → rouge
  reject_proposition:        { label: "Rejet proposition",        color: "red",    icon: XCircle },
  reject_parent_link:        { label: "Rejet demande",            color: "red",    icon: XCircle },
  delete_propositions:       { label: "Suppression propositions", color: "red",    icon: Trash2 },
  unlink_parent:             { label: "Dissociation parent",      color: "red",    icon: XCircle },
  // Notifications / flags → violet
  notify_teachers_passage:   { label: "Notification enseignants", color: "purple", icon: Bell },
  flag_conseil_discipline:   { label: "Marqué conseil discipline",color: "purple", icon: Flag },
  unflag_conseil_discipline: { label: "Retiré conseil discipline",color: "purple", icon: Flag },
};

const COLOR_TOKENS = {
  green: {
    bg:  (dark) => dark ? "rgba(16,185,129,0.15)" : "#ECFDF5",
    fg:  (dark) => dark ? "#6EE7B7" : "#059669",
  },
  blue: {
    bg:  (dark) => dark ? "rgba(59,130,246,0.15)" : "#EFF6FF",
    fg:  (dark) => dark ? "#93C5FD" : "#2563EB",
  },
  red: {
    bg:  (dark) => dark ? "rgba(239,68,68,0.15)" : "#FEF2F2",
    fg:  (dark) => dark ? "#FCA5A5" : "#DC2626",
  },
  purple: {
    bg:  (dark) => dark ? "rgba(139,92,246,0.15)" : "#F5F3FF",
    fg:  (dark) => dark ? "#C4B5FD" : "#7C3AED",
  },
  default: {
    bg:  (dark) => dark ? "rgba(148,163,184,0.15)" : "#F1F5F9",
    fg:  (dark) => dark ? "#CBD5E1" : "#64748B",
  },
};

function getActionMeta(action) {
  return ACTION_META[action] || { label: action, color: "default", icon: Shield };
}

// ── Export CSV ───────────────────────────────────────────────────
function exportCSV(logs, usersMap) {
  const rows = [
    ["Date", "Utilisateur", "Action", "Table", "Document", "Détails"],
    ...logs.map((l) => [
      new Date(l.date).toLocaleString("fr-FR"),
      usersMap.get(l.userId)?.nom ?? l.userNom ?? "Inconnu",
      getActionMeta(l.action).label,
      l.table ?? "",
      l.documentId ?? "",
      (l.details ?? "").replace(/\n/g, " | "),
    ]),
  ];
  const csv = rows
    .map((r) =>
      r
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(",")
    )
    .join("\n");

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `audit-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function GestionAudit({ ecoleId, userId }) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();

  // ── Fix #1 : ne plus masquer undefined ────────────────────────
  const rawLogs = useQuery(
    api.audit.list,
    ecoleId ? { ecoleId, userId } : "skip"
  );
  const rawUsers = useQuery(
    api.users.listByEcole,
    ecoleId ? { ecoleId } : "skip"
  );
  const logs = rawLogs ?? [];
  const users = rawUsers ?? [];

  const loading =
    rawLogs === undefined ||
    (ecoleId && rawUsers === undefined);

  // ── Fix #6 : filtres ──────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all"); // all | today | week | month
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // ── Fix #2 : Map au lieu de find() ────────────────────────────
  const usersMap = useMemo(() => {
    const map = new Map();
    users.forEach((u) => map.set(u._id, u));
    return map;
  }, [users]);

  // ── Fix #4 : liste unique des actions présentes ───────────────
  const availableActions = useMemo(() => {
    const set = new Set(logs.map((l) => l.action));
    return [...set].sort();
  }, [logs]);

  const availableUsers = useMemo(() => {
    const set = new Set(logs.map((l) => l.userId));
    return [...set]
      .map((id) => ({ id, user: usersMap.get(id) }))
      .filter((x) => x.user)
      .sort((a, b) => (a.user.nom || "").localeCompare(b.user.nom || ""));
  }, [logs, usersMap]);

  // ── Filtrage ───────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const now = Date.now();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const monthAgo = now - 30 * 24 * 60 * 60 * 1000;

    const q = searchTerm.trim().toLowerCase();

    return logs.filter((log) => {
      if (actionFilter !== "all" && log.action !== actionFilter) return false;
      if (userFilter !== "all" && log.userId !== userFilter) return false;

      if (dateFilter !== "all") {
        const t = new Date(log.date).getTime();
        if (dateFilter === "today" && t < startOfDay.getTime()) return false;
        if (dateFilter === "week" && t < weekAgo) return false;
        if (dateFilter === "month" && t < monthAgo) return false;
      }

      if (q) {
        const u = usersMap.get(log.userId);
        const haystack = [
          u?.nom ?? "",
          u?.postnom ?? "",
          getActionMeta(log.action).label,
          log.table ?? "",
          log.details ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [logs, searchTerm, actionFilter, userFilter, dateFilter, usersMap]);

  // ── Fix #8 : tri stable par getTime() ─────────────────────────
  const sorted = useMemo(
    () =>
      [...filtered].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    [filtered]
  );

  // ── Fix #3 : pagination client ─────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const resetFilters = () => {
    setSearchTerm("");
    setActionFilter("all");
    setUserFilter("all");
    setDateFilter("all");
    setCurrentPage(1);
  };

  const hasActiveFilters =
    searchTerm ||
    actionFilter !== "all" ||
    userFilter !== "all" ||
    dateFilter !== "all";

  // ── Fix #1 (bis) : loader correct ─────────────────────────────
  if (loading) {
    return (
      <div style={{ maxWidth: 900, margin: "0 auto", padding: isMobile ? "16px 12px" : "24px 16px" }}>
        <Skeleton height={60} />
        <div style={{ height: 16 }} />
        <Skeleton height={120} />
        <div style={{ height: 12 }} />
        <Skeleton height={120} />
        <div style={{ height: 12 }} />
        <Skeleton height={120} />
      </div>
    );
  }

  // Styles adaptatifs
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const shadow = dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)";
  const accent = dark ? "#818CF8" : "#4F46E5";
  const inputBg = dark ? "#0F172A" : "#F9FAFB";

  const containerPadding = isMobile ? "16px 12px" : "24px 16px";
  const titleSize = isMobile ? 22 : 28;
  const subtitleSize = isMobile ? 13 : 14;
  const headerMarginBottom = isMobile ? 20 : 28;
  const emptyStatePadding = isMobile ? 32 : 48;
  const cardPadding = isMobile ? "12px 14px" : "16px 20px";
  const cardGap = isMobile ? 8 : 10;
  const actionBadgeFontSize = isMobile ? 11 : 12;
  const detailFontSize = isMobile ? 12 : 13;
  const documentFontSize = isMobile ? 11 : 12;

  const selectStyle = {
    padding: isMobile ? "10px 12px" : "8px 12px",
    border: `1px solid ${cardBorder}`,
    borderRadius: 8,
    background: inputBg,
    color: textPrimary,
    fontSize: isMobile ? 14 : 13,
    cursor: "pointer",
    width: isMobile ? "100%" : "auto",
  };

  const btnSecondary = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: isMobile ? "10px 14px" : "8px 14px",
    border: `1px solid ${cardBorder}`,
    borderRadius: 8,
    background: "transparent",
    color: textPrimary,
    cursor: "pointer",
    fontWeight: 500,
    fontSize: isMobile ? 13 : 13,
    width: isMobile ? "100%" : "auto",
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: containerPadding }}>
      {/* En-tête */}
      <div style={{ marginBottom: headerMarginBottom }}>
        <h2
          style={{
            fontSize: titleSize,
            fontWeight: 700,
            color: textPrimary,
            margin: 0,
          }}
        >
          Journal d'audit
        </h2>
        <p style={{ color: textSecondary, marginTop: 4, fontSize: subtitleSize }}>
          {hasActiveFilters
            ? `${sorted.length} sur ${logs.length} événement(s)`
            : `${logs.length} événement(s)`}
        </p>
      </div>

      {/* Barre de filtres */}
      <div
        style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          gap: 8,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: 1, minWidth: isMobile ? "100%" : 200, position: "relative" }}>
          <Search
            size={16}
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: textSecondary,
              pointerEvents: "none",
            }}
          />
          <input
            type="search"
            placeholder="Rechercher…"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              width: "100%",
              padding: isMobile
                ? "12px 12px 12px 40px"
                : "9px 12px 9px 40px",
              border: `1px solid ${cardBorder}`,
              borderRadius: 8,
              background: inputBg,
              color: textPrimary,
              fontSize: isMobile ? 16 : 14,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              style={{
                position: "absolute",
                right: 8,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: textSecondary,
                padding: 4,
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        <select
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setCurrentPage(1);
          }}
          style={selectStyle}
        >
          <option value="all">Toutes les actions</option>
          {availableActions.map((a) => (
            <option key={a} value={a}>
              {getActionMeta(a).label}
            </option>
          ))}
        </select>

        <select
          value={userFilter}
          onChange={(e) => {
            setUserFilter(e.target.value);
            setCurrentPage(1);
          }}
          style={selectStyle}
        >
          <option value="all">Tous les utilisateurs</option>
          {availableUsers.map(({ id, user }) => (
            <option key={id} value={id}>
              {user.nom} {user.postnom || ""}
            </option>
          ))}
        </select>

        <select
          value={dateFilter}
          onChange={(e) => {
            setDateFilter(e.target.value);
            setCurrentPage(1);
          }}
          style={selectStyle}
        >
          <option value="all">Toute la période</option>
          <option value="today">Aujourd'hui</option>
          <option value="week">7 derniers jours</option>
          <option value="month">30 derniers jours</option>
        </select>
      </div>

      {/* Actions secondaires */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        {hasActiveFilters && (
          <button onClick={resetFilters} style={btnSecondary}>
            <X size={14} /> Réinitialiser les filtres
          </button>
        )}
        {sorted.length > 0 && (
          <button
            onClick={() => exportCSV(sorted, usersMap)}
            style={btnSecondary}
          >
            <FileDown size={14} /> Exporter en CSV ({sorted.length})
          </button>
        )}
      </div>

      {/* Liste des logs */}
      {sorted.length === 0 ? (
        <div
          style={{
            background: cardBg,
            borderRadius: 16,
            padding: emptyStatePadding,
            textAlign: "center",
            boxShadow: shadow,
            border: `1px solid ${cardBorder}`,
            color: textSecondary,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: dark ? "#0F172A" : "#F1F5F9",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              color: textSecondary,
            }}
          >
            <Shield size={28} />
          </div>
          <p style={{ fontSize: isMobile ? 15 : 16, fontWeight: 500, marginBottom: 4, color: textPrimary }}>
            {hasActiveFilters ? "Aucun événement trouvé" : "Aucun événement enregistré"}
          </p>
          <p style={{ fontSize: isMobile ? 13 : 14, margin: 0 }}>
            {hasActiveFilters
              ? "Essayez d'élargir vos filtres."
              : "Les actions importantes apparaîtront ici."}
          </p>
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gap: cardGap }}>
            {paginated.map((log) => {
              const user = usersMap.get(log.userId);
              const meta = getActionMeta(log.action);
              const Icon = meta.icon;
              const colorToken = COLOR_TOKENS[meta.color] || COLOR_TOKENS.default;

              return (
                <div
                  key={log._id}
                  style={{
                    background: cardBg,
                    borderRadius: 12,
                    padding: cardPadding,
                    boxShadow: shadow,
                    border: `1px solid ${cardBorder}`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: isMobile ? "column" : "row",
                      justifyContent: "space-between",
                      alignItems: isMobile ? "stretch" : "flex-start",
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                        minWidth: 0,
                        flex: 1,
                      }}
                    >
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          background: colorToken.bg(dark),
                          color: colorToken.fg(dark),
                          padding: "3px 10px",
                          borderRadius: 20,
                          fontSize: actionBadgeFontSize,
                          fontWeight: 600,
                          flexShrink: 0,
                        }}
                      >
                        <Icon size={12} />
                        {meta.label}
                      </span>
                      {log.table && (
                        <span
                          style={{
                            color: textSecondary,
                            fontSize: actionBadgeFontSize,
                            padding: "3px 8px",
                            border: `1px solid ${cardBorder}`,
                            borderRadius: 6,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {log.table}
                        </span>
                      )}
                    </div>
                    <small
                      style={{
                        color: textSecondary,
                        fontSize: isMobile ? 11 : 12,
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                      }}
                    >
                      {new Date(log.date).toLocaleString("fr-FR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </small>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      marginTop: 8,
                      color: textPrimary,
                      fontSize: isMobile ? 14 : 13,
                    }}
                  >
                    <User size={13} style={{ color: textSecondary, flexShrink: 0 }} />
                    <strong>
                      {user?.nom ?? "Utilisateur supprimé"}
                      {user?.postnom ? ` ${user.postnom}` : ""}
                    </strong>
                  </div>

                  {log.details && (
                    <p
                      style={{
                        marginTop: 8,
                        marginBottom: 0,
                        fontSize: detailFontSize,
                        color: textSecondary,
                        lineHeight: 1.5,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                      }}
                    >
                      {log.details}
                    </p>
                  )}

                  {log.documentId && (
                    <div
                      style={{
                        fontSize: documentFontSize,
                        color: dark ? "#475569" : "#94A3B8",
                        marginTop: 6,
                        fontFamily: "monospace",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={log.documentId}
                    >
                      Réf. : {log.documentId}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: 8,
                marginTop: 20,
              }}
            >
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                style={{
                  padding: isMobile ? "10px 12px" : "6px 10px",
                  border: `1px solid ${cardBorder}`,
                  borderRadius: 6,
                  background: "transparent",
                  cursor: safePage === 1 ? "not-allowed" : "pointer",
                  color: textPrimary,
                  opacity: safePage === 1 ? 0.5 : 1,
                }}
              >
                <ChevronLeft size={16} />
              </button>
              <span style={{ fontSize: isMobile ? 14 : 13, color: textSecondary }}>
                Page {safePage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                style={{
                  padding: isMobile ? "10px 12px" : "6px 10px",
                  border: `1px solid ${cardBorder}`,
                  borderRadius: 6,
                  background: "transparent",
                  cursor: safePage === totalPages ? "not-allowed" : "pointer",
                  color: textPrimary,
                  opacity: safePage === totalPages ? 0.5 : 1,
                }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}