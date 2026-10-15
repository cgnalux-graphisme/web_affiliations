import { gabaritEmail, liste, paragraphe, signature, type EmailRendu } from "./emails/gabarit";

/**
 * E-mails des formulaires ONEM (C1, C3.2, parcours de transfert) et de l'envoi des formulaires à soi-même,
 * dans le gabarit commun (lib/emails/gabarit.ts). Textes repris tels quels le 15/10/2026 (corrections à venir).
 * `adminEmail` est gardé dans les paramètres pour les routes ; le pied de page commun porte l'adresse de contact.
 */

type Declarant = { nom: string; prenom: string; email: string; adminEmail: string };

const SIGNATURE_FORMULAIRE = signature({ nom: "Le formulaire en ligne" });

function formulaireRecu(o: { etiquette: string; titre: string; intro: string; description: string; p: Declarant; raison: string }): EmailRendu {
  const nom = `${o.p.prenom} ${o.p.nom}`;
  return gabaritEmail({
    etiquette: o.etiquette,
    titre: o.titre,
    apercu: `${o.intro} ${nom}. Documents en pièce jointe.`,
    blocs: [
      paragraphe(`${o.intro} ${nom}`, { gras: [nom] }),
      paragraphe(o.description),
      ...(o.p.email ? [paragraphe(`Adresse e-mail du déclarant : ${o.p.email}`)] : []),
      SIGNATURE_FORMULAIRE,
    ],
    raison: o.raison,
  });
}

export function buildC1Html(p: Declarant): EmailRendu {
  return formulaireRecu({
    etiquette: "Service chômage",
    titre: "Formulaire C1",
    intro: "Nouveau formulaire C1 reçu de",
    description:
      "Un formulaire C1 (Déclaration de situation personnelle et familiale — ONEM) a été complété et signé en ligne. Le document rempli est joint en pièce jointe.",
    p,
    raison: "Message envoyé quand un formulaire C1 est transmis au service chômage depuis notre site.",
  });
}

export function buildC32Html(p: Declarant): EmailRendu {
  return formulaireRecu({
    etiquette: "Service chômage",
    titre: "Formulaire C3.2",
    intro: "Nouveau formulaire C3.2 reçu de",
    description:
      "Un formulaire C3.2 (Demande d'allocations de chômage temporaire — ONEM) a été complété et signé en ligne. Le document rempli est joint en pièce jointe.",
    p,
    raison: "Message envoyé quand un formulaire C3.2 est transmis au service chômage depuis notre site.",
  });
}

export function buildOnemBundleHtml(p: Declarant): EmailRendu {
  return formulaireRecu({
    etiquette: "Service chômage",
    titre: "Formulaires C1 et C3.2",
    intro: "Nouveaux formulaires ONEM reçus de",
    description:
      "Les formulaires C1 (déclaration de situation personnelle et familiale) et C3.2 (demande d'allocations de chômage temporaire) ont été complétés et signés en ligne dans le cadre d'un parcours de transfert syndical. Les deux documents remplis sont joints à ce message.",
    p,
    raison: "Message envoyé à la fin d'un parcours de transfert syndical sur notre site.",
  });
}

/** Message envoyé uniquement à l'adresse saisie par la personne. */
export function buildLivraisonPersonnelleHtml(p: {
  nom: string;
  prenom: string;
  emailDeclarant: string;
  documents: string[];
  adminEmail: string;
}): EmailRendu {
  const nom = `${p.prenom} ${p.nom}`;
  return gabaritEmail({
    etiquette: "Vos formulaires",
    titre: "Formulaires remplis",
    apercu: `Formulaires remplis de ${nom}, en pièce jointe.`,
    blocs: [
      paragraphe(`Formulaires remplis de ${nom}`, { gras: [nom] }),
      paragraphe("La personne vous envoie les formulaires qu'elle a complétés en ligne. Les documents sont joints à ce message."),
      ...(p.documents.length ? [liste(p.documents)] : []),
      ...(p.emailDeclarant ? [paragraphe(`Adresse e-mail de la personne : ${p.emailDeclarant}`)] : []),
      SIGNATURE_FORMULAIRE,
    ],
    raison: "Vous recevez ce message parce que vos formulaires remplis ont été envoyés à cette adresse depuis notre site.",
  });
}
