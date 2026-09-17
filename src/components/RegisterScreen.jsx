import { useState, useMemo, useRef, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  Loader2, User, Lock, Eye, EyeOff, School, UserCheck, BadgeCheck,
  CheckCircle2, XCircle, AlertCircle, Check,
} from "lucide-react";

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

  const register = useMutation(api.users.register);
  const redirectTimeoutRef = useRef(null);

  // ===== Cleanup du timeout de redirection =====
  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, []);

  // ===== Force du mot de passe =====
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

  // ===== Soumission =====
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
      // ✅ Guard : err.message peut être absent
      const msg =
        (err && typeof err === "object" && err.message) ||
        (typeof err === "string" ? err : "") ||
        "Erreur lors de l'inscription.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ===== Styles adaptatifs =====
  const labelStyle = {
    display: "block",
    marginBottom: 6,
    fontWeight: 500,
    fontSize: isMobile ? 15 : 14,
    color: dark ? "#CBD5E1" : "#374151",
  };

  const fieldContainerStyle = {
    display: "flex",
    alignItems: "center",
    border: `1.5px solid ${dark ? "rgba(255,255,255,0.1)" : "#E2E8F0"}`,
    borderRadius: 10,
    background: dark ? "#0F172A" : "#F9FAFB",
    transition: "border-color 0.2s, background-color 0.3s",
    height: isMobile ? 52 : 46,
    boxSizing: "border-box",
  };

  const iconStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: isMobile ? 52 : 48,
    flexShrink: 0,
    color: dark ? "#94A3B8" : "#9CA3AF",
  };

  const inputStyle = {
    flex: 1,
    border: "none",
    outline: "none",
    background: "transparent",
    color: dark ? "#F1F5F9" : "#1E293B",
    fontSize: isMobile ? 16 : 14,
    height: "100%",
    padding: "0 12px 0 0",
    boxSizing: "border-box",
  };

  const accent = dark ? "#818CF8" : "#4F46E5";
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#CBD5E1" : "#64748B";
  const hintColor = dark ? "#94A3B8" : "#6B7280";

  const containerPadding = isMobile ? "16px" : "24px";
  const cardPadding = isMobile ? "32px 20px" : "40px 32px";
  const logoSize = isMobile ? 80 : 100;
  const titleFontSize = isMobile ? 20 : 24;
  const roleButtonPadding = isMobile ? "10px 14px" : "8px 16px";
  const errorFontSize = isMobile ? 14 : 13;
  const successFontSize = isMobile ? 14 : 13;
  const conditionsFontSize = isMobile ? 14 : 13;

  // ✅ Affiche le champ code école en majuscules pendant la saisie
  const handleCodeEcoleChange = (e) => {
    setCodeEcole(e.target.value.toUpperCase());
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: dark ? "#0F172A" : "#F3F4F6",
        padding: containerPadding,
        transition: "background-color 0.3s",
      }}
    >
      {/* Keyframes préfixés rs-* */}
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
        }}
      >
        {/* En-tête */}
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

        {/* Bannière de succès */}
        {success && (
          <div
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
            <CheckCircle2 size={18} />
            Compte créé avec succès ! Redirection...
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Nom complet */}
          <div style={{ marginBottom: 20 }}>
            <label htmlFor="nom" style={labelStyle}>
              Nom complet
            </label>
            <div style={fieldContainerStyle}>
              <span style={iconStyle}>
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
                style={inputStyle}
                autoComplete="name"
                autoFocus
                required
              />
            </div>
          </div>

          {/* Rôle */}
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
              {ROLES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => {
                    setRole(r.value);
                    if (error) setError("");
                  }}
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
                      role === r.value
                        ? accent
                        : dark
                        ? "rgba(255,255,255,0.1)"
                        : "#E2E8F0"
                    }`,
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  aria-pressed={role === r.value}
                >
                  {r.icon}
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Matricule élève (conditionnel) */}
          {role === "eleve" && (
            <div style={{ marginBottom: 20 }}>
              <label htmlFor="matricule" style={labelStyle}>
                Matricule de l'élève
              </label>
              <div style={fieldContainerStyle}>
                <span style={iconStyle}>
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
                  style={inputStyle}
                  autoComplete="off"
                  required
                />
              </div>
              <p
                style={{
                  color: hintColor,
                  fontSize: 12,
                  marginTop: 4,
                }}
              >
                Ce matricule vous a été fourni par votre établissement.
              </p>
            </div>
          )}

          {/* Identifiant */}
          <div style={{ marginBottom: 20 }}>
            <label htmlFor="login" style={labelStyle}>
              Identifiant
            </label>
            <div style={fieldContainerStyle}>
              <span style={iconStyle}>
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
                style={inputStyle}
                autoComplete="username"
                required
              />
            </div>
          </div>

          {/* Mot de passe */}
          <div style={{ marginBottom: 20 }}>
            <label htmlFor="password" style={labelStyle}>
              Mot de passe
            </label>
            <div style={{ ...fieldContainerStyle, position: "relative" }}>
              <span style={iconStyle}>
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
                style={{ ...inputStyle, paddingRight: 42 }}
                autoComplete="new-password"
                required
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
                  color: dark ? "#94A3B8" : "#9CA3AF",
                  cursor: "pointer",
                  padding: 4,
                  display: "flex",
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
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
                      transition: "width 0.3s",
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

          {/* Confirmation */}
          <div style={{ marginBottom: 20 }}>
            <label htmlFor="confirm-password" style={labelStyle}>
              Confirmer le mot de passe
            </label>
            <div style={{ ...fieldContainerStyle, position: "relative" }}>
              <span style={iconStyle}>
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
                style={{ ...inputStyle, paddingRight: 42 }}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                aria-label={
                  showConfirm
                    ? "Masquer la confirmation"
                    : "Afficher la confirmation"
                }
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: dark ? "#94A3B8" : "#9CA3AF",
                  cursor: "pointer",
                  padding: 4,
                  display: "flex",
                }}
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {confirmPassword && confirmPassword !== password && (
              <p
                style={{
                  color: "#EF4444",
                  fontSize: 12,
                  marginTop: 4,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <XCircle size={14} /> Les mots de passe ne correspondent pas.
              </p>
            )}
          </div>

          {/* Code école */}
          <div style={{ marginBottom: 24 }}>
            <label htmlFor="codeEcole" style={labelStyle}>
              Code de l'école
            </label>
            <div style={fieldContainerStyle}>
              <span style={iconStyle}>
                <School size={18} />
              </span>
              <input
                id="codeEcole"
                type="text"
                placeholder="Ex: ABC123"
                value={codeEcole}
                onChange={handleCodeEcoleChange}
                style={{ ...inputStyle, letterSpacing: 1, fontWeight: 600 }}
                autoComplete="off"
                required
              />
            </div>
            <p style={{ color: hintColor, fontSize: 12, marginTop: 4 }}>
              Ce code vous est fourni par votre établissement.
            </p>
          </div>

          {/* Conditions d'utilisation */}
          <div
            style={{
              marginBottom: 20,
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
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
                width: 18,
                height: 18,
                marginTop: 2,
                cursor: "pointer",
                accentColor: accent,
                flexShrink: 0,
              }}
              required
            />
            <label
              htmlFor="conditions"
              style={{
                fontSize: conditionsFontSize,
                color: dark ? "#CBD5E1" : "#4B5563",
                cursor: "pointer",
              }}
            >
              J'accepte les conditions d'utilisation et la politique de
              confidentialité.
            </label>
          </div>

          {/* Erreur */}
          {error && (
            <div
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
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || success}
            style={{
              width: "100%",
              padding: isMobile ? "14px 0" : "12px 0",
              background:
                loading || success ? "#A5B4FC" : accent,
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
              transition: "background 0.2s",
              boxShadow: dark
                ? "0 4px 12px rgba(0,0,0,0.3)"
                : "0 4px 12px rgba(79,70,229,0.2)",
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

        {/* Pied */}
        <div style={{ marginTop: 20, textAlign: "center" }}>
          <p
            style={{
              color: dark ? "#CBD5E1" : "#6B7280",
              fontSize: 14,
              margin: 0,
            }}
          >
            Déjà un compte ?{" "}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                onSwitchToLogin();
              }}
              style={{
                color: accent,
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
              Se connecter
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}