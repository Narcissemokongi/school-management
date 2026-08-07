import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { hashPassword } from "../utils/crypto";
import { Loader2, User, Lock, Eye, EyeOff, LogIn, Clock } from "lucide-react";

export function LoginScreen({ onLogin, onSwitchToRegister }) {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [errorType, setErrorType] = useState("normal"); // "normal" ou "locked"
  const [loading, setLoading] = useState(false);

  const authenticate = useMutation(api.users.login);
  const passwordFormat = useQuery(
    api.users.getPasswordFormat,
    login.trim() ? { login: login.trim() } : "skip"
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setErrorType("normal");

    if (!login.trim() || !password.trim()) {
      setError("Veuillez remplir tous les champs.");
      return;
    }
    if (passwordFormat === undefined) {
      setError("Vérification du compte en cours, veuillez patienter...");
      return;
    }

    setLoading(true);
    try {
      let passwordToSend = password;
      if (passwordFormat === "hash") {
        passwordToSend = await hashPassword(password);
      }
      const user = await authenticate({ login: login.trim(), password: passwordToSend });
      if (!user) {
        setError("Identifiants incorrects");
        return;
      }
      onLogin(user);
    } catch (err) {
      if (err.message.includes("verrouillé")) {
        setErrorType("locked");
      }
      setError(err.message || "Erreur de connexion.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#F3F4F6", padding: "24px"
    }}>
      <div style={{
        background: "#FFFFFF", borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)",
        padding: "40px 32px", width: "100%", maxWidth: 420
      }}>
        {/* En-tête */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <img src="/logo.png" alt="School Management" style={{ width: 72, height: 72, marginBottom: 16 }} />
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#1E293B", margin: 0 }}>School Management</h1>
          <p style={{ color: "#64748B", marginTop: 8, fontSize: 14 }}>Connectez-vous à votre compte</p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Champ identifiant */}
          <div style={{ marginBottom: 20 }}>
            <label htmlFor="login-input" style={{ display: "block", marginBottom: 6, fontWeight: 500, fontSize: 14, color: "#374151" }}>
              Identifiant
            </label>
            <div style={{ position: "relative" }}>
              <User size={18} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF" }} />
              <input
                id="login-input"
                type="text"
                placeholder="Votre identifiant"
                value={login}
                onChange={(e) => { setLogin(e.target.value); setError(""); }}
                autoComplete="username"
                style={{
                  width: "100%", padding: "12px 14px 12px 42px",
                  border: "1.5px solid #E2E8F0", borderRadius: 10, fontSize: 14, outline: "none",
                  background: "#F9FAFB"
                }}
              />
            </div>
          </div>

          {/* Champ mot de passe */}
          <div style={{ marginBottom: 20 }}>
            <label htmlFor="password-input" style={{ display: "block", marginBottom: 6, fontWeight: 500, fontSize: 14, color: "#374151" }}>
              Mot de passe
            </label>
            <div style={{ position: "relative" }}>
              <Lock size={18} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF" }} />
              <input
                id="password-input"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                autoComplete="current-password"
                style={{
                  width: "100%", padding: "12px 42px 12px 42px",
                  border: "1.5px solid #E2E8F0", borderRadius: 10, fontSize: 14, outline: "none",
                  background: "#F9FAFB"
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#9CA3AF", cursor: "pointer" }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Message d'erreur amélioré */}
          {error && (
            <div style={{
              padding: "10px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500,
              marginBottom: 16, display: "flex", alignItems: "center", gap: 8,
              background: errorType === "locked" ? "#FEF3C7" : "#FEE2E2",
              color: errorType === "locked" ? "#92400E" : "#B91C1C",
            }}>
              {errorType === "locked" ? <Clock size={16} /> : "⚠️"}
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || passwordFormat === undefined}
            style={{
              width: "100%", padding: "12px 0", background: loading ? "#A5B4FC" : "#4F46E5",
              color: "#FFFFFF", border: "none", borderRadius: 10, fontSize: 16, fontWeight: 600,
              cursor: loading || passwordFormat === undefined ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              boxShadow: "0 4px 12px rgba(79,70,229,0.2)"
            }}
          >
            {loading ? <Loader2 size={18} className="spin" /> : <><LogIn size={18} /> Se connecter</>}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: "center" }}>
          <p style={{ color: "#6B7280", fontSize: 14, margin: 0 }}>
            Pas de compte ?{" "}
            <a href="#" onClick={(e) => { e.preventDefault(); onSwitchToRegister(); }} style={{ color: "#4F46E5", textDecoration: "none", fontWeight: 500 }}>
              Créer un compte
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}