// src/components/SuperAdmin/schools/CreateSchoolModal.jsx
import { useState, useEffect } from "react";
import { useTokens } from "@/theme/tokens";
import { Modal, Button } from "@/components/ui";

const MAX_NAME_LENGTH = 100;

export function CreateSchoolModal({
  open,
  onClose,
  onSubmit,
  submitting = false,
}) {
  const t = useTokens();
  const [nom, setNom] = useState("");
  const [localSubmitting, setLocalSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setNom("");
      setLocalSubmitting(false);
    }
  }, [open]);

  const isBusy = submitting || localSubmitting;
  const trimmed = nom.trim();
  const canSubmit = trimmed.length > 0 && !isBusy;

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!canSubmit) return;

    setLocalSubmitting(true);
    try {
      await onSubmit(trimmed);
    } catch {
      // Erreur déjà gérée côté parent (toast)
    } finally {
      setLocalSubmitting(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Modal
      open={open}
      onClose={isBusy ? undefined : onClose}
      title="Nouvelle école"
      maxWidth={420}
      closeOnEscape={!isBusy}
      closeOnOverlay={!isBusy}
      footer={
        <>
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isBusy}
          >
            Annuler
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            loading={isBusy}
            disabled={!canSubmit}
          >
            Créer
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        <label
          htmlFor="create-school-name"
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
          Nom de l'école
        </label>
        <input
          id="create-school-name"
          type="text"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ex : Complexe Scolaire La Grâce"
          autoFocus
          disabled={isBusy}
          maxLength={MAX_NAME_LENGTH}
          aria-label="Nom de l'école"
          aria-required="true"
          style={{
            width: "100%",
            padding: "12px 14px",
            border: `1px solid ${t.border.default}`,
            borderRadius: t.radius.sm,
            fontSize: 14,
            outline: "none",
            background: t.surface.input,
            color: t.text.primary,
            fontFamily: t.font.family,
            boxSizing: "border-box",
          }}
        />
        {/* Compteur discret si on approche de la limite */}
        {nom.length > MAX_NAME_LENGTH * 0.8 && (
          <div
            style={{
              fontSize: 11,
              color: nom.length >= MAX_NAME_LENGTH ? "#EF4444" : t.text.muted,
              marginTop: 6,
              textAlign: "right",
            }}
          >
            {nom.length} / {MAX_NAME_LENGTH}
          </div>
        )}

        {/* ✅ Bouton submit caché pour permettre "Entrée" */}
        <button
          type="submit"
          style={{ display: "none" }}
          aria-hidden="true"
          tabIndex={-1}
        />
      </form>
    </Modal>
  );
}