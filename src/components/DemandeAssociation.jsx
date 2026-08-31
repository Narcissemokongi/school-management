import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  AlertCircle, CheckCircle2, Clock, UserPlus, XCircle, Loader,
} from "lucide-react";
import toast from "react-hot-toast";
import { useIsMobile } from "../hooks/useIsMobile"; // <-- Import du hook

function DemandeAssociation({ user, dark }) {
  const isMobile = useIsMobile(); // Détection mobile

  const [matricule, setMatricule] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState("");

  const createRequest = useMutation(api.parentLinks.createParentLinkRequest);
  const cancelRequest = useMutation(api.parentLinks.cancelParentLinkRequest);
  const demandes = useQuery(api.parentLinks.listByParent, { parentId: user._id }) ?? [];

  // Fonction pour extraire un message lisible depuis l'erreur Convex
  const getErrorMessage = (err) => {
    if (typeof err === "string") return err;
    if (err?.data?.message) return err.data.message;
    if (err?.message) return err.message;
    return "Une erreur inconnue est survenue.";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess("");

    if (!matricule.trim()) {
      setError({ type: "error", message: "Veuillez saisir le matricule de l'enfant." });
      return;
    }

    setSending(true);
    try {
      await createRequest({
        parentId: user._id,
        eleveMatricule: matricule.trim().toUpperCase(),
      });
      setSuccess("Demande envoyée avec succès. L'administration va la traiter.");
      toast.success("Demande envoyée.");
      setMatricule("");
    } catch (err) {
      const raw = getErrorMessage(err);
      let message = raw;
      let type = "error";

      if (raw.includes("Vous êtes déjà associé")) {
        message = "Cet enfant est déjà associé à votre compte.";
        type = "info";
      } else if (raw.includes("Cet enfant est déjà associé")) {
        message = "Cet enfant est déjà associé à un autre parent. Contactez l'administration si vous pensez qu'il s'agit d'une erreur.";
      } else if (raw.includes("demande est déjà en attente")) {
        message = "Une demande est déjà en attente pour cet enfant. Vous pouvez la consulter ci-dessous.";
        type = "info";
      } else if (raw.includes("Matricule invalide")) {
        message = "Le matricule saisi n'existe pas. Vérifiez auprès de l'école.";
      } else if (raw.includes("n'appartenez pas à la même école")) {
        message = "Cet enfant n'appartient pas à votre établissement.";
      }

      setError({ type, message });
      toast.error(message);
    } finally {
      setSending(false);
    }
  };

  const handleCancel = async (id) => {
    try {
      await cancelRequest({ requestId: id, parentId: user._id });
      toast.success("Demande annulée.");
    } catch (err) {
      const msg = getErrorMessage(err);
      setError({ type: "error", message: msg });
      toast.error(msg);
    }
  };

  const inputBorderColor = error ? "#EF4444" : dark ? "#334155" : "#E2E8F0";
  const alertStyles = {
    error: {
      background: dark ? "#7F1D1D" : "#FEE2E2",
      color: dark ? "#F87171" : "#B91C1C",
      icon: <AlertCircle size={16} />,
    },
    info: {
      background: dark ? "#1E3A8A" : "#DBEAFE",
      color: dark ? "#60A5FA" : "#1D4ED8",
      icon: <Clock size={16} />,
    },
    success: {
      background: dark ? "#064E3B" : "#D1FAE5",
      color: dark ? "#34D399" : "#065F46",
      icon: <CheckCircle2 size={16} />,
    },
  };

  const currentAlert = error ? alertStyles[error.type] : success ? alertStyles.success : null;

  // Styles adaptatifs
  const inputStyle = {
    width: "100%",
    padding: isMobile ? "12px 14px" : "10px 14px",
    border: `1px solid ${inputBorderColor}`,
    borderRadius: 8,
    fontSize: isMobile ? 16 : 14, // 16px pour éviter le zoom iOS
    outline: "none",
    background: dark ? "#0F172A" : "#F9FAFB",
    color: dark ? "#F1F5F9" : "#1E293B",
    marginBottom: 12,
  };
  const buttonStyle = {
    width: "100%",
    padding: isMobile ? "12px 16px" : "10px 16px",
    background: sending ? "#94A3B8" : dark ? "#818CF8" : "#4F46E5",
    color: "white",
    border: "none",
    borderRadius: 8,
    fontWeight: 600,
    cursor: sending ? "not-allowed" : "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    fontSize: isMobile ? 16 : 14,
  };
  const alertPadding = isMobile ? "12px 14px" : "10px 14px";
  const listItemPadding = isMobile ? "12px 14px" : "10px 14px";

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: isMobile ? "0 12px" : "0 16px" }}>
      <form onSubmit={handleSubmit} style={{ marginBottom: isMobile ? 20 : 24 }}>
        <label style={{ display: "block", marginBottom: 6, fontWeight: 500, fontSize: isMobile ? 15 : 14, color: dark ? "#CBD5E1" : "#374151" }}>
          Matricule de l'enfant
        </label>
        <input
          type="text"
          placeholder="Ex: A1B2C3"
          value={matricule}
          onChange={(e) => {
            setMatricule(e.target.value);
            if (error) setError(null);
          }}
          style={inputStyle}
          required
        />

        {currentAlert && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: currentAlert.background,
            color: currentAlert.color,
            padding: alertPadding,
            borderRadius: 8,
            fontSize: isMobile ? 14 : 13,
            fontWeight: 500,
            marginBottom: 12,
          }}>
            {currentAlert.icon}
            <span>{error ? error.message : success}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={sending}
          style={buttonStyle}
        >
          {sending ? <Loader size={16} className="animate-spin" /> : <UserPlus size={isMobile ? 18 : 16} />}
          {sending ? "Envoi..." : "Demander l'association"}
        </button>
      </form>

      {demandes.length > 0 && (
        <div>
          <h3 style={{ fontSize: isMobile ? 17 : 16, fontWeight: 600, color: dark ? "#F1F5F9" : "#1E293B", marginBottom: 12 }}>
            Mes demandes
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {demandes.map((demande) => (
              <div
                key={demande._id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: listItemPadding,
                  borderRadius: 8,
                  border: `1px solid ${dark ? "#334155" : "#E2E8F0"}`,
                  background: dark ? "#1E293B" : "#FFFFFF",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                  {demande.status === "pending" && <Clock size={isMobile ? 18 : 16} color="#F59E0B" />}
                  {demande.status === "approved" && <CheckCircle2 size={isMobile ? 18 : 16} color="#10B981" />}
                  {demande.status === "rejected" && <XCircle size={isMobile ? 18 : 16} color="#EF4444" />}
                  <span style={{ fontSize: isMobile ? 15 : 14, color: dark ? "#F1F5F9" : "#1E293B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {demande.status === "pending" && "En attente"}
                    {demande.status === "approved" && "Approuvée"}
                    {demande.status === "rejected" && "Rejetée"}
                  </span>
                </div>
                {demande.status === "pending" && (
                  <button
                    onClick={() => handleCancel(demande._id)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#EF4444",
                      cursor: "pointer",
                      fontSize: isMobile ? 14 : 13,
                      fontWeight: 500,
                      flexShrink: 0,
                    }}
                  >
                    Annuler
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default DemandeAssociation;