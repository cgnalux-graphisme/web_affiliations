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

/** Nom affiché comme expéditeur (une adresse seule fait plus « robot » aux yeux des filtres anti-spam). */
export const NOM_EXPEDITEUR = "Centrale Générale FGTB Namur-Luxembourg";
/** Réponse par défaut : l'administration (plus de « merci de ne pas répondre »). */
export const REPONSE_PAR_DEFAUT = "admin.nalux@accg.be";

/** E-mail rendu (gabarit commun) → champs « html » et « text » de Resend. */
export function versResend(e: { html: string; texte: string }): { html: string; text: string } {
  return { html: e.html, text: e.texte };
}

/** Adresse seule, extraite de « Nom <adresse> » si besoin. */
export function adresseSeule(expediteur: string): string {
  return (expediteur.match(/<([^>]+)>/)?.[1] ?? expediteur).trim();
}

/** Expéditeur complet : « Centrale Générale FGTB Namur-Luxembourg <adresse> » (garde un nom déjà fourni). */
export function getExpediteur(): string {
  const brut = getFromEmail();
  return brut.includes("<") ? brut : `${NOM_EXPEDITEUR} <${brut}>`;
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

export type ResultatEnvoi = { to: string; id: string | null; erreur: string | null };

interface IsolatedEmailOptions {
  /** Destinataires — chacun reçoit son propre e-mail, seul en « À ». */
  recipients: string[];
  subject: string;
  /** HTML seul, ou e-mail rendu par le gabarit commun (HTML + version texte, lib/emails/gabarit.ts). */
  html: string | { html: string; texte: string };
  /** Version texte (lib/emails/gabarit.ts) : toujours jointe au HTML, les filtres anti-spam s'en méfient sinon. */
  text?: string;
  attachments?: { filename: string; content: Buffer }[];
  /** Adresse de réponse (ex. le correspondant d'un dossier de libération) ; par défaut l'administration. */
  replyTo?: string;
}

/**
 * Envoie le même contenu à chaque destinataire via un e-mail individuel.
 * Isolation totale : aucun Cc/Cci, chaque personne ne voit que sa propre adresse.
 */
export async function sendIsolatedEmail(
  resend: Resend,
  { recipients, subject, html: contenu, text: texteFourni, attachments, replyTo }: IsolatedEmailOptions
) {
  const html = typeof contenu === "string" ? contenu : contenu.html;
  const text = texteFourni ?? (typeof contenu === "string" ? undefined : contenu.texte);
  const from = getExpediteur();
  const toList = uniqueRecipients(adresseSeule(from), ...recipients);

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
        ...(text ? { text } : {}),
        attachments,
        replyTo: replyTo ?? REPONSE_PAR_DEFAUT,
      })
    )
  );

  // Résultat par destinataire (historique des envois, lib/envois-serveur.ts).
  const envois: ResultatEnvoi[] = results.map((r, i) => ({
    to: toList[i],
    id: r.data?.id ?? null,
    erreur: r.error ? r.error.message || r.error.name || "Échec" : null,
  }));

  const failed = results.find((r) => r.error);
  if (failed?.error) {
    console.error(
      "[sendIsolatedEmail] Échec d'envoi :",
      results.filter((r) => r.error).map((r) => r.error)
    );
    return { data: null, error: failed.error, envois };
  }

  return { data: results[0]?.data ?? null, error: null, envois };
}
