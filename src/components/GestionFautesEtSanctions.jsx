import { useState, useMemo, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useConfirm } from "@/hooks/useConfirm";
import { ConfirmDialog } from "./ConfirmDialog";
import toast from "react-hot-toast";
import {
  Loader, Plus, Trash2, Edit2, Search, X,
  Gavel, Shield, AlertTriangle, ChevronRight, Check,
} from "lucide-react";

// ============================================================
// BADGE DE GRAVITÉ
// ============================================================
function GraviteBadge({ gravite, dark, isMobile }) {
  const config =
    gravite === "Grave"
      ? {
          bg: dark ? "#7F1D1D" : "#FEE2E2",
          color: dark ? "#F87171" : "#B91C1C",
          icon: <AlertTriangle size={10} />,
        }
      : gravite === "Moyenne"
      ? {
          bg: dark ? "#78350F" : "#FEF3C7",
          color: dark ? "#FBBF24" : "#92400E",
          icon: <Shield size={10} />,
        }
      : {
          bg: dark ? "#064E3B" : "#D1FAE5",
          color: dark ? "#34D399" : "#065F46",
          icon: <Shield size={10} />,
        };

  return (
    <span
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

// ============================================================
// MODALE AJOUT / ÉDITION
// ============================================================
function EntityModal({
  open,
  onClose,
  mode, // "faute" ou "sanction"
  initialData,
  onSubmit,
  submitting,
  dark,
  isMobile,
}) {
  const [libelle, setLibelle] = useState("");
  const [gravite, setGravite] = useState("Légère");

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
    width: "100%",
    padding: isMobile ? "12px 14px" : "10px 14px",
    border: `1px solid ${cardBorder}`,
    borderRadius: 10,
    fontSize: isMobile ? 15 : 14,
    outline: "none",
    background: inputBg,
    color: inputText,
    boxSizing: "border-box",
    fontFamily: "inherit",
    appearance: "none",
    WebkitAppearance: "none",
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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            minWidth: 0,
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
            {isFaute ? <Gavel size={16} /> : <Shield size={16} />}
          </div>
          <h3
            style={{
              margin: 0,
              fontSize: isMobile ? 16 : 17,
              fontWeight: 700,
              color: textPrimary,
            }}
          >
            {isEdit
              ? `Modifier la ${isFaute ? "faute" : "sanction"}`
              : `Nouvelle ${isFaute ? "faute" : "sanction"}`}
          </h3>
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
        >
          <X size={22} />
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Libellé</label>
          <input
            type="text"
            value={libelle}
            onChange={(e) => setLibelle(e.target.value)}
            placeholder={isFaute ? "Ex : Chewing-gum" : "Ex : Retenue"}
            autoFocus
            style={inputStyle}
          />
        </div>

        {isFaute && (
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Gravité</label>
            <div style={{ display: "flex", gap: 8 }}>
              {["Légère", "Moyenne", "Grave"].map((g) => {
                const isActive = gravite === g;
                const gColor =
                  g === "Grave"
                    ? "#EF4444"
                    : g === "Moyenne"
                    ? "#F59E0B"
                    : "#10B981";
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGravite(g)}
                    style={{
                      flex: 1,
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: `1px solid ${isActive ? gColor : cardBorder}`,
                      background: isActive ? `${gColor}20` : "transparent",
                      color: isActive ? gColor : textSecondary,
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    {g}
                  </button>
                );
              })}
            </div>
          </div>
        )}

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
            disabled={submitting || !libelle.trim()}
            style={{
              flex: isMobile ? "none" : 2,
              padding: "12px 18px",
              borderRadius: 12,
              border: "none",
              background: submitting || !libelle.trim() ? "#A5B4FC" : accent,
              color: "#FFFFFF",
              fontWeight: 700,
              fontSize: 14,
              cursor: submitting || !libelle.trim() ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              order: isMobile ? 1 : 2,
            }}
          >
            {submitting ? (
              <Loader size={16} className="animate-spin" />
            ) : (
              <Check size={16} />
            )}
            {submitting ? "Enregistrement…" : isEdit ? "Mettre à jour" : "Ajouter"}
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
            animation: "fadeIn 0.18s ease-out",
          }}
        />
        <div
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
            maxHeight: "90vh",
            overflowY: "auto",
            boxShadow: "0 -8px 30px rgba(0,0,0,0.25)",
            animation: "slideUp 0.25s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          {content}
        </div>
        <style>{`
          @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        `}</style>
      </>
    );
  }

  return (
    <>
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
            maxWidth: 480,
            boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
            border: `1px solid ${cardBorder}`,
          }}
        >
          {content}
        </div>
      </div>
    </>
  );
}

// ============================================================
// CARTE ITEM (faute ou sanction)
// ============================================================
function ItemCard({
  item,
  type,
  dark,
  isMobile,
  onClick,
  onEdit,
  onDelete,
}) {
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const accentBg = dark ? "#312E81" : "#EEF2FF";
  const accent = dark ? "#818CF8" : "#4F46E5";

  return (
    <div
      style={{
        background: cardBg,
        borderRadius: 12,
        padding: isMobile ? "10px 12px" : "12px 14px",
        boxShadow: dark
          ? "0 1px 2px rgba(0,0,0,0.25)"
          : "0 1px 2px rgba(0,0,0,0.04)",
        border: `1px solid ${cardBorder}`,
        display: "flex",
        alignItems: "center",
        gap: 10,
        minWidth: 0,
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: accentBg,
          color: accent,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {type === "faute" ? <Gavel size={18} /> : <Shield size={18} />}
      </div>

      {/* Infos */}
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
        {type === "faute" && item.gravite && (
          <div style={{ marginTop: 3 }}>
            <GraviteBadge
              gravite={item.gravite}
              dark={dark}
              isMobile={isMobile}
            />
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
        <button
          onClick={onEdit}
          title="Modifier"
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
export function GestionFautesEtSanctions({
  fautes,
  addFaute,
  updateFaute,
  removeFaute,
  ecoleId,
  sanctions,
  userId,
}) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();
  const { confirm, dialogProps } = useConfirm();

  const [subTab, setSubTab] = useState("fautes");
  const [search, setSearch] = useState("");

  // Modale
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const addSanction = useMutation(api.sanctions.add);
  const updateSanction = useMutation(api.sanctions.update);
  const removeSanction = useMutation(api.sanctions.remove);

  // Couleurs
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const inputBg = dark ? "#0F172A" : "#F8FAFC";
  const accent = dark ? "#818CF8" : "#4F46E5";
  const accentBg = dark ? "#312E81" : "#EEF2FF";

  // Filtres
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

  // Reset de la recherche quand on change d'onglet
  useEffect(() => {
    setSearch("");
  }, [subTab]);

  // Handlers
  const handleOpenAdd = () => {
    setEditItem(null);
    setShowModal(true);
  };

  const handleOpenEdit = (item) => {
    setEditItem(item);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditItem(null);
  };

  const handleSubmit = async (data) => {
    setSubmitting(true);
    try {
      if (subTab === "fautes") {
        if (editItem) {
          await updateFaute({
            id: editItem._id,
            libelle: data.libelle,
            gravite: data.gravite,
            userId,
          });
          toast.success("Faute mise à jour");
        } else {
          await addFaute({
            libelle: data.libelle,
            gravite: data.gravite,
            ecoleId,
            userId,
          });
          toast.success("Faute ajoutée");
        }
      } else {
        if (editItem) {
          await updateSanction({
            id: editItem._id,
            libelle: data.libelle,
            userId,
          });
          toast.success("Sanction mise à jour");
        } else {
          await addSanction({
            libelle: data.libelle,
            ecoleId,
            userId,
          });
          toast.success("Sanction ajoutée");
        }
      }
      handleCloseModal();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (item) => {
    const label = subTab === "fautes" ? "faute" : "sanction";
    const ok = await confirm(
      `Supprimer la ${label}`,
      `Voulez-vous vraiment supprimer « ${item.libelle} » ?`
    );
    if (!ok) return;
    try {
      if (subTab === "fautes") {
        await removeFaute({ id: item._id, userId });
        toast.success("Faute supprimée");
      } else {
        await removeSanction({ id: item._id, userId });
        toast.success("Sanction supprimée");
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Compteur filtres
  const list = subTab === "fautes" ? filteredFautes : filteredSanctions;
  const total = subTab === "fautes" ? fautes.length : sanctions.length;

  return (
    <div
      style={{
        maxWidth: 800,
        margin: "0 auto",
        padding: isMobile ? "10px 8px 90px" : "20px 16px 40px",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .animate-spin { animation: spin 1s linear infinite; }`}</style>

      {/* ==================== EN-TÊTE ==================== */}
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
            Discipline
          </h2>
          <p
            style={{
              color: textSecondary,
              marginTop: 2,
              marginBottom: 0,
              fontSize: isMobile ? 11.5 : 13,
            }}
          >
            {fautes.length} type{fautes.length > 1 ? "s" : ""} de faute
            {fautes.length > 1 ? "s" : ""} · {sanctions.length} sanction
            {sanctions.length > 1 ? "s" : ""}
          </p>
        </div>
        {!isMobile && (
          <button
            onClick={handleOpenAdd}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              background: accent,
              color: "white",
              border: "none",
              borderRadius: 10,
              fontWeight: 700,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            <Plus size={15} />
            Ajouter
          </button>
        )}
      </div>

      {/* ==================== TABS ==================== */}
      <div
        role="tablist"
        style={{
          display: "flex",
          gap: 4,
          borderBottom: `2px solid ${cardBorder}`,
          marginBottom: isMobile ? 12 : 16,
          overflowX: "auto",
          whiteSpace: "nowrap",
          scrollbarWidth: "none",
        }}
      >
        <button
          onClick={() => setSubTab("fautes")}
          role="tab"
          aria-selected={subTab === "fautes"}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: isMobile ? "12px 14px" : "12px 18px",
            minHeight: isMobile ? 44 : 42,
            border: "none",
            background: "transparent",
            color: subTab === "fautes" ? accent : textSecondary,
            fontWeight: subTab === "fautes" ? 700 : 500,
            borderBottom:
              subTab === "fautes"
                ? `3px solid ${accent}`
                : "3px solid transparent",
            cursor: "pointer",
            fontSize: isMobile ? 14 : 15,
            flexShrink: 0,
            marginBottom: -2,
          }}
        >
          <Gavel size={16} />
          Fautes
          <span
            style={{
              background:
                subTab === "fautes" ? accentBg : dark ? "#334155" : "#F1F5F9",
              color:
                subTab === "fautes" ? accent : textSecondary,
              padding: "1px 8px",
              borderRadius: 10,
              fontSize: 10.5,
              fontWeight: 700,
            }}
          >
            {fautes.length}
          </span>
        </button>
        <button
          onClick={() => setSubTab("sanctions")}
          role="tab"
          aria-selected={subTab === "sanctions"}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: isMobile ? "12px 14px" : "12px 18px",
            minHeight: isMobile ? 44 : 42,
            border: "none",
            background: "transparent",
            color: subTab === "sanctions" ? accent : textSecondary,
            fontWeight: subTab === "sanctions" ? 700 : 500,
            borderBottom:
              subTab === "sanctions"
                ? `3px solid ${accent}`
                : "3px solid transparent",
            cursor: "pointer",
            fontSize: isMobile ? 14 : 15,
            flexShrink: 0,
            marginBottom: -2,
          }}
        >
          <Shield size={16} />
          Sanctions
          <span
            style={{
              background:
                subTab === "sanctions"
                  ? accentBg
                  : dark
                  ? "#334155"
                  : "#F1F5F9",
              color:
                subTab === "sanctions" ? accent : textSecondary,
              padding: "1px 8px",
              borderRadius: 10,
              fontSize: 10.5,
              fontWeight: 700,
            }}
          >
            {sanctions.length}
          </span>
        </button>
      </div>

      {/* ==================== RECHERCHE ==================== */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: cardBg,
          border: `1px solid ${cardBorder}`,
          borderRadius: 12,
          padding: "0 12px",
          marginBottom: isMobile ? 12 : 16,
        }}
      >
        <Search size={16} color={textSecondary} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Rechercher une ${
            subTab === "fautes" ? "faute" : "sanction"
          }…`}
          style={{
            border: "none",
            outline: "none",
            background: "transparent",
            width: "100%",
            padding: "12px 0",
            fontSize: isMobile ? 15 : 14,
            color: textPrimary,
            fontFamily: "inherit",
          }}
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: textSecondary,
              display: "flex",
              padding: 4,
            }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* ==================== LISTE ==================== */}
      {list.length === 0 ? (
        <div
          style={{
            background: cardBg,
            borderRadius: 14,
            border: `1px solid ${cardBorder}`,
            padding: isMobile ? 32 : 48,
            textAlign: "center",
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
            {subTab === "fautes" ? <Gavel size={26} /> : <Shield size={26} />}
          </div>
          <p
            style={{
              margin: 0,
              fontSize: 13.5,
              fontWeight: 600,
              color: textPrimary,
            }}
          >
            {search
              ? "Aucun résultat"
              : subTab === "fautes"
              ? "Aucun type de faute"
              : "Aucune sanction"}
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 12 }}>
            {search
              ? `Aucun élément ne correspond à « ${search} »`
              : "Ajoutez votre premier élément avec le bouton ci-dessous"}
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile
              ? "1fr"
              : "repeat(auto-fill, minmax(320px, 1fr))",
            gap: isMobile ? 8 : 10,
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

      {/* ==================== FAB AJOUTER (mobile) ==================== */}
      {isMobile && (
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
          onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.94)")}
          onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          title={`Ajouter ${subTab === "fautes" ? "une faute" : "une sanction"}`}
        >
          <Plus size={24} />
        </button>
      )}

      {/* ==================== MODALE ==================== */}
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