import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useConfirm } from "@/hooks/useConfirm";
import { ConfirmDialog } from "./ConfirmDialog";
import {
  Calendar, Clock, MapPin, BookOpen, Plus, Trash2, Edit2,
  Save, School, X, Award, AlertCircle, Loader,
} from "lucide-react";
import toast from "react-hot-toast";

function extractErrMsg(err, fallback = "Erreur inconnue") {
  if (!err) return fallback;
  if (typeof err === "string") return err;
  if (typeof err === "object" && err.message) return err.message;
  return fallback;
}

// ============================================================
// FORMATAGE DE DATE
// ============================================================
function formatDateLabel(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const check = new Date(d);
  check.setHours(0, 0, 0, 0);

  if (check.getTime() === today.getTime()) return "Aujourd'hui";
  if (check.getTime() === tomorrow.getTime()) return "Demain";

  const diffDays = Math.round((check - today) / (1000 * 60 * 60 * 24));
  if (diffDays > 0 && diffDays < 7) {
    return d.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
    });
  }
  return d.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ============================================================
// MODALE FORMULAIRE EXAMEN
// ============================================================
function ExamenFormModal({
  open,
  onClose,
  editExam,
  classeSelectionnee,
  onSubmit,
  saving,
  dark,
  isMobile,
}) {
  const [formData, setFormData] = useState({
    matiere: "",
    date: "",
    heure: "",
    duree: "",
    salle: "",
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      if (editExam) {
        setFormData({
          matiere: editExam.matiere || "",
          date: editExam.date || "",
          heure: editExam.heure || "",
          duree: editExam.duree || "",
          salle: editExam.salle || "",
        });
      } else {
        setFormData({
          matiere: "",
          date: "",
          heure: "",
          duree: "",
          salle: "",
        });
      }
      setErrors({});
    }
  }, [open, editExam]);

  if (!open) return null;

  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const inputBg = dark ? "#0F172A" : "#F8FAFC";
  const inputText = dark ? "#F1F5F9" : "#1E293B";
  const accent = dark ? "#818CF8" : "#4F46E5";
  const danger = "#EF4444";

  const validate = () => {
    const err = {};
    if (!formData.matiere.trim()) err.matiere = "Requis";
    if (!formData.date) err.date = "Requis";
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (!validate()) return;
    await onSubmit({
      ...formData,
      matiere: formData.matiere.trim(),
    });
  };

  const inputStyle = (field) => ({
    width: "100%",
    padding: isMobile ? "12px 14px" : "11px 14px",
    border: `1px solid ${field && errors[field] ? danger : cardBorder}`,
    borderRadius: 10,
    fontSize: isMobile ? 15 : 14,
    outline: "none",
    background: inputBg,
    color: inputText,
    boxSizing: "border-box",
    fontFamily: "inherit",
    appearance: "none",
    WebkitAppearance: "none",
  });

  const labelStyle = {
    display: "block",
    marginBottom: 5,
    fontWeight: 700,
    fontSize: 11,
    color: dark ? "#CBD5E1" : "#374151",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  };

  const gridColumns = isMobile ? "1fr" : "1fr 1fr";

  const content = (
    <>
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
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: dark ? "#312E81" : "#EEF2FF",
              color: accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Award size={16} />
          </div>
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: isMobile ? 16 : 17,
                fontWeight: 700,
                color: textPrimary,
              }}
            >
              {editExam ? "Modifier l'examen" : "Nouvel examen"}
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: 11,
                color: textSecondary,
                marginTop: 1,
              }}
            >
              Classe {classeSelectionnee}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: textSecondary,
            padding: 4,
          }}
          aria-label="Fermer"
        >
          <X size={22} />
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>
            Matière <span style={{ color: danger }}>*</span>
          </label>
          <input
            value={formData.matiere}
            onChange={(e) =>
              setFormData({ ...formData, matiere: e.target.value })
            }
            placeholder="Ex : Mathématiques"
            style={inputStyle("matiere")}
          />
          {errors.matiere && (
            <div
              style={{
                color: danger,
                fontSize: 11,
                marginTop: 4,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <AlertCircle size={11} />
              {errors.matiere}
            </div>
          )}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: gridColumns,
            gap: 12,
            marginBottom: 12,
          }}
        >
          <div>
            <label style={labelStyle}>
              Date <span style={{ color: danger }}>*</span>
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) =>
                setFormData({ ...formData, date: e.target.value })
              }
              style={inputStyle("date")}
            />
            {errors.date && (
              <div
                style={{
                  color: danger,
                  fontSize: 11,
                  marginTop: 4,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <AlertCircle size={11} />
                {errors.date}
              </div>
            )}
          </div>
          <div>
            <label style={labelStyle}>Heure</label>
            <input
              type="time"
              value={formData.heure}
              onChange={(e) =>
                setFormData({ ...formData, heure: e.target.value })
              }
              style={inputStyle("")}
            />
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: gridColumns,
            gap: 12,
            marginBottom: 20,
          }}
        >
          <div>
            <label style={labelStyle}>Durée</label>
            <input
              type="text"
              placeholder="Ex : 2h"
              value={formData.duree}
              onChange={(e) =>
                setFormData({ ...formData, duree: e.target.value })
              }
              style={inputStyle("")}
            />
          </div>
          <div>
            <label style={labelStyle}>Salle</label>
            <input
              type="text"
              placeholder="Ex : Salle 12"
              value={formData.salle}
              onChange={(e) =>
                setFormData({ ...formData, salle: e.target.value })
              }
              style={inputStyle("")}
            />
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            flexDirection: isMobile ? "column" : "row",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: isMobile ? "none" : 1,
              padding: "12px 16px",
              borderRadius: 12,
              border: `1px solid ${cardBorder}`,
              background: "transparent",
              color: dark ? "#CBD5E1" : "#475569",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
              order: isMobile ? 2 : 1,
            }}
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving}
            style={{
              flex: isMobile ? "none" : 2,
              padding: "12px 16px",
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
              order: isMobile ? 1 : 2,
            }}
          >
            {saving ? (
              <Loader size={14} className="gem-spin" />
            ) : (
              <Save size={14} />
            )}
            {saving
              ? "Enregistrement…"
              : editExam
              ? "Mettre à jour"
              : "Ajouter l'examen"}
          </button>
        </div>
      </form>
    </>
  );

  if (isMobile) {
    return (
      <>
        <div
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 1200,
            animation: "gem-fade-in 0.18s ease-out",
          }}
        />
        <div
          className="gem-slide-up"
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 0,
            background: cardBg,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: "12px 16px 24px",
            zIndex: 1201,
            maxHeight: "92vh",
            overflowY: "auto",
            boxShadow: "0 -8px 30px rgba(0,0,0,0.25)",
            animation: "gem-slide-up 0.25s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          {content}
        </div>
      </>
    );
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1200,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: cardBg,
          borderRadius: 16,
          padding: 24,
          width: "100%",
          maxWidth: 520,
          boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
          border: `1px solid ${cardBorder}`,
        }}
      >
        {content}
      </div>
    </div>
  );
}

// ============================================================
// CARTE EXAMEN
// ============================================================
function ExamenCard({ exam, dark, isMobile, onEdit, onDelete }) {
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const accent = dark ? "#818CF8" : "#4F46E5";
  const accentBg = dark ? "#312E81" : "#EEF2FF";
  const shadow = dark
    ? "0 1px 2px rgba(0,0,0,0.25)"
    : "0 1px 2px rgba(0,0,0,0.04)";

  // ✅ Détails avec clés stables
  const details = [];
  if (exam.duree) details.push({ key: "duree", text: exam.duree });
  if (exam.salle)
    details.push({ key: "salle", icon: <MapPin size={11} />, text: exam.salle });

  return (
    <div
      style={{
        background: cardBg,
        borderRadius: 12,
        padding: isMobile ? "10px 12px" : "12px 14px",
        boxShadow: shadow,
        border: `1px solid ${cardBorder}`,
        display: "flex",
        alignItems: "center",
        gap: isMobile ? 10 : 12,
        minWidth: 0,
      }}
    >
      <div
        style={{
          background: exam.heure ? accentBg : dark ? "#334155" : "#F1F5F9",
          color: exam.heure ? accent : textSecondary,
          borderRadius: 10,
          padding: isMobile ? "8px 10px" : "10px 12px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minWidth: isMobile ? 60 : 72,
          flexShrink: 0,
        }}
      >
        {exam.heure ? (
          <>
            <Clock
              size={isMobile ? 11 : 12}
              style={{ marginBottom: 2, opacity: 0.7 }}
            />
            <div
              style={{
                fontSize: isMobile ? 12 : 13,
                fontWeight: 700,
                lineHeight: 1,
                whiteSpace: "nowrap",
              }}
            >
              {exam.heure}
            </div>
          </>
        ) : (
          <>
            <Clock size={isMobile ? 11 : 12} style={{ opacity: 0.5 }} />
            <div
              style={{
                fontSize: 9.5,
                fontWeight: 600,
                marginTop: 2,
                opacity: 0.7,
              }}
            >
              —
            </div>
          </>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: isMobile ? 13.5 : 14,
            fontWeight: 600,
            color: textPrimary,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <BookOpen size={13} color={accent} style={{ flexShrink: 0 }} />
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {exam.matiere}
          </span>
        </div>

        {details.length > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 4,
              flexWrap: "wrap",
              fontSize: isMobile ? 11 : 11.5,
              color: textSecondary,
            }}
          >
            {details.map((d) => (
              <span
                key={d.key}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 3,
                }}
              >
                {d.icon}
                {d.text}
              </span>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
        <button
          onClick={onEdit}
          title="Modifier"
          aria-label="Modifier"
          style={{
            background: "transparent",
            border: `1px solid ${cardBorder}`,
            borderRadius: 8,
            padding: isMobile ? 8 : 6,
            color: accent,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Edit2 size={14} />
        </button>
        <button
          onClick={onDelete}
          title="Supprimer"
          aria-label="Supprimer"
          style={{
            background: "transparent",
            border: `1px solid ${cardBorder}`,
            borderRadius: 8,
            padding: isMobile ? 8 : 6,
            color: "#EF4444",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================
export function GestionExamens({
  ecoleId,
  classes,
  user,
  anneeId,
  anneeActive,
}) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();
  const { confirm, dialogProps } = useConfirm();

  // ✅ CRITIQUE : les useState DOIVENT être déclarés AVANT toute utilisation
  // de leurs valeurs (sinon → TDZ "Cannot access before initialization")
  const [classeSelectionnee, setClasseSelectionnee] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editExam, setEditExam] = useState(null);
  const [saving, setSaving] = useState(false);

  const userId = user?._id;
  const canQueryExamens = Boolean(
    classeSelectionnee && ecoleId && anneeId && userId
  );

  // ✅ userId ajouté
  const examensRaw = useQuery(
    api.examens.listByClasse,
    canQueryExamens
      ? { ecoleId, anneeId, classe: classeSelectionnee, userId }
      : "skip"
  );

  const addExamen = useMutation(api.examens.add);
  const updateExamen = useMutation(api.examens.update);
  const removeExamen = useMutation(api.examens.remove);

  const examens = useMemo(() => examensRaw ?? [], [examensRaw]);

  // Couleurs
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const inputBg = dark ? "#0F172A" : "#F8FAFC";
  const inputText = dark ? "#F1F5F9" : "#1E293B";
  const accent = dark ? "#818CF8" : "#4F46E5";
  const accentBg = dark ? "#312E81" : "#EEF2FF";
  const shadow = dark
    ? "0 1px 3px rgba(0,0,0,0.3)"
    : "0 1px 3px rgba(0,0,0,0.05)";

  // Regroupement par date
  const groupes = useMemo(() => {
    const acc = {};
    examens.forEach((exam) => {
      const jour = exam.date;
      if (!acc[jour]) acc[jour] = [];
      acc[jour].push(exam);
    });
    Object.keys(acc).forEach((jour) => {
      acc[jour].sort((a, b) =>
        (a.heure || "99:99").localeCompare(b.heure || "99:99")
      );
    });
    return acc;
  }, [examens]);

  const datesTriees = useMemo(
    () => Object.keys(groupes).sort((a, b) => a.localeCompare(b)),
    [groupes]
  );

  // Handlers
  const handleOpenAdd = () => {
    setEditExam(null);
    setShowModal(true);
  };

  const handleOpenEdit = (exam) => {
    setEditExam(exam);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditExam(null);
  };

  // ============================================================
  // SUBMIT — séparation stricte ADD vs UPDATE
  // ============================================================
  const handleSubmit = useCallback(
    async (data) => {
      if (saving) return;
      if (!userId) {
        toast.error("Session invalide.");
        return;
      }
      setSaving(true);
      try {
        if (editExam) {
          // ✅ UPDATE : uniquement les champs modifiables
          await updateExamen({
            examenId: editExam._id,
            matiere: data.matiere,
            date: data.date,
            heure: data.heure || undefined,
            duree: data.duree || undefined,
            salle: data.salle || undefined,
            userId,
          });
          toast.success("Examen modifié");
        } else {
          // ✅ ADD : tous les champs requis + contexte
          await addExamen({
            classe: classeSelectionnee,
            matiere: data.matiere,
            date: data.date,
            heure: data.heure || undefined,
            duree: data.duree || undefined,
            salle: data.salle || undefined,
            ecoleId,
            anneeId,
            userId,
          });
          toast.success("Examen ajouté");
        }
        handleCloseModal();
      } catch (err) {
        toast.error(
          editExam
            ? extractErrMsg(err, "Impossible de modifier l'examen")
            : extractErrMsg(err, "Impossible d'ajouter l'examen")
        );
      } finally {
        setSaving(false);
      }
    },
    [
      saving,
      userId,
      editExam,
      classeSelectionnee,
      ecoleId,
      anneeId,
      addExamen,
      updateExamen,
    ]
  );

  // ============================================================
  // DELETE
  // ============================================================
  const handleDelete = useCallback(
    async (exam) => {
      if (!userId) {
        toast.error("Session invalide.");
        return;
      }
      const ok = await confirm(
        "Supprimer l'examen",
        `Supprimer l'examen de ${exam.matiere} ?`
      );
      if (!ok) return;
      try {
        await removeExamen({ examenId: exam._id, userId });
        toast.success("Examen supprimé");
      } catch (err) {
        toast.error(extractErrMsg(err, "Impossible de supprimer l'examen"));
      }
    },
    [userId, confirm, removeExamen]
  );

  // ============================================================
  // GARDE : session invalide
  // ============================================================
  if (!user || !userId) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          padding: 40,
        }}
      >
        <style>{`
          @keyframes gem-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          .gem-spin { animation: gem-spin 1s linear infinite; }
          @media (prefers-reduced-motion: reduce) {
            .gem-spin { animation: none !important; }
          }
        `}</style>
        <Loader size={28} className="gem-spin" style={{ color: accent }} />
      </div>
    );
  }

  // ============================================================
  // RENDU PRINCIPAL
  // ============================================================
  return (
    <div
      style={{
        maxWidth: 900,
        margin: "0 auto",
        padding: isMobile ? "10px 8px 90px" : "20px 16px 40px",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* Keyframes préfixés gem-* (définis UNE SEULE fois ici) */}
      <style>{`
        @keyframes gem-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .gem-spin { animation: gem-spin 1s linear infinite; }
        @keyframes gem-slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes gem-fade-in { from { opacity: 0; } to { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) {
          .gem-spin, .gem-slide-up {
            animation: none !important;
          }
        }
      `}</style>

      {/* En-tête */}
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
              fontSize: isMobile ? 17 : 22,
              fontWeight: 700,
              color: textPrimary,
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            Examens
          </h2>
          <p
            style={{
              color: textSecondary,
              marginTop: 2,
              marginBottom: 0,
              fontSize: isMobile ? 11.5 : 13,
            }}
          >
            {classeSelectionnee
              ? `${classeSelectionnee} · ${examens.length} examen${
                  examens.length > 1 ? "s" : ""
                }`
              : "Planifiez les compositions par classe"}
            {anneeActive ? ` · ${anneeActive.nom}` : ""}
          </p>
        </div>
      </div>

      {/* Sélecteur de classe */}
      <div
        style={{
          background: cardBg,
          border: `1px solid ${cardBorder}`,
          borderRadius: 14,
          padding: isMobile ? 12 : 14,
          marginBottom: isMobile ? 12 : 16,
          boxShadow: shadow,
          display: "flex",
          gap: 10,
          flexDirection: isMobile ? "column" : "row",
          alignItems: isMobile ? "stretch" : "center",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flex: 1,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: accentBg,
              color: accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <School size={16} />
          </div>
          <select
            value={classeSelectionnee}
            onChange={(e) => {
              setClasseSelectionnee(e.target.value);
              setShowModal(false);
              setEditExam(null);
            }}
            style={{
              flex: 1,
              padding: isMobile ? "10px 12px" : "9px 12px",
              border: `1px solid ${cardBorder}`,
              borderRadius: 10,
              fontSize: isMobile ? 15 : 14,
              outline: "none",
              background: inputBg,
              color: inputText,
              cursor: "pointer",
              fontFamily: "inherit",
              appearance: "none",
              WebkitAppearance: "none",
            }}
          >
            <option value="">-- Choisir une classe --</option>
            {classes.map((c) => (
              <option key={c._id} value={c.nom}>
                {c.nom}
              </option>
            ))}
          </select>
        </div>

        {classeSelectionnee && !isMobile && (
          <button
            onClick={handleOpenAdd}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: "9px 16px",
              background: accent,
              color: "white",
              border: "none",
              borderRadius: 10,
              fontWeight: 700,
              cursor: "pointer",
              fontSize: 13.5,
            }}
          >
            <Plus size={14} /> Nouvel examen
          </button>
        )}
      </div>

      {/* Sélection vide */}
      {!classeSelectionnee && (
        <div
          style={{
            background: cardBg,
            borderRadius: 14,
            border: `1px solid ${cardBorder}`,
            padding: isMobile ? 40 : 60,
            textAlign: "center",
            boxShadow: shadow,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: accentBg,
              color: accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <Award size={28} />
          </div>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              fontWeight: 600,
              color: textPrimary,
            }}
          >
            Sélectionnez une classe
          </p>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: 12.5,
              color: textSecondary,
              maxWidth: 320,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            Choisissez une classe ci-dessus pour planifier ses examens
          </p>
        </div>
      )}

      {/* Liste */}
      {classeSelectionnee && (
        <div>
          {examensRaw === undefined ? (
            <div
              style={{
                textAlign: "center",
                padding: 60,
                color: textSecondary,
              }}
            >
              <Loader
                size={28}
                className="gem-spin"
                style={{ color: accent }}
              />
              <p style={{ marginTop: 12, fontSize: 13 }}>
                Chargement des examens…
              </p>
            </div>
          ) : examens.length === 0 ? (
            <div
              style={{
                background: cardBg,
                borderRadius: 14,
                border: `1px solid ${cardBorder}`,
                padding: isMobile ? 32 : 48,
                textAlign: "center",
                boxShadow: shadow,
                color: textSecondary,
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: accentBg,
                  color: accent,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 12px",
                }}
              >
                <Calendar size={26} />
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: textPrimary,
                }}
              >
                Aucun examen planifié
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 12 }}>
                Ajoutez le premier examen pour la classe {classeSelectionnee}
              </p>
            </div>
          ) : (
            datesTriees.map((date) => {
              const liste = groupes[date];
              const label = formatDateLabel(date);
              return (
                <div key={date} style={{ marginBottom: isMobile ? 16 : 22 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: isMobile ? 8 : 10,
                    }}
                  >
                    <div
                      style={{
                        width: 6,
                        height: 20,
                        borderRadius: 3,
                        background: accent,
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <h3
                        style={{
                          fontSize: isMobile ? 13.5 : 15,
                          fontWeight: 700,
                          color: textPrimary,
                          margin: 0,
                          textTransform: "capitalize",
                        }}
                      >
                        {label}
                      </h3>
                      <div
                        style={{
                          fontSize: 11,
                          color: textSecondary,
                          marginTop: 1,
                        }}
                      >
                        {liste.length} examen{liste.length > 1 ? "s" : ""}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isMobile
                        ? "1fr"
                        : "repeat(auto-fill, minmax(340px, 1fr))",
                      gap: isMobile ? 8 : 10,
                    }}
                  >
                    {liste.map((exam) => (
                      <ExamenCard
                        key={exam._id}
                        exam={exam}
                        dark={dark}
                        isMobile={isMobile}
                        onEdit={() => handleOpenEdit(exam)}
                        onDelete={() => handleDelete(exam)}
                      />
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* FAB ajouter (mobile) */}
      {isMobile && classeSelectionnee && !saving && (
        <button
          onClick={handleOpenAdd}
          style={{
            position: "fixed",
            bottom: 24,
            right: 20,
            width: 56,
            height: 56,
            borderRadius: 28,
            background: accent,
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
          onMouseDown={(e) =>
            (e.currentTarget.style.transform = "scale(0.94)")
          }
          onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
          onMouseLeave={(e) =>
            (e.currentTarget.style.transform = "scale(1)")
          }
          title="Nouvel examen"
        >
          <Plus size={24} />
        </button>
      )}

      {/* Modale */}
      <ExamenFormModal
        open={showModal}
        onClose={handleCloseModal}
        editExam={editExam}
        classeSelectionnee={classeSelectionnee}
        onSubmit={handleSubmit}
        saving={saving}
        dark={dark}
        isMobile={isMobile}
      />

      <ConfirmDialog {...dialogProps} />
    </div>
  );
}