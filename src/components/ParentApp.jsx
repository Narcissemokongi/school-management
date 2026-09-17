// src/components/ParentApp.jsx
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import { Layout } from "./Layout";
import { MessagerieApp } from "./messagerie/MessagerieApp";
import { Appels } from "./Appels";
import { ConsultationEmploiDuTemps } from "./ConsultationEmploiDuTemps";
import { ConsultationExamens } from "./ConsultationExamens";
import { FraisEnfant } from "./FraisEnfant";
import { BulletinEnfant } from "./BulletinEnfant";
import { AbsencesEnfant } from "./AbsencesEnfant";
import { MentionsLegales } from "./MentionsLegales";
import { Aide } from "./Aide";
import { PolitiqueConfidentialite } from "./PolitiqueConfidentialite";
import { useAppStore } from "@/store/appStore";
import {
  Users,
  MessageCircle,
  Calendar,
  Phone,
  HelpCircle,
  FileText,
  Shield,
  UserPlus,
  X,
  Search,
  ClipboardList,
  AlertTriangle,
  ChevronRight,
  DollarSign,
  BookOpen,
  Clock,
  Award,
  CheckCircle2,
  TrendingUp,
  ArrowLeft,
} from "lucide-react";
import DemandeAssociation from "./DemandeAssociation";

// ════════════════════════════════════════════════════════════════════
// CONSTANTES MODULE-LEVEL
// ════════════════════════════════════════════════════════════════════
const VALID_PARENT_TABS = [
  "enfants",
  "messagerie",
  "emploi",
  "appels",
  "aide",
  "mentions",
  "confidentialite",
];

const DEFAULT_PARENT_TAB = "enfants";
const PARENT_BASE = "/parent";

const ParentAppKeyframes = (
  <style>{`
    @keyframes pa-fade-in {
      from { opacity: 0; transform: translateY(4px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .pa-fade-in { animation: pa-fade-in 0.25s ease-out; }
    @media (prefers-reduced-motion: reduce) {
      .pa-fade-in { animation: none !important; }
    }
  `}</style>
);

// ════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════
function parseParentUrl(pathname) {
  // /parent/enfants
  // /parent/enfants/abc123
  // /parent/enfants/new
  // /parent/messagerie
  const match = pathname.match(/^\/parent\/([^\/]+)(?:\/([^\/]+))?/);
  if (!match) return { tab: null, sub: null };

  const [, tab, sub] = match;
  if (!VALID_PARENT_TABS.includes(tab)) return { tab: null, sub: null };
  return { tab, sub: sub || null };
}

function buildTokens(dark) {
  return {
    bg: dark ? "#0F172A" : "#F8FAFC",
    surface: dark ? "#1E293B" : "#FFFFFF",
    surfaceHover: dark ? "#26334D" : "#F8FAFC",
    border: dark ? "#334155" : "#E2E8F0",
    text: dark ? "#F1F5F9" : "#1E293B",
    textMuted: dark ? "#94A3B8" : "#64748B",
    primary: dark ? "#818CF8" : "#4F46E5",
    primaryHover: dark ? "#6366F1" : "#4338CA",
    primarySoft: dark ? "#312E81" : "#EEF2FF",
    ghostHover: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
    danger: dark ? "#F87171" : "#EF4444",
    dangerSoft: dark ? "#7F1D1D" : "#FEE2E2",
    warning: dark ? "#FBBF24" : "#F59E0B",
    warningSoft: dark ? "#78350F" : "#FEF3C7",
    success: dark ? "#34D399" : "#10B981",
    successSoft: dark ? "#064E3B" : "#D1FAE5",
    shadow: dark
      ? "0 1px 3px rgba(0,0,0,0.3)"
      : "0 1px 3px rgba(0,0,0,0.05)",
  };
}

// ════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ════════════════════════════════════════════════════════════════════
export function ParentApp({
  user,
  ecoleId,
  eleves = [],
  punitions = [],
  fautes = [],
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
  const tokens = useMemo(() => buildTokens(dark), [dark]);

  // ════════════════════════════════════════════════════════════════════
  // ✅ FIX PERF — Tab lu depuis l'URL
  // ════════════════════════════════════════════════════════════════════
  const parsed = useMemo(
    () => parseParentUrl(location.pathname),
    [location.pathname]
  );
  const tab = parsed.tab || DEFAULT_PARENT_TAB;
  const sub = parsed.sub;

  // ════════════════════════════════════════════════════════════════════
  // ✅ navigateRef stable
  // ════════════════════════════════════════════════════════════════════
  const navigateRef = useRef(navigate);
  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);

  const setTab = useCallback((newTab) => {
    if (VALID_PARENT_TABS.includes(newTab)) {
      navigateRef.current(`${PARENT_BASE}/${newTab}`);
    }
  }, []);

  // ✅ Redirection UNE SEULE FOIS
  const hasRedirectedRef = useRef(false);
  useEffect(() => {
    if (!parsed.tab && !hasRedirectedRef.current) {
      hasRedirectedRef.current = true;
      navigateRef.current(`${PARENT_BASE}/${DEFAULT_PARENT_TAB}`, {
        replace: true,
      });
    }
  }, [parsed.tab]);

  // ════════════════════════════════════════════════════════════════════
  // Zustand — uniquement pour le payload messagerie + enfant sélectionné
  // ════════════════════════════════════════════════════════════════════
  const messagingContactId = useAppStore((state) => state.messagingContactId);
  const setMessagingContactId = useAppStore(
    (state) => state.setMessagingContactId
  );

  const selectedEnfantZustand = useAppStore(
    (state) => state.parentSelectedEnfant
  );
  const setSelectedEnfant = useAppStore(
    (state) => state.setParentSelectedEnfant
  );

  // ════════════════════════════════════════════════════════════════════
  // ✅ Enfant dérivé de l'URL
  // ════════════════════════════════════════════════════════════════════
  const selectedEnfantFromUrl = useMemo(() => {
    if (tab !== "enfants" || !sub || sub === "new") return null;
    return eleves.find((e) => e._id === sub) || null;
  }, [tab, sub, eleves]);

  // ✅ Sync Zustand ← URL (pour que la tab "emploi" ait accès à l'enfant)
  useEffect(() => {
    if (
      selectedEnfantFromUrl &&
      selectedEnfantFromUrl._id !== selectedEnfantZustand?._id
    ) {
      setSelectedEnfant(selectedEnfantFromUrl);
    }
  }, [selectedEnfantFromUrl, selectedEnfantZustand?._id, setSelectedEnfant]);

  // ════════════════════════════════════════════════════════════════════
  // HANDLERS navigation
  // ════════════════════════════════════════════════════════════════════
  const handleNavigateToMessaging = useCallback(
    (contactId) => {
      if (contactId) {
        navigateRef.current(`/parent/messagerie/chat/${contactId}`);
      } else {
        navigateRef.current("/parent/messagerie");
      }
    },
    []
  );

  const handleSelectEnfant = useCallback(
    (enfant) => {
      if (enfant?._id) {
        setSelectedEnfant(enfant);
        navigateRef.current(`/parent/enfants/${enfant._id}`);
      }
    },
    [setSelectedEnfant]
  );

  const handleBackToEnfants = useCallback(() => {
    navigateRef.current("/parent/enfants");
  }, []);

  const handleOpenAddChild = useCallback(() => {
    navigateRef.current("/parent/enfants/new");
  }, []);

  const handleCloseAddChild = useCallback(() => {
    navigateRef.current("/parent/enfants");
  }, []);

  const handleGoToEnfants = useCallback(() => {
    navigateRef.current("/parent/enfants");
  }, []);

  // ════════════════════════════════════════════════════════════════════
  // Menu
  // ════════════════════════════════════════════════════════════════════
  const menu = useMemo(
    () => [
      { id: "enfants", label: "Mes enfants", icon: <Users size={20} /> },
      { id: "messagerie", label: "Messages", icon: <MessageCircle size={20} /> },
      { id: "emploi", label: "Emploi du temps", icon: <Calendar size={20} /> },
      { id: "appels", label: "Appels", icon: <Phone size={20} /> },
      { id: "aide", label: "Aide", icon: <HelpCircle size={20} /> },
      { id: "mentions", label: "Mentions légales", icon: <FileText size={20} /> },
      {
        id: "confidentialite",
        label: "Confidentialité",
        icon: <Shield size={20} />,
      },
    ],
    []
  );

  // ════════════════════════════════════════════════════════════════════
  // RENDU CONTENU
  // ════════════════════════════════════════════════════════════════════
  const renderContent = () => {
    switch (tab) {
      case "enfants":
        // Sous-route : ajouter un enfant
        if (sub === "new") {
          return (
            <DemandeAssociation
              user={user}
              dark={dark}
              onClose={handleCloseAddChild}
              isMobile={isMobile}
            />
          );
        }
        // Sous-route : dossier d'un enfant
        if (selectedEnfantFromUrl) {
          return (
            <DossierEnfant
              enfant={selectedEnfantFromUrl}
              punitions={punitions}
              fautes={fautes}
              ecoleId={ecoleId}
              anneeId={anneeId}
              user={user}
              onBack={handleBackToEnfants}
              isMobile={isMobile}
              dark={dark}
              tokens={tokens}
            />
          );
        }
        // Vue par défaut : liste
        return (
          <ListeEnfants
            eleves={eleves}
            punitions={punitions}
            fautes={fautes}
            user={user}
            onSelectEnfant={handleSelectEnfant}
            isMobile={isMobile}
            dark={dark}
            tokens={tokens}
            onAddChild={handleOpenAddChild}
          />
        );

      case "emploi": {
        const enfantPourEmploi = selectedEnfantFromUrl || selectedEnfantZustand;
        if (!enfantPourEmploi) {
          return (
            <EmptyEmploi
              tokens={tokens}
              isMobile={isMobile}
              onGoToEnfants={handleGoToEnfants}
            />
          );
        }
        return (
          <ConsultationEmploiDuTemps
            ecoleId={ecoleId}
            classe={enfantPourEmploi.classe}
            anneeId={anneeId}
            user={user}
          />
        );
      }

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
      {ParentAppKeyframes}
      <div className="pa-fade-in">{renderContent()}</div>
    </Layout>
  );
}

// ════════════════════════════════════════════════════════════════════
// SOUS-COMPOSANT : Empty state Emploi
// ════════════════════════════════════════════════════════════════════
function EmptyEmploi({ tokens, isMobile, onGoToEnfants }) {
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
          background: tokens.primarySoft,
          color: tokens.primary,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 16px",
        }}
      >
        <Calendar size={30} />
      </div>
      <h2
        style={{
          fontSize: isMobile ? 17 : 20,
          fontWeight: 700,
          color: tokens.text,
          margin: "0 0 6px",
        }}
      >
        Emploi du temps
      </h2>
      <p
        style={{
          color: tokens.textMuted,
          marginBottom: 20,
          fontSize: 13.5,
          maxWidth: 360,
          marginLeft: "auto",
          marginRight: "auto",
          lineHeight: 1.5,
        }}
      >
        Veuillez d'abord sélectionner un enfant dans la section « Mes enfants ».
      </p>
      <button
        type="button"
        onClick={onGoToEnfants}
        style={{
          padding: "12px 20px",
          background: tokens.primary,
          color: "white",
          border: "none",
          borderRadius: 10,
          cursor: "pointer",
          fontWeight: 700,
          fontSize: 13.5,
          minHeight: 44,
        }}
      >
        Choisir un enfant
      </button>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// LISTE DES ENFANTS
// ════════════════════════════════════════════════════════════════════
function ListeEnfants({
  eleves,
  punitions,
  fautes,
  user,
  onSelectEnfant,
  isMobile,
  dark,
  tokens,
  onAddChild,
}) {
  // ✅ Recherche locale (au lieu de Zustand)
  const [search, setSearch] = useState("");

  // ✅ Map fautes O(1)
  const fautesById = useMemo(
    () => new Map((fautes ?? []).map((f) => [f._id, f])),
    [fautes]
  );

  // ✅ Punitions par élève
  const punitionsParEleve = useMemo(() => {
    const acc = new Map();
    for (const p of punitions) {
      if (!acc.has(p.idEleve)) {
        acc.set(p.idEleve, { count: 0, hasGrave: false });
      }
      const entry = acc.get(p.idEleve);
      entry.count++;
      const faute = fautesById.get(p.idFaute);
      if (faute?.gravite === "Grave") entry.hasGrave = true;
    }
    return acc;
  }, [punitions, fautesById]);

  const stats = useMemo(() => {
    const totalEnfants = eleves.length;
    const totalPunitions = punitions.length;
    let totalGraves = 0;
    for (const p of punitions) {
      if (fautesById.get(p.idFaute)?.gravite === "Grave") totalGraves++;
    }
    return { totalEnfants, totalPunitions, totalGraves };
  }, [eleves, punitions, fautesById]);

  const elevesTries = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...eleves]
      .filter((e) => {
        if (!q) return true;
        return `${e.nom ?? ""} ${e.postnom ?? ""}`.toLowerCase().includes(q);
      })
      .sort((a, b) => {
        const classeCompare = (a.classe || "").localeCompare(
          b.classe || "",
          undefined,
          { numeric: true, sensitivity: "base" }
        );
        if (classeCompare !== 0) return classeCompare;
        return `${a.nom} ${a.postnom}`.localeCompare(
          `${b.nom} ${b.postnom}`,
          undefined,
          { sensitivity: "base" }
        );
      });
  }, [eleves, search]);

  // ════════════════════════════════════════════════════════════════════
  // ÉTAT VIDE : aucun enfant
  // ════════════════════════════════════════════════════════════════════
  if (eleves.length === 0) {
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
            background: tokens.primarySoft,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
            color: tokens.primary,
          }}
        >
          <Users size={30} />
        </div>
        <h2
          style={{
            fontSize: isMobile ? 17 : 20,
            fontWeight: 700,
            color: tokens.text,
            margin: "0 0 6px",
          }}
        >
          Aucun enfant associé
        </h2>
        <p
          style={{
            color: tokens.textMuted,
            fontSize: 13,
            maxWidth: 380,
            marginLeft: "auto",
            marginRight: "auto",
            marginBottom: 20,
            lineHeight: 1.5,
          }}
        >
          Demandez l'association d'un enfant à votre compte en fournissant son
          matricule.
        </p>
        <button
          type="button"
          onClick={onAddChild}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 20px",
            background: tokens.primary,
            color: "white",
            border: "none",
            borderRadius: 10,
            fontWeight: 700,
            cursor: "pointer",
            fontSize: 13.5,
            minHeight: 44,
          }}
        >
          <UserPlus size={16} /> Associer un enfant
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: 900,
        margin: "0 auto",
        padding: isMobile ? "12px 12px 24px" : "20px 16px 32px",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* ═══ En-tête ═══ */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 10,
          marginBottom: isMobile ? 12 : 20,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <h2
            style={{
              fontSize: isMobile ? 18 : 22,
              fontWeight: 700,
              color: tokens.text,
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            Mes enfants
          </h2>
          <p
            style={{
              color: tokens.textMuted,
              marginTop: 2,
              marginBottom: 0,
              fontSize: isMobile ? 12 : 13,
            }}
          >
            {eleves.length} enfant{eleves.length > 1 ? "s" : ""} associé
            {eleves.length > 1 ? "s" : ""}
          </p>
        </div>
        {!isMobile && (
          <button
            type="button"
            onClick={onAddChild}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 16px",
              background: tokens.primary,
              color: "white",
              border: "none",
              borderRadius: 10,
              fontWeight: 700,
              cursor: "pointer",
              fontSize: 13,
              minHeight: 40,
            }}
          >
            <UserPlus size={15} /> Ajouter
          </button>
        )}
      </div>

      {/* ═══ Stats ═══ */}
      <div
        style={{
          display: isMobile ? "flex" : "grid",
          gridTemplateColumns: isMobile
            ? undefined
            : "repeat(auto-fit, minmax(150px, 1fr))",
          gap: isMobile ? 8 : 12,
          marginBottom: isMobile ? 12 : 16,
          overflowX: isMobile ? "auto" : "visible",
          paddingBottom: isMobile ? 4 : 0,
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
        }}
      >
        <StatCard
          icon={<Users size={16} />}
          label="Enfants"
          value={stats.totalEnfants}
          color={tokens.primary}
          tokens={tokens}
          isMobile={isMobile}
        />
        <StatCard
          icon={<ClipboardList size={16} />}
          label="Punitions"
          value={stats.totalPunitions}
          color={tokens.warning}
          tokens={tokens}
          isMobile={isMobile}
        />
        <StatCard
          icon={<AlertTriangle size={16} />}
          label="Fautes graves"
          value={stats.totalGraves}
          color={tokens.danger}
          tokens={tokens}
          isMobile={isMobile}
        />
      </div>

      {/* ═══ Recherche ═══ */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: tokens.surface,
          border: `1px solid ${tokens.border}`,
          borderRadius: 12,
          padding: "0 12px",
          marginBottom: isMobile ? 12 : 16,
        }}
      >
        <Search size={16} color={tokens.textMuted} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un enfant…"
          aria-label="Rechercher un enfant"
          style={{
            border: "none",
            outline: "none",
            background: "transparent",
            width: "100%",
            padding: isMobile ? "14px 0" : "12px 0",
            fontSize: isMobile ? 16 : 14,
            color: tokens.text,
            fontFamily: "inherit",
          }}
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            aria-label="Effacer la recherche"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: tokens.textMuted,
              display: "flex",
              padding: 4,
              marginRight: -4,
            }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* ═══ Liste ═══ */}
      {elevesTries.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: isMobile ? 32 : 48,
            color: tokens.textMuted,
          }}
        >
          <Users size={40} style={{ marginBottom: 12, opacity: 0.5 }} />
          <p style={{ margin: 0, fontSize: 13.5 }}>
            Aucun enfant ne correspond à « {search} »
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile
              ? "1fr"
              : "repeat(auto-fill, minmax(320px, 1fr))",
            gap: isMobile ? 8 : 12,
          }}
        >
          {elevesTries.map((enfant) => (
            <EnfantCard
              key={enfant._id}
              enfant={enfant}
              stats={
                punitionsParEleve.get(enfant._id) || {
                  count: 0,
                  hasGrave: false,
                }
              }
              onSelect={onSelectEnfant}
              isMobile={isMobile}
              tokens={tokens}
            />
          ))}
        </div>
      )}

      {/* ═══ FAB ajouter (mobile) ═══ */}
      {isMobile && (
        <button
          type="button"
          onClick={onAddChild}
          aria-label="Associer un enfant"
          title="Associer un enfant"
          style={{
            position: "fixed",
            bottom: "calc(24px + env(safe-area-inset-bottom, 0px))",
            right: "calc(20px + env(safe-area-inset-right, 0px))",
            width: 56,
            height: 56,
            borderRadius: 28,
            background: tokens.primary,
            color: "#FFFFFF",
            border: "none",
            boxShadow: "0 6px 20px rgba(79,70,229,0.4)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 900,
            transition: "transform 0.15s ease",
          }}
        >
          <UserPlus size={24} />
        </button>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// CARTE ENFANT (hover + focus state)
// ════════════════════════════════════════════════════════════════════
function EnfantCard({ enfant, stats, onSelect, isMobile, tokens }) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  const { count: nbPunitions, hasGrave } = stats;
  const initials = `${enfant.nom?.[0] || ""}${
    enfant.postnom?.[0] || ""
  }`.toUpperCase();

  const handleClick = () => onSelect(enfant);
  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        background: hovered ? tokens.surfaceHover : tokens.surface,
        borderRadius: 12,
        padding: isMobile ? "12px 14px" : "14px 16px",
        boxShadow: tokens.shadow,
        border: `1.5px solid ${
          hasGrave
            ? tokens.danger
            : focused
            ? tokens.primary
            : tokens.border
        }`,
        display: "flex",
        alignItems: "center",
        gap: 12,
        cursor: "pointer",
        transition:
          "border-color 0.15s ease, background-color 0.15s ease",
        userSelect: "none",
        WebkitTapHighlightColor: "transparent",
        minWidth: 0,
        minHeight: 68,
        outline: focused ? `2px solid ${tokens.primary}` : "none",
        outlineOffset: -2,
        boxSizing: "border-box",
      }}
      aria-label={`Ouvrir le dossier de ${enfant.nom} ${enfant.postnom}`}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          background: hasGrave ? tokens.dangerSoft : tokens.primarySoft,
          color: hasGrave ? tokens.danger : tokens.primary,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          fontSize: 13,
          flexShrink: 0,
        }}
        aria-hidden="true"
      >
        {initials}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontWeight: 600,
            fontSize: isMobile ? 14.5 : 14.5,
            color: tokens.text,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {enfant.nom} {enfant.postnom}
        </div>
        <div
          style={{
            fontSize: 11.5,
            color: tokens.textMuted,
            marginTop: 2,
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexWrap: "wrap",
          }}
        >
          <span>{enfant.classe || "Classe inconnue"}</span>
          {nbPunitions > 0 && (
            <>
              <span style={{ opacity: 0.5 }}>·</span>
              <span
                style={{
                  color: hasGrave ? tokens.danger : tokens.textMuted,
                  fontWeight: 600,
                }}
              >
                {nbPunitions} punition{nbPunitions > 1 ? "s" : ""}
              </span>
            </>
          )}
        </div>
      </div>

      <ChevronRight size={18} color={tokens.textMuted} style={{ flexShrink: 0 }} />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// CARTE STATISTIQUE
// ════════════════════════════════════════════════════════════════════
function StatCard({ icon, label, value, color, tokens, isMobile }) {
  return (
    <div
      style={{
        background: tokens.surface,
        borderRadius: 12,
        padding: isMobile ? "10px 12px" : "14px 16px",
        boxShadow: tokens.shadow,
        border: `1px solid ${tokens.border}`,
        display: "flex",
        alignItems: "center",
        gap: 10,
        minWidth: isMobile ? 130 : "auto",
        flex: isMobile ? "0 0 auto" : 1,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: `${color}20`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          color,
        }}
        aria-hidden="true"
      >
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            color: tokens.textMuted,
            fontSize: 10.5,
            fontWeight: 500,
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </div>
        <div
          style={{
            color: tokens.text,
            fontSize: 18,
            fontWeight: 700,
            lineHeight: 1.1,
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// DOSSIER D'UN ENFANT
// ════════════════════════════════════════════════════════════════════
function DossierEnfant({
  enfant,
  punitions,
  fautes,
  ecoleId,
  anneeId,
  user,
  onBack,
  isMobile,
  dark,
  tokens,
}) {
  const [subTab, setSubTab] = useState("punitions");

  // ✅ Filtre punitions de cet enfant
  const enfantPunitions = useMemo(
    () =>
      punitions
        .filter((p) => p.idEleve === enfant._id)
        .sort((a, b) => new Date(b.date) - new Date(a.date)),
    [punitions, enfant._id]
  );

  // ✅ Map fautes
  const fautesById = useMemo(
    () => new Map((fautes ?? []).map((f) => [f._id, f])),
    [fautes]
  );

  const scoreConduite = useMemo(() => {
    let score = 100;
    enfantPunitions.forEach((p) => {
      const faute = fautesById.get(p.idFaute);
      if (faute?.gravite === "Légère") score -= 2;
      else if (faute?.gravite === "Moyenne") score -= 5;
      else if (faute?.gravite === "Grave") score -= 10;
    });
    return Math.max(0, Math.min(100, score));
  }, [enfantPunitions, fautesById]);

  const scoreColor =
    scoreConduite >= 80
      ? tokens.success
      : scoreConduite >= 50
      ? tokens.warning
      : tokens.danger;
  const scoreBg =
    scoreConduite >= 80
      ? tokens.successSoft
      : scoreConduite >= 50
      ? tokens.warningSoft
      : tokens.dangerSoft;

  const initials = `${enfant.nom?.[0] || ""}${
    enfant.postnom?.[0] || ""
  }`.toUpperCase();

  const sousOnglets = useMemo(
    () => [
      {
        id: "punitions",
        label: "Punitions",
        icon: <AlertTriangle size={14} />,
      },
      { id: "frais", label: "Frais", icon: <DollarSign size={14} /> },
      { id: "bulletin", label: "Bulletin", icon: <BookOpen size={14} /> },
      { id: "absences", label: "Absences", icon: <Calendar size={14} /> },
      { id: "emploi", label: "Emploi", icon: <Clock size={14} /> },
      { id: "examens", label: "Examens", icon: <Award size={14} /> },
    ],
    []
  );

  return (
    <div
      style={{
        maxWidth: 960,
        margin: "0 auto",
        padding: isMobile ? "12px 12px 24px" : "20px 16px 32px",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* ═══ HEADER ═══ */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: isMobile ? 14 : 20,
        }}
      >
        <button
          type="button"
          onClick={onBack}
          aria-label="Retour aux enfants"
          title="Retour"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 44,
            height: 44,
            borderRadius: 12,
            background: tokens.surface,
            border: `1px solid ${tokens.border}`,
            cursor: "pointer",
            color: tokens.text,
            flexShrink: 0,
            padding: 0,
          }}
        >
          <ArrowLeft size={20} />
        </button>
        <div
          style={{
            width: isMobile ? 42 : 46,
            height: isMobile ? 42 : 46,
            borderRadius: "50%",
            background: tokens.primarySoft,
            color: tokens.primary,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: isMobile ? 14 : 15,
            flexShrink: 0,
          }}
          aria-hidden="true"
        >
          {initials}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h2
            style={{
              fontSize: isMobile ? 15.5 : 17,
              fontWeight: 700,
              color: tokens.text,
              margin: 0,
              lineHeight: 1.2,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {enfant.nom} {enfant.postnom}
          </h2>
          <p
            style={{
              color: tokens.textMuted,
              marginTop: 2,
              marginBottom: 0,
              fontSize: isMobile ? 11.5 : 12.5,
            }}
          >
            Classe {enfant.classe}
          </p>
        </div>

        {/* Score */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 10px",
            background: scoreBg,
            color: scoreColor,
            borderRadius: 10,
            flexShrink: 0,
          }}
        >
          <TrendingUp size={14} />
          <div>
            <div
              style={{
                fontSize: 9,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: 0.3,
                lineHeight: 1,
                opacity: 0.8,
              }}
            >
              Conduite
            </div>
            <div
              style={{
                fontSize: isMobile ? 15 : 16,
                fontWeight: 800,
                lineHeight: 1.1,
              }}
            >
              {scoreConduite}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ SUBTABS ═══ */}
      <div
        role="tablist"
        style={{
          display: "flex",
          gap: 4,
          borderBottom: `2px solid ${tokens.border}`,
          marginBottom: isMobile ? 14 : 20,
          overflowX: "auto",
          whiteSpace: "nowrap",
          scrollbarWidth: "none",
        }}
      >
        {sousOnglets.map((t) => {
          const isActive = subTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setSubTab(t.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: isMobile ? "10px 12px" : "11px 16px",
                minHeight: 44,
                border: "none",
                background: "transparent",
                color: isActive ? tokens.primary : tokens.textMuted,
                fontWeight: isActive ? 700 : 500,
                borderBottom: isActive
                  ? `3px solid ${tokens.primary}`
                  : "3px solid transparent",
                cursor: "pointer",
                fontSize: isMobile ? 13 : 13.5,
                flexShrink: 0,
                marginBottom: -2,
              }}
            >
              {t.icon}
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ═══ CONTENU ═══ */}
      {subTab === "punitions" && (
        <div>
          {enfantPunitions.length === 0 ? (
            <div
              style={{
                background: tokens.surface,
                borderRadius: 14,
                padding: isMobile ? 32 : 48,
                textAlign: "center",
                boxShadow: tokens.shadow,
                color: tokens.textMuted,
                border: `1px solid ${tokens.border}`,
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: tokens.successSoft,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 12px",
                }}
              >
                <CheckCircle2 size={26} color={tokens.success} />
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: tokens.text,
                }}
              >
                Aucune punition
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 12 }}>
                Cet enfant n'a aucun antécédent disciplinaire
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {enfantPunitions.map((p) => {
                const faute = fautesById.get(p.idFaute);
                const gravite = faute?.gravite || "—";
                const isGrave = gravite === "Grave";
                const isMoyenne = gravite === "Moyenne";
                const badgeBg = isGrave
                  ? tokens.dangerSoft
                  : isMoyenne
                  ? tokens.warningSoft
                  : tokens.successSoft;
                const badgeColor = isGrave
                  ? tokens.danger
                  : isMoyenne
                  ? tokens.warning
                  : tokens.success;

                return (
                  <div
                    key={p._id}
                    style={{
                      background: tokens.surface,
                      borderRadius: 12,
                      padding: isMobile ? "12px 14px" : "14px 16px",
                      boxShadow: tokens.shadow,
                      border: `1px solid ${tokens.border}`,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 6,
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: isMobile ? 13.5 : 14,
                          color: tokens.text,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          minWidth: 0,
                        }}
                      >
                        {faute?.libelle || "Faute inconnue"}
                      </div>
                      <span
                        style={{
                          background: badgeBg,
                          color: badgeColor,
                          padding: "3px 9px",
                          borderRadius: 10,
                          fontSize: 10.5,
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {gravite}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 11.5,
                        color: tokens.textMuted,
                        marginBottom: 4,
                      }}
                    >
                      {p.date} · Sanction : {p.sanction}
                    </div>
                    {p.commentaire && (
                      <div
                        style={{
                          fontSize: 11,
                          color: tokens.textMuted,
                          marginTop: 4,
                          fontStyle: "italic",
                        }}
                      >
                        « {p.commentaire} »
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {subTab === "frais" && (
        <FraisEnfant eleveId={enfant._id} user={user} />
      )}
      {subTab === "bulletin" && (
        <BulletinEnfant
          eleveId={enfant._id}
          ecoleId={ecoleId}
          nom={enfant.nom}
          postnom={enfant.postnom}
          classe={enfant.classe}
          user={user}
        />
      )}
      {subTab === "absences" && (
        <AbsencesEnfant eleveId={enfant._id} user={user} />
      )}
      {subTab === "emploi" && (
        <ConsultationEmploiDuTemps
          ecoleId={ecoleId}
          classe={enfant.classe}
          anneeId={anneeId}
          user={user}
        />
      )}
      {subTab === "examens" && (
        <ConsultationExamens
          ecoleId={ecoleId}
          anneeId={anneeId}
          classe={enfant.classe}
          user={user}
        />
      )}
    </div>
  );
}