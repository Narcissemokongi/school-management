import { useState, useMemo, useEffect } from "react";
import {
  X, Search, Loader, Edit2, Trash2, Upload, Download,
  FileSpreadsheet, Users, School, Settings,
  CheckCircle, Clock, RotateCcw,
} from "lucide-react";
import toast from "react-hot-toast";

// ============================================================
// KEYFRAMES PARTAGÉS (préfixés `fm-`)
// ============================================================
const fmStyles = `
  @keyframes fm-slide-up {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }
  @keyframes fm-fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes fm-spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  .fm-spin { animation: fm-spin 1s linear infinite; }
`;

// ============================================================
// BOTTOM SHEET FILTRES + ACTIONS
// ============================================================
export function FraisFiltersSheet({
  open,
  onClose,
  dark,
  searchTerm,
  setSearchTerm,
  classeActive,
  setClasseActive,
  statutFiltre,
  setStatutFiltre,
  classesStats,
  onReset,
  activeFiltersCount, // eslint-disable-line no-unused-vars
  onImportClick,
  onDownloadTemplate,
  onExportClick,
  importing,
  exporting,
  deviseSymbol,
}) {
  if (!open) return null;

  const labelStyle = {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: dark ? "#94A3B8" : "#64748B",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  };

  const fieldStyle = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 10,
    border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
    background: dark ? "#0F172A" : "#F8FAFC",
    color: dark ? "#F1F5F9" : "#1E293B",
    fontSize: 15,
    outline: "none",
    boxSizing: "border-box",
    appearance: "none",
    WebkitAppearance: "none",
  };

  const actionBtnStyle = (disabled) => ({
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "12px 14px",
    borderRadius: 10,
    border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
    background: dark ? "#0F172A" : "#F8FAFC",
    color: dark ? "#F1F5F9" : "#1E293B",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 600,
    fontSize: 14,
    textAlign: "left",
    width: "100%",
    opacity: disabled ? 0.6 : 1,
  });

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.45)",
          zIndex: 1100,
          animation: "fm-fade-in 0.18s ease-out",
        }}
      />
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          background: dark ? "#1E293B" : "#FFFFFF",
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          padding: "12px 16px 24px",
          zIndex: 1101,
          maxHeight: "85vh",
          overflowY: "auto",
          boxShadow: "0 -8px 30px rgba(0,0,0,0.25)",
          animation: "fm-slide-up 0.25s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <div
          style={{
            width: 40,
            height: 4,
            borderRadius: 2,
            background: dark ? "#475569" : "#CBD5E1",
            margin: "0 auto 16px",
          }}
        />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 18,
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: 17,
              fontWeight: 700,
              color: dark ? "#F1F5F9" : "#1E293B",
            }}
          >
            Filtrer et gérer
          </h3>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: dark ? "#94A3B8" : "#64748B",
              padding: 4,
            }}
          >
            <X size={22} />
          </button>
        </div>

        {/* Recherche */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Recherche</label>
          <div style={{ position: "relative" }}>
            <Search
              size={16}
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: dark ? "#94A3B8" : "#64748B",
              }}
            />
            <input
              type="text"
              placeholder="Nom, prénom, classe…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ ...fieldStyle, paddingLeft: 36 }}
            />
          </div>
        </div>

        {/* Classe */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Classe</label>
          <select
            value={classeActive}
            onChange={(e) => setClasseActive(e.target.value)}
            style={fieldStyle}
          >
            <option value="">Toutes les classes</option>
            {classesStats.map((c) => (
              <option key={c.nom} value={c.nom}>
                {c.nom} ({c.nbEleves})
              </option>
            ))}
          </select>
        </div>

        {/* Statut */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Statut</label>
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { v: "tous", l: "Tous" },
              { v: "paye", l: "Payé" },
              { v: "en_attente", l: "En attente" },
            ].map((opt) => (
              <button
                key={opt.v}
                onClick={() => setStatutFiltre(opt.v)}
                style={{
                  flex: 1,
                  padding: "10px 8px",
                  borderRadius: 10,
                  border: `1px solid ${
                    statutFiltre === opt.v
                      ? dark
                        ? "#818CF8"
                        : "#4F46E5"
                      : dark
                      ? "#334155"
                      : "#E2E8F0"
                  }`,
                  background:
                    statutFiltre === opt.v
                      ? dark
                        ? "#312E81"
                        : "#EEF2FF"
                      : "transparent",
                  color:
                    statutFiltre === opt.v
                      ? dark
                        ? "#C7D2FE"
                        : "#4F46E5"
                      : dark
                      ? "#CBD5E1"
                      : "#475569",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                {opt.l}
              </button>
            ))}
          </div>
        </div>

        {/* Actions rapides */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Actions</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button
              onClick={() => {
                onImportClick();
                onClose();
              }}
              disabled={importing}
              style={actionBtnStyle(importing)}
            >
              {importing ? (
                <Loader size={18} className="fm-spin" />
              ) : (
                <Upload size={18} />
              )}
              Importer depuis Excel
            </button>
            <button
              onClick={onDownloadTemplate}
              style={actionBtnStyle(false)}
            >
              <FileSpreadsheet size={18} />
              Télécharger le modèle
            </button>
            <button
              onClick={() => {
                onExportClick();
                onClose();
              }}
              disabled={exporting}
              style={actionBtnStyle(exporting)}
            >
              {exporting ? (
                <Loader size={18} className="fm-spin" />
              ) : (
                <Download size={18} />
              )}
              Exporter en Excel
            </button>
          </div>
          <p
            style={{
              color: dark ? "#94A3B8" : "#64748B",
              fontSize: 11.5,
              marginTop: 8,
              marginBottom: 0,
              lineHeight: 1.4,
            }}
          >
            Colonnes attendues : <strong>nom, postnom, classe, montantTotal, montantPaye, commentaire</strong>.
            Montants en <strong>{deviseSymbol}</strong>.
          </p>
        </div>

        {/* Actions principales */}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => {
              onReset();
              onClose();
            }}
            style={{
              flex: 1,
              padding: "14px 16px",
              borderRadius: 12,
              border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
              background: "transparent",
              color: dark ? "#CBD5E1" : "#475569",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <RotateCcw size={16} />
            Réinitialiser
          </button>
          <button
            onClick={onClose}
            style={{
              flex: 2,
              padding: "14px 16px",
              borderRadius: 12,
              border: "none",
              background: dark ? "#818CF8" : "#4F46E5",
              color: "#FFFFFF",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Voir les résultats
          </button>
        </div>
      </div>

      <style>{fmStyles}</style>
    </>
  );
}

// ============================================================
// MODALE AJOUT / ÉDITION DE FRAIS
// ============================================================
export function AddFraisModal({
  open,
  onClose,
  initialMode = "individuel",
  initialData = null,
  eleves,
  fraisClasses,
  upsertFrais,
  upsertBulk,
  ecoleId,
  anneeId,
  userId,
  deviseSymbol,
  dark,
  isMobile,
}) {
  const [mode, setMode] = useState(initialMode);

  useEffect(() => {
    if (open) {
      setMode(initialData ? "individuel" : initialMode);
    }
  }, [open, initialMode, initialData]);

  if (!open) return null;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          zIndex: 1200,
          animation: "fm-fade-in 0.18s ease-out",
        }}
      />
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          top: isMobile ? "auto" : 0,
          background: dark ? "#1E293B" : "#FFFFFF",
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          borderRadius: isMobile ? "20px 20px 0 0" : 0,
          padding: isMobile ? "12px 16px 24px" : 0,
          zIndex: 1201,
          maxHeight: isMobile ? "92vh" : "100vh",
          height: isMobile ? "auto" : "100vh",
          overflowY: "auto",
          boxShadow: isMobile
            ? "0 -8px 30px rgba(0,0,0,0.25)"
            : "none",
          animation: isMobile
            ? "fm-slide-up 0.25s cubic-bezier(0.22, 1, 0.36, 1)"
            : "fm-fade-in 0.2s ease-out",
        }}
      >
        <div
          style={
            isMobile
              ? { display: "contents" }
              : {
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: "100%",
                  maxWidth: 640,
                  maxHeight: "90vh",
                  overflowY: "auto",
                  background: dark ? "#1E293B" : "#FFFFFF",
                  borderRadius: 16,
                  padding: 24,
                  border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
                  boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
                }
          }
        >
          {isMobile && (
            <div
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                background: dark ? "#475569" : "#CBD5E1",
                margin: "0 auto 14px",
              }}
            />
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: 17,
                fontWeight: 700,
                color: dark ? "#F1F5F9" : "#1E293B",
              }}
            >
              {initialData ? "Modifier les frais" : "Nouveaux frais"}
            </h3>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: dark ? "#94A3B8" : "#64748B",
                padding: 4,
              }}
            >
              <X size={22} />
            </button>
          </div>

          {!initialData && (
            <div
              style={{
                display: "flex",
                borderBottom: `2px solid ${dark ? "#334155" : "#E2E8F0"}`,
                marginBottom: 18,
                overflowX: "auto",
                whiteSpace: "nowrap",
                scrollbarWidth: "none",
              }}
            >
              <button
                onClick={() => setMode("individuel")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "10px 14px",
                  border: "none",
                  background: "transparent",
                  color:
                    mode === "individuel"
                      ? dark
                        ? "#818CF8"
                        : "#4F46E5"
                      : dark
                      ? "#94A3B8"
                      : "#64748B",
                  fontWeight: mode === "individuel" ? 700 : 500,
                  borderBottom:
                    mode === "individuel"
                      ? `3px solid ${dark ? "#818CF8" : "#4F46E5"}`
                      : "3px solid transparent",
                  cursor: "pointer",
                  fontSize: 13.5,
                  flexShrink: 0,
                  marginBottom: -2,
                }}
              >
                <Users size={16} /> Individuel
              </button>
              <button
                onClick={() => setMode("groupe")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "10px 14px",
                  border: "none",
                  background: "transparent",
                  color:
                    mode === "groupe"
                      ? dark
                        ? "#818CF8"
                        : "#4F46E5"
                      : dark
                      ? "#94A3B8"
                      : "#64748B",
                  fontWeight: mode === "groupe" ? 700 : 500,
                  borderBottom:
                    mode === "groupe"
                      ? `3px solid ${dark ? "#818CF8" : "#4F46E5"}`
                      : "3px solid transparent",
                  cursor: "pointer",
                  fontSize: 13.5,
                  flexShrink: 0,
                  marginBottom: -2,
                }}
              >
                <School size={16} /> Groupé
              </button>
            </div>
          )}

          {mode === "individuel" ? (
            <AddFraisIndividuel
              eleves={eleves}
              fraisClasses={fraisClasses}
              upsertFrais={upsertFrais}
              ecoleId={ecoleId}
              anneeId={anneeId}
              userId={userId}
              initialData={initialData}
              onSuccess={onClose}
              deviseSymbol={deviseSymbol}
              dark={dark}
              isMobile={isMobile}
            />
          ) : (
            <AddFraisGroupe
              eleves={eleves}
              fraisClasses={fraisClasses}
              upsertBulk={upsertBulk}
              ecoleId={ecoleId}
              anneeId={anneeId}
              userId={userId}
              onSuccess={onClose}
              deviseSymbol={deviseSymbol}
              dark={dark}
              isMobile={isMobile}
            />
          )}
        </div>
      </div>

      <style>{fmStyles}</style>
    </>
  );
}

// ============================================================
// MODALE DÉTAIL D'UN FRAIS
// ============================================================
export function DetailFraisModal({
  frais,
  eleve,
  deviseSymbol,
  onClose,
  onEdit,
  onDelete,
  dark,
  isMobile,
}) {
  const estPaye = frais.reste <= 0;
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";

  const resteColor = estPaye
    ? dark
      ? "#34D399"
      : "#10B981"
    : dark
    ? "#FBBF24"
    : "#F59E0B";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: isMobile ? "flex-end" : "center",
        justifyContent: "center",
        zIndex: 1300,
        padding: isMobile ? 0 : 16,
        animation: "fm-fade-in 0.2s ease-out",
      }}
    >
      <div
        style={{
          background: cardBg,
          borderRadius: isMobile ? "20px 20px 0 0" : 16,
          padding: isMobile ? 16 : 24,
          width: "100%",
          maxWidth: isMobile ? "100%" : 520,
          maxHeight: "92vh",
          overflowY: "auto",
          boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
          border: `1px solid ${cardBorder}`,
        }}
      >
        {isMobile && (
          <div
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              background: dark ? "#475569" : "#CBD5E1",
              margin: "0 auto 14px",
            }}
          />
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 18,
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: 17,
              fontWeight: 700,
              color: textPrimary,
            }}
          >
            Détail des frais
          </h3>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: textSecondary,
              padding: 4,
            }}
          >
            <X size={22} />
          </button>
        </div>

        {/* Carte élève */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: 14,
            marginBottom: 16,
            background: dark ? "#0F172A" : "#F8FAFC",
            borderRadius: 12,
            border: `1px solid ${cardBorder}`,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: dark ? "#312E81" : "#EEF2FF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: dark ? "#A5B4FC" : "#4F46E5",
              fontWeight: 700,
              fontSize: 14,
              flexShrink: 0,
            }}
          >
            {eleve?.prenom?.[0]}
            {eleve?.nom?.[0]}
          </div>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: textPrimary,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {eleve?.nom} {eleve?.postnom}{" "}
              {eleve?.prenom ? `(${eleve.prenom})` : ""}
            </div>
            <div style={{ fontSize: 12.5, color: textSecondary, marginTop: 2 }}>
              Classe {eleve?.classe}
            </div>
          </div>
        </div>

        {/* Note en grand */}
        <div
          style={{
            padding: "16px 0",
            marginBottom: 16,
            background: dark ? "#0F172A" : "#F8FAFC",
            borderRadius: 12,
            border: `1px solid ${cardBorder}`,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: textSecondary,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              marginBottom: 6,
            }}
          >
            Reste à payer
          </div>
          <div
            style={{
              fontSize: 32,
              fontWeight: 800,
              color: resteColor,
              lineHeight: 1,
            }}
          >
            {frais.reste.toLocaleString()}
            <span
              style={{
                fontSize: 16,
                fontWeight: 500,
                color: textSecondary,
                marginLeft: 6,
              }}
            >
              {deviseSymbol}
            </span>
          </div>
          <div
            style={{
              marginTop: 10,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 10px",
              borderRadius: 20,
              fontSize: 11.5,
              fontWeight: 700,
              background: estPaye
                ? dark
                  ? "#064E3B"
                  : "#D1FAE5"
                : dark
                ? "#78350F"
                : "#FEF3C7",
              color: estPaye
                ? dark
                  ? "#34D399"
                  : "#065F46"
                : dark
                ? "#FBBF24"
                : "#92400E",
            }}
          >
            {estPaye ? <CheckCircle size={12} /> : <Clock size={12} />}
            {estPaye ? "Soldé" : "En attente"}
          </div>
        </div>

        {/* Détails */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <DetailRow
            label="Montant total"
            value={`${frais.montantTotal.toLocaleString()} ${deviseSymbol}`}
            dark={dark}
          />
          <DetailRow
            label="Montant payé"
            value={`${frais.montantPaye.toLocaleString()} ${deviseSymbol}`}
            dark={dark}
          />
          {frais.commentaire && (
            <DetailRow
              label="Commentaire"
              value={frais.commentaire}
              dark={dark}
            />
          )}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          <button
            onClick={onEdit}
            style={{
              flex: 1,
              padding: "12px 14px",
              borderRadius: 12,
              border: `1px solid ${cardBorder}`,
              background: dark ? "#0F172A" : "#F8FAFC",
              color: textPrimary,
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 13.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <Edit2 size={16} />
            Modifier
          </button>
          <button
            onClick={onDelete}
            style={{
              flex: 1,
              padding: "12px 14px",
              borderRadius: 12,
              border: "none",
              background: "#DC2626",
              color: "#FFFFFF",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 13.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <Trash2 size={16} />
            Supprimer
          </button>
        </div>

        <button
          onClick={onClose}
          style={{
            marginTop: 10,
            width: "100%",
            padding: 12,
            background: "transparent",
            border: `1px solid ${cardBorder}`,
            borderRadius: 12,
            color: textSecondary,
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 13.5,
          }}
        >
          Fermer
        </button>
      </div>
    </div>
  );
}

function DetailRow({ label, value, dark }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        borderRadius: 10,
        background: dark ? "#0F172A" : "#F8FAFC",
        border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: dark ? "#94A3B8" : "#64748B",
          textTransform: "uppercase",
          letterSpacing: 0.3,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 13.5,
          fontWeight: 700,
          color: dark ? "#F1F5F9" : "#1E293B",
          textAlign: "right",
          wordBreak: "break-word",
        }}
      >
        {value}
      </span>
    </div>
  );
}

// ============================================================
// MODALE CONFIG FRAIS PAR CLASSE
// ============================================================
export function ConfigFraisModal({
  open,
  onClose,
  classesStats,
  upsertFraisClasse,
  ecoleId,
  anneeId,
  userId, // ✅ Ajouté dans les props
  deviseSymbol,
  dark,
  isMobile,
}) {
  const [configClasse, setConfigClasse] = useState("");
  const [configMontant, setConfigMontant] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setConfigClasse("");
      setConfigMontant("");
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!configClasse || !configMontant) {
      toast.error("Veuillez sélectionner une classe et saisir un montant.");
      return;
    }
    setSubmitting(true);
    try {
      await upsertFraisClasse({
        classe: configClasse,
        montantTotal: parseFloat(configMontant),
        ecoleId,
        anneeId: anneeId || undefined,
        userId, // ✅ Ajouté (à confirmer côté backend)
      });
      toast.success(`Montant fixé pour la classe ${configClasse}`);
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const fieldStyle = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 10,
    border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
    background: dark ? "#0F172A" : "#F8FAFC",
    color: dark ? "#F1F5F9" : "#1E293B",
    fontSize: 15,
    outline: "none",
    boxSizing: "border-box",
    appearance: "none",
    WebkitAppearance: "none",
  };

  const labelStyle = {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: dark ? "#94A3B8" : "#64748B",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  };

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          zIndex: 1300,
          animation: "fm-fade-in 0.18s ease-out",
        }}
      />
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          top: isMobile ? "auto" : 0,
          background: dark ? "#1E293B" : "#FFFFFF",
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          borderRadius: isMobile ? "20px 20px 0 0" : 0,
          padding: isMobile ? "12px 16px 24px" : 0,
          zIndex: 1301,
          maxHeight: isMobile ? "92vh" : "100vh",
          height: isMobile ? "auto" : "100vh",
          overflowY: "auto",
          animation: isMobile
            ? "fm-slide-up 0.25s cubic-bezier(0.22, 1, 0.36, 1)"
            : "fm-fade-in 0.2s ease-out",
        }}
      >
        <div
          style={
            isMobile
              ? { display: "contents" }
              : {
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: "100%",
                  maxWidth: 480,
                  maxHeight: "90vh",
                  overflowY: "auto",
                  background: dark ? "#1E293B" : "#FFFFFF",
                  borderRadius: 16,
                  padding: 24,
                  border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
                  boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
                }
          }
        >
          {isMobile && (
            <div
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                background: dark ? "#475569" : "#CBD5E1",
                margin: "0 auto 14px",
              }}
            />
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 18,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Settings size={18} color={dark ? "#818CF8" : "#4F46E5"} />
              <h3
                style={{
                  margin: 0,
                  fontSize: 17,
                  fontWeight: 700,
                  color: dark ? "#F1F5F9" : "#1E293B",
                }}
              >
                Frais par classe
              </h3>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: dark ? "#94A3B8" : "#64748B",
                padding: 4,
              }}
            >
              <X size={22} />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Classe</label>
              <select
                value={configClasse}
                onChange={(e) => {
                  setConfigClasse(e.target.value);
                  const c = classesStats.find(
                    (c) => c.nom === e.target.value
                  );
                  if (c?.montantTotal) {
                    setConfigMontant(c.montantTotal.toString());
                  } else {
                    setConfigMontant("");
                  }
                }}
                style={fieldStyle}
              >
                <option value="">Sélectionner une classe</option>
                {classesStats.map((c) => (
                  <option key={c.nom} value={c.nom}>
                    {c.nom} (actuel : {c.montantTotal.toLocaleString()}{" "}
                    {deviseSymbol})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>
                Montant total ({deviseSymbol})
              </label>
              <input
                type="number"
                step="0.01"
                value={configMontant}
                onChange={(e) => setConfigMontant(e.target.value)}
                placeholder="Ex: 50000"
                style={fieldStyle}
              />
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: "14px 16px",
                  borderRadius: 12,
                  border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
                  background: "transparent",
                  color: dark ? "#CBD5E1" : "#475569",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={submitting || !configClasse || !configMontant}
                style={{
                  flex: 2,
                  padding: "14px 16px",
                  borderRadius: 12,
                  border: "none",
                  background:
                    submitting || !configClasse || !configMontant
                      ? "#A5B4FC"
                      : dark
                      ? "#818CF8"
                      : "#4F46E5",
                  color: "#FFFFFF",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor:
                    submitting || !configClasse || !configMontant
                      ? "not-allowed"
                      : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                {submitting && <Loader size={16} className="fm-spin" />}
                {submitting ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <style>{fmStyles}</style>
    </>
  );
}

// ============================================================
// SOUS-COMPOSANT : Ajout individuel
// ============================================================
function AddFraisIndividuel({
  eleves,
  fraisClasses,
  upsertFrais,
  ecoleId,
  anneeId,
  userId,
  initialData,
  onSuccess,
  deviseSymbol,
  dark,
  isMobile,
}) {
  const [selectedEleve, setSelectedEleve] = useState(
    initialData?.eleveId || ""
  );
  const [montantPaye, setMontantPaye] = useState(
    initialData?.montantPaye?.toString() || ""
  );
  const [commentaire, setCommentaire] = useState(
    initialData?.commentaire || ""
  );
  const [editId, setEditId] = useState(initialData?._id || null);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [searchEleve, setSearchEleve] = useState("");

  const elevesFiltresRecherche = useMemo(() => {
    if (!searchEleve.trim()) return eleves;
    const q = searchEleve.toLowerCase();
    return eleves.filter(
      (e) =>
        `${e.nom} ${e.postnom} ${e.prenom || ""}`.toLowerCase().includes(q) ||
        (e.classe || "").toLowerCase().includes(q)
    );
  }, [eleves, searchEleve]);

  const montantTotal = useMemo(() => {
    if (!selectedEleve) return "";
    const eleve = eleves.find((e) => e._id === selectedEleve);
    if (!eleve) return "";
    const fraisClasse = fraisClasses.find((fc) => fc.classe === eleve.classe);
    return fraisClasse?.montantTotal?.toString() || "";
  }, [selectedEleve, eleves, fraisClasses]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEleve) {
      setErrors({ selectedEleve: "Veuillez sélectionner un élève." });
      return;
    }
    if (!montantPaye || isNaN(parseFloat(montantPaye))) {
      setErrors({ montantPaye: "Montant invalide." });
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        eleveId: selectedEleve,
        ecoleId,
        montantTotal: parseFloat(montantTotal || "0"),
        montantPaye: parseFloat(montantPaye),
        commentaire: commentaire || undefined,
        anneeId,
        userId,
      };
      if (editId) payload.id = editId;
      await upsertFrais(payload);
      toast.success(editId ? "Frais mis à jour" : "Frais enregistrés");
      setSelectedEleve("");
      setMontantPaye("");
      setCommentaire("");
      setEditId(null);
      setErrors({});
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = (hasError = false) => ({
    width: "100%",
    padding: isMobile ? "12px 14px" : "10px 14px",
    border: `1px solid ${
      hasError ? "#EF4444" : dark ? "#334155" : "#E2E8F0"
    }`,
    borderRadius: 10,
    fontSize: isMobile ? 15 : 14,
    outline: "none",
    background: dark ? "#0F172A" : "#F8FAFC",
    color: dark ? "#F1F5F9" : "#1E293B",
    boxSizing: "border-box",
  });

  const labelStyle = {
    display: "block",
    marginBottom: 6,
    fontWeight: 600,
    fontSize: 12,
    color: dark ? "#CBD5E1" : "#374151",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>
          Élève <span style={{ color: "#EF4444" }}>*</span>
        </label>
        {!selectedEleve ? (
          <>
            <div style={{ position: "relative" }}>
              <Search
                size={16}
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: dark ? "#94A3B8" : "#64748B",
                }}
              />
              <input
                type="text"
                placeholder="Rechercher un élève…"
                value={searchEleve}
                onChange={(e) => setSearchEleve(e.target.value)}
                style={{
                  ...inputStyle(!!errors.selectedEleve),
                  paddingLeft: 36,
                }}
              />
            </div>
            {searchEleve.trim() && (
              <div
                style={{
                  maxHeight: 200,
                  overflowY: "auto",
                  marginTop: 6,
                  border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
                  borderRadius: 10,
                  background: dark ? "#1E293B" : "#FFFFFF",
                }}
              >
                {elevesFiltresRecherche.slice(0, 20).map((e) => (
                  <button
                    key={e._id}
                    type="button"
                    onClick={() => {
                      setSelectedEleve(e._id);
                      setSearchEleve("");
                      setErrors({});
                    }}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: "10px 12px",
                      border: "none",
                      borderBottom: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
                      background: "transparent",
                      color: dark ? "#F1F5F9" : "#1E293B",
                      cursor: "pointer",
                      fontSize: 14,
                    }}
                  >
                    {e.nom} {e.postnom} {e.prenom}{" "}
                    <span style={{ color: dark ? "#94A3B8" : "#64748B" }}>
                      ({e.classe})
                    </span>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              padding: "10px 12px",
              border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
              borderRadius: 10,
              background: dark ? "#0F172A" : "#F8FAFC",
              color: dark ? "#F1F5F9" : "#1E293B",
            }}
          >
            <span
              style={{
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontSize: 14,
              }}
            >
              {eleves.find((e) => e._id === selectedEleve)?.nom}{" "}
              {eleves.find((e) => e._id === selectedEleve)?.postnom} (
              {eleves.find((e) => e._id === selectedEleve)?.classe})
            </span>
            <button
              type="button"
              onClick={() => {
                setSelectedEleve("");
                setSearchEleve("");
              }}
              style={{
                background: dark ? "#1E293B" : "#FFFFFF",
                border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
                borderRadius: 8,
                padding: "6px 12px",
                color: dark ? "#F1F5F9" : "#1E293B",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              Changer
            </button>
          </div>
        )}
        {errors.selectedEleve && (
          <div
            style={{ color: "#EF4444", fontSize: 12, marginTop: 6 }}
          >
            {errors.selectedEleve}
          </div>
        )}
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>
          Montant total ({deviseSymbol})
        </label>
        <input
          type="text"
          value={
            montantTotal
              ? parseFloat(montantTotal).toLocaleString()
              : "Non défini"
          }
          readOnly
          style={{
            ...inputStyle(false),
            opacity: 0.7,
            cursor: "not-allowed",
          }}
        />
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>
          Montant payé ({deviseSymbol}){" "}
          <span style={{ color: "#EF4444" }}>*</span>
        </label>
        <input
          type="number"
          step="0.01"
          placeholder="Ex: 20000"
          value={montantPaye}
          onChange={(e) => {
            setMontantPaye(e.target.value);
            setErrors((prev) => ({ ...prev, montantPaye: undefined }));
          }}
          style={inputStyle(!!errors.montantPaye)}
        />
        {errors.montantPaye && (
          <div
            style={{ color: "#EF4444", fontSize: 12, marginTop: 6 }}
          >
            {errors.montantPaye}
          </div>
        )}
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>Commentaire (optionnel)</label>
        <input
          value={commentaire}
          onChange={(e) => setCommentaire(e.target.value)}
          placeholder="Ex: Frais de scolarité"
          style={inputStyle(false)}
        />
      </div>

      <div
        style={{
          display: "flex",
          gap: 10,
          flexDirection: isMobile ? "column" : "row",
        }}
      >
        <button
          type="submit"
          disabled={submitting}
          style={{
            background: dark ? "#818CF8" : "#4F46E5",
            color: "white",
            border: "none",
            borderRadius: 12,
            padding: "14px 18px",
            fontWeight: 700,
            cursor: submitting ? "not-allowed" : "pointer",
            flex: isMobile ? "none" : 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            fontSize: 14,
            opacity: submitting ? 0.7 : 1,
          }}
        >
          {submitting && <Loader size={16} className="fm-spin" />}
          {submitting
            ? "Enregistrement…"
            : editId
            ? "Mettre à jour"
            : "Ajouter"}
        </button>
        {editId && (
          <button
            type="button"
            onClick={() => {
              setEditId(null);
              setSelectedEleve("");
              setMontantPaye("");
              setCommentaire("");
              setErrors({});
              if (onSuccess) onSuccess();
            }}
            style={{
              background: dark ? "#334155" : "#F1F5F9",
              border: "none",
              borderRadius: 12,
              padding: "14px 18px",
              cursor: "pointer",
              color: dark ? "#F1F5F9" : "#1E293B",
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            Annuler
          </button>
        )}
      </div>
    </form>
  );
}

// ============================================================
// SOUS-COMPOSANT : Ajout groupé
// ============================================================
function AddFraisGroupe({
  eleves,
  fraisClasses,
  upsertBulk,
  ecoleId,
  anneeId,
  userId,
  onSuccess,
  deviseSymbol,
  dark,
  isMobile,
}) {
  const [selectedEleveIds, setSelectedEleveIds] = useState([]);
  const [montantPaye, setMontantPaye] = useState("");
  const [commentaire, setCommentaire] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [searchEleve, setSearchEleve] = useState("");

  const elevesFiltresRecherche = useMemo(() => {
    if (!searchEleve.trim()) return eleves;
    const q = searchEleve.toLowerCase();
    return eleves.filter(
      (e) =>
        `${e.nom} ${e.postnom} ${e.prenom || ""}`.toLowerCase().includes(q) ||
        (e.classe || "").toLowerCase().includes(q)
    );
  }, [eleves, searchEleve]);

  const toggleEleve = (id) =>
    setSelectedEleveIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  const selectAll = () =>
    setSelectedEleveIds(elevesFiltresRecherche.map((e) => e._id));
  const deselectAll = () => setSelectedEleveIds([]);

  const montantTotalMoyen = useMemo(() => {
    if (selectedEleveIds.length === 0) return 0;
    const elevesSelectionnes = eleves.filter((e) =>
      selectedEleveIds.includes(e._id)
    );
    const classesUniques = new Set(elevesSelectionnes.map((e) => e.classe));
    if (classesUniques.size !== 1) return null;
    const classe = [...classesUniques][0];
    const fraisClasse = fraisClasses.find((fc) => fc.classe === classe);
    return fraisClasse?.montantTotal || 0;
  }, [selectedEleveIds, eleves, fraisClasses]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedEleveIds.length === 0) {
      setErrors({ selectedEleveIds: "Sélectionnez au moins un élève." });
      return;
    }
    if (!montantPaye || isNaN(parseFloat(montantPaye))) {
      setErrors({ montantPaye: "Montant invalide." });
      return;
    }
    if (montantTotalMoyen === null) {
      toast.error(
        "Les élèves sélectionnés appartiennent à des classes différentes avec des montants différents."
      );
      return;
    }
    setSubmitting(true);
    try {
      const nb = await upsertBulk({
        eleveIds: selectedEleveIds,
        ecoleId,
        montantTotal: montantTotalMoyen,
        montantPaye: parseFloat(montantPaye),
        commentaire: commentaire || undefined,
        anneeId,
        userId,
      });
      toast.success(`Frais mis à jour pour ${nb} élève(s).`);
      setSelectedEleveIds([]);
      setMontantPaye("");
      setCommentaire("");
      setErrors({});
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = (hasError = false) => ({
    width: "100%",
    padding: isMobile ? "12px 14px" : "10px 14px",
    border: `1px solid ${
      hasError ? "#EF4444" : dark ? "#334155" : "#E2E8F0"
    }`,
    borderRadius: 10,
    fontSize: isMobile ? 15 : 14,
    outline: "none",
    background: dark ? "#0F172A" : "#F8FAFC",
    color: dark ? "#F1F5F9" : "#1E293B",
    boxSizing: "border-box",
  });

  const labelStyle = {
    display: "block",
    marginBottom: 6,
    fontWeight: 600,
    fontSize: 12,
    color: dark ? "#CBD5E1" : "#374151",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Liste élèves */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <span
          style={{
            fontWeight: 600,
            fontSize: 12,
            color: dark ? "#CBD5E1" : "#374151",
            textTransform: "uppercase",
            letterSpacing: 0.3,
          }}
        >
          Élèves · {selectedEleveIds.length} sélectionné
          {selectedEleveIds.length > 1 ? "s" : ""}
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={selectAll}
            style={{
              background: "none",
              border: "none",
              color: dark ? "#818CF8" : "#4F46E5",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Tout
          </button>
          <button
            type="button"
            onClick={deselectAll}
            style={{
              background: "none",
              border: "none",
              color: dark ? "#94A3B8" : "#64748B",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Aucun
          </button>
        </div>
      </div>

      <div style={{ position: "relative", marginBottom: 8 }}>
        <Search
          size={16}
          style={{
            position: "absolute",
            left: 12,
            top: "50%",
            transform: "translateY(-50%)",
            color: dark ? "#94A3B8" : "#64748B",
          }}
        />
        <input
          type="text"
          placeholder="Rechercher un élève…"
          value={searchEleve}
          onChange={(e) => setSearchEleve(e.target.value)}
          style={{ ...inputStyle(false), paddingLeft: 36 }}
        />
      </div>

      <div
        style={{
          maxHeight: 220,
          overflowY: "auto",
          border: `1px solid ${
            errors.selectedEleveIds
              ? "#EF4444"
              : dark
              ? "#334155"
              : "#E2E8F0"
          }`,
          borderRadius: 10,
          padding: 6,
          marginBottom: 8,
          background: dark ? "#0F172A" : "#F8FAFC",
        }}
      >
        {elevesFiltresRecherche.length === 0 && (
          <p
            style={{
              textAlign: "center",
              color: dark ? "#94A3B8" : "#64748B",
              padding: "16px 0",
              margin: 0,
              fontSize: 13,
            }}
          >
            Aucun élève trouvé
          </p>
        )}
        {elevesFiltresRecherche.map((e) => {
          const isSelected = selectedEleveIds.includes(e._id);
          return (
            <label
              key={e._id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 10px",
                fontSize: 13.5,
                cursor: "pointer",
                borderRadius: 8,
                background: isSelected
                  ? dark
                    ? "#312E81"
                    : "#EEF2FF"
                  : "transparent",
              }}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleEleve(e._id)}
                style={{
                  width: 18,
                  height: 18,
                  accentColor: dark ? "#818CF8" : "#4F46E5",
                }}
              />
              <span style={{ color: dark ? "#F1F5F9" : "#1E293B" }}>
                {e.nom} {e.postnom} {e.prenom}{" "}
                <span style={{ color: dark ? "#94A3B8" : "#64748B" }}>
                  ({e.classe})
                </span>
              </span>
            </label>
          );
        })}
      </div>
      {errors.selectedEleveIds && (
        <div
          style={{ color: "#EF4444", fontSize: 12, marginBottom: 12 }}
        >
          {errors.selectedEleveIds}
        </div>
      )}

      {/* Montant total */}
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>
          Montant total ({deviseSymbol})
        </label>
        <input
          type="text"
          value={
            montantTotalMoyen !== null && montantTotalMoyen !== 0
              ? montantTotalMoyen.toLocaleString()
              : selectedEleveIds.length > 0
              ? "Classes multiples"
              : "Sélectionnez des élèves"
          }
          readOnly
          style={{
            ...inputStyle(false),
            opacity: 0.7,
            cursor: "not-allowed",
          }}
        />
      </div>

      {/* Montant payé */}
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>
          Montant payé ({deviseSymbol}){" "}
          <span style={{ color: "#EF4444" }}>*</span>
        </label>
        <input
          type="number"
          step="0.01"
          placeholder="Ex: 20000"
          value={montantPaye}
          onChange={(e) => {
            setMontantPaye(e.target.value);
            setErrors((prev) => ({ ...prev, montantPaye: undefined }));
          }}
          style={inputStyle(!!errors.montantPaye)}
        />
        {errors.montantPaye && (
          <div
            style={{ color: "#EF4444", fontSize: 12, marginTop: 6 }}
          >
            {errors.montantPaye}
          </div>
        )}
      </div>

      {/* Commentaire */}
      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>Commentaire (optionnel)</label>
        <input
          value={commentaire}
          onChange={(e) => setCommentaire(e.target.value)}
          placeholder="Ex: Frais de scolarité"
          style={inputStyle(false)}
        />
      </div>

      <button
        type="submit"
        disabled={
          submitting ||
          selectedEleveIds.length === 0 ||
          !montantPaye ||
          montantTotalMoyen === null
        }
        style={{
          width: "100%",
          background:
            submitting ||
            selectedEleveIds.length === 0 ||
            !montantPaye ||
            montantTotalMoyen === null
              ? "#A5B4FC"
              : dark
              ? "#818CF8"
              : "#4F46E5",
          color: "white",
          border: "none",
          borderRadius: 12,
          padding: "14px 18px",
          fontWeight: 700,
          cursor:
            submitting ||
            selectedEleveIds.length === 0 ||
            !montantPaye ||
            montantTotalMoyen === null
              ? "not-allowed"
              : "pointer",
          fontSize: 14,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        {submitting && <Loader size={16} className="fm-spin" />}
        {submitting
          ? "Application…"
          : `Appliquer à ${selectedEleveIds.length} élève(s)`}
      </button>
    </form>
  );
}