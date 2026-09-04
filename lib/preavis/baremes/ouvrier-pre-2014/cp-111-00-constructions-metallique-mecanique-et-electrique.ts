import type { TableCPAnciennete } from "./types";

/**
 * Source: ONEM, "Règles dérogatoires par rapport aux délais de préavis
 * avant 2014" (fiche CP 111), recoupé avec le PDF SPF Emploi (AR 22/04/2012,
 * MB 10/05/2012). Couvre uniquement le champ d'application général
 * ("toutes les entreprises à l'exception des entreprises de montage de
 * ponts et de charpentes métalliques") — ce sous-secteur a un barème
 * distinct, non couvert ici faute de sélecteur dédié dans le formulaire
 * (choix volontaire pour rester dans le périmètre de l'outil, pas un
 * oubli). Le régime antérieur au 10/05/2012 (AR 08/12/2003) n'est pas
 * encodé : seul le régime en vigueur au 31/12/2013 détermine la Partie 1.
 *
 * Barème gradué par ancienneté acquise au 31/12/2013.
 */
export const cp11100ConstructionsMetalliqueMecaniqueEtElectrique: TableCPAnciennete = {
  cp: "111.00",
  nom: "Constructions métallique, mécanique et électrique",
  regimes: [
    {
      depuisEmbauche: "1900-01-01",
      paliersEmployeur: [
        { moisMin: 0, jours: 42 },
        { moisMin: 60, jours: 49 },
        { moisMin: 120, jours: 84 },
        { moisMin: 180, jours: 112 },
        { moisMin: 240, jours: 154 },
        { moisMin: 300, jours: 196 },
      ],
      paliersDemission: [
        { moisMin: 0, jours: 14 },
        { moisMin: 60, jours: 14 },
        { moisMin: 120, jours: 28 },
        { moisMin: 180, jours: 28 },
        { moisMin: 240, jours: 42 },
        { moisMin: 300, jours: 42 },
      ],
    },
  ],
};
