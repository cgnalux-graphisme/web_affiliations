import type { TableCPAnciennete } from "./types";

/**
 * Source: ONEM, "Règles dérogatoires par rapport aux délais de préavis
 * avant 2014" (fiche CP 118), régime en vigueur depuis le 01/01/2012
 * (AR 04/03/2012, MB 16/03/2012) — aucun régime antérieur mentionné par
 * l'ONEM pour cette CP. Couvre uniquement la catégorie "toutes les
 * entreprises, sauf les petites boulangeries et pâtisseries" : ces
 * dernières ont un second barème légèrement différent (mention "(*)" dans
 * la source), non couvert ici faute de sélecteur dédié dans le formulaire
 * (choix volontaire, pas un oubli).
 *
 * Barème gradué par ancienneté acquise au 31/12/2013, année par année
 * (contrairement aux autres CP de ce fichier, ce secteur n'a pas de
 * paliers pluriannuels au-delà de 9 ans — le nombre de jours change à
 * chaque année d'ancienneté). Démission : constante à 56 jours à partir de
 * 9 ans, donc non ré-encodée au-delà (le dernier palier documenté
 * s'applique par construction jusqu'au palier suivant).
 */
export const cp11800IndustrieAlimentaire: TableCPAnciennete = {
  cp: "118.00",
  nom: "Industrie alimentaire",
  regimes: [
    {
      depuisEmbauche: "1900-01-01",
      paliersEmployeur: [
        { moisMin: 0, jours: 7 },
        { moisMin: 6, jours: 42 },
        { moisMin: 12, jours: 49 },
        { moisMin: 24, jours: 56 },
        { moisMin: 36, jours: 63 },
        { moisMin: 48, jours: 70 },
        { moisMin: 60, jours: 84 },
        { moisMin: 72, jours: 91 },
        { moisMin: 84, jours: 98 },
        { moisMin: 96, jours: 108 },
        { moisMin: 108, jours: 112 },
        { moisMin: 120, jours: 126 },
        { moisMin: 132, jours: 133 },
        { moisMin: 144, jours: 140 },
        { moisMin: 156, jours: 147 },
        { moisMin: 168, jours: 154 },
        { moisMin: 180, jours: 168 },
        { moisMin: 192, jours: 175 },
        { moisMin: 204, jours: 182 },
        { moisMin: 216, jours: 189 },
        { moisMin: 228, jours: 196 },
        { moisMin: 240, jours: 210 },
        { moisMin: 252, jours: 217 },
        { moisMin: 264, jours: 224 },
        { moisMin: 276, jours: 231 },
        { moisMin: 288, jours: 238 },
        { moisMin: 300, jours: 252 },
        { moisMin: 312, jours: 259 },
        { moisMin: 324, jours: 266 },
        { moisMin: 336, jours: 273 },
        { moisMin: 348, jours: 280 },
        { moisMin: 360, jours: 294 },
        { moisMin: 372, jours: 301 },
        { moisMin: 384, jours: 308 },
        { moisMin: 396, jours: 315 },
        { moisMin: 408, jours: 322 },
        { moisMin: 420, jours: 336 },
        { moisMin: 432, jours: 343 },
        { moisMin: 444, jours: 350 },
        { moisMin: 456, jours: 357 },
        { moisMin: 468, jours: 364 },
        { moisMin: 480, jours: 378 },
        { moisMin: 492, jours: 385 },
        { moisMin: 504, jours: 392 },
        { moisMin: 516, jours: 399 },
        { moisMin: 528, jours: 406 },
        { moisMin: 540, jours: 420 },
      ],
      paliersDemission: [
        { moisMin: 0, jours: 3 },
        { moisMin: 6, jours: 21 },
        { moisMin: 12, jours: 24 },
        { moisMin: 24, jours: 28 },
        { moisMin: 36, jours: 31 },
        { moisMin: 48, jours: 35 },
        { moisMin: 60, jours: 42 },
        { moisMin: 72, jours: 45 },
        { moisMin: 84, jours: 49 },
        { moisMin: 96, jours: 52 },
        { moisMin: 108, jours: 56 },
      ],
    },
  ],
};
