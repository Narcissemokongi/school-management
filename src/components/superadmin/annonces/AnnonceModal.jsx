// src/components/SuperAdmin/annonces/AnnonceModal.jsx
import { useState, useMemo, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useTokens } from "@/theme/tokens";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useUploadFile } from "@/hooks/useUploadFile";
import { Modal, Button } from "@/components/ui";
import toast from "react-hot-toast";
import {
  Info, AlertTriangle, Wrench, CheckCircle2, Pin, Sparkles,
  FileText, Image as ImageIcon, Trash2, Upload, Loader, Repeat,
  File, Eye, EyeOff, ChevronDown, ChevronUp, X, AlertCircle,
} from "lucide-react";

// ════════════════════════════════════════════════════════════════
// CONSTANTES
// ════════════════════════════════════════════════════════════════
const TEMPLATES = [
  {
    id: "maintenance",
    label: "🔧 Maintenance prévue",
    type: "maintenance",
    titre: "Maintenance planifiée",
    message:
      "Une maintenance est prévue le [DATE] de [HEURE] à [HEURE]. Le service sera temporairement indisponible. Nous nous excusons pour la gêne occasionnée.",
    dureeJours: 3,
  },
  {
    id: "nouvelle_version",
    label: "🚀 Nouvelle version",
    type: "success",
    titre: "Nouvelle version disponible",
    message:
      "Une nouvelle version d'EduDiscipline est disponible avec de nombreuses améliorations. Découvrez-les dès maintenant !",
    dureeJours: 7,
  },
  {
    id: "rappel_paiement",
    label: "💰 Rappel paiement",
    type: "warning",
    titre: "Rappel : paiement en attente",
    message:
      "Votre abonnement arrive à échéance. Merci de régulariser votre situation avant le [DATE] pour éviter toute suspension de service.",
    dureeJours: 14,
  },
  {
    id: "info_generale",
    label: "ℹ️ Information générale",
    type: "info",
    titre: "Information importante",
    message: "Nous vous informons que...",
    dureeJours: 7,
  },
  {
    id: "fermeture",
    label: "🎉 Fermeture / Vacances",
    type: "info",
    titre: "Fermeture exceptionnelle",
    message:
      "L'établissement sera fermé du [DATE] au [DATE]. Reprise normale le [DATE]. Bonnes vacances à tous !",
    dureeJours: 5,
  },
];

const TYPES = [
  { value: "info", label: "Info", color: "#3B82F6", Icon: Info },
  { value: "warning", label: "Alerte", color: "#F59E0B", Icon: AlertTriangle },
  { value: "maintenance", label: "Maintenance", color: "#EF4444", Icon: Wrench },
  { value: "success", label: "Succès", color: "#10B981", Icon: CheckCircle2 },
];

const RECURRENCES = [
  { value: "unique", label: "Unique" },
  { value: "hebdo", label: "Hebdomadaire" },
  { value: "mensuel", label: "Mensuel" },
  { value: "trimestriel", label: "Trimestriel" },
];

const ROLE_LABELS = {
  admin: "Admin école",
  directeur: "Directeur",
  enseignant: "Enseignant",
  disciplinaire: "Disciplinaire",
  comptable: "Comptable",
  parent: "Parent",
  eleve: "Élève",
};

const MS_JOUR = 24 * 60 * 60 * 1000;
const MAX_PJ = 5;
const MAX_PJ_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
];

// ════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════
function toInputDate(ts) {
  const d = new Date(ts);
  const off = d.getTimezoneOffset();
  const local = new Date(ts - off * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function formatBytes(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDelay(ms) {
  if (ms <= 0) return "maintenant";
  const min = Math.floor(ms / 60000);
  if (min < 60) return `dans ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `dans ${h} h`;
  const d = Math.floor(h / 24);
  return `dans ${d} j`;
}

// ════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ════════════════════════════════════════════════════════════════
export function AnnonceModal({ userId, annonce, onClose }) {
  const t = useTokens();
  const isMobile = useIsMobile();
  const isDuplicate = annonce?._duplicate === true;
  const isEdit = !!annonce && !isDuplicate;

  // ─── State ─────────────────────────────────────
  const [titre, setTitre] = useState(annonce?.titre ?? "");
  const [message, setMessage] = useState(annonce?.message ?? "");
  const [type, setType] = useState(annonce?.type ?? "info");
  const [cible, setCible] = useState(annonce?.cible ?? "toutes");
  const [ecoleId, setEcoleId] = useState(annonce?.ecoleId ?? "");
  const [ecoleSearch, setEcoleSearch] = useState("");
  const [role, setRole] = useState(annonce?.role ?? "admin");
  const [epinglee, setEpinglee] = useState(annonce?.epinglee ?? false);
  const [brouillon, setBrouillon] = useState(annonce?.brouillon ?? false);
  const [recurrence, setRecurrence] = useState(annonce?.recurrence ?? "unique");
  const [piecesJointes, setPiecesJointes] = useState(annonce?.piecesJointes ?? []);
  const [dateDebut, setDateDebut] = useState(
    toInputDate(isDuplicate || !annonce ? Date.now() : annonce.dateDebut)
  );
  const [dateFin, setDateFin] = useState(
    toInputDate(
      isDuplicate || !annonce ? Date.now() + 7 * MS_JOUR : annonce.dateFin
    )
  );
  const [recurrenceFin, setRecurrenceFin] = useState(
    annonce?.recurrenceFin ? toInputDate(annonce.recurrenceFin) : ""
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);
  const [showTemplates, setShowTemplates] = useState(!annonce);
  const [uploadErr, setUploadErr] = useState(null);
  const [showPreview, setShowPreview] = useState(false); // toggle mobile

  // ─── Hooks externes ────────────────────────────
  const ecoles = useQuery(api.ecoles.listWithUserCount, { userId }) ?? [];
  const creerM = useMutation(api.annonces.creer);
  const modifierM = useMutation(api.annonces.modifier);
  const { uploading, uploadFile } = useUploadFile(userId);

  // ─── Fix #2 : Resync quand `annonce` change ────
  useEffect(() => {
    setTitre(annonce?.titre ?? "");
    setMessage(annonce?.message ?? "");
    setType(annonce?.type ?? "info");
    setCible(annonce?.cible ?? "toutes");
    setEcoleId(annonce?.ecoleId ?? "");
    setRole(annonce?.role ?? "admin");
    setEpinglee(annonce?.epinglee ?? false);
    setBrouillon(annonce?.brouillon ?? false);
    setRecurrence(annonce?.recurrence ?? "unique");
    setPiecesJointes(annonce?.piecesJointes ?? []);
    setDateDebut(
      toInputDate(isDuplicate || !annonce ? Date.now() : annonce.dateDebut)
    );
    setDateFin(
      toInputDate(
        isDuplicate || !annonce ? Date.now() + 7 * MS_JOUR : annonce.dateFin
      )
    );
    setRecurrenceFin(
      annonce?.recurrenceFin ? toInputDate(annonce.recurrenceFin) : ""
    );
    setErr(null);
    setUploadErr(null);
    setShowTemplates(!annonce);
  }, [annonce?._id, annonce?._duplicate]);

  // ─── Fix #17 : ESC pour fermer ─────────────────
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape" && !saving) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [saving]);

  // ─── Fix #3 + #4 : Validations locales ─────────
  const dateError = useMemo(() => {
    const d1 = new Date(dateDebut).getTime();
    const d2 = new Date(dateFin).getTime();
    if (isNaN(d1) || isNaN(d2)) return "Dates invalides";
    if (d2 <= d1) return "La date de fin doit être après la date de début.";
    return null;
  }, [dateDebut, dateFin]);

  const recurrenceError = useMemo(() => {
    if (recurrence === "unique" || !recurrenceFin) return null;
    const fin = new Date(dateFin).getTime();
    const recFin = new Date(recurrenceFin).getTime();
    if (recFin <= fin) {
      return "La fin de récurrence doit être après la date de fin.";
    }
    return null;
  }, [recurrence, recurrenceFin, dateFin]);

  const titreError = titre.trim() ? null : "Titre requis";
  const messageError = message.trim() ? null : "Message requis";
  const cibleError =
    cible === "ecole" && !ecoleId ? "Sélectionnez une école" : null;

  const canSubmit =
    !saving &&
    !uploading &&
    !dateError &&
    !recurrenceError &&
    !titreError &&
    !messageError &&
    !cibleError;

  // ─── Fix #14 : Styles mémoïsés ─────────────────
  const inputStyle = useMemo(
    () => ({
      width: "100%",
      padding: "10px 12px",
      borderRadius: t.radius.sm,
      border: `1px solid ${t.border.default}`,
      background: t.surface.input ?? t.surface.elevated,
      color: t.text.primary,
      fontSize: t.font.size.sm,
      fontFamily: t.font.family,
      outline: "none",
      boxSizing: "border-box",
    }),
    [t]
  );

  const labelStyle = useMemo(
    () => ({
      fontSize: t.font.size.sm,
      fontWeight: 600,
      color: t.text.primary,
      display: "block",
      marginBottom: 4,
    }),
    [t]
  );

  const errorStyle = useMemo(
    () => ({
      fontSize: t.font.size.xs,
      color: "#EF4444",
      marginTop: 4,
      display: "flex",
      alignItems: "center",
      gap: 4,
    }),
    [t]
  );

  // ─── Fix #13 : Template avec confirmation ──────
  const applyTemplate = (tpl) => {
    if ((titre.trim() || message.trim()) && !isDuplicate) {
      const ok = window.confirm(
        "Remplacer le contenu actuel par ce modèle ?"
      );
      if (!ok) return;
    }
    setTitre(tpl.titre);
    setMessage(tpl.message);
    setType(tpl.type);
    setDateFin(toInputDate(Date.now() + tpl.dureeJours * MS_JOUR));
    setShowTemplates(false);
  };

  // ─── Fix #7 : Upload avec thumbnails ───────────
  const handleFileSelect = async (e) => {
    setUploadErr(null);
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const remaining = MAX_PJ - piecesJointes.length;
    if (files.length > remaining) {
      setUploadErr(`Maximum ${MAX_PJ} pièces jointes.`);
      return;
    }

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setUploadErr(`Type non autorisé : ${file.type}`);
        continue;
      }
      if (file.size > MAX_PJ_SIZE) {
        setUploadErr(`Fichier trop volumineux (max 5 MB) : ${file.name}`);
        continue;
      }
      const uploaded = await uploadFile(file);
      if (uploaded) {
        setPiecesJointes((prev) => [...prev, uploaded]);
      } else {
        setUploadErr("Erreur lors de l'upload");
      }
    }

    e.target.value = "";
  };

  const removePJ = (idx) => {
    setPiecesJointes((prev) => prev.filter((_, i) => i !== idx));
  };

  // ─── Fix #16 : Confirmation avant fermeture ────
  const handleClose = () => {
    const modified =
      titre.trim() ||
      message.trim() ||
      piecesJointes.length > 0 ||
      epinglee ||
      brouillon;
    if (modified && !saving) {
      const ok = window.confirm("Fermer sans enregistrer les modifications ?");
      if (!ok) return;
    }
    onClose();
  };

  // ─── Fix #10 : Toast de succès ─────────────────
  const handleSubmit = async () => {
    setErr(null);
    if (!canSubmit) return;
    setSaving(true);
    try {
      const tsDebut = new Date(dateDebut).getTime();
      const tsFin = new Date(dateFin).getTime();
      const tsRecFin = recurrenceFin
        ? new Date(recurrenceFin).getTime()
        : undefined;

      if (isEdit) {
        await modifierM({
          userId,
          annonceId: annonce._id,
          titre,
          message,
          type,
          dateFin: tsFin,
          piecesJointes,
          recurrence,
          recurrenceFin: tsRecFin,
        });
        toast.success("Annonce modifiée");
      } else {
        await creerM({
          userId,
          titre,
          message,
          type,
          cible,
          ecoleId: cible === "ecole" ? ecoleId : undefined,
          role: cible === "role" ? role : undefined,
          dateDebut: tsDebut,
          dateFin: tsFin,
          epinglee,
          brouillon,
          piecesJointes: piecesJointes.length > 0 ? piecesJointes : undefined,
          recurrence,
          recurrenceFin: tsRecFin,
        });
        toast.success(
          brouillon
            ? "Brouillon enregistré"
            : isDuplicate
            ? "Annonce dupliquée"
            : "Annonce publiée"
        );
      }
      onClose();
    } catch (e) {
      setErr(e.message ?? "Erreur inconnue");
    } finally {
      setSaving(false);
    }
  };

  // ─── Derived ───────────────────────────────────
  const typeConf = TYPES.find((x) => x.value === type) ?? TYPES[0];
  const modalTitle = isEdit
    ? "Modifier l'annonce"
    : isDuplicate && annonce?.titre  // dupliqué avec contenu existant
    ? "Dupliquer l'annonce"
    : "Nouvelle annonce";

  const tsDebut = new Date(dateDebut).getTime();
  const programmee = tsDebut > Date.now();
  const delayLabel = programmee ? formatDelay(tsDebut - Date.now()) : null;

  const selectedEcole = ecoles.find((ec) => ec._id === ecoleId);

  // ─── Fix #8 : Recherche école ──────────────────
  const filteredEcoles = useMemo(() => {
    if (!ecoleSearch.trim()) return ecoles.slice(0, 30);
    const q = ecoleSearch.toLowerCase();
    return ecoles
      .filter((ec) => ec.nom.toLowerCase().includes(q))
      .slice(0, 30);
  }, [ecoles, ecoleSearch]);

  // ════════════════════════════════════════════════
  // RENDU — Design modal propre
  // ════════════════════════════════════════════════
  return (
    <Modal
      open
      onClose={handleClose}
      title={modalTitle}
      maxWidth={980}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          maxHeight: "80vh",
          margin: `-${t.space.md} -${t.space.md} 0`,
        }}
      >
        {/* ═══════════ BODY SCROLLABLE ═══════════ */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: t.space.md,
            display: isMobile ? "flex" : "grid",
            flexDirection: isMobile ? "column" : undefined,
            gridTemplateColumns: isMobile ? undefined : "1.3fr 1fr",
            gap: t.space.lg,
          }}
        >
          {/* ─── COLONNE FORMULAIRE ─── */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: t.space.md,
              minWidth: 0,
            }}
          >
            {/* Templates */}
            {!isEdit && showTemplates && (
              <div
                style={{
                  padding: t.space.sm,
                  background: `${t.accent.primary}08`,
                  border: `1px solid ${t.accent.primary}20`,
                  borderRadius: t.radius.sm,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: t.font.size.xs,
                      fontWeight: 700,
                      color: t.accent.primary,
                      textTransform: "uppercase",
                    }}
                  >
                    <Sparkles size={12} />
                    Démarrer depuis un modèle
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowTemplates(false)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: t.text.muted,
                      padding: 2,
                      display: "flex",
                    }}
                    aria-label="Masquer les modèles"
                  >
                    <X size={14} />
                  </button>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 6,
                  }}
                >
                  {TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => applyTemplate(tpl)}
                      style={{
                        padding: "8px 10px",
                        background: t.surface.elevated,
                        border: `1px solid ${t.border.default}`,
                        borderRadius: t.radius.sm,
                        color: t.text.primary,
                        cursor: "pointer",
                        fontSize: t.font.size.xs,
                        textAlign: "left",
                        fontFamily: t.font.family,
                      }}
                    >
                      {tpl.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!isEdit && !showTemplates && (
              <button
                type="button"
                onClick={() => setShowTemplates(true)}
                style={{
                  alignSelf: "flex-start",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: t.font.size.xs,
                  color: t.accent.primary,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: 0,
                  fontFamily: t.font.family,
                  textDecoration: "underline",
                }}
              >
                <Sparkles size={12} />
                Voir les modèles
              </button>
            )}

            {/* Titre */}
            <div>
              <label style={labelStyle}>Titre *</label>
              <input
                type="text"
                value={titre}
                onChange={(e) => setTitre(e.target.value)}
                maxLength={120}
                placeholder="Ex : Maintenance prévue dimanche"
                style={{
                  ...inputStyle,
                  borderColor: titreError && titre ? "#EF4444" : t.border.default,
                }}
                autoFocus
              />
              {titreError && titre !== "" && (
                <div style={errorStyle}>
                  <AlertCircle size={12} />
                  {titreError}
                </div>
              )}
            </div>

            {/* Message */}
            <div>
              <label style={labelStyle}>Message *</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={2000}
                rows={4}
                placeholder="Décrivez l'annonce…"
                style={{ ...inputStyle, resize: "vertical", minHeight: 100 }}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: 2,
                }}
              >
                <div style={{ fontSize: t.font.size.xs, color: t.text.muted }}>
                  {messageError && message === "" ? "" : ""}
                </div>
                <div style={{ fontSize: t.font.size.xs, color: t.text.muted }}>
                  {message.length} / 2000
                </div>
              </div>
            </div>

            {/* Type */}
            <div>
              <label style={labelStyle}>Type</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {TYPES.map((ty) => {
                  const active = type === ty.value;
                  return (
                    <button
                      key={ty.value}
                      type="button"
                      onClick={() => setType(ty.value)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "6px 12px",
                        borderRadius: t.radius.sm,
                        border: `1px solid ${
                          active ? ty.color : t.border.default
                        }`,
                        background: active ? `${ty.color}15` : "transparent",
                        color: active ? ty.color : t.text.secondary,
                        cursor: "pointer",
                        fontSize: t.font.size.xs,
                        fontWeight: 600,
                        fontFamily: t.font.family,
                      }}
                    >
                      <ty.Icon size={12} />
                      {ty.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Ciblage */}
            {!isEdit && (
              <div>
                <label style={labelStyle}>Ciblage</label>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {[
                    { v: "toutes", l: "Toutes les écoles" },
                    { v: "ecole", l: "Une école" },
                    { v: "role", l: "Un rôle" },
                  ].map((c) => (
                    <button
                      key={c.v}
                      type="button"
                      onClick={() => setCible(c.v)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: t.radius.sm,
                        border: `1px solid ${
                          cible === c.v ? t.accent.primary : t.border.default
                        }`,
                        background:
                          cible === c.v
                            ? `${t.accent.primary}15`
                            : "transparent",
                        color:
                          cible === c.v
                            ? t.accent.primary
                            : t.text.secondary,
                        cursor: "pointer",
                        fontSize: t.font.size.xs,
                        fontWeight: 600,
                        fontFamily: t.font.family,
                      }}
                    >
                      {c.l}
                    </button>
                  ))}
                </div>

                {/* Fix #8 : Recherche école */}
                {cible === "ecole" && (
                  <div style={{ marginTop: 8 }}>
                    <input
                      type="text"
                      value={ecoleSearch}
                      onChange={(e) => setEcoleSearch(e.target.value)}
                      placeholder="Rechercher une école…"
                      style={inputStyle}
                    />
                    {ecoleSearch && (
                      <div
                        style={{
                          marginTop: 4,
                          maxHeight: 160,
                          overflowY: "auto",
                          border: `1px solid ${t.border.default}`,
                          borderRadius: t.radius.sm,
                          background: t.surface.elevated,
                        }}
                      >
                        {filteredEcoles.length === 0 ? (
                          <div
                            style={{
                              padding: 8,
                              fontSize: t.font.size.xs,
                              color: t.text.muted,
                              textAlign: "center",
                            }}
                          >
                            Aucune école trouvée
                          </div>
                        ) : (
                          filteredEcoles.map((ec) => (
                            <button
                              key={ec._id}
                              type="button"
                              onClick={() => {
                                setEcoleId(ec._id);
                                setEcoleSearch(ec.nom);
                              }}
                              style={{
                                display: "block",
                                width: "100%",
                                textAlign: "left",
                                padding: "8px 10px",
                                background:
                                  ecoleId === ec._id
                                    ? `${t.accent.primary}15`
                                    : "transparent",
                                border: "none",
                                borderBottom: `1px solid ${t.border.subtle}`,
                                cursor: "pointer",
                                fontSize: t.font.size.sm,
                                color:
                                  ecoleId === ec._id
                                    ? t.accent.primary
                                    : t.text.primary,
                                fontFamily: t.font.family,
                              }}
                            >
                              {ec.nom}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                    {selectedEcole && !ecoleSearch && (
                      <div
                        style={{
                          marginTop: 6,
                          fontSize: t.font.size.xs,
                          color: t.text.muted,
                        }}
                      >
                        Sélectionné : <strong>{selectedEcole.nom}</strong>
                      </div>
                    )}
                    {cibleError && (
                      <div style={errorStyle}>
                        <AlertCircle size={12} />
                        {cibleError}
                      </div>
                    )}
                  </div>
                )}

                {/* Fix #12 : Rôles complets */}
                {cible === "role" && (
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    style={{ ...inputStyle, marginTop: 8 }}
                  >
                    {Object.entries(ROLE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Dates */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: t.space.sm,
              }}
            >
              <div>
                <label style={labelStyle}>Début</label>
                <input
                  type="datetime-local"
                  value={dateDebut}
                  onChange={(e) => setDateDebut(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Fin *</label>
                <input
                  type="datetime-local"
                  value={dateFin}
                  onChange={(e) => setDateFin(e.target.value)}
                  style={{
                    ...inputStyle,
                    borderColor: dateError ? "#EF4444" : t.border.default,
                  }}
                />
              </div>
            </div>
            {dateError && (
              <div style={errorStyle}>
                <AlertCircle size={12} />
                {dateError}
              </div>
            )}

            {/* Récurrence */}
            <div
              style={{
                padding: t.space.sm,
                background: `${t.accent.primary}08`,
                border: `1px solid ${t.accent.primary}20`,
                borderRadius: t.radius.sm,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Repeat size={14} color={t.accent.primary} />
                <span
                  style={{
                    fontSize: t.font.size.sm,
                    fontWeight: 600,
                    color: t.text.primary,
                  }}
                >
                  Récurrence
                </span>
              </div>
              <select
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value)}
                style={inputStyle}
              >
                {RECURRENCES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              {recurrence !== "unique" && (
                <>
                  <label style={labelStyle}>
                    Fin de la récurrence (optionnel)
                  </label>
                  <input
                    type="datetime-local"
                    value={recurrenceFin}
                    onChange={(e) => setRecurrenceFin(e.target.value)}
                    style={{
                      ...inputStyle,
                      borderColor: recurrenceError
                        ? "#EF4444"
                        : t.border.default,
                    }}
                  />
                  {recurrenceError ? (
                    <div style={errorStyle}>
                      <AlertCircle size={12} />
                      {recurrenceError}
                    </div>
                  ) : (
                    <div
                      style={{ fontSize: t.font.size.xs, color: t.text.muted }}
                    >
                      L'annonce sera recréée automatiquement selon cette
                      fréquence jusqu'à cette date.
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Pièces jointes */}
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 4,
                }}
              >
                <label style={{ ...labelStyle, marginBottom: 0 }}>
                  Pièces jointes ({piecesJointes.length}/{MAX_PJ})
                </label>
                {piecesJointes.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setPiecesJointes([])}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: t.font.size.xs,
                      color: "#EF4444",
                      padding: 0,
                      fontFamily: t.font.family,
                    }}
                  >
                    Tout supprimer
                  </button>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {piecesJointes.map((pj, i) => {
                  const isImage = pj.type.startsWith("image/");
                  return (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: 8,
                        background: t.surface.elevated,
                        border: `1px solid ${t.border.subtle}`,
                        borderRadius: t.radius.sm,
                      }}
                    >
                      {/* Thumbnail ou icône */}
                      {isImage ? (
                        <img
                          src={pj.url}
                          alt={pj.nom}
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: t.radius.sm,
                            objectFit: "cover",
                            flexShrink: 0,
                            border: `1px solid ${t.border.subtle}`,
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: t.radius.sm,
                            background: `${t.accent.primary}15`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <FileText size={18} color={t.accent.primary} />
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: t.font.size.xs,
                            fontWeight: 600,
                            color: t.text.primary,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {pj.nom}
                        </div>
                        <div style={{ fontSize: 10, color: t.text.muted }}>
                          {formatBytes(pj.taille)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removePJ(i)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: 4,
                          color: "#EF4444",
                        }}
                        aria-label="Supprimer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}

                {piecesJointes.length < MAX_PJ && (
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      padding: "10px 12px",
                      border: `1px dashed ${t.border.default}`,
                      borderRadius: t.radius.sm,
                      background: "transparent",
                      color: t.text.secondary,
                      cursor: uploading ? "wait" : "pointer",
                      fontSize: t.font.size.xs,
                      fontFamily: t.font.family,
                    }}
                  >
                    <input
                      type="file"
                      multiple
                      accept={ALLOWED_TYPES.join(",")}
                      onChange={handleFileSelect}
                      disabled={uploading}
                      style={{ display: "none" }}
                    />
                    {uploading ? (
                      <>
                        <Loader
                          size={14}
                          style={{ animation: "spin 1s linear infinite" }}
                        />
                        Upload en cours…
                      </>
                    ) : (
                      <>
                        <Upload size={14} />
                        Ajouter un fichier (PDF ou image, max 5 MB)
                      </>
                    )}
                  </label>
                )}

                {uploadErr && (
                  <div style={errorStyle}>
                    <AlertCircle size={12} />
                    {uploadErr}
                  </div>
                )}
              </div>
            </div>

            {/* Options : Épingler + Brouillon */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: t.space.sm,
                  background: epinglee
                    ? `${t.accent.primary}10`
                    : "transparent",
                  border: `1px solid ${
                    epinglee ? t.accent.primary : t.border.default
                  }`,
                  borderRadius: t.radius.sm,
                  cursor: "pointer",
                  fontSize: t.font.size.sm,
                  color: t.text.primary,
                  fontFamily: t.font.family,
                }}
              >
                <input
                  type="checkbox"
                  checked={epinglee}
                  onChange={(e) => setEpinglee(e.target.checked)}
                  style={{ cursor: "pointer" }}
                />
                <Pin size={14} color={t.accent.primary} />
                <span>Épingler en haut de la liste</span>
              </label>

              {!isEdit && (
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: t.space.sm,
                    background: brouillon ? "#FEF3C7" : "transparent",
                    border: `1px solid ${
                      brouillon ? "#F59E0B" : t.border.default
                    }`,
                    borderRadius: t.radius.sm,
                    cursor: "pointer",
                    fontSize: t.font.size.sm,
                    color: t.text.primary,
                    fontFamily: t.font.family,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={brouillon}
                    onChange={(e) => setBrouillon(e.target.checked)}
                    style={{ cursor: "pointer" }}
                  />
                  <File size={14} color="#F59E0B" />
                  <span>Enregistrer comme brouillon (non publié)</span>
                </label>
              )}
            </div>

            {err && (
              <div
                style={{
                  padding: t.space.sm,
                  background: "#FEF2F2",
                  border: "1px solid #FECACA",
                  borderRadius: t.radius.sm,
                  color: "#991B1B",
                  fontSize: t.font.size.sm,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <AlertCircle size={14} />
                {err}
              </div>
            )}
          </div>

          {/* ─── COLONNE APERÇU (desktop) ─── */}
          {!isMobile && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: t.space.sm,
                minWidth: 0,
              }}
            >
              <div
                style={{
                  fontSize: t.font.size.xs,
                  fontWeight: 700,
                  color: t.text.muted,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                Aperçu
              </div>

              <div
                style={{
                  padding: t.space.md,
                  background: t.surface.hover ?? "#FAFAFA",
                  borderRadius: t.radius.lg,
                  border: `1px dashed ${t.border.default}`,
                  position: "sticky",
                  top: 0,
                }}
              >
                {/* Simulation bannière */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    padding: "12px 16px",
                    background: `${typeConf.color}10`,
                    border: `1px solid ${typeConf.color}40`,
                    borderLeft: `4px solid ${typeConf.color}`,
                    borderRadius: t.radius.md,
                  }}
                >
                  <typeConf.Icon
                    size={20}
                    color={typeConf.color}
                    style={{ flexShrink: 0, marginTop: 2 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: t.font.size.sm,
                        fontWeight: 700,
                        color: t.text.primary,
                        marginBottom: 4,
                        flexWrap: "wrap",
                      }}
                    >
                      {epinglee && <Pin size={12} color={t.accent.primary} />}
                      {titre || "Titre de l'annonce"}
                    </div>
                    <div
                      style={{
                        fontSize: t.font.size.sm,
                        color: t.text.secondary,
                        whiteSpace: "pre-wrap",
                        lineHeight: 1.5,
                      }}
                    >
                      {message || "Le contenu apparaîtra ici…"}
                    </div>

                    {/* PJ dans l'aperçu */}
                    {piecesJointes.length > 0 && (
                      <div
                        style={{
                          marginTop: 8,
                          display: "flex",
                          flexDirection: "column",
                          gap: 4,
                        }}
                      >
                        {piecesJointes.map((pj, i) => (
                          <div
                            key={i}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              fontSize: t.font.size.xs,
                              color: t.accent.primary,
                              textDecoration: "underline",
                            }}
                          >
                            <FileText size={12} />
                            {pj.nom}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Info programmation */}
                {programmee && delayLabel && (
                  <div
                    style={{
                      marginTop: 8,
                      padding: "6px 10px",
                      background: "#FEF3C7",
                      border: "1px solid #FDE68A",
                      borderRadius: t.radius.sm,
                      fontSize: t.font.size.xs,
                      color: "#92400E",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    ⏱ Sera publiée {delayLabel}
                  </div>
                )}

                {/* Récap technique */}
                <div
                  style={{
                    marginTop: t.space.md,
                    padding: t.space.sm,
                    background: t.surface.elevated,
                    borderRadius: t.radius.sm,
                    fontSize: t.font.size.xs,
                    color: t.text.muted,
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  <div>
                    <strong>Type :</strong> {typeConf.label}
                  </div>
                  <div>
                    <strong>Cible :</strong>{" "}
                    {cible === "toutes"
                      ? "Toutes les écoles"
                      : cible === "ecole"
                      ? selectedEcole?.nom ?? "Non sélectionnée"
                      : ROLE_LABELS[role] ?? role}
                  </div>
                  <div>
                    <strong>Épinglée :</strong> {epinglee ? "Oui" : "Non"}
                  </div>
                  <div>
                    <strong>Brouillon :</strong> {brouillon ? "Oui" : "Non"}
                  </div>
                  <div>
                    <strong>Récurrence :</strong>{" "}
                    {RECURRENCES.find((r) => r.value === recurrence)?.label ??
                      "Unique"}
                  </div>
                  <div>
                    <strong>PJ :</strong> {piecesJointes.length}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ═══════════ FOOTER STICKY ═══════════ */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: t.space.sm,
            padding: `${t.space.md} ${t.space.md}`,
            borderTop: `1px solid ${t.border.subtle}`,
            background: t.surface.elevated,
            flexShrink: 0,
            flexWrap: "wrap",
          }}
        >
          {/* Toggle preview mobile */}
          {isMobile ? (
            <button
              type="button"
              onClick={() => setShowPreview((v) => !v)}
              style={{
                background: "none",
                border: `1px solid ${t.border.default}`,
                borderRadius: t.radius.sm,
                cursor: "pointer",
                padding: "8px 12px",
                color: t.text.secondary,
                fontSize: t.font.size.xs,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontFamily: t.font.family,
              }}
            >
              {showPreview ? <EyeOff size={14} /> : <Eye size={14} />}
              {showPreview ? "Masquer l'aperçu" : "Voir l'aperçu"}
            </button>
          ) : (
            <div />
          )}

          <div style={{ display: "flex", gap: t.space.sm, marginLeft: "auto" }}>
            <Button variant="ghost" onClick={handleClose} disabled={saving}>
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={!canSubmit}>
              {saving
                ? "Enregistrement…"
                : uploading
                ? "Upload en cours…"
                : isEdit
                ? "Enregistrer"
                : brouillon
                ? "Enregistrer le brouillon"
                : "Publier"}
            </Button>
          </div>
        </div>

        {/* Aperçu mobile (accordéon en bas) */}
        {isMobile && showPreview && (
          <div
            style={{
              padding: t.space.md,
              borderTop: `1px solid ${t.border.subtle}`,
              background: t.surface.hover ?? "#FAFAFA",
            }}
          >
            <div
              style={{
                fontSize: t.font.size.xs,
                fontWeight: 700,
                color: t.text.muted,
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              Aperçu
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                padding: "12px 16px",
                background: `${typeConf.color}10`,
                border: `1px solid ${typeConf.color}40`,
                borderLeft: `4px solid ${typeConf.color}`,
                borderRadius: t.radius.md,
              }}
            >
              <typeConf.Icon
                size={20}
                color={typeConf.color}
                style={{ flexShrink: 0, marginTop: 2 }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: t.font.size.sm,
                    fontWeight: 700,
                    color: t.text.primary,
                    marginBottom: 4,
                  }}
                >
                  {epinglee && <Pin size={12} color={t.accent.primary} />}
                  {titre || "Titre de l'annonce"}
                </div>
                <div
                  style={{
                    fontSize: t.font.size.sm,
                    color: t.text.secondary,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {message || "Le contenu apparaîtra ici…"}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default AnnonceModal;