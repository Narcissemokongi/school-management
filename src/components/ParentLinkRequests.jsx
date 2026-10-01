// src/components/ParentLinkRequests.jsx
import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useConfirm } from "@/hooks/useConfirm";
import { ConfirmDialog } from "./ConfirmDialog";
import toast from "react-hot-toast";
import {
  Loader, CheckCircle2, XCircle, Search, X, CheckSquare, Square,
  User, GraduationCap, Calendar, ChevronUp, ChevronDown, Mail,
  ChevronLeft, ChevronRight, ArrowUpDown,
} from "lucide-react";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";

// ════════════════════════════════════════════════════════════════════
// SAFE-AREA
// ════════════════════════════════════════════════════════════════════
const SAFE_TOP = "env(safe-area-inset-top, 0px)";
const SAFE_BOTTOM = "env(safe-area-inset-bottom, 0px)";
const SAFE_LEFT = "env(safe-area-inset-left, 0px)";
const SAFE_RIGHT = "env(safe-area-inset-right, 0px)";

const MOBILE_TAP = 44;

// ════════════════════════════════════════════════════════════════════
// KEYFRAMES module-level
// ════════════════════════════════════════════════════════════════════
const PLRKeyframes = (
  <style>{`
    @keyframes plr-spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
    .plr-spin { animation: plr-spin 1s linear infinite; }
    @media (prefers-reduced-motion: reduce) {
      .plr-spin { animation: none !important; }
    }
  `}</style>
);

export function ParentLinkRequests({ user, ecoleId }) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [processingIds, setProcessingIds] = useState(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);
  // ✨ Feedback tap sur boutons
  const [pressedBtn, setPressedBtn] = useState(null);

  const pressBtn = useCallback((id) => () => setPressedBtn(id), []);
  const releaseBtn = useCallback(() => setPressedBtn(null), []);

  const rawRequests = useQuery(
    api.parentLinks.listAll,
    user?._id
      ? { adminId: user._id, status: statusFilter }
      : "skip"
  );
  const requests = rawRequests ?? [];

  const approve = useMutation(api.parentLinks.approveParentLinkRequest);
  const reject = useMutation(api.parentLinks.rejectParentLinkRequest);
  const { confirm, dialogProps } = useConfirm();

  // Dedupe des IDs
  const parentIds = useMemo(
    () => [...new Set(requests.map((r) => r.parentId))],
    [requests]
  );
  const eleveIds = useMemo(
    () => [...new Set(requests.map((r) => r.eleveId))],
    [requests]
  );

  const rawParents = useQuery(
    api.users.getByIds,
    parentIds.length > 0 ? { ids: parentIds } : "skip"
  );
  const rawEleves = useQuery(
    api.eleves.getByIds,
    eleveIds.length > 0 ? { ids: eleveIds } : "skip"
  );
  const parents = rawParents ?? [];
  const eleves = rawEleves ?? [];

  const enrichmentLoading =
    rawRequests === undefined ||
    (parentIds.length > 0 && rawParents === undefined) ||
    (eleveIds.length > 0 && rawEleves === undefined);

  const parentMap = useMemo(() => {
    const map = {};
    parents.forEach((p) => {
      map[p._id] = p;
    });
    return map;
  }, [parents]);

  const eleveMap = useMemo(() => {
    const map = {};
    eleves.forEach((e) => {
      map[e._id] = e;
    });
    return map;
  }, [eleves]);

  const enrichedRequests = useMemo(() => {
    return requests.map((req) => ({
      ...req,
      parent: parentMap[req.parentId],
      eleve: eleveMap[req.eleveId],
    }));
  }, [requests, parentMap, eleveMap]);

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return enrichedRequests;
    const q = searchTerm.toLowerCase();
    return enrichedRequests.filter((req) => {
      const parentName = req.parent
        ? `${req.parent.nom} ${req.parent.postnom || ""}`.toLowerCase()
        : "";
      const eleveName = req.eleve
        ? `${req.eleve.nom} ${req.eleve.postnom || ""}`.toLowerCase()
        : "";
      return parentName.includes(q) || eleveName.includes(q);
    });
  }, [enrichedRequests, searchTerm]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      let valA, valB;
      if (sortBy === "date") {
        valA = new Date(a.createdAt).getTime();
        valB = new Date(b.createdAt).getTime();
      } else if (sortBy === "parent") {
        valA = a.parent
          ? `${a.parent.nom} ${a.parent.postnom}`.toLowerCase()
          : "";
        valB = b.parent
          ? `${b.parent.nom} ${b.parent.postnom}`.toLowerCase()
          : "";
      } else if (sortBy === "eleve") {
        valA = a.eleve
          ? `${a.eleve.nom} ${a.eleve.postnom}`.toLowerCase()
          : "";
        valB = b.eleve
          ? `${b.eleve.nom} ${b.eleve.postnom}`.toLowerCase()
          : "";
      }
      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [filtered, sortBy, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginated = sorted.slice(
    (safeCurrentPage - 1) * pageSize,
    safeCurrentPage * pageSize
  );

  const friendlyError = (err, action) => {
    console.error(`[ParentLinkRequests] ${action} failed:`, err);
    toast.error(`Échec : impossible de ${action}`);
  };

  const handleApprove = async (id) => {
    const ok = await confirm(
      "Approuver",
      "Voulez-vous approuver cette demande ?"
    );
    if (!ok) return;
    setProcessingIds((prev) => new Set(prev).add(id));
    try {
      await approve({ requestId: id, adminId: user._id });
      toast.success("Demande approuvée");
    } catch (err) {
      friendlyError(err, "approuver la demande");
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleReject = async (id) => {
    const ok = await confirm(
      "Rejeter",
      "Voulez-vous rejeter cette demande ?"
    );
    if (!ok) return;
    setProcessingIds((prev) => new Set(prev).add(id));
    try {
      await reject({ requestId: id, adminId: user._id });
      toast.success("Demande rejetée");
    } catch (err) {
      friendlyError(err, "rejeter la demande");
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const runInBatches = async (items, fn, batchSize = 5) => {
    for (let i = 0; i < items.length; i += batchSize) {
      await Promise.all(items.slice(i, i + batchSize).map(fn));
    }
  };

  const handleApproveAll = async () => {
    const pending = sorted.filter((r) => r.status === "pending");
    if (pending.length === 0) return;

    const ok = await confirm(
      "Approuver tout",
      `Voulez-vous approuver les ${pending.length} demande(s) en attente affichée(s) ?`
    );
    if (!ok) return;

    setBulkProcessing(true);
    try {
      await runInBatches(pending, (req) =>
        approve({ requestId: req._id, adminId: user._id })
      );
      toast.success(`${pending.length} demande(s) approuvée(s)`);
    } catch (err) {
      friendlyError(err, "approuver les demandes");
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleRejectAll = async () => {
    const pending = sorted.filter((r) => r.status === "pending");
    if (pending.length === 0) return;

    const ok = await confirm(
      "Rejeter tout",
      `Voulez-vous rejeter les ${pending.length} demande(s) en attente affichée(s) ?`
    );
    if (!ok) return;

    setBulkProcessing(true);
    try {
      await runInBatches(pending, (req) =>
        reject({ requestId: req._id, adminId: user._id })
      );
      toast.success(`${pending.length} demande(s) rejetée(s)`);
    } catch (err) {
      friendlyError(err, "rejeter les demandes");
    } finally {
      setBulkProcessing(false);
    }
  };

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  // ════════════════════════════════════════════════════════════════
  // LOADING
  // ════════════════════════════════════════════════════════════════
  if (enrichmentLoading) {
    return (
      <>
        {PLRKeyframes}
        <div
          role="status"
          aria-live="polite"
          aria-busy="true"
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: 60,
            color: dark ? "#94A3B8" : "#64748B",
            gap: 12,
          }}
        >
          <Loader className="plr-spin" size={24} aria-hidden="true" />
          <span>Chargement des demandes…</span>
        </div>
      </>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // STYLES
  // ════════════════════════════════════════════════════════════════
  const containerPadding = isMobile
    ? `calc(16px + ${SAFE_TOP}) calc(12px + ${SAFE_RIGHT}) calc(16px + ${SAFE_BOTTOM}) calc(12px + ${SAFE_LEFT})`
    : "24px 16px";
  const titleSize = isMobile ? 20 : 24;
  const headerMarginBottom = isMobile ? 16 : 24;

  // Styles adaptatifs
  const searchBarFlexDirection = isMobile ? "column" : "row";
  const searchBarGap = isMobile ? 8 : 12;
  const searchInputPadding = isMobile
    ? "12px 40px 12px 40px"
    : "8px 40px 8px 40px";
  const searchInputFontSize = isMobile ? 16 : 14;
  const selectPadding = isMobile ? "12px 14px" : "8px 12px";
  const selectFontSize = isMobile ? 16 : 14;
  const sortButtonsFlexDirection = isMobile ? "column" : "row";
  const sortButtonsGap = isMobile ? 4 : 8;
  const cardPadding = isMobile ? 12 : 16;
  const cardFlexDirection = isMobile ? "column" : "row";
  const cardAlignItems = isMobile ? "stretch" : "center";
  const cardGap = isMobile ? 8 : 12;
  const actionButtonPadding = isMobile ? "12px 14px" : "8px 16px";
  const actionButtonFontSize = 14;
  const bulkActionsFlexDirection = isMobile ? "column" : "row";
  const paginationButtonPadding = isMobile ? "12px 14px" : "6px 10px";
  const paginationFontSize = isMobile ? 14 : 13;

  const nameStyle = {
    fontWeight: 500,
    color: dark ? "#F1F5F9" : "#1E293B",
    fontSize: isMobile ? 15 : 14,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    maxWidth: isMobile ? "100%" : 260,
    minWidth: 0,
  };

  const cardColumnStyle = {
    flex: 1,
    minWidth: 0,
  };

  // Helper bouton de base
  const btnStyle = (pressedKey, extra = {}) => ({
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    border: "none",
    cursor: "pointer",
    fontWeight: 600,
    fontFamily: "inherit",
    transform: pressedBtn === pressedKey ? "scale(0.97)" : "scale(1)",
    transition: "transform 0.1s ease, background 0.12s ease, opacity 0.15s ease",
    WebkitTapHighlightColor: "transparent",
    touchAction: "manipulation",
    boxSizing: "border-box",
    minHeight: isMobile ? MOBILE_TAP : undefined,
    ...extra,
  });

  return (
    <>
      {PLRKeyframes}
      <div
        style={{
          maxWidth: 1000,
          margin: "0 auto",
          padding: containerPadding,
          boxSizing: "border-box",
        }}
      >
        <h2
          style={{
            fontSize: titleSize,
            fontWeight: 700,
            marginBottom: headerMarginBottom,
            color: dark ? "#F1F5F9" : "#1E293B",
            lineHeight: 1.2,
          }}
        >
          Demandes d'association parent-enfant
        </h2>

        {/* ═══ Barre de recherche + filtres ═══ */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: searchBarGap,
            marginBottom: 16,
            flexDirection: searchBarFlexDirection,
          }}
        >
          <div
            style={{
              flex: 1,
              minWidth: isMobile ? "100%" : 200,
              position: "relative",
            }}
          >
            <Search
              size={16}
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: dark ? "#94A3B8" : "#9CA3AF",
                pointerEvents: "none",
              }}
              aria-hidden="true"
            />
            <input
              type="search"
              placeholder="Rechercher parent ou élève..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              inputMode="search"
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
              style={{
                width: "100%",
                padding: searchInputPadding,
                border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
                borderRadius: 8,
                background: dark ? "#0F172A" : "#F9FAFB",
                color: dark ? "#F1F5F9" : "#1E293B",
                fontSize: searchInputFontSize,
                outline: "none",
                boxSizing: "border-box",
                fontFamily: "inherit",
                minHeight: isMobile ? MOBILE_TAP : undefined,
                WebkitAppearance: "none",
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation",
              }}
            />
            {searchTerm && (
              // ✨ Clear X : zone 44×44px
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                aria-label="Effacer la recherche"
                style={{
                  position: "absolute",
                  right: isMobile ? 2 : 6,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: dark ? "#94A3B8" : "#64748B",
                  padding: 0,
                  width: isMobile ? MOBILE_TAP : 32,
                  height: isMobile ? MOBILE_TAP : 32,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 8,
                  WebkitTapHighlightColor: "transparent",
                  touchAction: "manipulation",
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              padding: selectPadding,
              border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
              borderRadius: 8,
              background: dark ? "#0F172A" : "#F9FAFB",
              color: dark ? "#F1F5F9" : "#1E293B",
              fontSize: selectFontSize,
              cursor: "pointer",
              width: isMobile ? "100%" : "auto",
              fontFamily: "inherit",
              minHeight: isMobile ? MOBILE_TAP : undefined,
              WebkitAppearance: "none",
              appearance: "none",
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
              boxSizing: "border-box",
            }}
          >
            <option value="pending">En attente</option>
            <option value="approved">Approuvées</option>
            <option value="rejected">Rejetées</option>
            <option value="all">Toutes</option>
          </select>

          <div
            style={{
              display: "flex",
              gap: sortButtonsGap,
              flexDirection: sortButtonsFlexDirection,
              width: isMobile ? "100%" : "auto",
            }}
          >
            <SortButton
              label="Date"
              field="date"
              currentSort={sortBy}
              currentOrder={sortOrder}
              onClick={toggleSort}
              isMobile={isMobile}
              dark={dark}
              pressedBtn={pressedBtn}
              pressBtn={pressBtn}
              releaseBtn={releaseBtn}
            />
            <SortButton
              label="Parent"
              field="parent"
              currentSort={sortBy}
              currentOrder={sortOrder}
              onClick={toggleSort}
              isMobile={isMobile}
              dark={dark}
              pressedBtn={pressedBtn}
              pressBtn={pressBtn}
              releaseBtn={releaseBtn}
            />
            <SortButton
              label="Élève"
              field="eleve"
              currentSort={sortBy}
              currentOrder={sortOrder}
              onClick={toggleSort}
              isMobile={isMobile}
              dark={dark}
              pressedBtn={pressedBtn}
              pressBtn={pressBtn}
              releaseBtn={releaseBtn}
            />
          </div>
        </div>

        {/* ═══ Bulk actions ═══ */}
        {statusFilter === "pending" && paginated.length > 0 && (
          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 16,
              flexDirection: bulkActionsFlexDirection,
              width: isMobile ? "100%" : "auto",
            }}
          >
            <button
              type="button"
              onClick={handleApproveAll}
              disabled={bulkProcessing}
              onTouchStart={pressBtn("approveAll")}
              onTouchEnd={releaseBtn}
              onTouchCancel={releaseBtn}
              style={btnStyle("approveAll", {
                padding: isMobile ? "12px 16px" : "8px 16px",
                background: bulkProcessing ? "#94A3B8" : "#10B981",
                color: "white",
                borderRadius: 8,
                cursor: bulkProcessing ? "not-allowed" : "pointer",
                fontSize: actionButtonFontSize,
                width: isMobile ? "100%" : "auto",
              })}
            >
              {bulkProcessing ? (
                <Loader size={18} className="plr-spin" aria-hidden="true" />
              ) : (
                <CheckSquare size={18} aria-hidden="true" />
              )}
              Tout approuver
            </button>
            <button
              type="button"
              onClick={handleRejectAll}
              disabled={bulkProcessing}
              onTouchStart={pressBtn("rejectAll")}
              onTouchEnd={releaseBtn}
              onTouchCancel={releaseBtn}
              style={btnStyle("rejectAll", {
                padding: isMobile ? "12px 16px" : "8px 16px",
                background: bulkProcessing ? "#94A3B8" : "#EF4444",
                color: "white",
                borderRadius: 8,
                cursor: bulkProcessing ? "not-allowed" : "pointer",
                fontSize: actionButtonFontSize,
                width: isMobile ? "100%" : "auto",
              })}
            >
              {bulkProcessing ? (
                <Loader size={18} className="plr-spin" aria-hidden="true" />
              ) : (
                <Square size={18} aria-hidden="true" />
              )}
              Tout rejeter
            </button>
          </div>
        )}

        {/* ═══ Liste ═══ */}
        <div style={{ display: "grid", gap: isMobile ? 8 : 12 }}>
          {paginated.map((req) => (
            <div
              key={req._id}
              style={{
                border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
                borderRadius: 12,
                padding: cardPadding,
                background: dark ? "#1E293B" : "#FFFFFF",
                display: "flex",
                flexDirection: cardFlexDirection,
                justifyContent: "space-between",
                alignItems: cardAlignItems,
                flexWrap: "wrap",
                gap: cardGap,
                boxSizing: "border-box",
              }}
            >
              <div style={cardColumnStyle}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 4,
                    flexWrap: "wrap",
                    minWidth: 0,
                  }}
                >
                  <User
                    size={16}
                    style={{
                      color: dark ? "#94A3B8" : "#64748B",
                      flexShrink: 0,
                    }}
                    aria-hidden="true"
                  />
                  <span style={nameStyle}>
                    {req.parent
                      ? `${req.parent.nom} ${req.parent.postnom || ""}`
                      : "Parent inconnu"}
                  </span>
                  {req.parent?.email && (
                    <span
                      style={{
                        fontSize: 12,
                        color: dark ? "#94A3B8" : "#64748B",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        maxWidth: isMobile ? "100%" : 220,
                      }}
                    >
                      <Mail size={12} aria-hidden="true" /> {req.parent.email}
                    </span>
                  )}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 4,
                    flexWrap: "wrap",
                    minWidth: 0,
                  }}
                >
                  <GraduationCap
                    size={16}
                    style={{
                      color: dark ? "#94A3B8" : "#64748B",
                      flexShrink: 0,
                    }}
                    aria-hidden="true"
                  />
                  <span style={nameStyle}>
                    {req.eleve
                      ? `${req.eleve.nom} ${req.eleve.postnom || ""}`
                      : "Élève inconnu"}
                    {req.eleve?.classe && ` (${req.eleve.classe})`}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Calendar
                    size={14}
                    style={{ color: dark ? "#94A3B8" : "#64748B" }}
                    aria-hidden="true"
                  />
                  <span
                    style={{
                      fontSize: 12,
                      color: dark ? "#94A3B8" : "#64748B",
                    }}
                  >
                    {new Date(req.createdAt).toLocaleDateString("fr-FR")}
                  </span>
                </div>
              </div>

              {/* ═══ Actions ═══ */}
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexShrink: 0,
                  flexDirection: isMobile ? "column" : "row",
                  width: isMobile ? "100%" : "auto",
                }}
              >
                {req.status === "pending" && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleApprove(req._id)}
                      disabled={processingIds.has(req._id)}
                      onTouchStart={pressBtn(`approve-${req._id}`)}
                      onTouchEnd={releaseBtn}
                      onTouchCancel={releaseBtn}
                      style={btnStyle(`approve-${req._id}`, {
                        padding: actionButtonPadding,
                        background: processingIds.has(req._id)
                          ? "#94A3B8"
                          : "#10B981",
                        color: "white",
                        borderRadius: 8,
                        cursor: processingIds.has(req._id)
                          ? "not-allowed"
                          : "pointer",
                        fontSize: actionButtonFontSize,
                        width: isMobile ? "100%" : "auto",
                      })}
                    >
                      {processingIds.has(req._id) ? (
                        <Loader
                          size={16}
                          className="plr-spin"
                          aria-hidden="true"
                        />
                      ) : (
                        <CheckCircle2 size={18} aria-hidden="true" />
                      )}
                      Approuver
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReject(req._id)}
                      disabled={processingIds.has(req._id)}
                      onTouchStart={pressBtn(`reject-${req._id}`)}
                      onTouchEnd={releaseBtn}
                      onTouchCancel={releaseBtn}
                      style={btnStyle(`reject-${req._id}`, {
                        padding: actionButtonPadding,
                        background: processingIds.has(req._id)
                          ? "#94A3B8"
                          : "#EF4444",
                        color: "white",
                        borderRadius: 8,
                        cursor: processingIds.has(req._id)
                          ? "not-allowed"
                          : "pointer",
                        fontSize: actionButtonFontSize,
                        width: isMobile ? "100%" : "auto",
                      })}
                    >
                      {processingIds.has(req._id) ? (
                        <Loader
                          size={16}
                          className="plr-spin"
                          aria-hidden="true"
                        />
                      ) : (
                        <XCircle size={18} aria-hidden="true" />
                      )}
                      Rejeter
                    </button>
                  </>
                )}
                {req.status === "approved" && (
                  <span
                    style={{
                      color: "#10B981",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontWeight: 500,
                      fontSize: actionButtonFontSize,
                    }}
                  >
                    <CheckCircle2 size={16} aria-hidden="true" /> Approuvée
                  </span>
                )}
                {req.status === "rejected" && (
                  <span
                    style={{
                      color: "#EF4444",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontWeight: 500,
                      fontSize: actionButtonFontSize,
                    }}
                  >
                    <XCircle size={16} aria-hidden="true" /> Rejetée
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* ═══ Empty state ═══ */}
        {paginated.length === 0 && !enrichmentLoading && (
          <div
            style={{
              textAlign: "center",
              padding: "40px 20px",
              color: dark ? "#94A3B8" : "#64748B",
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: dark ? "#1E293B" : "#F1F5F9",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
              aria-hidden="true"
            >
              <User size={28} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>
              Aucune demande
            </p>
            <p style={{ fontSize: 13 }}>
              {searchTerm
                ? "Aucun résultat pour votre recherche."
                : "Rien à afficher pour ce filtre."}
            </p>
          </div>
        )}

        {/* ═══ Pagination ═══ */}
        {totalPages > 1 && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 8,
              marginTop: 16,
            }}
          >
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safeCurrentPage === 1}
              aria-label="Page précédente"
              style={{
                padding: paginationButtonPadding,
                border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
                borderRadius: 6,
                background: "transparent",
                cursor: safeCurrentPage === 1 ? "not-allowed" : "pointer",
                color: dark ? "#F1F5F9" : "#1E293B",
                fontSize: paginationFontSize,
                minWidth: MOBILE_TAP,
                minHeight: MOBILE_TAP,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation",
              }}
            >
              <ChevronLeft size={16} />
            </button>
            <span
              style={{
                fontSize: paginationFontSize,
                color: dark ? "#94A3B8" : "#64748B",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              Page {safeCurrentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() =>
                setCurrentPage((p) => Math.min(totalPages, p + 1))
              }
              disabled={safeCurrentPage === totalPages}
              aria-label="Page suivante"
              style={{
                padding: paginationButtonPadding,
                border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
                borderRadius: 6,
                background: "transparent",
                cursor:
                  safeCurrentPage === totalPages
                    ? "not-allowed"
                    : "pointer",
                color: dark ? "#F1F5F9" : "#1E293B",
                fontSize: paginationFontSize,
                minWidth: MOBILE_TAP,
                minHeight: MOBILE_TAP,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation",
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        <ConfirmDialog {...dialogProps} />
      </div>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════
// SORT BUTTON
// ════════════════════════════════════════════════════════════════════
function SortButton({
  label,
  field,
  currentSort,
  currentOrder,
  onClick,
  isMobile,
  dark,
  pressedBtn,
  pressBtn,
  releaseBtn,
}) {
  const isActive = currentSort === field;
  const isPressed = pressedBtn === `sort-${field}`;
  const IconComponent = !isActive
    ? ArrowUpDown
    : currentOrder === "asc"
    ? ChevronUp
    : ChevronDown;

  return (
    <button
      type="button"
      onClick={() => onClick(field)}
      onTouchStart={pressBtn(`sort-${field}`)}
      onTouchEnd={releaseBtn}
      onTouchCancel={releaseBtn}
      aria-pressed={isActive}
      aria-label={`Trier par ${label}`}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        padding: isMobile ? "10px 12px" : "8px 12px",
        border: `1px solid ${
          isActive ? "#4F46E5" : dark ? "#334155" : "#E2E8F0"
        }`,
        borderRadius: 8,
        background: isActive
          ? dark
            ? "rgba(79,70,229,0.15)"
            : "#EEF2FF"
          : "transparent",
        color: isActive
          ? dark
            ? "#A5B4FC"
            : "#4F46E5"
          : dark
          ? "#94A3B8"
          : "#64748B",
        fontWeight: isActive ? 600 : 400,
        cursor: "pointer",
        fontSize: isMobile ? 14 : 13,
        flex: isMobile ? 1 : "none",
        fontFamily: "inherit",
        // ✨ Feedback tap
        transform: isPressed ? "scale(0.96)" : "scale(1)",
        transition: "transform 0.1s ease, background 0.12s ease",
        // ✨ Mobile
        minHeight: isMobile ? MOBILE_TAP : undefined,
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation",
        boxSizing: "border-box",
      }}
    >
      {label}
      <IconComponent
        size={14}
        style={isActive ? undefined : { opacity: 0.5 }}
        aria-hidden="true"
      />
    </button>
  );
}