// src/components/SuperAdmin/ecole/tabs/NotesTab.jsx
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useTokens } from "@/theme/tokens";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useConfirm } from "@/hooks/useConfirm";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button, Fab } from "@/components/ui";
import { NoteModal } from "../NoteModal";
import toast from "react-hot-toast";
import { StickyNote, Plus, Edit2, Trash2, Loader, User } from "lucide-react";

export function NotesTab({ userId, ecoleId, canWrite, canDelete }) {
  const t = useTokens();
  const isMobile = useIsMobile();
  const { confirm, dialogProps } = useConfirm();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const notesRaw = useQuery(api.ecoleNotes.listNotes, { userId, ecoleId });
  const deleteM = useMutation(api.ecoleNotes.deleteNote);

  const notes = notesRaw ?? [];

  const handleAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const handleEdit = (note) => {
    setEditing(note);
    setModalOpen(true);
  };

  const handleDelete = async (note) => {
    const ok = await confirm({
      title: "Supprimer cette note ?",
      message: "Cette action est irréversible.",
      confirmLabel: "Supprimer",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteM({ userId, noteId: note._id });
      toast.success("Note supprimée");
    } catch (err) {
      toast.error("Erreur : " + (err?.message ?? "inconnue"));
    }
  };

  if (notesRaw === undefined) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
        <Loader
          size={32}
          style={{ animation: "spin 1s linear infinite" }}
          color={t.accent.primary}
        />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: t.space.md }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: t.space.sm,
        }}
      >
        <div
          style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}
        >
          <StickyNote size={18} color={t.accent.primary} />
          <div>
            <div
              style={{
                fontSize: t.font.size.md,
                fontWeight: 700,
                color: t.text.primary,
              }}
            >
              {notes.length} note{notes.length > 1 ? "s" : ""} interne
              {notes.length > 1 ? "s" : ""}
            </div>
            <div style={{ fontSize: t.font.size.xs, color: t.text.muted }}>
              Privées — visibles uniquement par les OWNERS
            </div>
          </div>
        </div>
        {/* ✨ Bouton visible uniquement sur desktop */}
        {canWrite && !isMobile && (
          <Button icon={<Plus size={14} />} onClick={handleAdd}>
            Nouvelle note
          </Button>
        )}
      </div>

      {/* Liste */}
      {notes.length === 0 ? (
        <div
          style={{
            padding: t.space.xl,
            textAlign: "center",
            background: t.surface.elevated,
            border: `1px dashed ${t.border.default}`,
            borderRadius: t.radius.lg,
          }}
        >
          <StickyNote size={40} color={t.text.muted} style={{ marginBottom: 12 }} />
          <p
            style={{
              fontSize: t.font.size.sm,
              color: t.text.secondary,
              margin: 0,
            }}
          >
            Aucune note pour cette école.
            {canWrite && " Cliquez sur « Nouvelle note » pour ajouter du contexte."}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: t.space.sm }}>
          {notes.map((note) => (
            <div
              key={note._id}
              style={{
                padding: t.space.md,
                background: t.surface.elevated,
                border: `1px solid ${t.border.subtle}`,
                borderLeft: `3px solid ${t.accent.primary}`,
                borderRadius: t.radius.md,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: t.space.sm,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: t.font.size.sm,
                      color: t.text.primary,
                      whiteSpace: "pre-wrap",
                      lineHeight: 1.5,
                    }}
                  >
                    {note.contenu}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: t.space.md,
                      marginTop: 8,
                      fontSize: t.font.size.xs,
                      color: t.text.muted,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{ display: "flex", alignItems: "center", gap: 3 }}
                    >
                      <User size={10} />
                      {note.auteurNom}
                    </span>
                    <span>
                      {new Date(note.createdAt).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {note.updatedAt !== note.createdAt && (
                      <span style={{ fontStyle: "italic" }}>modifiée</span>
                    )}
                  </div>
                </div>

                {(canWrite || canDelete) && (
                  <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                    {canWrite && (
                      <button
                        type="button"
                        onClick={() => handleEdit(note)}
                        title="Modifier"
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: 6,
                          color: t.accent.primary,
                          display: "flex",
                        }}
                      >
                        <Edit2 size={14} />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => handleDelete(note)}
                        title="Supprimer"
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: 6,
                          color: "#EF4444",
                          display: "flex",
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <NoteModal
          userId={userId}
          ecoleId={ecoleId}
          note={editing}
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
          }}
        />
      )}

      {/* ✨ NOUVEAU — FAB mobile */}
      {isMobile && canWrite && (
        <Fab
          icon={<Plus size={22} />}
          label="Nouvelle note"
          onClick={handleAdd}
          bottom={88} // ✨ Remonté pour ne pas chevaucher d'autres FAB potentiels
        />
      )}

      <ConfirmDialog {...dialogProps} />
    </div>
  );
}

export default NotesTab;