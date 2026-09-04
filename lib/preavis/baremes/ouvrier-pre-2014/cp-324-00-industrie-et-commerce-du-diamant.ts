import type { TableCPAnciennete } from "./types";

/**
 * Source: SPF Emploi, PDF "Délais de préavis CP 324" au 31/12/2013,
 * recoupé avec ONEM "Règles dérogatoires" (mêmes valeurs). L'ONEM indique
 * explicitement "Date de fin : indéterminée" pour ce régime — aucune
 * échéance 01/01/2018 trouvée (un article Easypay mentionnant cette date
 * n'a pas pu être vérifié directement ; l'ONEM ne la corrobore pas).
 *
 * Ce secteur déroge par DATE DE DÉBUT DU CONTRAT DE TRAVAIL (contrats
 * débutés avant/à partir du 01/01/2012), d'où deux régimes ci-dessous :
 * - avant le 01/01/2012 (AR 03/05/1958, MB 14/05/1958, valeurs reprises
 *   telles quelles par l'AR 12/11/2012)
 * - à partir du 01/01/2012 (AR 12/11/2012, MB 05/12/2012) — seul le
 *   palier "< 10 ans" est documenté pour cette cohorte, les paliers
 *   supérieurs n'étant pas atteignables (ancienneté maximale ~2 ans au
 *   31/12/2013).
 *
 * Démission : 2 jours ouvrables, constante quel que soit le palier
 * d'ancienneté, dans les deux régimes.
 *
 * Barème gradué par ancienneté acquise au 31/12/2013.
 */
export const cp32400IndustrieEtCommerceDuDiamant: TableCPAnciennete = {
  cp: "324.00",
  nom: "Industrie et commerce du diamant",
  regimes: [
    {
      depuisEmbauche: "1900-01-01",
      paliersEmployeur: [
        { moisMin: 0, jours: 7 },
        { moisMin: 120, jours: 14 },
        { moisMin: 240, jours: 28 },
      ],
      paliersDemission: [{ moisMin: 0, jours: 2 }],
    },
    {
      depuisEmbauche: "2012-01-01",
      paliersEmployeur: [{ moisMin: 0, jours: 8 }],
      paliersDemission: [{ moisMin: 0, jours: 2 }],
    },
  ],
};
