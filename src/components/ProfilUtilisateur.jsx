import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useStyles } from "../components/ThemeProvider";
import { User, Save, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";

export function ProfilUtilisateur({ user }) {
  const { S } = useStyles();
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const changePassword = useMutation(api.users.changePassword);

  const handleChangePassword = async () => {
    if (newPwd !== confirmPwd) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    if (newPwd.length < 4) {
      toast.error("Le mot de passe doit contenir au moins 4 caractères");
      return;
    }
    try {
      await changePassword({
        userId: user._id,
        oldPassword: oldPwd,
        newPassword: newPwd,
      });
      toast.success("Mot de passe modifié avec succès");
      setOldPwd("");
      setNewPwd("");
      setConfirmPwd("");
    } catch (err) {
      toast.error(err.message || "Erreur lors du changement de mot de passe");
    }
  };

  return (
    <div>
      <h2 style={S.h2}>Mon profil</h2>
      <div style={S.card}>
        <h3 style={S.h3}>Modifier mon mot de passe</h3>
        <div style={{ marginBottom: 12 }}>
          <label style={S.muted}>Ancien mot de passe</label>
          <div style={{ display: "flex", alignItems: "center" }}>
            <input
              type={showOld ? "text" : "password"}
              value={oldPwd}
              onChange={(e) => setOldPwd(e.target.value)}
              style={{ ...S.input, flex: 1, marginBottom: 0 }}
            />
            <button
              onClick={() => setShowOld(!showOld)}
              style={{ background: "none", border: "none", cursor: "pointer", marginLeft: 8 }}
            >
              {showOld ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={S.muted}>Nouveau mot de passe</label>
          <div style={{ display: "flex", alignItems: "center" }}>
            <input
              type={showNew ? "text" : "password"}
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              style={{ ...S.input, flex: 1, marginBottom: 0 }}
            />
            <button
              onClick={() => setShowNew(!showNew)}
              style={{ background: "none", border: "none", cursor: "pointer", marginLeft: 8 }}
            >
              {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={S.muted}>Confirmer le nouveau mot de passe</label>
          <input
            type="password"
            value={confirmPwd}
            onChange={(e) => setConfirmPwd(e.target.value)}
            style={S.input}
          />
        </div>
        <button
          onClick={handleChangePassword}
          style={{ ...S.btnSm("#4f46e5"), display: "flex", alignItems: "center", gap: 8 }}
        >
          <Save size={16} /> Enregistrer
        </button>
      </div>
    </div>
  );
}