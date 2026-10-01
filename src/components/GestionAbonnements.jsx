// src/components/GestionAbonnements.jsx
import { useState, useMemo, useCallback, useEffect, useId } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useConfirm } from "@/hooks/useConfirm";
import { ConfirmDialog } from "./ConfirmDialog";
import {
  Search, CheckCircle, Clock, XCircle, AlertTriangle,
  CreditCard, Users, DollarSign, RefreshCw, Ban, Play,
  X, Calendar, Lock, Loader,
} from "lucide-react";
import toast from "react-hot-toast";

// ════════════════════════════════════════════════════════════════════
// CONSTANTES MODULE-LEVEL
// ════════════════════════════════════════════════════════════════════
const TAP_BASE = {
  touchAction: "manipulation",
  WebkitTapHighlightColor: "transparent",
  minHeight: 44,
};

const SCROLL_AREA = {
  overscrollBehavior: "contain",
  WebkitOverflowScrolling: "touch",
};

const SAFE_BOTTOM = {
  paddingBottom: "calc(24px + env(safe-area-inset-bottom, 0px))",
};

const FOCUS_RING = (color) => ({
  outline: `2px solid ${color}`,
  outlineOffset: 2,
});

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

// ════════════════════════════════════════════════════════════════════
// KEYFRAMES MODULE-LEVEL
// ════════════════════════════════════════════════════════════════════
const GestionAbonnementsKeyframes = (
  <style>{`
    @keyframes ga-fade-in {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    @keyframes ga-slide-up {
      from { transform: translateY(16px); opacity: 0; }
      to   { transform: translateY(0);    opacity: 1; }
    }
    @keyframes ga-spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
    .ga-fade-in  { animation: ga-fade-in 0.2s ease-out; }
    .ga-slide-up { animation: ga-slide-up 0.25s ease-out; }
    .ga-spin     { animation: ga-spin 1s linear infinite; }
    @media (prefers-reduced-motion: reduce) {
      .ga-fade-in, .ga-slide-up, .ga-spin { animation: none !important; }
    }
  `}</style>
);

// ════════════════════════════════════════════════════════════════════
// CONFIG STATUTS
// ════════════════════════════════════════════════════════════════════
const STATUT_CONFIG = {
  actif: {
    label: "Actif",
    color: "#10B981",
    bgDark: "#064E3B",
    bgLight: "#D1FAE5",
    icon: CheckCircle,
  },
  grace: {
    label: "En grâce",
    color: "#F59E0B",
    bgDark: "#78350F",
    bgLight: "#FEF3C7",
    icon: Clock,
  },
  suspendu: {
    label: "Suspendu",
    color: "#EF4444",
    bgDark: "#7F1D1D",
    bgLight: "#FEE2E2",
    icon: Ban,
  },
  expire: {
    label: "Expiré",
    color: "#64748B",
    bgDark: "#334155",
    bgLight: "#F1F5F9",
    icon: XCircle,
  },
};

// ════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════
function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function formatMontant(montant, devise = "USD") {
  if (typeof montant !== "number") return `0 ${devise}`;
  return `${montant.toLocaleString("fr-FR")} ${devise}`;
}

function getErrorMessage(err, fallback = "Une erreur est survenue") {
  if (!err) return fallback;
  if (typeof err === "string") return err;
  if (typeof err === "object" && err.message) return err.message;
  return fallback;
}

// ════════════════════════════════════════════════════════════════════
// HOOK — Focus trap
// ════════════════════════════════════════════════════════════════════
function useFocusTrap(panelRef, isOpen) {
  useEffect(() => {
    if (!isOpen) return;
    const panel = panelRef.current;
    if (!panel) return;
    const handleTab = (e) => {
      if (e.key !== "Tab") return;
      const focusables = panel.querySelectorAll(FOCUSABLE_SELECTOR);
      if (focusables.length === 0) { e.preventDefault(); return; }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    panel.addEventListener("keydown", handleTab);
    return () => panel.removeEventListener("keydown", handleTab);
  }, [panelRef, isOpen]);
}

// ════════════════════════════════════════════════════════════════════
// PRESSABLE — feedback tap + focus ring
// ════════════════════════════════════════════════════════════════════
function Pressable({
  onClick, style, children, disabled = false, type = "button",
  focusColor, ariaLabel, ariaBusy, ...rest
}) {
  const [pressed, setPressed] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-busy={ariaBusy}
      onPointerDown={() => !disabled && setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => { setPressed(false); setHovered(false); }}
      onPointerCancel={() => setPressed(false)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      data-hovered={hovered ? "true" : undefined}
      style={{
        ...TAP_BASE,
        transform: pressed && !disabled ? "scale(0.97)" : "scale(1)",
        transition: "transform 0.12s ease, background-color 0.2s, border-color 0.2s, color 0.2s",
        ...(focused && !disabled && focusColor ? FOCUS_RING(focusColor) : null),
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ════════════════════════════════════════════════════════════════════
export function GestionAbonnements({ user, canWrite = true }) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();
  const { confirm, dialogProps } = useConfirm();

  const userId = user?._id;

  const [searchTerm, setSearchTerm] = useState("");
  const [statutFilter, setStatutFilter] = useState("");
  const [showPaiementModal, setShowPaiementModal] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [searchFocused, setSearchFocused] = useState(false);

  // Queries
  const args = useMemo(() => (userId ? { userId } : "skip"), [userId]);

  const abonnementsRaw = useQuery(api.abonnements.listAll, args);
  const stats = useQuery(api.abonnements.statsGlobales, args);
  const ecolesRaw = useQuery(api.ecoles.listWithUserCount, args);

  const abonnements = useMemo(() => abonnementsRaw ?? [], [abonnementsRaw]);
  const ecoles = useMemo(() => ecolesRaw ?? [], [ecolesRaw]);

  const isLoading = abonnementsRaw === undefined || stats === undefined;

  // Mutations
  const enregistrerPaiement = useMutation(api.abonnements.enregistrerPaiement);
  const recalculerFormule = useMutation(api.abonnements.recalculerFormule);
  const suspendre = useMutation(api.abonnements.suspendre);
  const reactiver = useMutation(api.abonnements.reactiver);
  const creerPourEcole = useMutation(api.abonnements.creerPourEcole);

  // Couleurs
  const colors = useMemo(() => ({
    textPrimary: dark ? "#F1F5F9" : "#1E293B",
    textSecondary: dark ? "#94A3B8" : "#64748B",
    cardBg: dark ? "#1E293B" : "#FFFFFF",
    cardBorder: dark ? "#334155" : "#E2E8F0",
    inputBg: dark ? "#0F172A" : "#F8FAFC",
    accent: dark ? "#818CF8" : "#4F46E5",
    hoverBg: dark ? "#26334D" : "#F8FAFC",
  }), [dark]);

  const { textPrimary, textSecondary, cardBg, cardBorder, inputBg, accent, hoverBg } = colors;

  // Filtres
  const abonnementsFiltres = useMemo(() => {
    let filtered = abonnements;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          (a.ecoleNom ?? "").toLowerCase().includes(q) ||
          (a.ecoleCode ?? "").toLowerCase().includes(q)
      );
    }
    if (statutFilter) {
      filtered = filtered.filter((a) => a.statut === statutFilter);
    }
    return filtered;
  }, [abonnements, searchTerm, statutFilter]);

  // Handlers
  const handleRecalculer = useCallback(async (abonnementId, ecoleNom) => {
    if (!canWrite) {
      toast.error("Permission requise : abonnements.write");
      return;
    }
    const ok = await confirm(
      "Recalculer la formule",
      `Recalculer la formule de ${ecoleNom} selon le nombre actuel d'utilisateurs ?`
    );
    if (!ok) return;
    setBusyId(abonnementId);
    try {
      const res = await recalculerFormule({ abonnementId, userId });
      toast.success(`Formule mise à jour : ${res.formule} → ${res.montant} USD/mois`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }, [confirm, recalculerFormule, userId, canWrite]);

  const handleSuspendre = useCallback(async (abonnementId, ecoleNom) => {
    if (!canWrite) {
      toast.error("Permission requise : abonnements.write");
      return;
    }
    const ok = await confirm(
      "Suspendre l'abonnement",
      `Suspendre l'abonnement de ${ecoleNom} ? L'école perdra l'accès à la plateforme.`
    );
    if (!ok) return;
    setBusyId(abonnementId);
    try {
      await suspendre({ abonnementId, userId });
      toast.success("Abonnement suspendu");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }, [confirm, suspendre, userId, canWrite]);

  const handleReactiver = useCallback(async (abonnementId) => {
    if (!canWrite) {
      toast.error("Permission requise : abonnements.write");
      return;
    }
    setBusyId(abonnementId);
    try {
      await reactiver({ abonnementId, userId });
      toast.success("Abonnement réactivé");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }, [reactiver, userId, canWrite]);

  const handleSavePaiement = useCallback(async (abonnementId, payload) => {
    if (!canWrite) {
      toast.error("Permission requise : abonnements.write");
      throw new Error("Permission refusée");
    }
    try {
      const res = await enregistrerPaiement({ abonnementId, userId, ...payload });
      toast.success(`Paiement enregistré — nouvelle échéance : ${formatDate(res.prochaineEcheance)}`);
      setShowPaiementModal(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
      throw err;
    }
  }, [enregistrerPaiement, userId, canWrite]);

  const handleCreateAbonnement = useCallback(async (payload) => {
    if (!canWrite) {
      toast.error("Permission requise : abonnements.write");
      throw new Error("Permission refusée");
    }
    try {
      await creerPourEcole({ ...payload, userId });
      toast.success("Abonnement créé");
      setShowCreateModal(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
      throw err;
    }
  }, [creerPourEcole, userId, canWrite]);

  // ════════════════════════════════════════════════════════════════════
  // GARDE : session invalide
  // ════════════════════════════════════════════════════════════════════
  if (!user || !userId) {
    return (
      <>
        {GestionAbonnementsKeyframes}
        <div
          role="alert"
          style={{ padding: 40, textAlign: "center", color: textSecondary }}
        >
          Session invalide.
        </div>
      </>
    );
  }

  return (
    <div
      style={{
        maxWidth: 1280,
        margin: "0 auto",
        padding: isMobile ? "10px 8px 24px" : "20px 16px 32px",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {GestionAbonnementsKeyframes}

      {/* ═══════════ Bandeau lecture seule ═══════════ */}
      {!canWrite && (
        <div
          role="note"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 14px",
            marginBottom: isMobile ? 12 : 16,
            background: dark ? "rgba(148,163,184,0.08)" : "rgba(100,116,139,0.08)",
            border: `1px solid ${cardBorder}`,
            borderRadius: 10,
            fontSize: 13,
            color: textSecondary,
          }}
        >
          <Lock size={14} aria-hidden="true" />
          <span>
            <strong style={{ color: textPrimary }}>Mode lecture seule</strong> —
            vous n'avez pas la permission de modifier les abonnements.
          </span>
        </div>
      )}

      {/* ═══════════ En-tête ═══════════ */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: isMobile ? 14 : 20,
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2
            style={{
              fontSize: isMobile ? 18 : 24,
              fontWeight: 700,
              color: textPrimary,
              margin: 0,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <CreditCard size={isMobile ? 22 : 26} color={accent} aria-hidden="true" />
            Abonnements LITE
          </h2>
          <p
            style={{
              color: textSecondary,
              marginTop: 4,
              marginBottom: 0,
              fontSize: isMobile ? 12 : 14,
            }}
          >
            Suivi des abonnements, paiements et échéances
          </p>
        </div>

        {canWrite && ecoles.length > abonnements.length && (
          <Pressable
            onClick={() => setShowCreateModal(true)}
            focusColor={accent}
            ariaLabel="Créer un nouvel abonnement"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 16px",
              background: accent,
              color: "#FFFFFF",
              border: "none",
              borderRadius: 10,
              fontWeight: 600,
              fontSize: 14,
              whiteSpace: "nowrap",
            }}
          >
            <CreditCard size={16} aria-hidden="true" />
            Nouvel abonnement
          </Pressable>
        )}
      </div>

      {/* ═══════════ Stats globales ═══════════ */}
      {stats && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile
              ? "repeat(2, 1fr)"
              : "repeat(auto-fit, minmax(180px, 1fr))",
            gap: isMobile ? 10 : 14,
            marginBottom: isMobile ? 16 : 24,
          }}
        >
          <StatCard
            icon={<Users size={18} aria-hidden="true" />}
            value={stats.total}
            label="Établissements"
            color="#4F46E5"
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            cardBg={cardBg}
            cardBorder={cardBorder}
          />
          <StatCard
            icon={<CheckCircle size={18} aria-hidden="true" />}
            value={stats.actifs}
            label="Actifs"
            color="#10B981"
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            cardBg={cardBg}
            cardBorder={cardBorder}
          />
          <StatCard
            icon={<Clock size={18} aria-hidden="true" />}
            value={stats.enGrace}
            label="En grâce"
            color="#F59E0B"
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            cardBg={cardBg}
            cardBorder={cardBorder}
          />
          <StatCard
            icon={<Ban size={18} aria-hidden="true" />}
            value={stats.suspendus}
            label="Suspendus"
            color="#EF4444"
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            cardBg={cardBg}
            cardBorder={cardBorder}
          />
          <StatCard
            icon={<DollarSign size={18} aria-hidden="true" />}
            value={`${stats.revenuMensuelAttendu} $`}
            label="Revenu attendu/mois"
            color="#6366F1"
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            cardBg={cardBg}
            cardBorder={cardBorder}
          />
          <StatCard
            icon={<AlertTriangle size={18} aria-hidden="true" />}
            value={stats.ecolesImpayees}
            label="Écoles impayées"
            color="#EF4444"
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            cardBg={cardBg}
            cardBorder={cardBorder}
          />
        </div>
      )}

      {/* ═══════════ Filtres ═══════════ */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: isMobile ? 12 : 16,
          flexDirection: isMobile ? "column" : "row",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 14px",
            borderRadius: 10,
            border: `1px solid ${searchFocused ? accent : cardBorder}`,
            background: cardBg,
            flex: 1,
            transition: "border-color 0.2s",
            minHeight: 44,
          }}
        >
          <Search size={16} color={textSecondary} aria-hidden="true" />
          <input
            type="search"
            inputMode="search"
            enterKeyHint="search"
            autoCorrect="off"
            spellCheck="false"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Rechercher une école…"
            aria-label="Rechercher une école"
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              background: "transparent",
              color: textPrimary,
              fontSize: isMobile ? 16 : 14,
              fontFamily: "inherit",
              minHeight: 24,
            }}
          />
          {searchTerm && (
            <Pressable
              onClick={() => setSearchTerm("")}
              focusColor={accent}
              ariaLabel="Effacer la recherche"
              style={{
                background: "none",
                border: "none",
                color: textSecondary,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 8,
                minWidth: 36,
                minHeight: 36,
                marginRight: -4,
              }}
            >
              <X size={14} aria-hidden="true" />
            </Pressable>
          )}
        </div>
        <select
          value={statutFilter}
          onChange={(e) => setStatutFilter(e.target.value)}
          aria-label="Filtrer par statut"
          style={{
            ...TAP_BASE,
            padding: "10px 14px",
            borderRadius: 10,
            border: `1px solid ${cardBorder}`,
            background: cardBg,
            color: textPrimary,
            fontSize: isMobile ? 16 : 14,
            cursor: "pointer",
            minWidth: isMobile ? "100%" : 180,
            outline: "none",
            fontFamily: "inherit",
            appearance: "none",
            WebkitAppearance: "none",
          }}
        >
          <option value="">Tous les statuts</option>
          <option value="actif">Actifs</option>
          <option value="grace">En grâce</option>
          <option value="suspendu">Suspendus</option>
          <option value="expire">Expirés</option>
        </select>
      </div>

      {/* ═══════════ Liste ═══════════ */}
      {isLoading ? (
        <div
          role="status"
          aria-busy="true"
          aria-live="polite"
          style={{
            background: cardBg,
            borderRadius: 14,
            border: `1px solid ${cardBorder}`,
            padding: 40,
            textAlign: "center",
            color: textSecondary,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
          }}
        >
          <Loader size={20} className="ga-spin" aria-hidden="true" />
          <span>Chargement…</span>
        </div>
      ) : abonnementsFiltres.length === 0 ? (
        <div
          role="status"
          aria-live="polite"
          style={{
            background: cardBg,
            borderRadius: 14,
            border: `1px solid ${cardBorder}`,
            padding: 40,
            textAlign: "center",
            color: textSecondary,
          }}
        >
          {abonnements.length === 0
            ? "Aucun abonnement enregistré. Créez-en un pour commencer."
            : "Aucun abonnement ne correspond aux filtres."}
        </div>
      ) : (
        <div className="ga-fade-in" style={{ display: "grid", gap: 10, ...SCROLL_AREA }}>
          {abonnementsFiltres.map((ab) => (
            <AbonnementCard
              key={ab._id}
              abonnement={ab}
              dark={dark}
              isMobile={isMobile}
              cardBg={cardBg}
              cardBorder={cardBorder}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              accent={accent}
              hoverBg={hoverBg}
              busy={busyId === ab._id}
              canWrite={canWrite}
              onRecalculer={handleRecalculer}
              onSuspendre={handleSuspendre}
              onReactiver={handleReactiver}
              onPayer={() => setShowPaiementModal(ab)}
            />
          ))}
        </div>
      )}

      {/* ═══════════ Modales ═══════════ */}
      {canWrite && showPaiementModal && (
        <PaiementModal
          abonnement={showPaiementModal}
          onClose={() => setShowPaiementModal(null)}
          onSave={(payload) => handleSavePaiement(showPaiementModal._id, payload)}
          dark={dark}
          isMobile={isMobile}
          cardBg={cardBg}
          cardBorder={cardBorder}
          textPrimary={textPrimary}
          textSecondary={textSecondary}
          inputBg={inputBg}
          accent={accent}
        />
      )}

      {canWrite && showCreateModal && (
        <CreateAbonnementModal
          ecoles={ecoles}
          abonnementsExistants={abonnements}
          onClose={() => setShowCreateModal(false)}
          onSave={handleCreateAbonnement}
          dark={dark}
          isMobile={isMobile}
          cardBg={cardBg}
          cardBorder={cardBorder}
          textPrimary={textPrimary}
          textSecondary={textSecondary}
          inputBg={inputBg}
          accent={accent}
        />
      )}

      <ConfirmDialog {...dialogProps} />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// STAT CARD
// ════════════════════════════════════════════════════════════════════
function StatCard({
  icon, value, label, color,
  cardBg, cardBorder, textPrimary, textSecondary,
}) {
  return (
    <article
      aria-label={`${label} : ${value}`}
      style={{
        background: cardBg,
        border: `1px solid ${cardBorder}`,
        borderRadius: 12,
        padding: 14,
        display: "flex",
        alignItems: "center",
        gap: 12,
        minHeight: 44,
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 36,
          height: 36,
          borderRadius: 9,
          background: `${color}20`,
          color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: textPrimary,
            lineHeight: 1.1,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {value}
        </div>
        <div style={{ fontSize: 11, color: textSecondary, marginTop: 2 }}>
          {label}
        </div>
      </div>
    </article>
  );
}

// ════════════════════════════════════════════════════════════════════
// ABONNEMENT CARD
// ════════════════════════════════════════════════════════════════════
function AbonnementCard({
  abonnement, dark, isMobile,
  cardBg, cardBorder, textPrimary, textSecondary, accent, hoverBg,
  busy, canWrite = true,
  onRecalculer, onSuspendre, onReactiver, onPayer,
}) {
  const cfg = STATUT_CONFIG[abonnement.statut] ?? STATUT_CONFIG.actif;
  const StatusIcon = cfg.icon;

  const isImpaye =
    abonnement.prochaineEcheance < new Date().toISOString() &&
    abonnement.statut !== "actif";

  const nbUsers =
    abonnement.nombreUtilisateursActifs ?? abonnement.nombreUtilisateurs ?? 0;

  return (
    <article
      style={{
        background: cardBg,
        border: `1px solid ${isImpaye ? "#EF4444" : cardBorder}`,
        borderRadius: 12,
        padding: isMobile ? 12 : 16,
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        alignItems: isMobile ? "stretch" : "center",
        gap: 14,
        opacity: busy ? 0.6 : 1,
        transition: "background 0.15s, opacity 0.15s",
      }}
    >
      {/* Colonne 1 : École + formule + users */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 6,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 700, color: textPrimary }}>
            {abonnement.ecoleNom}
          </span>
          {abonnement.ecoleCode && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                padding: "2px 6px",
                borderRadius: 6,
                background: dark ? "#334155" : "#F1F5F9",
                color: textSecondary,
                fontFamily: "ui-monospace, monospace",
              }}
            >
              {abonnement.ecoleCode}
            </span>
          )}
          <span
            aria-label={`Statut : ${cfg.label}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "2px 8px",
              borderRadius: 20,
              background: dark ? cfg.bgDark : cfg.bgLight,
              color: cfg.color,
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
            }}
          >
            <StatusIcon size={10} aria-hidden="true" />
            {cfg.label}
          </span>
        </div>

        <div
          style={{
            fontSize: 12,
            color: textSecondary,
            display: "flex",
            flexWrap: "wrap",
            gap: 14,
          }}
        >
          <span>
            Formule : <strong style={{ color: textPrimary }}>{abonnement.formule}</strong>
          </span>
          <span>
            {nbUsers} utilisateur{nbUsers > 1 ? "s" : ""}
          </span>
          <span
            style={{
              color: accent,
              fontWeight: 700,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {formatMontant(abonnement.montantMensuel)}/mois
          </span>
        </div>
      </div>

      {/* Colonne 2 : Échéance + dernier paiement */}
      <div
        style={{
          minWidth: isMobile ? "auto" : 180,
          textAlign: isMobile ? "left" : "center",
          display: "flex",
          flexDirection: isMobile ? "row" : "column",
          gap: isMobile ? 14 : 4,
          justifyContent: isMobile ? "space-between" : "center",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 10,
              color: textSecondary,
              textTransform: "uppercase",
              letterSpacing: 0.3,
            }}
          >
            Prochaine échéance
          </div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: isImpaye ? "#EF4444" : textPrimary,
              display: "flex",
              alignItems: "center",
              gap: 4,
              justifyContent: isMobile ? "flex-start" : "center",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <Calendar size={12} aria-hidden="true" />
            {formatDate(abonnement.prochaineEcheance)}
          </div>
        </div>
        {abonnement.dernierPaiementDate && (
          <div>
            <div
              style={{
                fontSize: 10,
                color: textSecondary,
                textTransform: "uppercase",
                letterSpacing: 0.3,
              }}
            >
              Dernier paiement
            </div>
            <div
              style={{
                fontSize: 12,
                color: textSecondary,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {formatDate(abonnement.dernierPaiementDate)}
            </div>
          </div>
        )}
      </div>

      {/* Colonne 3 : Actions */}
      {canWrite && (
        <div
          style={{
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            justifyContent: isMobile ? "stretch" : "flex-end",
          }}
        >
          <ActionButton
            icon={<CreditCard size={14} aria-hidden="true" />}
            label="Paiement"
            onClick={onPayer}
            variant="primary"
            disabled={busy}
            accent={accent}
            isMobile={isMobile}
          />
          <ActionButton
            icon={<RefreshCw size={14} aria-hidden="true" />}
            label="Recalculer"
            onClick={() => onRecalculer(abonnement._id, abonnement.ecoleNom)}
            disabled={busy}
            accent={accent}
            isMobile={isMobile}
            color={textPrimary}
          />
          {abonnement.statut === "suspendu" ? (
            <ActionButton
              icon={<Play size={14} aria-hidden="true" />}
              label="Réactiver"
              onClick={() => onReactiver(abonnement._id)}
              variant="success"
              disabled={busy}
              accent={accent}
              isMobile={isMobile}
            />
          ) : (
            <ActionButton
              icon={<Ban size={14} aria-hidden="true" />}
              label="Suspendre"
              onClick={() => onSuspendre(abonnement._id, abonnement.ecoleNom)}
              variant="danger"
              disabled={busy}
              accent={accent}
              isMobile={isMobile}
            />
          )}
        </div>
      )}
    </article>
  );
}

// ════════════════════════════════════════════════════════════════════
// ACTION BUTTON
// ════════════════════════════════════════════════════════════════════
function ActionButton({
  icon, label, onClick, variant = "default",
  disabled, accent, isMobile, color,
}) {
  const variants = {
    primary: { bg: accent, color: "#FFFFFF", border: null },
    success: { bg: "#10B981", color: "#FFFFFF", border: null },
    danger: { bg: "#EF4444", color: "#FFFFFF", border: null },
    default: { bg: "transparent", color: color ?? "inherit", border: color ?? "#94A3B8" },
  };
  const v = variants[variant] ?? variants.default;

  return (
    <Pressable
      onClick={onClick}
      disabled={disabled}
      focusColor={accent}
      ariaLabel={label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 5,
        padding: "10px 14px",
        borderRadius: 8,
        border: v.border ? `1px solid ${v.border}` : "none",
        background: v.bg,
        color: v.color,
        fontSize: 12,
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        whiteSpace: "nowrap",
        opacity: disabled ? 0.6 : 1,
        fontFamily: "inherit",
        flex: isMobile ? 1 : "none",
        minHeight: 44,
      }}
    >
      {icon}
      {label}
    </Pressable>
  );
}

// ════════════════════════════════════════════════════════════════════
// MODAL PAIEMENT
// ════════════════════════════════════════════════════════════════════
function PaiementModal({
  abonnement, onClose, onSave, isMobile,
  cardBg, cardBorder, textPrimary, textSecondary, inputBg, accent,
}) {
  const titleId = useId();
  const panelRef = useRef(null);

  const today = new Date().toISOString().slice(0, 10);
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  const [montant, setMontant] = useState(String(abonnement.montantMensuel ?? 0));
  const [devise, setDevise] = useState("USD");
  const [methode, setMethode] = useState("");
  const [reference, setReference] = useState("");
  const [periodeDebut, setPeriodeDebut] = useState(today);
  const [periodeFin, setPeriodeFin] = useState(nextMonth.toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useFocusTrap(panelRef, true);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape" && !saving) onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [saving, onClose]);

  const fieldStyle = {
    ...TAP_BASE,
    width: "100%",
    padding: 12,
    borderRadius: 10,
    border: `1px solid ${cardBorder}`,
    background: inputBg,
    color: textPrimary,
    fontSize: isMobile ? 16 : 14,
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
  };

  const labelStyle = {
    display: "block",
    fontSize: 11,
    fontWeight: 700,
    color: textSecondary,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!montant || isNaN(parseFloat(montant))) {
      toast.error("Montant invalide");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        montant: parseFloat(montant),
        devise,
        methodePaiement: methode || undefined,
        reference: reference || undefined,
        periodeDebut,
        periodeFin,
        notes: notes || undefined,
      });
    } catch {
      // Erreur déjà affichée par le parent
    } finally {
      setSaving(false);
    }
  };

  const content = (
    <>
      <h3
        id={titleId}
        style={{
          margin: "0 0 4px",
          fontSize: 17,
          fontWeight: 700,
          color: textPrimary,
        }}
      >
        Enregistrer un paiement
      </h3>
      <p style={{ margin: "0 0 18px", fontSize: 12, color: textSecondary }}>
        {abonnement.ecoleNom} — Formule {abonnement.formule}
      </p>

      <form onSubmit={handleSubmit}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: 12,
            marginBottom: 14,
          }}
        >
          <div>
            <label style={labelStyle} htmlFor="paiement-montant">Montant *</label>
            <input
              id="paiement-montant"
              type="number"
              inputMode="decimal"
              step="0.01"
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
              required
              enterKeyHint="next"
              style={fieldStyle}
            />
          </div>
          <div>
            <label style={labelStyle} htmlFor="paiement-devise">Devise</label>
            <select
              id="paiement-devise"
              value={devise}
              onChange={(e) => setDevise(e.target.value)}
              style={fieldStyle}
            >
              <option value="USD">USD</option>
              <option value="CDF">CDF</option>
            </select>
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle} htmlFor="paiement-methode">Méthode de paiement</label>
          <select
            id="paiement-methode"
            value={methode}
            onChange={(e) => setMethode(e.target.value)}
            style={fieldStyle}
          >
            <option value="">— Sélectionner —</option>
            <option value="Mobile Money">Mobile Money</option>
            <option value="Virement bancaire">Virement bancaire</option>
            <option value="Espèces">Espèces</option>
            <option value="Chèque">Chèque</option>
          </select>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle} htmlFor="paiement-reference">Référence (optionnel)</label>
          <input
            id="paiement-reference"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Ex : N° transaction"
            enterKeyHint="next"
            style={fieldStyle}
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: 12,
            marginBottom: 14,
          }}
        >
          <div>
            <label style={labelStyle} htmlFor="paiement-debut">Période du *</label>
            <input
              id="paiement-debut"
              type="date"
              value={periodeDebut}
              onChange={(e) => setPeriodeDebut(e.target.value)}
              required
              style={fieldStyle}
            />
          </div>
          <div>
            <label style={labelStyle} htmlFor="paiement-fin">Au *</label>
            <input
              id="paiement-fin"
              type="date"
              value={periodeFin}
              onChange={(e) => setPeriodeFin(e.target.value)}
              required
              style={fieldStyle}
            />
          </div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={labelStyle} htmlFor="paiement-notes">Notes (optionnel)</label>
          <textarea
            id="paiement-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            enterKeyHint="done"
            style={{ ...fieldStyle, resize: "vertical", minHeight: 60 }}
          />
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
            flexDirection: isMobile ? "column-reverse" : "row",
          }}
        >
          <Pressable
            onClick={onClose}
            disabled={saving}
            focusColor={accent}
            style={{
              padding: "12px 18px",
              borderRadius: 10,
              border: `1px solid ${cardBorder}`,
              background: "transparent",
              color: textPrimary,
              fontWeight: 600,
              fontSize: 14,
              fontFamily: "inherit",
            }}
          >
            Annuler
          </Pressable>
          <Pressable
            type="submit"
            disabled={saving}
            focusColor={accent}
            ariaBusy={saving}
            style={{
              padding: "12px 18px",
              borderRadius: 10,
              border: "none",
              background: saving ? "#A5B4FC" : accent,
              color: "#FFFFFF",
              fontWeight: 700,
              fontSize: 14,
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            {saving && (
              <Loader size={14} className="ga-spin" role="status" aria-label="Enregistrement" />
            )}
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Pressable>
        </div>
      </form>
    </>
  );

  return (
    <>
      {GestionAbonnementsKeyframes}
      <div
        onClick={onClose}
        className="ga-fade-in"
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
          display: "flex",
          alignItems: isMobile ? "flex-end" : "center",
          justifyContent: "center",
          zIndex: 2000,
          padding: isMobile ? 0 : 16,
          ...SCROLL_AREA,
        }}
      >
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onClick={(e) => e.stopPropagation()}
          tabIndex={-1}
          className="ga-slide-up"
          style={{
            background: cardBg,
            borderRadius: isMobile ? "20px 20px 0 0" : 16,
            padding: isMobile ? "16px 16px 0" : 24,
            ...(isMobile ? SAFE_BOTTOM : null),
            width: "100%",
            maxWidth: isMobile ? "100%" : 480,
            maxHeight: "90vh",
            overflowY: "auto",
            border: `1px solid ${cardBorder}`,
            outline: "none",
            ...SCROLL_AREA,
          }}
        >
          {content}
        </div>
      </div>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════
// MODAL CRÉATION
// ════════════════════════════════════════════════════════════════════
function CreateAbonnementModal({
  ecoles, abonnementsExistants, onClose, onSave, isMobile,
  cardBg, cardBorder, textPrimary, textSecondary, inputBg, accent,
}) {
  const titleId = useId();
  const panelRef = useRef(null);

  const today = new Date().toISOString().slice(0, 10);
  const oneYearLater = new Date();
  oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);

  const ecoleIdsAvecAbonnement = new Set(
    abonnementsExistants.map((a) => a.ecoleId)
  );
  const ecolesDisponibles = ecoles.filter(
    (e) => !ecoleIdsAvecAbonnement.has(e._id)
  );

  const [ecoleId, setEcoleId] = useState("");
  const [dateDebut, setDateDebut] = useState(today);
  const [dateFin, setDateFin] = useState(oneYearLater.toISOString().slice(0, 10));
  const [delaiGrace, setDelaiGrace] = useState("14");
  const [saving, setSaving] = useState(false);

  useFocusTrap(panelRef, true);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape" && !saving) onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [saving, onClose]);

  const fieldStyle = {
    ...TAP_BASE,
    width: "100%",
    padding: 12,
    borderRadius: 10,
    border: `1px solid ${cardBorder}`,
    background: inputBg,
    color: textPrimary,
    fontSize: isMobile ? 16 : 14,
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
  };

  const labelStyle = {
    display: "block",
    fontSize: 11,
    fontWeight: 700,
    color: textSecondary,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!ecoleId) {
      toast.error("Sélectionnez une école");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        ecoleId,
        dateDebut,
        dateFin,
        delaiGraceJours: parseInt(delaiGrace) || 14,
      });
    } catch {
      // Erreur déjà affichée par le parent
    } finally {
      setSaving(false);
    }
  };

  const content = (
    <>
      <h3
        id={titleId}
        style={{
          margin: "0 0 4px",
          fontSize: 17,
          fontWeight: 700,
          color: textPrimary,
        }}
      >
        Nouvel abonnement
      </h3>
      <p style={{ margin: "0 0 18px", fontSize: 12, color: textSecondary }}>
        Créer un abonnement pour une école
      </p>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle} htmlFor="create-ecole">École *</label>
          <select
            id="create-ecole"
            value={ecoleId}
            onChange={(e) => setEcoleId(e.target.value)}
            required
            style={fieldStyle}
          >
            <option value="">— Sélectionner une école —</option>
            {ecolesDisponibles.map((e) => (
              <option key={e._id} value={e._id}>
                {e.nom} ({e.userCount ?? 0} users)
              </option>
            ))}
          </select>
          {ecolesDisponibles.length === 0 && (
            <p
              role="status"
              aria-live="polite"
              style={{
                fontSize: 12,
                color: textSecondary,
                marginTop: 6,
                marginBottom: 0,
              }}
            >
              Toutes les écoles ont déjà un abonnement.
            </p>
          )}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: 12,
            marginBottom: 14,
          }}
        >
          <div>
            <label style={labelStyle} htmlFor="create-debut">Date de début *</label>
            <input
              id="create-debut"
              type="date"
              value={dateDebut}
              onChange={(e) => setDateDebut(e.target.value)}
              required
              style={fieldStyle}
            />
          </div>
          <div>
            <label style={labelStyle} htmlFor="create-fin">Date de fin *</label>
            <input
              id="create-fin"
              type="date"
              value={dateFin}
              onChange={(e) => setDateFin(e.target.value)}
              required
              style={fieldStyle}
            />
          </div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={labelStyle} htmlFor="create-grace">Délai de grâce (jours)</label>
          <input
            id="create-grace"
            type="number"
            inputMode="numeric"
            min="0"
            value={delaiGrace}
            onChange={(e) => setDelaiGrace(e.target.value)}
            enterKeyHint="done"
            style={fieldStyle}
          />
          <p
            style={{
              fontSize: 11,
              color: textSecondary,
              marginTop: 4,
              marginBottom: 0,
            }}
          >
            Nombre de jours avant suspension automatique après l'échéance
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
            flexDirection: isMobile ? "column-reverse" : "row",
          }}
        >
          <Pressable
            onClick={onClose}
            disabled={saving}
            focusColor={accent}
            style={{
              padding: "12px 18px",
              borderRadius: 10,
              border: `1px solid ${cardBorder}`,
              background: "transparent",
              color: textPrimary,
              fontWeight: 600,
              fontSize: 14,
              fontFamily: "inherit",
            }}
          >
            Annuler
          </Pressable>
          <Pressable
            type="submit"
            disabled={saving || !ecoleId}
            focusColor={accent}
            ariaBusy={saving}
            style={{
              padding: "12px 18px",
              borderRadius: 10,
              border: "none",
              background: saving || !ecoleId ? "#A5B4FC" : accent,
              color: "#FFFFFF",
              fontWeight: 700,
              fontSize: 14,
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            {saving && (
              <Loader size={14} className="ga-spin" role="status" aria-label="Création" />
            )}
            {saving ? "Création…" : "Créer l'abonnement"}
          </Pressable>
        </div>
      </form>
    </>
  );

  return (
    <>
      {GestionAbonnementsKeyframes}
      <div
        onClick={onClose}
        className="ga-fade-in"
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
          display: "flex",
          alignItems: isMobile ? "flex-end" : "center",
          justifyContent: "center",
          zIndex: 2000,
          padding: isMobile ? 0 : 16,
          ...SCROLL_AREA,
        }}
      >
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onClick={(e) => e.stopPropagation()}
          tabIndex={-1}
          className="ga-slide-up"
          style={{
            background: cardBg,
            borderRadius: isMobile ? "20px 20px 0 0" : 16,
            padding: isMobile ? "16px 16px 0" : 24,
            ...(isMobile ? SAFE_BOTTOM : null),
            width: "100%",
            maxWidth: isMobile ? "100%" : 480,
            maxHeight: "90vh",
            overflowY: "auto",
            border: `1px solid ${cardBorder}`,
            outline: "none",
            ...SCROLL_AREA,
          }}
        >
          {content}
        </div>
      </div>
    </>
  );
}