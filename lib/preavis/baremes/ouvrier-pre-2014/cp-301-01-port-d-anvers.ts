import type { TableCPAnciennete } from "./types";

/**
 * Source: ONEM, "Règles dérogatoires par rapport aux délais de préavis
 * avant 2014" (fiche CP 301.01, Port d'Anvers). Couvre uniquement la
 * rubrique I ("ouvriers portuaires reconnus du contingent logistique et
 * gens de métier"). La rubrique II (contingent général en service fixe)
 * est volontairement exclue : l'ONEM précise explicitement que ce second
 * régime "reste valable jusqu'à nouvel avis", donc n'est PAS un régime
 * gelé au 31/12/2013 comme le reste de ce module — l'intégrer nécessiterait
 * une logique de bascule différente, hors périmètre ici.
 *
 * Comme pour la CP 140.04, ce secteur déroge par DATE DE DÉBUT DU CONTRAT
 * DE TRAVAIL (texte ONEM : "contrat de travail dont l'exécution a débuté
 * avant/à partir du 01/01/2012"), d'où deux sous-régimes :
 * - I-1 (avant le 01/01/2012, en vigueur depuis le 17/09/2004,
 *   AR 01/09/2004, MB 17/09/2004)
 * - I-2 (à partir du 01/01/2012, en vigueur depuis le 01/01/2013,
 *   AR 14/12/2012, MB 07/01/2013)
 * Les deux sous-régimes cessent de s'appliquer aux contrats débutés après
 * le 31/12/2013 (confirmé explicitement par l'ONEM), cohérent avec le
 * mécanisme général "Partie 1 gelée" de ce module.
 *
 * Démission volontairement absente (`paliersDemission: null`, les deux
 * sous-régimes) : source ONEM = "régime légal" sans détail chiffré fiable.
 */
export const cp30101PortDAnvers: TableCPAnciennete = {
  cp: "301.01",
  nom: "Port d'Anvers, dockers du contingent logistique",
  regimes: [
    {
      depuisEmbauche: "1900-01-01",
      paliersEmployeur: [
        { moisMin: 0, jours: 28 },
        { moisMin: 6, jours: 35 },
        { moisMin: 60, jours: 42 },
        { moisMin: 120, jours: 56 },
        { moisMin: 180, jours: 84 },
        { moisMin: 240, jours: 112 },
      ],
      paliersDemission: null,
    },
    {
      depuisEmbauche: "2012-01-01",
      paliersEmployeur: [
        { moisMin: 0, jours: 28 },
        { moisMin: 6, jours: 40 },
        { moisMin: 60, jours: 48 },
        { moisMin: 120, jours: 64 },
        { moisMin: 180, jours: 97 },
        { moisMin: 240, jours: 129 },
      ],
      paliersDemission: null,
    },
  ],
};
