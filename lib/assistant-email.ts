/**
 * E-mail « demande transmise par l'Assistant CG ». Contient SEULEMENT : catégorie, prénom et nom, code postal,
 * commission paritaire, affilié oui / non, résumé, lien vers le back-office et bouton « Répondre » (adresse
 * e-mail de la personne, demande de Fred du 08/10/2026 ; « Répondre à » de l'e-mail pointe aussi vers elle).
 * JAMAIS le numéro de registre national (consultable dans le back-office uniquement).
 */

import { bouton, encadre, gabaritEmail, paragraphe, recapitulatif, type EmailRendu } from "./emails/gabarit";

export type ContenuEmailAssistant = {
  categorie: string;
  prenom: string;
  nom: string;
  codePostal: string;
  region: string;
  commission: string | null;
  affilie: boolean | null;
  resume: string;
  email: string;
  lien: string;
};

export function sujetEmailAssistant(c: ContenuEmailAssistant): string {
  return `Assistant CG : ${c.categorie}, ${c.prenom} ${c.nom}`.replace(/[\r\n]+/g, " ").slice(0, 200);
}

export function htmlEmailAssistant(c: ContenuEmailAssistant): EmailRendu {
  const affilie = c.affilie === null ? "Non précisé" : c.affilie ? "Oui" : "Non";
  // Bouton « Répondre » : ouvre un nouveau message dans Outlook, adressé à la personne, objet prérempli.
  const mailto = `mailto:${encodeURIComponent(c.email)}?subject=${encodeURIComponent(`Votre demande à la Centrale Générale FGTB Namur-Luxembourg (${c.categorie})`)}&body=${encodeURIComponent(`Bonjour ${c.prenom} ${c.nom},

`)}`;
  return gabaritEmail({
    etiquette: "Assistant CG",
    titre: c.categorie,
    apercu: `${c.prenom} ${c.nom} (${c.codePostal} ${c.region}) : ${c.resume}`.slice(0, 140),
    blocs: [
      recapitulatif([
        ["Personne", `${c.prenom} ${c.nom}`],
        ["Code postal", `${c.codePostal} (${c.region})`],
        ["Commission paritaire", c.commission ?? "Non identifiée"],
        ["Affilié(e)", affilie],
      ]),
      encadre("Sa demande", c.resume),
      bouton(`Répondre à ${c.prenom} ${c.nom}`, mailto),
      bouton("Ouvrir dans le back-office", c.lien, true),
      paragraphe(
        `Vous pouvez aussi cliquer « Répondre » dans votre messagerie : la réponse part vers ${c.email}. Le registre national, s'il a été donné, se trouve uniquement dans le back-office.`,
        { petit: true }
      ),
    ],
    raison: "Message envoyé automatiquement par l'Assistant CG du site à l'équipe de la Centrale.",
  });
}
