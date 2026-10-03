// src/components/SuperAdmin/SuperAdminDashboardV2.jsx
import { useState, useMemo, useEffect, lazy, Suspense } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  LayoutDashboard, School, CreditCard, Clock, ShieldCheck, Settings, Loader,
  DollarSign, Megaphone, Activity, AlertTriangle,
} from "lucide-react";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useConfirm } from "@/hooks/useConfirm";
import { useAppStore } from "@/store/appStore";
import { ConfirmDialog } from "@/components/ConfirmDialog";
// ✨ Sections lazy-loaded — chaque onglet devient un chunk séparé (gain ~250 KB)
const GestionAbonnements = lazy(() =>
  import("@/components/GestionAbonnements").then((m) => ({
    default: m.GestionAbonnements,
  }))
);
const GestionSuperAdmins = lazy(() =>
  import("./GestionSuperAdmins").then((m) => ({
    default: m.GestionSuperAdmins,
  }))
);
const SettingsTab = lazy(() =>
  import("./SettingsTab").then((m) => ({ default: m.SettingsTab }))
);
const OverviewSection = lazy(() =>
  import("./sections/OverviewSection").then((m) => ({
    default: m.OverviewSection,
  }))
);
const SchoolsSection = lazy(() =>
  import("./sections/SchoolsSection").then((m) => ({
    default: m.SchoolsSection,
  }))
);
const PendingSection = lazy(() =>
  import("./sections/PendingSection").then((m) => ({
    default: m.PendingSection,
  }))
);
const FinancesSection = lazy(() =>
  import("../superadmin/sections/FinancesSection").then((m) => ({
    default: m.FinancesSection,
  }))
);
const AnnoncesSection = lazy(() =>
  import("./sections/AnnoncesSection").then((m) => ({
    default: m.AnnoncesSection,
  }))
);
const AuditSection = lazy(() =>
  import("./sections/AuditSection").then((m) => ({
    default: m.AuditSection,
  }))
);
const EcoleDetailPage = lazy(() =>
  import("./ecole/EcoleDetailPage").then((m) => ({
    default: m.EcoleDetailPage,
  }))
);
const ImpayesSection = lazy(() =>
  import("./sections/ImpayesSection").then((m) => ({
    default: m.ImpayesSection,
  }))
);
// ⚡ NON-lazy (toujours affichés, feedback instantané critique)
import { SuperAdminSidebar } from "../superadmin/SuperAdminSidebar";
import { SuperAdminHeader } from "./SuperAdminHeader";
import { NotificationsPanel } from "./NotificationsPanel";

// ════════════════════════════════════════════════════════════════════
// LOADER — fallback Suspense pour les sections lazy-loaded
// ════════════════════════════════════════════════════════════════════
function SectionLoader({ dark }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 260,
        gap: 12,
        padding: 40,
      }}
    >
      <Loader
        size={32}
        style={{ animation: "spin 1s linear infinite" }}
        color={dark ? "#818CF8" : "#4F46E5"}
        aria-hidden="true"
      />
      <span
        style={{
          color: dark ? "#94A3B8" : "#64748B",
          fontSize: 13,
          fontWeight: 500,
        }}
      >
        Chargement…
      </span>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// CONFIG DES SECTIONS — permissions granulaires
// ════════════════════════════════════════════════════════════════════
const SECTIONS_CONFIG = [
  { id: "overview", label: "Vue d'ensemble", icon: <LayoutDashboard size={20} />, module: "stats", legacyPermission: "gestion_statistiques" },
  { id: "schools", label: "Écoles", icon: <School size={20} />, module: "ecoles", legacyPermission: "gestion_ecoles" },
  { id: "abonnements", label: "Abonnements", icon: <CreditCard size={20} />, module: "abonnements" },
  { id: "finances", label: "Finances", icon: <DollarSign size={20} />, module: "finances" },
  { id: "impayes", label: "Impayés", icon: <AlertTriangle size={20} />, module: "impayes" },
  { id: "annonces", label: "Annonces", icon: <Megaphone size={20} />, module: "annonces" },
  { id: "audit", label: "Journal d'audit", icon: <Activity size={20} />, module: "audit" },
  { id: "pending", label: "Demandes", icon: <Clock size={20} />, module: "demandes", legacyPermission: "gestion_demandes" },
  { id: "superadmins", label: "Super Admins", icon: <ShieldCheck size={20} />, ownerOnly: true },
  { id: "settings", label: "Paramètres", icon: <Settings size={20} />, module: "parametres", legacyPermission: "gestion_parametres" },
];

// ════════════════════════════════════════════════════════════════════
// HELPERS
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

function checkSectionAccess(user, section) {
  if (!user) return false;
  if (checkIsOwner(user)) return true;
  if (user.role !== "superAdmin") return false;
  const perms = user.permissions ?? [];
  if (section.legacyPermission && perms.includes(section.legacyPermission)) return true;
  if (section.module) {
    const prefix = `${section.module}.`;
    if (perms.some((p) => p.startsWith(prefix))) return true;
  }
  return false;
}

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
  if (mappedModule && perms.some((p) => p.startsWith(`${mappedModule}.`))) return true;
  return false;
}

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

function getIsIOS() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent || "");
}

// ════════════════════════════════════════════════════════════════════
// COMPOSANT
// ════════════════════════════════════════════════════════════════════
export function SuperAdminDashboardV2({ user, onSelectEcole, onLogout }) {
  const { dark, toggle } = useStyles();
  const isMobile = useIsMobile();
  const { confirm, dialogProps } = useConfirm();
  const userId = user?._id;

  const fullHeight = useMemo(() => (getIsIOS() ? "100dvh" : "100vh"), []);

  const isOwner = useMemo(() => checkIsOwner(user), [user]);
  const visibleSections = useMemo(() => getVisibleSections(user), [user]);

  const [activeSection, setActiveSection] = useState(
    visibleSections[0]?.id ?? "overview"
  );
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [drilldownEcoleId, setDrilldownEcoleId] = useState(null);

  useEffect(() => {
    if (isMobile) setMobileNavOpen(false);
  }, [activeSection, isMobile]);

  useEffect(() => {
    if (visibleSections.length === 0) return;
    const stillVisible = visibleSections.some((s) => s.id === activeSection);
    if (!stillVisible) {
      setActiveSection(visibleSections[0].id);
    }
  }, [visibleSections, activeSection]);

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

  const pendingFilterRole = useAppStore((s) => s.superadminPendingFilterRole);
  const setPendingFilterRole = useAppStore((s) => s.setSuperadminPendingFilterRole);
  const pendingSearch = useAppStore((s) => s.superadminPendingSearch);
  const setPendingSearch = useAppStore((s) => s.setSuperadminPendingSearch);

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
        return <GestionAbonnements user={user} canWrite={canWriteAbonnements} />;
      case "finances":
        return <FinancesSection userId={userId} onDrilldown={setDrilldownEcoleId} />;
      case "impayes":
        return <ImpayesSection userId={userId} canWrite={canWriteImpayes} />;
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

  if (visibleSections.length === 0) {
    return (
      <div
        style={{
          minHeight: fullHeight,
          height: fullHeight,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: `calc(24px + env(safe-area-inset-top, 0px)) 16px calc(24px + env(safe-area-inset-bottom, 0px))`,
          background: dark ? "#0F172A" : "#F8FAFC",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            maxWidth: 480,
            width: "100%",
            textAlign: "center",
            padding: isMobile ? 24 : 32,
            borderRadius: 16,
            background: dark ? "#1E293B" : "#FFFFFF",
            border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
          }}
        >
          <ShieldCheck size={48} color="#94A3B8" style={{ marginBottom: 16 }} />
          <h2
            style={{
              fontSize: isMobile ? 18 : 20,
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
              padding: "12px 24px",
              borderRadius: 8,
              background: "#EF4444",
              color: "#FFFFFF",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              minHeight: 44,
              WebkitTapHighlightColor: "transparent",
            }}
          >
            Déconnexion
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        minHeight: fullHeight,
        height: fullHeight,
        width: "100%",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
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
          padding: isMobile
            ? `calc(12px + env(safe-area-inset-top, 0px)) 14px calc(20px + env(safe-area-inset-bottom, 0px))`
            : "24px 32px",
          minWidth: 0,
          width: "100%",
          overflowX: "hidden",
          overflowY: "auto",
          minHeight: 0,
          height: "100%",
          boxSizing: "border-box",
          WebkitOverflowScrolling: "touch",
          overscrollBehavior: "contain",
        }}
      >
        {drilldownEcoleId ? (
          <Suspense fallback={<SectionLoader dark={dark} />}>
            <EcoleDetailPage
              userId={userId}
              ecoleId={drilldownEcoleId}
              onBack={() => setDrilldownEcoleId(null)}
              onSelectEcole={onSelectEcole}
              user={user}
            />
          </Suspense>
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

            {/* ✨ Suspense : chaque section lazy-loaded */}
            <div key={activeSection}>
              <Suspense fallback={<SectionLoader dark={dark} />}>
                {renderSection()}
              </Suspense>
            </div>
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
  const isMobile = useIsMobile();

  return (
    <div
      style={{
        maxWidth: 480,
        margin: isMobile ? "32px auto" : "60px auto",
        textAlign: "center",
        padding: isMobile ? 20 : 32,
        borderRadius: 16,
        background: "#FEF3C7",
        border: "1px solid #FDE68A",
      }}
    >
      <ShieldCheck size={40} color="#92400E" style={{ marginBottom: 12 }} />
      <h3
        style={{
          fontSize: isMobile ? 15.5 : 17,
          fontWeight: 700,
          color: "#92400E",
          margin: "0 0 8px",
        }}
      >
        Section « {title} » non accessible
      </h3>
      <p
        style={{
          fontSize: isMobile ? 13 : 13.5,
          color: "#78350F",
          margin: 0,
        }}
      >
        {isOwner
          ? "Cette section n'est pas disponible actuellement."
          : "Vous n'avez pas la permission requise pour accéder à cette section."}
      </p>
    </div>
  );
}

export default SuperAdminDashboardV2;