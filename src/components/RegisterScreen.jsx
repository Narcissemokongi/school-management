import { useState, useMemo } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile"; // <-- Import du hook
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
  const { S, dark } = useStyles();
  const isMobile = useIsMobile(); // Détection mobile

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

  // Force du mot de passe avec critères
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
    if (score <= 2) { label = "Faible"; color = "#EF4444"; width = "33%"; }
    else if (score <= 3) { label = "Moyen"; color = "#F59E0B"; width = "66%"; }
    else { label = "Fort"; color = "#10B981"; width = "100%"; }
    return { label, color, width, checks };
  }, [password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!nom.trim()) return setError("Le nom complet est requis.");
    if (!login.trim()) return setError("L'identifiant est requis.");
    if (!/^[a-zA-Z0-9._-]{3,20}$/.test(login.trim()))
      return setError("L'identifiant doit contenir entre 3 et 20 caractères (lettres, chiffres, points, tirets, underscores).");
    if (!password) return setError("Le mot de passe est requis.");
    if (password.length < 6) return setError("Le mot de passe doit contenir au moins 6 caractères.");
    if (password !== confirmPassword) return setError("Les mots de passe ne correspondent pas.");
    if (!codeEcole.trim()) return setError("Le code de l'école est requis.");
    if (!role) return setError("Veuillez sélectionner un rôle.");
    if (role === "eleve" && !matricule.trim())
      return setError("Le matricule est requis pour les élèves.");
    if (!acceptConditions) return setError("Vous devez accepter les conditions d'utilisation.");

    setLoading(true);
    try {
      // ✅ Envoyer le mot de passe brut, le serveur le hachera
      await register({
        nom: nom.trim(),
        login: login.trim(),
        password: password,
        codeEcole: codeEcole.trim().toUpperCase(),
        role,
        matricule: role === "eleve" ? matricule.trim().toUpperCase() : undefined,
      });
      setSuccess(true);
      setTimeout(() => onSwitchToLogin(), 2500);
    } catch (err) {
      setError(err.message || "Erreur lors de l'inscription.");
    } finally {
      setLoading(false);
    }
  };

  // Styles adaptatifs
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

  const containerPadding = isMobile ? "16px" : "24px";
  const cardPadding = isMobile ? "32px 20px" : "40px 32px";
  const logoSize = isMobile ? 80 : 100;
  const titleFontSize = isMobile ? 20 : 24;
  const subtitleFontSize = isMobile ? 14 : 14;
  const roleButtonPadding = isMobile ? "10px 14px" : "8px 16px";
  const roleButtonFontSize = isMobile ? 14 : 14;
  const submitFontSize = isMobile ? 16 : 16;
  const errorFontSize = isMobile ? 14 : 13;
  const successFontSize = isMobile ? 14 : 13;
  const conditionsFontSize = isMobile ? 14 : 13;

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: dark ? "#0F172A" : "#F3F4F6",
      padding: containerPadding,
      transition: "background-color 0.3s",
    }}>
      <div style={{
        background: dark ? "#1E293B" : "#FFFFFF",
        borderRadius: 16,
        boxShadow: dark ? "0 4px 12px rgba(0,0,0,0.5)" : "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)",
        padding: cardPadding,
        width: "100%",
        maxWidth: 480,
        transition: "background-color 0.3s",
      }}>
        {/* En-tête */}
        <div style={{ textAlign: "center", marginBottom: isMobile ? 24 : 32 }}>
          <img
            src="/logo.png"
            alt="School Management"
            style={{ width: logoSize, height: logoSize, marginBottom: 12 }}
          />
          <h1 style={{ fontSize: titleFontSize, fontWeight: 700, color: dark ? "#F1F5F9" : "#1E293B", margin: 0 }}>
            School Management
          </h1>
          <p style={{ color: dark ? "#CBD5E1" : "#64748B", marginTop: 8, fontSize: subtitleFontSize }}>
            Créer un compte
          </p>
        </div>

        {/* Bannière de succès */}
        {success && (
          <div style={{
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
          }}>
            <CheckCircle2 size={18} />
            Compte créé avec succès ! Redirection...
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Nom complet */}
          <div style={{ marginBottom: 20 }}>
            <label htmlFor="nom" style={labelStyle}>Nom complet</label>
            <div style={fieldContainerStyle}>
              <span style={iconStyle}><User size={18} /></span>
              <input
                id="nom"
                type="text"
                placeholder="Votre nom"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                style={inputStyle}
                aria-required="true"
              />
            </div>
          </div>

          {/* Rôle */}
          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Vous êtes</label>
            <div style={{ display: "flex", gap: isMobile ? 6 : 8, flexWrap: "wrap" }}>
              {ROLES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRole(r.value)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: roleButtonPadding,
                    background: role === r.value ? (dark ? "#818CF8" : "#4F46E5") : "transparent",
                    color: role === r.value ? "#FFFFFF" : dark ? "#CBD5E1" : "#374151",
                    border: `1.5px solid ${role === r.value ? (dark ? "#818CF8" : "#4F46E5") : dark ? "rgba(255,255,255,0.1)" : "#E2E8F0"}`,
                    borderRadius: 10,
                    fontSize: roleButtonFontSize,
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
              <label htmlFor="matricule" style={labelStyle}>Matricule de l'élève</label>
              <div style={fieldContainerStyle}>
                <span style={iconStyle}><BadgeCheck size={18} /></span>
                <input
                  id="matricule"
                  type="text"
                  placeholder="Ex: A1B2C3"
                  value={matricule}
                  onChange={(e) => setMatricule(e.target.value)}
                  style={inputStyle}
                  aria-required="true"
                />
              </div>
              <p style={{ color: dark ? "#94A3B8" : "#6B7280", fontSize: 12, marginTop: 4 }}>
                Ce matricule vous a été fourni par votre établissement.
              </p>
            </div>
          )}

          {/* Identifiant */}
          <div style={{ marginBottom: 20 }}>
            <label htmlFor="login" style={labelStyle}>Identifiant</label>
            <div style={fieldContainerStyle}>
              <span style={iconStyle}><User size={18} /></span>
              <input
                id="login"
                type="text"
                placeholder="Choisissez un identifiant"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                style={inputStyle}
                aria-required="true"
              />
            </div>
          </div>

          {/* Mot de passe */}
          <div style={{ marginBottom: 20 }}>
            <label htmlFor="password" style={labelStyle}>Mot de passe</label>
            <div style={{ ...fieldContainerStyle, position: "relative" }}>
              <span style={iconStyle}><Lock size={18} /></span>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Minimum 6 caractères"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ ...inputStyle, paddingRight: 42 }}
                aria-required="true"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: dark ? "#94A3B8" : "#9CA3AF",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {/* Force du mot de passe */}
            {password && passwordStrength && (
              <div style={{ marginTop: 8 }}>
                <div style={{ height: 4, background: dark ? "#334155" : "#E2E8F0", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ width: passwordStrength.width, background: passwordStrength.color, height: "100%", borderRadius: 2, transition: "width 0.3s" }} />
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4, flexDirection: isMobile ? "column" : "row", gap: 4 }}>
                  <span style={{ fontSize: 12, color: passwordStrength.color }}>{passwordStrength.label}</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, fontSize: 11, justifyContent: isMobile ? "center" : "flex-start" }}>
                    <span style={{ color: passwordStrength.checks.length ? "#10B981" : "#EF4444" }}>
                      {passwordStrength.checks.length ? <Check size={12} /> : <XCircle size={12} />} 6+ caractères
                    </span>
                    <span style={{ color: passwordStrength.checks.uppercase ? "#10B981" : "#EF4444" }}>
                      {passwordStrength.checks.uppercase ? <Check size={12} /> : <XCircle size={12} />} Majuscule
                    </span>
                    <span style={{ color: passwordStrength.checks.number ? "#10B981" : "#EF4444" }}>
                      {passwordStrength.checks.number ? <Check size={12} /> : <XCircle size={12} />} Chiffre
                    </span>
                    <span style={{ color: passwordStrength.checks.special ? "#10B981" : "#EF4444" }}>
                      {passwordStrength.checks.special ? <Check size={12} /> : <XCircle size={12} />} Symbole
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Confirmation */}
          <div style={{ marginBottom: 20 }}>
            <label htmlFor="confirm-password" style={labelStyle}>Confirmer le mot de passe</label>
            <div style={{ ...fieldContainerStyle, position: "relative" }}>
              <span style={iconStyle}><Lock size={18} /></span>
              <input
                id="confirm-password"
                type={showConfirm ? "text" : "password"}
                placeholder="Répéter le mot de passe"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{ ...inputStyle, paddingRight: 42 }}
                aria-required="true"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                tabIndex={-1}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: dark ? "#94A3B8" : "#9CA3AF",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {confirmPassword && confirmPassword !== password && (
              <p style={{ color: "#EF4444", fontSize: 12, marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                <XCircle size={14} /> Les mots de passe ne correspondent pas.
              </p>
            )}
          </div>

          {/* Code école */}
          <div style={{ marginBottom: 24 }}>
            <label htmlFor="codeEcole" style={labelStyle}>Code de l'école</label>
            <div style={fieldContainerStyle}>
              <span style={iconStyle}><School size={18} /></span>
              <input
                id="codeEcole"
                type="text"
                placeholder="Ex: ABC123"
                value={codeEcole}
                onChange={(e) => setCodeEcole(e.target.value)}
                style={inputStyle}
                aria-required="true"
              />
            </div>
            <p style={{ color: dark ? "#94A3B8" : "#6B7280", fontSize: 12, marginTop: 4 }}>
              Ce code vous est fourni par votre établissement.
            </p>
          </div>

          {/* Conditions d'utilisation */}
          <div style={{ marginBottom: 20, display: "flex", alignItems: "flex-start", gap: 8 }}>
            <input
              type="checkbox"
              id="conditions"
              checked={acceptConditions}
              onChange={(e) => setAcceptConditions(e.target.checked)}
              style={{ width: 18, height: 18, marginTop: 2, cursor: "pointer", accentColor: dark ? "#818CF8" : "#4F46E5" }}
              aria-required="true"
            />
            <label htmlFor="conditions" style={{ fontSize: conditionsFontSize, color: dark ? "#CBD5E1" : "#4B5563" }}>
              J'accepte les conditions d'utilisation et la politique de confidentialité.
            </label>
          </div>

          {/* Erreur */}
          {error && (
            <div style={{
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
            }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: isMobile ? "14px 0" : "12px 0",
              background: loading ? "#A5B4FC" : dark ? "#818CF8" : "#4F46E5",
              color: "#FFFFFF",
              border: "none",
              borderRadius: 10,
              fontSize: submitFontSize,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "background 0.2s",
              boxShadow: dark ? "0 4px 12px rgba(0,0,0,0.3)" : "0 4px 12px rgba(79,70,229,0.2)",
            }}
          >
            {loading ? (
              <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
            ) : (
              "Créer un compte"
            )}
          </button>
        </form>

        {/* Pied */}
        <div style={{ marginTop: 20, textAlign: "center" }}>
          <p style={{ color: dark ? "#CBD5E1" : "#6B7280", fontSize: isMobile ? 14 : 14, margin: 0 }}>
            Déjà un compte ?{" "}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                onSwitchToLogin();
              }}
              style={{ color: dark ? "#818CF8" : "#4F46E5", textDecoration: "none", fontWeight: 500 }}
              onMouseEnter={(e) => (e.target.style.textDecoration = "underline")}
              onMouseLeave={(e) => (e.target.style.textDecoration = "none")}
            >
              Se connecter
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}