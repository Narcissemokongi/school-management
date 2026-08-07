import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useStyles } from "../styles/theme";
import { useConfirm } from "../hooks/useConfirm";
import { ConfirmDialog } from "./ConfirmDialog";
import { Skeleton } from "./Skeleton";
import { EmptyState } from "./EmptyState";
import { Loader } from "lucide-react";
import toast from "react-hot-toast";

export function GestionClassesAdmin({
  classes,
  ecoleId,
  userId,
  eleves,
  anneeId,       // ← nouvelle prop, indispensable pour lier la classe à l'année active
}) {
  const { S } = useStyles();
  const { confirm, dialogProps } = useConfirm();
  const [newClasse, setNewClasse] = useState("");
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState(null); // stocke l'ID de la classe en cours de suppression

  const addClasseMutation = useMutation(api.classes.add);
  const removeClasseMutation = useMutation(api.classes.remove);

  const handleAdd = async (e) => {
    e.preventDefault();
    const trimmed = newClasse.trim();
    if (!trimmed) return;

    setAdding(true);
    try {
      await addClasseMutation({
        nom: trimmed,
        ecoleId,
        userId,
        anneeId: anneeId || undefined,   // ← associe la classe à l'année scolaire en cours
      });
      toast.success(`Classe "${trimmed}" créée avec succès.`);
      setNewClasse("");
    } catch (err) {
      // Message d'erreur compréhensible (ex: "Cette classe existe déjà dans cette école.")
      toast.error(err.message || "Erreur lors de la création de la classe.");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id, nom) => {
    if (eleves.some((e) => e.classe === nom)) {
      toast.error("Impossible, des élèves sont encore affectés à cette classe.");
      return;
    }
    const ok = await confirm(
      "Supprimer la classe",
      `Voulez-vous vraiment supprimer la classe "${nom}" ?`
    );
    if (!ok) return;

    setDeleting(id);
    try {
      await removeClasseMutation({ id, userId });
      toast.success(`Classe "${nom}" supprimée.`);
    } catch (err) {
      toast.error(err.message || "Erreur lors de la suppression.");
    } finally {
      setDeleting(null);
    }
  };

  if (classes === undefined) {
    return <Skeleton height={250} />;
  }

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "24px 16px" }}>
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, color: "#1E293B", margin: 0 }}>
          Gestion des classes
        </h2>
        <p style={{ color: "#64748B", marginTop: 4, fontSize: 14 }}>
          {classes.length} classe(s) enregistrée(s)
        </p>
      </div>

      {/* Formulaire d'ajout */}
      <div
        style={{
          background: "#FFF",
          borderRadius: 16,
          padding: 24,
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          marginBottom: 24,
        }}
      >
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
          ➕ Nouvelle classe
        </h3>
        <form onSubmit={handleAdd} style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <input
            style={{
              flex: 1,
              padding: "10px 14px",
              border: "1px solid #E2E8F0",
              borderRadius: 8,
              fontSize: 14,
              outline: "none",
            }}
            placeholder="Nom de la classe"
            value={newClasse}
            onChange={(e) => setNewClasse(e.target.value)}
          />
          <button
            type="submit"
            disabled={adding || !newClasse.trim()}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 20px",
              background: adding ? "#A5B4FC" : "#4F46E5",
              color: "white",
              border: "none",
              borderRadius: 10,
              fontWeight: 600,
              cursor: adding ? "not-allowed" : "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {adding ? <Loader size={16} className="animate-spin" /> : null}
            {adding ? "Création..." : "Ajouter"}
          </button>
        </form>
      </div>

      {/* Liste des classes */}
      {classes.length === 0 ? (
        <EmptyState
          title="Aucune classe"
          message="Ajoutez votre première classe."
        />
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {classes.map((c) => {
            const count = eleves.filter((e) => e.classe === c.nom).length;
            return (
              <div
                key={c._id}
                style={{
                  background: "#FFF",
                  borderRadius: 12,
                  padding: "16px 20px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 16 }}>{c.nom}</div>
                  <div style={{ fontSize: 13, color: "#64748B" }}>
                    {count} élève(s)
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: "#EEF2FF",
                      border: "2px solid #C7D2FE",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: 14,
                      color: "#4F46E5",
                    }}
                  >
                    {count}
                  </div>
                  <button
                    onClick={() => handleDelete(c._id, c.nom)}
                    disabled={deleting === c._id}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#EF4444",
                      cursor: "pointer",
                      fontSize: 20,
                      padding: 4,
                      display: "flex",
                      alignItems: "center",
                    }}
                    title="Supprimer la classe"
                  >
                    {deleting === c._id ? (
                      <Loader size={16} className="animate-spin" />
                    ) : (
                      "🗑️"
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog {...dialogProps} />
    </div>
  );
}