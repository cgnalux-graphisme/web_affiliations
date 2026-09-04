import type { TableCPAnciennete } from "./types";

/**
 * Source: SPF Emploi, PDF "Délais de préavis SCP 142.01" au 31/12/2013,
 * recoupé avec ONEM "Règles dérogatoires" (mêmes valeurs, "Date de fin :
 * indéterminée"). Ce secteur déroge par DATE DE DÉBUT DU CONTRAT DE
 * TRAVAIL (contrats débutés avant/à partir du 01/01/2012), d'où deux
 * régimes ci-dessous :
 * - avant le 01/01/2012 (AR 26/08/2003, MB 24/10/2003)
 * - à partir du 01/01/2012 (AR 14/12/2012, MB 07/01/2013) — seuls les
 *   paliers "< 6 mois" et "6 mois-5 ans" sont documentés pour cette
 *   cohorte, les paliers supérieurs n'étant pas atteignables (ancienneté
 *   maximale ~2 ans au 31/12/2013 pour un contrat débuté au plus tôt le
 *   01/01/2012).
 *
 * NB : le fichier voisin `cp-142-02-recuperation-metaux.ts` (registre
 * `TableCP` par date d'embauche) porte lui aussi le nom "Récupération de
 * métaux" ; à vérifier séparément si l'un des deux libellés est erroné
 * (signalé par une recherche antérieure, hors périmètre de cette tâche).
 *
 * Barème gradué par ancienneté acquise au 31/12/2013.
 */
export const cp14201RecuperationDeMetaux: TableCPAnciennete = {
  cp: "142.01",
  nom: "Récupération de métaux",
  regimes: [
    {
      depuisEmbauche: "1900-01-01",
      paliersEmployeur: [
        { moisMin: 0, jours: 35 },
        { moisMin: 60, jours: 42 },
        { moisMin: 120, jours: 56 },
        { moisMin: 180, jours: 84 },
        { moisMin: 240, jours: 112 },
      ],
      paliersDemission: [
        { moisMin: 0, jours: 14 },
        { moisMin: 60, jours: 14 },
        { moisMin: 120, jours: 21 },
        { moisMin: 180, jours: 21 },
        { moisMin: 240, jours: 28 },
      ],
    },
    {
      depuisEmbauche: "2012-01-01",
      paliersEmployeur: [
        { moisMin: 0, jours: 35 },
        { moisMin: 6, jours: 40 },
      ],
      paliersDemission: [
        { moisMin: 0, jours: 14 },
        { moisMin: 6, jours: 14 },
      ],
    },
  ],
};
