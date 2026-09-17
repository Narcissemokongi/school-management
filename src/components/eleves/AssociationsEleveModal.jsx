// src/components/AssociationsEleveModal.jsx
import { useState, useMemo, useEffect, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import { Loader, Search, X, User, Users, Link2, Unlink } from "lucide-react";
import toast from "react-hot-toast";

const MAX_RESULTS = 20;

export function AssociationsEleveModal({
  eleve,
  parents = [],
  elevesUsers = [],
  currentUserId,
  onClose,
}) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();
  const [searchParent, setSearchParent] = useState("");
  const [searchUser, setSearchUser] = useState("");
  const [associatingParent, setAssociatingParent] = useState(null);
  const [associatingUser, setAssociatingUser] = useState(null);

  const associerParentMutation = useMutation(api.eleves.associerParent);
  const associerCompteMutation = useMutation(api.eleves.associerCompteEleve);

  // ✅ FIX #12 — fermeture sur Échap
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // ✅ FIX #13 — bloque le scroll body pendant l'ouverture
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // ✅ FIX #3 — Maps O(1) au lieu de find() dans le JSX
  const parentsById = useMemo(() => {
    const m = new Map();
    parents.forEach((p) => { if (p?._id) m.set(p._id, p); });
    return m;
  }, [parents]);

  const usersById = useMemo(() => {
    const m = new Map();
    elevesUsers.forEach((u) => { if (u?._id) m.set(u._id, u); });
    return m;
  }, [elevesUsers]);

  // ✅ FIX #6 — filtre défensif + lowercase une seule fois
  const filteredParents = useMemo(() => {
    const q = searchParent.trim().toLowerCase();
    const list = parents.filter(Boolean);
    if (!q) return list;
    return list.filter((p) =>
      p.nom?.toLowerCase().includes(q) ||
      p.prenom?.toLowerCase().includes(q) ||
      p.login?.toLowerCase().includes(q)
    );
  }, [parents, searchParent]);

  const filteredUsers = useMemo(() => {
    const q = searchUser.trim().toLowerCase();
    const list = elevesUsers.filter(Boolean);
    if (!q) return list;
    return list.filter((u) =>
      u.nom?.toLowerCase().includes(q) ||
      u.prenom?.toLowerCase().includes(q) ||
      u.login?.toLowerCase().includes(q)
    );
  }, [elevesUsers, searchUser]);

  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const inputBg = dark ? "#0F172A" : "#F9FAFB";
  const accentColor = dark ? "#818CF8" : "#4F46E5";
  const dangerColor = "#EF4444";

  // ✅ FIX #8 — signature explicite : (parentId) où parentId=null → dissocier
  const handleAssocierParent = useCallback(async (parentId) => {
    if (!eleve?._id || !currentUserId) return;
    setAssociatingParent(parentId ?? "none");
    try {
      await associerParentMutation({
        eleveId: eleve._id,
        parentId: parentId || undefined,
        // ✅ FIX #1 — requesterId (adapter si backend attend actionUserId)
        requesterId: currentUserId,
      });
      toast.success(parentId ? "Parent associé avec succès" : "Association parent retirée");
    } catch (err) {
      // ✅ FIX #7 — fallback
      toast.error(err?.message ?? "Erreur lors de l'association");
    } finally {
      setAssociatingParent(null);
    }
  }, [eleve?._id, currentUserId, associerParentMutation]);

  const handleAssocierCompte = useCallback(async (userId) => {
    if (!eleve?._id || !currentUserId) return;
    setAssociatingUser(userId ?? "none");
    try {
      await associerCompteMutation({
        eleveId: eleve._id,
        userId: userId || undefined,
        requesterId: currentUserId,
      });
      toast.success(userId ? "Compte élève associé" : "Compte élève dissocié");
    } catch (err) {
      toast.error(err?.message ?? "Erreur lors de l'association");
    } finally {
      setAssociatingUser(null);
    }
  }, [eleve?._id, currentUserId, associerCompteMutation]);

  // ✅ FIX #2 — guard : sans élève valide, on ne rend rien
  if (!eleve?._id) return null;

  const currentParent = eleve.parentId ? parentsById.get(eleve.parentId) : null;
  const currentUser = eleve.userId ? usersById.get(eleve.userId) : null;

  const modalPadding = isMobile ? 16 : 24;
  const modalMaxWidth = isMobile ? "95%" : 800;
  const modalMaxHeight = isMobile ? "85vh" : "90vh";
  const headerMarginBottom = isMobile ? 16 : 20;
  const titleSize = isMobile ? 18 : 20;
  const closeIconSize = isMobile ? 22 : 24;
  const infoElevePadding = isMobile ? 10 : 12;
  const infoEleveFontSize = 14;
  const sectionTitleSize = isMobile ? 15 : 16;
  const sectionGap = isMobile ? 16 : 24;
  const gridColumns = isMobile ? "1fr" : "1fr 1fr";
  const searchInputPadding = isMobile ? "10px 12px 10px 36px" : "8px 12px 8px 34px";
  const searchInputFontSize = isMobile ? 16 : 14;
  const searchIconLeft = 10;
  const listItemPadding = isMobile ? "8px 10px" : "6px 8px";
  const listItemFontSize = isMobile ? 14 : 13;
  const associateButtonPadding = isMobile ? "6px 10px" : "4px 8px";
  const associateButtonFontSize = 12;
  const dissociateButtonMarginTop = 8;
  const closeButtonPadding = isMobile ? "12px 0" : "10px 0";
  const closeButtonFontSize = isMobile ? 16 : 14;

  const isBusy = associatingParent !== null || associatingUser !== null;
  const hasMoreParents = filteredParents.length > MAX_RESULTS;
  const hasMoreUsers = filteredUsers.length > MAX_RESULTS;

  return (
    // ✅ FIX #10 — role dialog + aria-modal
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Associations de l'élève"
      style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1000,
        padding: isMobile ? 12 : 16,
      }}
    >
      <div style={{
        background: cardBg,
        borderRadius: 16,
        padding: modalPadding,
        width: "100%",
        maxWidth: modalMaxWidth,
        maxHeight: modalMaxHeight,
        overflowY: "auto",
        boxShadow: dark ? "0 10px 30px rgba(0,0,0,0.5)" : "0 10px 30px rgba(0,0,0,0.1)",
        border: `1px solid ${cardBorder}`,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: headerMarginBottom }}>
          <h3 style={{ margin: 0, fontSize: titleSize, fontWeight: 700, color: textPrimary }}>
            Associations de l'élève
          </h3>
          <button
            onClick={onClose}
            aria-label="Fermer"
            style={{ background: "none", border: "none", cursor: "pointer", color: textSecondary }}
          >
            <X size={closeIconSize} />
          </button>
        </div>

        <div style={{ marginBottom: 16, padding: infoElevePadding, background: dark ? "#0F172A" : "#F9FAFB", borderRadius: 8 }}>
          <p style={{ margin: 0, color: textSecondary, fontSize: infoEleveFontSize }}>
            Élève : <strong style={{ color: textPrimary }}>{eleve.prenom} {eleve.nom} {eleve.postnom}</strong>
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: gridColumns, gap: sectionGap }}>
          {/* Section Parent */}
          <div>
            <h4 style={{ display: "flex", alignItems: "center", gap: 8, fontSize: sectionTitleSize, fontWeight: 600, color: textPrimary, marginBottom: 12 }}>
              <Users size={18} /> Parent
            </h4>

            {eleve.parentId ? (
              <div style={{ marginBottom: 12, padding: infoElevePadding, background: dark ? "#1E293B" : "#F1F5F9", borderRadius: 8, border: `1px solid ${cardBorder}` }}>
                <p style={{ margin: 0, fontSize: infoEleveFontSize, color: textPrimary }}>
                  Parent actuel : {currentParent?.nom ?? "Inconnu"}
                </p>
                <button
                  type="button"
                  onClick={() => handleAssocierParent(null)}
                  disabled={isBusy}
                  style={{ marginTop: dissociateButtonMarginTop, display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: dangerColor, cursor: isBusy ? "not-allowed" : "pointer", fontSize: 14, opacity: isBusy ? 0.5 : 1 }}
                >
                  <Unlink size={14} /> Dissocier
                </button>
              </div>
            ) : (
              <p style={{ color: textSecondary, marginBottom: 12, fontSize: infoEleveFontSize }}>Aucun parent associé</p>
            )}

            <div style={{ position: "relative", marginBottom: 8 }}>
              <Search size={16} style={{ position: "absolute", left: searchIconLeft, top: "50%", transform: "translateY(-50%)", color: textSecondary }} />
              <input
                type="text"
                placeholder="Rechercher un parent..."
                value={searchParent}
                onChange={(e) => setSearchParent(e.target.value)}
                style={{
                  width: "100%",
                  padding: searchInputPadding,
                  borderRadius: 8,
                  border: `1px solid ${cardBorder}`,
                  background: inputBg,
                  color: textPrimary,
                  fontSize: searchInputFontSize,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ maxHeight: isMobile ? 180 : 200, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
              {filteredParents.length === 0 && (
                <p style={{ color: textSecondary, fontSize: listItemFontSize, textAlign: "center", padding: 8 }}>
                  Aucun parent trouvé
                </p>
              )}
              {filteredParents.slice(0, MAX_RESULTS).map((parent) => {
                const busy = associatingParent === parent._id;
                return (
                  <div key={parent._id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: listItemPadding, borderRadius: 6, background: dark ? "#1E293B" : "#F9FAFB", border: `1px solid ${cardBorder}` }}>
                    <span style={{ fontSize: listItemFontSize, color: textPrimary }}>
                      {parent.nom} {parent.prenom} ({parent.login})
                    </span>
                    <button
                      type="button"
                      onClick={() => handleAssocierParent(parent._id)}
                      disabled={isBusy}
                      style={{
                        padding: associateButtonPadding,
                        borderRadius: 6,
                        border: "none",
                        background: accentColor,
                        color: "white",
                        cursor: isBusy ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: associateButtonFontSize,
                        opacity: isBusy && !busy ? 0.5 : 1,
                      }}
                    >
                      {/* ✅ FIX #4 — keyframe aem-spin scopé */}
                      {busy ? <Loader size={12} style={{ animation: "aem-spin 0.8s linear infinite" }} /> : <Link2 size={12} />}
                      Associer
                    </button>
                  </div>
                );
              })}
              {/* ✅ FIX #5 — indique la troncature */}
              {hasMoreParents && (
                <p style={{ color: textSecondary, fontSize: 12, textAlign: "center", padding: 4 }}>
                  {filteredParents.length - MAX_RESULTS} résultat(s) supplémentaire(s) — affinez votre recherche
                </p>
              )}
            </div>
          </div>

          {/* Section Compte élève */}
          <div>
            <h4 style={{ display: "flex", alignItems: "center", gap: 8, fontSize: sectionTitleSize, fontWeight: 600, color: textPrimary, marginBottom: 12 }}>
              <User size={18} /> Compte utilisateur élève
            </h4>

            {eleve.userId ? (
              <div style={{ marginBottom: 12, padding: infoElevePadding, background: dark ? "#1E293B" : "#F1F5F9", borderRadius: 8, border: `1px solid ${cardBorder}` }}>
                <p style={{ margin: 0, fontSize: infoEleveFontSize, color: textPrimary }}>
                  Compte actuel : {currentUser?.login ?? "Inconnu"}
                </p>
                <button
                  type="button"
                  onClick={() => handleAssocierCompte(null)}
                  disabled={isBusy}
                  style={{ marginTop: dissociateButtonMarginTop, display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: dangerColor, cursor: isBusy ? "not-allowed" : "pointer", fontSize: 14, opacity: isBusy ? 0.5 : 1 }}
                >
                  <Unlink size={14} /> Dissocier
                </button>
              </div>
            ) : (
              <p style={{ color: textSecondary, marginBottom: 12, fontSize: infoEleveFontSize }}>Aucun compte associé</p>
            )}

            <div style={{ position: "relative", marginBottom: 8 }}>
              <Search size={16} style={{ position: "absolute", left: searchIconLeft, top: "50%", transform: "translateY(-50%)", color: textSecondary }} />
              <input
                type="text"
                placeholder="Rechercher un compte élève..."
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                style={{
                  width: "100%",
                  padding: searchInputPadding,
                  borderRadius: 8,
                  border: `1px solid ${cardBorder}`,
                  background: inputBg,
                  color: textPrimary,
                  fontSize: searchInputFontSize,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ maxHeight: isMobile ? 180 : 200, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
              {filteredUsers.length === 0 && (
                <p style={{ color: textSecondary, fontSize: listItemFontSize, textAlign: "center", padding: 8 }}>
                  Aucun compte trouvé
                </p>
              )}
              {filteredUsers.slice(0, MAX_RESULTS).map((user) => {
                const busy = associatingUser === user._id;
                return (
                  <div key={user._id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: listItemPadding, borderRadius: 6, background: dark ? "#1E293B" : "#F9FAFB", border: `1px solid ${cardBorder}` }}>
                    <span style={{ fontSize: listItemFontSize, color: textPrimary }}>
                      {user.nom} {user.prenom} ({user.login})
                    </span>
                    <button
                      type="button"
                      onClick={() => handleAssocierCompte(user._id)}
                      disabled={isBusy}
                      style={{
                        padding: associateButtonPadding,
                        borderRadius: 6,
                        border: "none",
                        background: accentColor,
                        color: "white",
                        cursor: isBusy ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: associateButtonFontSize,
                        opacity: isBusy && !busy ? 0.5 : 1,
                      }}
                    >
                      {busy ? <Loader size={12} style={{ animation: "aem-spin 0.8s linear infinite" }} /> : <Link2 size={12} />}
                      Associer
                    </button>
                  </div>
                );
              })}
              {hasMoreUsers && (
                <p style={{ color: textSecondary, fontSize: 12, textAlign: "center", padding: 4 }}>
                  {filteredUsers.length - MAX_RESULTS} résultat(s) supplémentaire(s) — affinez votre recherche
                </p>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          style={{
            marginTop: isMobile ? 16 : 24,
            width: "100%",
            padding: closeButtonPadding,
            background: "transparent",
            color: textPrimary,
            border: `1px solid ${cardBorder}`,
            borderRadius: 8,
            cursor: "pointer",
            fontWeight: 600,
            fontSize: closeButtonFontSize,
          }}
        >
          Fermer
        </button>
      </div>

      {/* ✅ FIX #4 + #11 — keyframe scopé + reduced-motion */}
      <style>{`
        @keyframes aem-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          [role="dialog"] svg[style*="aem-spin"] { animation: none !important; }
        }
      `}</style>
    </div>
  );
}