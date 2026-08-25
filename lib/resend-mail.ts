import { Resend } from "resend";

export const NOREPLY_FALLBACK = "noreply@accg.be";

/**
 * Point d'entrée unique pour tous les envois Resend de l'application.
 * Règle obligatoire : un e-mail séparé par destinataire — personne ne voit les autres.
 */

export function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY manquante");
  return new Resend(apiKey);
}

export function getFromEmail(): string {
  return process.env.RESEND_FROM_EMAIL ?? NOREPLY_FALLBACK;
}

/** Déduplique, normalise et retire l'adresse expéditrice de la liste. */
export function uniqueRecipients(
  from: string,
  ...emails: (string | null | undefined)[]
): string[] {
  const fromNorm = from.trim().toLowerCase();
  const seen = new Set<string>();
  for (const raw of emails) {
    const email = raw?.trim().toLowerCase();
    if (email && email !== fromNorm) seen.add(email);
  }
  return [...seen];
}

interface IsolatedEmailOptions {
  /** Destinataires — chacun reçoit son propre e-mail, seul en « À ». */
  recipients: string[];
  subject: string;
  html: string;
  attachments?: { filename: string; content: Buffer }[];
}

/**
 * Envoie le même contenu à chaque destinataire via un e-mail individuel.
 * Isolation totale : aucun Cc/Cci, chaque personne ne voit que sa propre adresse.
 */
export async function sendIsolatedEmail(
  resend: Resend,
  { recipients, subject, html, attachments }: IsolatedEmailOptions
) {
  const from = getFromEmail();
  const toList = uniqueRecipients(from, ...recipients);

  if (toList.length === 0) {
    throw new Error("Aucun destinataire.");
  }

  const results = await Promise.all(
    toList.map((to) =>
      resend.emails.send({
        from,
        to: [to],
        subject,
        html,
        attachments,
      })
    )
  );

  const failed = results.find((r) => r.error);
  if (failed?.error) {
    console.error(
      "[sendIsolatedEmail] Échec d'envoi :",
      results.filter((r) => r.error).map((r) => r.error)
    );
    return { data: null, error: failed.error };
  }

  return { data: results[0]?.data ?? null, error: null };
}
