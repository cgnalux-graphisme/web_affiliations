import type { ContenuInformatif, QuiRompt } from "./types";

/**
 * Contenu informatif sur les façons valables de notifier un préavis
 * (design spec §6, §8), écrit en langage simple. Le contenu diffère selon
 * qui rompt le contrat : le travailleur peut remettre la lettre en main
 * propre, l'employeur ne le peut plus depuis la réforme (recommandé ou
 * huissier uniquement).
 */
export function contenuProceduresEnvoi(quiRompt: QuiRompt): ContenuInformatif {
  if (quiRompt === "travailleur") {
    return {
      derniereVerification: "2026-08-25",
      sections: [
        {
          titre: "Comment envoyer votre lettre de démission ?",
          phrases: [
            "Il existe 2 façons valables de prévenir votre employeur par écrit.",
            "1. La remise en main propre : vous donnez vous-même la lettre à votre employeur.",
            "Votre employeur signe alors un double de la lettre pour dire qu'il l'a bien reçue (un « accusé de réception »).",
            "Dans ce cas, votre préavis commence le premier jour ouvrable qui suit.",
            "2. Le courrier recommandé : vous envoyez la lettre à la poste, en recommandé.",
            "Dans ce cas, votre préavis ne commence pas tout de suite : il démarre le premier lundi après le 3e jour ouvrable qui suit l'envoi.",
          ],
        },
        {
          titre: "Attention à la lettre simple",
          phrases: [
            "Une lettre simple, envoyée par la poste normale (sans recommandé), n'est pas valable pour démissionner.",
            "Vous n'auriez aucune preuve que votre employeur l'a reçue, ni à quelle date.",
            "Utilisez toujours la remise en main propre (avec accusé de réception) ou le recommandé.",
            "Ne prévenez jamais votre employeur seulement à l'oral, par mail ou par SMS : ce n'est pas valable pour démissionner.",
          ],
        },
      ],
      pointsCles: [
        "2 façons valables : remise en main propre avec accusé de réception, ou courrier recommandé.",
        "La remise en main propre fait effet tout de suite ; le recommandé fait effet quelques jours plus tard.",
        "Une lettre simple, un appel, un mail ou un SMS ne suffisent jamais.",
      ],
      avertissement:
        "Ce texte explique les règles générales. En cas de doute sur votre situation, contactez votre secrétariat FGTB avant d'envoyer votre lettre.",
    };
  }

  return {
    derniereVerification: "2026-08-25",
    sections: [
      {
        titre: "Comment votre employeur doit-il vous informer de votre licenciement ?",
        phrases: [
          "Depuis une réforme récente, votre employeur ne peut plus vous remettre la lettre de licenciement en main propre.",
          "Il doit utiliser l'une de ces 2 façons.",
          "1. Le courrier recommandé : votre préavis démarre le premier lundi après le 3e jour ouvrable qui suit l'envoi.",
          "2. Un exploit d'huissier de justice : un huissier vous remet officiellement le document, et votre préavis commence immédiatement.",
        ],
      },
      {
        titre: "Si votre employeur ne respecte pas ces règles",
        phrases: [
          "Si votre employeur vous a remis une lettre en main propre, cette notification pourrait ne pas être valable.",
          "Contactez votre secrétariat FGTB pour vérifier votre situation.",
        ],
      },
    ],
    pointsCles: [
      "2 façons valables pour l'employeur : courrier recommandé, ou exploit d'huissier de justice.",
      "La remise en main propre par l'employeur n'est plus valable.",
      "En cas de doute sur la façon dont vous avez été prévenu, contactez votre secrétariat FGTB.",
    ],
    avertissement:
      "Ce texte explique les règles générales. En cas de doute sur votre situation, contactez votre secrétariat FGTB.",
  };
}
