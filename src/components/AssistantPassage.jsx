import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useConfirm } from "@/hooks/useConfirm";
import { ConfirmDialog } from "./ConfirmDialog";
import toast from "react-hot-toast";
import {
  ArrowRight, Loader, ClipboardList, Calendar, Search, X,
  AlertTriangle, ListChecks, SlidersHorizontal, RotateCcw,
  Users, CheckCircle2, Clock, GraduationCap, UserCheck, School,
  Check, Pencil, XCircle, Bell, CalendarClock, Gavel,
} from "lucide-react";

// ============================================================
// UTILITAIRES
// ============================================================
function formatDateFR(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const now = new Date();
  const target = new Date(dateStr);
  const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
  return diff;
}

// ============================================================
// CARTE STATISTIQUE
// ============================================================
function StatCard({ icon, label, value, color, dark, isMobile }) {
  return (
    <div
      style={{
        background: dark ? "#1E293B" : "#FFFFFF",
        borderRadius: 12,
        padding: isMobile ? "10px 12px" : "14px 16px",
        boxShadow: dark ? "0 1px 2px rgba(0,0,0,0.25)" : "0 1px 2px rgba(0,0,0,0.04)",
        border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
        display: "flex",
        alignItems: "center",
        gap: 10,
        minWidth: isMobile ? 130 : "auto",
        flex: isMobile ? "0 0 auto" : 1,
      }}
    >
      <div
        style={{
          width: 32, height: 32, borderRadius: 8,
          background: `${color}20`,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, color,
        }}
      >
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ color: dark ? "#94A3B8" : "#64748B", fontSize: 10.5, fontWeight: 500, whiteSpace: "nowrap" }}>
          {label}
        </div>
        <div style={{ color: dark ? "#F1F5F9" : "#1E293B", fontSize: 18, fontWeight: 700, lineHeight: 1.1 }}>
          {value}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MODALE DATE LIMITE
// ============================================================
function DateLimiteModal({ open, onClose, currentDate, onSave, saving, dark, isMobile }) {
  const [date, setDate] = useState(currentDate || "");

  useEffect(() => {
    if (open) setDate(currentDate || "");
  }, [open, currentDate]);

  if (!open) return null;

  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const inputBg = dark ? "#0F172A" : "#F8FAFC";
  const inputText = dark ? "#F1F5F9" : "#1E293B";
  const accent = dark ? "#818CF8" : "#4F46E5";

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.5)",
          zIndex: 1300,
          animation: "ap-fade-in 0.18s ease-out",
        }}
      />
      <div
        style={{
          position: "fixed",
          left: 0, right: 0, bottom: 0,
          top: isMobile ? "auto" : 0,
          background: dark ? "#1E293B" : "#FFFFFF",
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          borderRadius: isMobile ? "20px 20px 0 0" : 0,
          padding: isMobile ? "12px 16px 24px" : 0,
          zIndex: 1301,
          maxHeight: isMobile ? "92vh" : "100vh",
          height: isMobile ? "auto" : "100vh",
          animation: isMobile ? "ap-slide-up 0.25s cubic-bezier(0.22, 1, 0.36, 1)" : "ap-fade-in 0.2s",
        }}
      >
        <div
          style={
            isMobile
              ? { display: "contents" }
              : {
                  position: "absolute",
                  top: "50%", left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: "100%", maxWidth: 480,
                  background: cardBg,
                  borderRadius: 16,
                  padding: 24,
                  border: `1px solid ${cardBorder}`,
                  boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
                }
          }
        >
          {isMobile && (
            <div style={{ width: 40, height: 4, borderRadius: 2, background: dark ? "#475569" : "#CBD5E1", margin: "0 auto 14px" }} />
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: dark ? "#312E81" : "#EEF2FF", color: accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <CalendarClock size={16} />
              </div>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: textPrimary }}>
                Date limite
              </h3>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: textSecondary, padding: 4 }}>
              <X size={22} />
            </button>
          </div>

          <p style={{ fontSize: 12, color: textSecondary, marginTop: 0, marginBottom: 16, lineHeight: 1.5 }}>
            Fixez une date limite pour que les enseignants soumettent leurs propositions de passage. Après cette date, ils ne pourront plus soumettre ni modifier.
          </p>

          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: textSecondary, textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 6 }}>
            Date limite
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 10,
              border: `1px solid ${cardBorder}`,
              background: inputBg,
              color: inputText,
              fontSize: 15,
              outline: "none",
              boxSizing: "border-box",
              fontFamily: "inherit",
            }}
          />

          {currentDate && (
            <button
              onClick={() => {
                setDate("");
                onSave(null);
              }}
              style={{
                marginTop: 10,
                background: "none",
                border: "none",
                color: "#EF4444",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
                padding: 0,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <XCircle size={14} />
              Retirer la date limite
            </button>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button
              onClick={onClose}
              style={{
                flex: 1,
                padding: "14px 16px",
                borderRadius: 12,
                border: `1px solid ${cardBorder}`,
                background: "transparent",
                color: textSecondary,
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Annuler
            </button>
            <button
              onClick={() => onSave(date || null)}
              disabled={saving}
              style={{
                flex: 2,
                padding: "14px 16px",
                borderRadius: 12,
                border: "none",
                background: saving ? "#A5B4FC" : accent,
                color: "#FFFFFF",
                fontWeight: 700,
                fontSize: 14,
                cursor: saving ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              {saving ? <Loader size={16} className="ap-spin" /> : <Check size={16} />}
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes ap-slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes ap-fade-in { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </>
  );
}

// ============================================================
// BOTTOM SHEET FILTRES
// ============================================================
function FiltersSheet({
  open, onClose, dark,
  classeFilter, setClasseFilter, classesDisponibles,
  filter, setFilter, sortBy, setSortBy,
  onReset,
}) {
  if (!open) return null;

  const labelStyle = {
    display: "block", fontSize: 12, fontWeight: 600,
    color: dark ? "#94A3B8" : "#64748B",
    marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.3,
  };

  const fieldStyle = {
    width: "100%", padding: "12px 14px", borderRadius: 10,
    border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
    background: dark ? "#0F172A" : "#F8FAFC",
    color: dark ? "#F1F5F9" : "#1E293B",
    fontSize: 15, outline: "none", boxSizing: "border-box",
    appearance: "none", WebkitAppearance: "none",
  };

  const filterOptions = [
    { v: "tous", l: "Tous" },
    { v: "en_attente", l: "En attente" },
    { v: "validees", l: "Validées" },
    { v: "modifiees", l: "Modifiées" },
    { v: "rejetees", l: "Rejetées" },
    { v: "divergences", l: "⚠️ Divergences" },
    { v: "conseil", l: "⚖️ Conseil" },
  ];

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1100, animation: "ap-fade-in 0.18s" }} />
      <div
        style={{
          position: "fixed", left: 0, right: 0, bottom: 0,
          background: dark ? "#1E293B" : "#FFFFFF",
          borderTopLeftRadius: 20, borderTopRightRadius: 20,
          padding: "12px 16px 24px",
          zIndex: 1101, maxHeight: "85vh", overflowY: "auto",
          boxShadow: "0 -8px 30px rgba(0,0,0,0.25)",
          animation: "ap-slide-up 0.25s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <div style={{ width: 40, height: 4, borderRadius: 2, background: dark ? "#475569" : "#CBD5E1", margin: "0 auto 16px" }} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: dark ? "#F1F5F9" : "#1E293B" }}>
            Filtres
          </h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: dark ? "#94A3B8" : "#64748B", padding: 4 }}>
            <X size={22} />
          </button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>
            <School size={12} style={{ marginRight: 4, verticalAlign: "middle" }} />
            Classe
          </label>
          <select value={classeFilter} onChange={(e) => setClasseFilter(e.target.value)} style={fieldStyle}>
            <option value="">Toutes les classes</option>
            {classesDisponibles.map((c) => (
              <option key={c._id} value={c.nom}>{c.nom}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Afficher</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {filterOptions.map((opt) => (
              <button
                key={opt.v}
                onClick={() => setFilter(opt.v)}
                style={{
                  padding: "8px 14px",
                  borderRadius: 20,
                  border: `1px solid ${filter === opt.v ? (dark ? "#818CF8" : "#4F46E5") : (dark ? "#334155" : "#E2E8F0")}`,
                  background: filter === opt.v ? (dark ? "#312E81" : "#EEF2FF") : "transparent",
                  color: filter === opt.v ? (dark ? "#C7D2FE" : "#4F46E5") : (dark ? "#CBD5E1" : "#475569"),
                  fontWeight: 600, fontSize: 12.5, cursor: "pointer",
                }}
              >
                {opt.l}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Trier par</label>
          <div style={{ display: "flex", gap: 8 }}>
            {[{ v: "nom", l: "Nom" }, { v: "statut", l: "Statut" }].map((opt) => (
              <button
                key={opt.v}
                onClick={() => setSortBy(opt.v)}
                style={{
                  flex: 1, padding: "10px 8px", borderRadius: 10,
                  border: `1px solid ${sortBy === opt.v ? (dark ? "#818CF8" : "#4F46E5") : (dark ? "#334155" : "#E2E8F0")}`,
                  background: sortBy === opt.v ? (dark ? "#312E81" : "#EEF2FF") : "transparent",
                  color: sortBy === opt.v ? (dark ? "#C7D2FE" : "#4F46E5") : (dark ? "#CBD5E1" : "#475569"),
                  fontWeight: 600, fontSize: 13, cursor: "pointer",
                }}
              >
                {opt.l}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => { onReset(); onClose(); }}
            style={{
              flex: 1, padding: "14px 16px", borderRadius: 12,
              border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
              background: "transparent",
              color: dark ? "#CBD5E1" : "#475569",
              fontWeight: 600, fontSize: 14, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            <RotateCcw size={16} />
            Réinitialiser
          </button>
          <button
            onClick={onClose}
            style={{
              flex: 2, padding: "14px 16px", borderRadius: 12, border: "none",
              background: dark ? "#818CF8" : "#4F46E5",
              color: "#FFFFFF", fontWeight: 700, fontSize: 14, cursor: "pointer",
            }}
          >
            Voir les résultats
          </button>
        </div>
      </div>
      <style>{`
        @keyframes ap-slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes ap-fade-in { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </>
  );
}

// ============================================================
// CARTE ÉLÈVE (Proposition vs Décision)
// ============================================================
function EleveCard({
  insc,
  proposition,
  classesTriees,
  onValider,
  onToggleConseil,
  colors,
  dark,
  isMobile,
}) {
  const statutValidation = proposition?.statutValidation || "soumise";
  const isPending = statutValidation === "soumise";
  const isValidee = statutValidation === "validee";
  const isModifiee = statutValidation === "modifiee";
  const isRejetee = statutValidation === "rejetee";
  const isResolue = !isPending;

  const [statutFinal, setStatutFinal] = useState(
    proposition?.statutFinal || proposition?.statutPropose || ""
  );
  const [classeDest, setClasseDest] = useState(
    proposition?.classeDestinationFinale || proposition?.classeDestinationPropose || ""
  );
  const [commentaire, setCommentaire] = useState(proposition?.commentaireDirecteur || "");
  const [showEdit, setShowEdit] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setStatutFinal(proposition?.statutFinal || proposition?.statutPropose || "");
    setClasseDest(proposition?.classeDestinationFinale || proposition?.classeDestinationPropose || "");
    setCommentaire(proposition?.commentaireDirecteur || "");
    setShowEdit(false);
  }, [proposition?._id, proposition?.statutValidation]);

  const isDivergence =
    statutFinal !== proposition?.statutPropose ||
    (classeDest || "") !== (proposition?.classeDestinationPropose || "");

  const handleValider = async () => {
    if (!statutFinal) {
      toast.error("Veuillez choisir une décision.");
      return;
    }
    if (isDivergence && !commentaire.trim()) {
      toast.error("Justification obligatoire en cas de divergence.");
      return;
    }
    setSaving(true);
    try {
      await onValider({
        statutFinal,
        classeDestinationFinale: classeDest || undefined,
        commentaireDirecteur: commentaire.trim() || undefined,
      });
      setShowEdit(false);
    } finally {
      setSaving(false);
    }
  };

  let borderColor = colors.cardBorder;
  if (isPending) borderColor = colors.warning;
  else if (isValidee) borderColor = colors.success;
  else if (isModifiee) borderColor = "#8B5CF6";
  else if (isRejetee) borderColor = colors.danger;

  return (
    <div
      style={{
        background: colors.cardBg,
        borderRadius: 12,
        padding: isMobile ? "10px 12px" : "12px 14px",
        border: `1px solid ${borderColor}`,
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: isMobile ? 13.5 : 14, color: colors.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {insc.nom} {insc.postnom} {insc.prenom}
          </div>
          <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
            {insc.code || "Pas de matricule"}
          </div>
        </div>

        {isPending && (
          <span style={{
            background: colors.warningBg,
            color: colors.warningText,
            padding: "3px 10px", borderRadius: 12,
            fontSize: 10.5, fontWeight: 700,
            display: "inline-flex", alignItems: "center", gap: 4,
            flexShrink: 0,
          }}>
            <Clock size={11} /> En attente
          </span>
        )}
        {isValidee && (
          <span style={{
            background: dark ? "#064E3B" : "#D1FAE5",
            color: dark ? "#34D399" : "#065F46",
            padding: "3px 10px", borderRadius: 12,
            fontSize: 10.5, fontWeight: 700,
            display: "inline-flex", alignItems: "center", gap: 4,
            flexShrink: 0,
          }}>
            <Check size={11} /> Validée
          </span>
        )}
        {isModifiee && (
          <span style={{
            background: dark ? "#4C1D95" : "#EDE9FE",
            color: dark ? "#C4B5FD" : "#6D28D9",
            padding: "3px 10px", borderRadius: 12,
            fontSize: 10.5, fontWeight: 700,
            display: "inline-flex", alignItems: "center", gap: 4,
            flexShrink: 0,
          }}>
            <Pencil size={11} /> Modifiée
          </span>
        )}
        {isRejetee && (
          <span style={{
            background: dark ? "#7F1D1D" : "#FEE2E2",
            color: dark ? "#F87171" : "#B91C1C",
            padding: "3px 10px", borderRadius: 12,
            fontSize: 10.5, fontWeight: 700,
            display: "inline-flex", alignItems: "center", gap: 4,
            flexShrink: 0,
          }}>
            <XCircle size={11} /> Rejetée
          </span>
        )}
      </div>

      <div style={{
        background: dark ? "#0F172A" : "#F8FAFC",
        border: `1px solid ${colors.cardBorder}`,
        borderRadius: 10, padding: "8px 10px",
        marginBottom: 8, fontSize: isMobile ? 11.5 : 12,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <span style={{ color: colors.textSecondary, fontWeight: 600, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.3 }}>
            Proposition
          </span>
          <span style={{ color: colors.textSecondary, fontSize: 10.5 }}>
            {proposition?.enseignantNom || "—"}
          </span>
        </div>
        <div style={{ color: colors.textPrimary, fontWeight: 600, marginTop: 4 }}>
          {proposition?.statutPropose || "—"}
          {proposition?.classeDestinationPropose ? ` → ${proposition.classeDestinationPropose}` : ""}
        </div>
      </div>

      {isResolue && !showEdit ? (
        <div style={{
          background: isModifiee
            ? (dark ? "#4C1D95" + "20" : "#EDE9FE")
            : (dark ? "#0F172A" : "#F8FAFC"),
          border: `1px solid ${isModifiee ? (dark ? "#7C3AED" : "#C4B5FD") : colors.cardBorder}`,
          borderRadius: 10, padding: "8px 10px",
          fontSize: isMobile ? 11.5 : 12,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: colors.textSecondary, fontWeight: 600, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.3 }}>
              Décision finale
            </span>
            <button
              onClick={() => setShowEdit(true)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: colors.accent, fontSize: 11, fontWeight: 600,
                display: "flex", alignItems: "center", gap: 3, padding: 0,
              }}
            >
              <Pencil size={11} /> Modifier
            </button>
          </div>
          <div style={{ color: colors.textPrimary, fontWeight: 600, marginTop: 4 }}>
            {proposition?.statutFinal || proposition?.statutPropose || "—"}
            {proposition?.classeDestinationFinale ? ` → ${proposition.classeDestinationFinale}` : ""}
          </div>
          {proposition?.commentaireDirecteur && (
            <div style={{ color: colors.textSecondary, marginTop: 6, fontSize: 11, fontStyle: "italic" }}>
              « {proposition.commentaireDirecteur} »
            </div>
          )}
        </div>
      ) : (
        <div>
          <div style={{
            display: "grid",
            gridTemplateColumns: statutFinal === "passant" ? "1fr 1fr" : "1fr",
            gap: 8,
            marginBottom: 8,
          }}>
            <select
              value={statutFinal}
              onChange={(e) => setStatutFinal(e.target.value)}
              disabled={saving}
              style={{
                width: "100%",
                padding: isMobile ? "10px 12px" : "8px 12px",
                border: `1px solid ${colors.cardBorder}`,
                borderRadius: 10,
                fontSize: isMobile ? 14 : 13,
                background: colors.selectBg, color: colors.selectText, outline: "none",
              }}
            >
              <option value="">-- Décision --</option>
              <option value="passant">Passant</option>
              <option value="redoublant">Redoublant</option>
              <option value="transfere">Transféré</option>
              <option value="exclu">Exclu</option>
              <option value="diplome">Diplômé</option>
            </select>

            {statutFinal === "passant" && (
              <select
                value={classeDest}
                onChange={(e) => setClasseDest(e.target.value)}
                disabled={saving}
                style={{
                  width: "100%",
                  padding: isMobile ? "10px 12px" : "8px 12px",
                  border: `1px solid ${colors.cardBorder}`,
                  borderRadius: 10,
                  fontSize: isMobile ? 14 : 13,
                  background: colors.selectBg, color: colors.selectText, outline: "none",
                }}
              >
                <option value="">-- Classe --</option>
                {classesTriees.map((c) => (
                  <option key={c._id} value={c.nom}>{c.nom}</option>
                ))}
              </select>
            )}
          </div>

          {isDivergence && (
            <div style={{
              background: dark ? "#78350F" + "40" : "#FEF3C7",
              border: `1px solid ${colors.warning}`,
              borderRadius: 10,
              padding: "8px 10px",
              marginBottom: 8,
              fontSize: isMobile ? 11 : 11.5,
            }}>
              <div style={{ color: colors.warningText, fontWeight: 700, display: "flex", alignItems: "center", gap: 4, marginBottom: 6 }}>
                <AlertTriangle size={12} />
                Divergence — Justification obligatoire
              </div>
              <textarea
                value={commentaire}
                onChange={(e) => setCommentaire(e.target.value)}
                placeholder="Motif de la modification…"
                rows={2}
                disabled={saving}
                style={{
                  width: "100%",
                  padding: "6px 8px",
                  border: `1px solid ${colors.cardBorder}`,
                  borderRadius: 6,
                  fontSize: 11.5,
                  fontFamily: "inherit",
                  background: colors.cardBg,
                  color: colors.textPrimary,
                  outline: "none",
                  resize: "vertical",
                  boxSizing: "border-box",
                  minHeight: 50,
                }}
              />
            </div>
          )}

          <button
            onClick={() => onToggleConseil(!proposition?.enConseilDiscipline)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "4px 10px", borderRadius: 20,
              border: `1px solid ${proposition?.enConseilDiscipline ? "#8B5CF6" : colors.cardBorder}`,
              background: proposition?.enConseilDiscipline
                ? (dark ? "#4C1D95" + "40" : "#EDE9FE")
                : "transparent",
              color: proposition?.enConseilDiscipline
                ? (dark ? "#C4B5FD" : "#6D28D9")
                : colors.textSecondary,
              fontSize: 11, fontWeight: 600, cursor: "pointer",
              marginBottom: 8,
            }}
          >
            <Gavel size={11} />
            {proposition?.enConseilDiscipline ? "Marqué conseil" : "Conseil de discipline"}
          </button>

          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={handleValider}
              disabled={saving || !statutFinal}
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: 10,
                border: "none",
                background: saving || !statutFinal
                  ? (dark ? "#334155" : "#E2E8F0")
                  : colors.accent,
                color: saving || !statutFinal
                  ? colors.textSecondary
                  : "#FFFFFF",
                fontWeight: 700, fontSize: 12,
                cursor: saving || !statutFinal ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
              }}
            >
              {saving ? <Loader size={12} className="ap-spin" /> : <Check size={12} />}
              Valider cette décision
            </button>
            {!isPending && (
              <button
                onClick={() => setShowEdit(false)}
                style={{
                  padding: "8px 10px", borderRadius: 10,
                  border: `1px solid ${colors.cardBorder}`,
                  background: "transparent", color: colors.textSecondary,
                  fontSize: 12, cursor: "pointer",
                }}
              >
                Annuler
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================
export function AssistantPassage({ ecoleId, anneeActiveId, classes, user }) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();
  const { confirm, dialogProps } = useConfirm();

  // ── Queries avec références brutes pour détecter le chargement ──
  const anneesRaw = useQuery(
    api.anneesScolaires.listByEcole,
    ecoleId ? { ecoleId } : "skip"
  );
  const anneeActive = useQuery(
    api.anneesScolaires.getById,
    anneeActiveId ? { anneeId: anneeActiveId } : "skip"
  );
  const inscriptionsRaw = useQuery(
    api.inscriptions.listByAnnee,
    ecoleId && anneeActiveId ? { ecoleId, anneeId: anneeActiveId } : "skip"
  );
  // 🔴 FIX : `userId` requis par la nouvelle signature backend
  const propositionsRaw = useQuery(
    api.propositionsPassage.listPropositions,
    ecoleId && anneeActiveId && user?._id
      ? { ecoleId, anneeId: anneeActiveId, userId: user._id }
      : "skip"
  );

  const annees = anneesRaw ?? [];
  const inscriptions = inscriptionsRaw ?? [];
  const propositions = propositionsRaw ?? [];

  // 🔴 FIX : état de chargement basé sur les références brutes
  const isLoading =
    (ecoleId && anneesRaw === undefined) ||
    (ecoleId && anneeActiveId && inscriptionsRaw === undefined) ||
    (ecoleId && anneeActiveId && propositionsRaw === undefined);

  // Mutations
  const validerProposition = useMutation(api.propositionsPassage.validerProposition);
  const validerPropositionsEnMasse = useMutation(api.propositionsPassage.validerPropositionsEnMasse);
  const toggleConseilDiscipline = useMutation(api.propositionsPassage.toggleConseilDiscipline);
  const notifierEnseignants = useMutation(api.propositionsPassage.notifierEnseignants);
  const setDateLimite = useMutation(api.anneesScolaires.setDateLimitePassage);
  const promouvoirEleves = useMutation(api.inscriptions.promouvoirEleves);

  // État
  const [nouvelleAnneeId, setNouvelleAnneeId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("tous");
  const [sortBy, setSortBy] = useState("nom");
  const [classeFilter, setClasseFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showDateLimite, setShowDateLimite] = useState(false);
  const [savingDate, setSavingDate] = useState(false);

  const classesTriees = useMemo(
    () => [...classes].sort((a, b) => a.nom.localeCompare(b.nom, undefined, { numeric: true })),
    [classes]
  );

  const anneesDestination = useMemo(
    () => annees.filter((a) => a._id !== anneeActiveId),
    [annees, anneeActiveId]
  );

  // 🟡 FIX PERF : Map au lieu de .find() dans les boucles
  const propositionsMap = useMemo(() => {
    const map = new Map();
    propositions.forEach((p) => map.set(p.eleveId, p));
    return map;
  }, [propositions]);

  // Regroupement par classe
  const parClasse = useMemo(() => {
    const map = new Map();
    inscriptions.forEach((insc) => {
      if (!map.has(insc.classe)) map.set(insc.classe, []);
      map.get(insc.classe).push(insc);
    });
    for (const [, eleves] of map.entries()) {
      eleves.sort((a, b) => {
        const nomA = `${a.nom} ${a.postnom} ${a.prenom || ""}`.toLowerCase();
        const nomB = `${b.nom} ${b.postnom} ${b.prenom || ""}`.toLowerCase();
        return nomA.localeCompare(nomB, "fr", { sensitivity: "base" });
      });
    }
    return Array.from(map.entries()).sort((a, b) =>
      a[0].localeCompare(b[0], "fr", { numeric: true, sensitivity: "base" })
    );
  }, [inscriptions]);

  // Filtrage
  const parClasseFiltre = useMemo(() => {
    let base = parClasse;
    if (classeFilter) base = base.filter(([classe]) => classe === classeFilter);

    return base
      .map(([classe, eleves]) => {
        let list = eleves;
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          list = list.filter((insc) =>
            `${insc.nom} ${insc.postnom} ${insc.prenom || ""}`.toLowerCase().includes(q)
          );
        }
        if (filter !== "tous") {
          list = list.filter((insc) => {
            const prop = propositionsMap.get(insc.eleveId);
            if (!prop) return filter === "en_attente";
            const sv = prop.statutValidation || "soumise";
            if (filter === "en_attente") return sv === "soumise";
            if (filter === "validees") return sv === "validee";
            if (filter === "modifiees") return sv === "modifiee";
            if (filter === "rejetees") return sv === "rejetee";
            if (filter === "divergences")
              return prop.statutFinal && prop.statutFinal !== prop.statutPropose;
            if (filter === "conseil") return prop.enConseilDiscipline;
            return true;
          });
        }
        if (sortBy === "statut") {
          list = [...list].sort((a, b) => {
            const pa = propositionsMap.get(a.eleveId);
            const pb = propositionsMap.get(b.eleveId);
            const sa = pa?.statutValidation || "soumise";
            const sb = pb?.statutValidation || "soumise";
            return sa.localeCompare(sb);
          });
        }
        return [classe, list];
      })
      .filter(([, eleves]) => eleves.length > 0);
  }, [parClasse, classeFilter, searchTerm, filter, propositionsMap, sortBy]);

  // Stats (filtrées par classe si actif)
  const inscriptionsFiltrees = useMemo(() => {
    if (!classeFilter) return inscriptions;
    return inscriptions.filter((insc) => insc.classe === classeFilter);
  }, [inscriptions, classeFilter]);

  const propositionsFiltrees = useMemo(() => {
    if (!classeFilter) return propositions;
    const eleveIdsClasse = new Set(inscriptionsFiltrees.map((i) => i.eleveId));
    return propositions.filter((p) => eleveIdsClasse.has(p.eleveId));
  }, [propositions, inscriptionsFiltrees, classeFilter]);

  const nbTotal = inscriptionsFiltrees.length;
  const nbPropositions = propositionsFiltrees.length;
  const nbSoumises = propositionsFiltrees.filter((p) => !p.statutValidation || p.statutValidation === "soumise").length;
  const nbValidees = propositionsFiltrees.filter((p) => p.statutValidation === "validee").length;
  const nbModifiees = propositionsFiltrees.filter((p) => p.statutValidation === "modifiee").length;
  const nbRejetees = propositionsFiltrees.filter((p) => p.statutValidation === "rejetee").length;
  const nbDivergences = propositionsFiltrees.filter(
    (p) => p.statutFinal && p.statutFinal !== p.statutPropose
  ).length;
  const nbConseil = propositionsFiltrees.filter((p) => p.enConseilDiscipline).length;
  const preteACloturer = nbTotal > 0 && nbSoumises === 0 && nbRejetees === 0;

  const activeFiltersCount = useMemo(() => {
    let n = 0;
    if (searchTerm.trim()) n++;
    if (filter !== "tous") n++;
    if (sortBy !== "nom") n++;
    if (classeFilter) n++;
    return n;
  }, [searchTerm, filter, sortBy, classeFilter]);

  // Date limite
  const dateLimite = anneeActive?.dateLimitePassage;
  const joursRestants = daysUntil(dateLimite);

  // ── Handlers ───────────────────────────────────────────────
  const handleValider = async (propositionId, data) => {
    try {
      const result = await validerProposition({
        propositionId,
        statutFinal: data.statutFinal,
        classeDestinationFinale: data.classeDestinationFinale,
        commentaireDirecteur: data.commentaireDirecteur,
        userId: user._id,
      });
      toast.success(result.isDivergence ? "Décision modifiée" : "Proposition validée");
    } catch (err) {
      console.error("[AssistantPassage] valider failed:", err);
      toast.error("Impossible de valider la proposition");
    }
  };

  const handleToggleConseil = async (propositionId, value) => {
    try {
      await toggleConseilDiscipline({ propositionId, enConseil: value, userId: user._id });
    } catch (err) {
      console.error("[AssistantPassage] toggleConseil failed:", err);
      toast.error("Impossible de modifier le conseil de discipline");
    }
  };

  const handleAccepterTout = async () => {
    if (!classeFilter) {
      toast.error("Sélectionnez d'abord une classe pour valider en masse.");
      return;
    }
    if (nbSoumises === 0) {
      toast.info("Aucune proposition en attente.");
      return;
    }
    const ok = await confirm(
      "Accepter toutes les propositions",
      `Valider toutes les propositions en attente pour la classe ${classeFilter} ? (${nbSoumises})`
    );
    if (!ok) return;
    setSubmitting(true);
    try {
      const result = await validerPropositionsEnMasse({
        ecoleId,
        anneeId: anneeActiveId,
        classe: classeFilter,
        userId: user._id,
      });
      toast.success(`${result.count} proposition(s) validée(s).`);
      if (result.skipped?.length > 0) {
        toast.info(`${result.skipped.length} ignorée(s) (déjà traitées).`);
      }
    } catch (err) {
      console.error("[AssistantPassage] bulk validate failed:", err);
      toast.error("Impossible de valider en masse");
    } finally {
      setSubmitting(false);
    }
  };

  const handleNotifier = async () => {
    if (!classeFilter) {
      toast.error("Sélectionnez d'abord une classe.");
      return;
    }
    const ok = await confirm(
      "Notifier les enseignants",
      `Envoyer une notification aux enseignants de la classe ${classeFilter} ?`
    );
    if (!ok) return;
    setSubmitting(true);
    try {
      const result = await notifierEnseignants({
        ecoleId,
        anneeId: anneeActiveId,
        classe: classeFilter,
        userId: user._id,
      });
      toast.success(`${result.count} enseignant(s) notifié(s).`);
    } catch (err) {
      console.error("[AssistantPassage] notify failed:", err);
      toast.error("Impossible d'envoyer la notification");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveDateLimite = async (date) => {
    setSavingDate(true);
    try {
      await setDateLimite({
        anneeId: anneeActiveId,
        dateLimite: date,
        userId: user._id,
      });
      toast.success(date ? "Date limite enregistrée" : "Date limite retirée");
      setShowDateLimite(false);
    } catch (err) {
      console.error("[AssistantPassage] saveDateLimite failed:", err);
      toast.error("Impossible d'enregistrer la date limite");
    } finally {
      setSavingDate(false);
    }
  };

  const handleCloturerPassage = async () => {
    if (!nouvelleAnneeId) {
      toast.error("Choisissez une année de destination.");
      return;
    }
    if (!classeFilter) {
      toast.error("Sélectionnez une classe.");
      return;
    }
    if (!preteACloturer) {
      toast.error("Toutes les propositions doivent être validées ou rejetées.");
      return;
    }
    const ok = await confirm(
      "Clôturer le passage",
      `Appliquer les décisions définitives pour la classe ${classeFilter} ?`
    );
    if (!ok) return;

    const elevesACloturer = inscriptionsFiltrees;
    const decisionsArray = elevesACloturer.map((insc) => {
      const prop = propositionsMap.get(insc.eleveId);
      return {
        eleveId: insc.eleveId,
        statut: prop?.statutFinal || prop?.statutPropose || "passant",
        classeDestination: prop?.classeDestinationFinale || prop?.classeDestinationPropose,
      };
    });

    setSubmitting(true);
    try {
      await promouvoirEleves({
        ecoleId,
        anneeActuelleId: anneeActiveId,
        nouvelleAnneeId,
        decisions: decisionsArray,
        userId: user._id,
      });
      toast.success("Passage clôturé et élèves promus.");
    } catch (err) {
      console.error("[AssistantPassage] cloturer failed:", err);
      toast.error("Impossible de clôturer le passage");
    } finally {
      setSubmitting(false);
    }
  };

  const resetFilters = () => {
    setSearchTerm("");
    setFilter("tous");
    setSortBy("nom");
    setClasseFilter("");
  };

  // Couleurs
  const colors = {
    textPrimary: dark ? "#F1F5F9" : "#1E293B",
    textSecondary: dark ? "#94A3B8" : "#64748B",
    cardBg: dark ? "#1E293B" : "#FFFFFF",
    cardBorder: dark ? "#334155" : "#E2E8F0",
    selectBg: dark ? "#0F172A" : "#F9FAFB",
    selectText: dark ? "#F1F5F9" : "#1E293B",
    accent: dark ? "#818CF8" : "#4F46E5",
    danger: dark ? "#F87171" : "#EF4444",
    success: dark ? "#34D399" : "#10B981",
    warning: dark ? "#FBBF24" : "#F59E0B",
    warningBg: dark ? "#78350F" : "#FEF3C7",
    warningText: dark ? "#FBBF24" : "#92400E",
  };

  if (!anneeActiveId) {
    return (
      <div style={{ textAlign: "center", padding: 40, color: colors.textSecondary }}>
        Aucune année active.
      </div>
    );
  }

  // 🔴 FIX : loader basé sur la bonne variable
  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 300 }}>
        <Loader size={32} className="ap-spin" style={{ color: colors.accent }} />
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: 1000,
        margin: "0 auto",
        padding: isMobile ? "10px 8px 120px" : "20px 16px 60px",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <style>{`
        @keyframes ap-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .ap-spin { animation: ap-spin 1s linear infinite; }
        @keyframes ap-slide-up-bar { from { transform: translateY(100%); } to { transform: translateY(0); } }
      `}</style>

      {/* En-tête */}
      <div style={{ marginBottom: isMobile ? 12 : 20 }}>
        <h2 style={{ fontSize: isMobile ? 17 : 22, fontWeight: 700, color: colors.textPrimary, margin: 0, lineHeight: 1.2 }}>
          Assistant de passage
        </h2>
        <p style={{ color: colors.textSecondary, marginTop: 2, marginBottom: 0, fontSize: isMobile ? 11.5 : 13 }}>
          {classeFilter ? `${classeFilter} · ` : ""}
          {nbTotal} élève{nbTotal > 1 ? "s" : ""} · {nbSoumises} en attente
          {nbDivergences > 0 ? ` · ${nbDivergences} divergence${nbDivergences > 1 ? "s" : ""}` : ""}
        </p>
      </div>

      {/* Bandeau date limite */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 14px",
        marginBottom: isMobile ? 12 : 16,
        background: dateLimite
          ? (joursRestants !== null && joursRestants < 0
            ? (dark ? "#7F1D1D40" : "#FEE2E2")
            : joursRestants !== null && joursRestants <= 3
            ? (dark ? "#78350F40" : "#FEF3C7")
            : (dark ? "#0F172A" : "#F8FAFC"))
          : (dark ? "#0F172A" : "#F8FAFC"),
        border: `1px solid ${colors.cardBorder}`,
        borderRadius: 12,
        flexWrap: "wrap",
      }}>
        <CalendarClock size={16} color={colors.accent} />
        <div style={{ flex: 1, minWidth: 0, fontSize: 12, color: colors.textPrimary }}>
          {dateLimite ? (
            <>
              <strong>Date limite :</strong> {formatDateFR(dateLimite)}
              {joursRestants !== null && (
                <span style={{
                  marginLeft: 8,
                  color: joursRestants < 0 ? colors.danger : joursRestants <= 3 ? colors.warning : colors.textSecondary,
                  fontWeight: 700,
                }}>
                  {joursRestants < 0
                    ? `(dépassée de ${Math.abs(joursRestants)} j)`
                    : joursRestants === 0
                    ? "(aujourd'hui)"
                    : `(dans ${joursRestants} j)`}
                </span>
              )}
            </>
          ) : (
            <span style={{ color: colors.textSecondary }}>Aucune date limite définie</span>
          )}
        </div>
        <button
          onClick={() => setShowDateLimite(true)}
          style={{
            padding: "6px 12px",
            borderRadius: 8,
            border: `1px solid ${colors.cardBorder}`,
            background: "transparent",
            color: colors.accent,
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {dateLimite ? "Modifier" : "Définir"}
        </button>
      </div>

      {/* Stats */}
      <div style={{
        display: isMobile ? "flex" : "grid",
        gridTemplateColumns: isMobile ? undefined : "repeat(auto-fit, minmax(150px, 1fr))",
        gap: isMobile ? 8 : 12,
        marginBottom: isMobile ? 12 : 18,
        overflowX: isMobile ? "auto" : "visible",
        paddingBottom: isMobile ? 4 : 0,
        WebkitOverflowScrolling: "touch",
        scrollbarWidth: "none",
      }}>
        <StatCard icon={<Users size={16} />} label="Élèves" value={nbTotal} color="#4F46E5" dark={dark} isMobile={isMobile} />
        <StatCard icon={<Clock size={16} />} label="En attente" value={nbSoumises} color="#F59E0B" dark={dark} isMobile={isMobile} />
        <StatCard icon={<CheckCircle2 size={16} />} label="Validées" value={nbValidees} color="#10B981" dark={dark} isMobile={isMobile} />
        <StatCard icon={<Pencil size={16} />} label="Modifiées" value={nbModifiees} color="#8B5CF6" dark={dark} isMobile={isMobile} />
        <StatCard icon={<AlertTriangle size={16} />} label="Divergences" value={nbDivergences} color="#EF4444" dark={dark} isMobile={isMobile} />
        <StatCard icon={<Gavel size={16} />} label="Conseil" value={nbConseil} color="#6366F1" dark={dark} isMobile={isMobile} />
      </div>

      {/* Barre outils */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "stretch", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: isMobile ? 200 : 300 }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: colors.textSecondary }} />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher un élève…"
            style={{
              width: "100%", padding: "12px 12px 12px 38px",
              borderRadius: 12, border: `1px solid ${colors.cardBorder}`,
              background: colors.cardBg, color: colors.textPrimary,
              fontSize: 16, outline: "none", boxSizing: "border-box",
            }}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: colors.textSecondary, display: "flex" }}>
              <X size={16} />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(true)}
          style={{
            padding: "0 14px", borderRadius: 12,
            border: `1px solid ${activeFiltersCount > 0 ? colors.accent : colors.cardBorder}`,
            background: activeFiltersCount > 0 ? (dark ? "#312E81" : "#EEF2FF") : colors.cardBg,
            color: activeFiltersCount > 0 ? (dark ? "#C7D2FE" : "#4F46E5") : colors.textPrimary,
            cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
            fontWeight: 600, fontSize: 13,
          }}
        >
          <SlidersHorizontal size={16} />
          {activeFiltersCount > 0 && (
            <span style={{ background: colors.accent, color: "#FFF", borderRadius: 10, padding: "1px 6px", fontSize: 10, fontWeight: 700 }}>
              {activeFiltersCount}
            </span>
          )}
        </button>
      </div>

      {/* Actions groupées (si classe filtrée) */}
      {classeFilter && nbPropositions > 0 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          {nbSoumises > 0 && (
            <button
              onClick={handleAccepterTout}
              disabled={submitting}
              style={{
                flex: 1, minWidth: 200,
                padding: "10px 14px", borderRadius: 10,
                background: colors.accent, color: "#FFF",
                border: "none", cursor: submitting ? "not-allowed" : "pointer",
                fontWeight: 700, fontSize: 13,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                opacity: submitting ? 0.6 : 1,
              }}
            >
              <CheckCircle2 size={14} />
              Accepter les {nbSoumises} en attente
            </button>
          )}
          {preteACloturer && (
            <button
              onClick={handleNotifier}
              disabled={submitting}
              style={{
                flex: 1, minWidth: 200,
                padding: "10px 14px", borderRadius: 10,
                background: "transparent", color: colors.accent,
                border: `1px solid ${colors.accent}`,
                cursor: submitting ? "not-allowed" : "pointer",
                fontWeight: 700, fontSize: 13,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                opacity: submitting ? 0.6 : 1,
              }}
            >
              <Bell size={14} />
              Notifier les enseignants
            </button>
          )}
        </div>
      )}

      {/* Puces filtres actifs */}
      {activeFiltersCount > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
          {classeFilter && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", background: dark ? "#312E81" : "#EEF2FF", color: dark ? "#C7D2FE" : "#4F46E5", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
              <School size={11} /> {classeFilter}
              <X size={12} style={{ cursor: "pointer" }} onClick={() => setClasseFilter("")} />
            </span>
          )}
          {filter !== "tous" && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", background: dark ? "#312E81" : "#EEF2FF", color: dark ? "#C7D2FE" : "#4F46E5", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
              {filter === "en_attente" ? "En attente"
                : filter === "validees" ? "Validées"
                : filter === "modifiees" ? "Modifiées"
                : filter === "rejetees" ? "Rejetées"
                : filter === "divergences" ? "Divergences"
                : "Conseil"}
              <X size={12} style={{ cursor: "pointer" }} onClick={() => setFilter("tous")} />
            </span>
          )}
          <button onClick={resetFilters} style={{ padding: "4px 10px", background: "transparent", border: `1px solid ${colors.cardBorder}`, color: colors.textSecondary, borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
            Tout effacer
          </button>
        </div>
      )}

      {/* Liste */}
      {parClasseFiltre.length === 0 ? (
        <div style={{ textAlign: "center", padding: isMobile ? 32 : 60, color: colors.textSecondary }}>
          <Users size={isMobile ? 40 : 56} style={{ marginBottom: 12, opacity: 0.5 }} />
          <p style={{ margin: 0, fontSize: isMobile ? 13 : 15 }}>
            Aucun élève ne correspond aux critères.
          </p>
          {activeFiltersCount > 0 && (
            <button onClick={resetFilters} style={{ marginTop: 12, padding: "8px 16px", borderRadius: 8, border: `1px solid ${colors.cardBorder}`, background: "transparent", color: colors.textPrimary, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
              Réinitialiser les filtres
            </button>
          )}
        </div>
      ) : (
        parClasseFiltre.map(([classe, eleves]) => (
          <div key={classe} style={{ marginBottom: isMobile ? 18 : 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: isMobile ? 8 : 10 }}>
              <div style={{ width: 6, height: 20, borderRadius: 3, background: colors.accent }} />
              <h3 style={{ fontSize: isMobile ? 14 : 16, fontWeight: 700, color: colors.textPrimary, margin: 0 }}>
                {classe}
              </h3>
              <span style={{ background: dark ? "#334155" : "#F1F5F9", color: colors.textSecondary, padding: "1px 8px", borderRadius: 10, fontSize: 11, fontWeight: 700 }}>
                {eleves.length}
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(360px, 1fr))", gap: isMobile ? 8 : 10 }}>
              {eleves.map((insc) => {
                const prop = propositionsMap.get(insc.eleveId);
                if (!prop) {
                  return (
                    <div
                      key={insc._id}
                      style={{
                        background: colors.cardBg,
                        borderRadius: 12,
                        padding: isMobile ? "10px 12px" : "12px 14px",
                        border: `1px dashed ${colors.cardBorder}`,
                        opacity: 0.6,
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: isMobile ? 13.5 : 14, color: colors.textPrimary }}>
                        {insc.nom} {insc.postnom} {insc.prenom}
                      </div>
                      <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                        {insc.code || "Pas de matricule"}
                      </div>
                      <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 6, fontStyle: "italic" }}>
                        Aucune proposition de l'enseignant
                      </div>
                    </div>
                  );
                }
                return (
                  <EleveCard
                    key={insc._id}
                    insc={insc}
                    proposition={prop}
                    classesTriees={classesTriees}
                    onValider={(data) => handleValider(prop._id, data)}
                    onToggleConseil={(v) => handleToggleConseil(prop._id, v)}
                    colors={colors}
                    dark={dark}
                    isMobile={isMobile}
                  />
                );
              })}
            </div>
          </div>
        ))
      )}

      {/* Barre flottante : clôturer */}
      {classeFilter && nbPropositions > 0 && (
        <div
          style={{
            position: "fixed", bottom: 0, left: 0, right: 0,
            background: colors.cardBg,
            borderTop: `1px solid ${colors.cardBorder}`,
            padding: isMobile ? "10px 14px calc(10px + env(safe-area-inset-bottom))" : "12px 24px",
            display: "flex", alignItems: "center", gap: 10,
            zIndex: 950,
            boxShadow: "0 -4px 20px rgba(0,0,0,0.15)",
            animation: "ap-slide-up-bar 0.2s ease-out",
          }}
        >
          <div style={{ flex: 1, minWidth: 0, fontSize: 11.5, color: colors.textSecondary }}>
            {preteACloturer ? (
              <span style={{ color: colors.success, fontWeight: 600 }}>
                ✓ Prêt à clôturer le passage
              </span>
            ) : (
              <span>
                {nbSoumises > 0 && `${nbSoumises} en attente`}
                {nbSoumises > 0 && nbRejetees > 0 && " · "}
                {nbRejetees > 0 && `${nbRejetees} rejetée${nbRejetees > 1 ? "s" : ""}`}
              </span>
            )}
          </div>

          <select
            value={nouvelleAnneeId}
            onChange={(e) => setNouvelleAnneeId(e.target.value)}
            style={{
              padding: "8px 10px", borderRadius: 10,
              border: `1px solid ${colors.cardBorder}`,
              background: colors.selectBg, color: colors.selectText,
              fontSize: 12, outline: "none", maxWidth: isMobile ? 120 : 180,
            }}
          >
            <option value="">Année dest.</option>
            {anneesDestination.map((a) => (
              <option key={a._id} value={a._id}>{a.nom}</option>
            ))}
          </select>

          <button
            onClick={handleCloturerPassage}
            disabled={submitting || !nouvelleAnneeId || !preteACloturer}
            style={{
              padding: isMobile ? "10px 14px" : "10px 20px",
              background: submitting || !nouvelleAnneeId || !preteACloturer
                ? (dark ? "#334155" : "#E2E8F0")
                : colors.accent,
              color: submitting || !nouvelleAnneeId || !preteACloturer
                ? (dark ? "#64748B" : "#94A3B8")
                : "#FFFFFF",
              border: "none", borderRadius: 10,
              fontWeight: 700, fontSize: 13,
              cursor: submitting || !nouvelleAnneeId || !preteACloturer ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", gap: 6,
              whiteSpace: "nowrap",
            }}
          >
            {submitting ? <Loader size={14} className="ap-spin" /> : <ArrowRight size={14} />}
            Clôturer
          </button>
        </div>
      )}

      {/* Modales */}
      <FiltersSheet
        open={showFilters}
        onClose={() => setShowFilters(false)}
        dark={dark}
        classeFilter={classeFilter}
        setClasseFilter={setClasseFilter}
        classesDisponibles={classesTriees}
        filter={filter}
        setFilter={setFilter}
        sortBy={sortBy}
        setSortBy={setSortBy}
        onReset={resetFilters}
      />

      <DateLimiteModal
        open={showDateLimite}
        onClose={() => setShowDateLimite(false)}
        currentDate={dateLimite}
        onSave={handleSaveDateLimite}
        saving={savingDate}
        dark={dark}
        isMobile={isMobile}
      />

      <ConfirmDialog {...dialogProps} />
    </div>
  );
}