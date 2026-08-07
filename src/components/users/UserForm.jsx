import { useState, useEffect } from "react";
import { Loader } from "lucide-react";

export function UserForm({ initialValues, onSubmit, onCancel }) {
  const isEdit = !!initialValues;
  const [form, setForm] = useState({
    nom: initialValues?.nom || "",
    login: initialValues?.login || "",
    password: "",
    role: initialValues?.role || "enseignant",
    classe: initialValues?.classe || "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialValues) {
      setForm({
        nom: initialValues.nom,
        login: initialValues.login,
        password: "",
        role: initialValues.role,
        classe: initialValues.classe || "",
      });
    }
  }, [initialValues]);

  const validate = () => {
    const errs = {};
    if (!form.nom.trim()) errs.nom = "Requis";
    if (!isEdit && !form.login.trim()) errs.login = "Requis";
    if (!isEdit && !form.password.trim()) errs.password = "Requis";
    if (form.password && form.password.length < 4) errs.password = "4 caractères min.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    // Construction du payload : jamais de login en édition
    const data = {
      nom: form.nom,
      role: form.role,
      classe: form.classe || undefined,
    };

    if (!isEdit) {
      // Création : login + password obligatoires
      data.login = form.login;
      data.password = form.password;
    } else if (form.password) {
      // Édition : password uniquement si modifié
      data.password = form.password;
    }

    await onSubmit(data, isEdit);
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 20 }}>
        {isEdit ? "Modifier l'utilisateur" : "Nouvel utilisateur"}
      </h3>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Nom complet</label>
        <input
          value={form.nom}
          onChange={(e) => setForm({ ...form, nom: e.target.value })}
          style={{
            width: "100%", padding: "8px 12px",
            border: `1px solid ${errors.nom ? "#EF4444" : "#D1D5DB"}`, borderRadius: 8
          }}
        />
        {errors.nom && <span style={{ color: "#EF4444", fontSize: 12 }}>{errors.nom}</span>}
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Login</label>
        <input
          value={form.login}
          onChange={(e) => setForm({ ...form, login: e.target.value })}
          disabled={isEdit}
          style={{
            width: "100%", padding: "8px 12px",
            border: `1px solid ${errors.login ? "#EF4444" : "#D1D5DB"}`,
            borderRadius: 8,
            background: isEdit ? "#F1F5F9" : "white",
          }}
        />
        {errors.login && <span style={{ color: "#EF4444", fontSize: 12 }}>{errors.login}</span>}
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
          Mot de passe {isEdit && "(laisser vide pour ne pas changer)"}
        </label>
        <input
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          style={{
            width: "100%", padding: "8px 12px",
            border: `1px solid ${errors.password ? "#EF4444" : "#D1D5DB"}`, borderRadius: 8
          }}
        />
        {errors.password && <span style={{ color: "#EF4444", fontSize: 12 }}>{errors.password}</span>}
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Rôle</label>
        <select
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
          style={{ width: "100%", padding: "8px 12px", border: "1px solid #D1D5DB", borderRadius: 8 }}
        >
          {["admin","directeur","disciplinaire","enseignant","parent","comptable","eleve"].map(r => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      {form.role === "enseignant" && (
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Classe</label>
          <input
            value={form.classe}
            onChange={(e) => setForm({ ...form, classe: e.target.value })}
            placeholder="Ex: 6ème A"
            style={{ width: "100%", padding: "8px 12px", border: "1px solid #D1D5DB", borderRadius: 8 }}
          />
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button
          type="submit"
          disabled={loading}
          style={{
            background: "#4F46E5", color: "white", border: "none", borderRadius: 8,
            padding: "10px 20px", fontWeight: 500, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 6,
          }}
        >
          {loading && <Loader size={16} className="animate-spin" />}
          {isEdit ? "Enregistrer" : "Créer"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{ background: "#F1F5F9", border: "none", borderRadius: 8, padding: "10px 20px", cursor: "pointer" }}
        >
          Annuler
        </button>
      </div>
    </form>
  );
}