import type { TableCPAnciennete } from "./types";

/**
 * Source: ONEM, "Règles dérogatoires par rapport aux délais de préavis
 * avant 2014" (fiche CP 302), régime en vigueur au 31/12/2013
 * (AR 04/03/2012, MB 16/03/2012) — le régime antérieur au 16/03/2012 n'est
 * pas encodé (seul le régime en vigueur au 31/12/2013 détermine la
 * Partie 1).
 *
 * Au-delà de 27 ans d'ancienneté, l'ONEM indique une formule ouverte
 * ("129 jours + 4 jours par année supplémentaire") plutôt qu'un palier
 * fixe. Reproduite ici en énumérant les paliers année par année jusqu'à
 * 50 ans d'ancienneté (plafond arbitraire choisi par cohérence avec le
 * plafond du barème général post-2014, qui s'arrête à 51 ans — voir
 * general-2014.ts). Au-delà de 50 ans, ce barème sous-estimera légèrement
 * la Partie 1 (dernier palier réutilisé au lieu de continuer à croître) ;
 * cas limite jugé assez rare pour ne pas justifier une formule dédiée.
 *
 * Démission volontairement absente (`paliersDemission: null`) : la source
 * ONEM indique "régime légal" pour la démission au-delà de 12 mois
 * d'ancienneté, avec la même ambiguïté d'extraction que pour la CP 119 —
 * voir ce fichier pour le détail du raisonnement.
 *
 * Barème gradué par ancienneté acquise au 31/12/2013.
 */
export const cp30200IndustrieHoteliereHoreca: TableCPAnciennete = {
  cp: "302.00",
  nom: "Industrie hôtelière (Horeca)",
  regimes: [
    {
      depuisEmbauche: "1900-01-01",
      paliersEmployeur: [
        { moisMin: 0, jours: 7 },
        { moisMin: 12, jours: 40 },
        { moisMin: 60, jours: 48 },
        { moisMin: 120, jours: 64 },
        { moisMin: 180, jours: 97 },
        { moisMin: 240, jours: 129 },
        { moisMin: 336, jours: 133 },
        { moisMin: 348, jours: 137 },
        { moisMin: 360, jours: 141 },
        { moisMin: 372, jours: 145 },
        { moisMin: 384, jours: 149 },
        { moisMin: 396, jours: 153 },
        { moisMin: 408, jours: 157 },
        { moisMin: 420, jours: 161 },
        { moisMin: 432, jours: 165 },
        { moisMin: 444, jours: 169 },
        { moisMin: 456, jours: 173 },
        { moisMin: 468, jours: 177 },
        { moisMin: 480, jours: 181 },
        { moisMin: 492, jours: 185 },
        { moisMin: 504, jours: 189 },
        { moisMin: 516, jours: 193 },
        { moisMin: 528, jours: 197 },
        { moisMin: 540, jours: 201 },
        { moisMin: 552, jours: 205 },
        { moisMin: 564, jours: 209 },
        { moisMin: 576, jours: 213 },
        { moisMin: 588, jours: 217 },
        { moisMin: 600, jours: 221 },
      ],
      paliersDemission: null,
    },
  ],
};
