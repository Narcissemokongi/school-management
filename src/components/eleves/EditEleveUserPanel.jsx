import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Loader } from "lucide-react";
import toast from "react-hot-toast";

export function EditEleveUserPanel({ eleveId, initialUserId, elevesUsers, ecoleId, userId, onClose }) {
  const [userIdState, setUserIdState] = useState(initialUserId || "");
  const [createUser, setCreateUser] = useState(false);
  const [newUserNom, setNewUserNom] = useState("");
  const [newUserLogin, setNewUserLogin] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [updating, setUpdating] = useState(false);

  const updateEleve = useMutation(api.eleves.update);
  const addUser = useMutation(api.users.add);

  const handleSubmit = async () => {
    const errs = {};
    if (createUser) {
      if (!newUserNom.trim()) errs.newUserNom = "Requis";
      if (!newUserLogin.trim()) errs.newUserLogin = "Requis";
      if (!newUserPassword || newUserPassword.length < 4) errs.newUserPassword = "4 caractères min.";
    }
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setUpdating(true);
    try {
      let finalUserId = userIdState || undefined;
      if (createUser) {
        const newUser = await addUser({
          nom: newUserNom,
          login: newUserLogin,
          password: newUserPassword,
          role: "eleve",
          ecoleId,
          userId,
        });
        finalUserId = newUser;
      }
      await updateEleve({ id: eleveId, userId: finalUserId, actionUserId: userId });
      toast.success("Compte élève mis à jour");
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div style={{ background: "#FFF", borderRadius: 16, padding: 24, marginTop: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
      <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>Modifier le compte élève</h3>
      {!createUser ? (
        <>
          <select value={userIdState} onChange={(e) => setUserIdState(e.target.value)} style={{ width: "100%", padding: "8px 12px", border: "1px solid #D1D5DB", borderRadius: 8, marginBottom: 12 }}>
            <option value="">Aucun compte</option>
            {elevesUsers.map((u) => <option key={u._id} value={u._id}>{u.nom} (@{u.login})</option>)}
          </select>
          <button onClick={() => setCreateUser(true)} style={{ background: "none", border: "none", color: "#4F46E5", cursor: "pointer", padding: 0, marginBottom: 12 }}>+ Créer un nouveau compte élève</button>
        </>
      ) : (
        <div style={{ background: "#F8FAFC", padding: 12, borderRadius: 10, marginBottom: 12 }}>
          <input value={newUserNom} onChange={(e) => setNewUserNom(e.target.value)} placeholder="Nom complet" style={inputStyle} />
          {errors.newUserNom && <div style={{ color: "#EF4444", fontSize: 13 }}>{errors.newUserNom}</div>}
          <input value={newUserLogin} onChange={(e) => setNewUserLogin(e.target.value)} placeholder="Login" style={inputStyle} />
          {errors.newUserLogin && <div style={{ color: "#EF4444", fontSize: 13 }}>{errors.newUserLogin}</div>}
          <input type="password" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} placeholder="Mot de passe" style={inputStyle} />
          {errors.newUserPassword && <div style={{ color: "#EF4444", fontSize: 13 }}>{errors.newUserPassword}</div>}
          <button onClick={() => setCreateUser(false)} style={{ background: "none", border: "none", color: "#64748B", cursor: "pointer" }}>Annuler</button>
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={handleSubmit} disabled={updating} style={{ background: "#4F46E5", color: "white", border: "none", borderRadius: 8, padding: "8px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          {updating && <Loader size={16} className="animate-spin" />}
          Enregistrer
        </button>
        <button onClick={onClose} style={{ background: "#F1F5F9", border: "none", borderRadius: 8, padding: "8px 16px", cursor: "pointer" }}>Annuler</button>
      </div>
    </div>
  );
}

const inputStyle = { width: "100%", padding: "8px 12px", border: "1px solid #D1D5DB", borderRadius: 8, fontSize: 14, marginBottom: 8 };