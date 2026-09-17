// src/components/SuperAdminDashboard.jsx
import {
  useState, useEffect, useMemo, useCallback, useDeferredValue,
} from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  Plus, School, Clock, Loader, RefreshCw, ShieldCheck,
  Search, X, Building2, Users,
  CheckCircle2, XCircle, Trash2,
  Ban, Power, ArrowRight, Menu, Bell,
  Sun, Moon, LogOut, Settings, LayoutDashboard,
  LayoutGrid, Table, Download, Printer, CalendarDays,
  CheckSquare, Square, ChevronLeft, ChevronRight, UserPlus, UserMinus,
} from "lucide-react";
import { OverviewTab } from "./OverviewTab";
import { PendingTab } from "./PendingTab";
import { SchoolTable } from "./SchoolTable";
import { GestionSuperAdmins } from "./GestionSuperAdmins";
import { SettingsTab } from "./SettingsTab";
import { ConfirmDialog } from "../ConfirmDialog";
import { useConfirm } from "@/hooks/useConfirm";
import { useAppStore } from "@/store/appStore";
import toast from "react-hot-toast";

// ════════════════════════════════════════════════════════════════════
// CONSTANTES
// ════════════════════════════════════════════════════════════════════
const DEFAULT_PAGE_SIZE = 10;

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// ════════════════════════════════════════════════════════════════════
// HOOKS
// ════════════════════════════════════════════════════════════════════
function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const media = window.matchMedia(query);
    const handler = (e) => setMatches(e.matches);
    setMatches(media.matches);

    if (media.addEventListener) {
      media.addEventListener("change", handler);
      return () => media.removeEventListener("change", handler);
    } else if (media.addListener) {
      media.addListener(handler);
      return () => media.removeListener(handler);
    }
  }, [query]);

  return matches;
}

// ════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════
const runInBatches = async (items, fn, size = 5) => {
  for (let i = 0; i < items.length; i += size) {
    await Promise.all(items.slice(i, i + size).map(fn));
  }
};

// ════════════════════════════════════════════════════════════════════
// KEYFRAMES module-level
// ════════════════════════════════════════════════════════════════════
const SadKeyframes = (
  <style>{`
    @keyframes sad-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .sad-spin { animation: sad-spin 1s linear infinite; }
    @keyframes sad-fade-in { from { opacity: 0; } to { opacity: 1; } }
    .sad-fade-in { animation: sad-fade-in 0.3s ease; }
    .sad-sidebar-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.4); z-index: 40; }
    .sad-mobile-sidebar { position: fixed; top: 0; left: 0; bottom: 0; z-index: 50; width: 80%; max-width: 300px; transform: translateX(-100%); transition: transform 0.3s ease; }
    .sad-mobile-sidebar.open { transform: translateX(0); }
    .sad-mobile-menu-btn { display: none; }
    @media (max-width: 768px) {
      .sad-mobile-menu-btn { display: inline-flex !important; }
    }
    @media (min-width: 769px) {
      .sad-desktop-sidebar { transform: translateX(0) !important; position: sticky; }
    }
    @media (prefers-reduced-motion: reduce) {
      .sad-spin, .sad-fade-in { animation: none !important; }
    }
    @media print {
      .sad-no-print { display: none !important; }
      .sad-print-area { display: block !important; }
    }
  `}</style>
);

// ════════════════════════════════════════════════════════════════════
// StatusBadge
// ════════════════════════════════════════════════════════════════════
const StatusBadge = ({ statut, dark }) => {
  const isActive = statut === "active";
  const bg = isActive
    ? dark ? "#064E3B" : "#D1FAE5"
    : dark ? "#7F1D1D" : "#FEE2E2";
  const color = isActive
    ? dark ? "#34D399" : "#065F46"
    : dark ? "#F87171" : "#B91C1C";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "4px 10px",
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 600,
        background: bg,
        color: color,
      }}
    >
      {isActive ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
      {isActive ? "Active" : "Suspendue"}
    </span>
  );
};

// ════════════════════════════════════════════════════════════════════
// ✅ FIX — SchoolCard : hover via state (plus de mutation DOM)
// ════════════════════════════════════════════════════════════════════
const SchoolCard = ({
  ecole,
  onSelectEcole,
  onToggleStatus,
  onDelete,
  dark,
  borderColor,
  accentColor,
  textPrimary,
  textSecondary,
  selected,
  onToggleSelect,
  isMobile,
}) => {
  const [hovered, setHovered] = useState(false);
  const noMotion = useMemo(() => prefersReducedMotion(), []);

  const baseShadow = dark
    ? "0 1px 3px rgba(0,0,0,0.3)"
    : "0 1px 3px rgba(0,0,0,0.05)";
  const hoverShadow = dark
    ? "0 4px 12px rgba(0,0,0,0.5)"
    : "0 4px 12px rgba(0,0,0,0.1)";

  return (
    <div
      onMouseEnter={() => !noMotion && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: dark ? "#1E293B" : "#FFFFFF",
        borderRadius: 16,
        padding: isMobile ? 14 : 20,
        boxShadow: hovered && !noMotion ? hoverShadow : baseShadow,
        border: `1px solid ${selected ? accentColor : borderColor}`,
        cursor: "pointer",
        transition: noMotion
          ? "border-color 0.2s"
          : "transform 0.2s, box-shadow 0.2s, border-color 0.2s",
        transform: hovered && !noMotion ? "translateY(-2px)" : "translateY(0)",
        display: "flex",
        flexDirection: "column",
        gap: isMobile ? 8 : 12,
        position: "relative",
      }}
      onClick={() => onSelectEcole(ecole._id)}
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
          color: selected ? accentColor : textSecondary,
          zIndex: 1,
        }}
        aria-label={selected ? "Désélectionner" : "Sélectionner"}
      >
        {selected ? <CheckSquare size={18} /> : <Square size={18} />}
      </button>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingRight: 28,
          gap: 8,
        }}
      >
        <Building2 size={isMobile ? 20 : 24} color={accentColor} />
        <StatusBadge statut={ecole.statut} dark={dark} />
      </div>
      <div>
        <div
          style={{
            fontWeight: 700,
            fontSize: isMobile ? 15 : 18,
            color: textPrimary,
          }}
        >
          {ecole.nom}
        </div>
        {ecole.code && (
          <div
            style={{
              color: textSecondary,
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 4,
              marginTop: 4,
            }}
          >
            Code :{" "}
            <span style={{ fontFamily: "monospace" }}>{ecole.code}</span>
          </div>
        )}
        <div
          style={{
            color: textSecondary,
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 4,
            marginTop: 4,
          }}
        >
          <CalendarDays size={14} /> Créée le{" "}
          {new Date(ecole._creationTime).toLocaleDateString("fr-FR")}
        </div>
        <div
          style={{
            color: textSecondary,
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 4,
            marginTop: 2,
          }}
        >
          <Users size={14} /> {ecole.userCount ?? 0} utilisateur(s)
        </div>
      </div>
      <div
        style={{
          display: "flex",
          gap: 8,
          marginTop: "auto",
          flexDirection: isMobile ? "column" : "row",
        }}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelectEcole(ecole._id);
          }}
          style={{
            flex: 1,
            padding: isMobile ? "10px 12px" : "8px 12px",
            background: accentColor,
            color: "white",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            fontSize: 14,
          }}
        >
          Ouvrir <ArrowRight size={14} />
        </button>
        <div
          style={{
            display: "flex",
            gap: 6,
            justifyContent: isMobile ? "space-between" : "flex-start",
          }}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleStatus(ecole);
            }}
            title={ecole.statut === "active" ? "Suspendre" : "Réactiver"}
            aria-label={ecole.statut === "active" ? "Suspendre" : "Réactiver"}
            style={{
              padding: 8,
              background: "transparent",
              border: `1px solid ${borderColor}`,
              borderRadius: 8,
              color: ecole.statut === "active" ? "#F59E0B" : "#10B981",
              cursor: "pointer",
            }}
          >
            {ecole.statut === "active" ? <Ban size={16} /> : <Power size={16} />}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              // ✅ FIX — wrapper vers (ecoleId, nom)
              onDelete(ecole._id, ecole.nom);
            }}
            title="Supprimer"
            aria-label="Supprimer"
            style={{
              padding: 8,
              background: "transparent",
              border: `1px solid ${borderColor}`,
              borderRadius: 8,
              color: "#EF4444",
              cursor: "pointer",
            }}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════
// SchoolsToolbar
// ════════════════════════════════════════════════════════════════════
const SchoolsToolbar = ({
  searchTerm,
  setSearchTerm,
  schoolFilter,
  setSchoolFilter,
  schoolView,
  setSchoolView,
  onExport,
  onPrint,
  stats,
  dark,
  borderColor,
  accentColor,
  textSecondary,
  selectedCount,
  onSelectAll,
  allVisibleSelected,
  isMobile,
}) => (
  <div
    style={{
      display: "flex",
      alignItems: isMobile ? "stretch" : "center",
      gap: 12,
      marginBottom: 20,
      flexWrap: "wrap",
      flexDirection: isMobile ? "column" : "row",
    }}
  >
    <div
      style={{
        display: "flex",
        alignItems: "center",
        background: dark ? "#1E293B" : "#FFFFFF",
        borderRadius: 10,
        padding: isMobile ? "10px 12px" : "8px 12px",
        border: `1px solid ${borderColor}`,
        flex: 1,
        minWidth: isMobile ? "100%" : 200,
      }}
    >
      <Search size={18} color={textSecondary} />
      <input
        placeholder="Rechercher une école..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{
          border: "none",
          outline: "none",
          marginLeft: 8,
          fontSize: isMobile ? 16 : 14,
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
          <X size={16} color={textSecondary} />
        </button>
      )}
    </div>

    <div
      style={{
        display: "flex",
        gap: 12,
        fontSize: isMobile ? 12 : 13,
        color: textSecondary,
        flexWrap: "wrap",
        justifyContent: isMobile ? "space-between" : "flex-start",
      }}
    >
      <span>
        <strong style={{ color: dark ? "#F1F5F9" : "#1E293B" }}>
          {stats.total}
        </strong>{" "}
        total
      </span>
      <span>
        <strong style={{ color: "#10B981" }}>{stats.active}</strong> actives
      </span>
      <span>
        <strong style={{ color: "#F59E0B" }}>{stats.suspended}</strong>{" "}
        suspendues
      </span>
    </div>

    <div
      style={{
        display: "flex",
        gap: 6,
        flexDirection: isMobile ? "column" : "row",
        width: isMobile ? "100%" : "auto",
      }}
    >
      {[
        { id: "all", label: "Toutes" },
        { id: "active", label: "Actives" },
        { id: "suspendue", label: "Suspendues" },
      ].map((filter) => (
        <button
          key={filter.id}
          type="button"
          onClick={() => setSchoolFilter(filter.id)}
          aria-pressed={schoolFilter === filter.id}
          style={{
            padding: isMobile ? "10px 12px" : "8px 16px",
            borderRadius: 8,
            border: `1px solid ${borderColor}`,
            background: schoolFilter === filter.id ? accentColor : "transparent",
            color: schoolFilter === filter.id ? "white" : textSecondary,
            fontWeight: schoolFilter === filter.id ? 600 : 400,
            cursor: "pointer",
            fontSize: isMobile ? 14 : 13,
            width: isMobile ? "100%" : "auto",
          }}
        >
          {filter.label}
        </button>
      ))}
    </div>

    <div
      style={{
        display: "flex",
        gap: 6,
        justifyContent: isMobile ? "space-between" : "flex-start",
        width: isMobile ? "100%" : "auto",
      }}
    >
      <button
        type="button"
        onClick={() => setSchoolView("table")}
        title="Vue tableau"
        aria-label="Vue tableau"
        aria-pressed={schoolView === "table"}
        style={{
          padding: isMobile ? 10 : 8,
          borderRadius: 8,
          border: `1px solid ${borderColor}`,
          background: schoolView === "table" ? accentColor : "transparent",
          color: schoolView === "table" ? "white" : textSecondary,
          cursor: "pointer",
        }}
      >
        <Table size={18} />
      </button>
      <button
        type="button"
        onClick={() => setSchoolView("cards")}
        title="Vue cartes"
        aria-label="Vue cartes"
        aria-pressed={schoolView === "cards"}
        style={{
          padding: isMobile ? 10 : 8,
          borderRadius: 8,
          border: `1px solid ${borderColor}`,
          background: schoolView === "cards" ? accentColor : "transparent",
          color: schoolView === "cards" ? "white" : textSecondary,
          cursor: "pointer",
        }}
      >
        <LayoutGrid size={18} />
      </button>
    </div>

    <div
      style={{
        display: "flex",
        gap: 6,
        justifyContent: isMobile ? "space-between" : "flex-start",
        width: isMobile ? "100%" : "auto",
      }}
    >
      <button
        type="button"
        onClick={onExport}
        title="Exporter en Excel"
        aria-label="Exporter en Excel"
        style={{
          padding: isMobile ? 10 : 8,
          borderRadius: 8,
          border: `1px solid ${borderColor}`,
          background: "transparent",
          color: textSecondary,
          cursor: "pointer",
        }}
      >
        <Download size={18} />
      </button>
      <button
        type="button"
        onClick={onPrint}
        title="Imprimer"
        aria-label="Imprimer"
        style={{
          padding: isMobile ? 10 : 8,
          borderRadius: 8,
          border: `1px solid ${borderColor}`,
          background: "transparent",
          color: textSecondary,
          cursor: "pointer",
        }}
      >
        <Printer size={18} />
      </button>
    </div>

    {selectedCount > 0 && (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
          width: isMobile ? "100%" : "auto",
          justifyContent: isMobile ? "space-between" : "flex-start",
        }}
      >
        <span style={{ fontSize: 13, color: textSecondary }}>
          {selectedCount} sélectionnée(s)
        </span>
        <button
          type="button"
          onClick={onSelectAll}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: "6px 10px",
            background: "transparent",
            border: `1px solid ${borderColor}`,
            borderRadius: 6,
            cursor: "pointer",
            fontSize: 13,
            color: dark ? "#F1F5F9" : "#1E293B",
          }}
        >
          {allVisibleSelected ? (
            <CheckSquare size={14} />
          ) : (
            <Square size={14} />
          )}{" "}
          Tout
        </button>
      </div>
    )}
  </div>
);

// ════════════════════════════════════════════════════════════════════
// NotificationsPanel
// ════════════════════════════════════════════════════════════════════
const NotificationsPanel = ({
  pendingUsers,
  dark,
  borderColor,
  textPrimary,
  textSecondary,
  isMobile,
}) => (
  <div
    className="sad-fade-in"
    style={{
      position: "absolute",
      top: 40,
      right: 0,
      width: isMobile ? 250 : 300,
      background: dark ? "#1E293B" : "#FFFFFF",
      borderRadius: 12,
      boxShadow: dark
        ? "0 4px 12px rgba(0,0,0,0.5)"
        : "0 4px 12px rgba(0,0,0,0.15)",
      border: `1px solid ${borderColor}`,
      zIndex: 50,
      maxHeight: 350,
      overflowY: "auto",
      padding: 12,
    }}
  >
    {pendingUsers.length === 0 ? (
      <div
        style={{
          textAlign: "center",
          padding: 20,
          color: textSecondary,
          fontSize: 13,
        }}
      >
        Aucune notification
      </div>
    ) : (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {pendingUsers.slice(0, 10).map((u) => (
          <div
            key={u._id}
            style={{
              fontSize: 12.5,
              color: textPrimary,
              padding: "6px 8px",
              borderRadius: 6,
              background: dark ? "#0F172A" : "#F8FAFC",
            }}
          >
            <strong>{u.nom}</strong> ({u.role}) en attente
          </div>
        ))}
      </div>
    )}
  </div>
);

// ════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ════════════════════════════════════════════════════════════════════
export function SuperAdminDashboard({ onSelectEcole, user, onLogout }) {
  const { dark, toggle } = useStyles();
  const { confirm, dialogProps } = useConfirm();
  const isMobile = useIsMobile();
  const isTablet = useMediaQuery("(min-width: 769px) and (max-width: 1024px)");
  const isDesktop = useMediaQuery("(min-width: 1025px)");

  const userId = user?._id;

  // ════════════════════════════════════════════════════════════════
  // Store (Zustand)
  // ════════════════════════════════════════════════════════════════
  const activeSection = useAppStore((s) => s.superadminActiveSection);
  const setActiveSection = useAppStore((s) => s.setSuperadminActiveSection);
  const searchTerm = useAppStore((s) => s.superadminSearchTerm);
  const setSearchTerm = useAppStore((s) => s.setSuperadminSearchTerm);
  const schoolFilter = useAppStore((s) => s.superadminSchoolFilter);
  const setSchoolFilter = useAppStore((s) => s.setSuperadminSchoolFilter);
  const schoolView = useAppStore((s) => s.superadminSchoolView);
  const setSchoolView = useAppStore((s) => s.setSuperadminSchoolView);
  const pendingFilterRole = useAppStore((s) => s.superadminPendingFilterRole);
  const setPendingFilterRole = useAppStore((s) => s.setSuperadminPendingFilterRole);
  const pendingSearch = useAppStore((s) => s.superadminPendingSearch);
  const setPendingSearch = useAppStore((s) => s.setSuperadminPendingSearch);
  const currentPage = useAppStore((s) => s.superadminCurrentPage);
  const setCurrentPage = useAppStore((s) => s.setSuperadminCurrentPage);
  const selectedSchoolIdsArray = useAppStore((s) => s.superadminSelectedSchoolIds);
  const setSelectedSchoolIdsArray = useAppStore((s) => s.setSuperadminSelectedSchoolIds);

  const selectedSchoolIds = useMemo(
    () => new Set(selectedSchoolIdsArray),
    [selectedSchoolIdsArray]
  );

  // ════════════════════════════════════════════════════════════════
  // États locaux
  // ════════════════════════════════════════════════════════════════
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [nouveauNom, setNouveauNom] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  const deferredSearchTerm = useDeferredValue(searchTerm);
  const pageSize = DEFAULT_PAGE_SIZE;

  // ════════════════════════════════════════════════════════════════
  // Queries
  // ════════════════════════════════════════════════════════════════
  const ecolesAvecUsersQuery = useQuery(
    api.ecoles.listWithUserCount,
    userId ? { userId } : "skip"
  );
  const globalStatsQuery = useQuery(
    api.stats.globalStats,
    userId ? { userId } : "skip"
  );
  const pendingUsersQuery = useQuery(
    api.users.listAllPendingUsers,
    userId ? { userId } : "skip"
  );

  const ecolesAvecUsers = useMemo(
    () => ecolesAvecUsersQuery ?? [],
    [ecolesAvecUsersQuery]
  );
  const globalStats = useMemo(() => globalStatsQuery ?? {}, [globalStatsQuery]);
  const pendingUsers = useMemo(
    () => pendingUsersQuery ?? [],
    [pendingUsersQuery]
  );

  // ✅ FIX — `isLoading` ne bloque QUE les sections qui en ont besoin.
  // Les onglets "settings", "superadmins" n'ont pas besoin des queries ecoles/stats.
  const needsSchoolData =
    activeSection === "overview" ||
    activeSection === "schools" ||
    activeSection === "pending";

  const isLoading =
    needsSchoolData &&
    (ecolesAvecUsersQuery === undefined ||
      globalStatsQuery === undefined ||
      pendingUsersQuery === undefined);

  // ════════════════════════════════════════════════════════════════
  // Mutations
  // ════════════════════════════════════════════════════════════════
  const addEcole = useMutation(api.ecoles.add);
  const removeEcole = useMutation(api.ecoles.remove);
  const suspendEcole = useMutation(api.ecoles.suspendEcole);
  const reactiverEcole = useMutation(api.ecoles.reactiverEcole);
  const updateEcole = useMutation(api.ecoles.update);

  // ════════════════════════════════════════════════════════════════
  // Handlers
  // ════════════════════════════════════════════════════════════════
  const refreshQueries = useCallback(async () => {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 500));
    setRefreshing(false);
    toast.success("Données actualisées");
  }, []);

  const handleAddEcole = useCallback(
    async (e) => {
      e.preventDefault();
      if (!userId) {
        toast.error("Session invalide.");
        return;
      }
      if (!nouveauNom.trim()) return;
      try {
        await addEcole({ nom: nouveauNom.trim(), userId });
        setNouveauNom("");
        setShowCreateModal(false);
        toast.success("École créée avec succès");
      } catch (err) {
        toast.error(
          "Impossible de créer : " + (err?.message || "erreur inconnue")
        );
      }
    },
    [addEcole, nouveauNom, userId]
  );

  const handleDeleteEcole = useCallback(
    async (ecoleId, nom) => {
      if (!userId) {
        toast.error("Session invalide.");
        return;
      }
      const ok = await confirm(
        "Supprimer l'école",
        `Voulez-vous vraiment supprimer "${nom}" ? Cette action est irréversible.`
      );
      if (!ok) return;
      try {
        await removeEcole({ ecoleId, userId });
        toast.success("École supprimée");
      } catch (err) {
        toast.error(
          "Impossible de supprimer : " + (err?.message || "erreur inconnue")
        );
      }
    },
    [confirm, removeEcole, userId]
  );

  // ✅ FIX — adaptateur pour SchoolTable (qui envoie `(ecole)` objet)
  const handleDeleteEcoleFromTable = useCallback(
    (ecole) => handleDeleteEcole(ecole._id, ecole.nom),
    [handleDeleteEcole]
  );

  const handleToggleStatus = useCallback(
    async (ecole) => {
      if (!userId) {
        toast.error("Session invalide.");
        return;
      }
      const action = ecole.statut === "active" ? "suspendre" : "réactiver";
      const ok = await confirm(
        action === "suspendre" ? "Suspendre l'école" : "Réactiver l'école",
        `Voulez-vous ${action} l'école "${ecole.nom}" ?`
      );
      if (!ok) return;
      try {
        if (ecole.statut === "active") {
          await suspendEcole({ ecoleId: ecole._id, userId });
        } else {
          await reactiverEcole({ ecoleId: ecole._id, userId });
        }
        toast.success(`École ${action}`);
      } catch (err) {
        toast.error(
          "Impossible de changer le statut : " +
            (err?.message || "erreur inconnue")
        );
      }
    },
    [confirm, suspendEcole, reactiverEcole, userId]
  );

  const handleUpdateNom = useCallback(
    async (ecoleId, nom) => {
      if (!userId) {
        toast.error("Session invalide.");
        return;
      }
      try {
        await updateEcole({ ecoleId, nom, userId });
        toast.success("Nom mis à jour");
      } catch (err) {
        toast.error(
          "Impossible de mettre à jour : " + (err?.message || "erreur inconnue")
        );
      }
    },
    [updateEcole, userId]
  );

  // ════════════════════════════════════════════════════════════════
  // Navigation
  // ════════════════════════════════════════════════════════════════
  const sections = useMemo(
    () => [
      { id: "overview", label: "Vue d'ensemble", icon: <LayoutDashboard size={20} /> },
      { id: "schools", label: "Écoles", icon: <School size={20} />, badge: ecolesAvecUsers.length },
      { id: "pending", label: "Demandes", icon: <Clock size={20} />, badge: pendingUsers.length, badgeColor: "#F59E0B" },
      { id: "superadmins", label: "Super Admins", icon: <ShieldCheck size={20} /> },
      { id: "settings", label: "Paramètres", icon: <Settings size={20} /> },
    ],
    [ecolesAvecUsers.length, pendingUsers.length]
  );

  // ════════════════════════════════════════════════════════════════
  // Filtrage
  // ════════════════════════════════════════════════════════════════
  const filteredEcoles = useMemo(() => {
    let result = ecolesAvecUsers;
    if (schoolFilter === "active") {
      result = result.filter((e) => e.statut === "active");
    } else if (schoolFilter === "suspendue") {
      result = result.filter((e) => e.statut === "suspendue");
    }
    if (deferredSearchTerm.trim()) {
      const q = deferredSearchTerm.toLowerCase();
      result = result.filter(
        (e) =>
          (e.nom ?? "").toLowerCase().includes(q) ||
          (e.code ?? "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [ecolesAvecUsers, deferredSearchTerm, schoolFilter]);

  const schoolStats = useMemo(
    () => ({
      total: ecolesAvecUsers.length,
      active: ecolesAvecUsers.filter((e) => e.statut === "active").length,
      suspended: ecolesAvecUsers.filter((e) => e.statut === "suspendue").length,
    }),
    [ecolesAvecUsers]
  );

  // ════════════════════════════════════════════════════════════════
  // Pagination
  // ════════════════════════════════════════════════════════════════
  const totalPages = Math.ceil(filteredEcoles.length / pageSize) || 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedEcoles = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredEcoles.slice(start, start + pageSize);
  }, [filteredEcoles, safeCurrentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [schoolFilter, deferredSearchTerm, setCurrentPage]);

  // ════════════════════════════════════════════════════════════════
  // Sélection
  // ════════════════════════════════════════════════════════════════
  const toggleSchoolSelection = useCallback(
    (id) => {
      const newSet = new Set(selectedSchoolIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedSchoolIdsArray(Array.from(newSet));
    },
    [selectedSchoolIds, setSelectedSchoolIdsArray]
  );

  // ✅ FIX — accepte `ids` en argument (SchoolTable) OU utilise la pagination locale (SchoolCard)
  const toggleSelectAllVisible = useCallback(
    (idsFromTable) => {
      const visibleIds =
        idsFromTable && idsFromTable.length > 0
          ? idsFromTable
          : paginatedEcoles.map((e) => e._id);
      const allSelected = visibleIds.every((id) => selectedSchoolIds.has(id));
      const newSet = new Set(selectedSchoolIds);
      if (allSelected) {
        visibleIds.forEach((id) => newSet.delete(id));
      } else {
        visibleIds.forEach((id) => newSet.add(id));
      }
      setSelectedSchoolIdsArray(Array.from(newSet));
    },
    [paginatedEcoles, selectedSchoolIds, setSelectedSchoolIdsArray]
  );

  const clearSchoolSelection = useCallback(() => {
    setSelectedSchoolIdsArray([]);
  }, [setSelectedSchoolIdsArray]);

  // ════════════════════════════════════════════════════════════════
  // Bulk actions
  // ════════════════════════════════════════════════════════════════
  const bulkSuspendSchools = useCallback(async () => {
    if (!userId) {
      toast.error("Session invalide.");
      return;
    }
    const ids = Array.from(selectedSchoolIds);
    if (ids.length === 0) return;
    const ok = await confirm(
      "Suspendre les écoles",
      `Suspendre ${ids.length} école(s) ?`
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
      clearSchoolSelection();
    } finally {
      setBulkProcessing(false);
    }
  }, [userId, selectedSchoolIds, confirm, suspendEcole, clearSchoolSelection]);

  const bulkActivateSchools = useCallback(async () => {
    if (!userId) {
      toast.error("Session invalide.");
      return;
    }
    const ids = Array.from(selectedSchoolIds);
    if (ids.length === 0) return;
    const ok = await confirm(
      "Activer les écoles",
      `Activer ${ids.length} école(s) ?`
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
      clearSchoolSelection();
    } finally {
      setBulkProcessing(false);
    }
  }, [userId, selectedSchoolIds, confirm, reactiverEcole, clearSchoolSelection]);

  const bulkDeleteSchools = useCallback(async () => {
    if (!userId) {
      toast.error("Session invalide.");
      return;
    }
    const ids = Array.from(selectedSchoolIds);
    if (ids.length === 0) return;
    const ok = await confirm(
      "Supprimer les écoles",
      `Attention : ${ids.length} école(s) et leurs données seront supprimées définitivement. Confirmer ?`
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
      clearSchoolSelection();
    } finally {
      setBulkProcessing(false);
    }
  }, [userId, selectedSchoolIds, confirm, removeEcole, clearSchoolSelection]);

  // ════════════════════════════════════════════════════════════════
  // Export / Print
  // ════════════════════════════════════════════════════════════════
  const handleExportExcel = useCallback(async () => {
    try {
      const XLSX = await import("xlsx");
      const data = filteredEcoles.map((e) => ({
        Nom: e.nom,
        Code: e.code || "N/A",
        Statut: e.statut === "active" ? "Active" : "Suspendue",
        Utilisateurs: e.userCount ?? 0,
        "Créée le": new Date(e._creationTime).toLocaleDateString("fr-FR"),
      }));
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Écoles");
      XLSX.writeFile(workbook, "ecoles.xlsx");
      toast.success("Export Excel généré");
    } catch (err) {
      toast.error(
        "Impossible de générer l'export : " + (err?.message || "erreur inconnue")
      );
    }
  }, [filteredEcoles]);

  const handlePrint = useCallback(() => window.print(), []);

  // ════════════════════════════════════════════════════════════════
  // Couleurs
  // ════════════════════════════════════════════════════════════════
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#CBD5E1" : "#64748B";
  const borderColor = dark ? "#334155" : "#E2E8F0";
  const accentColor = dark ? "#818CF8" : "#4F46E5";
  const sidebarBg = dark ? "#0F172A" : "#FFFFFF";

  const sidebarWidth = isDesktop ? 260 : isTablet ? 220 : 280;

  // ════════════════════════════════════════════════════════════════
  // RENDU
  // ════════════════════════════════════════════════════════════════
  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        width: "100%",
        maxWidth: "100%",
        margin: 0,
      }}
    >
      {SadKeyframes}

      {isMobile && mobileNavOpen && (
        <div
          className="sad-sidebar-overlay"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* ═══════════ Sidebar ═══════════ */}
      <aside
        className={`${
          isMobile ? "sad-mobile-sidebar" : "sad-desktop-sidebar"
        } ${mobileNavOpen ? "open" : ""} sad-no-print`}
        style={{
          width: isMobile ? "80%" : sidebarWidth,
          maxWidth: isMobile ? 300 : undefined,
          minHeight: isMobile ? "100%" : "100vh",
          background: sidebarBg,
          borderRight: `1px solid ${borderColor}`,
          padding: isMobile ? "16px 12px" : "24px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          position: isMobile ? "fixed" : "sticky",
          top: 0,
          left: 0,
          zIndex: isMobile ? 50 : undefined,
          transition: "transform 0.3s ease",
        }}
      >
        <div style={{ marginBottom: isMobile ? 16 : 24, paddingLeft: 8 }}>
          <h2
            style={{
              fontSize: isDesktop ? 18 : 16,
              fontWeight: 700,
              color: textPrimary,
            }}
          >
            Super Admin
          </h2>
          <p style={{ fontSize: 13, color: textSecondary }}>{user?.nom}</p>
        </div>

        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => {
              setActiveSection(section.id);
              if (isMobile) setMobileNavOpen(false);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: isMobile ? "10px 12px" : "12px 16px",
              borderRadius: 10,
              border: "none",
              background:
                activeSection === section.id
                  ? dark ? "#1E293B" : "#EEF2FF"
                  : "transparent",
              color: activeSection === section.id ? accentColor : textSecondary,
              fontWeight: activeSection === section.id ? 600 : 400,
              cursor: "pointer",
              transition: "background 0.2s, color 0.2s",
              fontSize: isDesktop ? 15 : 14,
              textAlign: "left",
              width: "100%",
            }}
          >
            {section.icon}
            <span style={{ flex: 1 }}>{section.label}</span>
            {section.badge !== undefined && section.badge > 0 && (
              <span
                style={{
                  background: section.badgeColor || "#EF4444",
                  color: "white",
                  borderRadius: "50%",
                  minWidth: 20,
                  height: 20,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {section.badge}
              </span>
            )}
          </button>
        ))}

        <div
          style={{
            marginTop: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <button
            type="button"
            onClick={toggle}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 12px",
              borderRadius: 10,
              border: "none",
              background: "transparent",
              color: textSecondary,
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            {dark ? <Sun size={20} /> : <Moon size={20} />}
            {dark ? "Mode clair" : "Mode sombre"}
          </button>
          <button
            type="button"
            onClick={onLogout}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 12px",
              borderRadius: 10,
              border: "none",
              background: "transparent",
              color: "#EF4444",
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            <LogOut size={20} />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* ═══════════ Main ═══════════ */}
      <main
        className="sad-print-area"
        style={{
          flex: 1,
          padding: isMobile ? "16px 12px" : isTablet ? "24px" : "24px 32px",
          minWidth: 0,
          width: "100%",
        }}
      >
        {/* En-tête */}
        <div
          className="sad-no-print"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 24,
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="sad-mobile-menu-btn"
            style={{
              background: "none",
              border: "none",
              color: textPrimary,
              cursor: "pointer",
              padding: 8,
            }}
            aria-label="Ouvrir le menu"
          >
            <Menu size={24} />
          </button>

          <h1
            style={{
              fontSize: isMobile ? 20 : 24,
              fontWeight: 700,
              color: textPrimary,
              flex: 1,
            }}
          >
            {sections.find((s) => s.id === activeSection)?.label}
          </h1>

          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              flexWrap: "wrap",
              justifyContent: isMobile ? "flex-end" : "flex-start",
            }}
          >
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: isMobile ? "10px 12px" : "8px 14px",
                background: accentColor,
                color: "white",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                fontWeight: 600,
                fontSize: isMobile ? 14 : 13,
              }}
            >
              <Plus size={16} /> Nouvelle école
            </button>

            <button
              type="button"
              onClick={refreshQueries}
              disabled={refreshing || isLoading}
              title="Actualiser"
              aria-label="Actualiser les données"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: 8,
                background: "transparent",
                color: textSecondary,
                border: `1px solid ${borderColor}`,
                borderRadius: 8,
                cursor: refreshing ? "not-allowed" : "pointer",
                opacity: refreshing ? 0.5 : 1,
              }}
            >
              <RefreshCw size={18} className={refreshing ? "sad-spin" : ""} />
            </button>

            <div style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => setShowNotifications(!showNotifications)}
                style={{
                  display: "flex",
                  padding: 8,
                  background: "transparent",
                  border: "none",
                  color: textSecondary,
                  cursor: "pointer",
                }}
                title="Notifications"
                aria-label="Notifications"
              >
                <Bell size={20} />
                {pendingUsers.length > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: 0,
                      right: 0,
                      background: "#EF4444",
                      color: "white",
                      borderRadius: "50%",
                      minWidth: 16,
                      height: 16,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "0 4px",
                    }}
                  >
                    {pendingUsers.length}
                  </span>
                )}
              </button>
              {showNotifications && (
                <NotificationsPanel
                  pendingUsers={pendingUsers}
                  dark={dark}
                  borderColor={borderColor}
                  textPrimary={textPrimary}
                  textSecondary={textSecondary}
                  isMobile={isMobile}
                />
              )}
            </div>

            <div style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => setShowUserMenu(!showUserMenu)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 10px",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: textPrimary,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: accentColor,
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: 14,
                  }}
                >
                  {user?.nom?.charAt(0) || "?"}
                </div>
                {!isMobile && (
                  <span style={{ fontSize: 14, fontWeight: 500 }}>
                    {user?.nom}
                  </span>
                )}
              </button>
              {showUserMenu && (
                <div
                  className="sad-fade-in"
                  style={{
                    position: "absolute",
                    top: 40,
                    right: 0,
                    width: 160,
                    background: dark ? "#1E293B" : "#FFFFFF",
                    borderRadius: 12,
                    boxShadow: dark
                      ? "0 4px 12px rgba(0,0,0,0.5)"
                      : "0 4px 12px rgba(0,0,0,0.15)",
                    border: `1px solid ${borderColor}`,
                    zIndex: 50,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setActiveSection("settings");
                      setShowUserMenu(false);
                    }}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: "10px 16px",
                      background: "none",
                      border: "none",
                      color: textPrimary,
                      cursor: "pointer",
                      fontSize: 14,
                    }}
                  >
                    Paramètres
                  </button>
                  <button
                    type="button"
                    onClick={onLogout}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: "10px 16px",
                      background: "none",
                      border: "none",
                      color: "#EF4444",
                      cursor: "pointer",
                      fontSize: 14,
                    }}
                  >
                    Déconnexion
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Contenu actif */}
        <div key={activeSection} className="sad-fade-in">
          {isLoading ? (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                padding: 40,
              }}
            >
              <Loader
                size={40}
                className="sad-spin"
                style={{ color: accentColor }}
              />
            </div>
          ) : (
            <>
              {/* ═══════════ OVERVIEW ═══════════ */}
              {activeSection === "overview" && (
                <OverviewTab
                  globalStats={globalStats}
                  ecolesAvecUsers={ecolesAvecUsers}
                  onNavigate={setActiveSection}
                  onRefresh={refreshQueries}
                  user={user}
                />
              )}

              {/* ═══════════ SCHOOLS ═══════════ */}
              {activeSection === "schools" && (
                <div>
                  <SchoolsToolbar
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    schoolFilter={schoolFilter}
                    setSchoolFilter={setSchoolFilter}
                    schoolView={schoolView}
                    setSchoolView={setSchoolView}
                    onExport={handleExportExcel}
                    onPrint={handlePrint}
                    stats={schoolStats}
                    dark={dark}
                    borderColor={borderColor}
                    accentColor={accentColor}
                    textSecondary={textSecondary}
                    selectedCount={selectedSchoolIds.size}
                    onSelectAll={toggleSelectAllVisible}
                    allVisibleSelected={
                      paginatedEcoles.length > 0 &&
                      paginatedEcoles.every((e) => selectedSchoolIds.has(e._id))
                    }
                    isMobile={isMobile}
                  />

                  {selectedSchoolIds.size > 0 && (
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        alignItems: "center",
                        flexWrap: "wrap",
                        marginBottom: 16,
                        flexDirection: isMobile ? "column" : "row",
                        width: "100%",
                      }}
                    >
                      <button
                        type="button"
                        onClick={bulkActivateSchools}
                        disabled={bulkProcessing}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 4,
                          padding: "6px 12px",
                          background: "#10B981",
                          color: "white",
                          border: "none",
                          borderRadius: 6,
                          cursor: bulkProcessing ? "not-allowed" : "pointer",
                          fontSize: 13,
                          width: isMobile ? "100%" : "auto",
                          opacity: bulkProcessing ? 0.7 : 1,
                        }}
                      >
                        <UserPlus size={14} /> Activer
                      </button>
                      <button
                        type="button"
                        onClick={bulkSuspendSchools}
                        disabled={bulkProcessing}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 4,
                          padding: "6px 12px",
                          background: "#F59E0B",
                          color: "white",
                          border: "none",
                          borderRadius: 6,
                          cursor: bulkProcessing ? "not-allowed" : "pointer",
                          fontSize: 13,
                          width: isMobile ? "100%" : "auto",
                          opacity: bulkProcessing ? 0.7 : 1,
                        }}
                      >
                        <UserMinus size={14} /> Suspendre
                      </button>
                      <button
                        type="button"
                        onClick={bulkDeleteSchools}
                        disabled={bulkProcessing}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 4,
                          padding: "6px 12px",
                          background: "#EF4444",
                          color: "white",
                          border: "none",
                          borderRadius: 6,
                          cursor: bulkProcessing ? "not-allowed" : "pointer",
                          fontSize: 13,
                          width: isMobile ? "100%" : "auto",
                          opacity: bulkProcessing ? 0.7 : 1,
                        }}
                      >
                        <Trash2 size={14} /> Supprimer
                      </button>
                      <button
                        type="button"
                        onClick={clearSchoolSelection}
                        disabled={bulkProcessing}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 4,
                          padding: "6px 12px",
                          background: "transparent",
                          border: `1px solid ${borderColor}`,
                          borderRadius: 6,
                          cursor: "pointer",
                          fontSize: 13,
                          color: textPrimary,
                          width: isMobile ? "100%" : "auto",
                        }}
                      >
                        <X size={14} /> Annuler
                      </button>
                    </div>
                  )}

                  {schoolView === "table" ? (
                    <>
                      <SchoolTable
                        ecoles={paginatedEcoles}
                        onSelectEcole={onSelectEcole}
                        // ✅ FIX — adaptateur : SchoolTable envoie `(ecole)`, on re-route vers `(ecoleId, nom)`
                        onDelete={handleDeleteEcoleFromTable}
                        onToggleStatus={handleToggleStatus}
                        onUpdateNom={handleUpdateNom}
                        user={user}
                        selectable
                        selectedIds={selectedSchoolIds}
                        onToggleSelect={toggleSchoolSelection}
                        onToggleSelectAll={toggleSelectAllVisible}
                      />
                      {totalPages > 1 && (
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "center",
                            gap: 8,
                            marginTop: 16,
                          }}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setCurrentPage(Math.max(1, safeCurrentPage - 1))
                            }
                            disabled={safeCurrentPage === 1}
                            style={{
                              padding: "8px 12px",
                              border: `1px solid ${borderColor}`,
                              borderRadius: 8,
                              background: "transparent",
                              cursor:
                                safeCurrentPage === 1 ? "not-allowed" : "pointer",
                              color: textPrimary,
                              opacity: safeCurrentPage === 1 ? 0.5 : 1,
                            }}
                            aria-label="Page précédente"
                          >
                            <ChevronLeft size={16} /> Précédent
                          </button>
                          <span
                            style={{ padding: "8px 12px", color: textSecondary }}
                          >
                            Page {safeCurrentPage} / {totalPages}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setCurrentPage(
                                Math.min(totalPages, safeCurrentPage + 1)
                              )
                            }
                            disabled={safeCurrentPage === totalPages}
                            style={{
                              padding: "8px 12px",
                              border: `1px solid ${borderColor}`,
                              borderRadius: 8,
                              background: "transparent",
                              cursor:
                                safeCurrentPage === totalPages
                                  ? "not-allowed"
                                  : "pointer",
                              color: textPrimary,
                              opacity: safeCurrentPage === totalPages ? 0.5 : 1,
                            }}
                            aria-label="Page suivante"
                          >
                            Suivant <ChevronRight size={16} />
                          </button>
                        </div>
                      )}
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
                        {paginatedEcoles.map((ecole) => (
                          <SchoolCard
                            key={ecole._id}
                            ecole={ecole}
                            onSelectEcole={onSelectEcole}
                            onToggleStatus={handleToggleStatus}
                            onDelete={handleDeleteEcole}
                            dark={dark}
                            borderColor={borderColor}
                            accentColor={accentColor}
                            textPrimary={textPrimary}
                            textSecondary={textSecondary}
                            selected={selectedSchoolIds.has(ecole._id)}
                            onToggleSelect={toggleSchoolSelection}
                            isMobile={isMobile}
                          />
                        ))}
                      </div>
                      {totalPages > 1 && (
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "center",
                            gap: 8,
                            marginTop: 16,
                          }}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setCurrentPage(Math.max(1, safeCurrentPage - 1))
                            }
                            disabled={safeCurrentPage === 1}
                            style={{
                              padding: "8px 12px",
                              border: `1px solid ${borderColor}`,
                              borderRadius: 8,
                              background: "transparent",
                              cursor:
                                safeCurrentPage === 1 ? "not-allowed" : "pointer",
                              color: textPrimary,
                              opacity: safeCurrentPage === 1 ? 0.5 : 1,
                            }}
                            aria-label="Page précédente"
                          >
                            <ChevronLeft size={16} /> Précédent
                          </button>
                          <span
                            style={{ padding: "8px 12px", color: textSecondary }}
                          >
                            Page {safeCurrentPage} / {totalPages}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setCurrentPage(
                                Math.min(totalPages, safeCurrentPage + 1)
                              )
                            }
                            disabled={safeCurrentPage === totalPages}
                            style={{
                              padding: "8px 12px",
                              border: `1px solid ${borderColor}`,
                              borderRadius: 8,
                              background: "transparent",
                              cursor:
                                safeCurrentPage === totalPages
                                  ? "not-allowed"
                                  : "pointer",
                              color: textPrimary,
                              opacity: safeCurrentPage === totalPages ? 0.5 : 1,
                            }}
                            aria-label="Page suivante"
                          >
                            Suivant <ChevronRight size={16} />
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* ═══════════ PENDING ═══════════ */}
              {activeSection === "pending" && (
                <PendingTab
                  pendingUsers={pendingUsers}
                  user={user}
                  searchTerm={pendingSearch}
                  setSearchTerm={setPendingSearch}
                  filterRole={pendingFilterRole}
                  setFilterRole={setPendingFilterRole}
                />
              )}

              {/* ═══════════ SUPERADMINS ═══════════ */}
              {activeSection === "superadmins" && <GestionSuperAdmins user={user} />}

              {/* ═══════════ SETTINGS ═══════════ */}
              {activeSection === "settings" && <SettingsTab user={user} />}
            </>
          )}
        </div>
      </main>

      {/* ═══════════ Modale création ═══════════ */}
      {showCreateModal && (
        <div
          className="sad-fade-in"
          role="dialog"
          aria-modal="true"
          aria-label="Créer une nouvelle école"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: isMobile ? 12 : 16,
          }}
          onClick={() => setShowCreateModal(false)}
        >
          <div
            style={{
              background: dark ? "#1E293B" : "#FFFFFF",
              borderRadius: 16,
              padding: isMobile ? 16 : 24,
              width: "100%",
              maxWidth: isMobile ? "95%" : 400,
              boxShadow: dark
                ? "0 20px 40px rgba(0,0,0,0.5)"
                : "0 20px 40px rgba(0,0,0,0.2)",
              border: `1px solid ${borderColor}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: isMobile ? 18 : 20,
                  fontWeight: 600,
                  color: textPrimary,
                }}
              >
                Nouvelle école
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: textSecondary,
                }}
                aria-label="Fermer"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleAddEcole}>
              <input
                placeholder="Nom de l'école"
                value={nouveauNom}
                onChange={(e) => setNouveauNom(e.target.value)}
                style={{
                  width: "100%",
                  padding: isMobile ? "12px 14px" : "10px 14px",
                  border: `1px solid ${borderColor}`,
                  borderRadius: 8,
                  fontSize: isMobile ? 16 : 14,
                  outline: "none",
                  background: dark ? "#0F172A" : "#F9FAFB",
                  color: textPrimary,
                  marginBottom: 16,
                  boxSizing: "border-box",
                }}
                autoFocus
                aria-label="Nom de l'école"
              />
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  flexDirection: isMobile ? "column" : "row",
                }}
              >
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: isMobile ? "12px 16px" : "10px 16px",
                    background: accentColor,
                    color: "white",
                    border: "none",
                    borderRadius: 8,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontSize: isMobile ? 16 : 14,
                  }}
                >
                  Créer
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    padding: isMobile ? "12px 16px" : "10px 16px",
                    background: "transparent",
                    border: `1px solid ${borderColor}`,
                    borderRadius: 8,
                    color: textSecondary,
                    cursor: "pointer",
                    fontSize: isMobile ? 16 : 14,
                  }}
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog {...dialogProps} />
    </div>
  );
}