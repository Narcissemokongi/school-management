import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile"; // <-- Import du hook
import { useConfirm } from "@/hooks/useConfirm";
import { ConfirmDialog } from "./ConfirmDialog";
import {
  Calendar, Clock, MapPin, BookOpen, Plus, Trash2, Edit2, Save, School,
} from "lucide-react";
import toast from "react-hot-toast";

export function GestionExamens({ ecoleId, classes, user, anneeId, anneeActive }) {
  const { dark } = useStyles();
  const isMobile = useIsMobile(); // Détection mobile
  const { confirm, dialogProps } = useConfirm();

  const [classeSelectionnee, setClasseSelectionnee] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editExam, setEditExam] = useState(null);

  const [formData, setFormData] = useState({
    matiere: "",
    date: "",
    heure: "",
    duree: "",
    salle: "",
  });
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const examens = useQuery(
    api.examens.listByClasse,
    classeSelectionnee ? { ecoleId, anneeId, classe: classeSelectionnee } : "skip"
  ) ?? [];

  const addExamen = useMutation(api.examens.add);
  const updateExamen = useMutation(api.examens.update);
  const removeExamen = useMutation(api.examens.remove);

  // Couleurs adaptatives
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const inputBg = dark ? "#0F172A" : "#F8FAFC";
  const inputText = dark ? "#F1F5F9" : "#1E293B";
  const accent = dark ? "#818CF8" : "#4F46E5";
  const danger = dark ? "#F87171" : "#EF4444";
  const buttonSecondaryBg = dark ? "#334155" : "#F1F5F9";
  const buttonSecondaryText = dark ? "#F1F5F9" : "#1E293B";
  const shadow = dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)";

  const resetForm = () => {
    setFormData({ matiere: "", date: "", heure: "", duree: "", salle: "" });
    setFormErrors({});
    setEditExam(null);
    setShowForm(false);
  };

  const validate = () => {
    const err = {};
    if (!formData.matiere.trim()) err.matiere = "Requis";
    if (!formData.date) err.date = "Requis";
    setFormErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        ...formData,
        matiere: formData.matiere.trim(),
        classe: classeSelectionnee,
        ecoleId,
        anneeId,
        userId: user._id,
      };
      if (editExam) {
        await updateExamen({ examenId: editExam._id, ...payload });
        toast.success("Examen modifié");
      } else {
        await addExamen(payload);
        toast.success("Examen ajouté");
      }
      resetForm();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const ok = await confirm("Supprimer l'examen", "Confirmez-vous la suppression ?");
    if (!ok) return;
    try {
      await removeExamen({ examenId: id });
      toast.success("Examen supprimé");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const startEdit = (examen) => {
    setEditExam(examen);
    setFormData({
      matiere: examen.matiere,
      date: examen.date,
      heure: examen.heure || "",
      duree: examen.duree || "",
      salle: examen.salle || "",
    });
    setShowForm(true);
  };

  const groupes = examens.reduce((acc, exam) => {
    const jour = exam.date;
    if (!acc[jour]) acc[jour] = [];
    acc[jour].push(exam);
    return acc;
  }, {});

  // Styles adaptatifs
  const inputStyle = (field) => ({
    width: "100%",
    padding: isMobile ? "12px 14px" : "10px 14px",
    border: `1px solid ${field && formErrors[field] ? danger : cardBorder}`,
    borderRadius: 8,
    fontSize: isMobile ? 16 : 14,
    outline: "none",
    background: inputBg,
    color: inputText,
    transition: "border-color 0.2s, background-color 0.3s",
    boxSizing: "border-box",
  });

  const containerPadding = isMobile ? "16px 12px" : "24px 16px";
  const titleSize = isMobile ? 22 : 28;
  const subtitleSize = isMobile ? 13 : 14;
  const headerMarginBottom = isMobile ? 20 : 32;
  const classSelectorFlexDirection = isMobile ? "column" : "row";
  const classSelectorAlignItems = isMobile ? "stretch" : "center";
  const classSelectorGap = isMobile ? 8 : 12;
  const selectPadding = isMobile ? "12px 14px" : "10px 14px";
  const selectFontSize = isMobile ? 16 : 14;
  const newExamButtonPadding = isMobile ? "12px 16px" : "10px 16px";
  const newExamButtonFontSize = isMobile ? 16 : 14;
  const newExamButtonWidth = isMobile ? "100%" : "auto";
  const formCardPadding = isMobile ? 16 : 24;
  const formTitleSize = isMobile ? 16 : 18;
  const formGridColumns = isMobile ? "1fr" : "repeat(auto-fit, minmax(220px, 1fr))";
  const formGap = isMobile ? 12 : 16;
  const formButtonsFlexDirection = isMobile ? "column" : "row";
  const formButtonPadding = isMobile ? "12px 16px" : "10px 20px";
  const formButtonFontSize = isMobile ? 16 : 14;
  const formButtonWidth = isMobile ? "100%" : "auto";
  const listCardPadding = isMobile ? "12px 14px" : "14px 18px";
  const listCardFlexDirection = isMobile ? "column" : "row";
  const listCardAlignItems = isMobile ? "stretch" : "center";
  const listCardGap = isMobile ? 8 : 0;
  const actionButtonPadding = isMobile ? "8px 10px" : "6px";
  const emptyStatePadding = isMobile ? 32 : 48;

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: containerPadding }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .animate-spin { animation: spin 1s linear infinite; }`}</style>

      {/* En-tête */}
      <div style={{ marginBottom: headerMarginBottom }}>
        <h2 style={{ fontSize: titleSize, fontWeight: 700, color: textPrimary, margin: 0 }}>
          Gestion des examens
        </h2>
        <p style={{ color: textSecondary, marginTop: 4, fontSize: subtitleSize }}>
          Planifiez les compositions et examens par classe
        </p>
      </div>

      {/* Choix de la classe */}
      <div style={{ display: "flex", alignItems: classSelectorAlignItems, gap: classSelectorGap, marginBottom: 24, flexWrap: "wrap", flexDirection: classSelectorFlexDirection }}>
        <School size={isMobile ? 18 : 18} color={textSecondary} />
        <select
          value={classeSelectionnee}
          onChange={(e) => {
            setClasseSelectionnee(e.target.value);
            resetForm();
          }}
          style={{
            padding: selectPadding,
            border: `1px solid ${cardBorder}`,
            borderRadius: 8,
            fontSize: selectFontSize,
            outline: "none",
            background: inputBg,
            color: inputText,
            minWidth: isMobile ? "100%" : 200,
            flex: 1,
          }}
        >
          <option value="">-- Choisir une classe --</option>
          {classes.map((c) => (
            <option key={c._id} value={c.nom} style={{ background: dark ? "#1E293B" : "#FFF" }}>
              {c.nom}
            </option>
          ))}
        </select>

        {classeSelectionnee && (
          <button
            onClick={() => {
              setEditExam(null);
              setShowForm(true);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: newExamButtonPadding,
              background: accent,
              color: "white",
              border: "none",
              borderRadius: 8,
              fontWeight: 500,
              cursor: "pointer",
              fontSize: newExamButtonFontSize,
              width: newExamButtonWidth,
            }}
          >
            <Plus size={18} /> Nouvel examen
          </button>
        )}
      </div>

      {/* Formulaire */}
      {showForm && classeSelectionnee && (
        <div
          style={{
            background: cardBg,
            borderRadius: 16,
            padding: formCardPadding,
            boxShadow: shadow,
            marginBottom: 24,
            border: `1px solid ${cardBorder}`,
          }}
        >
          <h3 style={{ fontSize: formTitleSize, fontWeight: 600, marginBottom: 20, color: textPrimary }}>
            {editExam ? "Modifier l'examen" : "Nouvel examen"}
          </h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: "grid", gridTemplateColumns: formGridColumns, gap: formGap }}>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontWeight: 500, color: textSecondary, fontSize: isMobile ? 15 : 14 }}>
                  Matière
                </label>
                <input
                  value={formData.matiere}
                  onChange={(e) => setFormData({ ...formData, matiere: e.target.value })}
                  placeholder="Ex: Mathématiques"
                  style={inputStyle("matiere")}
                />
                {formErrors.matiere && <span style={{ color: danger, fontSize: 12 }}>{formErrors.matiere}</span>}
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontWeight: 500, color: textSecondary, fontSize: isMobile ? 15 : 14 }}>
                  Date
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  style={inputStyle("date")}
                />
                {formErrors.date && <span style={{ color: danger, fontSize: 12 }}>{formErrors.date}</span>}
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontWeight: 500, color: textSecondary, fontSize: isMobile ? 15 : 14 }}>
                  Heure (optionnel)
                </label>
                <input
                  type="time"
                  value={formData.heure}
                  onChange={(e) => setFormData({ ...formData, heure: e.target.value })}
                  style={inputStyle("")}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontWeight: 500, color: textSecondary, fontSize: isMobile ? 15 : 14 }}>
                  Durée (optionnel)
                </label>
                <input
                  type="text"
                  placeholder="Ex: 2h"
                  value={formData.duree}
                  onChange={(e) => setFormData({ ...formData, duree: e.target.value })}
                  style={inputStyle("")}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, fontWeight: 500, color: textSecondary, fontSize: isMobile ? 15 : 14 }}>
                  Salle (optionnel)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Salle 12"
                  value={formData.salle}
                  onChange={(e) => setFormData({ ...formData, salle: e.target.value })}
                  style={inputStyle("")}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 20, flexDirection: formButtonsFlexDirection }}>
              <button
                type="submit"
                disabled={saving}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  padding: formButtonPadding,
                  background: saving ? "#A5B4FC" : editExam ? "#F59E0B" : accent,
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  fontWeight: 500,
                  cursor: "pointer",
                  fontSize: formButtonFontSize,
                  width: formButtonWidth,
                }}
              >
                {saving ? <span className="animate-spin">⏳</span> : <Save size={18} />}
                {saving ? "Enregistrement..." : editExam ? "Modifier" : "Ajouter"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                style={{
                  padding: formButtonPadding,
                  background: buttonSecondaryBg,
                  border: "none",
                  borderRadius: 8,
                  fontWeight: 500,
                  cursor: "pointer",
                  color: buttonSecondaryText,
                  fontSize: formButtonFontSize,
                  width: formButtonWidth,
                }}
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Liste des examens groupés par date */}
      {classeSelectionnee && (
        <div>
          <h3 style={{ fontSize: isMobile ? 18 : 20, fontWeight: 600, marginBottom: 16, color: textPrimary }}>
            Calendrier des examens – {classeSelectionnee}
          </h3>
          {examens.length === 0 && (
            <div
              style={{
                background: cardBg,
                borderRadius: 16,
                padding: emptyStatePadding,
                textAlign: "center",
                boxShadow: shadow,
                color: textSecondary,
                border: `1px solid ${cardBorder}`,
              }}
            >
              <Calendar size={isMobile ? 28 : 32} style={{ marginBottom: 8 }} />
              <p>Aucun examen planifié pour cette classe.</p>
            </div>
          )}
          {Object.entries(groupes)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, liste]) => (
              <div key={date} style={{ marginBottom: isMobile ? 16 : 24 }}>
                <h4
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: isMobile ? 15 : 16,
                    fontWeight: 600,
                    color: textPrimary,
                    marginBottom: 12,
                  }}
                >
                  <Calendar size={isMobile ? 16 : 18} color={accent} />
                  {date}
                </h4>
                <div style={{ display: "grid", gap: isMobile ? 6 : 8 }}>
                  {liste.map((exam) => (
                    <div
                      key={exam._id}
                      style={{
                        background: cardBg,
                        borderRadius: 12,
                        padding: listCardPadding,
                        display: "flex",
                        flexDirection: listCardFlexDirection,
                        justifyContent: "space-between",
                        alignItems: listCardAlignItems,
                        gap: listCardGap,
                        boxShadow: shadow,
                        border: `1px solid ${cardBorder}`,
                      }}
                    >
                      <div style={{ display: "flex", flexWrap: "wrap", gap: isMobile ? 8 : 16, alignItems: "center" }}>
                        <span style={{ fontWeight: 500, display: "flex", alignItems: "center", gap: 6, color: textPrimary, fontSize: isMobile ? 14 : 15 }}>
                          <BookOpen size={isMobile ? 16 : 16} color={accent} />
                          {exam.matiere}
                        </span>
                        {exam.heure && (
                          <span style={{ display: "flex", alignItems: "center", gap: 6, color: textSecondary, fontSize: isMobile ? 13 : 14 }}>
                            <Clock size={16} />
                            {exam.heure}
                          </span>
                        )}
                        {exam.duree && (
                          <span style={{ color: textSecondary, fontSize: isMobile ? 12 : 13 }}>⏱️ {exam.duree}</span>
                        )}
                        {exam.salle && (
                          <span style={{ display: "flex", alignItems: "center", gap: 6, color: textSecondary, fontSize: isMobile ? 13 : 14 }}>
                            <MapPin size={16} />
                            {exam.salle}
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 6, justifyContent: isMobile ? "flex-end" : "flex-start", width: isMobile ? "100%" : "auto" }}>
                        <button
                          onClick={() => startEdit(exam)}
                          style={{ background: "none", border: "none", color: accent, cursor: "pointer", padding: actionButtonPadding }}
                          title="Modifier"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(exam._id)}
                          style={{ background: "none", border: "none", color: danger, cursor: "pointer", padding: actionButtonPadding }}
                          title="Supprimer"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}

      <ConfirmDialog {...dialogProps} />
    </div>
  );
}