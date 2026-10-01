// src/components/LoginScreen.jsx
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  Loader2, User, Lock, Eye, EyeOff, LogIn, Clock, ShieldCheck,
  AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";

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
// COMPTE À REBOURS pour le renvoi de code
// ════════════════════════════════════════════════════════════════════
const RESEND_COOLDOWN_S = 30;

// ════════════════════════════════════════════════════════════════════
// KEYFRAMES module-level
// ════════════════════════════════════════════════════════════════════
const LoginKeyframes = (
  <style>{`
    @keyframes lg-spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
    .lg-spin {
      animation: lg-spin 1s linear infinite;
    }
    @media (prefers-reduced-motion: reduce) {
      .lg-spin { animation: none !important; }
    }
  `}</style>
);

export function LoginScreen({ onLogin, onSwitchToRegister }) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();

  const [step, setStep] = useState("credentials");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [errorType, setErrorType] = useState("normal");
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);
  const [pendingUser, setPendingUser] = useState(null);
  const [code, setCode] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // ✨ Focus states (remplacent les mutations DOM)
  const [focusedField, setFocusedField] = useState(null);
  // ✨ Feedback tap
  const [pressedBtn, setPressedBtn] = useState(null);

  const codeInputRef = useRef(null);

  const authenticate = useMutation(api.users.login);
  const sendLoginCode = useMutation(api.twoFactorEmail.sendLoginCode);
  const verifyLoginCode = useMutation(api.twoFactorEmail.verifyLoginCode);

  // ✨ Handlers touch génériques
  const pressBtn = useCallback((id) => () => setPressedBtn(id), []);
  const releaseBtn = useCallback(() => setPressedBtn(null), []);

  // ════════════════════════════════════════════════════════════════════
  // Effet : compte à rebours du renvoi
  // ════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  // ════════════════════════════════════════════════════════════════════
  // Effet : focus auto sur le champ code en 2FA
  // ════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (step === "twoFactor") {
      codeInputRef.current?.focus();
    }
  }, [step]);

  // ════════════════════════════════════════════════════════════════════
  // SOUMISSION DES IDENTIFIANTS
  // ════════════════════════════════════════════════════════════════════
  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setError("");
    setErrorType("normal");

    if (!login.trim() || !password.trim()) {
      setError("Veuillez remplir tous les champs.");
      return;
    }

    setLoading(true);
    try {
      const user = await authenticate({ login: login.trim(), password });

      if (!user) {
        setError("Identifiants incorrects");
        return;
      }

      if (user.requiresTwoFactor) {
        setPendingUser(user);
        setUserId(user._id);
        setCode("");
        setResendCooldown(0);
        setStep("twoFactor");
      } else {
        onLogin(user);
      }
    } catch (err) {
      const msg =
        (err && typeof err === "object" && err.message) ||
        (typeof err === "string" ? err : "") ||
        "Erreur de connexion.";

      if (typeof msg === "string" && msg.toLowerCase().includes("verrouill")) {
        setErrorType("locked");
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ════════════════════════════════════════════════════════════════════
  // SOUMISSION DU CODE 2FA
  // ════════════════════════════════════════════════════════════════════
  const handleTwoFactorSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setError("");
    if (code.length !== 6) {
      setError("Veuillez saisir les 6 chiffres.");
      return;
    }

    setLoading(true);
    try {
      await verifyLoginCode({ userId, code });
      onLogin(pendingUser);
    } catch (err) {
      const msg =
        (err && typeof err === "object" && err.message) ||
        (typeof err === "string" ? err : "") ||
        "Code invalide.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ════════════════════════════════════════════════════════════════════
  // RENVOYER LE CODE
  // ════════════════════════════════════════════════════════════════════
  const handleResendCode = useCallback(async () => {
    if (sendingCode || resendCooldown > 0) return;
    setSendingCode(true);
    setError("");
    try {
      await sendLoginCode({ userId });
      toast.success("Nouveau code envoyé", {
        style: {
          background: dark ? "#1E293B" : "#FFFFFF",
          color: dark ? "#F1F5F9" : "#1E293B",
          border: dark ? "1px solid #334155" : "1px solid #E2E8F0",
        },
      });
      setResendCooldown(RESEND_COOLDOWN_S);
    } catch (err) {
      const msg =
        (err && typeof err === "object" && err.message) ||
        "Impossible de renvoyer le code.";
      setError(msg);
    } finally {
      setSendingCode(false);
    }
  }, [sendingCode, resendCooldown, sendLoginCode, userId, dark]);

  // ════════════════════════════════════════════════════════════════════
  // STYLES
  // ════════════════════════════════════════════════════════════════════
  const containerBg = dark ? "#0F172A" : "#F3F4F6";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#CBD5E1" : "#64748B";
  const labelColor = dark ? "#CBD5E1" : "#374151";
  const inputBg = dark ? "#0F172A" : "#F9FAFB";
  const inputText = dark ? "#F1F5F9" : "#111827";
  const inputBorder = dark ? "#334155" : "#E2E8F0";
  const buttonBg = dark ? "#818CF8" : "#4F46E5";
  const buttonBgHover = dark ? "#6366F1" : "#4338CA";
  const buttonDisabled = "#A5B4FC";
  const accent = dark ? "#818CF8" : "#4F46E5";
  const errorBg =
    errorType === "locked"
      ? dark
        ? "#78350F"
        : "#FEF3C7"
      : dark
      ? "#7F1D1D"
      : "#FEE2E2";
  const errorText =
    errorType === "locked"
      ? dark
        ? "#FBBF24"
        : "#92400E"
      : dark
      ? "#F87171"
      : "#B91C1C";
  const linkColor = accent;
  const iconColor = dark ? "#94A3B8" : "#9CA3AF";

  const inputFontSize = isMobile ? 16 : 14; // 16px évite le zoom iOS
  const cardPadding = isMobile ? "28px 20px" : "40px 32px";
  const logoSize = isMobile ? 64 : 72;

  // ✨ inputStyle fonctionnel (focus par state, pas par DOM)
  const inputStyle = useCallback(
    (fieldName, hasRightPadding = false) => ({
      width: "100%",
      padding: hasRightPadding
        ? `12px ${MOBILE_TAP}px 12px 42px`
        : "12px 14px 12px 42px",
      border: `1.5px solid ${
        focusedField === fieldName ? accent : inputBorder
      }`,
      borderRadius: 10,
      fontSize: inputFontSize,
      outline: "none",
      background: inputBg,
      color: inputText,
      transition: "border-color 0.2s ease",
      boxSizing: "border-box",
      fontFamily: "inherit",
      WebkitAppearance: "none",
      minHeight: isMobile ? MOBILE_TAP : undefined,
      // ✨ Neutralise tap delay
      WebkitTapHighlightColor: "transparent",
      touchAction: "manipulation",
    }),
    [focusedField, inputFontSize, inputBg, inputText, inputBorder, accent, isMobile]
  );

  // ════════════════════════════════════════════════════════════════════
  // RENDU
  // ════════════════════════════════════════════════════════════════════
  return (
    <div
      style={{
        // ✨ 100dvh pour iOS + safe-area
        minHeight: "100vh",
        height: isMobile ? "100dvh" : undefined,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: containerBg,
        // ✨ Safe-area partout
        padding: isMobile
          ? `calc(16px + ${SAFE_TOP}) calc(16px + ${SAFE_RIGHT}) calc(16px + ${SAFE_BOTTOM}) calc(16px + ${SAFE_LEFT})`
          : "24px",
        transition: "background-color 0.3s",
        boxSizing: "border-box",
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
        overscrollBehavior: "contain",
      }}
    >
      {LoginKeyframes}

      <div
        style={{
          background: cardBg,
          borderRadius: 16,
          boxShadow: dark
            ? "0 4px 12px rgba(0,0,0,0.5)"
            : "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)",
          border: `1px solid ${cardBorder}`,
          padding: cardPadding,
          width: "100%",
          maxWidth: 420,
          transition: "background-color 0.3s, border-color 0.3s",
          boxSizing: "border-box",
        }}
      >
        {/* ═══ En-tête ═══ */}
        <div style={{ textAlign: "center", marginBottom: isMobile ? 24 : 32 }}>
          <img
            src="/logo.png"
            alt="School Management"
            style={{
              width: logoSize,
              height: logoSize,
              marginBottom: 16,
              objectFit: "contain",
            }}
          />
          <h1
            style={{
              fontSize: isMobile ? 22 : 24,
              fontWeight: 700,
              color: textPrimary,
              margin: 0,
            }}
          >
            {step === "credentials"
              ? "School Management"
              : "Vérification en deux étapes"}
          </h1>
          <p
            style={{
              color: textSecondary,
              marginTop: 8,
              fontSize: 14,
            }}
          >
            {step === "credentials"
              ? "Connectez-vous à votre compte"
              : "Un code a été envoyé à votre adresse email."}
          </p>
        </div>

        {/* ═══ ÉTAPE 1 : IDENTIFIANTS ═══ */}
        {step === "credentials" && (
          <form onSubmit={handleCredentialsSubmit} autoComplete="off">
            {/* Identifiant */}
            <div style={{ marginBottom: 20 }}>
              <label
                htmlFor="login-input"
                style={{
                  display: "block",
                  marginBottom: 6,
                  fontWeight: 500,
                  fontSize: isMobile ? 15 : 14,
                  color: labelColor,
                }}
              >
                Identifiant
              </label>
              <div style={{ position: "relative" }}>
                <User
                  size={18}
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: iconColor,
                    pointerEvents: "none",
                  }}
                />
                <input
                  id="login-input"
                  type="text"
                  placeholder="Votre identifiant"
                  value={login}
                  onChange={(e) => {
                    setLogin(e.target.value);
                    if (error) setError("");
                  }}
                  onFocus={() => setFocusedField("login")}
                  onBlur={() => setFocusedField(null)}
                  autoComplete="username"
                  autoFocus
                  inputMode="text"
                  enterKeyHint="next"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  style={inputStyle("login")}
                />
              </div>
            </div>

            {/* Mot de passe */}
            <div style={{ marginBottom: 20 }}>
              <label
                htmlFor="password-input"
                style={{
                  display: "block",
                  marginBottom: 6,
                  fontWeight: 500,
                  fontSize: isMobile ? 15 : 14,
                  color: labelColor,
                }}
              >
                Mot de passe
              </label>
              <div style={{ position: "relative" }}>
                <Lock
                  size={18}
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: iconColor,
                    pointerEvents: "none",
                    zIndex: 1,
                  }}
                />
                <input
                  id="password-input"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError("");
                  }}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  autoComplete="current-password"
                  enterKeyHint="go"
                  style={inputStyle("password", true)}
                />
                {/* ✨ Bouton toggle password : zone 44×44px */}
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
                    color: iconColor,
                    cursor: "pointer",
                    padding: 0,
                    // ✨ Zone tap 44×44
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
            </div>

            {/* Erreur */}
            {error && (
              <div
                role="alert"
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 500,
                  marginBottom: 16,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: errorBg,
                  color: errorText,
                }}
              >
                {errorType === "locked" ? (
                  <Clock size={16} style={{ flexShrink: 0 }} />
                ) : (
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                )}
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              onTouchStart={!loading ? pressBtn("submit") : undefined}
              onTouchEnd={releaseBtn}
              onTouchCancel={releaseBtn}
              style={{
                width: "100%",
                padding: "12px 0",
                background: loading
                  ? buttonDisabled
                  : pressedBtn === "submit"
                  ? buttonBgHover
                  : buttonBg,
                color: "#FFFFFF",
                border: "none",
                borderRadius: 10,
                fontSize: 16,
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                boxShadow: dark
                  ? "0 4px 12px rgba(0,0,0,0.3)"
                  : "0 4px 12px rgba(79,70,229,0.2)",
                transition:
                  "background 0.12s ease, transform 0.1s ease, box-shadow 0.15s ease",
                transform:
                  pressedBtn === "submit" && !loading
                    ? "scale(0.98)"
                    : "scale(1)",
                minHeight: MOBILE_TAP,
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation",
                fontFamily: "inherit",
                boxSizing: "border-box",
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="lg-spin" />
                  Connexion...
                </>
              ) : (
                <>
                  <LogIn size={18} /> Se connecter
                </>
              )}
            </button>
          </form>
        )}

        {/* ═══ ÉTAPE 2 : 2FA ═══ */}
        {step === "twoFactor" && (
          <form onSubmit={handleTwoFactorSubmit} autoComplete="off">
            <div style={{ marginBottom: 20 }}>
              <label
                htmlFor="code-input"
                style={{
                  display: "block",
                  marginBottom: 6,
                  fontWeight: 500,
                  fontSize: isMobile ? 15 : 14,
                  color: labelColor,
                }}
              >
                Code de vérification
              </label>
              <div style={{ position: "relative" }}>
                <ShieldCheck
                  size={18}
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: iconColor,
                    pointerEvents: "none",
                  }}
                />
                <input
                  ref={codeInputRef}
                  id="code-input"
                  type="text"
                  inputMode="numeric"
                  placeholder="6 chiffres"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                    if (error) setError("");
                  }}
                  onFocus={() => setFocusedField("code")}
                  onBlur={() => setFocusedField(null)}
                  maxLength={6}
                  autoComplete="one-time-code"
                  enterKeyHint="done"
                  style={{
                    ...inputStyle("code"),
                    fontSize: 18,
                    letterSpacing: "4px",
                    textAlign: "center",
                    fontWeight: 600,
                  }}
                />
              </div>
            </div>

            {error && (
              <div
                role="alert"
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 500,
                  marginBottom: 16,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: errorBg,
                  color: errorText,
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {/* Submit 2FA */}
            <button
              type="submit"
              disabled={loading || code.length !== 6}
              onTouchStart={
                !loading && code.length === 6
                  ? pressBtn("verify")
                  : undefined
              }
              onTouchEnd={releaseBtn}
              onTouchCancel={releaseBtn}
              style={{
                width: "100%",
                padding: "12px 0",
                background:
                  loading || code.length !== 6
                    ? buttonDisabled
                    : pressedBtn === "verify"
                    ? buttonBgHover
                    : buttonBg,
                color: "#FFFFFF",
                border: "none",
                borderRadius: 10,
                fontSize: 16,
                fontWeight: 600,
                cursor:
                  loading || code.length !== 6 ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                boxShadow: dark
                  ? "0 4px 12px rgba(0,0,0,0.3)"
                  : "0 4px 12px rgba(79,70,229,0.2)",
                transition:
                  "background 0.12s ease, transform 0.1s ease, box-shadow 0.15s ease",
                transform:
                  pressedBtn === "verify" &&
                  !loading &&
                  code.length === 6
                    ? "scale(0.98)"
                    : "scale(1)",
                minHeight: MOBILE_TAP,
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation",
                fontFamily: "inherit",
                boxSizing: "border-box",
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="lg-spin" />
                  Vérification...
                </>
              ) : (
                "Vérifier"
              )}
            </button>

            {/* Renvoyer le code — ✨ zone tap 44px */}
            <button
              type="button"
              onClick={handleResendCode}
              disabled={sendingCode || resendCooldown > 0}
              onTouchStart={
                !sendingCode && resendCooldown === 0
                  ? pressBtn("resend")
                  : undefined
              }
              onTouchEnd={releaseBtn}
              onTouchCancel={releaseBtn}
              style={{
                marginTop: 12,
                background: "transparent",
                border: "none",
                color:
                  sendingCode || resendCooldown > 0
                    ? textSecondary
                    : linkColor,
                cursor:
                  sendingCode || resendCooldown > 0
                    ? "not-allowed"
                    : "pointer",
                fontSize: 14,
                fontWeight: 500,
                textDecoration: "underline",
                width: "100%",
                // ✨ Zone tap 44px
                minHeight: MOBILE_TAP,
                padding: "10px 12px",
                borderRadius: 8,
                transform:
                  pressedBtn === "resend" &&
                  !sendingCode &&
                  resendCooldown === 0
                    ? "scale(0.98)"
                    : "scale(1)",
                transition: "transform 0.1s ease, background 0.12s ease",
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation",
                fontFamily: "inherit",
              }}
            >
              {sendingCode
                ? "Envoi..."
                : resendCooldown > 0
                ? `Renvoyer dans ${resendCooldown}s`
                : "Renvoyer le code"}
            </button>
          </form>
        )}

        {/* ═══ Lien inscription ═══ */}
        {step === "credentials" && (
          <div style={{ marginTop: 20, textAlign: "center" }}>
            <p
              style={{
                color: textSecondary,
                fontSize: 14,
                margin: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                flexWrap: "wrap",
              }}
            >
              Pas de compte ?
              <button
                type="button"
                onClick={onSwitchToRegister}
                onTouchStart={pressBtn("register-link")}
                onTouchEnd={releaseBtn}
                onTouchCancel={releaseBtn}
                style={{
                  background: "transparent",
                  border: "none",
                  color: linkColor,
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
                    pressedBtn === "register-link" ? "scale(0.97)" : "scale(1)",
                  transition: "transform 0.1s ease",
                  WebkitTapHighlightColor: "transparent",
                  touchAction: "manipulation",
                  fontFamily: "inherit",
                }}
              >
                Créer un compte
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}