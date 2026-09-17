// src/components/EditParentPanel.jsx
import { useState, useEffect, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useStyles } from "@/styles/theme";
import { useConfirm } from "@/hooks/useConfirm";
import { ConfirmDialog } from "../ConfirmDialog";
import { Loader, UserPlus, X, Check } from "lucide-react";
import toast from "react-hot-toast";

// ✅ FIX #1 — aligné sur le reste de l'app
const MIN_PASSWORD_LENGTH = 8;

export function EditParentPanel({
  eleveId,
  initialParentId,
  parents = [],   // ✅ FIX #4
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

  const validate = useCallback(() => {
    const errs = {};
    if (createParent) {
      if (!newParentNom.trim()) errs.newParentNom = "Requis";
      if (!newParentLogin.trim()) errs.newParentLogin = "Requis";
      // ✅ FIX #1
      if (!newParentPassword || newParentPassword.length < MIN_PASSWORD_LENGTH) {
        errs.newParentPassword = `${MIN_PASSWORD_LENGTH} caractères min.`;
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [createParent, newParentNom, newParentLogin, newParentPassword]);

  const handleSubmit = useCallback(async () => {
    // ✅ FIX #5 — guard
    if (!eleveId || !userId) {
      toast.error("Élève ou utilisateur invalide");
      return;
    }
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
          // ✅ FIX #2
          requesterId: userId,
        });
        finalParentId = newUser;
      }
      // ✅ FIX #3 — user d'action ajouté
      await updateEleve({
        id: eleveId,
        parentId: finalParentId,
        requesterId: userId,
      });
      toast.success("Parent mis à jour");
      onClose();
    } catch (err) {
      // ✅ FIX #7
      toast.error(err?.message ?? "Erreur lors de la mise à jour");
    } finally {
      setUpdating(false);
    }
  }, [
    eleveId, userId, validate, confirm, parentId,
    createParent, newParentNom, newParentLogin, newParentPassword,
    ecoleId, addUser, updateEleve, onClose,
  ]);

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
    <div
      role="dialog"              // ✅ FIX #9
      aria-label="Modifier le parent"
      style={{
        background: dark ? "#1E293B" : "#FFFFFF",
        borderRadius: 16,
        padding: 24,
        marginTop: 24,
        boxShadow: dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 3px rgba(0,0,0,0.05)",
        border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
        transition: "background-color 0.3s",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: dark ? "#F1F5F9" : "#1E293B" }}>
          Modifier le parent
        </h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          style={{ background: "none", border: "none", cursor: "pointer", color: dark ? "#94A3B8" : "#64748B" }}
        >
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
            type="button"
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
            autoFocus             // ✅ FIX #9
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
            placeholder={`Mot de passe (min ${MIN_PASSWORD_LENGTH} caractères)`}
            style={inputStyle("newParentPassword")}
          />
          {errors.newParentPassword && <div style={{ color: "#EF4444", fontSize: 13, marginTop: -6, marginBottom: 8 }}>{errors.newParentPassword}</div>}
          <button
            type="button"
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
          type="button"
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
          {/* ✅ FIX #6 — keyframe ep-spin scopé */}
          {updating
            ? <Loader size={16} style={{ animation: "ep-spin 0.8s linear infinite" }} />
            : <Check size={16} />}
          {updating ? "Enregistrement..." : "Enregistrer"}
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={updating}       // ✅ FIX #10
          style={{
            background: dark ? "#334155" : "#F1F5F9",
            border: "none",
            borderRadius: 8,
            padding: "10px 16px",
            cursor: updating ? "not-allowed" : "pointer",
            color: dark ? "#F1F5F9" : "#1E293B",
            fontWeight: 500,
            opacity: updating ? 0.5 : 1,
          }}
        >
          Annuler
        </button>
      </div>

      <ConfirmDialog {...dialogProps} />

      {/* ✅ FIX #6 */}
      <style>{`
        @keyframes ep-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          button svg[style*="ep-spin"] { animation: none !important; }
        }
      `}</style>
    </div>
  );
}