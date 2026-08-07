import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Loader } from "lucide-react";
import toast from "react-hot-toast";

export function AddEleveForm({ classes, parents, ecoleId, userId, anneeId, addEleve }) {
  const [nom, setNom] = useState("");
  const [postnom, setPostnom] = useState("");
  const [classe, setClasse] = useState(classes[0]?.nom || "");
  const [parentId, setParentId] = useState("");
  const [createParent, setCreateParent] = useState(false);
  const [newParentNom, setNewParentNom] = useState("");
  const [newParentLogin, setNewParentLogin] = useState("");
  const [newParentPassword, setNewParentPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [adding, setAdding] = useState(false);

  const addUser = useMutation(api.users.add);

  const validate = () => {
    const errs = {};
    if (!nom.trim()) errs.nom = "Requis";
    if (!postnom.trim()) errs.postnom = "Requis";
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
    setAdding(true);
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
      await addEleve({
        nom: nom.trim(),
        postnom: postnom.trim(),
        classe,
        ecoleId,
        parentId: finalParentId,
        anneeId,
        userId,
        actionUserId: userId,
      });
      toast.success("Élève ajouté");
      setNom("");
      setPostnom("");
      setClasse(classes[0]?.nom || "");
      setParentId("");
      setCreateParent(false);
      setNewParentNom("");
      setNewParentLogin("");
      setNewParentPassword("");
      setErrors({});
    } catch (err) {
      toast.error(err.message);
    } finally {
      setAdding(false);
    }
  };

  const inputStyle = (field) => ({
    width: "100%",
    padding: "8px 12px",
    border: `1px solid ${errors[field] ? "#EF4444" : "#D1D5DB"}`,
    borderRadius: 8,
    fontSize: 14,
    marginBottom: 12,
  });

  return (
    <div style={{ background: "#FFF", borderRadius: 16, padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.05)", marginBottom: 24 }}>
      <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>Ajouter un élève</h3>
      <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Nom</label>
      <input
        value={nom}
        onChange={(e) => setNom(e.target.value)}
        style={inputStyle("nom")}
        placeholder="Nom"
      />
      {errors.nom && <div style={{ color: "#EF4444", fontSize: 13, marginTop: -8, marginBottom: 8 }}>{errors.nom}</div>}

      <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Post-nom</label>
      <input
        value={postnom}
        onChange={(e) => setPostnom(e.target.value)}
        style={inputStyle("postnom")}
        placeholder="Post-nom"
      />
      {errors.postnom && <div style={{ color: "#EF4444", fontSize: 13, marginTop: -8, marginBottom: 8 }}>{errors.postnom}</div>}

      <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Classe</label>
      <select
        value={classe}
        onChange={(e) => setClasse(e.target.value)}
        style={{ ...inputStyle(""), marginBottom: 12 }}
      >
        {classes.map((c) => (
          <option key={c._id} value={c.nom}>{c.nom}</option>
        ))}
      </select>

      <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Parent</label>
      {!createParent ? (
        <>
          <select
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            style={{ ...inputStyle(""), marginBottom: 8 }}
          >
            <option value="">Aucun parent</option>
            {parents.map((p) => (
              <option key={p._id} value={p._id}>{p.nom} (@{p.login})</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setCreateParent(true)}
            style={{
              background: "none",
              border: "none",
              color: "#4F46E5",
              fontWeight: 500,
              cursor: "pointer",
              padding: 0,
              marginBottom: 12,
            }}
          >
            + Créer un nouveau parent
          </button>
        </>
      ) : (
        <div style={{ background: "#F8FAFC", padding: 12, borderRadius: 10, marginBottom: 12 }}>
          <input
            value={newParentNom}
            onChange={(e) => setNewParentNom(e.target.value)}
            style={inputStyle("newParentNom")}
            placeholder="Nom complet du parent"
          />
          {errors.newParentNom && <div style={{ color: "#EF4444", fontSize: 13, marginTop: -8, marginBottom: 8 }}>{errors.newParentNom}</div>}
          <input
            value={newParentLogin}
            onChange={(e) => setNewParentLogin(e.target.value)}
            style={inputStyle("newParentLogin")}
            placeholder="Login"
          />
          {errors.newParentLogin && <div style={{ color: "#EF4444", fontSize: 13, marginTop: -8, marginBottom: 8 }}>{errors.newParentLogin}</div>}
          <input
            type="password"
            value={newParentPassword}
            onChange={(e) => setNewParentPassword(e.target.value)}
            style={inputStyle("newParentPassword")}
            placeholder="Mot de passe"
          />
          {errors.newParentPassword && <div style={{ color: "#EF4444", fontSize: 13, marginTop: -8, marginBottom: 8 }}>{errors.newParentPassword}</div>}
          <button
            type="button"
            onClick={() => setCreateParent(false)}
            style={{ background: "none", border: "none", color: "#64748B", cursor: "pointer", padding: 0 }}
          >
            Annuler
          </button>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={adding}
        style={{
          width: "100%",
          padding: "10px 0",
          background: adding ? "#A5B4FC" : "#4F46E5",
          color: "white",
          border: "none",
          borderRadius: 10,
          fontWeight: 600,
          fontSize: 14,
          cursor: adding ? "not-allowed" : "pointer",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 8,
        }}
      >
        {adding ? <Loader size={16} className="animate-spin" /> : null}
        {adding ? "Ajout en cours..." : "Ajouter l'élève"}
      </button>
    </div>
  );
}