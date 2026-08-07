import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useStyles } from "../components/ThemeProvider";
import {
  User,
  Building,
  Shield,
  Save,
  Upload,
  Eye,
  EyeOff,
  Calendar,
} from "lucide-react";
import toast from "react-hot-toast";
import { Skeleton } from "./Skeleton";
import { hashPassword, verifyPassword } from "../utils/crypto";
import { GestionAnnees } from "./GestionAnnees";

export function Parametres({ ecoleId, user }) {
  const { S, dark } = useStyles();
  const [tab, setTab] = useState("profil");

  const ecole = useQuery(api.ecoles.get, ecoleId ? { ecoleId } : "skip");
  const users = useQuery(api.users.listByEcole, ecoleId ? { ecoleId } : "skip");

  const changePassword = useMutation(api.users.changePassword);
  const updateEcole = useMutation(api.ecoles.update);
  const updateLogo = useMutation(api.ecoles.updateLogo);
  const updateRole = useMutation(api.users.updateRole);
  const updateDevise = useMutation(api.ecoles.updateDevise);
  const updateTypePeriode = useMutation(api.ecoles.updateTypePeriode);
  const updateBareme = useMutation(api.ecoles.updateBareme); // ← nouvelle mutation

  // ---- Profil ----
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);

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

    try {
      const hashedNew = await hashPassword(newPwd);
      await changePassword({ userId: user._id, newPassword: hashedNew });
      toast.success("Mot de passe modifié avec succès");
      setOldPwd("");
      setNewPwd("");
      setConfirmPwd("");
    } catch (err) {
      toast.error(err.message || "Erreur lors du changement de mot de passe");
    }
  };

  // ---- École ----
  const [nomEcole, setNomEcole] = useState(ecole?.nom || "");
  const [logoUrl, setLogoUrl] = useState(ecole?.logo || "");
  const [devise, setDevise] = useState(ecole?.devise || "CDF");
  const [typePeriode, setTypePeriode] = useState(ecole?.typePeriode || "trimestre");
  const [bareme, setBareme] = useState(ecole?.bareme ?? 20); // ← nouvel état

  const handleUpdateEcole = async () => {
    if (!nomEcole.trim()) {
      toast.error("Le nom de l'école est requis");
      return;
    }
    try {
      await updateEcole({ ecoleId, nom: nomEcole });
      toast.success("École mise à jour");
    } catch (err) {
      toast.error("Erreur : " + err.message);
    }
  };

  const handleUpdateLogo = async () => {
    try {
      await updateLogo({ ecoleId, logoUrl });
      toast.success("Logo mis à jour");
    } catch (err) {
      toast.error("Erreur : " + err.message);
    }
  };

  const handleUpdateDevise = async () => {
    try {
      await updateDevise({ ecoleId, devise });
      toast.success("Devise mise à jour");
    } catch (err) {
      toast.error("Erreur : " + err.message);
    }
  };

  const handleUpdateTypePeriode = async () => {
    try {
      await updateTypePeriode({ ecoleId, typePeriode });
      toast.success("Périodicité mise à jour");
    } catch (err) {
      toast.error("Erreur : " + err.message);
    }
  };

  const handleUpdateBareme = async () => {
    try {
      await updateBareme({ ecoleId, bareme: Number(bareme) });
      toast.success("Barème mis à jour");
    } catch (err) {
      toast.error("Erreur : " + err.message);
    }
  };

  // ---- Rôles ----
  const handleRoleChange = async (userId, newRole) => {
    try {
      await updateRole({ userId, newRole });
      toast.success("Rôle modifié");
    } catch (err) {
      toast.error("Erreur : " + err.message);
    }
  };

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

  const tabStyle = (isActive) => ({
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 16px",
    border: "none",
    borderRadius: 8,
    background: isActive ? "#4f46e5" : "transparent",
    color: isActive ? "#fff" : S.text,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s",
  });

  const tabs = [
    { id: "profil", label: "Profil", icon: <User size={18} /> },
    { id: "ecole", label: "École", icon: <Building size={18} /> },
    { id: "roles", label: "Rôles", icon: <Shield size={18} /> },
    { id: "annees", label: "Année scolaire", icon: <Calendar size={18} /> },
  ];

  return (
    <div>
      <h2 style={S.h2}>Paramètres</h2>

      <div
        style={{ display: "flex", gap: 16, marginBottom: 24 }}
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
          <div style={S.card}>
            <h3 style={S.h3}>Modifier mon mot de passe</h3>
            <div style={{ marginBottom: 12 }}>
              <label htmlFor="old-password" style={S.muted}>
                Ancien mot de passe
              </label>
              <div style={{ display: "flex", alignItems: "center" }}>
                <input
                  id="old-password"
                  type={showOld ? "text" : "password"}
                  value={oldPwd}
                  onChange={(e) => setOldPwd(e.target.value)}
                  style={{ ...S.input, flex: 1, marginBottom: 0 }}
                  aria-label="Ancien mot de passe"
                />
                <button
                  onClick={() => setShowOld(!showOld)}
                  style={{ background: "none", border: "none", cursor: "pointer", marginLeft: 8 }}
                  aria-label={showOld ? "Cacher le mot de passe" : "Afficher le mot de passe"}
                >
                  {showOld ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label htmlFor="new-password" style={S.muted}>
                Nouveau mot de passe
              </label>
              <div style={{ display: "flex", alignItems: "center" }}>
                <input
                  id="new-password"
                  type={showNew ? "text" : "password"}
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  style={{ ...S.input, flex: 1, marginBottom: 0 }}
                  aria-label="Nouveau mot de passe"
                />
                <button
                  onClick={() => setShowNew(!showNew)}
                  style={{ background: "none", border: "none", cursor: "pointer", marginLeft: 8 }}
                  aria-label={showNew ? "Cacher le mot de passe" : "Afficher le mot de passe"}
                >
                  {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label htmlFor="confirm-password" style={S.muted}>
                Confirmer le nouveau mot de passe
              </label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                style={S.input}
                aria-label="Confirmation du nouveau mot de passe"
              />
            </div>
            <button
              onClick={handleChangePassword}
              style={{ ...S.btnSm("#4f46e5"), display: "flex", alignItems: "center", gap: 8 }}
              aria-label="Enregistrer le nouveau mot de passe"
            >
              <Save size={16} /> Enregistrer
            </button>
          </div>
        </div>
      )}

      {tab === "ecole" && (
        <div role="tabpanel" id="panel-ecole" aria-labelledby="tab-ecole">
          <div style={S.card}>
            <h3 style={S.h3}>Informations de l'école</h3>
            <div style={{ marginBottom: 16 }}>
              <label htmlFor="ecole-nom" style={S.muted}>Nom de l'école</label>
              <input
                id="ecole-nom"
                value={nomEcole}
                onChange={(e) => setNomEcole(e.target.value)}
                style={S.input}
                aria-label="Nom de l'école"
              />
              <button
                onClick={handleUpdateEcole}
                style={{ ...S.btnSm("#4f46e5"), marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}
                aria-label="Mettre à jour le nom de l'école"
              >
                <Save size={16} /> Mettre à jour
              </button>
            </div>
            <div>
              <label htmlFor="ecole-logo" style={S.muted}>Logo (URL)</label>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  id="ecole-logo"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  style={{ ...S.input, flex: 1, marginBottom: 0 }}
                  aria-label="URL du logo"
                />
                <button
                  onClick={handleUpdateLogo}
                  style={{ ...S.btnSm("#10b981"), display: "flex", alignItems: "center", gap: 8 }}
                  aria-label="Mettre à jour le logo"
                >
                  <Upload size={16} /> Mettre à jour
                </button>
              </div>
              {logoUrl && (
                <img
                  src={logoUrl}
                  alt="Logo de l'école"
                  style={{ maxWidth: 100, marginTop: 12, borderRadius: 8 }}
                  onError={(e) => (e.target.style.display = "none")}
                />
              )}
            </div>

            {/* Devise */}
            <div style={{ marginTop: 24 }}>
              <label htmlFor="ecole-devise" style={S.muted}>Devise utilisée</label>
              <select
                id="ecole-devise"
                value={devise}
                onChange={(e) => setDevise(e.target.value)}
                style={S.select}
              >
                <option value="CDF">Franc congolais (CDF)</option>
                <option value="USD">Dollar américain (USD)</option>
              </select>
              <button
                onClick={handleUpdateDevise}
                style={{ ...S.btnSm("#4f46e5"), marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}
              >
                <Save size={16} /> Enregistrer la devise
              </button>
            </div>

            {/* Périodicité */}
            <div style={{ marginTop: 24 }}>
              <label htmlFor="ecole-periode" style={S.muted}>Périodicité des bulletins</label>
              <select
                id="ecole-periode"
                value={typePeriode}
                onChange={(e) => setTypePeriode(e.target.value)}
                style={S.select}
              >
                <option value="trimestre">Trimestres</option>
                <option value="semestre">Semestres</option>
              </select>
              <button
                onClick={handleUpdateTypePeriode}
                style={{ ...S.btnSm("#4f46e5"), marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}
              >
                <Save size={16} /> Enregistrer la périodicité
              </button>
            </div>

            {/* Barème */}
            <div style={{ marginTop: 24 }}>
              <label htmlFor="ecole-bareme" style={S.muted}>Note maximale (barème)</label>
              <input
                id="ecole-bareme"
                type="number"
                min="1"
                step="1"
                value={bareme}
                onChange={(e) => setBareme(e.target.value)}
                style={S.input}
              />
              <button
                onClick={handleUpdateBareme}
                style={{ ...S.btnSm("#4f46e5"), marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}
              >
                <Save size={16} /> Enregistrer le barème
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === "roles" && (
        <div role="tabpanel" id="panel-roles" aria-labelledby="tab-roles">
          <div style={S.card}>
            <h3 style={S.h3}>Gestion des rôles</h3>
            {users?.length === 0 && <p>Aucun utilisateur.</p>}
            {users?.map((u) => (
              <div
                key={u._id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 0",
                  borderBottom: `1px solid ${S.cardBorder}`,
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{u.nom}</div>
                  <div style={{ fontSize: 13, color: S.textMuted }}>Actuel : {u.role}</div>
                </div>
                <label htmlFor={`role-select-${u._id}`} className="sr-only" style={{ display: "none" }}>
                  Rôle de {u.nom}
                </label>
                <select
                  id={`role-select-${u._id}`}
                  value={u.role}
                  onChange={(e) => handleRoleChange(u._id, e.target.value)}
                  style={{ ...S.input, width: 150, marginBottom: 0 }}
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
    </div>
  );
}