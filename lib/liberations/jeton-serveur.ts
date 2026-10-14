import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Jetons de la page publique du QR code (lot 3). SERVEUR UNIQUEMENT.
 * - jeton du QR : 24 octets aléatoires (non devinables), stockés sur le dossier ;
 * - « passe » : preuve signée (HMAC) qu'un participant a donné le bon n° de registre national, valable 30 minutes,
 *   pour enregistrer sa présence puis ses tickets sans redemander le numéro ;
 * - empreinte : l'adresse IP n'est jamais gardée, seulement une empreinte salée (limite des essais).
 * La clé de signature est dérivée de SUPABASE_SERVICE_ROLE_KEY (jamais envoyée au navigateur).
 */

function cle(): Buffer {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("SUPABASE_SERVICE_ROLE_KEY manquante");
  return createHmac("sha256", secret).update("liberations-presence-v1").digest();
}

export function nouveauJetonQr(): string {
  return randomBytes(24).toString("base64url");
}

export const JETON_QR = /^[A-Za-z0-9_-]{32}$/;

export type Passe = { dossier: string; date: string; participant: string | null; presence?: string; exp: number };

export function signerPasse(p: Omit<Passe, "exp">, dureeMinutes = 30): string {
  const corps = Buffer.from(JSON.stringify({ ...p, exp: Date.now() + dureeMinutes * 60_000 })).toString("base64url");
  const sig = createHmac("sha256", cle()).update(corps).digest("base64url");
  return `${corps}.${sig}`;
}

export function lirePasse(passe: string | null | undefined): Passe | null {
  if (!passe || passe.length > 1000) return null;
  const [corps, sig] = passe.split(".");
  if (!corps || !sig) return null;
  const attendue = createHmac("sha256", cle()).update(corps).digest();
  const recue = Buffer.from(sig, "base64url");
  if (recue.length !== attendue.length || !timingSafeEqual(recue, attendue)) return null;
  try {
    const p = JSON.parse(Buffer.from(corps, "base64url").toString()) as Passe;
    return typeof p.exp === "number" && p.exp > Date.now() ? p : null;
  } catch {
    return null;
  }
}

export function empreinteAppareil(ip: string): string {
  return createHash("sha256").update(cle()).update(ip).digest("base64url").slice(0, 32);
}
