// src/components/SuperAdmin/SuperAdminDashboardV2.jsx
import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  LayoutDashboard, School, CreditCard, Clock, ShieldCheck, Settings, Loader,
  DollarSign, Megaphone, Activity, AlertTriangle,
} from "lucide-react";
import { useStyles } from "@/styles/theme";
import { useConfirm } from "@/hooks/useConfirm";
import { useAppStore } from "@/store/appStore";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { GestionAbonnements } from "@/components/GestionAbonnements";
import { GestionSuperAdmins } from "./GestionSuperAdmins";
import { SettingsTab } from "./SettingsTab";
import { SuperAdminSidebar } from "../SuperAdmin/SuperAdminSidebar";
import { SuperAdminHeader } from "./SuperAdminHeader";
import { NotificationsPanel } from "./NotificationsPanel";
import { OverviewSection } from "./sections/OverviewSection";
import { SchoolsSection } from "./sections/SchoolsSection";
import { PendingSection } from "./sections/PendingSection";
import { FinancesSection } from "../SuperAdmin/sections/FinancesSection";
import { AnnoncesSection } from "./sections/AnnoncesSection";
import { AuditSection } from "./sections/AuditSection";
import { EcoleDetailPage } from "./ecole/EcoleDetailPage";
import { ImpayesSection } from "./sections/ImpayesSection";

// ════════════════════════════════════════════════════════════════════
// CONFIG DES SECTIONS — permissions granulaires
// Seul "superadmins" reste OWNER strict.
// ════════════════════════════════════════════════════════════════════
const SECTIONS_CONFIG = [
  {
    id: "overview",
    label: "Vue d'ensemble",
    icon: <LayoutDashboard size={20} />,
    module: "stats",
    legacyPermission: "gestion_statistiques",
  },
  {
    id: "schools",
    label: "Écoles",
    icon: <School size={20} />,
    module: "ecoles",
    legacyPermission: "gestion_ecoles",
  },
  {
    id: "abonnements",
    label: "Abonnements",
    icon: <CreditCard size={20} />,
    module: "abonnements",
  },
  {
    id: "finances",
    label: "Finances",
    icon: <DollarSign size={20} />,
    module: "finances",
  },
  {
    id: "impayes",
    label: "Impayés",
    icon: <AlertTriangle size={20} />,
    module: "impayes",
  },
  {
    id: "annonces",
    label: "Annonces",
    icon: <Megaphone size={20} />,
    module: "annonces",
  },
  {
    id: "audit",
    label: "Journal d'audit",
    icon: <Activity size={20} />,
    module: "audit",
  },
  {
    id: "pending",
    label: "Demandes",
    icon: <Clock size={20} />,
    module: "demandes",
    legacyPermission: "gestion_demandes",
  },
  // 🔒 OWNER strict (gestion des super admins = sensible)
  {
    id: "superadmins",
    label: "Super Admins",
    icon: <ShieldCheck size={20} />,
    ownerOnly: true,
  },
  {
    id: "settings",
    label: "Paramètres",
    icon: <Settings size={20} />,
    module: "parametres",
    legacyPermission: "gestion_parametres",
  },
];

// ════════════════════════════════════════════════════════════════════
// HELPERS — Permissions
// ════════════════════════════════════════════════════════════════════

const LEGACY_TO_MODULE = {
  gestion_statistiques: "stats",
  gestion_ecoles: "ecoles",
  gestion_demandes: "demandes",
  gestion_utilisateurs: "users",
  gestion_parametres: "parametres",
};

function checkIsOwner(user) {
  if (!user) return false;
  if (user.role === "admin" && !user.ecoleId) return true;
  return user.role === "superAdmin" && user.isOwner === true;
}

/**
 * Accès à une section (legacy OU granulaire).
 */
function checkSectionAccess(user, section) {
  if (!user) return false;
  if (checkIsOwner(user)) return true;
  if (user.role !== "superAdmin") return false;

  const perms = user.permissions ?? [];

  if (section.legacyPermission && perms.includes(section.legacyPermission)) {
    return true;
  }

  if (section.module) {
    const prefix = `${section.module}.`;
    if (perms.some((p) => p.startsWith(prefix))) return true;
  }

  return false;
}

/**
 * Vérifie une permission (large : au moins une action du module).
 */
function checkHasPermission(user, permission) {
  if (!user) return false;
  if (checkIsOwner(user)) return true;
  if (user.role !== "superAdmin") return false;

  const perms = user.permissions ?? [];

  if (perms.includes(permission)) return true;

  if (permission.includes(".")) {
    const [module] = permission.split(".");
    if (perms.some((p) => p.startsWith(`${module}.`))) return true;
  }

  const mappedModule = LEGACY_TO_MODULE[permission];
  if (mappedModule && perms.some((p) => p.startsWith(`${mappedModule}.`))) {
    return true;
  }

  return false;
}

/**
 * Vérifie une permission EXACTE (pour write/delete).
 * Legacy = write complet pour le module.
 */
function checkExactPermission(user, permission) {
  if (!user) return false;
  if (checkIsOwner(user)) return true;
  if (user.role !== "superAdmin") return false;

  const perms = user.permissions ?? [];

  if (perms.includes(permission)) return true;

  const [module, action] = permission.split(".");
  if (["write", "delete"].includes(action)) {
    for (const [legacy, mod] of Object.entries(LEGACY_TO_MODULE)) {
      if (mod === module && perms.includes(legacy)) return true;
    }
  }

  return false;
}

function getVisibleSections(user) {
  const isOwner = checkIsOwner(user);
  return SECTIONS_CONFIG.filter((s) => {
    if (s.ownerOnly) return isOwner;
    return checkSectionAccess(user, s);
  });
}

// ════════════════════════════════════════════════════════════════════
// COMPOSANT
// ════════════════════════════════════════════════════════════════════
export function SuperAdminDashboardV2({ user, onSelectEcole, onLogout }) {
  const { dark, toggle } = useStyles();
  const { confirm, dialogProps } = useConfirm();
  const userId = user?._id;

  const isOwner = useMemo(() => checkIsOwner(user), [user]);
  const visibleSections = useMemo(() => getVisibleSections(user), [user]);

  // Navigation
  const [activeSection, setActiveSection] = useState(
    visibleSections[0]?.id ?? "overview"
  );
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [drilldownEcoleId, setDrilldownEcoleId] = useState(null);

  useEffect(() => {
    if (visibleSections.length === 0) return;
    const stillVisible = visibleSections.some((s) => s.id === activeSection);
    if (!stillVisible) {
      setActiveSection(visibleSections[0].id);
    }
  }, [visibleSections, activeSection]);

  // Queries — skip si section non visible (évite erreurs de permission)
  const canViewSchools = visibleSections.some((s) => s.id === "schools");
  const canViewOverview = visibleSections.some((s) => s.id === "overview");
  const canViewPending = visibleSections.some((s) => s.id === "pending");

  const ecolesRaw = useQuery(
    api.ecoles.listWithUserCount,
    userId && canViewSchools ? { userId } : "skip"
  );
  const statsRaw = useQuery(
    api.stats.globalStats,
    userId && canViewOverview ? { userId } : "skip"
  );
  const pendingRaw = useQuery(
    api.users.listAllPendingUsers,
    userId && canViewPending ? { userId } : "skip"
  );

  const ecoles = useMemo(() => ecolesRaw ?? [], [ecolesRaw]);
  const stats = useMemo(() => statsRaw ?? {}, [statsRaw]);
  const pending = useMemo(() => pendingRaw ?? [], [pendingRaw]);

  // Zustand
  const pendingFilterRole = useAppStore((s) => s.superadminPendingFilterRole);
  const setPendingFilterRole = useAppStore(
    (s) => s.setSuperadminPendingFilterRole
  );
  const pendingSearch = useAppStore((s) => s.superadminPendingSearch);
  const setPendingSearch = useAppStore((s) => s.setSuperadminPendingSearch);

  // Mutations écoles
  const addEcoleM = useMutation(api.ecoles.add);
  const removeEcoleM = useMutation(api.ecoles.remove);
  const suspendEcoleM = useMutation(api.ecoles.suspendEcole);
  const reactiverEcoleM = useMutation(api.ecoles.reactiverEcole);
  const updateEcoleM = useMutation(api.ecoles.update);

  const actions = useMemo(
    () => ({
      add: (nom) => addEcoleM({ nom, userId }),
      remove: (ecoleId) => removeEcoleM({ ecoleId, userId }),
      suspend: (ecoleId) => suspendEcoleM({ ecoleId, userId }),
      reactivate: (ecoleId) => reactiverEcoleM({ ecoleId, userId }),
      updateNom: (ecoleId, nom) => updateEcoleM({ ecoleId, nom, userId }),
    }),
    [addEcoleM, removeEcoleM, suspendEcoleM, reactiverEcoleM, updateEcoleM, userId]
  );

  const sectionsWithBadges = useMemo(
    () =>
      visibleSections.map((s) => {
        if (s.id === "schools") return { ...s, badge: ecoles.length };
        if (s.id === "pending")
          return { ...s, badge: pending.length, badgeColor: "#F59E0B" };
        return s;
      }),
    [visibleSections, ecoles.length, pending.length]
  );

  const currentLabel =
    sectionsWithBadges.find((s) => s.id === activeSection)?.label ?? "";

  const needsData =
    activeSection === "overview" ||
    activeSection === "schools" ||
    activeSection === "pending";

  const isLoading =
    needsData &&
    (ecolesRaw === undefined ||
      statsRaw === undefined ||
      pendingRaw === undefined);

  // ────────────────────────────────────────────────
  // Permissions dérivées (pour passer aux sections)
  // ────────────────────────────────────────────────
  const canCreateEcole = checkExactPermission(user, "ecoles.write") ||
    checkHasPermission(user, "gestion_ecoles");
  const canDeleteEcole = checkExactPermission(user, "ecoles.delete") ||
    checkHasPermission(user, "gestion_ecoles");

  const canWriteAnnonces = checkExactPermission(user, "annonces.write") ||
    checkHasPermission(user, "gestion_annonces");
  const canDeleteAnnonces = checkExactPermission(user, "annonces.delete") ||
    checkHasPermission(user, "gestion_annonces");

  const canWriteImpayes = checkExactPermission(user, "impayes.write") ||
    checkHasPermission(user, "gestion_impayes");

  const canWriteAbonnements = checkExactPermission(user, "abonnements.write") ||
    checkHasPermission(user, "gestion_abonnements");

  // ────────────────────────────────────────────────
  // Rendu section
  // ────────────────────────────────────────────────
  const renderSection = () => {
    if (isLoading) {
      return (
        <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
          <Loader
            size={40}
            style={{ animation: "spin 1s linear infinite" }}
            color="#4F46E5"
          />
        </div>
      );
    }

    if (!visibleSections.some((s) => s.id === activeSection)) {
      return <AccessDeniedSection title={currentLabel} isOwner={isOwner} />;
    }

    switch (activeSection) {
      case "overview":
        return (
          <OverviewSection
            stats={stats}
            ecoles={ecoles}
            user={user}
            onNavigate={setActiveSection}
          />
        );

      case "schools":
        return (
          <SchoolsSection
            ecoles={ecoles}
            user={user}
            onSelectEcole={onSelectEcole}
            onDrilldown={setDrilldownEcoleId}
            actions={actions}
            confirm={confirm}
            userId={userId}
            canCreate={canCreateEcole}
            canDelete={canDeleteEcole}
          />
        );

      case "abonnements":
        return (
          <GestionAbonnements
            user={user}
            canWrite={canWriteAbonnements}
          />
        );

      case "finances":
        return (
          <FinancesSection
            userId={userId}
            onDrilldown={setDrilldownEcoleId}
          />
        );

      case "impayes":
        return (
          <ImpayesSection
            userId={userId}
            canWrite={canWriteImpayes}
          />
        );

      case "annonces":
        return (
          <AnnoncesSection
            userId={userId}
            canWrite={canWriteAnnonces}
            canDelete={canDeleteAnnonces}
          />
        );

      case "audit":
        return <AuditSection userId={userId} />;

      case "pending":
        return (
          <PendingSection
            pendingUsers={pending}
            user={user}
            searchTerm={pendingSearch}
            setSearchTerm={setPendingSearch}
            filterRole={pendingFilterRole}
            setFilterRole={setPendingFilterRole}
          />
        );

      case "superadmins":
        return <GestionSuperAdmins user={user} />;

      case "settings":
        return <SettingsTab user={user} />;

      default:
        return null;
    }
  };

  // Aucune section
  if (visibleSections.length === 0) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          background: dark ? "#0F172A" : "#F8FAFC",
        }}
      >
        <div
          style={{
            maxWidth: 480,
            textAlign: "center",
            padding: 32,
            borderRadius: 16,
            background: dark ? "#1E293B" : "#FFFFFF",
            border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
          }}
        >
          <ShieldCheck size={48} color="#94A3B8" style={{ marginBottom: 16 }} />
          <h2
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: dark ? "#F1F5F9" : "#1E293B",
              margin: "0 0 8px",
            }}
          >
            Aucun accès disponible
          </h2>
          <p style={{ fontSize: 14, color: "#64748B", margin: 0 }}>
            Votre compte n'a aucune permission active. Contactez le
            propriétaire de la plateforme.
          </p>
          <button
            type="button"
            onClick={onLogout}
            style={{
              marginTop: 20,
              padding: "10px 20px",
              borderRadius: 8,
              background: "#EF4444",
              color: "#FFFFFF",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Déconnexion
          </button>
        </div>
      </div>
    );
  }

  // Rendu principal
  return (
    <div style={{ display: "flex", minHeight: "100vh", width: "100%" }}>
      <SuperAdminSidebar
        sections={sectionsWithBadges}
        activeSection={activeSection}
        onSelectSection={(id) => {
          setActiveSection(id);
          setDrilldownEcoleId(null);
        }}
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
        user={user}
        onLogout={onLogout}
        onToggleTheme={toggle}
        theme={dark ? "dark" : "light"}
      />

      <main
        className="sad-print-area"
        style={{
          flex: 1,
          padding: "24px 32px",
          minWidth: 0,
          width: "100%",
        }}
      >
        {drilldownEcoleId ? (
          <EcoleDetailPage
            userId={userId}
            ecoleId={drilldownEcoleId}
            onBack={() => setDrilldownEcoleId(null)}
            onSelectEcole={onSelectEcole}
            user={user}
          />
        ) : (
          <>
            <SuperAdminHeader
              title={currentLabel}
              user={user}
              pendingCount={
                checkHasPermission(user, "gestion_demandes")
                  ? pending.length
                  : 0
              }
              canCreateSchool={canCreateEcole}
              onMobileMenu={() => setMobileNavOpen(true)}
              onNewSchool={() => {
                if (canCreateEcole) {
                  setActiveSection("schools");
                }
              }}
              onRefresh={() => window.location.reload()}
              onLogout={onLogout}
              onSettings={() => {
                if (checkHasPermission(user, "gestion_parametres")) {
                  setActiveSection("settings");
                }
              }}
              notifications={
                checkHasPermission(user, "gestion_demandes") ? (
                  <NotificationsPanel pendingUsers={pending} />
                ) : null
              }
            />

            <div key={activeSection}>{renderSection()}</div>
          </>
        )}
      </main>

      <ConfirmDialog {...dialogProps} />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// SOUS-COMPOSANT — Access Denied
// ════════════════════════════════════════════════════════════════════
function AccessDeniedSection({ title, isOwner }) {
  return (
    <div
      style={{
        maxWidth: 480,
        margin: "60px auto",
        textAlign: "center",
        padding: 32,
        borderRadius: 16,
        background: "#FEF3C7",
        border: "1px solid #FDE68A",
      }}
    >
      <ShieldCheck size={40} color="#92400E" style={{ marginBottom: 12 }} />
      <h3
        style={{
          fontSize: 17,
          fontWeight: 700,
          color: "#92400E",
          margin: "0 0 8px",
        }}
      >
        Section « {title} » non accessible
      </h3>
      <p style={{ fontSize: 13.5, color: "#78350F", margin: 0 }}>
        {isOwner
          ? "Cette section n'est pas disponible actuellement."
          : "Vous n'avez pas la permission requise pour accéder à cette section."}
      </p>
    </div>
  );
}

export default SuperAdminDashboardV2;