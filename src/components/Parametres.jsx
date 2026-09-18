// src/components/Parametres.jsx
import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useAppStore } from "@/store/appStore";
import {
  User,
  Building,
  Shield,
  Save,
  Upload,
  Eye,
  EyeOff,
  Calendar,
  Loader,
  AlertCircle,
  ShieldCheck,
  Mail,
  Trash2,
  Lock,
  Check,
  BookOpen,
  TrendingUp,
} from "lucide-react";
import toast from "react-hot-toast";
import { Skeleton } from "./Skeleton";
import { GestionAnnees } from "./GestionAnnees";
import { useConfirm } from "@/hooks/useConfirm";
import { ConfirmDialog } from "./ConfirmDialog";

// ════════════════════════════════════════════════════════════════════
// CONSTANTES
// ════════════════════════════════════════════════════════════════════
const MIN_PASSWORD_LENGTH = 8;

// ════════════════════════════════════════════════════════════════════
// INDICATEUR DE FORCE DU MOT DE PASSE
// ════════════════════════════════════════════════════════════════════
function getPasswordStrength(pwd) {
  if (!pwd) return { level: 0, label: "", color: "" };
  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;

  if (score <= 1) return { level: 1, label: "Faible", color: "#EF4444" };
  if (score <= 3) return { level: 2, label: "Moyen", color: "#F59E0B" };
  return { level: 3, label: "Fort", color: "#10B981" };
}

function PasswordStrengthBar({ password, dark }) {
  const strength = useMemo(() => getPasswordStrength(password), [password]);
  if (!password) return null;
  return (
    <div style={{ marginTop: -4, marginBottom: 10 }}>
      <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 2,
              background:
                i <= strength.level
                  ? strength.color
                  : dark
                  ? "#334155"
                  : "#E2E8F0",
              transition: "background 0.2s",
            }}
          />
        ))}
      </div>
      <div
        style={{
          fontSize: 10.5,
          color: strength.color,
          fontWeight: 600,
          textAlign: "right",
        }}
      >
        {strength.label}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// CARTE DE SECTION RÉUTILISABLE
// ════════════════════════════════════════════════════════════════════
function SectionCard({
  icon,
  title,
  subtitle,
  children,
  dark,
  isMobile,
  iconColor,
}) {
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const accent = iconColor || (dark ? "#818CF8" : "#4F46E5");

  return (
    <div
      style={{
        background: cardBg,
        borderRadius: 14,
        padding: isMobile ? 14 : 18,
        border: `1px solid ${cardBorder}`,
        boxShadow: dark
          ? "0 1px 3px rgba(0,0,0,0.3)"
          : "0 1px 3px rgba(0,0,0,0.05)",
        marginBottom: isMobile ? 12 : 16,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 16,
          paddingBottom: 12,
          borderBottom: `1px solid ${cardBorder}`,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: `${accent}20`,
            color: accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: isMobile ? 14 : 15,
              fontWeight: 700,
              color: textPrimary,
              lineHeight: 1.2,
            }}
          >
            {title}
          </div>
          {subtitle && (
            <div style={{ fontSize: 11, color: textSecondary, marginTop: 1 }}>
              {subtitle}
            </div>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// 2FA EMAIL
// ════════════════════════════════════════════════════════════════════
function TwoFactorEmailSettings({ userId, isMobile }) {
  const { dark } = useStyles();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const twoFactorRecord = useQuery(
    api.twoFactorEmail.getByUser,
    userId ? { userId } : "skip"
  );

  const setupEmail = useMutation(api.twoFactorEmail.setupEmail);
  const verifyAndEnable = useMutation(api.twoFactorEmail.verifyAndEnableEmail);
  const disableEmail = useMutation(api.twoFactorEmail.disableEmail);

  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const inputBg = dark ? "#0F172A" : "#F8FAFC";
  const inputText = dark ? "#F1F5F9" : "#1E293B";
  const accent = dark ? "#818CF8" : "#4F46E5";
  const success = dark ? "#34D399" : "#10B981";

  if (twoFactorRecord === undefined) return <Skeleton height={100} />;

  const inputStyle = {
    width: "100%",
    padding: isMobile ? "12px 14px" : "10px 14px",
    border: `1px solid ${cardBorder}`,
    borderRadius: 10,
    fontSize: isMobile ? 15 : 14,
    outline: "none",
    background: inputBg,
    color: inputText,
    boxSizing: "border-box",
    fontFamily: "inherit",
  };

  const handleSendCode = async () => {
    if (!userId) {
      toast.error("Session invalide.");
      return;
    }
    if (!email.trim()) {
      toast.error("Veuillez saisir votre adresse email.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error("Adresse email invalide.");
      return;
    }
    setSending(true);
    try {
      await setupEmail({ userId, email: email.trim() });
      setIsSettingUp(true);
      toast.success("Code de vérification envoyé à votre email.");
    } catch (err) {
      toast.error(
        "Impossible d'envoyer le code : " +
          (err?.message || "erreur inconnue")
      );
    } finally {
      setSending(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!userId) return;
    if (code.length !== 6) {
      toast.error("Le code doit contenir 6 chiffres.");
      return;
    }
    setVerifying(true);
    try {
      await verifyAndEnable({ userId, code });
      toast.success("2FA par email activée !");
      setIsSettingUp(false);
      setCode("");
    } catch (err) {
      toast.error(err?.message || "Code invalide");
    } finally {
      setVerifying(false);
    }
  };

  const handleDisable = async () => {
    if (!userId) return;
    setVerifying(true);
    try {
      await disableEmail({ userId });
      toast.success("2FA désactivée.");
    } catch (err) {
      toast.error(err?.message || "Impossible de désactiver la 2FA");
    } finally {
      setVerifying(false);
    }
  };

  // État activé
  if (twoFactorRecord?.enabled) {
    return (
      <div
        style={{
          background: dark ? "#064E3B20" : "#D1FAE5",
          border: `1px solid ${dark ? "#065F46" : "#A7F3D0"}`,
          borderRadius: 12,
          padding: isMobile ? 14 : 16,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            marginBottom: 12,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: success,
              color: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <ShieldCheck size={18} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: success,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Check size={14} /> 2FA activée
            </div>
            <div
              style={{
                fontSize: 12,
                color: textSecondary,
                marginTop: 2,
                wordBreak: "break-all",
              }}
            >
              {twoFactorRecord.email}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDisable}
          disabled={verifying}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            padding: isMobile ? "10px 14px" : "8px 14px",
            background: "transparent",
            color: "#EF4444",
            border: "1px solid #EF4444",
            borderRadius: 10,
            fontWeight: 600,
            fontSize: 13,
            cursor: verifying ? "not-allowed" : "pointer",
            width: isMobile ? "100%" : "auto",
            opacity: verifying ? 0.6 : 1,
          }}
        >
          {verifying ? (
            <Loader size={14} className="pg-spin" />
          ) : (
            <Trash2 size={14} />
          )}
          Désactiver la 2FA
        </button>
      </div>
    );
  }

  // État configuration (code envoyé)
  if (isSettingUp) {
    return (
      <div>
        <p
          style={{
            color: textSecondary,
            marginTop: 0,
            marginBottom: 12,
            fontSize: 13,
            lineHeight: 1.4,
          }}
        >
          Un code à 6 chiffres a été envoyé à{" "}
          <strong style={{ color: textPrimary }}>{email}</strong>. Saisissez-le
          ci-dessous :
        </p>
        <div
          style={{
            display: "flex",
            gap: 8,
            flexDirection: isMobile ? "column" : "row",
          }}
        >
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) =>
              setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            placeholder="123456"
            style={{
              ...inputStyle,
              width: isMobile ? "100%" : 140,
              textAlign: "center",
              letterSpacing: "4px",
              fontSize: 18,
              fontWeight: 700,
            }}
          />
          <button
            type="button"
            onClick={handleVerifyCode}
            disabled={verifying || code.length !== 6}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: isMobile ? "12px 16px" : "10px 16px",
              background: verifying || code.length !== 6 ? "#A5B4FC" : accent,
              color: "white",
              border: "none",
              borderRadius: 10,
              fontWeight: 700,
              fontSize: 13.5,
              cursor: verifying || code.length !== 6 ? "not-allowed" : "pointer",
              flex: isMobile ? "none" : 1,
            }}
          >
            {verifying ? (
              <Loader size={14} className="pg-spin" />
            ) : (
              <ShieldCheck size={14} />
            )}
            Vérifier et activer
          </button>
        </div>
        <button
          type="button"
          onClick={() => setIsSettingUp(false)}
          style={{
            marginTop: 10,
            background: "none",
            border: "none",
            color: textSecondary,
            cursor: "pointer",
            fontSize: 12,
            padding: 0,
          }}
        >
          ← Annuler
        </button>
      </div>
    );
  }

  // État initial
  return (
    <div>
      <p
        style={{
          color: textSecondary,
          marginTop: 0,
          marginBottom: 12,
          fontSize: 13,
          lineHeight: 1.4,
        }}
      >
        Ajoutez une couche de sécurité supplémentaire en recevant un code par
        email à chaque connexion.
      </p>
      <div
        style={{
          display: "flex",
          gap: 8,
          flexDirection: isMobile ? "column" : "row",
        }}
      >
        <input
          type="email"
          placeholder="votre@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          style={{ ...inputStyle, flex: 1 }}
        />
        <button
          type="button"
          onClick={handleSendCode}
          disabled={sending || !email.trim()}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            padding: isMobile ? "12px 16px" : "10px 18px",
            background: sending || !email.trim() ? "#A5B4FC" : accent,
            color: "white",
            border: "none",
            borderRadius: 10,
            fontWeight: 700,
            fontSize: 13.5,
            cursor: sending || !email.trim() ? "not-allowed" : "pointer",
            opacity: sending || !email.trim() ? 0.7 : 1,
          }}
        >
          {sending ? (
            <Loader size={14} className="pg-spin" />
          ) : (
            <Mail size={14} />
          )}
          Envoyer le code
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ════════════════════════════════════════════════════════════════════
export function Parametres({ ecoleId, user }) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();
  const { confirm, dialogProps } = useConfirm();

  const tab = useAppStore((state) => state.parametresTab || "profil");
  const setTab = useAppStore((state) => state.setParametresTab);

  const userId = user?._id;

  // ✅ Queries avec userId
  const ecole = useQuery(
    api.ecoles.get,
    ecoleId && userId ? { ecoleId, userId } : "skip"
  );
  const usersRaw = useQuery(
    api.users.listByEcole,
    ecoleId && userId ? { ecoleId, userId } : "skip"
  );
  const users = useMemo(() => usersRaw ?? [], [usersRaw]);

  // Mutations
  const changePassword = useMutation(api.users.changePassword);
  const updateEcole = useMutation(api.ecoles.update);
  const updateLogo = useMutation(api.ecoles.updateLogo);
  const updateRole = useMutation(api.users.updateRole);
  const updateDevise = useMutation(api.ecoles.updateDevise);
  const updateTypePeriode = useMutation(api.ecoles.updateTypePeriode);
  const updateBareme = useMutation(api.ecoles.updateBareme);
  const updateMentions = useMutation(api.ecoles.updateMentions);

  // === État mot de passe ===
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [changingPwd, setChangingPwd] = useState(false);

  // === État école ===
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

  // Synchronisation
  useEffect(() => {
    if (!ecole) return;
    setNomEcole(ecole.nom || "");
    setLogoUrl(ecole.logo || "");
    setDevise(ecole.devise || "CDF");
    setTypePeriode(ecole.typePeriode || "trimestre");
    setBareme(ecole.bareme ?? 20);
    setSeuilF(ecole.seuilFelicitations ?? 80);
    setSeuilE(ecole.seuilEncouragement ?? 60);
    setSeuilA(ecole.seuilAvertissement ?? 50);
  }, [ecole]);

  // ════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ════════════════════════════════════════════════════════════════════
  const handleChangePassword = useCallback(async () => {
    if (changingPwd) return;
    if (!userId) {
      toast.error("Session invalide.");
      return;
    }
    if (!oldPwd) {
      toast.error("Veuillez saisir votre mot de passe actuel.");
      return;
    }
    if (newPwd !== confirmPwd) {
      toast.error("Les mots de passe ne correspondent pas.");
      return;
    }
    if (newPwd.length < MIN_PASSWORD_LENGTH) {
      toast.error(
        `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`
      );
      return;
    }
    if (newPwd === oldPwd) {
      toast.error("Le nouveau mot de passe doit être différent.");
      return;
    }

    const ok = await confirm(
      "Changer le mot de passe",
      "Voulez-vous vraiment modifier votre mot de passe ?"
    );
    if (!ok) return;

    setChangingPwd(true);
    try {
      // ✅ FIX — Retiré `requesterId` (non accepté par le backend)
      await changePassword({
        userId,
        currentPassword: oldPwd,
        newPassword: newPwd,
      });
      toast.success("Mot de passe modifié avec succès");
      setOldPwd("");
      setNewPwd("");
      setConfirmPwd("");
    } catch (err) {
      toast.error(
        "Erreur lors du changement de mot de passe : " +
          (err?.message || "erreur inconnue")
      );
    } finally {
      setChangingPwd(false);
    }
  }, [
    changingPwd,
    userId,
    oldPwd,
    newPwd,
    confirmPwd,
    confirm,
    changePassword,
  ]);

  const handleUpdateEcole = async () => {
    if (!userId || !ecoleId) return;
    if (!nomEcole.trim()) {
      toast.error("Le nom de l'école est requis");
      return;
    }
    setUpdating((prev) => ({ ...prev, ecole: true }));
    try {
      await updateEcole({ ecoleId, nom: nomEcole, userId });
      toast.success("École mise à jour");
    } catch (err) {
      toast.error("Erreur : " + (err?.message || "inconnue"));
    } finally {
      setUpdating((prev) => ({ ...prev, ecole: false }));
    }
  };

  const handleUpdateLogo = async () => {
    if (!userId || !ecoleId) return;
    if (logoUrl && !/^https?:\/\/.+\..+/.test(logoUrl)) {
      setLogoError("URL invalide (doit commencer par http:// ou https://)");
      return;
    }
    setLogoError("");
    setUpdating((prev) => ({ ...prev, logo: true }));
    try {
      await updateLogo({ ecoleId, logoUrl, userId });
      toast.success("Logo mis à jour");
    } catch (err) {
      toast.error("Erreur : " + (err?.message || "inconnue"));
    } finally {
      setUpdating((prev) => ({ ...prev, logo: false }));
    }
  };

  const handleUpdateDevise = async () => {
    if (!userId || !ecoleId) return;
    setUpdating((prev) => ({ ...prev, devise: true }));
    try {
      await updateDevise({ ecoleId, devise, userId });
      toast.success("Devise mise à jour");
    } catch (err) {
      toast.error("Erreur : " + (err?.message || "inconnue"));
    } finally {
      setUpdating((prev) => ({ ...prev, devise: false }));
    }
  };

  const handleUpdateTypePeriode = async () => {
    if (!userId || !ecoleId) return;
    setUpdating((prev) => ({ ...prev, periode: true }));
    try {
      await updateTypePeriode({ ecoleId, typePeriode, userId });
      toast.success("Périodicité mise à jour");
    } catch (err) {
      toast.error("Erreur : " + (err?.message || "inconnue"));
    } finally {
      setUpdating((prev) => ({ ...prev, periode: false }));
    }
  };

  const handleUpdateBareme = async () => {
    if (!userId || !ecoleId) return;
    if (isNaN(Number(bareme)) || Number(bareme) <= 0) {
      toast.error("Barème invalide");
      return;
    }
    setUpdating((prev) => ({ ...prev, bareme: true }));
    try {
      await updateBareme({ ecoleId, bareme: Number(bareme), userId });
      toast.success("Barème mis à jour");
    } catch (err) {
      toast.error("Erreur : " + (err?.message || "inconnue"));
    } finally {
      setUpdating((prev) => ({ ...prev, bareme: false }));
    }
  };

  const handleUpdateMentions = async () => {
    if (!userId || !ecoleId) return;
    if (
      isNaN(Number(seuilF)) ||
      isNaN(Number(seuilE)) ||
      isNaN(Number(seuilA)) ||
      Number(seuilF) < 0 ||
      Number(seuilF) > 100 ||
      Number(seuilE) < 0 ||
      Number(seuilE) > 100 ||
      Number(seuilA) < 0 ||
      Number(seuilA) > 100
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
        userId,
      });
      toast.success("Seuils mis à jour");
    } catch (err) {
      toast.error("Erreur : " + (err?.message || "inconnue"));
    } finally {
      setUpdating((prev) => ({ ...prev, mentions: false }));
    }
  };

  const handleRoleChange = async (targetUserId, newRole) => {
    if (!userId) return;
    if (targetUserId === userId) {
      toast.error("Vous ne pouvez pas modifier votre propre rôle.");
      return;
    }
    const ok = await confirm(
      "Changer le rôle",
      `Voulez-vous vraiment changer le rôle de cet utilisateur en "${newRole}" ?`
    );
    if (!ok) return;
    try {
      // ✅ FIX — Retiré `requesterId` (non accepté par le backend)
      await updateRole({
        userId: targetUserId,
        newRole,
        adminId: userId,
      });
      toast.success("Rôle modifié");
    } catch (err) {
      toast.error("Erreur : " + (err?.message || "inconnue"));
    }
  };

  // ════════════════════════════════════════════════════════════════════
  // RENDU PRÉCOCE : user non chargé
  // ════════════════════════════════════════════════════════════════════
  if (!user || !userId) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          padding: 40,
        }}
      >
        <style>{`
          @keyframes pg-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          .pg-spin { animation: pg-spin 1s linear infinite; }
          @media (prefers-reduced-motion: reduce) {
            .pg-spin { animation: none !important; }
          }
        `}</style>
        <Loader
          size={28}
          className="pg-spin"
          style={{ color: dark ? "#818CF8" : "#4F46E5" }}
        />
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════
  // RENDU PRÉCOCE : école non chargée
  // ════════════════════════════════════════════════════════════════════
  if (!ecole) return <Skeleton height={200} />;

  const roles = [
    "admin",
    "directeur",
    "disciplinaire",
    "enseignant",
    "parent",
    "comptable",
    "eleve",
  ];

  const tabs = [
    { id: "profil", label: "Profil", icon: <User size={16} /> },
    { id: "securite", label: "Sécurité", icon: <ShieldCheck size={16} /> },
    { id: "ecole", label: "École", icon: <Building size={16} /> },
    { id: "roles", label: "Rôles", icon: <Shield size={16} /> },
    { id: "annees", label: "Années", icon: <Calendar size={16} /> },
  ];

  // Couleurs
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const inputBg = dark ? "#0F172A" : "#F8FAFC";
  const inputText = dark ? "#F1F5F9" : "#1E293B";
  const accent = dark ? "#818CF8" : "#4F46E5";
  const accentBg = dark ? "#312E81" : "#EEF2FF";

  const inputStyle = {
    width: "100%",
    padding: isMobile ? "12px 14px" : "10px 14px",
    border: `1px solid ${cardBorder}`,
    borderRadius: 10,
    fontSize: isMobile ? 15 : 14,
    outline: "none",
    background: inputBg,
    color: inputText,
    boxSizing: "border-box",
    fontFamily: "inherit",
    appearance: "none",
    WebkitAppearance: "none",
  };

  const labelStyle = {
    display: "block",
    fontSize: 11,
    fontWeight: 700,
    color: dark ? "#CBD5E1" : "#374151",
    marginBottom: 5,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  };

  const btnPrimary = (disabled = false) => ({
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: isMobile ? "12px 16px" : "10px 18px",
    background: disabled ? "#A5B4FC" : accent,
    color: "#FFFFFF",
    border: "none",
    borderRadius: 10,
    fontWeight: 700,
    fontSize: 13.5,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.7 : 1,
    width: isMobile ? "100%" : "auto",
    whiteSpace: "nowrap",
  });

  const gridColumns = isMobile ? "1fr" : "repeat(auto-fit, minmax(200px, 1fr))";

  const canChangePwd =
    !changingPwd &&
    oldPwd &&
    newPwd &&
    newPwd === confirmPwd &&
    newPwd.length >= MIN_PASSWORD_LENGTH;

  return (
    <div
      style={{
        maxWidth: 900,
        margin: "0 auto",
        padding: isMobile ? "10px 8px 24px" : "20px 16px 32px",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* Keyframes préfixés pg-* */}
      <style>{`
        @keyframes pg-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .pg-spin { animation: pg-spin 1s linear infinite; }
        @media (prefers-reduced-motion: reduce) {
          .pg-spin { animation: none !important; }
        }
      `}</style>

      {/* En-tête */}
      <div style={{ marginBottom: isMobile ? 12 : 20 }}>
        <h2
          style={{
            fontSize: isMobile ? 17 : 22,
            fontWeight: 700,
            color: textPrimary,
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          Paramètres
        </h2>
        <p
          style={{
            color: textSecondary,
            marginTop: 2,
            marginBottom: 0,
            fontSize: isMobile ? 11.5 : 13,
          }}
        >
          Gérez votre compte, votre école et la configuration
        </p>
      </div>

      {/* Tabs */}
      <div
        role="tablist"
        style={{
          display: "flex",
          gap: 4,
          borderBottom: `2px solid ${cardBorder}`,
          marginBottom: isMobile ? 14 : 20,
          overflowX: "auto",
          whiteSpace: "nowrap",
          scrollbarWidth: "none",
        }}
      >
        {tabs.map((t) => {
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setTab(t.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: isMobile ? "12px 14px" : "12px 18px",
                minHeight: isMobile ? 44 : 42,
                border: "none",
                background: "transparent",
                color: isActive ? accent : textSecondary,
                fontWeight: isActive ? 700 : 500,
                borderBottom: isActive
                  ? `3px solid ${accent}`
                  : "3px solid transparent",
                cursor: "pointer",
                fontSize: isMobile ? 13.5 : 14.5,
                flexShrink: 0,
                marginBottom: -2,
              }}
            >
              {t.icon}
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ════════════════════ PROFIL ════════════════════ */}
      {tab === "profil" && (
        <div role="tabpanel">
          <SectionCard
            icon={<User size={16} />}
            title="Mon compte"
            subtitle="Informations de connexion"
            dark={dark}
            isMobile={isMobile}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: gridColumns,
                gap: 12,
                marginBottom: 16,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    color: textSecondary,
                    textTransform: "uppercase",
                    letterSpacing: 0.3,
                    marginBottom: 4,
                  }}
                >
                  Nom complet
                </div>
                <div
                  style={{
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: textPrimary,
                  }}
                >
                  {user.nom} {user.postnom || ""}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    color: textSecondary,
                    textTransform: "uppercase",
                    letterSpacing: 0.3,
                    marginBottom: 4,
                  }}
                >
                  Identifiant
                </div>
                <div
                  style={{
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: textPrimary,
                    fontFamily: "ui-monospace, monospace",
                  }}
                >
                  @{user.login}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    color: textSecondary,
                    textTransform: "uppercase",
                    letterSpacing: 0.3,
                    marginBottom: 4,
                  }}
                >
                  Rôle
                </div>
                <div
                  style={{
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: textPrimary,
                    textTransform: "capitalize",
                  }}
                >
                  {user.role}
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            icon={<Lock size={16} />}
            title="Modifier le mot de passe"
            subtitle="Renforcez la sécurité de votre compte"
            dark={dark}
            isMobile={isMobile}
          >
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Mot de passe actuel</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showOld ? "text" : "password"}
                  value={oldPwd}
                  onChange={(e) => setOldPwd(e.target.value)}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  style={{ ...inputStyle, paddingRight: 42 }}
                />
                <button
                  type="button"
                  onClick={() => setShowOld(!showOld)}
                  aria-label={showOld ? "Masquer" : "Afficher"}
                  style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: textSecondary,
                    cursor: "pointer",
                    padding: 6,
                    display: "flex",
                  }}
                >
                  {showOld ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Nouveau mot de passe</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showNew ? "text" : "password"}
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  autoComplete="new-password"
                  placeholder={`Min. ${MIN_PASSWORD_LENGTH} caractères`}
                  style={{ ...inputStyle, paddingRight: 42 }}
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  aria-label={showNew ? "Masquer" : "Afficher"}
                  style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: textSecondary,
                    cursor: "pointer",
                    padding: 6,
                    display: "flex",
                  }}
                >
                  {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <PasswordStrengthBar password={newPwd} dark={dark} />
              {newPwd.length > 0 && newPwd.length < MIN_PASSWORD_LENGTH && (
                <div
                  style={{
                    color: "#EF4444",
                    fontSize: 11,
                    marginTop: 4,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <AlertCircle size={11} />
                  Au moins {MIN_PASSWORD_LENGTH} caractères requis
                </div>
              )}
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>Confirmer le mot de passe</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                  autoComplete="new-password"
                  placeholder="Confirmer"
                  style={{
                    ...inputStyle,
                    paddingRight: 42,
                    borderColor:
                      confirmPwd && newPwd !== confirmPwd
                        ? "#EF4444"
                        : confirmPwd && newPwd === confirmPwd
                        ? "#10B981"
                        : cardBorder,
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  aria-label={showConfirm ? "Masquer" : "Afficher"}
                  style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: textSecondary,
                    cursor: "pointer",
                    padding: 6,
                    display: "flex",
                  }}
                >
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {confirmPwd && newPwd !== confirmPwd && (
                <div
                  style={{
                    color: "#EF4444",
                    fontSize: 11,
                    marginTop: 6,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <AlertCircle size={11} />
                  Les mots de passe ne correspondent pas
                </div>
              )}
              {confirmPwd &&
                newPwd === confirmPwd &&
                newPwd.length >= MIN_PASSWORD_LENGTH && (
                  <div
                    style={{
                      color: "#10B981",
                      fontSize: 11,
                      marginTop: 6,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Check size={11} />
                    Les mots de passe correspondent
                  </div>
                )}
            </div>

            <button
              type="button"
              onClick={handleChangePassword}
              disabled={!canChangePwd}
              style={btnPrimary(!canChangePwd)}
            >
              {changingPwd ? (
                <Loader size={16} className="pg-spin" />
              ) : (
                <Lock size={16} />
              )}
              {changingPwd ? "Enregistrement…" : "Changer le mot de passe"}
            </button>
          </SectionCard>
        </div>
      )}

      {/* ════════════════════ SÉCURITÉ ════════════════════ */}
      {tab === "securite" && (
        <div role="tabpanel">
          <SectionCard
            icon={<ShieldCheck size={16} />}
            title="Authentification à deux facteurs"
            subtitle="Recevez un code par email à chaque connexion"
            dark={dark}
            isMobile={isMobile}
            iconColor={dark ? "#34D399" : "#10B981"}
          >
            <TwoFactorEmailSettings userId={userId} isMobile={isMobile} />
          </SectionCard>
        </div>
      )}

      {/* ════════════════════ ÉCOLE ════════════════════ */}
      {tab === "ecole" && (
        <div role="tabpanel">
          <SectionCard
            icon={<Building size={16} />}
            title="Informations de l'école"
            subtitle="Nom, logo et identité visuelle"
            dark={dark}
            isMobile={isMobile}
          >
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Nom de l'école</label>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexDirection: isMobile ? "column" : "row",
                }}
              >
                <input
                  value={nomEcole}
                  onChange={(e) => setNomEcole(e.target.value)}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button
                  type="button"
                  onClick={handleUpdateEcole}
                  disabled={updating.ecole}
                  style={btnPrimary(updating.ecole)}
                >
                  {updating.ecole ? (
                    <Loader size={14} className="pg-spin" />
                  ) : (
                    <Save size={14} />
                  )}
                  Mettre à jour
                </button>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Logo (URL)</label>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  flexDirection: isMobile ? "column" : "row",
                }}
              >
                <input
                  value={logoUrl}
                  onChange={(e) => {
                    setLogoUrl(e.target.value);
                    setLogoError("");
                  }}
                  style={{
                    ...inputStyle,
                    flex: 1,
                    borderColor: logoError ? "#EF4444" : cardBorder,
                  }}
                  placeholder="https://exemple.com/logo.png"
                />
                <button
                  type="button"
                  onClick={handleUpdateLogo}
                  disabled={updating.logo}
                  style={btnPrimary(updating.logo)}
                >
                  {updating.logo ? (
                    <Loader size={14} className="pg-spin" />
                  ) : (
                    <Upload size={14} />
                  )}
                  Mettre à jour
                </button>
              </div>
              {logoError && (
                <div
                  style={{
                    color: "#EF4444",
                    fontSize: 11,
                    marginTop: 6,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <AlertCircle size={11} /> {logoError}
                </div>
              )}
              {logoUrl && !logoError && (
                <div style={{ marginTop: 12 }}>
                  <img
                    src={logoUrl}
                    alt="Logo"
                    style={{
                      maxWidth: 100,
                      borderRadius: 8,
                      border: `1px solid ${cardBorder}`,
                    }}
                    onError={(e) => (e.target.style.display = "none")}
                  />
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard
            icon={<BookOpen size={16} />}
            title="Paramètres pédagogiques"
            subtitle="Devise, périodes et barèmes"
            dark={dark}
            isMobile={isMobile}
            iconColor={dark ? "#C4B5FD" : "#8B5CF6"}
          >
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Devise</label>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexDirection: isMobile ? "column" : "row",
                }}
              >
                <select
                  value={devise}
                  onChange={(e) => setDevise(e.target.value)}
                  style={{ ...inputStyle, flex: 1 }}
                >
                  <option value="CDF">CDF — Franc congolais</option>
                  <option value="USD">USD — Dollar américain</option>
                </select>
                <button
                  type="button"
                  onClick={handleUpdateDevise}
                  disabled={updating.devise}
                  style={btnPrimary(updating.devise)}
                >
                  {updating.devise ? (
                    <Loader size={14} className="pg-spin" />
                  ) : (
                    <Save size={14} />
                  )}
                  Mettre à jour
                </button>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Type de période</label>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexDirection: isMobile ? "column" : "row",
                }}
              >
                <select
                  value={typePeriode}
                  onChange={(e) => setTypePeriode(e.target.value)}
                  style={{ ...inputStyle, flex: 1 }}
                >
                  <option value="trimestre">Trimestre</option>
                  <option value="semestre">Semestre</option>
                  <option value="mois">Mois</option>
                </select>
                <button
                  type="button"
                  onClick={handleUpdateTypePeriode}
                  disabled={updating.periode}
                  style={btnPrimary(updating.periode)}
                >
                  {updating.periode ? (
                    <Loader size={14} className="pg-spin" />
                  ) : (
                    <Save size={14} />
                  )}
                  Mettre à jour
                </button>
              </div>
            </div>

            <div>
              <label style={labelStyle}>Barème (note maximale)</label>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexDirection: isMobile ? "column" : "row",
                }}
              >
                <input
                  type="number"
                  min="1"
                  value={bareme}
                  onChange={(e) => setBareme(e.target.value)}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button
                  type="button"
                  onClick={handleUpdateBareme}
                  disabled={updating.bareme}
                  style={btnPrimary(updating.bareme)}
                >
                  {updating.bareme ? (
                    <Loader size={14} className="pg-spin" />
                  ) : (
                    <Save size={14} />
                  )}
                  Mettre à jour
                </button>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            icon={<TrendingUp size={16} />}
            title="Seuils des mentions"
            subtitle="Utilisés pour les appréciations automatiques"
            dark={dark}
            isMobile={isMobile}
            iconColor={dark ? "#FBBF24" : "#F59E0B"}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
                gap: 12,
                marginBottom: 14,
              }}
            >
              <div>
                <label style={labelStyle}>Félicitations</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={seuilF}
                  onChange={(e) => setSeuilF(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Encouragement</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={seuilE}
                  onChange={(e) => setSeuilE(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Avertissement</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={seuilA}
                  onChange={(e) => setSeuilA(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleUpdateMentions}
              disabled={updating.mentions}
              style={btnPrimary(updating.mentions)}
            >
              {updating.mentions ? (
                <Loader size={14} className="pg-spin" />
              ) : (
                <Save size={14} />
              )}
              Mettre à jour les seuils
            </button>
          </SectionCard>
        </div>
      )}

      {/* ════════════════════ RÔLES ════════════════════ */}
      {tab === "roles" && (
        <div role="tabpanel">
          <SectionCard
            icon={<Shield size={16} />}
            title="Gestion des rôles"
            subtitle={`${users.length} utilisateur${users.length > 1 ? "s" : ""}`}
            dark={dark}
            isMobile={isMobile}
            iconColor={dark ? "#F87171" : "#EF4444"}
          >
            {users.length === 0 ? (
              <p
                style={{
                  color: textSecondary,
                  fontSize: 13,
                  margin: 0,
                  textAlign: "center",
                  padding: "16px 0",
                }}
              >
                Aucun utilisateur
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {users.map((u) => {
                  const isSelf = u._id === userId;
                  return (
                    <div
                      key={u._id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: isMobile ? "stretch" : "center",
                        gap: 8,
                        padding: "10px 12px",
                        border: `1px solid ${cardBorder}`,
                        borderRadius: 10,
                        background: isSelf
                          ? dark
                            ? "#0F172A"
                            : "#F8FAFC"
                          : "transparent",
                        flexDirection: isMobile ? "column" : "row",
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: 13.5,
                            color: textPrimary,
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          {u.nom}
                          {isSelf && (
                            <span
                              style={{
                                background: accentBg,
                                color: accent,
                                padding: "1px 6px",
                                borderRadius: 8,
                                fontSize: 9.5,
                                fontWeight: 700,
                              }}
                            >
                              VOUS
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: 11.5,
                            color: textSecondary,
                            textTransform: "capitalize",
                          }}
                        >
                          Rôle actuel : {u.role}
                        </div>
                      </div>
                      <select
                        value={u.role}
                        onChange={(e) =>
                          handleRoleChange(u._id, e.target.value)
                        }
                        disabled={isSelf}
                        style={{
                          ...inputStyle,
                          width: isMobile ? "100%" : 160,
                          cursor: isSelf ? "not-allowed" : "pointer",
                          opacity: isSelf ? 0.5 : 1,
                        }}
                      >
                        {roles.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {/* ════════════════════ ANNÉES ════════════════════ */}
      {tab === "annees" && (
        <div role="tabpanel">
          <GestionAnnees ecoleId={ecoleId} userId={userId} />
        </div>
      )}

      <ConfirmDialog {...dialogProps} />
    </div>
  );
}