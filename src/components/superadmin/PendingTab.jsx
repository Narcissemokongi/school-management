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
import toast from "react-hot-toast";
import { api } from "@convex/_generated/api";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";

// ════════════════════════════════════════════════════════════════════
// CONSTANTES MODULE-LEVEL
// ════════════════════════════════════════════════════════════════════
const PAGE_SIZE = 5;

// 🟢 Helper batch (5×5) pour éviter rate-limit
const runInBatches = async (items, fn, size = 5) => {
  for (let i = 0; i < items.length; i += size) {
    await Promise.all(items.slice(i, i + size).map(fn));
  }
};

// 🟢 Keyframes module-level (injectés UNE SEULE FOIS)
const PendingTabKeyframes = (
  <style>{`
    @keyframes pt-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .pt-spin { animation: pt-spin 1s linear infinite; }
    @keyframes pt-fade-in {
      from { opacity: 0; transform: translateY(10px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .pt-fade-in { animation: pt-fade-in 0.3s ease; }
    @media (prefers-reduced-motion: reduce) {
      .pt-spin, .pt-fade-in { animation: none !important; }
    }
  `}</style>
);

// ════════════════════════════════════════════════════════════════════
// SOUS-COMPOSANT : Barre de recherche
// ════════════════════════════════════════════════════════════════════
const SearchInput = ({ value, onChange, dark, isMobile }) => (
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
        color: dark ? "#94A3B8" : "#64748B",
      }}
    />
    <input
      type="text"
      placeholder="Rechercher par nom ou login..."
      value={value}
      onChange={onChange}
      style={{
        width: "100%",
        padding: isMobile ? "12px 14px 12px 36px" : "10px 12px 10px 34px",
        borderRadius: 8,
        border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
        background: dark ? "#1E293B" : "#FFFFFF",
        color: dark ? "#F1F5F9" : "#1E293B",
        fontSize: isMobile ? 16 : 14,
        outline: "none",
        boxSizing: "border-box",
      }}
      aria-label="Rechercher par nom ou login"
    />
  </div>
);

// ════════════════════════════════════════════════════════════════════
// SOUS-COMPOSANT : Bouton de tri
// ════════════════════════════════════════════════════════════════════
const SortButton = ({
  label,
  field,
  currentSort,
  currentOrder,
  onClick,
  dark,
  isMobile,
}) => {
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
        border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
        borderRadius: 6,
        background: isActive ? (dark ? "#1E293B" : "#EEF2FF") : "transparent",
        color: isActive
          ? dark
            ? "#A5B4FC"
            : "#4F46E5"
          : dark
          ? "#94A3B8"
          : "#64748B",
        cursor: "pointer",
        fontSize: 13,
        fontWeight: isActive ? 600 : 400,
        flex: isMobile ? 1 : "none",
      }}
    >
      {label}
      <Icon size={14} />
    </button>
  );
};

// ════════════════════════════════════════════════════════════════════
// SOUS-COMPOSANT : Pagination
// ════════════════════════════════════════════════════════════════════
const Pagination = ({ currentPage, totalPages, onPageChange, dark, isMobile }) => (
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
      onClick={() => onPageChange(Math.max(1, currentPage - 1))}
      disabled={currentPage === 1}
      aria-label="Page précédente"
      style={{
        padding: isMobile ? "8px 12px" : "6px 10px",
        border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
        borderRadius: 6,
        background: "transparent",
        color: currentPage === 1 ? "#94A3B8" : dark ? "#F1F5F9" : "#1E293B",
        cursor: currentPage === 1 ? "not-allowed" : "pointer",
      }}
    >
      <ChevronLeft size={16} />
    </button>
    <span
      style={{
        fontSize: isMobile ? 14 : 13,
        color: dark ? "#94A3B8" : "#64748B",
      }}
    >
      Page {currentPage} / {totalPages}
    </span>
    <button
      type="button"
      onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
      disabled={currentPage === totalPages}
      aria-label="Page suivante"
      style={{
        padding: isMobile ? "8px 12px" : "6px 10px",
        border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
        borderRadius: 6,
        background: "transparent",
        color:
          currentPage === totalPages ? "#94A3B8" : dark ? "#F1F5F9" : "#1E293B",
        cursor: currentPage === totalPages ? "not-allowed" : "pointer",
      }}
    >
      <ChevronRight size={16} />
    </button>
  </div>
);

// ════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ════════════════════════════════════════════════════════════════════
export function PendingTab({
  pendingUsers,
  user,
  // 🔴 FIX : accepte les props de filtres du parent (Zustand store)
  searchTerm: searchTermProp,
  setSearchTerm: setSearchTermProp,
  filterRole: filterRoleProp,
  setFilterRole: setFilterRoleProp,
}) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();
  const { confirm, dialogProps } = useConfirm();

  const userId = user?._id;

  const approveUser = useMutation(api.users.approveUser);
  const rejectUser = useMutation(api.users.rejectUser);

  // ✅ Filtres : props si fournies, sinon fallback état local
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

  // ════════════════════════════════════════════════════════════════
  // Filtrage + tri
  // ════════════════════════════════════════════════════════════════
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
        return sortOrder === "asc"
          ? an.localeCompare(bn)
          : bn.localeCompare(an);
      }
      if (sortBy === "role") {
        const ar = a.role ?? "";
        const br = b.role ?? "";
        return sortOrder === "asc"
          ? ar.localeCompare(br)
          : br.localeCompare(ar);
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
    const roles = new Set((pendingUsers ?? []).map((u) => u.role).filter(Boolean));
    return Array.from(roles).sort();
  }, [pendingUsers]);

  // ✅ FIX — reset page ET sélection quand filtres/recherche changent
  // Sinon, des items cachés restent sélectionnés → bulk actions invisibles.
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [deferredSearchTerm, filterRole]);

  // ════════════════════════════════════════════════════════════════
  // Handlers unitaires
  // ════════════════════════════════════════════════════════════════
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

  // ════════════════════════════════════════════════════════════════
  // Sélection
  // ════════════════════════════════════════════════════════════════
  const allPageSelected = useMemo(
    () =>
      paginatedUsers.length > 0 &&
      paginatedUsers.every((u) => selectedIds.has(u._id)),
    [paginatedUsers, selectedIds]
  );

  // ✅ FIX — toggle page-par-page : n'affecte QUE les items de la page courante
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

  // ════════════════════════════════════════════════════════════════
  // Bulk : approve
  // ════════════════════════════════════════════════════════════════
  const bulkApprove = useCallback(async () => {
    if (!userId) {
      toast.error("Session invalide.");
      return;
    }
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    setBulkProcessing(true);
    let success = 0;
    let failed = 0;

    try {
      await runInBatches(ids, async (id) => {
        try {
          await approveUser({ userId: id, adminId: userId });
          success++;
        } catch {
          failed++;
        }
      });

      if (success > 0) toast.success(`${success} utilisateur(s) approuvé(s)`);
      if (failed > 0) toast.error(`${failed} échec(s)`);
      setSelectedIds(new Set());
    } finally {
      setBulkProcessing(false);
    }
  }, [selectedIds, approveUser, userId]);

  // ════════════════════════════════════════════════════════════════
  // Bulk : reject
  // ════════════════════════════════════════════════════════════════
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
    let success = 0;
    let failed = 0;

    try {
      await runInBatches(ids, async (id) => {
        try {
          await rejectUser({
            userId: id,
            reason: "Rejet groupé",
            adminId: userId,
          });
          success++;
        } catch {
          failed++;
        }
      });

      if (success > 0) toast.success(`${success} utilisateur(s) rejeté(s)`);
      if (failed > 0) toast.error(`${failed} échec(s)`);
      setSelectedIds(new Set());
    } finally {
      setBulkProcessing(false);
    }
  }, [selectedIds, rejectUser, userId, confirm]);

  // ════════════════════════════════════════════════════════════════
  // Tri
  // ════════════════════════════════════════════════════════════════
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

  // ════════════════════════════════════════════════════════════════
  // ÉTAT VIDE (avant tout retour conditionnel — les hooks sont passés)
  // ════════════════════════════════════════════════════════════════
  if ((pendingUsers ?? []).length === 0) {
    return (
      <>
        {PendingTabKeyframes}
        <div
          style={{
            textAlign: "center",
            padding: isMobile ? 32 : 48,
            color: dark ? "#94A3B8" : "#64748B",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
          }}
        >
          <Inbox size={isMobile ? 40 : 48} color="#10B981" />
          <p style={{ fontSize: isMobile ? 15 : 16, margin: 0 }}>
            Aucune demande en attente
          </p>
          <p style={{ fontSize: isMobile ? 13 : 14, margin: 0 }}>
            Toutes les demandes ont été traitées.
          </p>
        </div>
      </>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // RENDU
  // ════════════════════════════════════════════════════════════════
  return (
    <div>
      {PendingTabKeyframes}

      {/* Barre d'outils */}
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
          dark={dark}
          isMobile={isMobile}
        />

        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          style={{
            padding: isMobile ? "12px 14px" : "8px 12px",
            borderRadius: 8,
            border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
            background: dark ? "#1E293B" : "#FFFFFF",
            color: dark ? "#F1F5F9" : "#1E293B",
            fontSize: isMobile ? 16 : 14,
            cursor: "pointer",
            width: isMobile ? "100%" : "auto",
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
            dark={dark}
            isMobile={isMobile}
          />
          <SortButton
            label="Rôle"
            field="role"
            currentSort={sortBy}
            currentOrder={sortOrder}
            onClick={handleSort}
            dark={dark}
            isMobile={isMobile}
          />
          <SortButton
            label="Date"
            field="date"
            currentSort={sortBy}
            currentOrder={sortOrder}
            onClick={handleSort}
            dark={dark}
            isMobile={isMobile}
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
          <button
            type="button"
            onClick={toggleSelectAll}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: isMobile ? "10px 12px" : "6px 10px",
              border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
              borderRadius: 6,
              background: "transparent",
              color: dark ? "#F1F5F9" : "#1E293B",
              cursor: "pointer",
              fontSize: isMobile ? 14 : 13,
              width: isMobile ? "100%" : "auto",
            }}
            aria-label={allPageSelected ? "Tout désélectionner" : "Tout sélectionner"}
          >
            {allPageSelected ? (
              <CheckSquare size={16} />
            ) : (
              <Square size={16} />
            )}
            Tout
          </button>

          {selectedIds.size > 0 && (
            <>
              <button
                type="button"
                onClick={bulkApprove}
                disabled={bulkProcessing}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  padding: isMobile ? "10px 12px" : "6px 12px",
                  background: "#10B981",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  cursor: bulkProcessing ? "not-allowed" : "pointer",
                  fontSize: isMobile ? 14 : 13,
                  width: isMobile ? "100%" : "auto",
                  opacity: bulkProcessing ? 0.7 : 1,
                }}
              >
                {bulkProcessing ? (
                  <Loader size={14} className="pt-spin" />
                ) : (
                  <UserCheck size={14} />
                )}
                Approuver ({selectedIds.size})
              </button>
              <button
                type="button"
                onClick={bulkReject}
                disabled={bulkProcessing}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  padding: isMobile ? "10px 12px" : "6px 12px",
                  background: "#EF4444",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  cursor: bulkProcessing ? "not-allowed" : "pointer",
                  fontSize: isMobile ? 14 : 13,
                  width: isMobile ? "100%" : "auto",
                  opacity: bulkProcessing ? 0.7 : 1,
                }}
              >
                {bulkProcessing ? (
                  <Loader size={14} className="pt-spin" />
                ) : (
                  <UserX size={14} />
                )}
                Rejeter ({selectedIds.size})
              </button>
            </>
          )}
        </div>
      </div>

      {/* Résumé */}
      <div
        style={{
          marginBottom: 12,
          fontSize: 13,
          color: dark ? "#94A3B8" : "#64748B",
        }}
      >
        {filteredUsers.length} demande(s) affichée(s)
        {selectedIds.size > 0 && ` · ${selectedIds.size} sélectionnée(s)`}
      </div>

      {/* Liste */}
      {filteredUsers.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: 24,
            color: dark ? "#94A3B8" : "#64748B",
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

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          currentPage={safeCurrentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          dark={dark}
          isMobile={isMobile}
        />
      )}

      <ConfirmDialog {...dialogProps} />
    </div>
  );
}