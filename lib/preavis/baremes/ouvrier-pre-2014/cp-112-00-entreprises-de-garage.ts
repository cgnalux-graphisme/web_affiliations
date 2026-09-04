import type { TableCPAnciennete } from "./types";

/**
 * Source: ONEM, "Règles dérogatoires par rapport aux délais de préavis
 * avant 2014" (fiche CP 112), recoupé avec le PDF SPF Emploi
 * (AR 02/12/2011 + AR 26/01/2012, MB 16/12/2011 / 13/02/2012). Régime
 * unique en vigueur au 31/12/2013 (aucune période antérieure documentée
 * par l'ONEM pour cette CP).
 *
 * Barème gradué par ancienneté acquise au 31/12/2013.
 */
export const cp11200EntreprisesDeGarage: TableCPAnciennete = {
  cp: "112.00",
  nom: "Entreprises de garage",
  regimes: [
    {
      depuisEmbauche: "1900-01-01",
      paliersEmployeur: [
        { moisMin: 0, jours: 40 },
        { moisMin: 60, jours: 48 },
        { moisMin: 120, jours: 77 },
        { moisMin: 180, jours: 112 },
        { moisMin: 240, jours: 147 },
        { moisMin: 300, jours: 154 },
      ],
      paliersDemission: [
        { moisMin: 0, jours: 14 },
        { moisMin: 60, jours: 14 },
        { moisMin: 120, jours: 21 },
        { moisMin: 180, jours: 21 },
        { moisMin: 240, jours: 28 },
        { moisMin: 300, jours: 28 },
      ],
    },
  ],
};
