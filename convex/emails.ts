// convex/emails.ts
import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { sendEmail } from "./helpers/email";

// ════════════════════════════════════════════════════════════════
// RELANCE ABONNEMENT IMPAYÉ
// ════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════
// RELANCE ABONNEMENT IMPAYÉ — 3 templates
// ════════════════════════════════════════════════════════════════

const TEMPLATE_CONFIG = {
  amiable: {
    headerColor: "#3B82F6",
    headerEmoji: "💬",
    headerTitle: "Rappel amical",
    tone: "Bonjour,\\n\\nNous vous rappelons avec bienveillance que votre abonnement arrive à échéance. Nous comptons sur votre régularisation rapide pour continuer à vous offrir le meilleur service.",
    footer: "Si vous avez déjà effectué le paiement, merci d'ignorer ce message.",
  },
  ferme: {
    headerColor: "#F59E0B",
    headerEmoji: "⚠️",
    headerTitle: "Relance importante",
    tone: "Bonjour,\\n\\nMalgré notre précédent rappel, votre paiement demeure en attente. Nous vous prions de bien vouloir régulariser votre situation dans les plus brefs délais pour éviter toute interruption de service.",
    footer: "En cas de difficulté, contactez-nous pour envisager un échelonnement.",
  },
  mise_en_demeure: {
    headerColor: "#EF4444",
    headerEmoji: "🚨",
    headerTitle: "Mise en demeure",
    tone: "Bonjour,\\n\\nNonobstant nos précédentes relances, votre abonnement est à ce jour impayé. Nous vous mettons en demeure de régulariser votre situation sous 8 jours. À défaut, votre accès sera suspendu sans autre préavis.",
    footer: "Cette mise en demeure constitue un préalable obligatoire à toute suspension de service.",
  },
};

export const sendRelanceAbonnement = internalAction({
  args: {
    to: v.string(),
    ecoleNom: v.string(),
    montant: v.number(),
    prochaineEcheance: v.string(),
    joursRetard: v.number(),
    statut: v.string(),
    template: v.union(
      v.literal("amiable"),
      v.literal("ferme"),
      v.literal("mise_en_demeure")
    ),
  },
  handler: async (_ctx, args) => {
    const cfg = TEMPLATE_CONFIG[args.template];

    const statutLabel =
      args.statut === "grace"
        ? "en période de grâce"
        : args.statut === "expire"
        ? "expiré"
        : args.statut === "suspendu"
        ? "suspendu"
        : "en retard";

    const retardText =
      args.joursRetard > 0
        ? `en retard de <strong>${args.joursRetard} jour(s)</strong>`
        : "à échéance";

    const toneHtml = cfg.tone.replace(/\\n\\n/g, "</p><p>");

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <div style="border-left: 4px solid ${cfg.headerColor}; padding-left: 16px; margin-bottom: 24px;">
          <h2 style="color: ${cfg.headerColor}; margin: 0;">${cfg.headerEmoji} ${cfg.headerTitle}</h2>
        </div>
        <p>${toneHtml}</p>
        <div style="background: #F8FAFC; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 3px solid ${cfg.headerColor};">
          <p style="margin: 4px 0;"><strong>École :</strong> ${args.ecoleNom}</p>
          <p style="margin: 4px 0;"><strong>Statut :</strong> ${statutLabel} — ${retardText}</p>
          <p style="margin: 4px 0;"><strong>Montant dû :</strong> ${args.montant} USD</p>
          <p style="margin: 4px 0;"><strong>Échéance :</strong> ${new Date(args.prochaineEcheance).toLocaleDateString("fr-FR")}</p>
        </div>
        <p style="color: #64748B; font-size: 13px;">${cfg.footer}</p>
        <p style="color: #94A3B8; font-size: 12px; margin-top: 32px; border-top: 1px solid #E2E8F0; padding-top: 16px;">
          Message envoyé automatiquement par EduDiscipline.
        </p>
      </div>
    `;

    return await sendEmail({
      to: args.to,
      subject: `[EduDiscipline] ${cfg.headerTitle} — ${args.ecoleNom}`,
      html,
      throwOnError: false,
    });
  },
});

// ════════════════════════════════════════════════════════════════
// CONFIRMATION PAIEMENT
// ════════════════════════════════════════════════════════════════

export const sendConfirmationPaiement = internalAction({
  args: {
    to: v.string(),
    ecoleNom: v.string(),
    montant: v.number(),
    nouvelleEcheance: v.string(),
  },
  handler: async (_ctx, args) => {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #10B981;">✅ Paiement enregistré</h2>
        <p>Bonjour,</p>
        <p>
          Nous confirmons la bonne réception de votre paiement pour
          l'école <strong>${args.ecoleNom}</strong>.
        </p>
        <div style="background: #D1FAE5; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 4px 0;"><strong>Montant :</strong> ${args.montant} USD</p>
          <p style="margin: 4px 0;"><strong>Prochaine échéance :</strong> ${new Date(
            args.nouvelleEcheance
          ).toLocaleDateString("fr-FR")}</p>
        </div>
        <p>Merci de votre confiance.</p>
        <p style="color: #64748B; font-size: 12px; margin-top: 32px;">
          Cet email est envoyé automatiquement par EduDiscipline.
        </p>
      </div>
    `;

    await sendEmail({
      to: args.to,
      subject: `[EduDiscipline] Paiement confirmé — ${args.ecoleNom}`,
      html,
      throwOnError: false,
    });

    return { success: true };
  },
});