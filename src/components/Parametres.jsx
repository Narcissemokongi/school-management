import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useStyles } from "../styles/theme";
import {
  User, Building, Shield, Save, Upload, Eye, EyeOff,
  Calendar, Loader, AlertCircle, ShieldCheck, Mail,
  KeyRound, Trash2, Info,
} from "lucide-react";
import toast from "react-hot-toast";
import { Skeleton } from "./Skeleton";
import { hashPassword, verifyPassword } from "../utils/crypto";
import { GestionAnnees } from "./GestionAnnees";
import { useConfirm } from "../hooks/useConfirm";
import { ConfirmDialog } from "./ConfirmDialog";

// ===== Sous-composant pour la gestion de la 2FA par email =====
function TwoFactorEmailSettings({ userId }) {
  const { dark } = useStyles();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const twoFactorRecord = useQuery(api.twoFactorEmail.getByUser, { userId });

  const setupEmail = useMutation(api.twoFactorEmail.setupEmail);
  const verifyAndEnable = useMutation(api.twoFactorEmail.verifyAndEnableEmail);
  const disableEmail = useMutation(api.twoFactorEmail.disableEmail);

  if (twoFactorRecord === undefined) {
    return <Skeleton height={100} />;
  }

  const handleSendCode = async () => {
    if (!email.trim()) {
      toast.error("Veuillez saisir votre adresse email.");
      return;
    }
    setSending(true);
    try {
      await setupEmail({ userId, email: email.trim() });
      setIsSettingUp(true);
      toast.success("Code de vérification envoyé à votre email.");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  const handleVerifyCode = async () => {
    if (code.length !== 6) {
      toast.error("Le code doit contenir 6 chiffres.");
      return;
    }
    setVerifying(true);
    try {
      await verifyAndEnable({ userId, code });
      toast.success("2FA par email activée avec succès !");
      setIsSettingUp(false);
      setCode("");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setVerifying(false);
    }
  };

  const handleDisable = async () => {
    setVerifying(true);
    try {
      await disableEmail({ userId });
      toast.success("2FA par email désactivée.");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setVerifying(false);
    }
  };

  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const inputBg = dark ? "#0F172A" : "#F9FAFB";
  const inputText = dark ? "#F1F5F9" : "#1E293B";
  const buttonPrimary = dark ? "#818CF8" : "#4F46E5";

  return (
    <div style={{ background: cardBg, borderRadius: 12, padding: 20, border: `1px solid ${cardBorder}` }}>
      <h3 style={{ display: "flex", alignItems: "center", gap: 8, color: textPrimary, marginBottom: 12 }}>
        <ShieldCheck size={20} color={buttonPrimary} />
        Authentification à deux facteurs (Email)
      </h3>

      {twoFactorRecord?.enabled ? (
        <div>
          <p style={{ color: textSecondary, marginBottom: 8 }}>
            La 2FA par email est <strong>activée</strong> sur : {twoFactorRecord.email}
          </p>
          <button
            onClick={handleDisable}
            disabled={verifying}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 16px",
              background: "#EF4444",
              color: "white",
              border: "none",
              borderRadius: 8,
              fontWeight: 600,
              cursor: "pointer",
              opacity: verifying ? 0.7 : 1,
            }}
          >
            {verifying ? <Loader size={16} className="animate-spin" /> : <Trash2 size={16} />}
            Désactiver la 2FA
          </button>
        </div>
      ) : isSettingUp ? (
        <div>
          <p style={{ color: textSecondary, marginBottom: 8 }}>
            Un code à 6 chiffres a été envoyé à <strong>{email}</strong>. Saisissez-le ci-dessous :
          </p>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="123456"
              style={{
                padding: "10px 14px",
                border: `1px solid ${cardBorder}`,
                borderRadius: 8,
                fontSize: 16,
                width: 140,
                textAlign: "center",
                letterSpacing: "4px",
                background: inputBg,
                color: inputText,
              }}
            />
            <button
              onClick={handleVerifyCode}
              disabled={verifying || code.length !== 6}
              style={{
                padding: "10px 20px",
                background: verifying ? "#A5B4FC" : buttonPrimary,
                color: "white",
                border: "none",
                borderRadius: 8,
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {verifying ? <Loader size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
              Vérifier et activer
            </button>
          </div>
          <button
            onClick={() => setIsSettingUp(false)}
            style={{ marginTop: 8, background: "none", border: "none", color: textSecondary, cursor: "pointer", fontSize: 13 }}
          >
            Annuler
          </button>
        </div>
      ) : (
        <div>
          <p style={{ color: textSecondary, marginBottom: 8 }}>
            Ajoutez une couche de sécurité supplémentaire en recevant un code par email à chaque connexion.
          </p>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input
              type="email"
              placeholder="Votre adresse email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                flex: 1,
                minWidth: 200,
                padding: "10px 14px",
                border: `1px solid ${cardBorder}`,
                borderRadius: 8,
                fontSize: 14,
                background: inputBg,
                color: inputText,
              }}
            />
            <button
              onClick={handleSendCode}
              disabled={sending || !email.trim()}
              style={{
                padding: "10px 16px",
                background: sending ? "#A5B4FC" : buttonPrimary,
                color: "white",
                border: "none",
                borderRadius: 8,
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {sending ? <Loader size={16} className="animate-spin" /> : <Mail size={16} />}
              Envoyer le code
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== Composant principal Parametres =====
export function Parametres({ ecoleId, user }) {
  const { S, dark } = useStyles();
  const { confirm, dialogProps } = useConfirm();
  const [tab, setTab] = useState("profil");

  const ecole = useQuery(api.ecoles.get, ecoleId ? { ecoleId } : "skip");
  const users = useQuery(api.users.listByEcole, ecoleId ? { ecoleId } : "skip") ?? [];

  const changePassword = useMutation(api.users.changePassword);
  const updateEcole = useMutation(api.ecoles.update);
  const updateLogo = useMutation(api.ecoles.updateLogo);
  const updateRole = useMutation(api.users.updateRole);
  const updateDevise = useMutation(api.ecoles.updateDevise);
  const updateTypePeriode = useMutation(api.ecoles.updateTypePeriode);
  const updateBareme = useMutation(api.ecoles.updateBareme);
  const updateMentions = useMutation(api.ecoles.updateMentions);

  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [changingPwd, setChangingPwd] = useState(false);

  const [nomEcole, setNomEcole] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [devise, setDevise] = useState("CDF");
  const [typePeriode, setTypePeriode] = useState("trimestre");
  const [bareme, setBareme] = useState(20);
  const [seuilF, setSeuilF] = useState(80);
  const [seuilE, setSeuilE] = useState(60);
  const [seuilA, setSeuilA] = useState(50);
  const [updating, setUpdating] = useState({});
  const [logoError, setLogoError] = useState("");

  useEffect(() => {
    if (ecole) {
      setNomEcole(ecole.nom || "");
      setLogoUrl(ecole.logo || "");
      setDevise(ecole.devise || "CDF");
      setTypePeriode(ecole.typePeriode || "trimestre");
      setBareme(ecole.bareme ?? 20);
      setSeuilF(ecole.seuilFelicitations ?? 80);
      setSeuilE(ecole.seuilEncouragement ?? 60);
      setSeuilA(ecole.seuilAvertissement ?? 50);
    }
  }, [ecole]);

  const handleChangePassword = async () => {
    if (newPwd !== confirmPwd) {
      toast.error("Les nouveaux mots de passe ne correspondent pas");
      return;
    }
    if (newPwd.length < 4) {
      toast.error("Le mot de passe doit contenir au moins 4 caractères");
      return;
    }

    const isOldOk = await verifyPassword(oldPwd, user.password);
    if (!isOldOk) {
      toast.error("Ancien mot de passe incorrect");
      return;
    }

    setChangingPwd(true);
    try {
      const hashedNew = await hashPassword(newPwd);
      await changePassword({ userId: user._id, newPassword: hashedNew });
      toast.success("Mot de passe modifié avec succès");
      setOldPwd("");
      setNewPwd("");
      setConfirmPwd("");
    } catch (err) {
      toast.error(err.message || "Erreur lors du changement de mot de passe");
    } finally {
      setChangingPwd(false);
    }
  };

  const handleUpdateEcole = async () => {
    if (!nomEcole.trim()) {
      toast.error("Le nom de l'école est requis");
      return;
    }
    setUpdating((prev) => ({ ...prev, ecole: true }));
    try {
      await updateEcole({ ecoleId, nom: nomEcole, userId: user._id });
      toast.success("École mise à jour");
    } catch (err) {
      toast.error("Erreur : " + err.message);
    } finally {
      setUpdating((prev) => ({ ...prev, ecole: false }));
    }
  };

  const handleUpdateLogo = async () => {
    if (logoUrl && !/^https?:\/\/.+\..+/.test(logoUrl)) {
      setLogoError("URL invalide (doit commencer par http:// ou https://)");
      return;
    }
    setLogoError("");
    setUpdating((prev) => ({ ...prev, logo: true }));
    try {
      await updateLogo({ ecoleId, logoUrl, userId: user._id });
      toast.success("Logo mis à jour");
    } catch (err) {
      toast.error("Erreur : " + err.message);
    } finally {
      setUpdating((prev) => ({ ...prev, logo: false }));
    }
  };

  const handleUpdateDevise = async () => {
    setUpdating((prev) => ({ ...prev, devise: true }));
    try {
      await updateDevise({ ecoleId, devise });
      toast.success("Devise mise à jour");
    } catch (err) {
      toast.error("Erreur : " + err.message);
    } finally {
      setUpdating((prev) => ({ ...prev, devise: false }));
    }
  };

  const handleUpdateTypePeriode = async () => {
    setUpdating((prev) => ({ ...prev, periode: true }));
    try {
      await updateTypePeriode({ ecoleId, typePeriode });
      toast.success("Périodicité mise à jour");
    } catch (err) {
      toast.error("Erreur : " + err.message);
    } finally {
      setUpdating((prev) => ({ ...prev, periode: false }));
    }
  };

  const handleUpdateBareme = async () => {
    if (isNaN(Number(bareme)) || Number(bareme) <= 0) {
      toast.error("Barème invalide");
      return;
    }
    setUpdating((prev) => ({ ...prev, bareme: true }));
    try {
      await updateBareme({ ecoleId, bareme: Number(bareme) });
      toast.success("Barème mis à jour");
    } catch (err) {
      toast.error("Erreur : " + err.message);
    } finally {
      setUpdating((prev) => ({ ...prev, bareme: false }));
    }
  };

  const handleUpdateMentions = async () => {
    if (
      isNaN(Number(seuilF)) || isNaN(Number(seuilE)) || isNaN(Number(seuilA)) ||
      Number(seuilF) < 0 || Number(seuilF) > 100 ||
      Number(seuilE) < 0 || Number(seuilE) > 100 ||
      Number(seuilA) < 0 || Number(seuilA) > 100
    ) {
      toast.error("Les seuils doivent être entre 0 et 100");
      return;
    }
    setUpdating((prev) => ({ ...prev, mentions: true }));
    try {
      await updateMentions({
        ecoleId,
        seuilFelicitations: Number(seuilF),
        seuilEncouragement: Number(seuilE),
        seuilAvertissement: Number(seuilA),
      });
      toast.success("Seuils des mentions mis à jour");
    } catch (err) {
      toast.error("Erreur : " + err.message);
    } finally {
      setUpdating((prev) => ({ ...prev, mentions: false }));
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    if (userId === user._id) {
      toast.error("Vous ne pouvez pas modifier votre propre rôle.");
      return;
    }
    const ok = await confirm(
      "Changer le rôle",
      `Voulez-vous vraiment changer le rôle de cet utilisateur en "${newRole}" ?`
    );
    if (!ok) return;
    try {
      await updateRole({ userId, newRole });
      toast.success("Rôle modifié");
    } catch (err) {
      toast.error("Erreur : " + err.message);
    }
  };

  if (!ecole) return <Skeleton height={200} />;

  const roles = [
    "admin", "directeur", "disciplinaire", "enseignant", "parent", "comptable", "eleve",
  ];

  const tabs = [
    { id: "profil", label: "Profil", icon: <User size={18} /> },
    { id: "securite", label: "Sécurité", icon: <ShieldCheck size={18} /> },
    { id: "ecole", label: "École", icon: <Building size={18} /> },
    { id: "roles", label: "Rôles", icon: <Shield size={18} /> },
    { id: "annees", label: "Année scolaire", icon: <Calendar size={18} /> },
  ];

  const tabStyle = (isActive) => ({
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 16px",
    border: "none",
    borderRadius: 8,
    background: isActive ? (dark ? "#818CF8" : "#4F46E5") : "transparent",
    color: isActive ? "#fff" : dark ? "#CBD5E1" : "#374151",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s",
  });

  const inputStyle = {
    width: "100%",
    padding: "10px 14px",
    border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
    borderRadius: 8,
    fontSize: 14,
    outline: "none",
    background: dark ? "#0F172A" : "#F9FAFB",
    color: dark ? "#F1F5F9" : "#1E293B",
    transition: "border-color 0.2s, background-color 0.3s",
  };

  return (
    <div>
      <h2 style={{ fontSize: 24, fontWeight: 700, color: dark ? "#F1F5F9" : "#1E293B", marginBottom: 24 }}>
        Paramètres
      </h2>

      <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}
        role="tablist"
        aria-label="Sections des paramètres"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            id={`tab-${t.id}`}
            onClick={() => setTab(t.id)}
            style={tabStyle(tab === t.id)}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {tab === "profil" && (
        <div role="tabpanel" id="panel-profil" aria-labelledby="tab-profil">
          <div style={{ background: dark ? "#1E293B" : "#FFFFFF", borderRadius: 16, padding: 24, boxShadow: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)", border: `1px solid ${dark ? "#334155" : "#E2E8F0"}` }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: dark ? "#F1F5F9" : "#1E293B", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <User size={18} /> Informations du profil
            </h3>
            <div style={{ marginBottom: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
              <div>
                <span style={{ color: dark ? "#94A3B8" : "#64748B", fontSize: 13 }}>Nom</span>
                <p style={{ fontWeight: 600, color: dark ? "#F1F5F9" : "#1E293B", margin: "4px 0 0" }}>{user.nom} {user.postnom || ""}</p>
              </div>
              <div>
                <span style={{ color: dark ? "#94A3B8" : "#64748B", fontSize: 13 }}>Login</span>
                <p style={{ fontWeight: 600, color: dark ? "#F1F5F9" : "#1E293B", margin: "4px 0 0" }}>@{user.login}</p>
              </div>
              <div>
                <span style={{ color: dark ? "#94A3B8" : "#64748B", fontSize: 13 }}>Rôle</span>
                <p style={{ fontWeight: 600, color: dark ? "#F1F5F9" : "#1E293B", margin: "4px 0 0" }}>{user.role}</p>
              </div>
            </div>

            <h3 style={{ fontSize: 18, fontWeight: 600, color: dark ? "#F1F5F9" : "#1E293B", marginBottom: 16 }}>
              Modifier mon mot de passe
            </h3>
            <div style={{ marginBottom: 12 }}>
              <label htmlFor="old-password" style={{ display: "block", marginBottom: 4, color: dark ? "#94A3B8" : "#64748B" }}>Ancien mot de passe</label>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  id="old-password"
                  type={showOld ? "text" : "password"}
                  value={oldPwd}
                  onChange={(e) => setOldPwd(e.target.value)}
                  style={{ ...inputStyle, marginBottom: 0 }}
                  aria-label="Ancien mot de passe"
                />
                <button
                  onClick={() => setShowOld(!showOld)}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: dark ? "#94A3B8" : "#64748B" }}
                  aria-label={showOld ? "Cacher le mot de passe" : "Afficher le mot de passe"}
                >
                  {showOld ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label htmlFor="new-password" style={{ display: "block", marginBottom: 4, color: dark ? "#94A3B8" : "#64748B" }}>Nouveau mot de passe</label>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  id="new-password"
                  type={showNew ? "text" : "password"}
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  style={{ ...inputStyle, marginBottom: 0 }}
                  aria-label="Nouveau mot de passe"
                />
                <button
                  onClick={() => setShowNew(!showNew)}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: dark ? "#94A3B8" : "#64748B" }}
                  aria-label={showNew ? "Cacher le mot de passe" : "Afficher le mot de passe"}
                >
                  {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label htmlFor="confirm-password" style={{ display: "block", marginBottom: 4, color: dark ? "#94A3B8" : "#64748B" }}>Confirmer le nouveau mot de passe</label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                style={inputStyle}
                aria-label="Confirmation du nouveau mot de passe"
              />
            </div>
            <button
              onClick={handleChangePassword}
              disabled={changingPwd}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", background: changingPwd ? "#94A3B8" : dark ? "#818CF8" : "#4F46E5", color: "white", border: "none", borderRadius: 8, fontWeight: 600, cursor: changingPwd ? "not-allowed" : "pointer" }}
              aria-label="Enregistrer le nouveau mot de passe"
            >
              {changingPwd ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
              {changingPwd ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </div>
      )}

      {tab === "securite" && (
        <div role="tabpanel" id="panel-securite" aria-labelledby="tab-securite">
          <TwoFactorEmailSettings userId={user._id} />
        </div>
      )}

      {tab === "ecole" && (
        <div role="tabpanel" id="panel-ecole" aria-labelledby="tab-ecole">
          <div style={{ background: dark ? "#1E293B" : "#FFFFFF", borderRadius: 16, padding: 24, boxShadow: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)", border: `1px solid ${dark ? "#334155" : "#E2E8F0"}` }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: dark ? "#F1F5F9" : "#1E293B", marginBottom: 16 }}>Informations de l'école</h3>

            <div style={{ marginBottom: 16 }}>
              <label htmlFor="ecole-nom" style={{ display: "block", marginBottom: 4, color: dark ? "#94A3B8" : "#64748B" }}>Nom de l'école</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  id="ecole-nom"
                  value={nomEcole}
                  onChange={(e) => setNomEcole(e.target.value)}
                  style={{ ...inputStyle, flex: 1 }}
                  aria-label="Nom de l'école"
                />
                <button
                  onClick={handleUpdateEcole}
                  disabled={updating.ecole}
                  style={{ padding: "10px 16px", background: dark ? "#818CF8" : "#4F46E5", color: "white", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                  aria-label="Mettre à jour le nom de l'école"
                >
                  {updating.ecole ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
                  Mettre à jour
                </button>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label htmlFor="ecole-logo" style={{ display: "block", marginBottom: 4, color: dark ? "#94A3B8" : "#64748B" }}>Logo (URL)</label>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  id="ecole-logo"
                  value={logoUrl}
                  onChange={(e) => { setLogoUrl(e.target.value); setLogoError(""); }}
                  style={{ ...inputStyle, flex: 1, borderColor: logoError ? "#EF4444" : undefined }}
                  aria-label="URL du logo"
                />
                <button
                  onClick={handleUpdateLogo}
                  disabled={updating.logo}
                  style={{ padding: "10px 16px", background: "#10B981", color: "white", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                  aria-label="Mettre à jour le logo"
                >
                  {updating.logo ? <Loader size={16} className="animate-spin" /> : <Upload size={16} />}
                  Mettre à jour
                </button>
              </div>
              {logoError && (
                <div style={{ color: "#EF4444", fontSize: 12, marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                  <AlertCircle size={14} /> {logoError}
                </div>
              )}
              {logoUrl && !logoError && (
                <img
                  src={logoUrl}
                  alt="Logo de l'école"
                  style={{ maxWidth: 100, marginTop: 12, borderRadius: 8 }}
                  onError={(e) => (e.target.style.display = "none")}
                />
              )}
            </div>

            <div style={{ marginBottom: 16 }}>
              <label htmlFor="ecole-devise" style={{ display: "block", marginBottom: 4, color: dark ? "#94A3B8" : "#64748B" }}>Devise</label>
              <div style={{ display: "flex", gap: 8 }}>
                <select
                  id="ecole-devise"
                  value={devise}
                  onChange={(e) => setDevise(e.target.value)}
                  style={{ ...inputStyle, flex: 1 }}
                  aria-label="Devise"
                >
                  <option value="CDF">CDF</option>
                  <option value="USD">USD</option>
                </select>
                <button
                  onClick={handleUpdateDevise}
                  disabled={updating.devise}
                  style={{ padding: "10px 16px", background: dark ? "#818CF8" : "#4F46E5", color: "white", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                >
                  {updating.devise ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
                  Mettre à jour
                </button>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label htmlFor="ecole-periode" style={{ display: "block", marginBottom: 4, color: dark ? "#94A3B8" : "#64748B" }}>Type de période</label>
              <div style={{ display: "flex", gap: 8 }}>
                <select
                  id="ecole-periode"
                  value={typePeriode}
                  onChange={(e) => setTypePeriode(e.target.value)}
                  style={{ ...inputStyle, flex: 1 }}
                  aria-label="Type de période"
                >
                  <option value="trimestre">Trimestre</option>
                  <option value="semestre">Semestre</option>
                  <option value="mois">Mois</option>
                </select>
                <button
                  onClick={handleUpdateTypePeriode}
                  disabled={updating.periode}
                  style={{ padding: "10px 16px", background: dark ? "#818CF8" : "#4F46E5", color: "white", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                >
                  {updating.periode ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
                  Mettre à jour
                </button>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label htmlFor="ecole-bareme" style={{ display: "block", marginBottom: 4, color: dark ? "#94A3B8" : "#64748B" }}>Barème</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  id="ecole-bareme"
                  type="number"
                  min="1"
                  value={bareme}
                  onChange={(e) => setBareme(e.target.value)}
                  style={{ ...inputStyle, flex: 1 }}
                  aria-label="Barème"
                />
                <button
                  onClick={handleUpdateBareme}
                  disabled={updating.bareme}
                  style={{ padding: "10px 16px", background: dark ? "#818CF8" : "#4F46E5", color: "white", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                >
                  {updating.bareme ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
                  Mettre à jour
                </button>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 4, color: dark ? "#94A3B8" : "#64748B" }}>Seuils des mentions</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
                <div>
                  <span style={{ fontSize: 13 }}>Félicitations</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={seuilF}
                    onChange={(e) => setSeuilF(e.target.value)}
                    style={inputStyle}
                    aria-label="Seuil félicitations"
                  />
                </div>
                <div>
                  <span style={{ fontSize: 13 }}>Encouragement</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={seuilE}
                    onChange={(e) => setSeuilE(e.target.value)}
                    style={inputStyle}
                    aria-label="Seuil encouragement"
                  />
                </div>
                <div>
                  <span style={{ fontSize: 13 }}>Avertissement</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={seuilA}
                    onChange={(e) => setSeuilA(e.target.value)}
                    style={inputStyle}
                    aria-label="Seuil avertissement"
                  />
                </div>
              </div>
              <button
                onClick={handleUpdateMentions}
                disabled={updating.mentions}
                style={{ padding: "10px 16px", background: dark ? "#818CF8" : "#4F46E5", color: "white", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}
              >
                {updating.mentions ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
                Mettre à jour les seuils
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === "roles" && (
        <div role="tabpanel" id="panel-roles" aria-labelledby="tab-roles">
          <div style={{ background: dark ? "#1E293B" : "#FFFFFF", borderRadius: 16, padding: 24, boxShadow: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)", border: `1px solid ${dark ? "#334155" : "#E2E8F0"}` }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: dark ? "#F1F5F9" : "#1E293B", marginBottom: 16 }}>Gestion des rôles</h3>
            {users.length === 0 && <p style={{ color: dark ? "#94A3B8" : "#64748B" }}>Aucun utilisateur.</p>}
            {users.map((u) => (
              <div
                key={u._id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 0",
                  borderBottom: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: dark ? "#F1F5F9" : "#1E293B" }}>{u.nom}</div>
                  <div style={{ fontSize: 13, color: dark ? "#94A3B8" : "#64748B" }}>Actuel : {u.role}</div>
                </div>
                <select
                  value={u.role}
                  onChange={(e) => handleRoleChange(u._id, e.target.value)}
                  style={{ ...inputStyle, width: 150, marginBottom: 0, cursor: u._id === user._id ? "not-allowed" : "pointer", opacity: u._id === user._id ? 0.6 : 1 }}
                  disabled={u._id === user._id}
                  aria-label={`Changer le rôle de ${u.nom}`}
                >
                  {roles.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "annees" && (
        <div role="tabpanel" id="panel-annees" aria-labelledby="tab-annees">
          <GestionAnnees ecoleId={ecoleId} />
        </div>
      )}

      <ConfirmDialog {...dialogProps} />
    </div>
  );
}