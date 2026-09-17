import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useConfirm } from "@/hooks/useConfirm";
import { ConfirmDialog } from "./ConfirmDialog";
import {
  Plus, BookOpen, Loader, Search,
  ChevronRight, X, SlidersHorizontal, RotateCcw,
} from "lucide-react";
import toast from "react-hot-toast";
import { AddCoursModal, DetailCoursModal } from "./CoursModals";

// ============================================================
// HELPER ERREUR
// ============================================================
function extractErrMsg(err, fallback = "Erreur inconnue") {
  if (!err) return fallback;
  if (typeof err === "string") return err;
  if (typeof err === "object" && err.message) return err.message;
  return fallback;
}

// ============================================================
// CARTE COURS COMPACTE
// ============================================================
function CoursCard({ cours, dark, isMobile, onClick }) {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      style={{
        background: dark ? "#1E293B" : "#FFFFFF",
        borderRadius: 12,
        padding: isMobile ? "10px 12px" : "12px 14px",
        boxShadow: dark
          ? "0 1px 2px rgba(0,0,0,0.25)"
          : "0 1px 2px rgba(0,0,0,0.04)",
        border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
        display: "flex",
        alignItems: "center",
        gap: isMobile ? 10 : 12,
        cursor: "pointer",
        transition: "border-color 0.15s, transform 0.1s",
        userSelect: "none",
        WebkitTapHighlightColor: "transparent",
        minWidth: 0,
      }}
      onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.99)")}
      onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: dark ? "#312E81" : "#EEF2FF",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: dark ? "#A5B4FC" : "#4F46E5",
          flexShrink: 0,
        }}
      >
        <BookOpen size={18} />
      </div>

      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontWeight: 600,
            fontSize: isMobile ? 13.5 : 14,
            color: dark ? "#F1F5F9" : "#1E293B",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {cours.nom}
        </div>
        <div
          style={{
            fontSize: isMobile ? 11 : 11.5,
            color: dark ? "#94A3B8" : "#64748B",
            marginTop: 2,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {cours.classe}
          {cours.coefficient ? ` · Coeff. ${cours.coefficient}` : ""}
          {cours.bareme ? ` · Barème ${cours.bareme}` : ""}
        </div>
      </div>

      <ChevronRight
        size={18}
        color={dark ? "#475569" : "#CBD5E1"}
        style={{ flexShrink: 0 }}
      />
    </div>
  );
}

// ============================================================
// BOTTOM SHEET FILTRES
// ============================================================
function CoursFiltersSheet({
  open,
  onClose,
  dark,
  searchTerm,
  setSearchTerm,
  classeFiltre,
  setClasseFiltre,
  sortedClasses,
  onReset,
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

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.45)",
          zIndex: 1100,
          animation: "gc-fadeIn 0.18s ease-out",
        }}
      />
      <div
        className="gc-slideUp"
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
          animation: "gc-slideUp 0.25s cubic-bezier(0.22, 1, 0.36, 1)",
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
            Filtrer les cours
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
            aria-label="Fermer"
          >
            <X size={22} />
          </button>
        </div>

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
              placeholder="Nom du cours…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ ...fieldStyle, paddingLeft: 36 }}
            />
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Classe</label>
          <select
            value={classeFiltre}
            onChange={(e) => setClasseFiltre(e.target.value)}
            style={fieldStyle}
          >
            <option value="">Toutes les classes</option>
            {sortedClasses.map((c) => (
              <option key={c._id} value={c.nom}>
                {c.nom}
              </option>
            ))}
          </select>
        </div>

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
    </>
  );
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================
export function GestionCours({ ecoleId, classes, user, anneeId, anneeActive }) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();
  const { confirm, dialogProps } = useConfirm();

  const userId = user?._id;

  // États
  const [classeFiltre, setClasseFiltre] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalMode, setAddModalMode] = useState("individuel");
  const [editingCours, setEditingCours] = useState(null);
  const [detailCours, setDetailCours] = useState(null);

  // ✅ Query avec userId + garde
  const coursRaw = useQuery(
    api.cours.list,
    ecoleId && userId
      ? {
          ecoleId,
          classe: classeFiltre || undefined,
          anneeId,
          userId,
        }
      : "skip"
  );

  const cours = useMemo(() => coursRaw ?? [], [coursRaw]);

  const addCours = useMutation(api.cours.add);
  const addBulk = useMutation(api.cours.addBulk);
  const removeCours = useMutation(api.cours.remove);
  const updateCours = useMutation(api.cours.update);

  // Couleurs
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const accent = dark ? "#818CF8" : "#4F46E5";
  const warning = "#F59E0B";

  // Tri des classes
  const sortedClasses = useMemo(
    () =>
      [...classes].sort((a, b) =>
        a.nom.localeCompare(b.nom, undefined, {
          numeric: true,
          sensitivity: "base",
        })
      ),
    [classes]
  );

  // Filtrage local (recherche par nom uniquement)
  const filteredCours = useMemo(() => {
    if (!searchTerm.trim()) return cours;
    const q = searchTerm.toLowerCase();
    return cours.filter((c) => c.nom.toLowerCase().includes(q));
  }, [cours, searchTerm]);

  const activeFiltersCount = useMemo(() => {
    let n = 0;
    if (searchTerm.trim()) n++;
    if (classeFiltre) n++;
    return n;
  }, [searchTerm, classeFiltre]);

  // Handlers
  const resetFilters = useCallback(() => {
    setSearchTerm("");
    setClasseFiltre("");
  }, []);

  const handleOpenAdd = (mode = "individuel", initialData = null) => {
    setAddModalMode(mode);
    setEditingCours(initialData);
    setShowAddModal(true);
  };

  const handleCloseAdd = () => {
    setShowAddModal(false);
    setEditingCours(null);
  };

  const handleDeleteCours = useCallback(
    async (c) => {
      if (!userId) {
        toast.error("Session invalide.");
        return;
      }
      const ok = await confirm(
        "Supprimer le cours",
        `Voulez-vous vraiment supprimer le cours "${c.nom}" ?`
      );
      if (!ok) return;
      try {
        await removeCours({ id: c._id, userId });
        toast.success("Cours supprimé");
        setDetailCours(null);
      } catch (err) {
        toast.error(extractErrMsg(err, "Impossible de supprimer le cours"));
      }
    },
    [userId, confirm, removeCours]
  );

  // ==================== RENDU PRÉCOCE : session invalide ====================
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
          @keyframes gc-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          .gc-spin { animation: gc-spin 1s linear infinite; }
          @media (prefers-reduced-motion: reduce) {
            .gc-spin { animation: none !important; }
          }
        `}</style>
        <Loader size={28} className="gc-spin" style={{ color: accent }} />
      </div>
    );
  }

  // ==================== RENDU PRÉCOCE : pas d'année ====================
  if (!anneeId) {
    return (
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: isMobile ? "20px 12px" : "32px 24px",
        }}
      >
        <div
          style={{
            background: cardBg,
            borderRadius: 16,
            padding: isMobile ? 32 : 48,
            textAlign: "center",
            boxShadow: dark
              ? "0 1px 3px rgba(0,0,0,0.3)"
              : "0 1px 3px rgba(0,0,0,0.05)",
            border: `1px solid ${cardBorder}`,
          }}
        >
          <BookOpen
            size={isMobile ? 40 : 48}
            color={warning}
            style={{ marginBottom: 16 }}
          />
          <h2
            style={{
              fontSize: isMobile ? 17 : 22,
              fontWeight: 700,
              color: textPrimary,
              margin: "0 0 8px",
            }}
          >
            Aucune année scolaire active
          </h2>
          <p style={{ color: textSecondary, fontSize: 13.5, margin: 0 }}>
            Veuillez créer ou activer une année scolaire dans les paramètres.
          </p>
        </div>
      </div>
    );
  }

  // ==================== RENDU PRINCIPAL ====================
  return (
    <div
      style={{
        maxWidth: 1280,
        margin: "0 auto",
        padding: isMobile ? "10px 8px 90px" : "20px 16px",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* Keyframes préfixés gc-* */}
      <style>{`
        @keyframes gc-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .gc-spin { animation: gc-spin 1s linear infinite; }
        @keyframes gc-slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes gc-fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) {
          .gc-spin, .gc-slideUp { animation: none !important; }
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
            Gestion des cours
          </h2>
          <p
            style={{
              color: textSecondary,
              marginTop: 2,
              marginBottom: 0,
              fontSize: isMobile ? 11.5 : 13,
            }}
          >
            {filteredCours.length} cours
            {anneeActive ? ` · ${anneeActive.nom}` : ""}
          </p>
        </div>

        {!isMobile && (
          <button
            onClick={() => handleOpenAdd("individuel")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              borderRadius: 8,
              background: accent,
              color: "#FFF",
              border: "none",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            <Plus size={15} /> Ajouter un cours
          </button>
        )}
      </div>

      {/* Barre outils */}
      {isMobile ? (
        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 12,
            alignItems: "stretch",
          }}
        >
          <div style={{ position: "relative", flex: 1 }}>
            <Search
              size={16}
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: textSecondary,
              }}
            />
            <input
              type="text"
              placeholder="Rechercher…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                padding: "12px 12px 12px 38px",
                borderRadius: 12,
                border: `1px solid ${cardBorder}`,
                background: cardBg,
                color: textPrimary,
                fontSize: 16,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
          <button
            onClick={() => setShowFilters(true)}
            style={{
              position: "relative",
              padding: "0 14px",
              borderRadius: 12,
              border: `1px solid ${
                activeFiltersCount > 0 ? accent : cardBorder
              }`,
              background:
                activeFiltersCount > 0
                  ? dark
                    ? "#312E81"
                    : "#EEF2FF"
                  : cardBg,
              color:
                activeFiltersCount > 0
                  ? dark
                    ? "#C7D2FE"
                    : "#4F46E5"
                  : textPrimary,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            <SlidersHorizontal size={16} />
            {activeFiltersCount > 0 && (
              <span
                style={{
                  background: accent,
                  color: "#FFF",
                  borderRadius: 10,
                  padding: "1px 6px",
                  fontSize: 10,
                  fontWeight: 700,
                }}
              >
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            gap: 10,
            marginBottom: 16,
            alignItems: "stretch",
          }}
        >
          <div style={{ position: "relative", flex: 1, minWidth: 240 }}>
            <Search
              size={16}
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: textSecondary,
              }}
            />
            <input
              type="text"
              placeholder="Rechercher un cours…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px 10px 38px",
                borderRadius: 8,
                border: `1px solid ${cardBorder}`,
                background: cardBg,
                color: textPrimary,
                fontSize: 14,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
          <select
            value={classeFiltre}
            onChange={(e) => setClasseFiltre(e.target.value)}
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              border: `1px solid ${cardBorder}`,
              background: cardBg,
              color: textPrimary,
              fontSize: 14,
              cursor: "pointer",
              minWidth: 180,
            }}
          >
            <option value="">Toutes les classes</option>
            {sortedClasses.map((c) => (
              <option key={c._id} value={c.nom}>
                {c.nom}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Puces filtres actifs */}
      {activeFiltersCount > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            marginBottom: 12,
          }}
        >
          {searchTerm.trim() && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "4px 10px",
                background: dark ? "#312E81" : "#EEF2FF",
                color: dark ? "#C7D2FE" : "#4F46E5",
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              « {searchTerm} »
              <X
                size={12}
                style={{ cursor: "pointer" }}
                onClick={() => setSearchTerm("")}
              />
            </span>
          )}
          {classeFiltre && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "4px 10px",
                background: dark ? "#312E81" : "#EEF2FF",
                color: dark ? "#C7D2FE" : "#4F46E5",
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              {classeFiltre}
              <X
                size={12}
                style={{ cursor: "pointer" }}
                onClick={() => setClasseFiltre("")}
              />
            </span>
          )}
          <button
            onClick={resetFilters}
            style={{
              padding: "4px 10px",
              background: "transparent",
              border: `1px solid ${cardBorder}`,
              color: textSecondary,
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Tout effacer
          </button>
        </div>
      )}

      {/* Liste des cours */}
      {coursRaw === undefined ? (
        // ✅ Loader correct
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: isMobile ? 40 : 60,
          }}
        >
          <Loader
            size={28}
            className="gc-spin"
            style={{ color: accent }}
          />
        </div>
      ) : filteredCours.length === 0 ? (
        <div
          style={{
            background: cardBg,
            borderRadius: 16,
            padding: isMobile ? 32 : 48,
            textAlign: "center",
            boxShadow: dark
              ? "0 1px 3px rgba(0,0,0,0.3)"
              : "0 1px 3px rgba(0,0,0,0.05)",
            border: `1px solid ${cardBorder}`,
            color: textSecondary,
          }}
        >
          <BookOpen
            size={isMobile ? 28 : 32}
            style={{ marginBottom: 8, opacity: 0.5 }}
          />
          <p style={{ margin: 0, fontSize: 13.5 }}>
            {searchTerm
              ? `Aucun cours trouvé pour "${searchTerm}"`
              : classeFiltre
              ? `Aucun cours pour la classe ${classeFiltre}`
              : "Aucun cours enregistré"}
          </p>
          {(searchTerm || classeFiltre) && (
            <button
              onClick={resetFilters}
              style={{
                marginTop: 12,
                padding: "8px 16px",
                borderRadius: 8,
                border: `1px solid ${cardBorder}`,
                background: "transparent",
                color: textPrimary,
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile
              ? "1fr"
              : "repeat(auto-fill, minmax(320px, 1fr))",
            gap: isMobile ? 8 : 12,
          }}
        >
          {filteredCours.map((c) => (
            <CoursCard
              key={c._id}
              cours={c}
              dark={dark}
              isMobile={isMobile}
              onClick={() => setDetailCours(c)}
            />
          ))}
        </div>
      )}

      {/* FAB ajouter (mobile) */}
      {isMobile && (
        <button
          onClick={() => handleOpenAdd("individuel")}
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
          title="Ajouter un cours"
        >
          <Plus size={26} />
        </button>
      )}

      {/* Bottom sheet filtres */}
      <CoursFiltersSheet
        open={showFilters}
        onClose={() => setShowFilters(false)}
        dark={dark}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        classeFiltre={classeFiltre}
        setClasseFiltre={setClasseFiltre}
        sortedClasses={sortedClasses}
        onReset={resetFilters}
      />

      {/* Modale ajout / édition */}
      <AddCoursModal
        open={showAddModal}
        onClose={handleCloseAdd}
        initialMode={addModalMode}
        initialData={editingCours}
        classes={sortedClasses}
        addCours={addCours}
        updateCours={updateCours}
        addBulk={addBulk}
        ecoleId={ecoleId}
        anneeId={anneeId}
        userId={userId}
        dark={dark}
        isMobile={isMobile}
      />

      {/* Modale détail */}
      {detailCours && (
        <DetailCoursModal
          cours={detailCours}
          onClose={() => setDetailCours(null)}
          onEdit={() => {
            setDetailCours(null);
            handleOpenAdd("individuel", detailCours);
          }}
          onDelete={() => handleDeleteCours(detailCours)}
          dark={dark}
          isMobile={isMobile}
        />
      )}

      <ConfirmDialog {...dialogProps} />
    </div>
  );
}