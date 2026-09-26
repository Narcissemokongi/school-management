// src/components/SuperAdmin/ecole/EcoleDetailPage.jsx
import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useTokens } from "@/theme/tokens";
import { useIsMobile } from "@/hooks/useIsMobile";
import { Loader, ArrowLeft } from "lucide-react";
import { EcoleDetailHeader } from "./EcoleDetailHeader";
import { OverviewTab } from "./tabs/OverviewTab";
import { UsersTab } from "./tabs/UsersTab";
import { AbonnementTab } from "./tabs/AbonnementTab";
import { AuditTab } from "./tabs/AuditTab";
import { ImpersonationPickerModal } from "./ImpersonationPickerModal"; // ✨ NOUVEAU

const ALL_TABS = [
  { id: "overview", label: "Vue d'ensemble" },
  { id: "users", label: "Utilisateurs" },
  { id: "abonnement", label: "Abonnement", ownerOnly: true },
  { id: "audit", label: "Audit" },
];

export function EcoleDetailPage({
  userId,
  ecoleId,
  onBack,
  onSelectEcole,
  user, // ✨ NOUVEAU — l'owner réel (pour l'audit impersonation)
}) {
  const t = useTokens();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState("overview");

  // ✨ NOUVEAU — État modal impersonation
  const [impersonationOpen, setImpersonationOpen] = useState(false);
  const [impersonationTarget, setImpersonationTarget] = useState(null);

  const args = useMemo(() => ({ userId, ecoleId }), [userId, ecoleId]);
  const data = useQuery(api.ecoles.getDetailComplet, args);

  // ✨ NOUVEAU — Handler ouverture modal
  const handleOpenImpersonation = (id, nom) => {
    setImpersonationTarget({ id, nom });
    setImpersonationOpen(true);
  };

  const handleCloseImpersonation = () => {
    setImpersonationOpen(false);
    setImpersonationTarget(null);
  };

  if (data === undefined) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
        <Loader
          size={40}
          style={{ animation: "spin 1s linear infinite" }}
          color={t.accent.primary}
        />
      </div>
    );
  }

  if (data === null || !data.ecole) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
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
          }}
        >
          ← Retour
        </button>
      </div>
    );
  }

  // Filtrer l'onglet Abonnement si non-owner
  const tabs = data.isOwner
    ? ALL_TABS
    : ALL_TABS.filter((tab) => !tab.ownerOnly);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: t.space.lg }}>
      {/* Bouton retour */}
      <button
        type="button"
        onClick={onBack}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 10px",
          background: "transparent",
          border: `1px solid ${t.border.default}`,
          borderRadius: t.radius.sm,
          color: t.text.secondary,
          cursor: "pointer",
          fontSize: t.font.size.sm,
          fontWeight: 500,
          width: "fit-content",
          fontFamily: t.font.family,
        }}
      >
        <ArrowLeft size={14} />
        Retour
      </button>

      {/* Header école */}
      <EcoleDetailHeader
        ecole={data.ecole}
        abonnement={data.abonnement}
        onSelectEcole={onSelectEcole}
        // ✨ NOUVEAU — bouton impersonation uniquement pour OWNER
        onImpersonate={data.isOwner ? handleOpenImpersonation : undefined}
      />

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 4,
          borderBottom: `1px solid ${t.border.subtle}`,
          overflowX: "auto",
        }}
      >
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "10px 16px",
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
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Contenu onglet */}
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
      </div>

      {/* ✨ NOUVEAU — Modal sélection impersonation */}
      {impersonationOpen && impersonationTarget && (
        <ImpersonationPickerModal
          userId={userId}
          ecoleId={impersonationTarget.id}
          ecoleNom={impersonationTarget.nom}
          ownerUser={user}
          onClose={handleCloseImpersonation}
        />
      )}
    </div>
  );
}

export default EcoleDetailPage;