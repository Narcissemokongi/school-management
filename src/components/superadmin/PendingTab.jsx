// src/components/PendingTab.jsx
import { useState, useMemo, useCallback, useDeferredValue, useEffect } from "react";
import { useMutation } from "convex/react";
import {
  UserCheck, UserX, Loader, Search, CheckSquare, Square,
  ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Inbox,
} from "lucide-react";
import { PendingUserCard } from "./PendingUserCard";
import { ConfirmDialog } from "../ConfirmDialog";
import { useConfirm } from "@/hooks/useConfirm";
import { useTokens } from "@/theme/tokens";
import { useIsMobile } from "@/hooks/useIsMobile";
import { Button, IconButton } from "@/components/ui";
import { runInBatches } from "@/utils/runInBatches";  // ✅ Import au lieu de dupliquer
import { api } from "@convex/_generated/api";
import toast from "react-hot-toast";

const PAGE_SIZE = 5;

// ════════════════════════════════════════════════════════════════════
// KEYFRAMES (module-level, préfixés `pt-*`)
// ════════════════════════════════════════════════════════════════════
const PendingTabKeyframes = (
  <style>{`
    @keyframes pt-spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
    @keyframes pt-fade-in {
      from { opacity: 0; transform: translateY(10px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .pt-spin { animation: pt-spin 1s linear infinite; }
    .pt-fade-in { animation: pt-fade-in 0.3s ease; }
    @media (prefers-reduced-motion: reduce) {
      .pt-spin, .pt-fade-in { animation: none !important; }
    }
  `}</style>
);

// ════════════════════════════════════════════════════════════════════
// Sous-composants (extraits et plus lisibles)
// ════════════════════════════════════════════════════════════════════

function SearchInput({ value, onChange }) {
  const t = useTokens();
  const isMobile = useIsMobile();

  return (
    <div
      style={{
        position: "relative",
        flex: 1,
        minWidth: isMobile ? "100%" : 200,
      }}
    >
      <Search
        size={18}
        style={{
          position: "absolute",
          left: 10,
          top: "50%",
          transform: "translateY(-50%)",
          color: t.text.muted,
          pointerEvents: "none",
        }}
        aria-hidden="true"
      />
      <input
        type="search"
        placeholder="Rechercher par nom ou login…"
        value={value}
        onChange={onChange}
        style={{
          width: "100%",
          padding: isMobile ? "12px 14px 12px 36px" : "10px 12px 10px 34px",
          borderRadius: t.radius.sm,
          border: `1px solid ${t.border.default}`,
          background: t.surface.default,
          color: t.text.primary,
          fontSize: isMobile ? 16 : 14,
          fontFamily: t.font.family,
          outline: "none",
          boxSizing: "border-box",
        }}
        aria-label="Rechercher par nom ou login"
      />
    </div>
  );
}

function SortButton({ label, field, currentSort, currentOrder, onClick }) {
  const t = useTokens();
  const isMobile = useIsMobile();
  const isActive = currentSort === field;

  const Icon = isActive
    ? currentOrder === "asc"
      ? ArrowUp
      : ArrowDown
    : ArrowUpDown;

  return (
    <button
      type="button"
      onClick={() => onClick(field)}
      aria-label={`Trier par ${label}`}
      aria-pressed={isActive}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        padding: isMobile ? "8px 10px" : "6px 10px",
        border: `1px solid ${t.border.default}`,
        borderRadius: t.radius.sm,
        background: isActive ? t.accent.primarySoft : "transparent",
        color: isActive ? t.accent.primary : t.text.muted,
        cursor: "pointer",
        fontSize: 13,
        fontWeight: isActive ? 600 : 400,
        fontFamily: t.font.family,
        flex: isMobile ? 1 : "none",
        outline: "none",
      }}
    >
      {label}
      <Icon size={14} />
    </button>
  );
}

function Pagination({ currentPage, totalPages, onPageChange }) {
  const t = useTokens();
  const isMobile = useIsMobile();

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: 8,
        marginTop: 16,
      }}
    >
      <IconButton
        icon={<ChevronLeft size={16} />}
        label="Page précédente"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        variant="outline"
        size={isMobile ? "lg" : "md"}
      />
      <span
        style={{
          fontSize: isMobile ? 14 : 13,
          color: t.text.muted,
          fontVariantNumeric: "tabular-nums",
          minWidth: 80,
          textAlign: "center",
        }}
      >
        {currentPage} / {totalPages}
      </span>
      <IconButton
        icon={<ChevronRight size={16} />}
        label="Page suivante"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        variant="outline"
        size={isMobile ? "lg" : "md"}
      />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ════════════════════════════════════════════════════════════════════
export function PendingTab({
  pendingUsers,
  user,
  searchTerm: searchTermProp,
  setSearchTerm: setSearchTermProp,
  filterRole: filterRoleProp,
  setFilterRole: setFilterRoleProp,
}) {
  const t = useTokens();
  const isMobile = useIsMobile();
  const { confirm, dialogProps } = useConfirm();

  const userId = user?._id;

  const approveUser = useMutation(api.users.approveUser);
  const rejectUser = useMutation(api.users.rejectUser);

  // Filtres : props si fournies, sinon fallback local
  const [localSearchTerm, setLocalSearchTerm] = useState("");
  const [localFilterRole, setLocalFilterRole] = useState("all");
  const searchTerm = searchTermProp ?? localSearchTerm;
  const setSearchTerm = setSearchTermProp ?? setLocalSearchTerm;
  const filterRole = filterRoleProp ?? localFilterRole;
  const setFilterRole = setFilterRoleProp ?? setLocalFilterRole;

  const [sortBy, setSortBy] = useState("nom");
  const [sortOrder, setSortOrder] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);

  const deferredSearchTerm = useDeferredValue(searchTerm);

  // ────────────────────────────────────────────────────────────
  // Filtrage + tri
  // ────────────────────────────────────────────────────────────
  const filteredUsers = useMemo(() => {
    let result = pendingUsers ?? [];

    if (deferredSearchTerm.trim()) {
      const q = deferredSearchTerm.toLowerCase();
      result = result.filter(
        (u) =>
          (u.nom ?? "").toLowerCase().includes(q) ||
          (u.login ?? "").toLowerCase().includes(q)
      );
    }
    if (filterRole !== "all") {
      result = result.filter((u) => u.role === filterRole);
    }

    return [...result].sort((a, b) => {
      if (sortBy === "nom") {
        const an = a.nom ?? "";
        const bn = b.nom ?? "";
        return sortOrder === "asc" ? an.localeCompare(bn) : bn.localeCompare(an);
      }
      if (sortBy === "role") {
        const ar = a.role ?? "";
        const br = b.role ?? "";
        return sortOrder === "asc" ? ar.localeCompare(br) : br.localeCompare(ar);
      }
      if (sortBy === "date") {
        const aTime = a._creationTime || 0;
        const bTime = b._creationTime || 0;
        return sortOrder === "asc" ? aTime - bTime : bTime - aTime;
      }
      return 0;
    });
  }, [pendingUsers, deferredSearchTerm, filterRole, sortBy, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedUsers = useMemo(
    () =>
      filteredUsers.slice(
        (safeCurrentPage - 1) * PAGE_SIZE,
        safeCurrentPage * PAGE_SIZE
      ),
    [filteredUsers, safeCurrentPage]
  );

  const rolesDisponibles = useMemo(() => {
    const roles = new Set(
      (pendingUsers ?? []).map((u) => u.role).filter(Boolean)
    );
    return Array.from(roles).sort();
  }, [pendingUsers]);

  // Reset page + sélection quand filtres changent
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [deferredSearchTerm, filterRole]);

  // ────────────────────────────────────────────────────────────
  // Handlers unitaires
  // ────────────────────────────────────────────────────────────
  const handleApprove = useCallback(
    async (targetUserId) => {
      if (!userId) {
        toast.error("Session invalide.");
        return;
      }
      try {
        await approveUser({ userId: targetUserId, adminId: userId });
        toast.success("Utilisateur approuvé");
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(targetUserId);
          return next;
        });
      } catch (err) {
        toast.error(
          "Impossible d'approuver : " + (err?.message || "erreur inconnue")
        );
      }
    },
    [userId, approveUser]
  );

  const handleReject = useCallback(
    async (targetUserId, reason) => {
      if (!userId) {
        toast.error("Session invalide.");
        return;
      }
      try {
        await rejectUser({
          userId: targetUserId,
          reason: reason?.trim() || undefined,
          adminId: userId,
        });
        toast.success("Utilisateur rejeté");
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(targetUserId);
          return next;
        });
      } catch (err) {
        toast.error(
          "Impossible de rejeter : " + (err?.message || "erreur inconnue")
        );
      }
    },
    [userId, rejectUser]
  );

  // ────────────────────────────────────────────────────────────
  // Sélection
  // ────────────────────────────────────────────────────────────
  const allPageSelected = useMemo(
    () =>
      paginatedUsers.length > 0 &&
      paginatedUsers.every((u) => selectedIds.has(u._id)),
    [paginatedUsers, selectedIds]
  );

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        paginatedUsers.forEach((u) => next.delete(u._id));
      } else {
        paginatedUsers.forEach((u) => next.add(u._id));
      }
      return next;
    });
  }, [allPageSelected, paginatedUsers]);

  const toggleSelectOne = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // ────────────────────────────────────────────────────────────
  // Bulk actions
  // ────────────────────────────────────────────────────────────
  const bulkApprove = useCallback(async () => {
    if (!userId) {
      toast.error("Session invalide.");
      return;
    }
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    setBulkProcessing(true);
    try {
      const res = await runInBatches(
        ids,
        (id) => approveUser({ userId: id, adminId: userId }),
        5
      );

      if (res.success > 0)
        toast.success(`${res.success} utilisateur(s) approuvé(s)`);
      if (res.failed > 0) toast.error(`${res.failed} échec(s)`);
      setSelectedIds(new Set());
    } finally {
      setBulkProcessing(false);
    }
  }, [selectedIds, approveUser, userId]);

  const bulkReject = useCallback(async () => {
    if (!userId) {
      toast.error("Session invalide.");
      return;
    }
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    const ok = await confirm(
      "Rejeter les demandes sélectionnées",
      `Voulez-vous vraiment rejeter ${ids.length} demande(s) ? Cette action est irréversible.`
    );
    if (!ok) return;

    setBulkProcessing(true);
    try {
      const res = await runInBatches(
        ids,
        (id) =>
          rejectUser({
            userId: id,
            reason: "Rejet groupé",
            adminId: userId,
          }),
        5
      );

      if (res.success > 0)
        toast.success(`${res.success} utilisateur(s) rejeté(s)`);
      if (res.failed > 0) toast.error(`${res.failed} échec(s)`);
      setSelectedIds(new Set());
    } finally {
      setBulkProcessing(false);
    }
  }, [selectedIds, rejectUser, userId, confirm]);

  // ────────────────────────────────────────────────────────────
  // Tri
  // ────────────────────────────────────────────────────────────
  const handleSort = useCallback(
    (field) => {
      if (sortBy === field) {
        setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortBy(field);
        setSortOrder("asc");
      }
    },
    [sortBy]
  );

  // ────────────────────────────────────────────────────────────
  // ÉTAT VIDE
  // ────────────────────────────────────────────────────────────
  if ((pendingUsers ?? []).length === 0) {
    return (
      <>
        {PendingTabKeyframes}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
            padding: isMobile ? 32 : 48,
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: t.status.success.bg,
              color: t.status.success.fg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Inbox size={isMobile ? 28 : 32} />
          </div>
          <p
            style={{
              margin: 0,
              fontSize: isMobile ? 15 : 16,
              fontWeight: 600,
              color: t.text.primary,
            }}
          >
            Aucune demande en attente
          </p>
          <p style={{ margin: 0, fontSize: isMobile ? 13 : 14, color: t.text.muted }}>
            Toutes les demandes ont été traitées.
          </p>
        </div>
      </>
    );
  }

  // ────────────────────────────────────────────────────────────
  // RENDU
  // ────────────────────────────────────────────────────────────
  return (
    <div>
      {PendingTabKeyframes}

      {/* ═══ Barre d'outils ═══ */}
      <div
        style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          flexWrap: "wrap",
          gap: isMobile ? 8 : 12,
          marginBottom: 16,
          alignItems: isMobile ? "stretch" : "center",
        }}
      >
        <SearchInput
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          style={{
            padding: isMobile ? "12px 14px" : "8px 12px",
            borderRadius: t.radius.sm,
            border: `1px solid ${t.border.default}`,
            background: t.surface.default,
            color: t.text.primary,
            fontSize: isMobile ? 16 : 14,
            fontFamily: t.font.family,
            cursor: "pointer",
            width: isMobile ? "100%" : "auto",
            outline: "none",
          }}
          aria-label="Filtrer par rôle"
        >
          <option value="all">Tous les rôles</option>
          {rolesDisponibles.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>

        <div
          style={{
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            width: isMobile ? "100%" : "auto",
          }}
        >
          <SortButton
            label="Nom"
            field="nom"
            currentSort={sortBy}
            currentOrder={sortOrder}
            onClick={handleSort}
          />
          <SortButton
            label="Rôle"
            field="role"
            currentSort={sortBy}
            currentOrder={sortOrder}
            onClick={handleSort}
          />
          <SortButton
            label="Date"
            field="date"
            currentSort={sortBy}
            currentOrder={sortOrder}
            onClick={handleSort}
          />
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            marginLeft: isMobile ? "0" : "auto",
            flexDirection: isMobile ? "column" : "row",
            width: isMobile ? "100%" : "auto",
          }}
        >
          <Button
            variant="secondary"
            size="sm"
            icon={
              allPageSelected ? <CheckSquare size={14} /> : <Square size={14} />
            }
            onClick={toggleSelectAll}
            fullWidth={isMobile}
          >
            Tout
          </Button>

          {selectedIds.size > 0 && (
            <>
              <Button
                variant="success"
                size="sm"
                icon={
                  bulkProcessing ? (
                    <Loader size={14} className="pt-spin" />
                  ) : (
                    <UserCheck size={14} />
                  )
                }
                onClick={bulkApprove}
                disabled={bulkProcessing}
                fullWidth={isMobile}
              >
                Approuver ({selectedIds.size})
              </Button>
              <Button
                variant="danger"
                size="sm"
                icon={
                  bulkProcessing ? (
                    <Loader size={14} className="pt-spin" />
                  ) : (
                    <UserX size={14} />
                  )
                }
                onClick={bulkReject}
                disabled={bulkProcessing}
                fullWidth={isMobile}
              >
                Rejeter ({selectedIds.size})
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ═══ Résumé ═══ */}
      <div
        style={{
          marginBottom: 12,
          fontSize: 13,
          color: t.text.muted,
        }}
        aria-live="polite"
      >
        {filteredUsers.length} demande(s) affichée(s)
        {selectedIds.size > 0 && ` · ${selectedIds.size} sélectionnée(s)`}
      </div>

      {/* ═══ Liste ═══ */}
      {filteredUsers.length === 0 ? (
        <div
          style={{
            padding: 32,
            textAlign: "center",
            color: t.text.muted,
            fontSize: 14,
          }}
        >
          Aucune demande ne correspond aux critères.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {paginatedUsers.map((u) => (
            <div key={u._id} className="pt-fade-in">
              <PendingUserCard
                user={u}
                onApprove={() => handleApprove(u._id)}
                onReject={(reason) => handleReject(u._id, reason)}
                selected={selectedIds.has(u._id)}
                onToggleSelect={() => toggleSelectOne(u._id)}
                disabled={bulkProcessing}
              />
            </div>
          ))}
        </div>
      )}

      {/* ═══ Pagination ═══ */}
      {totalPages > 1 && (
        <Pagination
          currentPage={safeCurrentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}

      <ConfirmDialog {...dialogProps} />
    </div>
  );
}