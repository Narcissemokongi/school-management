// src/components/GestionAbonnements.jsx
import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useConfirm } from "@/hooks/useConfirm";
import { ConfirmDialog } from "./ConfirmDialog";
import {
  Search, CheckCircle, Clock, XCircle, AlertTriangle,
  CreditCard, Users, DollarSign, RefreshCw, Ban, Play,
  X, Calendar,
  Lock, // ✨ NOUVEAU
} from "lucide-react";
import toast from "react-hot-toast";

// ════════════════════════════════════════════════════════════════════
// KEYFRAMES module-level
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
  return `${montant.toLocaleString()} ${devise}`;
}

function getErrorMessage(err, fallback = "Une erreur est survenue") {
  if (!err) return fallback;
  if (typeof err === "string") return err;
  if (typeof err === "object" && err.message) return err.message;
  return fallback;
}

// ════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ════════════════════════════════════════════════════════════════════
export function GestionAbonnements({
  user,
  canWrite = true, // ✨ NOUVEAU
}) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();
  const { confirm, dialogProps } = useConfirm();

  const userId = user?._id;

  const [searchTerm, setSearchTerm] = useState("");
  const [statutFilter, setStatutFilter] = useState("");
  const [showPaiementModal, setShowPaiementModal] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [busyId, setBusyId] = useState(null);

  // ════════════════════════════════════════════════════════════════════
  // QUERIES
  // ════════════════════════════════════════════════════════════════════
  const args = useMemo(() => (userId ? { userId } : "skip"), [userId]);

  const abonnementsRaw = useQuery(api.abonnements.listAll, args);
  const stats = useQuery(api.abonnements.statsGlobales, args);
  const ecolesRaw = useQuery(api.ecoles.listWithUserCount, args);

  const abonnements = useMemo(() => abonnementsRaw ?? [], [abonnementsRaw]);
  const ecoles = useMemo(() => ecolesRaw ?? [], [ecolesRaw]);

  const isLoading = abonnementsRaw === undefined || stats === undefined;

  // ════════════════════════════════════════════════════════════════════
  // MUTATIONS
  // ════════════════════════════════════════════════════════════════════
  const enregistrerPaiement = useMutation(api.abonnements.enregistrerPaiement);
  const recalculerFormule = useMutation(api.abonnements.recalculerFormule);
  const suspendre = useMutation(api.abonnements.suspendre);
  const reactiver = useMutation(api.abonnements.reactiver);
  const creerPourEcole = useMutation(api.abonnements.creerPourEcole);

  // ════════════════════════════════════════════════════════════════════
  // COULEURS
  // ════════════════════════════════════════════════════════════════════
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const inputBg = dark ? "#0F172A" : "#F8FAFC";
  const accent = dark ? "#818CF8" : "#4F46E5";
  const hoverBg = dark ? "#26334D" : "#F8FAFC";

  // ════════════════════════════════════════════════════════════════════
  // FILTRES
  // ════════════════════════════════════════════════════════════════════
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

  // ════════════════════════════════════════════════════════════════════
  // HANDLERS (avec gardes canWrite)
  // ════════════════════════════════════════════════════════════════════
  const handleRecalculer = useCallback(
    async (abonnementId, ecoleNom) => {
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
        toast.success(
          `Formule mise à jour : ${res.formule} → ${res.montant} USD/mois`
        );
      } catch (err) {
        toast.error(getErrorMessage(err));
      } finally {
        setBusyId(null);
      }
    },
    [confirm, recalculerFormule, userId, canWrite]
  );

  const handleSuspendre = useCallback(
    async (abonnementId, ecoleNom) => {
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
    },
    [confirm, suspendre, userId, canWrite]
  );

  const handleReactiver = useCallback(
    async (abonnementId) => {
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
    },
    [reactiver, userId, canWrite]
  );

  const handleSavePaiement = useCallback(
    async (abonnementId, payload) => {
      if (!canWrite) {
        toast.error("Permission requise : abonnements.write");
        throw new Error("Permission refusée");
      }
      try {
        const res = await enregistrerPaiement({
          abonnementId,
          userId,
          ...payload,
        });
        toast.success(
          `Paiement enregistré — nouvelle échéance : ${formatDate(res.prochaineEcheance)}`
        );
        setShowPaiementModal(null);
      } catch (err) {
        toast.error(getErrorMessage(err));
        throw err;
      }
    },
    [enregistrerPaiement, userId, canWrite]
  );

  const handleCreateAbonnement = useCallback(
    async (payload) => {
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
    },
    [creerPourEcole, userId, canWrite]
  );

  // ════════════════════════════════════════════════════════════════════
  // RENDU
  // ════════════════════════════════════════════════════════════════════
  if (!user || !userId) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: textSecondary }}>
        Session invalide.
      </div>
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

      {/* ═══ Bandeau lecture seule ═══ */}
      {!canWrite && (
        <div
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
          <Lock size={14} />
          <span>
            <strong style={{ color: textPrimary }}>Mode lecture seule</strong> —
            vous n'avez pas la permission de modifier les abonnements.
          </span>
        </div>
      )}

      {/* En-tête */}
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
            <CreditCard size={isMobile ? 22 : 26} color={accent} />
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

        {/* ✨ Bouton création — canWrite requis */}
        {canWrite && ecoles.length > abonnements.length && (
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 16px",
              background: accent,
              color: "#FFFFFF",
              border: "none",
              borderRadius: 10,
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 14,
              whiteSpace: "nowrap",
            }}
          >
            <CreditCard size={16} />
            Nouvel abonnement
          </button>
        )}
      </div>

      {/* Stats globales */}
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
            icon={<Users size={18} />}
            value={stats.total}
            label="Établissements"
            color="#4F46E5"
            dark={dark}
            cardBg={cardBg}
            cardBorder={cardBorder}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
          />
          <StatCard
            icon={<CheckCircle size={18} />}
            value={stats.actifs}
            label="Actifs"
            color="#10B981"
            dark={dark}
            cardBg={cardBg}
            cardBorder={cardBorder}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
          />
          <StatCard
            icon={<Clock size={18} />}
            value={stats.enGrace}
            label="En grâce"
            color="#F59E0B"
            dark={dark}
            cardBg={cardBg}
            cardBorder={cardBorder}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
          />
          <StatCard
            icon={<Ban size={18} />}
            value={stats.suspendus}
            label="Suspendus"
            color="#EF4444"
            dark={dark}
            cardBg={cardBg}
            cardBorder={cardBorder}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
          />
          <StatCard
            icon={<DollarSign size={18} />}
            value={`${stats.revenuMensuelAttendu} $`}
            label="Revenu attendu/mois"
            color="#6366F1"
            dark={dark}
            cardBg={cardBg}
            cardBorder={cardBorder}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
          />
          <StatCard
            icon={<AlertTriangle size={18} />}
            value={stats.ecolesImpayees}
            label="Écoles impayées"
            color="#EF4444"
            dark={dark}
            cardBg={cardBg}
            cardBorder={cardBorder}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
          />
        </div>
      )}

      {/* Filtres */}
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
            border: `1px solid ${cardBorder}`,
            background: cardBg,
            flex: 1,
          }}
        >
          <Search size={16} color={textSecondary} />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher une école…"
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              background: "transparent",
              color: textPrimary,
              fontSize: 14,
            }}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: textSecondary,
                display: "flex",
                padding: 2,
              }}
              aria-label="Effacer la recherche"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <select
          value={statutFilter}
          onChange={(e) => setStatutFilter(e.target.value)}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: `1px solid ${cardBorder}`,
            background: cardBg,
            color: textPrimary,
            fontSize: 14,
            cursor: "pointer",
            minWidth: isMobile ? "100%" : 180,
            outline: "none",
          }}
        >
          <option value="">Tous les statuts</option>
          <option value="actif">Actifs</option>
          <option value="grace">En grâce</option>
          <option value="suspendu">Suspendus</option>
          <option value="expire">Expirés</option>
        </select>
      </div>

      {/* Liste */}
      {isLoading ? (
        <div
          style={{
            background: cardBg,
            borderRadius: 14,
            border: `1px solid ${cardBorder}`,
            padding: 40,
            textAlign: "center",
            color: textSecondary,
          }}
        >
          Chargement…
        </div>
      ) : abonnementsFiltres.length === 0 ? (
        <div
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
        <div className="ga-fade-in" style={{ display: "grid", gap: 10 }}>
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
              canWrite={canWrite} // ✨ NOUVEAU
              onRecalculer={handleRecalculer}
              onSuspendre={handleSuspendre}
              onReactiver={handleReactiver}
              onPayer={() => setShowPaiementModal(ab)}
            />
          ))}
        </div>
      )}

      {/* ═══ Modal paiement (canWrite requis) ═══ */}
      {canWrite && showPaiementModal && (
        <PaiementModal
          abonnement={showPaiementModal}
          onClose={() => setShowPaiementModal(null)}
          onSave={(payload) =>
            handleSavePaiement(showPaiementModal._id, payload)
          }
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

      {/* ═══ Modal création (canWrite requis) ═══ */}
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

      {/* Confirm */}
      <ConfirmDialog {...dialogProps} />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// SOUS-COMPOSANTS
// ════════════════════════════════════════════════════════════════════

function StatCard({
  icon,
  value,
  label,
  color,
  cardBg,
  cardBorder,
  textPrimary,
  textSecondary,
}) {
  return (
    <div
      style={{
        background: cardBg,
        border: `1px solid ${cardBorder}`,
        borderRadius: 12,
        padding: 14,
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div
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
          }}
        >
          {value}
        </div>
        <div
          style={{
            fontSize: 11,
            color: textSecondary,
            marginTop: 2,
          }}
        >
          {label}
        </div>
      </div>
    </div>
  );
}

function AbonnementCard({
  abonnement,
  dark,
  isMobile,
  cardBg,
  cardBorder,
  textPrimary,
  textSecondary,
  accent,
  hoverBg,
  busy,
  canWrite = true, // ✨ NOUVEAU
  onRecalculer,
  onSuspendre,
  onReactiver,
  onPayer,
}) {
  const cfg = STATUT_CONFIG[abonnement.statut] ?? STATUT_CONFIG.actif;
  const StatusIcon = cfg.icon;

  const isImpaye =
    abonnement.prochaineEcheance < new Date().toISOString() &&
    abonnement.statut !== "actif";

  const nbUsers =
    abonnement.nombreUtilisateursActifs ?? abonnement.nombreUtilisateurs ?? 0;

  return (
    <div
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
          <span
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: textPrimary,
            }}
          >
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
            <StatusIcon size={10} />
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
          <span style={{ color: accent, fontWeight: 700 }}>
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
            }}
          >
            <Calendar size={12} />
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
            <div style={{ fontSize: 12, color: textSecondary }}>
              {formatDate(abonnement.dernierPaiementDate)}
            </div>
          </div>
        )}
      </div>

      {/* Colonne 3 : Actions (canWrite requis) */}
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
            icon={<CreditCard size={14} />}
            label="Paiement"
            onClick={onPayer}
            variant="primary"
            disabled={busy}
          />
          <ActionButton
            icon={<RefreshCw size={14} />}
            label="Recalculer"
            onClick={() => onRecalculer(abonnement._id, abonnement.ecoleNom)}
            disabled={busy}
          />
          {abonnement.statut === "suspendu" ? (
            <ActionButton
              icon={<Play size={14} />}
              label="Réactiver"
              onClick={() => onReactiver(abonnement._id)}
              variant="success"
              disabled={busy}
            />
          ) : (
            <ActionButton
              icon={<Ban size={14} />}
              label="Suspendre"
              onClick={() => onSuspendre(abonnement._id, abonnement.ecoleNom)}
              variant="danger"
              disabled={busy}
            />
          )}
        </div>
      )}
    </div>
  );
}

function ActionButton({ icon, label, onClick, variant = "default", disabled }) {
  const variants = {
    primary: { bg: "#4F46E5", color: "#FFFFFF" },
    success: { bg: "#10B981", color: "#FFFFFF" },
    danger: { bg: "#EF4444", color: "#FFFFFF" },
    default: { bg: "transparent", color: "inherit", border: true },
  };
  const v = variants[variant] ?? variants.default;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "7px 12px",
        borderRadius: 8,
        border: v.border ? "1px solid currentColor" : "none",
        background: v.bg,
        color: v.color,
        fontSize: 12,
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        whiteSpace: "nowrap",
        opacity: disabled ? 0.6 : 1,
        fontFamily: "inherit",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════
// PaiementModal (inchangé)
// ════════════════════════════════════════════════════════════════════
function PaiementModal({
  abonnement,
  onClose,
  onSave,
  isMobile,
  cardBg,
  cardBorder,
  textPrimary,
  textSecondary,
  inputBg,
  accent,
}) {
  const today = new Date().toISOString().slice(0, 10);
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  const [montant, setMontant] = useState(String(abonnement.montantMensuel ?? 0));
  const [devise, setDevise] = useState("USD");
  const [methode, setMethode] = useState("");
  const [reference, setReference] = useState("");
  const [periodeDebut, setPeriodeDebut] = useState(today);
  const [periodeFin, setPeriodeFin] = useState(
    nextMonth.toISOString().slice(0, 10)
  );
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const fieldStyle = {
    width: "100%",
    padding: 12,
    borderRadius: 10,
    border: `1px solid ${cardBorder}`,
    background: inputBg,
    color: textPrimary,
    fontSize: 14,
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

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
        padding: 16,
      }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="ga-slide-up"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: cardBg,
          borderRadius: 16,
          padding: isMobile ? 18 : 24,
          width: "100%",
          maxWidth: 480,
          maxHeight: "90vh",
          overflowY: "auto",
          border: `1px solid ${cardBorder}`,
        }}
      >
        <h3
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
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 14,
            }}
          >
            <div>
              <label style={labelStyle}>Montant *</label>
              <input
                type="number"
                step="0.01"
                value={montant}
                onChange={(e) => setMontant(e.target.value)}
                required
                style={fieldStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Devise</label>
              <select
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
            <label style={labelStyle}>Méthode de paiement</label>
            <select
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
            <label style={labelStyle}>Référence (optionnel)</label>
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Ex : N° transaction"
              style={fieldStyle}
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 14,
            }}
          >
            <div>
              <label style={labelStyle}>Période du *</label>
              <input
                type="date"
                value={periodeDebut}
                onChange={(e) => setPeriodeDebut(e.target.value)}
                required
                style={fieldStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Au *</label>
              <input
                type="date"
                value={periodeFin}
                onChange={(e) => setPeriodeFin(e.target.value)}
                required
                style={fieldStyle}
              />
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>Notes (optionnel)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              style={{
                ...fieldStyle,
                resize: "vertical",
                fontFamily: "inherit",
              }}
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
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              style={{
                padding: "10px 18px",
                borderRadius: 10,
                border: `1px solid ${cardBorder}`,
                background: "transparent",
                color: textPrimary,
                cursor: saving ? "not-allowed" : "pointer",
                fontWeight: 600,
                fontSize: 14,
                fontFamily: "inherit",
              }}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: "10px 18px",
                borderRadius: 10,
                border: "none",
                background: saving ? "#A5B4FC" : accent,
                color: "#FFFFFF",
                cursor: saving ? "not-allowed" : "pointer",
                fontWeight: 700,
                fontSize: 14,
                fontFamily: "inherit",
              }}
            >
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// CreateAbonnementModal (inchangé)
// ════════════════════════════════════════════════════════════════════
function CreateAbonnementModal({
  ecoles,
  abonnementsExistants,
  onClose,
  onSave,
  isMobile,
  cardBg,
  cardBorder,
  textPrimary,
  textSecondary,
  inputBg,
  accent,
}) {
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

  const fieldStyle = {
    width: "100%",
    padding: 12,
    borderRadius: 10,
    border: `1px solid ${cardBorder}`,
    background: inputBg,
    color: textPrimary,
    fontSize: 14,
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

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
        padding: 16,
      }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="ga-slide-up"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: cardBg,
          borderRadius: 16,
          padding: isMobile ? 18 : 24,
          width: "100%",
          maxWidth: 480,
          maxHeight: "90vh",
          overflowY: "auto",
          border: `1px solid ${cardBorder}`,
        }}
      >
        <h3
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
            <label style={labelStyle}>École *</label>
            <select
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
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 14,
            }}
          >
            <div>
              <label style={labelStyle}>Date de début *</label>
              <input
                type="date"
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
                required
                style={fieldStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Date de fin *</label>
              <input
                type="date"
                value={dateFin}
                onChange={(e) => setDateFin(e.target.value)}
                required
                style={fieldStyle}
              />
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>Délai de grâce (jours)</label>
            <input
              type="number"
              min="0"
              value={delaiGrace}
              onChange={(e) => setDelaiGrace(e.target.value)}
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
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              style={{
                padding: "10px 18px",
                borderRadius: 10,
                border: `1px solid ${cardBorder}`,
                background: "transparent",
                color: textPrimary,
                cursor: saving ? "not-allowed" : "pointer",
                fontWeight: 600,
                fontSize: 14,
                fontFamily: "inherit",
              }}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving || !ecoleId}
              style={{
                padding: "10px 18px",
                borderRadius: 10,
                border: "none",
                background: saving || !ecoleId ? "#A5B4FC" : accent,
                color: "#FFFFFF",
                cursor: saving || !ecoleId ? "not-allowed" : "pointer",
                fontWeight: 700,
                fontSize: 14,
                fontFamily: "inherit",
              }}
            >
              {saving ? "Création…" : "Créer l'abonnement"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}