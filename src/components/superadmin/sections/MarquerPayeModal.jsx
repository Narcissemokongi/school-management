// src/components/SuperAdmin/sections/MarquerPayeModal.jsx
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useTokens } from "@/theme/tokens";
import { Modal, Button } from "@/components/ui";
import toast from "react-hot-toast";

const METHODES = ["Mobile Money", "Virement", "Espèces", "Chèque", "Autre"];

export function MarquerPayeModal({ userId, row, onClose }) {
  const t = useTokens();
  const [montant, setMontant] = useState(row.montantMensuel || 0);
  const [methode, setMethode] = useState("Mobile Money");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [dureeMois, setDureeMois] = useState(1);
  const [envoyerConfirmation, setEnvoyerConfirmation] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  const marquerPayeM = useMutation(api.abonnements.marquerPaye);

  const handleSubmit = async () => {
    setErr(null);
    if (!montant || montant <= 0) {
      setErr("Le montant doit être supérieur à 0.");
      return;
    }
    setSaving(true);
    try {
      await marquerPayeM({
        userId,
        abonnementId: row.abonnementId,
        montant: Number(montant),
        methodePaiement: methode,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
        dureeMois: Number(dureeMois),
        envoyerConfirmation,
      });
      toast.success(`Paiement enregistré pour ${row.ecoleNom}`);
      onClose();
    } catch (e) {
      setErr(e?.message ?? "Erreur inconnue");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: t.radius.sm,
    border: `1px solid ${t.border.default}`,
    background: t.surface.elevated,
    color: t.text.primary,
    fontSize: t.font.size.sm,
    fontFamily: t.font.family,
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle = {
    fontSize: t.font.size.sm,
    fontWeight: 600,
    color: t.text.primary,
    display: "block",
    marginBottom: 4,
  };

  return (
    <Modal open onClose={onClose} title="Marquer comme payé">
      <div style={{ display: "flex", flexDirection: "column", gap: t.space.md }}>
        {/* Récap école */}
        <div
          style={{
            padding: t.space.sm,
            background: `${t.accent.primary}08`,
            border: `1px solid ${t.accent.primary}20`,
            borderRadius: t.radius.sm,
            fontSize: t.font.size.sm,
          }}
        >
          <div style={{ fontWeight: 700, color: t.text.primary }}>
            {row.ecoleNom}
          </div>
          <div style={{ color: t.text.secondary, fontSize: t.font.size.xs, marginTop: 2 }}>
            {row.formule} · {row.joursRetard > 0 ? `${row.joursRetard}j de retard` : "à échéance"}
          </div>
        </div>

        {/* Montant + durée */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: t.space.sm }}>
          <div>
            <label style={labelStyle}>Montant (USD) *</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
              style={inputStyle}
              autoFocus
            />
          </div>
          <div>
            <label style={labelStyle}>Durée couverte</label>
            <select
              value={dureeMois}
              onChange={(e) => setDureeMois(Number(e.target.value))}
              style={inputStyle}
            >
              <option value={1}>1 mois</option>
              <option value={3}>3 mois</option>
              <option value={6}>6 mois</option>
              <option value={12}>12 mois</option>
            </select>
          </div>
        </div>

        {/* Méthode */}
        <div>
          <label style={labelStyle}>Méthode de paiement</label>
          <select
            value={methode}
            onChange={(e) => setMethode(e.target.value)}
            style={inputStyle}
          >
            {METHODES.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        {/* Référence */}
        <div>
          <label style={labelStyle}>Référence (optionnel)</label>
          <input
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Ex : TRX-2026-0912-001"
            style={inputStyle}
          />
        </div>

        {/* Notes */}
        <div>
          <label style={labelStyle}>Notes (optionnel)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Remarques internes..."
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </div>

        {/* Checkbox confirmation */}
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: t.font.size.sm,
            color: t.text.primary,
            cursor: "pointer",
            fontFamily: t.font.family,
          }}
        >
          <input
            type="checkbox"
            checked={envoyerConfirmation}
            onChange={(e) => setEnvoyerConfirmation(e.target.checked)}
            style={{ cursor: "pointer" }}
          />
          Envoyer un email de confirmation
        </label>

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

        {/* Actions */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: t.space.sm }}>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Enregistrement…" : "Valider le paiement"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default MarquerPayeModal;