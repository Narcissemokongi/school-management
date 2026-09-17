import { useState, useEffect } from "react";
import {
  X, Loader, Edit2, Trash2, User, Key, GraduationCap,
  Search, RotateCcw, SlidersHorizontal, Download,
} from "lucide-react";
import toast from "react-hot-toast";
import { RoleBadge } from "./GestionUtilisateurs";

// ============================================================
// KEYFRAMES PARTAGÉS (préfixés `um-`)
// ============================================================
const umStyles = `
  @keyframes um-slide-up {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }
  @keyframes um-fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes um-spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  .um-spin { animation: um-spin 1s linear infinite; }
`;

// ============================================================
// BOTTOM SHEET FILTRES
// ============================================================
export function UtilisateursFiltersSheet({
  open,
  onClose,
  dark,
  searchTerm,
  setSearchTerm,
  roleFilter,
  setRoleFilter,
  classeFilter,
  setClasseFilter,
  roles,
  classNames,
  onReset,
  activeFiltersCount,
  onImportExcel,
  exporting,
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
          animation: "um-fade-in 0.18s ease-out",
        }}
      />
      <div
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
          animation: "um-slide-up 0.25s cubic-bezier(0.22, 1, 0.36, 1)",
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
            Filtrer les utilisateurs
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
              placeholder="Nom ou login…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ ...fieldStyle, paddingLeft: 36 }}
            />
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Rôle</label>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={fieldStyle}
          >
            <option value="">Tous les rôles</option>
            {roles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Classe</label>
          <select
            value={classeFilter}
            onChange={(e) => setClasseFilter(e.target.value)}
            style={fieldStyle}
          >
            <option value="">Toutes les classes</option>
            {classNames.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Action rapide */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Action rapide</label>
          <button
            onClick={() => {
              onImportExcel();
              onClose();
            }}
            disabled={exporting}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 14px",
              borderRadius: 10,
              border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
              background: dark ? "#0F172A" : "#F8FAFC",
              color: dark ? "#F1F5F9" : "#1E293B",
              cursor: exporting ? "not-allowed" : "pointer",
              fontWeight: 600,
              fontSize: 14,
              textAlign: "left",
              width: "100%",
              opacity: exporting ? 0.6 : 1,
            }}
          >
            {exporting ? (
              <Loader size={18} className="um-spin" />
            ) : (
              <Download size={18} />
            )}
            Exporter en Excel
          </button>
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

      <style>{umStyles}</style>
    </>
  );
}

// ============================================================
// MODALE AJOUT / ÉDITION UTILISATEUR
// ============================================================
export function AddUserModal({
  open,
  onClose,
  editUser,
  addUser,
  updateUser,
  ecoleId,
  userId,
  classNames,
  dark,
  isMobile,
}) {
  const [formData, setFormData] = useState({
    nom: "",
    login: "",
    password: "",
    confirmPassword: "",
    role: "enseignant",
    classe: "",
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      if (editUser) {
        setFormData({
          nom: editUser.nom,
          login: editUser.login,
          password: "",
          confirmPassword: "",
          role: editUser.role,
          classe: editUser.classe || "",
        });
      } else {
        setFormData({
          nom: "",
          login: "",
          password: "",
          confirmPassword: "",
          role: "enseignant",
          classe: "",
        });
      }
      setFormErrors({});
    }
  }, [open, editUser]);

  if (!open) return null;

  const validateForm = () => {
    const errs = {};
    if (!formData.nom.trim()) errs.nom = "Requis";
    if (!editUser) {
      if (!formData.login.trim()) errs.login = "Requis";
      if (!formData.password.trim()) errs.password = "Requis";
    }
    // ✅ Règle alignée sur 8 caractères (backend + Parametres.jsx)
    if (formData.password && formData.password.length < 8)
      errs.password = "8 caractères min.";
    if (formData.password !== formData.confirmPassword)
      errs.confirmPassword = "Les mots de passe ne correspondent pas.";
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      if (editUser) {
        const payload = {
          id: editUser._id,
          nom: formData.nom.trim(),
          role: formData.role,
          classe: formData.classe || undefined,
          // ⚠️ Vérifier la signature backend de updateUser :
          //    `adminId` ou `userId` ? Incohérent avec addUser ci-dessous.
          adminId: userId,
        };
        if (formData.password) payload.password = formData.password;
        await updateUser(payload);
        toast.success("Utilisateur mis à jour");
      } else {
        await addUser({
          nom: formData.nom.trim(),
          login: formData.login.trim(),
          password: formData.password,
          role: formData.role,
          classe: formData.classe || undefined,
          ecoleId,
          userId,
        });
        toast.success("Utilisateur créé");
      }
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const fieldStyle = (hasError = false) => ({
    width: "100%",
    padding: isMobile ? "12px 14px" : "10px 14px",
    border: `1px solid ${
      hasError ? "#EF4444" : dark ? "#334155" : "#E2E8F0"
    }`,
    borderRadius: 10,
    fontSize: isMobile ? 15 : 14,
    outline: "none",
    background: dark ? "#0F172A" : "#F8FAFC",
    color: dark ? "#F1F5F9" : "#1E293B",
    boxSizing: "border-box",
  });

  const labelStyle = {
    display: "block",
    marginBottom: 6,
    fontWeight: 600,
    fontSize: 12,
    color: dark ? "#CBD5E1" : "#374151",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  };

  const gridColumns = isMobile ? "1fr" : "1fr 1fr";

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          zIndex: 1200,
          animation: "um-fade-in 0.18s ease-out",
        }}
      />
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          top: isMobile ? "auto" : 0,
          background: dark ? "#1E293B" : "#FFFFFF",
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          borderRadius: isMobile ? "20px 20px 0 0" : 0,
          padding: isMobile ? "12px 16px 24px" : 0,
          zIndex: 1201,
          maxHeight: isMobile ? "92vh" : "100vh",
          height: isMobile ? "auto" : "100vh",
          overflowY: "auto",
          animation: isMobile
            ? "um-slide-up 0.25s cubic-bezier(0.22, 1, 0.36, 1)"
            : "um-fade-in 0.2s ease-out",
        }}
      >
        <div
          style={
            isMobile
              ? { display: "contents" }
              : {
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: "100%",
                  maxWidth: 560,
                  maxHeight: "90vh",
                  overflowY: "auto",
                  background: dark ? "#1E293B" : "#FFFFFF",
                  borderRadius: 16,
                  padding: 24,
                  border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
                  boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
                }
          }
        >
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
            <h3
              style={{
                margin: 0,
                fontSize: 17,
                fontWeight: 700,
                color: dark ? "#F1F5F9" : "#1E293B",
              }}
            >
              {editUser ? "Modifier l'utilisateur" : "Nouvel utilisateur"}
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
            >
              <X size={22} />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>
                Nom complet <span style={{ color: "#EF4444" }}>*</span>
              </label>
              <input
                value={formData.nom}
                onChange={(e) =>
                  setFormData({ ...formData, nom: e.target.value })
                }
                placeholder="Ex: Jean Dupont"
                style={fieldStyle(!!formErrors.nom)}
              />
              {formErrors.nom && (
                <div
                  style={{ color: "#EF4444", fontSize: 12, marginTop: 4 }}
                >
                  {formErrors.nom}
                </div>
              )}
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>
                Login <span style={{ color: "#EF4444" }}>*</span>
              </label>
              <input
                value={formData.login}
                onChange={(e) =>
                  setFormData({ ...formData, login: e.target.value })
                }
                disabled={!!editUser}
                placeholder="Ex: jdupont"
                style={{
                  ...fieldStyle(!!formErrors.login),
                  background: editUser
                    ? dark
                      ? "#1E293B"
                      : "#F1F5F9"
                    : dark
                    ? "#0F172A"
                    : "#F8FAFC",
                  cursor: editUser ? "not-allowed" : "text",
                  opacity: editUser ? 0.7 : 1,
                }}
              />
              {formErrors.login && (
                <div
                  style={{ color: "#EF4444", fontSize: 12, marginTop: 4 }}
                >
                  {formErrors.login}
                </div>
              )}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: gridColumns,
                gap: 12,
                marginBottom: 14,
              }}
            >
              <div>
                <label style={labelStyle}>
                  Mot de passe{" "}
                  {!editUser && <span style={{ color: "#EF4444" }}>*</span>}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  // ✅ Placeholder aligné sur 8 caractères
                  placeholder={editUser ? "Laisser vide" : "Min. 8 caractères"}
                  style={fieldStyle(!!formErrors.password)}
                />
                {formErrors.password && (
                  <div
                    style={{ color: "#EF4444", fontSize: 12, marginTop: 4 }}
                  >
                    {formErrors.password}
                  </div>
                )}
              </div>
              <div>
                <label style={labelStyle}>Confirmation</label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      confirmPassword: e.target.value,
                    })
                  }
                  placeholder="Retapez le mot de passe"
                  style={fieldStyle(!!formErrors.confirmPassword)}
                />
                {formErrors.confirmPassword && (
                  <div
                    style={{ color: "#EF4444", fontSize: 12, marginTop: 4 }}
                  >
                    {formErrors.confirmPassword}
                  </div>
                )}
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Rôle</label>
              <select
                value={formData.role}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value })
                }
                style={fieldStyle(false)}
              >
                {[
                  "admin",
                  "directeur",
                  "disciplinaire",
                  "enseignant",
                  "parent",
                  "comptable",
                  "eleve",
                ].map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {formData.role === "enseignant" && (
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Classe</label>
                <select
                  value={formData.classe}
                  onChange={(e) =>
                    setFormData({ ...formData, classe: e.target.value })
                  }
                  style={fieldStyle(false)}
                >
                  <option value="">Aucune classe</option>
                  {classNames.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div
              style={{
                display: "flex",
                gap: 10,
                marginTop: 20,
                flexDirection: isMobile ? "column" : "row",
              }}
            >
              <button
                type="button"
                onClick={onClose}
                style={{
                  flex: isMobile ? "none" : 1,
                  padding: "14px 16px",
                  borderRadius: 12,
                  border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
                  background: "transparent",
                  color: dark ? "#CBD5E1" : "#475569",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  flex: isMobile ? "none" : 2,
                  padding: "14px 16px",
                  borderRadius: 12,
                  border: "none",
                  background: submitting
                    ? "#A5B4FC"
                    : dark
                    ? "#818CF8"
                    : "#4F46E5",
                  color: "#FFFFFF",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: submitting ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                {submitting && <Loader size={16} className="um-spin" />}
                {submitting
                  ? "Enregistrement…"
                  : editUser
                  ? "Enregistrer"
                  : "Créer"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <style>{umStyles}</style>
    </>
  );
}

// ============================================================
// MODALE DÉTAIL UTILISATEUR
// ============================================================
export function DetailUserModal({ user, onClose, onEdit, onDelete, dark, isMobile }) {
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const accent = dark ? "#818CF8" : "#4F46E5";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: isMobile ? "flex-end" : "center",
        justifyContent: "center",
        zIndex: 1300,
        padding: isMobile ? 0 : 16,
        animation: "um-fade-in 0.2s ease-out",
      }}
    >
      <div
        style={{
          background: cardBg,
          borderRadius: isMobile ? "20px 20px 0 0" : 16,
          padding: isMobile ? 16 : 24,
          width: "100%",
          maxWidth: isMobile ? "100%" : 480,
          maxHeight: "92vh",
          overflowY: "auto",
          boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
          border: `1px solid ${cardBorder}`,
        }}
      >
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
          <h3
            style={{
              margin: 0,
              fontSize: 17,
              fontWeight: 700,
              color: textPrimary,
            }}
          >
            Détails de l'utilisateur
          </h3>
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

        {/* Avatar + nom */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "14px",
            marginBottom: 16,
            background: dark ? "#0F172A" : "#F8FAFC",
            borderRadius: 12,
            border: `1px solid ${cardBorder}`,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: dark ? "#312E81" : "#EEF2FF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: accent,
              fontWeight: 700,
              fontSize: 18,
              flexShrink: 0,
            }}
          >
            {user.nom?.[0]?.toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: textPrimary,
                wordBreak: "break-word",
              }}
            >
              {user.nom}
            </div>
            <div style={{ marginTop: 4 }}>
              <RoleBadge role={user.role} dark={dark} />
            </div>
          </div>
        </div>

        {/* Détails */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <DetailRow
            icon={<User size={16} color={accent} />}
            label="Login"
            value={`@${user.login}`}
            dark={dark}
          />
          {user.classe && (
            <DetailRow
              icon={<GraduationCap size={16} color={accent} />}
              label="Classe"
              value={user.classe}
              dark={dark}
            />
          )}
          {user.email && (
            <DetailRow
              icon={<Key size={16} color={accent} />}
              label="Email"
              value={user.email}
              dark={dark}
            />
          )}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          <button
            onClick={onEdit}
            style={{
              flex: 1,
              padding: "12px 14px",
              borderRadius: 12,
              border: `1px solid ${cardBorder}`,
              background: dark ? "#0F172A" : "#F8FAFC",
              color: textPrimary,
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 13.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <Edit2 size={16} />
            Modifier
          </button>
          <button
            onClick={onDelete}
            style={{
              flex: 1,
              padding: "12px 14px",
              borderRadius: 12,
              border: "none",
              background: "#DC2626",
              color: "#FFFFFF",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 13.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <Trash2 size={16} />
            Supprimer
          </button>
        </div>

        <button
          onClick={onClose}
          style={{
            marginTop: 10,
            width: "100%",
            padding: 12,
            background: "transparent",
            border: `1px solid ${cardBorder}`,
            borderRadius: 12,
            color: textSecondary,
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 13.5,
          }}
        >
          Fermer
        </button>
      </div>

      <style>{umStyles}</style>
    </div>
  );
}

function DetailRow({ icon, label, value, dark }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "10px 12px",
        borderRadius: 10,
        background: dark ? "#0F172A" : "#F8FAFC",
        border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          background: dark ? "#1E293B" : "#FFFFFF",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: dark ? "#94A3B8" : "#64748B",
            textTransform: "uppercase",
            letterSpacing: 0.3,
            marginBottom: 2,
          }}
        >
          {label}
        </div>
        <div
          style={{
            color: dark ? "#F1F5F9" : "#1E293B",
            fontWeight: 500,
            fontSize: 13.5,
            wordBreak: "break-word",
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}