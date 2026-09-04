import type { TableCPAnciennete } from "./types";

/**
 * Source: ONEM, "Règles dérogatoires par rapport aux délais de préavis
 * avant 2014" (fiche SCP 149.01), recoupé avec le PDF SPF Emploi
 * (AR 22/03/2012, MB 24/04/2012). Régime en vigueur au 31/12/2013 ; le
 * régime antérieur au 24/04/2012 (exprimé en semaines, AR 14/12/2001)
 * n'est pas encodé — seul le régime en vigueur au 31/12/2013 détermine la
 * Partie 1.
 *
 * Barème gradué par ancienneté acquise au 31/12/2013.
 */
export const cp14901ElectriciensInstallationEtDistribution: TableCPAnciennete = {
  cp: "149.01",
  nom: "Électriciens : installation et distribution",
  regimes: [
    {
      depuisEmbauche: "1900-01-01",
      paliersEmployeur: [
        { moisMin: 0, jours: 40 },
        { moisMin: 60, jours: 48 },
        { moisMin: 120, jours: 64 },
        { moisMin: 180, jours: 97 },
        { moisMin: 240, jours: 129 },
      ],
      paliersDemission: [
        { moisMin: 0, jours: 14 },
        { moisMin: 60, jours: 14 },
        { moisMin: 120, jours: 21 },
        { moisMin: 180, jours: 28 },
        { moisMin: 240, jours: 35 },
      ],
    },
  ],
};
