// src/components/SettingsTab.jsx
import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useTokens } from "@/theme/tokens";
import { useIsMobile } from "@/hooks/useIsMobile";
import { Button } from "@/components/ui";
import toast from "react-hot-toast";
import { Loader, Save, Key, Eye, EyeOff, Info } from "lucide-react";

// ════════════════════════════════════════════════════════════════════
// KEYFRAMES (module-level, préfixés `st-*`)
// ════════════════════════════════════════════════════════════════════
const SettingsTabKeyframes = (
  <style>{`
    @keyframes st-spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
    .st-spin { animation: st-spin 1s linear infinite; }
    @media (prefers-reduced-motion: reduce) {
      .st-spin { animation: none !important; }
    }
  `}</style>
);

// ════════════════════════════════════════════════════════════════════
// VALIDATION MOT DE PASSE (alignée backend)
// ════════════════════════════════════════════════════════════════════
const MIN_PASSWORD_LENGTH = 8;

function validatePasswordStrength(password) {
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`;
  }
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
    return "Le mot de passe doit contenir majuscule, minuscule et chiffre.";
  }
  return null;
}

// ════════════════════════════════════════════════════════════════════
// PasswordField — extrait du composant principal
// (évite le remontage de l'input à chaque keystroke = perte de focus)
// ════════════════════════════════════════════════════════════════════
function PasswordField({
  id,
  label,
  value,
  onChange,
  show,
  onToggle,
  autoComplete,
  t,
  isMobile,
}) {
  return (
    <div>
      <label
        htmlFor={id}
        style={{
          display: "block",
          fontSize: 12,
          fontWeight: 600,
          color: t.text.muted,
          marginBottom: 6,
          textTransform: "uppercase",
          letterSpacing: 0.3,
        }}
      >
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          required
          minLength={MIN_PASSWORD_LENGTH}
          autoComplete={autoComplete}
          style={{
            width: "100%",
            padding: isMobile ? "12px 44px 12px 14px" : "10px 44px 10px 14px",
            border: `1px solid ${t.border.default}`,
            borderRadius: t.radius.sm,
            background: t.surface.input,
            color: t.text.primary,
            outline: "none",
            fontSize: isMobile ? 16 : 14,
            fontFamily: t.font.family,
            boxSizing: "border-box",
          }}
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
            color: t.text.muted,
            padding: 4,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          aria-label={show ? "Masquer" : "Afficher"}
        >
          {show ? <EyeOff size={isMobile ? 20 : 18} /> : <Eye size={isMobile ? 20 : 18} />}
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ════════════════════════════════════════════════════════════════════
export function SettingsTab({ user }) {
  const t = useTokens();
  const isMobile = useIsMobile();

  const userId = user?._id;
  const isOwner =
    (user?.role === "admin" && !user?.ecoleId) ||
    (user?.role === "superAdmin" && user?.isOwner === true);

  // ⚠️ Cette query n'exige pas `userId` côté backend actuellement.
  //    Si le backend est patché pour exiger userId, décommenter le fallback.
  const settingsRaw = useQuery(api.settings.getGlobalSettings);
  // const settingsRaw = useQuery(
  //   api.settings.getGlobalSettings,
  //   userId ? { userId } : "skip"
  // );

  const settings = useMemo(() => settingsRaw ?? null, [settingsRaw]);
  const isLoadingSettings = settingsRaw === undefined;

  // Mutations
  const updateSettings = useMutation(api.settings.updateGlobalSettings);
  const changePassword = useMutation(api.users.changePassword);

  // ────────────────────────────────────────────────────────────
  // États
  // ────────────────────────────────────────────────────────────
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

  // Sync form avec settings chargés
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

  // Setters fonctionnels (safe en rafale)
  const updateSettingsField = useCallback((field, value) => {
    setSettingsForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const updatePasswordField = useCallback((field, value) => {
    setPasswordForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  // ────────────────────────────────────────────────────────────
  // Save settings
  // ────────────────────────────────────────────────────────────
  const handleSaveSettings = useCallback(
    async (e) => {
      e.preventDefault();
      if (savingSettings) return;

      if (!userId) {
        toast.error("Session invalide.");
        return;
      }

      // ✅ Guard owner-only
      if (!isOwner) {
        toast.error("Seul le propriétaire peut modifier les paramètres globaux.");
        return;
      }

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
          adminId: userId,
        });
        toast.success("Paramètres enregistrés avec succès");
      } catch (err) {
        toast.error("Impossible d'enregistrer : " + (err?.message || "erreur inconnue"));
      } finally {
        setSavingSettings(false);
      }
    },
    [savingSettings, userId, isOwner, settingsForm, updateSettings]
  );

  // ────────────────────────────────────────────────────────────
  // Change password
  // ────────────────────────────────────────────────────────────
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
        toast.error("Les nouveaux mots de passe ne correspondent pas.");
        return;
      }

      const validationError = validatePasswordStrength(passwordForm.newPassword);
      if (validationError) {
        toast.error(validationError);
        return;
      }

      setChangingPassword(true);
      try {
        // ✅ Pas de `requesterId` (backend refuse — cf. rapport §13.4)
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

  // ────────────────────────────────────────────────────────────
  // Styles partagés
  // ────────────────────────────────────────────────────────────
  const cardStyle = {
    background: t.surface.default,
    borderRadius: t.radius.lg,
    padding: isMobile ? 16 : 24,
    boxShadow: t.shadow.sm,
    border: `1px solid ${t.border.default}`,
  };

  const cardTitleStyle = {
    fontSize: isMobile ? 16 : 18,
    fontWeight: 700,
    color: t.text.primary,
    marginBottom: isMobile ? 16 : 20,
    margin: 0,
  };

  const inputStyle = {
    width: "100%",
    padding: isMobile ? "12px 14px" : "10px 14px",
    border: `1px solid ${t.border.default}`,
    borderRadius: t.radius.sm,
    background: t.surface.input,
    color: t.text.primary,
    outline: "none",
    fontSize: isMobile ? 16 : 14,
    fontFamily: t.font.family,
    boxSizing: "border-box",
  };

  const labelStyle = {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: t.text.muted,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  };

  const gridColumns = isMobile ? "1fr" : "repeat(auto-fit, minmax(250px, 1fr))";
  const formGap = isMobile ? 12 : 16;

  // ────────────────────────────────────────────────────────────
  // Rendu
  // ────────────────────────────────────────────────────────────
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

      {/* ═══════════ Bandeau informatif pour les secondaires ═══════════ */}
      {!isOwner && (
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "flex-start",
            padding: 12,
            borderRadius: t.radius.md,
            background: t.status.info.bg,
            color: t.status.info.fg,
            fontSize: 13.5,
            lineHeight: 1.5,
          }}
        >
          <Info size={18} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            Vous pouvez modifier <strong>votre mot de passe</strong>, mais seul le
            propriétaire de la plateforme peut modifier les paramètres globaux.
          </div>
        </div>
      )}

      {/* ═══════════ Carte Paramètres généraux ═══════════ */}
      <div style={cardStyle}>
        <h3 style={cardTitleStyle}>Paramètres généraux</h3>

        {isLoadingSettings ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
            <Loader
              size={24}
              className="st-spin"
              style={{ color: t.accent.primary }}
            />
          </div>
        ) : (
          <form
            onSubmit={handleSaveSettings}
            noValidate
            style={{ display: "grid", gap: formGap }}
          >
            <fieldset
              disabled={!isOwner}
              style={{
                border: "none",
                padding: 0,
                margin: 0,
                display: "grid",
                gap: formGap,
                opacity: isOwner ? 1 : 0.6,
              }}
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
            </fieldset>

            {isOwner && (
              <div
                style={{
                  display: "flex",
                  justifyContent: isMobile ? "center" : "flex-end",
                }}
              >
                <Button
                  type="submit"
                  variant="primary"
                  loading={savingSettings}
                  icon={!savingSettings ? <Save size={16} /> : undefined}
                  fullWidth={isMobile}
                >
                  {savingSettings ? "Enregistrement…" : "Enregistrer"}
                </Button>
              </div>
            )}
          </form>
        )}
      </div>

      {/* ═══════════ Carte Changement de mot de passe ═══════════ */}
      <div style={cardStyle}>
        <h3 style={cardTitleStyle}>Changer le mot de passe</h3>

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
            t={t}
            isMobile={isMobile}
          />

          <PasswordField
            id="pwd-new"
            label="Nouveau mot de passe"
            value={passwordForm.newPassword}
            onChange={(e) => updatePasswordField("newPassword", e.target.value)}
            show={showNewPassword}
            onToggle={() => setShowNewPassword((s) => !s)}
            autoComplete="new-password"
            t={t}
            isMobile={isMobile}
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
            t={t}
            isMobile={isMobile}
          />

          {/* Erreur : mots de passe différents */}
          {passwordForm.confirmPassword &&
            passwordForm.newPassword !== passwordForm.confirmPassword && (
              <div
                role="alert"
                style={{
                  color: t.status.danger.fg,
                  fontSize: 12,
                  marginTop: -6,
                }}
              >
                Les mots de passe ne correspondent pas.
              </div>
            )}

          {/* Erreur : mot de passe faible */}
          {passwordForm.newPassword &&
            validatePasswordStrength(passwordForm.newPassword) && (
              <div
                role="alert"
                style={{
                  color: t.status.warning.fg,
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
            <Button
              type="submit"
              variant="danger"
              loading={changingPassword}
              icon={!changingPassword ? <Key size={16} /> : undefined}
              fullWidth={isMobile}
            >
              {changingPassword ? "Modification…" : "Modifier le mot de passe"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}