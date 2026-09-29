/**
 * Formulaire de contact (/contact) : limites et validation, partagées par le navigateur et la route
 * /api/contact. Fichier sans dépendance, importable côté client.
 * Rien n'est enregistré en base : le message part par e-mail (Resend) vers l'adresse générale.
 */

export const CONTACT_LIMITES = {
  nom: { min: 2, max: 100 },
  email: { max: 254 },
  sujet: { min: 3, max: 150 },
  message: { min: 10, max: 5000 },
} as const;

/** Champ piège caché : un visiteur ne le voit pas, un robot le remplit. Rempli → message ignoré sans le dire. */
export const CHAMP_PIEGE = "site_web";

export type ChampContact = "nom" | "email" | "sujet" | "message";
export type MessageContact = Record<ChampContact, string>;
export type ErreursContact = Partial<Record<ChampContact, string>>;

// Volontairement simple : une arobase, un point dans le domaine, ni espace ni retour à la ligne.
const EMAIL = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;

/** Espaces en trop retirés ; retours à la ligne gardés seulement dans le message. */
export function nettoyerContact(brut: Partial<Record<ChampContact, unknown>>): MessageContact {
  const ligne = (v: unknown) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "");
  const texte = typeof brut.message === "string" ? brut.message.replace(/\r\n?/g, "\n").trim() : "";
  return {
    nom: ligne(brut.nom),
    email: ligne(brut.email).toLowerCase(),
    sujet: ligne(brut.sujet),
    message: texte.replace(/\n{3,}/g, "\n\n"),
  };
}

export function validerContact(m: MessageContact): ErreursContact {
  const e: ErreursContact = {};
  const L = CONTACT_LIMITES;

  if (!m.nom) e.nom = "Indiquez votre nom.";
  else if (m.nom.length < L.nom.min) e.nom = "Votre nom semble trop court.";
  else if (m.nom.length > L.nom.max) e.nom = `${L.nom.max} caractères au maximum.`;

  if (!m.email) e.email = "Indiquez votre adresse e-mail : c'est là que nous vous répondrons.";
  else if (m.email.length > L.email.max || !EMAIL.test(m.email)) e.email = "Cette adresse e-mail n'est pas valide (exemple : prenom.nom@exemple.be).";

  if (!m.sujet) e.sujet = "Indiquez le sujet de votre message.";
  else if (m.sujet.length < L.sujet.min) e.sujet = "Le sujet est trop court.";
  else if (m.sujet.length > L.sujet.max) e.sujet = `${L.sujet.max} caractères au maximum.`;

  if (!m.message) e.message = "Écrivez votre message.";
  else if (m.message.length < L.message.min) e.message = `Votre message est trop court (${L.message.min} caractères au minimum).`;
  else if (m.message.length > L.message.max) e.message = `${L.message.max} caractères au maximum.`;

  return e;
}
