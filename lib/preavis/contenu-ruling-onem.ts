import type { ContenuInformatif } from "./types";

/**
 * Contenu informatif sur la démarche de « ruling » ONEM : demander à
 * l'avance à l'ONEM ce qu'il décidera dans une situation précise, avant de
 * démissionner. Basé sur le formulaire officiel ONEM « Demande d'avis de
 * l'ONEM par ruling » (version 14.10.2016/830.10.000), reproduit dans le
 * support interne "Récap démission" de la Centrale Générale FGTB
 * Namur-Luxembourg (2026-08-27). Contenu purement informatif : le module ne
 * génère pas ce formulaire, il explique la démarche et oriente vers le
 * secrétariat FGTB.
 */
export const contenuRulingOnem: ContenuInformatif = {
  derniereVerification: "2026-08-27",
  sections: [
    {
      titre: "Qu'est-ce que le « ruling » ONEM ?",
      phrases: [
        "Le « ruling » permet de demander à l'ONEM, à l'avance, ce qu'il décidera dans votre situation précise.",
        "Cela vous permet de savoir avant de démissionner si vous risquez une suspension de vos allocations de chômage.",
        "Votre demande doit concerner une situation concrète qui ne s'est pas encore produite.",
        "Si les faits se déroulent exactement comme vous les avez décrits, l'ONEM est lié par sa réponse écrite.",
        "Cela suppose aussi que la réglementation n'ait pas changé entre-temps.",
      ],
    },
    {
      titre: "Comment faire une demande de ruling ?",
      phrases: [
        "Vous remplissez le formulaire officiel « Demande d'avis de l'ONEM par ruling ».",
        "Il est conseillé de joindre un maximum de pièces justificatives : contrat de travail, promesse d'embauche, lettre de préavis, etc.",
        "Vous remettez le formulaire complété à votre organisme de paiement (par exemple la FGTB) ou directement au bureau de l'ONEM.",
        "L'ONEM envoie en principe sa décision dans un délai de deux semaines.",
      ],
      lien: {
        texte: "Télécharger le formulaire officiel ONEM (PDF)",
        url: "https://www.onem.be/file/cc73d96153bbd5448a56f19d925d05b1379c7f21/70cf8f4ba22c569dc65c187710f4a40e95891570/20260604-ruling-fr.pdf",
      },
    },
  ],
  pointsCles: [
    "Le ruling se demande AVANT de démissionner, jamais après.",
    "Il ne fonctionne que pour une situation concrète et précise, pas pour une question générale.",
    "Votre secrétariat FGTB peut vous aider à remplir le formulaire et à l'introduire.",
  ],
  avertissement:
    "Le ruling n'est utile que pour certaines situations précises (par exemple la sanction elle-même en cas d'infraction ne peut pas en faire l'objet). Contactez votre secrétariat FGTB pour savoir si cette démarche s'applique à votre cas avant de démissionner.",
};
