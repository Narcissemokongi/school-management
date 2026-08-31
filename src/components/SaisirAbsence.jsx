import { useState, useRef, useEffect, useMemo } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile"; // <-- Import du hook
import { Search, Calendar, Check, X, Loader, RotateCcw, CalendarDays } from "lucide-react";
import toast from "react-hot-toast";
import { useConfirm } from "@/hooks/useConfirm";
import { ConfirmDialog } from "./ConfirmDialog";
import { trierEleves } from "@/utils/tri";
import { useAppStore } from "@/store/appStore";

export function SaisirAbsence({ ecoleId, eleves, user, anneeId, anneeActive }) {
  const { S, dark } = useStyles();
  const isMobile = useIsMobile(); // Détection mobile
  const { confirm, dialogProps } = useConfirm();
  const addAbsence = useMutation(api.absences.add);

  // ===== États persistés dans le store =====
  const selectedEleve = useAppStore((state) => state.saisirAbsenceSelectedEleve);
  const setSelectedEleve = useAppStore((state) => state.setSaisirAbsenceSelectedEleve);
  const type = useAppStore((state) => state.saisirAbsenceType || "absence");
  const setType = useAppStore((state) => state.setSaisirAbsenceType);
  const date = useAppStore((state) => state.saisirAbsenceDate || new Date().toISOString().split("T")[0]);
  const setDate = useAppStore((state) => state.setSaisirAbsenceDate);
  const commentaire = useAppStore((state) => state.saisirAbsenceCommentaire || "");
  const setCommentaire = useAppStore((state) => state.setSaisirAbsenceCommentaire);
  const search = useAppStore((state) => state.saisirAbsenceSearch || "");
  const setSearch = useAppStore((state) => state.setSaisirAbsenceSearch);
  // =========================================

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Debounce de la recherche
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const timeoutRef = useRef(null);
  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timeoutRef.current);
  }, [search]);

  const filtered = useMemo(() => {
    if (debouncedSearch.trim().length < 2) return [];
    const query = debouncedSearch.toLowerCase();
    return eleves
      .filter(e => `${e.nom} ${e.postnom} ${e.prenom || ''}`.toLowerCase().includes(query))
      .sort(trierEleves)
      .slice(0, 10);
  }, [eleves, debouncedSearch]);

  const selectEleve = (eleve) => {
    setSelectedEleve(eleve);
    setSearch(`${eleve.nom} ${eleve.postnom}`);
    setErrors(prev => ({ ...prev, selectedEleve: undefined }));
  };

  const clearSelectedEleve = () => {
    setSelectedEleve(null);
    setSearch("");
    setErrors(prev => ({ ...prev, selectedEleve: undefined }));
  };

  const validate = () => {
    const err = {};
    if (!selectedEleve) err.selectedEleve = "Veuillez sélectionner un élève.";
    if (!date) err.date = "La date est requise.";
    return err;
  };

  const resetForm = () => {
    setSelectedEleve(null);
    setSearch("");
    setType("absence");
    setDate(new Date().toISOString().split("T")[0]);
    setCommentaire("");
    setErrors({});
  };

  const handleSubmit = async () => {
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    const ok = await confirm(
      "Enregistrer l'absence / retard",
      `Voulez-vous vraiment enregistrer ${type === "absence" ? "une absence" : "un retard"} pour ${selectedEleve.nom} ${selectedEleve.postnom} ?`
    );
    if (!ok) return;

    setSubmitting(true);
    try {
      await addAbsence({
        eleveId: selectedEleve._id,
        ecoleId,
        type,
        date,
        commentaire: commentaire || undefined,
        anneeId,
        userId: user._id,
      });
      toast.success(`${type === "absence" ? "Absence" : "Retard"} enregistré(e)`);
      resetForm();
    } catch (err) {
      toast.error("Erreur : " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Raccourci pour la date du jour
  const setToday = () => {
    setDate(new Date().toISOString().split("T")[0]);
    setErrors(prev => ({ ...prev, date: undefined }));
  };

  // Couleurs adaptatives
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const inputBg = dark ? "#0F172A" : "#F9FAFB";
  const inputText = dark ? "#F1F5F9" : "#1E293B";
  const errorBg = dark ? "#7F1D1D" : "#FEF2F2";
  const errorText = "#EF4444";
  const badgeBg = dark ? "#312E81" : "#EEF2FF";
  const badgeText = dark ? "#A5B4FC" : "#4F46E5";
  const buttonBg = dark ? "#818CF8" : "#4F46E5";
  const secondaryBtnBg = dark ? "#334155" : "#F1F5F9";
  const secondaryBtnText = dark ? "#F1F5F9" : "#1E293B";
  const accent = dark ? "#818CF8" : "#4F46E5";

  // Styles adaptatifs
  const containerPadding = isMobile ? "16px 12px" : "24px 16px";
  const headerMarginBottom = isMobile ? 20 : 32;
  const titleSize = isMobile ? 22 : 28;
  const subtitleSize = isMobile ? 13 : 14;
  const cardPadding = isMobile ? 14 : 24;
  const cardMarginBottom = isMobile ? 16 : 24;
  const labelFontSize = isMobile ? 15 : 14;
  const inputPadding = isMobile ? "12px 14px 12px 42px" : "10px 14px 10px 42px";
  const inputFontSize = isMobile ? 16 : 14;
  const selectPadding = isMobile ? "12px 14px" : "10px 14px";
  const selectFontSize = isMobile ? 16 : 14;
  const suggestionItemPadding = isMobile ? "12px 14px" : "10px 14px";
  const selectedElevePadding = isMobile ? "12px 14px" : "10px 14px";
  const todayButtonPadding = isMobile ? "10px 12px" : "8px 10px";
  const actionButtonsFlexDirection = isMobile ? "column" : "row";
  const actionButtonsGap = isMobile ? 8 : 12;

  const inputStyle = (field) => ({
    width: "100%",
    padding: inputPadding,
    border: `1.5px solid ${errors[field] ? errorText : cardBorder}`,
    borderRadius: 10,
    fontSize: inputFontSize,
    outline: "none",
    background: errors[field] ? errorBg : inputBg,
    color: inputText,
    transition: "border-color 0.2s, background-color 0.3s",
    boxSizing: "border-box",
  });

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: containerPadding }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .animate-spin { animation: spin 1s linear infinite; }`}</style>

      {/* En-tête */}
      <div style={{ marginBottom: headerMarginBottom }}>
        <h2 style={{ fontSize: titleSize, fontWeight: 700, color: textPrimary, margin: 0 }}>
          Saisir une absence ou un retard
        </h2>
        <p style={{ color: textSecondary, marginTop: 4, fontSize: subtitleSize }}>
          {eleves.length} élève(s) {anneeActive ? `· ${anneeActive.nom}` : ""}
        </p>
      </div>

      {/* Carte de recherche */}
      <div style={{
        background: cardBg,
        borderRadius: 16,
        padding: cardPadding,
        boxShadow: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)",
        border: `1px solid ${cardBorder}`,
        marginBottom: cardMarginBottom,
      }}>
        <label htmlFor="recherche-eleve" style={{ display: "block", marginBottom: 6, fontWeight: 500, fontSize: labelFontSize, color: textSecondary }}>
          <Search size={16} style={{ marginRight: 4, verticalAlign: "middle" }} />
          Rechercher un élève
        </label>
        <div style={{ position: "relative" }}>
          <Search size={18} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: textSecondary }} />
          <input
            id="recherche-eleve"
            type="text"
            placeholder="Tapez le nom de l'élève..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedEleve(null);
              setErrors(prev => ({ ...prev, selectedEleve: undefined }));
            }}
            style={inputStyle("selectedEleve")}
          />
        </div>
        {errors.selectedEleve && <div style={{ color: errorText, fontSize: 13, marginTop: 4 }}>{errors.selectedEleve}</div>}

        {/* Résultats de recherche triés */}
        {debouncedSearch.length >= 2 && !selectedEleve && (
          <div style={{
            marginTop: 12,
            border: `1px solid ${cardBorder}`,
            borderRadius: 10,
            overflow: "hidden",
            background: cardBg,
          }}>
            {filtered.length === 0 ? (
              <div style={{ padding: 12, textAlign: "center", color: textSecondary, fontSize: 13 }}>
                Aucun élève trouvé pour "{debouncedSearch}"
              </div>
            ) : (
              filtered.map(e => (
                <div
                  key={e._id}
                  onClick={() => selectEleve(e)}
                  style={{
                    padding: suggestionItemPadding,
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom: `1px solid ${cardBorder}`,
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={ev => ev.currentTarget.style.background = badgeBg}
                  onMouseLeave={ev => ev.currentTarget.style.background = "transparent"}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: isMobile ? 15 : 14, color: textPrimary }}>
                      {e.nom} {e.postnom} {e.prenom}
                    </div>
                    <div style={{ fontSize: 12, color: textSecondary }}>Classe {e.classe}</div>
                  </div>
                  <Check size={16} color={accent} style={{ opacity: 0 }} />
                </div>
              ))
            )}
          </div>
        )}

        {/* Élève sélectionné */}
        {selectedEleve && (
          <div style={{
            marginTop: 12,
            padding: selectedElevePadding,
            background: badgeBg,
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <Check size={16} color={badgeText} />
              <span style={{ fontWeight: 600, fontSize: isMobile ? 15 : 14, color: textPrimary }}>
                {selectedEleve.nom} {selectedEleve.postnom} {selectedEleve.prenom}
              </span>
              <span style={{ color: textSecondary, fontSize: 13 }}>({selectedEleve.classe})</span>
            </div>
            <button onClick={clearSelectedEleve} style={{ background: "none", border: "none", color: errorText, cursor: "pointer", padding: 4 }}>
              <X size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Carte détails */}
      <div style={{
        background: cardBg,
        borderRadius: 16,
        padding: cardPadding,
        boxShadow: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)",
        border: `1px solid ${cardBorder}`,
        marginBottom: cardMarginBottom,
      }}>
        <div style={{ marginBottom: 20 }}>
          <label htmlFor="type" style={{ display: "block", marginBottom: 6, fontWeight: 500, fontSize: labelFontSize, color: textSecondary }}>
            Type
          </label>
          <select
            id="type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            style={{
              width: "100%",
              padding: selectPadding,
              border: `1.5px solid ${cardBorder}`,
              borderRadius: 10,
              fontSize: selectFontSize,
              outline: "none",
              background: inputBg,
              color: inputText,
            }}
          >
            <option value="absence">Absence</option>
            <option value="retard">Retard</option>
          </select>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label htmlFor="date" style={{ display: "block", marginBottom: 6, fontWeight: 500, fontSize: labelFontSize, color: textSecondary }}>
            Date
          </label>
          <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 8, flexDirection: isMobile ? "column" : "row" }}>
            <div style={{ position: "relative", flex: 1, width: "100%" }}>
              <Calendar size={18} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: textSecondary }} />
              <input
                id="date"
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setErrors(prev => ({ ...prev, date: undefined }));
                }}
                style={inputStyle("date")}
              />
            </div>
            <button
              onClick={setToday}
              title="Aujourd'hui"
              style={{
                background: "none",
                border: `1px solid ${cardBorder}`,
                borderRadius: 8,
                padding: todayButtonPadding,
                cursor: "pointer",
                color: textSecondary,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                fontSize: isMobile ? 14 : 14,
                whiteSpace: "nowrap",
              }}
            >
              <CalendarDays size={16} /> Aujourd'hui
            </button>
          </div>
          {errors.date && <div style={{ color: errorText, fontSize: 13, marginTop: 4 }}>{errors.date}</div>}
        </div>

        <div style={{ marginBottom: 20 }}>
          <label htmlFor="commentaire" style={{ display: "block", marginBottom: 6, fontWeight: 500, fontSize: labelFontSize, color: textSecondary }}>
            Commentaire (optionnel)
          </label>
          <textarea
            id="commentaire"
            value={commentaire}
            onChange={(e) => setCommentaire(e.target.value)}
            placeholder="Raison de l'absence ou du retard..."
            style={{
              width: "100%",
              padding: selectPadding,
              border: `1.5px solid ${cardBorder}`,
              borderRadius: 10,
              fontSize: selectFontSize,
              outline: "none",
              background: inputBg,
              color: inputText,
              height: isMobile ? 120 : 100,
              resize: "vertical",
              fontFamily: "inherit",
              boxSizing: "border-box",
            }}
          />
        </div>
      </div>

      {/* Boutons d'action */}
      <div style={{ display: "flex", gap: actionButtonsGap, flexDirection: actionButtonsFlexDirection }}>
        <button
          onClick={handleSubmit}
          disabled={!selectedEleve || !date || submitting}
          style={{
            flex: 1,
            padding: isMobile ? "14px 0" : "12px 0",
            background: !selectedEleve || !date || submitting ? "#A5B4FC" : buttonBg,
            color: "#FFFFFF",
            border: "none",
            borderRadius: 10,
            fontSize: isMobile ? 16 : 16,
            fontWeight: 600,
            cursor: !selectedEleve || !date || submitting ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            transition: "background 0.2s",
            boxShadow: !selectedEleve || !date || submitting ? "none" : "0 4px 12px rgba(79,70,229,0.2)",
          }}
        >
          {submitting ? (
            <>
              <Loader size={16} className="animate-spin" />
              Enregistrement...
            </>
          ) : (
            "Enregistrer"
          )}
        </button>
        <button
          onClick={resetForm}
          disabled={submitting}
          style={{
            padding: isMobile ? "14px 20px" : "12px 20px",
            background: secondaryBtnBg,
            color: secondaryBtnText,
            border: "none",
            borderRadius: 10,
            fontSize: isMobile ? 16 : 16,
            fontWeight: 500,
            cursor: submitting ? "not-allowed" : "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <RotateCcw size={16} /> Réinitialiser
        </button>
      </div>

      <ConfirmDialog {...dialogProps} />
    </div>
  );
}