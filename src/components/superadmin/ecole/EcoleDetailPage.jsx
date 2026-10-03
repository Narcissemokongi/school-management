// src/components/SuperAdmin/ecole/EcoleDetailPage.jsx
import { useMemo, useState, lazy, Suspense } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useTokens } from "@/theme/tokens";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  Loader,
  ArrowLeft,
  StickyNote,
  Activity as ActivityIcon,
  Plus,
  Settings,
} from "lucide-react";
// ✨ Onglets + modale lazy-loaded — gain ~80 KB au 1er render
const OverviewTab = lazy(() =>
  import("./tabs/OverviewTab").then((m) => ({ default: m.OverviewTab }))
);
const UsersTab = lazy(() =>
  import("./tabs/UsersTab").then((m) => ({ default: m.UsersTab }))
);
const AbonnementTab = lazy(() =>
  import("./tabs/AbonnementTab").then((m) => ({ default: m.AbonnementTab }))
);
const AuditTab = lazy(() =>
  import("./tabs/AuditTab").then((m) => ({ default: m.AuditTab }))
);
const NotesTab = lazy(() =>
  import("./tabs/NotesTab").then((m) => ({ default: m.NotesTab }))
);
const TimelineTab = lazy(() =>
  import("./tabs/TimelineTab").then((m) => ({ default: m.TimelineTab }))
);
const ImpersonationPickerModal = lazy(() =>
  import("./ImpersonationPickerModal").then((m) => ({
    default: m.ImpersonationPickerModal,
  }))
);
// ⚡ NON-lazy (petits, toujours visibles)
import { EcoleDetailHeader } from "./EcoleDetailHeader";
import { ExportRgpdButton } from "./ExportRgpdButton";
import { Fab } from "@/components/ui";

// ════════════════════════════════════════════════════════════════════
// LOADER — fallback Suspense pour les onglets lazy
// ════════════════════════════════════════════════════════════════════
function TabLoader({ accent }) {
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
        minHeight: 200,
        gap: 10,
        padding: 32,
      }}
    >
      <Loader
        size={28}
        className="edp-spin"
        color={accent}
        aria-hidden="true"
      />
      <span style={{ color: "#94A3B8", fontSize: 12, fontWeight: 500 }}>
        Chargement…
      </span>
    </div>
  );
}

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
const EcoleDetailPageKeyframes = (
  <style>{`
    @keyframes edp-spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
    .edp-spin { animation: edp-spin 1s linear infinite; }
    @media (prefers-reduced-motion: reduce) {
      .edp-spin { animation: none !important; }
    }
  `}</style>
);

const ALL_TABS = [
  { id: "overview", label: "Vue d'ensemble" },
  { id: "users", label: "Utilisateurs" },
  { id: "abonnement", label: "Abonnement", ownerOnly: true },
  { id: "audit", label: "Audit" },
  { id: "notes", label: "Notes", icon: StickyNote },
  { id: "timeline", label: "Timeline", icon: ActivityIcon },
];

export function EcoleDetailPage({
  userId,
  ecoleId,
  onBack,
  onSelectEcole,
  user,
}) {
  const t = useTokens();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState("overview");

  const [pressedTab, setPressedTab] = useState(null);
  const [backPressed, setBackPressed] = useState(false);

  const [impersonationOpen, setImpersonationOpen] = useState(false);
  const [impersonationTarget, setImpersonationTarget] = useState(null);

  const args = useMemo(() => ({ userId, ecoleId }), [userId, ecoleId]);
  const data = useQuery(api.ecoles.getDetailComplet, args);

  const permissions = user?.permissions ?? [];
  const canWriteNotes =
    data?.isOwner === true || permissions.includes("ecoles.write");
  const canDeleteNotes =
    data?.isOwner === true || permissions.includes("ecoles.delete");

  const handleOpenImpersonation = (id, nom) => {
    setImpersonationTarget({ id, nom });
    setImpersonationOpen(true);
  };

  const handleCloseImpersonation = () => {
    setImpersonationOpen(false);
    setImpersonationTarget(null);
  };

  // ════════════════════════════════════════════════════════════════
  // LOADING
  // ════════════════════════════════════════════════════════════════
  if (data === undefined) {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-busy="true"
        style={{
          display: "flex",
          justifyContent: "center",
          padding: 60,
        }}
      >
        <Loader
          size={40}
          className="edp-spin"
          color={t.accent.primary}
          aria-hidden="true"
        />
        {EcoleDetailPageKeyframes}
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // NOT FOUND
  // ════════════════════════════════════════════════════════════════
  if (data === null || !data.ecole) {
    return (
      <>
        {EcoleDetailPageKeyframes}
        <div
          style={{
            padding: isMobile ? 32 : 40,
            textAlign: "center",
          }}
        >
          <p style={{ color: t.text.secondary }}>École introuvable.</p>
          <button
            type="button"
            onClick={onBack}
            style={{
              marginTop: 12,
              color: t.accent.primary,
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: t.font.size.sm,
              fontFamily: t.font.family,
              minHeight: MOBILE_TAP,
              padding: "10px 16px",
              borderRadius: t.radius.sm,
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
            }}
          >
            ← Retour
          </button>
        </div>
      </>
    );
  }

  const tabs = data.isOwner
    ? ALL_TABS
    : ALL_TABS.filter((tab) => !tab.ownerOnly);

  return (
    <>
      {EcoleDetailPageKeyframes}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: t.space.lg,
          padding: isMobile
            ? `0 ${SAFE_RIGHT} calc(${SAFE_BOTTOM} + 80px) ${SAFE_LEFT}`
            : 0,
          boxSizing: "border-box",
        }}
      >
        {/* ═══ Bouton retour + Export RGPD ═══ */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: t.space.sm,
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={onBack}
            onTouchStart={() => setBackPressed(true)}
            onTouchEnd={() => setBackPressed(false)}
            onTouchCancel={() => setBackPressed(false)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: isMobile ? "10px 14px" : "6px 10px",
              background: "transparent",
              border: `1px solid ${t.border.default}`,
              borderRadius: t.radius.sm,
              color: t.text.secondary,
              cursor: "pointer",
              fontSize: t.font.size.sm,
              fontWeight: 500,
              fontFamily: t.font.family,
              minHeight: isMobile ? MOBILE_TAP : undefined,
              transform: backPressed ? "scale(0.96)" : "scale(1)",
              transition: "transform 0.1s ease, background 0.12s ease",
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
              boxSizing: "border-box",
            }}
            aria-label="Retour à la liste des écoles"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            Retour
          </button>

          <ExportRgpdButton
            userId={userId}
            ecoleId={ecoleId}
            ecoleNom={data.ecole.nom}
          />
        </div>

        {/* ═══ Header école ═══ */}
        <EcoleDetailHeader
          ecole={data.ecole}
          abonnement={data.abonnement}
          onSelectEcole={onSelectEcole}
          onImpersonate={data.isOwner ? handleOpenImpersonation : undefined}
        />

        {/* ═══ Tabs avec fade gradient mobile ═══ */}
        <div
          style={{
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            role="tablist"
            aria-label="Sections du détail école"
            style={{
              display: "flex",
              gap: 4,
              borderBottom: `1px solid ${t.border.subtle}`,
              overflowX: "auto",
              WebkitOverflowScrolling: "touch",
              overscrollBehavior: "contain",
              scrollbarWidth: "thin",
              paddingRight: isMobile ? 32 : 0,
            }}
          >
            {tabs.map((tab) => {
              const active = activeTab === tab.id;
              const Icon = tab.icon;
              const isPressed = pressedTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveTab(tab.id)}
                  onTouchStart={() => setPressedTab(tab.id)}
                  onTouchEnd={() => setPressedTab(null)}
                  onTouchCancel={() => setPressedTab(null)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: isMobile ? "10px 14px" : "10px 16px",
                    background: "transparent",
                    border: "none",
                    borderBottom: active
                      ? `2px solid ${t.accent.primary}`
                      : "2px solid transparent",
                    color: active ? t.accent.primary : t.text.secondary,
                    fontWeight: active ? 600 : 500,
                    cursor: "pointer",
                    fontSize: t.font.size.sm,
                    fontFamily: t.font.family,
                    whiteSpace: "nowrap",
                    marginBottom: -1,
                    minHeight: isMobile ? MOBILE_TAP : undefined,
                    transform: isPressed ? "scale(0.96)" : "scale(1)",
                    transition:
                      "transform 0.1s ease, color 0.15s ease, border-color 0.15s ease",
                    WebkitTapHighlightColor: "transparent",
                    touchAction: "manipulation",
                    flexShrink: 0,
                  }}
                >
                  {Icon && <Icon size={14} aria-hidden="true" />}
                  {tab.label}
                </button>
              );
            })}
          </div>

          {isMobile && (
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                bottom: 1,
                width: 32,
                background: `linear-gradient(to right, transparent, ${t.surface.default || t.surface.page || "#FFFFFF"} 90%)`,
                pointerEvents: "none",
              }}
            />
          )}
        </div>

        {/* ═══ Contenu onglet (lazy-loaded) ═══ */}
        <Suspense fallback={<TabLoader accent={t.accent.primary} />}>
          <div>
            {activeTab === "overview" && (
              <OverviewTab stats={data.stats} ecole={data.ecole} />
            )}
            {activeTab === "users" && (
              <UsersTab userId={userId} ecoleId={ecoleId} />
            )}
            {activeTab === "abonnement" && data.isOwner && (
              <AbonnementTab
                abonnement={data.abonnement}
                paiements={data.paiements}
              />
            )}
            {activeTab === "audit" && <AuditTab audits={data.audits} />}
            {activeTab === "notes" && (
              <NotesTab
                userId={userId}
                ecoleId={ecoleId}
                canWrite={canWriteNotes}
                canDelete={canDeleteNotes}
              />
            )}
            {activeTab === "timeline" && <TimelineTab audits={data.audits} />}
          </div>
        </Suspense>

        {/* ═══ Modal impersonation (lazy) ═══ */}
        {impersonationOpen && impersonationTarget && (
          <Suspense fallback={null}>
            <ImpersonationPickerModal
              userId={userId}
              ecoleId={impersonationTarget.id}
              ecoleNom={impersonationTarget.nom}
              ownerUser={user}
              onClose={handleCloseImpersonation}
            />
          </Suspense>
        )}

        {/* ═══ FAB contextuel mobile — Notes ═══ */}
        {isMobile && activeTab === "notes" && canWriteNotes && (
          <Fab
            icon={<Plus size={22} />}
            label="Nouvelle note"
            onClick={() => {
              window.dispatchEvent(new CustomEvent("open-note-modal"));
            }}
          />
        )}
      </div>
    </>
  );
}

export default EcoleDetailPage;