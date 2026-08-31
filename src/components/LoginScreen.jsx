import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useStyles } from "../styles/theme";
import { useIsMobile } from "../hooks/useIsMobile"; // <-- Import du hook
import {
  Loader2, User, Lock, Eye, EyeOff, LogIn, Clock, ShieldCheck,
} from "lucide-react";

export function LoginScreen({ onLogin, onSwitchToRegister }) {
  const { dark } = useStyles();
  const isMobile = useIsMobile(); // Détection mobile
  const [step, setStep] = useState("credentials");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [errorType, setErrorType] = useState("normal");
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);
  const [code, setCode] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
  const [pendingUser, setPendingUser] = useState(null);

  const authenticate = useMutation(api.users.login);
  const sendLoginCode = useMutation(api.twoFactorEmail.sendLoginCode);
  const verifyLoginCode = useMutation(api.twoFactorEmail.verifyLoginCode);

  // Soumission des identifiants
  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
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
        setStep("twoFactor");
      } else {
        onLogin(user);
      }
    } catch (err) {
      if (err.message.includes("verrouillé")) {
        setErrorType("locked");
      }
      setError(err.message || "Erreur de connexion.");
    } finally {
      setLoading(false);
    }
  };

  // Soumission du code 2FA
  const handleTwoFactorSubmit = async (e) => {
    e.preventDefault();
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
      setError(err.message || "Code invalide.");
    } finally {
      setLoading(false);
    }
  };

  // Renvoyer le code
  const handleResendCode = async () => {
    setSendingCode(true);
    setError("");
    try {
      await sendLoginCode({ userId });
    } catch (err) {
      setError(err.message || "Impossible de renvoyer le code.");
    } finally {
      setSendingCode(false);
    }
  };

  // Styles adaptatifs
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
  const errorBg = errorType === "locked" ? (dark ? "#78350F" : "#FEF3C7") : (dark ? "#7F1D1D" : "#FEE2E2");
  const errorText = errorType === "locked" ? (dark ? "#FBBF24" : "#92400E") : (dark ? "#F87171" : "#B91C1C");
  const linkColor = dark ? "#818CF8" : "#4F46E5";
  const iconColor = dark ? "#94A3B8" : "#9CA3AF";

  // Ajustements mobiles
  const inputFontSize = isMobile ? 16 : 14; // 16px pour éviter le zoom iOS
  const cardPadding = isMobile ? "32px 20px" : "40px 32px";
  const logoSize = isMobile ? 64 : 72;

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: containerBg,
      padding: isMobile ? "16px" : "24px",
      transition: "background-color 0.3s",
    }}>
      <div style={{
        background: cardBg,
        borderRadius: 16,
        boxShadow: dark ? "0 4px 12px rgba(0,0,0,0.5)" : "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)",
        border: `1px solid ${cardBorder}`,
        padding: cardPadding,
        width: "100%",
        maxWidth: 420,
        transition: "background-color 0.3s, border-color 0.3s",
      }}>
        {/* En-tête */}
        <div style={{ textAlign: "center", marginBottom: isMobile ? 24 : 32 }}>
          <img src="/logo.png" alt="School Management" style={{ width: logoSize, height: logoSize, marginBottom: 16 }} />
          <h1 style={{ fontSize: isMobile ? 22 : 24, fontWeight: 700, color: textPrimary, margin: 0 }}>
            {step === "credentials" ? "School Management" : "Vérification en deux étapes"}
          </h1>
          <p style={{ color: textSecondary, marginTop: 8, fontSize: isMobile ? 14 : 14 }}>
            {step === "credentials"
              ? "Connectez-vous à votre compte"
              : "Un code a été envoyé à votre adresse email."}
          </p>
        </div>

        {step === "credentials" ? (
          <form onSubmit={handleCredentialsSubmit}>
            {/* Champ identifiant */}
            <div style={{ marginBottom: 20 }}>
              <label htmlFor="login-input" style={{ display: "block", marginBottom: 6, fontWeight: 500, fontSize: isMobile ? 15 : 14, color: labelColor }}>
                Identifiant
              </label>
              <div style={{ position: "relative" }}>
                <User size={18} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: iconColor }} />
                <input
                  id="login-input"
                  type="text"
                  placeholder="Votre identifiant"
                  value={login}
                  onChange={(e) => { setLogin(e.target.value); setError(""); }}
                  autoComplete="username"
                  style={{
                    width: "100%",
                    padding: "12px 14px 12px 42px",
                    border: `1.5px solid ${inputBorder}`,
                    borderRadius: 10,
                    fontSize: inputFontSize,
                    outline: "none",
                    background: inputBg,
                    color: inputText,
                    transition: "border-color 0.2s, background-color 0.3s, color 0.3s",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = dark ? "#818CF8" : "#4F46E5")}
                  onBlur={(e) => (e.target.style.borderColor = inputBorder)}
                />
              </div>
            </div>

            {/* Champ mot de passe */}
            <div style={{ marginBottom: 20 }}>
              <label htmlFor="password-input" style={{ display: "block", marginBottom: 6, fontWeight: 500, fontSize: isMobile ? 15 : 14, color: labelColor }}>
                Mot de passe
              </label>
              <div style={{ position: "relative" }}>
                <Lock size={18} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: iconColor }} />
                <input
                  id="password-input"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  autoComplete="current-password"
                  style={{
                    width: "100%",
                    padding: "12px 42px 12px 42px",
                    border: `1.5px solid ${inputBorder}`,
                    borderRadius: 10,
                    fontSize: inputFontSize,
                    outline: "none",
                    background: inputBg,
                    color: inputText,
                    transition: "border-color 0.2s, background-color 0.3s, color 0.3s",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = dark ? "#818CF8" : "#4F46E5")}
                  onBlur={(e) => (e.target.style.borderColor = inputBorder)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: iconColor, cursor: "pointer" }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Message d'erreur */}
            {error && (
              <div style={{
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
              }}>
                {errorType === "locked" ? <Clock size={16} /> : "⚠️"}
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
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
                boxShadow: dark ? "0 4px 12px rgba(0,0,0,0.3)" : "0 4px 12px rgba(79,70,229,0.2)",
                transition: "background 0.2s",
              }}
            >
              {loading ? <Loader2 size={18} className="spin" /> : <><LogIn size={18} /> Se connecter</>}
            </button>
          </form>
        ) : (
          <form onSubmit={handleTwoFactorSubmit}>
            {/* Champ code 2FA */}
            <div style={{ marginBottom: 20 }}>
              <label htmlFor="code-input" style={{ display: "block", marginBottom: 6, fontWeight: 500, fontSize: isMobile ? 15 : 14, color: labelColor }}>
                Code de vérification
              </label>
              <div style={{ position: "relative" }}>
                <ShieldCheck size={18} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: iconColor }} />
                <input
                  id="code-input"
                  type="text"
                  placeholder="6 chiffres"
                  value={code}
                  onChange={(e) => { setCode(e.target.value.replace(/\D/g, "")); setError(""); }}
                  maxLength={6}
                  autoComplete="one-time-code"
                  style={{
                    width: "100%",
                    padding: "12px 14px 12px 42px",
                    border: `1.5px solid ${inputBorder}`,
                    borderRadius: 10,
                    fontSize: 16,
                    outline: "none",
                    background: inputBg,
                    color: inputText,
                    letterSpacing: "4px",
                    textAlign: "center",
                    transition: "border-color 0.2s, background-color 0.3s, color 0.3s",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = dark ? "#818CF8" : "#4F46E5")}
                  onBlur={(e) => (e.target.style.borderColor = inputBorder)}
                />
              </div>
            </div>

            {error && (
              <div style={{
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
              }}>
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              style={{
                width: "100%",
                padding: "12px 0",
                background: loading ? "#A5B4FC" : buttonBg,
                color: "#FFFFFF",
                border: "none",
                borderRadius: 10,
                fontSize: 16,
                fontWeight: 600,
                cursor: loading || code.length !== 6 ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                boxShadow: dark ? "0 4px 12px rgba(0,0,0,0.3)" : "0 4px 12px rgba(79,70,229,0.2)",
                transition: "background 0.2s",
              }}
            >
              {loading ? <Loader2 size={18} className="spin" /> : "Vérifier"}
            </button>

            <button
              type="button"
              onClick={handleResendCode}
              disabled={sendingCode}
              style={{
                marginTop: 12,
                background: "none",
                border: "none",
                color: linkColor,
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 500,
                textDecoration: "underline",
              }}
            >
              {sendingCode ? "Envoi..." : "Renvoyer le code"}
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
                onClick={(e) => { e.preventDefault(); onSwitchToRegister(); }}
                style={{ color: linkColor, textDecoration: "none", fontWeight: 500 }}
                onMouseEnter={(e) => (e.target.style.textDecoration = "underline")}
                onMouseLeave={(e) => (e.target.style.textDecoration = "none")}
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