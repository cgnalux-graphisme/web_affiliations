import type { TableCPAnciennete } from "./types";

/**
 * Source: SPF Emploi, PDF "Délais de préavis CP 317" au 31/12/2013
 * (AR 02/12/2011, MB 16/12/2011), recoupé avec ONEM "Règles dérogatoires"
 * (mêmes valeurs, "Date de fin : indéterminée"). Régime unique (pas de
 * distinction contrats avant/à partir du 01/01/2012).
 *
 * Barème gradué par ancienneté acquise au 31/12/2013.
 */
export const cp31700ServicesDeGardiennageEtOuDeSurveillance: TableCPAnciennete = {
  cp: "317.00",
  nom: "Services de gardiennage et/ou de surveillance",
  regimes: [
    {
      depuisEmbauche: "1900-01-01",
      paliersEmployeur: [
        { moisMin: 0, jours: 7 },
        { moisMin: 6, jours: 40 },
        { moisMin: 60, jours: 48 },
        { moisMin: 120, jours: 72 },
        { moisMin: 180, jours: 97 },
        { moisMin: 240, jours: 129 },
      ],
      paliersDemission: [
        { moisMin: 0, jours: 3 },
        { moisMin: 6, jours: 14 },
        { moisMin: 60, jours: 14 },
        { moisMin: 120, jours: 14 },
        { moisMin: 180, jours: 14 },
        { moisMin: 240, jours: 28 },
      ],
    },
  ],
};
