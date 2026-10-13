// src/components/RegisterScreen.jsx
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  Loader2, User, Lock, Eye, EyeOff, School, UserCheck, BadgeCheck,
  CheckCircle2, XCircle, AlertCircle, Check, AlertTriangle, ShieldCheck,
} from "lucide-react";

// ════════════════════════════════════════════════════════════════════
// SAFE-AREA
// ════════════════════════════════════════════════════════════════════
const SAFE_TOP = "env(safe-area-inset-top, 0px)";
const SAFE_BOTTOM = "env(safe-area-inset-bottom, 0px)";
const SAFE_LEFT = "env(safe-area-inset-left, 0px)";
const SAFE_RIGHT = "env(safe-area-inset-right, 0px)";

const MOBILE_TAP = 44;

// ════════════════════════════════════════════════════════════════════
// RADIUS UNIFIÉS (aligné LoginScreen)
// ════════════════════════════════════════════════════════════════════
const RADIUS = {
  card: 16,
  input: 12,
  button: 12,
  small: 8,
};

// ════════════════════════════════════════════════════════════════════
// REDIRECT COUNTDOWN
// ════════════════════════════════════════════════════════════════════
const REDIRECT_SECONDS = 5;

// ════════════════════════════════════════════════════════════════════
// KEYFRAMES module-level
// ════════════════════════════════════════════════════════════════════
const RegisterKeyframes = (
  <style>{`
    @keyframes rs-spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
    @keyframes rs-shake {
      0%, 100% { transform: translateX(0); }
      25%      { transform: translateX(-4px); }
      75%      { transform: translateX(4px); }
    }
    .rs-spin {
      animation: rs-spin 1s linear infinite;
    }
    .rs-shake {
      animation: rs-shake 0.3s ease-in-out;
    }
    @media (prefers-reduced-motion: reduce) {
      .rs-spin, .rs-shake { animation: none !important; }
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
  const [errorField, setErrorField] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(REDIRECT_SECONDS);
  const [acceptConditions, setAcceptConditions] = useState(false);

  // ✨ Focus / feedback / warnings
  const [focusedField, setFocusedField] = useState(null);
  const [pressedBtn, setPressedBtn] = useState(null);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [shakeError, setShakeError] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  const register = useMutation(api.users.register);
  const redirectTimeoutRef = useRef(null);
  const countdownTimeoutRef = useRef(null);

  // Refs pour focus dynamique
  const nomRef = useRef(null);
  const loginRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmRef = useRef(null);
  const codeEcoleRef = useRef(null);
  const matriculeRef = useRef(null);

  // ✨ Handlers touch génériques
  const pressBtn = useCallback((id) => () => setPressedBtn(id), []);
  const releaseBtn = useCallback(() => setPressedBtn(null), []);

  // ════════════════════════════════════════════════════════════════════
  // Cleanup
  // ════════════════════════════════════════════════════════════════════
  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) clearTimeout(redirectTimeoutRef.current);
      if (countdownTimeoutRef.current) clearTimeout(countdownTimeoutRef.current);
    };
  }, []);

  // ════════════════════════════════════════════════════════════════════
  // Force du mot de passe
  // ════════════════════════════════════════════════════════════════════
  const passwordStrength = useMemo(() => {
    if (!password) return null;
    const checks = {
      hasMinLength: password.length >= 6,
      long: password.length >= 10,
      uppercase: /[A-Z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
    };
    const score = [
      checks.hasMinLength,
      checks.uppercase,
      checks.number,
      checks.special,
      checks.long,
    ].filter(Boolean).length;

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
  // Shake à chaque erreur
  // ════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!error) return;
    setShakeError(true);
    const t = setTimeout(() => setShakeError(false), 400);
    return () => clearTimeout(t);
  }, [error]);

  // ════════════════════════════════════════════════════════════════════
  // Caps Lock détection
  // ════════════════════════════════════════════════════════════════════
  const handleKeyEvent = useCallback((e) => {
    if (typeof e.getModifierState === "function") {
      setCapsLockOn(e.getModifierState("CapsLock"));
    }
  }, []);

  // ════════════════════════════════════════════════════════════════════
  // Focus sur le premier champ en erreur
  // ════════════════════════════════════════════════════════════════════
  const focusField = useCallback((field) => {
    const map = {
      nom: nomRef,
      login: loginRef,
      password: passwordRef,
      confirm: confirmRef,
      codeEcole: codeEcoleRef,
      matricule: matriculeRef,
    };
    const ref = map[field];
    if (ref?.current) {
      ref.current.focus();
      ref.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, []);

  // ════════════════════════════════════════════════════════════════════
  // Effacement d'erreur au tap dans un champ
  // ════════════════════════════════════════════════════════════════════
  const clearError = useCallback(() => {
    if (error) {
      setError("");
      setErrorField(null);
    }
  }, [error]);

  // ════════════════════════════════════════════════════════════════════
  // Validation
  // ════════════════════════════════════════════════════════════════════
  const validateForm = useCallback(() => {
    if (!nom.trim()) return { field: "nom", msg: "Le nom complet est requis." };
    if (!login.trim()) return { field: "login", msg: "L'identifiant est requis." };
    if (!/^[a-zA-Z0-9._-]{3,20}$/.test(login.trim())) {
      return {
        field: "login",
        msg: "L'identifiant doit contenir entre 3 et 20 caractères (lettres, chiffres, points, tirets, underscores).",
      };
    }
    if (!password) return { field: "password", msg: "Le mot de passe est requis." };
    if (password.length < 6) {
      return {
        field: "password",
        msg: "Le mot de passe doit contenir au moins 6 caractères.",
      };
    }
    if (password !== confirmPassword) {
      return {
        field: "confirm",
        msg: "Les mots de passe ne correspondent pas.",
      };
    }
    if (role === "eleve" && !matricule.trim()) {
      return { field: "matricule", msg: "Le matricule est requis pour les élèves." };
    }
    if (!codeEcole.trim()) {
      return { field: "codeEcole", msg: "Le code de l'école est requis." };
    }
    if (!role) return { field: "role", msg: "Veuillez sélectionner un rôle." };
    if (!acceptConditions) {
      return {
        field: "conditions",
        msg: "Vous devez accepter les conditions d'utilisation.",
      };
    }
    return null;
  }, [nom, login, password, confirmPassword, codeEcole, role, matricule, acceptConditions]);

  // ════════════════════════════════════════════════════════════════════
  // Redirection avec compte à rebours
  // ════════════════════════════════════════════════════════════════════
  const startRedirectCountdown = useCallback(() => {
    let remaining = REDIRECT_SECONDS;
    setRedirectCountdown(remaining);

    const tick = () => {
      remaining -= 1;
      setRedirectCountdown(remaining);
      if (remaining <= 0) {
        onSwitchToLogin();
        return;
      }
      countdownTimeoutRef.current = setTimeout(tick, 1000);
    };
    countdownTimeoutRef.current = setTimeout(tick, 1000);
  }, [onSwitchToLogin]);

  // ════════════════════════════════════════════════════════════════════
  // Soumission
  // ════════════════════════════════════════════════════════════════════
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading || success) return;

    setError("");
    setErrorField(null);

    const validation = validateForm();
    if (validation) {
      setError(validation.msg);
      setErrorField(validation.field);
      // Focus uniquement sur un champ input réel
      if (validation.field !== "role" && validation.field !== "conditions") {
        setTimeout(() => focusField(validation.field), 100);
      }
      return;
    }

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
      startRedirectCountdown();
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
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const inputBg = dark ? "#0F172A" : "#F9FAFB";
  const inputText = dark ? "#F1F5F9" : "#1E293B";
  const inputBorder = dark ? "#334155" : "#E2E8F0";
  const errorBorder = "#EF4444";

  const labelStyle = {
    display: "block",
    marginBottom: 6,
    fontWeight: 500,
    fontSize: isMobile ? 15 : 14,
    color: labelColor,
  };

  const requiredStar = (
    <span style={{ color: "#EF4444", marginLeft: 3 }} aria-hidden="true">
      *
    </span>
  );

  const containerPadding = isMobile
    ? `calc(16px + ${SAFE_TOP}) calc(16px + ${SAFE_RIGHT}) calc(16px + ${SAFE_BOTTOM}) calc(16px + ${SAFE_LEFT})`
    : "24px";
  const cardPadding = isMobile ? "24px 18px" : "32px 28px";
  const logoSize = isMobile ? 64 : 72;
  const titleFontSize = isMobile ? 22 : 24;

  // ✨ fieldContainerStyle avec état erreur
  const fieldContainerStyle = useCallback(
    (fieldName) => {
      const hasError = errorField === fieldName;
      return {
        display: "flex",
        alignItems: "center",
        border: `1.5px solid ${
          hasError ? errorBorder : focusedField === fieldName ? accent : inputBorder
        }`,
        borderRadius: RADIUS.input,
        background: inputBg,
        transition: "border-color 0.2s ease",
        height: isMobile ? MOBILE_TAP + 8 : 46,
        boxSizing: "border-box",
        position: "relative",
        WebkitTapHighlightColor: "transparent",
      };
    },
    [errorField, focusedField, accent, inputBorder, inputBg, isMobile]
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

  // ════════════════════════════════════════════════════════════════════
  // RENDU
  // ════════════════════════════════════════════════════════════════════
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",           // ← ajoute
        flexDirection: "column",   // ← ajoute
        background: dark ? "#0F172A" : "#F3F4F6",
        padding: containerPadding,
        transition: "background-color 0.3s",
        boxSizing: "border-box",
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
      }}
    >
      {RegisterKeyframes}

      <div
        style={{
          background: cardBg,
          borderRadius: RADIUS.card,
          boxShadow: dark
            ? "0 4px 12px rgba(0,0,0,0.3)"
            : "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)",
          border: `1px solid ${cardBorder}`,
          padding: cardPadding,
          width: "100%",
          maxWidth: 480,
          margin: "auto",
          transition: "background-color 0.3s, border-color 0.3s",
          boxSizing: "border-box",
          position: "relative",
        }}
      >
        {/* ═══ En-tête ═══ */}
        <div style={{ textAlign: "center", marginBottom: isMobile ? 20 : 28 }}>
          {!logoFailed ? (
            <img
              src="/logo.png"
              alt="School Management"
              onError={() => setLogoFailed(true)}
              style={{
                width: logoSize,
                height: logoSize,
                marginBottom: 12,
                objectFit: "contain",
              }}
            />
          ) : (
            <div
              aria-hidden="true"
              style={{
                width: logoSize,
                height: logoSize,
                marginBottom: 12,
                marginLeft: "auto",
                marginRight: "auto",
                borderRadius: "50%",
                background: dark ? "#312E81" : "#EEF2FF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ShieldCheck size={logoSize / 2} color={accent} />
            </div>
          )}
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
              marginBottom: 0,
              fontSize: 14,
            }}
          >
            Créer un compte
          </p>
        </div>

        {/* ═══ SUCCÈS ═══ */}
        {success && (
          <div
            role="status"
            aria-live="polite"
            style={{
              background: dark ? "#064E3B" : "#D1FAE5",
              color: dark ? "#34D399" : "#065F46",
              padding: "14px 16px",
              borderRadius: RADIUS.small,
              fontSize: isMobile ? 14 : 13,
              fontWeight: 500,
              marginBottom: 20,
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
            }}
          >
            <CheckCircle2 size={20} style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>
                Compte créé avec succès !
              </div>
              <div style={{ fontSize: 12, opacity: 0.9 }}>
                Redirection vers la connexion dans{" "}
                <strong>{Math.max(redirectCountdown, 0)}s</strong>…
              </div>
              <button
                type="button"
                onClick={onSwitchToLogin}
                style={{
                  marginTop: 8,
                  background: "transparent",
                  border: "none",
                  color: "inherit",
                  textDecoration: "underline",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: 12,
                  padding: 0,
                  fontFamily: "inherit",
                }}
              >
                Se connecter maintenant
              </button>
            </div>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          autoComplete="off"
          style={success ? { pointerEvents: "none", opacity: 0.5 } : undefined}
        >
          {/* ═══ Nom complet ═══ */}
          <div style={{ marginBottom: 20 }}>
            <label htmlFor="nom" style={labelStyle}>
              Nom complet {requiredStar}
            </label>
            <div style={fieldContainerStyle("nom")}>
              <span style={iconStyle} aria-hidden="true">
                <User size={18} />
              </span>
              <input
                ref={nomRef}
                id="nom"
                type="text"
                placeholder="Votre nom"
                value={nom}
                onChange={(e) => {
                  setNom(e.target.value);
                  clearError();
                }}
                onFocus={() => setFocusedField("nom")}
                onBlur={() => setFocusedField(null)}
                style={inputStyle}
                autoComplete="name"
                enterKeyHint="next"
                autoCorrect="off"
                spellCheck="false"
              />
            </div>
          </div>

          {/* ═══ Rôle ═══ */}
          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Vous êtes {requiredStar}</label>
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
                const hasError = errorField === "role" && !role;
                return (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => {
                      setRole(r.value);
                      clearError();
                    }}
                    onTouchStart={pressBtn(`role-${r.value}`)}
                    onTouchEnd={releaseBtn}
                    onTouchCancel={releaseBtn}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: isMobile ? "10px 14px" : "8px 16px",
                      background: role === r.value ? accent : "transparent",
                      color:
                        role === r.value
                          ? "#FFFFFF"
                          : dark
                          ? "#CBD5E1"
                          : "#374151",
                      border: `1.5px solid ${
                        hasError
                          ? errorBorder
                          : role === r.value
                          ? accent
                          : inputBorder
                      }`,
                      borderRadius: RADIUS.input,
                      fontSize: 14,
                      fontWeight: 500,
                      cursor: "pointer",
                      transition: "all 0.15s ease, transform 0.1s ease",
                      transform: isPressed ? "scale(0.97)" : "scale(1)",
                      minHeight: isMobile ? MOBILE_TAP : undefined,
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
                Matricule de l'élève {requiredStar}
              </label>
              <div style={fieldContainerStyle("matricule")}>
                <span style={iconStyle} aria-hidden="true">
                  <BadgeCheck size={18} />
                </span>
                <input
                  ref={matriculeRef}
                  id="matricule"
                  type="text"
                  placeholder="Ex: A1B2C3"
                  value={matricule}
                  onChange={(e) => {
                    setMatricule(e.target.value);
                    clearError();
                  }}
                  onFocus={() => setFocusedField("matricule")}
                  onBlur={() => setFocusedField(null)}
                  style={inputStyle}
                  autoComplete="off"
                  enterKeyHint="next"
                  autoCapitalize="characters"
                  autoCorrect="off"
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
              Identifiant {requiredStar}
            </label>
            <div style={fieldContainerStyle("login")}>
              <span style={iconStyle} aria-hidden="true">
                <User size={18} />
              </span>
              <input
                ref={loginRef}
                id="login"
                type="text"
                placeholder="Choisissez un identifiant"
                value={login}
                onChange={(e) => {
                  setLogin(e.target.value);
                  clearError();
                }}
                onFocus={() => setFocusedField("login")}
                onBlur={() => setFocusedField(null)}
                style={inputStyle}
                autoComplete="username"
                enterKeyHint="next"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
              />
            </div>
          </div>

          {/* ═══ Mot de passe ═══ */}
          <div style={{ marginBottom: 20 }}>
            <label htmlFor="password" style={labelStyle}>
              Mot de passe {requiredStar}
            </label>
            <div style={fieldContainerStyle("password")}>
              <span style={iconStyle} aria-hidden="true">
                <Lock size={18} />
              </span>
              <input
                ref={passwordRef}
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Minimum 6 caractères"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearError();
                }}
                onFocus={() => setFocusedField("password")}
                onBlur={() => {
                  setFocusedField(null);
                  setCapsLockOn(false);
                }}
                onKeyDown={handleKeyEvent}
                onKeyUp={handleKeyEvent}
                style={{ ...inputStyle, paddingRight: isMobile ? 48 : 42 }}
                autoComplete="new-password"
                enterKeyHint="next"
              />
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
                  borderRadius: RADIUS.small,
                  transition: "transform 0.1s ease",
                  WebkitTapHighlightColor: "transparent",
                  touchAction: "manipulation",
                }}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {/* Caps Lock warning */}
            {capsLockOn && (
              <div
                role="status"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 6,
                  fontSize: 12,
                  color: dark ? "#FBBF24" : "#92400E",
                }}
              >
                <AlertTriangle size={12} />
                Verrouillage majuscules activé
              </div>
            )}

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
                        ok: passwordStrength.checks.hasMinLength,
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
              Confirmer le mot de passe {requiredStar}
            </label>
            <div style={fieldContainerStyle("confirm")}>
              <span style={iconStyle} aria-hidden="true">
                <Lock size={18} />
              </span>
              <input
                ref={confirmRef}
                id="confirm-password"
                type={showConfirm ? "text" : "password"}
                placeholder="Répéter le mot de passe"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  clearError();
                }}
                onFocus={() => setFocusedField("confirm")}
                onBlur={() => setFocusedField(null)}
                style={{ ...inputStyle, paddingRight: isMobile ? 48 : 42 }}
                autoComplete="new-password"
                enterKeyHint="next"
              />
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
                  borderRadius: RADIUS.small,
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
              Code de l'école {requiredStar}
            </label>
            <div style={fieldContainerStyle("codeEcole")}>
              <span style={iconStyle} aria-hidden="true">
                <School size={18} />
              </span>
              <input
                ref={codeEcoleRef}
                id="codeEcole"
                type="text"
                placeholder="Ex: ABC123"
                value={codeEcole}
                onChange={(e) => {
                  setCodeEcole(e.target.value.toUpperCase());
                  clearError();
                }}
                onFocus={() => setFocusedField("codeEcole")}
                onBlur={() => setFocusedField(null)}
                style={{ ...inputStyle, letterSpacing: 1, fontWeight: 600 }}
                autoComplete="off"
                enterKeyHint="next"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck="false"
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
                  clearError();
                }}
                style={{
                  width: isMobile ? 22 : 18,
                  height: isMobile ? 22 : 18,
                  cursor: "pointer",
                  accentColor: accent,
                  outline:
                    errorField === "conditions"
                      ? `2px solid ${errorBorder}`
                      : "none",
                  outlineOffset: 2,
                  borderRadius: 4,
                  WebkitTapHighlightColor: "transparent",
                  touchAction: "manipulation",
                }}
              />
            </div>
            <label
              htmlFor="conditions"
              style={{
                fontSize: isMobile ? 14 : 13,
                color: dark ? "#CBD5E1" : "#4B5563",
                cursor: "pointer",
                lineHeight: 1.5,
                userSelect: "none",
              }}
            >
              J'accepte les conditions d'utilisation et la politique de
              confidentialité. {requiredStar}
            </label>
          </div>

          {/* ═══ ERREUR (juste au-dessus du bouton) ═══ */}
          {error && (
            <div
              role="alert"
              className={shakeError ? "rs-shake" : ""}
              style={{
                background: dark ? "#7F1D1D" : "#FEE2E2",
                color: dark ? "#F87171" : "#B91C1C",
                padding: "10px 14px",
                borderRadius: RADIUS.small,
                fontSize: isMobile ? 14 : 13,
                fontWeight: 500,
                marginBottom: 16,
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
              }}
            >
              <AlertCircle
                size={16}
                style={{ flexShrink: 0, marginTop: 1 }}
              />
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
              borderRadius: RADIUS.button,
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
          <div
            role="group"
            style={{
              color: dark ? "#CBD5E1" : "#6B7280",
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              flexWrap: "wrap",
            }}
          >
            <span>Déjà un compte ?</span>
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
          </div>
        </div>
      </div>
    </div>
  );
}