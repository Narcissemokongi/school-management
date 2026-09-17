// src/components/SchoolsTab.jsx
import { useState, useMemo, useCallback, useDeferredValue, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useConfirm } from "@/hooks/useConfirm";
import { ConfirmDialog } from "./ConfirmDialog";
import { SchoolTable } from "./SchoolTable";
import {
  Search, X, Building2, Users, ArrowRight,
  Edit2, Trash2, Ban, Power, Loader, CheckCircle2, XCircle,
  ChevronUp, ChevronDown, Save, Copy, LayoutGrid, Table, Download,
  CheckSquare, Square, UserPlus, UserMinus,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";

// ════════════════════════════════════════════════════════════════════
// CONSTANTES MODULE-LEVEL
// ════════════════════════════════════════════════════════════════════
const PAGE_SIZE = 10;

// 🟢 Helper batch (5×5)
const runInBatches = async (items, fn, size = 5) => {
  for (let i = 0; i < items.length; i += size) {
    await Promise.all(items.slice(i, i + size).map(fn));
  }
};

// ✅ FIX — détection prefers-reduced-motion
const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// 🟢 Keyframes (composant JSX module-level, injecté dans les 2 branches)
const SchoolsTabKeyframes = (
  <style>{`
    @keyframes st2-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .st2-spin { animation: st2-spin 1s linear infinite; }
    @media (prefers-reduced-motion: reduce) {
      .st2-spin { animation: none !important; }
    }
  `}</style>
);

// ════════════════════════════════════════════════════════════════════
// Sous-composant : badge statut
// ════════════════════════════════════════════════════════════════════
function StatusBadge({ statut, dark }) {
  const isActive = statut !== "suspendue";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px",
        borderRadius: 12,
        fontSize: 11,
        fontWeight: 600,
        background: isActive
          ? dark
            ? "#064E3B"
            : "#D1FAE5"
          : dark
          ? "#78350F"
          : "#FEF3C7",
        color: isActive
          ? dark
            ? "#34D399"
            : "#065F46"
          : dark
          ? "#FBBF24"
          : "#92400E",
      }}
    >
      {isActive ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
      {isActive ? "Active" : "Suspendue"}
    </span>
  );
}

// ════════════════════════════════════════════════════════════════════
// Sous-composant : carte école (grille)
// ✅ FIX — hover via state au lieu de mutation DOM directe
// ════════════════════════════════════════════════════════════════════
function EcoleCard({
  ecole, dark, isMobile, selected,
  editingId, editNom, setEditNom,
  togglingId, deletingId,
  startEdit, cancelEdit, handleUpdateNom, handleToggleStatus, handleDelete,
  onSelectEcole, onToggleSelect, copyCode,
}) {
  const [hovered, setHovered] = useState(false);
  const noMotion = useMemo(() => prefersReducedMotion(), []);
  const isEditing = editingId === ecole._id;

  const cardGap = isMobile ? 8 : 12;
  const cardPadding = isMobile ? 14 : 20;
  const cardNameFontSize = isMobile ? 15 : 16;
  const cardTextFontSize = 13;
  const cardActionPadding = isMobile ? "10px 12px" : "8px 12px";
  const cardActionFontSize = isMobile ? 14 : 13;

  const baseShadow = dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)";
  const hoverShadow = dark ? "0 4px 12px rgba(0,0,0,0.5)" : "0 4px 12px rgba(0,0,0,0.1)";
  const noMotionActive = noMotion;

  return (
    <div
      onMouseEnter={() => !noMotionActive && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: dark ? "#1E293B" : "#FFFFFF",
        borderRadius: 16,
        padding: cardPadding,
        boxShadow: hovered && !noMotionActive ? hoverShadow : baseShadow,
        border: `1px solid ${
          selected
            ? dark
              ? "#818CF8"
              : "#4F46E5"
            : dark
            ? "rgba(255,255,255,0.05)"
            : "rgba(0,0,0,0.05)"
        }`,
        transition: noMotionActive
          ? "none"
          : "box-shadow 0.2s, transform 0.1s, border-color 0.2s",
        transform: hovered && !noMotionActive ? "translateY(-2px)" : "translateY(0)",
        display: "flex",
        flexDirection: "column",
        gap: cardGap,
        position: "relative",
      }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleSelect(ecole._id);
        }}
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 4,
          color: selected
            ? dark
              ? "#818CF8"
              : "#4F46E5"
            : dark
            ? "#94A3B8"
            : "#CBD5E1",
          zIndex: 1,
        }}
        aria-label={selected ? "Désélectionner" : "Sélectionner"}
      >
        {selected ? <CheckSquare size={18} /> : <Square size={18} />}
      </button>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingRight: 28,
          gap: 8,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            minWidth: 0,
            flex: 1,
          }}
        >
          <Building2 size={20} color={dark ? "#818CF8" : "#4F46E5"} />
          {isEditing ? (
            <input
              value={editNom}
              onChange={(e) => setEditNom(e.target.value)}
              style={{
                fontSize: cardNameFontSize,
                fontWeight: 600,
                color: dark ? "#F1F5F9" : "#1E293B",
                background: dark ? "#0F172A" : "#F9FAFB",
                border: `1px solid ${dark ? "#818CF8" : "#4F46E5"}`,
                borderRadius: 6,
                padding: "4px 8px",
                outline: "none",
                width: "100%",
              }}
              autoFocus
              aria-label="Modifier le nom de l'école"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleUpdateNom(ecole._id);
                if (e.key === "Escape") cancelEdit();
              }}
            />
          ) : (
            <span
              style={{
                fontWeight: 700,
                fontSize: cardNameFontSize,
                color: dark ? "#F1F5F9" : "#1E293B",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {ecole.nom}
            </span>
          )}
        </div>
        <StatusBadge statut={ecole.statut} dark={dark} />
      </div>

      {ecole.code && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: cardTextFontSize,
            color: dark ? "#94A3B8" : "#64748B",
          }}
        >
          Code :{" "}
          <span style={{ fontFamily: "monospace" }}>{ecole.code}</span>
          <button
            type="button"
            onClick={() => copyCode(ecole.code)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
            aria-label="Copier le code"
          >
            <Copy size={14} color={dark ? "#94A3B8" : "#64748B"} />
          </button>
        </div>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          color: dark ? "#94A3B8" : "#64748B",
          fontSize: cardTextFontSize,
        }}
      >
        <Users size={14} />
        <span>{ecole.userCount ?? 0} utilisateur(s)</span>
      </div>

      <div
        style={{
          display: "flex",
          gap: 8,
          marginTop: "auto",
          flexDirection: isMobile ? "column" : "row",
        }}
      >
        {isEditing ? (
          <>
            <button
              type="button"
              onClick={() => handleUpdateNom(ecole._id)}
              style={{
                flex: 1,
                padding: cardActionPadding,
                background: "#10B981",
                color: "white",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                fontSize: cardActionFontSize,
              }}
            >
              <Save size={14} /> Enregistrer
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              aria-label="Annuler"
              style={{
                padding: cardActionPadding,
                background: dark ? "#334155" : "#F1F5F9",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                color: dark ? "#F1F5F9" : "#1E293B",
                fontSize: cardActionFontSize,
              }}
            >
              <X size={14} />
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectEcole(ecole._id);
              }}
              style={{
                flex: 1,
                padding: cardActionPadding,
                background: dark ? "#818CF8" : "#4F46E5",
                color: "white",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                fontSize: cardActionFontSize,
              }}
            >
              Ouvrir <ArrowRight size={14} />
            </button>
            <div
              style={{
                display: "flex",
                gap: 6,
                justifyContent: "space-between",
                width: "100%",
              }}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  startEdit(ecole);
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: dark ? "#818CF8" : "#4F46E5",
                  cursor: "pointer",
                  padding: 8,
                  borderRadius: 8,
                }}
                title="Modifier le nom"
                aria-label="Modifier le nom"
              >
                <Edit2 size={16} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleStatus(ecole);
                }}
                disabled={togglingId === ecole._id}
                style={{
                  background: "transparent",
                  border: "none",
                  color:
                    ecole.statut === "suspendue" ? "#10B981" : "#F59E0B",
                  cursor:
                    togglingId === ecole._id ? "not-allowed" : "pointer",
                  padding: 8,
                  borderRadius: 8,
                  opacity: togglingId === ecole._id ? 0.6 : 1,
                }}
                title={ecole.statut === "suspendue" ? "Activer" : "Suspendre"}
                aria-label={
                  ecole.statut === "suspendue" ? "Activer" : "Suspendre"
                }
              >
                {togglingId === ecole._id ? (
                  <Loader size={16} className="st2-spin" />
                ) : ecole.statut === "suspendue" ? (
                  <Power size={16} />
                ) : (
                  <Ban size={16} />
                )}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(ecole);
                }}
                disabled={deletingId === ecole._id}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#EF4444",
                  cursor:
                    deletingId === ecole._id ? "not-allowed" : "pointer",
                  padding: 8,
                  borderRadius: 8,
                  opacity: deletingId === ecole._id ? 0.6 : 1,
                }}
                title="Supprimer"
                aria-label="Supprimer"
              >
                {deletingId === ecole._id ? (
                  <Loader size={16} className="st2-spin" />
                ) : (
                  <Trash2 size={16} />
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ════════════════════════════════════════════════════════════════════
export function SchoolsTab({ ecoles, onSelectEcole, user }) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();
  const { confirm, dialogProps } = useConfirm();

  const userId = user?._id;

  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("nom");
  const [sortOrder, setSortOrder] = useState("asc");
  const [deletingId, setDeletingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editNom, setEditNom] = useState("");
  const [viewMode, setViewMode] = useState("cards");
  const [filterStatut, setFilterStatut] = useState("all");

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [filterUsers, setFilterUsers] = useState("all");
  const [bulkProcessing, setBulkProcessing] = useState(false);

  const deferredSearchTerm = useDeferredValue(searchTerm);

  const removeEcole = useMutation(api.ecoles.remove);
  const suspendEcole = useMutation(api.ecoles.suspendEcole);
  const reactiverEcole = useMutation(api.ecoles.reactiverEcole);
  const updateEcole = useMutation(api.ecoles.update);

  // ════════════════════════════════════════════════════════════════
  // Stats rapides
  // ════════════════════════════════════════════════════════════════
  const stats = useMemo(() => {
    const total = ecoles?.length ?? 0;
    const actives =
      ecoles?.filter((e) => e.statut !== "suspendue").length ?? 0;
    const suspendues =
      ecoles?.filter((e) => e.statut === "suspendue").length ?? 0;
    const withUsers =
      ecoles?.filter((e) => (e.userCount ?? 0) > 0).length ?? 0;
    return { total, actives, suspendues, withUsers };
  }, [ecoles]);

  // ════════════════════════════════════════════════════════════════
  // Filtrage + tri (✅ guards sur `e.nom`, `a.nom`, `b.nom`)
  // ════════════════════════════════════════════════════════════════
  const filteredAndSorted = useMemo(() => {
    if (!ecoles) return [];
    let filtered = ecoles;

    if (filterStatut === "active") {
      filtered = filtered.filter((e) => e.statut !== "suspendue");
    } else if (filterStatut === "suspendue") {
      filtered = filtered.filter((e) => e.statut === "suspendue");
    }

    if (filterUsers === "withUsers") {
      filtered = filtered.filter((e) => (e.userCount ?? 0) > 0);
    } else if (filterUsers === "noUsers") {
      filtered = filtered.filter((e) => (e.userCount ?? 0) === 0);
    }

    if (deferredSearchTerm.trim()) {
      const q = deferredSearchTerm.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          (e.nom ?? "").toLowerCase().includes(q) ||
          (e.code ?? "").toLowerCase().includes(q)
      );
    }

    return [...filtered].sort((a, b) => {
      let cmp = 0;
      const an = a.nom ?? "";
      const bn = b.nom ?? "";
      switch (sortBy) {
        case "nom":
          cmp = an.localeCompare(bn, undefined, { sensitivity: "base" });
          break;
        case "users":
          cmp = (a.userCount ?? 0) - (b.userCount ?? 0);
          break;
        case "statut":
          cmp =
            (a.statut === "suspendue" ? 1 : 0) -
            (b.statut === "suspendue" ? 1 : 0);
          break;
        case "code":
          cmp = (a.code || "").localeCompare(b.code || "");
          break;
        default:
          cmp = 0;
      }
      return sortOrder === "asc" ? cmp : -cmp;
    });
  }, [ecoles, filterStatut, filterUsers, deferredSearchTerm, sortBy, sortOrder]);

  // ════════════════════════════════════════════════════════════════
  // Pagination
  // ════════════════════════════════════════════════════════════════
  const totalPages = Math.max(
    1,
    Math.ceil(filteredAndSorted.length / PAGE_SIZE)
  );
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedEcoles = useMemo(
    () =>
      filteredAndSorted.slice(
        (safeCurrentPage - 1) * PAGE_SIZE,
        safeCurrentPage * PAGE_SIZE
      ),
    [filteredAndSorted, safeCurrentPage]
  );

  const resetPage = useCallback(() => setCurrentPage(1), []);

  // Reset page + sélection quand filtres/tri changent
  useEffect(() => {
    resetPage();
    setSelectedIds(new Set());
  }, [deferredSearchTerm, filterStatut, filterUsers, sortBy, sortOrder, resetPage]);

  // ════════════════════════════════════════════════════════════════
  // Sélection multiple
  // ════════════════════════════════════════════════════════════════
  const toggleSelectOne = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      const allVisibleIds = paginatedEcoles.map((e) => e._id);
      const allSelected = allVisibleIds.every((id) => prev.has(id));
      const next = new Set(prev);
      if (allSelected) {
        allVisibleIds.forEach((id) => next.delete(id));
      } else {
        allVisibleIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }, [paginatedEcoles]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  // ════════════════════════════════════════════════════════════════
  // ACTIONS GROUPÉES
  // ════════════════════════════════════════════════════════════════
  const bulkSuspend = useCallback(async () => {
    if (!userId) {
      toast.error("Session invalide.");
      return;
    }
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    const ok = await confirm(
      "Suspendre les écoles",
      `Voulez-vous suspendre ${ids.length} école(s) ?`
    );
    if (!ok) return;

    setBulkProcessing(true);
    let success = 0;
    let failed = 0;
    try {
      await runInBatches(ids, async (id) => {
        try {
          await suspendEcole({ ecoleId: id, userId });
          success++;
        } catch {
          failed++;
        }
      });
      if (success > 0) toast.success(`${success} école(s) suspendue(s)`);
      if (failed > 0) toast.error(`${failed} échec(s)`);
      clearSelection();
    } finally {
      setBulkProcessing(false);
    }
  }, [userId, selectedIds, confirm, suspendEcole, clearSelection]);

  const bulkActivate = useCallback(async () => {
    if (!userId) {
      toast.error("Session invalide.");
      return;
    }
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    const ok = await confirm(
      "Activer les écoles",
      `Voulez-vous activer ${ids.length} école(s) ?`
    );
    if (!ok) return;

    setBulkProcessing(true);
    let success = 0;
    let failed = 0;
    try {
      await runInBatches(ids, async (id) => {
        try {
          await reactiverEcole({ ecoleId: id, userId });
          success++;
        } catch {
          failed++;
        }
      });
      if (success > 0) toast.success(`${success} école(s) activée(s)`);
      if (failed > 0) toast.error(`${failed} échec(s)`);
      clearSelection();
    } finally {
      setBulkProcessing(false);
    }
  }, [userId, selectedIds, confirm, reactiverEcole, clearSelection]);

  const bulkDelete = useCallback(async () => {
    if (!userId) {
      toast.error("Session invalide.");
      return;
    }
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    const ok = await confirm(
      "Supprimer les écoles",
      `${ids.length} école(s) et leurs données associées seront supprimées définitivement. Confirmer ?`
    );
    if (!ok) return;

    setBulkProcessing(true);
    let success = 0;
    let failed = 0;
    try {
      await runInBatches(ids, async (id) => {
        try {
          await removeEcole({ ecoleId: id, userId });
          success++;
        } catch {
          failed++;
        }
      });
      if (success > 0) toast.success(`${success} école(s) supprimée(s)`);
      if (failed > 0) toast.error(`${failed} échec(s)`);
      clearSelection();
    } finally {
      setBulkProcessing(false);
    }
  }, [userId, selectedIds, confirm, removeEcole, clearSelection]);

  // ════════════════════════════════════════════════════════════════
  // Export Excel (lazy)
  // ════════════════════════════════════════════════════════════════
  const bulkExport = useCallback(async () => {
    try {
      const XLSX = await import("xlsx");
      const source =
        selectedIds.size > 0
          ? filteredAndSorted.filter((e) => selectedIds.has(e._id))
          : filteredAndSorted;

      if (source.length === 0) {
        toast.error("Aucune école à exporter");
        return;
      }

      const data = source.map((e) => ({
        Nom: e.nom,
        Code: e.code || "",
        Statut: e.statut === "suspendue" ? "Suspendue" : "Active",
        Utilisateurs: e.userCount ?? 0,
      }));
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Écoles");
      XLSX.writeFile(workbook, "ecoles.xlsx");
      toast.success(
        selectedIds.size > 0
          ? `${source.length} école(s) exportée(s)`
          : "Export Excel généré"
      );
    } catch (err) {
      toast.error(
        "Impossible de générer l'export : " +
          (err?.message || "erreur inconnue")
      );
    }
  }, [selectedIds, filteredAndSorted]);

  // ════════════════════════════════════════════════════════════════
  // ACTIONS UNITAIRES
  // ════════════════════════════════════════════════════════════════
  const handleDelete = useCallback(
    async (ecole) => {
      if (!userId) {
        toast.error("Session invalide.");
        return;
      }
      const userCount = ecole.userCount ?? 0;
      const ok = await confirm(
        "Supprimer l'école",
        `Voulez-vous vraiment supprimer "${ecole.nom}" ?\n${
          userCount > 0
            ? `${userCount} utilisateur(s) associé(s) seront également supprimés.`
            : "Cette école n'a aucun utilisateur associé."
        }\nCette action est irréversible.`
      );
      if (!ok) return;
      setDeletingId(ecole._id);
      try {
        await removeEcole({ ecoleId: ecole._id, userId });
        toast.success("École supprimée");
      } catch (err) {
        toast.error(
          "Impossible de supprimer : " + (err?.message || "erreur inconnue")
        );
      } finally {
        setDeletingId(null);
      }
    },
    [userId, confirm, removeEcole]
  );

  const handleToggleStatus = useCallback(
    async (ecole) => {
      if (!userId) {
        toast.error("Session invalide.");
        return;
      }
      const nouveauStatut =
        ecole.statut === "suspendue" ? "active" : "suspendue";
      const action = nouveauStatut === "suspendue" ? "suspendre" : "activer";
      const ok = await confirm(
        nouveauStatut === "suspendue"
          ? "Suspendre l'école"
          : "Activer l'école",
        `Voulez-vous ${action} l'école "${ecole.nom}" ?`
      );
      if (!ok) return;
      setTogglingId(ecole._id);
      try {
        if (nouveauStatut === "suspendue") {
          await suspendEcole({ ecoleId: ecole._id, userId });
        } else {
          await reactiverEcole({ ecoleId: ecole._id, userId });
        }
        toast.success(
          nouveauStatut === "suspendue" ? "École suspendue" : "École activée"
        );
      } catch (err) {
        toast.error(
          "Impossible de changer le statut : " +
            (err?.message || "erreur inconnue")
        );
      } finally {
        setTogglingId(null);
      }
    },
    [userId, confirm, suspendEcole, reactiverEcole]
  );

  const copyCode = useCallback(async (code) => {
    if (!code) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        // Fallback contexte non-sécurisé
        const ta = document.createElement("textarea");
        ta.value = code;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      toast.success("Code copié");
    } catch {
      toast.error("Impossible de copier le code");
    }
  }, []);

  const toggleSort = useCallback(
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

  const startEdit = useCallback((ecole) => {
    setEditingId(ecole._id);
    setEditNom(ecole.nom);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditNom("");
  }, []);

  const handleUpdateNom = useCallback(
    async (ecoleId) => {
      if (!userId) {
        toast.error("Session invalide.");
        return;
      }
      if (!editNom.trim()) {
        toast.error("Le nom ne peut pas être vide");
        return;
      }
      try {
        await updateEcole({ ecoleId, nom: editNom.trim(), userId });
        toast.success("Nom mis à jour");
        setEditingId(null);
        setEditNom("");
      } catch (err) {
        toast.error(
          "Impossible de mettre à jour : " +
            (err?.message || "erreur inconnue")
        );
      }
    },
    [userId, editNom, updateEcole]
  );

  // ════════════════════════════════════════════════════════════════
  // LOADING
  // ════════════════════════════════════════════════════════════════
  if (ecoles === undefined) {
    return (
      <>
        {SchoolsTabKeyframes}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: 200,
          }}
        >
          <Loader
            size={32}
            className="st2-spin"
            style={{ color: dark ? "#818CF8" : "#4F46E5" }}
          />
        </div>
      </>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // Styles adaptatifs
  // ════════════════════════════════════════════════════════════════
  const statGridCols = isMobile
    ? "1fr 1fr"
    : "repeat(auto-fit, minmax(150px, 1fr))";
  const statGap = isMobile ? 8 : 16;
  const statCardPadding = isMobile ? 12 : 16;
  const toolbarFlexDirection = isMobile ? "column" : "row";
  const toolbarGap = isMobile ? 8 : 12;
  const searchInputPadding = isMobile ? "10px 12px" : "8px 12px";
  const searchInputFontSize = isMobile ? 16 : 14;
  const filterSelectPadding = isMobile ? "10px 12px" : "8px 12px";
  const filterSelectFontSize = isMobile ? 16 : 14;
  const filterButtonsGap = isMobile ? 4 : 8;
  const filterButtonPadding = isMobile ? "10px 12px" : "8px 16px";
  const filterButtonFontSize = isMobile ? 14 : 13;
  const sortButtonsGap = isMobile ? 4 : 8;
  const sortButtonPadding = isMobile ? "10px 12px" : "8px 12px";
  const sortButtonFontSize = isMobile ? 14 : 13;
  const viewButtonPadding = isMobile ? 10 : 8;
  const viewIconSize = isMobile ? 20 : 18;
  const bulkActionsFlexDirection = isMobile ? "column" : "row";
  const bulkActionPadding = isMobile ? "10px 12px" : "6px 12px";
  const bulkActionFontSize = isMobile ? 14 : 13;
  const cardGridCols = isMobile
    ? "1fr"
    : "repeat(auto-fill, minmax(280px, 1fr))";
  const cardGap = isMobile ? 8 : 12;
  const paginationButtonPadding = isMobile ? "8px 12px" : "6px 10px";

  return (
    <div>
      {SchoolsTabKeyframes}

      {/* ═══════════════════════ STATS ═══════════════════════ */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: statGridCols,
          gap: statGap,
          marginBottom: isMobile ? 16 : 24,
        }}
      >
        {[
          {
            label: "Total écoles",
            value: stats.total,
            color: dark ? "#F1F5F9" : "#1E293B",
          },
          { label: "Actives", value: stats.actives, color: "#10B981" },
          { label: "Suspendues", value: stats.suspendues, color: "#F59E0B" },
          { label: "Avec utilisateurs", value: stats.withUsers, color: "#3B82F6" },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              background: dark ? "#1E293B" : "#FFFFFF",
              borderRadius: 12,
              padding: statCardPadding,
              textAlign: "center",
              border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
            }}
          >
            <div
              style={{
                fontSize: isMobile ? 18 : 24,
                fontWeight: 700,
                color: item.color,
              }}
            >
              {item.value}
            </div>
            <div
              style={{
                fontSize: isMobile ? 11 : 13,
                color: dark ? "#94A3B8" : "#64748B",
              }}
            >
              {item.label}
            </div>
          </div>
        ))}
      </div>

      {/* ═══════════════════════ BARRE D'OUTILS ═══════════════════════ */}
      <div
        style={{
          display: "flex",
          flexDirection: toolbarFlexDirection,
          flexWrap: "wrap",
          gap: toolbarGap,
          marginBottom: isMobile ? 16 : 20,
          alignItems: isMobile ? "stretch" : "center",
        }}
      >
        {/* Recherche */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            background: dark ? "#1E293B" : "#FFFFFF",
            borderRadius: 10,
            padding: searchInputPadding,
            border: `1px solid ${dark ? "rgba(255,255,255,0.1)" : "#E2E8F0"}`,
            flex: 1,
            minWidth: isMobile ? "100%" : 200,
          }}
        >
          <Search size={18} color={dark ? "#94A3B8" : "#64748B"} />
          <input
            placeholder="Rechercher une école..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              border: "none",
              outline: "none",
              marginLeft: 8,
              fontSize: searchInputFontSize,
              width: "100%",
              background: "transparent",
              color: dark ? "#F1F5F9" : "#1E293B",
            }}
            aria-label="Rechercher une école"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              style={{ background: "none", border: "none", cursor: "pointer" }}
              aria-label="Effacer la recherche"
            >
              <X size={16} color={dark ? "#94A3B8" : "#64748B"} />
            </button>
          )}
        </div>

        {/* Filtre statut */}
        <div
          style={{
            display: "flex",
            gap: filterButtonsGap,
            flexDirection: isMobile ? "column" : "row",
            width: isMobile ? "100%" : "auto",
          }}
        >
          {[
            { id: "all", label: "Toutes" },
            { id: "active", label: "Actives" },
            { id: "suspendue", label: "Suspendues" },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilterStatut(f.id)}
              aria-pressed={filterStatut === f.id}
              style={{
                padding: filterButtonPadding,
                borderRadius: 8,
                border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
                background:
                  filterStatut === f.id
                    ? dark
                      ? "#818CF8"
                      : "#4F46E5"
                    : "transparent",
                color:
                  filterStatut === f.id
                    ? "white"
                    : dark
                    ? "#94A3B8"
                    : "#64748B",
                fontWeight: filterStatut === f.id ? 600 : 400,
                cursor: "pointer",
                fontSize: filterButtonFontSize,
                width: isMobile ? "100%" : "auto",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Filtre utilisateurs */}
        <div style={{ width: isMobile ? "100%" : "auto" }}>
          <select
            value={filterUsers}
            onChange={(e) => setFilterUsers(e.target.value)}
            style={{
              width: "100%",
              padding: filterSelectPadding,
              borderRadius: 8,
              border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
              background: dark ? "#1E293B" : "#FFFFFF",
              color: dark ? "#F1F5F9" : "#1E293B",
              fontSize: filterSelectFontSize,
              cursor: "pointer",
            }}
            aria-label="Filtrer par nombre d'utilisateurs"
          >
            <option value="all">Tous les utilisateurs</option>
            <option value="withUsers">Avec utilisateurs</option>
            <option value="noUsers">Sans utilisateurs</option>
          </select>
        </div>

        {/* Tri */}
        <div
          style={{
            display: "flex",
            gap: sortButtonsGap,
            flexDirection: isMobile ? "column" : "row",
            width: isMobile ? "100%" : "auto",
          }}
        >
          {[
            { field: "nom", label: "Nom" },
            { field: "users", label: "Utilisateurs" },
            { field: "statut", label: "Statut" },
            { field: "code", label: "Code" },
          ].map((btn) => (
            <button
              key={btn.field}
              type="button"
              onClick={() => toggleSort(btn.field)}
              aria-pressed={sortBy === btn.field}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                padding: sortButtonPadding,
                background:
                  sortBy === btn.field
                    ? dark
                      ? "#312E81"
                      : "#EEF2FF"
                    : "transparent",
                color:
                  sortBy === btn.field
                    ? dark
                      ? "#A5B4FC"
                      : "#4F46E5"
                    : dark
                    ? "#94A3B8"
                    : "#64748B",
                border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
                borderRadius: 8,
                cursor: "pointer",
                fontSize: sortButtonFontSize,
                width: isMobile ? "100%" : "auto",
              }}
            >
              {btn.label}{" "}
              {sortBy === btn.field &&
                (sortOrder === "asc" ? (
                  <ChevronUp size={14} />
                ) : (
                  <ChevronDown size={14} />
                ))}
            </button>
          ))}
        </div>

        {/* Vue + Export */}
        <div
          style={{
            display: "flex",
            gap: 8,
            justifyContent: isMobile ? "space-between" : "flex-start",
            width: isMobile ? "100%" : "auto",
          }}
        >
          <button
            type="button"
            onClick={() => setViewMode("cards")}
            title="Vue cartes"
            aria-label="Vue cartes"
            aria-pressed={viewMode === "cards"}
            style={{
              padding: viewButtonPadding,
              borderRadius: 8,
              border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
              background:
                viewMode === "cards"
                  ? dark
                    ? "#818CF8"
                    : "#4F46E5"
                  : "transparent",
              color:
                viewMode === "cards"
                  ? "white"
                  : dark
                  ? "#94A3B8"
                  : "#64748B",
              cursor: "pointer",
            }}
          >
            <LayoutGrid size={viewIconSize} />
          </button>
          <button
            type="button"
            onClick={() => setViewMode("table")}
            title="Vue tableau"
            aria-label="Vue tableau"
            aria-pressed={viewMode === "table"}
            style={{
              padding: viewButtonPadding,
              borderRadius: 8,
              border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
              background:
                viewMode === "table"
                  ? dark
                    ? "#818CF8"
                    : "#4F46E5"
                  : "transparent",
              color:
                viewMode === "table"
                  ? "white"
                  : dark
                  ? "#94A3B8"
                  : "#64748B",
              cursor: "pointer",
            }}
          >
            <Table size={viewIconSize} />
          </button>
          <button
            type="button"
            onClick={bulkExport}
            title={
              selectedIds.size > 0
                ? `Exporter la sélection (${selectedIds.size})`
                : "Exporter en Excel"
            }
            aria-label="Exporter en Excel"
            style={{
              padding: viewButtonPadding,
              borderRadius: 8,
              border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
              background: "transparent",
              color: dark ? "#94A3B8" : "#64748B",
              cursor: "pointer",
            }}
          >
            <Download size={viewIconSize} />
          </button>
        </div>

        {/* Actions groupées */}
        {selectedIds.size > 0 && (
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              flexWrap: "wrap",
              flexDirection: bulkActionsFlexDirection,
              width: isMobile ? "100%" : "auto",
            }}
          >
            <span
              style={{
                fontSize: 13,
                color: dark ? "#94A3B8" : "#64748B",
              }}
            >
              {selectedIds.size} sélectionnée(s)
            </span>
            <button
              type="button"
              onClick={bulkActivate}
              disabled={bulkProcessing}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                padding: bulkActionPadding,
                background: "#10B981",
                color: "white",
                border: "none",
                borderRadius: 6,
                cursor: bulkProcessing ? "not-allowed" : "pointer",
                fontSize: bulkActionFontSize,
                width: isMobile ? "100%" : "auto",
                opacity: bulkProcessing ? 0.7 : 1,
              }}
            >
              <UserPlus size={14} /> Activer
            </button>
            <button
              type="button"
              onClick={bulkSuspend}
              disabled={bulkProcessing}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                padding: bulkActionPadding,
                background: "#F59E0B",
                color: "white",
                border: "none",
                borderRadius: 6,
                cursor: bulkProcessing ? "not-allowed" : "pointer",
                fontSize: bulkActionFontSize,
                width: isMobile ? "100%" : "auto",
                opacity: bulkProcessing ? 0.7 : 1,
              }}
            >
              <UserMinus size={14} /> Suspendre
            </button>
            <button
              type="button"
              onClick={bulkDelete}
              disabled={bulkProcessing}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                padding: bulkActionPadding,
                background: "#EF4444",
                color: "white",
                border: "none",
                borderRadius: 6,
                cursor: bulkProcessing ? "not-allowed" : "pointer",
                fontSize: bulkActionFontSize,
                width: isMobile ? "100%" : "auto",
                opacity: bulkProcessing ? 0.7 : 1,
              }}
            >
              <Trash2 size={14} /> Supprimer
            </button>
            <button
              type="button"
              onClick={clearSelection}
              disabled={bulkProcessing}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                padding: bulkActionPadding,
                background: "transparent",
                border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
                borderRadius: 6,
                cursor: "pointer",
                fontSize: bulkActionFontSize,
                color: dark ? "#F1F5F9" : "#1E293B",
                width: isMobile ? "100%" : "auto",
              }}
            >
              <X size={14} /> Annuler
            </button>
          </div>
        )}
      </div>

      {/* ═══════════════════════ CONTENU ═══════════════════════ */}
      {filteredAndSorted.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: 48,
            color: dark ? "#94A3B8" : "#64748B",
          }}
        >
          <Building2 size={48} color={dark ? "#334155" : "#CBD5E1"} />
          <p style={{ marginTop: 12, fontSize: 16 }}>
            {searchTerm || filterStatut !== "all" || filterUsers !== "all"
              ? "Aucune école trouvée"
              : "Aucune école disponible"}
          </p>
        </div>
      ) : viewMode === "cards" ? (
        <>
          {/* Vue cartes */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: cardGridCols,
              gap: cardGap,
            }}
          >
            {paginatedEcoles.map((ecole) => (
              <EcoleCard
                key={ecole._id}
                ecole={ecole}
                dark={dark}
                isMobile={isMobile}
                selected={selectedIds.has(ecole._id)}
                editingId={editingId}
                editNom={editNom}
                setEditNom={setEditNom}
                togglingId={togglingId}
                deletingId={deletingId}
                startEdit={startEdit}
                cancelEdit={cancelEdit}
                handleUpdateNom={handleUpdateNom}
                handleToggleStatus={handleToggleStatus}
                handleDelete={handleDelete}
                onSelectEcole={onSelectEcole}
                onToggleSelect={toggleSelectOne}
                copyCode={copyCode}
              />
            ))}
          </div>

          {/* Pagination */}
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
                style={{
                  padding: paginationButtonPadding,
                  border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
                  borderRadius: 6,
                  background: "transparent",
                  color:
                    safeCurrentPage === 1
                      ? "#94A3B8"
                      : dark
                      ? "#F1F5F9"
                      : "#1E293B",
                  cursor: safeCurrentPage === 1 ? "not-allowed" : "pointer",
                }}
                aria-label="Page précédente"
              >
                <ChevronLeft size={16} />
              </button>
              <span
                style={{
                  fontSize: isMobile ? 14 : 13,
                  color: dark ? "#94A3B8" : "#64748B",
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
                style={{
                  padding: paginationButtonPadding,
                  border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
                  borderRadius: 6,
                  background: "transparent",
                  color:
                    safeCurrentPage === totalPages
                      ? "#94A3B8"
                      : dark
                      ? "#F1F5F9"
                      : "#1E293B",
                  cursor:
                    safeCurrentPage === totalPages ? "not-allowed" : "pointer",
                }}
                aria-label="Page suivante"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      ) : (
        <SchoolTable
          ecoles={filteredAndSorted}
          onSelectEcole={onSelectEcole}
          onDelete={handleDelete}
          onToggleStatus={handleToggleStatus}
          onUpdateNom={handleUpdateNom}
          user={user}
          selectable
          selectedIds={selectedIds}
          onToggleSelect={toggleSelectOne}
          onToggleSelectAll={toggleSelectAll}
        />
      )}

      <ConfirmDialog {...dialogProps} />
    </div>
  );
}