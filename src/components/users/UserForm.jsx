// src/components/UserForm.jsx
import { useState, useEffect, useMemo, useCallback } from "react";
import { Loader, Eye, EyeOff } from "lucide-react";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";

// ════════════════════════════════════════════════════════════════════
// KEYFRAMES module-level
// ════════════════════════════════════════════════════════════════════
const UserFormKeyframes = (
  <style>{`
    @keyframes uf-spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
    .uf-spin { animation: uf-spin 1s linear infinite; }
    @media (prefers-reduced-motion: reduce) {
      .uf-spin { animation: none !important; }
    }
  `}</style>
);

// ✨ Taille minimale tap target mobile
const MOBILE_TAP = 44;

export function UserForm({ initialValues, onSubmit, onCancel }) {
  const { S, dark } = useStyles();
  const isMobile = useIsMobile();
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
  const [focusedField, setFocusedField] = useState(null);
  // ✨ Feedback tap
  const [pressedBtn, setPressedBtn] = useState(null);
  // ✨ Feedback tap pour toggle password
  const [pressedToggle, setPressedToggle] = useState(false);

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
    if (!isEdit && !form.password.trim())
      errs.password = "Le mot de passe est requis.";
    if (form.password && form.password.length < 8)
      errs.password =
        "Au moins 8 caractères (majuscule, minuscule, chiffre requis).";
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
      // Erreurs gérées par le parent
    } finally {
      setLoading(false);
    }
  };

  // ────────────────────────────────────────────────────────────
  // Couleurs adaptatives (dark tokens)
  // ────────────────────────────────────────────────────────────
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const borderColor = dark ? "#334155" : "#E2E8F0";
  const inputBg = dark ? "#0F172A" : "#F9FAFB";
  const inputText = dark ? "#F1F5F9" : "#1E293B";
  const focusBorder = dark ? "#818CF8" : "#4F46E5";
  const buttonPrimary = dark ? "#818CF8" : "#4F46E5";
  const buttonPrimaryHover = dark ? "#6366F1" : "#4338CA";
  const buttonSecondaryBg = dark ? "#334155" : "#F1F5F9";
  const buttonSecondaryHover = dark ? "#475569" : "#E2E8F0";
  const buttonSecondaryText = dark ? "#F1F5F9" : "#1E293B";
  const errorColor = "#EF4444";

  // ────────────────────────────────────────────────────────────
  // Styles adaptatifs
  // ────────────────────────────────────────────────────────────
  const inputPadding = isMobile ? "12px 14px" : "10px 14px";
  const inputFontSize = isMobile ? 16 : 14; // 16px évite zoom iOS
  const labelFontSize = isMobile ? 15 : 14;
  const titleSize = isMobile ? 18 : 20;
  const buttonPadding = isMobile ? "12px 16px" : "10px 20px";
  const buttonFontSize = isMobile ? 15 : 14;
  const buttonDirection = isMobile ? "column" : "row";
  const buttonWidth = isMobile ? "100%" : "auto";

  // ✨ inputStyle en useCallback (évite recréation)
  const inputStyle = useCallback(
    (fieldName, hasError = false) => {
      const isFocused = focusedField === fieldName;
      return {
        width: "100%",
        padding: inputPadding,
        border: `1px solid ${
          hasError ? errorColor : isFocused ? focusBorder : borderColor
        }`,
        borderRadius: 8,
        fontSize: inputFontSize,
        outline: "none",
        background: inputBg,
        color: inputText,
        transition: "border-color 0.2s ease, background-color 0.3s ease, color 0.3s ease",
        boxSizing: "border-box",
        fontFamily: "inherit",
        // ✨ Mobile : neutralise tap delay + flash
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation",
        minHeight: isMobile ? MOBILE_TAP : undefined,
        // ✨ Empêche le zoom iOS Safari
        WebkitAppearance: "none",
      };
    },
    [focusedField, inputPadding, inputFontSize, inputBg, inputText, borderColor, focusBorder]
  );

  return (
    <form
      onSubmit={handleSubmit}
      style={{ width: "100%" }}
      // ✨ Mobile : empêche zoom global au focus
      autoComplete="off"
    >
      {UserFormKeyframes}

      <h3
        style={{
          fontSize: titleSize,
          fontWeight: 600,
          marginBottom: 20,
          color: textPrimary,
        }}
      >
        {isEdit ? "Modifier l'utilisateur" : "Nouvel utilisateur"}
      </h3>

      {/* ═══ Nom complet ═══ */}
      <div style={{ marginBottom: 16 }}>
        <label
          style={{
            display: "block",
            marginBottom: 6,
            fontWeight: 500,
            fontSize: labelFontSize,
            color: textSecondary,
          }}
        >
          Nom complet
        </label>
        <input
          value={form.nom}
          onChange={(e) => setForm({ ...form, nom: e.target.value })}
          onFocus={() => setFocusedField("nom")}
          onBlur={() => setFocusedField(null)}
          placeholder="Ex: Jean Dupont"
          autoComplete="off"
          autoCorrect="off"
          style={inputStyle("nom", !!errors.nom)}
        />
        {errors.nom && (
          <span
            style={{
              color: errorColor,
              fontSize: 12,
              marginTop: 4,
              display: "block",
            }}
          >
            {errors.nom}
          </span>
        )}
      </div>

      {/* ═══ Login ═══ */}
      <div style={{ marginBottom: 16 }}>
        <label
          style={{
            display: "block",
            marginBottom: 6,
            fontWeight: 500,
            fontSize: labelFontSize,
            color: textSecondary,
          }}
        >
          Login
        </label>
        <input
          value={form.login}
          onChange={(e) => setForm({ ...form, login: e.target.value })}
          disabled={isEdit}
          onFocus={() => setFocusedField("login")}
          onBlur={() => setFocusedField(null)}
          placeholder="Ex: jean.dupont"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          style={{
            ...inputStyle("login", !!errors.login),
            background: isEdit ? (dark ? "#334155" : "#F1F5F9") : inputBg,
            cursor: isEdit ? "not-allowed" : "text",
            opacity: isEdit ? 0.7 : 1,
          }}
        />
        {errors.login && (
          <span
            style={{
              color: errorColor,
              fontSize: 12,
              marginTop: 4,
              display: "block",
            }}
          >
            {errors.login}
          </span>
        )}
      </div>

      {/* ═══ Mot de passe ═══ */}
      <div style={{ marginBottom: 16 }}>
        <label
          style={{
            display: "block",
            marginBottom: 6,
            fontWeight: 500,
            fontSize: labelFontSize,
            color: textSecondary,
          }}
        >
          Mot de passe {isEdit && "(laisser vide pour ne pas changer)"}
        </label>
        <div style={{ position: "relative" }}>
          <input
            type={showPassword ? "text" : "password"}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            onFocus={() => setFocusedField("password")}
            onBlur={() => setFocusedField(null)}
            placeholder={isEdit ? "••••••••" : "Minimum 8 caractères"}
            autoComplete="new-password"
            style={{
              ...inputStyle("password", !!errors.password),
              paddingRight: isMobile ? 48 : 44,
            }}
          />
          {/* ✨ Toggle password avec zone tap mobile 44x44 */}
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            onTouchStart={() => setPressedToggle(true)}
            onTouchEnd={() => setPressedToggle(false)}
            onTouchCancel={() => setPressedToggle(false)}
            style={{
              position: "absolute",
              right: 4,
              top: "50%",
              transform: `translateY(-50%) scale(${
                pressedToggle ? 0.9 : 1
              })`,
              background: "transparent",
              border: "none",
              color: textSecondary,
              cursor: "pointer",
              // ✨ Zone tap 44x44
              width: isMobile ? MOBILE_TAP : 36,
              height: isMobile ? MOBILE_TAP : 36,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
              borderRadius: 8,
              transition: "transform 0.1s ease, background 0.12s ease",
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
            }}
            aria-label={
              showPassword
                ? "Cacher le mot de passe"
                : "Afficher le mot de passe"
            }
          >
            {showPassword ? (
              <EyeOff size={isMobile ? 20 : 18} />
            ) : (
              <Eye size={isMobile ? 20 : 18} />
            )}
          </button>
        </div>
        {errors.password && (
          <span
            style={{
              color: errorColor,
              fontSize: 12,
              marginTop: 4,
              display: "block",
            }}
          >
            {errors.password}
          </span>
        )}
      </div>

      {/* ═══ Rôle ═══ */}
      <div style={{ marginBottom: 16 }}>
        <label
          style={{
            display: "block",
            marginBottom: 6,
            fontWeight: 500,
            fontSize: labelFontSize,
            color: textSecondary,
          }}
        >
          Rôle
        </label>
        <select
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
          onFocus={() => setFocusedField("role")}
          onBlur={() => setFocusedField(null)}
          style={{
            ...inputStyle("role", false),
            cursor: "pointer",
            // ✨ iOS : évite le zoom + empêche le style natif
            WebkitAppearance: "none",
            appearance: "none",
          }}
        >
          {["admin", "directeur", "disciplinaire", "enseignant", "parent", "comptable", "eleve"].map(
            (r) => (
              <option
                key={r}
                value={r}
                style={{
                  background: dark ? "#1E293B" : "#FFF",
                  color: textPrimary,
                }}
              >
                {r}
              </option>
            )
          )}
        </select>
      </div>

      {/* ═══ Classe (si enseignant) ═══ */}
      {form.role === "enseignant" && (
        <div style={{ marginBottom: 16 }}>
          <label
            style={{
              display: "block",
              marginBottom: 6,
              fontWeight: 500,
              fontSize: labelFontSize,
              color: textSecondary,
            }}
          >
            Classe
          </label>
          <input
            value={form.classe}
            onChange={(e) => setForm({ ...form, classe: e.target.value })}
            onFocus={() => setFocusedField("classe")}
            onBlur={() => setFocusedField(null)}
            placeholder="Ex: 6ème A"
            autoComplete="off"
            style={inputStyle("classe", false)}
          />
        </div>
      )}

      {/* ═══ Boutons ═══ */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginTop: 20,
          flexDirection: buttonDirection,
        }}
      >
        <button
          type="submit"
          disabled={loading}
          onTouchStart={() => !loading && setPressedBtn("submit")}
          onTouchEnd={() => setPressedBtn(null)}
          onTouchCancel={() => setPressedBtn(null)}
          style={{
            background: loading
              ? "#A5B4FC"
              : pressedBtn === "submit"
              ? buttonPrimaryHover
              : buttonPrimary,
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
            transition:
              "background 0.12s ease, transform 0.1s ease, box-shadow 0.15s ease",
            transform: pressedBtn === "submit" ? "scale(0.98)" : "scale(1)",
            minHeight: isMobile ? MOBILE_TAP : undefined,
            WebkitTapHighlightColor: "transparent",
            touchAction: "manipulation",
            fontFamily: "inherit",
            boxSizing: "border-box",
          }}
        >
          {loading ? <Loader size={16} className="uf-spin" /> : null}
          {loading ? "Traitement..." : isEdit ? "Enregistrer" : "Créer"}
        </button>

        <button
          type="button"
          onClick={onCancel}
          onTouchStart={() => setPressedBtn("cancel")}
          onTouchEnd={() => setPressedBtn(null)}
          onTouchCancel={() => setPressedBtn(null)}
          style={{
            background:
              pressedBtn === "cancel"
                ? buttonSecondaryHover
                : buttonSecondaryBg,
            color: buttonSecondaryText,
            border: "none",
            borderRadius: 8,
            padding: buttonPadding,
            fontWeight: 500,
            cursor: "pointer",
            width: buttonWidth,
            fontSize: buttonFontSize,
            transition:
              "background 0.12s ease, transform 0.1s ease",
            transform: pressedBtn === "cancel" ? "scale(0.98)" : "scale(1)",
            minHeight: isMobile ? MOBILE_TAP : undefined,
            WebkitTapHighlightColor: "transparent",
            touchAction: "manipulation",
            fontFamily: "inherit",
            boxSizing: "border-box",
          }}
        >
          Annuler
        </button>
      </div>
    </form>
  );
}