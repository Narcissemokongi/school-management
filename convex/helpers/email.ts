// convex/helpers/email.ts
/**
 * 📧 Helper email Resend partagé.
 * Utilisé par twoFactorEmail.ts et emails.ts.
 */

export function getEnv(key: string): string | undefined {
  const p = (globalThis as { process?: { env?: Record<string, string> } })
    .process;
  return p?.env?.[key];
}

export const EMAIL_FROM = "School Management <no-reply@yourdomain.com>";
const RESEND_TIMEOUT_MS = 8000;

/**
 * Envoie un email via Resend.
 *
 * @param throwOnError (défaut: true)
 *   - true  → l'erreur remonte (ex: 2FA au login, on veut bloquer)
 *   - false → erreur loggée mais silencieuse (ex: relance, non-bloquant)
 */
export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  throwOnError?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  const apiKey = getEnv("RESEND_API_KEY");

  if (!apiKey) {
    const msg = "RESEND_API_KEY non configurée";
    console.error("[email]", msg);
    if (params.throwOnError !== false) throw new Error(msg);
    return { success: false, error: msg };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), RESEND_TIMEOUT_MS);

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [params.to],
        subject: params.subject,
        html: params.html,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[email] Resend error (${res.status}):`, errText);
      if (params.throwOnError !== false) {
        throw new Error("Erreur d'envoi d'email");
      }
      return { success: false, error: errText };
    }

    return { success: true };
  } catch (err) {
    if (params.throwOnError !== false) throw err;
    console.error("[email] network error:", err);
    return { success: false, error: String(err) };
  } finally {
    clearTimeout(timeoutId);
  }
}

/** Rendu HTML standard pour un code 2FA. */
export function render2FACodeHtml(code: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #4F46E5;">Code de connexion</h2>
      <p>Votre code de connexion est :</p>
      <div style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #4F46E5; text-align: center; padding: 16px; background: #EEF2FF; border-radius: 8px; margin: 16px 0;">
        ${code}
      </div>
      <p style="color: #64748B; font-size: 13px;">Ce code expire dans 10 minutes.</p>
      <p style="color: #64748B; font-size: 12px; margin-top: 32px;">
        Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.
      </p>
    </div>
  `;
}