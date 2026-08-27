import { moisEntre } from "./anciennete";
import { preavisGeneralEmployeur, preavisGeneralDemission } from "./baremes/general-2014";
import { appliquerReforme2026 } from "./baremes/reforme-2026";
import { preavisEmployePre2014, SEUIL_REMUNERATION_2013 } from "./baremes/employe-pre-2014";
import type { DateISO, DureePreavis, QuiRompt, ResultatPreavisEmploye } from "./types";

const DATE_PIVOT = "2014-01-01";
const DATE_FIN_2013 = "2013-12-31";

/**
 * Approximation de la durée moyenne d'un mois calendrier (365,25 / 12),
 * utilisée uniquement pour convertir la partie 1 (exprimée en mois par la
 * loi pré-2014) en jours, afin de pouvoir l'additionner à la partie 2
 * (exprimée en semaines par le barème général) et appliquer le plafond
 * légal de 13 semaines en cas de démission. Il n'existe pas, contrairement
 * à l'ouvrier (classeur ACCG), d'exemple chiffré officiel permettant de
 * valider cette conversion au jour près — voir design spec §12.4.
 */
const JOURS_PAR_MOIS_MOYEN = 365.25 / 12;

function versDuree(jours: number): DureePreavis {
  return { jours, semaines: Math.round((jours / 7) * 100) / 100 };
}

function semainesBaremeGeneral(quiRompt: QuiRompt, mois: number): number {
  return quiRompt === "employeur" ? preavisGeneralEmployeur(mois) : preavisGeneralDemission(mois);
}

interface ParamsCalculEmploye {
  dateEmbauche: DateISO;
  dateDebutPreavis: DateISO;
  quiRompt: QuiRompt;
  remunerationAnnuelle: number;
}

/**
 * Moteur de calcul du préavis employé. Réutilise les mêmes briques que
 * l'ouvrier (barème général, correctif 2026) mais la partie 1 (pré-2014)
 * vient de la règle du seuil de rémunération (employe-pre-2014.ts) au lieu
 * d'une table par CP — les employés n'ont pas de régime sectoriel
 * dérogatoire pré-2014 comme les ouvriers.
 *
 * Contrairement à calculerPreavisOuvrier, aucune règle de plancher/
 * indemnité compensatoire n'est appliquée ici : ce mécanisme a été
 * identifié dans le classeur ACCG spécifiquement pour les ouvriers ; nous
 * n'avons aucune source confirmant qu'il s'applique de la même façon aux
 * employés, donc nous ne l'inventons pas.
 */
export function calculerPreavisEmploye(params: ParamsCalculEmploye): ResultatPreavisEmploye {
  const { dateEmbauche, dateDebutPreavis, quiRompt, remunerationAnnuelle } = params;
  const anciennePost2014 = dateEmbauche >= DATE_PIVOT;
  const seuilDepasse = remunerationAnnuelle > SEUIL_REMUNERATION_2013;

  let joursPart1 = 0;
  let part1DemissionIncertaine = false;

  if (!anciennePost2014) {
    const anneesAnciennete = moisEntre(dateEmbauche, DATE_FIN_2013) / 12;
    const { mois, incertain } = preavisEmployePre2014({ anneesAnciennete, remunerationAnnuelle, quiRompt });
    joursPart1 = Math.round(mois * JOURS_PAR_MOIS_MOYEN);
    part1DemissionIncertaine = incertain;
  }

  const moisPart2 = anciennePost2014
    ? moisEntre(dateEmbauche, dateDebutPreavis)
    : moisEntre(DATE_PIVOT, dateDebutPreavis);
  const semainesPart2 = appliquerReforme2026({
    dateEmbauche,
    moisAnciennete: moisPart2,
    semaines: semainesBaremeGeneral(quiRompt, moisPart2),
  });
  const joursPart2 = semainesPart2 * 7;

  let joursTotal = joursPart1 + joursPart2;
  if (quiRompt === "travailleur") {
    // Plafond légal général de 13 semaines pour toute démission, quel que
    // soit le statut (Art. 37/2 §2) — même plafond que pour l'ouvrier.
    joursTotal = Math.min(joursTotal, 91);
  }

  return {
    statut: "employe",
    quiRompt,
    seuilDepasse,
    part1: versDuree(joursPart1),
    part2: versDuree(joursPart2),
    total: versDuree(joursTotal),
    part1DemissionIncertaine,
  };
}
