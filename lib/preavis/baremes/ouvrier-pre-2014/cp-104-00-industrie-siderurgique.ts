import type { TableCPAnciennete } from "./types";

/**
 * Source: SPF Emploi, PDF "Délais de préavis CP 104" au 31/12/2013
 * (AR 26/01/2012, MB 13/02/2012). Non recoupé sur la fiche ONEM "Règles
 * dérogatoires" (aucun accordéon préavis présent pour cette CP lors de la
 * recherche du 2026-09-04) — confiance moindre que les autres tables de ce
 * fichier, toutes cross-validées ONEM + AR.
 *
 * Barème gradué par ancienneté acquise au 31/12/2013 (mécanisme différent
 * des tables `TableCP` par date d'embauche — voir commentaire sur
 * `RegimeParDateEmbauche` dans types.ts). Un seul régime documenté.
 */
export const cp10400IndustrieSiderurgique: TableCPAnciennete = {
  cp: "104.00",
  nom: "Industrie sidérurgique",
  regimes: [
    {
      depuisEmbauche: "1900-01-01",
      paliersEmployeur: [
        { moisMin: 0, jours: 28 },
        { moisMin: 6, jours: 42 },
        { moisMin: 60, jours: 49 },
        { moisMin: 120, jours: 77 },
        { moisMin: 180, jours: 112 },
        { moisMin: 240, jours: 133 },
        { moisMin: 300, jours: 168 },
      ],
      paliersDemission: [
        { moisMin: 0, jours: 3 },
        { moisMin: 6, jours: 14 },
        { moisMin: 60, jours: 14 },
        { moisMin: 120, jours: 21 },
        { moisMin: 180, jours: 28 },
        { moisMin: 240, jours: 28 },
        { moisMin: 300, jours: 35 },
      ],
    },
  ],
};
