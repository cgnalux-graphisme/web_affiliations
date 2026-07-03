import { Resend } from "resend";

export const NOREPLY_FALLBACK = "noreply@accg.be";

/**
 * Point d'entrée unique pour tous les envois Resend de l'application.
 * Règle obligatoire : les destinataires réels passent toujours en CCI (bcc)
 * via sendIsolatedEmail — jamais en « À » ou « Cc » visibles entre eux.
 */

export function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY manquante");
  return new Resend(apiKey);
}

export function getFromEmail(): string {
  return process.env.RESEND_FROM_EMAIL ?? NOREPLY_FALLBACK;
}

/** Déduplique, normalise et retire l'adresse expéditrice des destinataires CCI. */
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
  /** Destinataires réels — seront placés en CCI, jamais en « À » ou « Cc ». */
  bcc: string[];
  subject: string;
  html: string;
  attachments?: { filename: string; content: Buffer }[];
}

/**
 * Envoie un e-mail où chaque destinataire est en CCI : personne ne voit les autres.
 * L'adresse expéditrice sert de destinataire technique visible (champ « À »).
 */
export async function sendIsolatedEmail(
  resend: Resend,
  { bcc, subject, html, attachments }: IsolatedEmailOptions
) {
  const from = getFromEmail();
  const recipients = uniqueRecipients(from, ...bcc);

  if (recipients.length === 0) {
    throw new Error("Aucun destinataire.");
  }

  return resend.emails.send({
    from,
    to: [from],
    bcc: recipients,
    subject,
    html,
    attachments,
  });
}
