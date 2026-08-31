import { useState, useEffect } from "react";
import { Loader, User, Lock, Eye, EyeOff } from "lucide-react";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile"; // <-- Import du hook

export function UserForm({ initialValues, onSubmit, onCancel }) {
  const { S, dark } = useStyles();
  const isMobile = useIsMobile(); // Détection mobile
  const isEdit = !!initialValues;

  const [form, setForm] = useState({
    nom: initialValues?.nom || "",
    login: initialValues?.login || "",
    password: "",
    role: initialValues?.role || "enseignant",
    classe: initialValues?.classe || "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Synchronisation si initialValues change
  useEffect(() => {
    if (initialValues) {
      setForm({
        nom: initialValues.nom,
        login: initialValues.login,
        password: "",
        role: initialValues.role,
        classe: initialValues.classe || "",
      });
    }
  }, [initialValues]);

  const validate = () => {
    const errs = {};
    if (!form.nom.trim()) errs.nom = "Le nom est requis.";
    if (!isEdit && !form.login.trim()) errs.login = "Le login est requis.";
    if (!isEdit && !form.password.trim()) errs.password = "Le mot de passe est requis.";
    if (form.password && form.password.length < 4) errs.password = "Au moins 4 caractères.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    const data = {
      nom: form.nom.trim(),
      role: form.role,
      classe: form.classe || undefined,
    };

    if (!isEdit) {
      data.login = form.login.trim();
      data.password = form.password;
    } else if (form.password) {
      data.password = form.password;
    }

    try {
      await onSubmit(data, isEdit);
    } catch (err) {
      // Les erreurs sont normalement gérées par le parent via toast
    } finally {
      setLoading(false);
    }
  };

  // Couleurs adaptatives
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const borderColor = dark ? "#334155" : "#E2E8F0";
  const inputBg = dark ? "#0F172A" : "#F9FAFB";
  const inputText = dark ? "#F1F5F9" : "#1E293B";
  const focusBorder = dark ? "#818CF8" : "#4F46E5";
  const buttonPrimary = dark ? "#818CF8" : "#4F46E5";
  const buttonSecondaryBg = dark ? "#334155" : "#F1F5F9";
  const buttonSecondaryText = dark ? "#F1F5F9" : "#1E293B";
  const errorColor = "#EF4444";

  // Styles adaptatifs
  const inputPadding = isMobile ? "12px 14px" : "10px 14px";
  const inputFontSize = isMobile ? 16 : 14;
  const labelFontSize = isMobile ? 15 : 14;
  const titleSize = isMobile ? 18 : 20;
  const buttonPadding = isMobile ? "12px 16px" : "10px 20px";
  const buttonFontSize = isMobile ? 16 : 14;
  const buttonDirection = isMobile ? "column" : "row";
  const buttonWidth = isMobile ? "100%" : "auto";

  const inputStyle = (hasError = false) => ({
    width: "100%",
    padding: inputPadding,
    border: `1px solid ${hasError ? errorColor : borderColor}`,
    borderRadius: 8,
    fontSize: inputFontSize,
    outline: "none",
    background: inputBg,
    color: inputText,
    transition: "border-color 0.2s, background-color 0.3s, color 0.3s",
    boxSizing: "border-box",
  });

  const handleFocus = (e) => (e.target.style.borderColor = focusBorder);
  const handleBlur = (e) => (e.target.style.borderColor = borderColor);

  return (
    <form onSubmit={handleSubmit} style={{ width: "100%" }}>
      <h3 style={{ fontSize: titleSize, fontWeight: 600, marginBottom: 20, color: textPrimary }}>
        {isEdit ? "Modifier l'utilisateur" : "Nouvel utilisateur"}
      </h3>

      {/* Nom complet */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", marginBottom: 6, fontWeight: 500, fontSize: labelFontSize, color: textSecondary }}>
          Nom complet
        </label>
        <input
          value={form.nom}
          onChange={(e) => setForm({ ...form, nom: e.target.value })}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="Ex: Jean Dupont"
          style={inputStyle(!!errors.nom)}
        />
        {errors.nom && <span style={{ color: errorColor, fontSize: 12, marginTop: 4, display: "block" }}>{errors.nom}</span>}
      </div>

      {/* Login */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", marginBottom: 6, fontWeight: 500, fontSize: labelFontSize, color: textSecondary }}>
          Login
        </label>
        <input
          value={form.login}
          onChange={(e) => setForm({ ...form, login: e.target.value })}
          disabled={isEdit}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="Ex: jean.dupont"
          style={{
            ...inputStyle(!!errors.login),
            background: isEdit ? (dark ? "#334155" : "#F1F5F9") : inputBg,
            cursor: isEdit ? "not-allowed" : "text",
          }}
        />
        {errors.login && <span style={{ color: errorColor, fontSize: 12, marginTop: 4, display: "block" }}>{errors.login}</span>}
      </div>

      {/* Mot de passe */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", marginBottom: 6, fontWeight: 500, fontSize: labelFontSize, color: textSecondary }}>
          Mot de passe {isEdit && "(laisser vide pour ne pas changer)"}
        </label>
        <div style={{ position: "relative" }}>
          <input
            type={showPassword ? "text" : "password"}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={isEdit ? "••••••••" : "Minimum 4 caractères"}
            style={{ ...inputStyle(!!errors.password), paddingRight: 40 }}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: "absolute",
              right: 10,
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              color: textSecondary,
              cursor: "pointer",
            }}
            aria-label={showPassword ? "Cacher le mot de passe" : "Afficher le mot de passe"}
          >
            {showPassword ? <EyeOff size={isMobile ? 20 : 18} /> : <Eye size={isMobile ? 20 : 18} />}
          </button>
        </div>
        {errors.password && <span style={{ color: errorColor, fontSize: 12, marginTop: 4, display: "block" }}>{errors.password}</span>}
      </div>

      {/* Rôle */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", marginBottom: 6, fontWeight: 500, fontSize: labelFontSize, color: textSecondary }}>
          Rôle
        </label>
        <select
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={inputStyle(false)}
        >
          {["admin", "directeur", "disciplinaire", "enseignant", "parent", "comptable", "eleve"].map((r) => (
            <option key={r} value={r} style={{ background: dark ? "#1E293B" : "#FFF", color: textPrimary }}>
              {r}
            </option>
          ))}
        </select>
      </div>

      {/* Classe (si enseignant) */}
      {form.role === "enseignant" && (
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 6, fontWeight: 500, fontSize: labelFontSize, color: textSecondary }}>
            Classe
          </label>
          <input
            value={form.classe}
            onChange={(e) => setForm({ ...form, classe: e.target.value })}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder="Ex: 6ème A"
            style={inputStyle(false)}
          />
        </div>
      )}

      {/* Boutons */}
      <div style={{ display: "flex", gap: 8, marginTop: 20, flexDirection: buttonDirection }}>
        <button
          type="submit"
          disabled={loading}
          style={{
            background: loading ? "#A5B4FC" : buttonPrimary,
            color: "white",
            border: "none",
            borderRadius: 8,
            padding: buttonPadding,
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            justifyContent: "center",
            flex: isMobile ? "none" : 1,
            width: buttonWidth,
            fontSize: buttonFontSize,
          }}
        >
          {loading ? <Loader size={16} className="animate-spin" /> : null}
          {loading ? "Traitement..." : isEdit ? "Enregistrer" : "Créer"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            background: buttonSecondaryBg,
            color: buttonSecondaryText,
            border: "none",
            borderRadius: 8,
            padding: buttonPadding,
            fontWeight: 500,
            cursor: "pointer",
            width: buttonWidth,
            fontSize: buttonFontSize,
          }}
        >
          Annuler
        </button>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .animate-spin { animation: spin 1s linear infinite; }`}</style>
    </form>
  );
}