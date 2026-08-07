import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Loader } from "lucide-react";
import toast from "react-hot-toast";

export function EditParentPanel({ eleveId, initialParentId, parents, ecoleId, userId, onClose }) {
  const [parentId, setParentId] = useState(initialParentId || "");
  const [createParent, setCreateParent] = useState(false);
  const [newParentNom, setNewParentNom] = useState("");
  const [newParentLogin, setNewParentLogin] = useState("");
  const [newParentPassword, setNewParentPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [updating, setUpdating] = useState(false);

  const updateEleve = useMutation(api.eleves.update);
  const addUser = useMutation(api.users.add);

  const handleSubmit = async () => {
    const errs = {};
    if (createParent) {
      if (!newParentNom.trim()) errs.newParentNom = "Requis";
      if (!newParentLogin.trim()) errs.newParentLogin = "Requis";
      if (!newParentPassword || newParentPassword.length < 4) errs.newParentPassword = "4 caractères min.";
    }
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setUpdating(true);
    try {
      let finalParentId = parentId || undefined;
      if (createParent) {
        const newUser = await addUser({
          nom: newParentNom,
          login: newParentLogin,
          password: newParentPassword,
          role: "parent",
          ecoleId,
          userId,
        });
        finalParentId = newUser;
      }
      await updateEleve({ id: eleveId, parentId: finalParentId, actionUserId: userId });
      toast.success("Parent mis à jour");
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div style={{ background: "#FFF", borderRadius: 16, padding: 24, marginTop: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
      <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>Modifier le parent</h3>
      {!createParent ? (
        <>
          <select
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            style={{ width: "100%", padding: "8px 12px", border: "1px solid #D1D5DB", borderRadius: 8, marginBottom: 12 }}
          >
            <option value="">Aucun parent</option>
            {parents.map((p) => (
              <option key={p._id} value={p._id}>{p.nom} (@{p.login})</option>
            ))}
          </select>
          <button
            onClick={() => setCreateParent(true)}
            style={{ background: "none", border: "none", color: "#4F46E5", cursor: "pointer", padding: 0, marginBottom: 12 }}
          >
            + Créer un nouveau parent
          </button>
        </>
      ) : (
        <div style={{ background: "#F8FAFC", padding: 12, borderRadius: 10, marginBottom: 12 }}>
          <input value={newParentNom} onChange={(e) => setNewParentNom(e.target.value)} placeholder="Nom complet" style={inputStyle} />
          {errors.newParentNom && <div style={{ color: "#EF4444", fontSize: 13 }}>{errors.newParentNom}</div>}
          <input value={newParentLogin} onChange={(e) => setNewParentLogin(e.target.value)} placeholder="Login" style={inputStyle} />
          {errors.newParentLogin && <div style={{ color: "#EF4444", fontSize: 13 }}>{errors.newParentLogin}</div>}
          <input type="password" value={newParentPassword} onChange={(e) => setNewParentPassword(e.target.value)} placeholder="Mot de passe" style={inputStyle} />
          {errors.newParentPassword && <div style={{ color: "#EF4444", fontSize: 13 }}>{errors.newParentPassword}</div>}
          <button onClick={() => setCreateParent(false)} style={{ background: "none", border: "none", color: "#64748B", cursor: "pointer" }}>Annuler</button>
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={handleSubmit}
          disabled={updating}
          style={{ background: "#4F46E5", color: "white", border: "none", borderRadius: 8, padding: "8px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
        >
          {updating && <Loader size={16} className="animate-spin" />}
          Enregistrer
        </button>
        <button onClick={onClose} style={{ background: "#F1F5F9", border: "none", borderRadius: 8, padding: "8px 16px", cursor: "pointer" }}>
          Annuler
        </button>
      </div>
    </div>
  );
}

const inputStyle = { width: "100%", padding: "8px 12px", border: "1px solid #D1D5DB", borderRadius: 8, fontSize: 14, marginBottom: 8 };