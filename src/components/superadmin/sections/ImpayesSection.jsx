// src/components/SuperAdmin/sections/ImpayesSection.jsx
import { useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useTokens } from "@/theme/tokens";
import { useIsMobile } from "@/hooks/useIsMobile";
import { Button } from "@/components/ui";
import toast from "react-hot-toast";
import {
  AlertTriangle, Download, Loader, Mail, CheckCircle2, DollarSign,
  Users, Clock, X, Search,
  History, Send,
  Lock, // ✨ NOUVEAU
} from "lucide-react";
import { MarquerPayeModal } from "./MarquerPayeModal";
import { RelanceGroupModal } from "./RelanceGroupModal";
import { HistoriqueRelancesModal } from "./HistoriqueRelancesModal";

// ════════════════════════════════════════════════
// CONFIG
// ════════════════════════════════════════════════
const STATUT_CONFIG = {
  actif: { label: "En retard", color: "#F59E0B" },
  grace: { label: "En grâce", color: "#F97316" },
  expire: { label: "Expiré", color: "#EF4444" },
  suspendu: { label: "Suspendu", color: "#991B1B" },
};

const formatEUR = (n) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n || 0);

const formatDate = (s) => {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString("fr-FR");
  } catch {
    return s;
  }
};

function formatRelativeDate(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const j = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (j === 0) return "aujourd'hui";
  if (j === 1) return "hier";
  if (j < 30) return `il y a ${j}j`;
  const mois = Math.floor(j / 30);
  return `il y a ${mois} mois`;
}

// ════════════════════════════════════════════════
// KPI Card
// ════════════════════════════════════════════════
function KpiCard({ icon: Icon, label, value, color, footer }) {
  const t = useTokens();
  const c = color ?? t.accent.primary;
  return (
    <div
      style={{
        background: t.surface.elevated,
        border: `1px solid ${t.border.subtle}`,
        borderRadius: t.radius.lg,
        padding: t.space.md,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontSize: t.font.size.sm,
            color: t.text.secondary,
            fontWeight: 500,
          }}
        >
          {label}
        </span>
        {Icon && (
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: t.radius.sm,
              background: `${c}15`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon size={16} color={c} />
          </div>
        )}
      </div>
      <div
        style={{
          fontSize: t.font.size["2xl"],
          fontWeight: 700,
          color: t.text.primary,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
      {footer && (
        <div style={{ fontSize: t.font.size.xs, color: t.text.secondary }}>
          {footer}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════
// Composant principal
// ════════════════════════════════════════════════
export function ImpayesSection({
  userId,
  canWrite = true, // ✨ NOUVEAU
}) {
  const t = useTokens();
  const isMobile = useIsMobile();

  const [filtreStatut, setFiltreStatut] = useState("");
  const [recherche, setRecherche] = useState("");
  const [payeModal, setPayeModal] = useState(null);
  const [relancingId, setRelancingId] = useState(null);

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [relanceGroupOpen, setRelanceGroupOpen] = useState(false);
  const [histoModal, setHistoModal] = useState(null);

  // ─── Queries ───────────────────────────────────
  const data = useQuery(api.abonnements.listImpayes, { userId });
  const dernieresRelances = useQuery(
    api.abonnements.getDernieresRelances,
    { userId }
  ) ?? [];

  const relancerM = useMutation(api.abonnements.relancerImpaye);

  const impayes = data?.impayes ?? [];
  const stats = data?.stats ?? {
    total: 0,
    montantTotal: 0,
    enGrace: 0,
    expire: 0,
    suspendu: 0,
    sansContact: 0,
    critiques: 0,
  };

  const relancesMap = useMemo(() => {
    const m = new Map();
    for (const r of dernieresRelances) {
      m.set(r.abonnementId, r);
    }
    return m;
  }, [dernieresRelances]);

  // ─── Filtrage ──────────────────────────────────
  const filtered = useMemo(() => {
    let result = impayes;
    if (filtreStatut) {
      result = result.filter((i) => i.statut === filtreStatut);
    }
    if (recherche.trim()) {
      const q = recherche.toLowerCase();
      result = result.filter(
        (i) =>
          (i.ecoleNom ?? "").toLowerCase().includes(q) ||
          (i.ecoleCode ?? "").toLowerCase().includes(q) ||
          (i.contactEmail ?? "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [impayes, filtreStatut, recherche]);

  // ─── Sélection multiple (uniquement si canWrite) ──
  const toggleSelect = (id) => {
    if (!canWrite) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!canWrite) return;
    setSelectedIds((prev) => {
      if (prev.size === filtered.length && filtered.length > 0) {
        return new Set();
      }
      return new Set(filtered.map((r) => r.abonnementId));
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  // ─── Handlers ──────────────────────────────────
  const handleRelancer = async (row) => {
    if (!canWrite) {
      toast.error("Permission requise : impayes.write");
      return;
    }
    if (!row.contactEmail) {
      toast.error("Aucun email de contact pour cette école.");
      return;
    }
    setRelancingId(row.abonnementId);
    try {
      const res = await relancerM({
        userId,
        abonnementId: row.abonnementId,
        template: "amiable",
      });
      toast.success(`Relance envoyée à ${res.sentTo}`);
    } catch (err) {
      toast.error("Erreur : " + (err?.message ?? "inconnue"));
    } finally {
      setRelancingId(null);
    }
  };

  const handleExport = async () => {
    if (filtered.length === 0) {
      toast.error("Aucune donnée à exporter");
      return;
    }
    try {
      const XLSX = await import("xlsx");
      const dataExport = filtered.map((i) => {
        const derniere = relancesMap.get(i.abonnementId);
        return {
          École: i.ecoleNom,
          Code: i.ecoleCode,
          Statut: STATUT_CONFIG[i.statut]?.label ?? i.statut,
          "Jours retard": i.joursRetard,
          "Montant dû (USD)": i.montantMensuel,
          Formule: i.formule,
          "Prochaine échéance": formatDate(i.prochaineEcheance),
          "Contact email": i.contactEmail ?? "—",
          "Contact nom": i.contactNom ?? "—",
          "Dernière relance": derniere
            ? formatDate(derniere.dateEnvoi)
            : "Jamais",
        };
      });

      const ws = XLSX.utils.json_to_sheet(dataExport);
      ws["!cols"] = [
        { wch: 28 }, { wch: 12 }, { wch: 14 }, { wch: 12 },
        { wch: 16 }, { wch: 14 }, { wch: 18 }, { wch: 28 }, { wch: 20 },
        { wch: 18 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Impayés");

      const dateStr = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `impayes_${dateStr}.xlsx`);
      toast.success(`Export Excel généré (${filtered.length} ligne(s))`);
    } catch (err) {
      toast.error("Erreur export : " + (err?.message ?? "inconnue"));
    }
  };

  const hasFilters = filtreStatut || recherche;

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

  const allSelected =
    filtered.length > 0 && selectedIds.size === filtered.length;

  // Colonnes : checkbox + 5 cols + actions
  // Si !canWrite → pas de checkbox
  const gridCols = canWrite
    ? "40px 2fr 1fr 1fr 1fr 1.5fr 160px"
    : "2fr 1fr 1fr 1fr 1.5fr 160px";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: t.space.lg }}>
      {/* ═══ Bandeau lecture seule ═══ */}
      {!canWrite && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: t.space.sm,
            padding: t.space.sm,
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
            de relancer ou marquer payé.
          </span>
        </div>
      )}

      {/* ═══ Header ═══ */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: t.space.md,
        }}
      >
        <div>
          <h2
            style={{
              fontSize: t.font.size.xl,
              fontWeight: 700,
              color: t.text.primary,
              margin: 0,
            }}
          >
            Impayés
          </h2>
          <p
            style={{
              fontSize: t.font.size.sm,
              color: t.text.secondary,
              margin: "4px 0 0",
            }}
          >
            Écoles en retard, en grâce ou suspendues
          </p>
        </div>
        <Button
          icon={<Download size={16} />}
          onClick={handleExport}
          disabled={filtered.length === 0}
        >
          Export Excel
        </Button>
      </div>

      {/* ═══ KPI Grid ═══ */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)",
          gap: t.space.md,
        }}
      >
        <KpiCard
          icon={AlertTriangle}
          label="Impayés"
          value={stats.total}
          color="#F59E0B"
        />
        <KpiCard
          icon={DollarSign}
          label="Montant total"
          value={formatEUR(stats.montantTotal)}
          color="#EF4444"
        />
        <KpiCard
          icon={Clock}
          label="Critiques (>30j)"
          value={stats.critiques}
          color="#991B1B"
          footer={`${stats.expire} expiré(s) · ${stats.suspendu} suspendu(s)`}
        />
        <KpiCard
          icon={Users}
          label="Sans contact"
          value={stats.sansContact}
          color="#64748B"
          footer="Aucun email configuré"
        />
      </div>

      {/* ═══ Filtres ═══ */}
      <div
        style={{
          display: "flex",
          gap: t.space.sm,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            background: t.surface.elevated,
            border: `1px solid ${t.border.default}`,
            borderRadius: t.radius.sm,
            padding: "8px 12px",
            flex: 1,
            minWidth: isMobile ? "100%" : 250,
          }}
        >
          <Search size={16} color={t.text.muted} />
          <input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher par école, code ou email..."
            style={{
              border: "none",
              outline: "none",
              background: "transparent",
              color: t.text.primary,
              fontSize: t.font.size.sm,
              fontFamily: t.font.family,
              marginLeft: 8,
              width: "100%",
            }}
          />
          {recherche && (
            <button
              type="button"
              onClick={() => setRecherche("")}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                color: t.text.muted,
                display: "flex",
              }}
              aria-label="Effacer"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {[null, "actif", "grace", "expire", "suspendu"].map((s) => {
          const active = filtreStatut === (s ?? "");
          const cfg = s
            ? STATUT_CONFIG[s]
            : { label: "Tous", color: t.accent.primary };
          return (
            <button
              key={s ?? "all"}
              type="button"
              onClick={() => setFiltreStatut(s ?? "")}
              style={{
                padding: "6px 12px",
                borderRadius: t.radius.sm,
                border: `1px solid ${active ? cfg.color : t.border.default}`,
                background: active ? `${cfg.color}15` : "transparent",
                color: active ? cfg.color : t.text.secondary,
                cursor: "pointer",
                fontSize: t.font.size.xs,
                fontWeight: 600,
                fontFamily: t.font.family,
              }}
            >
              {cfg.label}
            </button>
          );
        })}
      </div>

      {/* ═══ Barre d'actions groupées (canWrite requis) ═══ */}
      {canWrite && selectedIds.size > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: t.space.sm,
            padding: t.space.sm,
            background: `${t.accent.primary}10`,
            border: `1px solid ${t.accent.primary}30`,
            borderRadius: t.radius.md,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontSize: t.font.size.sm,
              fontWeight: 600,
              color: t.text.primary,
            }}
          >
            {selectedIds.size} école(s) sélectionnée(s)
          </span>
          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              gap: t.space.sm,
              flexWrap: "wrap",
            }}
          >
            <Button
              icon={<Send size={14} />}
              onClick={() => setRelanceGroupOpen(true)}
            >
              Relancer en masse
            </Button>
            <Button variant="ghost" onClick={clearSelection}>
              Annuler
            </Button>
          </div>
        </div>
      )}

      {/* ═══ Table ═══ */}
      {filtered.length === 0 ? (
        <div
          style={{
            padding: t.space.xl,
            textAlign: "center",
            background: t.surface.elevated,
            border: `1px solid ${t.border.subtle}`,
            borderRadius: t.radius.lg,
          }}
        >
          <CheckCircle2
            size={40}
            color="#10B981"
            style={{ marginBottom: 12 }}
          />
          <p
            style={{
              fontSize: t.font.size.sm,
              color: t.text.secondary,
              margin: 0,
            }}
          >
            {hasFilters
              ? "Aucun impayé ne correspond aux filtres."
              : "Aucun impayé ! 🎉"}
          </p>
        </div>
      ) : (
        <div
          style={{
            background: t.surface.elevated,
            border: `1px solid ${t.border.subtle}`,
            borderRadius: t.radius.lg,
            overflow: "hidden",
          }}
        >
          {/* Header desktop */}
          {!isMobile && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: gridCols,
                gap: t.space.sm,
                padding: `${t.space.sm} ${t.space.md}`,
                background: t.surface.hover,
                fontSize: t.font.size.xs,
                fontWeight: 700,
                color: t.text.secondary,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                alignItems: "center",
              }}
            >
              {canWrite && (
                <div>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    style={{ cursor: "pointer" }}
                    aria-label="Tout sélectionner"
                  />
                </div>
              )}
              <div>École</div>
              <div>Statut</div>
              <div>Retard</div>
              <div>Montant</div>
              <div>Contact</div>
              <div style={{ textAlign: "right" }}>Actions</div>
            </div>
          )}

          {filtered.map((row, i) => {
            const cfg = STATUT_CONFIG[row.statut] ?? {
              label: row.statut,
              color: "#64748B",
            };
            const relancing = relancingId === row.abonnementId;
            const isSelected = selectedIds.has(row.abonnementId);
            const derniereRelance = relancesMap.get(row.abonnementId);

            return (
              <div
                key={row.abonnementId}
                style={{
                  display: isMobile ? "flex" : "grid",
                  flexDirection: isMobile ? "column" : undefined,
                  gridTemplateColumns: isMobile ? undefined : gridCols,
                  gap: isMobile ? 6 : t.space.sm,
                  padding: `${t.space.sm} ${t.space.md}`,
                  borderTop: i > 0 ? `1px solid ${t.border.subtle}` : "none",
                  fontSize: t.font.size.sm,
                  alignItems: "center",
                  background: isSelected ? `${t.accent.primary}08` : "transparent",
                }}
              >
                {/* Checkbox (canWrite requis) */}
                {canWrite && (
                  <div>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(row.abonnementId)}
                      style={{ cursor: "pointer" }}
                      aria-label={`Sélectionner ${row.ecoleNom}`}
                    />
                  </div>
                )}

                {/* École */}
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: t.text.primary, fontWeight: 600 }}>
                    {row.ecoleNom}
                  </div>
                  {row.ecoleCode && (
                    <div
                      style={{
                        fontSize: t.font.size.xs,
                        color: t.text.muted,
                        fontFamily: "monospace",
                      }}
                    >
                      {row.ecoleCode}
                    </div>
                  )}
                </div>

                {/* Statut */}
                <div>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: cfg.color,
                      background: `${cfg.color}15`,
                      padding: "3px 8px",
                      borderRadius: t.radius.full,
                      textTransform: "uppercase",
                      letterSpacing: 0.3,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {cfg.label}
                  </span>
                </div>

                {/* Jours retard */}
                <div
                  style={{
                    color:
                      row.joursRetard > 30
                        ? "#EF4444"
                        : row.joursRetard > 0
                        ? "#F59E0B"
                        : t.text.muted,
                    fontWeight: row.joursRetard > 0 ? 700 : 400,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {row.joursRetard > 0 ? `${row.joursRetard}j` : "—"}
                </div>

                {/* Montant */}
                <div
                  style={{
                    color: t.text.primary,
                    fontWeight: 600,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {formatEUR(row.montantMensuel)}
                </div>

                {/* Contact + dernière relance */}
                <div style={{ minWidth: 0 }}>
                  {row.contactEmail ? (
                    <div
                      style={{
                        color: t.text.secondary,
                        fontSize: t.font.size.xs,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={row.contactEmail}
                    >
                      {row.contactNom ?? "—"} · {row.contactEmail}
                    </div>
                  ) : (
                    <span
                      style={{ color: "#EF4444", fontSize: t.font.size.xs }}
                    >
                      ⚠ Aucun email
                    </span>
                  )}
                  {derniereRelance && (
                    <div
                      style={{
                        fontSize: 10,
                        color: t.text.muted,
                        marginTop: 2,
                        display: "flex",
                        alignItems: "center",
                        gap: 3,
                      }}
                    >
                      <History size={9} />
                      Relance {formatRelativeDate(derniereRelance.dateEnvoi)}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div
                  style={{
                    display: "flex",
                    gap: 4,
                    justifyContent: isMobile ? "flex-start" : "flex-end",
                    flexWrap: "wrap",
                  }}
                >
                  {/* Relancer (canWrite requis) */}
                  {canWrite && (
                    <button
                      type="button"
                      onClick={() => handleRelancer(row)}
                      disabled={relancing || !row.contactEmail}
                      title="Envoyer une relance amiable"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "6px 10px",
                        background: relancing ? "#FEF3C7" : "#F59E0B",
                        color: "#FFFFFF",
                        border: "none",
                        borderRadius: t.radius.sm,
                        cursor:
                          relancing || !row.contactEmail
                            ? "not-allowed"
                            : "pointer",
                        fontSize: t.font.size.xs,
                        fontWeight: 600,
                        fontFamily: t.font.family,
                        opacity: !row.contactEmail ? 0.4 : 1,
                      }}
                    >
                      {relancing ? (
                        <Loader
                          size={12}
                          style={{ animation: "spin 1s linear infinite" }}
                        />
                      ) : (
                        <Mail size={12} />
                      )}
                      {!isMobile && "Relancer"}
                    </button>
                  )}

                  {/* Historique (toujours visible — lecture seule) */}
                  <button
                    type="button"
                    onClick={() => setHistoModal(row)}
                    title="Voir l'historique des relances"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "6px 8px",
                      background: "transparent",
                      color: t.text.secondary,
                      border: `1px solid ${t.border.default}`,
                      borderRadius: t.radius.sm,
                      cursor: "pointer",
                      fontFamily: t.font.family,
                    }}
                  >
                    <History size={12} />
                  </button>

                  {/* Marquer payé (canWrite requis) */}
                  {canWrite && (
                    <button
                      type="button"
                      onClick={() => setPayeModal(row)}
                      title="Marquer comme payé"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "6px 10px",
                        background: "#10B981",
                        color: "#FFFFFF",
                        border: "none",
                        borderRadius: t.radius.sm,
                        cursor: "pointer",
                        fontSize: t.font.size.xs,
                        fontWeight: 600,
                        fontFamily: t.font.family,
                      }}
                    >
                      <CheckCircle2 size={12} />
                      {!isMobile && "Payé"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ Modal Marquer Payé (canWrite requis) ═══ */}
      {canWrite && payeModal && (
        <MarquerPayeModal
          userId={userId}
          row={payeModal}
          onClose={() => setPayeModal(null)}
        />
      )}

      {/* ═══ Modal Relance groupée (canWrite requis) ═══ */}
      {canWrite && relanceGroupOpen && (
        <RelanceGroupModal
          userId={userId}
          abonnementIds={Array.from(selectedIds)}
          ecoles={filtered
            .filter((r) => selectedIds.has(r.abonnementId))
            .map((r) => r.ecoleNom)}
          onClose={() => {
            setRelanceGroupOpen(false);
            clearSelection();
          }}
        />
      )}

      {/* ═══ Modal Historique relances (toujours visible) ═══ */}
      {histoModal && (
        <HistoriqueRelancesModal
          userId={userId}
          row={histoModal}
          onClose={() => setHistoModal(null)}
        />
      )}
    </div>
  );
}

export default ImpayesSection;