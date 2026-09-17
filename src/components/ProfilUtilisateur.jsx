import { useState, useEffect, useMemo, useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStyles } from "@/styles/theme";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useConfirm } from "@/hooks/useConfirm";
import { ConfirmDialog } from "./ConfirmDialog";
import {
  User, Save, Eye, EyeOff, Loader, GraduationCap, Mail,
  Shield, Check, AlertCircle, Key, Phone, MapPin, Users, Lock,
} from "lucide-react";
import toast from "react-hot-toast";
import { provincesRDC } from "@/utils/rdcData";

// ============================================================
// BADGE DE RÔLE
// ============================================================
function RoleBadge({ role, dark }) {
  const colors = {
    admin: { bg: dark ? "#7F1D1D" : "#FEE2E2", color: dark ? "#F87171" : "#B91C1C" },
    superAdmin: { bg: dark ? "#7F1D1D" : "#FEE2E2", color: dark ? "#F87171" : "#B91C1C" },
    directeur: { bg: dark ? "#064E3B" : "#D1FAE5", color: dark ? "#34D399" : "#065F46" },
    disciplinaire: { bg: dark ? "#78350F" : "#FEF3C7", color: dark ? "#FBBF24" : "#92400E" },
    enseignant: { bg: dark ? "#312E81" : "#EEF2FF", color: dark ? "#A5B4FC" : "#4F46E5" },
    parent: { bg: dark ? "#082F49" : "#E0F2FE", color: dark ? "#38BDF8" : "#0369A1" },
    comptable: { bg: dark ? "#500724" : "#FCE7F3", color: dark ? "#F472B6" : "#BE185D" },
    eleve: { bg: dark ? "#2E1065" : "#F3E8FF", color: dark ? "#C084FC" : "#6B21A8" },
  };
  const style = colors[role] || {
    bg: dark ? "#334155" : "#F1F5F9",
    color: dark ? "#CBD5E1" : "#475569",
  };
  return (
    <span
      style={{
        background: style.bg,
        color: style.color,
        padding: "3px 10px",
        borderRadius: 10,
        fontSize: 10.5,
        fontWeight: 700,
        textTransform: "capitalize",
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
      }}
    >
      <Shield size={10} />
      {role}
    </span>
  );
}

// ============================================================
// INDICATEUR DE FORCE DU MOT DE PASSE
// ============================================================
// ✅ Aligné sur 8 caractères (backend + Parametres.jsx + UtilisateursModals.jsx)
const MIN_PASSWORD_LENGTH = 8;

function getPasswordStrength(pwd) {
  if (!pwd) return { level: 0, label: "", color: "" };
  let score = 0;
  if (pwd.length >= MIN_PASSWORD_LENGTH) score++;
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

// ============================================================
// KEYFRAMES PARTAGÉS (module-level, préfixés pu-*)
// ============================================================
const puStyles = `
  @keyframes pu-spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes pu-haloPulse {
    0%   { transform: translate(-50%, -50%) scale(1);    opacity: 0.55; }
    50%  { transform: translate(-50%, -50%) scale(1.18); opacity: 0.22; }
    100% { transform: translate(-50%, -50%) scale(1);    opacity: 0.55; }
  }
  .pu-spin { animation: pu-spin 1s linear infinite; }
  .pu-halo { animation: pu-haloPulse 2.4s ease-in-out infinite; }
  @media (prefers-reduced-motion: reduce) {
    .pu-spin, .pu-halo { animation: none !important; }
  }
`;

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================
export function ProfilUtilisateur({ user }) {
  const { dark } = useStyles();
  const isMobile = useIsMobile();
  const { confirm, dialogProps } = useConfirm();

  const userId = user?._id;

  // Mot de passe
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [changing, setChanging] = useState(false);

  // Profil élève
  const [sexe, setSexe] = useState("M");
  const [dateNaissance, setDateNaissance] = useState("");
  const [lieuNaissance, setLieuNaissance] = useState("");
  const [province, setProvince] = useState("");
  const [territoire, setTerritoire] = useState("");
  const [secteur, setSecteur] = useState("");
  const [village, setVillage] = useState("");
  const [adresse, setAdresse] = useState("");
  const [telephone, setTelephone] = useState("");
  const [nomPere, setNomPere] = useState("");
  const [nomMere, setNomMere] = useState("");
  const [tuteurNom, setTuteurNom] = useState("");
  const [tuteurTelephone, setTuteurTelephone] = useState("");
  const [savingInfo, setSavingInfo] = useState(false);

  // ===== Mutations =====
  const changePassword = useMutation(api.users.changePassword);
  const updateProfile = useMutation(api.users.updateProfile);

  // ===== Élève associé =====
  const isEleve = user?.role === "eleve";
  // ⚠️ Vérifier signature backend : EleveApp utilise { userId, anneeId }
  //    Ici on utilise { userId, requesterId }. Incohérence à confirmer.
  const eleve = useQuery(
    api.eleves.getByUserId,
    isEleve && userId ? { userId, requesterId: userId } : "skip"
  );

  // ===== Synchronisation avec les données serveur =====
  useEffect(() => {
    if (!eleve) return;
    setSexe(eleve.sexe || "M");
    setDateNaissance(eleve.dateNaissance || "");
    setLieuNaissance(eleve.lieuNaissance || "");
    setProvince(eleve.province || "");
    setTerritoire(eleve.territoire || "");
    setSecteur(eleve.secteur || "");
    setVillage(eleve.village || "");
    setAdresse(eleve.adresse || "");
    setTelephone(eleve.telephone || "");
    setNomPere(eleve.nomPere || "");
    setNomMere(eleve.nomMere || "");
    setTuteurNom(eleve.tuteurNom || "");
    setTuteurTelephone(eleve.tuteurTelephone || "");
  }, [eleve]);

  // ============================================================
  // CHANGEMENT DE MOT DE PASSE
  // ============================================================
  const handleChangePassword = useCallback(async () => {
    if (changing) return;

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
    if (!userId) {
      toast.error("Session utilisateur invalide.");
      return;
    }

    const ok = await confirm(
      "Changer le mot de passe",
      "Voulez-vous vraiment modifier votre mot de passe ?"
    );
    if (!ok) return;

    setChanging(true);
    try {
      // ✅ CORRIGÉ : `requesterId` retiré (backend refuse — cf. rapport §13.4)
      await changePassword({
        userId,
        currentPassword: oldPwd,
        newPassword: newPwd,
      });
      toast.success("Mot de passe modifié avec succès");
      setOldPwd("");
      setNewPwd("");
      setConfirmPwd("");
      setShowOld(false);
      setShowNew(false);
      setShowConfirm(false);
    } catch (err) {
      const msg =
        (err && typeof err === "object" && err.message) ||
        (typeof err === "string" ? err : "") ||
        "Erreur lors du changement de mot de passe";
      toast.error(msg);
    } finally {
      setChanging(false);
    }
  }, [changing, oldPwd, newPwd, confirmPwd, userId, confirm, changePassword]);

  // ============================================================
  // SAUVEGARDE DU PROFIL ÉLÈVE
  // ============================================================
  const handleSaveInfo = useCallback(async () => {
    if (savingInfo) return;
    if (!userId) {
      toast.error("Session utilisateur invalide.");
      return;
    }

    const ok = await confirm(
      "Enregistrer les modifications",
      "Mettre à jour vos informations personnelles ?"
    );
    if (!ok) return;

    setSavingInfo(true);
    try {
      // ⚠️ Vérifier si updateProfile exige `requesterId` (non documenté dans le rapport)
      await updateProfile({
        userId,
        requesterId: userId,
        sexe,
        dateNaissance,
        lieuNaissance,
        province,
        territoire,
        secteur,
        village,
        adresse,
        telephone,
        nomPere,
        nomMere,
        tuteurNom,
        tuteurTelephone,
      });
      toast.success("Informations mises à jour");
    } catch (err) {
      const msg =
        (err && typeof err === "object" && err.message) ||
        (typeof err === "string" ? err : "") ||
        "Erreur lors de la mise à jour";
      toast.error(msg);
    } finally {
      setSavingInfo(false);
    }
  }, [
    savingInfo,
    userId,
    confirm,
    updateProfile,
    sexe,
    dateNaissance,
    lieuNaissance,
    province,
    territoire,
    secteur,
    village,
    adresse,
    telephone,
    nomPere,
    nomMere,
    tuteurNom,
    tuteurTelephone,
  ]);

  // ===== Helpers =====
  const territoiresDisponibles = useMemo(
    () =>
      province
        ? provincesRDC.find((p) => p.nom === province)?.territoires || []
        : [],
    [province]
  );

  // ===== Couleurs =====
  const textPrimary = dark ? "#F1F5F9" : "#1E293B";
  const textSecondary = dark ? "#94A3B8" : "#64748B";
  const cardBg = dark ? "#1E293B" : "#FFFFFF";
  const cardBorder = dark ? "#334155" : "#E2E8F0";
  const accent = dark ? "#818CF8" : "#4F46E5";
  const accentBg = dark ? "#312E81" : "#EEF2FF";
  const inputBg = dark ? "#0F172A" : "#F8FAFC";
  const inputText = dark ? "#F1F5F9" : "#1E293B";
  const shadow = dark
    ? "0 1px 3px rgba(0,0,0,0.3)"
    : "0 1px 3px rgba(0,0,0,0.05)";

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

  const gridColumns = isMobile
    ? "1fr"
    : "repeat(auto-fit, minmax(200px, 1fr))";

  const btnStyle = (disabled = false, variant = "primary") => {
    const base = {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      padding: isMobile ? "12px 16px" : "10px 20px",
      borderRadius: 12,
      fontWeight: 700,
      fontSize: 13.5,
      cursor: disabled ? "not-allowed" : "pointer",
      width: isMobile ? "100%" : "auto",
      border: "none",
      transition: "opacity 0.15s",
      opacity: disabled ? 0.6 : 1,
    };
    if (variant === "primary") {
      return {
        ...base,
        background: disabled ? "#A5B4FC" : accent,
        color: "#FFFFFF",
      };
    }
    return {
      ...base,
      background: "transparent",
      border: `1px solid ${cardBorder}`,
      color: textPrimary,
    };
  };

  // ===== Garde : user non chargé =====
  if (!user || !userId) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          padding: 40,
        }}
      >
        <style>{puStyles}</style>
        <Loader size={28} className="pu-spin" style={{ color: accent }} />
      </div>
    );
  }

  const initials = `${user.nom?.[0] || ""}${user.postnom?.[0] || ""}`.toUpperCase();
  const canChangePwd =
    !changing &&
    oldPwd &&
    newPwd &&
    newPwd === confirmPwd &&
    newPwd.length >= MIN_PASSWORD_LENGTH;

  return (
    <div
      style={{
        maxWidth: 800,
        margin: "0 auto",
        padding: isMobile ? "10px 8px 24px" : "20px 16px 32px",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* Keyframes partagés */}
      <style>{puStyles}</style>

      {/* ==================== EN-TÊTE ==================== */}
      <div style={{ marginBottom: isMobile ? 14 : 20 }}>
        <h2
          style={{
            fontSize: isMobile ? 17 : 22,
            fontWeight: 700,
            color: textPrimary,
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          Mon profil
        </h2>
        <p
          style={{
            color: textSecondary,
            marginTop: 2,
            marginBottom: 0,
            fontSize: isMobile ? 11.5 : 13,
          }}
        >
          Gérez vos informations personnelles et votre mot de passe
        </p>
      </div>

      {/* ==================== CARTE IDENTITÉ — DESIGN HERO ==================== */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          gap: 14,
          padding: isMobile ? "24px 16px 20px" : "28px 24px 24px",
          background: dark
            ? "linear-gradient(135deg, #312E81 0%, #1E293B 100%)"
            : "linear-gradient(135deg, #EEF2FF 0%, #FFFFFF 100%)",
          borderRadius: 16,
          border: `1px solid ${cardBorder}`,
          marginBottom: isMobile ? 14 : 20,
          boxShadow: shadow,
        }}
      >
        {/* Avatar 96px avec halo pulse */}
        <div
          style={{
            position: "relative",
            width: isMobile ? 80 : 96,
            height: isMobile ? 80 : 96,
            flexShrink: 0,
          }}
        >
          {/* Halo pulse */}
          <div
            className="pu-halo"
            aria-hidden="true"
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              background: accent,
              opacity: 0.15,
              pointerEvents: "none",
            }}
          />
          {/* Avatar */}
          <div
            style={{
              position: "relative",
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              background: accent,
              color: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: isMobile ? 26 : 32,
              letterSpacing: 0.5,
              boxShadow: `0 8px 24px ${accent}55`,
              border: `3px solid ${dark ? "#1E293B" : "#FFFFFF"}`,
            }}
          >
            {initials || <User size={isMobile ? 32 : 40} />}
          </div>
        </div>

        {/* Nom + login + badge */}
        <div style={{ minWidth: 0, width: "100%" }}>
          <div
            style={{
              fontWeight: 800,
              fontSize: isMobile ? 17 : 20,
              color: textPrimary,
              lineHeight: 1.2,
              marginBottom: 6,
              wordBreak: "break-word",
            }}
          >
            {user.nom} {user.postnom || ""}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: isMobile ? 12 : 13,
                color: textSecondary,
                fontFamily: "ui-monospace, monospace",
              }}
            >
              @{user.login}
            </span>
            <RoleBadge role={user.role} dark={dark} />
          </div>
          {user.email && (
            <div
              style={{
                fontSize: 12,
                color: textSecondary,
                marginTop: 8,
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <Mail size={12} />
              {user.email}
            </div>
          )}
        </div>
      </div>

      {/* ==================== FORMULAIRE ÉLÈVE ==================== */}
      {isEleve && (
        <div
          style={{
            background: cardBg,
            borderRadius: 14,
            padding: isMobile ? 14 : 18,
            marginBottom: isMobile ? 14 : 20,
            border: `1px solid ${cardBorder}`,
            boxShadow: shadow,
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
                background: accentBg,
                color: accent,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <GraduationCap size={16} />
            </div>
            <div>
              <div
                style={{
                  fontSize: isMobile ? 14 : 15,
                  fontWeight: 700,
                  color: textPrimary,
                }}
              >
                Informations personnelles
              </div>
              <div style={{ fontSize: 11, color: textSecondary, marginTop: 1 }}>
                Ces informations apparaissent sur votre fiche scolaire
              </div>
            </div>
          </div>

          {/* Section 1 : Identité */}
          <div
            style={{
              fontSize: 10.5,
              fontWeight: 700,
              color: textSecondary,
              textTransform: "uppercase",
              letterSpacing: 0.3,
              marginBottom: 8,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <User size={11} />
            Identité
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: gridColumns,
              gap: 12,
              marginBottom: 18,
            }}
          >
            <div>
              <label style={labelStyle}>Sexe</label>
              <select
                value={sexe}
                onChange={(e) => setSexe(e.target.value)}
                style={inputStyle}
              >
                <option value="M">Masculin</option>
                <option value="F">Féminin</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Date de naissance</label>
              <input
                type="date"
                value={dateNaissance}
                onChange={(e) => setDateNaissance(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Lieu de naissance</label>
              <input
                value={lieuNaissance}
                onChange={(e) => setLieuNaissance(e.target.value)}
                placeholder="Ville"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Section 2 : Origine */}
          <div
            style={{
              fontSize: 10.5,
              fontWeight: 700,
              color: textSecondary,
              textTransform: "uppercase",
              letterSpacing: 0.3,
              marginBottom: 8,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <MapPin size={11} />
            Origine géographique
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: gridColumns,
              gap: 12,
              marginBottom: 18,
            }}
          >
            <div>
              <label style={labelStyle}>Province</label>
              <select
                value={province}
                onChange={(e) => {
                  setProvince(e.target.value);
                  setTerritoire("");
                }}
                style={inputStyle}
              >
                <option value="">Sélectionner</option>
                {provincesRDC.map((p) => (
                  <option key={p.nom} value={p.nom}>
                    {p.nom}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Territoire</label>
              <select
                value={territoire}
                onChange={(e) => setTerritoire(e.target.value)}
                style={{ ...inputStyle, opacity: !province ? 0.5 : 1 }}
                disabled={!province}
              >
                <option value="">Sélectionner</option>
                {territoiresDisponibles.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Secteur</label>
              <input
                value={secteur}
                onChange={(e) => setSecteur(e.target.value)}
                placeholder="Secteur"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Village</label>
              <input
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                placeholder="Village"
                style={inputStyle}
              />
            </div>
            <div style={{ gridColumn: isMobile ? "auto" : "1 / -1" }}>
              <label style={labelStyle}>Adresse actuelle</label>
              <input
                value={adresse}
                onChange={(e) => setAdresse(e.target.value)}
                placeholder="Adresse complète"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Section 3 : Parents / Tuteur */}
          <div
            style={{
              fontSize: 10.5,
              fontWeight: 700,
              color: textSecondary,
              textTransform: "uppercase",
              letterSpacing: 0.3,
              marginBottom: 8,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Users size={11} />
            Parents / Tuteur
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: gridColumns,
              gap: 12,
              marginBottom: 18,
            }}
          >
            <div>
              <label style={labelStyle}>Nom du père</label>
              <input
                value={nomPere}
                onChange={(e) => setNomPere(e.target.value)}
                placeholder="Nom du père"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Nom de la mère</label>
              <input
                value={nomMere}
                onChange={(e) => setNomMere(e.target.value)}
                placeholder="Nom de la mère"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Nom du tuteur</label>
              <input
                value={tuteurNom}
                onChange={(e) => setTuteurNom(e.target.value)}
                placeholder="Nom du tuteur"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Téléphone tuteur</label>
              <input
                value={tuteurTelephone}
                onChange={(e) => setTuteurTelephone(e.target.value)}
                placeholder="+243 …"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Section 4 : Contact */}
          <div
            style={{
              fontSize: 10.5,
              fontWeight: 700,
              color: textSecondary,
              textTransform: "uppercase",
              letterSpacing: 0.3,
              marginBottom: 8,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Phone size={11} />
            Contact
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: gridColumns,
              gap: 12,
              marginBottom: 18,
            }}
          >
            <div>
              <label style={labelStyle}>Votre téléphone</label>
              <input
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                placeholder="+243 …"
                style={inputStyle}
              />
            </div>
          </div>

          <button
            onClick={handleSaveInfo}
            disabled={savingInfo}
            style={btnStyle(savingInfo, "primary")}
          >
            {savingInfo ? (
              <Loader size={16} className="pu-spin" />
            ) : (
              <Save size={16} />
            )}
            {savingInfo ? "Enregistrement…" : "Enregistrer les informations"}
          </button>
        </div>
      )}

      {/* ==================== CARTE MOT DE PASSE ==================== */}
      <div
        style={{
          background: cardBg,
          borderRadius: 14,
          padding: isMobile ? 14 : 18,
          border: `1px solid ${cardBorder}`,
          boxShadow: shadow,
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
              background: accentBg,
              color: accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Key size={16} />
          </div>
          <div>
            <div
              style={{
                fontSize: isMobile ? 14 : 15,
                fontWeight: 700,
                color: textPrimary,
              }}
            >
              Mot de passe
            </div>
            <div style={{ fontSize: 11, color: textSecondary, marginTop: 1 }}>
              Modifiez votre mot de passe de connexion
            </div>
          </div>
        </div>

        {/* Ancien mot de passe */}
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
              aria-label={showOld ? "Masquer" : "Afficher"}
            >
              {showOld ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {/* Nouveau mot de passe */}
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
              aria-label={showNew ? "Masquer" : "Afficher"}
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
                marginTop: -6,
                marginBottom: 8,
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

        {/* Confirmation */}
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
              aria-label={showConfirm ? "Masquer" : "Afficher"}
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
          onClick={handleChangePassword}
          disabled={!canChangePwd}
          style={btnStyle(!canChangePwd, "primary")}
        >
          {changing ? (
            <Loader size={16} className="pu-spin" />
          ) : (
            <Lock size={16} />
          )}
          {changing ? "Enregistrement…" : "Changer le mot de passe"}
        </button>
      </div>

      <ConfirmDialog {...dialogProps} />
    </div>
  );
}