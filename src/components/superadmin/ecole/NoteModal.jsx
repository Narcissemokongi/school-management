// src/components/SuperAdmin/ecole/NoteModal.jsx
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useTokens } from "@/theme/tokens";
import { Modal, Button } from "@/components/ui";
import toast from "react-hot-toast";

const MAX_LENGTH = 2000;

export function NoteModal({ userId, ecoleId, note, onClose }) {
  const t = useTokens();
  const isEdit = !!note;

  const [contenu, setContenu] = useState(note?.contenu ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  const addM = useMutation(api.ecoleNotes.addNote);
  const updateM = useMutation(api.ecoleNotes.updateNote);

  const handleSubmit = async () => {
    setErr(null);
    if (!contenu.trim()) {
      setErr("Le contenu est requis.");
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        await updateM({
          userId,
          noteId: note._id,
          contenu: contenu.trim(),
        });
        toast.success("Note modifiée");
      } else {
        await addM({
          userId,
          ecoleId,
          contenu: contenu.trim(),
        });
        toast.success("Note ajoutée");
      }
      onClose();
    } catch (e) {
      setErr(e.message ?? "Erreur inconnue");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? "Modifier la note" : "Nouvelle note interne"}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: t.space.md }}>
        <div>
          <label
            style={{
              fontSize: t.font.size.sm,
              fontWeight: 600,
              color: t.text.primary,
              display: "block",
              marginBottom: 4,
            }}
          >
            Contenu *
          </label>
          <textarea
            value={contenu}
            onChange={(e) => setContenu(e.target.value)}
            maxLength={MAX_LENGTH}
            rows={6}
            placeholder="Note interne… (visible uniquement par les OWNERS)"
            autoFocus
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: t.radius.sm,
              border: `1px solid ${t.border.default}`,
              background: t.surface.elevated,
              color: t.text.primary,
              fontSize: t.font.size.sm,
              fontFamily: t.font.family,
              outline: "none",
              resize: "vertical",
              boxSizing: "border-box",
              lineHeight: 1.5,
            }}
          />
          <div
            style={{
              fontSize: t.font.size.xs,
              color: t.text.muted,
              textAlign: "right",
              marginTop: 4,
            }}
          >
            {contenu.length} / {MAX_LENGTH}
          </div>
        </div>

        {err && (
          <div
            style={{
              padding: t.space.sm,
              background: "#FEF2F2",
              border: "1px solid #FECACA",
              borderRadius: t.radius.sm,
              color: "#991B1B",
              fontSize: t.font.size.sm,
            }}
          >
            {err}
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: t.space.sm,
          }}
        >
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !contenu.trim()}>
            {saving ? "Enregistrement…" : isEdit ? "Enregistrer" : "Ajouter"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default NoteModal;