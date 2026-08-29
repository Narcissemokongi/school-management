import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useStyles } from "../styles/theme";
import { useConfirm } from "../hooks/useConfirm";
import { ConfirmDialog } from "./ConfirmDialog";
import {
  User, Save, Eye, EyeOff, Loader, GraduationCap,
} from "lucide-react";
import toast from "react-hot-toast";
import { hashPassword } from "../utils/crypto";
import { provincesRDC } from "../utils/rdcData";

export function ProfilUtilisateur({ user }) {
  const { dark } = useStyles();
  const { confirm, dialogProps } = useConfirm();

  // États pour le changement de mot de passe
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [changing, setChanging] = useState(false);

  // États pour le profil élève
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

  const changePassword = useMutation(api.users.changePassword);
  const updateProfile = useMutation(api.users.updateProfile);

  // Récupérer l'élève associé si l'utilisateur est un élève
  const eleve = useQuery(
    api.eleves.getByUserId,
    user.role === "eleve" ? { userId: user._id } : "skip"
  );

  // Synchroniser les champs depuis l'élève
  useEffect(() => {
    if (eleve) {
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
    }
  }, [eleve]);

  const handleChangePassword = async () => {
    if (newPwd !== confirmPwd) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    if (newPwd.length < 4) {
      toast.error("Le mot de passe doit contenir au moins 4 caractères");
      return;
    }

    const ok = await confirm(
      "Changer le mot de passe",
      "Voulez-vous vraiment modifier votre mot de passe ?"
    );
    if (!ok) return;

    setChanging(true);
    try {
      const hashedNew = await hashPassword(newPwd);
      await changePassword({
        userId: user._id,
        currentPassword: oldPwd, // En clair, le backend comparera avec le hash stocké
        newPassword: hashedNew,
      });
      toast.success("Mot de passe modifié avec succès");
      setOldPwd("");
      setNewPwd("");
      setConfirmPwd("");
    } catch (err) {
      toast.error(err.message || "Erreur lors du changement de mot de passe");
    } finally {
      setChanging(false);
    }
  };

  const handleSaveInfo = async () => {
    const ok = await confirm(
      "Enregistrer les modifications",
      "Mettre à jour vos informations personnelles ?"
    );
    if (!ok) return;

    setSavingInfo(true);
    try {
      await updateProfile({
        userId: user._id,
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
      toast.error(err.message);
    } finally {
      setSavingInfo(false);
    }
  };

  // Styles
  const inputStyle = {
    width: "100%",
    padding: "10px 14px",
    border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
    borderRadius: 8,
    fontSize: 14,
    outline: "none",
    background: dark ? "#0F172A" : "#F9FAFB",
    color: dark ? "#F1F5F9" : "#1E293B",
    marginBottom: 12,
    boxSizing: "border-box",
  };

  const labelStyle = {
    display: "block",
    marginBottom: 4,
    fontWeight: 500,
    fontSize: 14,
    color: dark ? "#CBD5E1" : "#374151",
  };

  const passwordFieldContainer = {
    display: "flex",
    alignItems: "center",
    position: "relative",
    marginBottom: 12,
  };

  const passwordInputStyle = {
    ...inputStyle,
    marginBottom: 0,
    paddingRight: 42,
  };

  const eyeButtonStyle = {
    position: "absolute",
    right: 12,
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    color: dark ? "#94A3B8" : "#9CA3AF",
    cursor: "pointer",
    padding: 0,
  };

  const territoiresDisponibles = province
    ? provincesRDC.find((p) => p.nom === province)?.territoires || []
    : [];

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "24px 16px" }}>
      <h2 style={{ fontSize: 28, fontWeight: 700, color: dark ? "#F1F5F9" : "#1E293B", margin: 0 }}>
        Mon profil
      </h2>

      {/* Carte d'informations de base */}
      <div style={{
        background: dark ? "#1E293B" : "#FFFFFF",
        borderRadius: 16,
        padding: 24,
        marginTop: 24,
        marginBottom: 24,
        boxShadow: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)",
        border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: dark ? "#312E81" : "#EEF2FF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: dark ? "#A5B4FC" : "#4F46E5",
          }}>
            <User size={28} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, color: dark ? "#F1F5F9" : "#1E293B" }}>
              {user.nom} {user.postnom || ""}
            </div>
            <div style={{ fontSize: 14, color: dark ? "#94A3B8" : "#64748B" }}>
              @{user.login} · Rôle : {user.role}
            </div>
          </div>
        </div>
      </div>

      {/* Formulaire d'informations personnelles - uniquement pour les élèves */}
      {user.role === "eleve" && (
        <div style={{
          background: dark ? "#1E293B" : "#FFFFFF",
          borderRadius: 16,
          padding: 24,
          marginBottom: 24,
          boxShadow: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)",
          border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
        }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: dark ? "#F1F5F9" : "#1E293B", marginBottom: 16 }}>
            <GraduationCap size={18} style={{ verticalAlign: "middle", marginRight: 6 }} />
            Informations personnelles
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
            <div>
              <label style={labelStyle}>Sexe</label>
              <select value={sexe} onChange={(e) => setSexe(e.target.value)} style={inputStyle}>
                <option value="M">Masculin</option>
                <option value="F">Féminin</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Date de naissance</label>
              <input type="date" value={dateNaissance} onChange={(e) => setDateNaissance(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Lieu de naissance</label>
              <input value={lieuNaissance} onChange={(e) => setLieuNaissance(e.target.value)} style={inputStyle} placeholder="Ville" />
            </div>
            <div>
              <label style={labelStyle}>Province</label>
              <select value={province} onChange={(e) => { setProvince(e.target.value); setTerritoire(""); }} style={inputStyle}>
                <option value="">Sélectionner</option>
                {provincesRDC.map((p) => (
                  <option key={p.nom} value={p.nom} style={{ background: dark ? "#1E293B" : "#FFF" }}>{p.nom}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Territoire</label>
              <select value={territoire} onChange={(e) => setTerritoire(e.target.value)} style={inputStyle} disabled={!province}>
                <option value="">Sélectionner</option>
                {territoiresDisponibles.map((t) => (
                  <option key={t} value={t} style={{ background: dark ? "#1E293B" : "#FFF" }}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Secteur</label>
              <input value={secteur} onChange={(e) => setSecteur(e.target.value)} style={inputStyle} placeholder="Secteur" />
            </div>
            <div>
              <label style={labelStyle}>Village</label>
              <input value={village} onChange={(e) => setVillage(e.target.value)} style={inputStyle} placeholder="Village" />
            </div>
            <div>
              <label style={labelStyle}>Adresse</label>
              <input value={adresse} onChange={(e) => setAdresse(e.target.value)} style={inputStyle} placeholder="Adresse" />
            </div>
            <div>
              <label style={labelStyle}>Téléphone</label>
              <input value={telephone} onChange={(e) => setTelephone(e.target.value)} style={inputStyle} placeholder="Téléphone" />
            </div>
            <div>
              <label style={labelStyle}>Nom du père</label>
              <input value={nomPere} onChange={(e) => setNomPere(e.target.value)} style={inputStyle} placeholder="Père" />
            </div>
            <div>
              <label style={labelStyle}>Nom de la mère</label>
              <input value={nomMere} onChange={(e) => setNomMere(e.target.value)} style={inputStyle} placeholder="Mère" />
            </div>
            <div>
              <label style={labelStyle}>Tuteur</label>
              <input value={tuteurNom} onChange={(e) => setTuteurNom(e.target.value)} style={inputStyle} placeholder="Nom du tuteur" />
            </div>
            <div>
              <label style={labelStyle}>Téléphone tuteur</label>
              <input value={tuteurTelephone} onChange={(e) => setTuteurTelephone(e.target.value)} style={inputStyle} placeholder="Téléphone tuteur" />
            </div>
          </div>

          <button
            onClick={handleSaveInfo}
            disabled={savingInfo}
            style={{
              marginTop: 16,
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 20px",
              background: savingInfo ? "#A5B4FC" : dark ? "#818CF8" : "#4F46E5",
              color: "white",
              border: "none",
              borderRadius: 8,
              cursor: savingInfo ? "not-allowed" : "pointer",
              fontWeight: 600,
            }}
          >
            {savingInfo ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
            {savingInfo ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      )}

      {/* Changement de mot de passe - pour tous les rôles */}
      <div style={{
        background: dark ? "#1E293B" : "#FFFFFF",
        borderRadius: 16,
        padding: 24,
        boxShadow: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)",
        border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
      }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, color: dark ? "#F1F5F9" : "#1E293B", marginBottom: 16 }}>
          Modifier mon mot de passe
        </h3>

        {/* Ancien mot de passe */}
        <div>
          <label style={labelStyle}>Ancien mot de passe</label>
          <div style={passwordFieldContainer}>
            <input
              type={showOld ? "text" : "password"}
              value={oldPwd}
              onChange={(e) => setOldPwd(e.target.value)}
              style={passwordInputStyle}
              aria-label="Ancien mot de passe"
            />
            <button
              onClick={() => setShowOld(!showOld)}
              style={eyeButtonStyle}
              aria-label={showOld ? "Cacher le mot de passe" : "Afficher le mot de passe"}
            >
              {showOld ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {/* Nouveau mot de passe */}
        <div>
          <label style={labelStyle}>Nouveau mot de passe</label>
          <div style={passwordFieldContainer}>
            <input
              type={showNew ? "text" : "password"}
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              style={passwordInputStyle}
              aria-label="Nouveau mot de passe"
            />
            <button
              onClick={() => setShowNew(!showNew)}
              style={eyeButtonStyle}
              aria-label={showNew ? "Cacher le mot de passe" : "Afficher le mot de passe"}
            >
              {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {newPwd.length > 0 && newPwd.length < 4 && (
            <div style={{ color: "#EF4444", fontSize: 13, marginTop: -8, marginBottom: 8 }}>
              Au moins 4 caractères
            </div>
          )}
        </div>

        {/* Confirmation */}
        <div>
          <label style={labelStyle}>Confirmer le nouveau mot de passe</label>
          <div style={passwordFieldContainer}>
            <input
              type={showConfirm ? "text" : "password"}
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
              style={passwordInputStyle}
              aria-label="Confirmer le nouveau mot de passe"
            />
            <button
              onClick={() => setShowConfirm(!showConfirm)}
              style={eyeButtonStyle}
              aria-label={showConfirm ? "Cacher le mot de passe" : "Afficher le mot de passe"}
            >
              {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {confirmPwd.length > 0 && newPwd !== confirmPwd && (
            <div style={{ color: "#EF4444", fontSize: 13, marginTop: -8, marginBottom: 8 }}>
              Les mots de passe ne correspondent pas
            </div>
          )}
        </div>

        <button
          onClick={handleChangePassword}
          disabled={changing}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 20px",
            background: changing ? "#A5B4FC" : dark ? "#818CF8" : "#4F46E5",
            color: "white",
            border: "none",
            borderRadius: 8,
            cursor: changing ? "not-allowed" : "pointer",
            fontWeight: 600,
            marginTop: 8,
          }}
        >
          {changing ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
          {changing ? "Enregistrement..." : "Enregistrer"}
        </button>
      </div>

      <ConfirmDialog {...dialogProps} />
    </div>
  );
}