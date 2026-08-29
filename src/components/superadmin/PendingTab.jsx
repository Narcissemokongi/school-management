import { useState, useMemo, useCallback, useDeferredValue } from "react";
import { useMutation } from "convex/react";
import {
  UserCheck, UserX, CheckCircle, X, Loader, Search, CheckSquare, Square,
  Filter, ChevronLeft, ChevronRight, UserPlus, UserMinus,
  ArrowUpDown, ArrowUp, ArrowDown, Eye, AlertTriangle, Inbox,
} from "lucide-react";
import { PendingUserCard } from "./PendingUserCard";
import { ConfirmDialog } from "../ConfirmDialog";
import { useConfirm } from "../../hooks/useConfirm";
import toast from "react-hot-toast";
import { api } from "../../../convex/_generated/api";
import { useStyles } from "../../styles/theme";

// Sous-composant : Barre de recherche
const SearchInput = ({ value, onChange, dark }) => (
  <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
    <Search size={18} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: dark ? "#94A3B8" : "#64748B" }} />
    <input
      type="search"
      placeholder="Rechercher par nom ou login..."
      value={value}
      onChange={onChange}
      style={{
        width: "100%",
        padding: "10px 12px 10px 34px",
        borderRadius: 8,
        border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
        background: dark ? "#1E293B" : "#FFFFFF",
        color: dark ? "#F1F5F9" : "#1E293B",
        fontSize: 14,
        outline: "none",
      }}
    />
  </div>
);

// Sous-composant : Bouton de tri
const SortButton = ({ label, field, currentSort, currentOrder, onClick, dark }) => {
  const isActive = currentSort === field;
  const Icon = isActive ? (currentOrder === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <button
      onClick={() => onClick(field)}
      aria-label={`Trier par ${label}`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: "6px 10px",
        border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
        borderRadius: 6,
        background: isActive ? (dark ? "#1E293B" : "#EEF2FF") : "transparent",
        color: isActive ? (dark ? "#A5B4FC" : "#4F46E5") : dark ? "#94A3B8" : "#64748B",
        cursor: "pointer",
        fontSize: 13,
        fontWeight: isActive ? 600 : 400,
      }}
    >
      {label}
      <Icon size={14} />
    </button>
  );
};

// Sous-composant : Pagination
const Pagination = ({ currentPage, totalPages, onPageChange, dark }) => (
  <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 16 }}>
    <button
      onClick={() => onPageChange(Math.max(1, currentPage - 1))}
      disabled={currentPage === 1}
      aria-label="Page précédente"
      style={{
        padding: "6px 10px",
        border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
        borderRadius: 6,
        background: "transparent",
        color: currentPage === 1 ? "#94A3B8" : dark ? "#F1F5F9" : "#1E293B",
        cursor: currentPage === 1 ? "not-allowed" : "pointer",
      }}
    >
      <ChevronLeft size={16} />
    </button>
    <span style={{ fontSize: 13, color: dark ? "#94A3B8" : "#64748B" }}>
      Page {currentPage} / {totalPages}
    </span>
    <button
      onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
      disabled={currentPage === totalPages}
      aria-label="Page suivante"
      style={{
        padding: "6px 10px",
        border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
        borderRadius: 6,
        background: "transparent",
        color: currentPage === totalPages ? "#94A3B8" : dark ? "#F1F5F9" : "#1E293B",
        cursor: currentPage === totalPages ? "not-allowed" : "pointer",
      }}
    >
      <ChevronRight size={16} />
    </button>
  </div>
);

export function PendingTab({ pendingUsers, user }) {
  const { dark } = useStyles();
  const { confirm, dialogProps } = useConfirm();

  const approveUser = useMutation(api.users.approveUser);
  const rejectUser = useMutation(api.users.rejectUser);

  // États
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [sortBy, setSortBy] = useState("nom");
  const [sortOrder, setSortOrder] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [approvingIds, setApprovingIds] = useState(new Set());
  const [rejectingIds, setRejectingIds] = useState(new Set());

  // Recherche différée
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const pageSize = 5;

  // Filtrage et tri
  const filteredUsers = useMemo(() => {
    let result = pendingUsers;

    if (deferredSearchTerm.trim()) {
      const q = deferredSearchTerm.toLowerCase();
      result = result.filter(
        (u) => u.nom.toLowerCase().includes(q) || u.login.toLowerCase().includes(q)
      );
    }
    if (filterRole !== "all") {
      result = result.filter((u) => u.role === filterRole);
    }

    // Tri
    const sorted = [...result].sort((a, b) => {
      if (sortBy === "nom") {
        return sortOrder === "asc" ? a.nom.localeCompare(b.nom) : b.nom.localeCompare(a.nom);
      } else if (sortBy === "role") {
        return sortOrder === "asc" ? a.role.localeCompare(b.role) : b.role.localeCompare(a.role);
      } else if (sortBy === "date") {
        const aTime = a._creationTime || 0;
        const bTime = b._creationTime || 0;
        return sortOrder === "asc" ? aTime - bTime : bTime - aTime;
      }
      return 0;
    });

    return sorted;
  }, [pendingUsers, deferredSearchTerm, filterRole, sortBy, sortOrder]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedUsers = filteredUsers.slice(
    (safeCurrentPage - 1) * pageSize,
    safeCurrentPage * pageSize
  );

  // Rôles disponibles
  const rolesDisponibles = useMemo(() => {
    const roles = new Set(pendingUsers.map((u) => u.role));
    return Array.from(roles).sort();
  }, [pendingUsers]);

  // Handlers individuels
  const handleApprove = useCallback(async (userId) => {
    setApprovingIds((prev) => new Set(prev).add(userId));
    try {
      await approveUser({ userId, adminId: user._id });
      toast.success("Utilisateur approuvé");
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setApprovingIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  }, [approveUser, user._id]);

  const handleReject = useCallback(async (userId, reason) => {
    setRejectingIds((prev) => new Set(prev).add(userId));
    try {
      await rejectUser({
        userId,
        reason: reason?.trim() || undefined,
        adminId: user._id,
      });
      toast.success("Utilisateur rejeté");
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setRejectingIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  }, [rejectUser, user._id]);

  // Actions groupées
  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === paginatedUsers.length && paginatedUsers.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedUsers.map((u) => u._id)));
    }
  }, [selectedIds, paginatedUsers]);

  const toggleSelectOne = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const bulkApprove = useCallback(async () => {
    setBulkProcessing(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) => approveUser({ userId: id, adminId: user._id }))
      );
      toast.success(`${selectedIds.size} utilisateur(s) approuvé(s)`);
      setSelectedIds(new Set());
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBulkProcessing(false);
    }
  }, [selectedIds, approveUser, user._id]);

  const bulkReject = useCallback(async () => {
    const ok = await confirm(
      "Rejeter les demandes sélectionnées",
      `Voulez-vous vraiment rejeter ${selectedIds.size} demande(s) ? Cette action est irréversible.`
    );
    if (!ok) return;
    setBulkProcessing(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          rejectUser({ userId: id, reason: "Rejet groupé", adminId: user._id })
        )
      );
      toast.success(`${selectedIds.size} utilisateur(s) rejeté(s)`);
      setSelectedIds(new Set());
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBulkProcessing(false);
    }
  }, [selectedIds, rejectUser, user._id, confirm]);

  // Changement de tri
  const handleSort = useCallback((field) => {
    setSortBy((prevField) => {
      if (prevField === field) {
        setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortOrder("asc");
      }
      return field;
    });
  }, []);

  // Reset page quand filtres changent
  const resetPage = useCallback(() => setCurrentPage(1), []);

  if (pendingUsers.length === 0) {
    return (
      <div style={{
        textAlign: "center",
        padding: 48,
        color: dark ? "#94A3B8" : "#64748B",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
      }}>
        <Inbox size={48} color="#10B981" />
        <p style={{ fontSize: 16 }}>Aucune demande en attente</p>
        <p style={{ fontSize: 14 }}>Toutes les demandes ont été traitées.</p>
      </div>
    );
  }

  return (
    <div>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in { animation: fadeIn 0.3s ease; }
      `}</style>

      {/* Barre d'outils */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 16, alignItems: "center" }}>
        <SearchInput
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); resetPage(); }}
          dark={dark}
        />

        <select
          value={filterRole}
          onChange={(e) => { setFilterRole(e.target.value); resetPage(); }}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
            background: dark ? "#1E293B" : "#FFFFFF",
            color: dark ? "#F1F5F9" : "#1E293B",
            fontSize: 14,
            cursor: "pointer",
          }}
          aria-label="Filtrer par rôle"
        >
          <option value="all">Tous les rôles</option>
          {rolesDisponibles.map((role) => (
            <option key={role} value={role}>{role}</option>
          ))}
        </select>

        {/* Tri */}
        <div style={{ display: "flex", gap: 6 }}>
          <SortButton label="Nom" field="nom" currentSort={sortBy} currentOrder={sortOrder} onClick={handleSort} dark={dark} />
          <SortButton label="Rôle" field="role" currentSort={sortBy} currentOrder={sortOrder} onClick={handleSort} dark={dark} />
          <SortButton label="Date" field="date" currentSort={sortBy} currentOrder={sortOrder} onClick={handleSort} dark={dark} />
        </div>

        {/* Sélection multiple */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginLeft: "auto" }}>
          <button
            onClick={toggleSelectAll}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 10px",
              border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
              borderRadius: 6,
              background: "transparent",
              color: dark ? "#F1F5F9" : "#1E293B",
              cursor: "pointer",
              fontSize: 13,
            }}
            aria-label="Tout sélectionner"
          >
            {selectedIds.size === paginatedUsers.length && paginatedUsers.length > 0 ? (
              <CheckSquare size={16} />
            ) : (
              <Square size={16} />
            )}
            Tout
          </button>

          {selectedIds.size > 0 && (
            <>
              <button
                onClick={bulkApprove}
                disabled={bulkProcessing}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 12px",
                  background: "#10B981",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  cursor: bulkProcessing ? "not-allowed" : "pointer",
                  fontSize: 13,
                }}
              >
                {bulkProcessing ? <Loader size={14} className="animate-spin" /> : <UserCheck size={14} />}
                Approuver ({selectedIds.size})
              </button>
              <button
                onClick={bulkReject}
                disabled={bulkProcessing}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 12px",
                  background: "#EF4444",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  cursor: bulkProcessing ? "not-allowed" : "pointer",
                  fontSize: 13,
                }}
              >
                {bulkProcessing ? <Loader size={14} className="animate-spin" /> : <UserX size={14} />}
                Rejeter ({selectedIds.size})
              </button>
            </>
          )}
        </div>
      </div>

      {/* Résumé */}
      <div style={{ marginBottom: 12, fontSize: 13, color: dark ? "#94A3B8" : "#64748B" }}>
        {filteredUsers.length} demande(s) affichée(s)
      </div>

      {/* Liste des demandes */}
      {filteredUsers.length === 0 ? (
        <div style={{ textAlign: "center", padding: 24, color: dark ? "#94A3B8" : "#64748B" }}>
          Aucune demande ne correspond aux critères.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {paginatedUsers.map((u) => (
            <div key={u._id} className="fade-in" style={{ position: "relative" }}>
              <div style={{ position: "absolute", left: -8, top: 50, zIndex: 1 }}>
                <input
                  type="checkbox"
                  checked={selectedIds.has(u._id)}
                  onChange={() => toggleSelectOne(u._id)}
                  aria-label={`Sélectionner ${u.nom}`}
                  style={{ width: 16, height: 16, cursor: "pointer", accentColor: dark ? "#818CF8" : "#4F46E5" }}
                />
              </div>
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
        />
      )}

      {/* Dialog de confirmation pour rejet groupé */}
      <ConfirmDialog {...dialogProps} />
    </div>
  );
}