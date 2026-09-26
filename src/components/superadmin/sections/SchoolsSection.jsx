// src/components/SuperAdmin/sections/SchoolsSection.jsx
import { useState, useMemo, useCallback, useDeferredValue, useEffect } from "react";
import {
  UserPlus, UserMinus, Trash2, X, Plus, AlertCircle,
  Lock, // ✨ NOUVEAU
} from "lucide-react";
import { useTokens } from "@/theme/tokens";
import { useIsMobile } from "@/hooks/useIsMobile";
import toast from "react-hot-toast";
import { runInBatches } from "@/utils/runInBatches";
import { Button } from "@/components/ui";
import { SchoolTable } from "../SchoolTable";
import { SchoolCard } from "../schools/SchoolCard";
import { SchoolsToolbar } from "../schools/SchoolsToolbar";
import { SchoolsPagination } from "../schools/SchoolsPagination";
import { CreateSchoolModal } from "../schools/CreateSchoolModal";

const PAGE_SIZE = 10;

export function SchoolsSection({
  ecoles = [],
  user,
  onSelectEcole,
  onDrilldown,
  actions,
  confirm,
  userId,
  canCreate = true,
  canDelete = true, // ✨ NOUVEAU
}) {
  const t = useTokens();
  const isMobile = useIsMobile();

  // canCreate couvre aussi "modifier" (rename, suspend, reactivate)
  const canEdit = canCreate;

  // ────────────────────────────────────────────────
  // État local
  // ────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState("");
  const [schoolFilter, setSchoolFilter] = useState("all");
  const [schoolView, setSchoolView] = useState("cards");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);

  const deferredSearch = useDeferredValue(searchTerm);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  // ────────────────────────────────────────────────
  // Filtrage + Pagination
  // ────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = ecoles;
    if (schoolFilter === "active")
      result = result.filter((e) => e.statut === "active");
    else if (schoolFilter === "suspendue")
      result = result.filter((e) => e.statut === "suspendue");

    if (deferredSearch.trim()) {
      const q = deferredSearch.toLowerCase();
      result = result.filter(
        (e) =>
          (e.nom ?? "").toLowerCase().includes(q) ||
          (e.code ?? "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [ecoles, deferredSearch, schoolFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);

  const paginated = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, safePage]);

  useEffect(() => {
    if (currentPage !== safePage) {
      setCurrentPage(safePage);
    }
  }, [currentPage, safePage]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [deferredSearch, schoolFilter]);

  const stats = useMemo(
    () => ({
      total: ecoles.length,
      active: ecoles.filter((e) => e.statut === "active").length,
      suspended: ecoles.filter((e) => e.statut === "suspendue").length,
    }),
    [ecoles]
  );

  // ────────────────────────────────────────────────
  // Handlers sélection
  // ────────────────────────────────────────────────
  const toggleSelect = useCallback((id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const toggleSelectAllVisible = useCallback(
    (idsFromTable) => {
      const visibleIds =
        idsFromTable && idsFromTable.length > 0
          ? idsFromTable
          : paginated.map((e) => e._id);
      const allSelected = visibleIds.every((id) => selectedSet.has(id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (allSelected) visibleIds.forEach((id) => next.delete(id));
        else visibleIds.forEach((id) => next.add(id));
        return Array.from(next);
      });
    },
    [paginated, selectedSet]
  );

  const clearSelection = useCallback(() => setSelectedIds([]), []);

  // ────────────────────────────────────────────────
  // Handlers CRUD
  // ────────────────────────────────────────────────
  const handleDelete = useCallback(
    async (ecoleId, nom) => {
      const ok = await confirm(
        "Supprimer l'école",
        `Voulez-vous vraiment supprimer "${nom}" ? Cette action est irréversible.`
      );
      if (!ok) return;
      try {
        await actions.remove(ecoleId);
        toast.success("École supprimée");
      } catch (err) {
        toast.error(
          "Impossible de supprimer : " + (err?.message ?? "erreur inconnue")
        );
      }
    },
    [confirm, actions]
  );

  const handleDeleteFromTable = useCallback(
    (ecole) => handleDelete(ecole._id, ecole.nom),
    [handleDelete]
  );

  const handleToggleStatus = useCallback(
    async (ecole) => {
      const action = ecole.statut === "active" ? "suspendre" : "réactiver";
      const ok = await confirm(
        action === "suspendre" ? "Suspendre l'école" : "Réactiver l'école",
        `Voulez-vous ${action} l'école "${ecole.nom}" ?`
      );
      if (!ok) return;
      try {
        if (ecole.statut === "active") await actions.suspend(ecole._id);
        else await actions.reactivate(ecole._id);

        toast.success(
          ecole.statut === "active" ? "École suspendue" : "École réactivée"
        );
      } catch (err) {
        toast.error(
          "Impossible de changer le statut : " + (err?.message ?? "erreur")
        );
      }
    },
    [confirm, actions]
  );

  const handleUpdateNom = useCallback(
    async (ecoleId, nom) => {
      try {
        await actions.updateNom(ecoleId, nom);
        toast.success("Nom mis à jour");
      } catch (err) {
        toast.error(
          "Impossible de mettre à jour : " + (err?.message ?? "erreur")
        );
      }
    },
    [actions]
  );

  const handleCreate = useCallback(
    async (nom) => {
      setCreating(true);
      try {
        await actions.add(nom);
        toast.success("École créée avec succès");
        setShowCreateModal(false);
      } catch (err) {
        toast.error("Impossible de créer : " + (err?.message ?? "erreur"));
      } finally {
        setCreating(false);
      }
    },
    [actions]
  );

  const handleDrilldown = useCallback(
    (ecoleId) => {
      if (onDrilldown) onDrilldown(ecoleId);
    },
    [onDrilldown]
  );

  // ────────────────────────────────────────────────
  // Bulk actions
  // ────────────────────────────────────────────────
  const bulkActivate = useCallback(async () => {
    const ids = Array.from(selectedSet);
    if (ids.length === 0) return;
    const ok = await confirm(
      "Activer les écoles",
      `Activer ${ids.length} école(s) ?`
    );
    if (!ok) return;
    setBulkProcessing(true);
    try {
      const res = await runInBatches(ids, (id) => actions.reactivate(id), 5);
      if (res.success > 0) toast.success(`${res.success} école(s) activée(s)`);
      if (res.failed > 0) toast.error(`${res.failed} échec(s)`);
      clearSelection();
    } finally {
      setBulkProcessing(false);
    }
  }, [selectedSet, confirm, actions, clearSelection]);

  const bulkSuspend = useCallback(async () => {
    const ids = Array.from(selectedSet);
    if (ids.length === 0) return;
    const ok = await confirm(
      "Suspendre les écoles",
      `Suspendre ${ids.length} école(s) ?`
    );
    if (!ok) return;
    setBulkProcessing(true);
    try {
      const res = await runInBatches(ids, (id) => actions.suspend(id), 5);
      if (res.success > 0)
        toast.success(`${res.success} école(s) suspendue(s)`);
      if (res.failed > 0) toast.error(`${res.failed} échec(s)`);
      clearSelection();
    } finally {
      setBulkProcessing(false);
    }
  }, [selectedSet, confirm, actions, clearSelection]);

  const bulkDelete = useCallback(async () => {
    const ids = Array.from(selectedSet);
    if (ids.length === 0) return;
    const ok = await confirm(
      "Supprimer les écoles",
      `Attention : ${ids.length} école(s) et leurs données seront supprimées définitivement. Confirmer ?`
    );
    if (!ok) return;
    setBulkProcessing(true);
    try {
      const res = await runInBatches(ids, (id) => actions.remove(id), 5);
      if (res.success > 0)
        toast.success(`${res.success} école(s) supprimée(s)`);
      if (res.failed > 0) toast.error(`${res.failed} échec(s)`);
      clearSelection();
    } finally {
      setBulkProcessing(false);
    }
  }, [selectedSet, confirm, actions, clearSelection]);

  // ────────────────────────────────────────────────
  // Export
  // ────────────────────────────────────────────────
  const handleExport = useCallback(async () => {
    if (filtered.length === 0) {
      toast.error("Aucune donnée à exporter");
      return;
    }
    try {
      const XLSX = await import("xlsx");
      const data = filtered.map((e) => ({
        Nom: e.nom,
        Code: e.code || "N/A",
        Statut: e.statut === "active" ? "Active" : "Suspendue",
        Utilisateurs: e.userCount ?? 0,
        "Créée le": new Date(e._creationTime).toLocaleDateString("fr-FR"),
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Écoles");
      XLSX.writeFile(wb, "ecoles.xlsx");
      toast.success("Export Excel généré");
    } catch (err) {
      toast.error(
        "Impossible de générer l'export : " + (err?.message ?? "erreur")
      );
    }
  }, [filtered]);

  const handlePrint = useCallback(() => window.print(), []);

  // ────────────────────────────────────────────────
  // Rendu
  // ────────────────────────────────────────────────
  return (
    <div>
      {/* ═══ Bandeau lecture seule ═══ */}
      {!canEdit && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: t.space.sm,
            padding: t.space.sm,
            marginBottom: 16,
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
            de modifier les écoles.
          </span>
        </div>
      )}

      {/* ═══ Bouton Nouvelle école ═══ */}
      {canCreate && (
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: 16,
          }}
        >
          <Button
            variant="primary"
            size={isMobile ? "md" : "sm"}
            icon={<Plus size={16} />}
            onClick={() => setShowCreateModal(true)}
          >
            Nouvelle école
          </Button>
        </div>
      )}

      {/* ═══ Barre d'outils ═══ */}
      <SchoolsToolbar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        schoolFilter={schoolFilter}
        setSchoolFilter={setSchoolFilter}
        schoolView={schoolView}
        setSchoolView={setSchoolView}
        onExport={handleExport}
        onPrint={handlePrint}
        stats={stats}
        selectedCount={selectedSet.size}
        onSelectAll={canEdit ? toggleSelectAllVisible : undefined}
        allVisibleSelected={
          paginated.length > 0 && paginated.every((e) => selectedSet.has(e._id))
        }
      />

      {/* ═══ Barre d'actions groupées (canEdit requis) ═══ */}
      {canEdit && selectedSet.size > 0 && (
        <BulkBar
          count={selectedSet.size}
          processing={bulkProcessing}
          onActivate={bulkActivate}
          onSuspend={bulkSuspend}
          onDelete={bulkDelete}
          onCancel={clearSelection}
          canDelete={canDelete}
        />
      )}

      {/* ═══ Contenu ═══ */}
      {filtered.length === 0 ? (
        <EmptyState
          hasFilter={!!deferredSearch.trim() || schoolFilter !== "all"}
        />
      ) : schoolView === "table" ? (
        <>
          <SchoolTable
            ecoles={paginated}
            onSelectEcole={onSelectEcole}
            onDrilldown={handleDrilldown}
            onDelete={canDelete ? handleDeleteFromTable : undefined}
            onToggleStatus={canEdit ? handleToggleStatus : undefined}
            onUpdateNom={canEdit ? handleUpdateNom : undefined}
            user={user}
            selectable={canEdit}
            selectedIds={selectedSet}
            onToggleSelect={toggleSelect}
            onToggleSelectAll={toggleSelectAllVisible}
          />
          <SchoolsPagination
            currentPage={safePage}
            totalPages={totalPages}
            onChange={setCurrentPage}
          />
        </>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile
                ? "1fr"
                : "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 16,
            }}
          >
            {paginated.map((ecole) => (
              <SchoolCard
                key={ecole._id}
                ecole={ecole}
                selected={selectedSet.has(ecole._id)}
                onToggleSelect={canEdit ? toggleSelect : undefined}
                onToggleStatus={canEdit ? handleToggleStatus : undefined}
                onDelete={canDelete ? handleDelete : undefined}
                onOpen={onSelectEcole}
                onDrilldown={onDrilldown ? handleDrilldown : undefined}
                onRename={canEdit ? handleUpdateNom : undefined}
              />
            ))}
          </div>
          <SchoolsPagination
            currentPage={safePage}
            totalPages={totalPages}
            onChange={setCurrentPage}
          />
        </>
      )}

      {/* ═══ Modale création (canCreate requis) ═══ */}
      {canCreate && (
        <CreateSchoolModal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreate}
          submitting={creating}
        />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Sous-composants
// ════════════════════════════════════════════════════════════════════

function BulkBar({
  count,
  processing,
  onActivate,
  onSuspend,
  onDelete,
  onCancel,
  canDelete = true, // ✨ NOUVEAU
}) {
  const t = useTokens();
  const isMobile = useIsMobile();

  const buttons = [
    {
      icon: <UserPlus size={14} />,
      label: "Activer",
      color: "#10B981",
      onClick: onActivate,
    },
    {
      icon: <UserMinus size={14} />,
      label: "Suspendre",
      color: "#F59E0B",
      onClick: onSuspend,
    },
    // ✨ Supprimer seulement si canDelete
    ...(canDelete
      ? [
          {
            icon: <Trash2 size={14} />,
            label: "Supprimer",
            color: "#EF4444",
            onClick: onDelete,
          },
        ]
      : []),
  ];

  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        alignItems: "center",
        flexWrap: "wrap",
        marginBottom: 16,
        padding: 12,
        background: t.surface.default,
        borderRadius: t.radius.md,
        border: `1px solid ${t.border.default}`,
        flexDirection: isMobile ? "column" : "row",
        width: "100%",
      }}
    >
      <span
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: t.text.primary,
          marginRight: 4,
        }}
      >
        {count} sélectionnée(s)
      </span>

      {buttons.map((b) => (
        <button
          key={b.label}
          type="button"
          onClick={b.onClick}
          disabled={processing}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            padding: "6px 12px",
            background: b.color,
            color: "#FFFFFF",
            border: "none",
            borderRadius: t.radius.sm,
            cursor: processing ? "not-allowed" : "pointer",
            fontSize: 13,
            width: isMobile ? "100%" : "auto",
            opacity: processing ? 0.7 : 1,
            fontFamily: t.font.family,
            fontWeight: 600,
          }}
        >
          {b.icon} {b.label}
        </button>
      ))}

      <button
        type="button"
        onClick={onCancel}
        disabled={processing}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
          padding: "6px 12px",
          background: "transparent",
          border: `1px solid ${t.border.default}`,
          borderRadius: t.radius.sm,
          cursor: processing ? "not-allowed" : "pointer",
          fontSize: 13,
          color: t.text.primary,
          width: isMobile ? "100%" : "auto",
          fontFamily: t.font.family,
          marginLeft: isMobile ? 0 : "auto",
        }}
      >
        <X size={14} /> Annuler
      </button>
    </div>
  );
}

function EmptyState({ hasFilter }) {
  const t = useTokens();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        padding: 48,
        background: t.surface.default,
        borderRadius: t.radius.md,
        border: `1px dashed ${t.border.default}`,
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          background: t.surface.hover,
          color: t.text.muted,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <AlertCircle size={24} />
      </div>
      <div style={{ color: t.text.primary, fontWeight: 600, fontSize: 15 }}>
        {hasFilter ? "Aucun résultat" : "Aucune école"}
      </div>
      <div style={{ color: t.text.muted, fontSize: 13.5, maxWidth: 320 }}>
        {hasFilter
          ? "Aucune école ne correspond à vos critères de recherche."
          : "Aucune école enregistrée. Cliquez sur « Nouvelle école » pour commencer."}
      </div>
    </div>
  );
}