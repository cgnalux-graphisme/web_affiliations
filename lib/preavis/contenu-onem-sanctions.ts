import type { ContenuInformatif } from "./types";

/**
 * Contenu informatif sur les allocations de chômage après une démission
 * ("chômage volontaire"), écrit en langage simple (design spec §8, §12.3).
 *
 * Structure voulue par la Centrale Générale FGTB Namur-Luxembourg (analyse du
 * support interne "Récap démission", 2026-08-27) : d'abord la règle de base
 * et les stratégies d'évitement telles que décrites dans ce support, puis un
 * encart séparé sur la nouveauté 2026 ("droit au rebond"), dont les chiffres
 * exacts n'ont pas été confirmés sur une source primaire — à faire relire par
 * le secrétariat juridique FGTB avant mise en production (voir design spec
 * §12.3). Dans les deux cas, le message central reste : contacter le
 * secrétariat FGTB AVANT de démissionner pour faire vérifier sa situation.
 */
export const contenuOnemSanctions: ContenuInformatif = {
  derniereVerification: "2026-08-27",
  sections: [
    {
      titre: "Qu'est-ce qui se passe si vous démissionnez ?",
      phrases: [
        "Si vous démissionnez, l'ONEM peut considérer que vous avez abandonné votre emploi volontairement.",
        "Dans ce cas, l'ONEM peut suspendre votre droit aux allocations de chômage.",
        "Cette suspension peut durer longtemps : jusqu'à 1 an.",
      ],
    },
    {
      titre: "Comment prévenir cette sanction ?",
      phrases: [
        "1. Trouvez un nouvel emploi qui commence tout de suite après votre préavis, sans passer par le chômage entre les deux.",
        "Ce nouvel emploi doit durer au moins 13 semaines d'affilée.",
        "2. Prouvez que vous aviez une bonne raison de démissionner.",
        "Par exemple : harcèlement, salaire non payé, conditions de travail abusives, intervention syndicale, ou problème de santé avec certificat médical.",
        "3. Demandez à l'avance à l'ONEM ce qu'il décidera dans votre situation précise : c'est le « ruling ».",
        "Voir plus bas la section sur le ruling ONEM pour plus de détails.",
      ],
    },
    {
      titre: "Nouveauté 2026 : le « droit au rebond »",
      phrases: [
        "Depuis le 1er mars 2026, une nouvelle règle appelée « droit au rebond » existe en plus de ce qui précède.",
        "Elle pourrait, sous certaines conditions, améliorer votre situation après une démission.",
        "Il faut environ 10 ans de carrière pour en bénéficier.",
        "Cette règle est très récente et ses détails précis ne sont pas encore totalement stabilisés.",
      ],
    },
  ],
  pointsCles: [
    "Une démission peut entraîner une suspension de vos allocations de chômage pouvant atteindre 1 an.",
    "Il existe des moyens concrets de prévenir cette sanction : nouvel emploi immédiat, motif légitime prouvé, ou ruling ONEM demandé à l'avance.",
    "La nouvelle règle 2026 (« droit au rebond ») peut, dans certains cas, améliorer votre situation — mais elle doit être vérifiée au cas par cas.",
    "Contactez votre secrétariat FGTB AVANT de donner votre démission, pour faire vérifier votre situation précise et éviter une mauvaise surprise avec l'ONEM.",
  ],
  avertissement:
    "Ce texte donne une explication simple, pas un calcul exact de vos droits. Les règles ONEM (dont le « droit au rebond », très récent) peuvent encore évoluer. Contactez votre secrétariat FGTB avant de démissionner pour faire vérifier votre situation.",
};
