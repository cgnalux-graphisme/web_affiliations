import type { ContenuInformatif } from "./types";

/**
 * Contenu informatif sur les allocations de chômage après une démission
 * ("chômage volontaire"), écrit en langage simple (design spec §8, §12.3).
 *
 * Source : réforme ONEM du 1er mars 2026 ("droit au rebond"). Les chiffres
 * exacts (durée précise de suspension, liste complète des motifs
 * légitimes) n'ont pas été confirmés sur une source primaire — à faire
 * relire par le secrétariat juridique FGTB avant mise en production
 * (voir design spec §12.3).
 */
export const contenuOnemSanctions: ContenuInformatif = {
  derniereVerification: "2026-08-25",
  sections: [
    {
      titre: "Qu'est-ce qui se passe si vous démissionnez ?",
      phrases: [
        "Si vous démissionnez, l'ONEM peut refuser de vous payer des allocations de chômage.",
        "On appelle cela une sanction pour « chômage volontaire ».",
        "Une nouvelle règle existe depuis le 1er mars 2026. Elle s'appelle le « droit au rebond ».",
        "Avec cette nouvelle règle, démissionner n'entraîne plus toujours un refus complet des allocations.",
      ],
    },
    {
      titre: "À quelles conditions pouvez-vous toucher des allocations ?",
      phrases: [
        "Il faut avoir travaillé pendant longtemps : environ 10 ans de carrière.",
        "Si vous remplissez cette condition, vous pouvez recevoir des allocations pendant 6 mois maximum après votre démission.",
      ],
    },
    {
      titre: "Et si vous n'avez pas assez d'ancienneté, ou si votre raison de démissionner n'est pas acceptée ?",
      phrases: [
        "L'ONEM peut alors suspendre vos allocations pendant plusieurs semaines (environ 8 à 9 semaines).",
        "Après cette suspension, vous pouvez recevoir vos allocations normalement.",
      ],
    },
  ],
  pointsCles: [
    "Démissionner ne veut plus dire perdre automatiquement tout droit aux allocations.",
    "Les règles exactes dépendent de votre situation personnelle (ancienneté, motif de la démission).",
    "Les chiffres précis (durée de suspension, conditions détaillées) peuvent varier selon votre dossier.",
    "Contactez votre secrétariat FGTB avant de démissionner, surtout si vous pensez avoir besoin d'allocations de chômage.",
  ],
  avertissement:
    "Ces règles ont changé en 2026 et peuvent encore évoluer. Ce texte donne une explication simple, pas un calcul exact de vos droits. Pour connaître votre situation, contactez votre secrétariat FGTB avant de démissionner.",
};
