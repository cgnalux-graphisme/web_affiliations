import type { TableCPAnciennete } from "./types";

/**
 * Source: ONEM, "Règles dérogatoires par rapport aux délais de préavis
 * avant 2014" (fiche CP 105), recoupé avec le PDF SPF Emploi (AR 26/01/2012,
 * MB 13/02/2012). Le régime antérieur (avant le 13/02/2012, AR 09/07/2001)
 * n'est pas encodé : seul le régime en vigueur au 31/12/2013 (date du gel
 * légal) détermine la Partie 1 — voir commentaire sur
 * `RegimeParDateEmbauche` dans types.ts.
 *
 * Barème gradué par ancienneté acquise au 31/12/2013.
 */
export const cp10500MetauxNonFerreux: TableCPAnciennete = {
  cp: "105.00",
  nom: "Métaux non-ferreux",
  regimes: [
    {
      depuisEmbauche: "1900-01-01",
      paliersEmployeur: [
        { moisMin: 0, jours: 28 },
        { moisMin: 6, jours: 40 },
        { moisMin: 60, jours: 48 },
        { moisMin: 120, jours: 70 },
        { moisMin: 180, jours: 97 },
        { moisMin: 240, jours: 140 },
        { moisMin: 300, jours: 175 },
      ],
      paliersDemission: [
        { moisMin: 0, jours: 14 },
        { moisMin: 6, jours: 14 },
        { moisMin: 60, jours: 14 },
        { moisMin: 120, jours: 14 },
        { moisMin: 180, jours: 21 },
        { moisMin: 240, jours: 28 },
        { moisMin: 300, jours: 42 },
      ],
    },
  ],
};
