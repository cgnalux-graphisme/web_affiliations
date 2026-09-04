import type { TableCPAnciennete } from "./types";

/**
 * Source: ONEM, "Règles dérogatoires par rapport aux délais de préavis
 * avant 2014" (fiche CP 140.04). Contrairement à la plupart des autres CP
 * de ce fichier, ce secteur déroge réellement par DATE DE DÉBUT DU CONTRAT
 * DE TRAVAIL (texte ONEM : "contrat de travail dont l'exécution a débuté
 * avant/à partir du 01/01/2012") — d'où deux régimes distincts ci-dessous,
 * et non un seul (le régime le plus récent).
 *
 * Régime A (contrats débutés avant le 01/01/2012, en vigueur depuis le
 * 14/12/2006, AR 03/12/2006, MB 14/12/2006) : aucun palier "< 3 ans" fourni
 * par l'ONEM — absence non expliquée par la source, donc non couverte
 * (voir `joursParPalierAnciennete`, qui retourne `null` sous le premier
 * palier documenté plutôt que de réutiliser sa valeur par erreur).
 *
 * Régime B (contrats débutés à partir du 01/01/2012, en vigueur depuis le
 * 01/01/2013, AR 14/12/2012, MB 07/01/2013).
 *
 * Démission volontairement absente (`paliersDemission: null`, les deux
 * régimes) : source ONEM = "régime légal" sans détail chiffré fiable.
 *
 * Un troisième régime ("Régime C", CCT 22/05/2014) s'applique à tous les
 * licenciements notifiés à partir du 22/05/2014, quelle que soit la date
 * d'embauche — hors périmètre du régime transitoire pré-2014, non encodé.
 */
export const cp14004AssistanceEnEscaleAeroports: TableCPAnciennete = {
  cp: "140.04",
  nom: "Assistance en escale dans les aéroports",
  regimes: [
    {
      depuisEmbauche: "1900-01-01",
      paliersEmployeur: [
        { moisMin: 36, jours: 60 },
        { moisMin: 60, jours: 90 },
        { moisMin: 120, jours: 120 },
      ],
      paliersDemission: null,
    },
    {
      depuisEmbauche: "2012-01-01",
      paliersEmployeur: [
        { moisMin: 0, jours: 28 },
        { moisMin: 6, jours: 32 },
        { moisMin: 36, jours: 60 },
        { moisMin: 60, jours: 90 },
        { moisMin: 120, jours: 120 },
        { moisMin: 240, jours: 129 },
      ],
      paliersDemission: null,
    },
  ],
};
