import type { TableCPAnciennete } from "./types";

/**
 * Source: ONEM, "Règles dérogatoires par rapport aux délais de préavis
 * avant 2014" (fiche SCP 149.03), recoupé avec le PDF SPF Emploi
 * (AR 01/09/2012, MB 18/09/2012). Régime en vigueur au 31/12/2013 ; le
 * régime antérieur (exprimé en semaines, AR 22/06/2003) n'est pas encodé.
 *
 * Barème gradué par ancienneté acquise au 31/12/2013.
 */
export const cp14903MetauxPrecieux: TableCPAnciennete = {
  cp: "149.03",
  nom: "Métaux précieux",
  regimes: [
    {
      depuisEmbauche: "1900-01-01",
      paliersEmployeur: [
        { moisMin: 0, jours: 28 },
        { moisMin: 6, jours: 40 },
        { moisMin: 60, jours: 48 },
        { moisMin: 120, jours: 70 },
        { moisMin: 180, jours: 98 },
        { moisMin: 240, jours: 129 },
        { moisMin: 300, jours: 154 },
        { moisMin: 360, jours: 182 },
      ],
      paliersDemission: [
        { moisMin: 0, jours: 14 },
        { moisMin: 6, jours: 14 },
        { moisMin: 60, jours: 14 },
        { moisMin: 120, jours: 28 },
        { moisMin: 180, jours: 28 },
        { moisMin: 240, jours: 28 },
        { moisMin: 300, jours: 28 },
        { moisMin: 360, jours: 28 },
      ],
    },
  ],
};
