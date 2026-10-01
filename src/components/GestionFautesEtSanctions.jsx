// src/components/GestionFautesEtSanctions.jsx
import { useState, useMemo, useEffect, useRef, useCallback, useId } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useConfirm } from "@/hooks/useConfirm";
import { ConfirmDialog } from "./ConfirmDialog";
import toast from "react-hot-toast";
import {
  Loader, Plus, Trash2, Edit2, Search, X,
  Gavel, Shield, AlertTriangle, Check,
} from "lucide-react";

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
// KEYFRAMES MODULE-LEVEL (rendus UNE fois)
// ════════════════════════════════════════════════════════════════════
const GfsKeyframes = (
  <style>{`
    @keyframes gfs-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    @keyframes gfs-fade-in { from { opacity: 0; } to { opacity: 1; } }
    @keyframes gfs-slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
    .gfs-spin { animation: gfs-spin 1s linear infinite; }
    .gfs-fade-in { animation: gfs-fade-in 0.18s ease-out; }
    .gfs-slide-up { animation: gfs-slide-up 0.25s cubic-bezier(0.22, 1, 0.36, 1); }
    @media (prefers-reduced-motion: reduce) {
      .gfs-spin, .gfs-fade-in, .gfs-slide-up { animation: none !important; }
    }
  `}</style>
);

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
  focusColor, ariaLabel, ariaBusy, ariaPressed, ariaChecked, role, ...rest
}) {
  const [pressed, setPressed] = useState(false);
  const [focused, setFocused] = useState(false);
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-busy={ariaBusy}
      aria-pressed={ariaPressed}
      aria-checked={ariaChecked}
      role={role}
      onPointerDown={() => !disabled && setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
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
// BADGE DE GRAVITÉ
// ════════════════════════════════════════════════════════════════════
function GraviteBadge({ gravite, dark }) {
  const config =
    gravite === "Grave"
      ? {
          bg: dark ? "#7F1D1D" : "#FEE2E2",
          color: dark ? "#F87171" : "#B91C1C",
          icon: <AlertTriangle size={10} aria-hidden="true" />,
        }
      : gravite === "Moyenne"
      ? {
          bg: dark ? "#78350F" : "#FEF3C7",
          color: dark ? "#FBBF24" : "#92400E",
          icon: <Shield size={10} aria-hidden="true" />,
        }
      : {
          bg: dark ? "#064E3B" : "#D1FAE5",
          color: dark ? "#34D399" : "#065F46",
          icon: <Shield size={10} aria-hidden="true" />,
        };

  return (
    <span
      aria-label={`Gravité : ${gravite}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        background: config.bg,
        color: config.color,
        padding: "2px 8px",
        borderRadius: 10,
        fontSize: 10,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {config.icon}
      {gravite}
    </span>
  );
}

// ════════════════════════════════════════════════════════════════════
// TAB BUTTON
// ════════════════════════════════════════════════════════════════════
function TabButton({
  id, label, Icon, count, isActive, onClick, tabRef,
  accent, textSecondary, accentBg, dark, isMobile,
}) {
  const [pressed, setPressed] = useState(false);
  const [focused, setFocused] = useState(false);

  return (
    <button
      ref={tabRef}
      type="button"
      onClick={onClick}
      role="tab"
      id={`tab-${id}`}
      aria-selected={isActive}
      aria-controls={`panel-${id}`}
      tabIndex={isActive ? 0 : -1}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        ...TAP_BASE,
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: isMobile ? "12px 14px" : "12px 18px",
        border: "none",
        background: "transparent",
        color: isActive ? accent : textSecondary,
        fontWeight: isActive ? 700 : 500,
        borderBottom: isActive ? `3px solid ${accent}` : "3px solid transparent",
        cursor: "pointer",
        fontSize: isMobile ? 14 : 15,
        flexShrink: 0,
        marginBottom: -2,
        outline: "none",
        borderRadius: "6px 6px 0 0",
        transform: pressed ? "scale(0.97)" : "scale(1)",
        transition: "color 0.15s, border-color 0.15s, transform 0.1s",
        fontFamily: "inherit",
        ...(focused ? FOCUS_RING(accent) : null),
      }}
    >
      <Icon size={16} aria-hidden="true" />
      {label}
      <span
        aria-label={`${count} ${count > 1 ? "éléments" : "élément"}`}
        style={{
          background: isActive ? accentBg : (dark ? "#334155" : "#F1F5F9"),
          color: isActive ? accent : textSecondary,
          padding: "1px 8px",
          borderRadius: 10,
          fontSize: 10.5,
          fontWeight: 700,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        <span aria-hidden="true">{count}</span>
      </span>
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════
// MODALE AJOUT / ÉDITION
// ════════════════════════════════════════════════════════════════════
function EntityModal({
  open, onClose, mode, initialData, onSubmit, submitting, dark, isMobile,
}) {
  const titleId = useId();
  const libelleId = useId();
  const panelRef = useRef(null);
  const [libelle, setLibelle] = useState("");
  const [gravite, setGravite] = useState("Légère");
  const [focused, setFocused] = useState(false);

  useFocusTrap(panelRef, open);

  useEffect(() => {
    if (open) {
      if (initialData) {
        setLibelle(initialData.libelle || "");
        setGravite(initialData.gravite || "Légère");
      } else {
        setLibelle("");
        setGravite("Légère");
      }
    }
  }, [open, initialData]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === "Escape" && !submitting) onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, submitting, onClose]);

  if (!open) return null;

  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const inputBg = dark ? "#0F172A" : "#F8FAFC";
  const inputText = dark ? "#F1F5F9" : "#1E293B";
  const accent = dark ? "#818CF8" : "#4F46E5";
  const accentBg = dark ? "#312E81" : "#EEF2FF";

  const isEdit = !!initialData;
  const isFaute = mode === "faute";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!libelle.trim()) return;
    await onSubmit({ libelle: libelle.trim(), gravite: isFaute ? gravite : undefined });
    setLibelle("");
    setGravite("Légère");
  };

  const inputStyle = {
    ...TAP_BASE,
    width: "100%",
    padding: isMobile ? "12px 14px" : "10px 14px",
    border: `1px solid ${focused ? accent : cardBorder}`,
    borderRadius: 10,
    fontSize: isMobile ? 16 : 14,
    outline: "none",
    background: inputBg,
    color: inputText,
    boxSizing: "border-box",
    fontFamily: "inherit",
    transition: "border-color 0.2s",
  };

  const labelStyle = {
    display: "block",
    fontSize: 11,
    fontWeight: 700,
    color: dark ? "#CBD5E1" : "#374151",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  };

  const content = (
    <>
      {isMobile && (
        <div
          aria-hidden="true"
          style={{
            width: 40, height: 4, borderRadius: 2,
            background: dark ? "#475569" : "#CBD5E1",
            margin: "0 auto 14px",
          }}
        />
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <div
            aria-hidden="true"
            style={{
              width: 32, height: 32, borderRadius: 8,
              background: accentBg, color: accent,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {isFaute ? <Gavel size={16} /> : <Shield size={16} />}
          </div>
          <h3 id={titleId} style={{ margin: 0, fontSize: isMobile ? 16 : 17, fontWeight: 700, color: textPrimary }}>
            {isEdit ? `Modifier la ${isFaute ? "faute" : "sanction"}` : `Nouvelle ${isFaute ? "faute" : "sanction"}`}
          </h3>
        </div>
        <Pressable
          onClick={onClose}
          disabled={submitting}
          focusColor={accent}
          ariaLabel="Fermer"
          style={{
            background: "none", border: "none", color: textSecondary,
            padding: 8, minWidth: 44, minHeight: 44,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <X size={22} aria-hidden="true" />
        </Pressable>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 14 }}>
          <label htmlFor={libelleId} style={labelStyle}>Libellé</label>
          <input
            id={libelleId}
            type="text"
            value={libelle}
            onChange={(e) => setLibelle(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={isFaute ? "Ex : Chewing-gum" : "Ex : Retenue"}
            autoFocus
            enterKeyHint="done"
            autoCorrect="off"
            spellCheck="false"
            aria-label="Libellé"
            style={inputStyle}
          />
        </div>

        {isFaute && (
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Gravité</label>
            <div role="radiogroup" aria-label="Gravité de la faute" style={{ display: "flex", gap: 8 }}>
              {["Légère", "Moyenne", "Grave"].map((g) => {
                const isActive = gravite === g;
                const gColor = g === "Grave" ? "#EF4444" : g === "Moyenne" ? "#F59E0B" : "#10B981";
                return (
                  <Pressable
                    key={g}
                    onClick={() => setGravite(g)}
                    focusColor={gColor}
                    role="radio"
                    ariaChecked={isActive}
                    style={{
                      flex: 1,
                      padding: "12px 12px",
                      borderRadius: 10,
                      border: `1px solid ${isActive ? gColor : cardBorder}`,
                      background: isActive ? `${gColor}20` : "transparent",
                      color: isActive ? gColor : textSecondary,
                      fontWeight: 600,
                      fontSize: 13,
                    }}
                  >
                    {g}
                  </Pressable>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 10, flexDirection: isMobile ? "column" : "row" }}>
          <Pressable
            onClick={onClose}
            disabled={submitting}
            focusColor={accent}
            style={{
              flex: isMobile ? "none" : 1,
              padding: "12px 16px", borderRadius: 12,
              border: `1px solid ${cardBorder}`,
              background: "transparent",
              color: dark ? "#CBD5E1" : "#475569",
              fontWeight: 600, fontSize: 14,
              order: isMobile ? 2 : 1,
            }}
          >
            Annuler
          </Pressable>
          <Pressable
            type="submit"
            disabled={submitting || !libelle.trim()}
            focusColor={accent}
            ariaBusy={submitting}
            style={{
              flex: isMobile ? "none" : 2,
              padding: "12px 18px", borderRadius: 12, border: "none",
              background: submitting || !libelle.trim() ? "#A5B4FC" : accent,
              color: "#FFFFFF",
              fontWeight: 700, fontSize: 14,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              order: isMobile ? 1 : 2,
            }}
          >
            {submitting ? (
              <Loader size={16} className="gfs-spin" role="status" aria-label="Enregistrement" />
            ) : (
              <Check size={16} aria-hidden="true" />
            )}
            {submitting ? "Enregistrement…" : isEdit ? "Mettre à jour" : "Ajouter"}
          </Pressable>
        </div>
      </form>
    </>
  );

  return (
    <>
      {GfsKeyframes}
      <div
        onClick={onClose}
        className="gfs-fade-in"
        aria-hidden="true"
        style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.5)",
          display: isMobile ? "flex" : "flex",
          alignItems: isMobile ? "flex-end" : "center",
          justifyContent: "center",
          zIndex: 1200,
          padding: isMobile ? 0 : 16,
        }}
      >
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onClick={(e) => e.stopPropagation()}
          tabIndex={-1}
          className={isMobile ? "gfs-slide-up" : ""}
          style={{
            background: cardBg,
            borderRadius: isMobile ? "20px 20px 0 0" : 16,
            padding: isMobile ? "12px 16px 0" : 24,
            ...(isMobile ? SAFE_BOTTOM : null),
            width: "100%",
            maxWidth: isMobile ? "100%" : 480,
            maxHeight: isMobile ? "90vh" : "auto",
            overflowY: isMobile ? "auto" : "visible",
            boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
            border: isMobile ? "none" : `1px solid ${cardBorder}`,
            outline: "none",
            ...(isMobile ? SCROLL_AREA : null),
          }}
        >
          {content}
        </div>
      </div>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════
// CARTE ITEM
// ════════════════════════════════════════════════════════════════════
function ItemCard({ item, type, dark, isMobile, onEdit, onDelete }) {
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const accentBg = dark ? "#312E81" : "#EEF2FF";
  const accent = dark ? "#818CF8" : "#4F46E5";
  const isFaute = type === "faute";

  return (
    <article
      style={{
        background: cardBg,
        borderRadius: 12,
        padding: isMobile ? "10px 12px" : "12px 14px",
        boxShadow: dark ? "0 1px 2px rgba(0,0,0,0.25)" : "0 1px 2px rgba(0,0,0,0.04)",
        border: `1px solid ${cardBorder}`,
        display: "flex",
        alignItems: "center",
        gap: 10,
        minWidth: 0,
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 36, height: 36, borderRadius: "50%",
          background: accentBg, color: accent,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {isFaute ? <Gavel size={18} /> : <Shield size={18} />}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontWeight: 600,
            fontSize: isMobile ? 13.5 : 14,
            color: textPrimary,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {item.libelle}
        </div>
        {isFaute && item.gravite && (
          <div style={{ marginTop: 3 }}>
            <GraviteBadge gravite={item.gravite} dark={dark} />
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
        <Pressable
          onClick={onEdit}
          focusColor={accent}
          ariaLabel={`Modifier ${item.libelle}`}
          style={{
            background: "transparent",
            border: `1px solid ${cardBorder}`,
            borderRadius: 8,
            padding: isMobile ? 10 : 8,
            minWidth: 44,
            minHeight: 44,
            color: accent,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <Edit2 size={14} aria-hidden="true" />
        </Pressable>
        <Pressable
          onClick={onDelete}
          focusColor="#EF4444"
          ariaLabel={`Supprimer ${item.libelle}`}
          style={{
            background: "transparent",
            border: `1px solid ${cardBorder}`,
            borderRadius: 8,
            padding: isMobile ? 10 : 8,
            minWidth: 44,
            minHeight: 44,
            color: "#EF4444",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <Trash2 size={14} aria-hidden="true" />
        </Pressable>
      </div>
    </article>
  );
}

// ════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ════════════════════════════════════════════════════════════════════
export function GestionFautesEtSanctions({
  fautes, addFaute, updateFaute, removeFaute, ecoleId, sanctions, userId,
}) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();
  const { confirm, dialogProps } = useConfirm();

  const [subTab, setSubTab] = useState("fautes");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  const tabRefs = useRef({});

  const addSanction = useMutation(api.sanctions.add);
  const updateSanction = useMutation(api.sanctions.update);
  const removeSanction = useMutation(api.sanctions.remove);

  const colors = useMemo(() => ({
    textPrimary: dark ? "#F1F5F9" : "#1E293B",
    textSecondary: dark ? "#94A3B8" : "#64748B",
    cardBg: dark ? "#1E293B" : "#FFFFFF",
    cardBorder: dark ? "#334155" : "#E2E8F0",
    inputBg: dark ? "#0F172A" : "#F8FAFC",
    accent: dark ? "#818CF8" : "#4F46E5",
    accentBg: dark ? "#312E81" : "#EEF2FF",
  }), [dark]);

  const {
    textPrimary, textSecondary, cardBg, cardBorder, inputBg, accent, accentBg,
  } = colors;

  const filteredFautes = useMemo(() => {
    if (!search.trim()) return fautes;
    const q = search.toLowerCase();
    return fautes.filter((f) => f.libelle.toLowerCase().includes(q));
  }, [fautes, search]);

  const filteredSanctions = useMemo(() => {
    if (!search.trim()) return sanctions;
    const q = search.toLowerCase();
    return sanctions.filter((s) => s.libelle.toLowerCase().includes(q));
  }, [sanctions, search]);

  useEffect(() => { setSearch(""); }, [subTab]);

  const tabs = useMemo(() => [
    { id: "fautes", label: "Fautes", Icon: Gavel, count: fautes.length },
    { id: "sanctions", label: "Sanctions", Icon: Shield, count: sanctions.length },
  ], [fautes.length, sanctions.length]);

  const handleTabKeyDown = useCallback((e, currentIndex) => {
    let nextIndex = null;
    if (e.key === "ArrowRight") nextIndex = (currentIndex + 1) % tabs.length;
    else if (e.key === "ArrowLeft") nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") nextIndex = 0;
    else if (e.key === "End") nextIndex = tabs.length - 1;

    if (nextIndex !== null) {
      e.preventDefault();
      const nextTab = tabs[nextIndex];
      setSubTab(nextTab.id);
      tabRefs.current[nextTab.id]?.focus();
    }
  }, [tabs]);

  useEffect(() => {
    const refs = tabRefs.current;
    return () => { Object.keys(refs).forEach((key) => delete refs[key]); };
  }, []);

  const handleOpenAdd = useCallback(() => { setEditItem(null); setShowModal(true); }, []);
  const handleOpenEdit = useCallback((item) => { setEditItem(item); setShowModal(true); }, []);
  const handleCloseModal = useCallback(() => { setShowModal(false); setEditItem(null); }, []);

  const handleSubmit = useCallback(async (data) => {
    setSubmitting(true);
    try {
      if (subTab === "fautes") {
        if (editItem) {
          await updateFaute({ id: editItem._id, libelle: data.libelle, gravite: data.gravite, userId });
          toast.success("Faute mise à jour");
        } else {
          await addFaute({ libelle: data.libelle, gravite: data.gravite, ecoleId, userId });
          toast.success("Faute ajoutée");
        }
      } else {
        if (editItem) {
          await updateSanction({ id: editItem._id, libelle: data.libelle, userId });
          toast.success("Sanction mise à jour");
        } else {
          await addSanction({ libelle: data.libelle, ecoleId, userId });
          toast.success("Sanction ajoutée");
        }
      }
      handleCloseModal();
    } catch (err) {
      toast.error(err.message);
    } finally { setSubmitting(false); }
  }, [subTab, editItem, updateFaute, addFaute, updateSanction, addSanction, userId, ecoleId, handleCloseModal]);

  const handleDelete = useCallback(async (item) => {
    const label = subTab === "fautes" ? "faute" : "sanction";
    const ok = await confirm(`Supprimer la ${label}`, `Voulez-vous vraiment supprimer « ${item.libelle} » ?`);
    if (!ok) return;
    try {
      if (subTab === "fautes") {
        await removeFaute({ id: item._id, userId });
        toast.success("Faute supprimée");
      } else {
        await removeSanction({ id: item._id, userId });
        toast.success("Sanction supprimée");
      }
    } catch (err) { toast.error(err.message); }
  }, [subTab, removeFaute, removeSanction, userId, confirm]);

  const list = subTab === "fautes" ? filteredFautes : filteredSanctions;

  return (
    <div
      style={{
        maxWidth: 800, margin: "0 auto",
        padding: isMobile ? "10px 8px 90px" : "20px 16px 40px",
        width: "100%", boxSizing: "border-box",
      }}
    >
      {GfsKeyframes}

      {/* ═══════════ EN-TÊTE ═══════════ */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: isMobile ? 12 : 20 }}>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ fontSize: isMobile ? 17 : 22, fontWeight: 700, color: textPrimary, margin: 0, lineHeight: 1.2 }}>
            Discipline
          </h2>
          <p style={{ color: textSecondary, marginTop: 2, marginBottom: 0, fontSize: isMobile ? 11.5 : 13 }}>
            {fautes.length} type{fautes.length > 1 ? "s" : ""} de faute{fautes.length > 1 ? "s" : ""} · {sanctions.length} sanction{sanctions.length > 1 ? "s" : ""}
          </p>
        </div>
        {!isMobile && (
          <Pressable
            onClick={handleOpenAdd}
            focusColor={accent}
            ariaLabel="Ajouter un élément"
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "10px 14px",
              background: accent, color: "white",
              border: "none", borderRadius: 10,
              fontWeight: 700, fontSize: 13,
            }}
          >
            <Plus size={15} aria-hidden="true" /> Ajouter
          </Pressable>
        )}
      </div>

      {/* ═══════════ TABS ═══════════ */}
      <div
        role="tablist"
        aria-label="Types de règles disciplinaires"
        style={{
          display: "flex", gap: 4,
          borderBottom: `2px solid ${cardBorder}`,
          marginBottom: isMobile ? 12 : 16,
          overflowX: "auto", whiteSpace: "nowrap", scrollbarWidth: "none",
          ...SCROLL_AREA,
        }}
      >
        {tabs.map((t, index) => (
          <TabButton
            key={t.id}
            id={t.id}
            label={t.label}
            Icon={t.Icon}
            count={t.count}
            isActive={subTab === t.id}
            onClick={() => setSubTab(t.id)}
            onKeyDown={(e) => handleTabKeyDown(e, index)}
            tabRef={(el) => { if (el) tabRefs.current[t.id] = el; else delete tabRefs.current[t.id]; }}
            accent={accent}
            textSecondary={textSecondary}
            accentBg={accentBg}
            dark={dark}
            isMobile={isMobile}
          />
        ))}
      </div>

      {/* ═══════════ RECHERCHE ═══════════ */}
      <div
        style={{
          display: "flex", alignItems: "center", gap: 8,
          background: cardBg,
          border: `1px solid ${searchFocused ? accent : cardBorder}`,
          borderRadius: 12,
          padding: "0 12px",
          marginBottom: isMobile ? 12 : 16,
          transition: "border-color 0.2s",
          minHeight: 44,
        }}
      >
        <Search size={16} aria-hidden="true" color={textSecondary} />
        <input
          type="search"
          inputMode="search"
          enterKeyHint="search"
          autoCorrect="off"
          spellCheck="false"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          placeholder={`Rechercher une ${subTab === "fautes" ? "faute" : "sanction"}…`}
          aria-label={`Rechercher une ${subTab === "fautes" ? "faute" : "sanction"}`}
          style={{
            border: "none", outline: "none", background: "transparent",
            width: "100%", padding: "12px 0",
            fontSize: isMobile ? 16 : 14,
            color: textPrimary, fontFamily: "inherit",
            minHeight: 44,
            ...TAP_BASE,
          }}
        />
        {search && (
          <Pressable
            onClick={() => setSearch("")}
            focusColor={accent}
            ariaLabel="Effacer la recherche"
            style={{
              background: "none", border: "none", color: textSecondary,
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: 8, minWidth: 44, minHeight: 44, marginRight: -8,
            }}
          >
            <X size={16} aria-hidden="true" />
          </Pressable>
        )}
      </div>

      {/* ═══════════ LISTE ═══════════ */}
      {list.length === 0 ? (
        <div
          role="status"
          aria-live="polite"
          style={{
            background: cardBg, borderRadius: 14,
            border: `1px solid ${cardBorder}`,
            padding: isMobile ? 32 : 48,
            textAlign: "center", color: textSecondary,
          }}
        >
          <div
            aria-hidden="true"
            style={{
              width: 56, height: 56, borderRadius: "50%",
              background: accentBg, color: accent,
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 12px",
            }}
          >
            {subTab === "fautes" ? <Gavel size={26} /> : <Shield size={26} />}
          </div>
          <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: textPrimary }}>
            {search ? "Aucun résultat" : subTab === "fautes" ? "Aucun type de faute" : "Aucune sanction"}
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 12 }}>
            {search ? `Aucun élément ne correspond à « ${search} »` : "Ajoutez votre premier élément avec le bouton ci-dessous"}
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(320px, 1fr))",
            gap: isMobile ? 8 : 10,
            ...SCROLL_AREA,
          }}
        >
          {list.map((item) => (
            <ItemCard
              key={item._id}
              item={item}
              type={subTab === "fautes" ? "faute" : "sanction"}
              dark={dark}
              isMobile={isMobile}
              onEdit={() => handleOpenEdit(item)}
              onDelete={() => handleDelete(item)}
            />
          ))}
        </div>
      )}

      {/* ═══════════ FAB AJOUTER (mobile) ═══════════ */}
      {isMobile && (
        <Pressable
          onClick={handleOpenAdd}
          focusColor={accent}
          ariaLabel={`Ajouter ${subTab === "fautes" ? "une faute" : "une sanction"}`}
          style={{
            position: "fixed",
            bottom: "calc(24px + env(safe-area-inset-bottom, 0px))",
            right: "calc(20px + env(safe-area-inset-right, 0px))",
            width: 56, height: 56, minHeight: 56,
            borderRadius: 28,
            background: accent, color: "#FFFFFF",
            border: "none",
            boxShadow: "0 6px 20px rgba(79,70,229,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 900,
          }}
        >
          <Plus size={24} aria-hidden="true" />
        </Pressable>
      )}

      {/* ═══════════ MODALE ═══════════ */}
      <EntityModal
        open={showModal}
        onClose={handleCloseModal}
        mode={subTab === "fautes" ? "faute" : "sanction"}
        initialData={editItem}
        onSubmit={handleSubmit}
        submitting={submitting}
        dark={dark}
        isMobile={isMobile}
      />

      <ConfirmDialog {...dialogProps} />
    </div>
  );
}