import { useState, useEffect, useCallback, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  Loader2, User, Lock, Eye, EyeOff, LogIn, Clock, ShieldCheck,
  AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";

// ============================================================
// COMPTE À REBOURS pour le renvoi de code
// ============================================================
const RESEND_COOLDOWN_S = 30;

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

  const codeInputRef = useRef(null);

  const authenticate = useMutation(api.users.login);
  const sendLoginCode = useMutation(api.twoFactorEmail.sendLoginCode);
  const verifyLoginCode = useMutation(api.twoFactorEmail.verifyLoginCode);

  // ============================================================
  // Effet : compte à rebours du renvoi
  // ============================================================
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  // ============================================================
  // Effet : focus auto sur le champ code en 2FA
  // ============================================================
  useEffect(() => {
    if (step === "twoFactor") {
      codeInputRef.current?.focus();
    }
  }, [step]);

  // ============================================================
  // SOUMISSION DES IDENTIFIANTS
  // ============================================================
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
      // ✅ Guard : err.message peut être absent
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

  // ============================================================
  // SOUMISSION DU CODE 2FA
  // ============================================================
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

  // ============================================================
  // RENVOYER LE CODE (avec cooldown + feedback)
  // ============================================================
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

  // ============================================================
  // STYLES
  // ============================================================
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

  const inputFontSize = isMobile ? 16 : 14;
  const cardPadding = isMobile ? "32px 20px" : "40px 32px";
  const logoSize = isMobile ? 64 : 72;

  const commonInputStyle = (hasRightPadding = false) => ({
    width: "100%",
    padding: hasRightPadding
      ? "12px 42px 12px 42px"
      : "12px 14px 12px 42px",
    border: `1.5px solid ${inputBorder}`,
    borderRadius: 10,
    fontSize: inputFontSize,
    outline: "none",
    background: inputBg,
    color: inputText,
    transition: "border-color 0.2s, background-color 0.3s, color 0.3s",
    boxSizing: "border-box",
  });

  const commonButtonStyle = {
    width: "100%",
    padding: "12px 0",
    background: loading ? "#A5B4FC" : buttonBg,
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
    transition: "background 0.2s",
  };

  // ============================================================
  // RENDU
  // ============================================================
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: containerBg,
        padding: isMobile ? "16px" : "24px",
        transition: "background-color 0.3s",
      }}
    >
      {/* Keyframes préfixés lg-* */}
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
        }}
      >
        {/* En-tête */}
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

        {/* ==================== ÉTAPE 1 : IDENTIFIANTS ==================== */}
        {step === "credentials" && (
          <form onSubmit={handleCredentialsSubmit}>
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
                  autoComplete="username"
                  autoFocus
                  style={commonInputStyle()}
                  onFocus={(e) =>
                    (e.target.style.borderColor = accent)
                  }
                  onBlur={(e) => (e.target.style.borderColor = inputBorder)}
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
                  autoComplete="current-password"
                  style={commonInputStyle(true)}
                  onFocus={(e) =>
                    (e.target.style.borderColor = accent)
                  }
                  onBlur={(e) => (e.target.style.borderColor = inputBorder)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={
                    showPassword
                      ? "Masquer le mot de passe"
                      : "Afficher le mot de passe"
                  }
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: iconColor,
                    cursor: "pointer",
                    padding: 4,
                    display: "flex",
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Message d'erreur */}
            {error && (
              <div
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
                  <Clock size={16} />
                ) : (
                  <AlertCircle size={16} />
                )}
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={commonButtonStyle}
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

        {/* ==================== ÉTAPE 2 : 2FA ==================== */}
        {step === "twoFactor" && (
          <form onSubmit={handleTwoFactorSubmit}>
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
                  maxLength={6}
                  autoComplete="one-time-code"
                  style={{
                    ...commonInputStyle(),
                    fontSize: 16,
                    letterSpacing: "4px",
                    textAlign: "center",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = accent)}
                  onBlur={(e) => (e.target.style.borderColor = inputBorder)}
                />
              </div>
            </div>

            {error && (
              <div
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
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              style={{
                ...commonButtonStyle,
                background:
                  loading || code.length !== 6 ? "#A5B4FC" : buttonBg,
                cursor:
                  loading || code.length !== 6 ? "not-allowed" : "pointer",
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

            <button
              type="button"
              onClick={handleResendCode}
              disabled={sendingCode || resendCooldown > 0}
              style={{
                marginTop: 12,
                background: "none",
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

        {/* Lien vers l'inscription */}
        {step === "credentials" && (
          <div style={{ marginTop: 20, textAlign: "center" }}>
            <p style={{ color: textSecondary, fontSize: 14, margin: 0 }}>
              Pas de compte ?{" "}
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  onSwitchToRegister();
                }}
                style={{
                  color: linkColor,
                  textDecoration: "none",
                  fontWeight: 500,
                }}
                onMouseEnter={(e) =>
                  (e.target.style.textDecoration = "underline")
                }
                onMouseLeave={(e) =>
                  (e.target.style.textDecoration = "none")
                }
              >
                Créer un compte
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}