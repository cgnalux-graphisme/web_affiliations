import type { MessageContact } from "./contact";
import { encadre, gabaritEmail, paragraphe, recapitulatif, type EmailRendu } from "./emails/gabarit";

/** Objet de l'e-mail reçu par la centrale. */
export function sujetContact(m: MessageContact): string {
  return `Contact site — ${m.sujet}`.slice(0, 200);
}

/** Corps de l'e-mail reçu par la centrale (tout le texte du visiteur est échappé par le gabarit). */
export function htmlContact(m: MessageContact, recuLe: string): EmailRendu {
  return gabaritEmail({
    etiquette: "Formulaire de contact",
    titre: m.sujet,
    apercu: `Message de ${m.nom} reçu le ${recuLe}.`,
    blocs: [
      recapitulatif([
        ["Nom", m.nom],
        ["E-mail", m.email],
        ["Reçu le", recuLe],
      ]),
      encadre("Message", m.message),
      paragraphe(`Pour répondre, utilisez simplement « Répondre » : la réponse part vers ${m.email}.`, { petit: true }),
    ],
    raison: "Message envoyé depuis la page Contact du site à l'adresse générale de la Centrale.",
  });
}
