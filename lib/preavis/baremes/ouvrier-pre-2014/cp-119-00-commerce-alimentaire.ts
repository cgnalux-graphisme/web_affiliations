import type { TableCPAnciennete } from "./types";

/**
 * Source: ONEM, "Règles dérogatoires par rapport aux délais de préavis
 * avant 2014" (fiche CP 119), régime en vigueur au 31/12/2013
 * (AR 04/03/2012, MB 16/03/2012) — le régime antérieur au 16/03/2012 n'est
 * pas encodé (seul le régime en vigueur au 31/12/2013 détermine la
 * Partie 1).
 *
 * Démission volontairement absente (`paliersDemission: null`) : la source
 * ONEM indique "régime légal" pour la démission, mais cette mention
 * n'apparaît explicitement que sur la première ligne du tableau extrait
 * (probable artefact d'extraction d'une cellule fusionnée) — impossible de
 * confirmer avec certitude qu'elle s'applique à tous les paliers. Plutôt
 * que de deviner, le moteur doit signaler cette CP comme non sourcée côté
 * démission (voir `avertissementNonSource`).
 *
 * Barème gradué par ancienneté acquise au 31/12/2013.
 */
export const cp11900CommerceAlimentaire: TableCPAnciennete = {
  cp: "119.00",
  nom: "Commerce alimentaire",
  regimes: [
    {
      depuisEmbauche: "1900-01-01",
      paliersEmployeur: [
        { moisMin: 0, jours: 35 },
        { moisMin: 6, jours: 42 },
        { moisMin: 60, jours: 56 },
        { moisMin: 120, jours: 77 },
        { moisMin: 180, jours: 105 },
        { moisMin: 240, jours: 142 },
        { moisMin: 300, jours: 175 },
      ],
      paliersDemission: null,
    },
  ],
};
