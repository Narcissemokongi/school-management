// src/components/SettingsTab.jsx
import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import toast from "react-hot-toast";
import { Loader, Save, Key, Eye, EyeOff } from "lucide-react";

// ════════════════════════════════════════════════════════════════════
// KEYFRAMES (module-level)
// ════════════════════════════════════════════════════════════════════
const SettingsTabKeyframes = (
  <style>{`
    @keyframes st-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .st-spin { animation: st-spin 1s linear infinite; }
    @media (prefers-reduced-motion: reduce) {
      .st-spin { animation: none !important; }
    }
  `}</style>
);

// ════════════════════════════════════════════════════════════════════
// VALIDATION MOT DE PASSE (alignée sur le backend)
// ════════════════════════════════════════════════════════════════════
const MIN_PASSWORD_LENGTH = 8;

function validatePasswordStrength(password) {
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères`;
  }
  if (
    !/[A-Z]/.test(password) ||
    !/[a-z]/.test(password) ||
    !/[0-9]/.test(password)
  ) {
    return "Le mot de passe doit contenir majuscule, minuscule et chiffre.";
  }
  return null;
}

// ════════════════════════════════════════════════════════════════════
// ✅ FIX CRITIQUE — PasswordField EXTRAIT du composant principal.
// Défini hors de SettingsTab pour que React ne remonte PAS l'input à
// chaque keystroke (= perte de focus).
// ════════════════════════════════════════════════════════════════════
function PasswordField({
  id,
  label,
  value,
  onChange,
  show,
  onToggle,
  autoComplete,
  inputStyle,
  labelStyle,
  eyeIconSize,
  dark,
}) {
  return (
    <div>
      <label htmlFor={id} style={labelStyle}>
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          style={{ ...inputStyle, paddingRight: 40 }}
          autoComplete={autoComplete}
          required
          minLength={MIN_PASSWORD_LENGTH}
        />
        <button
          type="button"
          onClick={onToggle}
          style={{
            position: "absolute",
            right: 10,
            top: "50%",
            transform: "translateY(-50%)",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: dark ? "#94A3B8" : "#64748B",
            padding: 4,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        >
          {show ? <EyeOff size={eyeIconSize} /> : <Eye size={eyeIconSize} />}
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ════════════════════════════════════════════════════════════════════
export function SettingsTab({ user }) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();

  const userId = user?._id;

  // ⚠️ Cette query n'exige pas `userId` côté backend.
  //    Si le backend a été patché depuis → ajouter `userId ? { userId } : "skip"`.
  const settingsRaw = useQuery(api.settings.getGlobalSettings);
  const settings = useMemo(() => settingsRaw ?? null, [settingsRaw]);
  const isLoadingSettings = settingsRaw === undefined;

  // Mutations
  const updateSettings = useMutation(api.settings.updateGlobalSettings);
  const changePassword = useMutation(api.users.changePassword);

  // ════════════════════════════════════════════════════════════════
  // États
  // ════════════════════════════════════════════════════════════════
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

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Synchroniser le formulaire avec les paramètres chargés
  useEffect(() => {
    if (!settings) return;
    setSettingsForm({
      appName: settings.appName || "",
      supportEmail: settings.supportEmail || "",
      supportPhone: settings.supportPhone || "",
      address: settings.address || "",
      logoUrl: settings.logoUrl || "",
      slogan: settings.slogan || "",
      primaryColor: settings.primaryColor || "#4F46E5",
    });
  }, [settings]);

  // ✅ FIX — setter fonctionnel (safe si plusieurs champs modifiés en rafale)
  const updateSettingsField = useCallback((field, value) => {
    setSettingsForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const updatePasswordField = useCallback((field, value) => {
    setPasswordForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  // ════════════════════════════════════════════════════════════════
  // Sauvegarde des paramètres
  // ════════════════════════════════════════════════════════════════
  const handleSaveSettings = useCallback(
    async (e) => {
      e.preventDefault();
      if (savingSettings) return;

      if (!userId) {
        toast.error("Session invalide.");
        return;
      }
      if (!settingsForm.appName.trim() || !settingsForm.supportEmail.trim()) {
        toast.error(
          "Le nom de l'application et l'email de support sont obligatoires."
        );
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
          adminId: userId,
          // Note : si le backend exige `requesterId`, ajoute-le ici
        });
        toast.success("Paramètres enregistrés avec succès");
      } catch (err) {
        toast.error(
          "Impossible d'enregistrer : " + (err?.message || "erreur inconnue")
        );
      } finally {
        setSavingSettings(false);
      }
    },
    [savingSettings, userId, settingsForm, updateSettings]
  );

  // ════════════════════════════════════════════════════════════════
  // Changement de mot de passe
  // ════════════════════════════════════════════════════════════════
  const handleChangePassword = useCallback(
    async (e) => {
      e.preventDefault();
      if (changingPassword) return;

      if (!userId) {
        toast.error("Session invalide.");
        return;
      }

      if (!passwordForm.currentPassword) {
        toast.error("Saisissez votre mot de passe actuel.");
        return;
      }

      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        toast.error("Les nouveaux mots de passe ne correspondent pas");
        return;
      }

      const validationError = validatePasswordStrength(
        passwordForm.newPassword
      );
      if (validationError) {
        toast.error(validationError);
        return;
      }

      setChangingPassword(true);
      try {
        // ✅ FIX — retiré `requesterId` : la mutation backend
        // `users.changePassword` n'accepte QUE { userId, currentPassword, newPassword }.
        // L'envoyer causait `ArgumentValidationError` (extra field).
        await changePassword({
          userId,
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        });
        toast.success("Mot de passe modifié");
        setPasswordForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        setShowCurrentPassword(false);
        setShowNewPassword(false);
        setShowConfirmPassword(false);
      } catch (err) {
        toast.error(
          err?.message ||
            "Mot de passe actuel incorrect ou nouveau mot de passe invalide"
        );
      } finally {
        setChangingPassword(false);
      }
    },
    [changingPassword, userId, passwordForm, changePassword]
  );

  // ════════════════════════════════════════════════════════════════
  // Styles adaptatifs
  // ════════════════════════════════════════════════════════════════
  const inputStyle = useMemo(
    () => ({
      width: "100%",
      padding: isMobile ? "12px 14px" : "10px 14px",
      border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
      borderRadius: 8,
      background: dark ? "#0F172A" : "#F9FAFB",
      color: dark ? "#F1F5F9" : "#1E293B",
      outline: "none",
      fontSize: isMobile ? 16 : 14,
      boxSizing: "border-box",
    }),
    [dark, isMobile]
  );

  const labelStyle = useMemo(
    () => ({
      display: "block",
      marginBottom: 4,
      color: dark ? "#CBD5E1" : "#374151",
      fontSize: isMobile ? 15 : 14,
    }),
    [dark, isMobile]
  );

  const cardPadding = isMobile ? 16 : 24;
  const cardTitleSize = isMobile ? 16 : 18;
  const gridColumns = isMobile
    ? "1fr"
    : "repeat(auto-fit, minmax(250px, 1fr))";
  const buttonPadding = isMobile ? "12px 16px" : "10px 24px";
  const buttonFontSize = isMobile ? 16 : 14;
  const buttonFullWidth = isMobile ? "100%" : "auto";
  const formGap = isMobile ? 12 : 16;
  const eyeIconSize = isMobile ? 20 : 18;

  const disabledBg = dark ? "#475569" : "#94A3B8";
  const disabledCursor = "not-allowed";

  // ════════════════════════════════════════════════════════════════
  // RENDU
  // ════════════════════════════════════════════════════════════════
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: isMobile ? 16 : 24,
        width: "100%",
      }}
    >
      {SettingsTabKeyframes}

      {/* ════════════════ Carte Paramètres généraux ════════════════ */}
      <div
        style={{
          background: dark ? "#1E293B" : "#FFFFFF",
          borderRadius: 16,
          padding: cardPadding,
          boxShadow: dark
            ? "0 1px 3px rgba(0,0,0,0.3)"
            : "0 1px 3px rgba(0,0,0,0.05)",
          border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
        }}
      >
        <h3
          style={{
            fontSize: cardTitleSize,
            fontWeight: 600,
            color: dark ? "#F1F5F9" : "#1E293B",
            marginBottom: isMobile ? 16 : 20,
          }}
        >
          Paramètres généraux
        </h3>

        {isLoadingSettings ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
            <Loader
              size={24}
              className="st-spin"
              style={{ color: dark ? "#818CF8" : "#4F46E5" }}
            />
          </div>
        ) : (
          <form
            onSubmit={handleSaveSettings}
            noValidate
            style={{ display: "grid", gap: formGap }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: gridColumns,
                gap: formGap,
              }}
            >
              <div>
                <label htmlFor="settings-appName" style={labelStyle}>
                  Nom de l'application *
                </label>
                <input
                  id="settings-appName"
                  value={settingsForm.appName}
                  onChange={(e) => updateSettingsField("appName", e.target.value)}
                  style={inputStyle}
                  required
                  autoComplete="organization"
                />
              </div>
              <div>
                <label htmlFor="settings-supportEmail" style={labelStyle}>
                  Email de support *
                </label>
                <input
                  id="settings-supportEmail"
                  type="email"
                  value={settingsForm.supportEmail}
                  onChange={(e) =>
                    updateSettingsField("supportEmail", e.target.value)
                  }
                  style={inputStyle}
                  required
                  autoComplete="email"
                />
              </div>
              <div>
                <label htmlFor="settings-supportPhone" style={labelStyle}>
                  Téléphone
                </label>
                <input
                  id="settings-supportPhone"
                  type="tel"
                  inputMode="tel"
                  value={settingsForm.supportPhone}
                  onChange={(e) =>
                    updateSettingsField("supportPhone", e.target.value)
                  }
                  style={inputStyle}
                  autoComplete="tel"
                />
              </div>
              <div>
                <label htmlFor="settings-address" style={labelStyle}>
                  Adresse
                </label>
                <input
                  id="settings-address"
                  value={settingsForm.address}
                  onChange={(e) => updateSettingsField("address", e.target.value)}
                  style={inputStyle}
                  autoComplete="street-address"
                />
              </div>
              <div>
                <label htmlFor="settings-logoUrl" style={labelStyle}>
                  URL du logo
                </label>
                <input
                  id="settings-logoUrl"
                  type="url"
                  value={settingsForm.logoUrl}
                  onChange={(e) => updateSettingsField("logoUrl", e.target.value)}
                  placeholder="https://exemple.com/logo.png"
                  style={inputStyle}
                  autoComplete="url"
                />
              </div>
              <div>
                <label htmlFor="settings-slogan" style={labelStyle}>
                  Slogan
                </label>
                <input
                  id="settings-slogan"
                  value={settingsForm.slogan}
                  onChange={(e) => updateSettingsField("slogan", e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label htmlFor="settings-primaryColor" style={labelStyle}>
                  Couleur principale
                </label>
                <input
                  id="settings-primaryColor"
                  type="color"
                  value={settingsForm.primaryColor}
                  onChange={(e) =>
                    updateSettingsField("primaryColor", e.target.value)
                  }
                  style={{
                    ...inputStyle,
                    height: isMobile ? 44 : 40,
                    padding: 4,
                    cursor: "pointer",
                  }}
                />
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: isMobile ? "center" : "flex-end",
              }}
            >
              <button
                type="submit"
                disabled={savingSettings}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: buttonPadding,
                  background: savingSettings
                    ? disabledBg
                    : dark
                    ? "#818CF8"
                    : "#4F46E5",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  fontWeight: 600,
                  cursor: savingSettings ? disabledCursor : "pointer",
                  fontSize: buttonFontSize,
                  width: buttonFullWidth,
                  transition: "background 0.2s, opacity 0.2s",
                }}
              >
                {savingSettings ? (
                  <Loader size={16} className="st-spin" />
                ) : (
                  <Save size={16} />
                )}
                {savingSettings ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ════════════════ Carte Changement de mot de passe ════════════════ */}
      <div
        style={{
          background: dark ? "#1E293B" : "#FFFFFF",
          borderRadius: 16,
          padding: cardPadding,
          boxShadow: dark
            ? "0 1px 3px rgba(0,0,0,0.3)"
            : "0 1px 3px rgba(0,0,0,0.05)",
          border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
        }}
      >
        <h3
          style={{
            fontSize: cardTitleSize,
            fontWeight: 600,
            color: dark ? "#F1F5F9" : "#1E293B",
            marginBottom: isMobile ? 16 : 20,
          }}
        >
          Changer le mot de passe
        </h3>

        <form
          onSubmit={handleChangePassword}
          noValidate
          style={{ display: "grid", gap: formGap }}
        >
          <PasswordField
            id="pwd-current"
            label="Mot de passe actuel"
            value={passwordForm.currentPassword}
            onChange={(e) =>
              updatePasswordField("currentPassword", e.target.value)
            }
            show={showCurrentPassword}
            onToggle={() => setShowCurrentPassword((s) => !s)}
            autoComplete="current-password"
            inputStyle={inputStyle}
            labelStyle={labelStyle}
            eyeIconSize={eyeIconSize}
            dark={dark}
          />

          <PasswordField
            id="pwd-new"
            label="Nouveau mot de passe"
            value={passwordForm.newPassword}
            onChange={(e) => updatePasswordField("newPassword", e.target.value)}
            show={showNewPassword}
            onToggle={() => setShowNewPassword((s) => !s)}
            autoComplete="new-password"
            inputStyle={inputStyle}
            labelStyle={labelStyle}
            eyeIconSize={eyeIconSize}
            dark={dark}
          />

          <PasswordField
            id="pwd-confirm"
            label="Confirmer le nouveau mot de passe"
            value={passwordForm.confirmPassword}
            onChange={(e) =>
              updatePasswordField("confirmPassword", e.target.value)
            }
            show={showConfirmPassword}
            onToggle={() => setShowConfirmPassword((s) => !s)}
            autoComplete="new-password"
            inputStyle={inputStyle}
            labelStyle={labelStyle}
            eyeIconSize={eyeIconSize}
            dark={dark}
          />

          {/* Indicateur visuel si les mots de passe ne correspondent pas */}
          {passwordForm.confirmPassword &&
            passwordForm.newPassword !== passwordForm.confirmPassword && (
              <div
                style={{
                  color: "#EF4444",
                  fontSize: 12,
                  marginTop: -6,
                }}
                role="alert"
              >
                Les mots de passe ne correspondent pas.
              </div>
            )}

          {/* Hint longueur */}
          {passwordForm.newPassword &&
            validatePasswordStrength(passwordForm.newPassword) && (
              <div
                style={{
                  color: "#F59E0B",
                  fontSize: 12,
                  marginTop: -6,
                }}
              >
                {validatePasswordStrength(passwordForm.newPassword)}
              </div>
            )}

          <div
            style={{
              display: "flex",
              justifyContent: isMobile ? "center" : "flex-end",
            }}
          >
            <button
              type="submit"
              disabled={changingPassword}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: buttonPadding,
                background: changingPassword ? disabledBg : "#EF4444",
                color: "white",
                border: "none",
                borderRadius: 8,
                fontWeight: 600,
                cursor: changingPassword ? disabledCursor : "pointer",
                fontSize: buttonFontSize,
                width: buttonFullWidth,
                transition: "background 0.2s, opacity 0.2s",
              }}
            >
              {changingPassword ? (
                <Loader size={16} className="st-spin" />
              ) : (
                <Key size={16} />
              )}
              {changingPassword ? "Modification..." : "Modifier le mot de passe"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}