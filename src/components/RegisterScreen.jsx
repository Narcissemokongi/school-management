import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { hashPassword } from "../utils/crypto";
import {
  Loader2,
  User,
  Lock,
  Eye,
  EyeOff,
  School,
  UserCheck,
  ArrowLeft,
} from "lucide-react";

const ROLES = [
  { value: "parent", label: "Parent" },
  { value: "eleve", label: "Élève" },
  { value: "enseignant", label: "Enseignant" },
];

export function RegisterScreen({ onSwitchToLogin }) {
  const [nom, setNom] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [codeEcole, setCodeEcole] = useState("");
  const [role, setRole] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const register = useMutation(api.users.register);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!nom.trim() || !login.trim() || !password || !confirmPassword || !codeEcole.trim() || !role) {
      setError("Tous les champs sont obligatoires.");
      return;
    }
    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    try {
      const hashedPassword = await hashPassword(password);
      await register({
        nom: nom.trim(),
        login: login.trim(),
        password: hashedPassword,
        codeEcole: codeEcole.trim().toUpperCase(),
        role,
      });
      setSuccess(true);
      setTimeout(() => {
        onSwitchToLogin();
      }, 2500);
    } catch (err) {
      setError(err.message || "Erreur lors de l'inscription.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#F3F4F6",
        padding: "24px",
      }}
    >
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: 16,
          boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)",
          padding: "40px 32px",
          width: "100%",
          maxWidth: 460,
        }}
      >
        {/* En-tête */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <img
            src="/logo.png"
            alt="School Management"
            style={{ width: 132, height: 132, marginBottom: -30 }}
          />
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#1E293B", margin: 0 }}>
            School Management
          </h1>
          <p style={{ color: "#64748B", marginTop: 8, fontSize: 14 }}>
            Créer un compte
          </p>
        </div>

        {/* Bannière de succès */}
        {success && (
          <div
            style={{
              background: "#D1FAE5",
              color: "#065F46",
              padding: "10px 14px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            ✅ Compte créé avec succès ! Redirection vers la connexion...
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Nom complet */}
          <div style={{ marginBottom: 20 }}>
            <label
              htmlFor="nom"
              style={{
                display: "block",
                marginBottom: 6,
                fontWeight: 500,
                fontSize: 14,
                color: "#374151",
              }}
            >
              Nom complet
            </label>
            <div style={{ position: "relative" }}>
              <User
                size={18}
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#9CA3AF",
                }}
              />
              <input
                id="nom"
                type="text"
                placeholder="Votre nom"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 14px 12px 42px",
                  border: `1.5px solid ${error && !nom.trim() ? "#EF4444" : "#E2E8F0"}`,
                  borderRadius: 10,
                  fontSize: 14,
                  outline: "none",
                  background: error && !nom.trim() ? "#FEF2F2" : "#F9FAFB",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#4F46E5")}
                onBlur={(e) => (e.target.style.borderColor = "#E2E8F0")}
              />
            </div>
          </div>

          {/* Identifiant (login) */}
          <div style={{ marginBottom: 20 }}>
            <label
              htmlFor="login"
              style={{
                display: "block",
                marginBottom: 6,
                fontWeight: 500,
                fontSize: 14,
                color: "#374151",
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
                  color: "#9CA3AF",
                }}
              />
              <input
                id="login"
                type="text"
                placeholder="Choisissez un identifiant"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 14px 12px 42px",
                  border: `1.5px solid ${error && !login.trim() ? "#EF4444" : "#E2E8F0"}`,
                  borderRadius: 10,
                  fontSize: 14,
                  outline: "none",
                  background: error && !login.trim() ? "#FEF2F2" : "#F9FAFB",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#4F46E5")}
                onBlur={(e) => (e.target.style.borderColor = "#E2E8F0")}
              />
            </div>
          </div>

          {/* Mot de passe */}
          <div style={{ marginBottom: 20 }}>
            <label
              htmlFor="password"
              style={{
                display: "block",
                marginBottom: 6,
                fontWeight: 500,
                fontSize: 14,
                color: "#374151",
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
                  color: "#9CA3AF",
                }}
              />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Minimum 6 caractères"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 42px 12px 42px",
                  border: `1.5px solid ${error && !password ? "#EF4444" : "#E2E8F0"}`,
                  borderRadius: 10,
                  fontSize: 14,
                  outline: "none",
                  background: error && !password ? "#FEF2F2" : "#F9FAFB",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#4F46E5")}
                onBlur={(e) => (e.target.style.borderColor = "#E2E8F0")}
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
                  color: "#9CA3AF",
                  cursor: "pointer",
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Confirmation mot de passe */}
          <div style={{ marginBottom: 20 }}>
            <label
              htmlFor="confirm-password"
              style={{
                display: "block",
                marginBottom: 6,
                fontWeight: 500,
                fontSize: 14,
                color: "#374151",
              }}
            >
              Confirmer le mot de passe
            </label>
            <div style={{ position: "relative" }}>
              <Lock
                size={18}
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#9CA3AF",
                }}
              />
              <input
                id="confirm-password"
                type={showConfirm ? "text" : "password"}
                placeholder="Répéter le mot de passe"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 42px 12px 42px",
                  border: `1.5px solid ${error && !confirmPassword ? "#EF4444" : "#E2E8F0"}`,
                  borderRadius: 10,
                  fontSize: 14,
                  outline: "none",
                  background: error && !confirmPassword ? "#FEF2F2" : "#F9FAFB",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#4F46E5")}
                onBlur={(e) => (e.target.style.borderColor = "#E2E8F0")}
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
                  color: "#9CA3AF",
                  cursor: "pointer",
                }}
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Rôle */}
          <div style={{ marginBottom: 24 }}>
            <label
              style={{
                display: "block",
                marginBottom: 8,
                fontWeight: 500,
                fontSize: 14,
                color: "#374151",
              }}
            >
              Vous êtes
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              {ROLES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRole(r.value)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 16px",
                    background: role === r.value ? "#4F46E5" : "#FFFFFF",
                    color: role === r.value ? "#FFFFFF" : "#374151",
                    border: `1.5px solid ${role === r.value ? "#4F46E5" : "#E2E8F0"}`,
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  <UserCheck size={16} />
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Code école */}
          <div style={{ marginBottom: 20 }}>
            <label
              htmlFor="codeEcole"
              style={{
                display: "block",
                marginBottom: 6,
                fontWeight: 500,
                fontSize: 14,
                color: "#374151",
              }}
            >
              Code de l'école
            </label>
            <div style={{ position: "relative" }}>
              <School
                size={18}
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#9CA3AF",
                }}
              />
              <input
                id="codeEcole"
                type="text"
                placeholder="Ex: ABC123"
                value={codeEcole}
                onChange={(e) => setCodeEcole(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 14px 12px 42px",
                  border: `1.5px solid ${error && !codeEcole.trim() ? "#EF4444" : "#E2E8F0"}`,
                  borderRadius: 10,
                  fontSize: 14,
                  outline: "none",
                  background: error && !codeEcole.trim() ? "#FEF2F2" : "#F9FAFB",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#4F46E5")}
                onBlur={(e) => (e.target.style.borderColor = "#E2E8F0")}
              />
            </div>
            <p style={{ color: "#6B7280", fontSize: 12, marginTop: 4 }}>
              Ce code vous est fourni par votre établissement.
            </p>
          </div>

          {/* Message d'erreur */}
          {error && (
            <div
              style={{
                background: "#FEE2E2",
                color: "#B91C1C",
                padding: "10px 14px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px 0",
              background: loading ? "#A5B4FC" : "#4F46E5",
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
              transition: "background 0.2s",
              boxShadow: "0 4px 12px rgba(79,70,229,0.2)",
            }}
          >
            {loading ? (
              <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
            ) : (
              "Créer un compte"
            )}
          </button>
        </form>

        {/* Pied de carte */}
        <div style={{ marginTop: 20, textAlign: "center" }}>
          <p style={{ color: "#6B7280", fontSize: 14, margin: 0 }}>
            Déjà un compte ?{" "}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                onSwitchToLogin();
              }}
              style={{ color: "#4F46E5", textDecoration: "none", fontWeight: 500 }}
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