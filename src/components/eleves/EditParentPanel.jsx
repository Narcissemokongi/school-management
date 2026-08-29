import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useStyles } from "../../styles/theme";
import { useConfirm } from "../../hooks/useConfirm";
import { ConfirmDialog } from "../ConfirmDialog";
import { Loader, UserPlus, X, Check } from "lucide-react";
import toast from "react-hot-toast";

export function EditParentPanel({
  eleveId,
  initialParentId,
  parents,
  ecoleId,
  userId,
  onClose,
}) {
  const { dark } = useStyles();
  const { confirm, dialogProps } = useConfirm();

  const [parentId, setParentId] = useState(initialParentId || "");
  const [createParent, setCreateParent] = useState(false);
  const [newParentNom, setNewParentNom] = useState("");
  const [newParentLogin, setNewParentLogin] = useState("");
  const [newParentPassword, setNewParentPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [updating, setUpdating] = useState(false);

  const updateEleve = useMutation(api.eleves.update);
  const addUser = useMutation(api.users.add);

  useEffect(() => {
    setParentId(initialParentId || "");
  }, [initialParentId]);

  const validate = () => {
    const errs = {};
    if (createParent) {
      if (!newParentNom.trim()) errs.newParentNom = "Requis";
      if (!newParentLogin.trim()) errs.newParentLogin = "Requis";
      if (!newParentPassword || newParentPassword.length < 4) errs.newParentPassword = "4 caractères min.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const ok = await confirm(
      "Confirmer la modification",
      "Voulez-vous enregistrer le parent associé à cet élève ?"
    );
    if (!ok) return;

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
      // ✅ Correction : suppression du champ actionUserId
      await updateEleve({ id: eleveId, parentId: finalParentId });
      toast.success("Parent mis à jour");
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const inputStyle = (field) => ({
    width: "100%",
    padding: "10px 14px",
    border: `1px solid ${errors[field] ? "#EF4444" : dark ? "#334155" : "#D1D5DB"}`,
    borderRadius: 8,
    fontSize: 14,
    marginBottom: 8,
    background: dark ? "#0F172A" : "#F9FAFB",
    color: dark ? "#F1F5F9" : "#1E293B",
    outline: "none",
    transition: "border-color 0.2s, background-color 0.3s",
  });

  return (
    <div style={{
      background: dark ? "#1E293B" : "#FFFFFF",
      borderRadius: 16,
      padding: 24,
      marginTop: 24,
      boxShadow: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)",
      border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
      transition: "background-color 0.3s",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: dark ? "#F1F5F9" : "#1E293B" }}>
          Modifier le parent
        </h3>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: dark ? "#94A3B8" : "#64748B" }}>
          <X size={20} />
        </button>
      </div>

      {!createParent ? (
        <>
          <label style={{ display: "block", marginBottom: 6, fontWeight: 500, fontSize: 14, color: dark ? "#CBD5E1" : "#374151" }}>
            Parent existant
          </label>
          <select
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            style={inputStyle()}
          >
            <option value="">Aucun parent</option>
            {parents.map((p) => (
              <option key={p._id} value={p._id} style={{ background: dark ? "#1E293B" : "#FFF" }}>
                {p.nom} (@{p.login})
              </option>
            ))}
          </select>
          <button
            onClick={() => setCreateParent(true)}
            style={{
              background: "none",
              border: "none",
              color: dark ? "#818CF8" : "#4F46E5",
              cursor: "pointer",
              padding: 0,
              marginBottom: 12,
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontWeight: 500,
            }}
          >
            <UserPlus size={16} />
            Créer un nouveau parent
          </button>
        </>
      ) : (
        <div style={{
          background: dark ? "#0F172A" : "#F8FAFC",
          padding: 16,
          borderRadius: 10,
          marginBottom: 12,
          border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
        }}>
          <label style={{ display: "block", marginBottom: 6, fontWeight: 500, fontSize: 14, color: dark ? "#CBD5E1" : "#374151" }}>
            Nouveau parent
          </label>
          <input
            value={newParentNom}
            onChange={(e) => setNewParentNom(e.target.value)}
            placeholder="Nom complet du parent"
            style={inputStyle("newParentNom")}
          />
          {errors.newParentNom && <div style={{ color: "#EF4444", fontSize: 13, marginTop: -6, marginBottom: 8 }}>{errors.newParentNom}</div>}
          <input
            value={newParentLogin}
            onChange={(e) => setNewParentLogin(e.target.value)}
            placeholder="Login"
            style={inputStyle("newParentLogin")}
          />
          {errors.newParentLogin && <div style={{ color: "#EF4444", fontSize: 13, marginTop: -6, marginBottom: 8 }}>{errors.newParentLogin}</div>}
          <input
            type="password"
            value={newParentPassword}
            onChange={(e) => setNewParentPassword(e.target.value)}
            placeholder="Mot de passe (min 4 caractères)"
            style={inputStyle("newParentPassword")}
          />
          {errors.newParentPassword && <div style={{ color: "#EF4444", fontSize: 13, marginTop: -6, marginBottom: 8 }}>{errors.newParentPassword}</div>}
          <button
            onClick={() => setCreateParent(false)}
            style={{
              background: "none",
              border: "none",
              color: dark ? "#94A3B8" : "#64748B",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            Annuler
          </button>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button
          onClick={handleSubmit}
          disabled={updating}
          style={{
            flex: 1,
            background: updating ? "#A5B4FC" : dark ? "#818CF8" : "#4F46E5",
            color: "white",
            border: "none",
            borderRadius: 8,
            padding: "10px 16px",
            cursor: updating ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          {updating ? <Loader size={16} className="animate-spin" /> : <Check size={16} />}
          {updating ? "Enregistrement..." : "Enregistrer"}
        </button>
        <button
          onClick={onClose}
          style={{
            background: dark ? "#334155" : "#F1F5F9",
            border: "none",
            borderRadius: 8,
            padding: "10px 16px",
            cursor: "pointer",
            color: dark ? "#F1F5F9" : "#1E293B",
            fontWeight: 500,
          }}
        >
          Annuler
        </button>
      </div>

      <ConfirmDialog {...dialogProps} />
    </div>
  );
}