// src/components/RegisterScreen.jsx
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  Loader2, User, Lock, Eye, EyeOff, School, UserCheck, BadgeCheck,
  CheckCircle2, XCircle, AlertCircle, Check,
} from "lucide-react";

// ════════════════════════════════════════════════════════════════════
// SAFE-AREA
// ════════════════════════════════════════════════════════════════════
const SAFE_TOP = "env(safe-area-inset-top, 0px)";
const SAFE_BOTTOM = "env(safe-area-inset-bottom, 0px)";
const SAFE_LEFT = "env(safe-area-inset-left, 0px)";
const SAFE_RIGHT = "env(safe-area-inset-right, 0px)";

// ✨ Taille minimale tap target mobile
const MOBILE_TAP = 44;

// ════════════════════════════════════════════════════════════════════
// KEYFRAMES module-level
// ════════════════════════════════════════════════════════════════════
const RegisterKeyframes = (
  <style>{`
    @keyframes rs-spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
    .rs-spin {
      animation: rs-spin 1s linear infinite;
    }
    @media (prefers-reduced-motion: reduce) {
      .rs-spin { animation: none !important; }
    }
  `}</style>
);

const ROLES = [
  { value: "parent", label: "Parent", icon: <UserCheck size={16} /> },
  { value: "eleve", label: "Élève", icon: <BadgeCheck size={16} /> },
  { value: "enseignant", label: "Enseignant", icon: <School size={16} /> },
];

export function RegisterScreen({ onSwitchToLogin }) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();

  const [nom, setNom] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [codeEcole, setCodeEcole] = useState("");
  const [role, setRole] = useState("");
  const [matricule, setMatricule] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [acceptConditions, setAcceptConditions] = useState(false);

  // ✨ Focus state React (remplace DOM manipulation)
  const [focusedField, setFocusedField] = useState(null);
  // ✨ Feedback tap
  const [pressedBtn, setPressedBtn] = useState(null);

  const register = useMutation(api.users.register);
  const redirectTimeoutRef = useRef(null);

  // ✨ Handlers touch génériques
  const pressBtn = useCallback((id) => () => setPressedBtn(id), []);
  const releaseBtn = useCallback(() => setPressedBtn(null), []);

  // ════════════════════════════════════════════════════════════════════
  // Cleanup
  // ════════════════════════════════════════════════════════════════════
  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, []);

  // ════════════════════════════════════════════════════════════════════
  // Force du mot de passe
  // ════════════════════════════════════════════════════════════════════
  const passwordStrength = useMemo(() => {
    if (!password) return null;
    const checks = {
      length: password.length >= 6,
      uppercase: /[A-Z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
      long: password.length >= 10,
    };
    const score = Object.values(checks).filter(Boolean).length;
    let label, color, width;
    if (score <= 2) {
      label = "Faible";
      color = "#EF4444";
      width = "33%";
    } else if (score <= 3) {
      label = "Moyen";
      color = "#F59E0B";
      width = "66%";
    } else {
      label = "Fort";
      color = "#10B981";
      width = "100%";
    }
    return { label, color, width, checks };
  }, [password]);

  // ════════════════════════════════════════════════════════════════════
  // Soumission
  // ════════════════════════════════════════════════════════════════════
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setError("");

    if (!nom.trim()) return setError("Le nom complet est requis.");
    if (!login.trim()) return setError("L'identifiant est requis.");
    if (!/^[a-zA-Z0-9._-]{3,20}$/.test(login.trim()))
      return setError(
        "L'identifiant doit contenir entre 3 et 20 caractères (lettres, chiffres, points, tirets, underscores)."
      );
    if (!password) return setError("Le mot de passe est requis.");
    if (password.length < 6)
      return setError("Le mot de passe doit contenir au moins 6 caractères.");
    if (password !== confirmPassword)
      return setError("Les mots de passe ne correspondent pas.");
    if (!codeEcole.trim()) return setError("Le code de l'école est requis.");
    if (!role) return setError("Veuillez sélectionner un rôle.");
    if (role === "eleve" && !matricule.trim())
      return setError("Le matricule est requis pour les élèves.");
    if (!acceptConditions)
      return setError("Vous devez accepter les conditions d'utilisation.");

    setLoading(true);
    try {
      await register({
        nom: nom.trim(),
        login: login.trim(),
        password,
        codeEcole: codeEcole.trim().toUpperCase(),
        role,
        matricule:
          role === "eleve" ? matricule.trim().toUpperCase() : undefined,
      });
      setSuccess(true);
      redirectTimeoutRef.current = setTimeout(() => {
        redirectTimeoutRef.current = null;
        onSwitchToLogin();
      }, 2500);
    } catch (err) {
      const msg =
        (err && typeof err === "object" && err.message) ||
        (typeof err === "string" ? err : "") ||
        "Erreur lors de l'inscription.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ════════════════════════════════════════════════════════════════════
  // Styles
  // ════════════════════════════════════════════════════════════════════
  const accent = dark ? "#818CF8" : "#4F46E5";
  const accentHover = dark ? "#6366F1" : "#4338CA";
  const accentDisabled = "#A5B4FC";
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#CBD5E1" : "#64748B";
  const hintColor = dark ? "#94A3B8" : "#6B7280";
  const labelColor = dark ? "#CBD5E1" : "#374151";
  const inputBg = dark ? "#0F172A" : "#F9FAFB";
  const inputText = dark ? "#F1F5F9" : "#1E293B";
  const inputBorder = dark ? "rgba(255,255,255,0.1)" : "#E2E8F0";

  const labelStyle = {
    display: "block",
    marginBottom: 6,
    fontWeight: 500,
    fontSize: isMobile ? 15 : 14,
    color: labelColor,
  };

  const containerPadding = isMobile
    ? `calc(16px + ${SAFE_TOP}) calc(16px + ${SAFE_RIGHT}) calc(16px + ${SAFE_BOTTOM}) calc(16px + ${SAFE_LEFT})`
    : "24px";
  const cardPadding = isMobile ? "28px 20px" : "40px 32px";
  const logoSize = isMobile ? 80 : 100;
  const titleFontSize = isMobile ? 20 : 24;
  const roleButtonPadding = isMobile ? "10px 14px" : "8px 16px";
  const errorFontSize = isMobile ? 14 : 13;
  const successFontSize = isMobile ? 14 : 13;
  const conditionsFontSize = isMobile ? 14 : 13;

  // ✨ fieldContainerStyle avec focus state
  const fieldContainerStyle = useCallback(
    (fieldName) => ({
      display: "flex",
      alignItems: "center",
      border: `1.5px solid ${
        focusedField === fieldName ? accent : inputBorder
      }`,
      borderRadius: 10,
      background: inputBg,
      transition: "border-color 0.2s ease",
      height: isMobile ? MOBILE_TAP + 8 : 46,
      boxSizing: "border-box",
      position: "relative",
      WebkitTapHighlightColor: "transparent",
    }),
    [focusedField, accent, inputBorder, inputBg, isMobile]
  );

  const iconStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: isMobile ? 48 : 44,
    flexShrink: 0,
    color: dark ? "#94A3B8" : "#9CA3AF",
  };

  const inputStyle = {
    flex: 1,
    border: "none",
    outline: "none",
    background: "transparent",
    color: inputText,
    fontSize: isMobile ? 16 : 14,
    height: "100%",
    padding: "0 12px 0 0",
    boxSizing: "border-box",
    fontFamily: "inherit",
    WebkitAppearance: "none",
    touchAction: "manipulation",
  };

  // ✅ Force majuscules pendant la saisie
  const handleCodeEcoleChange = (e) => {
    setCodeEcole(e.target.value.toUpperCase());
  };

  return (
    <div
      style={{
        // ✨ 100dvh + safe-area pour iOS
        minHeight: "100vh",
        height: isMobile ? "100dvh" : undefined,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: dark ? "#0F172A" : "#F3F4F6",
        padding: containerPadding,
        transition: "background-color 0.3s",
        boxSizing: "border-box",
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
        overscrollBehavior: "contain",
      }}
    >
      {RegisterKeyframes}

      <div
        style={{
          background: dark ? "#1E293B" : "#FFFFFF",
          borderRadius: 16,
          boxShadow: dark
            ? "0 4px 12px rgba(0,0,0,0.5)"
            : "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)",
          padding: cardPadding,
          width: "100%",
          maxWidth: 480,
          transition: "background-color 0.3s",
          boxSizing: "border-box",
        }}
      >
        {/* ═══ En-tête ═══ */}
        <div
          style={{
            textAlign: "center",
            marginBottom: isMobile ? 24 : 32,
          }}
        >
          <img
            src="/logo.png"
            alt="School Management"
            style={{
              width: logoSize,
              height: logoSize,
              marginBottom: 12,
              objectFit: "contain",
            }}
          />
          <h1
            style={{
              fontSize: titleFontSize,
              fontWeight: 700,
              color: textPrimary,
              margin: 0,
            }}
          >
            School Management
          </h1>
          <p
            style={{
              color: textSecondary,
              marginTop: 8,
              fontSize: 14,
            }}
          >
            Créer un compte
          </p>
        </div>

        {/* ═══ Succès ═══ */}
        {success && (
          <div
            role="status"
            aria-live="polite"
            style={{
              background: dark ? "#064E3B" : "#D1FAE5",
              color: dark ? "#34D399" : "#065F46",
              padding: "12px 14px",
              borderRadius: 8,
              fontSize: successFontSize,
              fontWeight: 500,
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
            Compte créé avec succès ! Redirection...
          </div>
        )}

        <form onSubmit={handleSubmit} autoComplete="off">
          {/* ═══ Nom complet ═══ */}
          <div style={{ marginBottom: 20 }}>
            <label htmlFor="nom" style={labelStyle}>
              Nom complet
            </label>
            <div style={fieldContainerStyle("nom")}>
              <span style={iconStyle} aria-hidden="true">
                <User size={18} />
              </span>
              <input
                id="nom"
                type="text"
                placeholder="Votre nom"
                value={nom}
                onChange={(e) => {
                  setNom(e.target.value);
                  if (error) setError("");
                }}
                onFocus={() => setFocusedField("nom")}
                onBlur={() => setFocusedField(null)}
                style={inputStyle}
                autoComplete="name"
                autoFocus
                enterKeyHint="next"
                autoCorrect="off"
                spellCheck="false"
                required
              />
            </div>
          </div>

          {/* ═══ Rôle ═══ */}
          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Vous êtes</label>
            <div
              style={{
                display: "flex",
                gap: isMobile ? 6 : 8,
                flexWrap: "wrap",
              }}
              role="radiogroup"
              aria-label="Sélection du rôle"
            >
              {ROLES.map((r) => {
                const isPressed = pressedBtn === `role-${r.value}`;
                return (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => {
                      setRole(r.value);
                      if (error) setError("");
                    }}
                    onTouchStart={pressBtn(`role-${r.value}`)}
                    onTouchEnd={releaseBtn}
                    onTouchCancel={releaseBtn}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: roleButtonPadding,
                      background: role === r.value ? accent : "transparent",
                      color:
                        role === r.value
                          ? "#FFFFFF"
                          : dark
                          ? "#CBD5E1"
                          : "#374151",
                      border: `1.5px solid ${
                        role === r.value ? accent : inputBorder
                      }`,
                      borderRadius: 10,
                      fontSize: 14,
                      fontWeight: 500,
                      cursor: "pointer",
                      transition:
                        "all 0.15s ease, transform 0.1s ease",
                      transform: isPressed ? "scale(0.97)" : "scale(1)",
                      minHeight: isMobile ? MOBILE_TAP : undefined,
                      // ✨ Neutralise tap delay
                      WebkitTapHighlightColor: "transparent",
                      touchAction: "manipulation",
                      fontFamily: "inherit",
                      outline: "none",
                    }}
                    aria-pressed={role === r.value}
                  >
                    {r.icon}
                    {r.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ═══ Matricule élève ═══ */}
          {role === "eleve" && (
            <div style={{ marginBottom: 20 }}>
              <label htmlFor="matricule" style={labelStyle}>
                Matricule de l'élève
              </label>
              <div style={fieldContainerStyle("matricule")}>
                <span style={iconStyle} aria-hidden="true">
                  <BadgeCheck size={18} />
                </span>
                <input
                  id="matricule"
                  type="text"
                  placeholder="Ex: A1B2C3"
                  value={matricule}
                  onChange={(e) => {
                    setMatricule(e.target.value);
                    if (error) setError("");
                  }}
                  onFocus={() => setFocusedField("matricule")}
                  onBlur={() => setFocusedField(null)}
                  style={inputStyle}
                  autoComplete="off"
                  enterKeyHint="next"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  required
                />
              </div>
              <p
                style={{
                  color: hintColor,
                  fontSize: 12,
                  marginTop: 4,
                  lineHeight: 1.4,
                }}
              >
                Ce matricule vous a été fourni par votre établissement.
              </p>
            </div>
          )}

          {/* ═══ Identifiant ═══ */}
          <div style={{ marginBottom: 20 }}>
            <label htmlFor="login" style={labelStyle}>
              Identifiant
            </label>
            <div style={fieldContainerStyle("login")}>
              <span style={iconStyle} aria-hidden="true">
                <User size={18} />
              </span>
              <input
                id="login"
                type="text"
                placeholder="Choisissez un identifiant"
                value={login}
                onChange={(e) => {
                  setLogin(e.target.value);
                  if (error) setError("");
                }}
                onFocus={() => setFocusedField("login")}
                onBlur={() => setFocusedField(null)}
                style={inputStyle}
                autoComplete="username"
                enterKeyHint="next"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                required
              />
            </div>
          </div>

          {/* ═══ Mot de passe ═══ */}
          <div style={{ marginBottom: 20 }}>
            <label htmlFor="password" style={labelStyle}>
              Mot de passe
            </label>
            <div style={fieldContainerStyle("password")}>
              <span style={iconStyle} aria-hidden="true">
                <Lock size={18} />
              </span>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Minimum 6 caractères"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError("");
                }}
                onFocus={() => setFocusedField("password")}
                onBlur={() => setFocusedField(null)}
                style={{ ...inputStyle, paddingRight: isMobile ? 48 : 42 }}
                autoComplete="new-password"
                enterKeyHint="next"
                required
              />
              {/* ✨ Toggle password : zone 44×44 */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                onTouchStart={pressBtn("toggle-pwd")}
                onTouchEnd={releaseBtn}
                onTouchCancel={releaseBtn}
                aria-label={
                  showPassword
                    ? "Masquer le mot de passe"
                    : "Afficher le mot de passe"
                }
                style={{
                  position: "absolute",
                  right: isMobile ? 4 : 8,
                  top: "50%",
                  transform: `translateY(-50%) scale(${
                    pressedBtn === "toggle-pwd" ? 0.9 : 1
                  })`,
                  background: "transparent",
                  border: "none",
                  color: dark ? "#94A3B8" : "#9CA3AF",
                  cursor: "pointer",
                  padding: 0,
                  width: isMobile ? MOBILE_TAP : 36,
                  height: isMobile ? MOBILE_TAP : 36,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 8,
                  transition: "transform 0.1s ease",
                  WebkitTapHighlightColor: "transparent",
                  touchAction: "manipulation",
                }}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {/* Force du mot de passe */}
            {password && passwordStrength && (
              <div style={{ marginTop: 8 }}>
                <div
                  style={{
                    height: 4,
                    background: dark ? "#334155" : "#E2E8F0",
                    borderRadius: 2,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: passwordStrength.width,
                      background: passwordStrength.color,
                      height: "100%",
                      borderRadius: 2,
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginTop: 4,
                    flexDirection: isMobile ? "column" : "row",
                    gap: 4,
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      color: passwordStrength.color,
                      fontWeight: 600,
                    }}
                  >
                    {passwordStrength.label}
                  </span>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 8,
                      fontSize: 11,
                      justifyContent: isMobile ? "center" : "flex-start",
                    }}
                  >
                    {[
                      {
                        ok: passwordStrength.checks.length,
                        label: "6+ caractères",
                      },
                      {
                        ok: passwordStrength.checks.uppercase,
                        label: "Majuscule",
                      },
                      {
                        ok: passwordStrength.checks.number,
                        label: "Chiffre",
                      },
                      {
                        ok: passwordStrength.checks.special,
                        label: "Symbole",
                      },
                    ].map((c) => (
                      <span
                        key={c.label}
                        style={{
                          color: c.ok ? "#10B981" : "#EF4444",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 3,
                        }}
                      >
                        {c.ok ? <Check size={12} /> : <XCircle size={12} />}
                        {c.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ═══ Confirmation ═══ */}
          <div style={{ marginBottom: 20 }}>
            <label htmlFor="confirm-password" style={labelStyle}>
              Confirmer le mot de passe
            </label>
            <div style={fieldContainerStyle("confirm")}>
              <span style={iconStyle} aria-hidden="true">
                <Lock size={18} />
              </span>
              <input
                id="confirm-password"
                type={showConfirm ? "text" : "password"}
                placeholder="Répéter le mot de passe"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (error) setError("");
                }}
                onFocus={() => setFocusedField("confirm")}
                onBlur={() => setFocusedField(null)}
                style={{ ...inputStyle, paddingRight: isMobile ? 48 : 42 }}
                autoComplete="new-password"
                enterKeyHint="next"
                required
              />
              {/* ✨ Toggle confirm : zone 44×44 */}
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                onTouchStart={pressBtn("toggle-confirm")}
                onTouchEnd={releaseBtn}
                onTouchCancel={releaseBtn}
                aria-label={
                  showConfirm
                    ? "Masquer la confirmation"
                    : "Afficher la confirmation"
                }
                style={{
                  position: "absolute",
                  right: isMobile ? 4 : 8,
                  top: "50%",
                  transform: `translateY(-50%) scale(${
                    pressedBtn === "toggle-confirm" ? 0.9 : 1
                  })`,
                  background: "transparent",
                  border: "none",
                  color: dark ? "#94A3B8" : "#9CA3AF",
                  cursor: "pointer",
                  padding: 0,
                  width: isMobile ? MOBILE_TAP : 36,
                  height: isMobile ? MOBILE_TAP : 36,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 8,
                  transition: "transform 0.1s ease",
                  WebkitTapHighlightColor: "transparent",
                  touchAction: "manipulation",
                }}
              >
                {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {confirmPassword && confirmPassword !== password && (
              <p
                role="alert"
                style={{
                  color: "#EF4444",
                  fontSize: 12,
                  marginTop: 4,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <XCircle size={14} style={{ flexShrink: 0 }} /> Les mots de
                passe ne correspondent pas.
              </p>
            )}
          </div>

          {/* ═══ Code école ═══ */}
          <div style={{ marginBottom: 24 }}>
            <label htmlFor="codeEcole" style={labelStyle}>
              Code de l'école
            </label>
            <div style={fieldContainerStyle("codeEcole")}>
              <span style={iconStyle} aria-hidden="true">
                <School size={18} />
              </span>
              <input
                id="codeEcole"
                type="text"
                placeholder="Ex: ABC123"
                value={codeEcole}
                onChange={handleCodeEcoleChange}
                onFocus={() => setFocusedField("codeEcole")}
                onBlur={() => setFocusedField(null)}
                style={{ ...inputStyle, letterSpacing: 1, fontWeight: 600 }}
                autoComplete="off"
                enterKeyHint="next"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck="false"
                required
              />
            </div>
            <p
              style={{
                color: hintColor,
                fontSize: 12,
                marginTop: 4,
                lineHeight: 1.4,
              }}
            >
              Ce code vous est fourni par votre établissement.
            </p>
          </div>

          {/* ═══ Conditions ═══ */}
          <div
            style={{
              marginBottom: 20,
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
            }}
          >
            {/* ✨ Checkbox avec zone tap agrandie */}
            <div
              style={{
                position: "relative",
                flexShrink: 0,
                marginTop: 2,
              }}
            >
              <input
                type="checkbox"
                id="conditions"
                checked={acceptConditions}
                onChange={(e) => {
                  setAcceptConditions(e.target.checked);
                  if (error) setError("");
                }}
                style={{
                  width: isMobile ? 22 : 18,
                  height: isMobile ? 22 : 18,
                  cursor: "pointer",
                  accentColor: accent,
                  WebkitTapHighlightColor: "transparent",
                  touchAction: "manipulation",
                }}
                required
              />
            </div>
            <label
              htmlFor="conditions"
              style={{
                fontSize: conditionsFontSize,
                color: dark ? "#CBD5E1" : "#4B5563",
                cursor: "pointer",
                lineHeight: 1.5,
                userSelect: "none",
              }}
            >
              J'accepte les conditions d'utilisation et la politique de
              confidentialité.
            </label>
          </div>

          {/* ═══ Erreur ═══ */}
          {error && (
            <div
              role="alert"
              style={{
                background: dark ? "#7F1D1D" : "#FEE2E2",
                color: dark ? "#F87171" : "#B91C1C",
                padding: "10px 14px",
                borderRadius: 8,
                fontSize: errorFontSize,
                fontWeight: 500,
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* ═══ Submit ═══ */}
          <button
            type="submit"
            disabled={loading || success}
            onTouchStart={
              !loading && !success ? pressBtn("submit") : undefined
            }
            onTouchEnd={releaseBtn}
            onTouchCancel={releaseBtn}
            style={{
              width: "100%",
              padding: isMobile ? "14px 0" : "12px 0",
              background:
                loading || success
                  ? accentDisabled
                  : pressedBtn === "submit"
                  ? accentHover
                  : accent,
              color: "#FFFFFF",
              border: "none",
              borderRadius: 10,
              fontSize: 16,
              fontWeight: 600,
              cursor: loading || success ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition:
                "background 0.12s ease, transform 0.1s ease, box-shadow 0.15s ease",
              transform:
                pressedBtn === "submit" && !loading && !success
                  ? "scale(0.98)"
                  : "scale(1)",
              boxShadow: dark
                ? "0 4px 12px rgba(0,0,0,0.3)"
                : "0 4px 12px rgba(79,70,229,0.2)",
              minHeight: MOBILE_TAP,
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
              fontFamily: "inherit",
              boxSizing: "border-box",
            }}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="rs-spin" />
                Création...
              </>
            ) : (
              "Créer un compte"
            )}
          </button>
        </form>

        {/* ═══ Pied ═══ */}
        <div style={{ marginTop: 20, textAlign: "center" }}>
          <p
            style={{
              color: dark ? "#CBD5E1" : "#6B7280",
              fontSize: 14,
              margin: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              flexWrap: "wrap",
            }}
          >
            Déjà un compte ?
            <button
              type="button"
              onClick={onSwitchToLogin}
              onTouchStart={pressBtn("login-link")}
              onTouchEnd={releaseBtn}
              onTouchCancel={releaseBtn}
              style={{
                background: "transparent",
                border: "none",
                color: accent,
                textDecoration: "underline",
                fontWeight: 600,
                cursor: "pointer",
                fontSize: 14,
                padding: "6px 4px",
                // ✨ Zone tap verticale agrandie
                minHeight: 40,
                display: "inline-flex",
                alignItems: "center",
                transform:
                  pressedBtn === "login-link" ? "scale(0.97)" : "scale(1)",
                transition: "transform 0.1s ease",
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation",
                fontFamily: "inherit",
              }}
            >
              Se connecter
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}