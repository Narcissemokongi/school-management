// src/components/SuperAdmin/GestionSuperAdmins/CreateSuperAdminModal.jsx
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useTokens } from "@/theme/tokens";
import { useIsMobile } from "@/hooks/useIsMobile";
import { Button, Modal } from "@/components/ui";
import { PermissionsEditor } from "./PermissionsEditor";
import toast from "react-hot-toast";
import { Eye, EyeOff } from "lucide-react";

const MIN_PASSWORD_LENGTH = 8;

// ════════════════════════════════════════════════════════════════
// Sous-composants (stables, au niveau module)
// ════════════════════════════════════════════════════════════════
function FormField({ label, children, t }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label
        style={{
          display: "block",
          fontSize: 12,
          fontWeight: 600,
          color: t.text.muted,
          marginBottom: 6,
          textTransform: "uppercase",
          letterSpacing: 0.3,
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function inputStyle(t) {
  return {
    width: "100%",
    padding: "10px 14px",
    borderRadius: t.radius.sm,
    border: `1px solid ${t.border.default}`,
    background: t.surface.input,
    color: t.text.primary,
    fontSize: 14,
    outline: "none",
    fontFamily: t.font.family,
    boxSizing: "border-box",
  };
}

// ════════════════════════════════════════════════════════════════
// Composant principal
// ════════════════════════════════════════════════════════════════
export function CreateSuperAdminModal({ userId, catalog, onClose }) {
  const t = useTokens();
  const isMobile = useIsMobile();

  // ✨ State LOCAL — isolé du parent → pas de perte de focus
  const [nom, setNom] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [permissions, setPermissions] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);

  const createM = useMutation(api.users.createSuperAdmin);

  const handleCreate = async () => {
    if (!nom.trim() || !login.trim() || !password) {
      toast.error("Tous les champs sont requis.");
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      toast.error(`Mot de passe : ${MIN_PASSWORD_LENGTH} caractères minimum.`);
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas.");
      return;
    }
    if (permissions.length === 0) {
      toast.error("Au moins une permission requise.");
      return;
    }

    setCreating(true);
    try {
      await createM({
        nom: nom.trim(),
        login: login.trim(),
        password,
        permissions,
        userId,
      });
      toast.success("Super admin créé");
      onClose();
    } catch (err) {
      toast.error(err?.message ?? "Erreur");
      setCreating(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Nouveau super admin"
      maxWidth={720}
      footer={
        <>
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={creating}
          >
            Annuler
          </Button>
          <Button
            variant="primary"
            onClick={handleCreate}
            loading={creating}
          >
            Créer
          </Button>
        </>
      }
    >
      {/* Infos de base */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <FormField label="Nom complet" t={t}>
          <input
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="Ex: Jean Dupont"
            style={inputStyle(t)}
            autoComplete="off"
            autoFocus
          />
        </FormField>

        <FormField label="Login" t={t}>
          <input
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            placeholder="Ex: jdupont"
            style={inputStyle(t)}
            autoComplete="off"
          />
        </FormField>
      </div>

      <FormField label="Mot de passe" t={t}>
        <div style={{ position: "relative" }}>
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={`Min ${MIN_PASSWORD_LENGTH} caractères`}
            style={{ ...inputStyle(t), paddingRight: 42 }}
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            style={{
              position: "absolute",
              right: 10,
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              color: t.text.muted,
              cursor: "pointer",
              padding: 4,
              display: "flex",
            }}
            aria-label={showPassword ? "Masquer" : "Afficher"}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </FormField>

      <FormField label="Confirmer le mot de passe" t={t}>
        <input
          type={showPassword ? "text" : "password"}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Retapez le mot de passe"
          style={inputStyle(t)}
          autoComplete="new-password"
        />
        {confirmPassword && password !== confirmPassword && (
          <p
            style={{
              fontSize: 12,
              color: "#EF4444",
              marginTop: 6,
              marginBottom: 0,
            }}
          >
            Les mots de passe ne correspondent pas.
          </p>
        )}
      </FormField>

      <FormField label="Permissions granulaires" t={t}>
        <PermissionsEditor
          catalog={catalog}
          permissions={permissions}
          onChange={setPermissions}
        />
      </FormField>
    </Modal>
  );
}

export default CreateSuperAdminModal;