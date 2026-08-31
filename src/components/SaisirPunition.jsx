import { useState, useMemo, useRef, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile"; // <-- Import du hook
import { getFaute } from "../utils";
import { trierEleves } from "@/utils/tri";
import toast from "react-hot-toast";
import { Loader, Search, Check, AlertTriangle, Info } from "lucide-react";
import { userFriendlyError } from "@/utils/errorMessages";
import { useConfirm } from "@/hooks/useConfirm";
import { ConfirmDialog } from "./ConfirmDialog";
import { useAppStore } from "@/store/appStore";

export function SaisirPunition({ user, ecoleId, eleves, fautes, sanctions, addPunition, onNotif, anneeId, anneeActive }) {
  const { S, dark } = useStyles();
  const isMobile = useIsMobile(); // Détection mobile
  const { confirm, dialogProps } = useConfirm();

  // ===== Persistance via le store Zustand =====
  const search = useAppStore((state) => state.saisirPunitionSearch || "");
  const setSearch = useAppStore((state) => state.setSaisirPunitionSearch);
  const selectedEleve = useAppStore((state) => state.saisirPunitionSelectedEleve);
  const setSelectedEleve = useAppStore((state) => state.setSaisirPunitionSelectedEleve);
  const idFaute = useAppStore((state) => state.saisirPunitionIdFaute || "");
  const setIdFaute = useAppStore((state) => state.setSaisirPunitionIdFaute);
  const date = useAppStore((state) => state.saisirPunitionDate || new Date().toISOString().split("T")[0]);
  const setDate = useAppStore((state) => state.setSaisirPunitionDate);
  const commentaire = useAppStore((state) => state.saisirPunitionCommentaire || "");
  const setCommentaire = useAppStore((state) => state.setSaisirPunitionCommentaire);
  const sanction = useAppStore((state) => state.saisirPunitionSanction || "");
  const setSanction = useAppStore((state) => state.setSaisirPunitionSanction);
  const graviteFilter = useAppStore((state) => state.saisirPunitionGraviteFilter || "toutes");
  const setGraviteFilter = useAppStore((state) => state.setSaisirPunitionGraviteFilter);
  // =========================================

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const addPunitionMutation = useMutation(api.punitions.add);
  const searchTimeoutRef = useRef(null);

  const filteredFautes = useMemo(() => {
    if (graviteFilter === "toutes") return fautes;
    return fautes.filter(f => f.gravite === graviteFilter);
  }, [fautes, graviteFilter]);

  const [debouncedSearch, setDebouncedSearch] = useState(search);
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(searchTimeoutRef.current);
  }, [search]);

  const filteredEleves = useMemo(() => {
    if (debouncedSearch.trim().length < 2) return [];
    const query = debouncedSearch.toLowerCase();
    return eleves
      .filter(e => `${e.nom} ${e.postnom} ${e.prenom || ''}`.toLowerCase().includes(query))
      .sort(trierEleves)
      .slice(0, 10);
  }, [eleves, debouncedSearch]);

  const validate = () => {
    const newErrors = {};
    if (!selectedEleve) newErrors.selectedEleve = "Veuillez sélectionner un élève.";
    if (!idFaute) newErrors.idFaute = "Veuillez choisir un type de faute.";
    if (!date) newErrors.date = "La date est requise.";
    if (!sanction) newErrors.sanction = "Veuillez choisir une sanction.";
    return newErrors;
  };

  const handleBlur = (field) => {
    setErrors(prev => {
      const updated = { ...prev };
      switch (field) {
        case "selectedEleve":
          if (!selectedEleve) updated.selectedEleve = "Veuillez sélectionner un élève.";
          else delete updated.selectedEleve;
          break;
        case "idFaute":
          if (!idFaute) updated.idFaute = "Veuillez choisir un type de faute.";
          else delete updated.idFaute;
          break;
        case "date":
          if (!date) updated.date = "La date est requise.";
          else delete updated.date;
          break;
        case "sanction":
          if (!sanction) updated.sanction = "Veuillez choisir une sanction.";
          else delete updated.sanction;
          break;
        default:
          break;
      }
      return updated;
    });
  };

  const resetForm = () => {
    setSelectedEleve(null);
    setSearch("");
    setIdFaute("");
    setDate(new Date().toISOString().split("T")[0]);
    setCommentaire("");
    setSanction("");
    setGraviteFilter("toutes");
    setErrors({});
  };

  const handleSubmit = async () => {
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    const ok = await confirm(
      "Enregistrer la punition",
      `Voulez-vous vraiment enregistrer cette punition pour ${selectedEleve.nom} ${selectedEleve.postnom} ?`
    );
    if (!ok) return;

    setSubmitting(true);
    try {
      const faute = getFaute(fautes, idFaute);
      await addPunitionMutation({
        idEleve: selectedEleve._id,
        idFaute,
        date,
        commentaire: commentaire || undefined,
        sanction,
        disciplinaire: user.nom,
        ecoleId,
        anneeId,
        userId: user._id,
      });
      toast.success("Punition enregistrée");
      if (faute?.gravite === "Grave" && onNotif) {
        onNotif(`${selectedEleve.nom} ${selectedEleve.postnom} (${selectedEleve.classe}) — ${faute.libelle}`);
      }
      resetForm();
    } catch (err) {
      toast.error(userFriendlyError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const isFormValid = selectedEleve && idFaute && date && sanction;
  const fauteSelectionnee = idFaute ? getFaute(fautes, idFaute) : null;

  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const inputBg = dark ? "#0F172A" : "#F8FAFC";
  const inputText = dark ? "#F1F5F9" : "#1E293B";
  const accent = dark ? "#818CF8" : "#4F46E5";
  const badgeBg = dark ? "#312E81" : "#EEF2FF";
  const badgeText = dark ? "#A5B4FC" : "#4F46E5";

  // Styles adaptatifs
  const cardPadding = isMobile ? 14 : 20;
  const cardGap = isMobile ? 10 : 16;
  const titleFontSize = isMobile ? 20 : 24;
  const subtitleFontSize = isMobile ? 14 : 14;
  const labelFontSize = isMobile ? 15 : 14;
  const inputPadding = isMobile ? "12px 14px" : "10px 14px";
  const inputFontSize = isMobile ? 16 : 14;
  const suggestionItemPadding = isMobile ? "10px 12px" : "10px 12px";
  const filterButtonPadding = isMobile ? "10px 12px" : "6px 12px";
  const filterButtonFontSize = isMobile ? 14 : 13;
  const textareaHeight = isMobile ? 100 : 80;
  const submitButtonPadding = isMobile ? "14px 0" : "12px 0";
  const submitButtonFontSize = isMobile ? 16 : 14;

  return (
    <div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .animate-spin { animation: spin 1s linear infinite; }`}</style>

      <div style={{ marginBottom: isMobile ? 16 : 20 }}>
        <h2 style={{ ...S.h2, color: textPrimary, fontSize: titleFontSize }}>Nouvelle punition</h2>
        <p style={{ ...S.muted, color: textSecondary, fontSize: subtitleFontSize }}>
          Enregistrez une faute disciplinaire {anneeActive && ` · ${anneeActive.nom}`}
        </p>
      </div>

      {/* Recherche d'élève */}
      <div style={{ ...S.card, background: cardBg, border: `1px solid ${cardBorder}`, padding: cardPadding, marginBottom: cardGap }}>
        <label style={{ ...S.label, color: textSecondary, fontSize: labelFontSize }}>🔍 Rechercher un élève</label>
        <div style={{
          display: "flex",
          alignItems: "center",
          background: inputBg,
          borderRadius: 10,
          padding: inputPadding,
          border: `1px solid ${errors.selectedEleve ? "#EF4444" : cardBorder}`,
        }}>
          <Search size={16} color={textSecondary} style={{ marginRight: 8 }} />
          <input
            style={{ border: "none", outline: "none", background: "transparent", width: "100%", fontSize: inputFontSize, color: inputText }}
            placeholder="Tapez le nom de l'élève..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedEleve(null);
              setErrors(prev => ({ ...prev, selectedEleve: undefined }));
            }}
            onBlur={() => handleBlur("selectedEleve")}
          />
        </div>
        {errors.selectedEleve && <div style={{ color: "#EF4444", fontSize: 13, marginTop: 4 }}>{errors.selectedEleve}</div>}

        {/* Suggestions d'élèves triées */}
        {debouncedSearch.length >= 2 && !selectedEleve && (
          <div style={{
            marginTop: 8,
            maxHeight: 200,
            overflowY: "auto",
            border: `1px solid ${cardBorder}`,
            borderRadius: 10,
            padding: 6,
            background: cardBg,
          }}>
            {filteredEleves.length === 0 ? (
              <div style={{ padding: 12, textAlign: "center", color: textSecondary, fontSize: 13 }}>Aucun élève trouvé</div>
            ) : (
              filteredEleves.map(e => (
                <div
                  key={e._id}
                  onClick={() => {
                    setSelectedEleve(e);
                    setSearch(`${e.nom} ${e.postnom}`);
                    setErrors(prev => ({ ...prev, selectedEleve: undefined }));
                  }}
                  style={{
                    padding: suggestionItemPadding,
                    borderRadius: 8,
                    cursor: "pointer",
                    background: "transparent",
                    transition: "background 0.1s",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = badgeBg}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <Search size={14} color={textSecondary} />
                  <div>
                    <div style={{ fontWeight: 500, fontSize: isMobile ? 15 : 14, color: textPrimary }}>
                      {e.nom} {e.postnom} {e.prenom}
                    </div>
                    <div style={{ fontSize: 12, color: textSecondary }}>Classe {e.classe}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {selectedEleve && (
          <div style={{
            marginTop: 8,
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: badgeBg,
            color: badgeText,
            padding: isMobile ? "12px 14px" : "8px 12px",
            borderRadius: 8,
            fontWeight: 500,
            fontSize: isMobile ? 15 : 14,
          }}>
            <Check size={16} />
            {selectedEleve.nom} {selectedEleve.postnom} {selectedEleve.prenom} — Classe {selectedEleve.classe}
          </div>
        )}
      </div>

      {/* Type de faute */}
      <div style={{ ...S.card, background: cardBg, border: `1px solid ${cardBorder}`, padding: cardPadding, marginBottom: cardGap }}>
        <label style={{ ...S.label, color: textSecondary, fontSize: labelFontSize }}>Type de faute</label>
        <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
          {["toutes", "Légère", "Moyenne", "Grave"].map(g => (
            <button
              key={g}
              type="button"
              onClick={() => setGraviteFilter(g)}
              style={{
                padding: filterButtonPadding,
                border: `1px solid ${graviteFilter === g ? accent : cardBorder}`,
                borderRadius: 20,
                background: graviteFilter === g ? badgeBg : "transparent",
                color: graviteFilter === g ? badgeText : textSecondary,
                fontWeight: 500,
                cursor: "pointer",
                fontSize: filterButtonFontSize,
                flex: isMobile ? 1 : "none",
                justifyContent: "center",
              }}
            >
              {g === "toutes" ? "Toutes" : g}
            </button>
          ))}
        </div>
        <select
          style={{
            ...S.select,
            borderColor: errors.idFaute ? "#EF4444" : cardBorder,
            background: inputBg,
            color: inputText,
            padding: inputPadding,
            fontSize: inputFontSize,
            width: "100%",
          }}
          value={idFaute}
          onChange={(e) => {
            setIdFaute(e.target.value);
            setErrors(prev => ({ ...prev, idFaute: undefined }));
          }}
          onBlur={() => handleBlur("idFaute")}
        >
          <option value="">Sélectionner une faute...</option>
          {filteredFautes.map(f => (
            <option key={f._id} value={f._id} style={{ background: dark ? "#1E293B" : "#FFF" }}>
              {f.libelle} ({f.gravite})
            </option>
          ))}
        </select>
        {errors.idFaute && <div style={{ color: "#EF4444", fontSize: 13, marginTop: 4 }}>{errors.idFaute}</div>}
        {fauteSelectionnee && (
          <div style={{
            marginTop: 8,
            display: "flex",
            alignItems: "center",
            gap: 6,
            color: fauteSelectionnee.gravite === "Grave" ? "#EF4444" : "#F59E0B",
            fontSize: isMobile ? 14 : 14,
          }}>
            <Info size={16} />
            Gravité : {fauteSelectionnee.gravite}
          </div>
        )}
      </div>

      {/* Date */}
      <div style={{ ...S.card, background: cardBg, border: `1px solid ${cardBorder}`, padding: cardPadding, marginBottom: cardGap }}>
        <label style={{ ...S.label, color: textSecondary, fontSize: labelFontSize }}>Date</label>
        <input
          style={{
            ...S.input,
            borderColor: errors.date ? "#EF4444" : cardBorder,
            background: inputBg,
            color: inputText,
            padding: inputPadding,
            fontSize: inputFontSize,
            width: "100%",
          }}
          type="date"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            setErrors(prev => ({ ...prev, date: undefined }));
          }}
          onBlur={() => handleBlur("date")}
        />
        {errors.date && <div style={{ color: "#EF4444", fontSize: 13, marginTop: 4 }}>{errors.date}</div>}
      </div>

      {/* Sanction */}
      <div style={{ ...S.card, background: cardBg, border: `1px solid ${cardBorder}`, padding: cardPadding, marginBottom: cardGap }}>
        <label style={{ ...S.label, color: textSecondary, fontSize: labelFontSize }}>Sanction</label>
        <select
          style={{
            ...S.select,
            borderColor: errors.sanction ? "#EF4444" : cardBorder,
            background: inputBg,
            color: inputText,
            padding: inputPadding,
            fontSize: inputFontSize,
            width: "100%",
          }}
          value={sanction}
          onChange={(e) => {
            setSanction(e.target.value);
            setErrors(prev => ({ ...prev, sanction: undefined }));
          }}
          onBlur={() => handleBlur("sanction")}
        >
          <option value="">Choisir une sanction...</option>
          {sanctions.map(s => (
            <option key={s._id} value={s.libelle} style={{ background: dark ? "#1E293B" : "#FFF" }}>
              {s.libelle}
            </option>
          ))}
        </select>
        {errors.sanction && <div style={{ color: "#EF4444", fontSize: 13, marginTop: 4 }}>{errors.sanction}</div>}
      </div>

      {/* Commentaire */}
      <div style={{ ...S.card, background: cardBg, border: `1px solid ${cardBorder}`, padding: cardPadding, marginBottom: cardGap }}>
        <label style={{ ...S.label, color: textSecondary, fontSize: labelFontSize }}>Commentaire</label>
        <textarea
          style={{
            ...S.input,
            height: textareaHeight,
            resize: "none",
            background: inputBg,
            color: inputText,
            border: `1px solid ${cardBorder}`,
            padding: inputPadding,
            fontSize: inputFontSize,
            width: "100%",
          }}
          placeholder="Détails de l'incident..."
          value={commentaire}
          onChange={(e) => setCommentaire(e.target.value)}
        />
      </div>

      <button
        style={{
          ...S.btn(accent),
          opacity: isFormValid && !submitting ? 1 : 0.6,
          cursor: isFormValid && !submitting ? "pointer" : "not-allowed",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          padding: submitButtonPadding,
          fontSize: submitButtonFontSize,
          width: "100%",
        }}
        onClick={handleSubmit}
        disabled={!isFormValid || submitting}
      >
        {submitting ? (
          <><Loader size={16} className="animate-spin" /> Enregistrement...</>
        ) : (
          <><Check size={16} /> Enregistrer la punition</>
        )}
      </button>

      <ConfirmDialog {...dialogProps} />
    </div>
  );
}