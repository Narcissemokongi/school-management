// src/components/ComptableApp.jsx
import { useMemo, useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import { Layout } from "./Layout";
import { DashboardComptable } from "./DashboardComptable";
import { GestionFrais } from "./GestionFrais";
import { MessagerieApp } from "./messagerie/MessagerieApp";
import { Appels } from "./Appels";
import { ProfilUtilisateur } from "./ProfilUtilisateur";
import { Aide } from "./Aide";
import { MentionsLegales } from "./MentionsLegales";
import { PolitiqueConfidentialite } from "./PolitiqueConfidentialite";
import {
  DollarSign, BarChart3, MessageCircle, Phone, HelpCircle,
  FileText, Shield, User, Calendar, AlertTriangle,
} from "lucide-react";

// ════════════════════════════════════════════════════════════════════
// CONSTANTES MODULE-LEVEL
// ════════════════════════════════════════════════════════════════════
const VALID_COMPTABLE_TABS = [
  "dashboard",
  "frais",
  "messagerie",
  "appels",
  "profil",
  "aide",
  "mentions",
  "confidentialite",
];

const DEFAULT_COMPTABLE_TAB = "dashboard";
const COMPTABLE_BASE = "/comptable";

// Onglets qui nécessitent une année active
const TABS_REQUIRING_YEAR = ["dashboard", "frais"];

// ════════════════════════════════════════════════════════════════════
// HELPER — Parse URL
// ════════════════════════════════════════════════════════════════════
function parseComptableUrl(pathname) {
  const match = pathname.match(/^\/comptable\/([^\/]+)/);
  if (!match) return null;
  const candidate = match[1];
  return VALID_COMPTABLE_TABS.includes(candidate) ? candidate : null;
}

// ════════════════════════════════════════════════════════════════════
// COMPOSANT
// ════════════════════════════════════════════════════════════════════
export function ComptableApp({
  user,
  ecoleId,
  eleves,
  anneeId,
  anneeActive,
  dark,
  toggle,
  handleLogout,
}) {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();

  const userId = user?._id;

  // ════════════════════════════════════════════════════════════════════
  // ✅ FIX PERF — Tab lu depuis l'URL
  // ════════════════════════════════════════════════════════════════════
  const tabFromUrl = useMemo(
    () => parseComptableUrl(location.pathname),
    [location.pathname]
  );

  const tab = tabFromUrl || DEFAULT_COMPTABLE_TAB;

  // ════════════════════════════════════════════════════════════════════
  // ✅ FIX PERF — navigateRef stable
  // ════════════════════════════════════════════════════════════════════
  const navigateRef = useRef(navigate);
  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);

  const setTab = useCallback((newTab) => {
    if (VALID_COMPTABLE_TABS.includes(newTab)) {
      navigateRef.current(`${COMPTABLE_BASE}/${newTab}`);
    }
  }, []);

  // ════════════════════════════════════════════════════════════════════
  // ✅ FIX PERF — Redirection UNE SEULE FOIS
  // ════════════════════════════════════════════════════════════════════
  const hasRedirectedRef = useRef(false);
  useEffect(() => {
    if (!tabFromUrl && !hasRedirectedRef.current) {
      hasRedirectedRef.current = true;
      navigateRef.current(`${COMPTABLE_BASE}/${DEFAULT_COMPTABLE_TAB}`, {
        replace: true,
      });
    }
  }, [tabFromUrl]);

  // ════════════════════════════════════════════════════════════════════
  // ✅ FIX PERF — Args stables pour Convex
  // ════════════════════════════════════════════════════════════════════
  const fraisArgs = useMemo(
    () =>
      ecoleId && anneeId && userId
        ? { ecoleId, anneeId, userId }
        : "skip",
    [ecoleId, anneeId, userId]
  );

  const fraisRaw = useQuery(api.frais.listByEcole, fraisArgs);
  const fraisList = useMemo(() => fraisRaw ?? [], [fraisRaw]);

  // ════════════════════════════════════════════════════════════════════
  // STATS (mémoïsées)
  // ════════════════════════════════════════════════════════════════════
  const stats = useMemo(() => {
    const totalEleves = eleves?.length ?? 0;

    let totalFrais = 0;
    let totalPaye = 0;
    let elevesEnRetard = 0;

    for (const f of fraisList) {
      const mt = f.montantTotal || 0;
      const mp = f.montantPaye || 0;
      totalFrais += mt;
      totalPaye += mp;
      if (mt - mp > 0) elevesEnRetard++;
    }

    const totalRestant = totalFrais - totalPaye;
    const tauxRecouvrement =
      totalFrais > 0 ? ((totalPaye / totalFrais) * 100).toFixed(1) : "0";

    return {
      totalEleves,
      totalFrais,
      totalPaye,
      totalRestant,
      tauxRecouvrement,
      elevesEnRetard,
    };
  }, [fraisList, eleves]);

  // ════════════════════════════════════════════════════════════════════
  // HANDLERS navigation
  // ════════════════════════════════════════════════════════════════════
  const handleNavigateToMessaging = useCallback((contactId) => {
    if (contactId) {
      navigateRef.current(`/comptable/messagerie/chat/${contactId}`);
    } else {
      navigateRef.current("/comptable/messagerie");
    }
  }, []);

  // ════════════════════════════════════════════════════════════════════
  // TOKENS
  // ════════════════════════════════════════════════════════════════════
  const tokens = useMemo(
    () => ({
      text: dark ? "#F1F5F9" : "#1E293B",
      textMuted: dark ? "#94A3B8" : "#64748B",
      warning: "#F59E0B",
      warningBg: dark ? "#78350F" : "#FEF3C7",
      warningText: dark ? "#FBBF24" : "#92400E",
    }),
    [dark]
  );

  // ════════════════════════════════════════════════════════════════════
  // MENU (mémoïsé)
  // ════════════════════════════════════════════════════════════════════
  const menu = useMemo(
    () => [
      { id: "dashboard", label: "Tableau de bord", icon: <BarChart3 size={20} /> },
      { id: "frais", label: "Frais", icon: <DollarSign size={20} /> },
      { id: "messagerie", label: "Messages", icon: <MessageCircle size={20} /> },
      { id: "appels", label: "Appels", icon: <Phone size={20} /> },
      { id: "profil", label: "Profil", icon: <User size={20} /> },
      { id: "aide", label: "Aide", icon: <HelpCircle size={20} /> },
      { id: "mentions", label: "Mentions légales", icon: <FileText size={20} /> },
      { id: "confidentialite", label: "Confidentialité", icon: <Shield size={20} /> },
    ],
    []
  );

  // ════════════════════════════════════════════════════════════════════
  // GUARD : session invalide
  // ════════════════════════════════════════════════════════════════════
  if (!user || !userId) {
    return (
      <Layout
        menu={menu}
        activeTab={tab}
        onTabChange={setTab}
        user={user}
        dark={dark}
        onToggleTheme={toggle}
        onLogout={handleLogout}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            padding: isMobile ? "24px 16px" : "32px 24px",
            textAlign: "center",
          }}
        >
          <User
            size={isMobile ? 40 : 48}
            color="#F59E0B"
            style={{ marginBottom: 16 }}
          />
          <h2
            style={{
              fontSize: isMobile ? 20 : 24,
              fontWeight: 600,
              color: tokens.text,
              margin: "0 0 8px",
            }}
          >
            Session invalide
          </h2>
          <p
            style={{
              color: tokens.textMuted,
              fontSize: isMobile ? 13 : 14,
            }}
          >
            Veuillez vous reconnecter.
          </p>
        </div>
      </Layout>
    );
  }

  // ════════════════════════════════════════════════════════════════════
  // COMPUTED
  // ════════════════════════════════════════════════════════════════════
  const tabNeedsYear = TABS_REQUIRING_YEAR.includes(tab);
  const showBanner = !anneeId && !tabNeedsYear;

  // ════════════════════════════════════════════════════════════════════
  // RENDU CONTENU
  // ════════════════════════════════════════════════════════════════════
  const renderContent = () => {
    // Message complet pour les onglets qui nécessitent une année
    if (!anneeId && tabNeedsYear) {
      return (
        <div
          style={{
            maxWidth: 520,
            margin: "0 auto",
            padding: isMobile ? "40px 16px" : "60px 24px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: tokens.warningBg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <Calendar size={30} color={tokens.warning} />
          </div>
          <h2
            style={{
              fontSize: isMobile ? 17 : 20,
              fontWeight: 700,
              color: tokens.text,
              margin: "0 0 6px",
            }}
          >
            Aucune année scolaire active
          </h2>
          <p
            style={{
              color: tokens.textMuted,
              fontSize: isMobile ? 13 : 14,
              margin: 0,
              maxWidth: 400,
              marginLeft: "auto",
              marginRight: "auto",
              lineHeight: 1.5,
            }}
          >
            Veuillez demander à l'administrateur d'activer une année scolaire
            pour accéder aux données financières.
          </p>
        </div>
      );
    }

    switch (tab) {
      case "dashboard":
        return (
          <DashboardComptable
            ecoleId={ecoleId}
            eleves={eleves}
            anneeId={anneeId}
            anneeActive={anneeActive}
          />
        );

      case "frais":
        return (
          <GestionFrais
            ecoleId={ecoleId}
            eleves={eleves}
            anneeId={anneeId}
            anneeActive={anneeActive}
            user={user}
          />
        );

      case "messagerie":
        return <MessagerieApp user={user} ecoleId={ecoleId} />;

      case "appels":
        return (
          <Appels
            user={user}
            ecoleId={ecoleId}
            anneeId={anneeId}
            onNavigateToMessaging={handleNavigateToMessaging}
          />
        );

      case "profil":
        return <ProfilUtilisateur user={user} />;

      case "aide":
        return <Aide user={user} />;

      case "mentions":
        return <MentionsLegales />;

      case "confidentialite":
        return <PolitiqueConfidentialite />;

      default:
        return null;
    }
  };

  // ════════════════════════════════════════════════════════════════════
  // RENDU PRINCIPAL
  // ════════════════════════════════════════════════════════════════════
  return (
    <Layout
      menu={menu}
      activeTab={tab}
      onTabChange={setTab}
      user={user}
      dark={dark}
      onToggleTheme={toggle}
      onLogout={handleLogout}
    >
      {/* Bannière : uniquement sur les onglets SANS message complet */}
      {showBanner && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: tokens.warningBg,
            color: tokens.warningText,
            padding: isMobile ? "10px 12px" : "10px 16px",
            fontSize: isMobile ? 12 : 13,
            fontWeight: 500,
            borderRadius: 10,
            marginBottom: isMobile ? 12 : 16,
            lineHeight: 1.4,
            border: `1px solid ${dark ? "rgba(251,191,36,0.3)" : "rgba(245,158,11,0.2)"}`,
          }}
          role="alert"
        >
          <AlertTriangle size={15} style={{ flexShrink: 0 }} />
          <span>
            Aucune année scolaire active. Les données financières sont
            indisponibles.
          </span>
        </div>
      )}
      {renderContent()}
    </Layout>
  );
}