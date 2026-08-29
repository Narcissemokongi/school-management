import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useStyles } from "../../styles/theme";
import toast from "react-hot-toast";
import {
  Loader, Save, Key, Eye, EyeOff,
} from "lucide-react";

export function SettingsTab({ user }) {
  const { dark } = useStyles();

  // ===== Requête des paramètres =====
  const settingsQuery = useQuery(api.settings.getGlobalSettings);
  const settings = settingsQuery ?? null;
  const isLoadingSettings = settingsQuery === undefined;

  // ===== Mutations =====
  const updateSettings = useMutation(api.settings.updateGlobalSettings);
  const changePassword = useMutation(api.users.changePassword);

  // ===== États du formulaire paramètres =====
  const [settingsForm, setSettingsForm] = useState({
    appName: "",
    supportEmail: "",
    supportPhone: "",
    address: "",
    logoUrl: "",
    slogan: "",
    primaryColor: "#4F46E5",
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // ===== États du changement de mot de passe =====
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Synchroniser le formulaire avec les paramètres chargés
  useEffect(() => {
    if (settings) {
      setSettingsForm({
        appName: settings.appName || "",
        supportEmail: settings.supportEmail || "",
        supportPhone: settings.supportPhone || "",
        address: settings.address || "",
        logoUrl: settings.logoUrl || "",
        slogan: settings.slogan || "",
        primaryColor: settings.primaryColor || "#4F46E5",
      });
    }
  }, [settings]);

  // ===== Sauvegarde des paramètres =====
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    if (!settingsForm.appName.trim() || !settingsForm.supportEmail.trim()) {
      toast.error("Le nom de l'application et l'email de support sont obligatoires.");
      return;
    }
    setSavingSettings(true);
    try {
      await updateSettings({
        appName: settingsForm.appName.trim(),
        supportEmail: settingsForm.supportEmail.trim(),
        supportPhone: settingsForm.supportPhone.trim(),
        address: settingsForm.address.trim(),
        logoUrl: settingsForm.logoUrl.trim(),
        slogan: settingsForm.slogan.trim(),
        primaryColor: settingsForm.primaryColor,
        adminId: user._id,
      });
      toast.success("Paramètres enregistrés avec succès");
    } catch (err) {
      toast.error(err.message || "Erreur lors de l'enregistrement");
    } finally {
      setSavingSettings(false);
    }
  };

  // ===== Changement de mot de passe =====
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("Les nouveaux mots de passe ne correspondent pas");
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      toast.error("Le nouveau mot de passe doit contenir au moins 8 caractères");
      return;
    }
    setChangingPassword(true);
    try {
      await changePassword({
        userId: user._id,
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      toast.success("Mot de passe modifié");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      toast.error(err.message || "Erreur lors du changement de mot de passe");
    } finally {
      setChangingPassword(false);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "10px 14px",
    border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
    borderRadius: 8,
    background: dark ? "#0F172A" : "#F9FAFB",
    color: dark ? "#F1F5F9" : "#1E293B",
    outline: "none",
  };

  const labelStyle = {
    display: "block",
    marginBottom: 4,
    color: dark ? "#CBD5E1" : "#374151",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%" }}>
      {/* Carte Paramètres généraux */}
      <div style={{
        background: dark ? "#1E293B" : "#FFFFFF",
        borderRadius: 16,
        padding: 24,
        boxShadow: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)",
        border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
      }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, color: dark ? "#F1F5F9" : "#1E293B", marginBottom: 20 }}>
          Paramètres généraux
        </h3>
        {isLoadingSettings ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
            <Loader size={24} className="animate-spin" style={{ color: dark ? "#818CF8" : "#4F46E5" }} />
          </div>
        ) : (
          <form onSubmit={handleSaveSettings} style={{ display: "grid", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 16 }}>
              <div>
                <label style={labelStyle}>Nom de l'application *</label>
                <input
                  value={settingsForm.appName}
                  onChange={(e) => setSettingsForm({ ...settingsForm, appName: e.target.value })}
                  style={inputStyle}
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>Email de support *</label>
                <input
                  type="email"
                  value={settingsForm.supportEmail}
                  onChange={(e) => setSettingsForm({ ...settingsForm, supportEmail: e.target.value })}
                  style={inputStyle}
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>Téléphone</label>
                <input
                  value={settingsForm.supportPhone}
                  onChange={(e) => setSettingsForm({ ...settingsForm, supportPhone: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Adresse</label>
                <input
                  value={settingsForm.address}
                  onChange={(e) => setSettingsForm({ ...settingsForm, address: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>URL du logo</label>
                <input
                  value={settingsForm.logoUrl}
                  onChange={(e) => setSettingsForm({ ...settingsForm, logoUrl: e.target.value })}
                  placeholder="https://exemple.com/logo.png"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Slogan</label>
                <input
                  value={settingsForm.slogan}
                  onChange={(e) => setSettingsForm({ ...settingsForm, slogan: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Couleur principale</label>
                <input
                  type="color"
                  value={settingsForm.primaryColor}
                  onChange={(e) => setSettingsForm({ ...settingsForm, primaryColor: e.target.value })}
                  style={{ ...inputStyle, height: 40, padding: 4, cursor: "pointer" }}
                />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="submit"
                disabled={savingSettings}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "10px 24px",
                  background: savingSettings ? "#94A3B8" : dark ? "#818CF8" : "#4F46E5",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  fontWeight: 600,
                  cursor: savingSettings ? "not-allowed" : "pointer",
                }}
              >
                {savingSettings ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
                {savingSettings ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Carte Changement de mot de passe */}
      <div style={{
        background: dark ? "#1E293B" : "#FFFFFF",
        borderRadius: 16,
        padding: 24,
        boxShadow: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)",
        border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
      }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, color: dark ? "#F1F5F9" : "#1E293B", marginBottom: 20 }}>
          Changer le mot de passe
        </h3>
        <form onSubmit={handleChangePassword} style={{ display: "grid", gap: 16 }}>
          <div style={{ position: "relative" }}>
            <label style={labelStyle}>Mot de passe actuel</label>
            <input
              type={showCurrentPassword ? "text" : "password"}
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
              style={{ ...inputStyle, paddingRight: 40 }}
              required
            />
            <button
              type="button"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              style={{ position: "absolute", right: 10, top: 32, background: "none", border: "none", cursor: "pointer", color: dark ? "#94A3B8" : "#64748B" }}
            >
              {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <div style={{ position: "relative" }}>
            <label style={labelStyle}>Nouveau mot de passe</label>
            <input
              type={showNewPassword ? "text" : "password"}
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              style={{ ...inputStyle, paddingRight: 40 }}
              required
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              style={{ position: "absolute", right: 10, top: 32, background: "none", border: "none", cursor: "pointer", color: dark ? "#94A3B8" : "#64748B" }}
            >
              {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <div>
            <label style={labelStyle}>Confirmer le nouveau mot de passe</label>
            <input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              style={inputStyle}
              required
            />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="submit"
              disabled={changingPassword}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "10px 24px",
                background: changingPassword ? "#94A3B8" : "#EF4444",
                color: "white",
                border: "none",
                borderRadius: 8,
                fontWeight: 600,
                cursor: changingPassword ? "not-allowed" : "pointer",
              }}
            >
              {changingPassword ? <Loader size={16} className="animate-spin" /> : <Key size={16} />}
              {changingPassword ? "Modification..." : "Modifier le mot de passe"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}