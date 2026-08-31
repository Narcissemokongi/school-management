import { useState, useMemo } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile"; // <-- Import du hook
import { Loader, Search, Check, X, User, Users, Link2, Unlink } from "lucide-react";
import toast from "react-hot-toast";

export function AssociationsEleveModal({
  eleve,
  parents,
  elevesUsers,
  currentUserId,
  onClose,
}) {
  const { dark } = useStyles();
  const isMobile = useIsMobile(); // Détection mobile
  const [searchParent, setSearchParent] = useState("");
  const [searchUser, setSearchUser] = useState("");
  const [associatingParent, setAssociatingParent] = useState(null);
  const [associatingUser, setAssociatingUser] = useState(null);

  const associerParentMutation = useMutation(api.eleves.associerParent);
  const associerCompteMutation = useMutation(api.eleves.associerCompteEleve);

  // Filtrage des parents
  const filteredParents = useMemo(() => {
    const q = searchParent.toLowerCase();
    return parents.filter(
      (p) =>
        p.nom?.toLowerCase().includes(q) ||
        p.prenom?.toLowerCase().includes(q) ||
        p.login?.toLowerCase().includes(q)
    );
  }, [parents, searchParent]);

  // Filtrage des comptes élèves
  const filteredUsers = useMemo(() => {
    const q = searchUser.toLowerCase();
    return elevesUsers.filter(
      (u) =>
        u.nom?.toLowerCase().includes(q) ||
        u.prenom?.toLowerCase().includes(q) ||
        u.login?.toLowerCase().includes(q)
    );
  }, [elevesUsers, searchUser]);

  // Couleurs adaptatives
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const inputBg = dark ? "#0F172A" : "#F9FAFB";
  const accentColor = dark ? "#818CF8" : "#4F46E5";
  const dangerColor = "#EF4444";

  const handleAssocierParent = async (parentId) => {
    setAssociatingParent(parentId || null);
    try {
      await associerParentMutation({
        eleveId: eleve._id,
        parentId: parentId || undefined,
        actionUserId: currentUserId,
      });
      toast.success(parentId ? "Parent associé avec succès" : "Association parent retirée");
    } catch (err) {
      toast.error(err.message || "Erreur lors de l'association");
    } finally {
      setAssociatingParent(null);
    }
  };

  const handleAssocierCompte = async (userId) => {
    setAssociatingUser(userId || null);
    try {
      await associerCompteMutation({
        eleveId: eleve._id,
        userId: userId || undefined,
        actionUserId: currentUserId,
      });
      toast.success(userId ? "Compte élève associé" : "Compte élève dissocié");
    } catch (err) {
      toast.error(err.message || "Erreur lors de l'association");
    } finally {
      setAssociatingUser(null);
    }
  };

  // Styles adaptatifs
  const modalPadding = isMobile ? 16 : 24;
  const modalMaxWidth = isMobile ? "95%" : 800;
  const modalMaxHeight = isMobile ? "85vh" : "90vh";
  const headerMarginBottom = isMobile ? 16 : 20;
  const titleSize = isMobile ? 18 : 20;
  const closeIconSize = isMobile ? 22 : 24;
  const infoElevePadding = isMobile ? 10 : 12;
  const infoEleveFontSize = isMobile ? 14 : 14;
  const sectionTitleSize = isMobile ? 15 : 16;
  const sectionGap = isMobile ? 16 : 24;
  const gridColumns = isMobile ? "1fr" : "1fr 1fr";
  const searchInputPadding = isMobile ? "10px 12px 10px 36px" : "8px 12px 8px 34px";
  const searchInputFontSize = isMobile ? 16 : 14;
  const searchIconLeft = isMobile ? 10 : 10;
  const listItemPadding = isMobile ? "8px 10px" : "6px 8px";
  const listItemFontSize = isMobile ? 14 : 13;
  const associateButtonPadding = isMobile ? "6px 10px" : "4px 8px";
  const associateButtonFontSize = isMobile ? 12 : 12;
  const dissociateButtonMarginTop = isMobile ? 8 : 8;
  const closeButtonPadding = isMobile ? "12px 0" : "10px 0";
  const closeButtonFontSize = isMobile ? 16 : 14;

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0,0,0,0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
      padding: isMobile ? 12 : 16,
    }}>
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
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: textSecondary }}>
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

            {/* Parent actuel */}
            {eleve.parentId ? (
              <div style={{ marginBottom: 12, padding: infoElevePadding, background: dark ? "#1E293B" : "#F1F5F9", borderRadius: 8, border: `1px solid ${cardBorder}` }}>
                <p style={{ margin: 0, fontSize: infoEleveFontSize, color: textPrimary }}>
                  Parent actuel : {parents.find(p => p._id === eleve.parentId)?.nom || "Inconnu"}
                </p>
                <button
                  onClick={() => handleAssocierParent(undefined)}
                  disabled={associatingParent !== null}
                  style={{ marginTop: dissociateButtonMarginTop, display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: dangerColor, cursor: "pointer", fontSize: isMobile ? 14 : 14 }}
                >
                  <Unlink size={14} /> Dissocier
                </button>
              </div>
            ) : (
              <p style={{ color: textSecondary, marginBottom: 12, fontSize: infoEleveFontSize }}>Aucun parent associé</p>
            )}

            {/* Recherche parent */}
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
              {filteredParents.slice(0, 20).map((parent) => (
                <div key={parent._id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: listItemPadding, borderRadius: 6, background: dark ? "#1E293B" : "#F9FAFB", border: `1px solid ${cardBorder}` }}>
                  <span style={{ fontSize: listItemFontSize, color: textPrimary }}>
                    {parent.nom} {parent.prenom} ({parent.login})
                  </span>
                  <button
                    onClick={() => handleAssocierParent(parent._id)}
                    disabled={associatingParent === parent._id}
                    style={{
                      padding: associateButtonPadding,
                      borderRadius: 6,
                      border: "none",
                      background: accentColor,
                      color: "white",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: associateButtonFontSize,
                    }}
                  >
                    {associatingParent === parent._id ? <Loader size={12} className="animate-spin" /> : <Link2 size={12} />}
                    Associer
                  </button>
                </div>
              ))}
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
                  Compte actuel : {elevesUsers.find(u => u._id === eleve.userId)?.login || "Inconnu"}
                </p>
                <button
                  onClick={() => handleAssocierCompte(undefined)}
                  disabled={associatingUser !== null}
                  style={{ marginTop: dissociateButtonMarginTop, display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: dangerColor, cursor: "pointer", fontSize: isMobile ? 14 : 14 }}
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
              {filteredUsers.slice(0, 20).map((user) => (
                <div key={user._id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: listItemPadding, borderRadius: 6, background: dark ? "#1E293B" : "#F9FAFB", border: `1px solid ${cardBorder}` }}>
                  <span style={{ fontSize: listItemFontSize, color: textPrimary }}>
                    {user.nom} {user.prenom} ({user.login})
                  </span>
                  <button
                    onClick={() => handleAssocierCompte(user._id)}
                    disabled={associatingUser === user._id}
                    style={{
                      padding: associateButtonPadding,
                      borderRadius: 6,
                      border: "none",
                      background: accentColor,
                      color: "white",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: associateButtonFontSize,
                    }}
                  >
                    {associatingUser === user._id ? <Loader size={12} className="animate-spin" /> : <Link2 size={12} />}
                    Associer
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <button
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
    </div>
  );
}